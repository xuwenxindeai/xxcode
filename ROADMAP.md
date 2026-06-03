# xxcode 路线图：对标 Claude Code

> 目标：把 xxcode 从「能跑通核心循环的练手项目」打磨成对标 Claude Code / opencode 的完整 AI 编程 CLI。
> 原则：**先补内功（上下文 / 可靠性 / 安全），再做表面（交互）**。每阶段独立可交付。

## 已完成（基础整治）

- ✅ 修复会崩溃 / API 报错的核心 bug（project_tree 缺参、tool_calls 配对、上下文压缩配对、missing-role 流式崩溃）
- ✅ 工具安全层 `withToolSafety`（默认值填充 / 必填校验 / 错误兜底）
- ✅ TUI 改流式 + 工具调用折叠块 + 宽度自适应
- ✅ 错误日志（`~/.xxcode/logs/error.log`）
- ✅ LLM 层改用 Vercel AI SDK，支持多 provider（OpenAI 兼容 / Claude / Gemini）
- ✅ 24 个单元测试 + engines + 版本号统一 + 文档诚实化

## 阶段路线

### P1 上下文工程 ⭐（进行中）
- [ ] 精确 token 计数（用 AI SDK 回传的 usage，替换中文 1.5/字的粗估）
- [ ] 自动 compact（上下文超阈值时把老对话摘要成一条，而非硬截断丢失）
- [ ] 上下文用量可见（`/context` + 状态行显示 已用 / 上限 / 百分比）
- [ ] prompt caching（provider 支持时复用 system + 工具定义）

**产出**：大仓库 / 长任务不再失忆。

### P2 可靠性 + 编辑/检索鲁棒性
- [ ] LLM 调用重试 / 超时（网络抖动不崩）
- [ ] 工具超时、错误恢复
- [ ] `edit_file` 模糊匹配 / 缩进容错
- [ ] agentic search 增强
- [ ] 扩测试覆盖

**产出**：改代码成功率高、用着不崩。

### P3 安全 / 权限
- [ ] 细粒度 allow/deny 规则 + 目录边界
- [ ] `run_shell` 真正接进 Docker 沙箱
- [ ] 替换易绕过的正则黑名单 `isDangerous`

**产出**：敢让它自主跑、敢给别人用。

### P4 任务编排
- [ ] plan mode（只读探索后出计划）
- [ ] TodoWrite 式任务跟踪
- [ ] subagent 完善（并行探索 / 专门 agent）

**产出**：能拆解复杂任务。

### P5 模型能力感知
- [ ] 接 models.dev 或内置能力元数据（token 上限 / 是否支持 tools / vision）
- [ ] 不支持工具调用时给出明确提示 / 降级

**产出**：换模型不踩坑。

### P6 MCP + 生态
- [ ] 完善 MCP（stdio / sse / http + resources / prompts）
- [ ] slash 命令体系、hooks 完善

**产出**：接入外部能力。

### P7 Ink 交互
- [ ] Ink 重写 REPL：固定底栏 + 实时斜杠命令补全菜单 + 全屏渲染

**产出**：Claude Code 级交互体验。

---

量级参考：S≈1 次迭代、M≈2–4 次、L≈5+ 次。当前进度：**P1（上下文工程）、P2（可靠性 + 大文件防护）已完成，下一步 P3（安全 / 权限）**。
