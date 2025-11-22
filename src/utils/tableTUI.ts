/**
 * Table-based TUI for Vibe Flow Task Dashboard
 * 替代滚动进度条的表格界面
 */


export interface TableRow {
    id: string;
    name: string;
    status: 'waiting' | 'running' | 'completed' | 'failed' | 'reviewing';
    sessionId?: string;
    progress: string;
    startTime?: number;
    duration?: string;
}

export class TableTUI {
    private rows: Map<string, TableRow> = new Map();
    private startTime: number = Date.now();
    private updateInterval: NodeJS.Timeout | null = null;
    private mergeStatus: 'waiting' | 'merging' | 'completed' = 'waiting';
    private reviewStatus: 'waiting' | 'reviewing' | 'completed' = 'waiting';
    private spinnerFrame: number = 0;
    private readonly spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

    constructor(_taskIds: string[], _taskNames: string[]) {
        // 初始化表格行
        _taskIds.forEach((id, index) => {
            this.rows.set(id, {
                id: (index + 1).toString(),
                name: _taskNames[index],
                status: 'waiting',
                progress: '-'
            });
        });
    }

    /**
     * 启动TUI显示
     */
    start(): void {
        this.render();

        // 每2秒更新一次显示，包括状态同步
        this.updateInterval = setInterval(async () => {
            this.spinnerFrame = (this.spinnerFrame + 1) % this.spinnerChars.length;
            await this.syncWithTmux();
            this.updateRunningTaskProgress();
            this.render();
        }, 2000);
    }

    /**
     * 停止TUI显示
     */
    stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * 更新任务状态
     */
    update(taskId: string, status: string, sessionId?: string, progress?: string): void {
        const row = this.rows.get(taskId);
        if (!row) return;

        // 更新状态
        switch (status) {
            case 'RUNNING':
                row.status = 'running';
                row.startTime = Date.now();
                if (sessionId) {
                    row.sessionId = sessionId;
                }
                break;
            case 'COMPLETED':
                row.status = 'reviewing';
                row.progress = '🔍 Review in progress';
                break;
            case 'FAILED':
                row.status = 'failed';
                row.progress = '❌ Task failed';
                break;
        }

        if (progress) {
            row.progress = progress;
        }

        // 推进spinner帧数让动画更流畅
        this.spinnerFrame = (this.spinnerFrame + 1) % this.spinnerChars.length;
        this.render();
    }

    /**
     * 标记任务完成
     */
    completeTask(taskId: string): void {
        const row = this.rows.get(taskId);
        if (row) {
            row.status = 'completed';
            row.progress = '✅ Ready for merge';
            this.render();
        }
    }

    /**
     * 获取状态图标
     */
    private getStatusIcon(status: string): string {
        if (status === 'running') {
            return this.spinnerChars[this.spinnerFrame];
        }

        const icons = {
            'waiting': '⏳',
            'completed': '✅',
            'failed': '❌',
            'reviewing': '🔍'
        };
        return icons[status as keyof typeof icons] || '❓';
    }

    /**
     * 获取状态文本
     */
    private getStatusText(status: string, startTime?: number): string {
        switch (status) {
            case 'waiting':
                return 'Waiting';
            case 'running':
                if (startTime) {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    return `Running (${minutes}m ${seconds}s)`;
                }
                return 'Running';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            case 'reviewing':
                return 'Reviewing';
            default:
                return 'Unknown';
        }
    }

    /**
     * 计算整体进度
     */
    private getOverallProgress(): { completed: number; total: number; elapsed: string } {
        const total = this.rows.size;
        let completed = 0;

        this.rows.forEach(row => {
            if (row.status === 'completed' || row.status === 'reviewing') {
                completed++;
            }
        });

        const elapsed = this.formatDuration(Date.now() - this.startTime);

        return { completed, total, elapsed };
    }

    /**
     * 格式化时间
     */
    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * 渲染表格
     */
    private render(): void {
        // 清屏并移动到顶部
        console.clear();

        // 打印banner (这部分由调用方提供)
        console.log('📋 Vibe Flow Task Dashboard\n');

        // 构建表格
        const table = [
            '┌─────┬─────────────────────┬──────────────────────┬─────────────────┬─────────────────────┐',
            '│ ID  │ Task Name           │ Status               │ Tmux Session    │ Progress            │',
            '├─────┼─────────────────────┼──────────────────────┼─────────────────┼─────────────────────┤'
        ];

        // 添加表格行
        this.rows.forEach(row => {
            const id = row.id.padEnd(3);
            const name = (row.name.length > 19 ? row.name.substring(0, 16) + '...' : row.name).padEnd(19);
            const statusText = this.getStatusText(row.status, row.startTime);
            const status = `${this.getStatusIcon(row.status)} ${statusText}`.padEnd(20);
            const session = (row.sessionId || '-').padEnd(15);
            const progress = (row.progress || '-').padEnd(19);

            table.push(`│ ${id} │ ${name} │ ${status} │ ${session} │ ${progress} │`);
        });

        table.push('└─────┴─────────────────────┴──────────────────────┴─────────────────┴─────────────────────┘');

        // 打印表格
        console.log(table.join('\n'));

        // 打印整体进度
        const progress = this.getOverallProgress();
        console.log(`\n⚡ Overall Progress: ${progress.completed}/${progress.total} completed | Elapsed: ${progress.elapsed}`);

        // 打印merge/review状态
        this.printMergeReviewStatus();

        console.log(''); // 空行
    }

    /**
     * 更新运行中任务的进度信息
     */
    updateRunningTaskProgress(): void {
        this.rows.forEach(row => {
            if (row.status === 'running' && row.startTime) {
                const elapsed = Math.floor((Date.now() - row.startTime) / 1000);
                if (elapsed > 120) { // 2分钟后显示提醒
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    row.progress = `🤔 Still working... (${minutes}m ${seconds}s)`;
                }
            }
        });
    }

    /**
     * 设置merge状态
     */
    setMergeStatus(status: 'waiting' | 'merging' | 'completed'): void {
        this.mergeStatus = status;
    }

    /**
     * 设置review状态
     */
    setReviewStatus(status: 'waiting' | 'reviewing' | 'completed'): void {
        this.reviewStatus = status;
    }

    /**
     * 打印merge和review状态
     */
    private printMergeReviewStatus(): void {
        console.log('\n🔄 Merge & Review Phase:');

        if (this.mergeStatus === 'waiting') {
            console.log('⏳ Waiting for merge to begin...');
        } else if (this.mergeStatus === 'merging') {
            console.log('🔀 Merging task branches...');
        } else if (this.mergeStatus === 'completed') {
            if (this.reviewStatus === 'waiting') {
                console.log('✅ Merge completed');
                console.log('⏳ Waiting for CTO review...');
            } else if (this.reviewStatus === 'reviewing') {
                console.log('✅ Merge completed');
                console.log('👨‍💼 CTO review in progress...');
            } else if (this.reviewStatus === 'completed') {
                console.log('✅ Merge completed');
                console.log('👨‍💼 CTO review completed');
            }
        }
    }

    /**
     * 与tmux同步状态
     */
    private async syncWithTmux(): Promise<void> {
        try {
            const { execSync } = await import('child_process');

            // 获取所有活跃的tmux会话
            const output = execSync('tmux ls -F "#{session_name}"', { encoding: 'utf-8' });
            const activeSessions = output
                .split('\n')
                .filter(name => name.startsWith('vibe-task-'))
                .map(name => name.trim());

            // 同步内部状态
            this.rows.forEach((row, taskId) => {
                const sessionId = `vibe-task-${taskId}`;
                const isSessionActive = activeSessions.includes(sessionId);

                // 如果内部状态显示waiting但tmux会话存在，更新状态
                if (row.status === 'waiting' && isSessionActive && !row.sessionId) {
                    row.sessionId = sessionId;
                    row.status = 'running';
                    row.startTime = Date.now();
                }
            });
        } catch {
            // tmux命令失败，忽略同步错误
            // 这可能是tmux不可用或权限问题
        }
    }

    /**
     * 静态清理方法
     */
    static cleanup(): void {
        // 在这里可以添加任何需要清理的资源
        console.log('🧹 TableTUI cleanup completed');
    }
}