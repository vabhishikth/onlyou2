const { View, Text, Image, ScrollView, FlatList } = require("react-native");

// Minimal manual mock for react-native-reanimated in Jest
// Animated components just render their RN equivalents
const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent: (component) => component,
};

const useSharedValue = (init) => ({ value: init });
const useAnimatedStyle = (fn) => fn();
const withTiming = (toValue) => toValue;
const withSpring = (toValue) => toValue;
const withDelay = (_delay, animation) => animation;
const withSequence = (...animations) => animations[animations.length - 1];
const withRepeat = (animation) => animation;
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;
const interpolate = (value, inputRange, outputRange) => outputRange[0];
const Extrapolation = { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" };
const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  out: (fn) => fn,
  in: (fn) => fn,
  inOut: (fn) => fn,
  bezier: () => (t) => t,
  elastic: () => (t) => t,
  bounce: (t) => t,
  back: () => (t) => t,
  circle: (t) => t,
  exp: (t) => t,
  poly: () => (t) => t,
  quad: (t) => t,
  cubic: (t) => t,
  sin: (t) => t,
};
const useAnimatedRef = () => ({ current: null });
const useAnimatedScrollHandler = () => () => {};
const useDerivedValue = (fn) => ({ value: fn() });
const useAnimatedGestureHandler = (handlers) => handlers;
const cancelAnimation = () => {};
const measure = () => null;

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  runOnUI,
  interpolate,
  Extrapolation,
  Easing,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedGestureHandler,
  cancelAnimation,
  measure,
};
