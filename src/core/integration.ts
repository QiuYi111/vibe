/**
 * Integration Phase: System-wide verification and healing
 */

import { Domain, VibeConfig } from '../types.js';
import { execCmd, runClaude } from '../utils/childProcess.js';
import { log } from '../logger.js';
import { readFile } from '../utils/file.js';
import * as path from 'path';

/**
 * Get test command for domain
 */
function getTestCommand(domain: Domain): string {
    switch (domain) {
        case 'HARDWARE':
            return 'pio test -e native';
        case 'AI_ROBOT':
            return 'pytest';
        case 'WEB':
            return 'npm test';
        case 'PYTHON_GENERIC':
            return 'pytest';
        default:
            return "echo 'No global test command detected'";
    }
}

/**
 * Run integration phase with system healer
 */
export async function runIntegrationPhase(domain: Domain, config: VibeConfig): Promise<boolean> {
    const logFile = path.join(config.logDir, 'integration_system.log');

    log.info('🧩 [Integration] Starting System-Wide Verification...');
    log.file(logFile, '>>> Starting Integration Phase');

    // Determine global test command
    const testCmd = getTestCommand(domain);

    // Run full regression test suite
    log.cyan(`   Running global test suite: ${testCmd}`);
    let testResult = await execCmd('sh', ['-c', testCmd]);
    log.file(logFile, testResult.stdout);
    log.file(logFile, testResult.stderr);

    if (testResult.code === 0) {
        log.success('✅ System Integration Tests Passed.');
        return true;
    }

    log.error('❌ System Tests Failed. Activating System Healer...');

    // System Healer loop
    const maxRetries = 2;
    for (let retries = 0; retries < maxRetries; retries++) {
        log.file(logFile, `>>> System Healer Attempt ${retries + 1}`);

        const errorLog = readFile(logFile).split('\n').slice(-100).join('\n');

        const prompt = `
[ROLE] System Architect & Debugger

[CONTEXT] 
Multiple features were just merged into the main branch. 
Individual unit tests passed, but the GLOBAL system test failed.

[ERROR LOG]
${errorLog}

[INSTRUCTION]
1. Analyze the error. It is likely an API mismatch or side-effect between modules.
2. Fix the code in the current directory directly using your native file editing tools.
3. After fixing, commit your changes with: git commit -am 'System Healer: Fixed integration issue'
4. Explain what you fixed and why.

Apply Linus philosophy:
- Fix the root cause, not symptoms
- Prefer simple solutions over complex ones
- If multiple modules are wrong, fix them all
`;

        const healResult = await runClaude(prompt);
        log.file(logFile, healResult.stdout);
        log.file(logFile, healResult.stderr);

        // Retry test
        testResult = await execCmd('sh', ['-c', testCmd]);
        log.file(logFile, testResult.stdout);
        log.file(logFile, testResult.stderr);

        if (testResult.code === 0) {
            log.success('✅ System Healer fixed the integration issue!');
            return true;
        }
    }

    log.error('💀 Critical: System Healer failed to fix integration issues. Manual check required.');
    return false;
}
