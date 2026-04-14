// Stub for the native Modal host view — avoids babel-codegen crash in tests.
const React = require("react");
const { View } = require("react-native");

const RCTModalHostView = React.forwardRef(function RCTModalHostView(
  props,
  _ref,
) {
  return React.createElement(View, props);
});

module.exports = { __esModule: true, default: RCTModalHostView };
