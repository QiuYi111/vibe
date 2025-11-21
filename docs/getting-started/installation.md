---
title: Installation Guide
description: Complete installation instructions for Vibe Flow
category: getting-started
version: 5.0
last_updated: 2025-11-21
author: Vibe Flow Team
tags: [installation, setup, prerequisites]
language: en
---

# Installation Guide

## Prerequisites / 前置要求

Before installing Vibe Flow, ensure you have the following tools installed:

### Required Tools / 必需工具

- **Git** (version 2.25+)
  ```bash
  git --version
  ```

- **Node.js** (version 16+) and **npm**
  ```bash
  node --version
  npm --version
  ```

- **Python** (version 3.8+)
  ```bash
  python3 --version
  ```

- **Claude CLI** (Anthropic)
  ```bash
  claude --version
  ```

- **jq** (JSON processor)
  ```bash
  jq --version
  ```

### Installation Commands

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install git node python3 jq

# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install required tools
sudo apt install -y git nodejs npm python3 python3-pip jq

# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

#### Windows (WSL)
```bash
# In WSL Ubuntu/Debian
sudo apt update
sudo apt install -y git nodejs npm python3 python3-pip jq

# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh
```

## Installing Vibe Flow / 安装 Vibe Flow

### Option 1: Global Installation (Recommended) / 全局安装（推荐）
```bash
npm install -g @jingyi_qiu/vibe-flow
```

### Option 2: Local Development Setup / 本地开发设置
```bash
# Clone the repository
git clone https://github.com/yourusername/vibe.git
cd vibe

# Install dependencies
npm install

# Link for development
npm link
```

## Verification / 验证安装

Verify your installation:
```bash
vibe --version
vibe --help
```

Expected output:
```
Vibe Flow v5.0 - Git-Native Autonomous Coding Engine
Usage: vibe [options]

Options:
  --help, -h     Show help message
  --version, -v  Show version number
```

## Configuration / 配置

### Environment Variables
```bash
# Number of parallel agents (default: 2)
export MAX_PARALLEL_AGENTS=4

# Maximum retries for agent tasks (default: 3)
export MAX_RETRIES=5

# Enable auto-commit mode
export AUTO_COMMIT=true

# Set log level
export LOG_LEVEL=debug
```

### Claude CLI Setup
Make sure your Claude CLI is properly configured:
```bash
claude auth login
claude configure
```

## Troubleshooting / 故障排除

### Common Issues

#### 1. "Command not found: vibe"
**Solution**: Make sure npm global bin is in your PATH
```bash
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

#### 2. "Permission denied" on global install
**Solution**: Use npx or fix npm permissions
```bash
# Option 1: Use npx
npx @jingyi_qiu/vibe-flow

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 3. Claude CLI not working
**Solution**: Reinstall Claude CLI
```bash
# Remove old installation
rm -rf ~/.claude

# Reinstall
curl -fsSL https://claude.ai/install.sh | sh
```

### Getting Help
If you encounter issues:
1. Check the [User Guide](../guides/user-guide.md)
2. Review [Configuration](../references/configuration.md)
3. Open an issue on GitHub

## Next Steps / 下一步

- [Quick Start Guide](./quick-start.md) - Learn how to use Vibe Flow
- [User Guide](../guides/user-guide.md) - Comprehensive usage documentation
- [API Reference](../references/api.md) - Detailed API documentation

---

*Last updated: 2025-11-21*