/**
 * Progress Monitor: Enhanced live progress monitoring for parallel tasks
 * 
 * Improves on bash's basic spinner with:
 * - Multi-line task status display
 * - Elapsed time tracking
 * - Latest log activity per task
 * - Colorized status indicators
 */

import * as fs from 'fs';
import * as path from 'path';
import { log } from '../logger.js';

export type TaskProgress = {
    id: string;
    name: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startTime?: number;
    endTime?: number;
    latestActivity?: string;
};

export class ProgressMonitor {
    private tasks: Map<string, TaskProgress> = new Map();
    private startTime: number = 0;
    private logDir: string;
    private renderedLines: number = 0;

    constructor(logDir: string) {
        this.logDir = logDir;
    }

    /**
     * Start monitoring tasks
     */
    start(taskIds: string[], taskNames: string[]): void {
        this.startTime = Date.now();

        // Initialize task states
        taskIds.forEach((id, index) => {
            this.tasks.set(id, {
                id,
                name: taskNames[index] || id,
                status: 'PENDING',
            });
        });

        // Initial render
        this.renderUI();
    }

    /**
     * Update task status
     */
    update(taskId: string, status: TaskProgress['status'], activity?: string): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        const now = Date.now();

        if (status === 'RUNNING' && !task.startTime) {
            task.startTime = now;
        }

        if ((status === 'COMPLETED' || status === 'FAILED') && !task.endTime) {
            task.endTime = now;
        }

        task.status = status;
        if (activity) {
            task.latestActivity = activity;
        }

        this.renderUI();
    }

    /**
     * Stop monitoring and show final summary
     */
    stop(): void {
        // Clear the static UI one last time to print the summary cleanly below it
        // Or just leave it there and print summary below.
        // Let's leave it and print summary below.
        this.renderUI();
        this.printSummary();
    }

    /**
     * Render the monitoring UI
     */
    private renderUI(): void {
        // Move cursor up to overwrite previous output
        if (this.renderedLines > 0) {
            process.stdout.write(`\x1b[${this.renderedLines}A`);
        }

        const lines: string[] = [];

        const running = Array.from(this.tasks.values()).filter(t => t.status === 'RUNNING').length;
        const completed = Array.from(this.tasks.values()).filter(t => t.status === 'COMPLETED').length;
        const failed = Array.from(this.tasks.values()).filter(t => t.status === 'FAILED').length;
        const total = this.tasks.size;

        const elapsed = this.formatElapsedTime(Date.now() - this.startTime);

        // Header
        const header = `⚡ Progress: ${completed + failed}/${total} (Running: ${running}, Failed: ${failed}) | Elapsed: ${elapsed}`;
        lines.push(`\x1b[K${log.colors.BLUE}${header}${log.colors.RESET}`);

        // Task list
        for (const task of this.tasks.values()) {
            const statusIcon = this.getStatusIcon(task.status);
            const statusColor = this.getStatusColor(task.status);
            const duration = this.getTaskDuration(task);

            let line = `  ${statusColor}${statusIcon} ${task.name}${log.colors.RESET}`;

            // Add duration for completed/failed tasks
            if (duration) {
                line += ` ${log.colors.CYAN}(${duration})${log.colors.RESET}`;
            }

            // Add latest activity if available
            if (task.status === 'RUNNING' && task.latestActivity) {
                const activity = task.latestActivity.substring(0, 40);
                line += ` ${log.colors.DIM}${activity}...${log.colors.RESET}`;
            } else if (task.status === 'PENDING') {
                line += ` ${log.colors.DIM}(waiting)${log.colors.RESET}`;
            }

            lines.push(`\x1b[K${line}`);
        }

        // Print all lines
        console.log(lines.join('\n'));
        this.renderedLines = lines.length;
    }

    /**
     * Print final summary
     */
    private printSummary(): void {
        const completed = Array.from(this.tasks.values()).filter(t => t.status === 'COMPLETED').length;
        const failed = Array.from(this.tasks.values()).filter(t => t.status === 'FAILED').length;
        const total = this.tasks.size;

        console.log(''); // Add spacing
        if (failed > 0) {
            log.error(`❌ Completed with failures: ${completed} succeeded, ${failed} failed out of ${total}`);
        } else {
            log.success(`✅ All tasks completed: ${completed}/${total}`);
        }
    }

    /**
     * Get status icon
     */
    private getStatusIcon(status: TaskProgress['status']): string {
        switch (status) {
            case 'PENDING': return '⏳';
            case 'RUNNING': return '⚙️';
            case 'COMPLETED': return '✅';
            case 'FAILED': return '❌';
        }
    }

    /**
     * Get status color
     */
    private getStatusColor(status: TaskProgress['status']): string {
        switch (status) {
            case 'PENDING': return log.colors.YELLOW;
            case 'RUNNING': return log.colors.CYAN;
            case 'COMPLETED': return log.colors.GREEN;
            case 'FAILED': return log.colors.RED;
        }
    }

    /**
     * Get task duration
     */
    private getTaskDuration(task: TaskProgress): string | null {
        if (!task.startTime) return null;

        const end = task.endTime || Date.now();
        const duration = end - task.startTime;
        return this.formatElapsedTime(duration);
    }

    /**
     * Format elapsed time
     */
    private formatElapsedTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Read latest log activity for a task
     */
    async readLatestActivity(taskId: string): Promise<string | undefined> {
        const logFile = path.join(this.logDir, `${taskId}.log`);

        try {
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf-8');
                const lines = content.split('\n').filter(l => l.trim());
                return lines[lines.length - 1];
            }
        } catch {
            // Ignore errors reading log files
        }

        return undefined;
    }
}
