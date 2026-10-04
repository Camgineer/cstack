### Image generation

**You own the image file the request asked for, saved where it was asked, and checked by eye.**

1. Pin the request: subject, style, size, format, count, and the output path. Give a missing detail a reasonable default and state it in the reply.
2. Generate through the `image` role per **Model roles** in the runtime contract.
   - With no `image` line, use the **Generate an image** capability. When the host note maps none, reply that no runner here can make images, show the `image` line that would add one, and stop.
   - With a CLI runner, run it non-interactively from a scratch directory, with its stdin closed and write access to that directory. The brief names the image, the file to save, and the runner's built-in image tool. Pass the model, and a quality or size option only where its `--help` lists one. Put any other setting in the prompt.
3. Put the file in place. An image tool may save into its own store instead of the path you asked for, so take the path from the runner's final message or the host note and copy the file to the output path.
4. Check the file. Open the image and confirm it shows what was asked, then read its format and dimensions. When the generator returned another size or format, convert it with a local tool.
5. When the check fails, regenerate with a sharper prompt. After two failed retries, report what failed.

**Reply:** the image path, what it shows, its format and dimensions, the runner and model that made it, and each requested setting the runner could not apply.
