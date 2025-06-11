@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo 🚀 Java Decompiler MCP - Windows自动安装
echo ==========================================

:: 检查是否在正确的目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    echo 当前目录: %CD%
    echo 预期文件: package.json
    pause
    exit /b 1
)

echo 📋 开始安装过程...
echo.

:: 检查Node.js
echo 🔍 检查Node.js环境...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Node.js 未安装
    echo 💡 请从以下地址下载安装 Node.js:
    echo    https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 已安装: !NODE_VERSION!

:: 检查Java
echo.
echo 🔍 检查Java环境...
java -version >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Java 未安装
    echo 💡 请从以下地址下载安装 Java:
    echo    https://adoptium.net/
    pause
    exit /b 1
)

for /f "tokens=3" %%i in ('java -version 2^>^&1 ^| findstr "version"') do (
    set JAVA_VERSION=%%i
    goto :java_found
)
:java_found
echo ✅ Java 已安装: !JAVA_VERSION!

:: 创建必要目录
echo.
echo 📁 创建必要目录...
if not exist "scripts" mkdir scripts
if not exist "tools" mkdir tools
echo ✅ 目录创建完成

:: 运行自动配置
echo.
echo ⚙️  执行自动配置...
echo ----------------------------------------
node scripts/auto-setup.js
if !errorlevel! neq 0 (
    echo.
    echo ❌ 自动配置失败
    pause
    exit /b 1
)

echo.
echo 🎉 安装完成！
echo ✅ Java Decompiler MCP 已准备就绪
echo.
echo 📖 下一步操作:
echo    1. 配置 Cursor MCP: 运行 update-cursor-config.ps1
echo    2. 重启 Cursor 应用
echo    3. 开始使用 Java 依赖反编译功能
echo.
pause 