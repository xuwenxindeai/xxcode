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
exports.logError = logError;
exports.getLogDir = getLogDir;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const LOG_DIR = path.join(os.homedir(), '.xxcode', 'logs');
/**
 * 把错误写入 ~/.xxcode/logs/error.log，返回日志文件路径（失败则返回空串）。
 * 之前 xxcode 的异常只打到终端、不落盘，出错后无从排查——这里补上持久化。
 */
function logError(err, context) {
    try {
        if (!fs.existsSync(LOG_DIR))
            fs.mkdirSync(LOG_DIR, { recursive: true });
        const file = path.join(LOG_DIR, 'error.log');
        const ts = new Date().toISOString();
        const detail = (err && (err.stack || err.message)) || String(err);
        fs.appendFileSync(file, `[${ts}]${context ? ' [' + context + ']' : ''}\n${detail}\n\n`);
        return file;
    }
    catch {
        return '';
    }
}
function getLogDir() {
    return LOG_DIR;
}
//# sourceMappingURL=logger.js.map