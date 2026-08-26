#!/bin/bash

# Enhanced script for VSCE authentication setup
# Automates as much as possible of the PAT creation and setup process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "VSCode Extension Publishing - Automated Setup"
echo "================================================"
echo ""

# Function to open URL in browser
open_url() {
    if command -v xdg-open > /dev/null; then
        xdg-open "$1"
    elif command -v open > /dev/null; then
        open "$1"
    elif command -v start > /dev/null; then
        start "$1"
    else
        echo "Please open this URL manually: $1"
    fi
}

# Check prerequisites
echo "Checking prerequisites..."

# Check if gh CLI is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}Error: GitHub CLI is not authenticated${NC}"
    echo "Please run: gh auth login"
    exit 1
fi
echo -e "${GREEN}✓${NC} GitHub CLI authenticated"

# Get the repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo -e "${RED}Error: Could not determine repository${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Repository: $REPO"

# vsce is a devDependency of the extension package; make sure deps are installed
if [ ! -d lib/typed-mind-vscode-extension/node_modules ]; then
    echo -e "${YELLOW}Installing workspace dependencies...${NC}"
    pnpm install --frozen-lockfile --ignore-scripts
fi
echo -e "${GREEN}✓${NC} vsce available via pnpm exec"

echo ""
echo "================================================"
echo "Step 1: Generate Personal Access Token"
echo "================================================"
echo ""
echo "I'll open the Azure DevOps page for you to create a PAT."
echo ""
echo -e "${YELLOW}When creating the token:${NC}"
echo "1. Sign in with your Microsoft account"
echo "2. Click 'New Token'"
echo "3. Name: 'vsce-typed-mind' (or similar)"
echo "4. Organization: 'All accessible organizations'"
echo "5. Expiration: 90 days (recommended)"
echo "6. Scopes: Click 'Show all scopes' then select:"
echo "   • Marketplace → Acquire"
echo "   • Marketplace → Publish"
echo "   • Marketplace → Manage"
echo "7. Click 'Create' and COPY THE TOKEN"
echo ""
echo "Press Enter to open Azure DevOps in your browser..."
read

# Open Azure DevOps PAT page
echo "Opening Azure DevOps..."
open_url "https://dev.azure.com/_usersSettings/tokens"

echo ""
echo "================================================"
echo "Step 2: Enter Your Token"
echo "================================================"
echo ""
echo "Please paste your token here (input will be hidden):"
read -s VSCE_PAT
echo ""

# Validate token not empty
if [ -z "$VSCE_PAT" ]; then
    echo -e "${RED}Error: Token cannot be empty${NC}"
    exit 1
fi

# Get publisher name from package.json
PUBLISHER=$(cat lib/typed-mind-vscode-extension/package.json | grep '"publisher"' | cut -d'"' -f4)
echo "Publisher detected: $PUBLISHER"

echo ""
echo "================================================"
echo "Step 3: Verify Token"
echo "================================================"
echo ""

# Test the token with vsce
echo "Testing token with vsce..."
cd lib/typed-mind-vscode-extension

# Use vsce verify-pat to test the token
if echo "$VSCE_PAT" | pnpm exec vsce verify-pat "$PUBLISHER" 2>/dev/null; then
    echo -e "${GREEN}✓ Token is valid!${NC}"
else
    echo -e "${RED}✗ Token verification failed${NC}"
    echo ""
    echo "Possible issues:"
    echo "1. Token doesn't have the correct permissions"
    echo "2. Publisher name doesn't match your Azure DevOps account"
    echo "3. Token has expired"
    echo ""
    echo "Would you like to continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

cd ../..

echo ""
echo "================================================"
echo "Step 4: Save Token to GitHub Secrets"
echo "================================================"
echo ""

# Check if secret exists
if gh secret list -R "$REPO" | grep -q "^VSCE_PAT"; then
    echo "VSCE_PAT secret already exists."
    echo "Do you want to update it? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Keeping existing secret."
    else
        echo "$VSCE_PAT" | gh secret set VSCE_PAT -R "$REPO"
        echo -e "${GREEN}✓ Secret updated${NC}"
    fi
else
    echo "$VSCE_PAT" | gh secret set VSCE_PAT -R "$REPO"
    echo -e "${GREEN}✓ Secret created${NC}"
fi

echo ""
echo "================================================"
echo "Step 5: Save Token Locally (Optional)"
echo "================================================"
echo ""
echo "Would you like to save the token locally for manual publishing? (y/n)"
echo "(It will be stored in ~/.vsce with restricted permissions)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Create .vsce file with token
    echo "$PUBLISHER $VSCE_PAT" > ~/.vsce
    chmod 600 ~/.vsce
    echo -e "${GREEN}✓ Token saved to ~/.vsce${NC}"
    echo ""
    echo "You can now publish manually with:"
    echo "  cd lib/typed-mind-vscode-extension"
    echo "  vsce publish"
fi

echo ""
echo "================================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Publish via GitHub Actions (recommended):"
echo -e "   ${YELLOW}gh workflow run vscode-publish.yml${NC}"
echo ""
echo "2. Or publish manually:"
echo -e "   ${YELLOW}cd lib/typed-mind-vscode-extension && vsce publish${NC}"
echo ""
echo "3. Check workflow status:"
echo -e "   ${YELLOW}gh run list --workflow=vscode-publish.yml --limit=1${NC}"
echo ""
echo "4. View extension once published:"
echo "   https://marketplace.visualstudio.com/items?itemName=$PUBLISHER.typed-mind"
echo ""

# Offer to run the publish workflow now
echo "Would you like to trigger the publish workflow now? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Triggering workflow..."
    gh workflow run vscode-publish.yml
    echo ""
    echo -e "${GREEN}✓ Workflow triggered!${NC}"
    echo ""
    echo "Check status with:"
    echo "  gh run list --workflow=vscode-publish.yml --limit=1"
fi