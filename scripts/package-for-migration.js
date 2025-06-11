#!/usr/bin/env node

// 迁移包打包脚本 - 创建完整的可迁移包
import fs from 'fs-extra';
import path from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

class MigrationPackager {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageDir = path.join(this.projectRoot, 'migration-package');
    this.excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      '.temp-decompile',
      '.maven-cache',
      'migration-package',
      '*.log',
      'npm-debug.log*',
      '.DS_Store',
      'Thumbs.db'
    ];
  }

  async createMigrationPackage() {
    console.log('📦 创建 Java Decompiler MCP 迁移包...\n');

    try {
      await this.prepareMigrationDirectory();
      await this.copyEssentialFiles();
      await this.createQuickStartGuide();
      await this.createArchive();
      await this.cleanup();

      console.log('\n🎉 迁移包创建完成！');
      console.log(`📁 包位置: ${path.join(this.projectRoot, 'java-decompiler-mcp-migration.zip')}`);
      
    } catch (error) {
      console.error('\n❌ 迁移包创建失败:', error.message);
      process.exit(1);
    }
  }

  async prepareMigrationDirectory() {
    console.log('🗂️  准备迁移目录...');
    
    // 清理旧的迁移包目录
    if (fs.existsSync(this.packageDir)) {
      await fs.remove(this.packageDir);
    }
    
    await fs.ensureDir(this.packageDir);
    console.log('✅ 迁移目录已准备');
  }

  async copyEssentialFiles() {
    console.log('\n📋 复制必要文件...');

    const filesToCopy = [
      // 核心项目文件
      'package.json',
      'tsconfig.json',
      'README.md',
      
      // 源码目录
      'src/',
      
      // 脚本目录
      'scripts/',
      
      // 测试目录
      'tests/',
      
      // 配置文件
      'update-cursor-config.ps1'
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetPath = path.join(this.packageDir, file);

      if (fs.existsSync(sourcePath)) {
        await this.copyWithExclusions(sourcePath, targetPath);
        console.log(`✅ 复制: ${file}`);
      } else {
        console.log(`⚠️  跳过: ${file} (不存在)`);
      }
    }
  }

  async copyWithExclusions(source, target) {
    const stats = await fs.stat(source);
    
    if (stats.isDirectory()) {
      await fs.ensureDir(target);
      const items = await fs.readdir(source);
      
      for (const item of items) {
        // 检查是否应该排除
        if (this.shouldExclude(item)) {
          continue;
        }
        
        const sourcePath = path.join(source, item);
        const targetPath = path.join(target, item);
        await this.copyWithExclusions(sourcePath, targetPath);
      }
    } else {
      await fs.copy(source, target);
    }
  }

  shouldExclude(itemName) {
    return this.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // 简单的通配符匹配
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(itemName);
      }
      return itemName === pattern;
    });
  }

  async createQuickStartGuide() {
    console.log('\n📖 创建快速开始指南...');

    const quickStartContent = `# Java Decompiler MCP - 快速开始

## 🚀 一键安装

### Windows 用户
\`\`\`cmd
# 1. 解压到目标目录
# 2. 打开命令行，进入项目目录
# 3. 运行安装脚本
scripts\\install.bat
\`\`\`

### Linux/macOS 用户
\`\`\`bash
# 1. 解压到目标目录
# 2. 打开终端，进入项目目录
# 3. 设置权限并运行安装脚本
chmod +x scripts/install.sh
./scripts/install.sh
\`\`\`

## 📋 环境要求

- **Java 8+**: 用于运行CFR反编译器
- **Node.js 16+**: 用于运行MCP服务器
- **网络连接**: 用于下载依赖和CFR工具

## ⚙️ 安装步骤详解

### 1. 自动检查环境
安装脚本会自动检查：
- Java运行环境
- Node.js版本
- npm包管理器

### 2. 自动下载工具
- CFR反编译器 (2MB)
- npm依赖包

### 3. 自动配置
- 构建TypeScript项目
- 验证所有工具可用
- 生成MCP服务器

### 4. 集成到Cursor
- 运行 \`update-cursor-config.ps1\` (Windows)
- 或手动编辑 ~/.cursor/mcp.json

## 🎯 使用方法

安装完成后，在Cursor中可以使用：

1. **列出项目依赖**
   \`\`\`
   请列出项目的Maven依赖
   \`\`\`

2. **搜索类**
   \`\`\`
   搜索StringUtils相关的类
   \`\`\`

3. **获取源码**
   \`\`\`
   获取org.apache.commons.lang3.StringUtils的源码
   \`\`\`

## 🔧 故障排除

### Java环境问题
- 确保已安装Java 8或更高版本
- 检查 \`java -version\` 命令可用

### Node.js问题  
- 确保已安装Node.js 16或更高版本
- 检查 \`node --version\` 和 \`npm --version\`

### CFR下载失败
- 检查网络连接
- 手动下载CFR到 tools/cfr.jar

### 权限问题 (Linux/macOS)
\`\`\`bash
chmod +x scripts/install.sh
chmod +x scripts/auto-setup.js
\`\`\`

## 📚 更多信息

详细使用说明请参考 README.md 文件。

---
📅 创建时间: ${new Date().toLocaleString()}
🏷️  版本: 1.0.0
`;

    await fs.writeFile(
      path.join(this.packageDir, 'QUICK_START.md'), 
      quickStartContent
    );
    
    console.log('✅ 快速开始指南已创建');
  }

  async createArchive() {
    console.log('\n📦 创建压缩包...');

    const outputPath = path.join(this.projectRoot, 'java-decompiler-mcp-migration.zip');
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ 压缩包创建完成: ${sizeMB}MB`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(this.packageDir, false);
      archive.finalize();
    });
  }

  async cleanup() {
    console.log('\n🧹 清理临时文件...');
    await fs.remove(this.packageDir);
    console.log('✅ 清理完成');
  }

  static printUsage() {
    console.log(`
🎯 Java Decompiler MCP 迁移包创建工具

用法:
  node scripts/package-for-migration.js

此脚本将创建一个完整的迁移包，包含:
- 所有源码文件
- 安装和配置脚本  
- 快速开始指南
- 必要的配置文件

生成的迁移包可以直接在其他机器上解压使用。
`);
  }
}

// 检查archiver依赖
async function checkDependencies() {
  try {
    await import('archiver');
  } catch (error) {
    console.error('❌ 缺少依赖: archiver');
    console.log('💡 请运行: npm install archiver');
    process.exit(1);
  }
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    MigrationPackager.printUsage();
    process.exit(0);
  }

  await checkDependencies();
  
  const packager = new MigrationPackager();
  packager.createMigrationPackage().catch(error => {
    console.error('\n💥 打包失败:', error.message);
    process.exit(1);
  });
} 