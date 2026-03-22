# Stage 01 — Project Setup & Server Start

## Prompt Given
"start server"

## What Was Done
- Confirmed Docker + PostgreSQL running natively on port 5432
- Identified monorepo structure: packages/server + packages/client + packages/shared
- Server: Node.js + Express + Drizzle ORM + PostgreSQL
- Client: React + TypeScript + Vite + React Query

## Start Commands
```
npm run dev:server    → starts Express API on port 3001
npm run dev:client    → starts Vite dev server on port 5173
```

## Stack
| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js, Express, TypeScript      |
| ORM        | Drizzle ORM                       |
| Database   | PostgreSQL 18                     |
| Frontend   | React 18, TypeScript, Vite        |
| State      | React Query (@tanstack/react-query)|
| Auth       | JWT (access + refresh tokens)     |
| PDF        | Custom PDF service                |
| E-Invoice  | ZATCA Phase 2 (Saudi Arabia)      |
