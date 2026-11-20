#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="${UPSTREAM_REPO:-https://github.com/cursor/plugins.git}"
UPSTREAM_REF="${UPSTREAM_REF:-main}"
UPSTREAM_SUBDIR="${UPSTREAM_SUBDIR:-pstack}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-pstack-upstream}"
REMOTE="${REMOTE:-origin}"

DO_PUSH=false
DO_MERGE=false
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: scripts/sync-upstream.sh [options]

Sync upstream Cursor pstack (cursor/plugins pstack/) onto the pstack-upstream branch.

Options:
  --push        Push pstack-upstream to origin after committing changes
  --merge       Merge pstack-upstream into the current branch after syncing
  --dry-run     Show what would change without committing, pushing, or merging
  --ref <ref>   Upstream git ref (branch, tag, or commit SHA; default: main)
  -h, --help    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      DO_PUSH=true
      shift
      ;;
    --merge)
      DO_MERGE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --ref)
      if [[ $# -lt 2 ]]; then
        echo "Error: --ref requires an argument" >&2
        exit 1
      fi
      UPSTREAM_REF="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

write_github_output() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$1" "$2" >> "$GITHUB_OUTPUT"
  fi
}

read_plugin_version() {
  local file="$1"
  if [[ -f "$file" ]]; then
    sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -n 1
  else
    echo "unknown"
  fi
}

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git symbolic-ref --short -q HEAD || true)"
if [[ "$CURRENT_BRANCH" == "$UPSTREAM_BRANCH" ]]; then
  echo "Error: switch off '$UPSTREAM_BRANCH' before running sync-upstream.sh." >&2
  exit 1
fi

if [[ "$DO_MERGE" == true && "$DRY_RUN" == false ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: working tree is not clean; commit or stash changes before using --merge." >&2
    exit 1
  fi
fi

# Fetch remote upstream branch if it exists
git fetch "$REMOTE" "$UPSTREAM_BRANCH" >/dev/null 2>&1 || true

HAS_LOCAL=false
HAS_REMOTE=false
if git show-ref --verify --quiet "refs/heads/$UPSTREAM_BRANCH"; then
  HAS_LOCAL=true
fi
if git show-ref --verify --quiet "refs/remotes/$REMOTE/$UPSTREAM_BRANCH"; then
  HAS_REMOTE=true
fi

if [[ "$HAS_LOCAL" == false && "$HAS_REMOTE" == true ]]; then
  git branch "$UPSTREAM_BRANCH" "refs/remotes/$REMOTE/$UPSTREAM_BRANCH"
  HAS_LOCAL=true
elif [[ "$HAS_LOCAL" == true && "$HAS_REMOTE" == true ]]; then
  LOCAL_SHA="$(git rev-parse "refs/heads/$UPSTREAM_BRANCH")"
  REMOTE_SHA="$(git rev-parse "refs/remotes/$REMOTE/$UPSTREAM_BRANCH")"
  if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
    if git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
      git update-ref "refs/heads/$UPSTREAM_BRANCH" "$REMOTE_SHA" "$LOCAL_SHA"
    elif ! git merge-base --is-ancestor "$REMOTE_SHA" "$LOCAL_SHA"; then
      echo "Error: local '$UPSTREAM_BRANCH' ($LOCAL_SHA) and '$REMOTE/$UPSTREAM_BRANCH' ($REMOTE_SHA) have diverged." >&2
      exit 1
    fi
  fi
elif [[ "$HAS_LOCAL" == false && "$HAS_REMOTE" == false ]]; then
  echo "Error: branch '$UPSTREAM_BRANCH' does not exist locally or on '$REMOTE'." >&2
  echo "Seed it from the pure upstream baseline commit first:" >&2
  echo "  git branch $UPSTREAM_BRANCH <baseline-sha> && git push $REMOTE $UPSTREAM_BRANCH" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
UPSTREAM_CLONE="$TMP_DIR/upstream"
WORKTREE_DIR="$TMP_DIR/worktree"

cleanup() {
  if [[ -d "$WORKTREE_DIR" ]]; then
    git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Fetching $UPSTREAM_REPO ($UPSTREAM_REF, subdir: $UPSTREAM_SUBDIR)..."
git init -q "$UPSTREAM_CLONE"
git -C "$UPSTREAM_CLONE" remote add origin "$UPSTREAM_REPO"
git -C "$UPSTREAM_CLONE" sparse-checkout init --cone
git -C "$UPSTREAM_CLONE" sparse-checkout set "$UPSTREAM_SUBDIR"
git -C "$UPSTREAM_CLONE" fetch --quiet --depth 1 --filter=blob:none origin "$UPSTREAM_REF"
git -C "$UPSTREAM_CLONE" checkout --quiet FETCH_HEAD

UPSTREAM_SHA="$(git -C "$UPSTREAM_CLONE" rev-parse HEAD)"
UPSTREAM_SHORT_SHA="$(git -C "$UPSTREAM_CLONE" rev-parse --short HEAD)"
UPSTREAM_SRC="$UPSTREAM_CLONE/$UPSTREAM_SUBDIR"

if [[ ! -d "$UPSTREAM_SRC" ]]; then
  echo "Error: subdirectory '$UPSTREAM_SUBDIR' not found in $UPSTREAM_REPO at $UPSTREAM_SHA." >&2
  exit 1
fi

OLD_COMMIT="$(git rev-parse "refs/heads/$UPSTREAM_BRANCH")"
git worktree add --quiet --detach "$WORKTREE_DIR" "$OLD_COMMIT"

OLD_VERSION="$(read_plugin_version "$WORKTREE_DIR/plugin.json")"
NEW_VERSION="$(read_plugin_version "$UPSTREAM_SRC/plugin.json")"

# Replace worktree contents with exact upstream pstack/ tree, preserving .git
find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$UPSTREAM_SRC/." "$WORKTREE_DIR/"

git -C "$WORKTREE_DIR" add -A

write_github_output "old_version" "$OLD_VERSION"
write_github_output "new_version" "$NEW_VERSION"
write_github_output "upstream_sha" "$UPSTREAM_SHA"
write_github_output "upstream_short_sha" "$UPSTREAM_SHORT_SHA"

if git -C "$WORKTREE_DIR" diff --cached --quiet; then
  echo "Already up to date with cursor/plugins $UPSTREAM_SUBDIR $NEW_VERSION ($UPSTREAM_SHORT_SHA)."
  write_github_output "changed" "false"
  write_github_output "sync_commit_sha" "$OLD_COMMIT"
  exit 0
fi

echo "Upstream changes detected ($OLD_VERSION -> $NEW_VERSION, cursor/plugins@$UPSTREAM_SHORT_SHA):"
git -C "$WORKTREE_DIR" diff --cached --stat
write_github_output "changed" "true"

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run: no commit, push, or merge performed."
  write_github_output "sync_commit_sha" "$OLD_COMMIT"
  exit 0
fi

COMMIT_TITLE="Sync pstack upstream to $NEW_VERSION"
if [[ "$OLD_VERSION" == "$NEW_VERSION" ]]; then
  COMMIT_TITLE="Sync pstack upstream ($NEW_VERSION, $UPSTREAM_SHORT_SHA)"
fi

git -C "$WORKTREE_DIR" commit --quiet -m "$COMMIT_TITLE" -m "$(cat <<EOF
Source: https://github.com/cursor/plugins/tree/$UPSTREAM_SHA/$UPSTREAM_SUBDIR
Upstream commit: $UPSTREAM_SHA
Upstream version: $OLD_VERSION -> $NEW_VERSION
EOF
)"

NEW_COMMIT="$(git -C "$WORKTREE_DIR" rev-parse HEAD)"
git update-ref "refs/heads/$UPSTREAM_BRANCH" "$NEW_COMMIT" "$OLD_COMMIT"
write_github_output "sync_commit_sha" "$NEW_COMMIT"

echo "Updated '$UPSTREAM_BRANCH' to $NEW_COMMIT ($COMMIT_TITLE)."

if [[ "$DO_PUSH" == true ]]; then
  echo "Pushing '$UPSTREAM_BRANCH' to '$REMOTE'..."
  git push "$REMOTE" "$UPSTREAM_BRANCH"
fi

if [[ "$DO_MERGE" == true ]]; then
  echo "Merging '$UPSTREAM_BRANCH' into '${CURRENT_BRANCH:-HEAD}'..."
  git merge --no-ff "$UPSTREAM_BRANCH" -m "Merge $UPSTREAM_BRANCH (pstack $NEW_VERSION)"
else
  echo "Next: merge into your branch with 'git merge --no-ff $UPSTREAM_BRANCH' (or re-run with --merge)."
fi
