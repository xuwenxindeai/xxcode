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
exports.listDirTool = exports.searchFilesTool = exports.writeTool = exports.readTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const undo_1 = require("./undo");
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
function resolvePath(filePath, cwd) {
    if (path.isAbsolute(filePath))
        return filePath;
    return path.resolve(cwd, filePath);
}
// 读取文件
exports.readTool = {
    name: 'read_file',
    description: '读取指定文件内容',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径（绝对或相对）' },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = resolvePath(args.file_path, cwd);
            const content = await readFile(fullPath, 'utf-8');
            return { success: true, output: content };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 写入文件（自动快照）
exports.writeTool = {
    name: 'write_file',
    description: '写入内容到文件，覆盖原内容。修改前自动保存快照支持撤销。',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            content: { type: 'string', description: '要写入的内容' },
        },
        required: ['file_path', 'content'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = resolvePath(args.file_path, cwd);
            // 自动快照（撤销用）
            if (fs.existsSync(fullPath)) {
                (0, undo_1.getUndoManager)().saveBefore(fullPath);
            }
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            await writeFile(fullPath, args.content, 'utf-8');
            return { success: true, output: `已写入 ${fullPath} (${Buffer.byteLength(args.content)} bytes)` };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 搜索文件
exports.searchFilesTool = {
    name: 'search_files',
    description: '按 glob 模式搜索文件',
    parameters: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: 'glob 模式，如 *.ts, src/**/*.ts' },
        },
        required: ['pattern'],
    },
    async execute(args, cwd) {
        try {
            const files = await (0, glob_1.glob)(args.pattern, { cwd });
            return { success: true, output: files.join('\n') || '(无匹配文件)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 列出目录
exports.listDirTool = {
    name: 'list_dir',
    description: '列出目录内容',
    parameters: {
        type: 'object',
        properties: {
            dir_path: { type: 'string', description: '目录路径，默认当前目录' },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            const dir = resolvePath(args.dir_path || '.', cwd);
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const lines = entries.map(e => {
                const prefix = e.isDirectory() ? '📁' : '📄';
                return `${prefix} ${e.name}`;
            });
            return { success: true, output: lines.join('\n') };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=file.js.map