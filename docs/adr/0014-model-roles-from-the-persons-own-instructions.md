# Model roles come from the person's own instructions

Delegated steps pick a model per role (`build`, `review`, `advisor`, `image`) from a `Models:` block in the person's own instructions file. A project's block may name only native models, because a command runner runs on the person's machine and must not be set by a shared repo. With no block, every workflow uses the host model as before, and a failed runner falls back to the host model and is named in the PR.
