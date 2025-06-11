#!/usr/bin/env node

// 自动配置脚本 - 检测并安装所有必要的工具
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

class AutoSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.toolsDir = path.join(this.projectRoot, 'tools');
    this.requirements = {
      java: false,
      node: false,
      cfr: false,
      packages: false
    };
  }

  async run() {
    console.log('🚀 Java Decompiler MCP 自动配置开始...\n');
    
    try {
      await this.checkEnvironment();
      await this.setupTools();
      await this.installDependencies();
      await this.verifySetup();
      
      console.log('\n🎉 自动配置完成！');
      console.log('✅ 所有工具已就绪，可以开始使用 Java Decompiler MCP');
      
    } catch (error) {
      console.error('\n❌ 自动配置失败:', error.message);
      process.exit(1);
    }
  }

  async checkEnvironment() {
    console.log('🔍 检查系统环境...');
    console.log('-'.repeat(40));

    // 检查Java环境
    await this.checkJava();
    
    // 检查Node.js环境
    await this.checkNode();
    
    // 检查npm包
    await this.checkPackages();

    console.log('');
  }

  async checkJava() {
    try {
      const result = await this.runCommand('java', ['-version']);
      const version = result.stderr || result.stdout;
      console.log('✅ Java环境: 已安装');
      console.log(`   版本信息: ${version.split('\n')[0]}`);
      this.requirements.java = true;
    } catch (error) {
      console.log('❌ Java环境: 未找到');
      console.log('   请安装 Java 8 或更高版本');
      console.log('   下载地址: https://adoptium.net/');
      throw new Error('Java环境缺失');
    }
  }

  async checkNode() {
    try {
      const nodeVersion = process.version;
      console.log('✅ Node.js环境: 已安装');
      console.log(`   版本信息: ${nodeVersion}`);
      this.requirements.node = true;
    } catch (error) {
      throw new Error('Node.js环境异常');
    }
  }

  async checkPackages() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    
    if (fs.existsSync(packageJsonPath) && fs.existsSync(nodeModulesPath)) {
      console.log('✅ npm包: 已安装');
      this.requirements.packages = true;
    } else {
      console.log('⚠️  npm包: 需要安装');
      this.requirements.packages = false;
    }
  }

  async setupTools() {
    console.log('🛠️  配置必要工具...');
    console.log('-'.repeat(40));

    // 确保tools目录存在
    await fs.ensureDir(this.toolsDir);

    // 设置CFR反编译器
    await this.setupCFR();

    console.log('');
  }

  async setupCFR() {
    const cfrPath = path.join(this.toolsDir, 'cfr.jar');
    
    if (fs.existsSync(cfrPath)) {
      console.log('✅ CFR反编译器: 已存在');
      
      // 验证CFR是否可用
      try {
        await this.runCommand('java', ['-jar', cfrPath, '--version']);
        console.log('   版本验证: 通过');
        this.requirements.cfr = true;
        return;
      } catch (error) {
        console.log('⚠️  CFR验证失败，重新下载...');
      }
    }

    console.log('📥 下载CFR反编译器...');
    await this.downloadCFR();
    
    // 再次验证
    try {
      const result = await this.runCommand('java', ['-jar', cfrPath, '--version']);
      console.log('✅ CFR反编译器: 安装成功');
      console.log(`   版本信息: ${result.stdout.trim()}`);
      this.requirements.cfr = true;
    } catch (error) {
      throw new Error('CFR反编译器配置失败');
    }
  }

  async downloadCFR() {
    const cfrUrl = 'https://github.com/leibnitz27/cfr/releases/download/0.152/cfr-0.152.jar';
    const cfrPath = path.join(this.toolsDir, 'cfr.jar');

    try {
      // 使用fetch下载（Node.js 18+支持）
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(cfrUrl);
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const buffer = await response.buffer();
      await fs.writeFile(cfrPath, buffer);
      
      console.log(`   ✅ CFR下载完成: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
      
    } catch (error) {
      console.log(`   ❌ 自动下载失败: ${error.message}`);
      console.log('   🔧 尝试手动下载方式...');
      
      // 提供手动下载指导
      console.log(`   请手动下载 CFR 到: ${cfrPath}`);
      console.log(`   下载地址: ${cfrUrl}`);
      throw new Error('CFR下载失败，请手动下载');
    }
  }

  async installDependencies() {
    if (this.requirements.packages) {
      console.log('📦 npm包: 已安装，跳过');
      return;
    }

    console.log('📦 安装npm依赖包...');
    console.log('-'.repeat(40));

    try {
      await this.runCommand('npm', ['install'], { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      console.log('✅ npm包安装完成');
    } catch (error) {
      throw new Error('npm包安装失败');
    }
  }

  async verifySetup() {
    console.log('🔬 验证配置...');
    console.log('-'.repeat(40));

    // 验证构建
    try {
      await this.runCommand('npm', ['run', 'build'], { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      console.log('✅ 项目构建: 成功');
    } catch (error) {
      throw new Error('项目构建失败');
    }

    // 验证MCP工具
    try {
      const testScript = `
        import('./dist/maven-resolver.js').then(m => {
          console.log('MCP工具验证成功');
          process.exit(0);
        }).catch(e => {
          console.error('MCP工具验证失败:', e.message);
          process.exit(1);
        });
      `;
      
      await this.runCommand('node', ['-e', testScript], { 
        cwd: this.projectRoot 
      });
      console.log('✅ MCP工具: 可用');
    } catch (error) {
      throw new Error('MCP工具验证失败');
    }

    // 验证Java反编译
    try {
      const cfrPath = path.join(this.toolsDir, 'cfr.jar');
      await this.runCommand('java', ['-jar', cfrPath, '--version']);
      console.log('✅ Java反编译: 可用');
    } catch (error) {
      throw new Error('Java反编译验证失败');
    }
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`命令执行失败: ${command} ${args.join(' ')}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`命令执行错误: ${error.message}`));
      });
    });
  }

  static printUsage() {
    console.log(`
🎯 Java Decompiler MCP 自动配置工具

用法:
  node scripts/auto-setup.js

此脚本将自动:
1. 检查Java和Node.js环境
2. 下载并配置CFR反编译器  
3. 安装npm依赖包
4. 验证所有工具是否正常工作

环境要求:
- Java 8 或更高版本
- Node.js 16 或更高版本
- 网络连接（用于下载工具）
`);
  }
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    AutoSetup.printUsage();
    process.exit(0);
  }

  const setup = new AutoSetup();
  setup.run().catch(error => {
    console.error('\n💥 自动配置失败:', error.message);
    console.log('\n📖 如需帮助，请运行: node scripts/auto-setup.js --help');
    process.exit(1);
  });
} 