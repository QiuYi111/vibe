#!/usr/bin/env node

import { TmuxTaskRunner } from './src/core/tmuxTaskRunner.js';

/**
 * Test the new tmux buffer injection implementation
 */

async function testNewImplementation() {
    console.log('🧪 Testing new tmux buffer injection implementation...\n');

    const taskId = `test_${Date.now()}`;
    const prompt = `
[TASK]
Create a simple text file named "test_output.txt" with content: "Hello from tmux buffer injection!"

This is a test to verify that the new buffer injection system works correctly.
`;

    try {
        console.log(`🚀 Starting task: ${taskId}`);

        const result = await TmuxTaskRunner.runClaudeInTmux({
            taskId,
            prompt,
            cwd: process.cwd(),
            needsOutput: true,
            outputFormat: 'text'
        });

        console.log('\n✅ Task completed successfully!');
        if (result) {
            console.log('📄 Output received:');
            console.log(result);
        } else {
            console.log('ℹ️ No output expected (text mode)');
        }

        // Check if the test file was created
        const fs = await import('fs');
        if (fs.existsSync('test_output.txt')) {
            const content = fs.readFileSync('test_output.txt', 'utf-8');
            console.log('📁 Test file content:');
            console.log(content);

            // Cleanup
            fs.unlinkSync('test_output.txt');
            console.log('🧹 Test file cleaned up');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Check tmux availability first
try {
    await TmuxTaskRunner.checkTmuxAvailability();
    console.log('✅ Tmux is available');

    await testNewImplementation();

} catch (error) {
    console.error('❌ Tmux not available or test failed:', error);
    process.exit(1);
}