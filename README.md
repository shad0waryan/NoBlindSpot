# NoBlindSpot 🗺️

### Map what you don't know.

NoBlindSpot is an AI-powered learning platform that helps you uncover hidden gaps in your understanding before they become obstacles.

Most learning tools answer questions. NoBlindSpot goes a step further.

Give it any topic—from Operating Systems and Machine Learning to System Design and Database Management—and it generates a structured knowledge map showing the concepts, subtopics, and dependencies required to master it.

Instead of wondering *"What should I learn next?"*, you'll know exactly where your blind spots are and how to close them.

---

## Why NoBlindSpot?

Learning often feels complete until you discover the one concept you never knew existed.

A missing prerequisite, an overlooked topic, or a misunderstood dependency can create blind spots that slow progress and weaken understanding.

NoBlindSpot is designed to eliminate those blind spots by helping learners visualize the complete landscape of a subject.

Whether you're preparing for interviews, studying for exams, learning a new technology, or exploring a new field, NoBlindSpot helps you build confidence through comprehensive understanding.

---

## Key Features

### 🧠 AI-Powered Knowledge Mapping

Generate structured learning maps for any topic in seconds.

### 🔍 Knowledge Gap Detection

Identify concepts you may be missing before they become obstacles.

### 🌳 Interactive Concept Trees

Explore topics through intuitive visual hierarchies and dependencies.

### 📚 Personalized Learning Journey

Track your understanding and focus on the concepts that matter most.

### 💾 Save & Revisit Maps

Store generated maps and continue learning at your own pace.

### 🔐 Secure User Accounts

JWT-based authentication with protected user-specific learning data.

---

## How It Works

1. Enter a topic you want to learn.
2. NoBlindSpot generates a comprehensive knowledge map using AI.
3. Explore concepts and their relationships.
4. Assess your understanding of each node.
5. Discover weak areas and prioritize your learning.
6. Build a complete understanding with confidence.

---

## Example

**Input**

```text
Operating Systems
```

**Generated Learning Areas**

```text
Operating Systems
├── Process Management
├── Memory Management
├── CPU Scheduling
├── Synchronization
├── Deadlocks
├── Virtual Memory
├── File Systems
├── I/O Management
└── Security & Protection
```

Instead of learning randomly, you receive a structured roadmap of everything required to understand the topic thoroughly.

---

## Technology Stack

| Layer            | Technology                   |
| ---------------- | ---------------------------- |
| Frontend         | React 18, Vite, Tailwind CSS |
| Backend          | Node.js, Express             |
| Database         | MongoDB, Mongoose            |
| Authentication   | JWT, bcrypt                  |
| AI Integration   | OpenRouter API               |
| State Management | React Context API            |

---

## Project Structure

```text
noblindspot/
├── client/
│   ├── src/
│   └── public/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   └── config/
│
└── README.md
```

---

## Use Cases

### 🎯 Interview Preparation

Identify missing concepts before technical interviews.

### 📖 Exam Revision

Build complete topic coverage instead of revising randomly.

### 💻 Learning New Technologies

Visualize the entire learning path for unfamiliar domains.

### 🚀 Career Growth

Understand what skills and concepts are required for the next level.

### 🧠 Self-Directed Learning

Transform curiosity into structured learning journeys.

---

## Vision

Learning shouldn't depend on discovering missing concepts by accident.

NoBlindSpot aims to become an intelligent learning companion that helps learners understand not only what they know, but also what they don't know.

By making knowledge gaps visible, learning becomes more efficient, more structured, and significantly more effective.

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/shad0waryan/NoBlindSpot.git
cd NoBlindSpot
```

### Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### Configure Environment Variables

Create:

```text
server/.env
```

Example:

```env
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Run the application

```bash
# Backend
cd server
npm run dev

# Frontend
cd client
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:5001

---

Built for learners who want a complete picture, not just answers.
