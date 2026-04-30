# Humanizer AI (Next.js 14 + Tailwind)

A production-ready, Vercel-deployable Humanizer AI web app.

## Setup

1) Install dependencies

```bash
npm install
```

2) Add env

Create/Update `.env.local`:

```bash
HUGGINGFACE_API_KEY=your_key_here
```

3) Run

```bash
npm run dev
```

Open:

- http://localhost:3000/dashboard

## Vercel Deployment

- Import the repo into Vercel
- Add Environment Variable `HUGGINGFACE_API_KEY`
- Deploy

## API Routes

- `POST /api/upload` (multipart form field `files[]`)
- `POST /api/process` JSON `{ text, mode }`
- `POST /api/detect` JSON `{ text }`
