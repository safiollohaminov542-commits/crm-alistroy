"""Routes for clients (мизоҷон)."""
from flask import Blueprint, request, jsonify
from models import db, Client

bp = Blueprint("clients", __name__, url_prefix="/api")


@bp.get("/clients")
def list_clients():
    search = (request.args.get("q") or "").strip().lower()
    clients = Client.query.order_by(Client.created_at.desc()).all()
    result = [c.to_dict() for c in clients]
    if search:
        result = [
            c for c in result
            if search in (c["name"] or "").lower()
            or search in (c.get("phone") or "").lower()
            or search in (c.get("company") or "").lower()
        ]
    return jsonify(result)


@bp.get("/clients/<int:cid>")
def get_client(cid):
    c = Client.query.get_or_404(cid)
    data = c.to_dict()
    data["orders"] = [o.to_dict() for o in c.orders]
    return jsonify(data)


@bp.post("/clients")
def create_client():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Номи клиент ҳатмист"}), 400
    c = Client(
        name=name,
        phone=data.get("phone", ""),
        phone2=data.get("phone2", ""),
        email=data.get("email", ""),
        address=data.get("address", ""),
        company=data.get("company", ""),
        notes=data.get("notes", ""),
        status=data.get("status", "active"),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@bp.put("/clients/<int:cid>")
def update_client(cid):
    c = Client.query.get_or_404(cid)
    data = request.get_json() or {}
    if "name" in data and data["name"].strip():
        c.name = data["name"].strip()
    c.phone = data.get("phone", c.phone)
    c.phone2 = data.get("phone2", c.phone2)
    c.email = data.get("email", c.email)
    c.address = data.get("address", c.address)
    c.company = data.get("company", c.company)
    c.notes = data.get("notes", c.notes)
    c.status = data.get("status", c.status)
    db.session.commit()
    return jsonify(c.to_dict())


@bp.delete("/clients/<int:cid>")
def delete_client(cid):
    c = Client.query.get_or_404(cid)
    db.session.delete(c)
    db.session.commit()
    return jsonify({"ok": True})
