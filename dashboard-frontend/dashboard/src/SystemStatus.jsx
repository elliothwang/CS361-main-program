import { useEffect, useState } from "react"

/*
  system status page with simple health snapshot and retry
  optional back navigation supported via onBack prop
*/
export default function SystemStatus({ onBack }) {
  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status...",
    serial_number: "",
    last_check: "",
  })

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status")
      const body = await res.json()
      setStatusInfo({
        connected: body.connected,
        message: body.message,
        serial_number: body.serial_number,
        last_check: body.last_check,
      })
    } catch {
      setStatusInfo({
        connected: false,
        message: "Rolling statistics service not responding.",
        serial_number: "S/N: 1234567890",
        last_check: new Date().toLocaleTimeString(),
      })
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#111", backgroundColor: "#fff", padding: "1rem", maxWidth: "700px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem", lineHeight: 1.3, fontWeight: "600", color: statusInfo.connected ? "#000" : "#cc0000" }}>
          system status
        </h1>
        <div style={{ fontSize: "0.9rem", color: "#222", marginTop: "0.25rem", lineHeight: 1.45 }}>
          indicates whether the dashboard can reach the statistics microservice includes retry and navigation controls
        </div>
      </header>

      <section
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "1rem",
          backgroundColor: statusInfo.connected ? "#fafafa" : "#fff5f5",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "0.5rem", color: statusInfo.connected ? "#111" : "#cc0000" }}>
          {statusInfo.connected ? "🟢 Connected" : "🔴 Disconnected / Service Unavailable"}
        </div>

        <div style={{ fontSize: "0.9rem", lineHeight: 1.5, color: statusInfo.connected ? "#111" : "#cc0000" }}>
          {statusInfo.message}
        </div>

        <div style={{ fontSize: "0.85rem", lineHeight: 1.4, marginTop: "0.75rem", color: "#222" }}>
          <div>{statusInfo.serial_number}</div>
          <div>Last check {statusInfo.last_check}</div>
        </div>

        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={fetchStatus}>
            retry connection
          </button>

          <button
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
            onClick={() => (onBack ? onBack() : null)}
            title="return to main dashboard"
          >
            back to dashboard
          </button>
        </div>
      </section>

      <footer
        style={{
          marginTop: "1rem",
          borderTop: "1px solid #ccc",
          backgroundColor: statusInfo.connected ? "#eaffea" : "#ffecec",
          borderRadius: "4px",
          padding: "0.5rem",
          fontSize: "0.8rem",
          lineHeight: 1.4,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <strong>Status </strong>
          {statusInfo.connected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
        <div>{statusInfo.message}</div>
        <div>{statusInfo.serial_number}</div>
        <div>Last check {statusInfo.last_check}</div>
      </footer>
    </div>
  )
}
