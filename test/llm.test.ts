import { describe, it, expect } from 'vitest';
import { toModelMessages, toAITools, splitSystem } from '../src/llm';
import type { Message } from '../src/types';

describe('toModelMessages（xxcode Message → AI SDK ModelMessage）', () => {
  it('system / user 转成 {role, content:string}', () => {
    expect(toModelMessages([{ role: 'system', content: 's' }])[0]).toEqual({ role: 'system', content: 's' });
    expect(toModelMessages([{ role: 'user', content: 'u' }])[0]).toEqual({ role: 'user', content: 'u' });
  });

  it('assistant 带 tool_calls → text part + tool-call part', () => {
    const m: Message = {
      role: 'assistant', content: '好的',
      tool_calls: [{ id: 'c1', type: 'function', function: { name: 'read_file', arguments: '{"file_path":"a.ts"}' } }],
    };
    const r = toModelMessages([m])[0];
    expect(r.role).toBe('assistant');
    expect(r.content).toContainEqual({ type: 'text', text: '好的' });
    expect(r.content).toContainEqual({ type: 'tool-call', toolCallId: 'c1', toolName: 'read_file', input: { file_path: 'a.ts' } });
  });

  it('tool 结果 → tool-result（output:{type:text,value}）', () => {
    const m: Message = { role: 'tool', content: '文件内容', tool_call_id: 'c1', name: 'read_file' };
    const r = toModelMessages([m])[0];
    expect(r.role).toBe('tool');
    expect(r.content[0]).toEqual({ type: 'tool-result', toolCallId: 'c1', toolName: 'read_file', output: { type: 'text', value: '文件内容' } });
  });

  it('坏的 arguments JSON 不抛错，降级为空对象', () => {
    const m: Message = { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'x', arguments: '不是json' } }] };
    const r = toModelMessages([m])[0];
    expect(r.content[0]).toEqual({ type: 'tool-call', toolCallId: 'c1', toolName: 'x', input: {} });
  });
});

describe('toAITools（OpenAI 风格 tools → AI SDK tools 映射）', () => {
  it('按工具名建映射', () => {
    const tools = [{ type: 'function', function: { name: 'read_file', description: '读', parameters: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] } } }];
    const r = toAITools(tools);
    expect(Object.keys(r)).toEqual(['read_file']);
    expect(r.read_file).toBeTruthy();
  });

  it('空数组 → 空对象', () => {
    expect(toAITools([])).toEqual({});
  });
});

describe('splitSystem（system 抽成 AI SDK 独立参数，消除注入警告）', () => {
  it('抽出 system 文本，rest 不含 system', () => {
    const r = splitSystem([
      { role: 'system', content: '系统提示' },
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '在' },
    ]);
    expect(r.system).toBe('系统提示');
    expect(r.rest.map(m => m.role)).toEqual(['user', 'assistant']);
  });
  it('无 system 时为 undefined', () => {
    const r = splitSystem([{ role: 'user', content: 'hi' }]);
    expect(r.system).toBeUndefined();
    expect(r.rest.length).toBe(1);
  });
  it('多条 system 合并', () => {
    const r = splitSystem([{ role: 'system', content: 'a' }, { role: 'system', content: 'b' }, { role: 'user', content: 'x' }]);
    expect(r.system).toBe('a\n\nb');
  });
});
