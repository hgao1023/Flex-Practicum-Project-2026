# Flex Competitive Intelligence Platform - Local Setup

## Prerequisites
- Python 3.10+
- Node.js 18+
- Git

---

## 1. Clone the Repository
```bash
git clone https://github.com/sjagannathan17/Flex-Practicum-Project-2026.git
cd Flex-Practicum-Project-2026
```

---

## 2. Get API Keys

| Service | URL | Purpose |
|---------|-----|---------|
| Claude API | https://console.anthropic.com/ | AI chat & analysis |
| Brave Search | https://brave.com/search/api/ | Real-time web search |

---

## 3. Create Environment File

Create a file named `.env` in the project root folder:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
BRAVE_API_KEY=BSAxxxxxxxxxxxxx
```

---

## 4. Install Dependencies

**Backend (Python):**
```bash
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd frontend
npm install
cd ..
```

---

## 5. Run the Application

Open **two terminal windows**.

**Terminal 1 - Backend:**
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
```
Wait until you see: `Uvicorn running on http://0.0.0.0:8001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Wait until you see: `Ready in Xms`

---

## 6. Open the App

Go to: **http://localhost:3000**

---

## Quick Health Check

After both servers are running, verify everything works:

```bash
curl http://localhost:8001/api/health
```

You should see:
```json
{"status":"healthy","chromadb":{"connected":true,"documents":19050,...}}
```

---

## Main Pages

| Page | URL |
|------|-----|
| Dashboard | http://localhost:3000/dashboard |
| AI Chat | http://localhost:3000/chat |
| Companies | http://localhost:3000/companies |
| Analysis | http://localhost:3000/analysis |
| News Feed | http://localhost:3000/news |
| Reports | http://localhost:3000/reports |
| Alerts | http://localhost:3000/alerts |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| `npm ERR!` | Run `npm install` in the `frontend` folder |
| "Failed to connect to backend" | Make sure backend is running on port 8001 |
| Slow first load | Normal - embedding model loads on first request |

---

## Stop the Servers

Press `Ctrl+C` in each terminal window.

---

## Questions?

Contact the team lead or check the README.md for architecture details.
