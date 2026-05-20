"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPlan = renderPlan;
exports.generatePlan = generatePlan;
const chalk_1 = __importDefault(require("chalk"));
const types_1 = require("./types");
const llm = __importStar(require("./llm"));
/**
 * 渲染计划到终端
 */
function renderPlan(plan) {
    const bar = '─'.repeat(60);
    console.log(`\n${chalk_1.default.gray(bar)}`);
    console.log(chalk_1.default.bold.cyan(`📋 计划: ${plan.title}`));
    console.log(chalk_1.default.gray(bar));
    for (const step of plan.steps) {
        const icon = {
            pending: '  ○',
            running: chalk_1.default.yellow('  ◉'),
            done: chalk_1.default.green('  ●'),
            failed: chalk_1.default.red('  ✗'),
            skipped: chalk_1.default.gray('  ○'),
        }[step.status];
        const prefix = step.id === plan.currentStep ? chalk_1.default.bold(`[${step.id}]`) : ` ${step.id} `;
        console.log(`${icon} ${prefix} ${step.title}`);
        if (step.status === 'running') {
            console.log(`     └─ ${chalk_1.default.gray(step.description)}`);
        }
    }
    console.log(chalk_1.default.gray(bar));
}
/**
 * 让 LLM 生成计划
 */
async function generatePlan(model, messages, systemPrompt) {
    const planMessages = [
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
    let jsonStr = (0, types_1.messageText)(reply) || '';
    // 提取 JSON（可能在 markdown 代码块里）
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch)
        jsonStr = jsonMatch[1];
    try {
        const data = JSON.parse(jsonStr);
        return {
            title: data.title || '任务计划',
            steps: (data.steps || []).map((s, i) => ({
                id: s.id || i + 1,
                title: s.title || `步骤 ${i + 1}`,
                description: s.description || '',
                status: 'pending',
            })),
            currentStep: 0,
        };
    }
    catch (e) {
        // 解析失败，回退到默认计划
        console.log(chalk_1.default.yellow(`⚠️  计划解析失败，使用默认计划`));
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
//# sourceMappingURL=plan.js.map