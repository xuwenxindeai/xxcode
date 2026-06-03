import { describe, it, expect } from 'vitest';
import { fuzzyMatchUnique } from '../src/tools/edit';

describe('fuzzyMatchUnique（edit_file 模糊匹配容错）', () => {
  it('缩进不同也能匹配整段', () => {
    const content = 'function f() {\n    return 1;\n}';
    const r = fuzzyMatchUnique(content, 'function f() {\nreturn 1;\n}'); // old 无缩进
    expect(r).not.toBeNull();
    expect(r).not.toBe('multiple');
    const { start, end } = r as { start: number; end: number };
    expect(content.slice(start, end)).toBe(content);
  });

  it('匹配到带缩进的原文区间（替换时保留原文定位）', () => {
    const content = 'line1\n  target\nline3';
    const r = fuzzyMatchUnique(content, 'target') as { start: number; end: number };
    expect(content.slice(r.start, r.end)).toBe('  target');
  });

  it('多处匹配返回 multiple（拒绝歧义替换）', () => {
    expect(fuzzyMatchUnique('x = 1\ny\nx = 1', 'x = 1')).toBe('multiple');
  });

  it('无匹配返回 null', () => {
    expect(fuzzyMatchUnique('abc\ndef', 'xyz')).toBeNull();
  });

  it('精确相同也能匹配', () => {
    const content = 'a\nb\nc';
    const r = fuzzyMatchUnique(content, 'b') as { start: number; end: number };
    expect(content.slice(r.start, r.end)).toBe('b');
  });
});
