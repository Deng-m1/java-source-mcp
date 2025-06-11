import fs from 'fs-extra';
import path from 'node:path';
import JSZip from 'jszip';
import { MavenConfigManager } from './maven-config.js';
import { JavaDecompiler } from './decompiler.js';
export class GlobalMavenService {
    configManager;
    decompiler;
    dependencyCache = new Map();
    repositoryTreeCache = new Map();
    dependencyStructureCache = new Map();
    constructor() {
        this.configManager = new MavenConfigManager();
        this.decompiler = new JavaDecompiler();
    }
    async initialize() {
        console.log('🚀 初始化全局Maven服务...');
        // 加载Maven配置
        const config = await this.configManager.getConfig();
        // 验证本地仓库是否存在
        if (!fs.existsSync(config.localRepository)) {
            console.log(`❌ Maven本地仓库不存在: ${config.localRepository}`);
            console.log('💡 请检查Maven配置或运行Maven命令下载依赖');
            throw new Error(`Maven本地仓库不存在: ${config.localRepository}`);
        }
        console.log(`✅ Maven本地仓库验证通过: ${config.localRepository}`);
        // 预加载仓库树形结构
        console.log('📊 预加载仓库结构...');
        await this.buildRepositoryTree();
        console.log('✅ 全局Maven服务初始化完成');
    }
    // 从Maven本地仓库扫描所有可用依赖
    async scanLocalRepository() {
        console.log('🔍 扫描Maven本地仓库...');
        const config = await this.configManager.getConfig();
        const dependencies = [];
        if (!fs.existsSync(config.localRepository)) {
            console.log(`❌ Maven本地仓库不存在: ${config.localRepository}`);
            return dependencies;
        }
        try {
            await this.scanDirectory(config.localRepository, '', dependencies);
            console.log(`✅ 扫描完成，找到 ${dependencies.length} 个依赖`);
            return dependencies;
        }
        catch (error) {
            console.error('❌ 扫描本地仓库失败:', error);
            return dependencies;
        }
    }
    async scanDirectory(baseDir, currentPath, dependencies) {
        const fullPath = path.join(baseDir, currentPath);
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        // 检查是否是版本目录（包含JAR文件）
        const jarFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.jar'));
        if (jarFiles.length > 0) {
            // 这是一个版本目录，解析groupId, artifactId, version
            const pathParts = currentPath.split(path.sep);
            if (pathParts.length >= 2) {
                const version = pathParts[pathParts.length - 1];
                const artifactId = pathParts[pathParts.length - 2];
                const groupId = pathParts.slice(0, -2).join('.');
                if (groupId && artifactId && version) {
                    const dependency = await this.createDependencyInfo(groupId, artifactId, version);
                    if (dependency) {
                        dependencies.push(dependency);
                    }
                }
            }
            return; // 不需要递归到版本目录内部
        }
        // 递归扫描子目录
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subPath = currentPath ? path.join(currentPath, entry.name) : entry.name;
                await this.scanDirectory(baseDir, subPath, dependencies);
            }
        }
    }
    async createDependencyInfo(groupId, artifactId, version) {
        try {
            const hasArtifact = await this.configManager.hasLocalArtifact(groupId, artifactId, version);
            const hasSource = await this.configManager.hasLocalArtifact(groupId, artifactId, version, 'sources');
            if (!hasArtifact)
                return null;
            const localPath = this.configManager.getLocalArtifactPath(groupId, artifactId, version);
            const sourcePath = hasSource ? this.configManager.getLocalArtifactPath(groupId, artifactId, version, 'sources') : undefined;
            return {
                groupId,
                artifactId,
                version,
                available: true,
                hasSource,
                localPath,
                sourcePath
            };
        }
        catch (error) {
            return null;
        }
    }
    // 搜索指定类名
    async searchClass(className) {
        console.log(`🔍 搜索类: ${className}`);
        const results = [];
        const dependencies = await this.scanLocalRepository();
        for (const dependency of dependencies) {
            if (!dependency.available)
                continue;
            try {
                // 首先尝试在sources jar中搜索
                if (dependency.hasSource && dependency.sourcePath) {
                    const sourceResults = await this.searchInSourcesJar(dependency.sourcePath, className, dependency);
                    results.push(...sourceResults);
                }
                // 在普通jar中搜索
                if (dependency.localPath) {
                    const jarResults = await this.searchInJar(dependency.localPath, className, dependency);
                    results.push(...jarResults);
                }
            }
            catch (error) {
                console.log(`⚠️  搜索 ${dependency.groupId}:${dependency.artifactId} 失败:`, error);
            }
        }
        console.log(`✅ 找到 ${results.length} 个匹配的类`);
        return results;
    }
    async searchInSourcesJar(sourcesJarPath, className, dependency) {
        const results = [];
        try {
            const data = await fs.readFile(sourcesJarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir || !filePath.endsWith('.java'))
                    continue;
                const fileName = path.basename(filePath, '.java');
                if (fileName.toLowerCase().includes(className.toLowerCase())) {
                    const packagePath = path.dirname(filePath).replace(/\//g, '.');
                    const fullClassName = packagePath ? `${packagePath}.${fileName}` : fileName;
                    results.push({
                        className: fileName,
                        packageName: packagePath,
                        fullClassName,
                        dependency,
                        sourceType: 'sources-jar'
                    });
                }
            }
        }
        catch (error) {
            console.log(`⚠️  读取sources jar失败: ${sourcesJarPath}`);
        }
        return results;
    }
    async searchInJar(jarPath, className, dependency) {
        const results = [];
        try {
            const data = await fs.readFile(jarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir || !filePath.endsWith('.class'))
                    continue;
                const fileName = path.basename(filePath, '.class');
                if (fileName.toLowerCase().includes(className.toLowerCase())) {
                    const packagePath = path.dirname(filePath).replace(/\//g, '.');
                    const fullClassName = packagePath ? `${packagePath}.${fileName}` : fileName;
                    // 避免重复添加（如果已经从sources jar找到了）
                    const exists = results.some(r => r.fullClassName === fullClassName);
                    if (!exists) {
                        results.push({
                            className: fileName,
                            packageName: packagePath,
                            fullClassName,
                            dependency,
                            sourceType: 'decompiled'
                        });
                    }
                }
            }
        }
        catch (error) {
            console.log(`⚠️  读取jar文件失败: ${jarPath}`);
        }
        return results;
    }
    // 获取类的源代码
    async getClassSource(groupId, artifactId, version, className) {
        console.log(`📖 获取类源码: ${className} from ${groupId}:${artifactId}:${version}`);
        // 1. 首先尝试从sources jar获取原始源码
        const sourcePath = await this.configManager.getSourcesJarPath(groupId, artifactId, version);
        if (sourcePath) {
            console.log('🎯 尝试从sources jar获取源码...');
            const sourceCode = await this.getSourceFromSourcesJar(sourcePath, className);
            if (sourceCode) {
                console.log(`✅ 从sources jar获取源码成功 (${sourceCode.length} 字符)`);
                return sourceCode;
            }
        }
        // 2. 否则通过反编译获取
        console.log('🔧 通过反编译获取源码...');
        const jarPath = this.configManager.getLocalArtifactPath(groupId, artifactId, version);
        if (!fs.existsSync(jarPath)) {
            throw new Error(`JAR文件不存在: ${jarPath}`);
        }
        const sourceCode = await this.decompiler.decompileClass(jarPath, className);
        console.log(`✅ 反编译获取源码成功 (${sourceCode.length} 字符)`);
        return sourceCode;
    }
    async getSourceFromSourcesJar(sourcesJarPath, className) {
        try {
            const data = await fs.readFile(sourcesJarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            // 尝试多种可能的文件路径
            const possiblePaths = [
                `${className.replace(/\./g, '/')}.java`,
                `${className}.java`
            ];
            // 如果className包含包名，也尝试只用类名搜索
            if (className.includes('.')) {
                const simpleClassName = className.split('.').pop();
                if (simpleClassName) {
                    possiblePaths.push(`${simpleClassName}.java`);
                }
            }
            // 搜索匹配的文件
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir)
                    continue;
                const fileName = path.basename(filePath);
                const fileNameWithoutExt = path.basename(filePath, '.java');
                // 精确匹配
                if (possiblePaths.includes(filePath)) {
                    return await file.async('text');
                }
                // 文件名匹配（忽略包路径）
                if (className.endsWith(fileNameWithoutExt)) {
                    return await file.async('text');
                }
            }
            return null;
        }
        catch (error) {
            console.log(`⚠️  从sources jar读取源码失败:`, error);
            return null;
        }
    }
    // 列出指定依赖的所有类
    async listClasses(groupId, artifactId, version) {
        console.log(`📋 列出依赖中的所有类: ${groupId}:${artifactId}:${version}`);
        const classes = [];
        // 首先尝试从sources jar获取
        const sourcePath = await this.configManager.getSourcesJarPath(groupId, artifactId, version);
        if (sourcePath) {
            const sourceClasses = await this.listClassesFromSourcesJar(sourcePath);
            classes.push(...sourceClasses);
        }
        // 从普通jar获取（避免重复）
        const jarPath = this.configManager.getLocalArtifactPath(groupId, artifactId, version);
        if (fs.existsSync(jarPath)) {
            const jarClasses = await this.listClassesFromJar(jarPath);
            // 去重
            for (const className of jarClasses) {
                if (!classes.includes(className)) {
                    classes.push(className);
                }
            }
        }
        console.log(`✅ 找到 ${classes.length} 个类`);
        return classes.sort();
    }
    async listClassesFromSourcesJar(sourcesJarPath) {
        const classes = [];
        try {
            const data = await fs.readFile(sourcesJarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir || !filePath.endsWith('.java'))
                    continue;
                const className = filePath.replace(/\.java$/, '').replace(/\//g, '.');
                classes.push(className);
            }
        }
        catch (error) {
            console.log(`⚠️  列出sources jar中的类失败:`, error);
        }
        return classes;
    }
    async listClassesFromJar(jarPath) {
        const classes = [];
        try {
            const data = await fs.readFile(jarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir || !filePath.endsWith('.class'))
                    continue;
                // 排除内部类和匿名类
                const className = filePath.replace(/\.class$/, '').replace(/\//g, '.');
                if (!className.includes('$')) {
                    classes.push(className);
                }
            }
        }
        catch (error) {
            console.log(`⚠️  列出jar中的类失败:`, error);
        }
        return classes;
    }
    // 获取依赖信息
    async getDependencyInfo(groupId, artifactId, version) {
        return await this.createDependencyInfo(groupId, artifactId, version);
    }
    // 获取Maven配置信息
    async getMavenConfig() {
        return await this.configManager.getConfig();
    }
    // 构建仓库树形结构
    async buildRepositoryTree() {
        console.log('🌳 构建仓库树形结构...');
        const config = await this.configManager.getConfig();
        if (!fs.existsSync(config.localRepository)) {
            return;
        }
        const groups = {};
        await this.scanRepositoryForTree(config.localRepository, '', groups);
        // 缓存到内存
        this.repositoryTreeCache.clear();
        for (const [groupId, tree] of Object.entries(groups)) {
            this.repositoryTreeCache.set(groupId, tree);
        }
        console.log(`✅ 仓库树形结构构建完成，包含 ${Object.keys(groups).length} 个groupId`);
    }
    async scanRepositoryForTree(baseDir, currentPath, groups) {
        const fullPath = path.join(baseDir, currentPath);
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        // 检查是否是版本目录（包含JAR文件）
        const jarFiles = entries.filter(entry => entry.isFile() && entry.name.endsWith('.jar'));
        if (jarFiles.length > 0) {
            // 这是一个版本目录
            const pathParts = currentPath.split(path.sep);
            if (pathParts.length >= 2) {
                const version = pathParts[pathParts.length - 1];
                const artifactId = pathParts[pathParts.length - 2];
                const groupId = pathParts.slice(0, -2).join('.');
                if (groupId && artifactId && version) {
                    if (!groups[groupId]) {
                        groups[groupId] = {
                            groupId,
                            artifacts: {}
                        };
                    }
                    if (!groups[groupId].artifacts[artifactId]) {
                        groups[groupId].artifacts[artifactId] = {
                            versions: [],
                            latestVersion: version
                        };
                    }
                    groups[groupId].artifacts[artifactId].versions.push(version);
                    // 更新最新版本（简单的字符串比较，可以改进为语义化版本比较）
                    if (version > groups[groupId].artifacts[artifactId].latestVersion) {
                        groups[groupId].artifacts[artifactId].latestVersion = version;
                    }
                }
            }
            return;
        }
        // 递归扫描子目录
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subPath = currentPath ? path.join(currentPath, entry.name) : entry.name;
                await this.scanRepositoryForTree(baseDir, subPath, groups);
            }
        }
    }
    // 获取依赖的详细结构
    async getDependencyStructure(groupId, artifactId, version) {
        const cacheKey = `${groupId}:${artifactId}:${version}`;
        // 检查缓存
        if (this.dependencyStructureCache.has(cacheKey)) {
            return this.dependencyStructureCache.get(cacheKey);
        }
        console.log(`📁 分析依赖结构: ${cacheKey}`);
        const config = await this.configManager.getConfig();
        const groupPath = groupId.replace(/\./g, path.sep);
        const versionDir = path.join(config.localRepository, groupPath, artifactId, version);
        if (!fs.existsSync(versionDir)) {
            throw new Error(`依赖版本目录不存在: ${versionDir}`);
        }
        // 获取所有JAR文件
        const files = await fs.readdir(versionDir);
        const jarFiles = files.filter(file => file.endsWith('.jar'));
        // 找到主JAR文件和sources JAR
        const mainJar = jarFiles.find(jar => jar === `${artifactId}-${version}.jar`);
        const sourcesJar = jarFiles.find(jar => jar === `${artifactId}-${version}-sources.jar`);
        if (!mainJar) {
            throw new Error(`主JAR文件不存在: ${artifactId}-${version}.jar`);
        }
        const mainJarPath = path.join(versionDir, mainJar);
        const sourcePath = sourcesJar ? path.join(versionDir, sourcesJar) : undefined;
        // 分析JAR内容
        const classes = [];
        const packages = new Set();
        try {
            const data = await fs.readFile(mainJarPath);
            const zip = new JSZip();
            const contents = await zip.loadAsync(data);
            for (const [filePath, file] of Object.entries(contents.files)) {
                if (file.dir || !filePath.endsWith('.class'))
                    continue;
                // 排除内部类和匿名类
                const className = filePath.replace(/\.class$/, '').replace(/\//g, '.');
                if (!className.includes('$')) {
                    classes.push(className);
                    // 提取包名
                    const lastDot = className.lastIndexOf('.');
                    if (lastDot > 0) {
                        packages.add(className.substring(0, lastDot));
                    }
                }
            }
        }
        catch (error) {
            console.log(`⚠️  分析JAR文件失败: ${mainJarPath}`, error);
        }
        const structure = {
            groupId,
            artifactId,
            version,
            jarFiles,
            classes: classes.sort(),
            packages: Array.from(packages).sort(),
            hasSource: !!sourcePath,
            sourcePath,
            mainJarPath
        };
        // 缓存结果
        this.dependencyStructureCache.set(cacheKey, structure);
        console.log(`✅ 依赖结构分析完成: ${classes.length} 个类, ${packages.size} 个包`);
        return structure;
    }
    // 获取仓库树形结构
    getRepositoryTree() {
        return Array.from(this.repositoryTreeCache.values());
    }
    // 根据groupId获取仓库树
    getRepositoryTreeByGroupId(groupId) {
        return this.repositoryTreeCache.get(groupId) || null;
    }
    // 搜索依赖
    searchDependencies(keyword) {
        const results = [];
        for (const tree of this.repositoryTreeCache.values()) {
            // 搜索groupId
            if (tree.groupId.toLowerCase().includes(keyword.toLowerCase())) {
                for (const [artifactId, info] of Object.entries(tree.artifacts)) {
                    results.push({
                        groupId: tree.groupId,
                        artifactId,
                        versions: info.versions
                    });
                }
                continue;
            }
            // 搜索artifactId
            for (const [artifactId, info] of Object.entries(tree.artifacts)) {
                if (artifactId.toLowerCase().includes(keyword.toLowerCase())) {
                    results.push({
                        groupId: tree.groupId,
                        artifactId,
                        versions: info.versions
                    });
                }
            }
        }
        return results;
    }
    // 获取依赖源码
    async getDependencySource(groupId, artifactId, version, className) {
        console.log(`🔍 获取源码: ${groupId}:${artifactId}:${version} -> ${className}`);
        const config = await this.configManager.getConfig();
        const groupPath = groupId.replace(/\./g, path.sep);
        const versionDir = path.join(config.localRepository, groupPath, artifactId, version);
        if (!fs.existsSync(versionDir)) {
            throw new Error(`依赖版本目录不存在: ${versionDir}`);
        }
        // 首先尝试从sources JAR获取源码
        const sourcesJar = path.join(versionDir, `${artifactId}-${version}-sources.jar`);
        if (fs.existsSync(sourcesJar)) {
            console.log('📦 从sources JAR获取源码...');
            try {
                return await this.extractSourceFromJar(sourcesJar, className);
            }
            catch (error) {
                console.log(`⚠️  sources JAR提取失败: ${error.message}`);
            }
        }
        // 如果没有sources JAR，使用CFR反编译
        const mainJar = path.join(versionDir, `${artifactId}-${version}.jar`);
        if (fs.existsSync(mainJar)) {
            console.log('🔧 使用CFR反编译...');
            return await this.decompiler.decompileClass(mainJar, className);
        }
        throw new Error(`无法找到JAR文件: ${mainJar}`);
    }
    // 从JAR文件中提取源码
    async extractSourceFromJar(jarPath, className) {
        const data = await fs.readFile(jarPath);
        const zip = new JSZip();
        const contents = await zip.loadAsync(data);
        // 转换类名为文件路径
        const sourceFilePath = className.replace(/\./g, '/') + '.java';
        const file = contents.files[sourceFilePath];
        if (!file) {
            throw new Error(`源文件不存在: ${sourceFilePath}`);
        }
        return await file.async('text');
    }
    // 在仓库中搜索类
    async searchClassInRepository(className) {
        console.log(`🔍 在仓库中搜索类: ${className}`);
        const results = [];
        const keyword = className.toLowerCase();
        // 遍历所有依赖
        for (const tree of this.repositoryTreeCache.values()) {
            for (const [artifactId, info] of Object.entries(tree.artifacts)) {
                // 检查最新版本的类列表
                const latestVersion = info.latestVersion;
                try {
                    const structure = await this.getDependencyStructure(tree.groupId, artifactId, latestVersion);
                    // 搜索匹配的类
                    for (const fullClassName of structure.classes) {
                        const simpleClassName = fullClassName.split('.').pop() || '';
                        if (simpleClassName.toLowerCase().includes(keyword)) {
                            results.push({
                                className: simpleClassName,
                                packageName: fullClassName.substring(0, fullClassName.lastIndexOf('.')),
                                fullClassName: fullClassName,
                                dependency: {
                                    groupId: tree.groupId,
                                    artifactId: artifactId,
                                    version: latestVersion,
                                    available: true,
                                    hasSource: structure.hasSource,
                                    localPath: structure.mainJarPath,
                                    sourcePath: structure.sourcePath
                                },
                                sourceType: structure.hasSource ? 'sources-jar' : 'decompiled'
                            });
                        }
                    }
                }
                catch (error) {
                    // 忽略分析失败的依赖
                    console.log(`⚠️  跳过依赖分析: ${tree.groupId}:${artifactId}:${latestVersion}`);
                }
            }
        }
        console.log(`✅ 找到 ${results.length} 个匹配的类`);
        return results;
    }
}
