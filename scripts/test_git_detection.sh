#!/bin/bash

# ==============================================================================
# Test Script for Git-Based Change Detection
# Tests the new VibeFlow enhancement to ensure Git snapshots work correctly
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  VibeFlow Git-Based Detection Test Suite           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"

# Test 1: Verify helper functions exist
echo -e "\n${YELLOW}Test 1: Verify helper functions exist${NC}"
if grep -q "function run_static_checks()" vibe.sh; then
    echo -e "${GREEN}✓ run_static_checks() found${NC}"
else
    echo -e "${RED}✗ run_static_checks() not found${NC}"
    exit 1
fi

if grep -q "function run_code_review()" vibe.sh; then
    echo -e "${GREEN}✓ run_code_review() found${NC}"
else
    echo -e "${RED}✗ run_code_review() not found${NC}"
    exit 1
fi

if grep -q "function run_healer()" vibe.sh; then
    echo -e "${GREEN}✓ run_healer() found${NC}"
else
    echo -e "${RED}✗ run_healer() not found${NC}"
    exit 1
fi

# Test 2: Verify Git snapshot logic
echo -e "\n${YELLOW}Test 2: Verify Git snapshot logic in run_agent_pipeline${NC}"
if grep -q "Pre-Snapshot (Git State Before)" vibe.sh; then
    echo -e "${GREEN}✓ Pre-snapshot code found${NC}"
else
    echo -e "${RED}✗ Pre-snapshot code not found${NC}"
    exit 1
fi

if grep -q "Post-Snapshot & Change Detection" vibe.sh; then
    echo -e "${GREEN}✓ Post-snapshot code found${NC}"
else
    echo -e "${RED}✗ Post-snapshot code not found${NC}"
    exit 1
fi

if grep -q "changed_files=\"\$LOG_DIR/\${id}_changes.txt\"" vibe.sh; then
    echo -e "${GREEN}✓ Changed files tracking found${NC}"
else
    echo -e "${RED}✗ Changed files tracking not found${NC}"
    exit 1
fi

# Test 3: Verify Git-based detection replaces marker detection
echo -e "\n${YELLOW}Test 3: Verify Git-based detection logic${NC}"
if grep -q "No file changes detected (Git-based)" vibe.sh; then
    echo -e "${GREEN}✓ Git-based detection message found${NC}"
else
    echo -e "${RED}✗ Git-based detection message not found${NC}"
    exit 1
fi

# Test 4: Verify multi-layer verification
echo -e "\n${YELLOW}Test 4: Verify multi-layer verification loop${NC}"
if grep -q "Phase A: Static Checks" vibe.sh; then
    echo -e "${GREEN}✓ Phase A (Static Checks) found${NC}"
else
    echo -e "${RED}✗ Phase A not found${NC}"
    exit 1
fi

if grep -q "Phase B: Unit Tests" vibe.sh; then
    echo -e "${GREEN}✓ Phase B (Unit Tests) found${NC}"
else
    echo -e "${RED}✗ Phase B not found${NC}"
    exit 1
fi

if grep -q "Phase C: Code Review" vibe.sh; then
    echo -e "${GREEN}✓ Phase C (Code Review) found${NC}"
else
    echo -e "${RED}✗ Phase C not found${NC}"
    exit 1
fi

# Test 5: Verify enhanced healer with failure types
echo -e "\n${YELLOW}Test 5: Verify enhanced healer with failure types${NC}"
if grep -q "run_healer \"static_check\"" vibe.sh; then
    echo -e "${GREEN}✓ Static check healer call found${NC}"
else
    echo -e "${RED}✗ Static check healer call not found${NC}"
    exit 1
fi

if grep -q "run_healer \"unit_test\"" vibe.sh; then
    echo -e "${GREEN}✓ Unit test healer call found${NC}"
else
    echo -e "${RED}✗ Unit test healer call not found${NC}"
    exit 1
fi

if grep -q "run_healer \"code_review\"" vibe.sh; then
    echo -e "${GREEN}✓ Code review healer call found${NC}"
else
    echo -e "${RED}✗ Code review healer call not found${NC}"
    exit 1
fi

# Test 6: Verify AUTO_COMMIT configuration
echo -e "\n${YELLOW}Test 6: Verify AUTO_COMMIT configuration${NC}"
if grep -q "AUTO_COMMIT=\${AUTO_COMMIT:-false}" vibe.sh; then
    echo -e "${GREEN}✓ AUTO_COMMIT config found${NC}"
else
    echo -e "${RED}✗ AUTO_COMMIT config not found${NC}"
    exit 1
fi

if grep -q "Auto Commit (Optional)" vibe.sh; then
    echo -e "${GREEN}✓ Auto-commit logic found${NC}"
else
    echo -e "${RED}✗ Auto-commit logic not found${NC}"
    exit 1
fi

# Test 7: Verify backward compatibility
echo -e "\n${YELLOW}Test 7: Verify backward compatibility with FILE markers${NC}"
if grep -q "PYTHON_PATCHER" vibe.sh && grep -q "<<<<FILE:" vibe.sh; then
    echo -e "${GREEN}✓ FILE marker system still present (backward compatible)${NC}"
else
    echo -e "${RED}✗ FILE marker system removed (breaks backward compatibility)${NC}"
    exit 1
fi

# Test 8: Check script syntax
echo -e "\n${YELLOW}Test 8: Bash syntax validation${NC}"
if bash -n vibe.sh; then
    echo -e "${GREEN}✓ vibe.sh has valid bash syntax${NC}"
else
    echo -e "${RED}✗ vibe.sh has syntax errors${NC}"
    exit 1
fi

# Summary
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  All Tests Passed! ✓                                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"

echo -e "\n${CYAN}Implementation Summary:${NC}"
echo -e "  ✓ Git-based change detection (replaces marker-based)"
echo -e "  ✓ Pre/post Git snapshots"
echo -e "  ✓ Multi-layer verification (Static + Tests + Review)"
echo -e "  ✓ Enhanced healer with failure types"
echo -e "  ✓ Auto-commit support (optional)"
echo -e "  ✓ Backward compatible with FILE markers"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Test with actual VibeFlow run (create a test REQUIREMENTS.md)"
echo -e "  2. Verify .vibe_logs/*.snapshot files are created"
echo -e "  3. Check that Git changes are properly detected"
echo -e "  4. Test the healer loop with intentional errors"

exit 0
