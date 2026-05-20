export interface Tool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute(args: Record<string, any>, cwd: string): Promise<ToolResult>;
}
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{
        type: string;
        text?: string;
        image_url?: {
            url: string;
        };
    }>;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}
export declare function messageText(msg: Message): string;
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export interface AgentConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
    cwd: string;
    maxIterations: number;
    systemPrompt?: string;
}
