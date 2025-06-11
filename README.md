# Java Decompiler MCP Plugin

一个用于Cursor编辑器的Model Context Protocol (MCP) 插件，提供Java依赖源码反编译功能。

## ✨ 特性

### 🌍 全局服务架构
- **独立部署**: 不依赖特定项目，全局可用
- **自动配置**: 自动读取Maven配置和环境变量
- **智能源码获取**: 优先使用sources jar，自动回退到反编译

### 📚 核心功能
- 🔍 **仓库扫描**: 扫描Maven本地仓库中的所有依赖
- 🔎 **类搜索**: 在本地仓库中搜索Java类
- 📖 **源码获取**: 获取Java类的源代码（支持sources jar和反编译）
- 📋 **类列表**: 列出依赖中的所有Java类
- ⚙️ **配置管理**: 查看和管理Maven配置

### 🛠️ 技术特点
- **CFR反编译器**: 生成高质量的Java源码
- **Sources JAR优先**: 优先使用原始源码
- **环境变量支持**: 灵活的配置管理
- **智能缓存**: 避免重复下载和处理

## 🚀 快速开始

### 1. 全局安装

```bash
# 克隆项目
git clone <repository-url>
cd java-decompiler-mcp

# 安装为全局服务
npm install
npm run build
node scripts/global-setup.js install
```

### 2. 重启Cursor
安装完成后，重启Cursor编辑器以加载MCP插件。

### 3. 开始使用
在Cursor中直接询问AI：
- "扫描我的Maven本地仓库"
- "搜索StringUtils类"
- "获取org.apache.commons.lang3.StringUtils的源码"

## 📖 使用指南

### 基本命令

#### 扫描本地仓库
```
扫描我的Maven本地仓库
```
显示本地仓库中所有可用的依赖及其源码状态。

#### 搜索Java类
```
搜索StringUtils类
```
在所有依赖中搜索包含指定名称的Java类。

#### 获取类源码
```
获取org.apache.commons.lang3.StringUtils的源码
```
获取指定类的完整源代码。

#### 列出依赖中的类
```
列出org.springframework:spring-core:5.3.21中的所有类
```

#### 查看Maven配置
```
显示Maven配置信息
```

### 高级配置

#### 环境变量
您可以通过环境变量自定义Maven配置：

```bash
# Windows
set MAVEN_REPOSITORY=D:\maven\repository
set MAVEN_MIRROR_URL=https://maven.aliyun.com/repository/public/

# Linux/macOS
export MAVEN_REPOSITORY=/opt/maven/repository
export MAVEN_MIRROR_URL=https://maven.aliyun.com/repository/public/
```

支持的环境变量：
- `MAVEN_REPOSITORY`: 自定义本地仓库路径
- `MAVEN_REPOSITORIES`: 自定义远程仓库（用逗号分隔）
- `MAVEN_MIRROR_URL`: 镜像URL（用于加速下载）

#### Maven Settings.xml
插件会自动读取以下位置的Maven配置：
- `~/.m2/settings.xml` (用户配置)
- `$M2_HOME/conf/settings.xml` (全局配置)

## 🏗️ 架构设计

### 全局服务模式
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cursor IDE    │◄───┤   MCP Protocol   │◄───┤  Global Service │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Maven Repository│
                                               │   ~/.m2/repo    │
                                               └─────────────────┘
```

### 源码获取策略
1. **Sources JAR优先**: 首先尝试从sources jar获取原始源码
2. **CFR反编译**: 如果没有sources jar，使用CFR反编译器
3. **智能回退**: 多级回退确保总能获取到可读的源码

## 🔧 开发指南

### 本地开发
```bash
# 克隆项目
git clone <repository-url>
cd java-decompiler-mcp

# 安装依赖
npm install

# 开发模式构建
npm run build

# 运行测试
npm test

# 启动开发服务器
npm run dev
```

### 项目结构
```
src/
├── index.ts              # 主入口，MCP服务器
├── global-maven-service.ts  # 全局Maven服务
├── maven-config.ts       # Maven配置管理
├── decompiler.ts         # CFR反编译器
└── utils/               # 工具函数

scripts/
├── global-setup.js      # 全局安装脚本
├── auto-setup.js        # 自动环境设置
└── package-for-migration.js  # 迁移打包

tests/                   # 测试文件
```

### API接口

#### 扫描本地仓库
```typescript
interface DependencyInfo {
  groupId: string;
  artifactId: string;
  version: string;
  available: boolean;
  hasSource: boolean;
  localPath?: string;
  sourcePath?: string;
}
```

#### 搜索结果
```typescript
interface ClassSearchResult {
  className: string;
  packageName: string;
  fullClassName: string;
  dependency: DependencyInfo;
  sourceType: 'sources-jar' | 'decompiled';
}
```

## 🗂️ 配置文件

### MCP配置 (~/.cursor/mcp.json)
```json
{
  "mcpServers": {
    "java-decompiler": {
      "command": "node",
      "args": ["/home/user/.java-decompiler-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 环境变量配置
```bash
# 本地仓库路径
MAVEN_REPOSITORY=/path/to/repository

# 远程仓库（多个用逗号分隔）
MAVEN_REPOSITORIES=https://repo1.maven.org/maven2/,https://repo.spring.io/release/

# 镜像URL
MAVEN_MIRROR_URL=https://maven.aliyun.com/repository/public/
```

## 🚀 部署和迁移

### 一键安装
```bash
node scripts/global-setup.js install
```

### 卸载
```bash
node scripts/global-setup.js uninstall
```

### 迁移到其他机器
```bash
# 打包当前安装
npm run package

# 在目标机器上解压并安装
unzip java-decompiler-mcp-migration.zip
cd java-decompiler-mcp
./scripts/install.sh  # Linux/macOS
# 或
scripts\install.bat   # Windows
```

## ❓ 常见问题

### Q: 为什么选择全局服务模式？
A: 全局服务模式有以下优势：
- 不依赖特定项目，任何地方都可以使用
- 自动利用Maven本地仓库，无需重复下载
- 统一管理配置，更容易维护

### Q: 如何自定义Maven仓库位置？
A: 有三种方式：
1. 设置环境变量 `MAVEN_REPOSITORY`
2. 配置 `~/.m2/settings.xml`
3. 使用默认路径 `~/.m2/repository`

### Q: 支持哪些源码格式？
A: 支持两种源码获取方式：
1. **Sources JAR**: 开发者发布的原始源码
2. **CFR反编译**: 高质量的反编译源码

### Q: 如何解决网络问题？
A: 建议配置Maven镜像：
```bash
export MAVEN_MIRROR_URL=https://maven.aliyun.com/repository/public/
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！ 