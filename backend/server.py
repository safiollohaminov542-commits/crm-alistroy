"""
AliStroy CRM — Standalone HTTP server (без зависимостей).
Истифода аз stdlib-и Python: http.server + sqlite3 + json.
Барои Flask: app.py-ро истифода баред (бо `pip install -r requirements.txt`).
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import secrets
import sqlite3
import sys
import time
import uuid
import zipfile
import mimetypes
from datetime import datetime, timedelta, date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "alistroy.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Auth (admin only — single-user CRM)
# ---------------------------------------------------------------------------
ADMIN_USERNAME = os.environ.get("CRM_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("CRM_ADMIN_PASS", "alistroy@2026@safi")
SESSION_TTL = 60 * 60 * 24 * 7  # 7 рӯз

# token -> {"user": str, "expires": float}
SESSIONS: dict[str, dict] = {}


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _check_password(username: str, password: str) -> bool:
    """Простой constant-time check — admin/parol дар environment ё default."""
    u_ok = secrets.compare_digest(username or "", ADMIN_USERNAME)
    p_ok = secrets.compare_digest(password or "", ADMIN_PASSWORD)
    return u_ok and p_ok


def _get_token_from_headers(headers) -> str | None:
    auth = headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _is_authed(headers) -> bool:
    token = _get_token_from_headers(headers)
    if not token:
        return False
    sess = SESSIONS.get(token)
    if not sess:
        return False
    if sess["expires"] < time.time():
        SESSIONS.pop(token, None)
        return False
    return True


def _cleanup_sessions():
    now = time.time()
    for t in list(SESSIONS.keys()):
        if SESSIONS[t]["expires"] < now:
            SESSIONS.pop(t, None)

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    # Unicode-aware LOWER (SQLite-и стандартӣ танҳо ASCII-ро мефаҳмад)
    conn.create_function("LOWER", 1, lambda s: s.lower() if isinstance(s, str) else s)
    conn.create_function("UPPER", 1, lambda s: s.upper() if isinstance(s, str) else s)
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#16a34a',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',
    email TEXT DEFAULT '',
    market TEXT DEFAULT '',
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    rating REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    currency TEXT DEFAULT 'TJS',
    unit TEXT DEFAULT 'дона',
    stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price REAL DEFAULT 0,
    new_price REAL DEFAULT 0,
    old_cost_price REAL DEFAULT 0,
    new_cost_price REAL DEFAULT 0,
    note TEXT DEFAULT '',
    changed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    company TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'new',
    delivery_address TEXT DEFAULT '',
    delivery_date TEXT,
    notes TEXT DEFAULT '',
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit TEXT DEFAULT 'дона',
    price REAL DEFAULT 0,
    quantity REAL DEFAULT 1,
    total REAL DEFAULT 0,
    cost_price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'TJS',
    notes TEXT DEFAULT '',
    expense_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def migrate_db(conn):
    """Иловаи сутунҳои нав агар DB-и кӯҳна бошад."""
    cur = conn.execute("PRAGMA table_info(order_items)")
    cols = [r["name"] for r in cur.fetchall()]
    if "cost_price" not in cols:
        try:
            conn.execute("ALTER TABLE order_items ADD COLUMN cost_price REAL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
    conn.commit()


def init_db():
    conn = db_conn()
    conn.executescript(SCHEMA)
    migrate_db(conn)
    conn.commit()
    conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    return {k: row[k] for k in row.keys()}


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

SEED_DATA = {
    "categories": [
        {
            "name": "Семент ва омехтаҳо", "icon": "package", "color": "#16a34a",
            "subs": ["Семент М400", "Семент М500", "Гипс", "Алебастр"],
        },
        {
            "name": "Оҳан ва металл", "icon": "tool", "color": "#0ea5e9",
            "subs": ["Арматура", "Тахтаи оҳанин", "Кунҷакҳо", "Қубурҳои оҳанӣ"],
        },
        {
            "name": "Хишт ва блок", "icon": "grid", "color": "#f97316",
            "subs": ["Хишти сурх", "Блоки газобетон", "Блоки пенобетон"],
        },
        {
            "name": "Чӯб ва тахта", "icon": "layers", "color": "#a16207",
            "subs": ["Тахтаи арра", "Брус", "Фанер", "ОСБ"],
        },
        {
            "name": "Маводи дохилӣ", "icon": "home", "color": "#7c3aed",
            "subs": ["Кафелҳо", "Лоиномат", "Обоҳо", "Ранг"],
        },
        {
            "name": "Сантехника", "icon": "droplet", "color": "#0891b2",
            "subs": ["Қубурҳо", "Кранҳо", "Унитаз ва ванна", "Радиаторҳо"],
        },
    ],
    "suppliers": [
        {"name": "Карим Раҳимов", "company": 'ООО "Стройбаза Душанбе"',
         "phone": "+992 901 23 45 67", "market": "Бозори Корвон",
         "address": "Душанбе, кӯчаи Айнӣ 14", "rating": 4.8,
         "notes": "Семент ва омехтаҳо — нархи мувофиқ"},
        {"name": "Бахтиёр Шарипов", "company": 'ИП "Металл Сервис"',
         "phone": "+992 935 11 22 33", "market": "Бозори Саховат",
         "address": "Душанбе, ноҳияи Сино", "rating": 4.5,
         "notes": "Арматура ва маводи металлӣ"},
        {"name": "Зариф Назаров", "company": 'ООО "ТочикСтрой"',
         "phone": "+992 918 77 88 99", "market": "Бозори Дехконобод",
         "address": "Хуҷанд, кӯчаи Сомонӣ 7", "rating": 4.7,
         "notes": "Хишт ва блок"},
        {"name": "Сафар Рашидов", "company": "Базаи чӯб",
         "phone": "+992 905 44 33 22", "market": "Бозори Зарнисор",
         "address": "Душанбе, кӯчаи Рӯдакӣ 120", "rating": 4.3,
         "notes": "Чӯб ва тахта"},
    ],
    "products": [
        # (sub_name, name, sku, price, cost, stock, unit, supplier_idx)
        ("Семент М400", "Семент М400 50кг", "SEM-400-50", 75, 60, 250, "халта", 0),
        ("Семент М500", "Семент М500 50кг", "SEM-500-50", 85, 68, 180, "халта", 0),
        ("Гипс", "Гипс сохтмонӣ 25кг", "GIP-25", 45, 35, 90, "халта", 0),
        ("Арматура", "Арматура 12мм", "ARM-12", 12, 9, 1500, "метр", 1),
        ("Арматура", "Арматура 14мм", "ARM-14", 16, 12, 1200, "метр", 1),
        ("Тахтаи оҳанин", "Тахтаи оҳанин 1.5мм", "TAH-15", 280, 230, 60, "м²", 1),
        ("Хишти сурх", "Хишти сурхи якруйи", "HIS-RED-1", 1.2, 0.9, 8000, "дона", 2),
        ("Блоки газобетон", "Блоки газобетон 600x300x200", "GAZ-600", 35, 28, 450, "дона", 2),
        ("Тахтаи арра", "Тахтаи арра 25мм", "TAH-25", 850, 680, 30, "м³", 3),
        ("Брус", "Брус 100x100", "BRUS-100", 65, 50, 200, "метр", 3),
        ("Кафелҳо", "Кафели полокӣ 30x30", "KAF-30", 75, 55, 350, "м²", 0),
        ("Ранг", "Ранги обӣ оқ 5кг", "RAN-W-5", 180, 140, 45, "сатил", 0),
        ("Қубурҳо", "Қубур ПВХ 110мм", "QUB-110", 95, 75, 80, "метр", 1),
        ("Кранҳо", "Крани ванна", "KRA-V", 250, 180, 25, "дона", 0),
    ],
    "clients": [
        {"name": "Алишер Мирзоев", "phone": "+992 901 11 22 33",
         "company": 'ООО "СтройМастер"',
         "address": "Душанбе, кӯчаи Исмоили Сомонӣ 25", "status": "vip"},
        {"name": "Фарход Ҷӯраев", "phone": "+992 935 22 33 44",
         "address": "Душанбе, ноҳияи Шоҳмансур", "status": "active"},
        {"name": "Меҳрангез Каримова", "phone": "+992 918 55 66 77",
         "address": "Хуҷанд, кӯчаи Ленин 10", "status": "active"},
        {"name": "Шерзод Назиров", "phone": "+992 905 88 77 66",
         "company": "Бунёди Сохтмонӣ", "address": "Куляб", "status": "vip"},
    ],
}


def seed_if_empty():
    conn = db_conn()
    cur = conn.execute("SELECT COUNT(*) AS c FROM categories")
    if cur.fetchone()["c"] > 0:
        conn.close()
        return
    print("[seed] Илова кардани маълумоти намунавӣ...")

    # Categories + subs
    sub_id_by_name: dict[str, int] = {}
    for c in SEED_DATA["categories"]:
        cid = conn.execute(
            "INSERT INTO categories(name, icon, color) VALUES(?,?,?)",
            (c["name"], c["icon"], c["color"]),
        ).lastrowid
        for s in c["subs"]:
            sid = conn.execute(
                "INSERT INTO subcategories(name, category_id) VALUES(?,?)",
                (s, cid),
            ).lastrowid
            sub_id_by_name[s] = sid

    # Suppliers
    sup_ids: list[int] = []
    for s in SEED_DATA["suppliers"]:
        sid = conn.execute(
            "INSERT INTO suppliers(name, company, phone, market, address, rating, notes) "
            "VALUES(?,?,?,?,?,?,?)",
            (s["name"], s["company"], s["phone"], s["market"],
             s["address"], s["rating"], s["notes"]),
        ).lastrowid
        sup_ids.append(sid)

    # Products
    prod_ids: list[int] = []
    for sub_name, pname, sku, price, cost, stock, unit, sup_idx in SEED_DATA["products"]:
        sid = sub_id_by_name.get(sub_name)
        if not sid:
            continue
        pid = conn.execute(
            "INSERT INTO products(name, sku, price, cost_price, stock, min_stock, "
            "unit, currency, subcategory_id, supplier_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (pname, sku, price, cost, stock, max(5, stock * 0.1),
             unit, "TJS", sid, sup_ids[sup_idx]),
        ).lastrowid
        conn.execute(
            "INSERT INTO price_history(product_id, old_price, new_price, "
            "old_cost_price, new_cost_price, note) VALUES(?,?,?,?,?,?)",
            (pid, 0, price, 0, cost, "Нархи аввалин"),
        )
        prod_ids.append(pid)

    # Clients
    client_ids: list[int] = []
    for c in SEED_DATA["clients"]:
        cid = conn.execute(
            "INSERT INTO clients(name, phone, company, address, status) VALUES(?,?,?,?,?)",
            (c["name"], c["phone"], c.get("company", ""), c["address"], c["status"]),
        ).lastrowid
        client_ids.append(cid)

    # Orders
    statuses = ["completed", "completed", "in_progress", "new"]
    year = datetime.utcnow().year
    for i, cid in enumerate(client_ids):
        order_number = f"ALS-{year}-{i+1:04d}"
        created = (datetime.utcnow() - timedelta(days=i * 2)).isoformat(sep=" ", timespec="seconds")
        oid = conn.execute(
            "INSERT INTO orders(order_number, client_id, status, delivery_address, "
            "subtotal, total, created_at) VALUES(?,?,?,?,?,?,?)",
            (order_number, cid, statuses[i],
             SEED_DATA["clients"][i]["address"], 0, 0, created),
        ).lastrowid

        subtotal = 0.0
        chunk = prod_ids[i * 2:i * 2 + 3]
        for pid in chunk:
            row = conn.execute(
                "SELECT name, unit, price, cost_price FROM products WHERE id=?", (pid,)
            ).fetchone()
            qty = 5 + i
            line = qty * row["price"]
            subtotal += line
        conn.execute(
            "INSERT INTO order_items(order_id, product_id, product_name, unit, "
            "price, quantity, total, cost_price) VALUES(?,?,?,?,?,?,?,?)",
            (oid, pid, row["name"], row["unit"], row["price"], qty, line,
             row["cost_price"] if "cost_price" in row.keys() else 0),
        )
        conn.execute(
            "UPDATE orders SET subtotal=?, total=? WHERE id=?",
            (subtotal, subtotal, oid),
        )

    conn.commit()
    conn.close()
    print("[seed] Маълумоти намунавӣ илова шуд!")


# ---------------------------------------------------------------------------
# Helper "to dict"
# ---------------------------------------------------------------------------

def category_dict(conn, c, with_children=False):
    sub_count = conn.execute(
        "SELECT COUNT(*) c FROM subcategories WHERE category_id=?", (c["id"],)
    ).fetchone()["c"]
    prod_count = conn.execute(
        "SELECT COUNT(*) c FROM products p JOIN subcategories s ON s.id=p.subcategory_id "
        "WHERE s.category_id=?", (c["id"],)
    ).fetchone()["c"]
    d = {
        "id": c["id"], "name": c["name"], "icon": c["icon"], "color": c["color"],
        "description": c["description"], "created_at": c["created_at"],
        "subcategories_count": sub_count, "products_count": prod_count,
    }
    if with_children:
        subs = conn.execute(
            "SELECT * FROM subcategories WHERE category_id=? ORDER BY name", (c["id"],)
        ).fetchall()
        d["subcategories"] = [subcategory_dict(conn, s, with_children=True) for s in subs]
    return d


def subcategory_dict(conn, s, with_children=False):
    cat_row = conn.execute(
        "SELECT name FROM categories WHERE id=?", (s["category_id"],)
    ).fetchone()
    prod_count = conn.execute(
        "SELECT COUNT(*) c FROM products WHERE subcategory_id=?", (s["id"],)
    ).fetchone()["c"]
    d = {
        "id": s["id"], "name": s["name"], "description": s["description"],
        "category_id": s["category_id"],
        "category_name": cat_row["name"] if cat_row else None,
        "products_count": prod_count, "created_at": s["created_at"],
    }
    if with_children:
        prods = conn.execute(
            "SELECT * FROM products WHERE subcategory_id=? ORDER BY name", (s["id"],)
        ).fetchall()
        d["products"] = [product_dict(conn, p) for p in prods]
    return d


def product_dict(conn, p, with_history=False):
    sub = conn.execute(
        "SELECT s.id sid, s.name sname, s.category_id, c.name cname "
        "FROM subcategories s LEFT JOIN categories c ON c.id=s.category_id "
        "WHERE s.id=?", (p["subcategory_id"],)
    ).fetchone()
    sup = None
    if p["supplier_id"]:
        sup = conn.execute(
            "SELECT name, phone FROM suppliers WHERE id=?", (p["supplier_id"],)
        ).fetchone()
    d = {
        "id": p["id"], "name": p["name"], "sku": p["sku"],
        "description": p["description"], "photo": p["photo"],
        "price": p["price"], "cost_price": p["cost_price"],
        "currency": p["currency"], "unit": p["unit"],
        "stock": p["stock"], "min_stock": p["min_stock"],
        "subcategory_id": p["subcategory_id"],
        "subcategory_name": sub["sname"] if sub else None,
        "category_id": sub["category_id"] if sub else None,
        "category_name": sub["cname"] if sub else None,
        "supplier_id": p["supplier_id"],
        "supplier_name": sup["name"] if sup else None,
        "supplier_phone": sup["phone"] if sup else None,
        "low_stock": (p["min_stock"] and p["stock"] <= p["min_stock"]) or False,
        "created_at": p["created_at"], "updated_at": p["updated_at"],
    }
    if with_history:
        rows = conn.execute(
            "SELECT * FROM price_history WHERE product_id=? ORDER BY changed_at DESC",
            (p["id"],),
        ).fetchall()
        d["price_history"] = [row_to_dict(r) for r in rows]
    return d


def supplier_dict(conn, s):
    prod_count = conn.execute(
        "SELECT COUNT(*) c FROM products WHERE supplier_id=?", (s["id"],)
    ).fetchone()["c"]
    d = row_to_dict(s)
    d["products_count"] = prod_count
    return d


def client_dict(conn, c):
    rows = conn.execute(
        "SELECT COUNT(*) cnt, COALESCE(SUM(total),0) total FROM orders WHERE client_id=?",
        (c["id"],),
    ).fetchone()
    d = row_to_dict(c)
    d["orders_count"] = rows["cnt"]
    d["total_spent"] = rows["total"]
    return d


def order_dict(conn, o, with_items=False):
    cl = conn.execute(
        "SELECT name, phone, address FROM clients WHERE id=?", (o["client_id"],)
    ).fetchone()
    d = row_to_dict(o)
    d["client_name"] = cl["name"] if cl else None
    d["client_phone"] = cl["phone"] if cl else None
    d["client_address"] = cl["address"] if cl else None
    cnt = conn.execute(
        "SELECT COUNT(*) c FROM order_items WHERE order_id=?", (o["id"],)
    ).fetchone()["c"]
    d["items_count"] = cnt
    if with_items:
        items = conn.execute(
            "SELECT oi.*, p.photo AS product_photo "
            "FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id "
            "WHERE oi.order_id=?", (o["id"],),
        ).fetchall()
        d["items"] = [row_to_dict(it) for it in items]
    return d


# ---------------------------------------------------------------------------
# HTTP handlers
# ---------------------------------------------------------------------------

def _gen_order_number(conn) -> str:
    last = conn.execute("SELECT MAX(id) AS m FROM orders").fetchone()
    nxt = (last["m"] or 0) + 1
    return f"ALS-{datetime.utcnow().year}-{nxt:04d}"


def _now() -> str:
    return datetime.utcnow().isoformat(sep=" ", timespec="seconds")


def parse_multipart(headers, raw: bytes) -> dict:
    """Минимали multipart-парсер барои file upload."""
    ctype = headers.get("Content-Type", "")
    m = re.search(r"boundary=(.+)$", ctype)
    if not m:
        return {}
    boundary = ("--" + m.group(1)).encode()
    parts = raw.split(boundary)
    result = {}
    for part in parts:
        part = part.strip(b"\r\n-")
        if not part or b"\r\n\r\n" not in part:
            continue
        head, _, body = part.partition(b"\r\n\r\n")
        head_str = head.decode("utf-8", errors="ignore")
        name_m = re.search(r'name="([^"]+)"', head_str)
        if not name_m:
            continue
        name = name_m.group(1)
        fname_m = re.search(r'filename="([^"]+)"', head_str)
        if fname_m:
            result[name] = {"filename": fname_m.group(1), "content": body.rstrip(b"\r\n")}
        else:
            result[name] = body.decode("utf-8", errors="ignore").rstrip("\r\n")
    return result


# Route registry
ROUTES: list[tuple[str, str, callable]] = []


def route(method: str, pattern: str):
    """Декоратор барои сабти роутҳо."""
    def deco(fn):
        ROUTES.append((method, pattern, fn))
        return fn
    return deco


# ---------- Health ----------
@route("GET", r"^/api/health$")
def h_health(req, m, body, qs):
    return 200, {"status": "ok", "name": "AliStroy CRM"}


# ---------- Categories ----------
@route("GET", r"^/api/categories$")
def h_cats_list(req, m, body, qs):
    with_tree = qs.get("tree", ["0"])[0] == "1"
    conn = db_conn()
    rows = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    out = [category_dict(conn, r, with_children=with_tree) for r in rows]
    conn.close()
    return 200, out


@route("POST", r"^/api/categories$")
def h_cats_create(req, m, body, qs):
    name = (body.get("name") or "").strip()
    if not name:
        return 400, {"error": "Номи категория ҳатмист"}
    conn = db_conn()
    if conn.execute("SELECT 1 FROM categories WHERE name=?", (name,)).fetchone():
        conn.close()
        return 400, {"error": "Чунин категория аллакай вуҷуд дорад"}
    cid = conn.execute(
        "INSERT INTO categories(name, icon, color, description) VALUES(?,?,?,?)",
        (name, body.get("icon", "folder"), body.get("color", "#16a34a"),
         body.get("description", "")),
    ).lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cid,)).fetchone()
    out = category_dict(conn, row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/categories/(?P<cid>\d+)$")
def h_cats_update(req, m, body, qs):
    cid = int(m.group("cid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    name = (body.get("name") or row["name"]).strip()
    conn.execute(
        "UPDATE categories SET name=?, icon=?, color=?, description=? WHERE id=?",
        (name, body.get("icon", row["icon"]), body.get("color", row["color"]),
         body.get("description", row["description"]), cid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cid,)).fetchone()
    out = category_dict(conn, row)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/categories/(?P<cid>\d+)$")
def h_cats_delete(req, m, body, qs):
    cid = int(m.group("cid"))
    conn = db_conn()
    conn.execute("DELETE FROM categories WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Subcategories ----------
@route("GET", r"^/api/subcategories$")
def h_subs_list(req, m, body, qs):
    cat = qs.get("category_id", [None])[0]
    conn = db_conn()
    if cat:
        rows = conn.execute(
            "SELECT * FROM subcategories WHERE category_id=? ORDER BY name", (int(cat),)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM subcategories ORDER BY name").fetchall()
    out = [subcategory_dict(conn, r) for r in rows]
    conn.close()
    return 200, out


@route("POST", r"^/api/subcategories$")
def h_subs_create(req, m, body, qs):
    name = (body.get("name") or "").strip()
    cat_id = body.get("category_id")
    if not name or not cat_id:
        return 400, {"error": "Ном ва категория ҳатмист"}
    conn = db_conn()
    sid = conn.execute(
        "INSERT INTO subcategories(name, category_id, description) VALUES(?,?,?)",
        (name, int(cat_id), body.get("description", "")),
    ).lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM subcategories WHERE id=?", (sid,)).fetchone()
    out = subcategory_dict(conn, row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/subcategories/(?P<sid>\d+)$")
def h_subs_update(req, m, body, qs):
    sid = int(m.group("sid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM subcategories WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    conn.execute(
        "UPDATE subcategories SET name=?, category_id=?, description=? WHERE id=?",
        ((body.get("name") or row["name"]).strip(),
         int(body.get("category_id", row["category_id"])),
         body.get("description", row["description"]), sid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM subcategories WHERE id=?", (sid,)).fetchone()
    out = subcategory_dict(conn, row)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/subcategories/(?P<sid>\d+)$")
def h_subs_delete(req, m, body, qs):
    sid = int(m.group("sid"))
    conn = db_conn()
    conn.execute("DELETE FROM subcategories WHERE id=?", (sid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Products ----------
@route("GET", r"^/api/products$")
def h_products_list(req, m, body, qs):
    conn = db_conn()
    sql = "SELECT p.* FROM products p"
    where = []
    args = []
    if qs.get("category_id"):
        sql += " JOIN subcategories s ON s.id=p.subcategory_id"
        where.append("s.category_id=?")
        args.append(int(qs["category_id"][0]))
    if qs.get("subcategory_id"):
        where.append("p.subcategory_id=?")
        args.append(int(qs["subcategory_id"][0]))
    if qs.get("supplier_id"):
        where.append("p.supplier_id=?")
        args.append(int(qs["supplier_id"][0]))
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY p.created_at DESC"
    rows = conn.execute(sql, args).fetchall()
    out = [product_dict(conn, r) for r in rows]

    search = (qs.get("q", [""])[0] or "").strip().lower()
    if search:
        out = [p for p in out
               if search in (p["name"] or "").lower()
               or search in (p.get("sku") or "").lower()
               or search in (p.get("description") or "").lower()]
    if qs.get("low_stock", ["0"])[0] == "1":
        out = [p for p in out if p["low_stock"]]
    conn.close()
    return 200, out


@route("GET", r"^/api/products/(?P<pid>\d+)$")
def h_products_get(req, m, body, qs):
    pid = int(m.group("pid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    out = product_dict(conn, row, with_history=True)
    conn.close()
    return 200, out


@route("GET", r"^/api/products/(?P<pid>\d+)/price-history$")
def h_products_price_history(req, m, body, qs):
    pid = int(m.group("pid"))
    conn = db_conn()
    rows = conn.execute(
        "SELECT * FROM price_history WHERE product_id=? ORDER BY changed_at DESC", (pid,)
    ).fetchall()
    out = [row_to_dict(r) for r in rows]
    conn.close()
    return 200, out


@route("POST", r"^/api/products$")
def h_products_create(req, m, body, qs):
    name = (body.get("name") or "").strip()
    sub_id = body.get("subcategory_id")
    if not name or not sub_id:
        return 400, {"error": "Ном ва подкатегория ҳатмист"}
    conn = db_conn()
    pid = conn.execute(
        "INSERT INTO products(name, sku, description, photo, price, cost_price, "
        "currency, unit, stock, min_stock, subcategory_id, supplier_id) "
        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        (name, body.get("sku") or None, body.get("description", ""),
         body.get("photo", ""), float(body.get("price") or 0),
         float(body.get("cost_price") or 0), body.get("currency", "TJS"),
         body.get("unit", "дона"), float(body.get("stock") or 0),
         float(body.get("min_stock") or 0), int(sub_id),
         body.get("supplier_id") or None),
    ).lastrowid
    conn.execute(
        "INSERT INTO price_history(product_id, old_price, new_price, "
        "old_cost_price, new_cost_price, note) VALUES(?,?,?,?,?,?)",
        (pid, 0, float(body.get("price") or 0), 0,
         float(body.get("cost_price") or 0), "Нархи аввалин"),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    out = product_dict(conn, row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/products/(?P<pid>\d+)$")
def h_products_update(req, m, body, qs):
    pid = int(m.group("pid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}

    old_price = row["price"]
    old_cost = row["cost_price"]
    new_price = float(body["price"]) if "price" in body else old_price
    new_cost = float(body["cost_price"]) if "cost_price" in body else old_cost

    conn.execute(
        "UPDATE products SET name=?, sku=?, description=?, photo=?, price=?, "
        "cost_price=?, currency=?, unit=?, stock=?, min_stock=?, "
        "subcategory_id=?, supplier_id=?, updated_at=? WHERE id=?",
        ((body.get("name") or row["name"]).strip(),
         body.get("sku", row["sku"]) or None,
         body.get("description", row["description"]),
         body.get("photo", row["photo"]),
         new_price, new_cost,
         body.get("currency", row["currency"]),
         body.get("unit", row["unit"]),
         float(body.get("stock", row["stock"]) or 0),
         float(body.get("min_stock", row["min_stock"]) or 0),
         int(body.get("subcategory_id", row["subcategory_id"])),
         body.get("supplier_id", row["supplier_id"]) or None,
         _now(), pid),
    )
    if old_price != new_price or old_cost != new_cost:
        conn.execute(
            "INSERT INTO price_history(product_id, old_price, new_price, "
            "old_cost_price, new_cost_price, note) VALUES(?,?,?,?,?,?)",
            (pid, old_price, new_price, old_cost, new_cost,
             body.get("price_note", "Нархи нав")),
        )
    conn.commit()
    row = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    out = product_dict(conn, row, with_history=True)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/products/(?P<pid>\d+)$")
def h_products_delete(req, m, body, qs):
    pid = int(m.group("pid"))
    conn = db_conn()
    conn.execute("DELETE FROM products WHERE id=?", (pid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Suppliers ----------
@route("GET", r"^/api/suppliers$")
def h_suppliers_list(req, m, body, qs):
    conn = db_conn()
    rows = conn.execute("SELECT * FROM suppliers ORDER BY name").fetchall()
    out = [supplier_dict(conn, r) for r in rows]
    search = (qs.get("q", [""])[0] or "").strip().lower()
    if search:
        out = [s for s in out
               if search in (s["name"] or "").lower()
               or search in (s.get("company") or "").lower()
               or search in (s.get("phone") or "").lower()
               or search in (s.get("market") or "").lower()]
    conn.close()
    return 200, out


@route("GET", r"^/api/suppliers/(?P<sid>\d+)$")
def h_suppliers_get(req, m, body, qs):
    sid = int(m.group("sid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM suppliers WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    out = supplier_dict(conn, row)
    prods = conn.execute("SELECT * FROM products WHERE supplier_id=?", (sid,)).fetchall()
    out["products"] = [product_dict(conn, p) for p in prods]
    conn.close()
    return 200, out


@route("POST", r"^/api/suppliers$")
def h_suppliers_create(req, m, body, qs):
    name = (body.get("name") or "").strip()
    if not name:
        return 400, {"error": "Номи фурушанда ҳатмист"}
    conn = db_conn()
    sid = conn.execute(
        "INSERT INTO suppliers(name, company, phone, phone2, email, market, "
        "address, notes, photo, rating) VALUES(?,?,?,?,?,?,?,?,?,?)",
        (name, body.get("company", ""), body.get("phone", ""),
         body.get("phone2", ""), body.get("email", ""), body.get("market", ""),
         body.get("address", ""), body.get("notes", ""), body.get("photo", ""),
         float(body.get("rating") or 0)),
    ).lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM suppliers WHERE id=?", (sid,)).fetchone()
    out = supplier_dict(conn, row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/suppliers/(?P<sid>\d+)$")
def h_suppliers_update(req, m, body, qs):
    sid = int(m.group("sid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM suppliers WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    conn.execute(
        "UPDATE suppliers SET name=?, company=?, phone=?, phone2=?, email=?, "
        "market=?, address=?, notes=?, photo=?, rating=? WHERE id=?",
        ((body.get("name") or row["name"]).strip(),
         body.get("company", row["company"]),
         body.get("phone", row["phone"]),
         body.get("phone2", row["phone2"]),
         body.get("email", row["email"]),
         body.get("market", row["market"]),
         body.get("address", row["address"]),
         body.get("notes", row["notes"]),
         body.get("photo", row["photo"]),
         float(body.get("rating", row["rating"]) or 0), sid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM suppliers WHERE id=?", (sid,)).fetchone()
    out = supplier_dict(conn, row)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/suppliers/(?P<sid>\d+)$")
def h_suppliers_delete(req, m, body, qs):
    sid = int(m.group("sid"))
    conn = db_conn()
    conn.execute("DELETE FROM suppliers WHERE id=?", (sid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Clients ----------
@route("GET", r"^/api/clients$")
def h_clients_list(req, m, body, qs):
    conn = db_conn()
    rows = conn.execute("SELECT * FROM clients ORDER BY created_at DESC").fetchall()
    out = [client_dict(conn, r) for r in rows]
    search = (qs.get("q", [""])[0] or "").strip().lower()
    if search:
        out = [c for c in out
               if search in (c["name"] or "").lower()
               or search in (c.get("phone") or "").lower()
               or search in (c.get("company") or "").lower()]
    conn.close()
    return 200, out


@route("GET", r"^/api/clients/(?P<cid>\d+)$")
def h_clients_get(req, m, body, qs):
    cid = int(m.group("cid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM clients WHERE id=?", (cid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    out = client_dict(conn, row)
    orders = conn.execute(
        "SELECT * FROM orders WHERE client_id=? ORDER BY created_at DESC", (cid,)
    ).fetchall()
    out["orders"] = [order_dict(conn, o) for o in orders]
    conn.close()
    return 200, out


@route("POST", r"^/api/clients$")
def h_clients_create(req, m, body, qs):
    name = (body.get("name") or "").strip()
    if not name:
        return 400, {"error": "Номи клиент ҳатмист"}
    conn = db_conn()
    cid = conn.execute(
        "INSERT INTO clients(name, phone, phone2, email, address, company, notes, status) "
        "VALUES(?,?,?,?,?,?,?,?)",
        (name, body.get("phone", ""), body.get("phone2", ""),
         body.get("email", ""), body.get("address", ""),
         body.get("company", ""), body.get("notes", ""),
         body.get("status", "active")),
    ).lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM clients WHERE id=?", (cid,)).fetchone()
    out = client_dict(conn, row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/clients/(?P<cid>\d+)$")
def h_clients_update(req, m, body, qs):
    cid = int(m.group("cid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM clients WHERE id=?", (cid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    conn.execute(
        "UPDATE clients SET name=?, phone=?, phone2=?, email=?, address=?, "
        "company=?, notes=?, status=? WHERE id=?",
        ((body.get("name") or row["name"]).strip(),
         body.get("phone", row["phone"]),
         body.get("phone2", row["phone2"]),
         body.get("email", row["email"]),
         body.get("address", row["address"]),
         body.get("company", row["company"]),
         body.get("notes", row["notes"]),
         body.get("status", row["status"]), cid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM clients WHERE id=?", (cid,)).fetchone()
    out = client_dict(conn, row)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/clients/(?P<cid>\d+)$")
def h_clients_delete(req, m, body, qs):
    cid = int(m.group("cid"))
    conn = db_conn()
    conn.execute("DELETE FROM clients WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Orders ----------
@route("GET", r"^/api/orders$")
def h_orders_list(req, m, body, qs):
    conn = db_conn()
    sql = "SELECT * FROM orders"
    where = []; args = []
    if qs.get("status"):
        where.append("status=?"); args.append(qs["status"][0])
    if qs.get("client_id"):
        where.append("client_id=?"); args.append(int(qs["client_id"][0]))
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC"
    rows = conn.execute(sql, args).fetchall()
    out = [order_dict(conn, r) for r in rows]
    conn.close()
    return 200, out


@route("GET", r"^/api/orders/(?P<oid>\d+)$")
def h_orders_get(req, m, body, qs):
    oid = int(m.group("oid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    out = order_dict(conn, row, with_items=True)
    conn.close()
    return 200, out


@route("POST", r"^/api/orders$")
def h_orders_create(req, m, body, qs):
    client_id = body.get("client_id")
    items = body.get("items") or []
    if not client_id or not items:
        return 400, {"error": "Клиент ва маҳсулот ҳатмист"}
    conn = db_conn()
    cl = conn.execute("SELECT * FROM clients WHERE id=?", (int(client_id),)).fetchone()
    if not cl:
        conn.close(); return 404, {"error": "Клиент ёфт нашуд"}

    discount = float(body.get("discount") or 0)
    on = _gen_order_number(conn)
    oid = conn.execute(
        "INSERT INTO orders(order_number, client_id, status, delivery_address, "
        "delivery_date, notes, subtotal, discount, total) "
        "VALUES(?,?,?,?,?,?,?,?,?)",
        (on, int(client_id), body.get("status", "new"),
         body.get("delivery_address", cl["address"] or ""),
         body.get("delivery_date") or None, body.get("notes", ""),
         0, discount, 0),
    ).lastrowid

    subtotal = 0.0
    for it in items:
        prod = conn.execute(
            "SELECT * FROM products WHERE id=?", (int(it.get("product_id")),)
        ).fetchone()
        if not prod:
            continue
        qty = float(it.get("quantity") or 1)
        price = float(it.get("price") if it.get("price") is not None else prod["price"])
        line = qty * price
        subtotal += line
        conn.execute(
            "INSERT INTO order_items(order_id, product_id, product_name, unit, "
            "price, quantity, total, cost_price) VALUES(?,?,?,?,?,?,?,?)",
            (oid, prod["id"], prod["name"], prod["unit"], price, qty, line, prod["cost_price"] or 0),
        )
        conn.execute(
            "UPDATE products SET stock = MAX(0, stock - ?) WHERE id=?",
            (qty, prod["id"]),
        )

    total = max(0, subtotal - discount)
    conn.execute(
        "UPDATE orders SET subtotal=?, total=? WHERE id=?",
        (subtotal, total, oid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    out = order_dict(conn, row, with_items=True)
    conn.close()
    return 201, out


@route("PUT", r"^/api/orders/(?P<oid>\d+)$")
def h_orders_update(req, m, body, qs):
    oid = int(m.group("oid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    discount = float(body["discount"]) if "discount" in body else row["discount"]
    total = max(0, (row["subtotal"] or 0) - discount)
    conn.execute(
        "UPDATE orders SET status=?, delivery_address=?, delivery_date=?, "
        "notes=?, discount=?, total=?, updated_at=? WHERE id=?",
        (body.get("status", row["status"]),
         body.get("delivery_address", row["delivery_address"]),
         body.get("delivery_date", row["delivery_date"]),
         body.get("notes", row["notes"]),
         discount, total, _now(), oid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    out = order_dict(conn, row, with_items=True)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/orders/(?P<oid>\d+)$")
def h_orders_delete(req, m, body, qs):
    oid = int(m.group("oid"))
    conn = db_conn()
    items = conn.execute(
        "SELECT product_id, quantity FROM order_items WHERE order_id=?", (oid,)
    ).fetchall()
    for it in items:
        if it["product_id"]:
            conn.execute(
                "UPDATE products SET stock = stock + ? WHERE id=?",
                (it["quantity"], it["product_id"]),
            )
    conn.execute("DELETE FROM orders WHERE id=?", (oid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Dashboard ----------
@route("GET", r"^/api/dashboard/stats$")
def h_dashboard(req, m, body, qs):
    conn = db_conn()
    total_products = conn.execute("SELECT COUNT(*) c FROM products").fetchone()["c"]
    total_suppliers = conn.execute("SELECT COUNT(*) c FROM suppliers").fetchone()["c"]
    total_clients = conn.execute("SELECT COUNT(*) c FROM clients").fetchone()["c"]

    orders_total = conn.execute("SELECT COUNT(*) c FROM orders").fetchone()["c"]
    orders_new = conn.execute("SELECT COUNT(*) c FROM orders WHERE status='new'").fetchone()["c"]
    orders_progress = conn.execute("SELECT COUNT(*) c FROM orders WHERE status='in_progress'").fetchone()["c"]
    orders_completed = conn.execute("SELECT COUNT(*) c FROM orders WHERE status='completed'").fetchone()["c"]
    orders_cancelled = conn.execute("SELECT COUNT(*) c FROM orders WHERE status='cancelled'").fetchone()["c"]

    revenue = conn.execute(
        "SELECT COALESCE(SUM(total),0) r FROM orders WHERE status='completed'"
    ).fetchone()["r"]

    inventory_value = conn.execute(
        "SELECT COALESCE(SUM(stock*price),0) v FROM products"
    ).fetchone()["v"]

    low_rows = conn.execute(
        "SELECT * FROM products WHERE min_stock>0 AND stock <= min_stock LIMIT 8"
    ).fetchall()
    low_stock = [product_dict(conn, r) for r in low_rows]

    recent_rows = conn.execute(
        "SELECT * FROM orders ORDER BY created_at DESC LIMIT 6"
    ).fetchall()
    recent_orders = [order_dict(conn, r) for r in recent_rows]

    rec_prod = conn.execute(
        "SELECT * FROM products ORDER BY created_at DESC LIMIT 6"
    ).fetchall()
    recent_products = [product_dict(conn, r) for r in rec_prod]

    # Чарт: 7 рӯзи охир
    today = datetime.utcnow().date()
    chart = []
    labels = ["Я", "Д", "С", "Ч", "П", "Ҷ", "Ш"]
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        nxt = day + timedelta(days=1)
        r = conn.execute(
            "SELECT COALESCE(SUM(total),0) t, COUNT(*) c FROM orders "
            "WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'",
            (day.isoformat(), nxt.isoformat()),
        ).fetchone()
        chart.append({
            "date": day.isoformat(),
            "label": labels[day.weekday()],
            "total": float(r["t"] or 0),
            "count": r["c"],
        })

    conn.close()
    return 200, {
        "total_products": total_products,
        "total_suppliers": total_suppliers,
        "total_clients": total_clients,
        "orders": {
            "total": orders_total, "new": orders_new,
            "in_progress": orders_progress, "completed": orders_completed,
            "cancelled": orders_cancelled,
        },
        "revenue": float(revenue or 0),
        "inventory_value": float(inventory_value or 0),
        "low_stock": low_stock,
        "recent_orders": recent_orders,
        "recent_products": recent_products,
        "chart_7days": chart,
    }


@route("GET", r"^/api/mindmap$")
def h_mindmap(req, m, body, qs):
    conn = db_conn()
    cats = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    tree = {"id": "root", "name": "AliStroy CRM", "children": []}
    for c in cats:
        cat_node = {
            "id": f"c-{c['id']}", "type": "category", "real_id": c["id"],
            "name": c["name"], "icon": c["icon"], "color": c["color"],
            "children": [],
        }
        subs = conn.execute(
            "SELECT * FROM subcategories WHERE category_id=? ORDER BY name", (c["id"],)
        ).fetchall()
        for s in subs:
            sub_node = {
                "id": f"s-{s['id']}", "type": "subcategory", "real_id": s["id"],
                "name": s["name"], "children": [],
            }
            prods = conn.execute(
                "SELECT * FROM products WHERE subcategory_id=? ORDER BY name", (s["id"],)
            ).fetchall()
            for p in prods:
                sub_node["children"].append({
                    "id": f"p-{p['id']}", "type": "product", "real_id": p["id"],
                    "name": p["name"], "price": p["price"],
                    "stock": p["stock"], "unit": p["unit"], "photo": p["photo"],
                })
            cat_node["children"].append(sub_node)
        tree["children"].append(cat_node)
    conn.close()
    return 200, tree


@route("GET", r"^/api/search$")
def h_search(req, m, body, qs):
    q = (qs.get("q", [""])[0] or "").strip().lower()
    if not q:
        return 200, {"products": [], "suppliers": [], "clients": [], "orders": []}
    conn = db_conn()
    pl = "%" + q + "%"
    products = [product_dict(conn, r) for r in conn.execute(
        "SELECT * FROM products WHERE LOWER(name) LIKE ? OR LOWER(IFNULL(sku,'')) LIKE ? "
        "ORDER BY created_at DESC LIMIT 10", (pl, pl)
    ).fetchall()]
    suppliers = [supplier_dict(conn, r) for r in conn.execute(
        "SELECT * FROM suppliers WHERE LOWER(name) LIKE ? OR LOWER(company) LIKE ? "
        "OR LOWER(phone) LIKE ? LIMIT 10", (pl, pl, pl)
    ).fetchall()]
    clients = [client_dict(conn, r) for r in conn.execute(
        "SELECT * FROM clients WHERE LOWER(name) LIKE ? OR LOWER(phone) LIKE ? LIMIT 10",
        (pl, pl)
    ).fetchall()]
    orders = [order_dict(conn, r) for r in conn.execute(
        "SELECT * FROM orders WHERE LOWER(order_number) LIKE ? LIMIT 10", (pl,)
    ).fetchall()]
    conn.close()
    return 200, {"products": products, "suppliers": suppliers,
                 "clients": clients, "orders": orders}


# ---------- Upload ----------
@route("POST", r"^/api/upload$")
def h_upload(req, m, body, qs):
    raw = body.pop("__raw__", None)
    headers = body.pop("__headers__", None)
    if not raw or not headers:
        return 400, {"error": "Файл нест"}
    parts = parse_multipart(headers, raw)
    if "file" not in parts or not isinstance(parts["file"], dict):
        return 400, {"error": "Файл нест"}
    fobj = parts["file"]
    fname = fobj["filename"]
    if "." not in fname:
        return 400, {"error": "Формат нодуруст"}
    ext = fname.rsplit(".", 1)[1].lower()
    if ext not in {"png", "jpg", "jpeg", "gif", "webp"}:
        return 400, {"error": "Формат нодуруст"}
    new_name = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_DIR, new_name), "wb") as f:
        f.write(fobj["content"])
    return 201, {"url": f"/uploads/{new_name}"}


# ---------- Auth ----------
@route("POST", r"^/api/auth/login$")
def h_auth_login(req, m, body, qs):
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not _check_password(username, password):
        time.sleep(0.5)  # бар зидди brute-force
        return 401, {"error": "Логин ё парол нодуруст"}
    _cleanup_sessions()
    token = _new_token()
    SESSIONS[token] = {
        "user": username,
        "expires": time.time() + SESSION_TTL,
    }
    return 200, {"token": token, "user": {"username": username, "role": "admin"}}


@route("POST", r"^/api/auth/logout$")
def h_auth_logout(req, m, body, qs):
    token = _get_token_from_headers(req.headers)
    if token:
        SESSIONS.pop(token, None)
    return 200, {"ok": True}


@route("GET", r"^/api/auth/me$")
def h_auth_me(req, m, body, qs):
    token = _get_token_from_headers(req.headers)
    sess = SESSIONS.get(token or "")
    if not sess or sess["expires"] < time.time():
        return 401, {"error": "Авторизация лозим"}
    return 200, {"username": sess["user"], "role": "admin"}


# ---------- Expenses ----------
@route("GET", r"^/api/expenses$")
def h_expenses_list(req, m, body, qs):
    conn = db_conn()
    sql = "SELECT * FROM expenses"
    where = []
    args = []
    if qs.get("from"):
        where.append("expense_date >= ?")
        args.append(qs["from"][0])
    if qs.get("to"):
        where.append("expense_date <= ?")
        args.append(qs["to"][0])
    if qs.get("category"):
        where.append("category = ?")
        args.append(qs["category"][0])
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY expense_date DESC, id DESC"
    rows = conn.execute(sql, args).fetchall()
    out = [row_to_dict(r) for r in rows]
    conn.close()
    return 200, out


@route("POST", r"^/api/expenses$")
def h_expenses_create(req, m, body, qs):
    title = (body.get("title") or "").strip()
    if not title:
        return 400, {"error": "Номи харҷ ҳатмист"}
    conn = db_conn()
    eid = conn.execute(
        "INSERT INTO expenses(title, category, amount, currency, notes, expense_date) "
        "VALUES(?,?,?,?,?,?)",
        (title, body.get("category", "other"),
         float(body.get("amount") or 0), body.get("currency", "TJS"),
         body.get("notes", ""),
         body.get("expense_date") or datetime.utcnow().date().isoformat()),
    ).lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id=?", (eid,)).fetchone()
    out = row_to_dict(row)
    conn.close()
    return 201, out


@route("PUT", r"^/api/expenses/(?P<eid>\d+)$")
def h_expenses_update(req, m, body, qs):
    eid = int(m.group("eid"))
    conn = db_conn()
    row = conn.execute("SELECT * FROM expenses WHERE id=?", (eid,)).fetchone()
    if not row:
        conn.close(); return 404, {"error": "Не ёфт"}
    conn.execute(
        "UPDATE expenses SET title=?, category=?, amount=?, currency=?, "
        "notes=?, expense_date=? WHERE id=?",
        ((body.get("title") or row["title"]).strip(),
         body.get("category", row["category"]),
         float(body.get("amount", row["amount"]) or 0),
         body.get("currency", row["currency"]),
         body.get("notes", row["notes"]),
         body.get("expense_date") or row["expense_date"], eid),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id=?", (eid,)).fetchone()
    out = row_to_dict(row)
    conn.close()
    return 200, out


@route("DELETE", r"^/api/expenses/(?P<eid>\d+)$")
def h_expenses_delete(req, m, body, qs):
    eid = int(m.group("eid"))
    conn = db_conn()
    conn.execute("DELETE FROM expenses WHERE id=?", (eid,))
    conn.commit()
    conn.close()
    return 200, {"ok": True}


# ---------- Finance ----------
@route("GET", r"^/api/finance/stats$")
def h_finance_stats(req, m, body, qs):
    """
    Натиҷа: даромад, нархи худи (харидҳо аз заявкаҳо), фоидаи bruto,
    харҷҳои мудирӣ, фоидаи соф, маблағи захираи кунунӣ.
    """
    conn = db_conn()
    period = qs.get("period", ["all"])[0]  # all|month|week|today

    where_orders = "status = 'completed'"
    args = []
    today = datetime.utcnow().date()
    start_date = None
    if period == "today":
        start_date = today
    elif period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today - timedelta(days=30)
    elif period == "year":
        start_date = today - timedelta(days=365)
    if start_date:
        where_orders += " AND created_at >= ?"
        args.append(start_date.isoformat())

    # Даромад (фурӯш)
    revenue_row = conn.execute(
        f"SELECT COALESCE(SUM(total),0) r FROM orders WHERE {where_orders}",
        args,
    ).fetchone()
    revenue = revenue_row["r"] or 0

    # Нархи худи (cost) — аз order_items дар ҳамон заявкаҳо
    cost_row = conn.execute(
        f"SELECT COALESCE(SUM(oi.cost_price * oi.quantity),0) c "
        f"FROM order_items oi JOIN orders o ON o.id = oi.order_id "
        f"WHERE {where_orders.replace('status', 'o.status').replace('created_at', 'o.created_at')}",
        args,
    ).fetchone()
    cost_of_goods = cost_row["c"] or 0

    gross_profit = revenue - cost_of_goods

    # Харҷҳои мудирӣ
    exp_where = ""
    exp_args = []
    if start_date:
        exp_where = " WHERE expense_date >= ?"
        exp_args.append(start_date.isoformat())
    exp_row = conn.execute(
        f"SELECT COALESCE(SUM(amount),0) e FROM expenses{exp_where}",
        exp_args,
    ).fetchone()
    expenses_total = exp_row["e"] or 0

    net_profit = gross_profit - expenses_total

    # Арзиши захираи ҷорӣ (бо нархи фурӯш)
    inv_sell = conn.execute(
        "SELECT COALESCE(SUM(stock*price),0) v FROM products"
    ).fetchone()["v"] or 0

    # Арзиши захираи ҷорӣ (бо нархи харид)
    inv_cost = conn.execute(
        "SELECT COALESCE(SUM(stock*cost_price),0) v FROM products"
    ).fetchone()["v"] or 0

    # Шумораи заявкаҳо дар давра
    orders_count = conn.execute(
        f"SELECT COUNT(*) c FROM orders WHERE {where_orders}", args
    ).fetchone()["c"]

    # Чарт: даромад/харҷ/фоида барои 12 моҳи охир
    monthly = []
    for i in range(11, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        rev = conn.execute(
            "SELECT COALESCE(SUM(total),0) r FROM orders "
            "WHERE status='completed' AND created_at >= ? AND created_at < ?",
            (month_start.isoformat(), next_month.isoformat()),
        ).fetchone()["r"] or 0
        cost = conn.execute(
            "SELECT COALESCE(SUM(oi.cost_price * oi.quantity),0) c "
            "FROM order_items oi JOIN orders o ON o.id = oi.order_id "
            "WHERE o.status='completed' AND o.created_at >= ? AND o.created_at < ?",
            (month_start.isoformat(), next_month.isoformat()),
        ).fetchone()["c"] or 0
        exp = conn.execute(
            "SELECT COALESCE(SUM(amount),0) e FROM expenses "
            "WHERE expense_date >= ? AND expense_date < ?",
            (month_start.isoformat(), next_month.isoformat()),
        ).fetchone()["e"] or 0
        monthly.append({
            "month": month_start.isoformat(),
            "label": ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"][month_start.month - 1],
            "revenue": float(rev),
            "cost": float(cost),
            "expenses": float(exp),
            "profit": float(rev - cost - exp),
        })

    # Харҷҳо ба гурӯҳ
    by_category = conn.execute(
        f"SELECT category, COALESCE(SUM(amount),0) total FROM expenses{exp_where} "
        "GROUP BY category ORDER BY total DESC",
        exp_args,
    ).fetchall()

    conn.close()
    return 200, {
        "period": period,
        "revenue": float(revenue),
        "cost_of_goods": float(cost_of_goods),
        "gross_profit": float(gross_profit),
        "expenses_total": float(expenses_total),
        "net_profit": float(net_profit),
        "inventory_value_sell": float(inv_sell),
        "inventory_value_cost": float(inv_cost),
        "orders_count": orders_count,
        "margin_percent": float((gross_profit / revenue * 100) if revenue else 0),
        "monthly": monthly,
        "expenses_by_category": [
            {"category": r["category"], "total": float(r["total"])} for r in by_category
        ],
    }


# ---------- Export ----------
def _make_xlsx(sheet_name: str, headers: list[str], rows: list[list]) -> bytes:
    """Сохтани файли .xlsx дар хотира бо stdlib танҳо."""
    from xml.sax.saxutils import escape as xml_escape

    def cell(val, col_letter, row_num):
        if val is None:
            val = ""
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return f'<c r="{col_letter}{row_num}" t="n"><v>{val}</v></c>'
        s = xml_escape(str(val))
        # SharedStrings бар нагирад — inlineStr
        return f'<c r="{col_letter}{row_num}" t="inlineStr"><is><t xml:space="preserve">{s}</t></is></c>'

    def col_letter(idx: int) -> str:
        # 0->A, 25->Z, 26->AA
        s = ""
        idx += 1
        while idx > 0:
            idx, rem = divmod(idx - 1, 26)
            s = chr(65 + rem) + s
        return s

    rows_xml = []
    # Header row
    header_cells = "".join(cell(h, col_letter(i), 1) for i, h in enumerate(headers))
    rows_xml.append(f'<row r="1">{header_cells}</row>')
    # Data rows
    for ri, row in enumerate(rows, start=2):
        cells = "".join(cell(v, col_letter(i), ri) for i, v in enumerate(row))
        rows_xml.append(f'<row r="{ri}">{cells}</row>')

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetData>' + "".join(rows_xml) + '</sheetData></worksheet>'
    )

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="{xml_escape(sheet_name)[:31]}" sheetId="1" r:id="rId1"/></sheets>'
        '</workbook>'
    )

    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        '</Relationships>'
    )

    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        '</Relationships>'
    )

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '</Types>'
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return buf.getvalue()


def _make_csv(headers: list[str], rows: list[list]) -> bytes:
    """CSV бо UTF-8 BOM то ки Excel дуруст кушояд."""
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    w.writerow(headers)
    for row in rows:
        w.writerow(["" if v is None else v for v in row])
    return "\ufeff".encode("utf-8") + buf.getvalue().encode("utf-8")


def _export_data(entity: str) -> tuple[str, list[str], list[list]]:
    """Бар гардонад: (sheet_name, headers, rows) барои entity-и муайян."""
    conn = db_conn()
    if entity == "products":
        rows_data = conn.execute(
            "SELECT p.id, p.name, p.sku, p.unit, p.price, p.cost_price, p.currency, "
            "p.stock, p.min_stock, c.name AS cat, s.name AS sub, sup.name AS sup_name, "
            "p.description, p.created_at "
            "FROM products p "
            "LEFT JOIN subcategories s ON s.id=p.subcategory_id "
            "LEFT JOIN categories c ON c.id=s.category_id "
            "LEFT JOIN suppliers sup ON sup.id=p.supplier_id "
            "ORDER BY p.created_at DESC"
        ).fetchall()
        headers = ["№", "Ном", "Артикул", "Воҳид", "Нархи фурӯш", "Нархи харид",
                   "Валюта", "Захира", "Минимум", "Категория", "Подкатегория",
                   "Фурушанда", "Тавсиф", "Сана"]
        rows = [[r["id"], r["name"], r["sku"] or "", r["unit"], r["price"],
                 r["cost_price"], r["currency"], r["stock"], r["min_stock"],
                 r["cat"] or "", r["sub"] or "", r["sup_name"] or "",
                 r["description"] or "", r["created_at"]] for r in rows_data]
        sheet = "Маҳсулот"

    elif entity == "orders":
        rows_data = conn.execute(
            "SELECT o.id, o.order_number, c.name AS client, c.phone, o.status, "
            "o.subtotal, o.discount, o.total, o.delivery_address, o.created_at "
            "FROM orders o LEFT JOIN clients c ON c.id=o.client_id "
            "ORDER BY o.created_at DESC"
        ).fetchall()
        headers = ["№", "Рақами заявка", "Клиент", "Телефон", "Статус",
                   "Зерҷамъ", "Тахфиф", "Маблағи умумӣ", "Суроға", "Сана"]
        status_map = {"new": "Нав", "in_progress": "Дар ҳол",
                      "completed": "Анҷом", "cancelled": "Бекор"}
        rows = [[r["id"], r["order_number"], r["client"] or "", r["phone"] or "",
                 status_map.get(r["status"], r["status"]),
                 r["subtotal"], r["discount"], r["total"],
                 r["delivery_address"] or "", r["created_at"]] for r in rows_data]
        sheet = "Заявкаҳо"

    elif entity == "clients":
        rows_data = conn.execute(
            "SELECT c.id, c.name, c.phone, c.phone2, c.email, c.company, "
            "c.address, c.status, COUNT(o.id) AS orders_cnt, "
            "COALESCE(SUM(o.total),0) AS total_spent, c.created_at "
            "FROM clients c LEFT JOIN orders o ON o.client_id=c.id "
            "GROUP BY c.id ORDER BY c.created_at DESC"
        ).fetchall()
        headers = ["№", "Ном", "Телефон", "Телефони иловагӣ", "Email", "Ширкат",
                   "Суроға", "Статус", "Заявкаҳо", "Маблағи умумӣ", "Сана"]
        st = {"active": "Фаъол", "vip": "VIP", "blocked": "Манъ"}
        rows = [[r["id"], r["name"], r["phone"] or "", r["phone2"] or "",
                 r["email"] or "", r["company"] or "", r["address"] or "",
                 st.get(r["status"], r["status"]), r["orders_cnt"],
                 r["total_spent"], r["created_at"]] for r in rows_data]
        sheet = "Клиентҳо"

    elif entity == "suppliers":
        rows_data = conn.execute(
            "SELECT s.id, s.name, s.company, s.phone, s.phone2, s.email, "
            "s.market, s.address, s.rating, COUNT(p.id) AS products_cnt, "
            "s.notes, s.created_at "
            "FROM suppliers s LEFT JOIN products p ON p.supplier_id=s.id "
            "GROUP BY s.id ORDER BY s.name"
        ).fetchall()
        headers = ["№", "Ном", "Ширкат", "Телефон", "Тел. иловагӣ", "Email",
                   "Бозор", "Суроға", "Рейтинг", "Маҳсулот", "Эзоҳ", "Сана"]
        rows = [[r["id"], r["name"], r["company"] or "", r["phone"] or "",
                 r["phone2"] or "", r["email"] or "", r["market"] or "",
                 r["address"] or "", r["rating"], r["products_cnt"],
                 r["notes"] or "", r["created_at"]] for r in rows_data]
        sheet = "Фурушандагон"

    elif entity == "expenses":
        rows_data = conn.execute(
            "SELECT id, title, category, amount, currency, expense_date, notes, created_at "
            "FROM expenses ORDER BY expense_date DESC"
        ).fetchall()
        headers = ["№", "Ном", "Категория", "Маблағ", "Валюта", "Сана", "Эзоҳ", "Илова шуд"]
        rows = [[r["id"], r["title"], r["category"], r["amount"], r["currency"],
                 r["expense_date"] or "", r["notes"] or "", r["created_at"]]
                for r in rows_data]
        sheet = "Харҷҳо"

    elif entity == "finance":
        # Хулосаи финансӣ
        rev = conn.execute("SELECT COALESCE(SUM(total),0) r FROM orders WHERE status='completed'").fetchone()["r"] or 0
        cost = conn.execute(
            "SELECT COALESCE(SUM(oi.cost_price*oi.quantity),0) c FROM order_items oi "
            "JOIN orders o ON o.id=oi.order_id WHERE o.status='completed'"
        ).fetchone()["c"] or 0
        exp = conn.execute("SELECT COALESCE(SUM(amount),0) e FROM expenses").fetchone()["e"] or 0
        inv_s = conn.execute("SELECT COALESCE(SUM(stock*price),0) v FROM products").fetchone()["v"] or 0
        inv_c = conn.execute("SELECT COALESCE(SUM(stock*cost_price),0) v FROM products").fetchone()["v"] or 0
        headers = ["Нишондиҳанда", "Маблағ (TJS)"]
        rows = [
            ["Даромад (фурӯши анҷом)", float(rev)],
            ["Нархи худи (cost of goods)", float(cost)],
            ["Фоидаи bruto", float(rev - cost)],
            ["Харҷҳои мудирӣ", float(exp)],
            ["Фоидаи соф", float(rev - cost - exp)],
            ["Арзиши захираи ҷорӣ (фурӯш)", float(inv_s)],
            ["Арзиши захираи ҷорӣ (харид)", float(inv_c)],
            ["Маржа (%)", round((rev - cost) / rev * 100, 2) if rev else 0],
        ]
        sheet = "Молия"

    else:
        conn.close()
        raise ValueError(f"Unknown entity: {entity}")

    conn.close()
    return sheet, headers, rows





# ---------------------------------------------------------------------------
# HTTP server
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _send_json(self, status: int, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: str, status: int = 200):
        ctype, _ = mimetypes.guess_type(path)
        if not ctype:
            ctype = "application/octet-stream"
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store" if path.endswith((".html", ".js", ".css")) else "public,max-age=3600")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _handle(self, method: str):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # API routes
        if path.startswith("/api/"):
            # Authentication check
            public_paths = {
                ("POST", "/api/auth/login"),
                ("GET", "/api/health"),
            }
            if (method, path) not in public_paths and not _is_authed(self.headers):
                return self._send_json(401, {"error": "Авторизация лозим"})

            # Export endpoints (binary download)
            if path.startswith("/api/export/") and method == "GET":
                entity = path[len("/api/export/"):]
                fmt = (qs.get("format", ["xlsx"])[0] or "xlsx").lower()
                try:
                    sheet, headers, rows = _export_data(entity)
                except ValueError:
                    return self._send_json(404, {"error": "Entity not found"})
                except Exception as e:
                    import traceback; traceback.print_exc()
                    return self._send_json(500, {"error": str(e)})

                ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
                if fmt == "csv":
                    data = _make_csv(headers, rows)
                    fname = f"alistroy_{entity}_{ts}.csv"
                    ctype = "text/csv; charset=utf-8"
                else:
                    data = _make_xlsx(sheet, headers, rows)
                    fname = f"alistroy_{entity}_{ts}.xlsx"
                    ctype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header(
                    "Content-Disposition",
                    f'attachment; filename="{fname}"',
                )
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Expose-Headers", "Content-Disposition")
                self.end_headers()
                self.wfile.write(data)
                return

            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b""
            ctype = self.headers.get("Content-Type", "")
            body: dict = {}
            if raw:
                if "application/json" in ctype:
                    try:
                        body = json.loads(raw.decode("utf-8") or "{}") or {}
                    except Exception:
                        return self._send_json(400, {"error": "JSON нодуруст"})
                elif "multipart/form-data" in ctype:
                    body = {"__raw__": raw, "__headers__": self.headers}
            for rmethod, pattern, fn in ROUTES:
                if rmethod != method:
                    continue
                m = re.match(pattern, path)
                if m:
                    try:
                        status, payload = fn(self, m, body, qs)
                    except Exception as e:  # pragma: no cover
                        import traceback; traceback.print_exc()
                        status, payload = 500, {"error": str(e)}
                    return self._send_json(status, payload)
            return self._send_json(404, {"error": "Not found"})

        # Uploads
        if path.startswith("/uploads/"):
            fname = path[len("/uploads/"):]
            full = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(full):
                return self._send_file(full)
            return self._send_json(404, {"error": "Not found"})

        # Frontend static + SPA fallback
        if method == "GET":
            rel = path.lstrip("/")
            full = os.path.join(FRONTEND_DIR, rel) if rel else os.path.join(FRONTEND_DIR, "index.html")
            if rel and os.path.isfile(full):
                return self._send_file(full)
            index = os.path.join(FRONTEND_DIR, "index.html")
            if os.path.isfile(index):
                return self._send_file(index)
            return self._send_json(404, {"error": "frontend not built"})

        return self._send_json(405, {"error": "Method not allowed"})

    def do_GET(self): self._handle("GET")
    def do_POST(self): self._handle("POST")
    def do_PUT(self): self._handle("PUT")
    def do_DELETE(self): self._handle("DELETE")


def main():
    init_db()
    seed_if_empty()
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"\n  ╔══════════════════════════════════════════╗")
    print(f"  ║  AliStroy CRM — server running           ║")
    print(f"  ║  Listen: http://{host}:{port}{' ' * (24 - len(host) - len(str(port)))}║")
    print(f"  ║  Login:  {ADMIN_USERNAME:<32}║")
    print(f"  ║  (бо HOST=0.0.0.0 берунаро дастрас аст)  ║")
    print(f"  ╚══════════════════════════════════════════╝\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] Хомӯш карда шуд.")


if __name__ == "__main__":
    main()
