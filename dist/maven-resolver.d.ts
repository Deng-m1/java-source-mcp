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
export declare class MavenDependencyResolver {
    private readonly cacheDir;
    private readonly defaultRepositories;
    constructor();
    parsePomProject(pomPath: string): Promise<ProjectInfo>;
    parsePomDependencies(pomPath: string): Promise<MavenDependency[]>;
    downloadDependency(groupId: string, artifactId: string, version: string): Promise<string>;
    resolveDependencyVersion(groupId: string, artifactId: string): Promise<string[]>;
}
