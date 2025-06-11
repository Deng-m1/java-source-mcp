import fs from 'fs-extra';
import path from 'node:path';
import { spawn } from 'node:child_process';
import yauzl from 'yauzl';
import { MavenDependencyResolver } from './maven-resolver.js';
export class JavaDecompiler {
    tempDir;
    mavenResolver;
    projectInfo;
    constructor() {
        this.tempDir = path.join(process.cwd(), '.temp-decompile');
        fs.ensureDirSync(this.tempDir);
        this.mavenResolver = new MavenDependencyResolver();
    }
    async decompileClass(jarPath, className) {
        try {
            // 获取项目信息（包括Java版本）
            if (!this.projectInfo) {
                try {
                    this.projectInfo = await this.mavenResolver.parsePomProject('pom.xml');
                }
                catch (error) {
                    // 如果无法获取项目信息，使用默认值
                    this.projectInfo = {
                        javaVersion: '1.8',
                        sourceVersion: '1.8',
                        targetVersion: '1.8',
                        dependencies: []
                    };
                }
            }
            // 首先尝试从JAR包中提取.class文件
            const classFileName = className.replace(/\./g, '/') + '.class';
            const extractedClassPath = await this.extractClassFromJar(jarPath, classFileName);
            if (!extractedClassPath) {
                throw new Error(`在JAR包中未找到类: ${className}`);
            }
            // 使用javap进行完整反编译
            const javapResult = await this.runEnhancedJavap(jarPath, className);
            return javapResult;
        }
        catch (error) {
            throw new Error(`反编译类 ${className} 失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async searchClassInJar(jarPath, searchTerm) {
        return new Promise((resolve, reject) => {
            const foundClasses = [];
            yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`无法打开JAR文件: ${err.message}`));
                    return;
                }
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (entry.fileName.endsWith('.class') && !entry.fileName.includes('$')) {
                        const className = entry.fileName
                            .replace(/\//g, '.')
                            .replace(/\.class$/, '');
                        if (className.toLowerCase().includes(searchTerm.toLowerCase())) {
                            foundClasses.push(className);
                        }
                    }
                    zipfile.readEntry();
                });
                zipfile.on('end', () => {
                    resolve(foundClasses);
                });
                zipfile.on('error', (error) => {
                    reject(new Error(`读取JAR文件时发生错误: ${error.message}`));
                });
            });
        });
    }
    async extractClassFromJar(jarPath, classFileName) {
        return new Promise((resolve, reject) => {
            yauzl.open(jarPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`无法打开JAR文件: ${err.message}`));
                    return;
                }
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (entry.fileName === classFileName) {
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(new Error(`无法读取类文件: ${err.message}`));
                                return;
                            }
                            const outputPath = path.join(this.tempDir, path.basename(classFileName));
                            const writeStream = fs.createWriteStream(outputPath);
                            readStream.pipe(writeStream);
                            writeStream.on('close', () => {
                                resolve(outputPath);
                            });
                            writeStream.on('error', (error) => {
                                reject(new Error(`写入临时文件失败: ${error.message}`));
                            });
                        });
                        return;
                    }
                    zipfile.readEntry();
                });
                zipfile.on('end', () => {
                    resolve(null);
                });
                zipfile.on('error', (error) => {
                    reject(new Error(`读取JAR文件时发生错误: ${error.message}`));
                });
            });
        });
    }
    async runEnhancedJavap(jarPath, className) {
        try {
            // 首先尝试使用CFR获取真正的Java源码
            const cfrResult = await this.runCfrDecompiler(jarPath, className);
            if (cfrResult && cfrResult.includes('public class') || cfrResult.includes('public interface')) {
                return this.formatSourceCode(cfrResult, className, jarPath, 'CFR');
            }
            // 如果CFR失败，尝试使用javap获取字节码信息
            const javapOptions = [
                ['-cp', jarPath, '-s', '-p', '-c', className],
                ['-cp', jarPath, '-p', '-c', className],
                ['-cp', jarPath, className]
            ];
            let bestResult = '';
            let javapWorked = false;
            for (const options of javapOptions) {
                try {
                    const result = await this.runJavapCommand(options);
                    if (result && result.length > bestResult.length) {
                        bestResult = result;
                        javapWorked = true;
                    }
                }
                catch (error) {
                    continue;
                }
            }
            if (javapWorked) {
                return this.formatSourceCode(bestResult, className, jarPath, 'javap');
            }
            else {
                return await this.generateFallbackSource(jarPath, className);
            }
        }
        catch (error) {
            return await this.generateFallbackSource(jarPath, className);
        }
    }
    async runJavapCommand(options) {
        return new Promise((resolve, reject) => {
            const javap = spawn('javap', options, {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let output = '';
            let errorOutput = '';
            javap.stdout.on('data', (data) => {
                output += data.toString();
            });
            javap.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            javap.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    resolve(output);
                }
                else {
                    reject(new Error(`javap退出码: ${code}, 错误: ${errorOutput}`));
                }
            });
            javap.on('error', (error) => {
                reject(new Error(`无法执行javap: ${error.message}`));
            });
        });
    }
    async runCfrDecompiler(jarPath, className) {
        try {
            const cfrJarPath = path.join(process.cwd(), 'tools', 'cfr.jar');
            // 检查CFR是否存在
            if (!fs.existsSync(cfrJarPath)) {
                throw new Error('CFR反编译器未找到');
            }
            // 提取class文件到临时目录
            const classFileName = className.replace(/\./g, '/') + '.class';
            const extractedClassPath = await this.extractClassFromJar(jarPath, classFileName);
            if (!extractedClassPath) {
                throw new Error('无法从JAR中提取class文件');
            }
            // 使用CFR反编译整个JAR包中的指定类
            return new Promise((resolve, reject) => {
                const cfr = spawn('java', [
                    '-jar', cfrJarPath,
                    jarPath,
                    '--outputdir', this.tempDir,
                    '--silent', 'true',
                    className
                ], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                let output = '';
                let errorOutput = '';
                cfr.stdout.on('data', (data) => {
                    output += data.toString();
                });
                cfr.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                cfr.on('close', async (code) => {
                    try {
                        if (code === 0) {
                            // CFR会生成.java文件在包结构目录中，查找它
                            const classNameParts = className.split('.');
                            const javaFileName = classNameParts[classNameParts.length - 1] + '.java';
                            const packagePath = classNameParts.slice(0, -1).join('/');
                            const javaFilePath = path.join(this.tempDir, packagePath, javaFileName);
                            if (fs.existsSync(javaFilePath)) {
                                const sourceCode = await fs.readFile(javaFilePath, 'utf8');
                                // 清理临时文件
                                fs.unlink(javaFilePath).catch(() => { });
                                resolve(sourceCode);
                            }
                            else {
                                // 如果没有生成文件，但有输出，返回输出
                                resolve(output || '');
                            }
                        }
                        else {
                            reject(new Error(`CFR退出码: ${code}, 错误: ${errorOutput}`));
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                cfr.on('error', (error) => {
                    reject(new Error(`无法执行CFR: ${error.message}`));
                });
            });
        }
        catch (error) {
            throw new Error(`CFR反编译失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    formatSourceCode(sourceCode, className, jarPath, tool) {
        const javaVersionInfo = this.projectInfo ?
            `项目Java版本: ${this.projectInfo.javaVersion || this.projectInfo.sourceVersion || '未知'}` :
            '项目Java版本: 未知';
        if (tool === 'CFR') {
            // CFR输出的是真正的Java源码
            return `// 反编译的Java类: ${className}
// JAR包: ${path.basename(jarPath)}
// ${javaVersionInfo}
// 反编译工具: CFR (Java源码)

${sourceCode}

// 注意: 这是CFR反编译生成的Java源码，接近原始代码
// CFR是一个强大的Java反编译器，能够重构出易读的源代码`;
        }
        else {
            // javap输出的是字节码信息
            return `// 反编译的Java类: ${className}
// JAR包: ${path.basename(jarPath)}
// ${javaVersionInfo}
// 反编译工具: javap (字节码)

${sourceCode}

// 注意: 这是javap的输出，显示了类的字节码和结构信息
// 如需更易读的Java源码，CFR反编译器可能无法处理此类`;
        }
    }
    async generateFallbackSource(jarPath, className) {
        try {
            // 尝试从JAR中提取class文件进行基本分析
            const classFileName = className.replace(/\./g, '/') + '.class';
            const extractedClassPath = await this.extractClassFromJar(jarPath, classFileName);
            if (extractedClassPath) {
                const basicInfo = await this.analyzeClassFile(extractedClassPath);
                const javaVersionInfo = this.projectInfo ?
                    `项目Java版本: ${this.projectInfo.javaVersion || this.projectInfo.sourceVersion || '未知'}` :
                    '项目Java版本: 未知';
                return `// 反编译的Java类: ${className}
// JAR包: ${path.basename(jarPath)}
// ${javaVersionInfo}
// 反编译工具: 基本字节码分析

${basicInfo}

// 注意: 无法使用javap命令，使用了基本的字节码分析
// 建议安装Java SDK以获得完整的反编译功能
// 或者检查javap是否在系统PATH中`;
            }
            else {
                throw new Error('无法提取class文件');
            }
        }
        catch (error) {
            return `// 反编译失败: ${className}
// JAR包: ${path.basename(jarPath)}
// 错误: ${error instanceof Error ? error.message : String(error)}

// 请确保:
// 1. 系统中已安装Java SDK
// 2. javap命令在系统PATH中
// 3. JAR包完整且类名正确`;
        }
    }
    async generateReadableSource(classPath, className) {
        try {
            // 简单的类文件分析，提取基本信息
            const classBuffer = await fs.readFile(classPath);
            // 简单解析class文件头
            if (classBuffer.length < 10 ||
                classBuffer.readUInt32BE(0) !== 0xCAFEBABE) {
                return '// 无效的class文件格式';
            }
            const minorVersion = classBuffer.readUInt16BE(4);
            const majorVersion = classBuffer.readUInt16BE(6);
            let javaVersion = '未知';
            switch (majorVersion) {
                case 45:
                    javaVersion = 'Java 1.1';
                    break;
                case 46:
                    javaVersion = 'Java 1.2';
                    break;
                case 47:
                    javaVersion = 'Java 1.3';
                    break;
                case 48:
                    javaVersion = 'Java 1.4';
                    break;
                case 49:
                    javaVersion = 'Java 5';
                    break;
                case 50:
                    javaVersion = 'Java 6';
                    break;
                case 51:
                    javaVersion = 'Java 7';
                    break;
                case 52:
                    javaVersion = 'Java 8';
                    break;
                case 53:
                    javaVersion = 'Java 9';
                    break;
                case 54:
                    javaVersion = 'Java 10';
                    break;
                case 55:
                    javaVersion = 'Java 11';
                    break;
                case 56:
                    javaVersion = 'Java 12';
                    break;
                case 57:
                    javaVersion = 'Java 13';
                    break;
                case 58:
                    javaVersion = 'Java 14';
                    break;
                case 59:
                    javaVersion = 'Java 15';
                    break;
                case 60:
                    javaVersion = 'Java 16';
                    break;
                case 61:
                    javaVersion = 'Java 17';
                    break;
                case 62:
                    javaVersion = 'Java 18';
                    break;
                case 63:
                    javaVersion = 'Java 19';
                    break;
                case 64:
                    javaVersion = 'Java 20';
                    break;
                case 65:
                    javaVersion = 'Java 21';
                    break;
                default:
                    javaVersion = `Java ${majorVersion - 44}`;
                    break;
            }
            return `// 这是一个简化的类信息视图
// 类名: ${className}
// 编译版本: ${javaVersion} (major: ${majorVersion}, minor: ${minorVersion})
// 文件大小: ${classBuffer.length} 字节

public class ${className.split('.').pop()} {
    // 注意: 这是一个占位符视图
    // 完整的源码反编译需要更复杂的字节码分析工具
    // 如JD-Core, CFR, 或 Procyon 等专业反编译器
    
    // 建议安装Java SDK以获得javap工具的完整反编译输出
    // 或者考虑集成专业的Java反编译库
}`;
        }
        catch (error) {
            return `// 分析类文件时发生错误: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    async analyzeClassFile(classPath) {
        try {
            const classBuffer = await fs.readFile(classPath);
            if (classBuffer.length < 10 || classBuffer.readUInt32BE(0) !== 0xCAFEBABE) {
                throw new Error('无效的class文件格式');
            }
            // 基本的class文件结构分析
            const majorVersion = classBuffer.readUInt16BE(6);
            const constantPoolCount = classBuffer.readUInt16BE(8);
            return `// Class文件分析
// Magic: 0x${classBuffer.readUInt32BE(0).toString(16)}
// Major Version: ${majorVersion}
// Constant Pool Count: ${constantPoolCount}
// 文件大小: ${classBuffer.length} 字节

// 注意: 完整的反编译需要专业工具
// 建议安装完整的Java开发工具包(JDK)以使用javap命令`;
        }
        catch (error) {
            throw new Error(`分析class文件失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
