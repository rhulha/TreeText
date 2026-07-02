# TreeText

Tree-based todo and knowledge management app. Organize tasks in a hierarchical folder structure with a three-panel layout: folder tree on the left, todo list in the middle, and an edit/details panel on the right.

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** jQuery, jsTree, Split.js, Bootstrap 3
- **Database:** PostgreSQL or SQLite (via `db/` abstraction layer, selected with `DB_CLIENT`)

## Features

- Hierarchical folder tree with lazy-loading, drag-and-drop, and context menu (rename/delete)
- Create, edit, and delete todos within folders
- Resizable three-panel split layout
- Dark theme
- Single `todos` table stores both folders and todo items, using a recursive CTE for tree queries

## Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL (unless using SQLite)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Choose a database backend by setting `DB_CLIENT` in `.env` to `postgres` (default) or `sqlite`.

   **PostgreSQL:** create the database and table:
   ```sql
   CREATE TABLE todos (
       id        SERIAL PRIMARY KEY,
       parent    INT,
       folder    BOOLEAN DEFAULT FALSE,
       weight    SERIAL,
       text      VARCHAR(1024),
       starred   BOOLEAN DEFAULT FALSE,
       due       TIMESTAMP,
       remindme  TIMESTAMP,
       completed TIMESTAMP,
       created   TIMESTAMP DEFAULT NOW(),
       modified  TIMESTAMP DEFAULT NOW()
   );
   ```

   **SQLite:** no setup needed — the table is created automatically in the file pointed to by `SQLITE_FILE` (defaults to `treetext.db`).

3. Configure `.env`:
   ```
   DB_CLIENT=postgres
   PGUSER=your_user
   PGHOST=localhost
   PGPASSWORD=your_password
   PGDATABASE=TreeText
   PGPORT=5432
   PORT=8000
   ```

   or, for SQLite:
   ```
   DB_CLIENT=sqlite
   SQLITE_FILE=treetext.db
   PORT=8000
   ```

4. Start the server:
   ```
   npm start
   ```

5. Open `http://localhost:8000`

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jstree?id=<id>` | Lazy-load folder children for jsTree |
| GET | `/todos/:parent_id` | Get todos for a folder |
| POST | `/todo` | Create a todo |
| PUT | `/todo` | Update a todo |
| DELETE | `/todo/:id` | Delete a todo |
| GET | `/folder` | Get full folder tree |
| POST | `/folder` | Create a folder |
| PUT | `/folder` | Update a folder |
| DELETE | `/folder/:id` | Delete a folder |

