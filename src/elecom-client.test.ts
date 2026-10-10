import assert from "node:assert/strict";
import test from "node:test";
import { setElecomBinding, shortcutLabel, elecomActionLabel, type ElecomConfig, type ElecomShortcut } from "./elecom-client.ts";
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
});
