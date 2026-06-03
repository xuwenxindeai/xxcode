import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readTool } from '../src/tools/file';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

let dir: string;
beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf-')); });
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('read_file 大文件 / 二进制防护', () => {
  it('二进制文件（含 NUL 字节）被拒绝', async () => {
    const f = path.join(dir, 'bin');
    fs.writeFileSync(f, Buffer.from([0x68, 0x00, 0x69])); // h\0i
    const r = await readTool.execute({ file_path: f }, dir);
    expect(r.success).toBe(false);
    expect(r.error).toContain('二进制');
  });

  it('正常文本默认读取', async () => {
    const f = path.join(dir, 't.txt');
    fs.writeFileSync(f, 'line1\nline2\nline3\n');
    const r = await readTool.execute({ file_path: f }, dir);
    expect(r.success).toBe(true);
    expect(r.output).toContain('line1');
    expect(r.output).toContain('line3');
  });

  it('offset/limit 分页 + 还有更多提示', async () => {
    const f = path.join(dir, 'big.txt');
    fs.writeFileSync(f, Array.from({ length: 100 }, (_, i) => 'L' + i).join('\n'));
    const r = await readTool.execute({ file_path: f, offset: 0, limit: 5 }, dir);
    expect(r.success).toBe(true);
    expect(r.output).toContain('L0');
    expect(r.output).toContain('L4');
    expect(r.output).not.toContain('L5');
    expect(r.output).toMatch(/还有更多|offset=/);
  });

  it('超长行被截断', async () => {
    const f = path.join(dir, 'long.txt');
    fs.writeFileSync(f, 'x'.repeat(5000));
    const r = await readTool.execute({ file_path: f }, dir);
    expect(r.success).toBe(true);
    expect(r.output).toContain('行过长已截断');
  });

  it('目录被拒绝（提示用 list_dir）', async () => {
    const r = await readTool.execute({ file_path: dir }, dir);
    expect(r.success).toBe(false);
    expect(r.error).toContain('目录');
  });
});
