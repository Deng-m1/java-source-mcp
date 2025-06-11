#!/usr/bin/env node

// 专门测试源码获取和反编译功能
import { JavaDecompiler } from '../dist/decompiler.js';
import { MavenDependencyResolver } from '../dist/maven-resolver.js';
import { promises as fs } from 'fs';
import path from 'path';

class SourceCodeTest {
  constructor() {
    this.resolver = new MavenDependencyResolver();
    this.decompiler = new JavaDecompiler();
    this.testResults = [];
    this.sourceCodeSamples = [];
  }

  async runTest(testName, testFunc) {
    console.log(`\n📋 源码测试: ${testName}`);
    try {
      const result = await testFunc();
      console.log('✅ 测试通过');
      this.testResults.push({ name: testName, status: 'PASS', result });
      return result;
    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      throw error;
    }
  }

  // 测试经典工具类的源码获取
  async testClassicUtilityClasses() {
    return await this.runTest('经典工具类源码获取', async () => {
      const testClasses = [
        {
          groupId: 'org.apache.commons',
          artifactId: 'commons-lang3',
          version: '3.6',
          className: 'org.apache.commons.lang3.StringUtils',
          expectedMethods: ['isEmpty', 'isBlank', 'join', 'split'],
          description: 'Apache Commons StringUtils'
        },
        {
          groupId: 'com.google.guava',
          artifactId: 'guava',
          version: '31.1-jre',
          className: 'com.google.common.base.Strings',
          expectedMethods: ['isNullOrEmpty', 'emptyToNull', 'nullToEmpty'],
          description: 'Google Guava Strings'
        }
      ];

      const results = [];

      for (const testCase of testClasses) {
        console.log(`   📚 测试: ${testCase.description}`);
        
        try {
          // 下载JAR包
          const jarPath = await this.resolver.downloadDependency(
            testCase.groupId,
            testCase.artifactId,
            testCase.version
          );

          // 反编译类
          const sourceCode = await this.decompiler.decompileClass(jarPath, testCase.className);

          // 验证源码质量
          const analysis = this.analyzeSourceCode(sourceCode, testCase);
          
          results.push({
            ...testCase,
            sourceCodeLength: sourceCode.length,
            analysis,
            success: true
          });

          // 保存源码样例
          this.sourceCodeSamples.push({
            className: testCase.className,
            sourceCode: sourceCode.substring(0, 1000) + '...' // 保存前1000字符作为样例
          });

          console.log(`     ✅ 源码长度: ${sourceCode.length} 字符`);
          console.log(`     📊 方法检测: ${analysis.foundMethods}/${testCase.expectedMethods.length}`);
          console.log(`     📈 质量评分: ${analysis.qualityScore}/10`);

        } catch (error) {
          console.log(`     ❌ 失败: ${error.message}`);
          results.push({
            ...testCase,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });
  }

  // 测试项目实际依赖的源码获取
  async testProjectDependencySourceCode() {
    return await this.runTest('项目依赖源码获取', async () => {
      // 获取项目依赖
      const dependencies = await this.resolver.parsePomDependencies('pom.xml');
      
      // 选择几个重要的依赖进行深度测试
      const importantDeps = [
        // Spring Boot
        dependencies.find(dep => dep.artifactId.includes('spring-boot-starter')),
        // MyBatis
        dependencies.find(dep => dep.artifactId.includes('mybatis')),
        // MySQL
        dependencies.find(dep => dep.artifactId.includes('mysql')),
        // Druid
        dependencies.find(dep => dep.artifactId.includes('druid')),
        // Elasticsearch
        dependencies.find(dep => dep.artifactId.includes('elasticsearch'))
      ].filter(Boolean);

      const results = [];

      for (const dep of importantDeps.slice(0, 3)) { // 测试前3个重要依赖
        console.log(`   📦 测试依赖: ${dep.groupId}:${dep.artifactId}:${dep.version}`);
        
        try {
          const jarPath = await this.resolver.downloadDependency(
            dep.groupId,
            dep.artifactId,
            dep.version
          );

          // 搜索主要类
          const mainClasses = await this.decompiler.searchClassInJar(jarPath, '');
          console.log(`     📂 总类数: ${mainClasses.length}`);

          // 找几个有代表性的类进行反编译
          const testClasses = this.selectRepresentativeClasses(mainClasses, dep);
          
          for (const className of testClasses.slice(0, 2)) { // 每个依赖测试2个类
            try {
              const sourceCode = await this.decompiler.decompileClass(jarPath, className);
              
              const analysis = this.analyzeSourceCode(sourceCode, { className });
              
              results.push({
                dependency: `${dep.groupId}:${dep.artifactId}:${dep.version}`,
                className,
                sourceCodeLength: sourceCode.length,
                analysis,
                success: true
              });

              console.log(`     ✅ ${className}: ${sourceCode.length} 字符, 质量: ${analysis.qualityScore}/10`);

            } catch (error) {
              console.log(`     ❌ ${className}: ${error.message}`);
              results.push({
                dependency: `${dep.groupId}:${dep.artifactId}:${dep.version}`,
                className,
                success: false,
                error: error.message
              });
            }
          }

        } catch (error) {
          console.log(`     ❌ 依赖处理失败: ${error.message}`);
        }
      }

      return results;
    });
  }

  // 测试复杂类的源码获取（接口、抽象类、内部类等）
  async testComplexClassTypes() {
    return await this.runTest('复杂类型源码获取', async () => {
      const testCases = [
        {
          groupId: 'org.springframework',
          artifactId: 'spring-context',
          version: '6.1.4',
          classPattern: 'ApplicationContext', // 搜索接口
          description: 'Spring ApplicationContext接口'
        },
        {
          groupId: 'org.mybatis',
          artifactId: 'mybatis',
          version: '3.5.16',
          classPattern: 'Mapper',
          description: 'MyBatis Mapper相关类'
        }
      ];

      const results = [];

      for (const testCase of testCases) {
        console.log(`   🔍 测试: ${testCase.description}`);
        
        try {
          const jarPath = await this.resolver.downloadDependency(
            testCase.groupId,
            testCase.artifactId,
            testCase.version
          );

          // 搜索匹配的类
          const foundClasses = await this.decompiler.searchClassInJar(jarPath, testCase.classPattern);
          console.log(`     📋 找到 ${foundClasses.length} 个匹配的类`);

          // 选择几个类进行测试
          const selectedClasses = foundClasses.slice(0, 3);
          
          for (const className of selectedClasses) {
            try {
              const sourceCode = await this.decompiler.decompileClass(jarPath, className);
              
              const typeAnalysis = this.analyzeClassType(sourceCode);
              const qualityAnalysis = this.analyzeSourceCode(sourceCode, { className });
              
              results.push({
                ...testCase,
                className,
                classType: typeAnalysis.type,
                sourceCodeLength: sourceCode.length,
                qualityScore: qualityAnalysis.qualityScore,
                features: typeAnalysis.features,
                success: true
              });

              console.log(`     ✅ ${className.split('.').pop()}: ${typeAnalysis.type}, ${sourceCode.length}字符`);

            } catch (error) {
              console.log(`     ❌ ${className}: ${error.message}`);
            }
          }

        } catch (error) {
          console.log(`     ❌ ${testCase.description}: ${error.message}`);
        }
      }

      return results;
    });
  }

  // 测试大型类的源码获取和性能
  async testLargeClassDecompilation() {
    return await this.runTest('大型类反编译性能', async () => {
      const testCases = [
        {
          groupId: 'org.apache.commons',
          artifactId: 'commons-lang3',
          version: '3.6',
          className: 'org.apache.commons.lang3.StringUtils', // 这是一个比较大的工具类
          description: 'StringUtils (大型工具类)'
        }
      ];

      const results = [];

      for (const testCase of testCases) {
        console.log(`   ⏱️  性能测试: ${testCase.description}`);
        
        const startTime = Date.now();
        
        try {
          const jarPath = await this.resolver.downloadDependency(
            testCase.groupId,
            testCase.artifactId,
            testCase.version
          );

          const decompileStart = Date.now();
          const sourceCode = await this.decompiler.decompileClass(jarPath, testCase.className);
          const decompileTime = Date.now() - decompileStart;
          
          const totalTime = Date.now() - startTime;
          
          // 分析源码复杂度
          const complexity = this.analyzeComplexity(sourceCode);
          
          results.push({
            ...testCase,
            sourceCodeLength: sourceCode.length,
            decompileTime,
            totalTime,
            complexity,
            linesOfCode: sourceCode.split('\n').length,
            success: true
          });

          console.log(`     ⏱️  反编译耗时: ${decompileTime}ms`);
          console.log(`     📏 源码长度: ${sourceCode.length} 字符, ${sourceCode.split('\n').length} 行`);
          console.log(`     🧮 复杂度评分: ${complexity.score}/10`);

        } catch (error) {
          console.log(`     ❌ 性能测试失败: ${error.message}`);
          results.push({
            ...testCase,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    });
  }

  // 源码质量分析
  analyzeSourceCode(sourceCode, testCase) {
    let score = 0;
    let foundMethods = 0;

    // 基本结构检查
    if (sourceCode.includes('class ') || sourceCode.includes('interface ')) score += 2;
    if (sourceCode.includes('package ')) score += 1;
    if (sourceCode.includes('import ')) score += 1;

    // 方法检查
    const methodCount = (sourceCode.match(/\bpublic\s+\w+/g) || []).length;
    if (methodCount > 0) score += 2;
    if (methodCount > 5) score += 1;

    // 特定方法检查（如果提供了期望方法）
    if (testCase.expectedMethods) {
      foundMethods = testCase.expectedMethods.filter(method => 
        sourceCode.includes(method)
      ).length;
      score += Math.min(foundMethods, 3);
    }

    // 注释和文档检查
    if (sourceCode.includes('/**')) score += 1;

    return {
      qualityScore: Math.min(score, 10),
      foundMethods,
      methodCount,
      hasPackage: sourceCode.includes('package '),
      hasImports: sourceCode.includes('import '),
      hasJavadoc: sourceCode.includes('/**')
    };
  }

  // 类类型分析
  analyzeClassType(sourceCode) {
    const features = [];
    let type = 'unknown';

    if (sourceCode.includes('interface ')) {
      type = 'interface';
      features.push('接口');
    } else if (sourceCode.includes('abstract class ')) {
      type = 'abstract class';
      features.push('抽象类');
    } else if (sourceCode.includes('class ')) {
      type = 'class';
      features.push('普通类');
    }

    if (sourceCode.includes('static class ')) features.push('静态内部类');
    if (sourceCode.includes('enum ')) features.push('枚举');
    if (sourceCode.includes('@Override')) features.push('方法重写');
    if (sourceCode.includes('implements ')) features.push('接口实现');
    if (sourceCode.includes('extends ')) features.push('类继承');

    return { type, features };
  }

  // 复杂度分析
  analyzeComplexity(sourceCode) {
    const lines = sourceCode.split('\n');
    const methods = (sourceCode.match(/\bpublic\s+\w+/g) || []).length;
    const conditionals = (sourceCode.match(/\b(if|else|for|while|switch)\b/g) || []).length;
    const innerClasses = (sourceCode.match(/\bclass\s+\w+/g) || []).length - 1; // 减去主类

    let score = 0;
    if (lines.length > 100) score += 2;
    if (methods > 10) score += 2;
    if (conditionals > 20) score += 2;
    if (innerClasses > 0) score += 2;
    if (sourceCode.includes('synchronized')) score += 1;
    if (sourceCode.includes('volatile')) score += 1;

    return {
      score: Math.min(score, 10),
      linesOfCode: lines.length,
      methodCount: methods,
      conditionalCount: conditionals,
      innerClassCount: innerClasses
    };
  }

  // 选择有代表性的类进行测试
  selectRepresentativeClasses(allClasses, dependency) {
    const patterns = [];
    
    // 根据依赖类型选择不同的模式
    if (dependency.artifactId.includes('spring')) {
      patterns.push('Application', 'Context', 'Configuration', 'Controller');
    } else if (dependency.artifactId.includes('mybatis')) {
      patterns.push('Mapper', 'Session', 'Configuration');
    } else if (dependency.artifactId.includes('mysql')) {
      patterns.push('Driver', 'Connection', 'DataSource');
    } else if (dependency.artifactId.includes('druid')) {
      patterns.push('DataSource', 'Pool', 'Connection');
    } else if (dependency.artifactId.includes('elasticsearch')) {
      patterns.push('Client', 'Request', 'Response');
    } else {
      patterns.push('Utils', 'Helper', 'Manager', 'Builder');
    }

    const selectedClasses = [];
    
    for (const pattern of patterns) {
      const matches = allClasses.filter(className => 
        className.toLowerCase().includes(pattern.toLowerCase())
      );
      if (matches.length > 0) {
        selectedClasses.push(matches[0]); // 取第一个匹配的
      }
    }

    // 如果没有找到匹配的，随机选择几个
    if (selectedClasses.length === 0) {
      selectedClasses.push(...allClasses.slice(0, 3));
    }

    return selectedClasses;
  }

  // 生成源码测试报告
  async generateSourceCodeReport() {
    const reportPath = 'SOURCE_CODE_TEST_REPORT.md';
    
    let report = `# Java源码获取测试报告\n\n`;
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;
    
    // 测试结果统计
    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const failCount = this.testResults.filter(r => r.status === 'FAIL').length;
    const successRate = ((passCount / (passCount + failCount)) * 100).toFixed(1);
    
    report += `## 📊 测试结果统计\n\n`;
    report += `- ✅ 通过: ${passCount}\n`;
    report += `- ❌ 失败: ${failCount}\n`;
    report += `- 📈 成功率: ${successRate}%\n\n`;
    
    // 详细测试结果
    report += `## 📋 详细测试结果\n\n`;
    for (const result of this.testResults) {
      report += `### ${result.status === 'PASS' ? '✅' : '❌'} ${result.name}\n\n`;
      if (result.status === 'FAIL') {
        report += `**错误信息**: ${result.error}\n\n`;
      }
    }
    
    // 源码样例
    if (this.sourceCodeSamples.length > 0) {
      report += `## 📝 源码样例\n\n`;
      for (const sample of this.sourceCodeSamples.slice(0, 3)) {
        report += `### ${sample.className}\n\n`;
        report += `\`\`\`java\n${sample.sourceCode}\n\`\`\`\n\n`;
      }
    }
    
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 源码测试报告已生成: ${reportPath}`);
  }

  // 运行所有源码测试
  async runAllTests() {
    console.log('🧪 开始Java源码获取专项测试...\n');
    
    try {
      await this.testClassicUtilityClasses();
      await this.testProjectDependencySourceCode();
      await this.testComplexClassTypes();
      await this.testLargeClassDecompilation();
    } catch (error) {
      console.log(`\n❌ 测试执行错误: ${error.message}`);
    }
    
    await this.generateSourceCodeReport();
    
    const passCount = this.testResults.filter(r => r.status === 'PASS').length;
    const totalCount = this.testResults.length;
    
    console.log(`\n🎯 源码测试完成: ${passCount}/${totalCount} 通过`);
    
    return this.testResults;
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SourceCodeTest();
  tester.runAllTests().catch(console.error);
}

export default SourceCodeTest; 