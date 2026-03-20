# LMS-Server-1 — Application Summary

## What This Is

A backend API for a Learning Management System (LMS) built for an educational institution. It handles student records, course management, document sharing, assignment submissions, a discussion forum, and 1:1 messaging. The frontend is a separate repository (`LMS-Frontend`) served by nginx.

## Tech Stack

- **Runtime**: Node.js 22, TypeScript (strict, ES2022)
- **Framework**: Express 4.x
- **Database**: SQLite via `better-sqlite3` (WAL mode, foreign keys on) — no ORM, raw SQL with helper functions
- **Auth**: JWT (Bearer tokens) + bcryptjs for passwords + Google OAuth (`google-auth-library`)
- **File Uploads**: Multer (10MB limit, UUID filenames, year/month subdirectories)
- **Security**: Helmet, CORS, express-rate-limit
- **Testing**: Vitest + Supertest
- **Deployment**: Docker Compose with nginx reverse proxy and Let's Encrypt TLS

## Project Structure

```
src/
├── server.ts                  # Entry point — starts Express on PORT (default 3001)
├── app.ts                     # Express app setup, mounts all routes under /api/v1, middleware
├── config/
│   ├── database.ts            # SQLite connection, query/queryOne/execute/insert helpers
│   └── jwt.ts                 # JWT generation (sign) and verification
├── controllers/               # Route handlers (one file per domain)
│   ├── authController.ts      # Login, Google OAuth, logout, /me
│   ├── studentsController.ts  # CRUD for student records (admin only)
│   ├── coursesController.ts   # CRUD for courses + member management
│   ├── submissionsController.ts # Student assignment submissions + admin review
│   ├── documentsController.ts # Course document upload/download
│   ├── forumController.ts     # Forum topics and posts
│   ├── messagesController.ts  # 1:1 conversations and messages
│   ├── profileController.ts   # User profile get/update
│   ├── usersController.ts     # User listing, course code assignment
│   └── analyticsController.ts # Admin dashboard statistics
├── routes/                    # Express routers (one per domain, same names as controllers)
├── middleware/
│   ├── auth.ts                # authenticate (JWT validation) + authorize(...roles)
│   └── errorHandler.ts        # AppError class, error handler, 404 handler
├── utils/
│   └── fileUpload.ts          # Multer configs for submissions & documents
├── types/
│   └── index.ts               # Shared TypeScript interfaces
└── scripts/
    ├── initDb.ts              # Creates all tables + seeds admin and sample students
    ├── runSchema.ts           # Applies database/schema.sql
    ├── seedUsers.ts           # Seed user accounts
    ├── seedCourses.ts         # Seed course data
    └── migrate*.ts            # Various migration scripts

database/
└── schema.sql                 # Full database schema (source of truth)

uploads/                       # File storage for submissions and documents
data/                          # SQLite database file (student_ms.db)
```

## Database Schema

| Table | Purpose |
|---|---|
| `users` | All user accounts — id, name, email, password_hash, role (`student`/`admin`), description |
| `students` | Student records — enrollment_number, department, semester; optional `user_id` FK to users |
| `courses` | Courses — title, description, course_code, sections (JSON array of video/link/pdf items) |
| `user_course_codes` | Maps users to course codes they can access |
| `course_enrollments` | Legacy enrollment table (course_id ↔ user_id) |
| `submissions` | Assignment submissions — student_id, title, file_path, status (`pending`/`approved`/`rejected`), feedback |
| `course_documents` | Uploaded materials — title, category, file_path, course_ids (JSON), uploaded_by_id |
| `forum_topics` | Discussion topics — title, body, author_id |
| `forum_posts` | Replies to topics — topic_id, body, author_id |
| `conversations` | 1:1 chat threads — user1_id, user2_id (ordered) with UNIQUE constraint |
| `conversation_messages` | Chat messages — conversation_id, sender_id, body |

### Key Relationships

- `students.user_id` → `users.id` (optional — some student records exist without user accounts)
- `submissions.student_id` → `students.id`, `submissions.reviewed_by_id` → `users.id`
- Course access is controlled through `user_course_codes` (course_code string), not direct course_id enrollment
- `course_documents.course_ids` is a JSON array of course IDs; empty/null means accessible to all

## API Routes (all under `/api/v1`)

| Route Group | Path | Access | Key Operations |
|---|---|---|---|
| **Auth** | `/auth` | Public/Auth | `POST /login`, `POST /google`, `POST /logout`, `GET /me` |
| **Students** | `/students` | Admin | Full CRUD with pagination, search, department/semester filters |
| **Courses** | `/courses` | Auth (admin for writes) | CRUD + `GET/POST/DELETE /:id/members` for access control |
| **Submissions** | `/submissions` | Auth | Students create/update own; admins list all, `POST /:id/review` to approve/reject |
| **Documents** | `/documents` | Auth (admin for writes) | Upload/download course materials, `GET /categories` |
| **Forum** | `/forum` | Auth | `GET/POST /topics`, `GET/POST /topics/:topicId/posts` |
| **Messages** | `/messages` | Auth | `GET/POST /conversations`, `GET/POST /conversations/:id/messages` |
| **Profile** | `/profile` | Auth | `GET /`, `PATCH /` (name, description) |
| **Users** | `/users` | Auth/Admin | `GET /me/courses`, admin: list users, update course codes |
| **Analytics** | `/analytics` | Admin | `GET /dashboard` — totals, submission stats, dept breakdown |

## Authentication & Authorization

- **JWT tokens** in `Authorization: Bearer <token>` header
- **Token payload**: `userId`, `email`, `role`, optional `studentId`
- **Two roles**: `student` and `admin`
- **Google OAuth**: validates `id_token`, auto-creates user account on first login
- **Middleware chain**: `authenticate` (validates JWT, sets `req.user`) → `authorize('admin')` (role gate)
- **Course-level access**: students only see courses matching their assigned course codes in `user_course_codes`

## File Upload Handling

- Submissions accept: PDF, DOC, DOCX, ZIP, TXT
- Documents accept: PDF, DOC, DOCX, ZIP, TXT, PNG, JPG, GIF
- 10MB size limit
- Files stored in `uploads/submissions/` or `uploads/documents/` with `YYYY/MM/` subdirectories
- Filenames are UUIDs to prevent collisions

## Deployment

- **Docker Compose** runs three services: `app` (Node backend), `nginx` (reverse proxy), `certbot` (TLS certs)
- **nginx** serves the frontend SPA from `LMS-Frontend/dist` and proxies `/api/` to the backend on port 3001
- **HTTPS** via Let's Encrypt, domain: `lms.smwebsystems.com`
- **Volumes**: `./data` persists the SQLite DB, `./uploads` persists uploaded files
- **Entrypoint script** (`docker-entrypoint.sh`) runs `initDb.ts` if the database is missing or empty

## Default Seed Data

- Admin account: `admin@kanya.edu` / `admin123`
- Sample student accounts with password: `student123`

## Environment Variables

| Variable | Purpose |
|---|---|
| `NODE_ENV` | development/production |
| `PORT` | Server port (default 3001) |
| `DATABASE_PATH` | SQLite file path (default `./data/student_ms.db`) |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (default `24h`) |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
