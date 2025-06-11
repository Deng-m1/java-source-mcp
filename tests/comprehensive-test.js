#!/usr/bin/env node

// 综合测试脚本 - 运行所有测试包括源码获取测试
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

class ComprehensiveTestRunner {
  constructor() {
    this.testResults = {
      unitTests: null,
      mcpToolsTests: null,
      projectSpecificTests: null,
      sourceCodeTests: null
    };
    this.startTime = Date.now();
  }

  async runTestSuite(testName, scriptPath) {
    console.log(`\n🚀 开始执行 ${testName}...`);
    console.log('=' .repeat(60));
    
    try {
      const output = execSync(`node ${scriptPath}`, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
      });
      
      console.log(output);
      
      // 解析测试结果
      const results = this.parseTestOutput(output);
      console.log(`✅ ${testName} 完成`);
      
      return { status: 'SUCCESS', output, results };
      
    } catch (error) {
      console.log(`❌ ${testName} 失败:`);
      console.log(error.stdout || error.message);
      
      return { 
        status: 'FAILED', 
        error: error.message,
        output: error.stdout || error.stderr || ''
      };
    }
  }

  parseTestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      total: 0,
      successRate: 0
    };

    // 解析通过/失败数量
    const passMatches = output.match(/通过[：:\s]*(\d+)/g);
    const failMatches = output.match(/失败[：:\s]*(\d+)/g);
    const successRateMatches = output.match(/成功率[：:\s]*(\d+\.?\d*)%/g);

    if (passMatches) {
      results.passed = parseInt(passMatches[passMatches.length - 1].match(/\d+/)[0]);
    }

    if (failMatches) {
      results.failed = parseInt(failMatches[failMatches.length - 1].match(/\d+/)[0]);
    }

    if (successRateMatches) {
      results.successRate = parseFloat(successRateMatches[successRateMatches.length - 1].match(/\d+\.?\d*/)[0]);
    }

    results.total = results.passed + results.failed;

    return results;
  }

  async generateComprehensiveReport() {
    const reportPath = 'COMPREHENSIVE_TEST_REPORT.md';
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    let report = `# Java Decompiler MCP 综合测试报告\n\n`;
    report += `生成时间: ${new Date().toLocaleString()}\n`;
    report += `总测试时间: ${(totalTime / 1000).toFixed(2)} 秒\n\n`;
    
    // 测试套件概览
    report += `## 📊 测试套件概览\n\n`;
    report += `| 测试套件 | 状态 | 通过 | 失败 | 成功率 |\n`;
    report += `|---------|------|------|------|--------|\n`;
    
    let totalPassed = 0;
    let totalFailed = 0;
    let allSuitesSuccess = true;

    for (const [suiteName, result] of Object.entries(this.testResults)) {
      if (!result) continue;
      
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      const passed = result.results?.passed || 0;
      const failed = result.results?.failed || 0;
      const successRate = result.results?.successRate || 0;
      
      report += `| ${suiteName} | ${status} | ${passed} | ${failed} | ${successRate}% |\n`;
      
      totalPassed += passed;
      totalFailed += failed;
      
      if (result.status !== 'SUCCESS') {
        allSuitesSuccess = false;
      }
    }
    
    const overallSuccessRate = totalPassed + totalFailed > 0 
      ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
      : 0;
    
    report += `\n**总计**: ${totalPassed + totalFailed} 个测试, ${totalPassed} 通过, ${totalFailed} 失败, 成功率: ${overallSuccessRate}%\n\n`;
    
    // 核心功能验证
    report += `## 🎯 核心功能验证\n\n`;
    
    if (this.testResults.unitTests?.status === 'SUCCESS') {
      report += `✅ **依赖解析**: pom.xml解析正常，Maven依赖下载功能正常\n`;
    } else {
      report += `❌ **依赖解析**: 基础功能存在问题\n`;
    }
    
    if (this.testResults.sourceCodeTests?.status === 'SUCCESS') {
      report += `✅ **源码获取**: Java类反编译功能正常，源码质量良好\n`;
    } else {
      report += `❌ **源码获取**: 反编译功能存在问题\n`;
    }
    
    if (this.testResults.mcpToolsTests?.status === 'SUCCESS') {
      report += `✅ **MCP集成**: 所有MCP工具函数响应格式正确\n`;
    } else {
      report += `❌ **MCP集成**: MCP工具函数存在问题\n`;
    }
    
    if (this.testResults.projectSpecificTests?.status === 'SUCCESS') {
      report += `✅ **项目兼容性**: 与实际项目依赖兼容性良好\n`;
    } else {
      report += `❌ **项目兼容性**: 项目集成存在问题\n`;
    }
    
    // 详细测试结果
    report += `\n## 📋 详细测试结果\n\n`;
    
    for (const [suiteName, result] of Object.entries(this.testResults)) {
      if (!result) continue;
      
      report += `### ${result.status === 'SUCCESS' ? '✅' : '❌'} ${suiteName}\n\n`;
      
      if (result.status === 'SUCCESS') {
        report += `测试通过，所有功能正常运行。\n\n`;
      } else {
        report += `**错误信息**:\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
      }
    }
    
    // 使用建议
    report += `## 💡 使用建议\n\n`;
    
    if (allSuitesSuccess) {
      report += `🎉 所有测试通过！Java Decompiler MCP插件已准备就绪，可以安全使用。\n\n`;
      report += `### 推荐使用场景:\n`;
      report += `- 查询项目Maven依赖列表\n`;
      report += `- 搜索特定Java类在依赖中的位置\n`;
      report += `- 获取第三方库类的源码进行学习\n`;
      report += `- 调试时查看依赖库的具体实现\n\n`;
    } else {
      report += `⚠️ 部分测试未通过，建议检查以下问题:\n\n`;
      
      if (this.testResults.unitTests?.status !== 'SUCCESS') {
        report += `- 检查pom.xml文件路径是否正确\n`;
        report += `- 确认Maven依赖下载网络连接正常\n`;
      }
      
      if (this.testResults.sourceCodeTests?.status !== 'SUCCESS') {
        report += `- 检查Java运行环境是否正确安装\n`;
        report += `- 确认javap工具是否可用\n`;
      }
      
      if (this.testResults.mcpToolsTests?.status !== 'SUCCESS') {
        report += `- 检查MCP工具函数实现\n`;
        report += `- 验证响应格式是否符合MCP规范\n`;
      }
    }
    
    // 性能统计
    report += `## ⚡ 性能统计\n\n`;
    report += `- 总测试时间: ${(totalTime / 1000).toFixed(2)} 秒\n`;
    report += `- 平均每个测试套件: ${(totalTime / Object.keys(this.testResults).length / 1000).toFixed(2)} 秒\n`;
    report += `- 测试覆盖范围: 依赖解析、源码获取、MCP集成、项目兼容性\n\n`;
    
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 综合测试报告已生成: ${reportPath}`);
    
    return reportPath;
  }

  async runAllTests() {
    console.log('🧪 Java Decompiler MCP 综合测试开始...');
    console.log(`开始时间: ${new Date().toLocaleString()}\n`);
    
    // 确保构建是最新的
    console.log('🔨 构建项目...');
    try {
      execSync('npm run build', { encoding: 'utf8' });
      console.log('✅ 项目构建完成\n');
    } catch (error) {
      console.log('❌ 项目构建失败，继续测试...\n');
    }
    
    // 运行各个测试套件
    this.testResults.unitTests = await this.runTestSuite(
      '单元测试 (Unit Tests)', 
      'tests/test-runner.js'
    );
    
    this.testResults.mcpToolsTests = await this.runTestSuite(
      'MCP工具测试 (MCP Tools Tests)', 
      'tests/mcp-tools-test.js'
    );
    
    this.testResults.projectSpecificTests = await this.runTestSuite(
      '项目特定测试 (Project Specific Tests)', 
      'tests/project-specific-test.js'
    );
    
    this.testResults.sourceCodeTests = await this.runTestSuite(
      '源码获取测试 (Source Code Tests)', 
      'tests/source-code-test.js'
    );
    
    // 生成综合报告
    const reportPath = await this.generateComprehensiveReport();
    
    // 总结
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 综合测试完成');
    console.log(`总耗时: ${(totalTime / 1000).toFixed(2)} 秒`);
    
    // 计算总体结果
    const successCount = Object.values(this.testResults)
      .filter(result => result?.status === 'SUCCESS').length;
    const totalSuites = Object.values(this.testResults)
      .filter(result => result !== null).length;
    
    console.log(`测试套件通过率: ${successCount}/${totalSuites} (${((successCount/totalSuites)*100).toFixed(1)}%)`);
    
    if (successCount === totalSuites) {
      console.log('\n🎉 所有测试通过！MCP插件功能完整，可以正常使用。');
    } else {
      console.log('\n⚠️ 部分测试未通过，请查看详细报告进行排查。');
    }
    
    console.log(`\n📄 详细报告: ${reportPath}`);
    
    return this.testResults;
  }
}

// 运行综合测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests()
    .then(() => {
      console.log('\n✅ 综合测试执行完毕');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 综合测试执行失败:', error.message);
      process.exit(1);
    });
}

export default ComprehensiveTestRunner; 