# AliStroy CRM

CRM-и пурра барои **склади маҳсулоти сохтмонӣ** бо интерфейси муосир.

Барои интернет-магазинҳои масолеҳи сохтмонӣ, ки бо фурушандагон аз бозорҳои калон ҳамкорӣ мекунанд.

## Login

- **Логин:** `admin`
- **Парол:** `alistroy@2026@safi`

> Барои тағйир додани логин/парол: тавассути environment variables `CRM_ADMIN_USER` ва `CRM_ADMIN_PASS`

## Имкониятҳои асосӣ

### 🔐 Аутентификатсия
- Логин/парол сафҳа дар оғози барнома
- Bearer token (захира мешавад дар браузер 7 рӯз)
- Brute-force protection (0.5 sec sleep)
- Logout аз sidebar ё user menu

### 📊 Дашборд
- Омори умумӣ: маҳсулот, заявкаҳо, клиентҳо, фурушандагон
- Чарти фурӯш дар 7 рӯзи охир
- Огоҳии захираи кам
- Прогресси заявкаҳо

### 💰 Молия (нав!)
- **Даромад** (фурӯши заявкаҳои анҷомёфта)
- **Маблағи харидӣ** (cost of goods)
- **Фоидаи bruto** (даромад − харид)
- **Харҷҳои мудирӣ** (иҷора, маош, нақлиёт, ва ғайра)
- **Фоидаи соф** (фоидаи bruto − харҷҳо)
- **Маржа %**
- Чарти 12 моҳи охир (даромад + фоида)
- CRUD-и харҷҳо бо категория
- Филтр бо давра (рӯз/ҳафта/моҳ/сол/ҳама)

### 🌳 Доскаи озоди калон (Mind Map)
- **Ҳаракати озод** ба ҳама самт бо drag муш
- **Ctrl + ролик** = zoom in/out
- **Ролик** = scroll вертикалӣ ё горизонталӣ
- **Drag-и гиреҳҳо** — ҳар як гиреҳро дар ҷой худ ҷой кардан мумкин
- **Mini-map** дар кунҷ
- **Ҷустуҷӯ** ва highlight
- Auto-layout радиалӣ
- Канва 4000×3000 px

### 📦 Маҳсулот
- Илова бо акс, артикул, нарх, захира, воҳид
- **Таърихи тағйири нарх** — нархи пешина нигоҳ дошта мешавад
- Огоҳӣ оид ба захираи минимум

### 🏷️ Категория ва подкатегория
- Иерархикӣ бо ранг ва иконкаи худ

### 🚚 Фурушандагон
- Маълумот: ном, ширкат, телефон, **бозор**, рейтинг

### 👥 Клиентҳо
- Базаи харидорон бо статусҳо: Фаъол / VIP / Манъ
- Таърихи заявкаҳо

### 🛒 Заявкаҳо
- Сохтан бо ҷустуҷӯи зуди маҳсулот
- Ҳисоби автоматии нарх
- Чопи **чек**
- Тағйири статус
- Ҳангоми анҷом — захира кам мешавад
- Ҳангоми бекор кардан — захира бар мегардад

### 📥 Экспорт ба Excel/CSV (нав!)
Аз менюи sidebar:
- Маҳсулот
- Заявкаҳо
- Клиентҳо
- Фурушандагон
- Харҷҳо
- Молия (хулоса)

Формат: **нативии .xlsx** (Excel 2007+) ё **CSV** (UTF-8 BOM, separator `;` барои Excel)

### 🔄 Авто-навсозӣ (нав!)
Event bus — вақте маълумот тағйир ёфт, ҳамаи саҳифаҳои дигар автоматӣ обнавит мешаванд:
- Илова кардани маҳсулот → дашборд + Mind map + молия + заявкаҳо ҳама обнавит мешаванд
- Тағйири категория → саҳифаи маҳсулот ҳам обнавит мешавад

### 🔍 Ҷустуҷӯи умумӣ
Ctrl+K (ё ⌘K)

### 📱 Адаптивӣ
Дар компютер, планшет, мобилӣ — ҳама хуб кор мекунанд

---

## Технологияҳо

- **Backend:** Python 3 + SQLite (стандартии Python, **бе зависимостҳои хориҷӣ**)
  - HTTP server: `http.server.ThreadingHTTPServer`
  - DB: `sqlite3`
  - **XLSX генератсия:** `zipfile` + `xml` (нативии Excel 2007+)
  - **Auth:** `secrets` + Bearer tokens
- **Frontend:** Vue 3 (тавассути CDN) + CSS худ
- **DB:** SQLite — автоматӣ сохта мешавад

## Гузориши лоиҳа дар сервер

```bash
# Клон кардан дар сервери шумо
git clone https://github.com/safiollohaminov542-commits/crm-alistroy.git
cd crm-alistroy/backend

# Иҷро (бе зависимост!)
python3 server.py
```

Сервер дар `0.0.0.0:5000` оғоз мешавад. Аз ҳама ҷой дастрас аст:
```
http://YOUR_SERVER_IP:5000
```

### Тағйир додани порт

```bash
PORT=8080 python3 server.py
```

### Тағйир додани логин/парол

```bash
CRM_ADMIN_USER=safi CRM_ADMIN_PASS='myParol123!' python3 server.py
```

### Иҷро дар сервери Linux хамчун systemd service

`/etc/systemd/system/alistroy-crm.service`:

```ini
[Unit]
Description=AliStroy CRM
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/crm-alistroy/backend
Environment=PORT=5000
Environment=HOST=0.0.0.0
ExecStart=/usr/bin/python3 server.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable alistroy-crm
sudo systemctl start alistroy-crm
```

## Сохтори лоиҳа

```
crm-alistroy/
├── backend/
│   ├── server.py              # Сервери асосӣ (бе зависимост, stdlib танҳо)
│   ├── app.py                 # Алтернативаи Flask
│   ├── models.py
│   ├── seed.py
│   ├── routes/
│   ├── requirements.txt
│   ├── alistroy.db            # автоматӣ сохта мешавад
│   └── uploads/
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js             # API client + EventBus
        ├── auth.js            # Login screen + token logic
        ├── app.js             # Vue app
        ├── icons.js
        ├── components.js
        └── views/
            ├── dashboard.js
            ├── categories.js
            ├── products.js
            ├── suppliers.js
            ├── clients.js
            ├── orders.js
            ├── order-form.js
            ├── mindmap.js     # Free-form canvas
            └── finance.js     # Daromad/харҷ/фоида
```

## API Endpoints

### Auth (бе авторизация ҳатмист барои /login)
```
POST   /api/auth/login      {username, password} → {token, user}
POST   /api/auth/logout
GET    /api/auth/me
```

Ҳамаи endpoint-ҳои зерин **header `Authorization: Bearer <token>`** талаб мекунанд.

### Asosi
```
GET    /api/dashboard/stats
GET    /api/mindmap
GET    /api/search?q=...
GET    /api/finance/stats?period=all|today|week|month|year
```

### CRUD
```
/api/categories         GET POST | /:id PUT DELETE
/api/subcategories      GET POST | /:id PUT DELETE
/api/products           GET POST | /:id GET PUT DELETE
/api/suppliers          GET POST | /:id GET PUT DELETE
/api/clients            GET POST | /:id GET PUT DELETE
/api/orders             GET POST | /:id GET PUT DELETE
/api/expenses           GET POST | /:id PUT DELETE
```

### Export
```
GET /api/export/products?format=xlsx|csv
GET /api/export/orders?format=xlsx|csv
GET /api/export/clients?format=xlsx|csv
GET /api/export/suppliers?format=xlsx|csv
GET /api/export/expenses?format=xlsx|csv
GET /api/export/finance?format=xlsx|csv
```

### Upload
```
POST /api/upload     multipart/form-data {file}
```

## Лицензия

MIT — кор кунед, дигар созед, фурӯшед!
