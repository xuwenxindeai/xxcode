/**
 * 交互式配置向导
 */
export declare class ConfigWizard {
    private rl;
    constructor();
    private ask;
    run(projectDir: string): Promise<void>;
}
