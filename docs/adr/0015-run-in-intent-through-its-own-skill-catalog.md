# Run the plugin in Intent through Intent's own skill catalog and specialists

Intent starts Claude Code with skills off and Codex in an isolated home, so the Claude Code and Codex adapters do not carry over. The plugin reaches Intent agents through Intent's skill catalog and specialists, which `hooks/intent-install.sh` fills, and it does not rely on provider plugins or hooks, which Intent marks as unverified.
