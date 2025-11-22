/**
 * Logging utilities for console and file output
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes
const COLORS = {
    GREEN: '\x1b[0;32m',
    BLUE: '\x1b[0;34m',
    RED: '\x1b[0;31m',
    YELLOW: '\x1b[1;33m',
    CYAN: '\x1b[0;36m',
    NC: '\x1b[0m', // No Color
};

/**
 * Ensure log directory exists
 */
function ensureLogDir(logDir: string): void {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

/**
 * Write to a log file
 */
function writeToFile(filePath: string, message: string): void {
    const dir = path.dirname(filePath);
    ensureLogDir(dir);
    fs.appendFileSync(filePath, `${message}\n`, 'utf-8');
}

/**
 * Logger interface
 */
export const log = {
    info(message: string): void {
        console.log(`${COLORS.BLUE}${message}${COLORS.NC}`);
    },

    success(message: string): void {
        console.log(`${COLORS.GREEN}${message}${COLORS.NC}`);
    },

    warn(message: string): void {
        console.log(`${COLORS.YELLOW}${message}${COLORS.NC}`);
    },

    error(message: string): void {
        console.error(`${COLORS.RED}${message}${COLORS.NC}`);
    },

    cyan(message: string): void {
        console.log(`${COLORS.CYAN}${message}${COLORS.NC}`);
    },

    plain(message: string): void {
        console.log(message);
    },

    /**
     * Write to a task-specific log file
     */
    task(taskId: string, message: string, logDir: string = '.vibe_logs'): void {
        const logFile = path.join(logDir, `${taskId}.log`);
        writeToFile(logFile, message);
    },

    /**
     * Write to a general log file
     */
    file(filePath: string, message: string): void {
        writeToFile(filePath, message);
    },
};
