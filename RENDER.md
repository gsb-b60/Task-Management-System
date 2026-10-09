# Render.com Deployment Guide

This guide provides step-by-step instructions for deploying the **Task Management System (todogit)** on [Render.com](https://render.com).

---

## 🏗 System Architecture on Render

```text
Render
├── 1. PostgreSQL          Managed Database (Private Network)
├── 2. Web Service         Backend API (Node.js + Prisma)
└── 3. Static Site         Frontend (React + Vite SPA)
```

---

## ⚡ Option 1: Quick Deploy via Render Blueprint (`render.yaml`)

1. Push your repository to **GitHub** / **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository containing `render.yaml`.
5. Render will automatically detect and configure:
   - PostgreSQL Database (`todogit-db`)
   - Backend Web Service (`todogit-backend`)
   - Frontend Static Site (`todogit-frontend`)
6. Fill in any missing environment variables (e.g., `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if GitHub OAuth is enabled).
7. Click **Apply**.

---

## 🛠 Option 2: Manual Setup on Render

### Step 1: Create PostgreSQL Database

1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. **Name**: `todogit-db`
3. **Database**: `todogit`
4. **User**: `todogit_user`
5. **Region**: Choose closest to your users.
6. Click **Create Database**.
7. Copy the **Internal Database URL** (for backend inside Render) or **External Database URL** (for running initial migrations from local).

---

### Step 2: Deploy Backend Web Service

1. Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `todogit-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install --frozen-lockfile && npx prisma generate && pnpm build`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/api/health`

4. Add **Environment Variables**:
   | Variable | Value | Notes |
   | --- | --- | --- |
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `DATABASE_URL` | `<Internal Database URL>` | From Step 1 |
   | `FRONTEND_ORIGIN` | `https://todogit-frontend.onrender.com` | Your deployed frontend URL |
   | `JWT_SECRET` | `<random-secret-string>` | Secret key for JWT signing |
   | `BCRYPT_SALT_ROUNDS` | `12` | Password hashing complexity |
   | `GITHUB_CLIENT_ID` | `<optional>` | GitHub OAuth App ID |
   | `GITHUB_CLIENT_SECRET` | `<optional>` | GitHub OAuth Secret |
   | `GITHUB_CALLBACK_URL` | `https://todogit-backend.onrender.com/api/auth/github/callback` | OAuth Callback |

5. Click **Create Web Service**.

---

### Step 3: Run Database Migrations & Seed Data

In the Render Dashboard for `todogit-backend`:

1. Go to the **Shell** tab (or run via pre-deploy script).
2. Execute migration:
   ```bash
   npx prisma migrate deploy
   ```
3. (Optional) Run seed script on initial deploy:
   ```bash
   npx prisma db seed
   ```

---

### Step 4: Deploy Frontend Static Site

1. Click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `todogit-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `pnpm install && pnpm build`
   - **Publish Directory**: `dist`

4. Add **Build Environment Variable**:
   > ⚠️ **Important:** Must be set as a **Build** environment variable before triggering build.

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://todogit-backend.onrender.com/api` |

5. Configure **SPA Rewrites/Redirects**:
   - Go to **Redirects/Rewrites** tab.
   - Add rule:
     - **Source**: `/*`
     - **Action**: `Rewrite`
     - **Destination**: `/index.html`

6. Click **Create Static Site**.

---

## 🔍 Verification & Smoke Test Checklist

- [ ] `GET https://todogit-backend.onrender.com/api/health` returns `200 OK` with database status `connected`.
- [ ] Swagger API Docs available at `https://todogit-backend.onrender.com/api/docs`.
- [ ] Frontend loads without blank screen on direct navigation and hard refresh (`/tasks`, `/board`).
- [ ] User registration, login, logout, and persistent session work over HTTPS.
- [ ] CORS headers permit request from `FRONTEND_ORIGIN`.

---

## ⚡ Troubleshooting & Common Pitfalls

1. **Vite API URL not working:**
   `VITE_*` environment variables are baked in during build time. Ensure `VITE_API_URL` is set *before* building on Render, then trigger a manual redeploy (`Clear build cache & deploy`).

2. **404 Page on Page Refresh:**
   Ensure SPA rewrite rule (`/* -> /index.html`) is added under Frontend Static Site Redirects/Rewrites.

3. **CORS / Cookie Errors:**
   Ensure `FRONTEND_ORIGIN` matches the exact deployed URL of the static site (including `https://` and without trailing slash).

4. **Free Tier Sleeping Instances:**
   Free Web Services sleep after 15 minutes of inactivity. Initial requests may take 30–50 seconds to wake up (cold start).
