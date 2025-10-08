# [수정] order.py
from flask import Blueprint, render_template, request, jsonify
from db import get_conn
import math
import traceback

order_bp = Blueprint('order', __name__, url_prefix='/order')

# [추가] 페이징 파라미터 처리를 위한 헬퍼 함수
def _parse_int(v, default, lo, hi):
    try:
        x = int(v)
        return max(lo, min(x, hi))
    except (ValueError, TypeError):
        return default

# --- 페이지 렌더링 ---
@order_bp.route('/list')
def order_list():
    return render_template('order/order_list.html')

@order_bp.route('/detail/<manage_no>')
def order_detail_page(manage_no):
    return render_template('order/order_detail.html', manage_no=manage_no)

# --- 내부 유틸 ---
_def_dt = lambda v: (v.isoformat() if hasattr(v, 'isoformat') else v)

def _map_summary_row(o: dict) -> dict:
    return {
        "manage_no": o.get("order_no"),
        "order_date": _def_dt(o.get("order_date")),
        "progress_status": o.get("order_status"),
        "order_kind": o.get("order_kind"),
        "usage_location": o.get("usage_location"),
        "order_vendor": o.get("customer_name"),
        "product_group": o.get("product_group"),
        "socket_group": o.get("socket_group"),
        "ball_type": o.get("ball_type"),
        "item_name1": o.get("item_name1"),
        "item_name2": o.get("item_name2"),
        "qty_total": o.get("qty_total"),
        "design_start": _def_dt(o.get("design_start")),
        "design_end": _def_dt(o.get("design_end")),
        "supply_in1": _def_dt(o.get("supply_in1")),
        "supply_in2": _def_dt(o.get("supply_in2")),
        "supply_in3": _def_dt(o.get("supply_in3")),
        "process_in1": _def_dt(o.get("process_in1")),
        "process_in_final": _def_dt(o.get("process_in_final")),
        "assembly_start": _def_dt(o.get("assembly_start")),
        "assembly_end": _def_dt(o.get("assembly_end")),
        "ship_date": _def_dt(o.get("ship_date")),
        "remarks": o.get("remarks"),
    }

def _map_detail_row(o: dict) -> dict:
    # (상세 API는 기존과 동일)
    pass

# --- API ---
@order_bp.route('/api/orders')
def api_orders():
    """
    [수정] 페이징, 정렬, 검색 기능이 가능하도록 구조 변경
    """
    try:
        # 파라미터 파싱
        page = _parse_int(request.args.get('page', 1), 1, 1, 10**9)
        per_page = _parse_int(request.args.get('per_page', 20), 20, 1, 200)
        
        # TODO: 향후 정렬, 검색 기능 추가 시 파라미터 추가
        offset = (page - 1) * per_page
        
        with get_conn() as conn:
            cur = conn.cursor()
            
            # TODO: 향후 검색 조건(WHERE) 추가
            where_clause = ""
            binds = {}

            # 전체 카운트 쿼리
            cur.execute(f"SELECT COUNT(*) FROM VW_ORDERS_SUMMARY {where_clause}", binds)
            total_count = cur.fetchone()[0]

            # 데이터 페이징 쿼리
            # TODO: 향후 정렬(ORDER BY) 기능 추가
            sql = f"""
                SELECT * FROM VW_ORDERS_SUMMARY
                {where_clause}
                ORDER BY ORDER_DATE DESC
                OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
            """
            cur.execute(sql, {**binds, 'offset': offset, 'limit': per_page})
            
            cols = [d[0].lower() for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        # inventory API와 동일한 응답 구조로 변경
        return jsonify({
            'data': [_map_summary_row(r) for r in rows],
            'total_count': total_count,
            'page': page,
            'per_page': per_page,
            'total_pages': math.ceil(total_count / per_page) if per_page > 0 else 0
        })

    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@order_bp.route('/api/order/<manage_no>')
def api_order_detail(manage_no):
    # (기존 코드와 동일)
    pass

@order_bp.route('/api/order_detail/<manage_no>')
def api_order_detail_page(manage_no):
    # (기존 코드와 동일)
    pass