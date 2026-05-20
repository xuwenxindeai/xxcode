/**
 * 判断命令是否危险
 */
export declare function isDangerous(command: string): boolean;
/**
 * 获取危险原因
 */
export declare function getDangerReason(command: string): string;
/**
 * 异步等待用户确认
 */
export declare function askApproval(command: string): Promise<boolean>;
