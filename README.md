# ExcelHub

A version control system built specifically for spreadsheets. Think of it as GitHub, but for Excel and CSV files.

## The problem

Teams that work with spreadsheets know the pain: files named `report_final_v2_REAL_final.xlsx`, no clear history of what changed, and no easy way to review or roll back a colleague's edits. ExcelHub brings the Git workflow to spreadsheets without requiring anyone to learn Git.

## What it does

- **Repositories** — organize your spreadsheets in repositories, with visibility control (public or private)
- **Branches** — work on a copy of the data without touching the main version
- **Commits** — every upload is a tracked snapshot with a message and timestamp
- **Cell-level diffs** — see exactly which cells were added, removed, or modified between any two commits
- **Merge requests** — propose changes, review them, and merge with confidence
- **Collaborators** — invite teammates with specific roles (viewer, editor, owner)
- **Audit log** — full history of every action taken in a repository
- **AI assistant** — ask questions about your data directly in the interface

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **PostgreSQL** via **Prisma**
- **NextAuth v5** — GitHub and Google OAuth
- **TailwindCSS 3.4**
- **TanStack React Table**
- `xlsx` for Excel parsing and generation

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- GitHub or Google OAuth app credentials

### Setup

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/excel-hub.git
cd excel-hub
npm install
```

2. Copy the environment file and fill in the values:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@localhost:5432/excelhub
AUTH_SECRET=your-secret-here

AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the database migrations:

```bash
npx prisma migrate dev
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project structure

```
src/
├── app/              # Next.js App Router (pages + API routes)
├── components/       # UI components (repo viewer, diff viewer, chat, etc.)
├── lib/              # Core logic: auth, diff engine, Excel parsing, storage
├── types/            # TypeScript definitions
└── middleware.ts     # Route protection
```

## License

MIT
