/**
 * Mode and domain detection
 */

import { Domain, Mode } from '../types.js';
import { fileExists, dirExists } from '../utils/file.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detect project domain based on file markers
 */
export function detectDomain(cwd: string = process.cwd()): Domain {
    // HARDWARE: platformio.ini or CMakeLists.txt
    if (fileExists(path.join(cwd, 'platformio.ini')) || fileExists(path.join(cwd, 'CMakeLists.txt'))) {
        return 'HARDWARE';
    }

    // AI_ROBOT: mamba_env.yaml or src/ros2 directory
    if (fileExists(path.join(cwd, 'mamba_env.yaml')) || dirExists(path.join(cwd, 'src', 'ros2'))) {
        return 'AI_ROBOT';
    }

    // WEB: package.json or next.config.js
    if (fileExists(path.join(cwd, 'package.json')) || fileExists(path.join(cwd, 'next.config.js'))) {
        return 'WEB';
    }

    // PYTHON_GENERIC: any .py files in root
    try {
        const files = fs.readdirSync(cwd);
        if (files.some(file => file.endsWith('.py'))) {
            return 'PYTHON_GENERIC';
        }
    } catch {
        // Ignore errors
    }

    return 'GENERIC';
}

/**
 * Detect operation mode based on git and index file status
 */
export function detectMode(cwd: string = process.cwd(), indexFile: string = 'project_index.json'): Mode {
    // SCRATCH: no .git directory
    if (!dirExists(path.join(cwd, '.git'))) {
        return 'SCRATCH';
    }

    // INIT_INDEX: .git exists but no index file
    if (!fileExists(path.join(cwd, indexFile))) {
        return 'INIT_INDEX';
    }

    // MAINTAIN: both .git and index file exist
    return 'MAINTAIN';
}
