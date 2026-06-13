#!/usr/bin/env bash
# Usage: ./deploy.sh
# Run from the project root (parent of client/ and server/).
# Secrets are read from .deploy.env in the same directory.

# Prevent running via `source` — it would kill the terminal on any error
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  echo "Error: run this script directly with ./deploy.sh, not with source."
  return 1
fi

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'
YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

STEP=0; TOTAL=8
step() { STEP=$((STEP+1)); echo -e "\n${BOLD}${BLUE}[${STEP}/${TOTAL}] $*${NC}"; }
ok()   { echo -e "  ${GREEN}✓ $*${NC}"; }
warn() { echo -e "  ${YELLOW}⚠ $*${NC}"; }
die()  { echo -e "\n${RED}✗ $*${NC}\n"; exit 1; }

# ── Config (non-sensitive) ────────────────────────────────────────────────────
RESOURCE_GROUP="verity-rg"
LOCATION="westeurope"

API_PLAN_NAME="verity-plan"
API_PLAN_SKU="B2"                   # B2 = 2 cores / 3.5 GB — sufficient headroom for pymupdf4llm + chromadb

CLIENT_PLAN_NAME="verity-client-plan"
CLIENT_PLAN_SKU="F1"                # F1 = free tier — sufficient for the Next.js frontend

API_APP_NAME="verity-api"           # ← must be globally unique on azurewebsites.net
CLIENT_APP_NAME="verity-client"     # ← must be globally unique on azurewebsites.net

# Loaded from .deploy.env: ALLOWED_EMAIL, GOOGLE_CLIENT_ID
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.deploy.env"
SERVER_DIR="${SCRIPT_DIR}/server"
CLIENT_DIR="${SCRIPT_DIR}/client"

API_URL="https://${API_APP_NAME}.azurewebsites.net"
CLIENT_URL="https://${CLIENT_APP_NAME}.azurewebsites.net"

echo -e "\n${BOLD}━━━ Verity — Azure Deployment ━━━${NC}"
echo -e "  API    → ${GREEN}${API_URL}${NC}"
echo -e "  Client → ${GREEN}${CLIENT_URL}${NC}"

# ── Load secrets from .deploy.env ─────────────────────────────────────────────
step "Loading secrets"

[[ -f "${ENV_FILE}" ]] || die ".deploy.env not found. Copy .deploy.env.example and fill in the values."

set -o allexport
# shellcheck source=.deploy.env
source "${ENV_FILE}"
set +o allexport

[[ -z "${OPENAI_API_KEY:-}"        ]] && die "OPENAI_API_KEY is not set in .deploy.env"
[[ -z "${GOOGLE_CLIENT_ID:-}"      ]] && die "GOOGLE_CLIENT_ID is not set in .deploy.env"
[[ -z "${GOOGLE_CLIENT_SECRET:-}"  ]] && die "GOOGLE_CLIENT_SECRET is not set in .deploy.env"
[[ -z "${NEXTAUTH_SECRET:-}"       ]] && die "NEXTAUTH_SECRET is not set in .deploy.env"
[[ -z "${ALLOWED_EMAIL:-}"         ]] && die "ALLOWED_EMAIL is not set in .deploy.env"

ok "Secrets loaded"

# ── Prerequisites ─────────────────────────────────────────────────────────────
step "Checking prerequisites"

command -v az  &>/dev/null || die "Azure CLI not found — https://docs.microsoft.com/cli/azure/install-azure-cli"
command -v zip &>/dev/null || die "zip not found — install with: brew install zip"
command -v npm &>/dev/null || die "npm not found — install Node.js 20 LTS"

az account show --output none 2>/dev/null || die "Not logged in to Azure. Run: az login"

SUBSCRIPTION=$(az account show --query name --output tsv)
ok "Azure account: ${SUBSCRIPTION}"

# ── Shared infrastructure ─────────────────────────────────────────────────────
step "Creating resource group and App Service Plan"

EXISTING_LOCATION=$(az group show --name "${RESOURCE_GROUP}" --query location --output tsv 2>/dev/null || echo "")
if [[ -n "${EXISTING_LOCATION}" && "${EXISTING_LOCATION}" != "${LOCATION}" ]]; then
  warn "Resource group '${RESOURCE_GROUP}' exists in '${EXISTING_LOCATION}', not '${LOCATION}'. Deleting and recreating..."
  az group delete --name "${RESOURCE_GROUP}" --yes --output none
  az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --output none
  ok "Recreated resource group in ${LOCATION}"
elif [[ -n "${EXISTING_LOCATION}" ]]; then
  ok "Resource group already exists: ${RESOURCE_GROUP} (${EXISTING_LOCATION})"
else
  az group create --name "${RESOURCE_GROUP}" --location "${LOCATION}" --output none
  ok "Created resource group: ${RESOURCE_GROUP} (${LOCATION})"
fi

if az appservice plan show --name "${API_PLAN_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  ok "API plan already exists: ${API_PLAN_NAME} (${API_PLAN_SKU})"
else
  az appservice plan create \
    --name "${API_PLAN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --sku "${API_PLAN_SKU}" \
    --is-linux \
    --output none
  ok "Created API plan: ${API_PLAN_NAME} (${API_PLAN_SKU})"
fi

if az appservice plan show --name "${CLIENT_PLAN_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  ok "Client plan already exists: ${CLIENT_PLAN_NAME} (${CLIENT_PLAN_SKU})"
else
  az appservice plan create \
    --name "${CLIENT_PLAN_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --location "${LOCATION}" \
    --sku "${CLIENT_PLAN_SKU}" \
    --is-linux \
    --output none
  ok "Created client plan: ${CLIENT_PLAN_NAME} (${CLIENT_PLAN_SKU})"
fi

# ── Flask API ─────────────────────────────────────────────────────────────────
step "Provisioning Flask API"

if az webapp show --name "${API_APP_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  ok "Web app already exists: ${API_APP_NAME}"
else
  az webapp create \
    --name "${API_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --plan "${API_PLAN_NAME}" \
    --runtime "PYTHON:3.11" \
    --output none
  ok "Created web app: ${API_APP_NAME}"
  echo -n "  Waiting for Kudu to initialise"; for i in {1..12}; do sleep 5; echo -n "."; done; echo
fi

az webapp config set \
  --name "${API_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --startup-file "gunicorn --chdir /home/site/wwwroot --workers 1 --timeout 300 --bind 0.0.0.0:8000 app:app" \
  --output none

az webapp config appsettings set \
  --name "${API_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --output none \
  --settings \
    GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
    ALLOWED_EMAIL="${ALLOWED_EMAIL}" \
    ALLOWED_ORIGIN="${CLIENT_URL}" \
    OPENAI_API_KEY="${OPENAI_API_KEY}" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    WEBSITES_CONTAINER_START_TIME_LIMIT="600" \
    CACHE_DIR="/home/site/wwwroot/.cache_v2" \
    CHROMA_DB_PATH="/home/site/wwwroot/chroma_db_v2"

ok "Flask API configured"

# ── Flask API deploy ──────────────────────────────────────────────────────────
step "Deploying Flask API (Oryx build — installs Python packages, takes ~2 min)"

cd "${SERVER_DIR}"
az webapp up \
  --name "${API_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --runtime "PYTHON:3.11" \
  --sku "${API_PLAN_SKU}" \
  --output none

ok "Flask API deployed → ${API_URL}"

# ── Next.js client ────────────────────────────────────────────────────────────
step "Provisioning Next.js client"

if az webapp show --name "${CLIENT_APP_NAME}" --resource-group "${RESOURCE_GROUP}" --output none 2>/dev/null; then
  ok "Web app already exists: ${CLIENT_APP_NAME}"
else
  az webapp create \
    --name "${CLIENT_APP_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --plan "${CLIENT_PLAN_NAME}" \
    --runtime "NODE:22-lts" \
    --output none
  ok "Created web app: ${CLIENT_APP_NAME}"
  echo -n "  Waiting for Kudu to initialise"; for i in {1..12}; do sleep 5; echo -n "."; done; echo
fi

# Startup: run the standalone server directly — no npm install or build needed on Azure
az webapp config set \
  --name "${CLIENT_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --startup-file "node server.js" \
  --output none

# Runtime-only env vars (NEXT_PUBLIC_* are baked in at local build time, not needed here)
az webapp config appsettings set \
  --name "${CLIENT_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --output none \
  --settings \
    NEXTAUTH_URL="${CLIENT_URL}" \
    NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
    NEXTAUTH_ALLOWED_EMAIL="${ALLOWED_EMAIL}" \
    GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
    GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
    NODE_ENV="production" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="false"

ok "Next.js client configured"

# ── Next.js client build + deploy ─────────────────────────────────────────────
step "Building Next.js client and deploying standalone bundle (~40 MB)"

cd "${CLIENT_DIR}"

# Build with production API URL baked into NEXT_PUBLIC_* vars
NEXT_PUBLIC_API_URL="${API_URL}" npm run build

# Assemble standalone bundle: static assets and public/ are not copied by Next.js automatically
STANDALONE_DIR="${CLIENT_DIR}/.next/standalone"
cp -r "${CLIENT_DIR}/.next/static" "${STANDALONE_DIR}/.next/static"
[[ -d "${CLIENT_DIR}/public" ]] && cp -r "${CLIENT_DIR}/public" "${STANDALONE_DIR}/public"

# Zip from inside the standalone directory so files land at the root of wwwroot
CLIENT_ZIP="/tmp/verity-client-$$.zip"
rm -f "${CLIENT_ZIP}"
cd "${STANDALONE_DIR}"
zip -r "${CLIENT_ZIP}" . -x "*/.DS_Store" -x "__pycache__/*"
ok "Bundle size: $(du -sh "${CLIENT_ZIP}" | cut -f1)"

az webapp deploy \
  --name "${CLIENT_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --src-path "${CLIENT_ZIP}" \
  --type zip \
  --timeout 300 \
  --output none

rm -f "${CLIENT_ZIP}"
ok "Next.js client deployed → ${CLIENT_URL}"

# ─── Enable logging ───────────────────────────────────────────────────────────
step "Enabling application logging"

az webapp log config \
  --name "${API_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --application-logging filesystem \
  --level information \
  --output none

az webapp log config \
  --name "${CLIENT_APP_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --application-logging filesystem \
  --level information \
  --output none

ok "Logging enabled on both apps"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}━━━ Deployment complete ━━━${NC}\n"
echo -e "  API health: ${BLUE}${API_URL}/health${NC}"
echo -e "  Client:     ${BLUE}${CLIENT_URL}${NC}"

echo -e "\n${BOLD}${YELLOW}Manual step required — Google OAuth Console:${NC}"
echo "  Add to Authorized JavaScript origins:  ${CLIENT_URL}"
echo "  Add to Authorized redirect URIs:        ${CLIENT_URL}/api/auth/callback/google"

echo -e "\n${BOLD}Monitor logs:${NC}"
echo "  az webapp log tail --name ${API_APP_NAME} --resource-group ${RESOURCE_GROUP}"
echo "  az webapp log tail --name ${CLIENT_APP_NAME} --resource-group ${RESOURCE_GROUP}"
echo ""
