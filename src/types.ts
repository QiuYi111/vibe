/**
 * Core type definitions for Vibe Flow
 */

export type Domain = 'HARDWARE' | 'AI_ROBOT' | 'WEB' | 'PYTHON_GENERIC' | 'GENERIC';
export type Mode = 'SCRATCH' | 'INIT_INDEX' | 'MAINTAIN';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'HEALED';

export interface VibeConfig {
    indexFile: string;
    planFile: string;
    reportFile: string;
    logDir: string;
    maxRetries: number;
    maxParallelAgents: number;
    maxContextSizeKB: number;
    ignorePatterns: string;
}

export interface TaskPlanItem {
    id: string;
    name: string;
    desc: string;
}

export interface TaskState {
    id: string;
    name: string;
    desc: string;
    branchName: string;
    worktreePath: string;
    status: TaskStatus;
    attempts: number;
    logFile: string;
    startTime?: number;
    endTime?: number;
}

export interface SessionState {
    mode: Mode;
    domain: Domain;
    startHash: string;
    tasks: TaskState[];
}

export interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}
