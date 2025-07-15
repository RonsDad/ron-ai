# Nira Startup Guide

## Quick Start Commands

### Start Everything (Recommended)
```bash
npm run start
# or
npm run dev
```
This command will:
1. 🧹 Kill any existing processes on ports 3000, 8000, 8001
2. 🚀 Start all three services simultaneously:
   - Frontend (Next.js) on port 3000
   - Browser-use backend (FastAPI) on port 8000
   - Claude backend (FastAPI) on port 8001

### Safe Start (Enhanced Error Handling)
```bash
npm run start:safe
```
Enhanced startup with better error handling, restart attempts, and detailed logging.

### Manual Port Cleanup
```bash
npm run kill-ports
```
Manually kill any processes running on ports 3000, 8000, 8001.

## Individual Services

### Frontend Only
```bash
npm run frontend
```

### Backend Only (Browser-use)
```bash
npm run backend
```

### Claude Backend Only
```bash
npm run claude-backend
```

## Port Configuration
- **Frontend**: http://localhost:3000
- **Browser-use API**: http://localhost:8000
- **Claude API**: http://localhost:8001

## Troubleshooting

### Port Already in Use
The startup scripts automatically handle port conflicts by killing existing processes first. If you encounter issues:

1. Run manual port cleanup: `npm run kill-ports`
2. Wait 5 seconds
3. Try starting again: `npm run start`

### Python Virtual Environment Issues
If the Python backends fail to start, ensure your virtual environment is set up:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Service Health Check
Once started, you can verify all services are running:
- Frontend: http://localhost:3000
- Browser-use API health: http://localhost:8000/health
- Claude API health: http://localhost:8001/health

## Stopping Services
Press `Ctrl+C` in the terminal where the services are running. This will gracefully shut down all services and clean up ports.
