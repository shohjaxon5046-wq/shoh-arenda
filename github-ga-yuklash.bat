@echo off
chcp 65001 > nul
echo ========================================================
echo   WMS ARENDA ERP - GITHUB GA YUKLASH (GIT PUSH)
echo ========================================================
cd /d "%~dp0"
echo.
echo Kodlar GitHub repozitoriyasiga yuklanmoqda...
echo (Agar brauzerda GitHub oynasi ochilsa, "Sign in with your browser" ni bosing)
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   TABRIKLAYMIZ! Kodlar muvaffaqiyatli yuklandi!
    echo   https://github.com/shohjaxon5046-wq/shoh-arenda
    echo ========================================================
) else (
    echo.
    echo Xatolik yuz berdi. Iltimos, GitHub login yoki internetni tekshiring.
)
echo.
pause
