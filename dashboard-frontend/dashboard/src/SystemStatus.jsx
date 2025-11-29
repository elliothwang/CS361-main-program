import { useEffect, useState } from "react"

/*
  system status view with health snapshot for core microservices
  surfaces connection, environment mode, and individual ms health
*/
export default function SystemStatus({ onBack }) {
  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status.",
    serial_number: "",
    last_check: "",
  })
  const [isChecking, setIsChecking] = useState(false)

  const [modeInfo, setModeInfo] = useState({
    mode: "test",
    message: "",
    last_updated: "",
  })
  const [isModeUpdating, setIsModeUpdating] = useState(false)

  const [authInfo, setAuthInfo] = useState({
    connected: true,
    message: "Loading authentication health.",
    last_check: "",
  })
  const [isAuthChecking, setIsAuthChecking] = useState(false)

  const [featureInfo, setFeatureInfo] = useState({
    connected: true,
    message: "Loading feature flag health.",
    last_check: "",
  })
  const [isFeatureChecking, setIsFeatureChecking] = useState(false)

  const [plotInfo, setPlotInfo] = useState({
    connected: true,
    message: "Loading plot service health.",
    last_check: "",
  })
  const [isPlotChecking, setIsPlotChecking] = useState(false)

  const [reportInfo, setReportInfo] = useState({
    connected: true,
    message: "Loading report compiler health.",
    last_check: "",
  })
  const [isReportChecking, setIsReportChecking] = useState(false)

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
        message: "Unable to reach statistics microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsChecking(false)
    }
  }

  async function fetchMode() {
    try {
      setIsModeUpdating(true)
      const res = await fetch("/api/mode")
      if (!res.ok) throw new Error()
      const body = await res.json()
      const modeValue = String(body.mode || "test").toLowerCase()
      setModeInfo({
        mode: modeValue,
        message: body.message || "",
        last_updated: new Date().toLocaleTimeString(),
      })
    } catch {
      setModeInfo(prev => ({
        ...prev,
        message: "Unable to load environment mode.",
      }))
    } finally {
      setIsModeUpdating(false)
    }
  }

  async function updateMode(nextMode) {
    try {
      setIsModeUpdating(true)
      const res = await fetch("/api/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      })
      const body = await res.json()
      if (res.ok) {
        const modeValue = String(body.mode || nextMode).toLowerCase()
        setModeInfo({
          mode: modeValue,
          message: body.message || "",
          last_updated: new Date().toLocaleTimeString(),
        })
      } else {
        setModeInfo(prev => ({
          ...prev,
          message: body.message || "Mode update failed.",
        }))
      }
    } catch {
      setModeInfo(prev => ({
        ...prev,
        message: "Feature flag service is not responding.",
      }))
    } finally {
      setIsModeUpdating(false)
    }
  }

  async function fetchAuthHealth() {
    try {
      setIsAuthChecking(true)
      const res = await fetch("/api/auth/health")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setAuthInfo({
        connected: body.connected ?? true,
        message: body.message || "Authentication service is healthy.",
        last_check: new Date().toLocaleTimeString(),
      })
    } catch {
      setAuthInfo(prev => ({
        ...prev,
        connected: false,
        message: "Unable to reach authentication microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsAuthChecking(false)
    }
  }

  async function fetchFeatureHealth() {
    try {
      setIsFeatureChecking(true)
      const res = await fetch("/api/feature-flags/health")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setFeatureInfo({
        connected: body.connected ?? true,
        message:
          body.message || "Feature flag service is responding normally.",
        last_check: new Date().toLocaleTimeString(),
      })
    } catch {
      setFeatureInfo(prev => ({
        ...prev,
        connected: false,
        message: "Unable to reach feature flag microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsFeatureChecking(false)
    }
  }

  async function fetchPlotHealth() {
    try {
      setIsPlotChecking(true)
      const res = await fetch("/api/plots/health")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setPlotInfo({
        connected: body.connected ?? true,
        message:
          body.message || "Data plot visualizer microservice is healthy.",
        last_check: new Date().toLocaleTimeString(),
      })
    } catch {
      setPlotInfo(prev => ({
        ...prev,
        connected: false,
        message: "Unable to reach data plot visualizer microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsPlotChecking(false)
    }
  }

  async function fetchReportHealth() {
    try {
      setIsReportChecking(true)
      const res = await fetch("/api/report/health")
      if (!res.ok) throw new Error()
      const body = await res.json()
      setReportInfo({
        connected: body.connected ?? true,
        message:
          body.message || "Report compiler microservice is healthy.",
        last_check: new Date().toLocaleTimeString(),
      })
    } catch {
      setReportInfo(prev => ({
        ...prev,
        connected: false,
        message: "Unable to reach report compiler microservice.",
        last_check: new Date().toLocaleTimeString(),
      }))
    } finally {
      setIsReportChecking(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchMode()
    fetchAuthHealth()
    fetchFeatureHealth()
    fetchPlotHealth()
    fetchReportHealth()
  }, [])

  function renderConnectionCard() {
    const badgeColor = statusInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = statusInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = statusInfo.connected ? "Connected" : "Disconnected"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Statistics Microservice
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {statusInfo.message}
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
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

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          Last check {statusInfo.last_check || "pending"}.
        </div>
      </section>
    )
  }

  function renderModeCard() {
    const mode = modeInfo.mode === "production" ? "Production" : "Test"
    const isTest = modeInfo.mode !== "production"

    const badgeColor = isTest ? "#0f172a" : "#0e7490"
    const badgeBg = isTest ? "#e5e7eb" : "#e0f2fe"

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Environment Mode
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>{mode}</div>
            {modeInfo.message && (
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                {modeInfo.message}
              </div>
            )}
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
              borderRadius: 9999,
              backgroundColor: badgeBg,
              color: badgeColor,
              fontSize: "0.75rem",
              border: `1px solid ${badgeColor}`,
            }}
          >
            {isTest ? "Test Mode" : "Production Mode"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.25rem",
          }}
        >
          <button
            onClick={() => updateMode("test")}
            disabled={isModeUpdating || modeInfo.mode === "test"}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              backgroundColor:
                modeInfo.mode === "test" ? "#0f172a" : "#ffffff",
              color: modeInfo.mode === "test" ? "#ffffff" : "#0f172a",
              fontSize: "0.8rem",
              cursor:
                isModeUpdating || modeInfo.mode === "test"
                  ? "default"
                  : "pointer",
            }}
          >
            {isModeUpdating && modeInfo.mode !== "test"
              ? "Updating…"
              : "Set Test Mode"}
          </button>
          <button
            onClick={() => updateMode("production")}
            disabled={isModeUpdating || modeInfo.mode === "production"}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #0e7490",
              backgroundColor:
                modeInfo.mode === "production" ? "#0e7490" : "#ffffff",
              color: modeInfo.mode === "production" ? "#ffffff" : "#0e7490",
              fontSize: "0.8rem",
              cursor:
                isModeUpdating || modeInfo.mode === "production"
                  ? "default"
                  : "pointer",
            }}
          >
            {isModeUpdating && modeInfo.mode !== "production"
              ? "Updating…"
              : "Set Production Mode"}
          </button>
        </div>

        {modeInfo.last_updated && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.8rem",
              color: "#64748b",
            }}
          >
            Last mode update {modeInfo.last_updated}.
          </div>
        )}
      </section>
    )
  }

  function renderAuthCard() {
    const badgeColor = authInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = authInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = authInfo.connected ? "Online" : "Offline"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Authentication Microservice
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {authInfo.message}
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
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

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          Last check {authInfo.last_check || "pending"}.
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={fetchAuthHealth}
            disabled={isAuthChecking}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isAuthChecking ? "#eff6ff" : "#2563eb",
              color: isAuthChecking ? "#2563eb" : "#ffffff",
              fontSize: "0.8rem",
              cursor: isAuthChecking ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isAuthChecking ? "Checking…" : "Refresh Auth Health"}
          </button>
        </div>
      </section>
    )
  }

  function renderFeatureCard() {
    const badgeColor = featureInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = featureInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = featureInfo.connected ? "Online" : "Offline"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Feature Flag Microservice
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {featureInfo.message}
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
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

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          Last check {featureInfo.last_check || "pending"}.
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={fetchFeatureHealth}
            disabled={isFeatureChecking}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isFeatureChecking ? "#eff6ff" : "#2563eb",
              color: isFeatureChecking ? "#2563eb" : "#ffffff",
              fontSize: "0.8rem",
              cursor: isFeatureChecking ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isFeatureChecking ? "Checking…" : "Refresh Feature Flag Health"}
          </button>
        </div>
      </section>
    )
  }

  function renderPlotCard() {
    const badgeColor = plotInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = plotInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = plotInfo.connected ? "Online" : "Offline"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Data Plot Visualizer Microservice
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {plotInfo.message}
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
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

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          Last check {plotInfo.last_check || "pending"}.
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={fetchPlotHealth}
            disabled={isPlotChecking}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isPlotChecking ? "#eff6ff" : "#2563eb",
              color: isPlotChecking ? "#2563eb" : "#ffffff",
              fontSize: "0.8rem",
              cursor: isPlotChecking ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isPlotChecking ? "Checking…" : "Refresh Plot Service Health"}
          </button>
        </div>
      </section>
    )
  }

  function renderReportCard() {
    const badgeColor = reportInfo.connected ? "#16a34a" : "#b91c1c"
    const badgeBg = reportInfo.connected ? "#dcfce7" : "#fee2e2"
    const label = reportInfo.connected ? "Online" : "Offline"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              Report Compiler Microservice
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {reportInfo.message}
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "0.15rem 0.6rem",
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

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          Last check {reportInfo.last_check || "pending"}.
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            onClick={fetchReportHealth}
            disabled={isReportChecking}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isReportChecking ? "#eff6ff" : "#2563eb",
              color: isReportChecking ? "#2563eb" : "#ffffff",
              fontSize: "0.8rem",
              cursor: isReportChecking ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isReportChecking ? "Checking…" : "Refresh Report Health"}
          </button>
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
          <strong>Device Serial: </strong>
          {statusInfo.serial_number || "Not reported"}
        </div>
        <p
          style={{
            marginTop: "0.25rem",
            marginBottom: 0,
            maxWidth: "60ch",
            color: "#64748b",
          }}
        >
          This view is useful in debugging sessions and in the demo video to
          show that the dashboard is reaching the microservices as separate
          processes, rather than calling service code directly.
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
            padding: "0.35rem 0.9rem",
            borderRadius: 4,
            border: "1px solid #2563eb",
            backgroundColor: isChecking ? "#eff6ff" : "#2563eb",
            color: isChecking ? "#2563eb" : "#ffffff",
            fontSize: "0.85rem",
            cursor: isChecking ? "default" : "pointer",
            fontWeight: 500,
          }}
        >
          {isChecking ? "Checking…" : "Retry Statistics Check"}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Back to Dashboard
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
        <h2
          style={{
            margin: 0,
            fontSize: "1.2rem",
            lineHeight: 1.3,
            fontWeight: 600,
          }}
        >
          System Status
        </h2>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#475569",
            marginTop: "0.25rem",
            lineHeight: 1.45,
          }}
        >
          Review the health of the statistics, feature flag, authentication,
          data plot visualizer.
        </div>
      </header>

      {renderConnectionCard()}
      {renderModeCard()}
      {renderAuthCard()}
      {renderFeatureCard()}
      {renderPlotCard()}
      {renderReportCard()}
      {renderMetaCard()}
      {renderControls()}
    </div>
  )
}
