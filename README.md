# Test Operations Dashboard — Main Program
A fully integrated microservice-driven dashboard for monitoring synthetic sensor streams, computing rolling statistics, generating plots, compiling structured reports, and managing user authentication.  
This repository represents the **Main Program** for CS361 Milestone #3 and demonstrates complete integration with **four separate microservices**, each running in its own independent process.

---

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Microservices](#microservices)
  - [Authentication Service (Small Pool)](#1-authentication-service-small-pool)
  - [Feature Flag Service (Big Pool)](#2-feature-flag-service-big-pool)
  - [Data Plot Visualizer (Big Pool)](#3-data-plot-visualizer-big-pool)
  - [Report Compiler Service (Big Pool)](#4-report-compiler-big-pool)
- [Main Program Features](#main-program-features)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Running the Full System](#running-the-full-system)
- [Backend API Reference](#backend-api-reference)
- [Frontend Pages](#frontend-pages)
- [Environment Modes](#environment-modes)
- [Project Structure](#project-structure)
- [Microservice Communication Model](#microservice-communication-model)
- [Development Notes](#development-notes)
- [Known Issues](#known-issues)
- [License](#license)

---

# Overview
The **Test Operations Dashboard** simulates a real-world engineering test operations environment.  
The Main Program continuously generates synthetic sensor readings, maintains a rolling statistics window, and integrates with four external microservices to provide:

- user authentication  
- feature flag / environment mode management  
- PNG plot generation  
- structured report compilation  
- full microservice health monitoring  

Each microservice runs completely independently and communicates solely through HTTP requests to satisfy CS361 microservice constraints.

---

# Architecture

```
Main Program Backend (Flask, port 5000)
│
├── Authentication Microservice (Flask, port 5001)         [Small Pool]
├── Feature Flag Microservice (Flask, port 5005)           [Big Pool]
├── Data Plot Visualizer Microservice (Flask, port 5006)   [Big Pool]
└── Report Compiler Microservice (FastAPI, port 8000)      [Big Pool]

Frontend (React + Vite, port 5173/5174)
```

- Main Program does NOT import microservice code.
- All microservice interactions occur via HTTP `requests`.

---

# Microservices

## 1. Authentication Service (Small Pool)
Provides:
- Register  
- Login (returns JWT)  
- Logout (blacklists token)  
- Token verification  
- Health check  

Main Program Proxied Routes:
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
GET  /api/auth/health
```

---

## 2. Feature Flag Service (Big Pool)
Controls global environment mode:
- test mode  
- production mode  

Main Program Proxied Routes:
```
GET  /api/mode
POST /api/mode
GET  /api/ff/health
```

---

## 3. Data Plot Visualizer (Big Pool)
Accepts X/Y arrays → returns:
- plot_id  
- PNG file  

Main Program Proxied Routes:
```
POST /api/plots
GET  /api/plots/<plot_id>
GET  /api/plots/health
```

---

## 4. Report Compiler (Big Pool)
Generates structured JSON reports containing:
- summary  
- raw stats  
- plot metadata  
- data grouping (above/below mean)  
- timestamps  

Main Program Proxied Routes:
```
POST /api/report
GET  /api/report/health
```

---

# Main Program Features

## Backend
The Flask backend handles:
- synthetic sensor sample generation  
- rolling statistics computation  
- statistics queries  
- MS health checks  
- plot generation proxy  
- report generation proxy  
- authentication proxy  
- feature flag proxy  
- static file/PNG forwarding  

Key constraints honored:
- No microservice code imports  
- All communication via HTTP  

---

## Frontend
React + Vite interface with the following pages:

### Live Dashboard
- Real-time sample view  
- Quick metrics  

### Statistics Page
- rolling window summary  
- compute/refresh stats  
- reset window  
- generate a plot  
- generate a compiled report  
- display returned PNG  
- JSON report viewer  

### System Status
- Health for all **five** services:
  - main program backend  
  - auth MS  
  - feature flag MS  
  - plot MS  
  - report compiler MS  
- Mode switching (test/production)  
- Serial and timestamps  

### Authentication Page
- Register  
- Login  
- Logout  

---

# Running the Full System

Open **six separate terminals**.

---

### 1. Main Program Backend (port 5000)
```
cd dashboard-backend
python app.py
```

---

### 2. Authentication Microservice (port 5001)
```
cd User_Authentication_Microservice-main
python auth_app.py
```

---

### 3. Feature Flag Microservice (port 5005)
```
cd feature_flags_microservice
python app.py
```

---

### 4. Data Plot Visualizer MS (port 5006)
```
cd dataplot_visualizer_microservice
python app.py
```

---

### 5. Report Compiler MS (port 8000)
```
cd Report-Compiler-Service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 6. Frontend (port 5173/5174)
```
cd dashboard-frontend/dashboard
npm install
npm run dev
```

---

# Backend API Reference

## Statistics Routes
```
GET  /api/data
GET  /api/stats
POST /api/reset
GET  /api/status
```

## Authentication Proxy Routes
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify
GET  /api/auth/health
```

## Feature Flags
```
GET  /api/mode
POST /api/mode
GET  /api/ff/health
```

## Plot Generation
```
POST /api/plots
GET  /api/plots/<plot_id>
GET  /api/plots/health
```

## Report Compiler
```
POST /api/report
GET  /api/report/health
```

---

# Frontend Pages

### `/dashboard`
Live data feed with real-time metrics.

### `/statistics`
Rolling stats, plot generation, and report generation.

### `/status`
Health of all microservices + environment mode switching.

### `/auth`
Login/register/logout.

---

# Environment Modes

### Test Mode
- Plot MS returns “skipped” metadata  
- Report Compiler returns simplified output  
- Faster refresh cycles  

### Production Mode
- Plot MS generates real PNG plots  
- Report Compiler outputs full structured report  

---

# Project Structure

```
CS361-main-program/
├── dashboard-backend/
│   ├── app.py
│   ├── static/
│   └── ...
├── dashboard-frontend/
│   ├── dashboard/
│   │   ├── src/
│   │   │   ├── App.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Statistics.jsx
│   │   │   ├── SystemStatus.jsx
│   │   │   ├── Login.jsx
│   │   │   └── ...
│   │   └── index.html
│   └── ...
└── README.md
```

---

# Microservice Communication Model
All communications follow this pattern:

1. **Frontend** → sends a request to **Main Program** (`/api/...`)  
2. **Main Program** → forwards request to the appropriate MS  
3. **Microservice** → performs work and returns JSON/PNG  
4. **Main Program** → returns processed data to the frontend  

No shared code. No direct imports.  
All interactions are **programmatic HTTP messages**.

---

# Development Notes
- Rolling window sample buffer is stored in-memory.  
- Plot IDs are generated UUIDs forwarded to the MS.  
- Report compiler uses merged payloads of stats + plot metadata.  
- Feature flags directly modify environment behavior.  
- All microservices are stateless except Auth (database-backed).

---

# Known Issues
- If a microservice is offline, frontend displays “Service offline”.  
- Node 20.19+ is required for Vite.  
- Plot previews depend on production mode.  
- Report Compiler requires backend to be running before it’s hit.

---

# License
This repository is part of Oregon State University CS361 coursework.  
All code written by the student may be reused in personal portfolios.
