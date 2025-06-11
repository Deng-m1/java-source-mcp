#!/usr/bin/env node

// MCP工具函数的专门测试
import { JavaDecompiler } from '../dist/decompiler.js';
import { MavenDependencyResolver } from '../dist/maven-resolver.js';

class MCPToolsTest {
  constructor() {
    this.resolver = new MavenDependencyResolver();
    this.decompiler = new JavaDecompiler();
    this.testResults = [];
  }

  async runTest(testName, testFunc) {
    console.log(`\n🔧 测试MCP工具: ${testName}`);
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

  // 模拟MCP工具调用：list_project_dependencies
  async testListProjectDependencies() {
    return await this.runTest('list_project_dependencies', async () => {
      const dependencies = await this.resolver.parsePomDependencies('pom.xml');
      
      // 模拟MCP响应格式
      const response = {
        content: [
          {
            type: 'text',
            text: `项目依赖列表 (${dependencies.length} 个依赖):\n\n${dependencies
              .map(dep => `${dep.groupId}:${dep.artifactId}:${dep.version}`)
              .join('\n')}`
          }
        ]
      };

      console.log(`   📦 找到 ${dependencies.length} 个依赖`);
      console.log(`   📄 响应内容长度: ${response.content[0].text.length} 字符`);
      
      // 验证响应格式
      if (!response.content || !Array.isArray(response.content)) {
        throw new Error('响应格式不正确');
      }
      
      return response;
    });
  }

  // 模拟MCP工具调用：search_class_in_dependencies
  async testSearchClassInDependencies() {
    return await this.runTest('search_class_in_dependencies', async () => {
      const searchTerm = 'StringUtils';
      const dependencies = await this.resolver.parsePomDependencies('pom.xml');
      const results = [];

      // 测试前3个依赖以节省时间
      for (const dep of dependencies.slice(0, 3)) {
        try {
          const jarPath = await this.resolver.downloadDependency(
            dep.groupId,
            dep.artifactId,
            dep.version
          );
          
          const foundClasses = await this.decompiler.searchClassInJar(jarPath, searchTerm);
          
          if (foundClasses.length > 0) {
            results.push({
              dependency: `${dep.groupId}:${dep.artifactId}:${dep.version}`,
              classes: foundClasses,
            });
          }
        } catch (error) {
          console.log(`     跳过依赖 ${dep.groupId}:${dep.artifactId}: ${error.message}`);
        }
      }

      const resultText = results.length > 0
        ? results
            .map(result => 
              `依赖: ${result.dependency}\n找到的类:\n${result.classes.map(c => `  - ${c}`).join('\n')}`
            )
            .join('\n\n')
        : `未在前3个依赖中找到包含 "${searchTerm}" 的类`;

      const response = {
        content: [
          {
            type: 'text',
            text: `搜索结果:\n\n${resultText}`,
          },
        ],
      };

      console.log(`   🔍 搜索词: ${searchTerm}`);
      console.log(`   📦 检查了前3个依赖`);
      console.log(`   ✨ 找到匹配结果: ${results.length} 个依赖`);

      return response;
    });
  }

  // 模拟MCP工具调用：get_dependency_source
  async testGetDependencySource() {
    return await this.runTest('get_dependency_source', async () => {
      const groupId = 'org.apache.commons';
      const artifactId = 'commons-lang3';
      const version = '3.6';
      const className = 'org.apache.commons.lang3.StringUtils';

      // 下载JAR包
      const jarPath = await this.resolver.downloadDependency(groupId, artifactId, version);

      // 反编译指定的类
      const sourceCode = await this.decompiler.decompileClass(jarPath, className);

      const response = {
        content: [
          {
            type: 'text',
            text: `反编译源码 (${groupId}:${artifactId}:${version} - ${className}):\n\n${sourceCode}`,
          },
        ],
      };

      console.log(`   📚 依赖: ${groupId}:${artifactId}:${version}`);
      console.log(`   🎯 类名: ${className}`);
      console.log(`   📝 源码长度: ${sourceCode.length} 字符`);

      if (!sourceCode.includes(className)) {
        throw new Error('反编译源码不包含类名');
      }

      return response;
    });
  }

  // 测试错误处理
  async testErrorHandling() {
    return await this.runTest('错误处理测试', async () => {
      const testCases = [];

      // 测试1: 不存在的pom文件
      try {
        await this.resolver.parsePomDependencies('nonexistent-pom.xml');
        testCases.push({ name: '不存在的pom文件', result: 'FAIL - 应该抛出异常' });
      } catch (error) {
        testCases.push({ name: '不存在的pom文件', result: 'PASS - 正确抛出异常' });
      }

      // 测试2: 不存在的依赖
      try {
        await this.resolver.downloadDependency('com.nonexistent', 'fake-lib', '999.999.999');
        testCases.push({ name: '不存在的依赖', result: 'FAIL - 应该抛出异常' });
      } catch (error) {
        testCases.push({ name: '不存在的依赖', result: 'PASS - 正确抛出异常' });
      }

      // 测试3: 不存在的类
      try {
        const jarPath = await this.resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
        await this.decompiler.decompileClass(jarPath, 'com.nonexistent.FakeClass');
        testCases.push({ name: '不存在的类', result: 'FAIL - 应该抛出异常' });
      } catch (error) {
        testCases.push({ name: '不存在的类', result: 'PASS - 正确抛出异常' });
      }

      console.log('   错误处理测试结果:');
      testCases.forEach(test => {
        console.log(`     ${test.result.startsWith('PASS') ? '✅' : '❌'} ${test.name}: ${test.result}`);
      });

      return testCases;
    });
  }

  // 性能测试
  async testPerformance() {
    return await this.runTest('性能测试', async () => {
      const performanceResults = [];

      // 测试1: pom.xml解析性能
      const startParse = Date.now();
      const dependencies = await this.resolver.parsePomDependencies('pom.xml');
      const parseTime = Date.now() - startParse;
      performanceResults.push({ operation: 'pom.xml解析', time: parseTime, items: dependencies.length });

      // 测试2: JAR下载性能（使用缓存）
      const startDownload = Date.now();
      await this.resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
      const downloadTime = Date.now() - startDownload;
      performanceResults.push({ operation: 'JAR下载(缓存)', time: downloadTime, items: 1 });

      // 测试3: 类搜索性能
      const jarPath = await this.resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
      const startSearch = Date.now();
      const foundClasses = await this.decompiler.searchClassInJar(jarPath, 'String');
      const searchTime = Date.now() - startSearch;
      performanceResults.push({ operation: '类搜索', time: searchTime, items: foundClasses.length });

      console.log('   性能测试结果:');
      performanceResults.forEach(result => {
        console.log(`     📊 ${result.operation}: ${result.time}ms (${result.items} 项)`);
      });

      return performanceResults;
    });
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始运行 MCP 工具测试套件...\n');

    try {
      await this.testListProjectDependencies();
      await this.testSearchClassInDependencies();
      await this.testGetDependencySource();
      await this.testErrorHandling();
      await this.testPerformance();

      console.log('\n📊 测试总结:');
      console.log('='*50);
      
      const passed = this.testResults.filter(r => r.status === 'PASS').length;
      const failed = this.testResults.filter(r => r.status === 'FAIL').length;
      
      console.log(`✅ 通过: ${passed}`);
      console.log(`❌ 失败: ${failed}`);
      console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

      if (failed > 0) {
        console.log('\n❌ 失败的测试:');
        this.testResults
          .filter(r => r.status === 'FAIL')
          .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
      }

      console.log('\n🎉 MCP工具测试完成！');
      
      return { passed, failed, total: passed + failed };

    } catch (error) {
      console.error('\n💥 测试套件执行失败:', error.message);
      throw error;
    }
  }
}

// 运行测试
const mcpTest = new MCPToolsTest();
mcpTest.runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
}); 