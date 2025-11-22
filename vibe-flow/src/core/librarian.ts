/**
 * Librarian: Context and index generation
 */

import { SessionState, VibeConfig } from '../types.js';
import { runRepomix, runClaude } from '../utils/childProcess.js';
import { fileExists, readFile, getFileSizeKB, writeFile } from '../utils/file.js';
import { log } from '../logger.js';
import { getCurrentHash } from '../git/gitBranch.js';

/**
 * Extract commit hash from index file
 */
function extractCommitHashFromIndex(indexFile: string): string | null {
    if (!fileExists(indexFile)) {
        return null;
    }

    const content = readFile(indexFile);
    const match = content.match(/<!-- COMMIT: (.*?) -->/);
    return match ? match[1] : null;
}

/**
 * Run Librarian to generate project index
 */
export async function runLibrarian(state: SessionState, config: VibeConfig): Promise<void> {
    log.info('📚 [Librarian] Analyzing context...');

    // Check context size
    const rawContextFile = 'raw_context.xml';
    if (fileExists(rawContextFile)) {
        const sizeKB = getFileSizeKB(rawContextFile);
        if (sizeKB > config.maxContextSizeKB) {
            log.warn(`⚠️ Warning: Context size (${sizeKB} KB) is large. Truncation may occur.`);
        }
    }

    // Incremental check for MAINTAIN mode
    if (state.mode === 'MAINTAIN') {
        const lastHash = extractCommitHashFromIndex(config.indexFile);
        const currentHash = await getCurrentHash();

        if (lastHash === currentHash) {
            log.success('✅ Index is up-to-date.');
            return;
        }
    }

    // Run Repomix
    log.warn('⚡ Extracting codebase (Repomix)...');
    const repomixResult = await runRepomix([
        '--style', 'xml',
        '--ignore', config.ignorePatterns,
        '--output', rawContextFile
    ]);

    if (repomixResult.code !== 0) {
        throw new Error(`Repomix failed: ${repomixResult.stderr}`);
    }

    // Generate index with Claude
    const currentHash = await getCurrentHash();
    const prompt = `/sc:index-repo
You are a Senior Architect. Convert raw context to a 'Semantic Index'.
Output ONLY valid XML.
Include: <tech_stack>, <project_structure>, <api_signatures>, <dependency_graph>.
NO actual code logic.
Last line must be: <!-- COMMIT: ${currentHash} -->
`;

    const claudeResult = await runClaude(prompt);

    if (claudeResult.code !== 0) {
        throw new Error(`Claude failed to generate index: ${claudeResult.stderr}`);
    }

    // Write index file
    writeFile(config.indexFile, claudeResult.stdout);
    log.success(`✅ Index generated: ${config.indexFile}`);
}
