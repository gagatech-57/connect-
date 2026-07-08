# Gaga Connect | Real-Time MERN Chat Application

Gaga Connect is an enterprise-grade, production-ready real-time chat application built using the MERN stack.

## Tech Stack
- **Frontend**: React.js + Vite, Zustand State, Tailwind CSS
- **Backend**: Node.js + Express, Socket.IO, Mongoose / MongoDB Atlas
- **Storage**: Cloudinary Free Tier (via Multer streaming)
- **Email Service**: Nodemailer (Gmail SMTP OTP Verification)

## Features
- Secured JWT authentication with Silent Refresh Token Rotation.
- 6-digit Email OTP Verification before login, with robust anti-abuse rate limits.
- Real-time text chat, media attachments (images, video, documents, and voice messages).
- Direct messaging and group messaging with admin controls, leaving, and deleting groups.
- Message reactions, edits, pinning, starring, and delete for everyone.
- Dark mode theme toggling and Web Audio double-beep sound alerts.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB database)

### Installation
1. Clone the repository.
2. Configure `.env` in the `backend/` folder based on `.env.example`.
3. Install dependencies:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install --legacy-peer-deps`

### Running Locally
- Run backend: `cd backend && npm run dev`
- Run frontend: `cd frontend && npm run dev`
- Open `http://localhost:5173` in your browser.
