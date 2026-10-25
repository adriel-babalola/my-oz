# my-oz

My Oz is a deadline tracker built as the Yellow Brick Road. Paste text or upload an image, let the AI pull out the task and due date, and watch the deadline land as a marker along a winding golden road.

## Features

- Single-user JWT login with a short road-themed transition loader
- AI deadline extraction from pasted text or uploaded images
- Offline text parser fallback when the AI is unavailable
- Editable deadlines with descriptions and due dates
- Local-first storage with MongoDB sync
- Responsive road interface with a transparent floating navigation bar
- Image recognition through OpenRouter with an automatic vision-model fallback

## Stack

- React 19, TypeScript, Vite
- Tailwind CSS, Framer Motion, Zustand, date-fns, lucide-react
- Express 5 API
- MongoDB for cloud deadline sync
- OpenRouter for text and image extraction

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

The API runs on http://localhost:8787. Vite proxies `/api` requests during development. Without an OpenRouter key, text extraction falls back to the offline parser. Without MongoDB, deadlines remain local to the browser.

## Environment

Copy `.env.example` and fill in the values you need. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Enables AI text and image extraction |
| `OPENROUTER_MODEL` | Text model, defaults to the free Gemma 4 route |
| `OPENROUTER_VISION_MODEL` | Optional image model, defaults to `OPENROUTER_MODEL` |
| `MONGODB_URI` | MongoDB connection string for cloud sync |
| `MONGODB_DB` | Database name, defaults to `my-oz` |
| `AUTH_USERNAME` | Login username |
| `AUTH_PASSWORD` | Login password |
| `AUTH_DISPLAY_NAME` | Name shown in the app |
| `AUTH_TOKEN_TTL` | JWT lifetime, defaults to `7d` |
| `JWT_SECRET` | JWT signing secret, at least 32 characters |
| `CORS_ORIGIN` | Comma-separated allowed browser origins |
| `PUBLIC_APP_URL` | Public app URL used for attribution |
| `PORT` | API port, defaults to `8787` |

Generate a JWT secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite and the API with reload |
| `npm run build` | Type-check and build the frontend to `dist/` |
| `npm start` | Serve the built app and API on port 8787 |
| `npm run preview` | Build, then serve |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | Run oxlint |
| `npm test` | Run server auth, deadline, and extraction tests |

## Production

```bash
npm run build
npm start
```

The Express server serves both `dist/` and `/api` on the same origin. Set `CORS_ORIGIN` only if a separate frontend needs API access.

## Security notes

- `.env`, keys, logs, build output, and `node_modules` are ignored by Git.
- Credentials and API keys stay on the server.
- The browser stores only the JWT in local storage.
- Authentication is intentionally single-user, not a multi-user account system.

## Layout

```text
server/              Express API, auth, MongoDB, extraction
src/components/auth/ Login, session gate, road loader
src/components/ui/   Top bar, sidebar, AI panel, deadline card
src/components/journey/ Road and deadline markers
src/lib/             API clients, curve math, date helpers
src/store/           Zustand auth and deadline stores
docs/                Original build notes
public/              Road artwork and favicon assets
```
