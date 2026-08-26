#!/bin/bash
set -euo pipefail

# Create release artifacts for GitHub release
# Usage: ./create-release-artifacts.sh <version>

VERSION=${1:-$(jq -r '.version' package.json)}
ARTIFACTS_DIR="release-artifacts"

echo "Creating release artifacts for version $VERSION..."

# Clean and create artifacts directory
rm -rf "$ARTIFACTS_DIR"
mkdir -p "$ARTIFACTS_DIR"

# 1. Create tarball of all NPM packages
echo "Creating NPM packages tarball..."
for package_dir in lib/typed-mind lib/typed-mind-cli lib/typed-mind-lsp lib/typed-mind-renderer; do
  if [ -d "$package_dir" ]; then
    cd "$package_dir"
    pnpm pack --pack-destination "../../$ARTIFACTS_DIR"
    cd ../..
  fi
done

# 2. Copy VS Code extension VSIX
echo "Copying VS Code extension..."
if [ -f lib/typed-mind-vscode-extension/*.vsix ]; then
  cp lib/typed-mind-vscode-extension/*.vsix "$ARTIFACTS_DIR/"
else
  echo "Warning: VS Code extension VSIX not found"
fi

# 3. Create standalone CLI bundle
echo "Creating standalone CLI bundle..."
if [ -d lib/typed-mind-cli/dist ]; then
  tar -czf "$ARTIFACTS_DIR/typed-mind-cli-$VERSION-standalone.tar.gz" \
    -C lib/typed-mind-cli dist package.json README.md
fi

# 4. Create source code archive (without node_modules)
echo "Creating source code archive..."
tar -czf "$ARTIFACTS_DIR/typed-mind-$VERSION-source.tar.gz" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="*.vsix" \
  --exclude="dist" \
  --exclude="lib/typed-mind-static-website/node_modules" \
  --exclude="release-artifacts" \
  lib/ package.json pnpm-lock.yaml pnpm-workspace.yaml README.md

# 5. Create documentation bundle
echo "Creating documentation bundle..."
if [ -d lib/typed-mind-static-website/src ]; then
  tar -czf "$ARTIFACTS_DIR/typed-mind-docs-$VERSION.tar.gz" \
    -C lib/typed-mind-static-website src
fi

# 6. Generate checksums
echo "Generating checksums..."
cd "$ARTIFACTS_DIR"
sha256sum * > SHA256SUMS.txt
cd ..

# 7. Generate release manifest
echo "Generating release manifest..."
.github/scripts/generate-release-manifest.sh "$VERSION"

# List created artifacts
echo ""
echo "Created release artifacts:"
ls -lh "$ARTIFACTS_DIR/"
echo ""
echo "Total size: $(du -sh "$ARTIFACTS_DIR" | cut -f1)"