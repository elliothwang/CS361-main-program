from flask import Flask, jsonify, request
from datetime import datetime
import random
import math
import os
import requests

app = Flask(__name__)

# Mircoservice configuration
AUTH_URL = os.environ.get("AUTH_URL", "http://localhost:5001")
FEATURE_FLAG_URL = os.environ.get("FEATURE_FLAG_URL", "http://localhost:5005")
PLOT_URL = os.environ.get("PLOT_URL", "http://localhost:5006")
REPORT_URL = os.environ.get("REPORT_URL", "http://localhost:8000")

# rolling data buffer
rolling_window = []
SERVICE_AVAILABLE = True


# Get environment mode from Feature Flags service (Helper)
def get_environment_mode() -> str:
    try:
        resp = requests.get(f"{FEATURE_FLAG_URL}/mode", timeout=2)
        if resp.ok:
            mode = str(resp.json().get("mode", "")).lower()
            if mode in {"test", "production"}:
                return mode
    except Exception:
        pass
    return "test"


def get_fake_sensor_point():
    sensor_id = "01"
    value = round(random.uniform(0.28, 0.36), 3)
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    return {"sensor_id": sensor_id, "value": value, "timestamp": timestamp}


def compute_stats():
    if not rolling_window:
        return {"mean": None, "min": None, "max": None, "std_dev": None, "count": 0}

    vals = [p["value"] for p in rolling_window]
    mean = sum(vals) / len(vals)
    vmin = min(vals)
    vmax = max(vals)
    variance = sum((x - mean) ** 2 for x in vals) / len(vals)
    std_dev = math.sqrt(variance)

    return {
        "mean": round(mean, 3),
        "min": round(vmin, 3),
        "max": round(vmax, 3),
        "std_dev": round(std_dev, 3),
        "count": len(vals),
    }


@app.route("/api/data", methods=["GET"])
def api_data():
    global rolling_window
    point = get_fake_sensor_point()
    rolling_window.append(point)
    rolling_window = rolling_window[-200:]
    return jsonify({"status": "ok", "data": point})


@app.route("/api/generate", methods=["POST"])
def api_generate():
    global rolling_window
    point = get_fake_sensor_point()
    rolling_window.append(point)
    rolling_window = rolling_window[-200:]
    return jsonify({"status": "ok", "message": "Generated one new test reading.", "data": point})


@app.route("/api/stats", methods=["GET"])
def api_stats():
    stats = compute_stats()
    return jsonify(
        {
            "status": "ok",
            "stats": stats,
            "last_updated": datetime.now().strftime("%H:%M:%S.%f")[:-3],
        }
    )


@app.route("/api/status", methods=["GET"])
def api_status():
    payload = {
        "serial_number": "S/N: 1234567890",
        "last_check": datetime.now().strftime("%H:%M:%S"),
    }
    if SERVICE_AVAILABLE:
        payload.update({"connected": True, "message": "Connected to rolling statistics microservice."})
        return jsonify(payload), 200
    else:
        payload.update({"connected": False, "message": "Rolling statistics service not responding."})
        return jsonify(payload), 503


@app.route("/api/reset", methods=["POST"])
def api_reset():
    global rolling_window
    rolling_window = []
    return jsonify(
        {"status": "ok", "message": "Rolling statistics cleared. New stats will start from next data point."}
    )

# --------------------------- Feature Flags ---------------------------
@app.route("/api/mode", methods=["GET"])
def api_get_mode():
    mode = get_environment_mode()
    return jsonify({"status": "ok", "mode": mode})


@app.route("/api/mode", methods=["POST"])
def api_set_mode():
    body = request.get_json(silent=True) or {}
    mode = str(body.get("mode", "")).lower()

    if mode not in {"test", "production"}:
        return jsonify({"status": "error", "message": "invalid mode"}), 400

    try:
        resp = requests.post(f"{FEATURE_FLAG_URL}/mode", json={"mode": mode}, timeout=2)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Feature Flag MS unavailable: {exc}"}), 503


# --------------------------- Plot Visualizer ---------------------------
@app.route("/api/plots", methods=["POST"])
def api_generate_plot():
    """
    proxy endpoint for generating a plot via the data plot visualizer microservice

    - reads x/y and metadata from the request body sent by the frontend
    - respects the current environment mode from the feature flag microservice
    - in test mode: skips the remote call and returns a 'skipped' status
    - in production mode: wraps x/y inside a 'data' object as required by the plot ms
    """
    mode = get_environment_mode()
    body = request.get_json(silent=True) or {}

    # extract fields the frontend sends
    x = body.get("x", [])
    y = body.get("y", [])
    title = body.get("title", "Rolling statistics plot")
    xlabel = body.get("xlabel", "Sample Index")
    ylabel = body.get("ylabel", "Value")

    # in test mode, never call the plot microservice
    if mode == "test":
        return jsonify(
            {
                "status": "skipped",
                "mode": mode,
                "message": "Plot generation disabled in Test Mode.",
            }
        ), 200

    # build the payload the data plot visualizer microservice expects:
    # a top-level 'data' field that wraps x/y, plus metadata
    payload = {
        "data": {
            "x": x,
            "y": y,
        },
        "title": title,
        "xlabel": xlabel,
        "ylabel": ylabel,
    }

    try:
        resp = requests.post(f"{PLOT_URL}/plots", json=payload, timeout=4)
        # try to parse the response as json; if that fails, surface a clean error
        try:
            resp_body = resp.json()
        except ValueError as exc:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Plot MS returned non-JSON response: {exc}",
                    }
                ),
                502,
            )

        return jsonify(resp_body), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {"status": "error", "message": f"Plot MS unavailable: {exc}"}
            ),
            503,
        )


@app.route("/api/plots/<plot_id>", methods=["GET"])
def api_download_plot(plot_id):
    try:
        stream = requests.get(f"{PLOT_URL}/plots/{plot_id}", stream=True, timeout=5)
        return (stream.raw.read(), stream.status_code,
                {"Content-Type": stream.headers.get("Content-Type", "image/png")})
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Plot download failed: {exc}"}), 503


# --------------------------- Report Compiler ---------------------------
@app.route("/api/report", methods=["POST"])
def api_generate_report():
    """
    proxy endpoint for compiling a report via the report compiler microservice

    - in test mode: skip remote call and return 'skipped' status
    - in production mode: forward stats and plot metadata to the report compiler ms
    """
    mode = get_environment_mode()
    body = request.get_json(silent=True) or {}

    if mode == "test":
        return jsonify(
            {
                "status": "skipped",
                "mode": mode,
                "message": "Report generation disabled in Test Mode.",
            }
        ), 200

    try:
        resp = requests.post(
            f"{REPORT_URL}/report",
            json=body,
            timeout=4,
        )
        try:
            resp_body = resp.json()
        except ValueError as exc:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Report Compiler MS returned non-JSON response: {exc}",
                    }
                ),
                502,
            )

        return jsonify(resp_body), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Report Compiler MS unavailable: {exc}",
                }
            ),
            503,
        )


# --------------------------- User Auth ---------------------------
@app.route("/api/auth/health", methods=["GET"])
def api_auth_health():
    try:
        resp = requests.get(f"{AUTH_URL}/health", timeout=2)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Auth MS unavailable: {exc}"}), 503


@app.route("/api/auth/register", methods=["POST"])
def api_auth_register():
    """
    proxy user registration to the auth microservice
    """
    try:
        payload = request.get_json(silent=True) or {}
        resp = requests.post(
            f"{AUTH_URL}/auth/register",
            json=payload,
            timeout=4,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {
                    "error": "auth microservice unavailable during registration",
                    "details": str(exc),
                }
            ),
            503,
        )


@app.route("/api/auth/login", methods=["POST"])
def api_auth_login():
    """
    proxy user login to the auth microservice
    """
    try:
        payload = request.get_json(silent=True) or {}
        resp = requests.post(
            f"{AUTH_URL}/auth/login",
            json=payload,
            timeout=4,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {
                    "error": "auth microservice unavailable during login",
                    "details": str(exc),
                }
            ),
            503,
        )


@app.route("/api/auth/logout", methods=["POST"])
def api_auth_logout():
    """
    proxy logout to the auth microservice, forwarding the bearer token
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header

        resp = requests.post(
            f"{AUTH_URL}/auth/logout",
            headers=headers,
            timeout=4,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {
                    "error": "auth microservice unavailable during logout",
                    "details": str(exc),
                }
            ),
            503,
        )


@app.route("/api/auth/verify", methods=["GET"])
def api_auth_verify():
    """
    proxy token verification to the auth microservice
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header

        resp = requests.get(
            f"{AUTH_URL}/auth/verify",
            headers=headers,
            timeout=4,
        )
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return (
            jsonify(
                {
                    "error": "auth microservice unavailable during verify",
                    "details": str(exc),
                }
            ),
            503,
        )


@app.route("/api/feature-flags/health", methods=["GET"])
def api_feature_flags_health():
  try:
    # use /mode as a simple health check for feature flag service
    resp = requests.get(f"{FEATURE_FLAG_URL}/mode", timeout=2)
    resp.raise_for_status()
    return jsonify({
      "connected": True,
      "message": "Feature flag microservice is responding.",
    }), 200
  except Exception:
    return jsonify({
      "connected": False,
      "message": "Feature flag microservice is not responding.",
    }), 503


@app.route("/api/plots/health", methods=["GET"])
def api_plots_health():
  try:
    resp = requests.get(f"{PLOT_URL}/health", timeout=2)
    resp.raise_for_status()
    return jsonify({
      "connected": True,
      "message": "Data plot visualizer microservice is responding.",
    }), 200
  except Exception:
    return jsonify({
      "connected": False,
      "message": "Data plot visualizer microservice is not responding.",
    }), 503


@app.route("/api/report/health", methods=["GET"])
def api_report_health():
  try:
    resp = requests.get(f"{REPORT_URL}/health", timeout=2)
    resp.raise_for_status()
    return jsonify({
      "connected": True,
      "message": "Report compiler microservice is responding.",
    }), 200
  except Exception:
    return jsonify({
      "connected": False,
      "message": "Report compiler microservice is not responding.",
    }), 503


@app.route("/api/auth/login", methods=["POST"])
def api_auth_login():
    body = request.get_json(silent=True) or {}
    try:
        resp = requests.post(f"{AUTH_URL}/auth/login", json=body, timeout=3)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Login failed: {exc}"}), 503


# Entry point
if __name__ == "__main__":
    app.run(debug=True)
