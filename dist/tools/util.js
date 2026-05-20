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
exports.mcpStatusTool = exports.notifyTool = exports.readImageTool = exports.formatTool = exports.sqliteSchemaTool = exports.sqliteTablesTool = exports.sqliteQueryTool = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
// 数据库工具 - SQLite 查询
exports.sqliteQueryTool = {
    name: 'sqlite_query',
    description: '执行 SQLite 数据库查询（需要 sqlite3 CLI）',
    parameters: {
        type: 'object',
        properties: {
            db_path: { type: 'string', description: '数据库文件路径 (.db / .sqlite)' },
            query: { type: 'string', description: 'SQL 查询语句' },
        },
        required: ['db_path', 'query'],
    },
    async execute(args, cwd) {
        try {
            const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
            if (!fs.existsSync(dbPath)) {
                return { success: false, output: '', error: `数据库文件不存在: ${dbPath}` };
            }
            const { stdout } = await execAsync(`sqlite3 -header -column "${dbPath}" "${args.query.replace(/"/g, '\\"')}"`, {
                cwd, timeout: 10000,
            });
            return { success: true, output: stdout.trim() || '(无结果)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 列出表
exports.sqliteTablesTool = {
    name: 'sqlite_tables',
    description: '列出 SQLite 数据库中的所有表',
    parameters: {
        type: 'object',
        properties: {
            db_path: { type: 'string', description: '数据库文件路径' },
        },
        required: ['db_path'],
    },
    async execute(args, cwd) {
        try {
            const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
            const { stdout } = await execAsync(`sqlite3 "${dbPath}" ".tables"`, { cwd, timeout: 5000 });
            return { success: true, output: stdout.trim() || '(无表)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 表结构
exports.sqliteSchemaTool = {
    name: 'sqlite_schema',
    description: '查看 SQLite 表的建表语句（schema）',
    parameters: {
        type: 'object',
        properties: {
            db_path: { type: 'string', description: '数据库文件路径' },
            table: { type: 'string', description: '表名（可选，不填则显示所有表）' },
        },
        required: ['db_path'],
    },
    async execute(args, cwd) {
        try {
            const dbPath = path.isAbsolute(args.db_path) ? args.db_path : path.resolve(cwd, args.db_path);
            const cmd = args.table
                ? `sqlite3 "${dbPath}" ".schema ${args.table}"`
                : `sqlite3 "${dbPath}" ".schema"`;
            const { stdout } = await execAsync(cmd, { cwd, timeout: 5000 });
            return { success: true, output: stdout.trim() || '(无 schema)' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 代码格式化
exports.formatTool = {
    name: 'format_code',
    description: '格式化代码文件（根据文件类型自动选择 prettier / black / gofmt / clang-format）',
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
            const ext = path.extname(fullPath);
            let cmd = null;
            if (['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.md', '.yaml', '.html'].includes(ext)) {
                cmd = `npx prettier --write "${fullPath}" 2>&1`;
            }
            else if (ext === '.py') {
                cmd = `black "${fullPath}" 2>&1`;
            }
            else if (ext === '.go') {
                cmd = `gofmt -w "${fullPath}" 2>&1`;
            }
            else if (['.c', '.cpp', '.h', '.hpp'].includes(ext)) {
                cmd = `clang-format -i "${fullPath}" 2>&1`;
            }
            if (!cmd) {
                return { success: false, output: '', error: `不支持的文件格式: ${ext}` };
            }
            // 保存快照
            const { getUndoManager } = require('./undo');
            getUndoManager().saveBefore(fullPath);
            const { stdout, stderr } = await execAsync(cmd, { cwd, timeout: 30000 });
            const output = [stdout, stderr].filter(Boolean).join('\n');
            return { success: true, output: `✅ 已格式化\n${output}`.trim() || '✅ 已格式化' };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 图片分析
exports.readImageTool = {
    name: 'read_image',
    description: '读取图片文件的尺寸和大小（macOS sips）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '图片文件路径' },
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
            const stats = fs.statSync(fullPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            const ext = path.extname(fullPath).slice(1).toUpperCase();
            let dims = '';
            try {
                const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${fullPath}"`, { timeout: 5000 });
                const w = stdout.match(/pixelWidth:\s+(\d+)/)?.[1];
                const h = stdout.match(/pixelHeight:\s+(\d+)/)?.[1];
                if (w && h)
                    dims = `${w}×${h}`;
            }
            catch { }
            const info = [`📷 ${path.basename(fullPath)}`, `格式: ${ext}`, `大小: ${sizeKB} KB`];
            if (dims)
                info.push(`尺寸: ${dims}`);
            return { success: true, output: info.join('\n') };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 桌面通知
exports.notifyTool = {
    name: 'notify',
    description: '发送 macOS 桌面通知',
    parameters: {
        type: 'object',
        properties: {
            title: { type: 'string', description: '通知标题' },
            message: { type: 'string', description: '通知内容' },
        },
        required: ['title', 'message'],
    },
    async execute(args, _cwd) {
        try {
            const { exec } = require('child_process');
            exec(`osascript -e 'display notification "${args.message}" with title "${args.title}"'`);
            return { success: true, output: `🔔 通知已发送: ${args.title}` };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// MCP 状态
exports.mcpStatusTool = {
    name: 'mcp_status',
    description: '查看 MCP 服务器状态和可用工具',
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
    async execute(_args, _cwd) {
        try {
            const { getMCPStatus, getMCPTools } = require('../mcp');
            const status = getMCPStatus();
            const mcpTools = getMCPTools();
            let output = `MCP 服务器:\n${status}`;
            if (mcpTools.length > 0) {
                output += '\n\nMCP 工具:';
                for (const t of mcpTools) {
                    output += `\n  • ${t.name} (${t.server}): ${t.description}`;
                }
            }
            return { success: true, output };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=util.js.map