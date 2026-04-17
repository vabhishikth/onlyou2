/**
 * Disallows hex color literals in code. All colors must be imported from
 * @onlyou/core/tokens/colors. Rationale: CLAUDE.md §DESIGN SYSTEM.
 */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}){1,2}(?:[0-9a-fA-F]{2})?$/;

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hex color literals outside token files" },
    messages: {
      noHex:
        "Hardcoded hex color. Import from @onlyou/core/tokens/colors instead. See CLAUDE.md §DESIGN SYSTEM.",
    },
    schema: [],
  },
  create(context) {
    const rawFilename = context.filename || context.getFilename();
    const filename = rawFilename.replace(/\\/g, "/");
    if (filename.includes("packages/core/src/tokens/")) return {};
    if (filename.includes("/__tests__/") && filename.endsWith(".test.js")) return {};

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!HEX_RE.test(node.value)) return;
        context.report({ node, messageId: "noHex" });
      },
      TemplateElement(node) {
        if (!HEX_RE.test(node.value.raw.trim())) return;
        context.report({ node, messageId: "noHex" });
      },
    };
  },
};
