from functools import wraps
from flask import request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

ALLOWED_EMAIL = os.environ.get("ALLOWED_EMAIL", "")
_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
_google_request = google_requests.Request()


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Preflight: return 200 so CORS headers from after_request are applied
        if request.method == "OPTIONS":
            return "", 200

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401

        token = auth_header[7:]
        try:
            info = id_token.verify_oauth2_token(token, _google_request, _CLIENT_ID)
        except Exception as exc:
            return jsonify({"error": f"Invalid token: {exc}"}), 401

        if info.get("email") != ALLOWED_EMAIL:
            return jsonify({"error": "Forbidden"}), 403

        return f(*args, **kwargs)
    return decorated
