#!/bin/bash

# Script to run k6 and extract JSON results
SCRIPT_NAME=${1:-"socialapp/twitter-auth.js"}
OUTPUT_DIR="results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory if it doesn't exist
mkdir -p $OUTPUT_DIR

echo "Running k6 test: $SCRIPT_NAME"

# Method 1: Built-in JSON output (comprehensive metrics)
echo "Generating comprehensive JSON metrics..."
k6 run --out json="$OUTPUT_DIR/k6_metrics_$TIMESTAMP.json" $SCRIPT_NAME > "$OUTPUT_DIR/console_output_$TIMESTAMP.log" 2>&1

# Method 2: Extract custom JSON from console output
echo "Extracting custom test results..."
grep "TEST_RESULT_JSON:" "$OUTPUT_DIR/console_output_$TIMESTAMP.log" | sed 's/.*TEST_RESULT_JSON: //' > "$OUTPUT_DIR/test_results_$TIMESTAMP.json"

# Method 3: Create summary JSON
echo "Creating test summary..."
cat > "$OUTPUT_DIR/summary_$TIMESTAMP.json" << EOF
{
  "test_run": {
    "timestamp": "$(date -Iseconds)",
    "script": "$SCRIPT_NAME",
    "files_generated": [
      "k6_metrics_$TIMESTAMP.json",
      "test_results_$TIMESTAMP.json",
      "console_output_$TIMESTAMP.log",
      "summary_$TIMESTAMP.json"
    ]
  }
}
EOF

echo "Results saved to $OUTPUT_DIR/ directory:"
echo "  - k6_metrics_$TIMESTAMP.json (full k6 metrics)"
echo "  - test_results_$TIMESTAMP.json (custom test results)"
echo "  - console_output_$TIMESTAMP.log (console output)"
echo "  - summary_$TIMESTAMP.json (test summary)"
