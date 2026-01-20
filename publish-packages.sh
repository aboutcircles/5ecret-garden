#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  ./publish-packages.sh [--dry-run] [--publish] [--tag <tag>] [--otp <otp>] [--registry <url>]

Defaults:
  --dry-run
  --tag latest

Notes:
  - Requires package-lock.json at repo root (uses npm ci)
  - Scoped packages will be published with public access
EOF
}

DRY_RUN=1
TAG="latest"
OTP=""
REGISTRY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --publish)
      DRY_RUN=0
      shift
      ;;
    --tag)
      [[ $# -ge 2 ]] || die "--tag requires a value"
      TAG="$2"
      shift 2
      ;;
    --otp)
      [[ $# -ge 2 ]] || die "--otp requires a value"
      OTP="$2"
      shift 2
      ;;
    --registry)
      [[ $# -ge 2 ]] || die "--registry requires a value"
      REGISTRY="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

cd "$ROOT_DIR"

echo "Verifying npm authentication..."
npm whoami >/dev/null

if [[ ! -f package-lock.json ]]; then
  die "package-lock.json not found at repo root. Run 'npm install' once, commit package-lock.json, then re-run."
fi

echo "Installing workspace dependencies (npm ci)..."
npm ci

PACKAGES_ORDER=(
  "circles-market-core"
  "circles-market-session"
  "circles-market-signers"
  "circles-profile-core"
  "circles-market-auth"
  "circles-market-cart"
  "circles-market-catalog"
  "circles-market-offers"
  "circles-market-orders"
  "circles-market-sales"
  "circles-market-sdk"
)

VALIDATOR="$ROOT_DIR/scripts/validate-publish.mjs"
[[ -f "$VALIDATOR" ]] || die "Missing validator script at scripts/validate-publish.mjs"

for pkg_dir in "${PACKAGES_ORDER[@]}"; do
  dir="$ROOT_DIR/packages/$pkg_dir"
  pkg_json="$dir/package.json"

  if [[ ! -d "$dir" ]]; then
    echo "Skipping $dir (directory not found)"
    continue
  fi
  if [[ ! -f "$pkg_json" ]]; then
    echo "Skipping $dir (package.json not found)"
    continue
  fi

  package_name="$(node -p "require('$pkg_json').name")"
  is_private="$(node -p "Boolean(require('$pkg_json').private)")"
  package_version="$(node -p "require('$pkg_json').version || ''")"

  echo "---------------------------------------------------"
  echo "Processing: $package_name ($pkg_dir)"

  if [[ "$is_private" == "true" ]]; then
    echo "Skipping $package_name (marked as private)"
    continue
  fi

  if [[ -z "$package_version" ]]; then
    die "$package_name has no version in $pkg_json"
  fi

  echo "Validating (pre-build)..."
  node "$VALIDATOR" pre "$dir"

  pushd "$dir" >/dev/null

  has_build="$(node -p "Boolean(require('./package.json').scripts && require('./package.json').scripts.build)")"
  if [[ "$has_build" == "true" ]]; then
    echo "Building..."
    npm run build
  else
    echo "No build script found; skipping build."
  fi

  echo "Validating (post-build)..."
  node "$VALIDATOR" post "$dir"

  echo "Checking registry for existing version..."
  if npm view "${package_name}@${package_version}" version >/dev/null 2>&1; then
    die "Refusing to publish ${package_name}@${package_version} because it already exists on the registry."
  fi

  publish_args=()
  publish_args+=(--tag "$TAG")

  if [[ -n "$OTP" ]]; then
    publish_args+=(--otp "$OTP")
  fi
  if [[ -n "$REGISTRY" ]]; then
    publish_args+=(--registry "$REGISTRY")
  fi

  # Scoped packages need public access unless you intend private publishing.
  if [[ "$package_name" == @*/* ]]; then
    publish_args+=(--access public)
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "Publishing (dry-run)..."
    npm publish --dry-run "${publish_args[@]}"
  else
    echo "Publishing..."
    npm publish "${publish_args[@]}"
  fi

  popd >/dev/null
done

echo "---------------------------------------------------"
echo "Done."
