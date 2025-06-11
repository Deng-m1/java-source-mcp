import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { parseStringPromise } from 'xml2js';
export class MavenConfigManager {
    config = null;
    defaultLocalRepo;
    constructor() {
        // 默认Maven本地仓库位置
        this.defaultLocalRepo = path.join(os.homedir(), '.m2', 'repository');
    }
    async getConfig() {
        if (!this.config) {
            this.config = await this.loadConfig();
        }
        return this.config;
    }
    async loadConfig() {
        console.log('🔧 加载Maven配置...');
        // 1. 从环境变量获取配置
        const envConfig = this.loadFromEnvironment();
        // 2. 从Maven settings.xml获取配置
        const settingsConfig = await this.loadFromSettings();
        // 3. 合并配置（环境变量优先）
        const config = {
            localRepository: envConfig.localRepository || settingsConfig.localRepository || this.defaultLocalRepo,
            repositories: [...(envConfig.repositories || []), ...(settingsConfig.repositories || [])],
            mirrors: { ...(settingsConfig.mirrors || {}), ...(envConfig.mirrors || {}) },
            proxies: settingsConfig.proxies || []
        };
        // 4. 确保默认仓库存在
        this.ensureDefaultRepositories(config);
        console.log(`✅ Maven本地仓库: ${config.localRepository}`);
        console.log(`✅ 配置了 ${config.repositories.length} 个远程仓库`);
        return config;
    }
    loadFromEnvironment() {
        console.log('🌍 检查环境变量配置...');
        const config = {
            repositories: [],
            mirrors: {}
        };
        // Maven本地仓库路径
        if (process.env.MAVEN_REPOSITORY || process.env.M2_REPO) {
            config.localRepository = process.env.MAVEN_REPOSITORY || process.env.M2_REPO;
            console.log(`  📂 环境变量本地仓库: ${config.localRepository}`);
        }
        // Maven仓库URL（支持多个，用逗号分隔）
        if (process.env.MAVEN_REPOSITORIES) {
            const repos = process.env.MAVEN_REPOSITORIES.split(',');
            config.repositories = repos.map((url, index) => ({
                id: `env-repo-${index}`,
                url: url.trim(),
                name: `Environment Repository ${index + 1}`
            }));
            console.log(`  🌐 环境变量仓库: ${config.repositories.length} 个`);
        }
        // Maven镜像配置
        if (process.env.MAVEN_MIRROR_URL) {
            config.mirrors = {
                'central': process.env.MAVEN_MIRROR_URL
            };
            console.log(`  🪞 环境变量镜像: ${process.env.MAVEN_MIRROR_URL}`);
        }
        return config;
    }
    async loadFromSettings() {
        console.log('📋 读取Maven settings.xml...');
        const settingsPaths = [
            // 用户级配置
            path.join(os.homedir(), '.m2', 'settings.xml'),
            // 全局配置
            process.env.M2_HOME ? path.join(process.env.M2_HOME, 'conf', 'settings.xml') : null,
            process.env.MAVEN_HOME ? path.join(process.env.MAVEN_HOME, 'conf', 'settings.xml') : null,
            // 常见安装路径
            '/usr/share/maven/conf/settings.xml',
            '/opt/maven/conf/settings.xml',
            'C:\\Program Files\\Apache\\Maven\\conf\\settings.xml',
            'C:\\apache-maven\\conf\\settings.xml'
        ].filter(Boolean);
        for (const settingsPath of settingsPaths) {
            if (fs.existsSync(settingsPath)) {
                console.log(`  📄 找到配置文件: ${settingsPath}`);
                return await this.parseSettingsXml(settingsPath);
            }
        }
        console.log('  ⚠️  未找到settings.xml，使用默认配置');
        return { repositories: [], mirrors: {}, proxies: [] };
    }
    async parseSettingsXml(settingsPath) {
        try {
            const settingsXml = await fs.readFile(settingsPath, 'utf8');
            const result = await parseStringPromise(settingsXml);
            const settings = result.settings || {};
            const config = {
                repositories: [],
                mirrors: {},
                proxies: []
            };
            // 解析本地仓库路径
            if (settings.localRepository && settings.localRepository[0]) {
                config.localRepository = settings.localRepository[0].trim();
                console.log(`  📂 配置文件本地仓库: ${config.localRepository}`);
            }
            // 解析远程仓库
            if (settings.profiles && settings.profiles[0]?.profile) {
                const profiles = Array.isArray(settings.profiles[0].profile)
                    ? settings.profiles[0].profile
                    : [settings.profiles[0].profile];
                for (const profile of profiles) {
                    if (profile.repositories && profile.repositories[0]?.repository) {
                        const repos = Array.isArray(profile.repositories[0].repository)
                            ? profile.repositories[0].repository
                            : [profile.repositories[0].repository];
                        for (const repo of repos) {
                            if (repo.id && repo.url) {
                                config.repositories.push({
                                    id: repo.id[0],
                                    url: repo.url[0],
                                    name: repo.name ? repo.name[0] : repo.id[0]
                                });
                            }
                        }
                    }
                }
            }
            // 解析镜像配置
            if (settings.mirrors && settings.mirrors[0]?.mirror) {
                const mirrors = Array.isArray(settings.mirrors[0].mirror)
                    ? settings.mirrors[0].mirror
                    : [settings.mirrors[0].mirror];
                for (const mirror of mirrors) {
                    if (mirror.id && mirror.url && mirror.mirrorOf) {
                        config.mirrors[mirror.mirrorOf[0]] = mirror.url[0];
                    }
                }
            }
            // 解析代理配置
            if (settings.proxies && settings.proxies[0]?.proxy) {
                config.proxies = Array.isArray(settings.proxies[0].proxy)
                    ? settings.proxies[0].proxy
                    : [settings.proxies[0].proxy];
            }
            console.log(`  ✅ 解析完成: ${config.repositories.length} 个仓库, ${Object.keys(config.mirrors).length} 个镜像`);
            return config;
        }
        catch (error) {
            console.log(`  ❌ 解析settings.xml失败: ${error instanceof Error ? error.message : String(error)}`);
            return { repositories: [], mirrors: {}, proxies: [] };
        }
    }
    ensureDefaultRepositories(config) {
        // 确保包含Maven中央仓库
        const hascentral = config.repositories.some(repo => repo.id === 'central' || repo.url.includes('repo1.maven.org'));
        if (!hascentral) {
            config.repositories.unshift({
                id: 'central',
                url: 'https://repo1.maven.org/maven2/',
                name: 'Maven Central Repository'
            });
        }
        // 添加其他常用仓库
        const commonRepos = [
            {
                id: 'spring-releases',
                url: 'https://repo.spring.io/release/',
                name: 'Spring Releases'
            },
            {
                id: 'spring-milestones',
                url: 'https://repo.spring.io/milestone/',
                name: 'Spring Milestones'
            }
        ];
        for (const repo of commonRepos) {
            if (!config.repositories.some(r => r.id === repo.id)) {
                config.repositories.push(repo);
            }
        }
    }
    // 获取依赖的本地路径
    getLocalArtifactPath(groupId, artifactId, version, classifier) {
        const config = this.config;
        if (!config) {
            throw new Error('Maven配置未加载');
        }
        const groupPath = groupId.replace(/\./g, path.sep);
        const artifactPath = path.join(config.localRepository, groupPath, artifactId, version);
        const jarName = classifier
            ? `${artifactId}-${version}-${classifier}.jar`
            : `${artifactId}-${version}.jar`;
        return path.join(artifactPath, jarName);
    }
    // 检查本地仓库中是否存在指定依赖
    async hasLocalArtifact(groupId, artifactId, version, classifier) {
        const localPath = this.getLocalArtifactPath(groupId, artifactId, version, classifier);
        return fs.existsSync(localPath);
    }
    // 获取所有可用的分类器版本（如sources, javadoc等）
    async getAvailableClassifiers(groupId, artifactId, version) {
        const config = this.config;
        if (!config)
            return [];
        const groupPath = groupId.replace(/\./g, path.sep);
        const versionDir = path.join(config.localRepository, groupPath, artifactId, version);
        if (!fs.existsSync(versionDir)) {
            return [];
        }
        const files = await fs.readdir(versionDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));
        const classifiers = [];
        const basePattern = `${artifactId}-${version}`;
        for (const jarFile of jarFiles) {
            if (jarFile === `${basePattern}.jar`) {
                classifiers.push('default');
            }
            else if (jarFile.startsWith(`${basePattern}-`) && jarFile.endsWith('.jar')) {
                const classifier = jarFile.substring(basePattern.length + 1, jarFile.length - 4);
                classifiers.push(classifier);
            }
        }
        return classifiers;
    }
    // 尝试获取sources jar路径
    async getSourcesJarPath(groupId, artifactId, version) {
        const sourcesPath = this.getLocalArtifactPath(groupId, artifactId, version, 'sources');
        if (await fs.pathExists(sourcesPath)) {
            return sourcesPath;
        }
        return null;
    }
}
