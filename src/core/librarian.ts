/**
 * Librarian: Context and index generation
 */

import { SessionState, VibeConfig } from '../types.js';
import { runClaude } from '../utils/childProcess.js';
import { readJsonFile, writeFile } from '../utils/file.js';
import { log } from '../logger.js';

/**
 * Run Librarian to generate project index
 */
export async function runLibrarian(state: SessionState, config: VibeConfig): Promise<void> {
    log.info('📚 [Librarian] Analyzing context...');

    // Check if index is up-to-date (bash approach: incremental update)
    if (state.mode === 'MAINTAIN') {
        const { isIndexStale } = await import('../git/gitBranch.js');
        const stale = await isIndexStale(config.indexFile);

        if (!stale) {
            log.success('✅ Index is up-to-date (git hash matches).');
            return;
        }

        log.warn('⚡ Index is stale, regenerating...');
    }

    // Generate index using SuperClaude command (user preference: use /sc:index-repo)
    const prompt = `/sc:index-repo`;
    const claudeResult = await runClaude(prompt);

    if (claudeResult.code !== 0) {
        throw new Error(`Claude failed to generate index: ${claudeResult.stderr}`);
    }

    // Read the generated PROJECT_INDEX.json, or create basic index in INIT_INDEX mode
    let indexData: Record<string, unknown>;
    try {
        indexData = readJsonFile('PROJECT_INDEX.json');
    } catch (error) {
        if (state.mode === 'INIT_INDEX') {
            log.info('📝 Creating initial project index structure...');
            indexData = {
                name: 'Project Index',
                description: 'Auto-generated project context index',
                components: [],
                files: [],
                metadata: {}
            };
        } else {
            throw new Error(`Failed to read PROJECT_INDEX.json: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // 🔑 CRITICAL: Embed git hash in index for future staleness checks (bash approach)
    const { getCurrentHash } = await import('../git/gitBranch.js');
    const currentHash = await getCurrentHash();

    // Add git hash to index metadata
    if (!indexData || typeof indexData !== 'object') {
        indexData = { metadata: { gitHash: currentHash } };
    } else if (!('metadata' in indexData)) {
        (indexData as Record<string, unknown>).metadata = { gitHash: currentHash };
    } else {
        const metadata = (indexData as Record<string, unknown>).metadata as Record<string, unknown> || {};
        metadata.gitHash = currentHash;
        (indexData as Record<string, unknown>).metadata = metadata;
    }

    // Write to configured index file
    writeFile(config.indexFile, JSON.stringify(indexData, null, 2));
    log.success(`✅ Index generated: ${config.indexFile} (hash: ${currentHash.substring(0, 8)})`);
}
