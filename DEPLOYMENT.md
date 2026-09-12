# NAWI Test Report Generator — Production Deployment Guide
**SIH26035 — OIML R-76 & Legal Metrology Act 2009 Compliant System**

This guide documents the complete end-to-end production deployment process using the verified free stack:
- **Database & Object Storage:** Supabase (PostgreSQL with Transaction Pooler + Supabase Storage)
- **Backend Service:** Render Free Tier Web Service (Node.js Express + Puppeteer PDF Generation)
- **Frontend SPA:** Vercel (Vite + React + Tailwind CSS + Lucide Icons)

---

## 1. Architecture Overview

```mermaid
graph TD
    Client[Browser / Mobile Phone] -->|HTTPS Requests| Vercel[Vercel: React SPA Frontend]
    Vercel -->|REST API Calls with JWT| Render[Render Free Tier: Express Backend]
    Render -->|SQL Queries via Pooler :6543| SupabaseDB[(Supabase PostgreSQL)]
    Render -->|Uploads PDF & Photos| SupabaseStorage[(Supabase Storage: attachments & reports)]
    Client -->|Direct Public Download & QR View| SupabaseStorage
    Client -->|Scan QR Code| Vercel
```

---

## 2. Supabase Setup (Database & Storage)

Supabase serves as the single source of truth for all database operations and persistent binary files.

### 2.1 Database Verification
The backend connects directly to the Supabase Transaction Pooler.
1. Ensure your Supabase connection string is obtained from the Supabase Dashboard (`Project Settings` > `Database` > `Connection string` > `URI` > `Mode: Transaction` on port `6543`).
2. Run database migrations and seed scripts to ensure schema and initial lookup data are initialized:
   ```bash
   cd backend
   npm run migrate:up
   npm run seed
   ```
   > **Note:** Seed creates initial lookup records, OIML MPE rules, sample test types (`ACCURACY`, `ECCENTRICITY`, `REPEATABILITY`, `DISCRIMINATION`), and the seeded administrator user (`admin@nawi-lab.test` / `Admin@123456`).

### 2.2 Supabase Storage Buckets
Since Render's free tier filesystem is ephemeral and wipes on restart or redeployment, all file uploads and generated PDF certificates are streamed to Supabase Storage.

1. In the Supabase Dashboard, navigate to **Storage** > **New bucket**.
2. Create two buckets:
   - `attachments`: For instrument nameplates, laboratory certificates, and test condition photos.
   - `reports`: For official generated OIML test certificate PDFs (`RPT-YYYY-XXXXXX.pdf`).
3. Set both buckets to **Public** for this demo so generated PDF download links and QR code verification links resolve seamlessly across devices without complex signed URL expiry logic.
4. Set the file size limit to `25MB`.

> [!WARNING]
> **Security Notice for Production:** For this demo/hackathon build, buckets are configured with public read access to ensure QR scanning and report sharing work reliably. For strict enterprise production, transition to private buckets with short-lived HMAC Signed URLs (`supabase.storage.from(...).createSignedUrl(...)`).

---

## 3. Backend Deployment (Render Free Tier)

### 3.1 Web Service Configuration
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your Git repository.
4. Configure the service settings:
   - **Name:** `nawi-test-report-backend` (or your preferred name)
   - **Region:** Singapore / Frankfurt / Oregon (match closest to Supabase region)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### 3.2 Puppeteer in Render Container
The backend uses Puppeteer with the following production-optimized Chromium launch flags in [reportService.js](file:///c:/Users/imaru/OneDrive/Desktop/26035/backend/src/services/reportService.js):
```javascript
const launchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
};
```
When Puppeteer starts, it outputs a loud confirmation log:
`[PUPPETEER] Chromium instance launched successfully.`

### 3.3 Backend Environment Variables (Render)
Under the **Environment** tab in Render, add the following variables:

| Variable Name | Value / Description | Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Web server port | `5000` |
| `DATABASE_URL` | Supabase Postgres Transaction Pooler connection URI | `postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase Service Role Key / Secret Key | `eyJhbGciOi...` |
| `JWT_SECRET` | Strong cryptographic secret (min 32 chars) | `e9f8a4c2b1d3e5f7a9b0c2d4e6f8a0b2...` |
| `JWT_EXPIRES_IN` | Session token validity duration | `8h` |
| `CORS_ORIGIN` | Deployed Vercel frontend URL *(update after Vercel step)* | `https://nawi-frontend.vercel.app` |
| `PUBLIC_APP_URL` | Deployed Vercel frontend URL *(used for QR links)* | `https://nawi-frontend.vercel.app` |
| `UPLOAD_DIR` | Ephemeral scratch directory for local temp buffering | `/tmp/uploads` |

### 3.4 Verification
Once deployed, verify that the health endpoint responds:
```bash
curl https://your-backend.onrender.com/api/health
```
Expected response:
```json
{"status":"UP","timestamp":"2026-09-12T...","database":"CONNECTED","environment":"production"}
```

> [!NOTE]
> **Render Free Tier Cold Starts:** Render free tier instances spin down after 15 minutes of inactivity. The first incoming request after idle takes **30–50 seconds** to boot. Mention this to judges if there is a slight delay on initial site interaction.

---

## 4. Frontend Deployment (Vercel)

### 4.1 Project Setup
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project** and import your Git repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 4.2 Single Page Application (SPA) Routing Rule
To ensure deep links (such as `/sessions/07d3b073-8700-47b7-959c-7ecfffeaa56c/conditions` and `/verify/RPT-2026-000001`) work on direct browser refresh without returning HTTP 404, [frontend/vercel.json](file:///c:/Users/imaru/OneDrive/Desktop/26035/frontend/vercel.json) is configured:
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4.3 Frontend Environment Variables (Vercel)
In Vercel **Settings** > **Environment Variables**, add:

| Variable Name | Value / Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Deployed Render backend base URL | `https://nawi-backend.onrender.com` |

> [!IMPORTANT]
> Vite environment variables are baked into static JavaScript files at **build time**. If you change `VITE_API_BASE_URL`, you must trigger a **Redeploy** on Vercel.

### 4.4 Finalizing Cross-Linking
1. Copy the assigned Vercel URL (e.g., `https://nawi-frontend.vercel.app`).
2. Go back to Render Dashboard > Environment Variables.
3. Set `CORS_ORIGIN` and `PUBLIC_APP_URL` to `https://nawi-frontend.vercel.app`.
4. Trigger a backend **Manual Deploy** on Render.

---

## 5. Summary of Required Environment Variables

| Platform | Variable Name | Required | Description |
|---|---|:---:|---|
| **Render** | `NODE_ENV` | Yes | Set to `production` |
| **Render** | `PORT` | Yes | Defaults to `5000` (or dynamic `$PORT`) |
| **Render** | `DATABASE_URL` | Yes | Supabase Transaction Pooler URI (`:6543`) |
| **Render** | `SUPABASE_URL` | Yes | Supabase Project API URL (`https://...supabase.co`) |
| **Render** | `SUPABASE_SECRET_KEY` | Yes | Supabase Service Role / Secret Key |
| **Render** | `JWT_SECRET` | Yes | High-entropy secret for signing JWTs |
| **Render** | `JWT_EXPIRES_IN` | Yes | JWT token expiration time (e.g. `8h`) |
| **Render** | `CORS_ORIGIN` | Yes | Vercel production frontend URL |
| **Render** | `PUBLIC_APP_URL` | Yes | Vercel frontend URL for QR code verification URLs |
| **Render** | `UPLOAD_DIR` | Optional | Ephemeral scratch directory (e.g. `/tmp/uploads`) |
| **Vercel** | `VITE_API_BASE_URL` | Yes | Render backend URL (`https://...onrender.com`) |

---

## 6. Post-Deployment Smoke Test Protocol

Follow this exact test sequence to validate that the live production system operates flawlessly:

### Step 1: Authentication & Navigation
1. Open your deployed Vercel URL in a browser (`https://your-frontend.vercel.app`).
2. Log in using the seeded credentials:
   - **Email:** `admin@nawi-lab.test`
   - **Password:** `Admin@123456`
   - **Lab:** Select `National Metrology Laboratory (NML-01)`
3. Verify that the Dashboard loads with real-time stats and metrics cards.

### Step 2: Instrument Registration
1. Navigate to **Instruments** > **Register Instrument**.
2. Fill in the instrument details:
   - **Manufacturer:** Mettler Toledo (or create new)
   - **Model:** `XP-2004S`
   - **Serial Number:** `SN-2026-LIVE-01`
   - **Accuracy Class:** `Class III`
   - **Max Capacity:** `15000` g
   - **Min Capacity:** `100` g
   - **Verification Interval (e):** `5` g
3. Submit and confirm the instrument appears in the instruments list.

### Step 3: Run Full Test Session (with 1 Deliberate FAIL)
1. Click **New Verification Session** for the registered instrument.
2. Complete **Test Conditions**:
   - Ambient Temp: `22.5` °C, Humidity: `55.0` %
   - Add reference weight `M1 5000g`
   - Click **Save & Proceed**.
3. Complete **Accuracy Test**:
   - Enter readings across 5 load points (e.g., 500g, 2000g, 5000g, 10000g, 15000g).
   - Ensure all errors fall within MPE bounds (`PASS`).
4. Complete **Eccentricity Test** (Deliberate FAIL test):
   - Position Center: 5000g indicated (Error 0.0g, `PASS`)
   - Position Front-Left: 5000g indicated (Error 0.0g, `PASS`)
   - Position Front-Right: **5012g indicated** (Error +12.0g > MPE 5.0g -> **`FAIL`**).
   - Position Back-Right: 5000g indicated (`PASS`)
   - Position Back-Left: 5000g indicated (`PASS`)
   - Notice the automatic real-time `FAIL` badge and visual feedback.
5. Complete **Repeatability Test**:
   - 3 runs at 5000g (indicated 5000.1g, 5000.0g, 5000.2g -> spread 0.2g <= MPE -> `PASS`).
6. Complete **Discrimination Test**:
   - Extra load test: Small 7g weight causes visible change of indicator -> `PASS`.

### Step 4: Summary, Report Generation & Supabase Storage Verification
1. Proceed to the **Summary** page.
2. Verify the overall result is clearly calculated as **`FAIL`** with the detailed reason:
   `Eccentricity failed at Front-Right (error 12g > MPE 5g)`.
3. Click **Generate Official Certificate PDF**.
4. Confirm the generated PDF link points to the **Supabase Storage URL**:
   `https://[project-id].supabase.co/storage/v1/object/public/reports/RPT-2026-XXXXXX.pdf`
   *(Verify it is NOT a local file path).*

### Step 5: Mobile QR Code Verification across Networks
1. Download the generated PDF certificate or view it on screen.
2. Disconnect your mobile phone from Wi-Fi and switch to **Cellular / Mobile Data** (ensuring cross-network validation).
3. Scan the embedded QR code using your phone's camera.
4. Verify the link directs to `https://your-frontend.vercel.app/verify/RPT-2026-XXXXXX`.
5. Confirm that the public verification page loads with:
   - Green/Red authenticity badge
   - Certificate Number & Status
   - Instrument details & Serial Number
   - Exact test breakdown matching the PDF
