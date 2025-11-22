/**
 * CTO Review: Architectural audit
 */


import { runGit, runClaude } from '../utils/childProcess.js';
import { writeFile, fileExists, readFile } from '../utils/file.js';
import { log } from '../logger.js';

/**
 * Run CTO review
 */
export async function runCtoReview(startHash: string): Promise<void> {
    const reportFile = 'vibe_cto_report.md';

    log.info('🧐 [CTO] Conducting Final Architectural Review...');

    // Get total changes from this session
    const diffResult = await runGit(['diff', startHash, 'HEAD', '--stat']);
    const totalDiff = diffResult.stdout;

    const logResult = await runGit(['log', `${startHash}..HEAD`, '--oneline']);
    const commitLog = logResult.stdout;

    const prompt = `
[ROLE] Chief Technology Officer (CTO)

[TASK]
Review the code changes made in this entire development session.

[SESSION COMMITS]
${commitLog}

[CHANGES SUMMARY]
${totalDiff}

[REVIEW CRITERIA]
Identify any:
1. **Architectural inconsistencies** (e.g., mixed naming conventions, inconsistent patterns)
2. **Redundant code** introduced by parallel agents
3. **Potential security risks** in the new code
4. **API design issues** (breaking changes, poor interfaces)
5. **Code style violations** (inconsistent formatting, unclear naming)

[OUTPUT FORMAT]
Generate a Markdown report with:
- Executive Summary (1-2 sentences)
- Quality Score (1-10)
- Issues Found (list with severity: CRITICAL/HIGH/MEDIUM/LOW)
- Recommendations for follow-up work

Be honest. If the code is excellent, say so. If it needs work, be specific about what and why.
Use Linus Torvalds' standards: good taste, simplicity, clarity.
`;

    const result = await runClaude(prompt);

    if (result.code !== 0) {
        log.error(`CTO Review failed: ${result.stderr}`);
        return;
    }

    writeFile(reportFile, result.stdout);
    log.success(`📝 CTO Report generated: ${reportFile}`);

    // Display summary
    if (fileExists(reportFile)) {
        log.cyan('=== CTO Review Summary ===');
        const content = readFile(reportFile);
        const lines = content.split('\n').slice(0, 10);
        lines.forEach(line => console.log(line));
        log.cyan(`=== (Full report in ${reportFile}) ===`);
    }
}
