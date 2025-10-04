# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, request, redirect, url_for, session
from functools import wraps
import traceback
from db import get_conn

auth_bp = Blueprint('auth', __name__)

# 로그인 보호 데코레이터
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return redirect(url_for('auth.login', next=request.path))
        return fn(*args, **kwargs)
    return wrapper

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    user_id = (request.form.get('id') or '').strip()
    pw = (request.form.get('password') or '').strip()
    if not user_id or not pw:
        return render_template('login.html', error='ID/PW를 입력하세요.'), 400

    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT ID, NAME, ROLE_LEVEL
                  FROM MEMBERS
                 WHERE UPPER(ID) = UPPER(:1)
                   AND TRIM(PASSWORD) = :2
                """,
                [user_id, pw]
            )
            row = cur.fetchone()
            if not row:
                return render_template('login.html', error='계정 정보가 올바르지 않습니다.'), 401

            cur.execute(
                "UPDATE MEMBERS SET LAST_DATE = SYSTIMESTAMP WHERE UPPER(ID) = UPPER(:1)",
                [user_id]
            )
            conn.commit()

            session['user_id'], session['user_name'], session['user_level'] = row[0], row[1], row[2]
    except Exception:
        return render_template('login.html', error=traceback.format_exc()), 500

    # ✅ 성공 시 항상 재고 페이지로 이동
    return redirect(url_for('inventory.page'))

@auth_bp.route('/logout')
@login_required
def logout():
    session.clear()
    return redirect(url_for('auth.login'))
