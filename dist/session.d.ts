export interface Session {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    task: string;
    messageCount: number;
    toolCalls: number;
    summary: string;
}
export declare function createSession(task: string): Session;
export declare function updateSession(id: string, updates: Partial<Session>): void;
export declare function listSessions(): Session[];
export declare function deleteSession(id: string): boolean;
export declare function getSession(id: string): Session | null;
export declare function formatSessionList(): string;
