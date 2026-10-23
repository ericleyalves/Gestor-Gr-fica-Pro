@echo off
title Gestao Grafico Pro
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if errorlevel 1 (echo. & echo Ocorreu um erro. Veja iniciar-log.txt & pause)
