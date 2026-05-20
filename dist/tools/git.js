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
exports.gitLogTool = exports.gitCommitTool = exports.gitDiffTool = exports.gitStatusTool = void 0;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
// Git 状态
exports.gitStatusTool = {
    name: 'git_status',
    description: '查看 Git 当前状态（git status 简化版）',
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
    async execute(_args, cwd) {
        try {
            const { stdout } = await execAsync('git status --short', {
                cwd, timeout: 10000, maxBuffer: 512 * 1024,
            });
            if (!stdout.trim())
                return { success: true, output: '工作目录干净，无未提交更改' };
            return { success: true, output: stdout.trim() };
        }
        catch (e) {
            if (e.message.includes('not a git repository')) {
                return { success: true, output: '当前目录不是 Git 仓库' };
            }
            return { success: false, output: '', error: e.message };
        }
    },
};
// Git diff
exports.gitDiffTool = {
    name: 'git_diff',
    description: '查看未暂存的文件差异（git diff），可指定文件名',
    parameters: {
        type: 'object',
        properties: {
            file: { type: 'string', description: '可选，指定文件名' },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            const cmd = args.file ? `git diff -- '${args.file}'` : 'git diff';
            const { stdout } = await execAsync(cmd, {
                cwd, timeout: 10000, maxBuffer: 512 * 1024,
            });
            if (!stdout.trim())
                return { success: true, output: '无未暂存的差异' };
            return { success: true, output: stdout.trim().slice(0, 5000) };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// Git commit
exports.gitCommitTool = {
    name: 'git_commit',
    description: '添加所有更改并提交',
    parameters: {
        type: 'object',
        properties: {
            message: { type: 'string', description: '提交信息' },
        },
        required: ['message'],
    },
    async execute(args, cwd) {
        try {
            await execAsync('git add -A', { cwd, timeout: 10000 });
            const { stdout } = await execAsync(`git commit -m '${args.message.replace(/'/g, "'\\''")}'`, {
                cwd, timeout: 10000,
            });
            return { success: true, output: stdout.trim() || '已提交' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// Git log
exports.gitLogTool = {
    name: 'git_log',
    description: '查看最近的 Git 提交记录',
    parameters: {
        type: 'object',
        properties: {
            limit: { type: 'number', description: '显示条数，默认 5', default: 5 },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            const { stdout } = await execAsync(`git log --oneline -${args.limit || 5} --no-color`, { cwd, timeout: 10000 });
            return { success: true, output: stdout.trim() || '无提交记录' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=git.js.map