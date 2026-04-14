// Stub for the native Modal host view — prevents babel-preset-expo's codegen
// plugin from crashing on "Unknown property type for supportedOrientations:
// ReadonlyArray" during Jest runs.
const React = require("react");

const RCTModalHostView = React.forwardRef(function RCTModalHostView(
  props,
  _ref,
) {
  const { View } = require("react-native");
  return React.createElement(View, props);
});

module.exports = { __esModule: true, default: RCTModalHostView };
