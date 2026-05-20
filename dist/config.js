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
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 默认配置
const DEFAULT_CONFIG = {
    model: 'gpt-4o',
    maxIterations: 30,
    maxToolTokens: 3000,
    maxContextTokens: 60000,
    autoApprove: ['ls', 'cat', 'echo', 'pwd', 'head', 'tail', 'wc'],
    skipApproval: false,
    testCommand: 'npm test',
    lintCommand: 'npm run lint',
    autoTest: true,
    maxTestRetries: 3,
    autoCommit: false,
    commitPrefix: '🤖 coding-agent: ',
    maxSubAgents: 3,
};
const CONFIG_FILES = [
    '.coding-agent.json',
    '.coding-agent.js',
    'coding-agent.json',
];
function loadConfig(dir, overrides = {}) {
    let fileConfig = {};
    // 查找配置文件
    for (const file of CONFIG_FILES) {
        const filePath = path.join(dir, file);
        if (fs.existsSync(filePath)) {
            try {
                if (file.endsWith('.json')) {
                    fileConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                }
                else if (file.endsWith('.js')) {
                    fileConfig = require(filePath);
                }
                console.log(`📄 已加载配置: ${file}`);
            }
            catch (e) {
                console.error(`⚠️  配置文件解析失败: ${file} - ${e.message}`);
            }
            break;
        }
    }
    return {
        cwd: dir,
        ...DEFAULT_CONFIG,
        ...fileConfig,
        ...overrides,
    };
}
function saveConfig(dir, config) {
    const filePath = path.join(dir, '.coding-agent.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log(`💾 已保存配置: ${filePath}`);
}
//# sourceMappingURL=config.js.map