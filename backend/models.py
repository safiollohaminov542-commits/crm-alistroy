"""
Database models for AliStroy CRM.
SQLAlchemy models with auto-generated SQLite database.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Category(db.Model):
    """Категорияи асосӣ (масалан: семент, оҳан, чӯб)."""
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    icon = db.Column(db.String(50), default="folder")
    color = db.Column(db.String(20), default="#16a34a")
    description = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    subcategories = db.relationship(
        "Subcategory",
        backref="category",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self, with_children: bool = False):
        data = {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "color": self.color,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "subcategories_count": len(self.subcategories),
            "products_count": sum(len(s.products) for s in self.subcategories),
        }
        if with_children:
            data["subcategories"] = [s.to_dict(with_children=True) for s in self.subcategories]
        return data


class Subcategory(db.Model):
    """Подкатегория (масалан: дар категорияи "Семент" — М400, М500)."""
    __tablename__ = "subcategories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="")
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship(
        "Product",
        backref="subcategory",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self, with_children: bool = False):
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "products_count": len(self.products),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if with_children:
            data["products"] = [p.to_dict() for p in self.products]
        return data


class Supplier(db.Model):
    """Фурушанда — савдогаре, ки маҳсулот аз вай гирифта мешавад."""
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    company = db.Column(db.String(150), default="")
    phone = db.Column(db.String(40), default="")
    phone2 = db.Column(db.String(40), default="")
    email = db.Column(db.String(120), default="")
    market = db.Column(db.String(150), default="")  # Бозоре, ки аз он харид мешавад
    address = db.Column(db.Text, default="")
    notes = db.Column(db.Text, default="")
    photo = db.Column(db.String(255), default="")
    rating = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", backref="supplier", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "company": self.company,
            "phone": self.phone,
            "phone2": self.phone2,
            "email": self.email,
            "market": self.market,
            "address": self.address,
            "notes": self.notes,
            "photo": self.photo,
            "rating": self.rating,
            "products_count": len(self.products),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Product(db.Model):
    """Маҳсулот — мавод бо нарх, миқдор, акс, фурушанда."""
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(60), unique=True, nullable=True)  # Артикул
    description = db.Column(db.Text, default="")
    photo = db.Column(db.String(255), default="")

    # Нарх
    price = db.Column(db.Float, default=0.0)            # Нархи фурӯш (барои клиент)
    cost_price = db.Column(db.Float, default=0.0)       # Нархи харид (аз фурушанда)
    currency = db.Column(db.String(10), default="TJS")
    unit = db.Column(db.String(30), default="дона")     # дона, кг, метр, халта, м³

    # Захира
    stock = db.Column(db.Float, default=0.0)
    min_stock = db.Column(db.Float, default=0.0)        # Сатҳи минимум барои огоҳӣ

    subcategory_id = db.Column(db.Integer, db.ForeignKey("subcategories.id"), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    price_history = db.relationship(
        "PriceHistory",
        backref="product",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="PriceHistory.changed_at.desc()",
    )

    def to_dict(self, with_history: bool = False):
        data = {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "photo": self.photo,
            "price": self.price,
            "cost_price": self.cost_price,
            "currency": self.currency,
            "unit": self.unit,
            "stock": self.stock,
            "min_stock": self.min_stock,
            "subcategory_id": self.subcategory_id,
            "subcategory_name": self.subcategory.name if self.subcategory else None,
            "category_id": self.subcategory.category_id if self.subcategory else None,
            "category_name": self.subcategory.category.name if self.subcategory and self.subcategory.category else None,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "supplier_phone": self.supplier.phone if self.supplier else None,
            "low_stock": self.stock <= self.min_stock if self.min_stock else False,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if with_history:
            data["price_history"] = [h.to_dict() for h in self.price_history]
        return data


class PriceHistory(db.Model):
    """Таърихи тағйири нарх — нархи пешина нигоҳ дошта мешавад."""
    __tablename__ = "price_history"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    old_price = db.Column(db.Float, default=0.0)
    new_price = db.Column(db.Float, default=0.0)
    old_cost_price = db.Column(db.Float, default=0.0)
    new_cost_price = db.Column(db.Float, default=0.0)
    note = db.Column(db.String(255), default="")
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "old_price": self.old_price,
            "new_price": self.new_price,
            "old_cost_price": self.old_cost_price,
            "new_cost_price": self.new_cost_price,
            "note": self.note,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
        }


class Client(db.Model):
    """Клиент — харидор."""
    __tablename__ = "clients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(40), default="")
    phone2 = db.Column(db.String(40), default="")
    email = db.Column(db.String(120), default="")
    address = db.Column(db.Text, default="")
    company = db.Column(db.String(150), default="")
    notes = db.Column(db.Text, default="")
    status = db.Column(db.String(30), default="active")  # active, vip, blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    orders = db.relationship("Order", backref="client", lazy=True)

    def to_dict(self):
        total_spent = sum(o.total or 0 for o in self.orders)
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "phone2": self.phone2,
            "email": self.email,
            "address": self.address,
            "company": self.company,
            "notes": self.notes,
            "status": self.status,
            "orders_count": len(self.orders),
            "total_spent": total_spent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Order(db.Model):
    """Заявка — фармоиши клиент."""
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(40), unique=True, nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False)
    status = db.Column(db.String(30), default="new")
    # new (нав), in_progress (дар ҳол), completed (анҷом), cancelled (бекор)

    delivery_address = db.Column(db.Text, default="")
    delivery_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, default="")

    subtotal = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship(
        "OrderItem",
        backref="order",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self, with_items: bool = False):
        data = {
            "id": self.id,
            "order_number": self.order_number,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "client_phone": self.client.phone if self.client else None,
            "client_address": self.client.address if self.client else None,
            "status": self.status,
            "delivery_address": self.delivery_address,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "notes": self.notes,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "total": self.total,
            "items_count": len(self.items),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if with_items:
            data["items"] = [i.to_dict() for i in self.items]
        return data


class OrderItem(db.Model):
    """Сатри заявка — як маҳсулот дар заявка."""
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    product_name = db.Column(db.String(200), nullable=False)  # snapshot
    unit = db.Column(db.String(30), default="дона")
    price = db.Column(db.Float, default=0.0)
    quantity = db.Column(db.Float, default=1.0)
    total = db.Column(db.Float, default=0.0)

    product = db.relationship("Product", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "product_photo": self.product.photo if self.product else "",
            "unit": self.unit,
            "price": self.price,
            "quantity": self.quantity,
            "total": self.total,
        }
