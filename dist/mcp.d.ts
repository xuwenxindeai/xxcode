import * as child_process from 'child_process';
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    server: string;
}
export interface MCPServer {
    name: string;
    command: string;
    args: string[];
    process: child_process.ChildProcess | null;
    connected: boolean;
    tools: MCPTool[];
}
export declare function connectMCP(name: string, command: string, args: string[]): Promise<MCPServer | null>;
export declare function callMCP(serverName: string, toolName: string, args: Record<string, any>): Promise<string | null>;
export declare function getMCPTools(): MCPTool[];
export declare function getMCPStatus(): string;
