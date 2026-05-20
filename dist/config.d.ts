export interface CodingAgentConfig {
    model: string;
    apiKey: string;
    baseUrl?: string;
    cwd: string;
    maxIterations: number;
    maxToolTokens: number;
    maxContextTokens: number;
    autoApprove: string[];
    skipApproval: boolean;
    testCommand: string;
    lintCommand: string;
    autoTest: boolean;
    maxTestRetries: number;
    autoCommit: boolean;
    commitPrefix: string;
    maxSubAgents: number;
    mcpServers?: {
        name: string;
        command: string;
        args: string[];
    }[];
}
export declare function loadConfig(dir: string, overrides?: Partial<CodingAgentConfig>): CodingAgentConfig;
export declare function saveConfig(dir: string, config: Partial<CodingAgentConfig>): void;
