# ⚡ Inspirify - Quote Generator with History & Favorites

An inspiring, full-featured quote generation web application with persistent SQLite favorites storage, external API integration with resilient fallback error handling, and history tracking.

![Inspirify Banner](https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80)

---

## 🌟 Key Features

### 1. 🔄 Daily & Random Quote Generation
- Fetches real-time inspirational quotes from public APIs (`DummyJSON`, `ZenQuotes`).
- **Deterministic Daily Quote**: Consistent Quote of the Day mapped to the calendar day.
- **Topic Filtering**: Filter quotes across curated themes — **Learning**, **Work**, and **Creativity**.

### 2. 🛡️ Resilient Synthetic Fallback Engine
- Features **80 curated local synthetic quote records** across *Learning*, *Work*, and *Creativity*.
- **Automatic API Error Handling**: If an external API is rate-limited, blocked, or times out (>2.2s), the backend seamlessly transitions to synthetic records without disrupting user experience.
- **Offline / Fallback Simulator Switch**: Interactive toggle switch in the UI header to demonstrate API fallback handling on demand.

### 3. 💾 SQLite Persistent Favorites & Vault
- **Backend Database Table**: Real SQLite storage via Node.js native `DatabaseSync` (`node:sqlite`).
- **One-Click Favoriting**: Animated heart toggle with duplicate prevention.
- **Vault Drawer**:
  - Live search filter by author name or quote text.
  - Topic category filter (*Learning*, *Work*, *Creativity*).
  - Sorting: *Newest*, *Oldest*, *Author (A-Z)*.
  - Export favorites to **JSON** or **CSV** formats.

### 4. 📜 Viewing History Log
- Automatically records viewed quotes in a dedicated SQLite `history` table.
- Direct favorite toggle for any quote in the history feed.
- One-click clear history utility.

### 5. 📋 Copy-to-Clipboard & Sharing
- Native clipboard integration with animated checkmark feedback and toast notifications.
- **Social Sharing**: Direct share to X (Twitter) and WhatsApp.
- **🎨 HTML5 Canvas Quote Card Exporter**: Generates a high-definition, stylized 1200x700 PNG quote card image for social media sharing.

### 6. 🔊 Text-to-Speech (Audio Voice)
- Web Speech API integration reads quotes aloud with audio wave animation.

### 7. 🎨 Rich Aesthetic & Design System
- Modern glassmorphism UI with ambient glowing gradients.
- Dark / Light mode toggle with persistent state in `localStorage`.
- Responsive layout optimized for desktop, tablet, and mobile displays.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Variables), Semantic HTML5.
- **Backend Server**: Node.js & Express.
- **Database**: SQLite (Node.js native `node:sqlite` persistent database).
- **External APIs**: DummyJSON & ZenQuotes.

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ or v24+ recommended)
- Git

### Installation & Run

1. Clone or open the repository:
   ```bash
   git clone <your-repo-link>
   cd quote-generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the application:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3005
   ```

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/quote/random` | Fetches a random quote (with `?topic=Learning&forceFallback=true`) |
| `GET` | `/api/quote/daily` | Fetches the deterministic quote of the day |
| `GET` | `/api/quotes/fallback` | Returns all 80 synthetic fallback records |
| `GET` | `/api/favorites` | Returns favorited quotes (supports `?topic=`, `?search=`, `?sort=`) |
| `POST` | `/api/favorites` | Saves a new quote to favorites in SQLite database |
| `POST` | `/api/favorites/toggle` | Toggles favorite status for a given quote |
| `DELETE` | `/api/favorites/:id` | Deletes a favorite by ID |
| `GET` | `/api/history` | Returns viewed quote history |
| `DELETE` | `/api/history/clear` | Clears all viewed history |
| `GET` | `/api/stats` | Returns total favorites, viewed count, and topic breakdown |

---

## 📦 Deployment Guide

### Deploying to Render (Recommended for Fullstack + SQLite)
1. Push code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: complete quote generator with favorites history and sqlite"
   git push origin main
   ```
2. Go to [Render.com](https://render.com) and create a **New Web Service**.
3. Connect your GitHub repository.
4. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Deploy Web Service** to receive your live web app URL!

---

## 📄 License
ISC License &copy; 2026. Built with focus on resilient API design and visual craftsmanship.
