import { describe, it, expect } from 'vitest';
import { applyDefaults, withToolSafety } from '../src/tools/define';
import type { Tool } from '../src/types';

const makeTool = (overrides: Partial<Tool> = {}): Tool => ({
  name: 'demo',
  description: 'demo 工具',
  parameters: {
    type: 'object',
    properties: {
      dir: { type: 'string', default: '.' },
      name: { type: 'string' },
    },
    required: ['name'],
  },
  async execute(args) {
    return { success: true, output: JSON.stringify(args) };
  },
  ...overrides,
});

describe('applyDefaults', () => {
  it('补上缺失的默认值', () => {
    expect(applyDefaults({ name: 'x' }, makeTool().parameters).dir).toBe('.');
  });
  it('不覆盖已提供的值', () => {
    expect(applyDefaults({ name: 'x', dir: 'src' }, makeTool().parameters).dir).toBe('src');
  });
  it('null 视为缺失并补默认', () => {
    expect(applyDefaults({ name: 'x', dir: null }, makeTool().parameters).dir).toBe('.');
  });
  it('parameters 无 properties / undefined 时原样返回', () => {
    expect(applyDefaults({ a: 1 }, {})).toEqual({ a: 1 });
    expect(applyDefaults({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
});

describe('withToolSafety', () => {
  it('缺必填参数时返回错误且不调用 execute', async () => {
    let called = false;
    const t = withToolSafety(makeTool({ execute: async () => { called = true; return { success: true, output: '' }; } }));
    const r = await t.execute({}, '/tmp');
    expect(r.success).toBe(false);
    expect(r.error).toContain('name');
    expect(called).toBe(false);
  });

  it('默认值填充后再交给 execute', async () => {
    const r = await withToolSafety(makeTool()).execute({ name: 'x' }, '/tmp');
    expect(r.success).toBe(true);
    expect(JSON.parse(r.output).dir).toBe('.');
  });

  it('execute 抛异常时兜底成 ToolResult 而不冒泡', async () => {
    const t = withToolSafety(makeTool({ execute: async () => { throw new Error('boom'); } }));
    const r = await t.execute({ name: 'x' }, '/tmp');
    expect(r.success).toBe(false);
    expect(r.error).toBe('boom');
  });

  it('保留 name/description/parameters 不变', () => {
    const t = withToolSafety(makeTool());
    expect(t.name).toBe('demo');
    expect(t.parameters.required).toEqual(['name']);
  });
});
