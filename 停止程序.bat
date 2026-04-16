@echo off
chcp 65001 >nul
taskkill /IM majsoul_local_web.exe /F >nul 2>&1
echo 本地服务已停止。
