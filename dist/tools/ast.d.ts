import { Tool } from '../types';
/**
 * 获取文件依赖关系（import/require 语句）
 */
export declare const dependenciesTool: Tool;
/**
 * 获取文件中的函数/类/变量列表（简易 AST 解析）
 */
export declare const symbolsTool: Tool;
/**
 * 生成函数调用关系图（简易版）
 */
export declare const callGraphTool: Tool;
