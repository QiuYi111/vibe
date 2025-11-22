#!/usr/bin/env node

/**
 * Vibe Flow CLI Entry Point
 */

import { loadConfig } from './config.js';
import { log } from './logger.js';
import { commandExists } from './utils/childProcess.js';
import { ensureDir } from './utils/file.js';

/**
 * Display ASCII banner
 */
function showBanner(): void {
    const C_PURPLE = '\x1b[1;35m';
    const C_CYAN = '\x1b[1;36m';
    const C_BLUE = '\x1b[1;34m';
    const C_RESET = '\x1b[0m';

    console.log('');
    console.log(`${C_PURPLE}██╗   ██╗██╗██████╗ ███████╗    ${C_CYAN}███████╗██╗      ██████╗ ██╗    ██╗${C_RESET}`);
    console.log(`${C_PURPLE}██║   ██║██║██╔══██╗██╔════╝    ${C_CYAN}██╔════╝██║     ██╔═══██╗██║    ██║${C_RESET}`);
    console.log(`${C_PURPLE}██║   ██║██║██████╔╝█████╗      ${C_CYAN}█████╗  ██║     ██║   ██║██║ █╗ ██║${C_RESET}`);
    console.log(`${C_PURPLE}╚██╗ ██╔╝██║██╔══██╗██╔══╝      ${C_CYAN}██╔══╝  ██║     ██║   ██║██║███╗██║${C_RESET}`);
    console.log(`${C_PURPLE} ╚████╔╝ ██║██████╔╝███████╗    ${C_CYAN}██║     ███████╗╚██████╔╝╚███╔███╔╝${C_RESET}`);
    console.log(`${C_PURPLE}  ╚═══╝  ╚═╝╚═════╝ ╚══════╝    ${C_CYAN}╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝${C_RESET}`);
    console.log(`${C_BLUE}           [ AI ARCHITECT ] • [ SLEEP MODE: ON ] • [ 🌙 zzz ]${C_RESET}`);
    console.log('');
}

/**
 * Display help message
 */
function showHelp(): void {
    console.log('');
    log.info('Usage:');
    console.log('  vibe [options]');
    console.log('');
    log.info('Options:');
    log.success('  --help, -h       Show this help message');
    console.log('');
    log.info('Environment Variables:');
    log.success('  MAX_PARALLEL_AGENTS  Number of concurrent agents (default: 2)');
    log.success('  MAX_RETRIES          Max retries for agent tasks (default: 3)');
    console.log('');
    log.info('Examples:');
    console.log('  vibe');
    console.log('  MAX_PARALLEL_AGENTS=4 vibe');
    console.log('');
}

/**
 * Check required dependencies
 */
async function checkDependencies(): Promise<void> {
    const deps = ['claude', 'jq', 'git', 'node', 'npx', 'python3'];

    for (const cmd of deps) {
        if (!(await commandExists(cmd))) {
            log.error(`❌ Critical Error: Missing dependency '${cmd}'. Please install it.`);
            process.exit(1);
        }
    }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    // Parse arguments
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showBanner();
        showHelp();
        process.exit(0);
    }

    showBanner();

    // Check dependencies
    await checkDependencies();

    // Load configuration
    const config = loadConfig();

    // Ensure log directory exists
    ensureDir(config.logDir);

    // Call session orchestrator
    const { runSession } = await import('./core/session.js');
    await runSession(config);
}

// Run CLI
main().catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
