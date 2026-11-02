# SRAMS Backend

**Student Result & Attendance Management System: REST API**

A role-based backend for managing students, subjects, daily attendance and semester results. Built with **Node.js, Express 5, MongoDB (Mongoose 9)** and **JWT authentication**. Results follow the **GTU (Gujarat Technological University) grading scheme**: internal marks out of 30, external marks out of 70, a 10-point grade scale, and credit-weighted **SGPA** calculation.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Available Scripts](#available-scripts)
7. [Authentication & Roles](#authentication--roles)
8. [API Reference](#api-reference)
9. [Data Models](#data-models)
10. [Grading & SGPA Logic](#grading--sgpa-logic)
11. [Attendance Logic](#attendance-logic)
12. [Error Handling](#error-handling)
13. [Deployment on Render](#deployment-on-render)
14. [Troubleshooting](#troubleshooting)
15. [Known Limitations & Roadmap](#known-limitations--roadmap)
16. [License](#license)

---

## Features

- **JWT authentication** with register, login and "current user" endpoints
- **Three roles**: `admin`, `teacher`, `student`, each with its own permissions
- **Student management**: admins create, update and delete students; admins and teachers can list, search and filter them
- **Subject management**: admin-managed subjects with semester and credit values
- **Bulk attendance marking**: mark a whole class for a subject and date in one request. Safe to re-submit the same day, because records are upserted
- **Attendance summaries**: per-subject and overall attendance percentages
- **Bulk marks entry**: enter internal and external marks for a whole class at once, with the total, grade and grade point computed automatically
- **Marksheets**: student marksheet with credit-weighted **SGPA**, filterable by semester
- **Soft deactivation**: setting `isActive: false` on a user blocks login and API access
- **Health-check endpoint** for uptime monitors and deployment platforms

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (20+ recommended; deployed on 24.x) |
| Framework | Express `^5.2.1` |
| Database | MongoDB via Mongoose `^9.7.3` |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Config | `dotenv` |
| CORS | `cors` |
| Validation | `express-validator` (installed, but not yet wired into routes; see [Roadmap](#known-limitations--roadmap)) |
| Dev tooling | `nodemon` |

---

## Project Structure

```
srams-backend/
├── server.js                    # App entry point: middleware, routes, error handlers
├── package.json
├── .env.example                 # Template for environment variables
├── .gitignore
│
├── config/
│   └── db.js                    # MongoDB connection (exits process on failure)
│
├── middleware/
│   └── authMiddleware.js        # protect (JWT verify) + authorize(...roles)
│
├── models/
│   ├── User.js                  # Admins, teachers and students (single collection)
│   ├── Subject.js               # Subject name, code, semester, credits
│   ├── Attendance.js            # One row per student + subject + date
│   └── Result.js                # One row per student + subject
│
├── controllers/
│   ├── authController.js        # register, login, getMe
│   ├── studentController.js     # CRUD for students
│   ├── subjectController.js     # CRUD for subjects
│   ├── attendanceController.js  # mark, fetch, summaries
│   └── resultController.js      # enter marks, fetch, marksheet + SGPA
│
├── routes/
│   ├── authRoutes.js            # /api/auth
│   ├── studentRoutes.js         # /api/students
│   ├── subjectRoutes.js         # /api/subjects
│   ├── attendanceRoutes.js      # /api/attendance
│   └── resultRoutes.js          # /api/results
│
└── utils/
    ├── generateToken.js         # Signs JWTs (payload: id, role)
    └── grading.js               # computeGrade(): GTU grade + grade point
```

**Request flow:** `Route → protect (JWT) → authorize (role) → Controller → Model → MongoDB`

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **MongoDB**: either a local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **npm**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/230220131041-Poorv/srams-backend.git
cd srams-backend

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# then edit .env with your own values (see the next section)

# 4. Start the server in development mode (auto-restart on changes)
npm run dev
```

You should see:

```
Server running on port 5000
MongoDB connected: <host>
```

Verify it works:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","message":"Server is running"}
```

### Creating your first admin

The `register` endpoint accepts a `role` field, so you can create the first admin directly:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "StrongPassword123",
    "role": "admin"
  }'
```

> ⚠️ **Security note:** `register` is currently public and lets the caller choose any role. Restrict it before going to production (see [Roadmap](#known-limitations--roadmap)).

---

## Environment Variables

Create a `.env` file in the project root (never commit it; it is already in `.gitignore`).

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port the server listens on. Render sets this automatically. |
| `MONGO_URI` | **Yes** | none | MongoDB connection string. |
| `JWT_SECRET` | **Yes** | none | Secret used to sign and verify JWTs. Use a long random string. |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (e.g. `1h`, `7d`). |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin (your frontend URL). |

Example `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_management
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Atlas connection string format:**

```
mongodb+srv://<username>:<password>@<cluster-host>/<dbname>?retryWrites=true&w=majority
```

URL-encode special characters in the password (`@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`).

---

## Available Scripts

| Command | What it does |
|---|---|
| `npm start` | Runs `node server.js` (production) |
| `npm run dev` | Runs `nodemon server.js` (development, auto-reload) |
| `npm run seed` | Runs `node seed.js`. **Note:** `seed.js` is not included in the repository yet, so this script will fail until you add one. |

---

## Authentication & Roles

### How auth works

1. Log in (or register) to receive a **JWT**.
2. Send it on every protected request:

```
Authorization: Bearer <your_token>
```

3. The `protect` middleware verifies the token, loads the user from the database, and rejects the request if the user is missing or `isActive` is `false`.
4. The `authorize(...roles)` middleware then checks that the user's role is permitted for the route.

The JWT payload contains `{ id, role }` and expires after `JWT_EXPIRES_IN`.

### Permission matrix

| Capability | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| Register / login / view own profile | ✅ | ✅ | ✅ |
| View subjects | ✅ | ✅ | ✅ |
| Create / update / delete subjects | ✅ | ❌ | ❌ |
| List / view students | ✅ | ✅ | ❌ |
| Create / update / delete students | ✅ | ❌ | ❌ |
| Mark attendance / view by subject & date | ✅ | ✅ | ❌ |
| View any student's attendance summary | ✅ | ✅ | ❌ |
| View **own** attendance summary | ❌ | ❌ | ✅ |
| Enter marks / view marks by subject | ✅ | ✅ | ❌ |
| View any student's marksheet | ✅ | ✅ | ❌ |
| View **own** marksheet | ❌ | ❌ | ✅ |

---

## API Reference

**Base URL (local):** `http://localhost:5000/api`

All endpoints return JSON. Protected endpoints require the `Authorization: Bearer <token>` header.

### Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Server status check |

### Auth: `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create an account and receive a token |
| POST | `/login` | Public | Log in and receive a token |
| GET | `/me` | Any logged-in user | Get the current user's profile |

**POST `/api/auth/register`**

```json
{
  "name": "Riya Patel",
  "email": "riya@example.com",
  "password": "secret123",
  "role": "student",
  "enrollmentNo": "230220131041",
  "semester": 5
}
```

- `name`, `email`, `password` are required. Password minimum length is 6.
- `role` is one of `admin`, `teacher`, `student` (defaults to `student`).
- `enrollmentNo` is **required when `role` is `student`**. `semester` is only stored for students.

**Response `201`:**

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "665f...",
    "name": "Riya Patel",
    "email": "riya@example.com",
    "role": "student",
    "enrollmentNo": "230220131041",
    "semester": 5
  }
}
```

**POST `/api/auth/login`**

```json
{ "email": "riya@example.com", "password": "secret123" }
```

Returns the same `{ token, user }` shape. Returns `401` for wrong credentials and `403` if the account is deactivated.

---

### Students: `/api/students`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Admin, Teacher | List students (supports filters) |
| GET | `/:id` | Admin, Teacher | Get one student |
| POST | `/` | Admin | Create a student |
| PUT | `/:id` | Admin | Update a student |
| DELETE | `/:id` | Admin | Delete a student |

**GET `/api/students?semester=3&search=riya`**

| Query param | Description |
|---|---|
| `semester` | Filter by semester number |
| `search` | Case-insensitive match against name, enrollment number or email |

Response: `{ "count": 12, "students": [ ... ] }`, sorted by enrollment number.

**POST `/api/students`**

```json
{
  "name": "Riya Patel",
  "email": "riya@example.com",
  "password": "secret123",
  "enrollmentNo": "230220131041",
  "semester": 5,
  "branch": "Computer Engineering",
  "contact": "9876543210"
}
```

Required: `name`, `email`, `password`, `enrollmentNo`, `semester`. `branch` defaults to `Computer Engineering`.

**PUT `/api/students/:id`** accepts any of `name`, `email`, `enrollmentNo`, `semester`, `branch`, `contact`, `isActive`. It does **not** change passwords. Email and enrollment number uniqueness are checked.

---

### Subjects: `/api/subjects`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Any logged-in user | List subjects (`?semester=` filter) |
| POST | `/` | Admin | Create a subject |
| PUT | `/:id` | Admin | Update a subject |
| DELETE | `/:id` | Admin | Delete a subject |

**POST `/api/subjects`**

```json
{
  "name": "Data Structures",
  "code": "3130702",
  "semester": 3,
  "credits": 4
}
```

- `name`, `code`, `semester` (1 to 8) are required. `credits` defaults to `4` (allowed range 1 to 10).
- `code` is stored **uppercase** and must be unique.

---

### Attendance: `/api/attendance`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/mark` | Admin, Teacher | Mark attendance for a subject and date |
| GET | `/?subject=&date=` | Admin, Teacher | Fetch saved attendance (used to prefill the UI) |
| GET | `/summary/me` | Student | Own attendance summary |
| GET | `/summary/:studentId` | Admin, Teacher | Any student's attendance summary |

**POST `/api/attendance/mark`**

```json
{
  "subject": "665f1c...",
  "date": "2026-07-03",
  "records": [
    { "student": "665f2a...", "status": "present" },
    { "student": "665f2b...", "status": "absent" }
  ]
}
```

- `status` must be `present` or `absent`.
- Records are **upserted** on `(student, subject, date)`, so re-submitting the same day updates rather than duplicates.
- Response: `{ "message": "Attendance saved for 2 student(s)" }`

**GET `/api/attendance/summary/me`** (or `/summary/:studentId`)

```json
{
  "student": { "id": "665f2a...", "name": "Riya Patel", "enrollmentNo": "230220131041" },
  "subjects": [
    {
      "subjectId": "665f1c...",
      "name": "Data Structures",
      "code": "3130702",
      "present": 18,
      "total": 20,
      "percentage": 90
    }
  ],
  "overallPercentage": 90,
  "totalClasses": 20,
  "totalPresent": 18
}
```

> Route order matters: `/summary/me` is declared before `/summary/:studentId` so `me` is not treated as an ID.

---

### Results: `/api/results`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/enter` | Admin, Teacher | Enter or update marks for a subject (bulk) |
| GET | `/?subject=` | Admin, Teacher | Fetch saved marks for a subject (prefill UI) |
| GET | `/me?semester=` | Student | Own marksheet with SGPA |
| GET | `/student/:studentId?semester=` | Admin, Teacher | Any student's marksheet with SGPA |

**POST `/api/results/enter`**

```json
{
  "subject": "665f1c...",
  "records": [
    { "student": "665f2a...", "internalMarks": 26, "externalMarks": 58 },
    { "student": "665f2b...", "internalMarks": 20, "externalMarks": 41 }
  ]
}
```

- `internalMarks` must be **0 to 30**; `externalMarks` must be **0 to 70**. The entire request is rejected with `400` if any record is out of range.
- `totalMarks`, `grade` and `gradePoint` are computed server-side. Do not send them.
- Records are upserted on `(student, subject)`.

**GET `/api/results/me?semester=3`**

```json
{
  "student": { "id": "665f2a...", "name": "Riya Patel", "enrollmentNo": "230220131041" },
  "subjects": [
    {
      "subjectId": "665f1c...",
      "code": "3130702",
      "name": "Data Structures",
      "semester": 3,
      "credits": 4,
      "internalMarks": 26,
      "externalMarks": 58,
      "totalMarks": 84,
      "grade": "AB",
      "gradePoint": 9
    }
  ],
  "sgpa": 9,
  "totalCredits": 4
}
```

Omit `semester` to get results across all semesters.

---

## Data Models

### User (`users`)

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercased |
| `password` | String | Required, min 6 chars, bcrypt-hashed, **hidden by default** (`select: false`) |
| `role` | String | `admin` / `teacher` / `student` (default `student`) |
| `enrollmentNo` | String | Students only. Unique and sparse. |
| `semester` | Number | Students only, 1 to 8 |
| `branch` | String | Students only. Default `Computer Engineering`. |
| `contact` | String | Students only |
| `isActive` | Boolean | Default `true`. If `false`, the user cannot log in or use the API. |
| `createdAt`, `updatedAt` | Date | Automatic |

### Subject (`subjects`)

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `code` | String | Required, **unique**, stored uppercase |
| `semester` | Number | Required, 1 to 8 |
| `credits` | Number | 1 to 10, default 4. Used for SGPA. |

### Attendance (`attendances`)

| Field | Type | Notes |
|---|---|---|
| `student` | ObjectId → User | Required |
| `subject` | ObjectId → Subject | Required |
| `date` | Date | Required (normalised to midnight) |
| `status` | String | `present` / `absent` |
| `markedBy` | ObjectId → User | The teacher or admin who marked it |

**Unique index:** `(student, subject, date)` prevents duplicate entries.

### Result (`results`)

| Field | Type | Notes |
|---|---|---|
| `student` | ObjectId → User | Required |
| `subject` | ObjectId → Subject | Required |
| `internalMarks` | Number | 0 to 30 |
| `externalMarks` | Number | 0 to 70 |
| `totalMarks` | Number | Computed (internal + external) |
| `grade` | String | Computed (AA to FF) |
| `gradePoint` | Number | Computed (0 to 10) |
| `enteredBy` | ObjectId → User | The teacher or admin who entered the marks |

**Unique index:** `(student, subject)` allows one result per student per subject.

### Relationships

```
User (student) ──┐
                 ├──< Attendance >── Subject
User (teacher) ──┘      (markedBy)

User (student) ──┐
                 ├──< Result >────── Subject
User (teacher) ──┘      (enteredBy)
```

---

## Grading & SGPA Logic

Grades are derived from `totalMarks` (internal 30 + external 70 = 100) in `utils/grading.js`:

| Total marks | Grade | Grade point |
|---|---|---|
| 90 to 100 | AA | 10 |
| 80 to 89 | AB | 9 |
| 70 to 79 | BB | 8 |
| 60 to 69 | BC | 7 |
| 50 to 59 | CC | 6 |
| 45 to 49 | CD | 5 |
| 40 to 44 | DD | 4 |
| Below 40 | FF | 0 (fail) |

**SGPA formula:**

```
SGPA = Σ (credits × gradePoint) / Σ credits
```

The result is rounded to 2 decimal places. Subjects without a result are not counted.

**Implementation note:** a `pre("save")` hook on the `Result` model computes grade fields for `.save()` calls. The bulk endpoint uses `bulkWrite`, which skips Mongoose middleware, so the controller calls `computeGrade()` itself. Both paths use the same helper and stay consistent.

---

## Attendance Logic

- The `date` is parsed and normalised to **midnight** (`setHours(0,0,0,0)`), so one class day maps to exactly one record per student and subject.
- Percentages are calculated per subject (`present / total × 100`), plus an overall figure across all subjects, rounded to **1 decimal place**.
- Only subjects that still exist are counted. Records pointing to a deleted subject are skipped.

---

## Error Handling

| Status | Meaning |
|---|---|
| `400` | Missing or invalid input, or duplicate email / enrollment number / subject code |
| `401` | Missing, invalid or expired token; wrong credentials; inactive or deleted user |
| `403` | Insufficient role permissions, or account deactivated at login |
| `404` | Resource or route not found |
| `500` | Unexpected server error |

Standard error body:

```json
{ "message": "Human-readable description" }
```

Some controllers also include an `error` field with the underlying exception message to aid debugging.

---

## Deployment on Render

1. Push the repository to GitHub.
2. In Render, create a **New → Web Service** and connect the repo.
3. Use these settings:

   | Setting | Value |
   |---|---|
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |

4. Open **Environment** and add every variable from your local `.env` (Render does **not** read your `.env` file, because it is gitignored):

   ```
   MONGO_URI=mongodb+srv://<user>:<encoded-password>@<cluster-host>/<db>?retryWrites=true&w=majority
   JWT_SECRET=<long random string>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-frontend-domain.com
   ```

   `PORT` is set by Render, so leave it out.

5. In **MongoDB Atlas → Network Access**, allow Render to connect (add `0.0.0.0/0`, or use Render's outbound IP ranges for a stricter setup).
6. Deploy, then check `https://<your-service>.onrender.com/api/health`.

> **Tip:** if the log line says `injected env (0) from .env`, no variables were loaded. Add them in the Render dashboard.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `injected env (0) from .env` in logs | Environment variables are not set on the host. Add them in the Render dashboard. |
| `MongoDB connection failed: querySrv ENOTFOUND _mongodb._tcp...` | `MONGO_URI` is missing, malformed, or the cluster hostname is wrong or the cluster was deleted. Re-copy the URI from Atlas → Connect → Drivers. |
| `MongooseServerSelectionError` | Atlas Network Access blocks your IP. Add your IP or `0.0.0.0/0`. |
| `Authentication failed` | Wrong DB username or password, or a special character in the password that is not URL-encoded. |
| `401 Not authorized, token invalid or expired` | Token expired, `JWT_SECRET` changed after the token was issued, or the header is not in `Bearer <token>` format. |
| CORS errors in the browser | Set `CLIENT_URL` to the exact frontend origin (scheme + host + port, no trailing slash). |
| `npm run seed` fails | `seed.js` does not exist in the repo yet. |
| Free-tier Render service is slow on first request | Free instances spin down when idle. The first request after a pause takes a while. |

---

## Known Limitations & Roadmap

Honest notes on what is not production-ready yet, so you can prioritise:

**Security**
- [ ] **Public registration with a self-selected role.** Anyone can call `POST /api/auth/register` with `"role": "admin"`. Restrict `admin`/`teacher` creation to authenticated admins, or remove public registration.
- [ ] Add `helmet` and rate limiting (e.g. `express-rate-limit`) on the login endpoint.
- [ ] Run `npm audit` and update vulnerable dependencies.
- [ ] Avoid returning raw `err.message` in 500 responses in production.

**Data integrity**
- [ ] Deleting a student or subject does **not** cascade to their attendance and result records.
- [ ] Validate that `records[].student` IDs in attendance and results actually refer to existing students.
- [ ] Validate `status` values and `date` format in attendance marking.
- [ ] Attendance dates are normalised using the server's local timezone. Consider storing dates in UTC explicitly.

**Code quality**
- [ ] `express-validator` is installed but unused; add request validation schemas.
- [ ] Start `app.listen` only after the database connection succeeds.
- [ ] Add a `seed.js` (sample admin, subjects, students), or remove the `seed` script.
- [ ] Add pagination to `GET /api/students`.
- [ ] Add an endpoint to change or reset passwords.
- [ ] Add automated tests (Jest + Supertest) and a CI workflow.
- [ ] Add API docs (Swagger / OpenAPI) or a Postman collection.

**Feature ideas**
- Teacher-to-subject assignment so teachers only manage their own classes
- CGPA across semesters and PDF marksheet export
- Low-attendance alerts (e.g. below 75%)
- Excel/CSV bulk import for students and marks

---

## License

ISC. See `package.json`. Add a `LICENSE` file if you want to formalise this.

---

**Author:** [230220131041-Poorv](https://github.com/230220131041-Poorv)
