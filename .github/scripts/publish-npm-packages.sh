#!/bin/bash
set -euo pipefail

# Publish npm packages in dependency order
# Usage: ./publish-npm-packages.sh [--dry-run]

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "DRY RUN MODE - No packages will be published"
fi

# Define packages in dependency order
declare -a PACKAGE_ORDER=(
  "lib/typed-mind"
  "lib/typed-mind-renderer"
  "lib/typed-mind-cli"
  "lib/typed-mind-lsp"
)

publish_package() {
  local package_dir=$1
  local package_name=$(jq -r '.name' "$package_dir/package.json")
  local version=$(jq -r '.version' "$package_dir/package.json")

  echo "Checking $package_name@$version..."

  # Check if this version already exists
  if pnpm view "$package_name@$version" version >/dev/null 2>&1; then
    echo "✓ $package_name@$version already published, skipping..."
    return 0
  fi

  echo "Publishing $package_name@$version from $package_dir..."

  cd "$package_dir"

  if [ "$DRY_RUN" = true ]; then
    echo "Would publish: pnpm publish --access public --no-git-checks"
    pnpm publish --dry-run --no-git-checks
  else
    pnpm publish --access public --no-git-checks
    
    # Wait for package to be available
    echo "Waiting for $package_name@$version to be available on npm..."
    local retries=0
    local max_retries=30
    
    while [ $retries -lt $max_retries ]; do
      if pnpm view "$package_name@$version" version >/dev/null 2>&1; then
        echo "✓ $package_name@$version is now available on npm"
        break
      fi
      retries=$((retries + 1))
      echo "Waiting... (attempt $retries/$max_retries)"
      sleep 2
    done
    
    if [ $retries -eq $max_retries ]; then
      echo "Warning: Timeout waiting for $package_name@$version to be available"
    fi
  fi
  
  cd - > /dev/null
}

# Main execution
echo "Starting npm package publishing..."

for package_dir in "${PACKAGE_ORDER[@]}"; do
  if [ -d "$package_dir" ]; then
    publish_package "$package_dir"
  else
    echo "Skipping $package_dir - directory does not exist"
  fi
done

echo "Publishing complete!"