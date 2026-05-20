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
exports.ContextManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 上下文管理器
class ContextManager {
    context;
    contextPath;
    constructor(cwd) {
        this.contextPath = path.join(cwd, '.agent-context.json');
        this.context = this.loadContext();
    }
    loadContext() {
        if (fs.existsSync(this.contextPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.contextPath, 'utf-8'));
            }
            catch {
                return this.createFreshContext();
            }
        }
        return this.createFreshContext();
    }
    createFreshContext() {
        return {
            id: `ctx_${Date.now()}`,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            messages: [
                {
                    role: 'system',
                    content: '你是一个 AI 编程助手。记住当前对话的上下文，支持多轮追问。',
                    timestamp: Date.now(),
                },
            ],
            recentWork: null,
            openFiles: [],
            taskCount: 0,
        };
    }
    saveContext() {
        this.context.lastActiveAt = Date.now();
        fs.writeFileSync(this.contextPath, JSON.stringify(this.context, null, 2));
    }
    // 获取上下文（用于注入 LLM 系统提示）
    getContextSummary() {
        if (!this.context.recentWork) {
            return '(新对话，无上下文)';
        }
        const w = this.context.recentWork;
        let summary = `## 最近完成的工作\n`;
        summary += `**任务:** ${w.task}\n`;
        summary += `**结果:** ${w.result.slice(0, 200)}\n`;
        if (w.filesModified.length > 0) {
            summary += `**修改文件:** ${w.filesModified.join(', ')}\n`;
        }
        if (w.filesCreated.length > 0) {
            summary += `**创建文件:** ${w.filesCreated.join(', ')}\n`;
        }
        summary += `\n当前任务计数: ${this.context.taskCount}\n`;
        return summary;
    }
    // 添加用户消息
    addUserMessage(content) {
        this.context.messages.push({
            role: 'user',
            content,
            timestamp: Date.now(),
        });
    }
    // 添加助手消息
    addAssistantMessage(content) {
        this.context.messages.push({
            role: 'assistant',
            content,
            timestamp: Date.now(),
        });
    }
    // 添加系统消息
    addSystemMessage(content) {
        this.context.messages.push({
            role: 'system',
            content,
            timestamp: Date.now(),
        });
    }
    // 完成一个任务，更新最近工作
    completeTask(task, result, filesModified, filesCreated) {
        this.context.recentWork = {
            task: task.slice(0, 200),
            result: result.slice(0, 500),
            filesModified,
            filesCreated,
        };
        this.context.taskCount++;
        // 只保留最近 30 条消息（防 token 爆炸）
        if (this.context.messages.length > 30) {
            this.context.messages = this.context.messages.slice(-30);
        }
        this.saveContext();
    }
    // 打开文件
    openFile(filePath) {
        if (!this.context.openFiles.includes(filePath)) {
            this.context.openFiles.push(filePath);
            if (this.context.openFiles.length > 5) {
                this.context.openFiles.shift(); // 最多 5 个
            }
        }
    }
    // 获取完整消息列表（用于 LLM 调用）
    getMessages() {
        return this.context.messages.map(m => ({ role: m.role, content: m.content }));
    }
    // 重置上下文
    reset() {
        this.context = this.createFreshContext();
        this.saveContext();
    }
    // 获取统计信息
    getStats() {
        return {
            taskCount: this.context.taskCount,
            messageCount: this.context.messages.length,
            openFiles: [...this.context.openFiles],
            recentWork: this.context.recentWork?.task || '(无)',
        };
    }
    // 清空消息但保留上下文
    clearMessages() {
        const summary = this.context.recentWork
            ? `上次任务: ${this.context.recentWork.task}\n结果: ${this.context.recentWork.result.slice(0, 200)}`
            : '';
        this.context.messages = [
            { role: 'system', content: '你是一个 AI 编程助手。记住当前对话的上下文，支持多轮追问。', timestamp: Date.now() },
        ];
        if (summary) {
            this.context.messages.push({
                role: 'system',
                content: summary,
                timestamp: Date.now(),
            });
        }
        this.saveContext();
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=conversation.js.map