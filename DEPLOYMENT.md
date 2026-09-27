# Deployment Guide for SmartFarm AI

This repository contains two completely separate applications in one location (a Monorepo).
- **Frontend (React/Vite)**: Located in the root directory `/`.
- **Backend (Python/FastAPI)**: Located in the `/files/` directory.

---

## 1. Deploying the Frontend (Vercel or Netlify)

1. Log into your Vercel/Netlify dashboard and choose **Import Project**.
2. Select this GitHub repository.
3. **Important Configure Settings**:
   - **Root Directory**: Leave it as `./` (the root).
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   You MUST add the following environment variables to Vercel before you build, otherwise Authentication will fail!
   - `VITE_SUPABASE_URL` = `(Ask repository owner for this from .env.local)`
   - `VITE_SUPABASE_ANON_KEY` = `(Ask repository owner for this from .env.local)`
5. Click **Deploy**.

## 2. Deploying the Backend (Render or Railway)

1. Log into Render.com and create a new **Web Service**.
2. Connect this GitHub repository.
3. **Important Configure Settings**:
   - **Root Directory**: `files` (This is critical! It tells the server to look in the /files/ folder for Python).
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **Deploy**.

## 3. Connecting them together!
Once Render finishes deploying the backend, it will give you a public URL (like `https://smartfarm-api.onrender.com`). 

You must go back to the Frontend code, open `src/services/api.ts`, and change line 144:
**From:** `await fetch("http://localhost:8000/predict", ...)`
**To:** `await fetch("https://YOUR_NEW_RENDER_URL.onrender.com/predict", ...)`

Push that single change to GitHub, and Vercel will automatically update the live frontend to point to your live backend!
