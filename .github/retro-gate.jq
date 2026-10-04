# Input: {"body": string|null, "comments": [string]}. Output: a commit status for the Retro check.
def first_line: split("\n")[0][:140];
(.body // "" | ltrimstr(" ") | ltrimstr("\n")) as $body
| [.comments[] | sub("^\\s+"; "") | select(test("^Retro: (no lessons|lessons in \\S+)"))] as $records
| if ($body | test("^Lessons from \\S+")) then {state: "success", description: "Lessons PR, which gets no retro"}
  elif ($records | length) > 0 then {state: "success", description: ($records[0] | first_line)}
  else {state: "pending", description: "Waiting for the builder's retro comment (reflect, PR retro scope)"}
  end
