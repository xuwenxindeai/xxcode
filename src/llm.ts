import OpenAI from 'openai';
import { Message } from './types';

let client: OpenAI | null = null;

export function initClient(apiKey: string, baseURL?: string) {
  client = new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });
}

export async function chat(
  model: string,
  messages: Message[],
  tools?: any[]
): Promise<Message> {
  if (!client) throw new Error('LLM client not initialized');

  const params: any = {
    model,
    messages: messages as any,
  };

  if (tools && tools.length > 0) {
    params.tools = tools;
    params.tool_choice = 'auto';
  }

  const response = await client.chat.completions.create(params);
  const choice = response.choices[0];

  const msg: Message = {
    role: 'assistant',
    content: choice.message.content || '',
  };

  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    msg.tool_calls = choice.message.tool_calls as any;
  }

  return msg;
}

/**
 * 流式调用 LLM，边生成边输出文本
 */
export async function chatStreaming(
  model: string,
  messages: Message[],
  tools: any[],
  onChunk: (text: string) => void
): Promise<Message> {
  if (!client) throw new Error('LLM client not initialized');

  // Use .stream() method (OpenAI SDK v4+) for proper async iteration
  const stream = client.chat.completions.stream({
    model,
    messages: messages as any,
    tools,
    tool_choice: 'auto',
  });

  let fullContent = '';
  let toolCallsMap = new Map<number, { id: string; name: string; args: string }>();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // 文本流式输出
    if (delta.content) {
      onChunk(delta.content);
      fullContent += delta.content;
    }

    // 收集 tool_calls（流式返回是增量片段）
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolCallsMap.has(idx)) {
          toolCallsMap.set(idx, {
            id: tc.id || '',
            name: tc.function?.name || '',
            args: '',
          });
        }
        const existing = toolCallsMap.get(idx)!;
        if (tc.id) existing.id = tc.id;
        if (tc.function?.name) existing.name = tc.function.name;
        if (tc.function?.arguments) existing.args += tc.function.arguments;
      }
    }
  }

  const msg: Message = {
    role: 'assistant',
    content: fullContent,
  };

  if (toolCallsMap.size > 0) {
    msg.tool_calls = Array.from(toolCallsMap.values()).map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.args,
      },
    }));
  }

  return msg;
}
