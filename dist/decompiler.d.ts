export declare class JavaDecompiler {
    private readonly tempDir;
    private readonly mavenResolver;
    private projectInfo?;
    constructor();
    decompileClass(jarPath: string, className: string): Promise<string>;
    searchClassInJar(jarPath: string, searchTerm: string): Promise<string[]>;
    private extractClassFromJar;
    private runEnhancedJavap;
    private runJavapCommand;
    private runCfrDecompiler;
    private formatSourceCode;
    private generateFallbackSource;
    private generateReadableSource;
    private analyzeClassFile;
}
