#!/usr/bin/env node
/**
 * 全局Maven反编译MCP服务安装脚本
 * 将插件安装为全局可用的服务，不依赖特定项目
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class GlobalSetup {
  constructor() {
    this.globalDir = path.join(os.homedir(), '.java-decompiler-mcp');
    this.configDir = path.join(os.homedir(), '.cursor');
    this.mcpConfigPath = path.join(this.configDir, 'mcp.json');
  }

  async install() {
    console.log('🚀 开始全局安装Java反编译MCP服务...');

    try {
      // 1. 创建全局目录
      await this.createGlobalDirectory();
      
      // 2. 复制文件到全局目录
      await this.copyFiles();
      
      // 3. 安装依赖
      await this.installDependencies();
      
      // 4. 构建项目
      await this.buildProject();
      
      // 5. 配置MCP
      await this.configureMCP();
      
      // 6. 设置环境变量（可选）
      await this.setupEnvironment();
      
      console.log('✅ 全局安装完成！');
      this.printUsageInstructions();
      
    } catch (error) {
      console.error('❌ 安装失败:', error);
      process.exit(1);
    }
  }

  async createGlobalDirectory() {
    console.log(`📁 创建全局目录: ${this.globalDir}`);
    
    if (await fs.pathExists(this.globalDir)) {
      console.log('  ⚠️  目录已存在，将覆盖...');
      await fs.remove(this.globalDir);
    }
    
    await fs.ensureDir(this.globalDir);
    console.log('  ✅ 目录创建完成');
  }

  async copyFiles() {
    console.log('📄 复制项目文件...');
    
    const filesToCopy = [
      'package.json',
      'tsconfig.json',
      'src/',
      'scripts/auto-setup.js'
    ];
    
    for (const file of filesToCopy) {
      const sourcePath = path.join(projectRoot, file);
      const destPath = path.join(this.globalDir, file);
      
      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, destPath);
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ⚠️  跳过不存在的文件: ${file}`);
      }
    }
  }

  async installDependencies() {
    console.log('📦 安装依赖...');
    
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      // Windows上需要使用npm.cmd
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      const npm = spawn(npmCommand, ['install', '--production'], {
        cwd: this.globalDir,
        stdio: 'inherit',
        shell: true
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('  ✅ 依赖安装完成');
          resolve();
        } else {
          reject(new Error(`npm install失败，退出码: ${code}`));
        }
      });
      
      npm.on('error', (error) => {
        reject(new Error(`npm install执行失败: ${error.message}`));
      });
    });
  }

  async buildProject() {
    console.log('🔧 构建项目...');
    
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      // Windows上需要使用npm.cmd
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      const npm = spawn(npmCommand, ['run', 'build'], {
        cwd: this.globalDir,
        stdio: 'inherit',
        shell: true
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('  ✅ 项目构建完成');
          resolve();
        } else {
          reject(new Error(`npm run build失败，退出码: ${code}`));
        }
      });
      
      npm.on('error', (error) => {
        reject(new Error(`npm run build执行失败: ${error.message}`));
      });
    });
  }

  async configureMCP() {
    console.log('⚙️ 配置Cursor MCP...');
    
    // 确保.cursor目录存在
    await fs.ensureDir(this.configDir);
    
    const mcpServer = {
      command: 'node',
      args: [path.join(this.globalDir, 'dist', 'index.js')],
      env: {
        // 可以在这里设置环境变量
      }
    };
    
    let mcpConfig = {};
    
    // 读取现有配置
    if (await fs.pathExists(this.mcpConfigPath)) {
      try {
        const configText = await fs.readFile(this.mcpConfigPath, 'utf8');
        mcpConfig = JSON.parse(configText);
        console.log('  📋 读取现有MCP配置');
      } catch (error) {
        console.log('  ⚠️  现有配置文件格式错误，将创建新配置');
        mcpConfig = {};
      }
    }
    
    // 确保必要的配置结构存在
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {};
    }
    
    // 添加或更新我们的服务器配置
    mcpConfig.mcpServers['java-decompiler'] = mcpServer;
    
    // 写入配置文件
    await fs.writeFile(
      this.mcpConfigPath,
      JSON.stringify(mcpConfig, null, 2),
      'utf8'
    );
    
    console.log('  ✅ MCP配置更新完成');
    console.log(`  📄 配置文件: ${this.mcpConfigPath}`);
  }

  async setupEnvironment() {
    console.log('🌍 设置环境变量建议...');
    
    const envVars = [
      {
        name: 'MAVEN_REPOSITORY',
        description: 'Maven本地仓库路径',
        example: path.join(os.homedir(), '.m2', 'repository')
      },
      {
        name: 'MAVEN_REPOSITORIES',
        description: 'Maven远程仓库URL（用逗号分隔）',
        example: 'https://repo1.maven.org/maven2/,https://repo.spring.io/release/'
      },
      {
        name: 'MAVEN_MIRROR_URL',
        description: 'Maven镜像URL（如阿里云镜像）',
        example: 'https://maven.aliyun.com/repository/public/'
      }
    ];
    
    console.log('\n  可选的环境变量配置:');
    for (const envVar of envVars) {
      console.log(`    ${envVar.name}: ${envVar.description}`);
      console.log(`      示例: ${envVar.example}`);
    }
  }

  printUsageInstructions() {
    console.log('\n🎉 安装完成！使用说明:');
    console.log(`
1. 重启Cursor编辑器

2. 在Cursor中，您现在可以使用以下功能:
   - 扫描Maven本地仓库中的所有依赖
   - 搜索Java类
   - 获取依赖的源码（支持sources jar和反编译）
   - 列出依赖中的所有类
   - 查看Maven配置信息

3. 示例使用：
   - "扫描我的Maven本地仓库"
   - "搜索StringUtils类"
   - "获取org.apache.commons.lang3.StringUtils的源码"

4. 环境变量配置（可选）:
   在您的系统中设置以下环境变量来自定义Maven配置:
   - MAVEN_REPOSITORY: 自定义本地仓库路径
   - MAVEN_REPOSITORIES: 自定义远程仓库
   - MAVEN_MIRROR_URL: 使用镜像加速

5. 全局文件位置:
   - 服务文件: ${this.globalDir}
   - 配置文件: ${this.mcpConfigPath}

6. 卸载:
   删除目录 ${this.globalDir} 并从 ${this.mcpConfigPath} 中移除相关配置即可
`);
  }

  async uninstall() {
    console.log('🗑️ 开始卸载Java反编译MCP服务...');
    
    try {
      // 1. 删除全局目录
      if (await fs.pathExists(this.globalDir)) {
        await fs.remove(this.globalDir);
        console.log(`  ✅ 删除目录: ${this.globalDir}`);
      }
      
      // 2. 从MCP配置中移除
      if (await fs.pathExists(this.mcpConfigPath)) {
        const configText = await fs.readFile(this.mcpConfigPath, 'utf8');
        const mcpConfig = JSON.parse(configText);
        
        if (mcpConfig.mcpServers && mcpConfig.mcpServers['java-decompiler']) {
          delete mcpConfig.mcpServers['java-decompiler'];
          
          await fs.writeFile(
            this.mcpConfigPath,
            JSON.stringify(mcpConfig, null, 2),
            'utf8'
          );
          console.log('  ✅ 从MCP配置中移除');
        }
      }
      
      console.log('✅ 卸载完成！');
      console.log('请重启Cursor编辑器以应用更改。');
      
    } catch (error) {
      console.error('❌ 卸载失败:', error);
      process.exit(1);
    }
  }
}

async function main() {
  const setup = new GlobalSetup();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'install':
      await setup.install();
      break;
    case 'uninstall':
      await setup.uninstall();
      break;
    default:
      console.log('Java反编译MCP全局安装工具');
      console.log('');
      console.log('用法:');
      console.log('  node global-setup.js install   - 安装服务');
      console.log('  node global-setup.js uninstall - 卸载服务');
      process.exit(1);
  }
}

main().catch(console.error); 