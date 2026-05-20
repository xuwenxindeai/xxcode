import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

const execAsync = util.promisify(exec);

// 沙箱执行环境
export interface SandboxConfig {
  timeout: number;          // 超时秒数
  maxMemory: number;        // 最大内存 MB
  network: boolean;         // 是否允许网络
  maxCpu: number;           // CPU 限制（核数）
  allowedDirs: string[];    // 允许访问的目录
}

const DEFAULT_SANDBOX: SandboxConfig = {
  timeout: 30,
  maxMemory: 256,
  network: false,
  maxCpu: 1,
  allowedDirs: [],
};

/**
 * 代码沙箱执行器
 * 使用 Docker 或 nexec（macOS 原生）隔离代码执行
 */
export class CodeSandbox {
  private config: SandboxConfig;
  private cwd: string;
  private tempDir: string;

  constructor(cwd: string, config?: Partial<SandboxConfig>) {
    this.cwd = cwd;
    this.config = { ...DEFAULT_SANDBOX, ...config };
    this.tempDir = path.join(cwd, '.agent-sandbox');

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 执行代码（尝试沙箱隔离）
   */
  async execute(code: string, lang: string): Promise<{ success: boolean; output: string; error: string }> {
    const tempFile = path.join(this.tempDir, `sandbox_${Date.now()}.${this.getExtension(lang)}`);

    try {
      fs.writeFileSync(tempFile, code);

      // 尝试 Docker 沙箱
      if (await this.isDockerAvailable()) {
        return await this.runInDocker(tempFile, lang);
      }

      // 回退：受限环境执行（无网络 + 超时）
      return await this.runRestricted(tempFile, lang);
    } catch (e: any) {
      return { success: false, output: '', error: e.message };
    } finally {
      // 清理临时文件
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }

  /**
   * 执行命令（受限环境）
   */
  async runCommand(cmd: string): Promise<{ success: boolean; output: string; error: string }> {
    try {
      const result = await execAsync(cmd, {
        cwd: this.tempDir,
        timeout: this.config.timeout * 1000,
        maxBuffer: 5 * 1024 * 1024,
        env: {
          ...process.env,
          // 禁用网络相关环境变量
          HTTP_PROXY: '',
          HTTPS_PROXY: '',
          NO_PROXY: '*',
        },
      });

      return {
        success: true,
        output: result.stdout.trim(),
        error: result.stderr.trim(),
      };
    } catch (e: any) {
      return {
        success: false,
        output: e.stdout?.trim() || '',
        error: e.stderr?.trim() || e.message,
      };
    }
  }

  private async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async runInDocker(file: string, lang: string): Promise<any> {
    const imageName = this.getDockerImage(lang);
    const containerName = `agent-sandbox-${Date.now()}`;
    const mountedFile = '/workspace/code';
    const ext = this.getExtension(lang);

    let cmd: string;
    switch (lang) {
      case 'python':
        cmd = `python3 ${mountedFile}.${ext}`;
        break;
      case 'node':
      case 'javascript':
        cmd = `node ${mountedFile}.${ext}`;
        break;
      case 'bash':
        cmd = `bash ${mountedFile}.${ext}`;
        break;
      default:
        cmd = `cat ${mountedFile}.${ext}`;
    }

    try {
      const networkFlag = this.config.network ? '' : '--network none';

      const { stdout, stderr } = await execAsync(
        `docker run --rm ${networkFlag} ` +
        `--memory=${this.config.maxMemory}m ` +
        `--cpus=${this.config.maxCpu} ` +
        `--name ${containerName} ` +
        `-v "${this.tempDir}:/workspace" ` +
        `--read-only ` +
        `--tmpfs /tmp:exec,size=50m ` +
        `${imageName} ` +
        `${cmd}`,
        {
          timeout: this.config.timeout * 1000,
          maxBuffer: 5 * 1024 * 1024,
        }
      );

      return {
        success: !stderr,
        output: stdout.trim(),
        error: stderr.trim(),
      };
    } catch (e: any) {
      return {
        success: false,
        output: e.stdout?.trim() || '',
        error: e.stderr?.trim() || e.message,
      };
    }
  }

  private async runRestricted(file: string, lang: string): Promise<any> {
    let cmd: string;

    switch (lang) {
      case 'python':
        cmd = `python3 "${file}"`;
        break;
      case 'node':
      case 'javascript':
        cmd = `node "${file}"`;
        break;
      case 'bash':
        cmd = `bash "${file}"`;
        break;
      default:
        return { success: false, output: '', error: `不支持的语言: ${lang}` };
    }

    return await this.runCommand(cmd);
  }

  private getDockerImage(lang: string): string {
    switch (lang) {
      case 'python':
        return 'python:3.11-slim';
      case 'node':
      case 'javascript':
        return 'node:20-slim';
      case 'bash':
        return 'ubuntu:22.04';
      default:
        return 'ubuntu:22.04';
    }
  }

  private getExtension(lang: string): string {
    switch (lang) {
      case 'python':
        return 'py';
      case 'node':
      case 'javascript':
        return 'js';
      case 'bash':
        return 'sh';
      default:
        return 'txt';
    }
  }

  /**
   * 清理沙箱临时文件
   */
  cleanup(): void {
    try {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    } catch {}
  }

  /**
   * 获取沙箱状态
   */
  getStatus(): { tempDir: string; config: SandboxConfig } {
    return {
      tempDir: this.tempDir,
      config: this.config,
    };
  }
}
