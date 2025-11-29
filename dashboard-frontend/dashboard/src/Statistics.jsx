import { useEffect, useState } from "react"

/*
  statistics view for the rolling window
  focused read only panel that surfaces mean min max std dev and sample count with reset controls
*/
export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)
  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "loading status...",
    last_check: "",
  })
  const [showDetails, setShowDetails] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isComputing, setIsComputing] = useState(false)

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setStatusInfo({
        connected: body.connected,
        message: body.message,
        last_check: body.last_check,
      })
    } catch {
      setStatusInfo(prev => ({
        ...prev,
        connected: false,
        message: "unable to reach microservice",
        last_check: new Date().toLocaleTimeString(),
      }))
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats")
      if (!res.ok) throw new Error()
      const body = await res.json()
      if (body.status === "ok") {
        setStats({
          ...body.stats,
          last_updated: body.last_updated,
        })
        setStatsError(null)
      } else {
        setStats(null)
        setStatsError(body.message || "statistics not available")
      }
    } catch {
      setStatsError("failed to fetch statistics")
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchStats()
  }, [])

  async function handleComputeNow() {
    setIsComputing(true)
    setStatsError(null)
    try {
      await fetchStats()
    } finally {
      setIsComputing(false)
    }
  }

  function openResetConfirm() {
    setShowResetConfirm(true)
  }

  function closeResetConfirm() {
    setShowResetConfirm(false)
  }

  async function confirmReset() {
    try {
      await fetch("/api/reset", { method: "POST" })
      setStats(null)
      await fetchStats()
    } catch {
      setStatsError("reset failed please retry")
    } finally {
      closeResetConfirm()
    }
  }

  function renderStatusBanner() {
    return (
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: statusInfo.connected ? "#f9fafb" : "#fef2f2",
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
        }}
      >
        <div style={{ marginBottom: "0.25rem" }}>
          <strong>service </strong>
          {statusInfo.connected ? "online" : "offline"}
        </div>
        <div>{statusInfo.message}</div>
        <div style={{ marginTop: "0.25rem", color: "#64748b" }}>last check {statusInfo.last_check}</div>
      </section>
    )
  }

  function renderSummaryCards() {
    if (!stats) return <div>statistics will appear once the window is populated</div>

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>mean</div>
          <div style={{ fontWeight: 600 }}>{stats.mean}</div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>min</div>
          <div style={{ fontWeight: 600 }}>{stats.min}</div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>max</div>
          <div style={{ fontWeight: 600 }}>{stats.max}</div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>std dev</div>
          <div style={{ fontWeight: 600 }}>{stats.stddev}</div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>samples</div>
          <div style={{ fontWeight: 600 }}>{stats.count}</div>
        </div>
      </div>
    )
  }

  function renderMeta() {
    if (!stats) return null
    return (
      <section style={{ fontSize: "0.8rem", color: "#64748b" }}>
        <div>last updated {stats.last_updated}</div>
        <button
          onClick={() => setShowDetails(prev => !prev)}
          style={{
            marginTop: "0.5rem",
            padding: "0.2rem 0.6rem",
            borderRadius: 4,
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {showDetails ? "hide explanation" : "show explanation"}
        </button>
        {showDetails && (
          <p style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            the microservice keeps a rolling window of recent samples and reports the aggregate metrics here
            this helps confirm the signal is stable before committing a test run
          </p>
        )}
      </section>
    )
  }

  function renderError() {
    if (!statsError) return null
    return (
      <div
        style={{
          border: "1px solid #b91c1c",
          backgroundColor: "#fef2f2",
          color: "#7f1d1d",
          padding: "0.5rem 0.75rem",
          borderRadius: 4,
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
        }}
      >
        {statsError}
      </div>
    )
  }

  function renderResetModal() {
    if (!showResetConfirm) return null
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15,23,42,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 40,
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 6,
            padding: "1rem",
            width: "100%",
            maxWidth: 360,
            boxShadow: "0 10px 25px rgba(15,23,42,0.3)",
            fontSize: "0.9rem",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>reset statistics window</h2>
          <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            this will clear the current rolling window and start collecting a fresh set of samples
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              onClick={closeResetConfirm}
              style={{
                padding: "0.3rem 0.8rem",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              cancel
            </button>
            <button
              onClick={confirmReset}
              style={{
                padding: "0.3rem 0.8rem",
                borderRadius: 4,
                border: "1px solid #b91c1c",
                backgroundColor: "#b91c1c",
                color: "#ffffff",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              confirm reset
            </button>
          </div>
        </div>
      </div>
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
        <h1 style={{ margin: 0, fontSize: "1.2rem", lineHeight: 1.3, fontWeight: 600 }}>rolling statistics</h1>
        <div style={{ fontSize: "0.9rem", color: "#222", marginTop: "0.25rem", lineHeight: 1.45 }}>
          displays the current rolling mean min max and standard deviation for the sensor stream
          use this view to verify stability before generating full reports
        </div>
      </header>

      {renderStatusBanner()}

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
        {renderSummaryCards()}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            onClick={handleComputeNow}
            disabled={isComputing}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isComputing ? "#eff6ff" : "#2563eb",
              color: isComputing ? "#2563eb" : "#ffffff",
              fontSize: "0.85rem",
              cursor: isComputing ? "default" : "pointer",
            }}
          >
            {isComputing ? "computing…" : "compute stats now"}
          </button>

          <button
            onClick={openResetConfirm}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #b91c1c",
              backgroundColor: "#ffffff",
              color: "#b91c1c",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            reset statistics window
          </button>
        </div>
      </section>

      {renderError()}
      {renderMeta()}
      {renderResetModal()}
    </div>
  )
}
