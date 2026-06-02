import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const LOG_DIR = path.join(os.homedir(), '.xxcode', 'logs');

/**
 * 把错误写入 ~/.xxcode/logs/error.log，返回日志文件路径（失败则返回空串）。
 * 之前 xxcode 的异常只打到终端、不落盘，出错后无从排查——这里补上持久化。
 */
export function logError(err: any, context?: string): string {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, 'error.log');
    const ts = new Date().toISOString();
    const detail = (err && (err.stack || err.message)) || String(err);
    fs.appendFileSync(file, `[${ts}]${context ? ' [' + context + ']' : ''}\n${detail}\n\n`);
    return file;
  } catch {
    return '';
  }
}

export function getLogDir(): string {
  return LOG_DIR;
}
