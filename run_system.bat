@echo off
title ExcelHub - Dev Server
color 0A

echo ========================================
echo    EXCELHUB - DEV SERVER
echo ========================================
echo.

REM Navega para o diretorio do script
cd /d "%~dp0"
echo Diretorio: %cd%
echo.

REM -----------------------------------
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo X ERRO: Node.js nao encontrado no PATH!
    echo   Instale em: https://nodejs.org
    echo   Apos instalar, FECHE e ABRA esta janela novamente.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   + Node.js: %%i

REM -----------------------------------
echo [2/5] Verificando npm...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo X ERRO: npm nao encontrado no PATH!
    echo   Reinstale o Node.js em: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo   + npm: %%i

REM -----------------------------------
echo [3/5] Instalando dependencias...
if not exist "node_modules" (
    echo   Primeira execucao detectada, rodando npm install...
    echo   Isso pode demorar alguns minutos...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo X ERRO: Falha ao instalar dependencias!
        echo.
        pause
        exit /b 1
    )
    echo   + Dependencias instaladas com sucesso!
) else (
    echo   + node_modules encontrado
)

REM -----------------------------------
echo [4/5] Gerando Prisma Client...
call npx prisma generate >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   ! Aviso: Prisma generate falhou, mas continuando...
) else (
    echo   + Prisma Client gerado
)

REM -----------------------------------
echo.
echo [5/5] Iniciando servidor de desenvolvimento...
echo.
echo ========================================
echo   Acesse: http://localhost:3001
echo   Pressione Ctrl+C para parar
echo ========================================
echo.

call npx next dev -p 3001

echo.
echo ========================================
echo   Servidor finalizado.
echo ========================================
echo.
pause
