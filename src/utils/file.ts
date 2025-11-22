/**
 * File operation utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
}

/**
 * Check if a directory exists
 */
export function dirExists(dirPath: string): boolean {
    try {
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Read file content safely
 */
export function readFile(filePath: string): string {
    if (!fileExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Write file content safely (creates parent directories if needed)
 */
export function writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!dirExists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Get file size in KB
 */
export function getFileSizeKB(filePath: string): number {
    if (!fileExists(filePath)) {
        return 0;
    }
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
    if (!dirExists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Read and parse JSON file safely
 */
export function readJsonFile(filePath: string): Record<string, unknown> {
    if (!fileExists(filePath)) {
        throw new Error(`JSON file not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Invalid JSON in file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
