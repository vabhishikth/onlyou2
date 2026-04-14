const { RuleTester } = require("eslint");

const rule = require("../eslint/no-hardcoded-hex");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-hardcoded-hex", rule, {
  valid: [
    { code: "const c = colors.primary;" },
    { code: 'const bg = "transparent";' },
    { code: "// #141414 is fine in comments" },
    { code: 'const url = "https://example.com/#anchor";' },
  ],
  invalid: [
    {
      code: 'const c = "#141414";',
      errors: [{ messageId: "noHex" }],
    },
    {
      code: 'const c = { color: "#FF0000" };',
      errors: [{ messageId: "noHex" }],
    },
  ],
});

console.log("no-hardcoded-hex rule tests passed");
