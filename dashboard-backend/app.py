from flask import Flask, jsonify, request
from datetime import datetime
import random
import math

app = Flask(__name__)

# in memory rolling buffer used to simulate a stats microservice output
rolling_window = []
SERVICE_AVAILABLE = True  # flip to false to simulate service outage


def get_fake_sensor_point():
    """
    produce a single synthetic sensor reading
    millisecond timestamp included to aid refresh rate verification
    """
    sensor_id = "01"
    value = round(random.uniform(0.28, 0.36), 3)
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    return {"sensor_id": sensor_id, "value": value, "timestamp": timestamp}


def compute_stats():
    """
    compute rolling statitics for the current buffer
    returns a neutral payload if the buffer is empty
    """
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
    """
    return a new reading and append it to the rolling buffer
    keeps at most the last 200 readings
    """
    global rolling_window
    point = get_fake_sensor_point()
    rolling_window.append(point)
    rolling_window = rolling_window[-200:]
    return jsonify({"status": "ok", "data": point})


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """
    explicit data generation endpoint for on demand reads
    mirrors api data but uses post to emphasize intent
    """
    global rolling_window
    point = get_fake_sensor_point()
    rolling_window.append(point)
    rolling_window = rolling_window[-200:]
    return jsonify({"status": "ok", "message": "Generated one new test reading.", "data": point})


@app.route("/api/stats", methods=["GET"])
def api_stats():
    """
    return the current rolling statistics and a server side timestamp
    """
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
    """
    provide a service health snapshot with simple up down response
    returns 200 for healthy and 503 for down
    """
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
    """
    clear the rolling buffer to start a fresh statistics window
    """
    global rolling_window
    rolling_window = []
    return jsonify(
        {"status": "ok", "message": "Rolling statistics cleared. New stats will start from next data point."}
    )


if __name__ == "__main__":
    # development entrypoint
    app.run(debug=True)
