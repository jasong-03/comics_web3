import React, { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { ComicsApp } from "./comics/ComicsApp";
import { Inventory } from "./Inventory";
import { TestModeToggle } from "./components/TestModeToggle";

type View = "landing" | "comics" | "inventory";

function App() {
  const [currentView, setCurrentView] = useState<View>("landing");

  // Auto-enable test mode if not already set (for Cursor browser)
  useEffect(() => {
    if (!localStorage.getItem("testMode") && !process.env.REACT_APP_TEST_MODE) {
      localStorage.setItem("testMode", "true");
    }
  }, []);

  if (currentView === "comics") {
    return (
      <>
        <TestModeToggle />
        <ComicsApp />
      </>
    );
  }

  if (currentView === "inventory") {
    return (
      <>
        <TestModeToggle />
        <Inventory onBack={() => setCurrentView("landing")} />
      </>
    );
  }

  return (
    <>
      <TestModeToggle />
      <LandingPage 
        onEnter={() => setCurrentView("comics")}
        onViewInventory={() => setCurrentView("inventory")}
      />
    </>
  );
}

export default App;
