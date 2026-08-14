@echo off
title Bonjourr - Update holen und mergen
cd /d "%~dp0"

echo.
echo ============================================
echo  1/3 Wechsle auf master ...
echo ============================================
git checkout master
if errorlevel 1 goto fehler

echo.
echo ============================================
echo  2/3 Hole die neue Entwickler-Version ...
echo ============================================
git pull origin master
if errorlevel 1 goto konflikt

echo.
echo ============================================
echo  3/3 Merge in deinen Branch ...
echo ============================================
git checkout brave-newatab-redirect
if errorlevel 1 goto fehler
git merge master
if errorlevel 1 goto konflikt

echo.
echo FERTIG! Dein Branch enthaelt jetzt die neue Entwickler-Version.
echo Deine brave-newatab-redirect sind weiterhin enthalten.
goto ende

:konflikt
echo.
echo ACHTUNG: Es gab Konflikte oder ein Problem!
echo - Bei einem Merge-Konflikt: Oeffne die betroffenen Dateien, loese
echo   die Markierungen (^<^<^<^<^<^<^< und ^>^>^>^>^>^>^>) und fuehre dann aus:
echo       git add .
echo       git commit -m "Konflikte geloest"
echo - Bei einem Fehler: Pruefe die Meldung oben und versuche es erneut.
goto ende

:fehler
echo.
echo FEHLER: Ein Befehl ist fehlgeschlagen (Branch nicht gefunden o.ae.).
echo Pruefe die Meldung oben.

:ende
echo.
pause
