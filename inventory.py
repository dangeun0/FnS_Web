# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, render_template, session
import math, traceback
from db import get_conn
from auth import login_required

inventory_bp = Blueprint('inventory', __name__, url_prefix='/inventory')

@inventory_bp.route('/page')
@login_required
def page():
    return render_template('inventory.html')

SORTABLE_COLS = {
    'ITEM_CODE': 'ITEM_CODE',
    'ITEM_NAME': 'ITEM_NAME',
    'CATEGORY_NAME': 'CATEGORY_NAME',
    'MAKER_NAME': 'MAKER_NAME',
    'MATERIAL_NAME': 'MATERIAL_NAME',
    'ITEM_SPEC': 'ITEM_SPEC',
    'STOCK': 'STOCK',
    'LAST_TRANS_DATE': 'LAST_TRANS_DATE',
}

def _parse_int(v, default, lo, hi):
    try:
        x = int(v)
        return max(lo, min(x, hi))
    except Exception:
        return default

@inventory_bp.route('/')
@login_required
def inventory():
    page = _parse_int(request.args.get('page', 1), 1, 1, 10**9)
    per_page = _parse_int(request.args.get('per_page', 20), 20, 1, 200)
    sort_col = (request.args.get('sort_col') or 'STOCK').upper().strip()
    sort_dir = (request.args.get('sort_dir') or 'DESC').upper().strip()
    q = (request.args.get('q') or '').strip()

    sort_col_sql = SORTABLE_COLS.get(sort_col, 'STOCK')
    sort_dir_sql = 'DESC' if sort_dir not in ('ASC','DESC') else sort_dir

    where = ''
    binds = {}
    if q:
        where = (
            "WHERE (UPPER(ITEM_CODE) LIKE :kw OR UPPER(ITEM_NAME) LIKE :kw "
            "OR UPPER(CATEGORY_NAME) LIKE :kw OR UPPER(MAKER_NAME) LIKE :kw "
            "OR UPPER(MATERIAL_NAME) LIKE :kw OR UPPER(ITEM_SPEC) LIKE :kw "
            "OR UPPER(ITEM_LOCATION) LIKE :kw)"
        )
        binds['kw'] = f"%{q.upper()}%"

    offset = (page - 1) * per_page

    sql = f"""
        SELECT ITEM_CODE, ITEM_NAME, CATEGORY_NAME, MAKER_NAME, MATERIAL_NAME,
               ITEM_SPEC, ITEM_NOTE, ITEM_LOCATION,
               CAST(NVL(STOCK, 0) AS NUMBER) AS STOCK_INT,
               LAST_TRANS_DATE
          FROM V_PARTS_STOCK
          {where}
         ORDER BY {sort_col_sql} {sort_dir_sql}
         OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """
    sql_count = f"SELECT COUNT(*) FROM V_PARTS_STOCK {where}"

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(sql_count, binds)
            total_count = cur.fetchone()[0]
            cur.execute(sql, {**binds, 'offset': offset, 'limit': per_page})
            rows = cur.fetchall()

        data = [{
            'item_code': r[0], 'item_name': r[1], 'category_name': r[2], 'maker_name': r[3],
            'material_name': r[4], 'item_spec': r[5], 'item_note': r[6], 'item_location': r[7],
            'stock': int(r[8]) if r[8] is not None else 0,
            'last_trans_date': r[9].isoformat() if r[9] is not None else None,
        } for r in rows]

        return jsonify({
            'data': data,
            'total_count': total_count,
            'page': page,
            'per_page': per_page,
            'total_pages': math.ceil(total_count / per_page) if per_page else 1,
            'sort': {'col': sort_col_sql, 'dir': sort_dir_sql},
            'q': q
        })
    except Exception:
        return jsonify({'status': 'error', 'message': traceback.format_exc()}), 500

@inventory_bp.route('/item/<code>')
@login_required
def item_detail(code):
    # ...(이하 내용은 수정 없음)...
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT ITEM_CODE, ITEM_NAME, CATEGORY_NAME, MAKER_NAME, MATERIAL_NAME,
                       ITEM_SPEC, ITEM_NOTE, ITEM_LOCATION,
                       CAST(NVL(STOCK, 0) AS NUMBER) AS STOCK_INT,
                       LAST_TRANS_DATE
                  FROM V_PARTS_STOCK
                 WHERE UPPER(ITEM_CODE) = UPPER(:c)
                """,
                {'c': code}
            )
            r = cur.fetchone()
            if not r:
                return jsonify({'status': 'not_found'}), 404

            cur.execute(
                """
                SELECT TRANS_DATE, INOUT_TYPE, QTY, DETAIL_NOTE
                  FROM PARTS_HISTORY
                 WHERE UPPER(ITEM_CODE)=UPPER(:c)
                 ORDER BY TRANS_DATE DESC
                 FETCH FIRST 50 ROWS ONLY
                """,
                {'c': code}
            )
            hist = [
                {
                    'trans_date': h[0].isoformat() if h[0] else None,
                    'inout_type': h[1],
                    'qty': float(h[2]) if h[2] is not None else 0,
                    'detail_note': h[3],
                }
                for h in cur.fetchall()
            ]

        data = {
            'item_code': r[0], 'item_name': r[1], 'category_name': r[2], 'maker_name': r[3],
            'material_name': r[4], 'item_spec': r[5], 'item_note': r[6], 'item_location': r[7],
            'stock': int(r[8]) if r[8] is not None else 0,
            'last_trans_date': r[9].isoformat() if r[9] is not None else None,
            'history': hist
        }
        return jsonify(data)
    except Exception:
        return jsonify({'status': 'error', 'message': traceback.format_exc()}), 500

@inventory_bp.route('/txn', methods=['POST'])
@login_required
def txn_process():
    # ...(이하 내용은 수정 없음)...
    try:
        data = request.get_json(force=True)
        code = (data.get('item_code') or '').strip()
        inout_type = (data.get('inout_type') or '').upper().strip()
        qty = int(data.get('qty') or 0)
        note = (data.get('note') or '').strip()
        user = (session.get('user_id') or '').strip()

        if not code or inout_type not in ('IN','OUT') or qty <= 0:
            return jsonify(success=False, message="잘못된 요청"), 400

        with get_conn() as conn:
            cur = conn.cursor()

            cur.execute("SELECT NVL(STOCK,0) FROM V_PARTS_STOCK WHERE UPPER(ITEM_CODE)=UPPER(:c)", {'c': code})
            row = cur.fetchone()
            if not row:
                return jsonify(success=False, message="존재하지 않는 품목"), 404
            curr_stock = int(row[0] or 0)

            if inout_type == 'OUT' and qty > curr_stock:
                return jsonify(success=False, message="재고 부족"), 409

            cur.execute(
                """
                INSERT INTO PARTS_HISTORY (ITEM_CODE, INOUT_TYPE, QTY, DETAIL_NOTE, CREATED_BY)
                VALUES (:c, :t, :q, :n, :u)
                """,
                {'c': code, 't': inout_type, 'q': qty, 'n': note, 'u': user}
            )
            conn.commit()

            cur.execute("SELECT NVL(STOCK,0) FROM V_PARTS_STOCK WHERE UPPER(ITEM_CODE)=UPPER(:c)", {'c': code})
            new_stock = int(cur.fetchone()[0] or 0)

        return jsonify(success=True, new_stock=new_stock)
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        return jsonify(success=False, message=traceback.format_exc()), 500