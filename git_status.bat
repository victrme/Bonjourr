@echo off
title Bonjourr - Status
cd /d "%~dp0"

echo.
echo ============================================
echo  Aktueller Branch
echo ============================================
git branch --show-current

echo.
echo ============================================
echo  Offene Aenderungen (git status)
echo ============================================
git status -sb

echo.
echo ============================================
echo  Letzte Commits
echo ============================================
git log --oneline -8

echo.
pause
