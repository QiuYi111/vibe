/**
 * Factory: Concurrent task execution with self-healing
 */

import { TaskState, SessionState, VibeConfig, TaskPlanItem, TaskStatus } from '../types.js';
import { runClaude, execCmd } from '../utils/childProcess.js';
import { createTaskWorktree } from '../git/gitWorktree.js';
import { runReviewAgent } from './review.js';
import { log } from '../logger.js';
import { fileExists, readFile } from '../utils/file.js';
import * as path from 'path';

/**
 * Run a single task with build + review + heal loop
 */
async function runSingleTask(
    task: TaskState,
    session: SessionState,
    config: VibeConfig
): Promise<void> {
    log.cyan(`🚀 [Agent] ${task.name} (Worktree: ${task.branchName})`);

    try {
        // Create isolated worktree
        const { branchName, worktreePath } = await createTaskWorktree(task.id);
        task.branchName = branchName;
        task.worktreePath = worktreePath;
        task.status = 'RUNNING';

        log.task(task.id, `>>> Agent working in ${worktreePath}...`, config.logDir);

        // Initial build prompt
        const buildPrompt = `/sc:implement
[INDEX] ${fileExists(config.indexFile) ? readFile(config.indexFile) : 'No index available'}
[TASK] ${task.desc}
[WORKTREE] ${worktreePath}
[DOMAIN] ${session.domain}

[INSTRUCTIONS]
1. You are working in an isolated Git worktree at: ${worktreePath}
2. FIRST, ensure .gitignore includes: node_modules/, venv/, __pycache__/, *.pyc, dist/, build/, .env
3. Use your native file editing tools to implement the task
4. Install dependencies if needed (npm install, pip install, etc.)
5. When complete, commit your changes: git commit -am 'Agent: ${task.name} - Initial implementation'
6. Use existing dependencies if available to save time
`;

        let reviewFeedback = '';

        // Self-healing loop
        while (task.attempts < config.maxRetries) {
            // Build or heal
            if (task.attempts === 0) {
                const buildResult = await runClaude(buildPrompt, { cwd: worktreePath });
                log.task(task.id, buildResult.stdout, config.logDir);
                log.task(task.id, buildResult.stderr, config.logDir);
            } else {
                // Healing with review feedback
                const healPrompt = `
[PREVIOUS COMMIT] ${(await execCmd('git', ['log', '--oneline', '-1'], { cwd: worktreePath })).stdout}
[REVIEW FEEDBACK]
${reviewFeedback}

[INSTRUCTION]
Fix the issues identified in the review. Then commit: git commit -am 'Agent: ${task.name} - Fix attempt ${task.attempts}'
`;
                const healResult = await runClaude(healPrompt, { cwd: worktreePath });
                log.task(task.id, healResult.stdout, config.logDir);
                log.task(task.id, healResult.stderr, config.logDir);
            }

            // Check for API Rate Limits (429)
            const logContent = readFile(task.logFile);
            if (logContent.includes('429') || logContent.toLowerCase().includes('rate limit')) {
                log.task(task.id, '⚠️ API Rate Limit (429) detected. Sleeping for 60s...', config.logDir);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }

            // Check if agent committed
            const logResult = await execCmd('git', ['log', '--oneline', '-1'], { cwd: worktreePath });
            if (!logResult.stdout.includes(`Agent: ${task.name}`)) {
                log.task(task.id, '⚠️ Agent did not commit, retrying...', config.logDir);
                task.attempts++;
                continue;
            }

            // Run Review Agent
            if (await runReviewAgent(task, session, config)) {
                log.task(task.id, '✅ Implementation passed review and tests', config.logDir);
                task.status = task.attempts > 0 ? 'HEALED' : 'SUCCEEDED';
                return;
            } else {
                // Extract review feedback for next iteration
                const feedbackFile = path.join(config.logDir, `review_report_${task.id}.md`);
                if (fileExists(feedbackFile)) {
                    reviewFeedback = readFile(feedbackFile);
                } else {
                    reviewFeedback = 'Review failed but no feedback file found';
                }

                log.task(task.id, `⚠️ Review failed, healing (${task.attempts + 1}/${config.maxRetries})...`, config.logDir);
                task.attempts++;
            }
        }

        // Max retries exceeded
        log.task(task.id, `❌ Task failed after ${config.maxRetries} attempts`, config.logDir);
        task.status = 'FAILED';

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.task(task.id, `❌ Fatal error: ${errorMsg}`, config.logDir);
        task.status = 'FAILED';
    }
}

/**
 * Run tasks in batches with concurrency control
 */
export async function runTasksInBatches(
    taskPlan: TaskPlanItem[],
    session: SessionState,
    config: VibeConfig
): Promise<void> {
    // Initialize task states
    const tasks: TaskState[] = taskPlan.map(item => ({
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

    const queue = [...tasks];
    const running: Promise<void>[] = [];

    async function runOne(task: TaskState): Promise<void> {
        await runSingleTask(task, session, config);
    }

    // Concurrent execution with max parallel limit
    while (queue.length > 0 || running.length > 0) {
        // Start new tasks up to the limit
        while (queue.length > 0 && running.length < config.maxParallelAgents) {
            const task = queue.shift()!;
            const promise = runOne(task).finally(() => {
                const idx = running.indexOf(promise);
                if (idx >= 0) running.splice(idx, 1);
            });
            running.push(promise);
        }

        // Wait for at least one to complete
        if (running.length > 0) {
            await Promise.race(running);
        }
    }

    log.info(`✅ All tasks completed. Succeeded: ${tasks.filter(t => t.status === 'SUCCEEDED' || t.status === 'HEALED').length}/${tasks.length}`);
}
