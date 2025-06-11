# PowerShell脚本：更新Cursor MCP配置
# 为现有的MCP配置添加Java Decompiler插件

$configPath = "c:\Users\12644\.cursor\mcp.json"
$currentDir = (Get-Location).Path
$mcpPath = "$currentDir\dist\index.js"

Write-Host "当前目录: $currentDir"
Write-Host "MCP路径: $mcpPath"
Write-Host "配置文件: $configPath"

# 检查配置文件是否存在
if (-Not (Test-Path $configPath)) {
    Write-Error "找不到Cursor MCP配置文件: $configPath"
    exit 1
}

# 检查编译后的文件是否存在
if (-Not (Test-Path "$currentDir\dist\index.js")) {
    Write-Error "找不到编译后的MCP文件，请先运行: npm run build"
    exit 1
}

# 读取现有配置
$config = Get-Content $configPath -Raw | ConvertFrom-Json

# 添加java-decompiler配置
$config.mcpServers | Add-Member -Type NoteProperty -Name "java-decompiler" -Value @{
    command = "node"
    args = @($mcpPath.Replace('\', '\\'))
    env = @{}
} -Force

# 将更新后的配置写回文件
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath

Write-Host "✅ 成功添加Java Decompiler MCP配置！"
Write-Host ""
Write-Host "配置内容："
Write-Host "  java-decompiler:"
Write-Host "    command: node"
Write-Host "    args: [$mcpPath]"
Write-Host ""
Write-Host "📋 下一步："
Write-Host "1. 重启Cursor"
Write-Host "2. 在Cursor中测试: '请列出我当前项目的所有Maven依赖'"
Write-Host "" 