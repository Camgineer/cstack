# Principle skills stay out of the agent's skill list

Every `principle-*` skill sets `disable-model-invocation: true`. The mode skill indexes the principles and reads each file when a step needs it, so they stay out of the list and its budget. Some hosts give users no way to type such a skill's command, so no other bundled skill uses that key.
