# CodeMap 🛰️
CodeMap is a developer intelligence platform that turns any GitHub repository into an interactive architecture map with AI-powered insights.  
It replaces slow manual codebase exploration with a visual, guided, and explainable analysis workflow.

---
## Problem Statement
Developers, reviewers, and hackathon teams often struggle with understanding unfamiliar codebases quickly.  
CodeMap solves this by enabling:
- visual dependency exploration in 3D
- real-time repository analysis progress tracking
- AI-assisted node-level code understanding

---
## Solution Overview
CodeMap combines:
- a **React + Three.js frontend layer** for immersive architecture exploration and workflow navigation
- a **FastAPI + Celery backend layer** for repository ingestion, parsing, orchestration, and APIs
- a **PostgreSQL + Neo4j + Redis + AI integration layer** for job tracking, graph intelligence, queueing, and LLM-powered enrichment
This delivers faster onboarding, clearer architecture decisions, and better engineering collaboration.

---
## Architecture (Visual Representation)
```mermaid
flowchart LR
    A[👤 Developer] --> B[🖥️ React Frontend]
    B --> C[⚙️ FastAPI Backend]
    C --> D[🧵 Celery Worker]
    C --> E[(PostgreSQL)]
    D --> F[(Neo4j Graph DB)]
    D --> G[(Redis Queue/Broker)]
    D --> H[🤖 AI Services<br/>Ollama + Groq]
    B --> I[📊 3D/2D Graph Explorer]
    F --> C
    C --> B
```

---
## Repository Analysis Flow (Visual Representation)
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend
    participant B as Backend API
    participant W as Celery Worker
    participant S as Services (Git/AI/Graph)

    U->>F: Submit repository URL
    F->>B: POST /api/v1/repos/analyze
    B->>W: Enqueue analysis job
    W->>S: Clone, parse, score, summarize
    S-->>W: Enriched graph data
    W-->>B: Job status and completion updates
    F->>B: Poll job status + fetch graph
    B-->>F: Nodes, edges, and intelligence payload
    F-->>U: Interactive architecture and insights
```

---
## Tech Stack 🧰
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | Build fast, interactive product UI |
| Styling | Tailwind CSS, Framer Motion | Deliver modern visual system and motion |
| Data/State | Zustand, React Router | Manage global state and app navigation |
| Backend | FastAPI, SQLAlchemy, Pydantic | Serve APIs, schemas, and async data access |
| Core Engine/Logic | Celery, Tree-sitter, GitPython | Run background analysis and code intelligence |
| Tooling | Redis, PostgreSQL, Neo4j, Ollama, Groq | Queue jobs, persist data, and power AI insights |

---
## Project Structure (Architecture View) 🏗
```mermaid
flowchart TD
    A[devclash-vanarsena] --> B[frontend]
    A --> C[backend]
    A --> D[assets]
    A --> E[README.md]

    B --> B1[src]
    B --> B2[documents]
    B --> B3[package.json]

    C --> C1[app]
    C --> C2[requirements.txt]
    C --> C3[.env.example]

    C1 --> C11[routers]
    C1 --> C12[services]
    C1 --> C13[models]
    C1 --> C14[db]
    C1 --> C15[main.py]
    C1 --> C16[worker.py]
```

---
## Environment Configuration
Use local environment setup before running:

- configure backend `.env` from `backend/.env.example`
- start required services: Redis, PostgreSQL, and Neo4j
- provide AI/runtime keys and hosts (Groq API key, Ollama host list)
Important: Never commit real API keys, secrets, mnemonics, or production credentials.

---
## Key Features
- analyze public repositories with asynchronous job tracking
- visualize architecture in interactive 3D and structured explorer views
- inspect dependency edges, code roles, and file-level intelligence
- monitor pipeline progress from ingest to graph completion
- ask node-contextual AI questions for faster code comprehension

---
## Demo Video 🎥
GitHub README does not reliably support inline MP4 playback in all views.

👉 **[Watch Demo Video in GitHub Player](https://github.com/shreyash-devs/devclash-vanarsena/blob/main/assets/project-demo.mp4)**

👉 [Direct download (MP4)](https://raw.githubusercontent.com/shreyash-devs/devclash-vanarsena/main/assets/project-demo.mp4)

---
## 👨‍💻 Author
Made with ❤️ by Vanar Sena.
