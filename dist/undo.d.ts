/**
 * 撤销/重做管理器
 */
export declare class UndoManager {
    private undoStack;
    private redoStack;
    private maxHistory;
    constructor(maxHistory?: number);
    /**
     * 保存文件修改前的快照
     */
    saveBefore(filePath: string): void;
    /**
     * 撤销最后一次修改
     */
    undo(): {
        success: boolean;
        message: string;
    };
    /**
     * 重做
     */
    redo(): {
        success: boolean;
        message: string;
    };
    /**
     * 查看历史
     */
    getHistory(): string;
    get undoCount(): number;
    get redoCount(): number;
}
