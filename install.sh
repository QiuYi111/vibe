#!/bin/bash

# ==============================================================================
# Vibe Flow - 一键安装脚本
# ==============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "██╗   ██╗██╗██████╗ ███████╗    ███████╗██╗      ██████╗ ██╗    ██╗"
echo "██║   ██║██║██╔══██╗██╔════╝    ██╔════╝██║     ██╔═══██╗██║    ██║"
echo "██║   ██║██║██████╔╝█████╗      █████╗  ██║     ██║   ██║██║ █╗ ██║"
echo "╚██╗ ██╔╝██║██╔══██╗██╔══╝      ██╔══╝  ██║     ██║   ██║██║███╗██║"
echo " ╚████╔╝ ██║██████╔╝███████╗    ██║     ███████╗╚██████╔╝╚███╔███╔╝"
echo "  ╚═══╝  ╚═╝╚═════╝ ╚══════╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝"
echo -e "${NC}"
echo -e "${GREEN}一键安装脚本${NC}"
echo ""

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}检测到操作系统: ${MACHINE}${NC}"
echo ""

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 安装 Node.js（如果需要）
if ! command_exists node; then
    echo -e "${YELLOW}⚠️  Node.js 未安装${NC}"
    echo -e "${BLUE}请访问 https://nodejs.org 下载安装 Node.js 18+${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js 已安装: ${NODE_VERSION}${NC}"
fi

# 安装 Python（如果需要）
if ! command_exists python3; then
    echo -e "${YELLOW}⚠️  Python 3 未安装${NC}"
    echo -e "${BLUE}请访问 https://python.org 下载安装 Python 3.8+${NC}"
    exit 1
else
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python 已安装: ${PYTHON_VERSION}${NC}"
fi

# 安装 Git（如果需要）
if ! command_exists git; then
    echo -e "${YELLOW}⚠️  Git 未安装${NC}"
    echo -e "${BLUE}请访问 https://git-scm.com 下载安装 Git${NC}"
    exit 1
else
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✅ Git 已安装: ${GIT_VERSION}${NC}"
fi

echo ""
echo -e "${BLUE}开始安装 Vibe Flow 依赖...${NC}"
echo ""

# 1. 安装 Claude Code CLI
echo -e "${BLUE}[1/5] 安装 Claude Code CLI...${NC}"
if command_exists claude; then
    echo -e "${GREEN}✅ Claude Code 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 Claude Code...${NC}"
    curl -fsSL https://claude.com/install.sh | sh
    
    # 验证安装
    if command_exists claude; then
        echo -e "${GREEN}✅ Claude Code 安装成功${NC}"
    else
        echo -e "${RED}❌ Claude Code 安装失败${NC}"
        echo -e "${YELLOW}请手动安装: curl -fsSL https://claude.com/install.sh | sh${NC}"
        exit 1
    fi
fi

# 2. 安装 SuperClaude
echo ""
echo -e "${BLUE}[2/5] 安装 SuperClaude...${NC}"
if command_exists superclaude; then
    echo -e "${GREEN}✅ SuperClaude 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 SuperClaude...${NC}"
    npm install -g superclaude
    
    if command_exists superclaude; then
        echo -e "${GREEN}✅ SuperClaude 安装成功${NC}"
    else
        echo -e "${RED}❌ SuperClaude 安装失败${NC}"
        echo -e "${YELLOW}请手动安装: npm install -g superclaude${NC}"
        exit 1
    fi
fi

# 3. 安装 Vibe Flow
echo ""
echo -e "${BLUE}[3/5] 安装 Vibe Flow...${NC}"
if command_exists vibe; then
    echo -e "${GREEN}✅ Vibe Flow 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 Vibe Flow...${NC}"
    npm install -g @jingyi_qiu/vibe-flow
    
    if command_exists vibe; then
        echo -e "${GREEN}✅ Vibe Flow 安装成功${NC}"
    else
        echo -e "${RED}❌ Vibe Flow 安装失败${NC}"
        echo -e "${YELLOW}请手动安装: npm install -g @jingyi_qiu/vibe-flow${NC}"
        exit 1
    fi
fi

# 4. 安装 jq
echo ""
echo -e "${BLUE}[4/5] 安装 jq...${NC}"
if command_exists jq; then
    echo -e "${GREEN}✅ jq 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 jq...${NC}"
    if [ "$MACHINE" = "Mac" ]; then
        if command_exists brew; then
            brew install jq
        else
            echo -e "${RED}❌ Homebrew 未安装，无法自动安装 jq${NC}"
            echo -e "${YELLOW}请手动安装: brew install jq${NC}"
        fi
    elif [ "$MACHINE" = "Linux" ]; then
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command_exists yum; then
            sudo yum install -y jq
        else
            echo -e "${RED}❌ 无法检测包管理器，请手动安装 jq${NC}"
        fi
    fi
    
    if command_exists jq; then
        echo -e "${GREEN}✅ jq 安装成功${NC}"
    else
        echo -e "${YELLOW}⚠️  jq 安装失败，但这不会阻止 Vibe Flow 运行${NC}"
    fi
fi

# 5. 安装 tmux（可选）
echo ""
echo -e "${BLUE}[5/5] 安装 tmux（可选，用于任务监控）...${NC}"
if command_exists tmux; then
    echo -e "${GREEN}✅ tmux 已安装${NC}"
else
    echo -e "${YELLOW}正在安装 tmux...${NC}"
    if [ "$MACHINE" = "Mac" ]; then
        if command_exists brew; then
            brew install tmux
        else
            echo -e "${YELLOW}⚠️  Homebrew 未安装，跳过 tmux 安装${NC}"
        fi
    elif [ "$MACHINE" = "Linux" ]; then
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y tmux
        elif command_exists yum; then
            sudo yum install -y tmux
        fi
    fi
    
    if command_exists tmux; then
        echo -e "${GREEN}✅ tmux 安装成功${NC}"
    else
        echo -e "${YELLOW}⚠️  tmux 未安装（可选依赖）${NC}"
    fi
fi

# 安装完成
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Vibe Flow 安装完成！${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}下一步：${NC}"
echo -e "${YELLOW}1. 配置 Claude Code 认证:${NC}"
echo -e "   claude"
echo ""
echo -e "${YELLOW}2. 验证 SuperClaude:${NC}"
echo -e "   superclaude --verify"
echo ""
echo -e "${YELLOW}3. 开始使用 Vibe Flow:${NC}"
echo -e "   cd your-project"
echo -e "   echo '# 项目需求' > REQUIREMENTS.md"
echo -e "   vibe"
echo ""
echo -e "${BLUE}需要帮助？访问: https://github.com/QiuYi111/vibe${NC}"
echo ""
