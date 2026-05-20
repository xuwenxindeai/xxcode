"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.undoHistoryTool = exports.redoTool = exports.undoTool = void 0;
exports.getUndoManager = getUndoManager;
const undo_1 = require("../undo");
// 全局 undo 实例
let undoManager = null;
function getUndoManager() {
    if (!undoManager) {
        undoManager = new undo_1.UndoManager(50);
    }
    return undoManager;
}
// 撤销
exports.undoTool = {
    name: 'undo',
    description: '撤销上一次文件修改',
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
    async execute(_args, _cwd) {
        const mgr = getUndoManager();
        const result = mgr.undo();
        return { success: result.success, output: result.message, error: result.success ? undefined : result.message };
    },
};
// 重做
exports.redoTool = {
    name: 'redo',
    description: '重做上一次撤销的操作',
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
    async execute(_args, _cwd) {
        const mgr = getUndoManager();
        const result = mgr.redo();
        return { success: result.success, output: result.message, error: result.success ? undefined : result.message };
    },
};
// 查看历史
exports.undoHistoryTool = {
    name: 'undo_history',
    description: '查看撤销/重做历史',
    parameters: {
        type: 'object',
        properties: {},
        required: [],
    },
    async execute(_args, _cwd) {
        const mgr = getUndoManager();
        return { success: true, output: mgr.getHistory() };
    },
};
//# sourceMappingURL=undo.js.map