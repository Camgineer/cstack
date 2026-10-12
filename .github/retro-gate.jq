def first_line: split("\n")[0][:140];
# A host may put an attribution comment or byline above the body, so look past HTML comments, which hide the rest of the body when unclosed, to the first three lines of text.
def opening_lines: gsub("<!--[\\s\\S]*?(-->|\\z)"; "") | split("\n") | map(select(test("\\S"))) | .[:3];
[.comments[] | sub("^\\s+"; "") | select(test("^Retro: (no lessons|lessons in \\S+)"))] as $records
| if (.body // "" | opening_lines | any(test("^Lessons from \\S+"))) then {state: "success", description: "Lessons PR, which gets no retro"}
  elif ($records | length) > 0 then {state: "success", description: ($records[0] | first_line)}
  else {state: "success", description: "Retro recap pending; readiness and merging do not wait"}
  end
