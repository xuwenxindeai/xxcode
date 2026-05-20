export interface ConversationContext {
    id: string;
    createdAt: number;
    lastActiveAt: number;
    messages: Array<{
        role: 'user' | 'assistant' | 'system' | 'tool';
        content: string;
        timestamp: number;
    }>;
    recentWork: {
        task: string;
        result: string;
        filesModified: string[];
        filesCreated: string[];
    } | null;
    openFiles: string[];
    taskCount: number;
}
export declare class ContextManager {
    private context;
    private contextPath;
    constructor(cwd: string);
    private loadContext;
    private createFreshContext;
    saveContext(): void;
    getContextSummary(): string;
    addUserMessage(content: string): void;
    addAssistantMessage(content: string): void;
    addSystemMessage(content: string): void;
    completeTask(task: string, result: string, filesModified: string[], filesCreated: string[]): void;
    openFile(filePath: string): void;
    getMessages(): Array<{
        role: string;
        content: string;
    }>;
    reset(): void;
    getStats(): {
        taskCount: number;
        messageCount: number;
        openFiles: string[];
        recentWork: string;
    };
    clearMessages(): void;
}
