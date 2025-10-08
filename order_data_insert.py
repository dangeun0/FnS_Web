#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
order_data_insert.py
엑셀(Status 시트)에서 특정 구간 데이터를 읽어 Oracle DB에 Insert
사용 예시:
    python3 order_data_insert.py 84 104
"""

import sys
import pandas as pd
import re
from datetime import datetime
from db import get_conn  # ✅ 같은 폴더의 db.py 참조

EXCEL_PATH = "/home/ubuntu/FnS_Web/생산현황데이터(2025)251007.xlsx"
SHEET_NAME = "Status"

# ===== 유틸 =====
def norm(s):
    if pd.isna(s): return ""
    s = str(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def as_date(v):
    if pd.isna(v) or str(v).strip() == "":
        return None
    try:
        return pd.to_datetime(v).date()
    except Exception:
        return None

def as_num(v):
    try:
        return int(v)
    except Exception:
        return None

# ===== Excel 로드 =====
def load_excel():
    raw = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=None)
    hdr = raw.iloc[1:5, :].applymap(norm)
    headers = []
    for c in hdr.columns:
        parts = [p for p in hdr[c].tolist() if p]
        headers.append(" / ".join(parts) if parts else f"COL{c}")
    data = raw.iloc[5:, :].copy()
    data.columns = headers
    return data

# ===== 컬럼 매핑 =====
COL_MAP = {
    "ORDER_NO": "관리번호",
    "ORDER_DATE": "발 주 일",
    "ORDER_STATUS": "진행상태",
    "ORDER_KIND": "오더 구분",
    "CUSTOMER_NAME": "발 주 처",
    "PRODUCT_GROUP": "제품군",
    "SOCKET_GROUP": "소켓군",
    "BALL_TYPE": "Device / Ball type",
    "ITEM_NAME1": "규격",
    "ITEM_NAME2": "모델명",
    "QTY_TOTAL": "수량",
    "REMARKS": "비고",
    "PROC_DUE": "입고예정",
    "PROC_IN1": "1차 입고",
    "PROC_IN_FINAL": "입고완료",
    "ASM_START": "시작일자",
    "ASM_END": "완료일자",
    "DELIVERY_DATE": "출하일자"
}

# ===== DB INSERT 로직 =====
def insert_to_db(df, start, end):
    df = df.iloc[start-6:end-6]  # 엑셀 행번호 보정 (헤더 5행)
    print(f"[INFO] 총 {len(df)}행 처리 중...")

    with get_conn() as conn:
        cur = conn.cursor()

        for _, r in df.iterrows():
            order_no = str(r[COL_MAP["ORDER_NO"]]).strip()
            if not order_no:
                continue

            # ORDERS
            vals = {
                "ORDER_DATE": as_date(r.get(COL_MAP["ORDER_DATE"])),
                "ORDER_STATUS": r.get(COL_MAP["ORDER_STATUS"]),
                "ORDER_KIND": r.get(COL_MAP["ORDER_KIND"]),
                "CUSTOMER_NAME": r.get(COL_MAP["CUSTOMER_NAME"]),
                "PRODUCT_GROUP": r.get(COL_MAP["PRODUCT_GROUP"]),
                "SOCKET_GROUP": r.get(COL_MAP["SOCKET_GROUP"]),
                "BALL_TYPE": r.get(COL_MAP["BALL_TYPE"]),
                "ITEM_NAME1": r.get(COL_MAP["ITEM_NAME1"]),
                "ITEM_NAME2": r.get(COL_MAP["ITEM_NAME2"]),
                "QTY_TOTAL": as_num(r.get(COL_MAP["QTY_TOTAL"])),
                "REMARKS": r.get(COL_MAP["REMARKS"])
            }
            for k, v in vals.items():
                if isinstance(v, float) and pd.isna(v):
                    vals[k] = None
                    
            sql_orders = """
                INSERT INTO ORDERS (
                    ORDER_NO, ORDER_DATE, ORDER_STATUS, ORDER_KIND,
                    CUSTOMER_NAME, PRODUCT_GROUP, SOCKET_GROUP,
                    BALL_TYPE, ITEM_NAME1, ITEM_NAME2, QTY_TOTAL, REMARKS
                ) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12)
            """
            try:
                cur.execute(sql_orders, (
                    order_no, vals["ORDER_DATE"], vals["ORDER_STATUS"], vals["ORDER_KIND"],
                    vals["CUSTOMER_NAME"], vals["PRODUCT_GROUP"], vals["SOCKET_GROUP"],
                    vals["BALL_TYPE"], vals["ITEM_NAME1"], vals["ITEM_NAME2"],
                    vals["QTY_TOTAL"], vals["REMARKS"]
                ))
            except Exception as e:
                print("\n[❌ SQL 오류 발생]")
                print("쿼리문:\n", sql_orders)
                print("바인딩 값:")
                print({
                    "ORDER_NO": order_no,
                    "ORDER_DATE": vals["ORDER_DATE"],
                    "ORDER_STATUS": vals["ORDER_STATUS"],
                    "ORDER_KIND": vals["ORDER_KIND"],
                    "CUSTOMER_NAME": vals["CUSTOMER_NAME"],
                    "PRODUCT_GROUP": vals["PRODUCT_GROUP"],
                    "SOCKET_GROUP": vals["SOCKET_GROUP"],
                    "BALL_TYPE": vals["BALL_TYPE"],
                    "ITEM_NAME1": vals["ITEM_NAME1"],
                    "ITEM_NAME2": vals["ITEM_NAME2"],
                    "QTY_TOTAL": vals["QTY_TOTAL"],
                    "REMARKS": vals["REMARKS"]
                })
                print("오류 메시지:", e)
                raise   

            # ORDER_PROCESSING
            due = as_date(r.get(COL_MAP["PROC_DUE"]))
            in1 = as_date(r.get(COL_MAP["PROC_IN1"]))
            infinal = as_date(r.get(COL_MAP["PROC_IN_FINAL"]))
            seq = 0
            for label, val in [("in1", in1), ("final", infinal)]:
                if val:
                    seq += 1
                    sql_proc = """
                        INSERT INTO ORDER_PROCESSING (ORDER_NO, PROCESS_SEQ, DUE_DATE, IN_DATE, NOTE)
                        VALUES (:1, :2, :3, :4, :5)
                    """
                    cur.execute(sql_proc, (order_no, seq, due, val, label))

            # ORDER_ASSEMBLY
            asm_start = as_date(r.get(COL_MAP["ASM_START"]))
            asm_end = as_date(r.get(COL_MAP["ASM_END"]))
            if asm_start or asm_end:
                sql_asm = """
                    INSERT INTO ORDER_ASSEMBLY (ORDER_NO, ASSEMBLY_START, ASSEMBLY_END, ASSEMBLY_QTY, NOTE)
                    VALUES (:1, :2, :3, :4, NULL)
                """
                cur.execute(sql_asm, (order_no, asm_start, asm_end, vals["QTY_TOTAL"]))

            # ORDER_DELIVERY
            deliv = as_date(r.get(COL_MAP["DELIVERY_DATE"]))
            if deliv:
                sql_deliv = """
                    INSERT INTO ORDER_DELIVERY (ORDER_NO, DELIVERY_DATE, NOTE)
                    VALUES (:1, :2, NULL)
                """
                cur.execute(sql_deliv, (order_no, deliv))

            print(f"[INSERTED] {order_no}")

        conn.commit()
        cur.close()
        print(f"[DONE] 총 {len(df)}건 Insert 완료.")

# ===== 메인 =====
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("사용법: python3 order_data_insert.py <start_row> <end_row>")
        sys.exit(1)

    start_row = int(sys.argv[1])
    end_row = int(sys.argv[2])

    df = load_excel()
    insert_to_db(df, start_row, end_row)
