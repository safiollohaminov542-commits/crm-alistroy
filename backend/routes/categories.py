"""Routes for categories and subcategories."""
from flask import Blueprint, request, jsonify
from models import db, Category, Subcategory

bp = Blueprint("categories", __name__, url_prefix="/api")


# ---------- Categories ----------
@bp.get("/categories")
def list_categories():
    with_children = request.args.get("tree", "0") == "1"
    cats = Category.query.order_by(Category.name).all()
    return jsonify([c.to_dict(with_children=with_children) for c in cats])


@bp.post("/categories")
def create_category():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Номи категория ҳатмист"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "Чунин категория аллакай вуҷуд дорад"}), 400
    cat = Category(
        name=name,
        icon=data.get("icon", "folder"),
        color=data.get("color", "#16a34a"),
        description=data.get("description", ""),
    )
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201


@bp.put("/categories/<int:cat_id>")
def update_category(cat_id):
    cat = Category.query.get_or_404(cat_id)
    data = request.get_json() or {}
    if "name" in data and data["name"].strip():
        cat.name = data["name"].strip()
    cat.icon = data.get("icon", cat.icon)
    cat.color = data.get("color", cat.color)
    cat.description = data.get("description", cat.description)
    db.session.commit()
    return jsonify(cat.to_dict())


@bp.delete("/categories/<int:cat_id>")
def delete_category(cat_id):
    cat = Category.query.get_or_404(cat_id)
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"ok": True})


# ---------- Subcategories ----------
@bp.get("/subcategories")
def list_subcategories():
    cat_id = request.args.get("category_id", type=int)
    q = Subcategory.query
    if cat_id:
        q = q.filter_by(category_id=cat_id)
    subs = q.order_by(Subcategory.name).all()
    return jsonify([s.to_dict() for s in subs])


@bp.post("/subcategories")
def create_subcategory():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    cat_id = data.get("category_id")
    if not name or not cat_id:
        return jsonify({"error": "Ном ва категория ҳатмист"}), 400
    sub = Subcategory(
        name=name,
        category_id=cat_id,
        description=data.get("description", ""),
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify(sub.to_dict()), 201


@bp.put("/subcategories/<int:sub_id>")
def update_subcategory(sub_id):
    sub = Subcategory.query.get_or_404(sub_id)
    data = request.get_json() or {}
    if "name" in data and data["name"].strip():
        sub.name = data["name"].strip()
    if "category_id" in data:
        sub.category_id = data["category_id"]
    sub.description = data.get("description", sub.description)
    db.session.commit()
    return jsonify(sub.to_dict())


@bp.delete("/subcategories/<int:sub_id>")
def delete_subcategory(sub_id):
    sub = Subcategory.query.get_or_404(sub_id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"ok": True})
