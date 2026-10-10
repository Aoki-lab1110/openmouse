import { useEffect, useRef, useState } from "react";
import { Keyboard, MousePointerClick } from "lucide-react";
import { ELECOM_BUTTONS, ELECOM_KEYS, ELECOM_SYSTEM_ACTIONS, elecomRequest, setElecomBinding, elecomActionLabel, changedElecomButton,
  type ElecomConfig, type ElecomFamily, type ElecomModifiers, type ElecomStatus, type ElecomDevice } from "../elecom-client";
import "../elecom.css";
import elecomButtonDiagram from "../assets/elecom-exg-pro-buttons.svg";

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
  const [identifying, setIdentifying] = useState(false);
  const identifyRef = useRef(false);
  const renewedAt = useRef(0);
  const [selectedButton, setSelectedButton] = useState<number>(6);
  const [deviceId, setDeviceId] = useState("");
  const deviceIdRef = useRef("");
  const observed = useRef<ElecomDevice | undefined>(undefined);
  const [recent, setRecent] = useState<{ button: number; at: number } | null>(null);
  const device = status?.devices.find(value => value.id === deviceId) ?? status?.devices[0];

  async function refresh() {
    if (busyRef.current) return;
    busyRef.current = true;
    const requestedGeneration = generation.current;
    try {
      if (identifyRef.current && Date.now() - renewedAt.current > 10_000) {
        await elecomRequest("/identify", { active: true });
        renewedAt.current = Date.now();
      }
      const next = await elecomRequest<ElecomStatus>();
      if (!mounted.current) return;
      setStatus(next);
      const detected = next.devices.find(value => value.id === deviceIdRef.current) ?? next.devices[0];
      if (detected) {
        const pressed = changedElecomButton(observed.current, detected);
        observed.current = detected;
        if (!deviceIdRef.current) { deviceIdRef.current = detected.id; setDeviceId(detected.id); setFamily(detected.family); }
        if (pressed) {
          setRecent({ button: pressed, at: Date.now() });
          if (identifyRef.current && pressed >= 6) { setFamily(detected.family); setSelectedButton(pressed); }
        }
      } else { observed.current = undefined; }
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
    let nextRefresh = 0;
    const timer = window.setInterval(() => {
      if (Date.now() < nextRefresh) return;
      nextRefresh = Date.now() + (identifyRef.current ? 250 : 2000);
      if (document.visibilityState === "visible") void refresh();
    }, 250);
    return () => { mounted.current = false; window.clearInterval(timer); if (identifyRef.current) void elecomRequest("/identify", { active: false }).catch(() => {}); };
  }, [embedded]);
  async function toggleIdentify() {
    setBusy(true);
    try {
      const active = !identifyRef.current;
      await elecomRequest("/identify", { active });
      identifyRef.current = active; setIdentifying(active); renewedAt.current = Date.now();
      if (active) { observed.current = device; setRecent(null); }
      setMessage(active ? "マウスのボタンを押してください。確認中は割り当て操作を送信しません。" : "ボタン確認を終了しました。保存済みの割り当てが動作します。");
      await refresh();
    } catch { setMessage("ボタン確認を開始できませんでした。新版アプリの接続を確認してください。"); }
    finally { setBusy(false); }
  }
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
  async function testBinding() {
    setBusy(true); setMessage("");
    try {
      await elecomRequest("/test", { family, button: selectedButton });
      setMessage("保存済みの操作を送信しました。実際の画面で動作を確認してください。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作の送信に失敗しました。"); }
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
        <span className="elecom-badge">{device?.buttons.pressCounts.some(count => count > 0) ? "ボタン入力を受信" : "ボタン確認待ち"}</span>
      </header>
      <p>追加ボタンを、Mission Controlや⌘Zなどの操作に割り当てます。</p>
      <div className="elecom-status" aria-live="polite">
        {!status ? <p>ヘルパーに接続できません。OpenMouse EX-G PRO.appを起動してください。</p> : <>
          <p>{device ? `接続中：${device.productName ?? "EX-G PRO"} ／ ${device.transport ?? "接続方式不明"}` : "対応するマウスはまだ検出されていません。"}</p>
          {device && <p className="elecom-caption">機種：{device.model} ／ ID：056e:{device.productId.toString(16).padStart(4, "0")}</p>}
          <p>アクセシビリティ：{status.accessibility ? "許可済み" : "未許可"} ／ 入力監視：{status.inputMonitoring ? "許可済み" : "未許可"}</p>
          {status.error && <p className="elecom-caption">{status.error}</p>}
        </>}
      </div>
      <div className="elecom-actions">
        <button type="button" onClick={() => void refresh()} disabled={busy}>接続を更新</button>
        {status && (!status.accessibility || !status.inputMonitoring) && <button type="button" onClick={() => void request("/permissions")} disabled={busy}>macOSの許可設定を開く</button>}
      </div>
      <section className="elecom-monitor" aria-labelledby="elecom-monitor-heading">
        <div className="elecom-heading"><h2 id="elecom-monitor-heading">押してボタンを確認</h2>
          <button type="button" disabled={!device || busy} aria-pressed={identifying} onClick={() => void toggleIdentify()}>{identifying ? "ボタン確認を終了" : "ボタン確認を開始"}</button></div>
        {status && status.devices.length > 1 && <label className="elecom-family">確認するマウス<select value={device?.id ?? ""} onChange={event => {
          deviceIdRef.current = event.currentTarget.value; setDeviceId(event.currentTarget.value); observed.current = undefined; setRecent(null);
          const chosen = status.devices.find(value => value.id === event.currentTarget.value); if (chosen) setFamily(chosen.family);
        }}>{status.devices.map(value => <option key={value.id} value={value.id}>{value.productName ?? value.model} ({value.productId.toString(16)})</option>)}</select></label>}
        <p className="elecom-caption">確認を開始して実物のボタンを押すと反応します。追加ボタン6〜8は、その設定欄が自動で開きます。</p>
        {(device?.family ?? family) === "mouse" && <figure className="elecom-official-diagram">
          <img src={elecomButtonDiagram} alt="EX-G PROの公式ボタン位置図。⑥Fn1は側面前側、⑦Fn2は側面中央の大きいボタン、⑧Fn3はその右下の小さいボタンです。" />
          <figcaption>⑥ Fn1：側面前側 ／ ⑦ Fn2：中央の大きいボタン ／ ⑧ Fn3：その右下の小ボタン<br />
            出典：<a href="https://www.elecom.co.jp/support/manual_web/products/type_01/m-xgx50mbsk/" target="_blank" rel="noreferrer">ELECOM公式マニュアル</a>（Mサイズの図）</figcaption>
        </figure>}
        <div className="elecom-button-map" aria-label="マウスのボタン反応">
          {Array.from({ length: 8 }, (_, index) => {
            const button = index + 1;
            const held = Boolean((device?.buttons.pressedMask ?? 0) & (1 << index));
            const active = held || recent?.button === button && Date.now() - recent.at < 900;
            const count = device?.buttons.pressCounts[index] ?? 0;
            const binding = button >= 6 ? config.mappings[device?.family ?? family]?.[button] : undefined;
            return <button key={button} type="button" disabled={button < 6 || !status || busy}
              aria-label={`ボタン${button}${button >= 6 ? "を設定" : "（通常操作）"}`} aria-pressed={button >= 6 ? selectedButton === button : undefined}
              className={`elecom-button-cell${active ? " is-active" : ""}${selectedButton === button ? " is-selected" : ""}`}
              onClick={() => { setSelectedButton(button); if (device) setFamily(device.family); }}>
              <strong>{button}</strong><span>{button >= 6 ? (device?.family ?? family) === "mouse" ? `Fn${button - 5}` : "追加ボタン" : ["左クリック", "右クリック", "ホイール", "戻る", "進む"][index]}</span>
              <span>{held ? "押下中" : active ? "反応あり" : `${count}回`}</span>
              {button >= 6 && <span className="elecom-cell-binding">{binding ? elecomActionLabel(binding) : "未割り当て"}</span>}
            </button>;
          })}
        </div>
        <p role="status" className="elecom-input-result">{device?.buttons.lastButton ? `入力を確認：ボタン ${device.buttons.lastButton}（${device.buttons.pressCounts[device.buttons.lastButton - 1]}回）` : device?.buttons.pressedMask !== null && device ? "入力待機中。ボタンを押してください。" : "マウスを接続して、ボタンを押してください。"}</p>
        {identifying && <p className="elecom-caption">確認中：ショートカットとmacOS操作を一時停止しています。確認を終了すると元に戻ります。</p>}
      </section>
      <fieldset disabled={!status || busy} className="elecom-form">
        <legend><Keyboard aria-hidden="true" size={20} /> ボタンの割り当て</legend>
        <label className="elecom-family">機種
          <select value={family} onChange={event => setFamily(event.currentTarget.value as ElecomFamily)}>
            <option value="mouse">EX-G PRO マウス（M-XGx50MB）</option>
            <option value="trackball">EX-G PRO トラックボール（M-XPT1MR）</option>
          </select>
        </label>
        {ELECOM_BUTTONS.filter(button => button === selectedButton).map(button => {
          const action = config.mappings[family]?.[button];
          const shortcut = action && "keyCode" in action ? action : undefined;
          const system = action && "systemAction" in action ? action.systemAction : undefined;
          return <div className={`elecom-binding${system ? " is-system" : ""}`} key={button}>
            <label className="elecom-key">追加ボタン {button}{family === "mouse" ? `（Fn${button - 5}）` : ""}
              <select aria-label={`ボタン${button}の操作`} value={system ? `system:${system}` : shortcut?.keyCode ?? "none"} onChange={event => {
                const value = event.currentTarget.value;
                const selectedSystem = ELECOM_SYSTEM_ACTIONS.find(([name]) => value === `system:${name}`);
                edit(setElecomBinding(config, family, button, value === "none" ? null : selectedSystem ? { systemAction: selectedSystem[0] } : {
                  keyCode: Number(value), modifiers: shortcut?.modifiers ?? { command: Number(value) < 96, control: false, option: false, shift: false },
                }));
              }}>
                <option value="none">割り当てなし</option>
                <optgroup label="macOSの操作">
                  {ELECOM_SYSTEM_ACTIONS.map(([name, label]) => <option key={name} value={`system:${name}`}>{label}</option>)}
                </optgroup>
                <optgroup label="キーボードのキー">
                  {ELECOM_KEYS.map(([code, label]) => <option key={code} value={code}>{label.startsWith("F") && label.length > 1 ? `${label}（キー送信）` : label}</option>)}
                </optgroup>
              </select>
            </label>
            {system ? <p className="elecom-caption">macOSのウインドウ操作を実行します。修飾キーの選択は不要です。</p> : <div className="elecom-modifiers" role="group" aria-label={`ボタン${button}の修飾キー`}>
              {MODIFIERS.map(([key, label]) => <label key={key}>
                <input type="checkbox" checked={shortcut?.modifiers[key] ?? false} disabled={!shortcut} onChange={event => {
                  if (shortcut) edit(setElecomBinding(config, family, button, { ...shortcut, modifiers: { ...shortcut.modifiers, [key]: event.currentTarget.checked } }));
                }} />{label}
              </label>)}
            </div>}
            <output className={system ? "is-system" : undefined} aria-label={`ボタン${button}の割り当て`}>{action ? elecomActionLabel(action) : "—"}</output>
          </div>;
        })}
        <label className="elecom-enable"><input type="checkbox" checked={config.enabled} onChange={event => edit({ ...config, enabled: event.currentTarget.checked })} />追加ボタンの割り当てを有効にする</label>
        <p className="elecom-caption">例：キー「Z」と「⌘ Command」を選ぶと⌘Z。1回の押下につき1回送信します。通常ボタン1〜5はそのままです。</p>
        <p className="elecom-caption">「アプリ切り替え（クリックで一覧表示）」は、短く押しても一覧が残り、アプリ名をクリックして切り替えます。矢印＋Returnでも選べます。Escまたは一覧の外をクリックすると閉じます。⌘Tabは長押し中だけ表示し、離すと確定します。</p>
        <p className="elecom-caption">ウインドウ一覧は「アプリケーションのウインドウ」、全体の一覧は「Mission Control」を選びます。デスクトップを表示したい場合は、F11のキー送信と区別して「デスクトップを表示」を選んでください。</p>
        <p className="elecom-caption">起動直後の最初の入力は状態確認に使います。最初の押下が反応しない場合は離して再押下してください。保存後は「ボタン確認を終了」で操作が有効になります。</p>
        <button className="elecom-primary" type="button" onClick={() => void save()} disabled={!dirty}>{busy ? "保存中…" : "保存して適用"}</button>
        <button type="button" onClick={() => void testBinding()} disabled={dirty || identifying || !config.enabled || !config.mappings[family]?.[selectedButton]}>保存した操作を試す</button>
      </fieldset>
      <p role="status" className="elecom-message">{message || (dirty ? "未保存の変更があります。" : "")}</p>
      <footer className="elecom-footer">
        <p className="elecom-caption">外部通信・自動更新・自動起動なし。常駐は専用ヘルパー1プロセスです。アプリ一覧の表示中だけ専用メニューを起動し、閉じると終了します。</p>
        <button type="button" disabled={!status || busy} onClick={() => void request("/quit")}>常駐処理を終了</button>
      </footer>
    </section>
  );
}
