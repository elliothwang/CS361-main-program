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
    mode = get_environment_mode()
    body = request.get_json(silent=True) or {}

    if mode == "test":
        return jsonify({
            "status": "skipped",
            "mode": mode,
            "message": "Plot generation disabled in Test Mode."
        }), 200

    try:
        resp = requests.post(f"{PLOT_URL}/plots", json=body, timeout=4)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Plot MS unavailable: {exc}"}), 503


@app.route("/api/plots/<plot_id>", methods=["GET"])
def api_download_plot(plot_id):
    try:
        stream = requests.get(f"{PLOT_URL}/plots/{plot_id}", stream=True, timeout=5)
        return (stream.raw.read(), stream.status_code,
                {"Content-Type": stream.headers.get("Content-Type", "image/png")})
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Plot download failed: {exc}"}), 503


# --------------------------- Report Compiler ---------------------------
@app.route("/api/report", methods=["GET"])
def api_generate_report():
    mode = get_environment_mode()

    if mode == "test":
        return jsonify({
            "status": "skipped",
            "mode": mode,
            "message": "Report generation disabled in Test Mode."
        }), 200

    try:
        resp = requests.get(f"{REPORT_URL}/report", timeout=5)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Report Compiler MS unavailable: {exc}"}), 503


# --------------------------- User Auth ---------------------------
@app.route("/api/auth/health", methods=["GET"])
def api_auth_health():
    try:
        resp = requests.get(f"{AUTH_URL}/health", timeout=2)
        return jsonify(resp.json()), resp.status_code
    except Exception as exc:
        return jsonify({"status": "error", "message": f"Auth MS unavailable: {exc}"}), 503


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
