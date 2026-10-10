# macOS EX-G PRO fork

EX-G PROの追加ボタン6〜8を⌘Zなどのショートカットへ割り当てるUIを追加しています。物理マウスの実機確認は未実施です。

v0.2.0のヘルパーでは、操作の選択欄に「Mission Control」「アプリケーションのウインドウ」「デスクトップを表示」を追加しています。通常キーのF11送信とmacOSのデスクトップ表示は別の選択肢です。macOS操作を選ぶと修飾キー欄の代わりに説明を表示します。旧キーボード割り当ては引き継ぎます。

`npm run build:elecom` はローカル専用の `dist-elecom/elecom.html` を生成します。通常アプリの起動処理、外部フォント、ニュース、更新確認、サービスワーカーを読み込まない独立entryです。`dist-elecom` は一般向けの `dist` と別の成果物です。

設定の適用には [Bridge forkの専用ヘルパー](https://github.com/Aoki-lab1110/OpenMouse-Bridge/tree/feat/elecom-exg-pro/elecom-helper) が必要です。WebHIDのマウスコレクションは保護対象なので、通常の「デバイスに接続」からは扱いません。ホーム画面のEX-G PROリンクも専用ローカル画面を開きます。

画面は修飾キーとキーの選択、有効/無効、明示的な保存、権限確認、直近の追加ボタン番号、常駐終了を備えます。表示中の状態取得はローカルに限定し、非表示中は停止します。割り当てはヘルパーがJSON保存し、ブラウザを閉じても処理します。

これはMac上のソフトウェア変換で、マウス本体の設定書込み、チルト変更、通常ボタン1〜5の変更ではありません。無通信で使う場合は専用UIを使用してください。通常版の既存ネットワーク機能は変更していません。

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build:elecom
node --test src/elecom-client.test.ts
```

Node.js 22以上でテストを実行します。専用UIを `.app` にまとめる手順、macOSの権限、未検証事項はヘルパーのREADMEを参照してください。
