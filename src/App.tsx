import React, { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { ComicsApp } from "./comics/ComicsApp";
import { TestModeToggle } from "./components/TestModeToggle";

function App() {
  const [showComics, setShowComics] = useState(false);

  // Auto-enable test mode if not already set (for Cursor browser)
  useEffect(() => {
    if (!localStorage.getItem("testMode") && !process.env.REACT_APP_TEST_MODE) {
      localStorage.setItem("testMode", "true");
    }
  }, []);

  if (showComics) {
    return (
      <>
        <TestModeToggle />
        <ComicsApp />
      </>
    );
  }

  return (
    <>
      <TestModeToggle />
      <LandingPage onEnter={() => setShowComics(true)} />
    </>
  );
}

export default App;
