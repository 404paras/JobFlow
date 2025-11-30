# 🚀 JobFlow

<div align="center">

![JobFlow Logo](frontend/public/logo.svg)

### **Automate Your Job Hunt Like a Pro**

*A powerful workflow automation platform that scrapes jobs from multiple sources and delivers them straight to your inbox.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)

**Created by [Paras Garg](https://github.com/404paras)**

</div>

---

## 🏗️ Architecture

<div align="center">

![JobFlow Architecture](ArchitectureDiagram.png)

</div>

---

## ✨ Features

🔗 **Visual Workflow Builder** - Drag, drop, and connect nodes to create your perfect job hunting pipeline

🌐 **Multi-Platform Scraping** - Automatically scrape jobs from LinkedIn, Indeed, and Naukri

📧 **Smart Email Digests** - Receive beautifully formatted job listings directly in your inbox

🔄 **Data Normalization** - Clean, deduplicate, and standardize job data across sources

🎯 **Powerful Filtering** - Filter jobs by title, company, location, salary, and more

⏰ **Scheduled Execution** - Set it and forget it with automated daily/weekly runs

🔐 **User Authentication** - Secure JWT-based auth to protect your workflows

📊 **Execution Tracking** - Monitor your workflow runs with detailed logs

---

## 🎬 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Trigger   │────▶│ Job Sources │────▶│  Normalize  │────▶│   Filter    │
│   (Daily)   │     │ (LinkedIn,  │     │   (Clean,   │     │  (By Title, │
│             │     │  Indeed...)  │     │  Dedupe)    │     │  Location)  │
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
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (JSON Web Tokens)
- **Scraping:** Puppeteer, Cheerio
- **Email:** Nodemailer
- **Scheduling:** node-cron
- **Security:** Helmet, CORS, Rate Limiting

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Workflow UI:** React Flow
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Routing:** React Router DOM

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- SMTP credentials (Gmail App Password recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/jobflow.git
cd jobflow
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

## ⚙️ Environment Variables

### Backend (.env)

```env
# Server
PORT=5001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jobflow

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=JobFlow <your-email@gmail.com>

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5001/api
```

---

## 📁 Project Structure

```
jobflow/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── modules/         # Feature modules
│   │   │   ├── email/       # Email service & templates
│   │   │   ├── executor/    # Workflow execution engine
│   │   │   ├── jobs/        # Job data management
│   │   │   ├── scheduler/   # Cron-based scheduling
│   │   │   ├── scrapers/    # Platform scrapers
│   │   │   ├── users/       # Authentication
│   │   │   └── workflows/   # Workflow CRUD
│   │   ├── shared/          # Shared utilities
│   │   ├── app.ts           # Express app setup
│   │   └── index.ts         # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── nodes/       # Workflow node types
│   │   │   └── ui/          # UI components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utilities & API client
│   │   ├── pages/           # Page components
│   │   └── App.tsx          # Main app component
│   └── package.json
│
└── README.md
```

---

## 📧 Setting Up Gmail for Email

1. Go to your Google Account → Security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate a new app password for "Mail"
5. Use this password in your `SMTP_PASS` env variable

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

