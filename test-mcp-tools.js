#!/usr/bin/env node

import { spawn } from 'node:child_process';

// MCP工具测试
async function testMCPTools() {
  console.log('🧪 测试MCP工具...\n');
  
  const tests = [
    {
      name: '扫描本地仓库',
      tool: 'scan_local_repository',
      args: { random_string: 'test' }
    },
    {
      name: '获取Maven配置',
      tool: 'get_maven_config',
      args: { random_string: 'test' }
    },
    {
      name: '获取仓库树形结构',
      tool: 'get_repository_tree',
      args: {}
    },
    {
      name: '搜索Spring依赖',
      tool: 'search_dependencies',
      args: { keyword: 'spring' }
    },
    {
      name: '搜索Commons依赖',
      tool: 'search_dependencies',
      args: { keyword: 'commons' }
    },
    {
      name: '搜索Langchain4j依赖',
      tool: 'search_dependencies',
      args: { keyword: 'langchain4j' }
    }
  ];
  
  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    
    try {
      const result = await callMCPTool(test.tool, test.args);
      if (result.success) {
        console.log('✅ 成功');
        if (result.output) {
          // 只显示前500个字符，避免输出过长
          const output = result.output.substring(0, 500);
          console.log(`📋 输出预览:\n${output}${result.output.length > 500 ? '...' : ''}`);
        }
      } else {
        console.log('❌ 失败');
        console.log(`错误: ${result.error}`);
      }
    } catch (error) {
      console.log('❌ 执行异常');
      console.log(`异常: ${error.message}`);
    }
  }
  
  // 测试依赖结构分析（需要先搜索到具体依赖）
  console.log('\n=== 依赖结构分析测试 ===');
  
  try {
    // 先搜索commons依赖
    console.log('🔍 搜索commons依赖...');
    const searchResult = await callMCPTool('search_dependencies', { keyword: 'commons' });
    
    if (searchResult.success && searchResult.data) {
      // 从输出中解析依赖信息（简单的字符串解析）
      const output = searchResult.output || '';
      const lines = output.split('\n');
      
      // 查找包含groupId:artifactId的行
      const dependencyLine = lines.find(line => 
        line.includes('org.apache.commons') || 
        line.includes('commons-')
      );
      
      if (dependencyLine) {
        console.log(`📦 找到依赖行: ${dependencyLine}`);
        
        // 手动指定一个常见的依赖进行测试
        const testDependency = {
          groupId: 'org.apache.commons',
          artifactId: 'commons-lang3',
          version: '3.12.0'  // 常见版本
        };
        
        console.log(`\n📁 测试依赖结构: ${testDependency.groupId}:${testDependency.artifactId}:${testDependency.version}`);
        
        const structureResult = await callMCPTool('get_dependency_structure', testDependency);
        
        if (structureResult.success) {
          console.log('✅ 依赖结构分析成功');
          const output = structureResult.output || '';
          console.log(`📋 结构预览:\n${output.substring(0, 800)}${output.length > 800 ? '...' : ''}`);
        } else {
          console.log('❌ 依赖结构分析失败');
          console.log(`错误: ${structureResult.error}`);
        }
      } else {
        console.log('❌ 未找到合适的依赖进行结构分析测试');
      }
    } else {
      console.log('❌ 依赖搜索失败，跳过结构分析测试');
    }
  } catch (error) {
    console.log('❌ 依赖结构分析测试异常');
    console.log(`异常: ${error.message}`);
  }
  
  console.log('\n🎉 MCP工具测试完成！');
}

// 调用MCP工具
function callMCPTool(toolName, args) {
  return new Promise((resolve) => {
    const input = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    const inputStr = JSON.stringify(input) + '\n';
    
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      try {
        if (code === 0 && stdout.trim()) {
          // 尝试解析JSON响应
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          
          if (lastLine.startsWith('{') || lastLine.startsWith('[')) {
            const response = JSON.parse(lastLine);
            
            if (response.result && response.result.content) {
              const content = response.result.content[0];
              resolve({
                success: true,
                output: content.text || content.resource || '',
                data: response.result
              });
            } else {
              resolve({
                success: true,
                output: stdout,
                data: response
              });
            }
          } else {
            resolve({
              success: true,
              output: stdout
            });
          }
        } else {
          resolve({
            success: false,
            error: stderr || `进程退出码: ${code}`,
            output: stdout
          });
        }
      } catch (error) {
        resolve({
          success: false,
          error: `JSON解析失败: ${error.message}`,
          output: stdout
        });
      }
    });
    
    child.on('error', (error) => {
      resolve({
        success: false,
        error: `进程启动失败: ${error.message}`
      });
    });
    
    // 发送输入
    child.stdin.write(inputStr);
    child.stdin.end();
    
    // 设置超时
    setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        error: '工具调用超时'
      });
    }, 30000); // 30秒超时
  });
}

// 运行测试
testMCPTools().catch(console.error); 