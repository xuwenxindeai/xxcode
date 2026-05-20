export interface SandboxConfig {
    timeout: number;
    maxMemory: number;
    network: boolean;
    maxCpu: number;
    allowedDirs: string[];
}
/**
 * 代码沙箱执行器
 * 使用 Docker 或 nexec（macOS 原生）隔离代码执行
 */
export declare class CodeSandbox {
    private config;
    private cwd;
    private tempDir;
    constructor(cwd: string, config?: Partial<SandboxConfig>);
    /**
     * 执行代码（尝试沙箱隔离）
     */
    execute(code: string, lang: string): Promise<{
        success: boolean;
        output: string;
        error: string;
    }>;
    /**
     * 执行命令（受限环境）
     */
    runCommand(cmd: string): Promise<{
        success: boolean;
        output: string;
        error: string;
    }>;
    private isDockerAvailable;
    private runInDocker;
    private runRestricted;
    private getDockerImage;
    private getExtension;
    /**
     * 清理沙箱临时文件
     */
    cleanup(): void;
    /**
     * 获取沙箱状态
     */
    getStatus(): {
        tempDir: string;
        config: SandboxConfig;
    };
}
