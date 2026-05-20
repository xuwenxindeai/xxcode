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
exports.findSymbolTool = exports.grepTool = void 0;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process_1.exec);
// ripgrep 全文搜索
exports.grepTool = {
    name: 'grep',
    description: '使用 ripgrep 进行全文搜索，支持正则表达式',
    parameters: {
        type: 'object',
        properties: {
            pattern: { type: 'string', description: '搜索模式（正则表达式）' },
            file_pattern: { type: 'string', description: '可选，文件 glob 模式，如 *.ts' },
            case_sensitive: { type: 'boolean', description: '可选，区分大小写', default: false },
        },
        required: ['pattern'],
    },
    async execute(args, cwd) {
        try {
            let cmd = `rg --no-heading --line-number --color never '${args.pattern.replace(/'/g, "'\\''")}'`;
            if (args.file_pattern)
                cmd += ` -g '${args.file_pattern}'`;
            if (args.case_sensitive)
                cmd += ' --case-sensitive';
            cmd += ' || true'; // 不报错
            const { stdout, stderr } = await execAsync(cmd, {
                cwd,
                timeout: 10000,
                maxBuffer: 1024 * 1024,
            });
            const output = stdout.trim();
            if (!output)
                return { success: true, output: '(无匹配结果)' };
            // 截断过长输出
            const truncated = output.length > 5000
                ? output.slice(0, 5000) + '\n... (结果过多，已截断)'
                : output;
            return { success: true, output: truncated };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
// 查找符号定义（函数名、类名等）
exports.findSymbolTool = {
    name: 'find_symbol',
    description: '在代码中查找符号（函数、类、变量）的定义位置',
    parameters: {
        type: 'object',
        properties: {
            symbol: { type: 'string', description: '要查找的符号名称' },
        },
        required: ['symbol'],
    },
    async execute(args, cwd) {
        try {
            // 用 grep 精确匹配符号
            const patterns = [
                `function\\s+${args.symbol}`,
                `class\\s+${args.symbol}`,
                `const\\s+${args.symbol}\\s*=`,
                `let\\s+${args.symbol}\\s*=`,
                `var\\s+${args.symbol}\\s*=`,
                `def\\s+${args.symbol}`,
                `type\\s+${args.symbol}\\s*=`,
                `interface\\s+${args.symbol}`,
            ];
            const results = [];
            for (const p of patterns) {
                const cmd = `rg --no-heading --line-number --color never '${p}' || true`;
                try {
                    const { stdout } = await execAsync(cmd, {
                        cwd,
                        timeout: 5000,
                        maxBuffer: 512 * 1024,
                    });
                    if (stdout.trim())
                        results.push(stdout.trim());
                }
                catch {
                    // 忽略单个 pattern 的失败
                }
            }
            if (results.length === 0) {
                return { success: true, output: `未找到符号 "${args.symbol}" 的定义` };
            }
            return { success: true, output: results.join('\n') };
        }
        catch (e) {
            return { success: false, output: '', error: e.message };
        }
    },
};
//# sourceMappingURL=grep.js.map