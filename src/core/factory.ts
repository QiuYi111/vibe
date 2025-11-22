/**
 * Factory: Concurrent task execution with self-healing
 */

import { TaskState, SessionState, VibeConfig, TaskPlanItem, TaskStatus } from '../types.js';
import { runClaude, execCmd, execWithRetry } from '../utils/childProcess.js';
import { runReviewAgent } from './review.js';
import { TmuxTaskRunner } from './tmuxTaskRunner.js';
import { log } from '../logger.js';
import { fileExists, readFile } from '../utils/file.js';
import * as path from 'path';

/**
 * Run tasks in batches with concurrency control
 */
export async function runTasksInBatches(
    taskPlan: TaskPlanItem[],
    session: SessionState,
    config: VibeConfig
): Promise<void> {
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

    // Setup interactive task manager for debugging stuck tasks
    const { InteractiveTaskManager } = await import('./interactiveTaskManager.js');
    const taskManager = new InteractiveTaskManager(tasks, session, config);

    try {
        // Execute all tasks with concurrency limit and progress monitoring
        await Promise.all(
            tasks.map((task) =>
                limit(async () => {
                    try {
                        monitor.update(task.id, 'RUNNING');
                        await runSingleTaskWithWorktree(task, session, config, taskManager);
                        monitor.update(task.id, 'COMPLETED');
                    } catch {
                        monitor.update(task.id, 'FAILED');
                        task.status = 'FAILED';
                    }
                })
            )
        );
    } finally {
        // Cleanup interactive manager
        taskManager.cleanup();
    }

    monitor.stop();

    log.info(
        `✅ All tasks completed. Succeeded: ${tasks.filter((t) => t.status === 'SUCCEEDED' || t.status === 'HEALED').length}/${tasks.length}`
    );
}

/**
 * Determine if a task should use Tmux mode
 */
function shouldUseTmux(task: TaskState): boolean {
    // 对于代码修改任务，使用Tmux模式以便介入
    // 对于规划/分析任务，使用直接模式以获取输出
    const codingTasks = [
        'implement', 'develop', 'code', 'programming',
        'feature', 'bug', 'fix', 'refactor'
    ];

    const taskDesc = task.desc.toLowerCase();
    return codingTasks.some(keyword => taskDesc.includes(keyword));
}

/**
 * Run a single task in pre-created worktree
 * (Worktree already created serially)
 */
async function runSingleTaskWithWorktree(
    task: TaskState,
    session: SessionState,
    config: VibeConfig,
    taskManager?: any
): Promise<void> {
    log.cyan(`🚀 [Agent] ${task.name} (Branch: ${task.branchName})`);

    try {
        task.status = 'RUNNING';
        task.startTime = Date.now(); // Track start time for debug mode

        // Get session ID from task manager
        const sessionId = taskManager?.getTaskSessionId?.(task.id);
        if (sessionId) {
            log.task(task.id, `>>> Agent working in ${task.worktreePath} (Session: ${sessionId})...`, config.logDir);
        } else {
            log.task(task.id, `>>> Agent working in ${task.worktreePath}...`, config.logDir);
        }

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

                // Choose execution mode based on Tmux availability and task type
                const useTmux = await TmuxTaskRunner.isTmuxAvailable() && shouldUseTmux(task);

                if (useTmux) {
                    // 使用Tmux模式运行
                    log.task(task.id, ">>> Using Tmux interactive mode...", config.logDir);

                    await TmuxTaskRunner.runClaudeInTmux({
                        taskId: task.id,
                        prompt: prompt,
                        cwd: task.worktreePath,
                        needsOutput: false, // 对于代码修改任务，不需要返回值
                        timeout: 30 * 60 * 1000 // 30分钟超时
                    });

                    log.task(task.id, ">>> Tmux session completed", config.logDir);
                } else {
                    // 使用原有的直接调用模式
                    log.task(task.id, ">>> Using direct execution mode...", config.logDir);

                    const claudeResult = await runClaude(prompt, {
                        cwd: task.worktreePath,
                        sessionId: sessionId
                    });

                    log.task(task.id, claudeResult.stdout, config.logDir);
                    log.task(task.id, claudeResult.stderr, config.logDir);
                }

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

                // Success
                task.status = task.attempts > 0 ? 'HEALED' : 'SUCCEEDED';
                task.endTime = Date.now(); // Track end time
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
