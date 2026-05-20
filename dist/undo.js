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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndoManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 撤销/重做管理器
 */
class UndoManager {
    undoStack = [];
    redoStack = [];
    maxHistory;
    constructor(maxHistory = 50) {
        this.maxHistory = maxHistory;
    }
    /**
     * 保存文件修改前的快照
     */
    saveBefore(filePath) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            const snapshot = {
                filePath: fullPath,
                content: fs.readFileSync(fullPath, 'utf-8'),
                timestamp: Date.now(),
            };
            this.undoStack.push(snapshot);
            // 新修改会清空 redo 栈
            this.redoStack = [];
            // 限制历史大小
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack = this.undoStack.slice(-this.maxHistory);
            }
        }
    }
    /**
     * 撤销最后一次修改
     */
    undo() {
        if (this.undoStack.length === 0) {
            return { success: false, message: '没有可撤销的操作' };
        }
        const snapshot = this.undoStack.pop();
        // 保存当前状态到 redo
        if (fs.existsSync(snapshot.filePath)) {
            this.redoStack.push({
                filePath: snapshot.filePath,
                content: fs.readFileSync(snapshot.filePath, 'utf-8'),
                timestamp: Date.now(),
            });
        }
        // 恢复
        fs.writeFileSync(snapshot.filePath, snapshot.content, 'utf-8');
        return { success: true, message: `已撤销: ${snapshot.filePath}` };
    }
    /**
     * 重做
     */
    redo() {
        if (this.redoStack.length === 0) {
            return { success: false, message: '没有可重做的操作' };
        }
        const snapshot = this.redoStack.pop();
        // 保存当前状态到 undo
        if (fs.existsSync(snapshot.filePath)) {
            this.undoStack.push({
                filePath: snapshot.filePath,
                content: fs.readFileSync(snapshot.filePath, 'utf-8'),
                timestamp: Date.now(),
            });
        }
        fs.writeFileSync(snapshot.filePath, snapshot.content, 'utf-8');
        return { success: true, message: `已重做: ${snapshot.filePath}` };
    }
    /**
     * 查看历史
     */
    getHistory() {
        if (this.undoStack.length === 0)
            return '无撤销历史';
        const lines = this.undoStack.map((s, i) => {
            const time = new Date(s.timestamp).toLocaleTimeString();
            return `  ${this.undoStack.length - i}. [${time}] ${s.filePath}`;
        });
        return lines.join('\n');
    }
    get undoCount() { return this.undoStack.length; }
    get redoCount() { return this.redoStack.length; }
}
exports.UndoManager = UndoManager;
//# sourceMappingURL=undo.js.map