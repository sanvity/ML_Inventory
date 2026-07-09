# Running the Application

Open **two separate terminals** from the project root (`ML_Inventory_June29/`).

---

## Terminal 1 — Backend (FastAPI)

```bash
python -m uvicorn api.main:app --reload --port 7860
```

API runs at: http://127.0.0.1:7860  
Interactive docs at: http://127.0.0.1:7860/docs

---

## Terminal 2 — Frontend (Vite / React)

```bash
cd ml
npm run dev
```

App runs at: http://localhost:4000
