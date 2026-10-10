# The project name appears only in the README title, the metadata file, and the entry points

Everywhere else, text says "the plugin" or `<plugin>`. The entry points are the `cstack-mode` skill and the `cstack-agent` persona. A rename changes the entry-point paths and the `CSTACK_MODE` variable, which breaks every user's shell profile and cloud settings, so the name stays in as few places as possible.
