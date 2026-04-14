# RN 0.81 Pressable function-form `style` quirk — `PremiumButton` pattern

**Date:** 2026-04-14
**Context:** Phase 2B visual fixes pass

## The bug

Across the entire Phase 2B auth flow (welcome, phone-verify, otp-entry, profile-setup), every `PremiumButton variant="primary"` rendered on iOS with an **invisible background**: near-white text on cream, no pill, no border. Disabled state was fine (gray pill), but the primary active state had no background.

Jest unit tests passed. The `/design` showcase page rendered correctly in the dev menu. The bug only appeared when the button was mounted inside a real screen under Expo Router with the new architecture enabled (`newArchEnabled: true` in `app.config.ts`).

## Root cause (hypothesis)

The original `PremiumButton` passed a **function-form style** to `<Pressable>`:

```tsx
<Pressable
  style={({ pressed }) => ({
    height: 56,
    backgroundColor: style.bg,   // "#141414"
    borderWidth: style.border ? 1.5 : 0,
    borderColor: style.border,   // undefined for primary
    opacity: pressed && !disabled ? 0.9 : 1,
  })}
>
```

Under React Native 0.81 with the new architecture, `Pressable`'s function-form style appears to silently drop the `backgroundColor` when:

- `borderWidth` resolves to `0`, AND
- `borderColor` is `undefined`, AND
- the style object also includes an animated-like key (`opacity`)

The bug did not reproduce in tests because `react-test-renderer` evaluates the function style synchronously and the returned object looks correct. It only manifests at Fabric render time on-device.

## The fix

Do not render visual chrome directly on `<Pressable>`. Use `<Pressable>` as a **touch layer only**, and put all visual styling on a nested `<View>`:

```tsx
<Pressable onPress={onPress} disabled={disabled}>
  {({ pressed }) => (
    <View
      style={{
        height: 56,
        backgroundColor: tokens.bg,
        borderWidth: tokens.border ? 1.5 : 0,
        borderColor: tokens.border ?? "transparent",
        opacity: pressed && !disabled ? 0.9 : 1,
      }}
    >
      <Text style={{ color: tokens.fg }}>{label}</Text>
    </View>
  )}
</Pressable>
```

Also:

- `borderColor` now falls back to `"transparent"` (never `undefined`) — removes one RN foot-gun.
- `resolveTokens()` is a `switch` called inside the component body, not a module-level `Record<Variant, {...}>` object. Less coupling to ES module evaluation order.

## Rule for future shared components

**Any custom button, card, or pressable tile must put backgrounds, borders, and shadows on a nested `<View>`, not on the Pressable itself.** Pressable is a touch layer, nothing else.

Same rule for `TouchableOpacity` — use it as a wrapper, paint the pixels on a child.

## Related

- `apps/mobile/src/components/ui/PremiumButton.tsx` — reference implementation of the pattern
- `docs/VISUAL_DIRECTION.md` §1 Clinical Luxe Feel Checklist — must include "primary CTA visible, hit area 56pt" as a manual check
