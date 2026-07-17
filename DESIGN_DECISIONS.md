# Design Decisions

Short rationale for the main engineering choices in this project.

## Why JWT (and not sessions)?

Stateless authentication: the API holds no session store, so any instance can
verify a request with just the signing secret — which keeps the backend
horizontally scalable and trivially deployable to platforms like Render. The
token carries only the user id; the user's **current** role and status are
re-read from the database on every request, so a role change or deactivation
takes effect immediately even for tokens issued earlier.

## Why bcrypt?

Passwords are hashed with bcrypt (10 salt rounds) in a Mongoose pre-save hook,
so there is exactly one code path that can persist a password and it cannot
skip hashing. bcrypt is deliberately slow and per-password salted, which makes
brute-forcing leaked hashes impractical — unlike general-purpose hashes such
as SHA-256.

## Why MongoDB?

The core data is a single entity (Employee) with a **self-referencing
hierarchy** (`reportingManager` → another Employee). A document store handles
this naturally: one collection, one reference field, no join tables. The org
tree is assembled in one query (fetch all, build in memory), which is simpler
and faster at this scale than recursive SQL CTEs.

## Why is there no separate User / Department / Role table?

- **User = Employee** here: every account in the system is an employee, so a
  separate `users` collection would just add a join with no new information.
- **Role** is a closed 3-value enum baked into the RBAC logic — a lookup
  collection would suggest roles are user-definable when they are not.
- **Department** is a label with no attributes of its own; the department list
  and counts are derived with `distinct`/aggregation. If departments ever
  needed budgets or heads, promoting them to a collection would be the time.

## Why soft delete?

HR data has audit value — salary history, reporting lines — and hard deletes
destroy it irreversibly. Soft delete (`isDeleted` flag) keeps the record while
excluding it from every query, immediately invalidates the deleted user's
tokens, and reassigns their direct reports to the deleted employee's own
manager so the org tree never breaks.

## Why role middleware (and not checks inside each handler)?

Coarse rules — *who may call this endpoint at all* — are declared on the
route (`authorize('SUPER_ADMIN', 'HR_MANAGER')`), so permissions are readable
at a glance in the route table and impossible to forget on a new endpoint.
Fine-grained rules that depend on the *data* (an employee editing only their
own limited fields; HR blocked from touching Super Admins) live in the
controller, which is the only place the target document is known.

## How is circular reporting prevented?

When assigning employee **E** the manager **M**, the API walks upward from
**M** through the `reportingManager` chain. If the walk ever reaches **E**,
the assignment would create a cycle and is rejected with 400. The walk keeps a
visited-set so even a pre-existing corrupt cycle in the data cannot cause an
infinite loop. This catches self-assignment (E = M), two-node cycles (A→B→A),
and arbitrarily deep ones — all three are covered by automated tests.

## Why server-side search / sort / pagination?

Filtering client-side means shipping the entire employee table to the browser
on every visit — fine for 18 rows, broken at 10,000. Doing it in MongoDB keeps
responses small and lets indexes do the work; the frontend just forwards query
params.

## Why mirrored validation on both sides?

Frontend validation gives instant feedback without a round trip; backend
validation (express-validator + Mongoose schema) is the actual security
boundary, since the API can be called directly. The rules are intentionally
identical so users never see a server rejection the form didn't warn about.
