# NewCarSuperstore (E-Management)

Broker-first auto marketplace: Next.js frontend + FastAPI backend, MySQL, member-only search, testimonials, recommendations, credit application.

## Repo layout
- **frontend/** – Next.js app (search, vehicle detail, favorites, recommendations, testimonials, credit form, reviews).
- **manage_backend/** – FastAPI app (auth, inventory, favorites, payments, recommendations, testimonials, credit, admin).

## Deploy (quick)
1. **Backend**
   - In `manage_backend/`: copy `.env.example` to `.env`, set MySQL, JWT, Google, email, and `CORS_ORIGINS` (e.g. `https://your-frontend.com`).
   - Create DB and migrate: `python scripts/init_db.py`
   - Seed testimonials: `python -m scripts.seed_testimonials`
   - Run: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (or use Gunicorn).
2. **Frontend**
   - In `frontend/`: copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_API_BASE_URL` (and `API_BASE_URL`) to your backend URL.
   - Build: `npm run build` then run: `npm start` (or deploy the output to Vercel / your host).

No static data: testimonials come from the DB; inventory from the scraping DB; review links from env.

## Docs
- Backend API and env: [manage_backend/README.md](manage_backend/README.md)
- Scraping DB schema: [manage_backend/docs/SCRAPING_SCHEMA.md](manage_backend/docs/SCRAPING_SCHEMA.md)
