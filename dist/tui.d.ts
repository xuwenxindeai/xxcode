export declare function renderBorder(title: string, width: number, height: number, x: number, y: number): void;
export declare function renderTopBar(state: {
    round: number;
    tokens: number;
    toolCalls: number;
    time: string;
    width?: number;
}): void;
export declare function renderInfoPanel(info: {
    task: string;
    cwd: string;
    model: string;
    progress?: {
        current: number;
        total: number;
    };
    recentTools?: string[];
    sessionId?: string;
}, x: number, y: number, width: number, height: number): void;
export declare function renderOutputPanel(lines: string[], x: number, y: number, width: number, height: number, scrollTop?: number): void;
export declare function renderBottomBar(state: {
    commands: string;
    status?: string;
    width?: number;
}): void;
export declare function renderToolCallInline(name: string, args: string, success: boolean, y: number, x?: number): string;
export declare function getSpinnerFrame(): string;
export declare function renderSpinner(text: string, y: number, x?: number): void;
export interface DashboardState {
    round: number;
    tokens: number;
    toolCalls: number;
    time: string;
    task: string;
    cwd: string;
    model: string;
    outputLines: string[];
    recentTools: string[];
    progress?: {
        current: number;
        total: number;
    };
    sessionId?: string;
    spinnerText?: string;
}
export declare function renderDashboard(state: DashboardState): void;
export declare function renderStartupBanner(version: string, cwd: string, model: string): void;
export declare function handleTerminalResize(state: DashboardState, renderFn: (state: DashboardState) => void): void;
export declare function cleanupResizeListener(): void;
