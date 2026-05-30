# NoBlindSpot 🗺️

> Map what you don't know.

An AI-powered knowledge gap analyzer. Enter any topic, and NoBlindSpot generates a complete knowledge tree — revealing every sub-concept and area you might be missing.

---

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 18, TailwindCSS, Vite   |
| Backend  | Node.js, Express              |
| Database | MongoDB + Mongoose            |
| Auth     | JWT + bcrypt                  |
| AI       | Anthropic Claude API          |

---

## Project Structure

```
noblindspot/
├── client/          # React frontend (Vite)
└── server/          # Express + Node backend
```

---

## Setup & Installation

### 1. Clone & install dependencies

```bash
# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

### 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Fill in your `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/noblindspot
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run in development

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Frontend → http://localhost:5173  
Backend  → http://localhost:5000

---

## Renaming the App

To change the app name, update **one file on each side**:

- **Backend:** `server/config/appConfig.js`
- **Frontend:** `client/src/config/appConfig.js`

```js
export const APP_CONFIG = {
  name: "YourNewName",       // ← change here
  tagline: "Your tagline",
};
```

That's it — the name propagates everywhere automatically.

---

## API Endpoints

### Auth
| Method | Route               | Description     |
|--------|---------------------|-----------------|
| POST   | /api/auth/register  | Register user   |
| POST   | /api/auth/login     | Login user      |
| GET    | /api/auth/me        | Get current user|

### Maps
| Method | Route                   | Description              |
|--------|-------------------------|--------------------------|
| POST   | /api/maps/generate      | Generate AI knowledge map|
| GET    | /api/maps               | Get all user maps        |
| GET    | /api/maps/:id           | Get single map           |
| PATCH  | /api/maps/:id/nodes     | Save self-assessment     |
| DELETE | /api/maps/:id           | Delete a map             |
