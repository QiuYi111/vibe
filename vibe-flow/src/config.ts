/**
 * Configuration management and environment variable parsing
 */

import { VibeConfig } from './types.js';

// Default configuration constants
const DEFAULT_INDEX_FILE = 'project_index.json';
const DEFAULT_PLAN_FILE = 'vibe_plan.json';
const DEFAULT_REPORT_FILE = 'vibe_report.md';
const DEFAULT_LOG_DIR = '.vibe_logs';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_PARALLEL_AGENTS = 2;
const DEFAULT_MAX_CONTEXT_SIZE_KB = 500;
const DEFAULT_IGNORE_PATTERNS =
    '**/*.lock,**/node_modules,**/dist,**/.git,**/.DS_Store,**/build,**/.pio,**/.env*,**/*.key,**/secrets.*,**/__pycache__';

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): VibeConfig {
    const maxParallelAgents = process.env.MAX_PARALLEL_AGENTS
        ? parseInt(process.env.MAX_PARALLEL_AGENTS, 10)
        : DEFAULT_MAX_PARALLEL_AGENTS;

    const maxRetries = process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : DEFAULT_MAX_RETRIES;

    // Validate parsed numbers
    if (isNaN(maxParallelAgents) || maxParallelAgents < 1) {
        throw new Error(`Invalid MAX_PARALLEL_AGENTS: ${process.env.MAX_PARALLEL_AGENTS}`);
    }

    if (isNaN(maxRetries) || maxRetries < 1) {
        throw new Error(`Invalid MAX_RETRIES: ${process.env.MAX_RETRIES}`);
    }

    return {
        indexFile: DEFAULT_INDEX_FILE,
        planFile: DEFAULT_PLAN_FILE,
        reportFile: DEFAULT_REPORT_FILE,
        logDir: DEFAULT_LOG_DIR,
        maxRetries,
        maxParallelAgents,
        maxContextSizeKB: DEFAULT_MAX_CONTEXT_SIZE_KB,
        ignorePatterns: DEFAULT_IGNORE_PATTERNS,
    };
}
