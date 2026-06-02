/**
 * 把错误写入 ~/.xxcode/logs/error.log，返回日志文件路径（失败则返回空串）。
 * 之前 xxcode 的异常只打到终端、不落盘，出错后无从排查——这里补上持久化。
 */
export declare function logError(err: any, context?: string): string;
export declare function getLogDir(): string;
