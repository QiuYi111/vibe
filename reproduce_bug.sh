#!/bin/bash

# --- 🐍 Python JSON Extractor (New: Robust JSON Parsing) ---
read -r -d '' JSON_EXTRACTOR << EOM
import sys, json, re

def extract_json(content):
    # 1. Try to find markdown code blocks first
    pattern = re.compile(r'\`\`\`(?:json)?\s*(\[.*?\])\s*\`\`\`', re.DOTALL)
    match = pattern.search(content)
    if match:
        return match.group(1)
    
    # 2. Fallback: Find the first '[' and the last ']'
    start = content.find('[')
    end = content.rfind(']')
    
    if start != -1 and end != -1 and end > start:
        return content[start:end+1]
    return None

try:
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    json_str = extract_json(content)
    
    if json_str:
        # Validate JSON
        obj = json.loads(json_str)
        print(json.dumps(obj, indent=2))
    else:
        print("Error: No JSON found", file=sys.stderr)
        sys.exit(1)

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
EOM

function extract_json_block() {
    local input_file="$1"
    python3 -c "$JSON_EXTRACTOR" "$input_file"
}

# Test case 1: Nested JSON array
cat > test_nested.txt <<EOF
[
  {
    "id": "task_1",
    "files": [
      "src/main.py"
    ]
  },
  {
    "id": "task_2"
  }
]
EOF

echo "--- Input ---"
cat test_nested.txt
echo "--- Extracted ---"
extract_json_block test_nested.txt
