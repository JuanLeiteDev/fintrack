import sqlite3

from pathlib import Path

FIELDS = ('description', 'amount', 'type', 'category', 'date',)
TYPES = ('receita', 'despesa',)
DB_PATH = Path('.') / 'database' / 'fintrack.db'

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = get_connection()
    cursor = connection.cursor()
    
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('receita', 'despesa')),
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)

        connection.commit()
    finally:
        connection.close()

def list_transactions() -> None | list[dict]:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT * FROM transactions;")
        lines = cursor.fetchall()

        if not lines: return None
        else: return [dict(line) for line in lines]

    finally:
        connection.close()

def create_transaction(new: dict) -> None | dict:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            INSERT INTO transactions (description, amount, type, category, date)
            VALUES (?, ?, ?, ?, ?);""", (*[new[field] for field in FIELDS],))
        connection.commit()

        cursor.execute("SELECT * FROM transactions WHERE id = (?)", (cursor.lastrowid,))
        new_transaction = cursor.fetchone()
        if not new_transaction: return None
        else: return dict(new_transaction)
    finally:
        connection.close()

def update_transaction(id: int, new: dict) -> None | dict:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            UPDATE transactions
                SET description = (?), amount = (?), type = (?), category = (?), date = (?)
            WHERE ID = (?);""", (*[new[field] for field in FIELDS], id,))
        
        connection.commit()

        cursor.execute("SELECT * FROM transactions WHERE id = (?);", (cursor.lastrowid,))
        new_transaction = cursor.fetchone()
        if not new_transaction: return None
        else: return dict(new_transaction)
    finally:
        connection.close()

def delete_transaction(id: int) -> bool:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("DELETE FROM transaction WHERE id = (?);", (id,))

        connection.commit()
        return cursor.rowcount > 0
    finally:
        connection.close()

def get_transaction(id: int) -> None | dict:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT * FROM transactions WHERE id = (?);", (id,))
        line = cursor.fetchone()
        if not line: return None
        else: return dict(line)
    finally:
        connection.close()
