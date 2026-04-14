// Generic stub for react-native native component specs in
// src/private/specs_DEPRECATED/components/*.  These files use Flow types and
// codegenNativeComponent — babel-preset-expo's codegen Babel plugin crashes
// when it tries to parse them in Jest because several prop/command types are
// unsupported (ReadonlyArray, etc.).  Returning a plain string tag is enough
// for RNTL's renderer to treat them as host components without crashing.
module.exports = {
  __esModule: true,
  default: "RCTNativeComponent",
  Commands: {},
};
