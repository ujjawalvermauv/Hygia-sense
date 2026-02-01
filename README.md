# Hygia Sense 🧼🚻

## 📌 Project Overview

Hygia Sense is a smart hygiene monitoring dashboard designed to track cleanliness, tasks, and feedback in public and institutional washrooms.
The system provides real-time monitoring, task assignment, and reporting to improve hygiene management efficiency.

---

## 🎯 Objectives

- Monitor hygiene status using sensor data
- Assign and track cleaning tasks
- Collect user feedback
- Provide real-time analytics and reports
- Improve cleanliness accountability

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router
- React Hook Form
- Zod
- TanStack React Query
- Recharts

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- dotenv
- CORS

---

## 🧱 Project Architecture

Hygia Sense follows a client–server architecture:

- Frontend handles UI and user interaction
- Backend manages business logic and APIs
- MongoDB stores application data
- Communication via REST APIs using JSON

---

## 📂 Project Structure

Hygia-sense/
├── backend/
├── frontend/
├── .gitignore
└── README.md

---

## ⚙️ How to Run the Project Locally

### Backend

cd backend
npm install
npm run dev

Server runs on http://localhost:5000

### Frontend

cd frontend
npm install
npm run dev

Open http://localhost:5173

---

## 🔐 Security & Best Practices

- Environment variables via .env
- CORS enabled
- Input validation using Zod and Mongoose
- node_modules and .env excluded from GitHub

---

## ☁️ Deployment

- Frontend: Netlify
- Backend: Render
- Database: MongoDB Atlas

---

## 🚀 Future Enhancements

- Authentication & role-based access
- IoT sensor integration
- Mobile app support
- Advanced analytics

---

## 👨‍💻 Author

Ujjawal Verma

---

## 📜 License

Educational use only.
