# VIBE FLOW: Sleep-Mode Development Engine

一个智能化的自动化开发工具，通过领域自适应架构和自愈流水线，让你在"休眠模式"下也能高效完成开发任务。

## 🚀 核心特性

- **领域自适应**: 自动识别硬件开发、AI机器人、Web应用等不同领域，应用相应的开发策略
- **语义索引**: 使用SuperClaude构建项目语义地图，智能理解代码架构
- **并行开发**: 将任务拆解为独立模块，通过多Agent并行流水线开发
- **自愈机制**: 自动测试和修复，最多重试2次，确保代码质量
- **Linus式审查**: 以Linus Torvalds的视角进行代码审查，保证代码品味

## 🎯 支持的领域

| 领域 | 识别标志 | 特色功能 |
|------|----------|----------|
| **HARDWARE** | `platformio.ini`, `CMakeLists.txt` | Mock硬件接口，native编译验证 |
| **AI_ROBOT** | `mamba_env.yaml`, `src/ros2` | 分离训练和推理逻辑，数据校验 |
| **WEB** | `package.json`, `next.config.js` | 组件测试，API契约验证 |
| **GENERIC** | 其他 | 默认pytest测试策略 |

## 📋 依赖要求

- `claude` - Claude CLI工具
- `jq` - JSON处理工具
- `git` - 版本控制
- `node` - Node.js运行时
- `npx` - 包执行器

## 🔧 使用方法

1. **首次运行**:
   ```bash
   chmod +x vibe.sh
   ./vibe.sh
   ```

2. **编辑需求**:
   编辑生成的 `REQUIREMENTS.md` 文件，描述你的项目需求

3. **再次运行**:
   ```bash
   ./vibe.sh
   ```

## 🏗️ 工作流程

1. **Librarian**: 分析项目代码，构建语义索引 (`project_index.xml`)
2. **Architect**: 基于需求和索引，生成并行开发计划 (`vibe_plan.json`)
3. **Factory**: 启动多条并行开发流水线
   - Builder: 编写代码和测试
   - Verifier: 运行测试验证
   - Healer: 自动修复失败
   - Linus: 代码质量审查
4. **Integrator**: 生成最终报告 (`vibe_report.md`)

## 📁 输出文件

- `project_index.xml` - 项目语义索引
- `vibe_plan.json` - 开发任务计划
- `vibe_report.md` - 最终开发报告
- `.vibe_logs/` - 详细的执行日志

## ⚙️ 配置选项

在脚本开头可以调整以下参数：

```bash
MAX_RETRIES=2          # 最大重试次数
INDEX_FILE="project_index.xml"
PLAN_FILE="vibe_plan.json"
REPORT_FILE="vibe_report.md"
LOG_DIR=".vibe_logs"
```

## 🎨 核心理念

> "好代码没有特殊情况" - 通过智能数据结构设计消除边界条件
>
> "Never break userspace" - 保证用户可见行为不变
>
> "实用主义优先" - 解决实际问题，不追求理论完美

## 🚨 注意事项

- 首次运行会自动初始化git仓库
- 确保已安装所有依赖工具
- 建议在项目根目录下运行
- 生成的代码会自动进行测试验证

## 📄 许可证

本项目采用开源许可证，详见LICENSE文件。

---

*让AI为你打工，你专注于创意和架构！*