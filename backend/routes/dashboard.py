"""Routes for dashboard statistics & mind-map data."""
from datetime import datetime, timedelta
from sqlalchemy import func
from flask import Blueprint, jsonify, request
from models import db, Category, Subcategory, Product, Supplier, Client, Order, OrderItem

bp = Blueprint("dashboard", __name__, url_prefix="/api")


@bp.get("/dashboard/stats")
def stats():
    total_products = Product.query.count()
    total_suppliers = Supplier.query.count()
    total_clients = Client.query.count()

    orders_total = Order.query.count()
    orders_new = Order.query.filter_by(status="new").count()
    orders_progress = Order.query.filter_by(status="in_progress").count()
    orders_completed = Order.query.filter_by(status="completed").count()
    orders_cancelled = Order.query.filter_by(status="cancelled").count()

    revenue = db.session.query(func.coalesce(func.sum(Order.total), 0)).filter(
        Order.status == "completed"
    ).scalar() or 0

    inventory_value = db.session.query(
        func.coalesce(func.sum(Product.stock * Product.price), 0)
    ).scalar() or 0

    low_stock = [
        p.to_dict() for p in Product.query.all()
        if p.min_stock and p.stock <= p.min_stock
    ][:8]

    # Заявкаҳои охирин
    recent_orders = [o.to_dict() for o in Order.query.order_by(Order.created_at.desc()).limit(6).all()]

    # Маҳсулоти охирин илова шуда
    recent_products = [p.to_dict() for p in Product.query.order_by(Product.created_at.desc()).limit(6).all()]

    # Чарт: фурӯш дар 7 рӯзи охир
    today = datetime.utcnow().date()
    chart = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        total = db.session.query(func.coalesce(func.sum(Order.total), 0)).filter(
            Order.created_at >= day,
            Order.created_at < next_day,
            Order.status != "cancelled",
        ).scalar() or 0
        count = Order.query.filter(
            Order.created_at >= day,
            Order.created_at < next_day,
        ).count()
        chart.append({
            "date": day.isoformat(),
            "label": ["Я", "Д", "С", "Ч", "П", "Ҷ", "Ш"][day.weekday()],
            "total": float(total),
            "count": count,
        })

    return jsonify({
        "total_products": total_products,
        "total_suppliers": total_suppliers,
        "total_clients": total_clients,
        "orders": {
            "total": orders_total,
            "new": orders_new,
            "in_progress": orders_progress,
            "completed": orders_completed,
            "cancelled": orders_cancelled,
        },
        "revenue": float(revenue),
        "inventory_value": float(inventory_value),
        "low_stock": low_stock,
        "recent_orders": recent_orders,
        "recent_products": recent_products,
        "chart_7days": chart,
    })


@bp.get("/mindmap")
def mindmap():
    """Сохтори дарахтӣ барои Mind Map: категория → подкатегория → маҳсулот."""
    cats = Category.query.order_by(Category.name).all()
    return jsonify({
        "id": "root",
        "name": "AliStroy CRM",
        "children": [
            {
                "id": f"c-{c.id}",
                "type": "category",
                "real_id": c.id,
                "name": c.name,
                "icon": c.icon,
                "color": c.color,
                "children": [
                    {
                        "id": f"s-{s.id}",
                        "type": "subcategory",
                        "real_id": s.id,
                        "name": s.name,
                        "children": [
                            {
                                "id": f"p-{p.id}",
                                "type": "product",
                                "real_id": p.id,
                                "name": p.name,
                                "price": p.price,
                                "stock": p.stock,
                                "unit": p.unit,
                                "photo": p.photo,
                            }
                            for p in s.products
                        ],
                    }
                    for s in c.subcategories
                ],
            }
            for c in cats
        ],
    })


@bp.get("/search")
def global_search():
    """Ҷустуҷӯи умумӣ дар тамоми CRM."""
    q = (request.args.get("q") or "").strip().lower()
    if not q:
        return jsonify({"products": [], "suppliers": [], "clients": [], "orders": []})

    products = [
        p.to_dict() for p in Product.query.all()
        if q in p.name.lower() or (p.sku and q in p.sku.lower())
    ][:10]
    suppliers = [
        s.to_dict() for s in Supplier.query.all()
        if q in s.name.lower() or (s.company and q in s.company.lower())
        or (s.phone and q in s.phone.lower())
    ][:10]
    clients = [
        c.to_dict() for c in Client.query.all()
        if q in c.name.lower() or (c.phone and q in c.phone.lower())
    ][:10]
    orders = [
        o.to_dict() for o in Order.query.all()
        if q in o.order_number.lower()
    ][:10]
    return jsonify({
        "products": products,
        "suppliers": suppliers,
        "clients": clients,
        "orders": orders,
    })
