import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import appLogo from "./logo.jpg";

// Dynamically generate and inject PWA manifest
const manifest = {
  name: "Niners",
  short_name: "Niners",
  description: "NINE Talent Management - The home of quality livestreamers.",
  start_url: "/",
  display: "standalone",
  background_color: "#0f172a",
  theme_color: "#D4AF37",
  icons: [
    {
      src: appLogo,
      sizes: "192x192 512x512",
      type: "image/jpeg",
      purpose: "any maskable"
    }
  ]
};

const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
const manifestURL = URL.createObjectURL(manifestBlob);
const link = document.createElement('link');
link.rel = 'manifest';
link.href = manifestURL;
document.head.appendChild(link);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);