/**
 * Progress Monitor: Table-based TUI for task monitoring
 *
 * Features:
 * - Clean table interface with task status
 * - Real-time updates with tmux session information
 * - Progress tracking and elapsed time
 * - Merge and review phase status
 */

import { TableTUI } from './tableTUI.js';
import { log } from '../logger.js';

// 全局ProgressMonitor实例，供session.ts访问
let globalMonitor: ProgressMonitor | null = null;

export type TaskProgress = {
    id: string;
    name: string;
    status: 'PENDING' | 'RUNNING' | 'REVIEWING' | 'COMPLETED' | 'FAILED';
    startTime?: number;
    endTime?: number;
    latestActivity?: string;
};

export class ProgressMonitor {
    private tableTUI: TableTUI;
    private taskIds: string[] = [];
    private startTime: number = 0;

    constructor(_logDir: string) {
        // TableTUI不需要logDir，但保留参数以兼容现有接口
        this.tableTUI = new TableTUI([], []);
    }

    /**
     * Start monitoring tasks
     */
    start(taskIds: string[], taskNames: string[]): void {
        this.taskIds = taskIds;
        this.startTime = Date.now();

        // 创建新的TableTUI实例
        this.tableTUI = new TableTUI(taskIds, taskNames);
        this.tableTUI.start();

        // 设置全局实例
        globalMonitor = this;
    }

    /**
     * 获取全局ProgressMonitor实例
     */
    static getGlobalInstance(): ProgressMonitor | null {
        return globalMonitor;
    }

    /**
     * Update task status
     */
    update(taskId: string, status: TaskProgress['status'], activity?: string): void {
        let sessionId: string | undefined;

        if (status === 'RUNNING') {
            sessionId = `vibe-task-${taskId}`;
        } else if (status === 'REVIEWING') {
            sessionId = `vibe-task-review-${taskId}`;
        }

        // 转换状态到TableTUI格式
        let tableStatus: 'waiting' | 'running' | 'completed' | 'failed' | 'reviewing';
        switch (status) {
            case 'PENDING':
                tableStatus = 'waiting';
                break;
            case 'RUNNING':
                tableStatus = 'running';
                break;
            case 'REVIEWING':
                tableStatus = 'reviewing';
                break;
            case 'COMPLETED':
                tableStatus = 'completed';
                break;
            case 'FAILED':
                tableStatus = 'failed';
                break;
        }

        this.tableTUI.update(taskId, tableStatus, sessionId, activity);
    }

    /**
     * Stop monitoring and show final summary
     */
    stop(): void {
        this.tableTUI.stop();
        this.printSummary();
    }

    /**
     * 标记任务完全完成（包括review）
     */
    completeTask(taskId: string): void {
        this.tableTUI.completeTask(taskId);
    }

    /**
     * 设置merge状态
     */
    setMergeStatus(status: 'waiting' | 'merging' | 'completed'): void {
        this.tableTUI.setMergeStatus(status);
    }

    /**
     * 设置review状态
     */
    setReviewStatus(status: 'waiting' | 'reviewing' | 'completed'): void {
        this.tableTUI.setReviewStatus(status);
    }

    /**
     * Print final summary
     */
    private printSummary(): void {
        const completed = this.taskIds.length;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        console.log(''); // Add spacing
        log.success(`✅ All tasks completed: ${completed}/${completed} in ${minutes}m ${seconds}s`);
    }

    /**
     * 保持兼容性方法（现在由TableTUI内部处理）
     */
    async readLatestActivity(_taskId: string): Promise<string | undefined> {
        // TableTUI内部已经处理了活动更新，这里返回undefined以保持兼容
        return undefined;
    }
}
