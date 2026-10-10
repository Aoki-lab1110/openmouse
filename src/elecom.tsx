import { render } from "preact";
import { ElecomPanel } from "./app/ElecomPanel";
import "./control.css";

// This entry deliberately imports no main-app bootstrap, news, external fonts,
// service worker, AI, GitHub counters, update checks or general Bridge features.
render(<main className="control-shell elecom-shell"><ElecomPanel /></main>, document.getElementById("app")!);
