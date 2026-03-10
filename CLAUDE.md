# ExcelHub - Project Guide

## Overview
ExcelHub is a GitHub-like version control system for spreadsheets (Excel/CSV). Users upload spreadsheets, create branches, track cell-level diffs, collaborate with teammates, and merge changes.

## Tech Stack
- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript 5
- **Database:** PostgreSQL via Prisma 7.4 (`@prisma/adapter-pg`)
- **Auth:** NextAuth 5 (GitHub + Google OAuth, JWT strategy, 30-day sessions)
- **Styling:** TailwindCSS 3.4 + class-based dark mode, green brand palette (50-900)
- **Tables:** TanStack React Table
- **Excel:** `xlsx` library for parsing/generating
- **Validation:** Zod schemas in `src/lib/validators.ts`
- **Icons:** Lucide React
- **AI Chat:** OpenRouter API integration
- **File Storage:** Local filesystem (`/uploads` directory)

## Project Structure
```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/login/           # Login page
│   ├── (main)/                 # Protected routes (dashboard, new, [username]/[repo])
│   ├── api/                    # REST API routes
│   └── layout.tsx, page.tsx    # Root layout + landing
├── components/
│   ├── auth/                   # login-button, user-menu
│   ├── layout/                 # header, footer
│   ├── repo/                   # spreadsheet-viewer, file-upload, diff-viewer, etc.
│   ├── search/                 # command-palette (Cmd+K)
│   ├── ui/                     # Reusable: button, input, badge, modal, avatar, etc.
│   ├── theme-provider.tsx      # Light/dark mode context
│   ├── chat-widget.tsx         # AI assistant
│   └── navigation-progress.tsx # Page transition bar
├── lib/
│   ├── auth.ts + auth.config.ts  # NextAuth setup
│   ├── prisma.ts               # Singleton Prisma client w/ pg Pool
│   ├── utils.ts                # cn(), formatDate(), slugify(), Excel date helpers
│   ├── validators.ts           # Zod schemas for all entities
│   ├── excel.ts                # parseExcelBuffer(), parseCsvBuffer(), snapshotToWorkbook()
│   ├── diff.ts                 # computeDiff() - cell-level change tracking
│   ├── audit.ts                # createAuditLog() (fire-and-forget) + tx variant
│   └── s3.ts                   # Local file ops (uploadToLocal, getFileFromLocal, etc.)
├── types/                      # TypeScript defs + NextAuth augmentation
└── middleware.ts               # Protects /dashboard and /new routes
```

## Database Models (Prisma)
- **User, Account, Session, VerificationToken** - NextAuth standard
- **Repository** - name, slug, visibility (PUBLIC/PRIVATE), ownerId
- **Branch** - name, headCommitId (FK to Commit)
- **Commit** - hash, message, fileUrl, jsonSnapshot (full Excel data), authorId
- **Collaborator** - role (OWNER/EDITOR/VIEWER), userId, repoId
- **MergeRequest** - title, description, status (OPEN/MERGED/CLOSED), source/target branches
- **AuditLog** - action enum, userId, repoId, metadata JSON, IP, userAgent

## API Routes
- `POST /api/repos` | `GET/PATCH/DELETE /api/repos/[repoId]`
- `GET /api/repos/by-slug/[username]/[repo]`
- `GET|POST /api/repos/[repoId]/branches`
- `GET|POST /api/repos/[repoId]/commits`
- `GET|POST /api/repos/[repoId]/collaborators`
- `GET|POST /api/repos/[repoId]/merge-requests` | `GET|PATCH .../[mrId]`
- `GET /api/repos/[repoId]/audit-logs`
- `POST /api/upload` | `GET /api/repos/[repoId]/download`
- `GET /api/search` | `POST /api/chat`

## Page Routes
- `/` - Landing page
- `/login` - OAuth login
- `/dashboard` - User repos list (protected)
- `/new` - Create repo (protected)
- `/[username]/[repo]` - Repo home (spreadsheet viewer)
- `/[username]/[repo]/branches` | `/commits` | `/commit/[id]`
- `/[username]/[repo]/compare/[id1]/[id2]` - Diff viewer
- `/[username]/[repo]/merge-requests` | `/merge-requests/new` | `/merge-requests/[id]`
- `/[username]/[repo]/settings` | `/audit-log`

## Patterns & Conventions
- **State:** No global store. Uses React Context (theme), NextAuth `useSession()`, local `useState`, URL params for pagination/filters
- **Data fetching:** Server components for SSR + client `fetch()` calls to API routes
- **Path alias:** `@/*` maps to `src/*`
- **Locale:** pt-BR for number formatting (`formatCellValue` in utils.ts)
- **Commit hashes:** Random 4-byte hex via `generateCommitHash()`
- **Audit logging:** Fire-and-forget async, also supports Prisma transactions
- **All APIs** check auth via `auth()`, use Prisma, and include role-based access control

## Environment Variables
```
DATABASE_URL, AUTH_SECRET
AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME
OPENROUTER_API_KEY
NEXT_PUBLIC_APP_URL
```

## Key Business Logic
- **File Upload Flow:** Upload → base64 decode → save locally → parse Excel → create Commit (w/ jsonSnapshot) → update Branch head → audit log
- **Diff Engine (`src/lib/diff.ts`):** Compares two jsonSnapshots cell-by-cell, outputs added/removed/modified cells with summary stats
- **Merge Requests:** Compare source vs target branch head commits, resolve conflicts via `merge-conflict-resolver.tsx`
