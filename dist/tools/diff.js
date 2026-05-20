"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDiffTool = exports.applyDiffTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ========== Diff 补丁工具 ==========
// 应用 unified diff 补丁
exports.applyDiffTool = {
    name: 'apply_diff',
    description: '使用 unified diff 格式精确修改文件。只改变指定的行，保留其余内容。这是最安全的代码修改方式。',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            diff: { type: 'string', description: 'unified diff 格式的补丁' },
        },
        required: ['file_path', 'diff'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            // 用系统的 patch 命令应用补丁
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            // 写入临时 diff 文件
            const tmpDiff = path.join(cwd, '.tmp_patch.diff');
            fs.writeFileSync(tmpDiff, args.diff);
            try {
                await execAsync(`patch -p0 --no-backup-if-mismatch -f -i "${tmpDiff}"`, {
                    cwd: path.dirname(fullPath),
                    timeout: 10000,
                });
            }
            finally {
                fs.unlinkSync(tmpDiff);
            }
            // 保存快照
            const { getUndoManager } = require('./undo');
            getUndoManager().saveBefore(fullPath);
            return { success: true, output: `✅ 补丁已应用到 ${fullPath}` };
        }
        catch (e) {
            return { success: false, output: '', error: `补丁应用失败: ${e.message}` };
        }
    },
};
// 生成文件的 unified diff
exports.generateDiffTool = {
    name: 'generate_diff',
    description: '比较两段文本或文件的差异，生成 unified diff 格式输出',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '要 diff 的文件路径' },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            const { stdout } = await execAsync(`git diff -- "${fullPath}"`, {
                cwd, timeout: 5000,
            }).catch(() => ({ stdout: '', stderr: '' }));
            if (!stdout.trim()) {
                return { success: true, output: '(无差异 - 文件未修改)' };
            }
            return { success: true, output: stdout.trim() };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=diff.js.map