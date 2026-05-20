export type PluginSource = 'local' | 'npm' | 'git';
export interface PluginConfig {
    name: string;
    version: string;
    source: PluginSource;
    entry: string;
    npmPackage?: string;
    gitUrl?: string;
    enabled: boolean;
    description: string;
    tools: string[];
    config?: Record<string, any>;
    installedAt?: string;
}
export interface PluginRegistry {
    plugins: PluginConfig[];
}
/**
 * 插件系统 — 支持 npm 安装 + 热重载
 */
export declare class PluginManager {
    private cwd;
    private registry;
    private loadedPlugins;
    private pluginDir;
    private fileWatchers;
    constructor(cwd: string);
    private loadRegistry;
    private saveRegistry;
    /**
     * 安装本地插件
     */
    installPlugin(config: PluginConfig): Promise<boolean>;
    /**
     * 从 npm 安装插件
     */
    installFromNpm(packageName: string, pluginConfig?: Partial<PluginConfig>): Promise<{
        success: boolean;
        output: string;
        error: string;
    }>;
    /**
     * 从 Git 仓库安装插件
     */
    installFromGit(gitUrl: string, pluginConfig?: Partial<PluginConfig>): Promise<{
        success: boolean;
        output: string;
        error: string;
    }>;
    /**
     * 热重载指定插件
     */
    hotReload(name: string): Promise<{
        success: boolean;
        output: string;
    }>;
    /**
     * 监听插件文件变化，自动热重载
     */
    private watchPluginFile;
    /**
     * 卸载插件
     */
    uninstallPlugin(name: string): boolean;
    /**
     * 启用/禁用插件
     */
    togglePlugin(name: string, enabled: boolean): boolean;
    /**
     * 加载所有已启用的插件
     */
    loadAllPlugins(): Promise<Map<string, any>>;
    /**
     * 获取插件提供的工具列表
     */
    getPluginTools(): any[];
    /**
     * 列出所有插件
     */
    listPlugins(): PluginConfig[];
    /**
     * 获取插件状态
     */
    getPluginStatus(): string;
}
export declare function createTemplatePlugin(): any;
