#!/bin/bash

# Java Decompiler MCP - Linux/macOS自动安装脚本

set -e  # 出错时退出

echo ""
echo "🚀 Java Decompiler MCP - 自动安装"
echo "================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "当前目录: $(pwd)"
    echo "预期文件: package.json"
    exit 1
fi

echo "📋 开始安装过程..."
echo ""

# 检查Node.js
echo "🔍 检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "💡 请使用以下方式安装 Node.js:"
    echo "   - Ubuntu/Debian: sudo apt-get install nodejs npm"
    echo "   - CentOS/RHEL: sudo yum install nodejs npm"
    echo "   - macOS: brew install node"
    echo "   - 或访问: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js 已安装: $NODE_VERSION"

# 检查Java
echo ""
echo "🔍 检查Java环境..."
if ! command -v java &> /dev/null; then
    echo "❌ Java 未安装"
    echo "💡 请使用以下方式安装 Java:"
    echo "   - Ubuntu/Debian: sudo apt-get install openjdk-8-jdk"
    echo "   - CentOS/RHEL: sudo yum install java-1.8.0-openjdk"
    echo "   - macOS: brew install openjdk"
    echo "   - 或访问: https://adoptium.net/"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1)
echo "✅ Java 已安装: $JAVA_VERSION"

# 创建必要目录
echo ""
echo "📁 创建必要目录..."
mkdir -p scripts
mkdir -p tools
echo "✅ 目录创建完成"

# 设置权限
chmod +x scripts/auto-setup.js 2>/dev/null || true

# 运行自动配置
echo ""
echo "⚙️  执行自动配置..."
echo "----------------------------------------"
node scripts/auto-setup.js

echo ""
echo "🎉 安装完成！"
echo "✅ Java Decompiler MCP 已准备就绪"
echo ""
echo "📖 下一步操作:"
echo "   1. 配置 Cursor MCP: 运行配置脚本"
echo "   2. 重启 Cursor 应用"
echo "   3. 开始使用 Java 依赖反编译功能"
echo ""

# 检测系统类型并提供相应指导
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "💡 macOS 用户提示:"
    echo "   - MCP配置文件位置: ~/.cursor/mcp.json"
    echo "   - 如需手动配置，请参考 README.md"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "💡 Linux 用户提示:"
    echo "   - MCP配置文件位置: ~/.cursor/mcp.json"
    echo "   - 如需手动配置，请参考 README.md"
fi

echo "" 