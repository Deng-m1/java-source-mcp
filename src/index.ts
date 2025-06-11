#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GlobalMavenService } from './global-maven-service.js';

// 全局Maven服务实例
const globalMavenService = new GlobalMavenService();

// 定义工具
const tools: Tool[] = [
  {
    name: 'scan_local_repository',
    description: '扫描Maven本地仓库中的所有可用依赖',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_class_in_repository',
    description: '在Maven本地仓库中搜索指定的Java类',
    inputSchema: {
      type: 'object',
      properties: {
        className: {
          type: 'string',
          description: '要搜索的Java类名（支持部分匹配）',
        },
      },
      required: ['className'],
    },
  },
  {
    name: 'get_dependency_source',
    description: '获取Java依赖的反编译源码',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Maven依赖的groupId（如：org.springframework）',
        },
        artifactId: {
          type: 'string',
          description: 'Maven依赖的artifactId（如：spring-core）',
        },
        version: {
          type: 'string',
          description: '依赖版本号（如：5.3.21）',
        },
        className: {
          type: 'string',
          description: '要反编译的Java类名（如：org.springframework.core.SpringVersion）',
        },
      },
      required: ['groupId', 'artifactId', 'version', 'className'],
    },
  },
  {
    name: 'list_dependency_classes',
    description: '列出指定依赖中的所有Java类',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Maven依赖的groupId',
        },
        artifactId: {
          type: 'string',
          description: 'Maven依赖的artifactId',
        },
        version: {
          type: 'string',
          description: '依赖版本号',
        },
      },
      required: ['groupId', 'artifactId', 'version'],
    },
  },
  {
    name: 'get_maven_config',
    description: '获取Maven配置信息（本地仓库路径、远程仓库等）',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_dependency_structure',
    description: '获取指定依赖的详细目录结构',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'Maven依赖的groupId',
        },
        artifactId: {
          type: 'string',
          description: 'Maven依赖的artifactId',
        },
        version: {
          type: 'string',
          description: '依赖版本号',
        },
      },
      required: ['groupId', 'artifactId', 'version'],
    },
  },
  {
    name: 'get_repository_tree',
    description: '获取Maven仓库的树形结构',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: '可选：指定groupId获取特定组的结构',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_dependencies',
    description: '在Maven仓库中搜索依赖',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '搜索关键词（支持groupId或artifactId匹配）',
        },
      },
      required: ['keyword'],
    },
  },
];

// 创建服务器
const server = new Server(
  {
    name: 'java-decompiler-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 实现工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// 实现工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'scan_local_repository': {
        console.log('🔍 执行: 扫描本地仓库');
        const dependencies = await globalMavenService.scanLocalRepository();
        
        return {
          content: [
            {
              type: 'text',
              text: `# Maven本地仓库扫描结果\n\n找到 ${dependencies.length} 个依赖:\n\n` +
                dependencies.slice(0, 50).map(dep => 
                  `- ${dep.groupId}:${dep.artifactId}:${dep.version}${dep.hasSource ? ' (有源码)' : ''}`
                ).join('\n') +
                (dependencies.length > 50 ? `\n\n... 和另外 ${dependencies.length - 50} 个依赖` : ''),
            },
          ],
        };
      }

      case 'search_class_in_repository': {
        const { className } = args as { className: string };
        console.log(`🔍 执行: 搜索类 ${className}`);
        
        const results = await globalMavenService.searchClass(className);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `未找到包含 "${className}" 的类`,
              },
            ],
          };
        }

        const resultText = `# 类搜索结果\n\n找到 ${results.length} 个匹配的类:\n\n` +
          results.slice(0, 20).map(result => 
            `## ${result.fullClassName}\n` +
            `- **依赖**: ${result.dependency.groupId}:${result.dependency.artifactId}:${result.dependency.version}\n` +
            `- **源码类型**: ${result.sourceType === 'sources-jar' ? 'Sources JAR' : '反编译'}\n` +
            `- **包名**: ${result.packageName}\n`
          ).join('\n') +
          (results.length > 20 ? `\n\n... 和另外 ${results.length - 20} 个结果` : '');

        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      }

      case 'get_dependency_source': {
        const { groupId, artifactId, version, className } = args as {
          groupId: string;
          artifactId: string;
          version: string;
          className: string;
        };
        
        console.log(`📖 执行: 获取源码 ${groupId}:${artifactId}:${version} - ${className}`);
        
        const sourceCode = await globalMavenService.getClassSource(groupId, artifactId, version, className);
        
        return {
          content: [
            {
              type: 'text',
              text: `# ${className} 源码\n\n**依赖**: ${groupId}:${artifactId}:${version}\n\n\`\`\`java\n${sourceCode}\n\`\`\``,
            },
          ],
        };
      }

      case 'list_dependency_classes': {
        const { groupId, artifactId, version } = args as {
          groupId: string;
          artifactId: string;
          version: string;
        };
        
        console.log(`📋 执行: 列出类 ${groupId}:${artifactId}:${version}`);
        
        const classes = await globalMavenService.listClasses(groupId, artifactId, version);
        
        if (classes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `依赖 ${groupId}:${artifactId}:${version} 中没有找到类`,
              },
            ],
          };
        }

        const classesText = `# 依赖中的Java类\n\n**依赖**: ${groupId}:${artifactId}:${version}\n\n` +
          `找到 ${classes.length} 个类:\n\n` +
          classes.slice(0, 100).map(className => `- ${className}`).join('\n') +
          (classes.length > 100 ? `\n\n... 和另外 ${classes.length - 100} 个类` : '');

        return {
          content: [
            {
              type: 'text',
              text: classesText,
            },
          ],
        };
      }

      case 'get_maven_config': {
        console.log('⚙️ 执行: 获取Maven配置');
        
        const config = await globalMavenService.getMavenConfig();
        
        const configText = `# Maven配置信息\n\n` +
          `**本地仓库**: ${config.localRepository}\n\n` +
          `**远程仓库** (${config.repositories.length} 个):\n` +
          config.repositories.map(repo => 
            `- **${repo.name || repo.id}**: ${repo.url}`
          ).join('\n') +
          (Object.keys(config.mirrors).length > 0 ? 
            `\n\n**镜像配置**:\n` + 
            Object.entries(config.mirrors).map(([key, value]) => 
              `- ${key}: ${value}`
            ).join('\n') : '');

        return {
          content: [
            {
              type: 'text',
              text: configText,
            },
          ],
        };
      }

      case 'get_dependency_structure': {
        const { groupId, artifactId, version } = args as {
          groupId: string;
          artifactId: string;
          version: string;
        };
        
        console.log(`📁 执行: 获取依赖结构 ${groupId}:${artifactId}:${version}`);
        
        const structure = await globalMavenService.getDependencyStructure(groupId, artifactId, version);
        
        const structureText = `# 依赖结构分析\n\n` +
          `**依赖**: ${groupId}:${artifactId}:${version}\n` +
          `**主JAR**: ${structure.mainJarPath}\n` +
          `**有源码**: ${structure.hasSource ? '是' : '否'}\n` +
          (structure.sourcePath ? `**源码路径**: ${structure.sourcePath}\n` : '') +
          `\n## JAR文件 (${structure.jarFiles.length} 个)\n` +
          structure.jarFiles.map(jar => `- ${jar}`).join('\n') +
          `\n\n## 包结构 (${structure.packages.length} 个包)\n` +
          structure.packages.slice(0, 20).map(pkg => `- ${pkg}`).join('\n') +
          (structure.packages.length > 20 ? `\n... 和另外 ${structure.packages.length - 20} 个包` : '') +
          `\n\n## 类列表 (${structure.classes.length} 个类)\n` +
          structure.classes.slice(0, 50).map(cls => `- ${cls}`).join('\n') +
          (structure.classes.length > 50 ? `\n... 和另外 ${structure.classes.length - 50} 个类` : '');

        return {
          content: [
            {
              type: 'text',
              text: structureText,
            },
          ],
        };
      }

      case 'get_repository_tree': {
        const { groupId } = args as { groupId?: string };
        
        console.log('🌳 执行: 获取仓库树形结构');
        
        if (groupId) {
          const tree = globalMavenService.getRepositoryTreeByGroupId(groupId);
          if (!tree) {
            return {
              content: [
                {
                  type: 'text',
                  text: `未找到groupId: ${groupId}`,
                },
              ],
            };
          }
          
          const treeText = `# 仓库结构 - ${groupId}\n\n` +
            Object.entries(tree.artifacts).map(([artifactId, info]) =>
              `## ${artifactId}\n- **最新版本**: ${info.latestVersion}\n- **所有版本**: ${info.versions.join(', ')}\n`
            ).join('\n');
          
          return {
            content: [
              {
                type: 'text',
                text: treeText,
              },
            ],
          };
        } else {
          const trees = globalMavenService.getRepositoryTree();
          
          const treeText = `# Maven仓库树形结构\n\n` +
            `总共包含 ${trees.length} 个groupId:\n\n` +
            trees.slice(0, 20).map(tree => {
              const artifactCount = Object.keys(tree.artifacts).length;
              return `## ${tree.groupId}\n- **包含**: ${artifactCount} 个artifact\n- **主要artifacts**: ${Object.keys(tree.artifacts).slice(0, 3).join(', ')}${artifactCount > 3 ? '...' : ''}\n`;
            }).join('\n') +
            (trees.length > 20 ? `\n... 和另外 ${trees.length - 20} 个groupId` : '');
          
          return {
            content: [
              {
                type: 'text',
                text: treeText,
              },
            ],
          };
        }
      }

      case 'search_dependencies': {
        const { keyword } = args as { keyword: string };
        
        console.log(`🔍 执行: 搜索依赖 "${keyword}"`);
        
        const results = globalMavenService.searchDependencies(keyword);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `未找到包含 "${keyword}" 的依赖`,
              },
            ],
          };
        }
        
        const resultText = `# 依赖搜索结果\n\n` +
          `找到 ${results.length} 个匹配的依赖:\n\n` +
          results.slice(0, 30).map(result => 
            `## ${result.groupId}:${result.artifactId}\n` +
            `- **版本**: ${result.versions.join(', ')}\n`
          ).join('\n') +
          (results.length > 30 ? `\n... 和另外 ${results.length - 30} 个结果` : '');

        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ 工具执行失败: ${name}`, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `执行失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  console.log('🚀 启动Java反编译MCP服务器...');
  
  try {
    // 初始化全局Maven服务
    await globalMavenService.initialize();
    
    // 启动服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log('✅ Java反编译MCP服务器已启动');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

main(); 