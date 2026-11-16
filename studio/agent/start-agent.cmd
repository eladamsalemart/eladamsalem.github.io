@echo off
rem Starts the control room's agent (keep this window open while you use the "סוכן" tab).
set PATH=C:\Users\elada\tools\node;C:\Users\elada\tools\npm-global;%PATH%
cd /d "%~dp0"
node bridge.mjs
pause
