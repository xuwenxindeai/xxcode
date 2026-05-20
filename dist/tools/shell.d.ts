import { Tool } from '../types';
export declare function setApprovalHandler(handler: (command: string) => Promise<boolean>): void;
export declare function setHeartbeatHandler(handler: (msg: string) => void): void;
export declare const shellTool: Tool;
