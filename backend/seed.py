"""Seed data барои нишондоди аввалини CRM."""
from datetime import datetime, timedelta
from models import db, Category, Subcategory, Product, Supplier, Client, Order, OrderItem, PriceHistory


def seed_if_empty():
    if Category.query.first():
        return  # аллакай сохта шуда

    print("[seed] Илова кардани маълумоти намунавӣ...")

    # ----- Categories with subcategories -----
    structure = [
        {
            "name": "Семент ва омехтаҳо",
            "icon": "package",
            "color": "#16a34a",
            "subs": ["Семент М400", "Семент М500", "Гипс", "Алебастр"],
        },
        {
            "name": "Оҳан ва металл",
            "icon": "tool",
            "color": "#0ea5e9",
            "subs": ["Арматура", "Тахтаи оҳанин", "Кунҷакҳо", "Қубурҳои оҳанӣ"],
        },
        {
            "name": "Хишт ва блок",
            "icon": "grid",
            "color": "#f97316",
            "subs": ["Хишти сурх", "Блоки газобетон", "Блоки пенобетон"],
        },
        {
            "name": "Чӯб ва тахта",
            "icon": "layers",
            "color": "#a16207",
            "subs": ["Тахтаи арра", "Брус", "Фанер", "ОСБ"],
        },
        {
            "name": "Маводи дохилӣ",
            "icon": "home",
            "color": "#7c3aed",
            "subs": ["Кафелҳо", "Лоиномат", "Обоҳо", "Ранг"],
        },
        {
            "name": "Сантехника",
            "icon": "droplet",
            "color": "#0891b2",
            "subs": ["Қубурҳо", "Кранҳо", "Унитаз ва ванна", "Радиаторҳо"],
        },
    ]

    cat_objs = {}
    for c in structure:
        cat = Category(name=c["name"], icon=c["icon"], color=c["color"])
        db.session.add(cat)
        db.session.flush()
        cat_objs[c["name"]] = cat
        for s in c["subs"]:
            sub = Subcategory(name=s, category_id=cat.id)
            db.session.add(sub)

    db.session.flush()

    # ----- Suppliers -----
    suppliers = [
        Supplier(name="Карим Раҳимов", company='ООО "Стройбаза Душанбе"',
                 phone="+992 901 23 45 67", market="Бозори Корвон",
                 address="Душанбе, кӯчаи Айнӣ 14", rating=4.8,
                 notes="Семент ва омехтаҳо — нархи мувофиқ"),
        Supplier(name="Бахтиёр Шарипов", company='ИП "Металл Сервис"',
                 phone="+992 935 11 22 33", market="Бозори Саховат",
                 address="Душанбе, ноҳияи Сино", rating=4.5,
                 notes="Арматура ва маводи металлӣ"),
        Supplier(name="Зариф Назаров", company='ООО "ТочикСтрой"',
                 phone="+992 918 77 88 99", market="Бозори Дехконобод",
                 address="Хуҷанд, кӯчаи Сомонӣ 7", rating=4.7,
                 notes="Хишт ва блок"),
        Supplier(name="Сафар Рашидов", company="Базаи чӯб",
                 phone="+992 905 44 33 22", market="Бозори Зарнисор",
                 address="Душанбе, кӯчаи Рӯдакӣ 120", rating=4.3,
                 notes="Чӯб ва тахта"),
    ]
    for s in suppliers:
        db.session.add(s)
    db.session.flush()

    # ----- Products -----
    products_data = [
        # subcategory_name, name, sku, price, cost, stock, unit, supplier_idx, photo
        ("Семент М400", "Семент М400 50кг", "SEM-400-50", 75, 60, 250, "халта", 0, ""),
        ("Семент М500", "Семент М500 50кг", "SEM-500-50", 85, 68, 180, "халта", 0, ""),
        ("Гипс", "Гипс сохтмонӣ 25кг", "GIP-25", 45, 35, 90, "халта", 0, ""),
        ("Арматура", "Арматура 12мм", "ARM-12", 12, 9, 1500, "метр", 1, ""),
        ("Арматура", "Арматура 14мм", "ARM-14", 16, 12, 1200, "метр", 1, ""),
        ("Тахтаи оҳанин", "Тахтаи оҳанин 1.5мм", "TAH-15", 280, 230, 60, "м²", 1, ""),
        ("Хишти сурх", "Хишти сурхи якруйи", "HIS-RED-1", 1.2, 0.9, 8000, "дона", 2, ""),
        ("Блоки газобетон", "Блоки газобетон 600x300x200", "GAZ-600", 35, 28, 450, "дона", 2, ""),
        ("Тахтаи арра", "Тахтаи арра 25мм", "TAH-25", 850, 680, 30, "м³", 3, ""),
        ("Брус", "Брус 100x100", "BRUS-100", 65, 50, 200, "метр", 3, ""),
        ("Кафелҳо", "Кафели полокӣ 30x30", "KAF-30", 75, 55, 350, "м²", 0, ""),
        ("Ранг", "Ранги обӣ оқ 5кг", "RAN-W-5", 180, 140, 45, "сатил", 0, ""),
        ("Қубурҳо", "Қубур ПВХ 110мм", "QUB-110", 95, 75, 80, "метр", 1, ""),
        ("Кранҳо", "Крани ванна", "KRA-V", 250, 180, 25, "дона", 0, ""),
    ]

    for sub_name, pname, sku, price, cost, stock, unit, sup_idx, photo in products_data:
        sub = Subcategory.query.filter_by(name=sub_name).first()
        if not sub:
            continue
        p = Product(
            name=pname,
            sku=sku,
            price=price,
            cost_price=cost,
            stock=stock,
            min_stock=max(5, stock * 0.1),
            unit=unit,
            currency="TJS",
            subcategory_id=sub.id,
            supplier_id=suppliers[sup_idx].id,
            photo=photo,
        )
        db.session.add(p)
        db.session.flush()
        db.session.add(PriceHistory(
            product_id=p.id,
            old_price=0, new_price=price,
            old_cost_price=0, new_cost_price=cost,
            note="Нархи аввалин",
        ))

    db.session.flush()

    # ----- Clients -----
    clients = [
        Client(name="Алишер Мирзоев", phone="+992 901 11 22 33", company='ООО "СтройМастер"',
               address="Душанбе, кӯчаи Исмоили Сомонӣ 25", status="vip"),
        Client(name="Фарход Ҷӯраев", phone="+992 935 22 33 44",
               address="Душанбе, ноҳияи Шоҳмансур", status="active"),
        Client(name="Меҳрангез Каримова", phone="+992 918 55 66 77",
               address="Хуҷанд, кӯчаи Ленин 10", status="active"),
        Client(name="Шерзод Назиров", phone="+992 905 88 77 66", company="Бунёди Сохтмонӣ",
               address="Куляб", status="vip"),
    ]
    for c in clients:
        db.session.add(c)
    db.session.flush()

    # ----- Orders -----
    products_all = Product.query.all()
    statuses = ["completed", "completed", "in_progress", "new"]
    for i, client in enumerate(clients):
        order = Order(
            order_number=f"ALS-{datetime.utcnow().year}-{i+1:04d}",
            client_id=client.id,
            status=statuses[i],
            delivery_address=client.address,
            created_at=datetime.utcnow() - timedelta(days=i*2),
        )
        db.session.add(order)
        db.session.flush()
        subtotal = 0
        for p in products_all[i*2:i*2+3]:
            qty = 5 + i
            line = qty * p.price
            subtotal += line
            db.session.add(OrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                unit=p.unit,
                price=p.price,
                quantity=qty,
                total=line,
            ))
        order.subtotal = subtotal
        order.total = subtotal

    db.session.commit()
    print("[seed] Маълумоти намунавӣ илова шуд!")
