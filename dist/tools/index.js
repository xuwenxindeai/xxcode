"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = void 0;
exports.getTool = getTool;
exports.toOpenAIFormat = toOpenAIFormat;
const file_1 = require("./file");
const shell_1 = require("./shell");
const edit_1 = require("./edit");
const grep_1 = require("./grep");
const git_1 = require("./git");
const project_1 = require("./project");
const ast_1 = require("./ast");
const undo_1 = require("./undo");
const diff_1 = require("./diff");
const session_tool_1 = require("./session-tool");
const web_1 = require("./web");
const lsp_tool_1 = require("./lsp-tool");
const docker_1 = require("./docker");
const extra_1 = require("./extra");
const util_1 = require("./util");
const review_1 = require("./review");
const ops_1 = require("./ops");
const sysops_1 = require("./sysops");
const devtools_1 = require("./devtools");
const browser_1 = require("./browser");
const vision_1 = require("./vision");
exports.tools = [
    file_1.readTool, file_1.writeTool, edit_1.editFileTool, edit_1.appendFileTool, project_1.peekTool,
    file_1.searchFilesTool, file_1.listDirTool, project_1.treeTool,
    grep_1.grepTool, grep_1.findSymbolTool,
    shell_1.shellTool,
    git_1.gitStatusTool, git_1.gitDiffTool, git_1.gitCommitTool, git_1.gitLogTool,
    ast_1.dependenciesTool, ast_1.symbolsTool, ast_1.callGraphTool,
    undo_1.undoTool, undo_1.redoTool, undo_1.undoHistoryTool,
    diff_1.applyDiffTool, diff_1.generateDiffTool,
    session_tool_1.sessionTool, session_tool_1.listSessionsTool, session_tool_1.deleteSessionTool,
    web_1.webSearchTool, web_1.webFetchTool,
    lsp_tool_1.lspHoverTool, lsp_tool_1.lspDefinitionTool, lsp_tool_1.lspReferencesTool, lsp_tool_1.lspDiagnosticsTool,
    docker_1.dockerPsTool, docker_1.dockerLogsTool, docker_1.dockerExecTool, docker_1.dockerComposeTool,
    extra_1.sqliteQueryTool, extra_1.sqliteTablesTool, extra_1.sqliteSchemaTool,
    util_1.formatTool, util_1.readImageTool, util_1.notifyTool, util_1.mcpStatusTool,
    review_1.codeReviewTool, review_1.batchReviewTool,
    ops_1.envTool, ops_1.httpServerTool, ops_1.archiveTool, ops_1.sshTool, ops_1.configTool,
    sysops_1.psTool, sysops_1.killTool, sysops_1.pingTool, sysops_1.portCheckTool, sysops_1.curlTool, sysops_1.logTool, sysops_1.perfTool,
    devtools_1.pythonReplTool, devtools_1.pipTool, devtools_1.npmTool, devtools_1.screenshotTool, devtools_1.regexTool, devtools_1.detectEncodingTool, devtools_1.envManagerTool,
    browser_1.browserTool, browser_1.fetchPageTool, browser_1.gitBranchTool, browser_1.gitMergeTool, browser_1.chmodTool,
    vision_1.takeScreenshotTool, vision_1.visionTool, vision_1.screenshotAnalyzeTool, vision_1.analyzeImageTool,
];
function getTool(name) {
    return exports.tools.find(t => t.name === name);
}
function toOpenAIFormat() {
    return exports.tools.map(t => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        },
    }));
}
//# sourceMappingURL=index.js.map