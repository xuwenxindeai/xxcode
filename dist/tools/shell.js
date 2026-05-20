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
exports.shellTool = void 0;
exports.setApprovalHandler = setApprovalHandler;
exports.setHeartbeatHandler = setHeartbeatHandler;
const child_process_1 = require("child_process");
const util = __importStar(require("util"));
const approval_1 = require("../approval");
const execAsync = util.promisify(child_process_1.exec);
/**
 * 设置审批回调（由 Agent 注入）
 */
let approvalCallback = null;
function setApprovalHandler(handler) {
    approvalCallback = handler;
}
/**
 * 长命令执行心跳回调（用于保持 spinner 活跃）
 */
let heartbeatCallback = null;
function setHeartbeatHandler(handler) {
    heartbeatCallback = handler;
}
// 执行 Shell 命令
exports.shellTool = {
    name: 'run_shell',
    description: '执行 Shell 命令并返回输出。危险命令会被拦截。',
    parameters: {
        type: 'object',
        properties: {
            command: { type: 'string', description: '要执行的 Shell 命令' },
        },
        required: ['command'],
    },
    async execute(args, cwd) {
        // 检查是否危险
        if ((0, approval_1.isDangerous)(args.command) && approvalCallback) {
            const approved = await approvalCallback(args.command);
            if (!approved) {
                return { success: false, output: '', error: '用户拒绝执行此命令' };
            }
        }
        // npm install 命令需要更长超时（5 分钟）
        const isNpmInstall = /npm\s+(install|i)\s/.test(args.command);
        const timeout = isNpmInstall ? 300000 : 120000;
        // 长命令执行时发送心跳，保持 spinner 活跃
        let heartbeatInterval = null;
        if (timeout > 30000 && heartbeatCallback) {
            const elapsed = { value: 0 };
            heartbeatInterval = setInterval(() => {
                elapsed.value += 3;
                heartbeatCallback(`⏳ 命令执行中... ${elapsed.value}s`);
            }, 3000);
        }
        try {
            const { stdout, stderr } = await execAsync(args.command, {
                cwd,
                timeout,
                maxBuffer: 2 * 1024 * 1024,
            });
            if (heartbeatInterval)
                clearInterval(heartbeatInterval);
            const output = [stdout, stderr].filter(Boolean).join('\n');
            return { success: true, output: output || '(无输出)' };
        }
        catch (e) {
            if (heartbeatInterval)
                clearInterval(heartbeatInterval);
            const output = e.stdout || '';
            const error = e.stderr || e.message;
            return { success: false, output, error };
        }
    },
};
//# sourceMappingURL=shell.js.map