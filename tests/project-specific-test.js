#!/usr/bin/env node

// 针对项目特定依赖的测试
import { JavaDecompiler } from '../dist/decompiler.js';
import { MavenDependencyResolver } from '../dist/maven-resolver.js';

class ProjectSpecificTest {
  constructor() {
    this.resolver = new MavenDependencyResolver();
    this.decompiler = new JavaDecompiler();
    this.projectDependencies = [];
  }

  async init() {
    console.log('🔍 解析项目依赖...');
    this.projectDependencies = await this.resolver.parsePomDependencies('pom.xml');
    console.log(`📦 找到 ${this.projectDependencies.length} 个项目依赖\n`);
  }

  // 测试Spring Boot相关功能
  async testSpringBootDependencies() {
    console.log('🌱 测试Spring Boot相关依赖...');
    
    const springDeps = this.projectDependencies.filter(dep => 
      dep.groupId.includes('springframework') || 
      dep.artifactId.includes('spring')
    );

    if (springDeps.length === 0) {
      console.log('⚠️  项目中未找到Spring依赖，跳过测试\n');
      return;
    }

    console.log(`   找到 ${springDeps.length} 个Spring相关依赖:`);
    springDeps.forEach(dep => {
      console.log(`   - ${dep.groupId}:${dep.artifactId}:${dep.version}`);
    });

    // 测试Spring Boot Starter Web
    const webStarter = springDeps.find(dep => dep.artifactId.includes('spring-boot-starter-web'));
    if (webStarter) {
      try {
        const jarPath = await this.resolver.downloadDependency(
          webStarter.groupId, webStarter.artifactId, webStarter.version
        );
        console.log(`   ✅ 成功下载: ${webStarter.artifactId}`);
      } catch (error) {
        console.log(`   ❌ 下载失败: ${webStarter.artifactId} - ${error.message}`);
      }
    }

    console.log('');
  }

  // 测试MyBatis相关功能
  async testMyBatisDependencies() {
    console.log('🗄️  测试MyBatis相关依赖...');
    
    const mybatisDeps = this.projectDependencies.filter(dep => 
      dep.artifactId.includes('mybatis')
    );

    if (mybatisDeps.length === 0) {
      console.log('⚠️  项目中未找到MyBatis依赖，跳过测试\n');
      return;
    }

    for (const dep of mybatisDeps) {
      console.log(`   测试依赖: ${dep.groupId}:${dep.artifactId}:${dep.version}`);
      
      try {
        const jarPath = await this.resolver.downloadDependency(
          dep.groupId, dep.artifactId, dep.version
        );
        
        // 搜索MyBatis核心类
        const mapperClasses = await this.decompiler.searchClassInJar(jarPath, 'Mapper');
        console.log(`     找到 ${mapperClasses.length} 个Mapper相关类`);
        
        if (mapperClasses.length > 0) {
          console.log(`     示例类: ${mapperClasses[0]}`);
        }
        
      } catch (error) {
        console.log(`     ❌ 处理失败: ${error.message}`);
      }
    }

    console.log('');
  }

  // 测试数据库相关依赖
  async testDatabaseDependencies() {
    console.log('🗃️  测试数据库相关依赖...');
    
    const dbDeps = this.projectDependencies.filter(dep => 
      dep.artifactId.includes('mysql') || 
      dep.artifactId.includes('druid') ||
      dep.artifactId.includes('jdbc')
    );

    if (dbDeps.length === 0) {
      console.log('⚠️  项目中未找到数据库依赖，跳过测试\n');
      return;
    }

    for (const dep of dbDeps) {
      console.log(`   测试依赖: ${dep.groupId}:${dep.artifactId}:${dep.version}`);
      
      try {
        const jarPath = await this.resolver.downloadDependency(
          dep.groupId, dep.artifactId, dep.version
        );
        
        // 搜索数据源相关类
        const dataSourceClasses = await this.decompiler.searchClassInJar(jarPath, 'DataSource');
        console.log(`     找到 ${dataSourceClasses.length} 个DataSource相关类`);
        
      } catch (error) {
        console.log(`     ❌ 处理失败: ${error.message}`);
      }
    }

    console.log('');
  }

  // 测试Elasticsearch相关依赖
  async testElasticsearchDependencies() {
    console.log('🔍 测试Elasticsearch相关依赖...');
    
    const esDeps = this.projectDependencies.filter(dep => 
      dep.artifactId.includes('elasticsearch')
    );

    if (esDeps.length === 0) {
      console.log('⚠️  项目中未找到Elasticsearch依赖，跳过测试\n');
      return;
    }

    for (const dep of esDeps.slice(0, 2)) { // 只测试前2个以节省时间
      console.log(`   测试依赖: ${dep.groupId}:${dep.artifactId}:${dep.version}`);
      
      try {
        const jarPath = await this.resolver.downloadDependency(
          dep.groupId, dep.artifactId, dep.version
        );
        
        // 搜索客户端相关类
        const clientClasses = await this.decompiler.searchClassInJar(jarPath, 'Client');
        console.log(`     找到 ${clientClasses.length} 个Client相关类`);
        
        if (clientClasses.length > 0) {
          // 尝试反编译一个客户端类
          const sampleClient = clientClasses.find(c => c.includes('RestClient'));
          if (sampleClient) {
            const sourceCode = await this.decompiler.decompileClass(jarPath, sampleClient);
            console.log(`     成功反编译: ${sampleClient} (${sourceCode.length} 字符)`);
          }
        }
        
      } catch (error) {
        console.log(`     ❌ 处理失败: ${error.message}`);
      }
    }

    console.log('');
  }

  // 测试常用工具类依赖
  async testUtilityDependencies() {
    console.log('🛠️  测试常用工具类依赖...');
    
    const utilDeps = this.projectDependencies.filter(dep => 
      dep.artifactId.includes('commons') ||
      dep.artifactId.includes('guava') ||
      dep.artifactId.includes('hutool') ||
      dep.artifactId.includes('fastjson')
    );

    for (const dep of utilDeps.slice(0, 3)) { // 测试前3个
      console.log(`   测试依赖: ${dep.groupId}:${dep.artifactId}:${dep.version}`);
      
      try {
        const jarPath = await this.resolver.downloadDependency(
          dep.groupId, dep.artifactId, dep.version
        );
        
        // 搜索Utils相关类
        const utilClasses = await this.decompiler.searchClassInJar(jarPath, 'Utils');
        console.log(`     找到 ${utilClasses.length} 个Utils相关类`);
        
        if (utilClasses.length > 0) {
          console.log(`     示例: ${utilClasses.slice(0, 3).join(', ')}`);
        }
        
      } catch (error) {
        console.log(`     ❌ 处理失败: ${error.message}`);
      }
    }

    console.log('');
  }

  // 生成项目依赖报告
  async generateDependencyReport() {
    console.log('📊 生成项目依赖分析报告...');
    
    const categories = {
      spring: this.projectDependencies.filter(dep => 
        dep.groupId.includes('springframework') || dep.artifactId.includes('spring')
      ),
      database: this.projectDependencies.filter(dep => 
        dep.artifactId.includes('mysql') || dep.artifactId.includes('mybatis') || 
        dep.artifactId.includes('druid') || dep.artifactId.includes('jdbc')
      ),
      elasticsearch: this.projectDependencies.filter(dep => 
        dep.artifactId.includes('elasticsearch')
      ),
      utils: this.projectDependencies.filter(dep => 
        dep.artifactId.includes('commons') || dep.artifactId.includes('guava') || 
        dep.artifactId.includes('hutool') || dep.artifactId.includes('fastjson')
      ),
      web: this.projectDependencies.filter(dep => 
        dep.artifactId.includes('web') || dep.artifactId.includes('http') || 
        dep.artifactId.includes('feign')
      ),
      other: []
    };

    // 计算未分类的依赖
    const categorized = new Set([
      ...categories.spring, ...categories.database, ...categories.elasticsearch,
      ...categories.utils, ...categories.web
    ]);
    categories.other = this.projectDependencies.filter(dep => !categorized.has(dep));

    console.log('\n📋 依赖分类统计:');
    console.log('=' * 40);
    Object.entries(categories).forEach(([category, deps]) => {
      console.log(`${category.toUpperCase().padEnd(15)}: ${deps.length} 个依赖`);
    });

    console.log('\n🔍 关键依赖详情:');
    console.log('-' * 40);
    
    // 显示主要依赖的详细信息
    const keyDependencies = [
      ...categories.spring.slice(0, 3),
      ...categories.database.slice(0, 2),
      ...categories.elasticsearch.slice(0, 2)
    ];

    keyDependencies.forEach(dep => {
      console.log(`📦 ${dep.groupId}:${dep.artifactId}:${dep.version}`);
    });

    return categories;
  }

  // 运行所有项目特定测试
  async runAllTests() {
    console.log('🚀 开始运行项目特定依赖测试...\n');
    
    try {
      await this.init();
      
      await this.testSpringBootDependencies();
      await this.testMyBatisDependencies();
      await this.testDatabaseDependencies();
      await this.testElasticsearchDependencies();
      await this.testUtilityDependencies();
      
      const report = await this.generateDependencyReport();
      
      console.log('\n🎉 项目特定测试完成！');
      console.log(`总共测试了 ${this.projectDependencies.length} 个依赖`);
      
      return report;
      
    } catch (error) {
      console.error('💥 项目测试失败:', error.message);
      throw error;
    }
  }
}

// 运行测试
const projectTest = new ProjectSpecificTest();
projectTest.runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
}); 