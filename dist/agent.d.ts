import { AgentConfig } from './types';
import { CodingAgentConfig } from './config';
import { ContextManager } from './conversation';
import { CodeSandbox } from './sandbox';
import { PluginManager } from './plugin-system';
/**
 * 子 Agent — 用于并行处理子任务
 */
export declare class SubAgent {
    private id;
    private messages;
    private config;
    private toolCallHistory;
    private totalToolCalls;
    constructor(id: string, config: AgentConfig, systemPrompt?: string);
    run(task: string): Promise<string>;
}
/**
 * 主 Agent
 */
export declare class Agent {
    private config;
    private messages;
    private toolCallHistory;
    private totalToolCalls;
    private agentConfig;
    private testRunner;
    private subAgentCount;
    private currentSession;
    private contextManager?;
    private codeSandbox?;
    private pluginManager?;
    private dashboard?;
    constructor(config: AgentConfig, agentConfig?: CodingAgentConfig);
    /**
     * 加载插件工具并合并到全局工具列表
     */
    private registerPluginTools;
    /**
     * 重新加载插件工具（热重载后调用）
     */
    reloadPluginTools(): Promise<void>;
    /**
     * 执行主任务
     */
    run(task: string): Promise<void>;
    /**
     * 更新项目记忆
     */
    private updateMemory;
    /**
     * 任务完成后处理
     */
    private runPostTaskActions;
    /**
     * 并行派生多个子 Agent
     */
    spawnSubAgents(subTasks: {
        id: string;
        task: string;
    }[]): Promise<Map<string, string>>;
    /**
     * 加载历史会话（从摘要恢复上下文）
     */
    loadSession(sessionId: string): Promise<boolean>;
    /**
     * 获取上下文管理器（REPL 使用）
     */
    getConversationContext(): ContextManager | undefined;
    /**
     * 获取代码沙箱（REPL 使用）
     */
    getCodeSandbox(): CodeSandbox | undefined;
    /**
     * 获取插件管理器（REPL 使用）
     */
    getPluginManager(): PluginManager | undefined;
    /**
     * 持久化 Agent 配置到 .agent-config.json
     */
    saveConfig(): void;
    /**
     * 从 .agent-config.json 加载配置（如果存在）
     */
    static loadSavedConfig(cwd: string): Partial<AgentConfig & {
        maxContextTokens: number;
        maxToolTokens: number;
        autoApprove: string[];
    }> | null;
    get sessionId(): string | null;
    /**
     * 清空消息历史（保留 system prompt）
     */
    clearHistory(): void;
    /**
     * 获取消息统计
     */
    getMessageStats(): {
        totalMessages: number;
        userCount: number;
        assistantCount: number;
        toolCount: number;
        totalTokens: number;
    };
    /**
     * 获取最近的工具调用记录
     */
    getRecentToolCalls(): Array<{
        name: string;
        count: number;
    }>;
    /**
     * 继续上次对话（追加消息）
     */
    continueConversation(message: string): void;
}
/**
 * REPL 交互模式（改进版 — 支持多轮对话）
 */
export declare class REPLAgent {
    private agent;
    private rl;
    private agentConfig;
    constructor(config: AgentConfig, agentConfig?: CodingAgentConfig);
    start(): Promise<void>;
    private get config();
}
