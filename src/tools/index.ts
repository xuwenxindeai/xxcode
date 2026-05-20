import { Tool } from '../types';
import { readTool, writeTool, searchFilesTool, listDirTool } from './file';
import { shellTool } from './shell';
import { editFileTool, appendFileTool } from './edit';
import { grepTool, findSymbolTool } from './grep';
import { gitStatusTool, gitDiffTool, gitCommitTool, gitLogTool } from './git';
import { treeTool, peekTool } from './project';
import { dependenciesTool, symbolsTool, callGraphTool } from './ast';
import { undoTool, redoTool, undoHistoryTool } from './undo';
import { applyDiffTool, generateDiffTool } from './diff';
import { sessionTool, listSessionsTool, deleteSessionTool } from './session-tool';
import { webSearchTool, webFetchTool } from './web';
import { lspHoverTool, lspDefinitionTool, lspReferencesTool, lspDiagnosticsTool } from './lsp-tool';
import { dockerPsTool, dockerLogsTool, dockerExecTool, dockerComposeTool } from './docker';
import { sqliteQueryTool, sqliteTablesTool, sqliteSchemaTool } from './extra';
import { formatTool, readImageTool, notifyTool, mcpStatusTool } from './util';
import { codeReviewTool, batchReviewTool } from './review';
import { envTool, httpServerTool, archiveTool, sshTool, configTool } from './ops';
import { psTool, killTool, pingTool, portCheckTool, curlTool, logTool, perfTool } from './sysops';
import { pythonReplTool, pipTool, npmTool, screenshotTool, regexTool, detectEncodingTool, envManagerTool } from './devtools';
import { browserTool, fetchPageTool, gitBranchTool, gitMergeTool, chmodTool } from './browser';
import { takeScreenshotTool, visionTool, screenshotAnalyzeTool, analyzeImageTool } from './vision';

export const tools: Tool[] = [
  readTool, writeTool, editFileTool, appendFileTool, peekTool,
  searchFilesTool, listDirTool, treeTool,
  grepTool, findSymbolTool,
  shellTool,
  gitStatusTool, gitDiffTool, gitCommitTool, gitLogTool,
  dependenciesTool, symbolsTool, callGraphTool,
  undoTool, redoTool, undoHistoryTool,
  applyDiffTool, generateDiffTool,
  sessionTool, listSessionsTool, deleteSessionTool,
  webSearchTool, webFetchTool,
  lspHoverTool, lspDefinitionTool, lspReferencesTool, lspDiagnosticsTool,
  dockerPsTool, dockerLogsTool, dockerExecTool, dockerComposeTool,
  sqliteQueryTool, sqliteTablesTool, sqliteSchemaTool,
  formatTool, readImageTool, notifyTool, mcpStatusTool,
  codeReviewTool, batchReviewTool,
  envTool, httpServerTool, archiveTool, sshTool, configTool,
  psTool, killTool, pingTool, portCheckTool, curlTool, logTool, perfTool,
  pythonReplTool, pipTool, npmTool, screenshotTool, regexTool, detectEncodingTool, envManagerTool,
  browserTool, fetchPageTool, gitBranchTool, gitMergeTool, chmodTool,
  takeScreenshotTool, visionTool, screenshotAnalyzeTool, analyzeImageTool,
];

export function getTool(name: string): Tool | undefined {
  return tools.find(t => t.name === name);
}

export function toOpenAIFormat(): any[] {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
