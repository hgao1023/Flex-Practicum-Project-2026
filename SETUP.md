# Setup Guide

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Git**

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/sjagannathan17/Flex-Practicum-Project-2026.git
cd Flex-Practicum-Project-2026
```

---

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
ANTHROPIC_API_KEY=your_claude_api_key_here
BRAVE_API_KEY=your_brave_search_api_key_here
```

**Get API Keys:**
- Claude API: https://console.anthropic.com/
- Brave Search: https://brave.com/search/api/

---

## Step 3: Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Step 5: Run the Application

**Terminal 1 - Backend:**
```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Step 6: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001
- **Health Check:** http://localhost:8001/api/health

---

## Quick Test

After starting both servers, open http://localhost:3000/dashboard

You should see the dashboard with document statistics and analytics charts.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| Frontend won't start | Run `npm install` in the `frontend` folder |
| "Failed to connect to backend" | Make sure backend is running on port 8001 |
| Empty dashboard | The system needs SEC filings ingested first |

---

## Ingesting Data

To download SEC filings and populate the database:

```bash
curl -X POST http://localhost:8001/api/ingestion/ingest-all
```

This will download 10-K and 10-Q filings for all 5 companies.
