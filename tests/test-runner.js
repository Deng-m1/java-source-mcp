#!/usr/bin/env node

// 简单的测试运行器
import { JavaDecompiler } from '../dist/decompiler.js';
import { MavenDependencyResolver } from '../dist/maven-resolver.js';
import { promises as fs } from 'fs';
import path from 'path';

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  addTest(name, testFunc) {
    this.tests.push({ name, testFunc });
  }

  async run() {
    console.log('🚀 开始运行 Java Decompiler MCP 单元测试...\n');
    
    for (const test of this.tests) {
      try {
        console.log(`⏳ 运行测试: ${test.name}`);
        await test.testFunc();
        console.log(`✅ 通过: ${test.name}\n`);
        this.passed++;
      } catch (error) {
        console.log(`❌ 失败: ${test.name}`);
        console.log(`   错误: ${error.message}\n`);
        this.failed++;
      }
    }

    console.log('📊 测试结果统计:');
    console.log(`   ✅ 通过: ${this.passed}`);
    console.log(`   ❌ 失败: ${this.failed}`);
    console.log(`   📈 成功率: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// 断言函数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `期望: ${expected}, 实际: ${actual}`);
  }
}

function assertGreaterThan(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(message || `期望 ${actual} > ${expected}`);
  }
}

function assertContains(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(message || `数组中不包含 ${item}`);
  }
}

// 创建测试实例
const testRunner = new TestRunner();
const resolver = new MavenDependencyResolver();
const decompiler = new JavaDecompiler();

// 测试用例 1: 解析pom.xml基本功能
testRunner.addTest('解析pom.xml基本功能', async () => {
  const dependencies = await resolver.parsePomDependencies('pom.xml');
  
  assertGreaterThan(dependencies.length, 0, 'pom.xml应该包含依赖');
  assertGreaterThan(dependencies.length, 10, '项目应该有超过10个依赖');
  
  // 检查依赖结构
  const firstDep = dependencies[0];
  assert(firstDep.groupId, '依赖应该有groupId');
  assert(firstDep.artifactId, '依赖应该有artifactId');
  assert(firstDep.version, '依赖应该有version');
  
  console.log(`     找到 ${dependencies.length} 个依赖`);
});

// 测试用例 2: 验证特定依赖存在
testRunner.addTest('验证Spring Boot依赖存在', async () => {
  const dependencies = await resolver.parsePomDependencies('pom.xml');
  
  const springBootDeps = dependencies.filter(dep => 
    dep.groupId.includes('springframework') || 
    dep.artifactId.includes('spring')
  );
  
  assertGreaterThan(springBootDeps.length, 0, '应该包含Spring相关依赖');
  console.log(`     找到 ${springBootDeps.length} 个Spring相关依赖`);
});

// 测试用例 3: 验证Maven坐标格式
testRunner.addTest('验证Maven坐标格式', async () => {
  const dependencies = await resolver.parsePomDependencies('pom.xml');
  
  for (const dep of dependencies.slice(0, 5)) { // 检查前5个依赖
    // 检查groupId格式
    assert(dep.groupId.match(/^[a-zA-Z0-9._-]+$/), `无效的groupId格式: ${dep.groupId}`);
    
    // 检查artifactId格式
    assert(dep.artifactId.match(/^[a-zA-Z0-9._-]+$/), `无效的artifactId格式: ${dep.artifactId}`);
    
    // 检查version格式
    assert(dep.version.match(/^[a-zA-Z0-9._-]+$/), `无效的version格式: ${dep.version}`);
  }
  
  console.log('     前5个依赖的Maven坐标格式验证通过');
});

// 测试用例 4: 下载常见依赖
testRunner.addTest('下载Apache Commons Lang依赖', async () => {
  const jarPath = await resolver.downloadDependency(
    'org.apache.commons', 
    'commons-lang3', 
    '3.6'
  );
  
  assert(jarPath, '应该返回JAR文件路径');
  
  // 检查文件是否存在
  const exists = await fs.access(jarPath).then(() => true).catch(() => false);
  assert(exists, `JAR文件应该存在: ${jarPath}`);
  
  // 检查文件大小
  const stats = await fs.stat(jarPath);
  assertGreaterThan(stats.size, 1000, 'JAR文件大小应该大于1KB');
  
  console.log(`     成功下载到: ${path.basename(jarPath)} (${stats.size} bytes)`);
});

// 测试用例 5: 在JAR中搜索类
testRunner.addTest('在JAR中搜索StringUtils类', async () => {
  const jarPath = await resolver.downloadDependency(
    'org.apache.commons', 
    'commons-lang3', 
    '3.6'
  );
  
  const foundClasses = await decompiler.searchClassInJar(jarPath, 'StringUtils');
  
  assertGreaterThan(foundClasses.length, 0, '应该找到StringUtils相关的类');
  assertContains(foundClasses, 'org.apache.commons.lang3.StringUtils', '应该包含StringUtils类');
  
  console.log(`     找到 ${foundClasses.length} 个匹配的类`);
});

// 测试用例 6: 反编译类文件
testRunner.addTest('反编译StringUtils类', async () => {
  const jarPath = await resolver.downloadDependency(
    'org.apache.commons', 
    'commons-lang3', 
    '3.6'
  );
  
  const sourceCode = await decompiler.decompileClass(jarPath, 'org.apache.commons.lang3.StringUtils');
  
  assert(sourceCode, '应该返回反编译的源码');
  assert(sourceCode.includes('StringUtils'), '源码应该包含类名');
  assert(sourceCode.includes('// 反编译的Java类'), '应该包含注释标识');
  
  console.log(`     生成源码长度: ${sourceCode.length} 字符`);
});

// 测试用例 7: 处理不存在的类
testRunner.addTest('处理不存在的类', async () => {
  const jarPath = await resolver.downloadDependency(
    'org.apache.commons', 
    'commons-lang3', 
    '3.6'
  );
  
  try {
    await decompiler.decompileClass(jarPath, 'com.nonexistent.FakeClass');
    throw new Error('应该抛出异常');
  } catch (error) {
    assert(error.message.includes('未找到类'), '应该提示类不存在');
    console.log(`     正确处理了不存在的类错误`);
  }
});

// 测试用例 8: 测试项目实际依赖
testRunner.addTest('测试项目实际依赖 - MyBatis', async () => {
  const dependencies = await resolver.parsePomDependencies('pom.xml');
  
  const mybatisDep = dependencies.find(dep => 
    dep.artifactId.includes('mybatis')
  );
  
  if (mybatisDep) {
    console.log(`     找到MyBatis依赖: ${mybatisDep.groupId}:${mybatisDep.artifactId}:${mybatisDep.version}`);
    
    // 尝试下载这个依赖
    const jarPath = await resolver.downloadDependency(
      mybatisDep.groupId,
      mybatisDep.artifactId,
      mybatisDep.version
    );
    
    assert(jarPath, '应该能够下载MyBatis依赖');
    console.log(`     成功下载MyBatis JAR`);
  } else {
    console.log(`     项目中未找到MyBatis依赖，跳过测试`);
  }
});

// 测试用例 9: 测试项目实际依赖 - Spring Boot
testRunner.addTest('测试项目实际依赖 - Spring Boot', async () => {
  const dependencies = await resolver.parsePomDependencies('pom.xml');
  
  const springBootDep = dependencies.find(dep => 
    dep.groupId.includes('springframework.boot')
  );
  
  if (springBootDep) {
    console.log(`     找到Spring Boot依赖: ${springBootDep.groupId}:${springBootDep.artifactId}:${springBootDep.version}`);
    
    // 搜索Spring相关的类
    const jarPath = await resolver.downloadDependency(
      springBootDep.groupId,
      springBootDep.artifactId,
      springBootDep.version
    );
    
    const springClasses = await decompiler.searchClassInJar(jarPath, 'Application');
    console.log(`     在Spring Boot JAR中找到 ${springClasses.length} 个Application相关类`);
  } else {
    console.log(`     项目中未找到Spring Boot依赖，跳过测试`);
  }
});

// 测试用例 10: 缓存机制测试
testRunner.addTest('JAR文件缓存机制', async () => {
  const groupId = 'org.apache.commons';
  const artifactId = 'commons-lang3';
  const version = '3.6';
  
  // 第一次下载
  const startTime1 = Date.now();
  const jarPath1 = await resolver.downloadDependency(groupId, artifactId, version);
  const downloadTime1 = Date.now() - startTime1;
  
  // 第二次下载（应该使用缓存）
  const startTime2 = Date.now();
  const jarPath2 = await resolver.downloadDependency(groupId, artifactId, version);
  const downloadTime2 = Date.now() - startTime2;
  
  assertEqual(jarPath1, jarPath2, '两次下载应该返回相同的路径');
  assert(downloadTime2 < downloadTime1, '第二次下载应该更快（使用缓存）');
  
  console.log(`     第一次下载: ${downloadTime1}ms, 第二次下载: ${downloadTime2}ms`);
});

// 运行所有测试
testRunner.run().catch(console.error); 