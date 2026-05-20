import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import readline from 'readline';

/**
 * 交互式配置向导
 */
export class ConfigWizard {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private ask(question: string, defaultValue?: string): Promise<string> {
    return new Promise(resolve => {
      const prompt = defaultValue
        ? `${chalk.green(question)} ${chalk.gray(`[${defaultValue}]`)}`
        : chalk.green(question);
      this.rl.question(`${prompt}: `, answer => {
        resolve(answer || defaultValue || '');
      });
    });
  }

  async run(projectDir: string): Promise<void> {
    console.log(chalk.bold.cyan('\n🧙  Coding Agent 配置向导\n'));

    // 1. 模型选择
    const model = await this.ask('LLM 模型', 'gpt-4o');

    // 2. API Key
    let apiKey = await this.ask('OpenAI API Key', '');
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || '';
    }

    // 3. API Base URL
    const baseUrl = await this.ask('API Base URL（留空使用默认）', '');

    // 4. 最大迭代
    const maxIter = parseInt(await this.ask('最大迭代轮数', '30'));

    // 5. 自动测试
    const autoTest = await this.ask('任务完成后自动测试？(y/n)', 'y');

    // 6. 测试命令
    const testCmd = await this.ask('测试命令', 'npm test');

    // 7. 自动提交
    const autoCommit = await this.ask('任务完成后自动 Git 提交？(y/n)', 'n');

    // 8. 提交前缀
    const commitPrefix = await this.ask('提交消息前缀', '🤖 coding-agent: ');

    // 9. 跳过审批
    const skipApproval = await this.ask('跳过所有审批？（不推荐）(y/n)', 'n');

    // 10. MCP 服务器
    console.log(chalk.gray('\n--- MCP 服务器配置（可选，回车跳过） ---'));
    const mcpServers: { name: string; command: string; args: string[] }[] = [];
    while (true) {
      const name = await this.ask('MCP 服务器名称（留空结束）', '');
      if (!name) break;
      const command = await this.ask('  命令', '');
      const argsStr = await this.ask('  参数（空格分隔）', '');
      mcpServers.push({ name, command, args: argsStr.split(' ').filter(Boolean) });
    }

    // 生成配置
    const config: Record<string, any> = {
      model,
      maxIterations: maxIter,
      autoTest: autoTest.toLowerCase() === 'y',
      testCommand: testCmd,
      autoCommit: autoCommit.toLowerCase() === 'y',
      commitPrefix,
      skipApproval: skipApproval.toLowerCase() === 'y',
      maxSubAgents: 3,
    };

    if (baseUrl) config.baseUrl = baseUrl;
    if (mcpServers.length > 0) config.mcpServers = mcpServers;

    // 写入配置
    const configPath = path.join(projectDir, '.coding-agent.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\n✅ 配置已保存到: ${configPath}`));

    // 写入 .env（如果有 API Key）
    if (apiKey) {
      const envPath = path.join(projectDir, '.env');
      fs.writeFileSync(envPath, `OPENAI_API_KEY=${apiKey}\n`);
      console.log(chalk.green(`✅ API Key 已保存到: ${envPath}`));
    }

    console.log(chalk.gray('\n运行以下命令启动 Agent:'));
    console.log(chalk.cyan(`  node dist/index.js -i -d ${projectDir}\n`));

    this.rl.close();
  }
}
