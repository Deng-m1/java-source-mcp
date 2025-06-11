#!/usr/bin/env node

import { GlobalMavenService } from './dist/global-maven-service.js';

async function testEnhancedFeatures() {
  console.log('🧪 测试增强功能...\n');
  
  const service = new GlobalMavenService();
  
  try {
    // 1. 测试初始化（包括settings.xml读取和仓库验证）
    console.log('=== 测试1: 初始化和配置验证 ===');
    await service.initialize();
    
    // 2. 测试Maven配置获取
    console.log('\n=== 测试2: Maven配置获取 ===');
    const config = await service.getMavenConfig();
    console.log(`✅ 本地仓库: ${config.localRepository}`);
    console.log(`✅ 远程仓库: ${config.repositories.length} 个`);
    
    // 3. 测试仓库树形结构
    console.log('\n=== 测试3: 仓库树形结构 ===');
    const trees = service.getRepositoryTree();
    console.log(`✅ 发现 ${trees.length} 个groupId`);
    
    if (trees.length > 0) {
      const firstTree = trees[0];
      console.log(`📋 示例GroupId: ${firstTree.groupId}`);
      const artifactCount = Object.keys(firstTree.artifacts).length;
      console.log(`📋 包含 ${artifactCount} 个artifact`);
      
      if (artifactCount > 0) {
        const firstArtifact = Object.keys(firstTree.artifacts)[0];
        const artifactInfo = firstTree.artifacts[firstArtifact];
        console.log(`📋 示例Artifact: ${firstArtifact}`);
        console.log(`📋 版本: ${artifactInfo.versions.length} 个 (最新: ${artifactInfo.latestVersion})`);
      }
    }
    
    // 4. 测试依赖搜索
    console.log('\n=== 测试4: 依赖搜索 ===');
    
    // 搜索常见的依赖关键词
    const searchKeywords = ['spring', 'apache', 'commons', 'slf4j', 'junit'];
    
    for (const keyword of searchKeywords) {
      console.log(`\n🔍 搜索 "${keyword}"`);
      const searchResults = service.searchDependencies(keyword);
      console.log(`  找到 ${searchResults.length} 个匹配的依赖`);
      
      if (searchResults.length > 0) {
        // 显示前3个结果
        searchResults.slice(0, 3).forEach(result => {
          console.log(`    - ${result.groupId}:${result.artifactId} (${result.versions.length} 个版本)`);
        });
      }
    }
    
    // 5. 测试特定groupId的仓库结构
    console.log('\n=== 测试5: 特定GroupId结构 ===');
    const springResults = service.searchDependencies('spring');
    if (springResults.length > 0) {
      const springGroupId = springResults[0].groupId;
      console.log(`\n🌳 获取 ${springGroupId} 的结构`);
      const tree = service.getRepositoryTreeByGroupId(springGroupId);
      if (tree) {
        console.log(`✅ 找到 ${Object.keys(tree.artifacts).length} 个artifact`);
        Object.entries(tree.artifacts).slice(0, 5).forEach(([artifactId, info]) => {
          console.log(`  - ${artifactId}: ${info.versions.length} 个版本 (最新: ${info.latestVersion})`);
        });
      }
    }
    
    // 6. 测试依赖结构分析
    console.log('\n=== 测试6: 依赖结构分析 ===');
    
    // 查找一个具体的依赖进行详细分析
    const commonsResults = service.searchDependencies('commons');
    if (commonsResults.length > 0) {
      const dependency = commonsResults[0];
      const latestVersion = dependency.versions[dependency.versions.length - 1];
      
      console.log(`\n📁 分析依赖: ${dependency.groupId}:${dependency.artifactId}:${latestVersion}`);
      
      try {
        const structure = await service.getDependencyStructure(
          dependency.groupId,
          dependency.artifactId,
          latestVersion
        );
        
        console.log(`✅ 依赖结构分析完成:`);
        console.log(`  - JAR文件: ${structure.jarFiles.length} 个`);
        console.log(`  - 包: ${structure.packages.length} 个`);
        console.log(`  - 类: ${structure.classes.length} 个`);
        console.log(`  - 有源码: ${structure.hasSource ? '是' : '否'}`);
        
        if (structure.packages.length > 0) {
          console.log(`  主要包:`);
          structure.packages.slice(0, 5).forEach(pkg => {
            console.log(`    - ${pkg}`);
          });
        }
        
        if (structure.classes.length > 0) {
          console.log(`  主要类:`);
          structure.classes.slice(0, 10).forEach(cls => {
            console.log(`    - ${cls}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ 依赖结构分析失败: ${error.message}`);
      }
    }
    
    // 7. 测试langchain4j搜索（如果存在）
    console.log('\n=== 测试7: Langchain4j搜索 ===');
    const langchainResults = service.searchDependencies('langchain4j');
    if (langchainResults.length > 0) {
      console.log(`✅ 找到 ${langchainResults.length} 个langchain4j相关依赖:`);
      langchainResults.forEach(result => {
        console.log(`  - ${result.groupId}:${result.artifactId} (${result.versions.length} 个版本)`);
      });
      
      // 尝试分析第一个langchain4j依赖
      const first = langchainResults[0];
      const version = first.versions[first.versions.length - 1];
      
      try {
        console.log(`\n📖 分析 ${first.groupId}:${first.artifactId}:${version} 的结构...`);
        const structure = await service.getDependencyStructure(first.groupId, first.artifactId, version);
        
        console.log(`✅ Langchain4j结构:`);
        console.log(`  - 类: ${structure.classes.length} 个`);
        console.log(`  - 包: ${structure.packages.length} 个`);
        
        // 查找常见的langchain4j接口
        const importantClasses = structure.classes.filter(cls => 
          cls.includes('ChatLanguageModel') || 
          cls.includes('EmbeddingModel') || 
          cls.includes('AiServices') ||
          cls.includes('TokenizerType')
        );
        
        if (importantClasses.length > 0) {
          console.log(`  重要接口/类:`);
          importantClasses.forEach(cls => {
            console.log(`    - ${cls}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Langchain4j分析失败: ${error.message}`);
      }
    } else {
      console.log('❌ 未找到langchain4j相关依赖');
      console.log('💡 提示: 请确保已下载langchain4j依赖到本地仓库');
    }
    
    // 8. 性能统计
    console.log('\n=== 测试8: 性能统计 ===');
    console.log(`✅ 仓库扫描完成，缓存了 ${trees.length} 个groupId的结构`);
    
    let totalArtifacts = 0;
    let totalVersions = 0;
    trees.forEach(tree => {
      const artifacts = Object.keys(tree.artifacts).length;
      totalArtifacts += artifacts;
      Object.values(tree.artifacts).forEach(info => {
        totalVersions += info.versions.length;
      });
    });
    
    console.log(`📊 统计信息:`);
    console.log(`  - 总GroupId: ${trees.length} 个`);
    console.log(`  - 总Artifact: ${totalArtifacts} 个`);
    console.log(`  - 总版本: ${totalVersions} 个`);
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testEnhancedFeatures().catch(console.error); 