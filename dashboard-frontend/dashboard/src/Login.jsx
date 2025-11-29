import { useState, useEffect } from "react"

export default function Login() {
  const [mode, setMode] = useState("login") // "login" or "register"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [token, setToken] = useState("")
  const [userInfo, setUserInfo] = useState(null)

  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    // pull token from localStorage when the page loads
    const storedToken = window.localStorage.getItem("authToken") || ""
    const storedUser = window.localStorage.getItem("authUser")

    if (storedToken) {
      setToken(storedToken)
    }
    if (storedUser) {
      try {
        setUserInfo(JSON.parse(storedUser))
      } catch {
        setUserInfo(null)
      }
    }
  }, [])

  function saveAuthState(newToken, user) {
    setToken(newToken || "")
    setUserInfo(user || null)

    if (newToken) {
      window.localStorage.setItem("authToken", newToken)
    } else {
      window.localStorage.removeItem("authToken")
    }

    if (user) {
      window.localStorage.setItem("authUser", JSON.stringify(user))
    } else {
      window.localStorage.removeItem("authUser")
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setStatus("")
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error || "Registration failed.")
        return
      }

      setStatus(body.message || "User registered successfully.")
      // after register, switch to login tab
      setMode("login")
    } catch {
      setError("Registration request failed.")
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setStatus("")
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error || "Login failed.")
        return
      }

      const tokenValue = body.token || ""
      const user = {
        id: body.user_id,
        short_token: body.short_token,
        email,
      }

      saveAuthState(tokenValue, user)
      setStatus(body.message || "Login successful.")
    } catch {
      setError("Login request failed.")
    }
  }

  async function handleVerify() {
    setStatus("")
    setError("")

    if (!token) {
      setError("No token available. Please log in first.")
      return
    }

    try {
      const res = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error || "Token invalid or expired.")
        return
      }

      setStatus(
        `Token is valid. Logged in as ${body.user.name} (${body.user.email}).`
      )
      setUserInfo(body.user)
      window.localStorage.setItem("authUser", JSON.stringify(body.user))
    } catch {
      setError("Verify request failed.")
    }
  }

  async function handleLogout() {
    setStatus("")
    setError("")

    if (!token) {
      saveAuthState("", null)
      setStatus("Already logged out.")
      return
    }

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await res.json()

      saveAuthState("", null)

      if (!res.ok) {
        setError(body.error || "Logout failed.")
        return
      }

      setStatus(body.message || "Logout successful.")
    } catch {
      saveAuthState("", null)
      setError("Logout request failed, token cleared locally.")
    }
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
          User Authentication
        </h2>
        <div
          style={{
            fontSize: "0.9rem",
            color: "#475569",
            marginTop: "0.25rem",
            lineHeight: 1.45,
            maxWidth: "60ch",
          }}
        >
          Use this page to register, log in, verify the JWT token, and log out
          through the authentication microservice. The rest of the dashboard
          does not require login, but this view proves the main program is using
          the auth service as a separate microservice.
        </div>
      </header>

      {/* tab toggle */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: 9999,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
        }}
      >
        <button
          type="button"
          onClick={() => setMode("login")}
          style={{
            padding: "0.3rem 0.9rem",
            border: "none",
            cursor: "pointer",
            backgroundColor: mode === "login" ? "#0f172a" : "#ffffff",
            color: mode === "login" ? "#ffffff" : "#0f172a",
          }}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          style={{
            padding: "0.3rem 0.9rem",
            border: "none",
            cursor: "pointer",
            backgroundColor: mode === "register" ? "#0f172a" : "#ffffff",
            color: mode === "register" ? "#ffffff" : "#0f172a",
          }}
        >
          Register
        </button>
      </div>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#ffffff",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
          maxWidth: 480,
        }}
      >
        {mode === "register" ? (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: "0.5rem" }}>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.3rem 0.4rem",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.3rem 0.4rem",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.3rem 0.4rem",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: 4,
                border: "1px solid #16a34a",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Register
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "0.5rem" }}>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.3rem 0.4rem",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{ display: "block", fontSize: "0.8rem", marginBottom: 4 }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.3rem 0.4rem",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: 4,
                border: "1px solid #2563eb",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Login
            </button>
          </form>
        )}
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          padding: "0.75rem",
          backgroundColor: "#ffffff",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
          maxWidth: 480,
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
          Token Actions
        </h3>

        <div
          style={{
            fontSize: "0.8rem",
            color: "#64748b",
            marginBottom: "0.5rem",
          }}
        >
          Current token is stored locally and used only when calling verify and
          logout. The rest of the dashboard does not require authentication.
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={handleVerify}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #0ea5e9",
              backgroundColor: "#0ea5e9",
              color: "#ffffff",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Verify Token
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: 4,
              border: "1px solid #b91c1c",
              backgroundColor: "#ffffff",
              color: "#b91c1c",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        </div>

        {userInfo && (
          <div
            style={{
              fontSize: "0.8rem",
              backgroundColor: "#f9fafb",
              borderRadius: 4,
              border: "1px solid #e2e8f0",
              padding: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              <strong>User: </strong>
              {userInfo.name || userInfo.email}
            </div>
            {userInfo.email && (
              <div>
                <strong>Email: </strong>
                {userInfo.email}
              </div>
            )}
            {userInfo.short_token && (
              <div>
                <strong>Short Token: </strong>
                {userInfo.short_token}
              </div>
            )}
          </div>
        )}
      </section>

      {status && (
        <div
          style={{
            border: "1px solid #16a34a",
            backgroundColor: "#f0fdf4",
            color: "#166534",
            padding: "0.5rem 0.75rem",
            borderRadius: 4,
            fontSize: "0.8rem",
            maxWidth: 480,
            marginBottom: "0.5rem",
          }}
        >
          {status}
        </div>
      )}

      {error && (
        <div
          style={{
            border: "1px solid #b91c1c",
            backgroundColor: "#fef2f2",
            color: "#7f1d1d",
            padding: "0.5rem 0.75rem",
            borderRadius: 4,
            fontSize: "0.8rem",
            maxWidth: 480,
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
