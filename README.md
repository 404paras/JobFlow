# 🚀 JobFlow

<div align="center">

![JobFlow Logo](frontend/public/logo.svg)

### **Automate Your Job Hunt Like a Pro**

*A powerful workflow automation platform that scrapes jobs from multiple sources and delivers them straight to your inbox.*

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)

**Created by [Paras Garg](https://github.com/404paras)**

[Live Demo](https://jobflow.vercel.app) · [Report Bug](https://github.com/404paras/JobFlow/issues)

</div>

---

## 🏗️ Architecture

<div align="center">

![JobFlow Architecture](ArchitectureDiagram.png)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔗 **Visual Workflow Builder** | Drag, drop, and connect nodes to create your perfect job hunting pipeline |
| 🌐 **Multi-Platform Scraping** | Scrape jobs from LinkedIn, Naukri, RemoteOK, Google Jobs, and Wellfound |
| 📧 **Smart Email Digests** | Receive beautifully formatted job listings directly in your inbox |
| 🔄 **Data Normalization** | Clean, deduplicate, and standardize job data across sources |
| 🎯 **Advanced Filtering** | Filter by title, company, location, salary, experience level, and date posted |
| ⏰ **Scheduled Execution** | Set it and forget it with automated daily/weekly runs |
| 🔐 **Secure Authentication** | JWT-based auth with industry-standard security practices |
| 📊 **Execution Tracking** | Monitor your workflow runs with detailed logs |
| 🔒 **API Proxy** | Backend URL hidden via Vercel rewrites for security |

---

## 🎬 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Trigger   │────▶│ Job Sources │────▶│  Normalize  │────▶│   Filter    │
│   (Daily)   │     │ (LinkedIn,  │     │   (Clean,   │     │  (By Title, │
│             │     │  Google...) │     │  Dedupe)    │     │  Location)  │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                                                                   ▼
                                                           ┌─────────────┐
                                                           │ Daily Email │
                                                           │   Digest    │
                                                           └─────────────┘
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20+ with Express
- **Language:** TypeScript (Strict Mode)
- **Database:** MongoDB with Mongoose
- **Auth:** JWT with bcrypt password hashing
- **Scraping:** Axios + Cheerio (lightweight, no browser required)
- **Email:** Resend (recommended) or Nodemailer SMTP
- **Scheduling:** node-cron
- **Security:** Helmet, CORS, Rate Limiting, Input Validation (Zod)
- **Logging:** Winston with structured logs

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Workflow UI:** React Flow
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Notifications:** Sonner (toast)
- **Routing:** React Router DOM
- **State:** React Context + Hooks

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Resend API key (free) OR Gmail App Password

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/404paras/JobFlow.git
cd JobFlow
```

2. **Set up the Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Set up the Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Open your browser**
```
http://localhost:5173
```

---

## ☁️ Deployment

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Vercel will auto-detect Vite settings
4. **Enable auto-deploy**: Settings → Git → Production Branch → Enable

### Backend (Render)

1. Go to [render.com](https://render.com) and create a new Web Service
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `npm install && npm run build`
5. Set **Start Command** to `npm start`
6. Add environment variables (see below)

### Environment Variables

#### Backend (Render)
```env
NODE_ENV=production
PORT=6000

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobflow

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Email (Resend - Recommended for cloud)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=JobFlow <onboarding@resend.dev>

# OR use SMTP (may be blocked on some platforms)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://your-app.vercel.app
```

#### Frontend (Vercel)
No environment variables needed! The app uses `/api` proxy in production.

For local development, create `frontend/.env`:
```env
VITE_API_URL=http://localhost:6000/api
```

---

## 📧 Email Setup

### Option 1: Resend (Recommended for Cloud)

1. Sign up at [resend.com](https://resend.com) (free: 100 emails/day)
2. Create an API key
3. Add to your environment:
   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_key
   EMAIL_FROM=JobFlow <onboarding@resend.dev>
   ```

### Option 2: Gmail SMTP (Local Development)

1. Go to Google Account → Security → 2-Step Verification
2. Create an App Password for "Mail"
3. Add to your environment:
   ```env
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

> ⚠️ **Note:** SMTP may be blocked on free cloud tiers (Render, Railway). Use Resend for cloud deployments.

---

## 🔒 Security Best Practices

This app follows industry-standard security practices:

- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Input Validation** - Zod schema validation on all endpoints
- ✅ **Rate Limiting** - Protection against brute force attacks
- ✅ **CORS** - Configured for specific origins only
- ✅ **Security Headers** - Helmet middleware + Vercel headers
- ✅ **API Proxy** - Backend URL hidden from client
- ✅ **Environment Variables** - No secrets in code
- ✅ **Error Handling** - Structured error responses, no stack traces in production

---

## 📁 Project Structure

```
jobflow/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (email, db, env)
│   │   ├── modules/         # Feature modules
│   │   │   ├── email/       # Email service & templates
│   │   │   ├── executor/    # Workflow execution engine
│   │   │   ├── jobs/        # Job data management
│   │   │   ├── resume/      # Resume parsing (beta)
│   │   │   ├── scheduler/   # Cron-based scheduling
│   │   │   ├── scrapers/    # Platform scrapers
│   │   │   ├── users/       # Authentication & users
│   │   │   └── workflows/   # Workflow CRUD
│   │   ├── shared/          # Shared utilities & types
│   │   ├── types/           # TypeScript declarations
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── nodes/       # Workflow node types
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── config/          # Feature flags
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # API client & utilities
│   │   ├── pages/           # Page components
│   │   └── App.tsx          # Main app component
│   ├── vercel.json          # Vercel config with API proxy
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── keep-alive.yml   # Keeps Render backend awake
│
└── README.md
```

---

## 🔧 Available Scripts

### Backend
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production server
npm run lint     # Run ESLint
```

### Frontend
```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 🐛 Troubleshooting

### Email not sending on Render?
Render blocks SMTP ports on free tier. Use Resend instead:
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_key
```

### Vercel not auto-deploying?
1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Ensure "Production Branch" is set to `main`
3. Check "Auto Deploy" is enabled

### Backend cold start taking too long?
Add the GitHub Action to keep it alive:
- `.github/workflows/keep-alive.yml` pings your backend before scheduled jobs

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Paras Garg**

- GitHub: [@404paras](https://github.com/404paras)

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ by Paras Garg**

*Stop refreshing job boards. Let JobFlow do it for you.*

© 2025 JobFlow

</div>
