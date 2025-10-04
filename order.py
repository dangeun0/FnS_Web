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

# -------------------------------
# 내부 유틸 (프런트 호환용 키 매핑)
# -------------------------------
# [추가] datetime → ISO 문자열 보정
_def_dt = lambda v: (v.isoformat() if hasattr(v, 'isoformat') else v)

# [추가] VW_ORDERS_SUMMARY(백엔드 컬럼) → 프런트(order.js) 기대 키로 매핑
#  - 뷰에 없는 값들은 일단 None/''로 채우고, 추후 뷰 확장 단계에서 채움
#  - 안정화를 위해 백엔드에서 변환하여 프런트 변경 최소화

def _map_summary_row(o: dict) -> dict:
    return {
        "manage_no":        o.get("order_no"),
        "order_date":       _def_dt(o.get("order_date")),
        "progress_status":  o.get("order_status"),
        "order_kind":       o.get("order_kind"),
        "usage_location":   o.get("usage_location"),
        # NOTE: 현재 스키마에서는 CUSTOMER_NAME이 가장 근접. 추후 전용 컬럼 생기면 교체
        "order_vendor":     o.get("customer_name"),
        "product_group":    o.get("product_group"),
        "socket_group":     o.get("socket_group"),
        "ball_type":        o.get("ball_type"),
        "item_name1":       o.get("item_name1"),
        "item_name2":       o.get("item_name2"),
        "qty_total":        o.get("qty_total"),
        # 뷰에 없음 → 2단계(뷰 확장)에서 채움
        "design_start":     _def_dt(o.get("design_start")),
        "design_end":       _def_dt(o.get("design_end")),
        "supply_in1":       _def_dt(o.get("supply_in1")),
        "supply_in2":       _def_dt(o.get("supply_in2")),
        "supply_in3":       _def_dt(o.get("supply_in3")),
        "process_in1":      _def_dt(o.get("process_in1")),
        "process_in_final": _def_dt(o.get("process_in_final")),
        "assembly_start":   _def_dt(o.get("assembly_start")),
        "assembly_end":     _def_dt(o.get("assembly_end")),
        "ship_date":        _def_dt(o.get("ship_date")),
        "remarks":          o.get("remarks"),
    }

# [추가] ORDERS(백엔드 컬럼) → 프런트 상세 모달 기대 키 매핑

def _map_detail_row(o: dict) -> dict:
    return {
        "manage_no":       o.get("order_no"),
        "order_date":      _def_dt(o.get("order_date")),
        "progress_status": o.get("order_status"),
        "customer":        o.get("customer_name"),
        "product_group":   o.get("product_group"),
        "qty_total":       o.get("qty_total"),
        "remarks":         o.get("remarks"),
        # 필요 시 추가 필드 확장 가능
    }

# -------------------------------
# API
# -------------------------------

@order_bp.route('/api/orders')
def api_orders():
    """
    [수정] 안정화 1단계
    - DB 연결을 컨텍스트 매니저로 변경 (자원 누수 방지)
    - 컬럼명을 프런트 기대 키로 변환하여 반환 (프런트 변경 최소화)
    """
    try:
        # [수정] get_conn() 컨텍스트 매니저 사용
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM VW_ORDERS_SUMMARY ORDER BY ORDER_DATE DESC")
            cols = [d[0].lower() for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        # [추가] 키 매핑
        return jsonify([_map_summary_row(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@order_bp.route('/api/order/<manage_no>')
def api_order_detail(manage_no):
    """
    [수정]
    - PK 컬럼명을 스키마에 맞게 수정: MANAGE_NO → ORDER_NO
    - 응답 키를 프런트 기대 키로 매핑
    """
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            # [수정] 컬럼명 교정
            cur.execute("SELECT * FROM ORDERS WHERE ORDER_NO = :1", [manage_no])
            row = cur.fetchone()
            if not row:
                return jsonify({}), 404
            cols = [d[0].lower() for d in cur.description]
            data = dict(zip(cols, row))
        # [추가] 키 매핑 후 반환
        return jsonify(_map_detail_row(data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
