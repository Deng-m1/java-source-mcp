#!/usr/bin/env node

import { GlobalMavenService } from './dist/global-maven-service.js';

async function testLangchain4j() {
  console.log('🧪 测试langchain4j源码搜索...\n');
  
  const service = new GlobalMavenService();
  
  try {
    // 1. 初始化服务
    console.log('🚀 初始化全局Maven服务...');
    await service.initialize();
    
    // 2. 获取Maven配置
    console.log('\n📋 Maven配置信息:');
    const config = await service.getMavenConfig();
    console.log(`  本地仓库: ${config.localRepository}`);
    console.log(`  远程仓库: ${config.repositories.length} 个`);
    
    // 3. 搜索langchain4j相关的类
    console.log('\n🔍 搜索langchain4j相关的类...');
    const searchResults = await service.searchClass('langchain4j');
    
    if (searchResults.length === 0) {
      console.log('❌ 未找到langchain4j相关的类');
      console.log('💡 可能的原因:');
      console.log('   1. langchain4j依赖未下载到本地仓库');
      console.log('   2. 尝试搜索更具体的类名，如: "ChatLanguageModel", "EmbeddingModel"');
      
      // 尝试搜索一些常见的langchain4j类名
      console.log('\n🔍 尝试搜索ChatLanguageModel...');
      const chatResults = await service.searchClass('ChatLanguageModel');
      
      if (chatResults.length > 0) {
        console.log(`✅ 找到 ${chatResults.length} 个ChatLanguageModel相关的类:`);
        chatResults.slice(0, 5).forEach(result => {
          console.log(`  - ${result.fullClassName} (${result.dependency.groupId}:${result.dependency.artifactId}:${result.dependency.version})`);
        });
      }
      
      return;
    }
    
    console.log(`✅ 找到 ${searchResults.length} 个langchain4j相关的类:`);
    searchResults.slice(0, 10).forEach(result => {
      console.log(`  - ${result.fullClassName}`);
      console.log(`    依赖: ${result.dependency.groupId}:${result.dependency.artifactId}:${result.dependency.version}`);
      console.log(`    源码类型: ${result.sourceType}`);
      console.log('');
    });
    
    // 4. 尝试获取第一个类的源码
    if (searchResults.length > 0) {
      const firstResult = searchResults[0];
      console.log(`\n📖 获取 ${firstResult.fullClassName} 的源码...\n`);
      
      try {
        const sourceCode = await service.getClassSource(
          firstResult.dependency.groupId,
          firstResult.dependency.artifactId,
          firstResult.dependency.version,
          firstResult.fullClassName
        );
        
        console.log('✅ 源码获取成功!');
        console.log(`源码长度: ${sourceCode.length} 字符`);
        console.log('\n--- 源码预览 (前500字符) ---');
        console.log(sourceCode.substring(0, 500));
        if (sourceCode.length > 500) {
          console.log('\n... (源码太长，已截断) ...');
        }
        console.log('\n--- 源码预览结束 ---');
        
      } catch (error) {
        console.log(`❌ 源码获取失败: ${error.message}`);
      }
    }
    
    // 5. 尝试搜索一些常见的langchain4j接口和类
    console.log('\n🔍 搜索常见的langchain4j组件...');
    const commonClasses = ['ChatLanguageModel', 'EmbeddingModel', 'TokenizerType', 'AiServices'];
    
    for (const className of commonClasses) {
      console.log(`\n查找 ${className}...`);
      const results = await service.searchClass(className);
      if (results.length > 0) {
        console.log(`  ✅ 找到 ${results.length} 个相关类`);
        results.slice(0, 3).forEach(result => {
          console.log(`    - ${result.fullClassName} (${result.dependency.artifactId})`);
        });
      } else {
        console.log(`  ❌ 未找到 ${className}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testLangchain4j().catch(console.error); 