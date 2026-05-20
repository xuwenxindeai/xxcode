"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
exports.countMessageTokens = countMessageTokens;
exports.compressMessages = compressMessages;
exports.truncateToolOutput = truncateToolOutput;
const types_1 = require("./types");
function countTokens(text) {
    // 粗略估算：中文 ~1.5 token/字，英文 ~0.25 token/字符
    let chinese = 0;
    let other = 0;
    for (const char of text) {
        const code = char.charCodeAt(0);
        if (code >= 0x4e00 && code <= 0x9fff)
            chinese++;
        else
            other++;
    }
    return Math.ceil(chinese * 1.5) + Math.ceil(other * 0.25);
}
function countMessageTokens(msg) {
    let total = countTokens((0, types_1.messageText)(msg) || '');
    total += 4; // role + overhead
    if (msg.tool_calls)
        total += countTokens(JSON.stringify(msg.tool_calls));
    if (msg.tool_call_id)
        total += countTokens(msg.tool_call_id);
    if (msg.name)
        total += countTokens(msg.name);
    if (Array.isArray(msg.content)) {
        total += msg.content.length * 85; // image_url 基础开销
    }
    return total;
}
/**
 * 压缩消息历史，保留 system prompt + 最新消息，中间的截断
 */
function compressMessages(messages, maxTokens = 80000) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    // 从后往前保留最近的对话
    const compressed = [...systemMessages];
    let usedTokens = compressed.reduce((sum, m) => sum + countMessageTokens(m), 0);
    const recentMessages = [...messages].reverse();
    for (const msg of recentMessages) {
        if (msg.role === 'system')
            continue;
        const msgTokens = countMessageTokens(msg);
        if (usedTokens + msgTokens > maxTokens) {
            break;
        }
        compressed.unshift(msg);
        usedTokens += msgTokens;
    }
    // 确保 system prompt 在最前
    return systemMessages.concat(compressed.filter(m => m.role !== 'system'));
}
/**
 * 截断过长工具输出
 */
function truncateToolOutput(output, maxChars = 3000) {
    if (output.length <= maxChars)
        return output;
    const keep = maxChars - 50;
    return output.slice(0, keep) + '\n\n...(输出过长，已截断)';
}
//# sourceMappingURL=context.js.map