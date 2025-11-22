#!/usr/bin/env node

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function debugInnerCmd() {
    const sessionId = 'debug-inner-cmd';
    const cwd = process.cwd();

    // 创建一个模拟的prompt文件
    const promptFile = path.join(cwd, '.vibe_prompt_debug.txt');
    fs.writeFileSync(promptFile, 'echo "Hello from Claude command"', 'utf-8');

    // 构造我们的innerCmd - 修复语法问题
    const innerCmd = [
        `cd "${cwd}"`,
        `echo "🚀 Vibe Task Started in Tmux Session: ${sessionId}"`,
        `echo "📁 Working Directory: $(pwd)"`,
        `echo "🤖 Starting Claude..."`,
        `echo ""`,
        `claude "$(cat '${promptFile}')"`, // 这行可能有问题
        `exit_code=$?`,
        `echo ""`,
        `if [ $exit_code -eq 0 ]; then echo "✅ Task completed successfully"; exit 0; else echo "❌ Task failed with exit code $exit_code"; read -p "Press Enter to exit..." || true; exit 1; fi`
    ].join(' && ');

    console.log('Testing innerCmd:');
    console.log(innerCmd);
    console.log('\n');

    // 测试1：检查prompt文件是否存在
    console.log('Prompt file exists:', fs.existsSync(promptFile));
    console.log('Prompt file content:', fs.readFileSync(promptFile, 'utf-8'));

    // 测试2：验证claude命令是否可用
    try {
        execSync('claude --version', { stdio: 'ignore' });
        console.log('✅ Claude command is available');
    } catch {
        console.log('❌ Claude command is NOT available');
        return;
    }

    // 测试3：手动执行innerCmd
    console.log('\nTesting manual execution...');
    try {
        const result = execSync(innerCmd, {
            encoding: 'utf-8',
            timeout: 5000,
            cwd: cwd
        });
        console.log('✅ Manual execution successful');
        console.log('Result:', result);
    } catch (error) {
        console.log('❌ Manual execution failed:', error.message);
    }

    // 测试4：使用spawn创建tmux会话
    console.log('\nTesting tmux spawn...');
    const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionId, 'bash', '-c', innerCmd]);

    tmux.on('error', (error) => {
        console.error('❌ Spawn error:', error.message);
    });

    tmux.on('close', (code) => {
        console.log(`Spawn process exited with code: ${code}`);

        if (code === 0) {
            setTimeout(() => {
                try {
                    execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                    console.log(`✅ Tmux session ${sessionId} created successfully!`);

                    // 显示会话列表
                    const sessions = execSync('tmux ls -F "#{session_name}"', { encoding: 'utf-8' });
                    console.log('Active sessions:', sessions.trim().split('\n'));

                    // 清理
                    execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                    console.log('🧹 Test session cleaned up');
                } catch {
                    console.log(`❌ Tmux session ${sessionId} was not created successfully`);
                }

                // 清理prompt文件
                try {
                    fs.unlinkSync(promptFile);
                } catch {}
            }, 1000);
        } else {
            console.log(`❌ Failed to start tmux session: ${code}`);
        }
    });
}

debugInnerCmd().catch(console.error);