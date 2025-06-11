import { MavenConfig } from './maven-config.js';
export interface DependencyInfo {
    groupId: string;
    artifactId: string;
    version: string;
    scope?: string;
    type?: string;
    classifier?: string;
    available: boolean;
    hasSource: boolean;
    localPath?: string;
    sourcePath?: string;
}
export interface ClassSearchResult {
    className: string;
    packageName: string;
    fullClassName: string;
    dependency: DependencyInfo;
    sourceType: 'sources-jar' | 'decompiled';
}
export interface DependencyStructure {
    groupId: string;
    artifactId: string;
    version: string;
    jarFiles: string[];
    classes: string[];
    packages: string[];
    hasSource: boolean;
    sourcePath?: string;
    mainJarPath: string;
}
export interface RepositoryTree {
    groupId: string;
    artifacts: {
        [artifactId: string]: {
            versions: string[];
            latestVersion: string;
        };
    };
}
export declare class GlobalMavenService {
    private configManager;
    private decompiler;
    private dependencyCache;
    private repositoryTreeCache;
    private dependencyStructureCache;
    constructor();
    initialize(): Promise<void>;
    scanLocalRepository(): Promise<DependencyInfo[]>;
    private scanDirectory;
    private createDependencyInfo;
    searchClass(className: string): Promise<ClassSearchResult[]>;
    private searchInSourcesJar;
    private searchInJar;
    getClassSource(groupId: string, artifactId: string, version: string, className: string): Promise<string>;
    private getSourceFromSourcesJar;
    listClasses(groupId: string, artifactId: string, version: string): Promise<string[]>;
    private listClassesFromSourcesJar;
    private listClassesFromJar;
    getDependencyInfo(groupId: string, artifactId: string, version: string): Promise<DependencyInfo | null>;
    getMavenConfig(): Promise<MavenConfig>;
    buildRepositoryTree(): Promise<void>;
    private scanRepositoryForTree;
    getDependencyStructure(groupId: string, artifactId: string, version: string): Promise<DependencyStructure>;
    getRepositoryTree(): RepositoryTree[];
    getRepositoryTreeByGroupId(groupId: string): RepositoryTree | null;
    searchDependencies(keyword: string): {
        groupId: string;
        artifactId: string;
        versions: string[];
    }[];
    getDependencySource(groupId: string, artifactId: string, version: string, className: string): Promise<string>;
    private extractSourceFromJar;
    searchClassInRepository(className: string): Promise<ClassSearchResult[]>;
}
