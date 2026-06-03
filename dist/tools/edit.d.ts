import { Tool } from '../types';
/**
 * 精确匹配失败时的模糊匹配：按行 trim 后比较，容忍缩进 / 行尾空白差异。
 * 返回唯一匹配的原始字符区间；多处匹配返回 'multiple'；无匹配返回 null。
 */
export declare function fuzzyMatchUnique(content: string, oldStr: string): {
    start: number;
    end: number;
} | 'multiple' | null;
export declare const editFileTool: Tool;
export declare const appendFileTool: Tool;
