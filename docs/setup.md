# VestiNex Setup Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js >= 18 (Tested on Node.js v20 and v26)
- npm >= 9

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# From repository root
cp .env.example .env
```

### 3. Run the Development Servers
In two separate terminals:

**Terminal 1 — Backend API Server (Port 4000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend Application (Port 3000):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## Fast Demo Credentials

The platform comes pre-seeded with 4 user roles, 3 software projects, and realistic out-of-order incident investigations:

| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Platform Lead** | `admin@vestinex.io` | `password123` | System Admin / Owner |
| **Staff SRE** | `dev@vestinex.io` | `password123` | Project Admin / Developer |
| **Backend Architect** | `lead@vestinex.io` | `password123` | Developer |
| **Incident Observer** | `viewer@vestinex.io` | `password123` | Read-only Viewer |

*Tip: The login page includes quick-fill buttons for instant one-click login for any role.*

---

## Running with Docker Compose

If Docker Desktop is installed on your machine:
```bash
docker compose up --build
```
This automatically spins up:
- PostgreSQL 16 on port 5432
- Express backend on port 4000
- Next.js frontend on port 3000

---

## Running Tests

### Backend Unit & Integration Tests (Vitest + Supertest)
```bash
cd backend
npm test
```

### Frontend Build Verification
```bash
cd frontend
npm run build
```
