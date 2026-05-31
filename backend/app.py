"""
AliStroy CRM — Flask application entry point.
Маркази идоракунии склади маҳсулоти сохтмонӣ.
"""
import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from models import db
from routes.categories import bp as categories_bp
from routes.products import bp as products_bp
from routes.suppliers import bp as suppliers_bp
from routes.clients import bp as clients_bp
from routes.orders import bp as orders_bp
from routes.dashboard import bp as dashboard_bp


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "alistroy.db")


def create_app():
    app = Flask(
        __name__,
        static_folder=FRONTEND_DIR,
        static_url_path="",
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = UPLOAD_DIR
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

    CORS(app)
    db.init_app(app)

    # Register API blueprints
    app.register_blueprint(categories_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(suppliers_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(dashboard_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "name": "AliStroy CRM"})

    # Боркунии аксҳо
    @app.get("/uploads/<path:fname>")
    def uploads(fname):
        return send_from_directory(UPLOAD_DIR, fname)

    # SPA fallback — ҳамаи роутҳои дигар ба index.html
    @app.get("/")
    @app.get("/<path:path>")
    def spa(path: str = ""):
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        full = os.path.join(FRONTEND_DIR, path)
        if path and os.path.isfile(full):
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(FRONTEND_DIR, "index.html")

    with app.app_context():
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        db.create_all()
        from seed import seed_if_empty
        seed_if_empty()

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
