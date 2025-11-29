import { useEffect, useState, useRef } from "react"

/*
  primary dashboard view for live data and rolling statistics
  pulls status, statistics, and a synthetic sensor stream from the backend microservice
*/
export default function Dashboard() {
  const [latestPoint, setLatestPoint] = useState(null)
  const [dataHistory, setDataHistory] = useState([])

  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)

  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status...",
    serial_number: "",
    last_check: "",
  })

  const [autoStream, setAutoStream] = useState(true)
  const [isComputing, setIsComputing] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const pollIntervalRef = useRef(null)

  async function fetchWithTimeout(resource, options = {}, ms = 2000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), ms)
    try {
      const response = await fetch(resource, { ...options, signal: controller.signal })
      return response
    } finally {
      clearTimeout(id)
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetchWithTimeout("/api/status")
      if (!res.ok) throw new Error("Status fetch failed")
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
        message: "Unable to reach microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    }
  }

  async function fetchStats() {
    try {
      const res = await fetchWithTimeout("/api/stats")
      if (!res.ok) throw new Error("Stats fetch failed")
      const body = await res.json()
      if (body.status === "ok") {
        setStats({
          ...body.stats,
          last_updated: body.last_updated,
        })
        setStatsError(null)
      } else {
        setStats(null)
        setStatsError(body.message || "Statistics are not currently available.")
      }
    } catch {
      setStatsError("Failed to fetch statistics.")
    }
  }

  async function fetchDataPoint() {
    try {
      const res = await fetchWithTimeout("/api/data")
      if (!res.ok) throw new Error("Data fetch failed")
      const body = await res.json()
      if (body.status === "ok") {
        setLatestPoint(body.data)
        setDataHistory(prev => [body.data, ...prev].slice(0, 200))
      }
    } catch {
      // non-fatal; the panel will simply pause updates until the next successful request
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchStats()
    fetchDataPoint()
  }, [])

  useEffect(() => {
    if (autoStream) {
      pollIntervalRef.current = setInterval(() => {
        fetchStatus()
        fetchStats()
        fetchDataPoint()
      }, 200)
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [autoStream])

  function handleToggleStream() {
    setAutoStream(prev => !prev)
  }

  async function handleComputeStats() {
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
      await fetchWithTimeout("/api/reset", { method: "POST" })
      setDataHistory([])
      setStats(null)
      await fetchStats()
    } catch {
      // the user can retry the reset if it fails
    } finally {
      closeResetConfirm()
    }
  }

  function renderGuidedSteps() {
    return (
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
        }}
      >
        <span style={{ fontWeight: 600 }}>Quick Tour</span>
        <span>• Watch live samples update in the left panel.</span>
        <span>• Monitor rolling statistics in the right panel.</span>
        <span>• Pause streaming to inspect specific values.</span>
        <span>• Reset the window when starting a new test run.</span>
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
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <button
          onClick={handleToggleStream}
          style={{
            padding: "0.35rem 0.9rem",
            borderRadius: 4,
            border: "1px solid #0f172a",
            backgroundColor: autoStream ? "#0f172a" : "#ffffff",
            color: autoStream ? "#ffffff" : "#0f172a",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {autoStream ? "Pause Live Stream" : "Resume Live Stream"}
        </button>

        <button
          onClick={handleComputeStats}
          disabled={isComputing}
          style={{
            padding: "0.35rem 0.9rem",
            borderRadius: 4,
            border: "1px solid #2563eb",
            backgroundColor: isComputing ? "#eff6ff" : "#2563eb",
            color: isComputing ? "#2563eb" : "#ffffff",
            fontSize: "0.85rem",
            cursor: isComputing ? "default" : "pointer",
            fontWeight: 500,
          }}
        >
          {isComputing ? "Computing…" : "Compute Statistics Now"}
        </button>

        <button
          onClick={openResetConfirm}
          style={{
            padding: "0.35rem 0.9rem",
            borderRadius: 4,
            border: "1px solid #b91c1c",
            backgroundColor: "#ffffff",
            color: "#b91c1c",
            fontSize: "0.85rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Reset Statistics Window
        </button>
      </section>
    )
  }

  function renderErrors() {
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

  function renderLiveData() {
    return (
      <section
        style={{
          flex: "1 1 260px",
          marginRight: "1rem",
          minWidth: 0,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Live Sensor Data
        </h2>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            minHeight: "120px",
            fontSize: "0.85rem",
          }}
        >
          {latestPoint ? (
            <>
              <div>
                <strong>Timestamp: </strong>
                {latestPoint.timestamp}
              </div>
              <div>
                <strong>Value: </strong>
                {latestPoint.value}
              </div>
              <div>
                <strong>Sequence: </strong>
                {latestPoint.sequence}
              </div>
            </>
          ) : (
            <div>Waiting for the first data point…</div>
          )}
        </div>

        <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
          Showing the latest {dataHistory.length} samples (most recent first).
        </div>
      </section>
    )
  }

  function renderStats() {
    return (
      <section
        style={{
          flex: "1 1 260px",
          minWidth: 0,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Rolling Statistics
        </h2>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            minHeight: "120px",
            fontSize: "0.85rem",
          }}
        >
          {stats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Mean</div>
                <div style={{ fontWeight: 600 }}>{stats.mean}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Minimum</div>
                <div style={{ fontWeight: 600 }}>{stats.min}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Maximum</div>
                <div style={{ fontWeight: 600 }}>{stats.max}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Standard Deviation</div>
                <div style={{ fontWeight: 600 }}>{stats.stddev}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Sample Count</div>
                <div style={{ fontWeight: 600 }}>{stats.count}</div>
              </div>
            </div>
          ) : (
            <div>Statistics will appear once the rolling window has enough samples.</div>
          )}
        </div>

        {stats?.last_updated && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#64748b" }}>
            Last updated {stats.last_updated}.
          </div>
        )}
      </section>
    )
  }

  function renderStatusBar() {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "#475569",
          paddingTop: "0.5rem",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div>
          <strong>Service: </strong>
          {statusInfo.connected ? "Online" : "Offline"}
        </div>
        <div>{statusInfo.message}</div>
        <div>{statusInfo.serial_number}</div>
        <div>Last check {statusInfo.last_check}</div>
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
          <h2 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>Reset Statistics Window</h2>
          <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            This clears the current rolling window and starts collecting a fresh set of samples.
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
              Cancel
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
              Confirm Reset
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
      <header style={{ marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.3, fontWeight: 600 }}>
          Real-Time Test Dashboard
        </h2>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#475569",
            marginTop: "0.25rem",
            maxWidth: "60ch",
            lineHeight: 1.45,
          }}
        >
          Monitor live sensor data and rolling statistics from the backend microservice. Pause the stream to inspect
          individual values, or reset the statistics window when starting a new test run.
        </div>
      </header>

      {renderGuidedSteps()}
      {renderControls()}
      {renderErrors()}

      <main
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "1rem",
          backgroundColor: "#f9fafb",
          gap: "0.5rem",
        }}
      >
        {renderLiveData()}
        {renderStats()}
      </main>

      <footer style={{ marginTop: "1rem" }}>{renderStatusBar()}</footer>
      {renderResetModal()}
    </div>
  )
}
