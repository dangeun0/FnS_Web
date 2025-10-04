# -*- coding: utf-8 -*-
"""
[1004] DB 모듈 — Oracle ADB 연결 풀 & 컨텍스트 헬퍼
환경변수로 덮어쓰기 가능:
  DB_USER, DB_PASSWORD, CONNECT_STRING, WALLET_DIR, WALLET_PASSWORD
"""
import os
import oracledb
from contextlib import contextmanager

DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "FnsFnsdb2010!")
CONNECT_STRING = os.getenv("CONNECT_STRING", "fnsdbserver1_high")
WALLET_DIR = os.getenv("WALLET_DIR", "/home/ubuntu/wallet")
WALLET_PASSWORD = os.getenv("WALLET_PASSWORD", "FnsFnsdb2010!")

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = oracledb.create_pool(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=CONNECT_STRING,
            config_dir=WALLET_DIR,
            wallet_location=WALLET_DIR,
            wallet_password=WALLET_PASSWORD,
            min=1, max=8, increment=1,
        )
    return _pool

@contextmanager
def get_conn():
    pool = get_pool()
    conn = pool.acquire()
    try:
        # 세션 타임존을 한국시간으로 고정
        cur = conn.cursor()
        cur.execute("ALTER SESSION SET TIME_ZONE = 'Asia/Seoul'")
        cur.close()
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass
