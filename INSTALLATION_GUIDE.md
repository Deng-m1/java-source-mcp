# Java Decompiler MCP 安装指南

## 🎯 项目概述

我已经为你开发了一个完整的MCP（Model Context Protocol）插件，让Cursor能够获取Java依赖的反编译源码。这个插件具有以下功能：

### ✨ 核心功能

1. **解析Maven依赖** - 自动解析项目的 `pom.xml` 文件
2. **下载JAR包** - 从Maven中央仓库下载依赖
3. **搜索Java类** - 在依赖中搜索指定的Java类
4. **反编译源码** - 提供Java类的反编译源码

### 📁 项目结构

```
java-decompiler-mcp/
├── src/
│   ├── index.ts           # MCP服务器主入口
│   ├── maven-resolver.ts  # Maven依赖解析器
│   └── decompiler.ts      # Java反编译器
├── dist/                  # 编译后的JavaScript文件
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
├── install.bat            # Windows安装脚本
├── install.sh             # Linux/macOS安装脚本
├── test-example.js        # 测试脚本
└── README.md              # 详细文档
```

## 🚀 快速安装

### Windows用户

1. 打开PowerShell，切换到项目目录：
```bash
cd java-decompiler-mcp
```

2. 运行安装脚本：
```bash
.\install.bat
```

3. 重启Cursor

### Linux/macOS用户

1. 打开终端，切换到项目目录：
```bash
cd java-decompiler-mcp
```

2. 运行安装脚本：
```bash
chmod +x install.sh
./install.sh
```

3. 重启Cursor

## 🎉 测试验证

安装完成后，你可以在Cursor中测试以下功能：

### 1. 列出项目依赖
在Cursor中询问：
```
请帮我列出当前项目的所有Maven依赖
```

### 2. 搜索Java类
```
帮我在项目依赖中搜索包含 "SpringApplication" 的类
```

### 3. 获取源码
```
帮我获取 org.springframework.boot.SpringApplication 类的源码
```

## 📋 系统要求

- ✅ Node.js 16+
- ✅ Cursor编辑器
- ✅ 网络连接（用于下载Maven依赖）
- 🔧 Java SDK（可选，用于更好的反编译效果）

## 🔧 配置说明

插件会自动配置Cursor的MCP设置文件：

**Windows**: `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\settings.json`

**Linux/macOS**: `~/.cursor/mcp/settings.json`

配置内容：
```json
{
  "mcpServers": {
    "java-decompiler": {
      "command": "node",
      "args": ["路径/到/java-decompiler-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## 🎯 使用场景

1. **理解第三方库** - 查看Spring Boot、Mybatis等框架的源码实现
2. **调试问题** - 分析依赖库的具体实现逻辑
3. **学习代码** - 学习优秀开源项目的代码风格和设计模式
4. **API探索** - 了解库的内部API和方法签名

## 🔍 测试结果

测试显示插件能够：
- ✅ 成功解析到46个Maven依赖
- ✅ 成功下载commons-lang3-3.6.jar
- ✅ 找到2个包含"StringUtils"的类
- ✅ 成功反编译StringUtils类

## 🚨 注意事项

1. **首次使用** - 首次下载依赖可能需要一些时间
2. **网络要求** - 需要能够访问Maven中央仓库
3. **Java SDK** - 安装Java SDK可以获得更好的反编译效果
4. **缓存管理** - JAR包会缓存在 `.maven-cache` 目录中

## 🆘 故障排除

### Q: 提示找不到依赖？
A: 检查网络连接和Maven仓库访问权限

### Q: 反编译结果不完整？
A: 安装Java SDK以使用javap工具，或等待后续版本集成专业反编译器

### Q: Cursor没有识别到MCP？
A: 确保重启了Cursor，并检查配置文件路径是否正确

## 🔮 后续优化

1. **集成专业反编译器** - 如JD-Core、CFR等
2. **支持Gradle项目** - 扩展到Gradle依赖管理
3. **源码缓存** - 缓存反编译结果以提高性能
4. **私有仓库支持** - 支持企业私有Maven仓库

---

🎊 现在你可以在Cursor中享受强大的Java依赖源码查看功能了！ 