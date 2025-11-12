#!/bin/bash

# Node.js SEA (Single Executable Application) Build Script
# This script creates a standalone binary that includes the Node.js runtime
# and all application dependencies bundled together.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${PROJECT_ROOT}/dist"
NODE_BINARY=$(which node)
OUTPUT_BINARY="${DIST_DIR}/logwatch-ai-linux-x64"
PLATFORM="linux"
ARCH="x64"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Node.js SEA Build Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v)
echo -e "  Node.js: ${GREEN}${NODE_VERSION}${NC}"

# Check if Node.js >= 20.0.0
MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d '.' -f 1)
if [ "$MAJOR_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20.0.0 or higher is required${NC}"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    cd "$PROJECT_ROOT"
    npm install
fi

# Step 1: Clean previous build artifacts
echo -e "\n${BLUE}Step 1: Cleaning previous build artifacts...${NC}"
if [ -d "$DIST_DIR" ]; then
    rm -rf "$DIST_DIR"
    echo -e "  ${GREEN}✓${NC} Cleaned dist/ directory"
fi
mkdir -p "$DIST_DIR"
echo -e "  ${GREEN}✓${NC} Created dist/ directory"

# Step 2: Bundle with esbuild
echo -e "\n${BLUE}Step 2: Bundling application with esbuild...${NC}"
cd "$PROJECT_ROOT"
node esbuild.config.js

if [ ! -f "${DIST_DIR}/bundle.js" ]; then
    echo -e "${RED}Error: Bundle creation failed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Bundle created: dist/bundle.js"

# Check bundle size
BUNDLE_SIZE=$(du -h "${DIST_DIR}/bundle.js" | cut -f1)
echo -e "  ${GREEN}✓${NC} Bundle size: ${BUNDLE_SIZE}"

# Step 3: Generate SEA blob
echo -e "\n${BLUE}Step 3: Generating SEA blob...${NC}"
cd "$PROJECT_ROOT"
node --experimental-sea-config sea-config.json

if [ ! -f "${DIST_DIR}/sea-prep.blob" ]; then
    echo -e "${RED}Error: SEA blob generation failed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} SEA blob generated: dist/sea-prep.blob"

BLOB_SIZE=$(du -h "${DIST_DIR}/sea-prep.blob" | cut -f1)
echo -e "  ${GREEN}✓${NC} Blob size: ${BLOB_SIZE}"

# Step 4: Copy Node.js binary
echo -e "\n${BLUE}Step 4: Copying Node.js binary...${NC}"
cp "$NODE_BINARY" "$OUTPUT_BINARY"
echo -e "  ${GREEN}✓${NC} Copied: ${NODE_BINARY}"
echo -e "  ${GREEN}✓${NC} To: ${OUTPUT_BINARY}"

# Step 5: Inject SEA blob using postject
echo -e "\n${BLUE}Step 5: Injecting SEA blob into binary...${NC}"

# Check platform and use appropriate postject command
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "  Platform: macOS"
    npx postject "$OUTPUT_BINARY" NODE_SEA_BLOB "${DIST_DIR}/sea-prep.blob" \
        --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
        --macho-segment-name NODE_SEA
else
    # Linux
    echo -e "  Platform: Linux"
    npx postject "$OUTPUT_BINARY" NODE_SEA_BLOB "${DIST_DIR}/sea-prep.blob" \
        --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Blob injection failed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Blob injected successfully"

# Step 6: Set executable permissions
echo -e "\n${BLUE}Step 6: Setting executable permissions...${NC}"
chmod +x "$OUTPUT_BINARY"
echo -e "  ${GREEN}✓${NC} Executable permissions set"

# Step 7: Display final binary information
echo -e "\n${BLUE}Step 7: Build complete!${NC}"
BINARY_SIZE=$(du -h "$OUTPUT_BINARY" | cut -f1)
echo -e "  ${GREEN}✓${NC} Binary created: ${OUTPUT_BINARY}"
echo -e "  ${GREEN}✓${NC} Binary size: ${BINARY_SIZE}"

# Step 8: Cleanup temporary files (optional)
echo -e "\n${BLUE}Step 8: Cleaning up temporary files...${NC}"
rm -f "${DIST_DIR}/bundle.js" "${DIST_DIR}/sea-prep.blob"
echo -e "  ${GREEN}✓${NC} Temporary files removed (bundle.js, sea-prep.blob)"
echo -e "  ${GREEN}✓${NC} WASM file kept: dist/sql-wasm.wasm"

# Final summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Build Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}Output:${NC}"
echo -e "  Binary: ${OUTPUT_BINARY}"
echo -e "  Size: ${BINARY_SIZE}"
echo -e "\n${BLUE}Usage:${NC}"
echo -e "  ${OUTPUT_BINARY}"
echo -e "\n${YELLOW}Note:${NC}"
echo -e "  - The binary still requires .env file with configuration"
echo -e "  - The binary still requires data/ and logs/ directories"
echo -e "  - The binary still requires sql-wasm.wasm in the same directory"
echo -e "  - The binary still requires logwatch to be installed on the system"
echo -e "\n${BLUE}Deploy:${NC}"
echo -e "  1. Copy ${OUTPUT_BINARY} to target server"
echo -e "  2. Copy dist/sql-wasm.wasm to the same directory"
echo -e "  3. Create .env file with required configuration"
echo -e "  4. Create data/ and logs/ directories"
echo -e "  5. Ensure logwatch is installed on target system"
echo ""
