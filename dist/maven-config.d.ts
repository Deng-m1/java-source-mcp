export interface MavenRepository {
    id: string;
    url: string;
    name?: string;
}
export interface MavenConfig {
    localRepository: string;
    repositories: MavenRepository[];
    mirrors: {
        [key: string]: string;
    };
    proxies: any[];
}
export declare class MavenConfigManager {
    private config;
    private readonly defaultLocalRepo;
    constructor();
    getConfig(): Promise<MavenConfig>;
    private loadConfig;
    private loadFromEnvironment;
    private loadFromSettings;
    private parseSettingsXml;
    private ensureDefaultRepositories;
    getLocalArtifactPath(groupId: string, artifactId: string, version: string, classifier?: string): string;
    hasLocalArtifact(groupId: string, artifactId: string, version: string, classifier?: string): Promise<boolean>;
    getAvailableClassifiers(groupId: string, artifactId: string, version: string): Promise<string[]>;
    getSourcesJarPath(groupId: string, artifactId: string, version: string): Promise<string | null>;
}
