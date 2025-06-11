import fs from 'fs-extra';
import path from 'node:path';
import { parseString } from 'xml2js';
import fetch from 'node-fetch';

export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
  scope?: string;
}

export interface ProjectInfo {
  javaVersion?: string;
  sourceVersion?: string;
  targetVersion?: string;
  dependencies: MavenDependency[];
}

export class MavenDependencyResolver {
  private readonly cacheDir: string;
  private readonly defaultRepositories: string[] = [
    'https://repo1.maven.org/maven2',
    'https://repo2.maven.org/maven2',
    'http://central.maven.org/maven2',
  ];

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.maven-cache');
    fs.ensureDirSync(this.cacheDir);
  }

  async parsePomProject(pomPath: string): Promise<ProjectInfo> {
    // 尝试不同的路径来找到pom.xml文件
    let actualPomPath = pomPath;
    
    if (!fs.existsSync(actualPomPath)) {
      // 尝试相对于当前工作目录的路径
      const possiblePaths = [
        pomPath,
        path.join('..', pomPath),
        path.join('..', '..', pomPath),
        path.join('..', '..', '..', pomPath),
        path.resolve(pomPath),
        path.resolve('..', pomPath),
        path.resolve('..', '..', pomPath),
        path.resolve('..', '..', '..', pomPath)
      ];
      
      let found = false;
      for (const tryPath of possiblePaths) {
        if (fs.existsSync(tryPath)) {
          actualPomPath = tryPath;
          found = true;
          console.error(`找到pom.xml文件: ${actualPomPath}`);
          break;
        }
      }
      
      if (!found) {
        const currentDir = process.cwd();
        throw new Error(`pom.xml文件不存在。已尝试的路径:\n${possiblePaths.join('\n')}\n当前工作目录: ${currentDir}`);
      }
    }

    const pomContent = await fs.readFile(actualPomPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      parseString(pomContent, (err, result) => {
        if (err) {
          reject(new Error(`解析pom.xml失败: ${err.message}`));
          return;
        }

        try {
          const dependencies: MavenDependency[] = [];
          const project = result.project;

          // 解析properties用于版本替换
          const properties: Record<string, string> = {};
          if (project.properties && project.properties[0]) {
            Object.keys(project.properties[0]).forEach(key => {
              if (key !== '$') {
                properties[key] = project.properties[0][key][0];
              }
            });
          }

          // 获取Java版本信息
          let javaVersion = properties['java.version'] || properties['maven.compiler.source'] || properties['maven.compiler.target'];
          let sourceVersion = properties['maven.compiler.source'];
          let targetVersion = properties['maven.compiler.target'];

          // 从Maven编译器插件配置中获取版本信息
          if (project.build && project.build[0] && project.build[0].plugins && project.build[0].plugins[0]) {
            const plugins = project.build[0].plugins[0].plugin;
            if (plugins) {
              plugins.forEach((plugin: any) => {
                if (plugin.artifactId && plugin.artifactId[0] === 'maven-compiler-plugin') {
                  if (plugin.configuration && plugin.configuration[0]) {
                    const config = plugin.configuration[0];
                    if (config.source && config.source[0]) {
                      sourceVersion = config.source[0];
                    }
                    if (config.target && config.target[0]) {
                      targetVersion = config.target[0];
                    }
                    if (config.release && config.release[0]) {
                      javaVersion = config.release[0];
                      sourceVersion = config.release[0];
                      targetVersion = config.release[0];
                    }
                  }
                }
              });
            }
          }

          // 如果没有找到版本信息，尝试从parent pom获取
          if (!javaVersion && !sourceVersion && !targetVersion) {
            // 默认假设Java 8
            javaVersion = '1.8';
            sourceVersion = '1.8';
            targetVersion = '1.8';
          }

          // 获取parent版本信息
          let parentVersion = '';
          if (project.parent && project.parent[0] && project.parent[0].version) {
            parentVersion = project.parent[0].version[0];
          }

          // 解析依赖
          if (project.dependencies && project.dependencies[0] && project.dependencies[0].dependency) {
            project.dependencies[0].dependency.forEach((dep: any) => {
              const groupId = dep.groupId ? dep.groupId[0] : '';
              const artifactId = dep.artifactId ? dep.artifactId[0] : '';
              let version = dep.version ? dep.version[0] : '';
              const scope = dep.scope ? dep.scope[0] : 'compile';

              // 跳过test scope的依赖
              if (scope === 'test') {
                return;
              }

              // 处理版本变量替换
              if (version.startsWith('${') && version.endsWith('}')) {
                const propName = version.substring(2, version.length - 1);
                if (properties[propName]) {
                  version = properties[propName];
                } else if (propName.endsWith('.version') && parentVersion) {
                  version = parentVersion;
                }
              }

              // 如果版本仍然为空或包含变量，尝试从parent继承
              if (!version || version.includes('${')) {
                version = parentVersion;
              }

              if (groupId && artifactId && version && !version.includes('${')) {
                dependencies.push({
                  groupId,
                  artifactId,
                  version,
                  scope,
                });
              }
            });
          }

          resolve({
            javaVersion,
            sourceVersion,
            targetVersion,
            dependencies
          });
        } catch (error) {
          reject(new Error(`处理pom.xml数据失败: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
  }

  async parsePomDependencies(pomPath: string): Promise<MavenDependency[]> {
    const projectInfo = await this.parsePomProject(pomPath);
    return projectInfo.dependencies;
  }

  async downloadDependency(groupId: string, artifactId: string, version: string): Promise<string> {
    const fileName = `${artifactId}-${version}.jar`;
    const localPath = path.join(this.cacheDir, groupId.replace(/\./g, '/'), artifactId, version, fileName);

    // 如果本地已存在，直接返回
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // 确保目录存在
    fs.ensureDirSync(path.dirname(localPath));

    // 构建Maven仓库URL路径
    const groupPath = groupId.replace(/\./g, '/');
    const jarPath = `${groupPath}/${artifactId}/${version}/${fileName}`;

    // 尝试从不同的Maven仓库下载
    for (const repository of this.defaultRepositories) {
      try {
        const url = `${repository}/${jarPath}`;
        console.error(`尝试从 ${url} 下载依赖...`);

        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.buffer();
          await fs.writeFile(localPath, buffer);
          console.error(`成功下载依赖: ${groupId}:${artifactId}:${version}`);
          return localPath;
        }
      } catch (error) {
        console.error(`从 ${repository} 下载失败:`, error);
        continue;
      }
    }

    throw new Error(`无法下载依赖: ${groupId}:${artifactId}:${version}。请检查网络连接或依赖是否存在。`);
  }

  async resolveDependencyVersion(groupId: string, artifactId: string): Promise<string[]> {
    // 这个方法可以用来获取依赖的可用版本列表
    const groupPath = groupId.replace(/\./g, '/');
    const metadataPath = `${groupPath}/${artifactId}/maven-metadata.xml`;

    for (const repository of this.defaultRepositories) {
      try {
        const url = `${repository}/${metadataPath}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const xmlContent = await response.text();
          
          return new Promise((resolve, reject) => {
            parseString(xmlContent, (err, result) => {
              if (err) {
                reject(err);
                return;
              }

              try {
                const versions: string[] = [];
                const metadata = result.metadata;
                
                if (metadata.versioning && metadata.versioning[0] && metadata.versioning[0].versions) {
                  const versionList = metadata.versioning[0].versions[0].version;
                  versions.push(...versionList);
                }
                
                resolve(versions);
              } catch (error) {
                reject(error);
              }
            });
          });
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(`无法获取依赖版本信息: ${groupId}:${artifactId}`);
  }
} 