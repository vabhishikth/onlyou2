// Manual mock for expo-linear-gradient in Jest.
// LinearGradient renders as a plain View so layout tests work without
// native module initialisation.
const React = require("react");
const { View } = require("react-native");

function LinearGradient({ children, style, ...rest }) {
  return React.createElement(View, { style, ...rest }, children);
}

module.exports = { LinearGradient };
