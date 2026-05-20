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
exports.globalHooks = exports.HookRegistry = void 0;
exports.createAuditLogHook = createAuditLogHook;
exports.createProtectedFilesHook = createProtectedFilesHook;
exports.createRateLimitHook = createRateLimitHook;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class HookRegistry {
    hooks = new Map();
    on(event, handler) {
        if (!this.hooks.has(event)) {
            this.hooks.set(event, []);
        }
        this.hooks.get(event).push(handler);
    }
    async emit(event, ctx) {
        const handlers = this.hooks.get(event) || [];
        let context = ctx;
        for (const handler of handlers) {
            context = await handler(context);
        }
        return context;
    }
    has(event) {
        return (this.hooks.get(event)?.length ?? 0) > 0;
    }
}
exports.HookRegistry = HookRegistry;
// ========== 内置钩子 ==========
/**
 * 自动记录文件修改到日志
 */
function createAuditLogHook(logDir) {
    const logFile = path.join(logDir, 'agent-audit.log');
    if (!fs.existsSync(logDir))
        fs.mkdirSync(logDir, { recursive: true });
    return async (ctx) => {
        if (ctx.toolName === 'after_tool_execute' && ctx.toolName) {
            const entry = `[${new Date().toISOString()}] ${ctx.toolName}(${JSON.stringify(ctx.toolArgs)}) → ${ctx.toolResult?.success ? '✅' : '❌'}\n`;
            fs.appendFileSync(logFile, entry);
        }
        return ctx;
    };
}
/**
 * 阻止修改特定文件（白名单模式）
 */
function createProtectedFilesHook(protectedFiles) {
    return async (ctx) => {
        const writeTools = ['write_file', 'edit_file', 'append_file', 'apply_diff'];
        if (writeTools.includes(ctx.toolName || '')) {
            const filePath = ctx.toolArgs?.file_path || '';
            if (protectedFiles.some(pf => filePath.includes(pf))) {
                return {
                    ...ctx,
                    toolResult: {
                        success: false,
                        output: '',
                        error: `⛔ 文件 ${filePath} 受保护，禁止修改`,
                    },
                };
            }
        }
        return ctx;
    };
}
/**
 * 工具调用频率限制
 */
function createRateLimitHook(maxCalls, windowMs) {
    const callLog = new Map();
    return async (ctx) => {
        if (!ctx.toolName)
            return ctx;
        const now = Date.now();
        const calls = callLog.get(ctx.toolName) || [];
        const recentCalls = calls.filter(t => now - t < windowMs);
        if (recentCalls.length >= maxCalls) {
            return {
                ...ctx,
                toolResult: {
                    success: false,
                    output: '',
                    error: `⏱️ 工具 ${ctx.toolName} 频率限制：${windowMs}ms 内最多 ${maxCalls} 次`,
                },
            };
        }
        recentCalls.push(now);
        callLog.set(ctx.toolName, recentCalls);
        return ctx;
    };
}
// 全局钩子注册表
exports.globalHooks = new HookRegistry();
//# sourceMappingURL=hooks.js.map