# Tests run at public seams only

A test enters a module through what its outside callers import, and it asserts a literal expected value. It never tests private code or re-tests a library. A module's internal files may call each other through export, and they count as internal. The rule keeps tests on behavior, so a refactor that keeps behavior does not break them.
