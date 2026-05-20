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
exports.lspDiagnosticsTool = exports.lspReferencesTool = exports.lspDefinitionTool = exports.lspHoverTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lsp_1 = require("../lsp");
// LSP 悬浮提示
exports.lspHoverTool = {
    name: 'lsp_hover',
    description: '获取光标位置的类型信息和文档注释（需要对应的 LSP 服务器已安装）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            line: { type: 'number', description: '行号（从 1 开始）' },
            column: { type: 'number', description: '列号（从 1 开始）', default: 1 },
        },
        required: ['file_path', 'line'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const result = await (0, lsp_1.lspHover)(fullPath, args.line, args.column || 1);
            if (!result) {
                return { success: true, output: '(无悬浮信息)' };
            }
            return { success: true, output: result };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// LSP 跳转到定义
exports.lspDefinitionTool = {
    name: 'lsp_definition',
    description: '跳转到符号的定义位置（需要对应的 LSP 服务器已安装）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            line: { type: 'number', description: '行号' },
            column: { type: 'number', description: '列号', default: 1 },
        },
        required: ['file_path', 'line'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const result = await (0, lsp_1.lspDefinition)(fullPath, args.line, args.column || 1);
            if (!result) {
                return { success: true, output: '(未找到定义)' };
            }
            return { success: true, output: `定义位置: ${result}` };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// LSP 查找引用
exports.lspReferencesTool = {
    name: 'lsp_references',
    description: '查找符号的所有引用位置',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
            line: { type: 'number', description: '行号' },
            column: { type: 'number', description: '列号', default: 1 },
        },
        required: ['file_path', 'line'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = path.isAbsolute(args.file_path)
                ? args.file_path
                : path.resolve(cwd, args.file_path);
            if (!fs.existsSync(fullPath)) {
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            }
            const result = await (0, lsp_1.lspReferences)(fullPath, args.line, args.column || 1);
            if (!result) {
                return { success: true, output: '(未找到引用)' };
            }
            return { success: true, output: result };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// LSP 诊断
exports.lspDiagnosticsTool = {
    name: 'lsp_diagnostics',
    description: '获取文件的编译错误和警告（类型检查、语法错误等）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径' },
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
            const result = await (0, lsp_1.lspDiagnostics)(fullPath);
            return { success: true, output: result || '(无诊断信息)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=lsp-tool.js.map