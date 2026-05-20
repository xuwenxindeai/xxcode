import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';
import * as os from 'os';

const execAsync = util.promisify(exec);

// 插件来源
export type PluginSource = 'local' | 'npm' | 'git';

// 插件配置
export interface PluginConfig {
  name: string;
  version: string;
  source: PluginSource;        // 来源类型
  entry: string;               // 插件入口文件
  npmPackage?: string;         // npm 包名（source=npm 时）
  gitUrl?: string;             // git 仓库地址（source=git 时）
  enabled: boolean;
  description: string;
  tools: string[];
  config?: Record<string, any>;
  installedAt?: string;        // 安装时间
}

// 插件注册表
export interface PluginRegistry {
  plugins: PluginConfig[];
}

const REGISTRY_PATH = '.agent-plugins/registry.json';

/**
 * 插件系统 — 支持 npm 安装 + 热重载
 */
export class PluginManager {
  private cwd: string;
  private registry: PluginRegistry;
  private loadedPlugins: Map<string, any> = new Map();
  private pluginDir: string;
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();

  constructor(cwd: string) {
    this.cwd = cwd;
    this.pluginDir = path.join(cwd, '.agent-plugins');
    this.registry = this.loadRegistry();

    // 确保插件目录存在
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }
  }

  private loadRegistry(): PluginRegistry {
    const regPath = path.join(this.cwd, REGISTRY_PATH);
    if (fs.existsSync(regPath)) {
      try {
        return JSON.parse(fs.readFileSync(regPath, 'utf-8'));
      } catch {
        return { plugins: [] };
      }
    }
    return { plugins: [] };
  }

  private saveRegistry(): void {
    const regPath = path.join(this.cwd, REGISTRY_PATH);
    fs.mkdirSync(path.dirname(regPath), { recursive: true });
    fs.writeFileSync(regPath, JSON.stringify(this.registry, null, 2));
  }

  /**
   * 安装本地插件
   */
  async installPlugin(config: PluginConfig): Promise<boolean> {
    const entryPath = path.isAbsolute(config.entry)
      ? config.entry
      : path.resolve(this.cwd, config.entry);

    if (!fs.existsSync(entryPath)) {
      return false;
    }

    try {
      const pluginModule = require(entryPath);
      if (typeof pluginModule.register !== 'function') {
        return false;
      }
    } catch {
      return false;
    }

    config.source = 'local';
    config.installedAt = new Date().toISOString();
    const existing = this.registry.plugins.findIndex(p => p.name === config.name);
    if (existing >= 0) {
      this.registry.plugins[existing] = config;
    } else {
      this.registry.plugins.push(config);
    }
    this.saveRegistry();
    return true;
  }

  /**
   * 从 npm 安装插件
   */
  async installFromNpm(packageName: string, pluginConfig?: Partial<PluginConfig>): Promise<{ success: boolean; output: string; error: string }> {
    const pluginDir = path.join(this.pluginDir, 'node_modules_target');
    fs.mkdirSync(pluginDir, { recursive: true });

    try {
      // npm install 到插件目录
      const { stdout, stderr } = await execAsync(
        `npm install --prefix "${pluginDir}" ${packageName}`,
        { timeout: 120000 }
      );

      // 查找入口文件
      const pkgPath = path.join(pluginDir, 'node_modules', packageName, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        return { success: false, output: '', error: `未找到包 ${packageName}` };
      }

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const entry = pkg.main || 'index.js';
      const entryPath = path.join(pluginDir, 'node_modules', packageName, entry);

      if (!fs.existsSync(entryPath)) {
        return { success: false, output: '', error: `入口文件不存在: ${entry}` };
      }

      // 验证插件接口
      try {
        const pluginModule = require(entryPath);
        if (typeof pluginModule.register !== 'function') {
          return { success: false, output: '', error: '插件缺少 register() 函数' };
        }
      } catch (e: any) {
        return { success: false, output: '', error: `加载失败: ${e.message}` };
      }

      // 注册到系统
      const config: PluginConfig = {
        name: pkg.name || packageName,
        version: pkg.version || '0.0.0',
        source: 'npm',
        entry: entryPath,
        npmPackage: packageName,
        enabled: true,
        description: pkg.description || '',
        tools: [],
        config: pluginConfig?.config,
        installedAt: new Date().toISOString(),
      };

      const existing = this.registry.plugins.findIndex(p => p.name === config.name);
      if (existing >= 0) {
        this.registry.plugins[existing] = config;
      } else {
        this.registry.plugins.push(config);
      }
      this.saveRegistry();

      return { success: true, output: `✅ 已安装 ${packageName} v${pkg.version}`, error: stderr };
    } catch (e: any) {
      return { success: false, output: '', error: e.stderr || e.message };
    }
  }

  /**
   * 从 Git 仓库安装插件
   */
  async installFromGit(gitUrl: string, pluginConfig?: Partial<PluginConfig>): Promise<{ success: boolean; output: string; error: string }> {
    const pluginDir = path.join(this.pluginDir, 'git-plugins');
    fs.mkdirSync(pluginDir, { recursive: true });

    const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown-plugin';
    const cloneDir = path.join(pluginDir, repoName);

    try {
      if (fs.existsSync(cloneDir)) {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      }

      await execAsync(`git clone --depth 1 ${gitUrl} "${cloneDir}"`, { timeout: 120000 });

      let entryPath = '';
      let pkg: any = null;
      const pkgPath = path.join(cloneDir, 'package.json');

      if (fs.existsSync(pkgPath)) {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const entry = pkg.main || 'index.js';
        entryPath = path.join(cloneDir, entry);
      } else {
        const jsFiles = fs.readdirSync(cloneDir).filter(f => f.endsWith('.js'));
        for (const jsFile of jsFiles) {
          try {
            const mod = require(path.join(cloneDir, jsFile));
            if (typeof mod.register === 'function') {
              entryPath = path.join(cloneDir, jsFile);
              break;
            }
          } catch {}
        }
      }

      if (!entryPath || !fs.existsSync(entryPath)) {
        return { success: false, output: '', error: '未找到有效入口文件' };
      }

      try {
        const pluginModule = require(entryPath);
        if (typeof pluginModule.register !== 'function') {
          return { success: false, output: '', error: '插件缺少 register() 函数' };
        }
      } catch (e: any) {
        return { success: false, output: '', error: `加载失败: ${e.message}` };
      }

      const config: PluginConfig = {
        name: pkg?.name || repoName,
        version: pkg?.version || '0.0.0',
        source: 'git',
        entry: entryPath,
        gitUrl: gitUrl,
        enabled: true,
        description: pkg?.description || `Git 插件: ${repoName}`,
        tools: [],
        config: pluginConfig?.config,
        installedAt: new Date().toISOString(),
      };

      const existing = this.registry.plugins.findIndex(p => p.name === config.name);
      if (existing >= 0) {
        this.registry.plugins[existing] = config;
      } else {
        this.registry.plugins.push(config);
      }
      this.saveRegistry();

      return { success: true, output: `✅ 已从 Git 安装 ${repoName} v${config.version}`, error: '' };
    } catch (e: any) {
      return { success: false, output: '', error: e.stderr || e.message };
    }
  }

  /**
   * 热重载指定插件
   */
  async hotReload(name: string): Promise<{ success: boolean; output: string }> {
    const plugin = this.registry.plugins.find(p => p.name === name);
    if (!plugin) {
      return { success: false, output: `插件 ${name} 不存在` };
    }

    // 清除 require 缓存
    try {
      const resolved = require.resolve(plugin.entry);
      delete require.cache[resolved];
      console.log(`🔄 已清除缓存: ${plugin.entry}`);
    } catch {
      // 缓存不存在，继续
    }

    // 卸载旧实例
    this.loadedPlugins.delete(name);

    // 停止旧 watcher
    const oldWatcher = this.fileWatchers.get(name);
    if (oldWatcher) {
      oldWatcher.close();
      this.fileWatchers.delete(name);
    }

    // 重新加载
    try {
      const pluginModule = require(plugin.entry);
      if (typeof pluginModule.register !== 'function') {
        return { success: false, output: '插件缺少 register() 函数' };
      }

      const tools = pluginModule.register(plugin.config || {});
      this.loadedPlugins.set(name, { config: plugin, tools });

      // 设置文件监听
      this.watchPluginFile(name, plugin.entry);

      return { success: true, output: `✅ 已热重载 ${name} v${plugin.version}` };
    } catch (e: any) {
      return { success: false, output: `加载失败: ${e.message}` };
    }
  }

  /**
   * 监听插件文件变化，自动热重载
   */
  private watchPluginFile(name: string, filePath: string): void {
    try {
      const watcher = fs.watch(filePath, async (event) => {
        if (event === 'change') {
          console.log(`📝 检测到 ${name} 文件变化，自动热重载...`);
          const result = await this.hotReload(name);
          console.log(`  ${result.output}`);
        }
      });
      this.fileWatchers.set(name, watcher);
    } catch {
      // 监听失败，静默处理
    }
  }

  /**
   * 卸载插件
   */
  uninstallPlugin(name: string): boolean {
    const before = this.registry.plugins.length;
    this.registry.plugins = this.registry.plugins.filter(p => p.name !== name);
    this.loadedPlugins.delete(name);

    if (this.registry.plugins.length < before) {
      this.saveRegistry();
      return true;
    }
    return false;
  }

  /**
   * 启用/禁用插件
   */
  togglePlugin(name: string, enabled: boolean): boolean {
    const plugin = this.registry.plugins.find(p => p.name === name);
    if (!plugin) return false;

    plugin.enabled = enabled;
    this.saveRegistry();

    if (!enabled) {
      this.loadedPlugins.delete(name);
    }

    return true;
  }

  /**
   * 加载所有已启用的插件
   */
  async loadAllPlugins(): Promise<Map<string, any>> {
    for (const plugin of this.registry.plugins) {
      if (plugin.enabled && !this.loadedPlugins.has(plugin.name)) {
        try {
          const entryPath = path.isAbsolute(plugin.entry)
            ? plugin.entry
            : path.resolve(this.cwd, plugin.entry);

          const pluginModule = require(entryPath);
          const tools = pluginModule.register(plugin.config || {});

          this.loadedPlugins.set(plugin.name, {
            config: plugin,
            tools,
          });
        } catch (e: any) {
          console.error(`⚠️  插件 ${plugin.name} 加载失败: ${e.message}`);
        }
      }
    }
    return this.loadedPlugins;
  }

  /**
   * 获取插件提供的工具列表
   */
  getPluginTools(): any[] {
    const allTools: any[] = [];

    for (const [name, plugin] of this.loadedPlugins) {
      if (plugin.tools && Array.isArray(plugin.tools)) {
        allTools.push(...plugin.tools);
      }
    }

    return allTools;
  }

  /**
   * 列出所有插件
   */
  listPlugins(): PluginConfig[] {
    return this.registry.plugins;
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(): string {
    if (this.registry.plugins.length === 0) {
      return '(未安装插件)';
    }

    const lines = this.registry.plugins.map(p => {
      const status = p.enabled ? '✅' : '❌';
      const loaded = this.loadedPlugins.has(p.name) ? '🟢' : '⚪';
      return `  ${status} ${loaded} ${p.name} v${p.version} — ${p.description} [${p.tools.length} 工具]`;
    });

    return `已安装 ${this.registry.plugins.length} 个插件:\n${lines.join('\n')}`;
  }
}

// 示例插件：项目模板生成器
export function createTemplatePlugin(): any {
  return {
    register: (config: any = {}) => [
      {
        name: 'generate_template',
        description: '生成项目模板',
        parameters: {
          type: 'object',
          properties: {
            template: { type: 'string', enum: ['node', 'python', 'go', 'rust'], description: '模板类型' },
            name: { type: 'string', description: '项目名称' },
          },
          required: ['template', 'name'],
        },
        async execute(args: any, cwd: string): Promise<any> {
          const projectPath = path.join(cwd, args.name);

          if (fs.existsSync(projectPath)) {
            return { success: false, output: '', error: `目录已存在: ${projectPath}` };
          }

          fs.mkdirSync(projectPath, { recursive: true });

          switch (args.template) {
            case 'node':
              fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
                name: args.name,
                version: '1.0.0',
                scripts: { start: 'node index.js', test: 'echo "No tests"' },
              }, null, 2));
              fs.writeFileSync(path.join(projectPath, 'index.js'), 'console.log("Hello!");\n');
              break;

            case 'python':
              fs.writeFileSync(path.join(projectPath, 'main.py'), 'print("Hello!")\n');
              fs.writeFileSync(path.join(projectPath, 'requirements.txt'), '# dependencies\n');
              break;

            case 'go':
              fs.writeFileSync(path.join(projectPath, 'main.go'), `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello!")\n}\n`);
              break;

            case 'rust':
              fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
              fs.writeFileSync(path.join(projectPath, 'Cargo.toml'), `[package]\nname = "${args.name}"\nversion = "0.1.0"\nedition = "2021"\n`);
              fs.writeFileSync(path.join(projectPath, 'src', 'main.rs'), 'fn main() {\n    println!("Hello!");\n}\n');
              break;
          }

          return { success: true, output: `✅ 已生成 ${args.template} 项目模板: ${projectPath}` };
        },
      },
    ],
  };
}
