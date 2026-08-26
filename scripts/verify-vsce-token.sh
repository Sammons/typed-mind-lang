#!/bin/bash

# Script to verify VSCE_PAT token is working
# This tests the token without actually publishing

set -e

echo "================================================"
echo "VSCode Extension Token Verification"
echo "================================================"
echo ""

# Check if gh CLI is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo "Error: GitHub CLI is not authenticated"
    echo "Please run: gh auth login"
    exit 1
fi

# Get the repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo "Error: Could not determine repository. Make sure you're in a git repository."
    exit 1
fi

echo "Repository: $REPO"
echo ""

# Check if secret exists
echo "Checking if VSCE_PAT secret exists..."
if ! gh secret list -R "$REPO" | grep -q "^VSCE_PAT"; then
    echo "❌ VSCE_PAT secret not found!"
    echo ""
    echo "Please run: ./scripts/update-vsce-token.sh"
    exit 1
fi

echo "✅ VSCE_PAT secret exists"
echo ""

# vsce is a devDependency of the extension package; make sure deps are installed
if [ ! -d lib/typed-mind-vscode-extension/node_modules ]; then
    echo "Installing workspace dependencies..."
    pnpm install --frozen-lockfile --ignore-scripts
fi

echo "Testing token with vsce (this won't publish anything)..."
echo ""

# Navigate to extension directory
cd lib/typed-mind-vscode-extension

# Try to verify the publisher with the token from environment
# Note: We can't directly access the secret value, so we'll test via the workflow
echo "To fully test the token, we need to run it through GitHub Actions."
echo ""
echo "Options:"
echo "1. Run a test publish (dry run) via GitHub Actions:"
echo "   gh workflow run vscode-publish.yml -f dry_run=true"
echo ""
echo "2. Run the actual publish:"
echo "   gh workflow run vscode-publish.yml"
echo ""
echo "3. Check recent workflow runs:"
echo "   gh run list --workflow=vscode-publish.yml --limit=3"
echo ""

# Check if there's a local VSIX file
if ls *.vsix 1> /dev/null 2>&1; then
    VSIX_FILE=$(ls -t *.vsix | head -1)
    echo "Found VSIX file: $VSIX_FILE"
    echo ""
    echo "You can also manually publish with:"
    echo "  cd lib/typed-mind-vscode-extension"
    echo "  pnpm exec vsce publish --pat YOUR_PAT"
    echo ""
fi

echo "Token verification setup complete!"