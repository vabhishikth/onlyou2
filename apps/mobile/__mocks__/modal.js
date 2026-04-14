// Passthrough mock for react-native Modal.
// Avoids babel-preset-expo codegen crashes (RCTModalHostViewNativeComponent,
// DebuggingOverlayNativeComponent, etc.) that occur when Jest transforms the
// real Modal module tree.  Renders children directly when visible.
const React = require("react");

function MockModal({ visible, children, testID: _testID }) {
  if (!visible) return null;
  return React.createElement(React.Fragment, null, children);
}

MockModal.displayName = "Modal";
module.exports = MockModal;
module.exports.default = MockModal;
