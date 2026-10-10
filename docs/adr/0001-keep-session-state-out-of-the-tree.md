# Keep session state out of the tree

Status, open pull requests, and handoff notes live in pull request descriptions and in each coordinator's own memory, not in tracked files. Every merge to main cuts a release, and plugin installs take their files from main, so a status file would reach every user each time it changed. A pinned issue would keep status off users' machines too, but it sits outside version control and does not survive a change of coordinator.
