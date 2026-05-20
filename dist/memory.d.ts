export interface ProjectMemory {
    projectName: string;
    detectedAt: string;
    lastUpdated: string;
    language: string[];
    framework: string[];
    packageManager: string;
    entryPoints: string[];
    keyModules: {
        name: string;
        path: string;
        description: string;
    }[];
    conventions: string[];
    testPattern: string;
    recentTasks: {
        task: string;
        result: string;
        timestamp: string;
    }[];
    commonErrors: {
        pattern: string;
        solution: string;
    }[];
    userNotes: string[];
}
export declare function loadMemory(dir: string): ProjectMemory | null;
export declare function saveMemory(dir: string, memory: ProjectMemory): void;
export declare function createEmptyMemory(dir: string): ProjectMemory;
export declare function autoDetect(dir: string): ProjectMemory;
export declare function addTask(memory: ProjectMemory, task: string, result: string): void;
export declare function addConvention(memory: ProjectMemory, convention: string): void;
export declare function addCommonError(memory: ProjectMemory, pattern: string, solution: string): void;
export declare function formatMemoryForContext(memory: ProjectMemory): string;
