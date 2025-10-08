# app.py (메인) — 모듈화 적용 버전
import os
from flask import Flask, render_template, redirect, url_for
from auth import auth_bp, login_required
from inventory import inventory_bp
# ✅ 신규 추가: 발주 관리 모듈
# 기존 구조 변경 최소화, 신규 모듈 연결을 위해 import
from order import order_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_FOLDER_PATH = os.path.join(BASE_DIR, 'static')
app = Flask(__name__, template_folder="templates", static_folder=STATIC_FOLDER_PATH)

# app = Flask(__name__, template_folder="templates")

app.config["SECRET_KEY"] = "CHANGE_ME_TO_RANDOM_SECRET"  # TODO: 보안 키 설정 필수

# 블루프린트 등록
app.register_blueprint(auth_bp)
app.register_blueprint(inventory_bp)
# ✅ 신규 추가: 발주 관리 블루프린트 등록
# 이유: 발주 관리 Web 접근을 위해 필요
app.register_blueprint(order_bp)

@app.route("/")
@login_required
def home():
    # 로그인 성공 시 항상 재고 리스트 페이지로 이동
    return redirect(url_for("inventory.page"))

@app.route("/routes")
def list_routes():
    import urllib
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        url = urllib.parse.unquote(rule.rule)
        line = "{:50s} {:35s} {}".format(rule.endpoint, methods, url)
        output.append(line)
    response_body = "<pre>" + "\n".join(sorted(output)) + "</pre>"
    return response_body

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
