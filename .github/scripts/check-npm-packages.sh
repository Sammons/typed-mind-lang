#!/bin/bash
set -euo pipefail

# Check if npm packages need publishing
# Returns list of packages that need publishing

echo "Checking npm packages..." >&2

PACKAGES=""

# Define packages in dependency order
declare -a PACKAGE_ORDER=(
  "lib/typed-mind"
  "lib/typed-mind-renderer"
  "lib/typed-mind-cli"
  "lib/typed-mind-lsp"
)

for package_dir in "${PACKAGE_ORDER[@]}"; do
  if [ ! -d "$package_dir" ]; then
    echo "Warning: Package directory $package_dir does not exist" >&2
    continue
  fi
  
  package_json="$package_dir/package.json"
  if [ ! -f "$package_json" ]; then
    echo "Warning: package.json not found in $package_dir" >&2
    continue
  fi
  
  package_name=$(jq -r '.name' "$package_json")
  local_version=$(jq -r '.version' "$package_json")
  
  # Check if package exists on npm
  if npm_version=$(pnpm view "$package_name" version 2>/dev/null); then
    if [ "$npm_version" != "$local_version" ]; then
      echo "Package $package_name needs publishing (local: $local_version, npm: $npm_version)" >&2
      PACKAGES="$PACKAGES $package_dir"
    else
      echo "Package $package_name is up to date ($local_version)" >&2
    fi
  else
    echo "Package $package_name not found on npm, will publish" >&2
    PACKAGES="$PACKAGES $package_dir"
  fi
done

# Trim whitespace and output
echo "$PACKAGES" | xargs