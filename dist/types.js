"use strict";
// ============ 类型定义 ============
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageText = messageText;
function messageText(msg) {
    if (typeof msg.content === 'string')
        return msg.content;
    return msg.content.filter(c => c.type === 'text').map(c => c.text || '').join(' ');
}
//# sourceMappingURL=types.js.map