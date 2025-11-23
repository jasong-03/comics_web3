import React from "react";
import { enableTestMode, disableTestMode } from "../utils/testWallet";

const isTestMode = () => {
  return (
    process.env.REACT_APP_TEST_MODE === "true" ||
    localStorage.getItem("testMode") === "true"
  );
};

export const TestModeToggle: React.FC = () => {
  const testMode = isTestMode();

  return (
    <div className="fixed top-4 right-4 z-50 bg-neon-yellow border-4 border-brand-dark shadow-hard p-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sm">
          TEST MODE: {testMode ? "ON" : "OFF"}
        </span>
        <button
          onClick={testMode ? disableTestMode : enableTestMode}
          className="bg-brand-dark text-white px-4 py-2 border-2 border-brand-dark shadow-hard-sm hover:bg-neon-pink hover:text-brand-dark transition-all font-mono text-sm"
        >
          {testMode ? "DISABLE" : "ENABLE"}
        </button>
      </div>
      {testMode && (
        <p className="text-xs mt-2 text-brand-dark/70">
          Using test wallet (bypassing extension)
        </p>
      )}
    </div>
  );
};

