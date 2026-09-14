import { handleHook, readHookInput } from "./poteto-mode-state.mjs";

const input = await readHookInput();
if (input) {
  const output = await handleHook(input, { defaultActive: true });
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}
