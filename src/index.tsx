import { createRoot } from "react-dom/client";
import { App } from "./app";
import { GlobalProviders } from "./providers";

// setup dayjs
import dayjs from "dayjs";
import relativeTimePlugin from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTimePlugin);

// register nostr: protocol handler
if (import.meta.env.PROD) {
  try {
    navigator.registerProtocolHandler("web+nostr", new URL("/l/%s", location.origin).toString());
  } catch (e) {
    console.log("Failed to register handler");
    console.log(e);
  }
}

const element = document.getElementById("root");
if (!element) throw new Error("missing mount point");
const root = createRoot(element);
root.render(
  <GlobalProviders>
    <App />
  </GlobalProviders>,
);
