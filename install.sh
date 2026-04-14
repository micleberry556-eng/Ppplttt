#!/usr/bin/env bash
# ============================================================================
# Konoha — One-command installer
#
# Installs Redis, Bun, Node.js (for admin panel build), project dependencies,
# builds the admin panel, configures systemd services, and starts everything.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<org>/konoha/main/install.sh | bash
#   # or
#   git clone <repo> && cd konoha && bash install.sh
#
# Tested on: Ubuntu 22.04+, Debian 12+
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ---------------------------------------------------------------------------
# Detect install directory
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${KONOHA_DIR:-$SCRIPT_DIR}"

if [ ! -f "$INSTALL_DIR/package.json" ]; then
  fail "Cannot find package.json in $INSTALL_DIR. Run this script from the konoha repo root."
fi

info "Installing Konoha from: $INSTALL_DIR"

# ---------------------------------------------------------------------------
# OS detection
# ---------------------------------------------------------------------------
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="${ID:-unknown}"
else
  OS_ID="unknown"
fi

USE_APT=false
USE_YUM=false
USE_PACMAN=false

case "$OS_ID" in
  ubuntu|debian|pop|linuxmint) USE_APT=true ;;
  centos|rhel|fedora|rocky|alma) USE_YUM=true ;;
  arch|manjaro) USE_PACMAN=true ;;
  *) warn "Unknown OS ($OS_ID). Will try to proceed but some steps may fail." ;;
esac

# ---------------------------------------------------------------------------
# 1. Install Redis
# ---------------------------------------------------------------------------
if command -v redis-server &>/dev/null; then
  ok "Redis already installed: $(redis-server --version | head -1)"
else
  info "Installing Redis..."
  if $USE_APT; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq redis-server
  elif $USE_YUM; then
    sudo yum install -y redis
  elif $USE_PACMAN; then
    sudo pacman -Sy --noconfirm redis
  else
    fail "Cannot install Redis automatically on this OS. Install it manually and re-run."
  fi
  ok "Redis installed"
fi

# Start and enable Redis
if command -v systemctl &>/dev/null; then
  sudo systemctl enable --now redis-server 2>/dev/null || sudo systemctl enable --now redis 2>/dev/null || true
  ok "Redis service enabled"
else
  warn "systemd not found. Start Redis manually: redis-server --daemonize yes"
  redis-server --daemonize yes 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# 2. Install Bun
# ---------------------------------------------------------------------------
if command -v bun &>/dev/null; then
  ok "Bun already installed: $(bun --version)"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  ok "Bun installed: $(bun --version)"
fi

# Ensure bun is in PATH for this session
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# ---------------------------------------------------------------------------
# 3. Install Node.js (for admin panel build)
# ---------------------------------------------------------------------------
if command -v node &>/dev/null; then
  ok "Node.js already installed: $(node --version)"
else
  info "Installing Node.js..."
  if $USE_APT; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
  elif $USE_YUM; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs
  elif $USE_PACMAN; then
    sudo pacman -Sy --noconfirm nodejs npm
  else
    fail "Cannot install Node.js automatically. Install Node.js 18+ manually and re-run."
  fi
  ok "Node.js installed: $(node --version)"
fi

# ---------------------------------------------------------------------------
# 4. Install project dependencies
# ---------------------------------------------------------------------------
info "Installing Konoha bus dependencies..."
cd "$INSTALL_DIR"
bun install
ok "Bus dependencies installed"

info "Installing admin panel dependencies..."
cd "$INSTALL_DIR/admin"
npm install
ok "Admin panel dependencies installed"

# ---------------------------------------------------------------------------
# 5. Build admin panel
# ---------------------------------------------------------------------------
info "Building admin panel..."
cd "$INSTALL_DIR/admin"
npm run build
ok "Admin panel built -> admin/dist/"

# ---------------------------------------------------------------------------
# 6. Generate token if not set
# ---------------------------------------------------------------------------
ENV_FILE="$HOME/.agent-env"
if [ ! -f "$ENV_FILE" ]; then
  GENERATED_TOKEN="$(openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48)"
  cat > "$ENV_FILE" <<EOF
KONOHA_TOKEN=$GENERATED_TOKEN
KONOHA_URL=http://127.0.0.1:3200
EOF
  chmod 600 "$ENV_FILE"
  ok "Generated $ENV_FILE with new KONOHA_TOKEN"
  echo ""
  echo -e "  ${YELLOW}Your admin token: $GENERATED_TOKEN${NC}"
  echo -e "  ${YELLOW}Save this token — you'll need it to log into the admin panel.${NC}"
  echo ""
else
  ok "Using existing $ENV_FILE"
fi

# ---------------------------------------------------------------------------
# 7. Install systemd service
# ---------------------------------------------------------------------------
if command -v systemctl &>/dev/null; then
  info "Installing systemd service..."

  KONOHA_SERVICE="/etc/systemd/system/konoha.service"
  sudo tee "$KONOHA_SERVICE" > /dev/null <<EOF
[Unit]
Description=Konoha Bus — Multi-agent communication bus
After=redis-server.service redis.service network.target
Wants=redis-server.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$INSTALL_DIR
ExecStart=$BUN_INSTALL/bin/bun run src/server.ts
Environment=KONOHA_PORT=3200
EnvironmentFile=$ENV_FILE
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now konoha.service
  ok "Konoha service installed and started"
else
  warn "systemd not found. Start manually:"
  echo "  source $ENV_FILE && KONOHA_PORT=3200 bun run src/server.ts"
fi

# ---------------------------------------------------------------------------
# 8. Create shared directories
# ---------------------------------------------------------------------------
sudo mkdir -p /opt/shared/attachments
sudo chown -R "$(whoami):$(id -gn)" /opt/shared
ok "Shared directories created"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Konoha installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Bus API:     http://localhost:3200"
echo "  Admin Panel: http://localhost:3200/panel"
echo "  Health:      http://localhost:3200/health"
echo ""
echo "  Service:     sudo systemctl status konoha"
echo "  Logs:        sudo journalctl -u konoha -f"
echo ""
echo "  To register an agent:"
echo "    curl -X POST -H 'Authorization: Bearer \$KONOHA_TOKEN' \\"
echo "      -d '{\"id\":\"my-agent\",\"name\":\"My Agent\"}' \\"
echo "      http://127.0.0.1:3200/agents/register"
echo ""
