"""Routes for products and price history."""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from models import db, Product, PriceHistory, Subcategory

bp = Blueprint("products", __name__, url_prefix="/api")

ALLOWED_EXT = {"png", "jpg", "jpeg", "gif", "webp"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


@bp.get("/products")
def list_products():
    q = Product.query
    cat_id = request.args.get("category_id", type=int)
    sub_id = request.args.get("subcategory_id", type=int)
    sup_id = request.args.get("supplier_id", type=int)
    search = (request.args.get("q") or "").strip().lower()
    low_only = request.args.get("low_stock") == "1"

    if sub_id:
        q = q.filter(Product.subcategory_id == sub_id)
    if cat_id:
        q = q.join(Subcategory).filter(Subcategory.category_id == cat_id)
    if sup_id:
        q = q.filter(Product.supplier_id == sup_id)

    products = q.order_by(Product.created_at.desc()).all()
    result = [p.to_dict() for p in products]
    if search:
        result = [
            p for p in result
            if search in (p["name"] or "").lower()
            or search in (p.get("sku") or "").lower()
            or search in (p.get("description") or "").lower()
        ]
    if low_only:
        result = [p for p in result if p["low_stock"]]
    return jsonify(result)


@bp.get("/products/<int:pid>")
def get_product(pid):
    p = Product.query.get_or_404(pid)
    return jsonify(p.to_dict(with_history=True))


@bp.post("/products")
def create_product():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    sub_id = data.get("subcategory_id")
    if not name or not sub_id:
        return jsonify({"error": "Ном ва подкатегория ҳатмист"}), 400

    p = Product(
        name=name,
        sku=data.get("sku") or None,
        description=data.get("description", ""),
        photo=data.get("photo", ""),
        price=float(data.get("price") or 0),
        cost_price=float(data.get("cost_price") or 0),
        currency=data.get("currency", "TJS"),
        unit=data.get("unit", "дона"),
        stock=float(data.get("stock") or 0),
        min_stock=float(data.get("min_stock") or 0),
        subcategory_id=int(sub_id),
        supplier_id=data.get("supplier_id") or None,
    )
    db.session.add(p)
    db.session.flush()
    # таърихи нархи аввалин
    db.session.add(PriceHistory(
        product_id=p.id,
        old_price=0,
        new_price=p.price,
        old_cost_price=0,
        new_cost_price=p.cost_price,
        note="Нархи аввалин",
    ))
    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.put("/products/<int:pid>")
def update_product(pid):
    p = Product.query.get_or_404(pid)
    data = request.get_json() or {}

    old_price = p.price
    old_cost = p.cost_price

    if "name" in data and data["name"].strip():
        p.name = data["name"].strip()
    if "sku" in data:
        p.sku = data["sku"] or None
    p.description = data.get("description", p.description)
    p.photo = data.get("photo", p.photo)

    if "price" in data:
        p.price = float(data["price"] or 0)
    if "cost_price" in data:
        p.cost_price = float(data["cost_price"] or 0)
    if "currency" in data:
        p.currency = data["currency"]
    if "unit" in data:
        p.unit = data["unit"]
    if "stock" in data:
        p.stock = float(data["stock"] or 0)
    if "min_stock" in data:
        p.min_stock = float(data["min_stock"] or 0)
    if "subcategory_id" in data:
        p.subcategory_id = int(data["subcategory_id"])
    if "supplier_id" in data:
        p.supplier_id = data["supplier_id"] or None

    # Агар нарх тағйир ёфта бошад — ба таърих илова мекунем
    if old_price != p.price or old_cost != p.cost_price:
        db.session.add(PriceHistory(
            product_id=p.id,
            old_price=old_price,
            new_price=p.price,
            old_cost_price=old_cost,
            new_cost_price=p.cost_price,
            note=data.get("price_note", "Нархи нав"),
        ))
    db.session.commit()
    return jsonify(p.to_dict(with_history=True))


@bp.delete("/products/<int:pid>")
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


@bp.get("/products/<int:pid>/price-history")
def price_history(pid):
    p = Product.query.get_or_404(pid)
    return jsonify([h.to_dict() for h in p.price_history])


@bp.post("/upload")
def upload_image():
    """Боркунии акс барои маҳсулот ё фурушанда."""
    if "file" not in request.files:
        return jsonify({"error": "Файл нест"}), 400
    f = request.files["file"]
    if not f.filename or not _allowed(f.filename):
        return jsonify({"error": "Формати файл нодуруст"}), 400
    ext = f.filename.rsplit(".", 1)[1].lower()
    fname = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)
    f.save(os.path.join(upload_dir, secure_filename(fname)))
    return jsonify({"url": f"/uploads/{fname}"}), 201
