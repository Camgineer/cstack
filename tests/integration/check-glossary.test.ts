import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const script = resolve(import.meta.dir, "../../skills/domain-modeling/scripts/check-glossary.ts");

const glossary = `# Ordering

## Language

**Order**:
A customer's request for goods.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent after delivery.
_Avoid_: Bill, payment request
`;

function inRepository(files: Record<string, string>, run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "glossary check "));
  try {
    const git = (...args: string[]) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), text);
    }
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function check(directory: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: "utf8" });
}

test("flags an avoided alias in prose with its location and the term to use", () => {
  inRepository({ "GLOSSARY.md": glossary, "docs/flow.md": "# Flow\n\nEach purchase creates a payment request.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(
      'docs/flow.md:3:6: "purchase" is an avoided alias. Use "Order" (GLOSSARY.md:5).\n' +
        'docs/flow.md:3:25: "payment request" is an avoided alias. Use "Invoice" (GLOSSARY.md:9).\n',
    );
  });
});

test("ignores code, link targets, longer words, and the glossary itself", () => {
  const doc = "Call `createPurchase()` per [Order](./purchase.md). A billing run.\n\n```ts\nconst bill = 1;\n```\n";
  inRepository({ "GLOSSARY.md": glossary, "docs/flow.md": doc }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("No avoided glossary aliases in 1 file.\n");
  });
});

test("reads the older CONTEXT.md when no GLOSSARY.md exists", () => {
  inRepository({ "CONTEXT.md": glossary, "README.md": "Two transactions.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('README.md:1:5: "transactions" is an avoided alias. Use "Order" (CONTEXT.md:5).\n');
  });
});

test("reads every context a GLOSSARY-MAP.md links", () => {
  const map = "# Glossary Map\n\n- [Ordering](./src/ordering/GLOSSARY.md): orders\n";
  inRepository({ "GLOSSARY-MAP.md": map, "src/ordering/GLOSSARY.md": glossary, "notes.md": "Send the bill.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('notes.md:1:10: "bill" is an avoided alias. Use "Invoice" (src/ordering/GLOSSARY.md:9).\n');
  });
});

test("with --base, fails only on aliases that the branch adds", () => {
  inRepository({ "GLOSSARY.md": glossary, "notes.md": "An old purchase.\n" }, (directory) => {
    const git = (...args: string[]) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    git("checkout", "-q", "-b", "change");
    writeFileSync(join(directory, "notes.md"), "An old purchase.\nA new Order.\n");
    git("commit", "-qam", "clean change");
    expect(check(directory, "--base", "main").status).toBe(0);
    writeFileSync(join(directory, "notes.md"), "An old purchase.\nA new Order.\nA new purchase.\n");
    git("commit", "-qam", "adds an alias");
    const result = check(directory, "--base", "main");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('notes.md:3:7: "purchase" is an avoided alias. Use "Order" (GLOSSARY.md:5).\n');
  });
});

test("passes a repository without a glossary", () => {
  inRepository({ "README.md": "A purchase.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("No glossary with _Avoid_ aliases found. Nothing to check.\n");
  });
});

test("drops notes in parentheses and leaves another term's name alone", () => {
  const tracker = `**Issue**:
A unit of work.
_Avoid_: ticket (use only when quoting external systems, or for a **Decision ticket**, see below), card

**Decision ticket**:
An issue that holds a question.
`;
  inRepository({ "GLOSSARY.md": tracker, "notes.md": "Open a Decision ticket, not a ticket or a card.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(
      'notes.md:1:31: "ticket" is an avoided alias. Use "Issue" (GLOSSARY.md:1).\n' +
        'notes.md:1:43: "card" is an avoided alias. Use "Issue" (GLOSSARY.md:1).\n',
    );
  });
});

test("flags an alias that contains another term's name", () => {
  const billing = `${glossary}\n**Payment**:\nMoney received for an invoice.\n`;
  inRepository({ "GLOSSARY.md": billing, "notes.md": "Send a payment request.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('notes.md:1:8: "payment request" is an avoided alias. Use "Invoice" (GLOSSARY.md:9).\n');
  });
});

test("skips URLs, reference links, front matter, and HTML comments", () => {
  const doc = "---\ntags: [purchase]\n---\nSee https://shop.example.com/purchase now.\n\n[spec]: ./docs/purchase.md\n<!-- purchase -->\n<!--\nbill\n-->\nAn order.\n";
  inRepository({ "GLOSSARY.md": glossary, "notes.md": doc }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("No avoided glossary aliases in 1 file.\n");
  });
});

test("finds the glossary of a project in a subdirectory and reports paths from there", () => {
  inRepository({ "app/GLOSSARY.md": glossary, "app/docs/notes.md": "A purchase.\n", "other.md": "A purchase.\n" }, (directory) => {
    const result = check(join(directory, "app"));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('docs/notes.md:1:3: "purchase" is an avoided alias. Use "Order" (GLOSSARY.md:5).\n');
  });
});

test("follows a map link that has an anchor", () => {
  const map = "# Glossary Map\n\n- [Ordering](./ordering/GLOSSARY.md#language): orders\n";
  inRepository({ "GLOSSARY-MAP.md": map, "ordering/GLOSSARY.md": glossary, "notes.md": "A purchase.\n" }, (directory) => {
    const result = check(directory);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('notes.md:1:3: "purchase" is an avoided alias. Use "Order" (ordering/GLOSSARY.md:5).\n');
  });
});

test("with --base, checks the added lines of a renamed file", () => {
  inRepository({ "GLOSSARY.md": glossary, "old.md": "One.\nTwo.\nThree.\nFour.\n" }, (directory) => {
    const git = (...args: string[]) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    git("checkout", "-q", "-b", "change");
    git("mv", "old.md", "new.md");
    writeFileSync(join(directory, "new.md"), "One.\nTwo.\nThree.\nFour.\nA new purchase.\n");
    git("commit", "-qam", "move and edit");
    const result = check(directory, "--base", "main");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('new.md:5:7: "purchase" is an avoided alias. Use "Order" (GLOSSARY.md:5).\n');
  });
});
