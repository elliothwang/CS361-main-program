import { useEffect, useState } from "react"
import Dashboard from "./Dashboard"
import Statistics from "./Statistics"
import SystemStatus from "./SystemStatus"

/*
  root app shell with lightweight view routing
  avoids external router to keep setup simple and reliable
  includes keyboard shortcuts 1 2 3 for quick navigation
*/
export default function App() {
  // current view state
  const [view, setView] = useState("dashboard")

  // keyboard shortcuts for rapid nav
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "1") setView("dashboard")
      if (e.key === "2") setView("statistics")
      if (e.key === "3") setView("status")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // simple nav button component
  function NavButton({ active, onClick, children }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "0.45rem 0.75rem",
          fontSize: "0.9rem",
          borderRadius: 6,
          border: active ? "2px solid #3346ff" : "1px solid #bbb",
          backgroundColor: active ? "#eef2ff" : "#fff",
          color: active ? "#1b2cff" : "#111",
          cursor: "pointer",
        }}
      >
        {children}
      </button>
    )
  }

  // render current page
  function renderView() {
    if (view === "dashboard") return <Dashboard />
    if (view === "statistics") return <Statistics />
    if (view === "status") return <SystemStatus onBack={() => setView("dashboard")} />
    return null
  }

  // layout with sticky header for quick access
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      {/* app header with navigation and hints */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ fontWeight: 700, letterSpacing: "0.2px" }}>test dashboard</div>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: 999,
                background: "#eef4ff",
                border: "1px solid #cbd5ff",
              }}
              title="use keys 1 2 3 to switch views"
            >
              keys 1 2 3 switch views
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <NavButton active={view === "dashboard"} onClick={() => setView("dashboard")}>
              dashboard
            </NavButton>
            <NavButton active={view === "statistics"} onClick={() => setView("statistics")}>
              statistics
            </NavButton>
            <NavButton active={view === "status"} onClick={() => setView("status")}>
              system status
            </NavButton>
          </div>
        </div>
      </div>

      {/* page body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>{renderView()}</div>

      {/* footer with small hint and version tag */}
      <div
        style={{
          marginTop: "2rem",
          borderTop: "1px solid #e2e8f0",
          padding: "0.75rem 1rem",
          color: "#334155",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <div>tip press 1 for dashboard 2 for statistics 3 for status</div>
          <div style={{ opacity: 0.8 }}>v1 0 0 preview</div>
        </div>
      </div>
    </div>
  )
}
