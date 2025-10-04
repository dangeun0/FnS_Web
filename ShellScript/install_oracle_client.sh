#!/bin/bash
# Oracle Instant Client + SQL*Plus 설치 스크립트 for Ubuntu

set -e

# 버전 (Oracle 공식 페이지 확인 후 필요시 변경)
VERSION="21.12.0.0.0dbru"
IC_DIR="$HOME/oracle"
IC_PATH="$IC_DIR/instantclient_21_12"

mkdir -p "$IC_DIR"
cd "$IC_DIR"

echo "👉 Oracle Instant Client 다운로드 중..."

# Oracle 공식 배포 URL은 로그인 필요할 수 있음
# wget 대신 수동으로 ZIP 파일 올려둘 수도 있음
wget https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-basiclite-linux.x64-${VERSION}.zip
wget https://download.oracle.com/otn_software/linux/instantclient/2112000/instantclient-sqlplus-linux.x64-${VERSION}.zip

echo "👉 압축 해제..."
unzip -o instantclient-basiclite-linux.x64-${VERSION}.zip
unzip -o instantclient-sqlplus-linux.x64-${VERSION}.zip

# 환경변수 설정
if ! grep -q "instantclient_21_12" ~/.bashrc; then
  echo "export LD_LIBRARY_PATH=$IC_PATH:\$LD_LIBRARY_PATH" >> ~/.bashrc
  echo "export PATH=$IC_PATH:\$PATH" >> ~/.bashrc
fi

source ~/.bashrc

echo "✅ 설치 완료"
echo "👉 sqlplus 버전 확인:"
sqlplus -v

