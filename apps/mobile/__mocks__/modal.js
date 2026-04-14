// Modal has a broken spec in the jest-expo renderer.
// Stub it to render children directly when visible.
const React = require("react");
const { View } = require("react-native");

function MockModal({ visible, children, testID }) {
  if (!visible) return null;
  return React.createElement(View, { testID }, children);
}

module.exports = MockModal;
module.exports.default = MockModal;
