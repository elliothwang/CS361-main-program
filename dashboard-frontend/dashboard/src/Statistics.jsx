import { useEffect, useState } from "react"

/*
  statistics view for current rolling calculations
  shows mean min max and standard deviation with optional explanations
  guarded reset and optional compute action with timeout and retry provided
*/
export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [statsError, setStatsError] = useState(null)

  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status...",
    serial_number: "",
    last_check: "",
  })

  function timeoutFetch(resource, options = {}, ms = 2000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), ms)
    return fetch(resource, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats")
      const body = await res.json()
      if (body.status === "ok") setStats({ ...body.stats, last_updated: body.last_updated })
    } catch {
      // non fatal the section remains readable
    }
  }

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
        message: "Unable to reach microservice.",
        serial_number: "S/N: 1234567890",
        last_check: new Date().toLocaleTimeString(),
      })
    }
  }

  useEffect(() => {
    fetchStats()
    fetchStatus()
  }, [])

  function openResetConfirm() {
    setShowResetConfirm(true)
  }
  function closeResetConfirm() {
    setShowResetConfirm(false)
  }

  async function confirmReset() {
    try {
      await fetch("/api/reset", { method: "POST" })
      fetchStats()
    } catch {
      // modal remains open operator may retry or cancel
    }
    closeResetConfirm()
  }

  async function handleComputeStats() {
    setStatsError(null)
    try {
      const res = await timeoutFetch("/api/stats", {}, 2000)
      if (!res.ok) throw new Error("stats bad status")
      const body = await res.json()
      if (body.status !== "ok") throw new Error("stats non ok")
      setStats({ ...body.stats, last_updated: body.last_updated })
    } catch {
      setStatsError("Stats service timeout Please retry")
    }
  }

  const count = stats?.count ?? 0

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#111", backgroundColor: "#fff", padding: "1rem", maxWidth: "700px", margin: "0 auto" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.2rem", lineHeight: 1.3, fontWeight: "600" }}>rolling statistics</h1>
        <div style={{ fontSize: "0.9rem", color: "#222", marginTop: "0.25rem", lineHeight: 1.45 }}>
          displays mean min max and standard deviation for the current data window compute enforces a 30 sample threshold and a 2 second timeout
        </div>
      </header>

      {statsError && (
        <div
          role="alert"
          style={{
            border: "1px solid #cc0000",
            background: "#fff5f5",
            color: "#7a0000",
            padding: "0.6rem 0.8rem",
            borderRadius: 6,
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>action needed</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>• {statsError}</span>
            <button style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }} onClick={handleComputeStats}>
              retry
            </button>
          </div>
        </div>
      )}

      <section
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "1rem",
          backgroundColor: "#fafafa",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>current statistics</div>

        {stats ? (
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
            <div><strong>mean</strong> {stats.mean ?? "—"}</div>
            <div><strong>min</strong> {stats.min ?? "—"}</div>
            <div><strong>max</strong> {stats.max ?? "—"}</div>
            <div><strong>std dev</strong> {stats.std_dev ?? "—"}</div>
            <div style={{ fontSize: "0.8rem", color: "#222" }}>count {stats.count ?? 0}</div>
            <div style={{ fontSize: "0.8rem", color: "#222" }}>last updated {stats.last_updated ?? "—"}</div>

            {showDetails ? (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fff", border: "1px solid #ccc", borderRadius: "4px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>detailed explanation</div>
                <div style={{ fontSize: "0.85rem", color: "#222" }}>
                  values reflect the last n samples in the rolling buffer reset clears the buffer window and begins computing from new readings
                </div>
                <button style={{ marginTop: "0.75rem", padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setShowDetails(false)}>
                  hide details
                </button>
              </div>
            ) : (
              <button style={{ marginTop: "0.75rem", padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setShowDetails(true)}>
                view details
              </button>
            )}

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", borderRadius: "4px" }}
                onClick={handleComputeStats}
                disabled={count < 30}
                title="requires at least 30 samples may take up to 2 seconds"
              >
                compute rolling stats
              </button>

              <button
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#fff5f5", border: "1px solid #cc0000", color: "#cc0000", borderRadius: "4px" }}
                onClick={openResetConfirm}
                title="clears the current statistics window"
              >
                reset statistics
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#333", fontStyle: "italic" }}>(no statistics yet)</div>
        )}
      </section>

      <footer
        style={{
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

      {showResetConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1rem",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "6px",
              border: "2px solid #cc0000",
              maxWidth: "360px",
              width: "100%",
              padding: "1rem",
              fontSize: "0.9rem",
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>reset rolling statistics</div>
            <div style={{ fontSize: "0.8rem", color: "#222" }}>
              clears the existing window and begins computing from new readings only
            </div>

            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={closeResetConfirm}>
                cancel
              </button>
              <button
                style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#fff5f5", border: "1px solid #cc0000", color: "#cc0000" }}
                onClick={confirmReset}
              >
                confirm reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
