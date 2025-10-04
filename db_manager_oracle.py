import os
import oracledb
from contextlib import contextmanager

class OracleDBManager:
    """
    Oracle DB 커넥션 풀을 관리하고,
    세션 타임존이 설정된 커넥션을 제공하는 클래스
    """
    def __init__(self):
        """
        환경 변수에서 DB 접속 정보를 읽어와 커넥션 풀을 생성합니다.
        """
        try:
            # --- 환경 변수에서 DB 접속 정보 로드 ---
            db_user = os.getenv("DB_USER", "admin")
            db_password = os.getenv("DB_PASSWORD", "FnsFnsdb2010!")
            db_dsn = os.getenv("CONNECT_STRING", "fnsdbserver1_high")
            wallet_dir = os.getenv("WALLET_DIR", "C:/0.key/Wallet_FnS")
            wallet_password = os.getenv("WALLET_PASSWORD", "FnsFnsdb2010!")

            # --- 커넥션 풀 생성 ---
            self.pool = oracledb.create_pool(
                user=db_user,
                password=db_password,
                dsn=db_dsn,
                config_dir=wallet_dir,
                wallet_location=wallet_dir,
                wallet_password=wallet_password,
                min=1, max=8, increment=1,
            )
            print("✅ Oracle DB 커넥션 풀이 성공적으로 생성되었습니다.")
        except oracledb.Error as e:
            print(f"❌ 커넥션 풀 생성 중 오류 발생: {e}")
            raise # 오류 발생 시 프로그램을 중단시키려면 raise를 사용

    @contextmanager
    def get_connection(self):
        """
        커넥션 풀에서 커넥션을 가져오고, 사용 후 자동으로 반환하는
        컨텍스트 관리자(Context Manager)입니다.
        """
        conn = self.pool.acquire()
        try:
            # 세션 타임존을 한국 시간으로 설정
            with conn.cursor() as cursor:
                cursor.execute("ALTER SESSION SET TIME_ZONE = 'Asia/Seoul'")
            # with 블록 안에서 사용할 수 있도록 커넥션 객체를 전달
            yield conn
        finally:
            # with 블록이 끝나면 (성공하든, 오류가 나든) 커넥션을 풀에 반환
            if conn:
                self.pool.release(conn)

# --- 아래는 위 클래스의 사용 예시입니다. ---
if __name__ == "__main__":
    print("DB 관리자 모듈을 테스트합니다.\n")
    
    try:
        # 1. DB 관리자 인스턴스 생성 (이때 커넥션 풀이 만들어짐)
        db_manager = OracleDBManager()

        # 2. 'with' 구문을 사용하여 DB 작업 수행
        print("\n[DB 작업 시작]")
        with db_manager.get_connection() as conn:
            # conn 변수로 커넥션을 받아서 사용
            print(f"  -> 커넥션을 성공적으로 가져왔습니다.")
            
            with conn.cursor() as cursor:
                sql = "SELECT 'Hello Oracle DB!' AS GREETING, SYSDATE FROM DUAL"
                cursor.execute(sql)
                
                # 쿼리 결과 가져오기
                for greeting, current_time in cursor:
                    print(f"  -> DB 조회 결과: '{greeting}'")
                    print(f"  -> DB 서버 현재 시간: {current_time}")

        print("[DB 작업 완료] 커넥션이 풀에 자동으로 반환되었습니다.")

    except Exception as e:
        print(f"\n❌ 테스트 중 오류가 발생했습니다: {e}")