@echo off
echo ================================
echo Java Decompiler MCP 安装脚本
echo ================================

echo 1. 安装 Node.js 依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误: npm install 失败
    pause
    exit /b 1
)

echo 2. 编译 TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo 错误: TypeScript 编译失败
    pause
    exit /b 1
)

echo 3. 获取当前目录路径...
set "CURRENT_DIR=%cd%"
set "MCP_PATH=%CURRENT_DIR%\dist\index.js"

echo 4. 配置 Cursor MCP...
set "CONFIG_DIR=%APPDATA%\Cursor\User\globalStorage\cursor.mcp"
set "CONFIG_FILE=%CONFIG_DIR%\settings.json"

if not exist "%CONFIG_DIR%" (
    mkdir "%CONFIG_DIR%"
)

echo {> "%CONFIG_FILE%"
echo   "mcpServers": {>> "%CONFIG_FILE%"
echo     "java-decompiler": {>> "%CONFIG_FILE%"
echo       "command": "node",>> "%CONFIG_FILE%"
echo       "args": ["%MCP_PATH:\=\\%"],>> "%CONFIG_FILE%"
echo       "env": {}>> "%CONFIG_FILE%"
echo     }>> "%CONFIG_FILE%"
echo   }>> "%CONFIG_FILE%"
echo }>> "%CONFIG_FILE%"

echo ================================
echo 安装完成！
echo ================================
echo.
echo MCP 服务器已配置到: %CONFIG_FILE%
echo.
echo 请重启 Cursor 以使配置生效。
echo.
echo 使用方法:
echo - 在 Cursor 中询问: "请列出我当前项目的所有Maven依赖"
echo - 搜索类: "帮我在项目依赖中搜索包含 SpringApplication 的类"
echo - 获取源码: "帮我获取 org.springframework.boot.SpringApplication 类的源码"
echo.
pause 