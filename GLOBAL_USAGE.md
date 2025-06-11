# 全局Java反编译MCP服务 - 使用指南

## 🎉 成功安装完成！

您的全局Java反编译MCP服务已经成功安装并配置。现在您可以在任何地方使用Cursor获取Java依赖的源码，无需依赖特定项目！

## 🚀 立即开始使用

### 1. 重启Cursor编辑器
安装完成后，请重启Cursor编辑器以加载新的MCP插件。

### 2. 基本使用示例

#### 扫描本地Maven仓库
```
请扫描我的Maven本地仓库
```
这将显示您本地仓库中所有可用的Java依赖，包括是否有源码jar包。

#### 搜索Java类
```
帮我搜索StringUtils类
```
在所有依赖中搜索包含"StringUtils"的Java类。

#### 获取完整源码
```
获取org.apache.commons.lang3.StringUtils的源码
```
获取指定类的完整Java源代码。

#### 列出依赖中的所有类
```
列出org.springframework:spring-core:5.3.21中的所有类
```

#### 查看Maven配置
```
显示我的Maven配置信息
```

## 🏗️ 系统架构

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

### 智能源码获取策略
1. **Sources JAR优先**: 首先尝试从官方sources jar获取原始源码
2. **CFR反编译**: 如果没有sources jar，使用CFR反编译器生成高质量源码
3. **智能回退**: 确保总能获取到可读的Java源码

## ⚙️ 配置管理

### 环境变量配置（可选）
您可以通过环境变量自定义Maven配置：

#### Windows (PowerShell/CMD)
```powershell
# 设置自定义Maven仓库路径
$env:MAVEN_REPOSITORY = "D:\maven\repository"

# 设置阿里云镜像加速
$env:MAVEN_MIRROR_URL = "https://maven.aliyun.com/repository/public/"

# 设置多个远程仓库
$env:MAVEN_REPOSITORIES = "https://repo1.maven.org/maven2/,https://repo.spring.io/release/"
```

#### Linux/macOS (Bash)
```bash
# 设置自定义Maven仓库路径
export MAVEN_REPOSITORY="/opt/maven/repository"

# 设置阿里云镜像加速
export MAVEN_MIRROR_URL="https://maven.aliyun.com/repository/public/"

# 设置多个远程仓库
export MAVEN_REPOSITORIES="https://repo1.maven.org/maven2/,https://repo.spring.io/release/"
```

### Maven Settings.xml支持
插件会自动读取以下位置的Maven配置：
- `~/.m2/settings.xml` (用户配置)
- `$M2_HOME/conf/settings.xml` (全局配置)

## 📂 文件位置

### 服务文件
- **Windows**: `C:\Users\{用户名}\.java-decompiler-mcp\`
- **Linux/macOS**: `~/.java-decompiler-mcp/`

### 配置文件
- **Windows**: `C:\Users\{用户名}\.cursor\mcp.json`
- **Linux/macOS**: `~/.cursor/mcp.json`

### Maven本地仓库
- **默认位置**: `~/.m2/repository`
- **自定义位置**: 通过环境变量或settings.xml配置

## 🛠️ 高级功能

### 1. 批量类搜索
```
搜索所有Spring相关的类
```

### 2. 包级别浏览
```
列出org.springframework.web包下的所有类
```

### 3. 依赖分析
```
分析Spring Boot的核心依赖
```

### 4. 源码对比
```
对比不同版本的StringUtils实现
```

## 🚀 性能特点

- ⚡ **极速启动**: 全局服务，无需重复初始化
- 💾 **智能缓存**: 自动利用Maven本地仓库，避免重复下载
- 🎯 **精确搜索**: 支持模糊搜索和精确匹配
- 📚 **源码优先**: 优先使用官方源码，保证代码质量

## 🔧 故障排除

### 问题1: 没有找到Maven仓库
**解决方案**: 
1. 检查Maven是否正确安装
2. 设置`MAVEN_REPOSITORY`环境变量
3. 确保`~/.m2/repository`目录存在

### 问题2: 网络连接超时
**解决方案**:
1. 配置Maven镜像: `export MAVEN_MIRROR_URL="https://maven.aliyun.com/repository/public/"`
2. 检查防火墙设置
3. 使用公司内网镜像

### 问题3: 类搜索结果为空
**解决方案**:
1. 确认依赖已下载到本地仓库
2. 检查类名拼写是否正确
3. 尝试使用部分类名搜索

### 问题4: 源码显示不完整
**解决方案**:
1. 检查是否有sources jar包
2. 确认CFR反编译器正常工作
3. 尝试手动下载源码jar包

## 📖 实际使用场景

### 场景1: 学习Spring源码
```
获取org.springframework.context.ApplicationContext的源码
```

### 场景2: 调试第三方库
```
搜索MyBatis相关的Mapper类
```

### 场景3: 了解工具类实现
```
获取org.apache.commons.lang3.StringUtils的源码
```

### 场景4: 版本差异分析
```
对比不同版本的Jackson ObjectMapper
```

## 🔄 更新和维护

### 更新服务
```bash
# 重新运行安装脚本
node scripts/global-setup.js install
```

### 卸载服务
```bash
# 完全卸载
node scripts/global-setup.js uninstall
```

### 清理缓存
```bash
# 清理Maven缓存
rm -rf ~/.m2/repository/.cache
```

## 🌟 最佳实践

1. **定期更新**: 建议定期更新本地Maven仓库
2. **使用镜像**: 配置国内镜像提升下载速度
3. **环境变量**: 使用环境变量统一团队配置
4. **源码优先**: 优先下载sources jar包获得最佳体验

## 💡 提示和技巧

- 🔍 使用模糊搜索: "Utils", "Helper", "Manager"等关键词
- 📋 批量操作: 一次性搜索多个相关类
- 🎯 精确定位: 使用完整包名定位特定类
- 💾 缓存利用: 已搜索过的类会快速响应

---

🎉 **恭喜！您现在可以在任何Cursor项目中直接获取Java依赖源码了！**

如有问题，请检查配置文件: `~/.cursor/mcp.json` 