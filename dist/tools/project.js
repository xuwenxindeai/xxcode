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
exports.peekTool = exports.treeTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 项目结构树
exports.treeTool = {
    name: 'project_tree',
    description: '打印项目文件树（带缩进），适合快速了解项目结构',
    parameters: {
        type: 'object',
        properties: {
            dir: { type: 'string', description: '根目录，默认当前目录', default: '.' },
            depth: { type: 'number', description: '最大深度，默认 3', default: 3 },
        },
        required: [],
    },
    async execute(args, cwd) {
        try {
            const rootDir = args.dir === '.' ? cwd : path.resolve(cwd, args.dir);
            if (!fs.existsSync(rootDir)) {
                return { success: false, output: '', error: `目录不存在: ${rootDir}` };
            }
            const maxDepth = args.depth || 3;
            const tree = buildTree(rootDir, '', maxDepth, 0);
            return { success: true, output: tree };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 读取文件的部分内容（只看头部，适合了解文件结构）
exports.peekTool = {
    name: 'peek_file',
    description: '读取文件的前 N 行，适合快速了解文件结构',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            lines: { type: 'number', description: '读取行数，默认 20', default: 20 },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lineCount = args.lines || 20;
            const lines = content.split('\n').slice(0, lineCount);
            const output = lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
            const totalLines = content.split('\n').length;
            const suffix = totalLines > lineCount ? `\n...(共 ${totalLines} 行，仅显示前 ${lineCount} 行)` : '';
            return { success: true, output: output + suffix };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
function buildTree(dir, prefix, maxDepth, currentDepth) {
    if (currentDepth > maxDepth)
        return '';
    const entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist');
    let output = '';
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isLast = i === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const icon = entry.isDirectory() ? '📁' : '📄';
        output += `${prefix}${connector}${icon} ${entry.name}\n`;
        if (entry.isDirectory() && currentDepth < maxDepth) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            output += buildTree(path.join(dir, entry.name), newPrefix, maxDepth, currentDepth + 1);
        }
    }
    return output;
}
//# sourceMappingURL=project.js.map