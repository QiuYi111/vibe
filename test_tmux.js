#!/usr/bin/env node

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';

async function testTmuxCreation() {
    const sessionId = 'test-vibe-task';
    const cwd = process.cwd();

    // 简化的innerCmd
    const innerCmd = [
        `cd "${cwd}"`,
        `echo "🚀 Vibe Task Started in Tmux Session: ${sessionId}"`,
        `echo "📁 Working Directory: $(pwd)"`,
        `sleep 2`,
        `echo "✅ Task completed successfully"`
    ].join(' && ');

    console.log('Testing tmux session creation...');
    console.log('Command:', `tmux new-session -d -s ${sessionId} bash -c '${innerCmd}'`);

    // 使用修复后的参数格式
    const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionId, 'bash', '-c', innerCmd]);

    return new Promise((resolve, reject) => {
        tmux.on('error', reject);
        tmux.on('close', (code) => {
            console.log(`Tmux spawn process exited with code: ${code}`);

            if (code === 0) {
                setTimeout(() => {
                    // 验证tmux会话是否真的创建成功
                    try {
                        execSync(`tmux has-session -t ${sessionId}`, { stdio: 'ignore' });
                        console.log(`✅ Tmux session ${sessionId} created successfully!`);

                        // 显示会话列表
                        const sessions = execSync('tmux ls -F "#{session_name}"', { encoding: 'utf-8' });
                        console.log('Active sessions:', sessions.trim().split('\n'));

                        // 清理测试会话
                        execSync(`tmux kill-session -t ${sessionId}`, { stdio: 'ignore' });
                        console.log('🧹 Test session cleaned up');

                        resolve();
                    } catch {
                        reject(new Error(`Tmux session ${sessionId} was not created successfully`));
                    }
                }, 1000);
            } else {
                reject(new Error(`Failed to start tmux session: ${code}`));
            }
        });
    });
}

testTmuxCreation()
    .then(() => {
        console.log('🎉 Test passed! Tmux creation is working.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });