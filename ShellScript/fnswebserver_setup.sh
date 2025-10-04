#!/bin/bash

# =========================
# Flask 서비스 설정 및 iptables 자동화
# =========================

APP_PATH="/home/ubuntu/app.py"
SERVICE_NAME="fnswebserver"
USER="ubuntu"
GROUP="ubuntu"
PORT=5000

echo "1. systemd 서비스 파일 생성..."
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Flask App fnswebserver
After=network.target

[Service]
User=$USER
Group=$GROUP
WorkingDirectory=/home/ubuntu
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/python3 $APP_PATH
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "2. systemd 데몬 리로드 및 서비스 시작..."
sudo systemctl daemon-reload
sudo systemctl start $SERVICE_NAME
sudo systemctl enable $SERVICE_NAME
sudo systemctl status $SERVICE_NAME --no-pager

echo "3. iptables 포트 $PORT 허용..."
sudo iptables -I INPUT 1 -p tcp --dport $PORT -j ACCEPT

echo "4. iptables-persistent 설치 및 저장..."
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
sudo netfilter-persistent reload

echo "5. 완료! 포트 $PORT를 통해 Flask 서비스 접속 가능."
curl http://146.56.119.137:$PORT

