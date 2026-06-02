import { describe, it, expect } from 'vitest';
import { treeTool, peekTool } from '../src/tools/project';
import { withToolSafety } from '../src/tools/define';

// 这些工具声明了带 default 的可选参数，过去 LLM 不传时会因 undefined 崩溃，
// 现在经 withToolSafety 加固后应自动补默认值、不再崩。
describe('真实工具经 withToolSafety 加固后不再因缺参崩溃', () => {
  it('project_tree 无参（缺 dir/depth）正常返回目录树', async () => {
    const r = await withToolSafety(treeTool).execute({}, process.cwd());
    expect(r.success).toBe(true);
    expect(r.output.length).toBeGreaterThan(0);
  });

  it('peek_file 只给 file_path（缺 lines）正常返回', async () => {
    const r = await withToolSafety(peekTool).execute({ file_path: 'package.json' }, process.cwd());
    expect(r.success).toBe(true);
  });

  it('peek_file 缺必填 file_path 被校验拦截', async () => {
    const r = await withToolSafety(peekTool).execute({}, process.cwd());
    expect(r.success).toBe(false);
    expect(r.error).toContain('file_path');
  });
});
