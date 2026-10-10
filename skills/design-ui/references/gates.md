# UI gates

Build to these gates and judge against them. Each gate names how it is checked: **scan** (the command below), **DOM** (the control-ui harness at each width), or **look** (a person or reviewer reading the screenshot).

## System

- Every colour, font, size, space, radius, and shadow is a named token. **scan**
- One design system per project. Use its components before writing a custom one. **look**
- Copy uses the project's glossary terms, and the same object has the same name and look everywhere. **look**

## Hierarchy

- Each view has one primary action. Secondary actions are visibly quieter. **look**
- Emphasis comes from quieting what matters less (weight, colour, size) before enlarging what matters more. **look**
- The most important content reads first at a glance, at every width. **look**

## Space and layout

- Spacing comes from the scale. **scan**
- Elements in a group sit closer together than the group sits to its neighbours. **look**
- Elements align to a shared grid or edge. **look**
- Prose lines run about 45 to 75 characters. **DOM**
- No horizontal scroll at 375, 768, or 1280 pixels. **DOM**

## Type and colour

- Sizes come from the type scale, with at most two font families. **scan**
- Greys come from the grey tokens, not from opacity over a coloured background. **scan**
- Body text has a contrast ratio of at least 4.5:1. Large text and the edges of controls have at least 3:1. **DOM**
- Meaning never depends on colour alone. An error also has an icon or text. **look**

## States

- Every state from the inventory renders. **DOM**
- Focus-visible is always visible and has 3:1 contrast. **DOM**
- Disabled controls look disabled and stay legible. **look**
- An error message says what happened, why, and how to recover. **look**
- Empty states say what goes here and how to add it. **look**

## Interaction

- Touch targets are at least 44 by 44 CSS pixels. **DOM**
- Every control is reachable by keyboard in reading order. **DOM**
- A field has a visible label. Placeholder text is only an example. **DOM**
- Hover-only effects sit behind `@media (hover: hover)`. **scan**

For motion and sound, apply [feel](../../feel/SKILL.md#5-verify-and-review).

## Robustness

- Long names, long words, and translated text wrap or truncate with the full value available. **DOM**
- Zero, one, and many items each look intentional. **DOM**
- A double click on submit sends once. **DOM**

## Truth

- Data, metrics, logos, and testimonials are real or are labelled as samples. **look**
- Screens show the product itself, not drawn browser or phone frames around it. **look**

## Scan

Run from the repository root with the base branch in place of `<base>`, and the tokens file in place of `<tokens-file>`. Run `git add -N` on new files first so the diff lists them. The scan reads only the lines the change adds. Every hit needs a token or a reason.

```sh
git diff -U0 <base> -- '*.css' '*.scss' '*.less' '*.html' '*.jsx' '*.tsx' '*.vue' '*.svelte' \
  | awk '/^\+\+\+ /{f=substr($0,7);next} /^@@/{split($3,a,/[+,]/);n=a[2];next} /^\+/{print f":"n":"substr($0,2);n++}' \
  | grep -v '^<tokens-file>:' \
  | rg --pcre2 \
    -e '#[0-9a-fA-F]{3,8}\b' \
    -e '\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(' \
    -e '\b(font-family|font-size|border-radius|box-shadow)\s*:\s*+(?!var\(|inherit)' \
    -e '(^|[\s;{:])(margin|padding|gap|inset|top|right|bottom|left)(-[a-z]+)?\s*:[^;]*\b[1-9]\d*(\.\d+)?(px|rem|em)\b' \
    -e '\b[a-z-]+-\[[^\]]+\]' \
    -e 'transition(-property)?\s*:\s*all\b|\btransition-all\b' \
    -e ':hover'
```

The `:hover` pattern lists every added hover rule so you can confirm each one sits behind `@media (hover: hover)`. The `-[...]` pattern catches Tailwind arbitrary values such as `p-[13px]` and `bg-[#123456]`.
