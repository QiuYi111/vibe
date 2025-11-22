/**
 * Librarian: Context and index generation
 */

import { SessionState, VibeConfig } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { fileExists, readJsonFile, writeFile } from '../utils/file.js';
import { log } from '../logger.js';

/**
 * Run Librarian to generate project index
 */
export async function runLibrarian(state: SessionState, config: VibeConfig): Promise<void> {
    log.info('📚 [Librarian] Analyzing context...');

    // Check if PROJECT_INDEX.json already exists and is up-to-date
    if (state.mode === 'MAINTAIN' && fileExists('PROJECT_INDEX.json')) {
        log.success('✅ Index is up-to-date.');
        return;
    }

    // Generate index using SuperClaude command (creates PROJECT_INDEX.json locally)
    log.warn('⚡ Generating repository index...');
    const prompt = `/sc:index-repo`;
    const claudeResult = await runClaude(prompt);

    if (claudeResult.code !== 0) {
        throw new Error(`Claude failed to generate index: ${claudeResult.stderr}`);
    }

    // Read the generated PROJECT_INDEX.json and write to configured index file
    const indexData = readJsonFile('PROJECT_INDEX.json');
    writeFile(config.indexFile, JSON.stringify(indexData, null, 2));
    log.success(`✅ Index generated: ${config.indexFile}`);
}
