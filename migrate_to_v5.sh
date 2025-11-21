#!/bin/bash

# Script to migrate vibe.sh from v4.0 to v5.0
# This extracts sections we want to keep and removes deprecated functions

SOURCE="vibe.sh.v4_backup"
DEST="vibe.sh"

# Extract header and config (lines 1-28)
sed -n '1,28p' "$SOURCE" | \
    sed 's/Version: 4.0 (Production Hardened)/Version: 5.0 (Git-Native Edition)/' | \
    sed 's/VIBE FLOW: Sleep-Mode Development Engine/VIBE FLOW: Git-Native Autonomous Coding Engine/' | \
    sed 's/Fixed: Self-Healing Write-Back, JSON Parsing, Security, Race Conditions/Architecture: Worktree-based parallel development with AI-powered merge resolution/' > "$DEST"

# Add new v5.0 functions (worktree management, review agent, merge manager, mediator)
# These should already be in the current vibe.sh (lines 30-200 approximately)
sed -n '30,200p' vibe.sh >> "$DEST"

# Add JSON extractor (keep from original)
sed -n '201,240p' "$SOURCE" >> "$DEST"

# Add dependency check and domain detection (keep from original)
sed -n '241,266p' "$SOURCE" >> "$DEST"

# SKIP lines 269-465 (run_static_checks, run_code_review, run_healer - deprecated in v5.0)

# Add JSON extraction tool
sed -n '466,471p' "$SOURCE" >> "$DEST"

# Add librarian
sed -n '472,512p' "$SOURCE" >> "$DEST"

# Add architect
sed -n '513,597p' "$SOURCE" >> "$DEST"

# Add NEW run_agent_pipeline (v5.0 version from lines 601-~ in current vibe.sh or manually insert)
cat >> "$DEST" << 'AGENT_PIPELINE_EOF'
# --- 🚀 Core: Factory (The Pipeline) ---
function run_agent_pipeline() {
    local id="$1"
    local name="$2"
    local desc="$3"
    local domain=$(detect_domain)
    local log_file="$LOG_DIR/${id}.log"
    local branch_name="feat/task_${id}"
    
    echo -e "${CYAN}🚀 [Agent] $name (Worktree: $branch_name)${NC}"

    (
        # Create isolated worktree
        local worktree_path=$(create_task_worktree "$id")
        
        if [[ -z "$worktree_path" ]]; then
            echo "❌ Failed to create worktree" >> "$log_file"
            exit 1
        fi
        
        # Initial build prompt (NO custom delimiters, NO hardcoded tests)
        local build_prompt="/sc:implement
[INDEX] $(cat $INDEX_FILE)
[TASK] $desc
[WORKTREE] $worktree_path
[DOMAIN] $domain

[INSTRUCTIONS]
1. You are working in an isolated Git worktree at: $worktree_path
2. FIRST, ensure .gitignore includes: node_modules/, venv/, __pycache__/, *.pyc, dist/, build/, .env
3. Use your native file editing tools to implement the task
4. Install dependencies if needed (npm install, pip install, etc.)
5. When complete, commit your changes: git commit -am 'Agent: $name - Initial implementation'
6. Use existing dependencies if available to save time
"
        
        # Execute Claude Code in worktree
        echo ">>> Agent working in $worktree_path..." > "$log_file"
        cd "$worktree_path"
        
        # Self-healing loop with Review Agent
        local retries=0
        local review_feedback=""
        
        while [[ $retries -lt $MAX_RETRIES ]]; do
            # Build or heal
            if [[ $retries -eq 0 ]]; then
                claude --dangerously-skip-permissions -p "$build_prompt" >> "$log_file" 2>&1
            else
                # Healing with review feedback
                local heal_prompt="
[PREVIOUS COMMIT] $(git log --oneline -1)
[REVIEW FEEDBACK]
$review_feedback

[INSTRUCTION]
Fix the issues identified in the review. Then commit: git commit -am 'Agent: $name - Fix attempt $retries'
"
                claude --dangerously-skip-permissions -p "$heal_prompt" >> "$log_file" 2>&1
            fi
            
            # Check if agent committed
            if ! git log --oneline -1 2>/dev/null | grep -q "Agent: $name"; then
                echo "⚠️ Agent did not commit, retrying..." >> "$log_file"
                ((retries++))
                continue
            fi
            
            cd - > /dev/null
            
            # Run Review Agent
            if run_review_agent "$id" "$name" "$worktree_path" "$domain"; then
                echo "✅ Implementation passed review and tests" >> "$log_file"
                break
            else
                # Extract review feedback for next iteration
                review_feedback=$(cat "$LOG_DIR/review_report_${id}.md")
                echo "⚠️ Review failed, healing ($((retries+1))/$MAX_RETRIES)..." >> "$log_file"
                ((retries++))
                cd "$worktree_path"
            fi
        done
        
        if [[ $retries -ge $MAX_RETRIES ]]; then
            echo "❌ Task failed after $MAX_RETRIES attempts" >> "$log_file"
            cd - > /dev/null
            exit 1
        fi
        
    ) &
    PIDS+=($!)
    TASK_BRANCHES+=("$branch_name")
}

AGENT_PIPELINE_EOF

# Add monitor_progress (dashboard)
sed -n '799,844p' "$SOURCE" >> "$DEST"

# Add NEW main execution flow (v5.0 with worktree lifecycle)
cat >> "$DEST" << 'MAIN_EOF'

# ================= 🎬 Execution =================

check_deps

MODE=$(detect_mode)
DOMAIN=$(detect_domain)

echo -e "${YELLOW}🔥 VibeFlow v5.0 (Git-Native) | Mode: $MODE | Domain: $DOMAIN${NC}"

# Init
if [[ "$MODE" == "SCRATCH" ]]; then
    git init
    if [[ ! -f "REQUIREMENTS.md" ]]; then
        echo "# $DOMAIN Requirements" > REQUIREMENTS.md
        echo -e "${RED}⚠️  REQUIREMENTS.md created. Please edit it then re-run.${NC}"
        exit 0
    fi
fi

# --- 🌿 Branch Management ---
if ! git show-ref --verify --quiet refs/heads/vibe; then
    echo -e "${BLUE}🌿 Creating 'vibe' branch...${NC}"
    git checkout -b vibe
else
    echo -e "${BLUE}🌿 Switching to 'vibe' branch...${NC}"
    git checkout vibe
fi

run_librarian "$MODE"
run_architect

# Parallel Execution with Worktrees
declare -a PIDS
declare -a TASK_BRANCHES
TASK_COUNT=$(jq '. | length' "$PLAN_FILE")

# Ensure worktree directory exists
mkdir -p .vibe_worktrees

echo -e "${BLUE}⚡ Launching $TASK_COUNT tasks with worktrees (Max Parallel: $MAX_PARALLEL_AGENTS)...${NC}"

# Launch tasks with parallelism control
for ((i=0; i<TASK_COUNT; i++)); do
    t_id=$(jq -r ".[$i].id" "$PLAN_FILE")
    t_name=$(jq -r ".[$i].name" "$PLAN_FILE")
    t_desc=$(jq -r ".[$i].desc" "$PLAN_FILE")
    
    run_agent_pipeline "$t_id" "$t_name" "$t_desc"
    
    # Rate limiting: wait after every MAX_PARALLEL_AGENTS tasks
    if (( (i + 1) % MAX_PARALLEL_AGENTS == 0 )); then
        echo -e "${YELLOW}⏳ Waiting for batch to complete...${NC}"
        monitor_progress "${PIDS[@]}"
        PIDS=()
    fi
done

# Wait for remaining tasks
if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⏳ Waiting for final batch...${NC}"
    monitor_progress "${PIDS[@]}"
fi

# Merge all task branches
merge_manager "${TASK_BRANCHES[@]}"

# Cleanup worktrees
echo -e "${BLUE}🧹 Cleaning up worktrees...${NC}"
for ((i=0; i<TASK_COUNT; i++)); do
    t_id=$(jq -r ".[$i].id" "$PLAN_FILE")
    cleanup_task_worktree "$t_id"
done

# Report
echo -e "${BLUE}🛡️  Generating Report...${NC}"
git status > git_status.txt
report_prompt="Summarize session. Input: $(cat \"$PLAN_FILE\"), Git: $(cat git_status.txt), Logs: .vibe_logs/*.md"
claude --dangerously-skip-permissions -p "$report_prompt" > "$REPORT_FILE"

run_librarian "MAINTAIN"
echo -e "${GREEN}🎉 Done. Report: $REPORT_FILE${NC}"
MAIN_EOF

chmod +x "$DEST"
echo "✅ Migration complete: vibe.sh rebuilt for v5.0"
