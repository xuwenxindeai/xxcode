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
const readline = __importStar(require("readline"));
const undo_1 = require("./undo");
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
function resolvePath(filePath, cwd) {
    if (path.isAbsolute(filePath))
        return filePath;
    return path.resolve(cwd, filePath);
}
/*
 * ── 大文件 / 二进制读取防护 ────────────────────────────────────────────
 * 背景：read_file 若无脑全读，在大仓库（如几 G、含 framework 二进制的 iOS 工程）里
 * 会把几十上百 MB 的文件一次性读进内存 → OOM 被系统强杀（zsh: killed）。
 *
 * 业界方案（本实现参考）：
 *  • Claude Code 的 Read：默认只读前 2000 行 + offset/limit 分页 + token/大小上限，
 *    超限报错并提示用 offset/limit 或 grep；二进制文件直接拒绝；每行过长截断。
 *  • aider 的 repo map：更进一步，用 tree-sitter 只抽取符号摘要（类/函数签名）+ PageRank
 *    排序，根本不全读文件就能理解大仓库（更上层的方案，见 ROADMAP P4/P5）。
 *
 * 这里实现「第一层」单文件防护：
 *  1. 二进制检测（前 4KB 出现 NUL 字节即判定）→ 拒绝，只回大小；
 *  2. 流式按行读取 [offset, offset+limit)（默认前 2000 行），不把整个大文件读进内存；
 *  3. 每行超长（>2000 字符）截断，防超长单行炸上下文。
 */
const MAX_LINE_CHARS = 2000;
const DEFAULT_LINE_LIMIT = 2000;
const BINARY_PROBE_BYTES = 4096;
function fmtBytes(n) {
    if (n >= 1 << 20)
        return (n / (1 << 20)).toFixed(1) + 'MB';
    if (n >= 1 << 10)
        return (n / (1 << 10)).toFixed(1) + 'KB';
    return n + 'B';
}
function looksBinary(fullPath, size) {
    const fd = fs.openSync(fullPath, 'r');
    try {
        const len = Math.min(BINARY_PROBE_BYTES, size);
        if (len === 0)
            return false;
        const buf = Buffer.alloc(len);
        const n = fs.readSync(fd, buf, 0, len, 0);
        return buf.subarray(0, n).includes(0); // 含 NUL 字节 → 视为二进制
    }
    finally {
        fs.closeSync(fd);
    }
}
/** 流式只读 [offset, offset+limit) 行，避免大文件全量读入内存导致 OOM */
async function readLineRange(fullPath, offset, limit) {
    const rl = readline.createInterface({ input: fs.createReadStream(fullPath, 'utf-8'), crlfDelay: Infinity });
    const lines = [];
    let no = 0;
    let hasMore = false;
    for await (const raw of rl) {
        no++;
        if (no <= offset)
            continue;
        if (lines.length >= limit) {
            hasMore = true;
            rl.close();
            break;
        }
        lines.push(raw.length > MAX_LINE_CHARS ? raw.slice(0, MAX_LINE_CHARS) + ' …(行过长已截断)' : raw);
    }
    return { lines, hasMore };
}
// 读取文件（带大文件/二进制防护 + offset/limit 分页，对标 Claude Code 的 Read）
exports.readTool = {
    name: 'read_file',
    description: '读取文件内容（默认前 2000 行；大文件用 offset/limit 分页；二进制文件会被拒绝）',
    parameters: {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: '文件路径（绝对或相对）' },
            offset: { type: 'number', description: '起始行（从 0 开始），默认 0', default: 0 },
            limit: { type: 'number', description: '最多读取行数，默认 2000', default: DEFAULT_LINE_LIMIT },
        },
        required: ['file_path'],
    },
    async execute(args, cwd) {
        try {
            const fullPath = resolvePath(args.file_path, cwd);
            if (!fs.existsSync(fullPath))
                return { success: false, output: '', error: `文件不存在: ${fullPath}` };
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory())
                return { success: false, output: '', error: `这是目录不是文件: ${fullPath}（用 list_dir 或 project_tree）` };
            if (looksBinary(fullPath, stat.size)) {
                return { success: false, output: '', error: `二进制文件，不读取内容（大小 ${fmtBytes(stat.size)}）` };
            }
            const offset = Math.max(0, Math.floor(args.offset || 0));
            const limit = args.limit && args.limit > 0 ? Math.floor(args.limit) : DEFAULT_LINE_LIMIT;
            const { lines, hasMore } = await readLineRange(fullPath, offset, limit);
            let output = lines.join('\n');
            if (offset > 0 || hasMore) {
                output += `\n\n…(第 ${offset}–${offset + lines.length} 行${hasMore ? `，还有更多，用 offset=${offset + limit} 继续` : '，已到末尾'}；文件 ${fmtBytes(stat.size)})`;
            }
            return { success: true, output: output || '(空文件)' };
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
            const MAX_RESULTS = 500;
            // 忽略依赖 / 构建产物大目录，避免在大仓库里扫出海量无关结果
            const files = await (0, glob_1.glob)(args.pattern, { cwd, ignore: ['**/node_modules/**', '**/Pods/**', '**/.git/**', '**/build/**', '**/DerivedData/**', '**/dist/**'] });
            const shown = files.slice(0, MAX_RESULTS);
            let out = shown.join('\n') || '(无匹配文件)';
            if (files.length > MAX_RESULTS)
                out += `\n…(共 ${files.length} 个匹配，仅显示前 ${MAX_RESULTS} 个，请缩小 pattern)`;
            return { success: true, output: out };
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