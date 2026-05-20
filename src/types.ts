// ============ 类型定义 ============

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
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export function messageText(msg: Message): string {
  if (typeof msg.content === 'string') return msg.content;
  return msg.content.filter(c => c.type === 'text').map(c => c.text || '').join(' ');
}

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
