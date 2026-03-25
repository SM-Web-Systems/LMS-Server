#!/bin/bash
set -e

DB_FILE="${DATABASE_PATH:-./data/student_ms.db}"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
    echo "==> Database not found, initializing..."
    node dist/scripts/initDb.js
    echo "==> Database initialized successfully"
fi

exec "$@"
