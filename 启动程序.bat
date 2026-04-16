@echo off
chcp 65001 >nul
cd /d "%~dp0majsoul_local_web"
start "" "majsoul_local_web.exe"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000"
echo 本地服务已启动，浏览器已打开。
echo 如需停止程序，请双击同目录下“停止程序.bat”。
