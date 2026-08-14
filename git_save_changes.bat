@echo off
title Bonjourr - Aenderungen speichern
cd /d "%~dp0"

echo.
echo ============================================
echo  Speichere eigene Aenderungen auf Branch
echo  "brave-newatab-redirect"
echo ============================================

git checkout brave-newatab-redirect
if errorlevel 1 (
    echo.
    echo FEHLER: Branch "brave-newatab-redirect" existiert nicht.
    echo Lege ihn einmalig an:  git checkout -b brave-newatab-redirect
    goto ende
)

git add -A
git commit -m "brave-newatab-redirect gesichert %date% %time%"
if errorlevel 1 (
    echo.
    echo Es gab nichts zu committen - alles ist bereits gesichert.
) else (
    echo.
    echo FERTIG! Deine Aenderungen sind auf dem Branch gesichert.
)

:ende
echo.
pause
