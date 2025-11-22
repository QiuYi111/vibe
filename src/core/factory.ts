/**
 * Factory: Concurrent task execution with self-healing
 */

import { TaskState, SessionState, VibeConfig, TaskPlanItem, TaskStatus } from '../types.js';
import { execCmd, execWithRetry } from '../utils/childProcess.js';
import { runReviewAgent } from './review.js';
import { TmuxTaskRunner } from './tmuxTaskRunner.js';
import { log } from '../logger.js';
import { fileExists, readFile } from '../utils/file.js';
import { registerShutdownHandlers } from '../utils/cleanup.js';
import * as path from 'path';

/**
 * Run tasks in batches with concurrency control
 */
export async function runTasksInBatches(
    taskPlan: TaskPlanItem[],
    session: SessionState,
    config: VibeConfig
): Promise<void> {
    // 注册清理钩子（只注册一次）
    registerShutdownHandlers();
    // Initialize task states
    const tasks: TaskState[] = taskPlan.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.desc,
        branchName: '',
        worktreePath: '',
        status: 'PENDING' as TaskStatus,
        attempts: 0,
        logFile: path.join(config.logDir, `${item.id}.log`),
    }));

    session.tasks = tasks;

    // 🔑 CRITICAL: Serial worktree creation (user feedback - prevents git race conditions)
    log.info(`🏗️  Creating ${tasks.length} worktrees (serial)...`);
    const { createAllWorktreesSerial } = await import('../git/gitWorktree.js');
    const worktreeResults = await createAllWorktreesSerial(tasks.map(t => t.id));

    // Assign worktree info to tasks
    for (let i = 0; i < tasks.length; i++) {
        tasks[i].branchName = worktreeResults[i].branchName;
        tasks[i].worktreePath = worktreeResults[i].worktreePath;
    }

    log.success(`✅ All worktrees created successfully`);
    log.info(`⚡ Launching ${tasks.length} tasks in parallel (Max Parallel: ${config.maxParallelAgents})...`);

    // Use p-limit for concurrency control
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(config.maxParallelAgents);

    // Initialize progress monitor (user feedback: enhanced UI)
    const { ProgressMonitor } = await import('../utils/progressMonitor.js');
    const monitor = new ProgressMonitor(config.logDir);
    monitor.start(
        tasks.map(t => t.id),
        tasks.map(t => t.name)
    );

    // Execute all tasks with concurrency limit and progress monitoring
    await Promise.all(
        tasks.map((task) =>
            limit(async () => {
                try {
                    monitor.update(task.id, 'RUNNING');
                    await runSingleTaskWithWorktree(task, session, config);
                    monitor.update(task.id, 'COMPLETED');
                } catch {
                    monitor.update(task.id, 'FAILED');
                    task.status = 'FAILED';
                }
            })
        )
    );

    monitor.stop();

    log.info(
        `✅ All tasks completed. Succeeded: ${tasks.filter((t) => t.status === 'SUCCEEDED' || t.status === 'HEALED').length}/${tasks.length}`
    );
}


/**
 * Run a single task in pre-created worktree
 * (Worktree already created serially)
 */
async function runSingleTaskWithWorktree(
    task: TaskState,
    session: SessionState,
    config: VibeConfig
): Promise<void> {
    log.cyan(`🚀 [Agent] ${task.name} (Branch: ${task.branchName})`);

    try {
        task.status = 'RUNNING';
        task.startTime = Date.now(); // Track start time for debug mode

        log.task(task.id, `>>> Agent working in ${task.worktreePath}...`, config.logDir);

        // Initial build prompt
        const buildPrompt = `/sc:implement
[INDEX] ${fileExists(config.indexFile) ? readFile(config.indexFile) : 'No index available'}
[TASK] ${task.desc}
[WORKTREE] ${task.worktreePath}
[DOMAIN] ${session.domain}

[INSTRUCTIONS]
1. You are working in an isolated Git worktree at: ${task.worktreePath}
2. FIRST, ensure .gitignore includes: node_modules/, venv/, __pycache__/, *.pyc, dist/, build/, .env
3. Use your native file editing tools to implement the task
4. Install dependencies if needed (npm install, pip install, etc.)
5. When complete, commit your changes: git commit -am 'Agent: ${task.name} - Initial implementation'
6. Use existing dependencies if available to save time
`;

        let reviewFeedback = '';

        // Self-healing loop
        await execWithRetry(
            async () => {
                // Determine prompt based on attempt
                const prompt =
                    task.attempts === 0
                        ? buildPrompt
                        : `
[PREVIOUS COMMIT] ${(await execCmd('git', ['log', '--oneline', '-1'], { cwd: task.worktreePath })).stdout}
[REVIEW FEEDBACK]
${reviewFeedback}

[INSTRUCTION]
Fix the issues identified in the review. Then commit: git commit -am 'Agent: ${task.name} - Fix attempt ${task.attempts + 1}'
`;

                // 🔑 一刀切：所有任务都用Tmux模式
                const sessionId = `vibe-task-${task.id}`;
                console.log(``);
                log.cyan(`🎬 [Tmux] Task ${task.name} started in background session`);
                log.success(`📺 To watch: tmux attach -t ${sessionId}`);
                log.success(`🔧 To intervene: tmux attach -t ${sessionId} (then use Ctrl+B D to detach)`);
                log.info(`📋 Or use: node dist/cli/tmux-cli.js attach ${task.id}`);
                console.log(``);

                // TmuxTaskRunner内部已包含健壮性检查
                await TmuxTaskRunner.runClaudeInTmux({
                    taskId: task.id,
                    prompt: prompt,
                    cwd: task.worktreePath,
                    needsOutput: true, // 需要获取Claude的输出结果
                    outputFormat: 'json', // 使用JSON格式获取结构化结果
                    timeout: 0 // 无超时限制，让Claude自然完成
                });

                log.task(task.id, ">>> Tmux session completed", config.logDir);

                // Check if agent committed
                const logResult = await execCmd('git', ['log', '--oneline', '-1'], { cwd: task.worktreePath });
                if (!logResult.stdout.includes(`Agent: ${task.name}`)) {
                    throw new Error('Agent did not commit changes');
                }

                // Run Review Agent
                const reviewPassed = await runReviewAgent(task, session, config);
                if (!reviewPassed) {
                    // Extract review feedback
                    const feedbackFile = path.join(config.logDir, `review_report_${task.id}.md`);
                    if (fileExists(feedbackFile)) {
                        reviewFeedback = readFile(feedbackFile);
                    } else {
                        reviewFeedback = 'Review failed but no feedback file found';
                    }

                    task.attempts++;
                    throw new Error(`Review failed, attempt ${task.attempts}`);
                }

                // Success - 标记任务完全完成
                task.status = task.attempts > 0 ? 'HEALED' : 'SUCCEEDED';
                task.endTime = Date.now(); // Track end time

                // 🎯 更新TUI显示任务完全完成
                if (config.logDir) {
                    const { ProgressMonitor } = await import('../utils/progressMonitor.js');
                    const monitor = new ProgressMonitor(config.logDir);
                    monitor.completeTask(task.id);
                }

                return;
            },
            config.maxRetries,
            2000
        );

        log.success(`✅ Task ${task.name} completed successfully`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.task(task.id, `❌ Task failed after ${config.maxRetries} attempts: ${errorMsg}`, config.logDir);
        task.status = 'FAILED';
        task.endTime = Date.now(); // Track end time
        throw error;
    }
}
