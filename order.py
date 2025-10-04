from flask import Blueprint, render_template, request, jsonify
from db import get_conn

order_bp = Blueprint('order', __name__, url_prefix='/order')

# 발주 리스트 페이지
defined_columns = [
    "MANAGE_NO", "ORDER_DATE", "PROGRESS_STATUS", "ORDER_KIND", "USAGE_LOCATION",
    "ORDER_VENDOR", "PRODUCT_GROUP", "SOCKET_GROUP", "BALL_TYPE",
    "ITEM_NAME1", "ITEM_NAME2", "QTY_TOTAL", "DESIGN_START", "DESIGN_END",
    "SUPPLY_IN1", "SUPPLY_IN2", "SUPPLY_IN3", "PROCESS_IN1", "PROCESS_IN_FINAL",
    "ASSEMBLY_START", "ASSEMBLY_END", "SHIP_DATE", "REMARKS"
]

@order_bp.route('/list')
def order_list():
    return render_template('order/order_list.html')

# 발주 리스트 API
@order_bp.route('/api/orders')
def api_orders():
    conn = get_conn()
    cur = conn.cursor()
    query = "SELECT * FROM VW_ORDERS_SUMMARY ORDER BY ORDER_DATE DESC"
    cur.execute(query)
    rows = cur.fetchall()
    cols = [d[0].lower() for d in cur.description]
    data = [dict(zip(cols, row)) for row in rows]
    cur.close()
    conn.close()
    return jsonify(data)

# 발주 상세 API
@order_bp.route('/api/order/<manage_no>')
def api_order_detail(manage_no):
    conn = get_conn()
    cur = conn.cursor()
    query = "SELECT * FROM ORDERS WHERE MANAGE_NO = :1"
    cur.execute(query, [manage_no])
    row = cur.fetchone()
    cols = [d[0].lower() for d in cur.description]
    cur.close()
    conn.close()
    if not row:
        return jsonify({}), 404
    return jsonify(dict(zip(cols, row)))
