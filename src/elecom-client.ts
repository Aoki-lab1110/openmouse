/** Local EX-G PRO helper. No device data or configuration leaves this machine. */
export interface ElecomModifiers { command: boolean; control: boolean; option: boolean; shift: boolean }
export interface ElecomShortcut { keyCode: number; modifiers: ElecomModifiers }
export type ElecomFamily = "mouse" | "trackball";
export interface ElecomConfig { enabled: boolean; mappings: Partial<Record<ElecomFamily, Record<string, ElecomShortcut>>> }
export interface ElecomStatus {
  version: string; accessibility: boolean; inputMonitoring: boolean; config: ElecomConfig;
  devices: { id: string; family: ElecomFamily; productId: number; lastExtraButton: number | null }[];
  error: string | null;
}
export const ELECOM_BUTTONS = [6, 7, 8] as const;
export const ELECOM_KEYS: readonly (readonly [number, string])[] = [
  [0, "A"], [11, "B"], [8, "C"], [2, "D"], [14, "E"], [3, "F"], [5, "G"],
  [4, "H"], [34, "I"], [38, "J"], [40, "K"], [37, "L"], [46, "M"], [45, "N"],
  [31, "O"], [35, "P"], [12, "Q"], [15, "R"], [1, "S"], [17, "T"], [32, "U"],
  [9, "V"], [13, "W"], [7, "X"], [16, "Y"], [6, "Z"],
  [29, "0"], [18, "1"], [19, "2"], [20, "3"], [21, "4"], [23, "5"],
  [22, "6"], [26, "7"], [28, "8"], [25, "9"],
  [36, "Return"], [48, "Tab"], [49, "Space"], [51, "Delete"], [53, "Escape"],
  [123, "←"], [124, "→"], [125, "↓"], [126, "↑"],
  [122, "F1"], [120, "F2"], [99, "F3"], [118, "F4"], [96, "F5"], [97, "F6"],
  [98, "F7"], [100, "F8"], [101, "F9"], [109, "F10"], [103, "F11"], [111, "F12"],
];
export function shortcutLabel(shortcut: ElecomShortcut): string {
  const m = shortcut.modifiers;
  return `${m.control ? "⌃" : ""}${m.option ? "⌥" : ""}${m.shift ? "⇧" : ""}${m.command ? "⌘" : ""}${ELECOM_KEYS.find(([code]) => code === shortcut.keyCode)?.[1] ?? shortcut.keyCode}`;
}
export function setElecomBinding(config: ElecomConfig, family: ElecomFamily, button: number, shortcut: ElecomShortcut | null): ElecomConfig {
  if (!ELECOM_BUTTONS.some(value => value === button)) throw new Error("Only buttons 6–8 are assignable");
  const bindings = { ...config.mappings[family] };
  if (shortcut) bindings[button] = shortcut;
  else delete bindings[button];
  return { ...config, mappings: { ...config.mappings, [family]: bindings } };
}
function base(): string {
  return location.port === "17847" && ["localhost", "127.0.0.1"].includes(location.hostname)
    ? location.origin : "http://127.0.0.1:17847";
}
export async function elecomRequest<T>(path = "", config?: ElecomConfig): Promise<T> {
  const response = await fetch(`${base()}/v1/elecom${path}`, {
    method: config !== undefined || path ? "PUT" : "GET",
    headers: config ? { "Content-Type": "application/json" } : {},
    body: config ? JSON.stringify(config) : undefined,
    credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`設定を保存できませんでした（${response.status}）`);
  return response.json() as Promise<T>;
}
