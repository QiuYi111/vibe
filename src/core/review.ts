/**
 * Review Agent: Code review and test generation
 */

import { TaskState, SessionState, VibeConfig } from '../types.js';
import { runClaude, execCmd } from '../utils/childProcess.js';
import { fileExists, writeFile } from '../utils/file.js';
import { log } from '../logger.js';
import * as path from 'path';

/**
 * Run Review Agent for a task
 */
export async function runReviewAgent(task: TaskState, session: SessionState, config: VibeConfig): Promise<boolean> {
    log.info(`🔍 [Review Agent] Analyzing task: ${task.name}`);

    const reviewLog = path.join(config.logDir, `review_${task.id}.log`);
    const reviewReport = path.join(config.logDir, `review_report_${task.id}.md`);
    const testCmdFile = path.join(config.logDir, `test_cmd_${task.id}.txt`);

    // Get changes in worktree (using git diff)
    const diffResult = await execCmd('git', ['diff', 'HEAD~1', '--stat'], { cwd: task.worktreePath });
    const changes = diffResult.code === 0 ? diffResult.stdout : 'No commits yet';

    const diffContentResult = await execCmd('git', ['diff', 'HEAD~1'], { cwd: task.worktreePath });
    const diffContent = diffContentResult.code === 0 ? diffContentResult.stdout : 'No diff available';

    // User feedback: Use /sc:analyze instead of /sc:review
    // Enhanced prompt with dynamic test command requirement
    const reviewPrompt = `/sc:analyze

[TASK REVIEW]
Task: ${task.name} (ID: ${task.id})
Domain: ${session.domain}
Worktree: ${task.worktreePath}

Changes Statistics:
${changes}

Code Diff:
${diffContent}

[CRITICAL REQUIREMENT]
After your analysis, you MUST provide a test command on a new line starting with:
TEST_COMMAND: <your command here>

The test command should:
1. Have HIGH COVERAGE (test all changed functionality)
2. Be RIGOROUS (catch edge cases and errors)
3. Be EXECUTABLE in the worktree directory
4. Include verbose flags for detailed output

Examples:
- TEST_COMMAND: npm test -- --coverage --verbose
- TEST_COMMAND: pytest tests/ -v --cov=src --cov-report=term
- TEST_COMMAND: cargo test --all-features -- --test-threads=1
- TEST_COMMAND: go test -v -cover ./...

If no tests are appropriate: TEST_COMMAND: echo "No tests required"
`;

    // Run Claude in worktree
    const claudeResult = await runClaude(reviewPrompt, { cwd: task.worktreePath });

    if (claudeResult.code !== 0) {
        log.file(reviewLog, `Claude failed: ${claudeResult.stderr}`);
        return false;
    }

    // Write review report
    writeFile(reviewReport, claudeResult.stdout);
    log.file(reviewLog, `Review report generated: ${reviewReport}`);

    // Extract test command dynamically from review output (bash approach)
    const testCmdMatch = claudeResult.stdout.match(/TEST_COMMAND:\s*(.+)/);
    let testCmd: string;

    if (testCmdMatch) {
        testCmd = testCmdMatch[1].trim();
        log.file(reviewLog, `✅ Extracted dynamic test command: ${testCmd}`);
    } else {
        // Fallback to domain-based defaults
        log.file(reviewLog, '⚠️  No TEST_COMMAND found in review output, using domain default');
        testCmd = getDefaultTestCommand(session.domain, task.worktreePath);
    }

    writeFile(testCmdFile, testCmd);
    log.file(reviewLog, `>>> Running test: ${testCmd}`);

    // Run the test command in worktree
    const testResult = await execCmd('sh', ['-c', testCmd], { cwd: task.worktreePath });
    log.file(reviewLog, testResult.stdout);
    log.file(reviewLog, testResult.stderr);

    // Determine review success based on analysis output and test results
    const reviewPassed =
        !claudeResult.stdout.toLowerCase().includes('failed') && !claudeResult.stdout.toLowerCase().includes('critical error');

    if (reviewPassed && testResult.code === 0) {
        log.file(reviewLog, '✅ Review passed and tests successful');
        return true;
    } else {
        log.file(reviewLog, '❌ Review failed or tests failed');
        return false;
    }
}

/**
 * Get default test command based on domain (fallback)
 */
function getDefaultTestCommand(domain: string, worktreePath: string): string {
    switch (domain) {
        case 'WEB':
            return fileExists(path.join(worktreePath, 'package.json')) ? 'npm test' : 'echo "No tests configured"';
        case 'PYTHON_GENERIC':
        case 'AI_ROBOT':
            return fileExists(path.join(worktreePath, 'requirements.txt')) || fileExists(path.join(worktreePath, 'pyproject.toml'))
                ? 'pytest -v'
                : 'echo "No tests configured"';
        case 'HARDWARE':
            return 'pio test -e native';
        case 'GENERIC':
        default:
            return 'echo "No standard tests for this domain"';
    }
}
