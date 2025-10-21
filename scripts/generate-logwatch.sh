#!/bin/bash

#######################################
# Generate Logwatch Report with Proper Permissions
# Usage: ./scripts/generate-logwatch.sh [range]
#   range: yesterday (default), today, or "between -7 days and today"
#######################################

set -e

# Configuration
OUTPUT_FILE="${LOGWATCH_OUTPUT_PATH:-/tmp/logwatch-output.txt}"
RANGE="${1:-yesterday}"
LOGWATCH_BIN="/opt/local/bin/logwatch"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating logwatch report...${NC}"
echo "Output file: $OUTPUT_FILE"
echo "Range: $RANGE"
echo ""

# Check if logwatch exists
if [ ! -f "$LOGWATCH_BIN" ]; then
    echo -e "${RED}Error: logwatch not found at $LOGWATCH_BIN${NC}"
    echo "Install with: sudo port install logwatch"
    exit 1
fi

# Generate logwatch report
echo "Running logwatch (this may take a moment)..."
if sudo "$LOGWATCH_BIN" --output file --filename "$OUTPUT_FILE" --format text --range "$RANGE"; then
    echo -e "${GREEN}✓ Logwatch report generated${NC}"
else
    echo -e "${RED}✗ Logwatch generation failed${NC}"
    exit 1
fi

# Fix permissions so the analyzer can read it
echo "Fixing file permissions..."
sudo chmod 644 "$OUTPUT_FILE"
sudo chown $(whoami):staff "$OUTPUT_FILE"

# Verify file is readable
if [ -r "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo -e "${GREEN}✓ File is readable${NC}"
    echo "File size: $FILE_SIZE"
    echo "Permissions: $(ls -l "$OUTPUT_FILE" | awk '{print $1, $3":"$4}')"
    echo ""
    echo -e "${GREEN}Done! You can now run the analyzer with: npm start${NC}"
else
    echo -e "${RED}✗ File is not readable${NC}"
    exit 1
fi
