# Seats and model routing

A workflow delegates to a named seat whose prompt and access rule live in one agent file. Intent routes migrated calls through one specialist per seat, with the person's explicit provider, model, and effort configured by setup. This replaces role-based model routing in Intent because the specialist is the place the person chooses and edits those values.

Other hosts keep the `Models:` block. A seat line overrides its caller's existing role, and without that line the caller resolves to the same runner as before. A command runner is allowed only in the person's own instructions, while project lines may name only `native`. Seat files carry no model settings.

A cut with eleven seats preserved workflow labels or split by write risk, but added overlapping choices. Eight seats distinguish the lead from seven delegated jobs by their prompt, write rule, and model need. Copying each seat's full prompt into a personal specialist would require a merge on every update, so setup points at the delivered seat file instead. Install delivers files and setup configures specialists in a later slice.

The [runtime contract](../../skills/cstack-mode/references/runtime.md#model-roles) states the rule for installed users. A change to this routing amends this ADR in the same change.
