# AliStroy CRM

CRM-и пурра барои **склади маҳсулоти сохтмонӣ** бо интерфейси муосир дар стилии Donezo. 

Барои интернет-магазинҳои масолеҳи сохтмонӣ, ки бо фурушандагон аз бозорҳои калон ҳамкорӣ мекунанд.

## Имкониятҳои асосӣ

### 📊 Дашборд
- Омори умумӣ: маҳсулот, заявкаҳо, клиентҳо, фурушандагон
- Чарти фурӯш дар 7 рӯзи охир
- Огоҳии захираи кам
- Прогресси заявкаҳо
- Даромад ва арзиши умумии склад

### 🌳 Доскаи калон (Mind Map ба монанди Xmind)
- Намоиши иерархикии **категория → подкатегория → маҳсулот**
- Ҷустуҷӯи зуд бо filter
- Zoom in/out, кушодан/пӯшидани шохаҳо
- Pan & drag барои ҳаракат

### 📦 Маҳсулот
- Илова бо акс, артикул, нарх, захира, воҳид
- **Таърихи тағйири нарх** — нархи пешина нигоҳ дошта мешавад
- Огоҳӣ оид ба захираи минимум
- Намоиш дар ҷадвал ё гриди карточкаҳо
- Алоқа бо фурушанда (аз кадом савдогар)

### 🏷️ Категория ва подкатегория
- Дарахти доимии иерархикӣ
- Ранг ва иконкаи худ
- Ҳисоби автоматии маҳсулот

### 🚚 Фурушандагон
- Маълумот: ном, ширкат, телефон, **бозоре, ки аз он харида мешавад**
- Рейтинг (0-5)
- Нишон додани ҳамаи маҳсулот аз ин фурушанда

### 👥 Клиентҳо
- Базаи харидорон бо статусҳо: Фаъол / VIP / Манъ
- Таърихи заявкаҳо ва маблағи умумии хариҳо
- Сохтан клиенти нав мустақиман дар ҷараёни заявка

### 🛒 Заявкаҳо (фармоишҳо)
- Сохтани заявкаи нав бо ҷустуҷӯи зуди маҳсулот
- **Ҳисоби автоматии нарх** ҳангоми пуркунӣ
- Тахфиф ва маблағи умумӣ
- Чопи **чек** ба формати касбӣ
- Тағйири статус: Нав → Дар ҳол → Анҷом / Бекор
- Ҳангоми анҷом — захира аз склад автоматӣ кам мешавад
- Ҳангоми бекор кардан — захира бар мегардад

### 🔍 Ҷустуҷӯи умумӣ
Ctrl+K (ё ⌘K) — ҷустуҷӯ дар тамоми CRM (маҳсулот, клиент, фурушанда, заявка)

### 📱 Адаптивӣ
Дизайн пурра адаптивӣ — дар компютер, планшет ва мобилӣ хуб кор мекунад.

---

## Технологияҳо

- **Backend:** Python 3 + SQLite (стандарт, **бе зависимостҳои хориҷӣ**)
- **Frontend:** Vue 3 (CDN) + CSS muosир
- **DB:** SQLite — автоматӣ сохта мешавад ва бо маълумоти намунавӣ пур мешавад

## Гузориши лоиҳа

```bash
# Клон кардан
git clone https://github.com/safiollohaminov542-commits/crm-alistroy.git
cd crm-alistroy

# Иҷро (бе ягон зависимост!)
cd backend
python3 server.py
```

Ё бо Flask (агар хоста бошед):

```bash
cd backend
pip install -r requirements.txt
python3 app.py
```

Кушоед: **http://localhost:5000**

## Сохтори лоиҳа

```
crm-alistroy/
├── backend/
│   ├── server.py              # Сервери асосӣ (бе зависимост, stdlib танҳо)
│   ├── app.py                 # Алтернативаи Flask
│   ├── models.py              # Моделҳои SQLAlchemy (барои Flask)
│   ├── seed.py                # Маълумоти намунавӣ барои Flask
│   ├── routes/                # Endpoint-ҳои API (барои Flask)
│   ├── requirements.txt
│   ├── alistroy.db            # автоматӣ сохта мешавад
│   └── uploads/               # аксҳои корбар
└── frontend/
    ├── index.html
    ├── css/styles.css         # Тарҳи Donezo-style
    └── js/
        ├── app.js             # Vue app + sidebar + routing
        ├── api.js             # API client
        ├── icons.js           # Сохтмончаҳо
        ├── components.js      # Modal, Toast, Confirm, ImageUpload
        └── views/             # Саҳифаҳо
            ├── dashboard.js
            ├── categories.js
            ├── products.js
            ├── suppliers.js
            ├── clients.js
            ├── orders.js
            ├── order-form.js
            └── mindmap.js
```

## Базаи додаҳо (автоматӣ)

Ҳамаи ҷадвалҳо вақти аввалин иҷро автоматӣ сохта мешаванд:
- `categories`, `subcategories`, `products`, `price_history`
- `suppliers`, `clients`, `orders`, `order_items`

Маълумоти намунавӣ (6 категория, 14 маҳсулот, 4 фурушанда, 4 клиент, 4 заявка) ҳамзамон илова мешавад.

## API Endpoints

```
GET    /api/dashboard/stats
GET    /api/mindmap
GET    /api/search?q=...

GET    /api/categories?tree=1
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/subcategories?category_id=...
POST   /api/subcategories
PUT    /api/subcategories/:id
DELETE /api/subcategories/:id

GET    /api/products?category_id=&subcategory_id=&supplier_id=&q=&low_stock=
GET    /api/products/:id
GET    /api/products/:id/price-history
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/suppliers?q=...
POST   /api/suppliers
PUT    /api/suppliers/:id
DELETE /api/suppliers/:id

GET    /api/clients?q=...
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/orders?status=&client_id=
POST   /api/orders
PUT    /api/orders/:id
DELETE /api/orders/:id

POST   /api/upload     # аксҳо
```

## Лицензия

MIT
