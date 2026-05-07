#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# TaskQueue – interactive release script
#
# Usage: npm run release
#
# What it does:
#   1. Asks which part of the version to bump (major / minor / patch)
#   2. Optionally adds a pre-release suffix (alpha.N / beta.N / rc.N)
#   3. Updates version in package.json, src-tauri/tauri.conf.json, Cargo.toml
#   4. Creates a git commit and tag (e.g. v1.2.3-beta.1)
#   5. Pushes commit + tag → GitHub Actions takes over and builds the release
# ---------------------------------------------------------------------------
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── require clean working tree ────────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo -e "${RED}Error: working tree has uncommitted changes. Please commit or stash them first.${NC}"
  exit 1
fi

# ── read current version from package.json ───────────────────────────────
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${CYAN}${BOLD}Current version:${NC} ${CURRENT_VERSION}"

# strip any existing pre-release suffix to get base semver parts
BASE="${CURRENT_VERSION%%-*}"
IFS='.' read -ra PARTS <<< "$BASE"
MAJOR=${PARTS[0]:-0}
MINOR=${PARTS[1]:-0}
PATCH=${PARTS[2]:-0}

# detect existing pre-release tag and number (e.g. alpha.1 → tag=alpha, num=1)
CURRENT_PRE_TAG=""
CURRENT_PRE_NUM=""
if [[ "$CURRENT_VERSION" == *-* ]]; then
  PRE_SUFFIX="${CURRENT_VERSION#*-}"
  CURRENT_PRE_TAG="${PRE_SUFFIX%%.*}"
  CURRENT_PRE_NUM="${PRE_SUFFIX##*.}"
fi

# ── choose bump type ─────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}${BOLD}Which part to bump?${NC}"
echo "  1) patch  → ${MAJOR}.${MINOR}.$((PATCH + 1))"
echo "  2) minor  → ${MAJOR}.$((MINOR + 1)).0"
echo "  3) major  → $((MAJOR + 1)).0.0"
if [[ -n "$CURRENT_PRE_TAG" ]]; then
  NEXT_PRE_NUM=$((CURRENT_PRE_NUM + 1))
  echo "  4) re-release → ${BASE}-${CURRENT_PRE_TAG}.${NEXT_PRE_NUM}  (same base, bump pre-release number)"
  read -r -p "Choice [1-4]: " BUMP_CHOICE
else
  read -r -p "Choice [1-3]: " BUMP_CHOICE
fi

if [[ "$BUMP_CHOICE" == "4" && -n "$CURRENT_PRE_TAG" ]]; then
  # re-release: keep base, bump pre-release number only
  NEW_VERSION="${BASE}-${CURRENT_PRE_TAG}.${NEXT_PRE_NUM}"
  IS_PRERELEASE=true
else
  case $BUMP_CHOICE in
    1) NM=$MAJOR; NMI=$MINOR; NP=$((PATCH + 1)) ;;
    2) NM=$MAJOR; NMI=$((MINOR + 1)); NP=0 ;;
    3) NM=$((MAJOR + 1)); NMI=0; NP=0 ;;
    *) echo -e "${RED}Invalid choice.${NC}"; exit 1 ;;
  esac

  NEW_BASE="${NM}.${NMI}.${NP}"

  # ── optional pre-release suffix ──────────────────────────────────────────
  echo ""
  echo -e "${YELLOW}${BOLD}Release channel?${NC}"
  echo "  1) stable  (${NEW_BASE})"
  echo "  2) rc      (${NEW_BASE}-rc.N)"
  echo "  3) beta    (${NEW_BASE}-beta.N)"
  echo "  4) alpha   (${NEW_BASE}-alpha.N)"
  read -r -p "Choice [1-4]: " PRE_CHOICE
fi

if [[ -z "$NEW_VERSION" ]]; then
  case $PRE_CHOICE in
    1)
      NEW_VERSION="${NEW_BASE}"
      IS_PRERELEASE=false
      ;;
    2|3|4)
      case $PRE_CHOICE in
        2) PRE_TAG="rc" ;;
        3) PRE_TAG="beta" ;;
        4) PRE_TAG="alpha" ;;
      esac
      read -r -p "Pre-release number (e.g. 1): " PRE_NUM
      if ! [[ "$PRE_NUM" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Must be a positive integer.${NC}"; exit 1
      fi
      NEW_VERSION="${NEW_BASE}-${PRE_TAG}.${PRE_NUM}"
      IS_PRERELEASE=true
      ;;
    *)
      echo -e "${RED}Invalid choice.${NC}"; exit 1 ;;
  esac
fi

# ── confirm ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ${CURRENT_VERSION}  →  ${GREEN}${NEW_VERSION}${NC}"
echo -e "  Tag: ${CYAN}v${NEW_VERSION}${NC}   Pre-release: ${IS_PRERELEASE}"
echo ""
read -r -p "Proceed? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── bump versions ─────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Updating version files...${NC}"

# package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${NEW_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# src-tauri/tauri.conf.json
node -e "
  const fs = require('fs');
  const cfg = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  cfg.version = '${NEW_VERSION}';
  fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(cfg, null, 2) + '\n');
"

# src-tauri/Cargo.toml  (only the [package] version = "…" line)
node -e "
  const fs = require('fs');
  let src = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
  // Replace the FIRST occurrence of a bare  version = \"...\"  (package-level)
  src = src.replace(/^(version\s*=\s*)\"[^\"]*\"/m, '\$1\"${NEW_VERSION}\"');
  fs.writeFileSync('src-tauri/Cargo.toml', src);
"

echo -e "  ${GREEN}✓${NC} package.json"
echo -e "  ${GREEN}✓${NC} src-tauri/tauri.conf.json"
echo -e "  ${GREEN}✓${NC} src-tauri/Cargo.toml"

# ── git commit + tag ──────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Creating git commit and tag...${NC}"

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: release v${NEW_VERSION}"
git tag "v${NEW_VERSION}"

echo -e "${CYAN}Pushing to GitHub...${NC}"
git push
git push origin "v${NEW_VERSION}"

# ── done ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Released v${NEW_VERSION}!${NC}"
echo -e "GitHub Actions will now build, sign, and publish the release."
echo -e "Track progress → ${CYAN}https://github.com/zmudzinski/taskqueue/actions${NC}"
echo -e "Releases page  → ${CYAN}https://github.com/zmudzinski/taskqueue/releases${NC}"
