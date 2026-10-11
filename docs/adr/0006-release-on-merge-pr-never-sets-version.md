# A merge to main cuts the release, and no PR sets the version

After a merge passes CI on main, the release workflow bumps the version once for each change merged since the last tag and publishes it. The PR title's type sets the step: `feat` is a minor bump, and every other type is a patch bump. A major bump happens only when the user asks, with `!` in the title. CI rejects any PR that edits the version files.
