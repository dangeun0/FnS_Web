from flask import Flask, jsonify, render_template
import oracledb
import traceback

app = Flask(__name__, template_folder="templates")  # HTML 템플릿 위치 지정

# DB 접속 정보
DB_USER = "admin"
DB_PASSWORD = "FnsFnsdb2010!"
CONNECT_STRING = "fnsdbserver1_high"

# Wallet 위치
WALLET_DIR = "/home/ubuntu/wallet"
WALLET_PASSWORD = "FnsFnsdb2010!"

@app.route("/")
def index():
    return render_template("index.html")  # 브라우저에서 HTML 표시

@app.route("/data")
def data():
    try:
        pool = oracledb.create_pool(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=CONNECT_STRING,
            config_dir=WALLET_DIR,
            wallet_location=WALLET_DIR,
            wallet_password=WALLET_PASSWORD
        )
        with pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT ID, NAME, VALUE, CREATED_AT FROM TEST_DATA ORDER BY ID"
                )
                rows = cursor.fetchall()
                # JSON 변환
                result = [
                    {"id": r[0], "name": r[1], "value": r[2], "created_at": str(r[3])}
                    for r in rows
                ]
                return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": traceback.format_exc()})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)