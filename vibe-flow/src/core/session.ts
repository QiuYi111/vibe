/**
 * Session Orchestrator: Main workflow coordination
 */

import { SessionState, VibeConfig } from '../types.js';
import { detectMode, detectDomain } from './modeDetector.js';
import { ensureVibeBranch, ensureInitialCommit } from '../git/gitBranch.js';
import { runLibrarian } from './librarian.js';
import { runArchitect } from './architect.js';
import { runTasksInBatches } from './factory.js';
import { runMergeManager } from './mergeManager.js';
import { runIntegrationPhase } from './integration.js';
import { runCtoReview } from './cto.js';
import { generateSessionReport } from './report.js';
import { cleanupTaskWorktree } from '../git/gitWorktree.js';
import { log } from '../logger.js';
import { fileExists, writeFile } from '../utils/file.js';
import { runGit } from '../utils/childProcess.js';

/**
 * Run complete Vibe Flow session
 */
export async function runSession(config: VibeConfig): Promise<void> {
    // 1. Detect mode and domain
    const mode = detectMode();
    const domain = detectDomain();

    log.cyan(`Mode: ${mode} | Domain: ${domain}`);
    console.log('');

    // 2. Initialize git if needed
    if (mode === 'SCRATCH') {
        log.info('Initializing git repository...');
        await runGit(['init']);

        if (!fileExists('REQUIREMENTS.md')) {
            writeFile('REQUIREMENTS.md', `# ${domain} Requirements\n\n<!-- Add your requirements here -->\n`);
            log.error('⚠️  REQUIREMENTS.md created. Please edit it then re-run.');
            process.exit(0);
        }
    }

    // 3. Ensure vibe branch exists
    log.info('🌿 Ensuring vibe branch...');
    await ensureVibeBranch();

    // 4. Record starting state for CTO Review
    const startHash = await ensureInitialCommit();
    log.cyan(`📍 Session starting at commit: ${startHash.substring(0, 8)}`);

    // Initialize session state
    const session: SessionState = {
        mode,
        domain,
        startHash,
        tasks: [],
    };

    try {
        // 5. Run Librarian
        await runLibrarian(session, config);

        // 6. Run Architect
        const taskPlan = await runArchitect(session, config);

        // 7. Run Factory (parallel task execution)
        log.info(`⚡ Launching ${taskPlan.length} tasks with worktrees (Max Parallel: ${config.maxParallelAgents})...`);
        await runTasksInBatches(taskPlan, session, config);

        // 8. Cleanup worktrees
        log.info('🧹 Cleaning up worktrees...');
        for (const task of session.tasks) {
            await cleanupTaskWorktree(task.id);
        }

        // 9. Merge all task branches
        await runMergeManager(session.tasks, config);

        // 10. Integration Phase
        console.log('');
        log.warn('═══════════════════════════════════════');
        log.warn('   INTEGRATION & QUALITY ASSURANCE');
        log.warn('═══════════════════════════════════════');

        const integrationSuccess = await runIntegrationPhase(domain, config);
        if (!integrationSuccess) {
            log.warn('⚠️  Integration phase encountered issues. Check logs.');
        }

        // 11. CTO Review
        await runCtoReview(startHash);

        // 12. Session Report
        await generateSessionReport(session, config);

        // 13. Update index
        await runLibrarian(session, config);

        // Final summary
        console.log('');
        log.success('═══════════════════════════════════════');
        log.success('🎉 Vibe Flow v5.0 Session Complete!');
        log.success('═══════════════════════════════════════');
        log.cyan(`📊 Session Report: ${config.reportFile}`);
        log.cyan('🧐 CTO Review: vibe_cto_report.md');
        log.cyan(`📝 Logs: ${config.logDir}`);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`❌ Session failed: ${errorMsg}`);
        throw error;
    }
}
