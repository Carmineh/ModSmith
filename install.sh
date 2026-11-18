#!/usr/bin/env sh
# Links the Modsmith skill from this clone into Claude Code and/or Codex.
# Usage: ./install.sh [--claude] [--codex] [--all-agents] [--uninstall]
# Default: --claude. Updating later is just `git pull` in this clone.
set -eu

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    echo "On Windows use install.ps1 instead (Git Bash 'ln -s' copies the folder instead of linking it)." >&2
    exit 1 ;;
esac

REPO_DIR=$(cd "$(dirname "$0")" && pwd)
SKILL_DIR="$REPO_DIR/skills/modsmith"
NAME=modsmith

targets=""
uninstall=0
for arg in "$@"; do
  case "$arg" in
    --claude) targets="$targets $HOME/.claude/skills" ;;
    --codex) targets="$targets $HOME/.codex/skills" ;;
    --all-agents) targets="$targets $HOME/.claude/skills $HOME/.codex/skills" ;;
    --uninstall) uninstall=1 ;;
    -h|--help) sed -n '2,4p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[ -n "$targets" ] || targets="$HOME/.claude/skills"

[ -f "$SKILL_DIR/SKILL.md" ] || { echo "SKILL.md not found in $SKILL_DIR" >&2; exit 1; }

for dir in $targets; do
  link="$dir/$NAME"
  if [ "$uninstall" -eq 1 ]; then
    if [ -L "$link" ]; then rm "$link" && echo "Removed $link"; else echo "Nothing to remove at $link"; fi
    continue
  fi
  mkdir -p "$dir"
  if [ -L "$link" ]; then
    rm "$link"
  elif [ -e "$link" ]; then
    echo "Skipped $link: it exists and is not a link (remove it first)." >&2
    continue
  fi
  ln -s "$SKILL_DIR" "$link"
  echo "Linked $link -> $SKILL_DIR"
done
echo "Restart your agent to load the skill."
