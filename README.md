# AIChatBot

基于 [NapCat](https://github.com/NapCatQQ/NapCat)（OneBot v11）+ DeepSeek API 的拟人化 QQ 聊天机器人，带 Web 管理面板。

## 分支管理

| 分支 | 版本 | 用途 |
|------|------|------|
| `main` | v1.2.0 | 生产正式版 |
| `dev1` | v1.2.0 | 功能完整版 |
| `dev2` | v1.2.0-dev | 活跃开发 |

开发流程：`dev2` 开发 → 自测通过 → 合并到 `dev1` → 稳定后合并到 `main`。

## 架构

```
项目根目录/
├── src/                    # Bot 核心
│   ├── index.ts            # 入口：WebSocket 连接、消息路由
│   ├── ai/                 # AI 模块
│   │   ├── client.ts       # DeepSeek API 封装
│   │   ├── prompt.ts       # 角色提示词生成
│   │   ├── emoji.ts        # 70+ 颜文字情绪匹配
│   │   ├── sticker.ts      # 表情包搜索
│   │   ├── vision.ts       # 图片识别
│   │   └── calendar.ts     # 实时时间 + 公历农历节日
│   ├── context/
│   │   └── memory.ts       # 双层记忆 + 好感度评分
│   ├── emotion/
│   │   └── analyzer.ts     # 17种情绪识别
│   └── remind/
│       └── scheduler.ts    # 定时提醒 + 节日祝福
├── src/skills/              # 技能插件（v1.1+）
│   ├── registry.ts          # 技能注册中心
│   └── reminder.ts          # 提醒技能（示例）
├── web/                    # 控制面板（Vue3 + Vite + Express）
│   ├── server.js           # Express API 服务
│   ├── index.html          # Vite 入口
│   └── src/                # Vue3 SFC 组件
│       ├── App.vue         # 根组件（侧边栏 + 路由）
│       ├── main.js         # Vue 应用入口
│       ├── api.js          # API 封装 + Toast
│       └── components/     # 页面组件
│           ├── Dashboard.vue
│           ├── Settings.vue
│           └── Logs.vue
├── data/                   # 运行时数据
│   ├── config.json         # 角色配置（面板可编辑）
│   ├── memory.json         # 对话记忆 + 用户画像
│   ├── reminders.json      # 提醒记录
│   └── logs/               # Bot 日志
└── NapCat.Shell/           # NapCat QQ 框架（不含在 Git 中）
```

> **Skill 与 AI 模块的区别**
> - **Skills**：独立拦截能力。检测到触发条件 → 截断消息管道 → 自己处理并返回。适合提醒、天气、翻译等可独立完成的任务。
> - **AI 模块**（sticker/vision/calendar/emoji 等）：增强对话管道。必须在 AI 调用前后介入，补充上下文、匹配表情、注入时间。不能独立存在。

## 已实现模块

### 消息处理
- 私聊/群聊自动区分
- 群聊 @检测 + 多前缀匹配（name + nicknames + 自定义昵称）
- WebSocket 断线自动重连

### AI 对话
- DeepSeek API（支持切换 GPT-4o 等）
- 上下文窗口：最近 20 轮短时记忆 + 长期用户画像
- 温度 0.8，回复 1-3 句自然风格

### 角色系统（面板可编辑）
- 名字 / 昵称 / 年龄 / 性别
- 性格描述 / 说话风格 / 口头禅
- 爱好 / 最好朋友（QQ号绑定）/ 日常作息 / 讨厌的事
- 背景故事
- 全部从 config.json 读取，不硬编码

### 双层记忆
- 短时记忆：最近 20 轮对话
- 长期画像：每 10 轮自动提取用户信息，持久保存
- 画像注入提示词，Bot 越聊越了解你
- 角色配置与用户画像严格隔离，互不污染

### 好感度评分
四维评分 0-100：
- 消息量（每条 +0.04，封顶 40）
- 活跃天数（每天 +1.5，封顶 30）
- 深度对话（情绪强烈时 +3，封顶 20）
- 最近活跃（7天内 +10，14天 +6，30天 +3）
- 7天不聊开始衰减
- 最好朋友（QQ 匹配）：免衰减，永远满好感

### 情感分析
- 17 种情绪识别
- 自动匹配颜文字表情
- 情绪强烈时记录为深度对话，提升好感度

### 日历感知
- 每轮对话注入实时时间（年/月/日/周几）
- 公历节日：元旦、情人节、国庆等 16 个
- 农历节日：春节、端午、中秋等（2026 年映射表）

### 图片识别
- 接收图片 -> 调用 Vision API 描述内容
- 描述注入对话上下文，Bot 能"看懂"图片

### 提醒系统
- "5分钟后提醒我开会" / "3天后提醒我去机场" / "明天8点提醒我开会"
- 30秒扫描间隔，到期私聊通知
- 程序级拦截，不存入 AI 记忆

### 节日祝福
- 节假日当天 9:00 自动提醒给最好朋友发祝福

### Web 控制面板
- 仪表盘：NapCat/QQ 状态 + Bot 状态，一键启停
- 设置：可视化编辑角色人设、API Key、模型参数
- 日志：实时查看 + 彩色分类 + 下载/清空 + 系统状态栏
- Vue3 SFC + Vite 构建 + Express API，前后端分离

## 技术栈

| 层 | 技术 |
|------|------|
| Bot 语言 | TypeScript |
| AI SDK | OpenAI SDK（兼容 DeepSeek / GPT） |
| 前端框架 | Vue 3 + Vue Router |
| 构建工具 | Vite |
| 后端服务 | Express（Node.js） |
| 数据存储 | JSON 文件（后续迁移 SQLite/PostgreSQL） |
| QQ 协议 | NapCat（OneBot v11 WebSocket） |
| 日历 | lunar-javascript（农历动态计算） |

## 依赖

- NapCat QQ 框架：提供 OneBot v11 WebSocket 接口
- DeepSeek API：默认 AI 模型（兼容 OpenAI 格式）
- Node.js 20+ + TypeScript
- Vue 3 + Vite + Express

## 配置说明

### 首次安装

```bash
npm install      # 安装依赖
npm run build    # 编译 TypeScript
cp .env.example .env    # 创建环境变量文件，填入真实值
```

### 环境变量 .env

```env
# DeepSeek API
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat

# QQ Bot 连接
BOT_SELF_ID=你的QQ号
BOT_WS_ENDPOINT=ws://127.0.0.1:6700
```

### 角色配置 data/config.json

```json
{
  "character": {
    "name": "小明",
    "nicknames": ["明明", "阿明"],
    "age": 20,
    "gender": "男",
    "personality": "幽默开朗，偶尔毒舌，乐于助人",
    "speechStyle": "随性自然，爱用梗和网络用语",
    "hobbies": ["打游戏", "追番", "篮球"],
    "catchphrase": "笑死、确实",
    "dailyRoutine": "白天上课，晚上打游戏到一两点",
    "dislikes": "早起、写论文",
    "bestFriend": {
      "qq": "123456789",
      "nickname": "老王",
      "description": "大学室友，无话不谈"
    },
    "background": "大三计算机系学生，梦想是进大厂当全栈"
  },
  "ai": {
    "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "maxTokens": 1024,
    "temperature": 0.8
  },
  "memory": {
    "profileExtractionInterval": 10,
    "shortTermLimit": 20
  },
  "bot": {
    "stickerSearchEnabled": true,
    "emojiEnabled": true
  }
}
```

> **首次启动**：`config.json` 不存在时，Bot 自动使用"小明"示例人设正常运行。想自定义角色才需创建此文件。<br>
> 也可通过 Web 面板"设置"页可视化编辑，保存后重启 Bot 生效。

### NapCat 配置

1. 确保 NapCat 目录存在（含 `NapCatWinBootMain.exe` 和 QQ 客户端）
2. 首次启动后访问 NapCat 网页面板 `http://localhost:6099/webui`
3. 左侧「协议」→ 启用 OneBot v11 → 添加 WebSocket 服务端 → 端口 `6700`
4. 首次启动需扫码登录，之后可用快速登录
5. 如需自定义 NapCat 目录/QQ号，编辑 `.env` 中 `NAPCAT_DIR` 和 `BOT_SELF_ID`

### 最好朋友绑定

在 config.json 中设置 character.bestFriend.qq 为目标 QQ 号，Bot 自动识别：完全放松、颜文字随意用、好感永不衰减。

## 使用方式

### 本地开发

```bash
# 终端1：启动 Bot（TypeScript 热更）
npm run dev

# 终端2：启动面板（Vite 热更）
npm run panel:dev    # 打开 http://localhost:3000，代理 /api 到 5777
```

### 日常使用（推荐）

1. 双击 `web\start.vbs` → 面板后台启动 + 自动打开浏览器
2. 仪表盘点「启动 NapCat」→ 扫码登录 QQ
3. 点「启动 Bot」→ Bot 开始工作

之后面板后台持续运行，守护进程会自动维持 NapCat 和 Bot 在线。关闭计算机前无需手动停止。

### 部署模式

```bash
npm run build
node dist/index.js    # Bot
node web/server.js    # 面板
```

### 停止服务

面板仪表盘点击「关闭服务」，或：
```bash
taskkill /f /im node.exe    # 停止 Bot
taskkill /f /im QQ.exe      # 停止 QQ
```
## 部署方案

### 本地（当前）

所有模块跑在同一台 Windows 电脑上：
```
本地 Windows
├── NapCat + QQ（裸跑）
├── Bot（npm run dev / node dist/index.js）
├── Panel（node web/server.js）
└── data/（JSON 文件）
```
启动：`npm run panel` → 仪表盘点启停按钮。

### v2.0 云端（计划中）

```
Win VPS（腾讯云 4核8G, ~80 元/月）
├── NapCat + QQ（裸跑）
├── Docker
│   ├── aichatbot-bot
│   ├── aichatbot-panel
│   └── postgres
```

**核心不变**：AI、记忆、技能、平台适配层全部可移植，换平台只换入口。Docker Compose 一键 `docker compose up -d` 即可。

## 版本路线

### v1.0 - 基础功能

| 模块 | 状态 |
|------|------|
| OneBot 消息路由 + WebSocket 重连 | ✅ |
| DeepSeek AI 对话 | ✅ |
| 角色系统（名字/人设/背景/最好朋友） | ✅ |
| Web 控制面板（仪表盘/设置/日志） | ✅ |
| 短时记忆（最近 20 轮） | ✅ |
| 长期画像（每 10 轮自动提取） | ✅ |
| 好感度四维评分 + 时间衰减 | ✅ |
| 情感分析 + 颜文字/表情包 | ✅ |
| 日历感知 + 农历节日 | ✅ |
| 图片识别（Vision API） | ✅ |
| 正则提醒 + 节日祝福 | ✅ |
| 群聊 @检测 + 前缀匹配 + @回复 | ✅ |
| 面板守护进程 + 自动重启 NapCat | ✅ |
| 跨用户画像读取 | ✅ |
| 配置 JSON 导入/导出 | ✅ |
| Vue3 SFC + Vite 前后端分离 | ✅ |

### v1.1 - 优化迭代

| 模块 | 状态 |
|------|------|
| 消息去重 | ✅ |
| 昵称自动检测优化 | ✅ |
| 日志彩色分类 + 系统状态栏 | ✅ |
| 提醒语气词过滤（避免误触发） | ✅ |
| 最好朋友好感显示 100 | ✅ |
| 配置文件注释 + 校验 | ✅ |
| Git 分支管理（dev1/dev2/main） | ✅ |
| Bot PAD 情绪引擎（心情演化+贴纸联动） | ✅ |
| 表情包系统（本地 JSON + 360 搜图兜底） | ✅ |
| 平台抽象层（OneBot 适配器接口） | ✅ |

### v2.0 - 架构升级

**启动条件**：v1.2.0 稳定运行一周，无关键 Bug → 建 `dev3` 分支开动。

**v1.2 已铺垫**：
- ✅ 平台抽象层 `src/platforms/types.ts` + `onebot.ts`
- ✅ 技能插件系统 `src/skills/registry.ts`
- ✅ PAD Bot 情绪引擎 `src/ai/emotion-engine.ts`
- ✅ 跨用户画像读取 `getProfileByUserId`
- ✅ JSON 配置导入/导出
- ✅ 模块化 Prompt（JSON 规则存储）

**v2.0 目标**：

| 阶段 | 内容 |
|------|------|
| **架构重组** | `src/` 拆 `core/` `ai/` `memory/` `skills/` `platforms/` `utils/` |
| **平台接入** | 挂载 OneBot 适配器 → `index.ts` 纯路由；新增 Discord/Telegram 适配器 |
| **数据库** | `data/*.json` → SQLite（`src/memory/db.ts`） |
| **工作引擎** | 意图路由 → 闲聊/工作双模；知识库 RAG；工具调用（邮件/日程/天气） |
| **关系网** | 用户间互动自动学习 → `relationships` 表 |
| **部署** | Docker Compose 一键启动：Bot + Panel + DB + NapCat |
| **统计看板** | 消息量/活跃时段/情感趋势/用户排行 |
