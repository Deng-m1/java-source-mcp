# Java Decompiler MCP - 迁移指南

## 🎯 快速迁移 (推荐)

### 方式1: 使用迁移包 (最简单)

1. **在当前机器创建迁移包**
   ```bash
   npm run package
   ```
   
2. **传输到目标机器**
   - 复制生成的 `java-decompiler-mcp-migration.zip`
   - 解压到目标目录

3. **在目标机器一键安装**
   ```bash
   # Windows
   scripts\install.bat
   
   # Linux/macOS  
   chmod +x scripts/install.sh && ./scripts/install.sh
   ```

### 方式2: Git克隆 + 自动配置

1. **克隆项目**
   ```bash
   git clone <repository-url> java-decompiler-mcp
   cd java-decompiler-mcp
   ```

2. **自动配置环境**
   ```bash
   npm run setup
   ```

## 📋 环境要求检查清单

在迁移前，请确保目标机器满足以下要求：

### ✅ 必需环境

- [ ] **Java 8+** 
  ```bash
  java -version
  # 应显示版本信息，如：openjdk version "1.8.0_XXX"
  ```

- [ ] **Node.js 16+**
  ```bash
  node --version  # 应显示 v16.x.x 或更高
  npm --version   # 应显示 npm 版本
  ```

- [ ] **网络连接** (用于下载CFR工具和npm包)

### 🔧 自动安装环境 (如果缺失)

**Windows:**
```powershell
# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装Java和Node.js
choco install openjdk nodejs -y
```

**Linux (Ubuntu/Debian):**
```bash
# 更新包列表
sudo apt update

# 安装Java和Node.js
sudo apt install openjdk-8-jdk nodejs npm -y
```

**Linux (CentOS/RHEL):**
```bash
# 安装Java和Node.js
sudo yum install java-1.8.0-openjdk nodejs npm -y
```

**macOS:**
```bash
# 安装Homebrew (如果未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装Java和Node.js
brew install openjdk node
```

## 🚀 详细迁移步骤

### 步骤1: 准备源机器

1. **测试当前配置**
   ```bash
   npm run test:all
   ```

2. **创建迁移包**
   ```bash
   npm run package
   ```
   
   生成的文件：`java-decompiler-mcp-migration.zip`

### 步骤2: 传输到目标机器

**选择任一方式：**

- **本地传输**: USB、网络共享等
- **云传输**: OneDrive、Google Drive等  
- **Git**: 推送到代码仓库，在目标机器克隆

### 步骤3: 在目标机器部署

1. **解压迁移包**
   ```bash
   unzip java-decompiler-mcp-migration.zip
   cd java-decompiler-mcp
   ```

2. **运行自动安装**
   ```bash
   # Windows
   scripts\install.bat
   
   # Linux/macOS
   chmod +x scripts/install.sh
   ./scripts/install.sh
   ```

3. **验证安装**
   ```bash
   npm run test:unit
   ```

### 步骤4: 配置Cursor集成

**Windows:**
```powershell
# 自动配置MCP
.\update-cursor-config.ps1
```

**Linux/macOS:**
```bash
# 手动编辑配置文件
nano ~/.cursor/mcp.json
```

添加以下配置：
```json
{
  "mcpServers": {
    "java-decompiler": {
      "command": "node",
      "args": ["/path/to/java-decompiler-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 步骤5: 重启Cursor并测试

1. **重启Cursor应用**
2. **测试MCP功能**
   ```
   请列出项目的Maven依赖
   ```

## 🔧 故障排除

### 常见问题及解决方案

#### ❌ Java环境问题

**问题**: `java -version` 命令不可用

**解决方案**:
```bash
# 检查Java是否安装
which java

# 如果未安装，使用上面的自动安装命令
# 如果已安装但PATH未配置：
export PATH=$PATH:/usr/lib/jvm/java-8-openjdk-amd64/bin
```

#### ❌ Node.js版本过低

**问题**: Node.js版本低于16

**解决方案**:
```bash
# 使用nvm升级Node.js (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### ❌ CFR下载失败

**问题**: 网络问题导致CFR下载失败

**解决方案**:
```bash
# 手动下载CFR
curl -L -o tools/cfr.jar https://github.com/leibnitz27/cfr/releases/download/0.152/cfr-0.152.jar

# 或者从其他机器复制
```

#### ❌ npm包安装失败

**问题**: npm install失败

**解决方案**:
```bash
# 清理npm缓存
npm cache clean --force

# 使用国内镜像 (中国用户)
npm config set registry https://registry.npm.taobao.org/

# 重新安装
npm install
```

#### ❌ 权限问题 (Linux/macOS)

**问题**: 脚本执行权限不足

**解决方案**:
```bash
# 赋予脚本执行权限
chmod +x scripts/install.sh
chmod +x scripts/auto-setup.js

# 如果仍有问题，检查文件所有者
sudo chown $USER:$USER -R .
```

#### ❌ Cursor MCP配置问题

**问题**: Cursor无法识别MCP

**解决方案**:
1. 检查配置文件路径：
   - Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
   - Linux/macOS: `~/.cursor/mcp.json`

2. 验证配置格式：
   ```bash
   cat ~/.cursor/mcp.json | jq .
   ```

3. 重启Cursor应用

## 📚 高级配置

### 自定义Maven仓库

编辑 `src/maven-resolver.ts`：
```typescript
private readonly repositories = [
  'https://repo1.maven.org/maven2/',
  'https://your-private-repo.com/maven2/',  // 添加私有仓库
  'https://repo2.maven.org/maven2/'
];
```

### 代理配置

如果在代理环境中：
```bash
# 设置npm代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 设置系统代理变量
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

### 离线安装

1. **在有网络的机器准备离线包**
   ```bash
   # 下载所有依赖
   npm install
   npm run build
   
   # 打包node_modules
   tar -czf node_modules.tar.gz node_modules/
   
   # 下载CFR
   curl -L -o tools/cfr.jar https://github.com/leibnitz27/cfr/releases/download/0.152/cfr-0.152.jar
   ```

2. **在离线机器安装**
   ```bash
   # 解压依赖
   tar -xzf node_modules.tar.gz
   
   # 跳过npm install，直接构建
   npm run build
   ```

## 🎯 迁移验证清单

完成迁移后，请验证以下功能：

- [ ] **环境检查**: `java -version` 和 `node --version` 正常
- [ ] **项目构建**: `npm run build` 成功
- [ ] **单元测试**: `npm run test:unit` 全部通过  
- [ ] **MCP工具**: `npm run test:mcp` 全部通过
- [ ] **项目测试**: `npm run test:project` 基本通过
- [ ] **Cursor集成**: 可以在Cursor中使用MCP命令
- [ ] **实际功能**: 可以获取Java类的源码

## 📞 技术支持

如果遇到迁移问题，请提供以下信息：

1. **系统信息**
   ```bash
   uname -a                    # Linux/macOS
   systeminfo                  # Windows
   ```

2. **环境信息**
   ```bash
   java -version
   node --version
   npm --version
   ```

3. **错误日志**
   - 安装脚本输出
   - npm安装错误
   - 测试失败信息

---

📅 更新时间: $(date)
🔄 版本: 1.0.0
📧 支持: 请在项目仓库提交Issue 