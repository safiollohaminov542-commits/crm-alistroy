"""Routes for orders (заявкаҳо/фармоишҳо)."""
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, Order, OrderItem, Product, Client

bp = Blueprint("orders", __name__, url_prefix="/api")


def _gen_order_number():
    last = Order.query.order_by(Order.id.desc()).first()
    next_id = (last.id + 1) if last else 1
    return f"ALS-{datetime.utcnow().year}-{next_id:04d}"


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


@bp.get("/orders")
def list_orders():
    status = request.args.get("status")
    client_id = request.args.get("client_id", type=int)
    q = Order.query
    if status:
        q = q.filter_by(status=status)
    if client_id:
        q = q.filter_by(client_id=client_id)
    orders = q.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@bp.get("/orders/<int:oid>")
def get_order(oid):
    o = Order.query.get_or_404(oid)
    return jsonify(o.to_dict(with_items=True))


@bp.post("/orders")
def create_order():
    data = request.get_json() or {}
    client_id = data.get("client_id")
    items_data = data.get("items") or []
    if not client_id or not items_data:
        return jsonify({"error": "Клиент ва маҳсулот ҳатмист"}), 400
    client = Client.query.get(client_id)
    if not client:
        return jsonify({"error": "Клиент ёфт нашуд"}), 404

    discount = float(data.get("discount") or 0)
    o = Order(
        order_number=_gen_order_number(),
        client_id=client_id,
        status=data.get("status", "new"),
        delivery_address=data.get("delivery_address", client.address or ""),
        delivery_date=_parse_date(data.get("delivery_date")),
        notes=data.get("notes", ""),
        discount=discount,
    )
    db.session.add(o)
    db.session.flush()

    subtotal = 0.0
    for item in items_data:
        product = Product.query.get(item.get("product_id"))
        if not product:
            continue
        qty = float(item.get("quantity") or 1)
        # Аз нархи маҳсулот мегирем (ё аз заявка агар таҳрир шуда бошад)
        price = float(item.get("price") if item.get("price") is not None else product.price)
        line_total = qty * price
        subtotal += line_total
        oi = OrderItem(
            order_id=o.id,
            product_id=product.id,
            product_name=product.name,
            unit=product.unit,
            price=price,
            quantity=qty,
            total=line_total,
        )
        db.session.add(oi)
        # Кам кардани захира
        product.stock = max(0, (product.stock or 0) - qty)

    o.subtotal = subtotal
    o.total = max(0, subtotal - discount)
    db.session.commit()
    return jsonify(o.to_dict(with_items=True)), 201


@bp.put("/orders/<int:oid>")
def update_order(oid):
    o = Order.query.get_or_404(oid)
    data = request.get_json() or {}
    if "status" in data:
        o.status = data["status"]
    if "delivery_address" in data:
        o.delivery_address = data["delivery_address"]
    if "delivery_date" in data:
        o.delivery_date = _parse_date(data["delivery_date"])
    if "notes" in data:
        o.notes = data["notes"]
    if "discount" in data:
        o.discount = float(data["discount"] or 0)
        o.total = max(0, (o.subtotal or 0) - o.discount)
    db.session.commit()
    return jsonify(o.to_dict(with_items=True))


@bp.delete("/orders/<int:oid>")
def delete_order(oid):
    o = Order.query.get_or_404(oid)
    # Барои бекор кардан — захираро бар мегардонем
    for item in o.items:
        if item.product:
            item.product.stock = (item.product.stock or 0) + (item.quantity or 0)
    db.session.delete(o)
    db.session.commit()
    return jsonify({"ok": True})
