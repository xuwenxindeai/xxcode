import { exec } from 'child_process';
import * as util from 'util';
import chalk from 'chalk';

const execAsync = util.promisify(exec);

// 测试执行器
export class TestRunner {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  /**
   * 执行测试并返回结果
   */
  async runTest(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    console.log(chalk.cyan(`\n  🧪 执行测试: ${command}`));

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.cwd,
        timeout: 120000,
        maxBuffer: 2 * 1024 * 1024,
      });

      const output = [stdout, stderr].filter(Boolean).join('\n');
      const success = !stderr?.includes('FAIL') && !stderr?.includes('failed') && stdout?.includes('PASS');

      return {
        success: true,
        output: output || '(测试无输出)',
      };
    } catch (e: any) {
      return {
        success: false,
        output: e.stdout || '',
        error: e.stderr || e.message,
      };
    }
  }

  /**
   * 执行 lint
   */
  async runLint(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    console.log(chalk.cyan(`\n  🧹 执行 Lint: ${command}`));

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.cwd,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });

      const output = [stdout, stderr].filter(Boolean).join('\n');
      return { success: true, output: output || '(Lint 无问题)' };
    } catch (e: any) {
      return {
        success: false,
        output: e.stdout || '',
        error: e.stderr || e.message,
      };
    }
  }
}
