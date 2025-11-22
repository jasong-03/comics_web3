import React, { useState } from "react";
import { LandingPage } from "./LandingPage";
import { ComicsApp } from "./comics/ComicsApp";

function App() {
  const [showComics, setShowComics] = useState(false);

  if (showComics) {
    return <ComicsApp />;
  }

  return <LandingPage onEnter={() => setShowComics(true)} />;
}

export default App;
