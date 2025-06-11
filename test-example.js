#!/usr/bin/env node

// 这是一个简单的测试脚本，用于验证MCP插件是否能够正常工作
// 运行方式: node test-example.js

import { JavaDecompiler } from './dist/decompiler.js';
import { MavenDependencyResolver } from './dist/maven-resolver.js';

async function testMCPPlugin() {
  console.log('开始测试 Java Decompiler MCP 插件...');
  
  try {
    const resolver = new MavenDependencyResolver();
    const decompiler = new JavaDecompiler();
    
    // 测试1: 解析当前项目的pom.xml
    console.log('\n1. 测试解析pom.xml...');
    try {
      const dependencies = await resolver.parsePomDependencies('../pom.xml');
      console.log(`✓ 成功解析到 ${dependencies.length} 个依赖`);
      console.log('前5个依赖:');
      dependencies.slice(0, 5).forEach((dep, index) => {
        console.log(`  ${index + 1}. ${dep.groupId}:${dep.artifactId}:${dep.version}`);
      });
    } catch (error) {
      console.log(`✗ 解析pom.xml失败: ${error.message}`);
    }
    
    // 测试2: 下载一个常见的依赖
    console.log('\n2. 测试下载依赖...');
    try {
      const jarPath = await resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
      console.log(`✓ 成功下载依赖到: ${jarPath}`);
    } catch (error) {
      console.log(`✗ 下载依赖失败: ${error.message}`);
    }
    
    // 测试3: 搜索类
    console.log('\n3. 测试搜索类...');
    try {
      const jarPath = await resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
      const foundClasses = await decompiler.searchClassInJar(jarPath, 'StringUtils');
      console.log(`✓ 找到 ${foundClasses.length} 个匹配的类:`);
      foundClasses.forEach((className, index) => {
        console.log(`  ${index + 1}. ${className}`);
      });
    } catch (error) {
      console.log(`✗ 搜索类失败: ${error.message}`);
    }
    
    // 测试4: 反编译类
    console.log('\n4. 测试反编译类...');
    try {
      const jarPath = await resolver.downloadDependency('org.apache.commons', 'commons-lang3', '3.6');
      const sourceCode = await decompiler.decompileClass(jarPath, 'org.apache.commons.lang3.StringUtils');
      console.log('✓ 成功反编译类 (显示前200个字符):');
      console.log(sourceCode.substring(0, 200) + '...');
    } catch (error) {
      console.log(`✗ 反编译类失败: ${error.message}`);
    }
    
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testMCPPlugin().catch(console.error); 