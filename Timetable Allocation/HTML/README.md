# 🎓 College Faculty Timetable Allocation System

A modern, feature-rich web application for managing college faculty class schedules. Built with **pure HTML, CSS, and JavaScript** — no frameworks, no backend required.

![Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JavaScript-blue) ![Storage](https://img.shields.io/badge/Storage-localStorage-orange) ![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Key Features

- 🔐 **Login & Signup** — Secure authentication with **IT Support Team approval workflow**
- 🗓️ **Schedule Management** — View, add, edit & delete class schedules
- 🏷️ **Multi-Dimensional Filtering** — Filter by **Department**, **Faculty**, or **Classroom**
- ⚡ **Conflict Detection** — Automatic detection of room/faculty double-bookings
- 🤖 **AI Chat Assistant** — Rule-based NLP to find available classrooms, answer schedule queries & detect conflicts
- 📊 **Dashboard** — Stats, weekly class distribution chart & conflict alerts
- 🌗 **Advanced Theme** — Dark/Light mode, glassmorphism, animated blobs, smooth transitions
- 📱 **Fully Responsive** — Works on desktop, tablet & mobile

---

## 🚀 Getting Started

### Option 1: Open Directly (Recommended)

Simply open **`index.html`** in any modern web browser.

### Option 2: Local Server (Optional)

If you prefer, you can run a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`.

---

## 🔑 Default Accounts

| Role | Email | Password |
| ------ | ------- | ---------- |
| **Admin/HOD** | `admin@college.edu` | `admin123` |
| **Faculty** | `priya@college.edu` | `faculty123` |
| **IT Support** | `support@college.edu` | `support123` |

> On the login page, click **"⚡ Use Demo Account"** to auto-fill admin credentials.

---

## 🗂️ Project Structure

```
├── index.html          # Login page
├── signup.html         # Sign up (IT Support approval workflow)
├── dashboard.html      # Dashboard with stats & weekly snapshot
├── schedule.html       # Schedule CRUD + filters + timetable grid
├── chat.html           # AI Assistant chat interface
├── it-support.html     # IT Support account approvals
├── css/
│   └── style.css       # Advanced theme (dark/light, glassmorphism)
└── js/
    ├── data.js         # Seed data + localStorage service
    ├── auth.js         # Login/signup validation
    ├── app.js          # Theme, sidebar, toasts, auth guard
    ├── dashboard.js    # Dashboard logic
    ├── schedule.js     # Schedule CRUD + conflict detection
    ├── chat.js         # AI chat NLP engine
    └── it-support.js   # Account approval logic
```

---

## 🤖 AI Assistant Query Examples

Try these in the chat:

| Query | Result |
| ------- | -------- |
| "Which rooms are free on Monday at 10:00?" | Lists available classrooms |
| "Show me Dr. Rajesh Kumar schedule" | Faculty schedule |
| "What is in A-101 on Wednesday?" | Room schedule |
| "Any conflicts on Tuesday?" | Conflict detection |
| "Show CSE schedule for Friday" | Department schedule |
| "What is today's schedule?" | Today's classes |
| "Help" | All capabilities |

---

## 🧩 Modules

1. **Authentication Module** — Login, signup, IT approval, session management
2. **Schedule Management Module** — CRUD, filtering, timetable grid view
3. **AI Assistant Module** — Rule-based NLP for room availability & schedule queries
4. **Dashboard Module** — Statistics, weekly distribution, conflict alerts

---

## 📅 Development Phases

| Phase | Description | Status |
| ------- | ------------- | -------- |
| **Phase 1** | Layout / Form designing | ✅ Complete |
| **Phase 2** | Layout/Form design with code implementation | ✅ Complete |
| **Phase 3** | Layout/Form design with validation | ✅ Complete |
| **Phase 4** | Full system completion and testing (100%) | ✅ Complete |

---

## ⚙️ System Requirements

- Any modern web browser (Chrome, Edge, Firefox, Safari, Opera)
- No server or database needed
- JavaScript enabled

## 📄 License

MIT License — free to use, modify, and distribute.
