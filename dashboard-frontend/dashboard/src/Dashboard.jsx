import { useEffect, useState, useRef } from "react"

/*
  dashboard surface for live data and rolling stats
  implements 5 hz polling on demand generation guarded resets and keyboard affordances
  comments avoid periods and include a few minor typos intentionally
*/
export default function Dashboard() {
  // live data state
  const [latestPoint, setLatestPoint] = useState(null)
  const [dataHistory, setDataHistory] = useState([])

  // rolling statistics state
  const [stats, setStats] = useState(null)

  // connectivity and status
  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status...",
    serial_number: "",
    last_check: "",
  })

  // ui flags
  const [autoStream, setAutoStream] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [explicitStepView, setExplicitStepView] = useState(true)

  // error banners
  const [genError, setGenError] = useState(null)
  const [statsError, setStatsError] = useState(null)

  // visual refresh indicator
  const [lastUpdated, setLastUpdated] = useState(null)

  // polling control
  const pollIntervalRef = useRef(null)

  // util fetch with timeout for responsive behavior
  function timeoutFetch(resource, options = {}, ms = 3000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), ms)
    return fetch(resource, { ...options, signal: controller.signal }).finally(() => clearTimeout(id))
  }

  // status retrival with fallback
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

  // acquire a single new reading and update buffers
  async function fetchDataPoint() {
    try {
      const res = await fetch("/api/data")
      const body = await res.json()
      if (body.status === "ok") {
        setLatestPoint(body.data)
        setDataHistory(prev => [body.data, ...prev].slice(0, 200))
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch {
      // tolerate brief misses and resume pooling automatically
    }
  }

  // retrieve rolling statistics snapshot
  async function fetchStats() {
    try {
      const res = await fetch("/api/stats")
      const body = await res.json()
      if (body.status === "ok") setStats({ ...body.stats, last_updated: body.last_updated })
    } catch {
      // non blocking panel shows placeholders until data arrives
    }
  }

  // on demand generation with timeout and retry
  async function handleGenerateData() {
    setGenError(null)
    try {
      const res = await timeoutFetch("/api/generate", { method: "POST" }, 3000)
      if (!res.ok) throw new Error("generator bad status")
      const body = await res.json()
      if (body.status !== "ok") throw new Error("generator non ok")
      setLatestPoint(body.data)
      setDataHistory(prev => [body.data, ...prev].slice(0, 200))
      setLastUpdated(new Date().toLocaleTimeString())
    } catch {
      setGenError("Generator unavailable Please retry")
    }
  }

  // compute stats with threshold and retry path
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

  // manual refresh for paused mode
  function handleManualRefresh() {
    fetchStatus()
    fetchStats()
    fetchDataPoint()
  }

  // confirm driven reset to prevent unintended destructive actions
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
      closeResetConfirm()
    } catch {
      // modal remains open operator may retry or cancel
    }
  }

  // keyboard affordance enter refreshes once when paused or computes when threshold met
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Enter") {
        if (!autoStream) handleManualRefresh()
        else if ((stats?.count ?? 0) >= 30) handleComputeStats()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [autoStream, stats])

  // 5 hz polling loop for live data status and stats
  useEffect(() => {
    fetchStatus()
    fetchStats()
    fetchDataPoint()

    if (autoStream) {
      pollIntervalRef.current = setInterval(() => {
        fetchStatus()
        fetchStats()
        fetchDataPoint()
      }, 200)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [autoStream])

  // small pill label component
  function Pill({ children, color = "#111", bg = "#eef4ff" }) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.15rem 0.5rem",
          borderRadius: 999,
          background: bg,
          color,
          fontSize: "0.75rem",
          border: "1px solid #cbd5ff",
        }}
      >
        {children}
      </span>
    )
  }

  // status footer with basic conectivity info
  function renderStatusBar() {
    return (
      <div
        style={{
          borderTop: "1px solid #ccc",
          padding: "0.5rem",
          fontSize: "0.9rem",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          backgroundColor: statusInfo.connected ? "#eaffea" : "#ffecec",
        }}
      >
        <div>
          <strong>Status </strong>
          {statusInfo.connected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
        <div>{statusInfo.message}</div>
        <div>{statusInfo.serial_number}</div>
        <div>Last check {statusInfo.last_check}</div>
      </div>
    )
  }

  // guided steps strip for explicit task path
  function renderGuidedSteps() {
    if (!explicitStepView) return null
    return (
      <div
        style={{
          background: "#f5f5f5",
          border: "1px solid #ccc",
          borderRadius: "4px",
          marginBottom: "1rem",
          padding: "0.75rem",
          fontSize: "0.9rem",
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>what this dashboard does</div>
        <div>• monitors live test data and shows rolling statistics computed by a microservice</div>
        <div>• step 1 check connection step 2 watch incoming values step 3 review statistics</div>
        <div>• pause to inspect values resume live mode or reset for a fresh window</div>
        <button style={{ marginTop: "0.5rem", fontSize: "0.8rem" }} onClick={() => setExplicitStepView(false)}>
          hide instructions
        </button>
      </div>
    )
  }

  // control cluster including pause resume retry and compute actions
  function renderControls() {
    const count = stats?.count ?? 0
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setAutoStream(false)} disabled={!autoStream}>
          pause stream
        </button>
        <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setAutoStream(true)} disabled={autoStream}>
          resume stream
        </button>
        {!autoStream && (
          <button
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
            onClick={handleManualRefresh}
            title="enter key triggers this action when paused"
          >
            refresh once
          </button>
        )}
        <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={fetchStatus}>
          retry connection
        </button>
        <button style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setExplicitStepView(true)}>
          show instructions
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
            onClick={handleGenerateData}
            title="may take up to 3 seconds"
          >
            generate data
          </button>
          <Pill>may take up to 3s</Pill>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
            onClick={handleComputeStats}
            disabled={count < 30}
            title="requires at least 30 samples enter also triggers"
          >
            compute rolling stats
          </button>
          <Pill bg="#e8fff1" color="#0a5">requires ≥ 30 pts</Pill>
        </div>
      </div>
    )
  }

  // error banners with retry ctas
  function renderErrors() {
    if (!genError && !statsError) return null
    return (
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
        {genError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>• {genError}</span>
            <button style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }} onClick={handleGenerateData}>
              retry
            </button>
          </div>
        )}
        {statsError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>• {statsError}</span>
            <button style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }} onClick={handleComputeStats}>
              retry
            </button>
          </div>
        )}
      </div>
    )
  }

  // live data panel newest first
  function renderLiveData() {
    return (
      <div style={{ flex: 1, minWidth: "260px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
          live data <span style={{ fontWeight: 400, fontSize: "0.8rem" }}>(newest first)</span>
        </div>
        <div style={{ fontSize: "0.75rem", color: "#333", marginBottom: 6 }}>
          last updated <strong>{lastUpdated ?? "—"}</strong>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th style={{ border: "1px solid #ccc", textAlign: "left", padding: "0.25rem" }}>sensor id</th>
              <th style={{ border: "1px solid #ccc", textAlign: "left", padding: "0.25rem" }}>value</th>
              <th style={{ border: "1px solid #ccc", textAlign: "left", padding: "0.25rem" }}>timestamp</th>
            </tr>
          </thead>
          <tbody>
            {dataHistory.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ border: "1px solid #ccc", padding: "0.5rem", fontStyle: "italic", color: "#333" }}>
                  (no data yet)
                </td>
              </tr>
            ) : (
              dataHistory.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: "0.25rem", fontFamily: "monospace" }}>{row.sensor_id}</td>
                  <td style={{ border: "1px solid #ccc", padding: "0.25rem", fontFamily: "monospace" }}>{row.value}</td>
                  <td style={{ border: "1px solid #ccc", padding: "0.25rem", fontFamily: "monospace" }}>{row.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // rolling statistics panel with details and reset
  function renderStats() {
    const count = stats?.count ?? 0
    return (
      <div style={{ flex: 1, minWidth: "260px", borderLeft: "1px solid #ccc", paddingLeft: "1rem", marginLeft: "1rem" }}>
        <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>rolling statistics</div>
        <div style={{ fontSize: "0.75rem", color: "#333", marginBottom: 6 }}>
          samples buffered <strong>{count}</strong> | server updated <strong>{stats?.last_updated ?? "—"}</strong>
        </div>

        {stats ? (
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
            <div><strong>mean</strong> {stats.mean ?? "—"}</div>
            <div><strong>min</strong> {stats.min ?? "—"}</div>
            <div><strong>max</strong> {stats.max ?? "—"}</div>
            <div><strong>std dev</strong> {stats.std_dev ?? "—"}</div>

            {showDetails ? (
              <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#f9f9f9", border: "1px solid #ccc", borderRadius: "4px" }}>
                <div style={{ fontWeight: "bold" }}>detailed notes</div>
                <div style={{ fontSize: "0.8rem", color: "#222" }}>
                  compute rolling stats requires at least 30 samples reset clears the window
                </div>
                <button style={{ marginTop: "0.5rem", fontSize: "0.8rem" }} onClick={() => setShowDetails(false)}>
                  hide details
                </button>
              </div>
            ) : (
              <button style={{ marginTop: "0.5rem", fontSize: "0.8rem" }} onClick={() => setShowDetails(true)}>
                view details
              </button>
            )}

            <button
              style={{ marginTop: "0.75rem", padding: "0.4rem 0.6rem", fontSize: "0.8rem", backgroundColor: "#fff5f5", border: "1px solid #cc0000", color: "#cc0000" }}
              onClick={openResetConfirm}
              title="clears the current statistics window"
            >
              reset statistics
            </button>
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#333", fontStyle: "italic" }}>(no statistics yet)</div>
        )}
      </div>
    )
  }

  // confirmation modal for reset
  function renderResetModal() {
    if (!showResetConfirm) return null
    return (
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
          <div style={{ fontSize: "0.85rem", color: "#222" }}>
            this clears existing averages and starts fresh using only new readings
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
    )
  }

  // main layout
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#111", backgroundColor: "#fff", padding: "1rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", lineHeight: 1.3, fontWeight: 600 }}>real time test dashboard</h1>
        <div style={{ fontSize: "0.9rem", color: "#222", marginTop: "0.25rem", maxWidth: "60ch", lineHeight: 1.45 }}>
          monitor live sensor data and compute rolling statistics in real time pause to inspect values resume live mode or reset the statistics window
        </div>
      </header>

      {renderGuidedSteps()}
      {renderErrors()}
      {renderControls()}

      <main
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "1rem",
          backgroundColor: "#fafafa",
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
