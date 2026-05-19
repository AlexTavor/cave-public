import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "@fontsource-variable/inter";
import "@fontsource-variable/crimson-pro";

import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <PostHogProvider client={posthog}>
            <App />
        </PostHogProvider>
    </React.StrictMode>,
);
