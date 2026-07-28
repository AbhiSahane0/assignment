# EMS API Documentation

Base URL (local): `http://localhost:5000/api`
Base URL (production): `https://<https://assignment-q84f.onrender.com>.onrender.com/api`

All responses share the envelope `{ "success": boolean, ... }`.

## Error Responses

Every error returns JSON in this shape:

```json
{ "success": false, "message": "Human-readable explanation." }
```

Validation failures (400) additionally include a field-level breakdown:

```json
{
  "success": false,
  "message": "A valid email is required, Phone must be 10-15 digits (optional + prefix)",
  "errors": [
    { "field": "email", "message": "A valid email is required" },
    { "field": "phone", "message": "Phone must be 10-15 digits (optional + prefix)" }
  ]
}
```

### Status codes used

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation failed / circular reporting chain / bad reference |
| 401 | Missing, invalid, or expired token; wrong credentials |
| 403 | Authenticated but not permitted (RBAC) or account deactivated |
| 404 | Resource not found (or soft-deleted) |
| 409 | Duplicate unique field (email / employeeId) |
| 500 | Unexpected server error |

## Authentication

All endpoints except `POST /auth/login` require a JWT:

```
Authorization: Bearer <token>
```

Tokens expire after 1 day (configurable via `JWT_EXPIRES_IN`). Tokens of
deleted or deactivated accounts are rejected.

### POST /auth/login

```json
// Request
{ "email": "admin@ems.com", "password": "Admin@123" }

// 200
{ "success": true, "token": "eyJ...", "user": { "_id": "...", "name": "Aditi Sharma", "role": "SUPER_ADMIN", ... } }
```
Errors: `400` invalid email format · `401` wrong credentials · `403` account deactivated.

### POST /auth/logout
Requires auth. JWTs are stateless — the client discards the token; the endpoint
exists as an explicit logout hook. → `{ "success": true }`

### GET /auth/me
Returns the authenticated user's profile with the reporting manager populated.

## Employees

Roles: **SA** = Super Admin, **HR** = HR Manager, **EMP** = Employee.

| Method & Path | SA | HR | EMP |
|---|---|---|---|
| GET `/employees` | ✅ | ✅ | ❌ |
| POST `/employees` | ✅ | ✅ (not SUPER_ADMIN role) | ❌ |
| GET `/employees/:id` | ✅ | ✅ | own record only |
| PUT `/employees/:id` | ✅ | ✅ (not Super Admins) | own record, limited fields |
| DELETE `/employees/:id` | ✅ | ❌ | ❌ |
| PATCH `/employees/:id/manager` | ✅ | ✅ | ❌ |
| GET `/employees/:id/reportees` | ✅ | ✅ | ❌ |
| POST `/employees/import` | ✅ | ✅ | ❌ |
| GET `/employees/meta/departments` | ✅ | ✅ | ✅ |

### GET /employees — list with search / filter / sort / pagination

Query parameters:

| Param | Description |
|---|---|
| `search` | case-insensitive match on name or email |
| `department` | exact department name |
| `role` | `SUPER_ADMIN` \| `HR_MANAGER` \| `EMPLOYEE` |
| `status` | `ACTIVE` \| `INACTIVE` |
| `sortBy` | `name` \| `joiningDate` \| `salary` \| `createdAt` (default) |
| `order` | `asc` \| `desc` (default) |
| `page` | default 1 |
| `limit` | default 10, max 100 |

```json
// GET /employees?search=arjun&department=Engineering&sortBy=name&order=asc&page=1&limit=10
{
  "success": true,
  "data": [ { "_id": "...", "employeeId": "EMP-005", "name": "Arjun Rao", "reportingManager": { "name": "Sneha Iyer", ... }, ... } ],
  "pagination": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### POST /employees — create

```json
{
  "employeeId": "EMP-019",
  "name": "Jane Doe",
  "email": "jane@ems.com",
  "password": "Secret@1",
  "phone": "9876543210",
  "department": "Engineering",
  "designation": "Developer",
  "salary": 65000,
  "joiningDate": "2025-01-15",
  "status": "ACTIVE",            // optional, default ACTIVE
  "role": "EMPLOYEE",            // optional, default EMPLOYEE
  "reportingManager": "<id>",    // optional
  "profileImage": "https://…"    // optional
}
```
`201` with the created employee (password never returned). Errors: `400`
validation · `403` HR attempting to create a Super Admin · `409` duplicate
email/employeeId.

### PUT /employees/:id — update (partial)

Send any subset of the create fields. Role rules:
- **EMPLOYEE** may only send `phone`, `profileImage`, `password` on their own id → otherwise `403`.
- **HR** cannot set `role: "SUPER_ADMIN"` or edit an existing Super Admin → `403`.
- Setting `reportingManager` runs the circular-reporting check → `400` if it would create a cycle.

### DELETE /employees/:id — soft delete (Super Admin only)

Marks `isDeleted: true` (record retained), deactivates the account, and
reassigns the employee's direct reports to the deleted employee's own manager.
Self-deletion is rejected (`400`).

### PATCH /employees/:id/manager — assign reporting manager

```json
{ "managerId": "66a1..." }   // or null to clear
```
`400` if the manager doesn't exist or the assignment would create a circular
chain (self-reporting, A→B→A, or any deeper cycle).

### GET /employees/:id/reportees — direct reports

```json
{ "success": true, "data": [ { "employeeId": "EMP-007", "name": "Karan Mehta", ... } ] }
```

### POST /employees/import — CSV import (multipart)

Field `file`: CSV with header
`employeeId,name,email,password,phone,department,designation,salary,joiningDate[,status][,role]`.
Returns `{ imported, failed: [{ row, email, reason }] }` — valid rows are saved
even if others fail.

## Organization

### GET /organization/tree — full reporting tree (any authenticated user)

```json
{
  "success": true,
  "data": [
    {
      "name": "Aditi Sharma", "designation": "Chief Executive Officer",
      "directReports": [
        { "name": "Sneha Iyer", "directReports": [ { "name": "Arjun Rao", "directReports": [...] } ] }
      ]
    }
  ]
}
```

## Dashboard

### GET /dashboard/stats (SA, HR)

```json
{
  "success": true,
  "data": {
    "totalEmployees": 18,
    "activeEmployees": 16,
    "inactiveEmployees": 2,
    "departmentCount": 6,
    "byDepartment": [ { "department": "Engineering", "count": 8 }, ... ],
    "byRole": [ { "role": "EMPLOYEE", "count": 16 }, ... ],
    "recentJoiners": [ ... ]
  }
}
```

## Misc

- `GET /health` — liveness probe, no auth.
- Unknown routes → `404 { "success": false, "message": "Route not found." }`.
