import { Message } from './types';
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
export declare function renderPlan(plan: Plan): void;
/**
 * 让 LLM 生成计划
 */
export declare function generatePlan(model: string, messages: Message[], systemPrompt: string): Promise<Plan>;
