import assert from "node:assert/strict";
import test from "node:test";
import { setElecomBinding, shortcutLabel, elecomActionLabel, changedElecomButton, type ElecomConfig, type ElecomShortcut, type ElecomDevice } from "./elecom-client.ts";
test("Cmd+Z and Cmd+Shift+Z preserve modifiers and labels", () => {
  const undo = { keyCode: 6, modifiers: { command: true, shift: false, control: false, option: false } };
  const original: ElecomConfig = { enabled: true, mappings: {} };
  const config = setElecomBinding(original, "mouse", 6, undo);
  assert.equal(shortcutLabel(config.mappings.mouse![6] as ElecomShortcut), "⌘Z");
  assert.equal(shortcutLabel({ ...undo, modifiers: { ...undo.modifiers, shift: true } }), "⇧⌘Z");
  assert.deepEqual(original.mappings, {});
  assert.deepEqual(setElecomBinding(config, "mouse", 6, null).mappings.mouse, {});
  assert.throws(() => setElecomBinding(config, "mouse", 1, undo));
});
test("short physical clicks are identified after release and reconnect establishes a baseline", () => {
  const before: ElecomDevice = { id: "mouse:1", family: "mouse", productId: 318, productName: null, transport: null, model: "EX-G PRO", lastExtraButton: null,
    buttons: { pressedMask: 0, pressCounts: [0, 0, 0, 0, 0, 0, 0, 0], lastButton: null } };
  const clicked = { ...before, buttons: { pressedMask: 0, pressCounts: [0, 0, 0, 0, 0, 1, 0, 0], lastButton: 6 } };
  assert.equal(changedElecomButton(before, clicked), 6);
  assert.equal(changedElecomButton(clicked, clicked), null);
  assert.equal(changedElecomButton(undefined, clicked), null);
  assert.equal(changedElecomButton(before, { ...clicked, id: "mouse:2" }), null);
  assert.equal(changedElecomButton(clicked, { ...clicked, buttons: { ...clicked.buttons, pressCounts: [0, 0, 0, 0, 0, 2, 0, 0] } }), 6);
});
test("system actions are distinct from F11 and preserve other stored shortcuts", () => {
  const shortcut = { keyCode: 103, modifiers: { command: false, shift: false, control: false, option: false } };
  const original: ElecomConfig = { enabled: true, mappings: { mouse: { 6: shortcut } } };
  let config = setElecomBinding(original, "mouse", 7, { systemAction: "missionControl" });
  config = setElecomBinding(config, "mouse", 8, { systemAction: "applicationWindows" });
  assert.equal(elecomActionLabel(config.mappings.mouse![6]), "F11");
  assert.equal(elecomActionLabel(config.mappings.mouse![7]), "Mission Control");
  assert.equal(elecomActionLabel(config.mappings.mouse![8]), "アプリケーションのウインドウ");
  config = setElecomBinding(config, "mouse", 6, { systemAction: "showDesktop" });
  assert.equal(elecomActionLabel(config.mappings.mouse![6]), "デスクトップを表示");
  assert.equal(elecomActionLabel(original.mappings.mouse![6]), "F11");
  assert.deepEqual(config.mappings.mouse![6], { systemAction: "showDesktop" });
  config = setElecomBinding(config, "mouse", 8, { systemAction: "applicationSwitcher" });
  assert.equal(elecomActionLabel(config.mappings.mouse![8]), "アプリ切り替え（クリックで一覧表示）");
  assert.equal(elecomActionLabel(config.mappings.mouse![7]), "Mission Control");
});
