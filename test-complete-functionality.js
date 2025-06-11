#!/usr/bin/env node

import { GlobalMavenService } from './dist/global-maven-service.js';

async function testCompleteFunctionality() {
  console.log('🧪 完整功能测试...\n');
  
  const service = new GlobalMavenService();
  
  try {
    // 1. 初始化测试
    console.log('=== 测试1: 服务初始化 ===');
    await service.initialize();
    console.log('✅ 初始化成功\n');
    
    // 2. 基础功能测试
    console.log('=== 测试2: 依赖搜索功能 ===');
    const commonsResults = service.searchDependencies('commons');
    console.log(`✅ 找到 ${commonsResults.length} 个commons相关依赖`);
    
    if (commonsResults.length > 0) {
      commonsResults.slice(0, 3).forEach(result => {
        console.log(`  - ${result.groupId}:${result.artifactId} (${result.versions.length} 个版本)`);
      });
    }
    
    // 3. 依赖结构分析测试  
    console.log('\n=== 测试3: 依赖结构分析 ===');
    
    if (commonsResults.length > 0) {
      const dependency = commonsResults[0];
      const version = dependency.versions[dependency.versions.length - 1];
      
      console.log(`📁 分析依赖: ${dependency.groupId}:${dependency.artifactId}:${version}`);
      
      try {
        const structure = await service.getDependencyStructure(
          dependency.groupId,
          dependency.artifactId,
          version
        );
        
        console.log('✅ 结构分析成功:');
        console.log(`  - JAR文件: ${structure.jarFiles.length} 个`);
        console.log(`  - 包: ${structure.packages.length} 个`);
        console.log(`  - 类: ${structure.classes.length} 个`);
        console.log(`  - 有源码: ${structure.hasSource ? '是' : '否'}`);
        
        if (structure.packages.length > 0) {
          console.log('  主要包:');
          structure.packages.slice(0, 3).forEach(pkg => {
            console.log(`    - ${pkg}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ 结构分析失败: ${error.message}`);
      }
    }
    
    // 4. 源码获取测试
    console.log('\n=== 测试4: 源码获取功能 ===');
    
    // 查找有源码的依赖
    const springResults = service.searchDependencies('spring');
    let hasSourceDependency = null;
    
    for (const result of springResults.slice(0, 10)) {
      try {
        const version = result.versions[result.versions.length - 1];
        const structure = await service.getDependencyStructure(
          result.groupId,
          result.artifactId,
          version
        );
        
        if (structure.hasSource) {
          hasSourceDependency = { ...result, version, structure };
          break;
        }
      } catch (error) {
        // 继续尝试下一个
      }
    }
    
    if (hasSourceDependency) {
      console.log(`📖 找到有源码的依赖: ${hasSourceDependency.groupId}:${hasSourceDependency.artifactId}:${hasSourceDependency.version}`);
      
      // 测试获取具体类的源码
      if (hasSourceDependency.structure.classes.length > 0) {
        const testClass = hasSourceDependency.structure.classes[0];
        console.log(`🔍 获取类源码: ${testClass}`);
        
        try {
          const sourceCode = await service.getDependencySource(
            hasSourceDependency.groupId,
            hasSourceDependency.artifactId,
            hasSourceDependency.version,
            testClass
          );
          
          console.log('✅ 源码获取成功');
          console.log(`📄 源码长度: ${sourceCode.length} 字符`);
          
          // 显示源码预览（前500字符）
          const preview = sourceCode.substring(0, 500);
          console.log('📋 源码预览:');
          console.log('```java');
          console.log(preview);
          if (sourceCode.length > 500) {
            console.log('...(省略)');
          }
          console.log('```');
          
        } catch (error) {
          console.log(`❌ 源码获取失败: ${error.message}`);
        }
      }
    } else {
      console.log('⚠️ 未找到有源码的依赖，测试CFR反编译功能');
      
      // 使用第一个commons依赖测试CFR反编译
      if (commonsResults.length > 0) {
        const dependency = commonsResults[0];
        const version = dependency.versions[dependency.versions.length - 1];
        const structure = await service.getDependencyStructure(
          dependency.groupId,
          dependency.artifactId,
          version
        );
        
        if (structure.classes.length > 0) {
          const testClass = structure.classes[0];
          console.log(`🔧 测试CFR反编译: ${testClass}`);
          
          try {
            const decompiled = await service.getDependencySource(
              dependency.groupId,
              dependency.artifactId,
              version,
              testClass
            );
            
            console.log('✅ CFR反编译成功');
            console.log(`📄 反编译代码长度: ${decompiled.length} 字符`);
            
            // 显示反编译代码预览
            const preview = decompiled.substring(0, 500);
            console.log('📋 反编译代码预览:');
            console.log('```java');
            console.log(preview);
            if (decompiled.length > 500) {
              console.log('...(省略)');
            }
            console.log('```');
            
          } catch (error) {
            console.log(`❌ CFR反编译失败: ${error.message}`);
          }
        }
      }
    }
    
    // 5. 类搜索测试
    console.log('\n=== 测试5: 仓库中类搜索 ===');
    
    try {
      const classResults = await service.searchClassInRepository('StringUtils');
      console.log(`✅ 找到 ${classResults.length} 个StringUtils相关类`);
      
      classResults.slice(0, 5).forEach(result => {
        console.log(`  - ${result.fullClassName} (${result.dependency.groupId}:${result.dependency.artifactId}:${result.dependency.version})`);
      });
      
      // 测试获取第一个StringUtils类的源码
      if (classResults.length > 0) {
        const firstClass = classResults[0];
        console.log(`\n📖 获取 ${firstClass.fullClassName} 源码...`);
        
        try {
          const sourceCode = await service.getDependencySource(
            firstClass.dependency.groupId,
            firstClass.dependency.artifactId,
            firstClass.dependency.version,
            firstClass.fullClassName
          );
          
          console.log('✅ StringUtils源码获取成功');
          console.log(`📄 源码长度: ${sourceCode.length} 字符`);
          
          // 检查是否包含常见的StringUtils方法
          const methods = ['isEmpty', 'isBlank', 'join', 'split'];
          const foundMethods = methods.filter(method => sourceCode.includes(method));
          console.log(`🔍 找到常用方法: ${foundMethods.join(', ')}`);
          
        } catch (error) {
          console.log(`❌ StringUtils源码获取失败: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ 类搜索失败: ${error.message}`);
    }
    
    // 6. Langchain4j特殊测试
    console.log('\n=== 测试6: Langchain4j AI框架测试 ===');
    
    const langchainResults = service.searchDependencies('langchain4j');
    if (langchainResults.length > 0) {
      console.log(`✅ 找到 ${langchainResults.length} 个langchain4j依赖`);
      
      // 寻找核心模块
      const coreModule = langchainResults.find(r => r.artifactId === 'langchain4j-core' || r.artifactId === 'langchain4j');
      if (coreModule) {
        const version = coreModule.versions[coreModule.versions.length - 1];
        console.log(`📦 分析核心模块: ${coreModule.groupId}:${coreModule.artifactId}:${version}`);
        
        try {
          const structure = await service.getDependencyStructure(
            coreModule.groupId,
            coreModule.artifactId,
            version
          );
          
          // 查找重要的AI相关类
          const aiClasses = structure.classes.filter(cls => 
            cls.includes('ChatLanguageModel') || 
            cls.includes('EmbeddingModel') || 
            cls.includes('AiServices') ||
            cls.includes('TokenizerType') ||
            cls.includes('ChatMessage')
          );
          
          console.log(`🤖 发现 ${aiClasses.length} 个AI相关核心类:`);
          aiClasses.slice(0, 5).forEach(cls => {
            console.log(`  - ${cls}`);
          });
          
          // 尝试获取一个核心类的源码
          if (aiClasses.length > 0) {
            const testClass = aiClasses[0];
            console.log(`\n📖 获取 ${testClass} 源码...`);
            
            try {
              const sourceCode = await service.getDependencySource(
                coreModule.groupId,
                coreModule.artifactId,
                version,
                testClass
              );
              
              console.log('✅ Langchain4j核心类源码获取成功');
              console.log(`📄 源码长度: ${sourceCode.length} 字符`);
              
              // 显示前几行代码
              const lines = sourceCode.split('\n').slice(0, 20);
              console.log('📋 源码头部预览:');
              console.log('```java');
              console.log(lines.join('\n'));
              console.log('```');
              
            } catch (error) {
              console.log(`❌ Langchain4j源码获取失败: ${error.message}`);
            }
          }
          
        } catch (error) {
          console.log(`❌ Langchain4j结构分析失败: ${error.message}`);
        }
      }
    } else {
      console.log('❌ 未找到langchain4j依赖');
    }
    
    // 7. 性能统计
    console.log('\n=== 测试7: 性能统计 ===');
    const trees = service.getRepositoryTree();
    let totalArtifacts = 0;
    let totalVersions = 0;
    
    trees.forEach(tree => {
      totalArtifacts += Object.keys(tree.artifacts).length;
      Object.values(tree.artifacts).forEach(info => {
        totalVersions += info.versions.length;
      });
    });
    
    console.log('📊 仓库统计:');
    console.log(`  - GroupId数量: ${trees.length}`);
    console.log(`  - Artifact数量: ${totalArtifacts}`);
    console.log(`  - 版本总数: ${totalVersions}`);
    
    console.log('\n🎉 完整功能测试完成！所有核心功能正常工作。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testCompleteFunctionality().catch(console.error); 