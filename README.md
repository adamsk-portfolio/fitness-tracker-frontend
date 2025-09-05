# Fitness Tracker — Flask + React (Docker)
[![CI](https://github.com/AdamSk1234/fitness-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AdamSk1234/fitness-tracker/actions/workflows/ci.yml)


A full-stack app for tracking workouts — exercise types, sessions, goals, and progress charts.  
**Backend:** Flask (REST, SQLAlchemy, JWT, Google OAuth) • **Frontend:** React + TypeScript + MUI • **Infra:** Docker + Nginx + Alembic

---

<p align="center">
  <img src="docs/FitnessTrackerFilm.gif" alt="App demo" style="max-width: 950px; width: 100%;">
</p>

## Highlights

- Email/password auth (JWT) **and** Google Sign-In (OAuth2/OIDC)
- Workout sessions: date, duration (min), calories, exercise type
- Goals with metrics (`duration`, `calories`, `sessions`) and windows (week / month / year)
- Dashboard with charts and quick progress overview
- Clean REST API (Flask-RESTful), DB migrations with Alembic/Flask-Migrate
- Production build via Docker Compose (Nginx serves the SPA and proxies the API)

---

## Tech Stack

**Backend:** Python 3.12, Flask 3, Flask-RESTful, SQLAlchemy 2, Flask-JWT-Extended, Authlib (Google), Flask-Migrate, Gunicorn  
**Frontend:** React + TypeScript + Vite, Material UI, Axios, React Router, Recharts  
**Infra:** Docker & Docker Compose, Nginx, SQLite by default (easy to switch to Postgres)

---

## Quick start (Docker)

1) Create a `.env` file in the repo root (see **Environment variables** below).

2) Build and start the stack:
```bash
docker compose up -d --build
````

3. Apply DB migrations:

```bash
docker compose exec backend flask --app backend.app db upgrade
```

4. Open the app:

* UI: **[http://localhost:8080](http://localhost:8080)**
* API: **[http://localhost:5000/api/](http://localhost:5000/api/)**

---

## Frontend routes

* `/login` — login form + Google button
* `/login/oauth` — OAuth callback handler (stores JWT and redirects)
* `/register` — signup
* `/dashboard` — main overview with charts
* `/types` — exercise types CRUD
* `/sessions` — session list/create
* `/goals` — goals and progress

---

## Useful commands

```bash
# run the whole stack
docker compose up -d

# rebuild single services
docker compose up -d --build backend
docker compose up -d --build frontend

# logs
docker compose logs -f backend
docker compose logs -f frontend

# stop & remove
docker compose down
```
