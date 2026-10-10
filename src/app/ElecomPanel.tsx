import { useEffect, useRef, useState } from "react";
import { Keyboard, MousePointerClick } from "lucide-react";
import { ELECOM_BUTTONS, ELECOM_KEYS, elecomRequest, setElecomBinding, shortcutLabel,
  type ElecomConfig, type ElecomFamily, type ElecomModifiers, type ElecomStatus } from "../elecom-client";
import "../elecom.css";

const EMPTY: ElecomConfig = { enabled: false, mappings: {} };
const MODIFIERS: readonly (readonly [keyof ElecomModifiers, string])[] = [
  ["command", "⌘ Command"], ["control", "⌃ Control"], ["option", "⌥ Option"], ["shift", "⇧ Shift"],
];
export function ElecomPanel({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState<ElecomStatus | null>(null);
  const [config, setConfig] = useState<ElecomConfig>(EMPTY);
  const [family, setFamily] = useState<ElecomFamily>("mouse");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const generation = useRef(0);

  async function refresh() {
    if (busyRef.current) return;
    busyRef.current = true;
    const requestedGeneration = generation.current;
    try {
      const next = await elecomRequest<ElecomStatus>();
      if (!mounted.current) return;
      setStatus(next);
      if (!dirtyRef.current && generation.current === requestedGeneration) setConfig(next.config);
    } catch {
      if (mounted.current) setStatus(null);
    } finally { busyRef.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    // Embedded UI makes no background localhost probes; the offline UI refreshes
    // device identification only while its browser page is visible.
    if (embedded) return () => { mounted.current = false; };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [embedded]);
  function edit(next: ElecomConfig) {
    generation.current += 1;
    dirtyRef.current = true; setDirty(true); setConfig(next); setMessage("");
  }
  async function save() {
    generation.current += 1;
    setBusy(true); setMessage("");
    try {
      const saved = await elecomRequest<ElecomConfig>("", config);
      setConfig(saved); dirtyRef.current = false; setDirty(false);
      setMessage("保存しました。ブラウザを閉じても割り当ては有効です。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存に失敗しました"); }
    finally { setBusy(false); }
  }
  async function request(path: string) {
    setBusy(true);
    try {
      await elecomRequest(path);
      setMessage(path === "/quit" ? "常駐処理を終了しました。" : "許可を変更したら、このアプリを終了して開き直してください。");
      if (path === "/quit") setStatus(null);
    } catch { setMessage("ヘルパーとの接続を確認してください。"); }
    finally { setBusy(false); }
  }
  if (embedded) return (
    <section className="elecom-panel" aria-labelledby="elecom-heading">
      <h2 id="elecom-heading"><MousePointerClick aria-hidden="true" size={22} /> ELECOM EX-G PRO</h2>
      <p>macOSの追加ボタン設定は、ローカル専用画面で変更できます。</p>
      <a className="elecom-button" href="http://127.0.0.1:17847" target="_blank" rel="noreferrer">追加ボタンの設定を開く</a>
      <p className="elecom-caption">OpenMouse EX-G PRO.appを先に起動してください。WebHIDによる接続は不要です。</p>
    </section>
  );
  return (
    <section className="elecom-panel" aria-labelledby="elecom-heading">
      <header className="elecom-heading">
        <div><p className="elecom-caption">OPENMOUSE · macOS · ローカル設定</p>
          <h1 id="elecom-heading"><MousePointerClick aria-hidden="true" size={28} /> EX-G PRO</h1></div>
        <span className="elecom-badge">実機検証前</span>
      </header>
      <p>追加ボタンを、⌘Zなどのキーボードショートカットに割り当てます。</p>
      <div className="elecom-status" aria-live="polite">
        {!status ? <p>ヘルパーに接続できません。OpenMouse EX-G PRO.appを起動してください。</p> : <>
          <p>{status.devices.length ? `接続中：${status.devices.map(device => `EX-G PRO (${device.productId.toString(16).padStart(4, "0")})`).join("、")}` : "対応するマウスはまだ検出されていません。"}</p>
          <p>アクセシビリティ：{status.accessibility ? "許可済み" : "未許可"} ／ 入力監視：{status.inputMonitoring ? "許可済み" : "未許可"}</p>
          {status.devices.map(device => device.lastExtraButton && <p key={device.id}>最後に押した追加ボタン：{device.lastExtraButton}</p>)}
          {status.error && <p className="elecom-caption">{status.error}</p>}
        </>}
      </div>
      <div className="elecom-actions">
        <button type="button" onClick={() => void refresh()} disabled={busy}>接続を更新</button>
        {status && (!status.accessibility || !status.inputMonitoring) && <button type="button" onClick={() => void request("/permissions")} disabled={busy}>macOSの許可設定を開く</button>}
      </div>
      <fieldset disabled={!status || busy} className="elecom-form">
        <legend><Keyboard aria-hidden="true" size={20} /> ボタンの割り当て</legend>
        <label className="elecom-family">機種
          <select value={family} onChange={event => setFamily(event.currentTarget.value as ElecomFamily)}>
            <option value="mouse">EX-G PRO マウス（M-XGx50MB）</option>
            <option value="trackball">EX-G PRO トラックボール（M-XPT1MR）</option>
          </select>
        </label>
        {ELECOM_BUTTONS.map(button => {
          const shortcut = config.mappings[family]?.[button];
          return <div className="elecom-binding" key={button}>
            <label className="elecom-key">追加ボタン {button}
              <select aria-label={`ボタン${button}のキー`} value={shortcut?.keyCode ?? "none"} onChange={event => {
                const value = event.currentTarget.value;
                edit(setElecomBinding(config, family, button, value === "none" ? null : {
                  keyCode: Number(value), modifiers: shortcut?.modifiers ?? { command: true, control: false, option: false, shift: false },
                }));
              }}>
                <option value="none">割り当てなし</option>
                {ELECOM_KEYS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
            <div className="elecom-modifiers" role="group" aria-label={`ボタン${button}の修飾キー`}>
              {MODIFIERS.map(([key, label]) => <label key={key}>
                <input type="checkbox" checked={shortcut?.modifiers[key] ?? false} disabled={!shortcut} onChange={event => {
                  if (shortcut) edit(setElecomBinding(config, family, button, { ...shortcut, modifiers: { ...shortcut.modifiers, [key]: event.currentTarget.checked } }));
                }} />{label}
              </label>)}
            </div>
            <output aria-label={`ボタン${button}の割り当て`}>{shortcut ? shortcutLabel(shortcut) : "—"}</output>
          </div>;
        })}
        <label className="elecom-enable"><input type="checkbox" checked={config.enabled} onChange={event => edit({ ...config, enabled: event.currentTarget.checked })} />追加ボタンの割り当てを有効にする</label>
        <p className="elecom-caption">例：キー「Z」と「⌘ Command」を選ぶと⌘Z。1回の押下につき1回送信します。通常ボタン1〜5はそのままです。</p>
        <p className="elecom-caption">起動直後の最初の入力は状態確認に使います。最初の押下が反応しない場合は離して再押下してください。</p>
        <button className="elecom-primary" type="button" onClick={() => void save()} disabled={!dirty}>{busy ? "保存中…" : "保存して適用"}</button>
      </fieldset>
      <p role="status" className="elecom-message">{message || (dirty ? "未保存の変更があります。" : "")}</p>
      <footer className="elecom-footer">
        <p className="elecom-caption">外部通信・自動更新・自動起動なし。常駐は専用ヘルパー1プロセスです。ボタン番号は押して確認してください。</p>
        <button type="button" disabled={!status || busy} onClick={() => void request("/quit")}>常駐処理を終了</button>
      </footer>
    </section>
  );
}
