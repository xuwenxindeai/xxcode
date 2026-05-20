import * as child_process from 'child_process';
export interface LSPClient {
    language: string;
    process: child_process.ChildProcess;
    nextRequestId: number;
    rootUri: string;
    initialized: boolean;
}
export declare function startLSP(filePath: string, rootDir: string): Promise<LSPClient | null>;
export declare function lspHover(filePath: string, line: number, column: number): Promise<string | null>;
export declare function lspDefinition(filePath: string, line: number, column: number): Promise<string | null>;
export declare function lspReferences(filePath: string, line: number, column: number): Promise<string | null>;
export declare function lspDiagnostics(filePath: string): Promise<string | null>;
