import { useState } from "react"
import Dashboard from "./Dashboard"
import Statistics from "./Statistics"
import SystemStatus from "./SystemStatus"
import Login from "./Login"
import "./App.css"

function App() {
  const [view, setView] = useState("dashboard")

  function renderView() {
    if (view === "statistics")
      return <Statistics />

    if (view === "status")
      return <SystemStatus onBack={() => setView("dashboard")} />

    if (view === "auth")
      return <Login />

    return <Dashboard />
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b1120", // dark slate background
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",               // centers the whole dashboard
          padding: "1.5rem 1rem 2rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          color: "#0f172a",
          backgroundColor: "#f8fafc",     // light background for the app itself
          borderRadius: 8,
          boxShadow: "0 20px 40px rgba(15,23,42,0.35)",
        }}
      >
        {/* top header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                lineHeight: 1.2,
                fontWeight: 600,
              }}
            >
              Test Operations Dashboard
            </h1>
            <p
              style={{
                margin: "0.25rem 0 0 0",
                fontSize: "0.9rem",
                color: "#64748b",
              }}
            >
              Monitor live sensor streams, rolling statistics, and service
              health from connected microservices.
            </p>
          </div>
        </header>

        {/* nav bar */}
        <nav
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "0.5rem",
          }}
        >
          {[
            { id: "dashboard", label: "Live Dashboard" },
            { id: "statistics", label: "Statistics" },
            { id: "status", label: "System Status" },
            { id: "auth", label: "User Auth" },   // NEW TAB
          ].map(tab => {
            const isActive = view === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  padding: "0.35rem 0.9rem",
                  borderRadius: 999,
                  border: "1px solid transparent",
                  backgroundColor: isActive ? "#0f172a" : "transparent",
                  color: isActive ? "#f8fafc" : "#0f172a",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* page content */}
        <main>{renderView()}</main>
      </div>
    </div>
  )
}

export default App
