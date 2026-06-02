import { describe, it, expect } from 'vitest';
import { compressMessages } from '../src/context';
import type { Message } from '../src/types';

const msgs: Message[] = [
  { role: 'system', content: '你是 AI 编程助手' },
  { role: 'user', content: '任务 A：读取并分析' },
  { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 't', arguments: '{}' } }] },
  { role: 'tool', content: '结果一，内容稍微长一点点', tool_call_id: 'c1', name: 't' },
  { role: 'assistant', content: '分析完成 A' },
  { role: 'user', content: '任务 B：创建两个文件' },
  { role: 'assistant', content: '', tool_calls: [
      { id: 'c2', type: 'function', function: { name: 't', arguments: '{}' } },
      { id: 'c3', type: 'function', function: { name: 't', arguments: '{}' } },
  ] },
  { role: 'tool', content: '已写入 a', tool_call_id: 'c2', name: 't' },
  { role: 'tool', content: '已写入 b', tool_call_id: 'c3', name: 't' },
  { role: 'assistant', content: '两个文件完成 B' },
];

// 每个 tool 消息都必须能在它之前找到声明了该 tool_call_id 的 assistant
function hasDanglingTool(result: Message[]): boolean {
  const declared = new Set<string>();
  for (const m of result) {
    if (m.role === 'assistant' && m.tool_calls) m.tool_calls.forEach(tc => declared.add(tc.id));
    if (m.role === 'tool' && !declared.has(m.tool_call_id!)) return true;
  }
  return false;
}

describe('compressMessages 保持 tool_call 配对', () => {
  it('任何 maxTokens 截断点都不产生悬空 tool', () => {
    for (let mt = 1; mt <= 300; mt++) {
      expect(hasDanglingTool(compressMessages(msgs, mt))).toBe(false);
    }
  });

  it('system 始终在最前', () => {
    expect(compressMessages(msgs, 50)[0].role).toBe('system');
  });

  it('小预算下开头（非 system）不是悬空 tool', () => {
    const r = compressMessages(msgs, 40);
    const firstNonSys = r.find(m => m.role !== 'system');
    if (firstNonSys) expect(firstNonSys.role).not.toBe('tool');
  });

  it('预算充足时保留全部消息', () => {
    expect(compressMessages(msgs, 100000).length).toBe(msgs.length);
  });
});
