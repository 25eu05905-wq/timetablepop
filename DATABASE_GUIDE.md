# Chronos 3D - Setup & Deployment Guide

This guide outlines how to configure, run, and deploy the **Chronos 3D Weekly Timetable Application**.

---

## 1. Local Development Setup

To run this application locally, you will need **Node.js** and **npm** installed on your system.

### Step 1: Install Node.js
If not already installed:
1. Download and install Node.js (LTS version recommended) from [nodejs.org](https://nodejs.org/).
2. Verify the installation in your terminal:
   ```bash
   node -v
   npm -v
   ```

### Step 2: Configure the Database (MongoDB)
You can run MongoDB locally or use a free cloud database on MongoDB Atlas.

#### Option A: MongoDB Atlas (Recommended Cloud Database)
1. Sign up for a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Shared Cluster (Free tier).
3. Under **Network Access**, add an IP entry for `0.0.0.0/0` (allows connection from anywhere, including Vercel/Railway).
4. Under **Database Access**, create a database user with a username and password.
5. In the cluster dashboard, click **Connect** -> **Drivers**, and copy the connection string. It will look like:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

#### Option B: Local MongoDB Instance
1. Download and install MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
2. Keep the default connection URI: `mongodb://localhost:27017/timetabledb`.

### Step 3: Run the Backend API Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Open `.env` and replace `MONGODB_URI` with your connection string (replace `<username>` and `<password>` with your database user credentials):
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://your_user:your_password@cluster0.xxxx.mongodb.net/timetabledb?retryWrites=true&w=majority
   JWT_SECRET=any_random_secret_string_here
   NODE_ENV=development
   ```
3. Install dependencies and start the server:
   ```bash
   npm install
   npm run dev
   ```
   The backend will run on `http://localhost:5000`. You should see `MongoDB Connected:` in the output.

### Step 4: Run the Frontend Client
1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000` (Vite dev server).

*Note: The frontend is configured with a dev proxy in `vite.config.ts` to automatically route `/api/*` calls to the backend on `http://localhost:5000`.*

---

## 2. Cloud Deployment

### A. Deploying the Frontend to Vercel
1. Install the Vercel CLI or link your repository to Vercel.
2. In the `frontend` folder, create a file named `vercel.json` (optional, for SPA routing, though not required for the dev build):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
3. Run the deployment:
   ```bash
   vercel
   ```
4. If deploying online, you will need to update the API base URL in `App.tsx` from `http://localhost:5000/api` to your actual deployed backend API URL (e.g. `https://your-backend-api.onrender.com/api`).

### B. Deploying the Backend API (Render, Railway, or Vercel Serverless)

#### Option 1: Render (Recommended for Express Apps)
1. Sign up on [render.com](https://render.com/).
2. Create a new **Web Service** and link your Git repository.
3. Configure the settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Under **Environment Variables**, add:
   - `MONGODB_URI` = `your_mongodb_atlas_uri`
   - `JWT_SECRET` = `your_jwt_secret`
   - `PORT` = `5000`
5. Deploy the service. Render will provide a public URL like `https://xxx.onrender.com`.

---

## 3. Transitioning to Supabase (Alternative Database)

If you prefer to migrate from MongoDB to Supabase (PostgreSQL + Auth), follow these instructions:

1. **Database Schema**: 
   Create two tables in Supabase:
   - `profiles` (id: uuid, email: text, settings: jsonb)
   - `periods` (id: uuid, user_id: uuid, day: text, subject: text, start_time: text, end_time: text, room: text, teacher: text, color: text)
2. **Backend Authentication**:
   You can bypass your custom JWT endpoints and use Supabase Client SDK directly in `/frontend`:
   - Run `npm install @supabase/supabase-js` in `/frontend`.
   - Initialize Supabase Client:
     ```typescript
     import { createClient } from '@supabase/supabase-js';
     const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
     ```
   - In `Auth.tsx`, replace the fetch requests with:
     ```typescript
     const { data, error } = await supabase.auth.signInWithPassword({ email, password });
     ```
   - In `App.tsx`, read and write timetable periods directly to Supabase PostgreSQL:
     ```typescript
     const { data, error } = await supabase.from('periods').select('*');
     ```
3. **No Express Backend Needed**: Transitioning to Supabase allows the app to run completely serverless, without requiring the `/backend` server to be running.
