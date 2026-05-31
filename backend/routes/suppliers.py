"""Routes for suppliers (фурушандагон)."""
from flask import Blueprint, request, jsonify
from models import db, Supplier

bp = Blueprint("suppliers", __name__, url_prefix="/api")


@bp.get("/suppliers")
def list_suppliers():
    search = (request.args.get("q") or "").strip().lower()
    suppliers = Supplier.query.order_by(Supplier.name).all()
    result = [s.to_dict() for s in suppliers]
    if search:
        result = [
            s for s in result
            if search in (s["name"] or "").lower()
            or search in (s.get("company") or "").lower()
            or search in (s.get("phone") or "").lower()
            or search in (s.get("market") or "").lower()
        ]
    return jsonify(result)


@bp.get("/suppliers/<int:sid>")
def get_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    data = s.to_dict()
    data["products"] = [p.to_dict() for p in s.products]
    return jsonify(data)


@bp.post("/suppliers")
def create_supplier():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Номи фурушанда ҳатмист"}), 400
    s = Supplier(
        name=name,
        company=data.get("company", ""),
        phone=data.get("phone", ""),
        phone2=data.get("phone2", ""),
        email=data.get("email", ""),
        market=data.get("market", ""),
        address=data.get("address", ""),
        notes=data.get("notes", ""),
        photo=data.get("photo", ""),
        rating=float(data.get("rating") or 0),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@bp.put("/suppliers/<int:sid>")
def update_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    data = request.get_json() or {}
    if "name" in data and data["name"].strip():
        s.name = data["name"].strip()
    s.company = data.get("company", s.company)
    s.phone = data.get("phone", s.phone)
    s.phone2 = data.get("phone2", s.phone2)
    s.email = data.get("email", s.email)
    s.market = data.get("market", s.market)
    s.address = data.get("address", s.address)
    s.notes = data.get("notes", s.notes)
    s.photo = data.get("photo", s.photo)
    if "rating" in data:
        s.rating = float(data["rating"] or 0)
    db.session.commit()
    return jsonify(s.to_dict())


@bp.delete("/suppliers/<int:sid>")
def delete_supplier(sid):
    s = Supplier.query.get_or_404(sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"ok": True})
