import chalk from 'chalk';
import { Message, messageText } from './types';
import * as llm from './llm';
import { compressMessages, countTokens, countMessageTokens } from './context';

export interface PlanStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
}

export interface Plan {
  title: string;
  steps: PlanStep[];
  currentStep: number;
}

/**
 * 渲染计划到终端
 */
export function renderPlan(plan: Plan) {
  const bar = '─'.repeat(60);
  console.log(`\n${chalk.gray(bar)}`);
  console.log(chalk.bold.cyan(`📋 计划: ${plan.title}`));
  console.log(chalk.gray(bar));

  for (const step of plan.steps) {
    const icon = {
      pending: '  ○',
      running: chalk.yellow('  ◉'),
      done: chalk.green('  ●'),
      failed: chalk.red('  ✗'),
      skipped: chalk.gray('  ○'),
    }[step.status];

    const prefix = step.id === plan.currentStep ? chalk.bold(`[${step.id}]`) : ` ${step.id} `;
    console.log(`${icon} ${prefix} ${step.title}`);
    if (step.status === 'running') {
      console.log(`     └─ ${chalk.gray(step.description)}`);
    }
  }
  console.log(chalk.gray(bar));
}

/**
 * 让 LLM 生成计划
 */
export async function generatePlan(
  model: string,
  messages: Message[],
  systemPrompt: string
): Promise<Plan> {
  const planMessages: Message[] = [
    {
      role: 'system',
      content: systemPrompt + `\n\n现在请生成一个执行计划，格式为 JSON：
{
  "title": "任务标题",
  "steps": [
    {"id": 1, "title": "步骤1", "description": "描述"},
    {"id": 2, "title": "步骤2", "description": "描述"}
  ]
}

只返回 JSON，不要其他内容。步骤要具体、可执行、有明确的完成标准。`,
    },
    { role: 'user', content: (messages.find(m => m.role === 'user') || { content: '无' }).content },
  ];

  const reply = await llm.chat(model, planMessages);
  let jsonStr = messageText(reply) || '';

  // 提取 JSON（可能在 markdown 代码块里）
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  try {
    const data = JSON.parse(jsonStr);
    return {
      title: data.title || '任务计划',
      steps: (data.steps || []).map((s: any, i: number) => ({
        id: s.id || i + 1,
        title: s.title || `步骤 ${i + 1}`,
        description: s.description || '',
        status: 'pending' as const,
      })),
      currentStep: 0,
    };
  } catch (e: any) {
    // 解析失败，回退到默认计划
    console.log(chalk.yellow(`⚠️  计划解析失败，使用默认计划`));
    return {
      title: '执行任务',
      steps: [
        { id: 1, title: '理解项目结构', description: '浏览目录了解项目', status: 'pending' },
        { id: 2, title: '理解需求', description: '读取相关文件', status: 'pending' },
        { id: 3, title: '编写代码', description: '实现功能', status: 'pending' },
        { id: 4, title: '验证', description: '运行测试或检查', status: 'pending' },
      ],
      currentStep: 0,
    };
  }
}
