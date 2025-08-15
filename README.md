# Fitness Tracker — Flask + React (Docker)

Aplikacja do śledzenia treningów: typy ćwiczeń, sesje, cele i wykresy postępów.
**Backend:** Flask (REST, SQLAlchemy, JWT, Google OAuth) • **Frontend:** React + TypeScript + MUI • **Infra:** Docker + Nginx + Alembic

---

## Najważniejsze funkcje

* Rejestracja i logowanie (JWT) + **Logowanie przez Google (OAuth2/OIDC)**
* Sesje treningowe: czas (min), kalorie, data, typ ćwiczenia
* Cele z metrykami: `duration` / `calories` / `sessions` i oknami: tydzień / miesiąc / rok
* Dashboard z wykresami i szybkim podglądem postępów
* API REST (Flask-RESTful), migracje bazy (Alembic/Flask-Migrate)
* Build produkcyjny przez Docker Compose (Nginx serwuje frontend, proxy dla API)

---

## Stos technologiczny

**Backend:** Python 3.12, Flask 3, Flask-RESTful, SQLAlchemy 2, Flask-JWT-Extended, Authlib (Google), Flask-Migrate, Gunicorn
**Frontend:** React + TypeScript + Vite, Material UI, Axios, React Router, Recharts
**Infra:** Docker, Docker Compose, Nginx, SQLite (domyślnie)

---

## Szybki start (Docker)

1. Utwórz plik `.env` w katalogu głównym (patrz sekcja **Zmienne środowiskowe**).
2. Zbuduj i uruchom:

   ```bash
   docker compose up -d --build
   ```
3. Zastosuj migracje bazy:

   ```bash
   docker compose exec backend flask --app backend.app db upgrade
   ```
4. Otwórz: **[http://localhost:8080](http://localhost:8080)**
   (API jest pod **[http://localhost:5000/api/](http://localhost:5000/api/)**)

---

## Logowanie przez Google (OAuth)

1. Wejdź do **Google Cloud Console → APIs & Services → Credentials** i utwórz **OAuth 2.0 Client ID**:

   * **Authorized JavaScript origins:** `http://localhost:8080`
   * **Authorized redirect URIs:** `http://localhost:5000/api/auth/google/callback`
2. Uzupełnij w `.env` wartości `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET`.
3. Przebuduj backend, by wczytał zmienne:

   ```bash
   docker compose up -d --build backend
   ```
4. Na stronie logowania kliknij **Zaloguj przez Google**. Po sukcesie backend przekieruje na
   `FRONTEND_OAUTH_REDIRECT` (domyślnie `/login/oauth`) z tokenem JWT.

---

## Zmienne środowiskowe (`.env`)

Minimalny przykład dla dev:

```env
# JWT
JWT_SECRET_KEY=super-dev-jwt-secret

# Flask session (OAuth wymaga cookies na state/nonce)
SECRET_KEY=super-dev-session-secret
SESSION_SAMESITE=Lax
SESSION_SECURE=False
SESSION_COOKIE_NAME=session

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yyy
FRONTEND_OAUTH_REDIRECT=http://localhost:8080/login/oauth

# CORS
CORS_ORIGINS=http://localhost:8080

# (opcjonalnie) baza – domyślnie SQLite w kontenerze
# DATABASE_URL=sqlite:////app/db/fitness.db
```

> Uwaga: w produkcji ustaw `SESSION_SECURE=True` (HTTPS) i użyj silnych sekretów.

---

## Migracje bazy

Po każdej zmianie modeli (pliki w `backend/models.py`):

```bash
# wygeneruj migrację
docker compose exec backend flask --app backend.app db migrate -m "opis zmiany"

# zastosuj migrację
docker compose exec backend flask --app backend.app db upgrade
```

> Dla SQLite pamiętaj o jawnych nazwach constraintów i `op.batch_alter_table(...)` w migracjach.

---

## API (skrót)

**Auth**

* `POST /api/auth/register` — rejestracja
* `POST /api/auth/login` — logowanie (JWT)
* `GET  /api/auth/google/login` — start OAuth (Google)
* `GET  /api/auth/google/callback` — callback (Google → JWT + redirect)

**Ćwiczenia**

* `GET/POST /api/exercise-types`, `GET/PUT/DELETE /api/exercise-types/:id`

**Sesje**

* `GET/POST /api/sessions`, `GET/PUT/DELETE /api/sessions/:id`

**Cele**

* `GET/POST /api/goals`, `GET/PUT/DELETE /api/goals/:id`

**Raporty**

* `GET /api/reports/summary`

> Autoryzacja: `Authorization: Bearer <JWT>`.

---

## Trasy frontendu

* `/login` — logowanie + przycisk Google
* `/login/oauth` — callback (zapis JWT i przekierowanie)
* `/register` — rejestracja
* `/dashboard` — pulpit z przeglądem
* `/types` — typy ćwiczeń
* `/sessions` — lista/dodawanie sesji
* `/goals` — cele i postęp

---

## Przydatne komendy

```bash
# uruchom cały stack
docker compose up -d

# przebuduj i uruchom backend / frontend
docker compose up -d --build backend
docker compose up -d --build frontend

# logi
docker compose logs -f backend
docker compose logs -f frontend

# zatrzymanie
docker compose down
```

---

## Struktura projektu

```
backend/
  app.py
  config.py
  extensions.py
  models.py
  resources/
    auth.py
    exercise.py
    session.py
    goal.py
    report.py
    oauth_google.py
  utils/
    errors.py
    logging.py
frontend/
  src/
    pages/
      Login.tsx
      Register.tsx
      Dashboard.tsx
      Sessions.tsx
      Goals.tsx
      OAuthCallback.tsx
    components/
    hooks/
  nginx.conf
migrations/
docker-compose.yaml
.env
```

---

## Roadmapa (skrót)

* Testy (backend i frontend)
* Postgres jako alternatywna baza
* Eksport/Import danych (CSV)
* CI (lint + testy) i autodeploy

---

## Licencja

MIT (lub inna — uzupełnij wg potrzeb).

**Jak zaktualizować README teraz**

1. Otwórz `README.md`.
2. Wklej całość powyżej (bez dodatkowych czterech backticków na początku/końcu).
3. Zapisz i wypchnij:

   ```bash
   git add README.md
   git commit -m "docs: aktualizacja README (Docker, OAuth, API)"
   git push
   ```

Jeśli chcesz dorzucić sekcję „Screenshots”, podaj mi 2–3 zrzuty, a złożę ładny blok galerii.
