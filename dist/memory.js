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
exports.loadMemory = loadMemory;
exports.saveMemory = saveMemory;
exports.createEmptyMemory = createEmptyMemory;
exports.autoDetect = autoDetect;
exports.addTask = addTask;
exports.addConvention = addConvention;
exports.addCommonError = addCommonError;
exports.formatMemoryForContext = formatMemoryForContext;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const MEMORY_FILE = '.agent-memory.json';
const MAX_RECENT_TASKS = 10;
function loadMemory(dir) {
    const filePath = path.join(dir, MEMORY_FILE);
    if (!fs.existsSync(filePath))
        return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    catch {
        return null;
    }
}
function saveMemory(dir, memory) {
    const filePath = path.join(dir, MEMORY_FILE);
    memory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(memory, null, 2));
}
function createEmptyMemory(dir) {
    const memory = {
        projectName: path.basename(dir),
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        language: [],
        framework: [],
        packageManager: 'unknown',
        entryPoints: [],
        keyModules: [],
        conventions: [],
        testPattern: '',
        recentTasks: [],
        commonErrors: [],
        userNotes: [],
    };
    return memory;
}
function autoDetect(dir) {
    const memory = createEmptyMemory(dir);
    // 检测语言
    const { glob } = require('glob');
    // 包管理器
    if (fs.existsSync(path.join(dir, 'package-lock.json')))
        memory.packageManager = 'npm';
    else if (fs.existsSync(path.join(dir, 'yarn.lock')))
        memory.packageManager = 'yarn';
    else if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml')))
        memory.packageManager = 'pnpm';
    // package.json
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            memory.projectName = pkg.name || memory.projectName;
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps.react || deps.vue)
                memory.framework.push('前端框架');
            if (deps.express || deps.fastify)
                memory.framework.push('Node.js 后端');
            if (deps.next)
                memory.framework.push('Next.js');
            if (deps.electron)
                memory.framework.push('Electron');
            // 测试模式
            if (deps.jest)
                memory.testPattern = 'jest';
            else if (deps.vitest)
                memory.testPattern = 'vitest';
            else if (deps.mocha)
                memory.testPattern = 'mocha';
            memory.language.push('TypeScript/JavaScript');
        }
        catch { }
    }
    // Swift/iOS
    if (fs.existsSync(path.join(dir, 'Podfile'))) {
        memory.language.push('Swift/ObjC');
        memory.packageManager = 'cocoapods';
    }
    if (fs.existsSync(path.join(dir, 'Package.swift'))) {
        memory.language.push('Swift');
        memory.packageManager = 'spm';
    }
    // Python
    if (fs.existsSync(path.join(dir, 'requirements.txt')) || fs.existsSync(path.join(dir, 'pyproject.toml'))) {
        memory.language.push('Python');
        memory.packageManager = 'pip';
    }
    if (fs.existsSync(path.join(dir, 'Pipfile')))
        memory.packageManager = 'pipenv';
    if (fs.existsSync(path.join(dir, 'poetry.lock')))
        memory.packageManager = 'poetry';
    // Go
    if (fs.existsSync(path.join(dir, 'go.mod'))) {
        memory.language.push('Go');
        memory.packageManager = 'go mod';
    }
    // Rust
    if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
        memory.language.push('Rust');
        memory.packageManager = 'cargo';
    }
    if (memory.language.length === 0)
        memory.language.push('未知');
    // 入口点
    if (fs.existsSync(path.join(dir, 'src/main.ts')))
        memory.entryPoints.push('src/main.ts');
    if (fs.existsSync(path.join(dir, 'src/index.ts')))
        memory.entryPoints.push('src/index.ts');
    if (fs.existsSync(path.join(dir, 'src/App.tsx')))
        memory.entryPoints.push('src/App.tsx');
    if (fs.existsSync(path.join(dir, 'main.py')))
        memory.entryPoints.push('main.py');
    return memory;
}
function addTask(memory, task, result) {
    memory.recentTasks.push({
        task,
        result: result.slice(0, 200),
        timestamp: new Date().toISOString(),
    });
    if (memory.recentTasks.length > MAX_RECENT_TASKS) {
        memory.recentTasks = memory.recentTasks.slice(-MAX_RECENT_TASKS);
    }
}
function addConvention(memory, convention) {
    if (!memory.conventions.includes(convention)) {
        memory.conventions.push(convention);
    }
}
function addCommonError(memory, pattern, solution) {
    if (!memory.commonErrors.some(e => e.pattern === pattern)) {
        memory.commonErrors.push({ pattern, solution });
    }
}
function formatMemoryForContext(memory) {
    const lines = [
        `## 项目: ${memory.projectName}`,
        `语言: ${memory.language.join(', ')}`,
        `框架: ${memory.framework.join(', ') || '无'}`,
        `包管理器: ${memory.packageManager}`,
    ];
    if (memory.entryPoints.length > 0) {
        lines.push(`入口: ${memory.entryPoints.join(', ')}`);
    }
    if (memory.conventions.length > 0) {
        lines.push(`项目约定: ${memory.conventions.join('; ')}`);
    }
    if (memory.recentTasks.length > 0) {
        lines.push(`最近任务:`);
        for (const t of memory.recentTasks.slice(-3)) {
            lines.push(`  - ${t.task} → ${t.result}`);
        }
    }
    if (memory.commonErrors.length > 0) {
        lines.push(`常见错误:`);
        for (const e of memory.commonErrors) {
            lines.push(`  - ${e.pattern} → ${e.solution}`);
        }
    }
    if (memory.userNotes.length > 0) {
        lines.push(`用户备注: ${memory.userNotes.join('; ')}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=memory.js.map