---
name: autopilot
description: Use before any request when no task guide is named. Follow the task guide whose description fits.
---

# Autopilot

This is the default mode. Any request may enter. It selects one task guide. The surrounding environment chooses the model and owns the branch.

A task guide is a skill whose frontmatter sets `disable-model-invocation: true`. The description in that file is the only match text.

## Select

When the person already named a task guide, read that file and follow it through its Done section.

Otherwise read the `description` in the frontmatter of each sibling skill that sets `disable-model-invocation: true`. Follow the one description that fits the request. Read that guide and follow it through its Done section.

When no description fits, ask the person which task guide to follow and wait for the answer.

## Done

The chosen task guide has reached its Done section, or you are waiting on which guide to follow. Name the guide you selected. Leave model choice, hooks, and the branch to the surrounding environment.
