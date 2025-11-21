#!/bin/bash

# ==============================================================================
# VIBE FLOW: Sleep-Mode Development Engine
# Version: 3.0 (Domain Adaptive + SuperClaude + Self-Healing)
# ==============================================================================

# --- ⚙️ 全局配置 ---
INDEX_FILE="project_index.xml"
PLAN_FILE="vibe_plan.json"
REPORT_FILE="vibe_report.md"
LOG_DIR=".vibe_logs"
MAX_RETRIES=2

# --- 🎨 颜色定义 ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- 🔍 依赖检查 ---
function check_deps() {
  for cmd in claude jq git node; do
    if ! command -v $cmd &>/dev/null; then
      echo -e "${RED}❌ 错误: 未找到依赖命令 '$cmd'。请先安装。${NC}"
      exit 1
    fi
  done
  mkdir -p $LOG_DIR
}

# --- 🧠 领域与模式探测 ---
function detect_domain() {
  if [ -f "platformio.ini" ] || [ -f "CMakeLists.txt" ]; then
    echo "HARDWARE"
  elif [ -f "mamba_env.yaml" ] || [ -d "src/ros2" ] || ls *.py >/dev/null 2>&1; then
    echo "AI_ROBOT"
  elif [ -f "package.json" ] || [ -f "next.config.js" ]; then
    echo "WEB"
  else
    echo "GENERIC"
  fi
}

function detect_mode() {
  if [ ! -d ".git" ]; then
    echo "SCRATCH"
  elif [ ! -f "$INDEX_FILE" ]; then
    echo "INIT_INDEX"
  else
    echo "MAINTAIN"
  fi
}

# --- 📚 核心：Librarian (语义索引构建) ---
function run_librarian() {
  local mode=$1
  echo -e "${BLUE}📚 [Librarian] 正在分析项目上下文...${NC}"

  # 智能增量检查 (macOS 兼容)
  if [ "$mode" == "MAINTAIN" ]; then
    local last_hash=$(sed -nE 's/.*<!-- COMMIT: (.*) -->.*/\1/p' "$INDEX_FILE")
    local current_hash=$(git rev-parse HEAD)
    if [ "$last_hash" == "$current_hash" ]; then
      echo -e "${GREEN}✅ Index 已是最新，跳过重建。${NC}"
      return
    fi
  fi

  # 提取代码骨架 (使用 npx 动态调用)
  echo -e "${YELLOW}⚡ 提取代码 (Repomix)...${NC}"
  npx repomix --style xml \
    --ignore "**/*.lock,**/node_modules,**/dist,**/.git,**/*.png,**/.DS_Store,**/build,**/.pio" \
    --output raw_context.xml >/dev/null 2>&1

  # 生成语义索引 (SuperClaude /sc:index-repo)
  echo -e "${BLUE}🧠 构建语义地图...${NC}"
  local prompt="/sc:index-repo
    你是一个高级架构师。将 raw context 转换为 'Semantic Index'。
    不要包含具体代码实现，只提取元数据！
    输出 XML 格式，包含：
    <tech_stack>, <project_structure>, <api_signatures>, 
    <dependency_graph>, <hardware_constraints>(如有), <testing_strategy>
    
    最后一行必须包含: <!-- COMMIT: $(git rev-parse HEAD 2>/dev/null || echo 'INIT') -->
    "
  cat raw_context.xml | claude -p "$prompt" >"$INDEX_FILE"
  echo -e "${GREEN}✅ Index 更新完成。${NC}"
}

# --- 🏗️ 核心：Architect (需求拆解与规划) ---
function run_architect() {
  echo -e "${BLUE}🏗️  [Architect] 正在规划任务...${NC}"
  local reqs=$(cat REQUIREMENTS.md 2>/dev/null || echo "无明确需求文件，请基于代码现状优化")
  local index=$(cat "$INDEX_FILE")
  local domain=$(detect_domain)

  # 针对不同领域的提示词注入
  local domain_instruction=""
  case $domain in
  HARDWARE) domain_instruction="任务必须包含 'virtual/' 目录下的 mock 实现步骤。优先保证 native 编译通过。" ;;
  AI_ROBOT) domain_instruction="任务需分离 'training' 和 'inference' 逻辑。包含数据校验步骤。" ;;
  WEB) domain_instruction="任务需包含组件测试 (Component Test) 和 API 契约验证。" ;;
  esac

  local prompt="/sc:estimate
    [Context]
    Domain: $domain
    $index
    
    [Requirements]
    $reqs
    
    [Instruction]
    $domain_instruction
    将需求拆解为并行开发的独立任务。
    
    [Output]
    纯 JSON 数组。不要 Markdown。
    [{\"id\": \"mod_1\", \"name\": \"名称\", \"desc\": \"详细描述\", \"files\": [\"src/main.cpp\"]}]
    "

  claude -p "$prompt" | sed 's/```json//g' | sed 's/```//g' >raw_plan.json

  if jq -e . raw_plan.json >"$PLAN_FILE"; then
    echo -e "${GREEN}✅ 计划生成成功: $(jq '. | length' "$PLAN_FILE") 个任务${NC}"
    rm raw_plan.json
  else
    echo -e "${RED}❌ 计划生成失败 (JSON 解析错误)。${NC}"
    cat raw_plan.json
    exit 1
  fi
}

# --- 🚀 核心：Factory (并行流水线) ---
function run_agent_pipeline() {
  local id=$1
  local name=$2
  local desc=$3
  local domain=$(detect_domain)
  local log_file="$LOG_DIR/${id}.log"

  echo -e "${CYAN}🚀 [启动 Agent] $name ($domain 模式)${NC}"

  (
    # --- 1. Builder Phase ---
    local prompt_header="/sc:implement"
    local test_cmd=""

    # 领域自适应配置
    case $domain in
    HARDWARE)
      prompt_header="/sc:implement-hardware"
      test_cmd="pio test -e native"
      # 如果没有 pio，降级为 make
      if ! command -v pio &>/dev/null; then test_cmd="make test"; fi
      ;;
    AI_ROBOT)
      prompt_header="/sc:implement-robot"
      test_cmd="pytest"
      ;;
    WEB)
      prompt_header="/sc:implement-web"
      test_cmd="npm test"
      ;;
    *)
      test_cmd="pytest" # 默认
      if [ -f "package.json" ]; then test_cmd="npm test"; fi
      ;;
    esac

    local build_prompt="$prompt_header
        [INDEX] $(cat $INDEX_FILE)
        [TASK] $desc
        
        要求：
        1. 读取 Index 理解架构。
        2. 编写/修改代码。
        3. 必须生成对应的测试文件。
        4. 如果是硬件项目，必须在 virtual/ 目录下创建 Mock 硬件接口。
        "

    echo ">>> Building..." >"$log_file"
    claude -p "$build_prompt" >>"$log_file" 2>&1

    # --- 2. Verifier & Healer Phase (自愈循环) ---
    echo ">>> Verifying ($test_cmd)..." >>"$log_file"

    local retries=0
    local success=false

    while [ $retries -lt $MAX_RETRIES ]; do
      if $test_cmd >>"$log_file" 2>&1; then
        echo "✅ Tests Passed" >>"$log_file"
        success=true
        break
      else
        echo "⚠️ Test Failed (Attempt $((retries + 1))/$MAX_RETRIES). Healing..." >>"$log_file"
        local error_log=$(tail -n 30 "$log_file")

        # 自愈指令
        claude -p "Fix the code based on this error log:\n$error_log\nOnly output the fixed code files." >>"$log_file" 2>&1
        retries=$((retries + 1))
      fi
    done

    if [ "$success" = false ]; then
      echo "❌ Module Failed after retries." >>"$log_file"
      # 不退出，允许 Linus 审查失败现场
    fi

    # --- 3. Linus Phase (Adversarial Review) ---
    local linus_prompt="
        [ROLE] Linus Torvalds
        [CONTEXT] Task: $name
        审查代码实现和测试结果。
        如果测试失败，狠批原因。
        如果通过但代码烂，狠批风格。
        "
    claude -p "$linus_prompt" >>"$log_file" 2>&1

  ) &
  PIDS+=($!)
}

# ================= 🎬 主程序执行流 =================

check_deps

MODE=$(detect_mode)
DOMAIN=$(detect_domain)

echo -e "${YELLOW}🔥 VibeFlow 启动 | 模式: $MODE | 领域: $DOMAIN${NC}"

# 0. 初始化处理
if [ "$MODE" == "SCRATCH" ]; then
  git init
  if [ ! -f "REQUIREMENTS.md" ]; then
    echo "# $DOMAIN Project Requirements" >REQUIREMENTS.md
    echo "在此填入你的宏伟计划..." >>REQUIREMENTS.md
    echo -e "${RED}⚠️  已创建 REQUIREMENTS.md，请填写后重新运行！${NC}"
    exit 0
  fi
fi

# 1. 维护索引 (Librarian)
run_librarian $MODE

# 2. 生成计划 (Architect)
run_architect

# 3. 并行开发 (The Factory)
declare -a PIDS
TASK_COUNT=$(jq '. | length' "$PLAN_FILE")

echo -e "${BLUE}⚡ 启动 $TASK_COUNT 条并行流水线...${NC}"

for ((i = 0; i < $TASK_COUNT; i++)); do
  t_id=$(jq -r ".[$i].id" "$PLAN_FILE")
  t_name=$(jq -r ".[$i].name" "$PLAN_FILE")
  t_desc=$(jq -r ".[$i].desc" "$PLAN_FILE")

  run_agent_pipeline "$t_id" "$t_name" "$t_desc"
  sleep 1 # 避免瞬间并发导致 API Rate Limit
done

# 4. 等待收敛
echo -e "${YELLOW}⏳ 等待所有 Agent 完工...${NC}"
for pid in ${PIDS[*]}; do wait $pid; done

# 5. 生成报告 (Integrator)
echo -e "${BLUE}🛡️  [Integrator] 生成最终报告...${NC}"
git status >git_status.txt
report_prompt="
总结本次 Vibe Coding 会话。
[Plan]: $(cat $PLAN_FILE)
[Git Status]: $(cat git_status.txt)
[Logs]: (分析 .vibe_logs 目录下的所有日志)

生成 Markdown 报告。
1. 概览：成功/失败 模块数。
2. 详细结果：每个模块的 Linus 评价。
3. 下一步建议。
"
claude -p "$report_prompt" >"$REPORT_FILE"

# 6. 收尾
run_librarian "MAINTAIN"
echo -e "${GREEN}🎉 任务结束。请查看 $REPORT_FILE 并执行 git commit。${NC}"
