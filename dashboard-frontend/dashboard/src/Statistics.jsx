import { useEffect, useState } from "react"

/*
  statistics view for the rolling window and summary outputs
  surfaces aggregate metrics, plot generation, and report compilation
*/
export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(null)

  const [statusInfo, setStatusInfo] = useState({
    connected: true,
    message: "Loading status.",
    last_check: "",
  })
  const [showDetails, setShowDetails] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isComputing, setIsComputing] = useState(false)

  const [isGeneratingPlot, setIsGeneratingPlot] = useState(false)
  const [plotId, setPlotId] = useState(null)
  const [plotStatus, setPlotStatus] = useState("")
  const [plotError, setPlotError] = useState(null)

  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportPayload, setReportPayload] = useState(null)
  const [reportStatus, setReportStatus] = useState("")
  const [reportError, setReportError] = useState(null)

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
        message: "Unable to reach statistics microservice.",
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
        setStatsError(body.message || "Statistics are not currently available.")
      }
    } catch {
      setStatsError("Failed to fetch statistics.")
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
      setStatsError("Reset failed. Please try again.")
    } finally {
      closeResetConfirm()
    }
  }

  async function handleGeneratePlot() {
    setIsGeneratingPlot(true)
    setPlotError(null)
    setPlotStatus("")
    setPlotId(null)

    try {
      const baseMean =
        stats && typeof stats.mean === "number" ? stats.mean : 0.32
      const sampleCount = 20
      const y = Array.from({ length: sampleCount }, () =>
        Number(
          (baseMean + (Math.random() - 0.5) * 0.02)
            .toFixed(3)
        )
      )
      const x = Array.from({ length: sampleCount }, (_, idx) => idx + 1)

      const payload = {
        x,
        y,
        title: "Rolling window sample",
        xlabel: "Sample index",
        ylabel: "Sensor value",
      }

      const res = await fetch("/api/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json()

      if (res.ok && body.status === "ok" && body.plot_id) {
        setPlotId(body.plot_id)
        setPlotStatus("Plot generated successfully.")
      } else if (res.ok && body.status === "skipped") {
        setPlotStatus(
          body.message || "Plot generation skipped in test mode."
        )
      } else {
        setPlotError(body.message || "Plot generation failed.")
      }
    } catch {
      setPlotError("Plot generation request failed.")
    } finally {
      setIsGeneratingPlot(false)
    }
  }

  async function handleGenerateReport() {
    // must have stats or we have nothing meaningful to compile
    if (!stats) {
      setReportStatus("No statistics available to compile a report.")
      return
    }

    setIsGeneratingReport(true)
    setReportError(null)
    setReportStatus("")
    setReportPayload(null)

    // build the payload expected by the report compiler microservice
    const payload = {
      data: {
        stats: {
          mean: stats.mean ?? null,
          min: stats.min ?? null,
          max: stats.max ?? null,
          std: stats.stddev ?? null,
          sample_count: stats.count ?? null,
          // this assumes your /api/stats includes a "window" array;
          // if not, you can change this to [] or the correct field name
          window: stats.window ?? [],
        },
        plot: plotId
          ? {
              generated: true,
              plot_id: plotId,
              plot_url: `/api/plots/${plotId}`,
              description:
                "Rolling statistics plot generated by the data plot visualizer microservice.",
            }
          : {
              generated: false,
            },
        metadata: {
          generated_at: new Date().toISOString(),
          // if you ever track mode on the frontend, you can add:
          // mode: environmentMode,
        },
      },
    }

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json()

      if (res.ok && body.status === "ok" && body.report) {
        // store just the compiled report object
        setReportPayload(body.report)
        setReportStatus("Report generated successfully.")
      } else if (res.ok && body.status === "skipped") {
        setReportStatus(
          body.message || "Report generation skipped in test mode."
        )
      } else {
        setReportError(
          body.message || "Report generation failed."
        )
      }
    } catch {
      setReportError("Report generation request failed.")
    } finally {
      setIsGeneratingReport(false)
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
          <strong>Service: </strong>
          {statusInfo.connected ? "Online" : "Offline"}
        </div>
        <div>{statusInfo.message}</div>
        <div style={{ marginTop: "0.25rem", color: "#64748b" }}>
          Last check {statusInfo.last_check}
        </div>
      </section>
    )
  }

  function renderSummaryCards() {
    if (!stats)
      return (
        <div>
          Statistics will appear once the rolling window has enough samples.
        </div>
      )

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        {[
          { label: "Mean", value: stats.mean },
          { label: "Minimum", value: stats.min },
          { label: "Maximum", value: stats.max },
          { label: "Standard Deviation", value: stats.stddev },
          { label: "Sample Count", value: stats.count },
        ].map(card => (
          <div
            key={card.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              padding: "0.75rem",
              backgroundColor: "#ffffff",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginBottom: "0.25rem",
              }}
            >
              {card.label}
            </div>
            <div style={{ fontWeight: 600 }}>{card.value}</div>
          </div>
        ))}
      </div>
    )
  }

  function renderMeta() {
    if (!stats) return null
    return (
      <section style={{ fontSize: "0.8rem", color: "#64748b" }}>
        <div>Last updated {stats.last_updated}.</div>
        <button
          onClick={() => setShowDetails(prev => !prev)}
          style={{
            marginTop: "0.5rem",
            padding: "0.25rem 0.7rem",
            borderRadius: 4,
            border: "1px solid #cbd5e1",
            backgroundColor: "#ffffff",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {showDetails ? "Hide Explanation" : "Show Explanation"}
        </button>
        {showDetails && (
          <p style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            The microservice maintains a rolling window of recent samples and
            reports aggregate metrics here. This view helps confirm that the
            signal is stable before generating a full report or exporting data.
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
          <h2
            style={{
              marginTop: 0,
              marginBottom: "0.5rem",
              fontSize: "1rem",
            }}
          >
            Reset Statistics Window
          </h2>
          <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            This clears the current rolling window and starts collecting a fresh
            set of samples.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
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

  function renderPlotSection() {
    return (
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#ffffff",
          marginTop: "0.75rem",
          fontSize: "0.9rem",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Data Plot Visualizer
        </h3>
        <p
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            color: "#64748b",
            maxWidth: "60ch",
          }}
        >
          Generate a test plot based on the rolling statistics. In production
          mode, the microservice returns a PNG image that can be used in the
          compiled report or shared with other tools.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <button
            onClick={handleGeneratePlot}
            disabled={isGeneratingPlot}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #2563eb",
              backgroundColor: isGeneratingPlot ? "#eff6ff" : "#2563eb",
              color: isGeneratingPlot ? "#2563eb" : "#ffffff",
              fontSize: "0.85rem",
              cursor: isGeneratingPlot ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isGeneratingPlot ? "Generating Plot…" : "Generate Plot"}
          </button>
        </div>

        {plotStatus && (
          <div
            style={{
              marginBottom: "0.5rem",
              fontSize: "0.8rem",
              color: "#64748b",
            }}
          >
            {plotStatus}
          </div>
        )}

        {plotError && (
          <div
            style={{
              border: "1px solid #b91c1c",
              backgroundColor: "#fef2f2",
              color: "#7f1d1d",
              padding: "0.4rem 0.6rem",
              borderRadius: 4,
              fontSize: "0.8rem",
              marginBottom: "0.5rem",
            }}
          >
            {plotError}
          </div>
        )}

        {plotId && !plotError && (
          <div>
            <div
              style={{
                marginBottom: "0.25rem",
                fontSize: "0.8rem",
                color: "#64748b",
              }}
            >
              Latest plot preview from data plot visualizer microservice.
            </div>
            <img
              src={`/api/plots/${plotId}`}
              alt="Generated plot"
              style={{
                maxWidth: "100%",
                borderRadius: 4,
                border: "1px solid #e2e8f0",
              }}
            />
          </div>
        )}
      </section>
    )
  }

  function renderReportSection() {
    return (
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#ffffff",
          marginTop: "0.75rem",
          fontSize: "0.9rem",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Report Compiler
        </h3>
        <p
          style={{
            marginTop: 0,
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            color: "#64748b",
            maxWidth: "60ch",
          }}
        >
          Request a compiled summary from the report compiler microservice. In
          production mode, the response can include structured sections and
          metadata for test documentation.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 4,
              border: "1px solid #0f172a",
              backgroundColor: isGeneratingReport ? "#e5e7eb" : "#0f172a",
              color: isGeneratingReport ? "#0f172a" : "#ffffff",
              fontSize: "0.85rem",
              cursor: isGeneratingReport ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {isGeneratingReport ? "Generating Report…" : "Generate Report"}
          </button>
        </div>

        {reportStatus && (
          <div
            style={{
              marginBottom: "0.5rem",
              fontSize: "0.8rem",
              color: "#64748b",
            }}
          >
            {reportStatus}
          </div>
        )}

        {reportError && (
          <div
            style={{
              border: "1px solid #b91c1c",
              backgroundColor: "#fef2f2",
              color: "#7f1d1d",
              padding: "0.4rem 0.6rem",
              borderRadius: 4,
              fontSize: "0.8rem",
              marginBottom: "0.5rem",
            }}
          >
            {reportError}
          </div>
        )}

        {reportPayload && (
          <div
            style={{
              marginTop: "0.25rem",
              fontSize: "0.8rem",
              backgroundColor: "#f9fafb",
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              padding: "0.5rem",
              overflowX: "auto",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                fontSize: "0.75rem",
              }}
            >
              {JSON.stringify(reportPayload, null, 2)}
            </pre>
          </div>
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
          Rolling Statistics
        </h2>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#475569",
            marginTop: "0.25rem",
            lineHeight: 1.45,
          }}
        >
          View the current rolling mean, minimum, maximum, standard deviation,
          and sample count for the sensor stream. Use this panel to verify
          signal stability, generate plots, and request compiled reports.
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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <button
            onClick={handleComputeNow}
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
        </div>
      </section>

      {renderError()}
      {renderMeta()}
      {renderPlotSection()}
      {renderReportSection()}
      {renderResetModal()}
    </div>
  )
}
