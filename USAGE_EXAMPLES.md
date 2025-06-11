# Java Decompiler MCP 使用示例

## 基本使用场景

### 1. 查看项目依赖

当你想了解项目使用了哪些依赖时：

**用户问题：**
```
请帮我列出当前项目的所有Maven依赖
```

**MCP响应：**
```
项目依赖列表 (36 个依赖):

org.springframework.boot:spring-boot-starter-test:3.4.1
javax.xml.bind:jaxb-api:2.3.1
org.glassfish.jaxb:jaxb-runtime:2.3.1
com.google.protobuf:protobuf-java:3.25.5
commons-beanutils:commons-beanutils:1.9.4
commons-collections:commons-collections:3.2.2
net.java.dev.jna:jna:5.13.0
org.springframework.boot:spring-boot-starter-web:3.4.1
org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.3
com.mysql:mysql-connector-j:9.1.0
...
```

### 2. 搜索特定功能的类

当你想找到实现某个功能的类时：

**用户问题：**
```
帮我在项目依赖中搜索包含 "SpringApplication" 的类
```

**MCP响应：**
```
搜索结果:

依赖: org.springframework.boot:spring-boot:3.4.1
找到的类:
  - org.springframework.boot.SpringApplication
  - org.springframework.boot.SpringApplicationBanner
  - org.springframework.boot.SpringApplicationExtension
```

### 3. 获取类的源码

当你想了解某个类的具体实现时：

**用户问题：**
```
我想看看 org.springframework.boot.SpringApplication 这个类的源码实现
```

**MCP响应：**
```
反编译源码 (org.springframework.boot:spring-boot:3.4.1 - org.springframework.boot.SpringApplication):

// ===== Javap输出 =====
Compiled from "SpringApplication.java"
public class org.springframework.boot.SpringApplication {
  public static final java.lang.String BANNER_LOCATION_PROPERTY;
  public static final java.lang.String LAZY_INITIALIZATION_PROPERTY;
  
  static {};
    Code:
       0: ldc           #2    // String spring.banner.location
       2: putstatic     #3    // Field BANNER_LOCATION_PROPERTY:Ljava/lang/String;
       5: ldc           #4    // String spring.main.lazy-initialization
       7: putstatic     #5    // Field LAZY_INITIALIZATION_PROPERTY:Ljava/lang/String;
      10: return
  
  public org.springframework.boot.SpringApplication(java.lang.Class<?>...);
    Code:
       0: aload_0
       1: invokespecial #6    // Method java/lang/Object."<init>":()V
       4: aload_0
       5: aload_1
       6: invokestatic  #7    // Method java/util/Arrays.asList:([Ljava/lang/Object;)Ljava/util/List;
       9: invokespecial #8    // Method initialize:(Ljava/util/Collection;)V
      12: return
...

// ===== 简化源码视图 =====
// 这是一个简化的类信息视图
// 类名: org.springframework.boot.SpringApplication
// 编译版本: Java 17 (major: 61, minor: 0)
// 文件大小: 25689 字节

public class SpringApplication {
    // 注意: 这是一个占位符视图
    // 完整的源码反编译需要更复杂的字节码分析工具
    // 如JD-Core, CFR, 或 Procyon 等专业反编译器
    
    // 建议安装Java SDK以获得javap工具的完整反编译输出
    // 或者考虑集成专业的Java反编译库
}
```

## 高级使用场景

### 1. 分析Spring Boot自动配置

**用户问题：**
```
我想了解Spring Boot的自动配置机制，请帮我找到相关的类
```

**操作步骤：**
1. 首先搜索自动配置相关的类
2. 然后查看具体实现

```
帮我在项目依赖中搜索包含 "AutoConfiguration" 的类
```

### 2. 研究数据库连接池实现

**用户问题：**
```
我想看看Druid连接池是如何实现的，请帮我找到相关类并显示源码
```

**操作步骤：**
1. 搜索Druid相关类
2. 查看核心实现类的源码

```
帮我在项目依赖中搜索包含 "DruidDataSource" 的类
```

### 3. 分析Elasticsearch客户端

**用户问题：**
```
我想了解项目中使用的Elasticsearch客户端的实现，请帮我查看相关源码
```

**操作步骤：**
```
帮我获取 org.elasticsearch.client.RestClient 类的源码
- groupId: org.elasticsearch.client
- artifactId: elasticsearch-rest-client
- version: 8.14.3
- className: org.elasticsearch.client.RestClient
```

## 故障排除示例

### 1. 找不到类的情况

**用户问题：**
```
帮我获取 com.example.MyClass 类的源码
```

**可能的响应：**
```
反编译失败: 在JAR包中未找到类: com.example.MyClass
```

**解决方案：**
- 确认类名拼写正确
- 检查groupId、artifactId、version是否正确
- 先用搜索功能找到正确的类名

### 2. 网络连接问题

**可能的错误：**
```
反编译失败: 无法下载依赖: org.springframework.boot:spring-boot:3.4.1。请检查网络连接或依赖是否存在。
```

**解决方案：**
- 检查网络连接
- 确认Maven仓库可访问
- 检查防火墙设置

### 3. 版本不存在

**可能的错误：**
```
反编译失败: 无法下载依赖: com.example:my-lib:999.999.999。请检查网络连接或依赖是否存在。
```

**解决方案：**
- 检查版本号是否正确
- 使用项目pom.xml中定义的版本

## 最佳实践

### 1. 逐步探索

不要一次性请求大量信息，而是按步骤探索：

1. 先列出项目依赖
2. 搜索感兴趣的类
3. 查看具体类的源码

### 2. 使用搜索功能

当不确定确切的类名时，使用搜索功能：

```
帮我在项目依赖中搜索包含 "Http" 的类
```

### 3. 关注核心类

重点关注以下类型的类：
- 配置类（Configuration）
- 工厂类（Factory）
- 服务类（Service）
- 工具类（Utils）

### 4. 结合文档

反编译的代码可能缺少注释，建议结合官方文档一起理解。

## 常见问题

**Q: 为什么有些类显示不完整？**
A: 这个MCP插件主要使用javap工具，显示的是字节码信息。要获得完整的源码，需要集成专业的反编译器。

**Q: 如何查看类的方法签名？**
A: javap输出包含了完整的方法签名信息，包括参数类型和返回值类型。

**Q: 可以反编译内部类吗？**
A: 可以，但需要使用完整的内部类名，如：`com.example.OuterClass$InnerClass`

**Q: 如何处理泛型信息？**
A: javap输出会显示泛型的原始类型信息，但可能不包含完整的泛型参数。 