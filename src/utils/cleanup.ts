/**
 * Cleanup utilities for graceful shutdown
 *
 * Handles SIGINT/SIGTERM to cleanup worktrees and prevent orphan processes
 */

import { dirExists } from './file.js';
import { runGit } from './childProcess.js';
import { log } from '../logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { TmuxTaskRunner } from '../core/tmuxTaskRunner.js';
import { TableTUI } from './tableTUI.js';

const WORKTREE_BASE_DIR = '.vibe_worktrees';

/**
 * Cleanup all vibe worktrees
 *
 * This function is called on process exit to ensure no orphan worktrees remain
 */
export async function cleanupAllWorktrees(): Promise<void> {
    if (!dirExists(WORKTREE_BASE_DIR)) {
        return;
    }

    try {
        log.warn('🧹 Cleaning up worktrees...');

        // Get all worktree directories
        const entries = fs.readdirSync(WORKTREE_BASE_DIR, { withFileTypes: true });
        const worktreeDirs = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.join(WORKTREE_BASE_DIR, entry.name));

        // Remove each worktree
        for (const worktreePath of worktreeDirs) {
            try {
                const result = await runGit(['worktree', 'remove', worktreePath, '--force']);
                if (result.code === 0) {
                    log.success(`✅ Removed worktree: ${worktreePath}`);
                } else {
                    log.warn(`⚠️ Failed to remove worktree ${worktreePath}: ${result.stderr}`);
                }
            } catch (error) {
                log.warn(`⚠️ Error removing worktree ${worktreePath}: ${error}`);
            }
        }

        log.success('✅ Worktree cleanup complete');
    } catch (error) {
        log.error(`Error during worktree cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Cleanup Tmux sessions and TableTUI
 *
 * This function ensures no orphan tmux sessions remain and UI resources are freed
 */
export async function cleanupTmuxResources(): Promise<void> {
    try {
        log.warn('🧹 Cleaning up Tmux resources...');

        // 清理Tmux会话（内部已处理错误情况）
        await TmuxTaskRunner.cleanup();

        // 清理TableTUI资源
        TableTUI.cleanup();

        log.success('✅ Tmux resource cleanup complete');
    } catch (error) {
        log.error(`Error during Tmux cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Comprehensive cleanup of all resources
 */
export async function cleanupAllResources(): Promise<void> {
    const cleanupTasks: Promise<void>[] = [
        cleanupAllWorktrees(),
        cleanupTmuxResources()
    ];

    try {
        await Promise.allSettled(cleanupTasks);
        log.success('🧹 All resource cleanup completed');
    } catch (error) {
        log.error(`Error during comprehensive cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Register signal handlers for graceful shutdown
 *
 * Listens for SIGINT (Ctrl+C) and SIGTERM and performs cleanup before exit
 */
export function registerShutdownHandlers(): void {
    let isShuttingDown = false;

    const handleShutdown = async (signal: string, exitCode: number) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;

        console.log(''); // New line after ^C
        log.warn(`🛑 Received ${signal}, cleaning up...`);

        try {
            await cleanupAllResources();
        } catch (error) {
            log.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        process.exit(exitCode);
    };

    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', () => handleShutdown('SIGINT', 130));

    // Handle termination signal (SIGTERM)
    process.on('SIGTERM', () => handleShutdown('SIGTERM', 143));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
        log.error(`Uncaught exception: ${error.message}`);
        await handleShutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', async (reason) => {
        log.error(`Unhandled rejection: ${reason}`);
        await handleShutdown('unhandledRejection', 1);
    });
}
