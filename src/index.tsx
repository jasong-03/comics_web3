import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ErrorBoundary } from "./ErrorBoundary";

const queryClient = new QueryClient();

// AGGRESSIVE ERROR SUPPRESSION
// Must be before any other imports that might trigger side effects
const suppressError = (msg: any) => {
  const str = String(msg);
  return str.includes("Key ring is empty") || str.includes("Extension context invalidated");
};

const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.some(arg => suppressError(arg?.message || arg))) return;
  originalConsoleError(...args);
};

window.addEventListener("unhandledrejection", (event) => {
  if (suppressError(event.reason?.message || event.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.addEventListener("error", (event) => {
  if (suppressError(event.message || event.error)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

const networkConfig = {
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider defaultNetwork="testnet" networks={networkConfig}>
        <WalletProvider autoConnect>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

reportWebVitals();
