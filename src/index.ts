#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { Agent, REPLAgent } from './agent';
import { loadConfig } from './config';
import { connectMCP } from './mcp';
import { ConfigWizard } from './wizard';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('coding-agent')
  .description('从零手写的 AI 编程 Agent — 完整可用版')
  .version('1.6.0');

program
  .option('-t, --task <string>', '编程任务描述')
  .option('-i, --interactive', '交互模式 (REPL)')
  .option('-d, --dir <string>', '工作目录', process.cwd())
  .option('-m, --model <string>', 'LLM 模型', 'gpt-4o')
  .option('-k, --api-key <string>', 'OpenAI API Key')
  .option('-b, --base-url <string>', 'API Base URL (兼容接口)')
  .option('-n, --max-iter <number>', '最大迭代轮数', '30')
  .option('--auto-test', '自动运行测试')
  .option('--no-auto-test', '不自动运行测试')
  .option('--auto-commit', '自动 Git 提交')
  .option('--skip-approval', '跳过所有审批（危险）')
  .option('--setup', '启动配置向导')
  .parse(process.argv);

const opts = program.opts();

// 配置向导
if (opts.setup) {
  const wizard = new ConfigWizard();
  wizard.run(path.resolve(opts.dir)).catch(err => {
    console.error(chalk.red('配置失败:'), err.message);
    process.exit(1);
  });
  process.exit(0);
}

// 默认交互模式
if (!opts.task && !opts.interactive) {
  opts.interactive = true;
}

// 读取 API Key
let apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
if (!apiKey) {
  const envPath = path.join(opts.dir, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const match = env.match(/OPENAI_API_KEY\s*=\s*(.+)/);
    if (match) apiKey = match[1].trim();
  }
}

if (!apiKey) {
  console.error(chalk.red('❌ 未找到 API Key'));
  console.error('   请通过以下方式之一提供：');
  console.error('   1. 命令行: -k YOUR_KEY');
  console.error('   2. 环境变量: export OPENAI_API_KEY=xxx');
  console.error('   3. 工作目录 .env 文件: OPENAI_API_KEY=xxx');
  console.error('   4. 配置向导: node dist/index.js --setup');
  process.exit(1);
}

// 加载配置
const agentConfig = loadConfig(opts.dir, {
  model: opts.model,
  apiKey,
  baseUrl: opts.baseUrl,
  cwd: path.resolve(opts.dir),
  maxIterations: parseInt(opts.maxIter),
  autoTest: opts.autoTest,
  autoCommit: opts.autoCommit,
  skipApproval: opts.skipApproval,
});

const config = {
  model: agentConfig.model,
  apiKey: agentConfig.apiKey,
  baseURL: agentConfig.baseUrl,
  cwd: agentConfig.cwd,
  maxIterations: agentConfig.maxIterations,
};

// 连接 MCP 服务器
async function connectMCPServers() {
  if (agentConfig.mcpServers) {
    for (const mcp of agentConfig.mcpServers) {
      console.log(chalk.gray(`🔌 连接 MCP: ${mcp.name}...`));
      const server = await connectMCP(mcp.name, mcp.command, mcp.args);
      if (server) {
        console.log(chalk.green(`   ✅ ${mcp.name}: ${server.tools.length} 工具`));
      } else {
        console.log(chalk.red(`   ❌ ${mcp.name} 连接失败`));
      }
    }
  }
}

async function main() {
  await connectMCPServers();

  if (opts.interactive) {
    const repl = new REPLAgent(config, agentConfig);
    repl.start().catch(err => {
      console.error(chalk.red('💥 启动失败:'), err.message);
      process.exit(1);
    });
  } else if (opts.task) {
    const agent = new Agent(config, agentConfig);
    agent.run(opts.task).catch(err => {
      console.error(chalk.red('💥 Agent 执行失败:'), err.message);
      process.exit(1);
    });
  }
}

main();
