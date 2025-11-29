import { useEffect, useState } from "react"

/*
  system status page with focused health snapshot
  shows last check connection status and recovery controls
*/
export default function SystemStatus({ onBack }) {
  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "loading status...",
    serial_number: "",
    last_check: "",
  })
  const [isChecking, setIsChecking] = useState(false)

  async function fetchStatus() {
    try {
      setIsChecking(true)
      const res = await fetch("/api/status")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setStatusInfo({
        connected: body.connected,
        message: body.message,
        serial_number: body.serial_number,
        last_check: body.last_check,
      })
    } catch {
      setStatusInfo(prev => ({
        ...prev,
        connected: false,
        message: "unable to reach microservice",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  function renderConnectionCard() {
    const badgeColor = statusInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = statusInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = statusInfo.connected ? "connected" : "disconnected"

    return (
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#ffffff",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.25rem" }}>connection</div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>{statusInfo.message}</div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.5rem",
              borderRadius: 9999,
              backgroundColor: badgeBg,
              color: badgeColor,
              fontSize: "0.75rem",
              border: `1px solid ${badgeColor}`,
            }}
          >
            {label}
          </span>
        </div>

        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
          last check {statusInfo.last_check || "pending"}
        </div>
      </section>
    )
  }

  function renderMetaCard() {
    return (
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#f9fafb",
          marginBottom: "0.75rem",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ marginBottom: "0.25rem" }}>
          <strong>device serial </strong>
          {statusInfo.serial_number || "not reported"}
        </div>
        <p style={{ marginTop: "0.25rem", marginBottom: 0, maxWidth: "60ch", color: "#64748b" }}>
          this page is useful during debugging sessions and in your video to show that the dashboard is reaching
          the stats microservice as a separate process instead of a direct function call
        </p>
      </section>
    )
  }

  function renderControls() {
    return (
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginTop: "0.25rem",
        }}
      >
        <button
          onClick={fetchStatus}
          disabled={isChecking}
          style={{
            padding: "0.3rem 0.8rem",
            borderRadius: 4,
            border: "1px solid #2563eb",
            backgroundColor: isChecking ? "#eff6ff" : "#2563eb",
            color: isChecking ? "#2563eb" : "#ffffff",
            fontSize: "0.85rem",
            cursor: isChecking ? "default" : "pointer",
          }}
        >
          {isChecking ? "checking…" : "retry check"}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            back to dashboard
          </button>
        )}
      </section>
    )
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
        padding: "0.5rem 0 1.5rem 0",
        width: "100%",
      }}
    >
      <header style={{ marginBottom: "1rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.2rem",
            lineHeight: 1.3,
            fontWeight: 600,
            color: statusInfo.connected ? "#0f172a" : "#b91c1c",
          }}
        >
          system status
        </h1>
        <div style={{ fontSize: "0.9rem", color: "#222", marginTop: "0.25rem", lineHeight: 1.45 }}>
          shows whether the dashboard can reach the statistics microservice
          includes retry and navigation controls for recovering from transient failures
        </div>
      </header>

      {renderConnectionCard()}
      {renderMetaCard()}
      {renderControls()}
    </div>
  )
}
