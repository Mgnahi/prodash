// ============================================================
// main.jsx — entry point of the app
// ------------------------------------------------------------
// NEW: wraps <App /> in <BrowserRouter> so react-router-dom
// can manage URL-based navigation.
//
// BrowserRouter uses the browser's History API to keep the URL
// in sync with what's on screen — no page reloads. It's the
// "provider" that makes useNavigate, <Routes>, <Route>, etc.
// available to every component inside it.
//
// We wrap it here (the top level) instead of inside App.jsx
// because the router needs to be ABOVE any component that
// calls useNavigate() or <Link>.
// ============================================================

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
