import * as fs from 'fs';
import * as path from 'path';

export interface CodingAgentConfig {
  // LLM 配置
  model: string;
  apiKey: string;
  baseUrl?: string;

  // 运行配置
  cwd: string;
  maxIterations: number;
  maxToolTokens: number;       // 工具输出最大 token 数
  maxContextTokens: number;    // 上下文最大 token 数
  autoApprove: string[];       // 自动审批的命令前缀
  skipApproval: boolean;       // 跳过所有审批（危险！）

  // 测试配置
  testCommand: string;         // 测试命令（如 npm test）
  lintCommand: string;         // lint 命令
  autoTest: boolean;           // 写完代码自动跑测试
  maxTestRetries: number;      // 测试失败最大重试次数

  // Git 配置
  autoCommit: boolean;         // 任务完成自动 commit
  commitPrefix: string;        // commit 前缀

  // 子 Agent 配置
  maxSubAgents: number;        // 最大并行子 Agent 数

  // MCP 服务器配置
  mcpServers?: { name: string; command: string; args: string[] }[];
}

// 默认配置
const DEFAULT_CONFIG: Partial<CodingAgentConfig> = {
  model: 'gpt-4o',
  maxIterations: 30,
  maxToolTokens: 3000,
  maxContextTokens: 60000,
  autoApprove: ['ls', 'cat', 'echo', 'pwd', 'head', 'tail', 'wc'],
  skipApproval: false,
  testCommand: 'npm test',
  lintCommand: 'npm run lint',
  autoTest: true,
  maxTestRetries: 3,
  autoCommit: false,
  commitPrefix: '🤖 coding-agent: ',
  maxSubAgents: 3,
};

const CONFIG_FILES = [
  '.coding-agent.json',
  '.coding-agent.js',
  'coding-agent.json',
];

export function loadConfig(dir: string, overrides: Partial<CodingAgentConfig> = {}): CodingAgentConfig {
  let fileConfig: Partial<CodingAgentConfig> = {};

  // 查找配置文件
  for (const file of CONFIG_FILES) {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      try {
        if (file.endsWith('.json')) {
          fileConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else if (file.endsWith('.js')) {
          fileConfig = require(filePath);
        }
        console.log(`📄 已加载配置: ${file}`);
      } catch (e: any) {
        console.error(`⚠️  配置文件解析失败: ${file} - ${e.message}`);
      }
      break;
    }
  }

  return {
    cwd: dir,
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...overrides,
  } as CodingAgentConfig;
}

export function saveConfig(dir: string, config: Partial<CodingAgentConfig>) {
  const filePath = path.join(dir, '.coding-agent.json');
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  console.log(`💾 已保存配置: ${filePath}`);
}
