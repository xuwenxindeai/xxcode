export declare class TestRunner {
    private cwd;
    constructor(cwd: string);
    /**
     * 执行测试并返回结果
     */
    runTest(command: string): Promise<{
        success: boolean;
        output: string;
        error?: string;
    }>;
    /**
     * 执行 lint
     */
    runLint(command: string): Promise<{
        success: boolean;
        output: string;
        error?: string;
    }>;
}
