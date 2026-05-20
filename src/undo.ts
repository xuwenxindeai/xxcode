import * as fs from 'fs';
import * as path from 'path';

// 文件快照
interface FileSnapshot {
  filePath: string;
  content: string;
  timestamp: number;
}

/**
 * 撤销/重做管理器
 */
export class UndoManager {
  private undoStack: FileSnapshot[] = [];
  private redoStack: FileSnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * 保存文件修改前的快照
   */
  saveBefore(filePath: string): void {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const snapshot: FileSnapshot = {
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
  undo(): { success: boolean; message: string } {
    if (this.undoStack.length === 0) {
      return { success: false, message: '没有可撤销的操作' };
    }

    const snapshot = this.undoStack.pop()!;
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
  redo(): { success: boolean; message: string } {
    if (this.redoStack.length === 0) {
      return { success: false, message: '没有可重做的操作' };
    }

    const snapshot = this.redoStack.pop()!;
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
  getHistory(): string {
    if (this.undoStack.length === 0) return '无撤销历史';
    const lines = this.undoStack.map((s, i) => {
      const time = new Date(s.timestamp).toLocaleTimeString();
      return `  ${this.undoStack.length - i}. [${time}] ${s.filePath}`;
    });
    return lines.join('\n');
  }

  get undoCount(): number { return this.undoStack.length; }
  get redoCount(): number { return this.redoStack.length; }
}
