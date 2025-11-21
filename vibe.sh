#!/bin/bash

# ==============================================================================
# VIBE FLOW: Sleep-Mode Development Engine
# Version: 4.0 (Production Hardened)
# Fixed: Self-Healing Write-Back, JSON Parsing, Security, Race Conditions
# ==============================================================================

# --- ⚙️ 全局配置 ---
INDEX_FILE="project_index.xml"
PLAN_FILE="vibe_plan.json"
REPORT_FILE="vibe_report.md"
LOG_DIR=".vibe_logs"
MAX_RETRIES=3
MAX_CONTEXT_SIZE_KB=500  # 限制 Context 大小，防止 API 报错

# 忽略列表 (Security Hardened)
IGNORE_PATTERNS="**/*.lock,**/node_modules,**/dist,**/.git,**/.DS_Store,**/build,**/.pio,**/.env*,**/*.key,**/secrets.*,**/__pycache__"

# --- 🎨 颜色定义 ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- 🐍 Python Patcher (关键修复：用于将 LLM 输出写入文件) ---
# 这是一个嵌入式 Python 脚本，用于解析自定义标记并覆写文件
read -r -d '' PYTHON_PATCHER << EOM
import sys, re, os

log_file = sys.argv[1]
try:
    with open(log_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 匹配 <<<<FILE:path>>>>...<<<<END>>>>
    pattern = re.compile(r'<<<<FILE:(.*?)>>>>(.*?)<<<<END>>>>', re.DOTALL)
    matches = pattern.findall(content)

    if not matches:
        print("NO_CHANGES_FOUND")
        sys.exit(0)

    for file_path, file_content in matches:
        file_path = file_path.strip()
        # 安全检查：防止路径穿越
        if '..' in file_path or file_path.startswith('/'):
            print(f"SKIPPING_UNSAFE_PATH: {file_path}")
            continue
        
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content.strip())
        print(f"UPDATED: {file_path}")

except Exception as e:
    print(f"PATCH_ERROR: {str(e)}")
    sys.exit(1)
EOM

# --- 🔍 依赖检查 ---
function check_deps() {
    local deps=("claude" "jq" "git" "node" "npx" "python3")
    for cmd in "${deps[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            echo -e "${RED}❌ Critical Error: Missing dependency '$cmd'. Please install it.${NC}"
            exit 1
        fi
    done
    mkdir -p "$LOG_DIR"
}

# --- 🧠 领域与模式探测 ---
function detect_domain() {
    if [[ -f "platformio.ini" || -f "CMakeLists.txt" ]]; then echo "HARDWARE"; return; fi
    if [[ -f "mamba_env.yaml" || -d "src/ros2" ]]; then echo "AI_ROBOT"; return; fi
    if ls *.py >/dev/null 2>&1; then echo "PYTHON_GENERIC"; return; fi
    if [[ -f "package.json" || -f "next.config.js" ]]; then echo "WEB"; return; fi
    echo "GENERIC"
}

function detect_mode() {
    if [[ ! -d ".git" ]]; then echo "SCRATCH"; return; fi
    if [[ ! -f "$INDEX_FILE" ]]; then echo "INIT_INDEX"; return; fi
    echo "MAINTAIN"
}

# --- 🛠️ JSON 提取工具 (增强健壮性) ---
function extract_json_block() {
    local input_file="$1"
    # 1. 尝试提取 ```json ... ``` 块
    # 2. 如果没有代码块，尝试提取 [ ... ]
    # 3. 清理非 JSON 字符
    
    local content=$(cat "$input_file")
    
    if echo "$content" | grep -q "^\`\`\`json"; then
        # 提取 markdown 代码块
        echo "$content" | sed -n '/^```json/,/^```/p' | sed '1d;$d'
    elif echo "$content" | grep -q "^\`\`\`"; then
         # 提取通用代码块
        echo "$content" | sed -n '/^```/,/^```/p' | sed '1d;$d'
    else
        # 提取第一个 [ 和最后一个 ] 之间的内容 (原有逻辑增强)
        awk '/\[/{p=1} p; /\]/{if(p) exit}' "$input_file" | sed '1s/^.*\[/[/' | sed '$s/\].*$/]/'
    fi
}

# --- 📚 Core: Librarian ---
function run_librarian() {
    local mode="$1"
    echo -e "${BLUE}📚 [Librarian] Analyzing context...${NC}"

    # Context Size Check
    if [[ -f "raw_context.xml" ]]; then
        local size_kb=$(du -k "raw_context.xml" | cut -f1)
        if [[ "$size_kb" -gt "$MAX_CONTEXT_SIZE_KB" ]]; then
            echo -e "${YELLOW}⚠️ Warning: Context size ($size_kb KB) is large. Truncation may occur.${NC}"
        fi
    fi

    # Incremental Check
    if [[ "$mode" == "MAINTAIN" ]]; then
        local last_hash=$(sed -nE 's/.*<!-- COMMIT: (.*) -->.*/\1/p' "$INDEX_FILE")
        local current_hash=$(git rev-parse HEAD)
        if [[ "$last_hash" == "$current_hash" ]]; then
            echo -e "${GREEN}✅ Index is up-to-date.${NC}"
            return
        fi
    fi

    # Repomix Execution
    echo -e "${YELLOW}⚡ Extracting codebase (Repomix)...${NC}"
    if ! npx repomix --style xml --ignore "$IGNORE_PATTERNS" --output raw_context.xml > /dev/null 2>&1; then
        echo -e "${RED}❌ Repomix failed. Check npx/network.${NC}"
        exit 1
    fi

    # LLM Index Generation
    local prompt="/sc:index-repo
    You are a Senior Architect. Convert raw context to a 'Semantic Index'.
    Output ONLY valid XML.
    Include: <tech_stack>, <project_structure>, <api_signatures>, <dependency_graph>.
    NO actual code logic.
    Last line must be: <!-- COMMIT: $(git rev-parse HEAD 2>/dev/null || echo 'INIT') -->
    "
    cat raw_context.xml | claude -p "$prompt" > "$INDEX_FILE"
}

# --- 🏗️ Core: Architect ---
function run_architect() {
    echo -e "${BLUE}🏗️  [Architect] Planning tasks...${NC}"
    local reqs=$(cat REQUIREMENTS.md 2>/dev/null || echo "Optimize existing codebase based on index.")
    local index=$(cat "$INDEX_FILE")
    local domain=$(detect_domain)

    # 基础 Prompt
    local base_prompt="/sc:estimate
    [Context]
    Domain: $domain
    $index
    
    [Requirements]
    $reqs
    
    [Task]
    Break down requirements into parallelizable tasks.
    IMPORTANT: Ensure tasks modify DIFFERENT files to avoid race conditions.
    
    [Output Format]
    RETURN ONLY A RAW JSON ARRAY. 
    DO NOT wrap in markdown code blocks (no \`\`\`).
    DO NOT include any explanation or text before/after the JSON.
    Example:
    [{\"id\": \"task_1\", \"name\": \"Auth\", \"desc\": \"Implement login\", \"files\": [\"src/auth.py\"]}]
    "

    local retry_count=0
    local max_retries=3
    local success=false

    while [ $retry_count -lt $max_retries ]; do
        if [ $retry_count -eq 0 ]; then
            # 首次尝试
            claude -p "$base_prompt" > raw_plan_output.txt
        else
            # 重试逻辑：将错误反馈给 LLM
            echo -e "${YELLOW}⚠️ JSON Parse Error. Retrying ($retry_count/$max_retries)...${NC}"
            local error_msg=$(jq -e . raw_plan.json 2>&1)
            local fix_prompt="
            [System]
            The previous JSON output was invalid.
            Error: $error_msg
            
            [Previous Output]
            $(cat raw_plan_output.txt)
            
            [Instruction]
            Fix the JSON syntax. Output ONLY the valid JSON array.
            "
            claude -p "$fix_prompt" > raw_plan_output.txt
        fi

        # 尝试提取和解析
        extract_json_block "raw_plan_output.txt" > raw_plan.json
        
        if jq -e . raw_plan.json > "$PLAN_FILE"; then
            echo -e "${GREEN}✅ Plan generated: $(jq '. | length' "$PLAN_FILE") tasks.${NC}"
            rm raw_plan_output.txt raw_plan.json
            success=true
            break
        else
            ((retry_count++))
        fi
    done

    if [ "$success" = false ]; then
        echo -e "${RED}❌ Architect failed to generate valid JSON after $max_retries retries.${NC}"
        echo -e "${RED}Debug: See raw_plan_output.txt${NC}"
        exit 1
    fi
}

# --- 🚀 Core: Factory (The Pipeline) ---
function run_agent_pipeline() {
    local id="$1"
    local name="$2"
    local desc="$3"
    local domain=$(detect_domain)
    local log_file="$LOG_DIR/${id}.log"
    
    echo -e "${CYAN}🚀 [Agent] $name ($domain)${NC}"

    (
        # --- 1. Builder Phase ---
        local test_cmd="echo 'No test command defined'"
        
        # Domain Logic
        case "$domain" in
            HARDWARE) test_cmd="pio test -e native" ;;
            AI_ROBOT) test_cmd="pytest" ;; # Assumes pytest is configured
            WEB)      test_cmd="npm test" ;;
            PYTHON_GENERIC) test_cmd="pytest" ;;
            *)        test_cmd="echo 'GENERIC: Verify manually'" ;;
        esac

        # 🔴 CRITICAL: Instruction for Write-Back
        # We force the LLM to use delimiters that our Python Patcher can parse.
        local write_instruction="
        CRITICAL OUTPUT FORMAT:
        To write code, you MUST wrap the file content exactly like this:
        <<<<FILE: path/to/file.ext>>>>
        code_here...
        <<<<END>>>>
        
        You can output multiple files. Any text outside these tags is treated as comments.
        "

        local build_prompt="/sc:implement
        [INDEX] $(cat $INDEX_FILE)
        [TASK] $desc
        $write_instruction
        "
        
        echo ">>> Building..." > "$log_file"
        # Run Claude and verify exit code
        if ! claude -p "$build_prompt" >> "$log_file" 2>&1; then
             echo "❌ API Error" >> "$log_file"
             exit 1
        fi

        # Apply Changes (Write-Back)
        echo ">>> Applying changes..." >> "$log_file"
        python3 -c "$PYTHON_PATCHER" "$log_file" >> "$log_file" 2>&1

        # --- 2. Verifier & Healer Loop ---
        local retries=0
        local success=false
        
        while [[ $retries -lt $MAX_RETRIES ]]; do
            echo ">>> Test Run $((retries+1)) ($test_cmd)..." >> "$log_file"
            
            # Check for command existence before running
            local cmd_bin=$(echo "$test_cmd" | awk '{print $1}')
            if ! command -v "$cmd_bin" &> /dev/null && [[ "$cmd_bin" != "echo" ]]; then
                echo "⚠️ Test command '$cmd_bin' not found. Skipping tests." >> "$log_file"
                break
            fi

            if eval "$test_cmd" >> "$log_file" 2>&1; then
                echo "✅ Tests Passed" >> "$log_file"
                success=true
                break
            else
                echo "⚠️ Test Failed. Healing..." >> "$log_file"
                
                # Extract error context
                local error_log=$(tail -n 40 "$log_file")
                
                # Healer Prompt
                local heal_prompt="
                [ROLE] Code Healer
                [ERROR LOG]
                $error_log
                
                [INSTRUCTION]
                Fix the code.
                $write_instruction
                "
                
                # Run Healer
                claude -p "$heal_prompt" >> "$log_file" 2>&1
                
                # Apply Fixes (Write-Back)
                python3 -c "$PYTHON_PATCHER" "$log_file" >> "$log_file" 2>&1
                
                retries=$((retries+1))
            fi
        done

        if [[ "$success" == "false" ]]; then
            echo "❌ Module Failed after retries." >> "$log_file"
        fi

        # --- 3. Linus Review ---
        claude -p "[ROLE] Linus Torvalds. Review this work: $name. Be critical." >> "$log_file" 2>&1

    ) & 
    PIDS+=($!)
}

# ================= 🎬 Execution =================

check_deps

MODE=$(detect_mode)
DOMAIN=$(detect_domain)

echo -e "${YELLOW}🔥 VibeFlow v4.0 | Mode: $MODE | Domain: $DOMAIN | Balance: (Check Web UI)${NC}"

# Init
if [[ "$MODE" == "SCRATCH" ]]; then
    git init
    if [[ ! -f "REQUIREMENTS.md" ]]; then
        echo "# $DOMAIN Requirements" > REQUIREMENTS.md
        echo -e "${RED}⚠️  REQUIREMENTS.md created. Please edit it then re-run.${NC}"
        exit 0
    fi
fi

run_librarian "$MODE"
run_architect

# Parallel Execution
declare -a PIDS
TASK_COUNT=$(jq '. | length' "$PLAN_FILE")
echo -e "${BLUE}⚡ Starting $TASK_COUNT parallel agents...${NC}"

for ((i=0; i<$TASK_COUNT; i++)); do
    t_id=$(jq -r ".[$i].id" "$PLAN_FILE")
    t_name=$(jq -r ".[$i].name" "$PLAN_FILE")
    t_desc=$(jq -r ".[$i].desc" "$PLAN_FILE")
    
    run_agent_pipeline "$t_id" "$t_name" "$t_desc"
    sleep 1
done

# --- 📊 Dashboard ---
function monitor_progress() {
    local pids=("$@")
    local spinners=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
    local spin_idx=0
    
    while true; do
        local running=0
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                ((running++))
            fi
        done
        
        if [[ $running -eq 0 ]]; then
            break
        fi
        
        # Get latest log activity
        local latest_log=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -n 1)
        local activity=""
        if [[ -f "$latest_log" ]]; then
            activity=$(tail -n 1 "$latest_log" | cut -c 1-50)
        fi
        
        # Display status
        printf "\r${BLUE}%s Active Agents: %d | Last: %s...${NC}   " "${spinners[spin_idx]}" "$running" "$activity"
        
        spin_idx=$(( (spin_idx + 1) % 10 ))
        sleep 0.5
    done
    echo "" # New line after done
}

echo -e "${YELLOW}⏳ Waiting for agents...${NC}"
monitor_progress "${PIDS[@]}"

# Report
echo -e "${BLUE}🛡️  Generating Report...${NC}"
git status > git_status.txt
report_prompt="Summarize session. Input: $(cat "$PLAN_FILE"), Git: $(cat git_status.txt), Logs: .vibe_logs/*.md"
claude -p "$report_prompt" > "$REPORT_FILE"

run_librarian "MAINTAIN"
echo -e "${GREEN}🎉 Done. Report: $REPORT_FILE${NC}"