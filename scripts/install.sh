#!/bin/bash

#######################################
# Logwatch AI Analyzer Installation Script
# For Ubuntu 24.04.2 LTS
#######################################

set -e

echo "========================================="
echo "Logwatch AI Analyzer - Installation"
echo "========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default installation directory
INSTALL_DIR="/opt/logwatch-analyzer"
CURRENT_DIR="$(pwd)"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Installation will be system-wide.${NC}"
    USE_SUDO=""
else
    echo "Running as regular user. Will use sudo when needed."
    USE_SUDO="sudo"
fi

# Function to print step
print_step() {
    echo -e "\n${GREEN}==>${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

# Check Node.js version
print_step "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20 or higher."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

echo "npm version: $(npm -v) ✓"

# Check if logwatch is installed
print_step "Checking logwatch installation..."
if ! command -v logwatch &> /dev/null; then
    print_warning "logwatch is not installed."
    echo "Install with: sudo apt-get install logwatch"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "logwatch is installed ✓"
fi

# Ask for installation directory
echo ""
read -p "Installation directory [${INSTALL_DIR}]: " custom_dir
if [ ! -z "$custom_dir" ]; then
    INSTALL_DIR="$custom_dir"
fi

# Create installation directory
print_step "Creating installation directory: ${INSTALL_DIR}"
if [ ! -d "$INSTALL_DIR" ]; then
    $USE_SUDO mkdir -p "$INSTALL_DIR"
    echo "Directory created ✓"
else
    print_warning "Directory already exists. Contents may be overwritten."
fi

# Copy files
print_step "Copying project files..."
$USE_SUDO cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
echo "Files copied ✓"

# Set ownership
if [ ! -z "$USE_SUDO" ]; then
    print_step "Setting directory ownership..."
    $USE_SUDO chown -R $USER:$USER "$INSTALL_DIR"
    echo "Ownership set ✓"
fi

# Install dependencies
print_step "Installing Node.js dependencies..."
cd "$INSTALL_DIR"
npm install
echo "Dependencies installed ✓"

# Create necessary directories
print_step "Creating required directories..."
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/data"
echo "Directories created ✓"

# Create .env file from template
print_step "Setting up environment configuration..."
if [ -f "$INSTALL_DIR/.env" ]; then
    print_warning ".env file already exists. Keeping existing file."
else
    if [ -f "$INSTALL_DIR/.env.template" ]; then
        cp "$INSTALL_DIR/.env.template" "$INSTALL_DIR/.env"
        echo ".env file created from template ✓"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Edit $INSTALL_DIR/.env and add your API keys:${NC}"
        echo "  - ANTHROPIC_API_KEY"
        echo "  - TELEGRAM_BOT_TOKEN"
        echo "  - TELEGRAM_CHAT_ID"
    else
        print_warning ".env.template not found. You'll need to create .env manually."
    fi
fi

# Set permissions
print_step "Setting file permissions..."
chmod 600 "$INSTALL_DIR/.env" 2>/dev/null || true
chmod +x "$INSTALL_DIR/src/analyzer.js"
chmod +x "$INSTALL_DIR/scripts/"*.sh
echo "Permissions set ✓"

# Setup cron job
print_step "Setting up cron job..."
CRON_CMD="0 6 * * * cd $INSTALL_DIR && $(which node) src/analyzer.js >> logs/cron.log 2>&1"
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -F "logwatch-analyzer" || true)

if [ ! -z "$CRON_EXISTS" ]; then
    print_warning "Cron job already exists:"
    echo "$CRON_EXISTS"
    read -p "Replace it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        (crontab -l 2>/dev/null | grep -v "logwatch-analyzer"; echo "$CRON_CMD") | crontab -
        echo "Cron job updated ✓"
    fi
else
    (crontab -l 2>/dev/null; echo "# Logwatch AI Analyzer - Daily at 6:00 AM"; echo "$CRON_CMD") | crontab -
    echo "Cron job installed ✓"
fi

echo ""
echo "Current crontab:"
crontab -l | grep -A1 "logwatch-analyzer" || echo "No logwatch-analyzer cron job found"

# Create systemd service (optional)
print_step "Creating systemd service (optional)..."
read -p "Create systemd service for manual execution? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/etc/systemd/system/logwatch-analyzer.service"

    cat << EOF | $USE_SUDO tee "$SERVICE_FILE" > /dev/null
[Unit]
Description=Logwatch AI Analyzer
After=network.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/src/analyzer.js
StandardOutput=append:$INSTALL_DIR/logs/app.log
StandardError=append:$INSTALL_DIR/logs/app.log

[Install]
WantedBy=multi-user.target
EOF

    $USE_SUDO systemctl daemon-reload
    echo "Systemd service created ✓"
    echo "You can run manually with: sudo systemctl start logwatch-analyzer"
fi

# Test configuration
print_step "Testing configuration..."
if [ -f "$INSTALL_DIR/.env" ]; then
    if grep -q "sk-ant-xxxxx" "$INSTALL_DIR/.env"; then
        print_warning "Please update .env with your actual API keys before running!"
    else
        echo "Configuration appears to be customized ✓"
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit configuration: nano $INSTALL_DIR/.env"
echo "2. Add your API keys and settings"
echo "3. Run test: cd $INSTALL_DIR && node scripts/test.js"
echo "4. Manual run: cd $INSTALL_DIR && npm start"
echo "5. Check logs: tail -f $INSTALL_DIR/logs/app.log"
echo ""
echo "The analyzer will run automatically daily at 6:00 AM via cron."
echo ""

# Ask to run test
read -p "Run configuration test now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$INSTALL_DIR"
    node scripts/test.js || true
fi

echo ""
echo "Installation script finished."
