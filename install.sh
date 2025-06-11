#!/bin/bash

echo "================================"
echo "Java Decompiler MCP 安装脚本"
echo "================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi

echo "1. 安装 Node.js 依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "错误: npm install 失败"
    exit 1
fi

echo "2. 编译 TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "错误: TypeScript 编译失败"
    exit 1
fi

echo "3. 获取当前目录路径..."
CURRENT_DIR=$(pwd)
MCP_PATH="$CURRENT_DIR/dist/index.js"

echo "4. 配置 Cursor MCP..."
CONFIG_DIR="$HOME/.cursor/mcp"
CONFIG_FILE="$CONFIG_DIR/settings.json"

# 创建配置目录
mkdir -p "$CONFIG_DIR"

# 创建配置文件
cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "java-decompiler": {
      "command": "node",
      "args": ["$MCP_PATH"],
      "env": {}
    }
  }
}
EOF

echo "================================"
echo "安装完成！"
echo "================================"
echo
echo "MCP 服务器已配置到: $CONFIG_FILE"
echo
echo "请重启 Cursor 以使配置生效。"
echo
echo "使用方法:"
echo "- 在 Cursor 中询问: \"请列出我当前项目的所有Maven依赖\""
echo "- 搜索类: \"帮我在项目依赖中搜索包含 SpringApplication 的类\""
echo "- 获取源码: \"帮我获取 org.springframework.boot.SpringApplication 类的源码\""
echo

# 使脚本可执行
chmod +x "$0" 