import assert from "node:assert/strict";
import test from "node:test";
import { setElecomBinding, shortcutLabel, type ElecomConfig } from "./elecom-client.ts";
test("Cmd+Z and Cmd+Shift+Z preserve modifiers and labels", () => {
  const undo = { keyCode: 6, modifiers: { command: true, shift: false, control: false, option: false } };
  const original: ElecomConfig = { enabled: true, mappings: {} };
  const config = setElecomBinding(original, "mouse", 6, undo);
  assert.equal(shortcutLabel(config.mappings.mouse![6]), "⌘Z");
  assert.equal(shortcutLabel({ ...undo, modifiers: { ...undo.modifiers, shift: true } }), "⇧⌘Z");
  assert.deepEqual(original.mappings, {});
  assert.deepEqual(setElecomBinding(config, "mouse", 6, null).mappings.mouse, {});
  assert.throws(() => setElecomBinding(config, "mouse", 1, undo));
});
