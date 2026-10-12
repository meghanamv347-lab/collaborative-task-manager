
# Collaborative Task Manager

A full-stack team task manager built around the assessment MVP: JWT authentication, Manager/User permissions, task assignment and status updates, activity history, and a responsive dashboard.

## MVP Features

- Signup and login with bcrypt-hashed passwords and JWT sessions.
- Manager and User roles enforced by the API.
- Managers create, assign, edit, and delete the tasks they create.
- Users see tasks assigned to them and can update only their own task status.
- Managers see tasks they created and their current status.
- Task activity history records creation, assignment, and updates.
- Search, status and priority filters, loading/empty/error states, mobile navigation, and persistent dark mode.
- Authentication endpoints are rate limited.

## Stack

- React 18, Vite, Tailwind CSS, and Lucide icons
- Node.js, Express, and MySQL
- JWT and bcryptjs

## Requirements

- Node.js 20 or newer
- MySQL Server 8 or compatible, with a schema/database named `collaborative_task_manager`

MySQL Workbench is a client. Ensure its local MySQL server is running and create the database before starting the API:

```sql
CREATE DATABASE collaborative_task_manager;
```

## Run Locally

1. Install dependencies from the repository root:

	```powershell
	npm run install:all
	```

2. Copy `server/.env.example` to `server/.env`, then set your MySQL username/password, a long random `JWT_SECRET`, and a private `MANAGER_PASSWORD` of at least 8 characters. The API uses port 5002 by default; choose another free port if needed and update `VITE_API_URL` in `client/.env` to match.
3. Ensure the configured database exists in MySQL Workbench.
4. Create or promote the manager account:

	```powershell
	npm run seed:manager
	```

	The manager email defaults to `manager@taskmanager.local`; set `MANAGER_EMAIL` in `server/.env` to change it. The password is taken from `MANAGER_PASSWORD` and is never hard-coded in the seed script.
5. Start the API and frontend:

	```powershell
	npm run dev
	```

6. Open the URL Vite prints (normally `http://localhost:5173`). The API defaults to `http://localhost:5002`.

The API creates its `users`, `tasks`, and `activity_logs` tables on first startup. Signup creates User accounts; manager access is provisioned only through the seed command.

## Demo Flow

1. Sign in as the seeded Manager.
2. Register a second account as a User, then sign back in as Manager.
3. Create a task, assign it to the User, and add a due date and priority.
4. Sign in as the User and update the task status.
5. Sign back in as Manager to see the updated status and task activity history.

## API

All task and user routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a User account |
| POST | `/api/auth/login` | Public | Create a JWT session |
| GET | `/api/health` | Public | API health check |
| GET | `/api/tasks` | Manager/User | List tasks created by the manager or assigned to the user |
| POST | `/api/tasks` | Manager | Create and assign a task |
| PUT | `/api/tasks/:id` | Manager/assignee | Edit a created task, or update assigned task status |
| DELETE | `/api/tasks/:id` | Manager | Delete a task created by the manager |
| GET | `/api/tasks/:id/activity` | Manager/assignee | Read task activity history |
| GET | `/api/users` | Authenticated | List team members (used for assignment) |

## Build

```powershell
npm run build
```

The assessment’s additional sprint, requirement, and QA workflows are not part of this MVP implementation.
