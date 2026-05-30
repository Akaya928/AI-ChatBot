# 薄一�?�?QQ AI ChatBot

基于 [NapCat](https://github.com/NapCatQQ/NapCat)（OneBot v11�? DeepSeek API 的拟人化 QQ 聊天机器人，�?Web 管理面板�?
## 架构

```
项目根目�?
├── src/                    # Bot 核心
�?  ├── index.ts            # 入口：WebSocket 连接、消息路�?�?  ├── ai/                 # AI 模块
�?  �?  ├── client.ts       # DeepSeek API 封装
�?  �?  ├── prompt.ts       # 角色提示词生成（人设/画像/时间/节日�?�?  �?  ├── emoji.ts        # 70+ 颜文字情绪匹�?�?  �?  ├── sticker.ts      # 表情包搜�?�?  �?  ├── vision.ts       # 图片识别
�?  �?  └── calendar.ts     # 实时时间 + 公历农历节日
�?  ├── context/
�?  �?  └── memory.ts       # 双层记忆 + 好感度评�?�?  ├── emotion/
�?  �?  └── analyzer.ts     # 17 种情绪识�?�?  └── remind/
�?      └── scheduler.ts    # 定时提醒 + 节日祝福
├── web/                    # 控制面板（前后端分离�?�?  ├── server.js           # Express API 服务
�?  └── public/
�?      ├── index.html      # Vue3 SPA 入口
�?      ├── style.css       # 全局样式
�?      └── js/             # 页面组件 + API 封装
├── data/                   # 运行时数�?�?  ├── config.json         # 角色配置（面板可编辑�?�?  ├── memory.json         # 对话记忆 + 用户画像
�?  ├── reminders.json      # 提醒记录
�?  └── logs/               # Bot 日志
└── NapCat.Shell/           # NapCat QQ 框架（不含在 Git 中）
```

## 已实现模�?
### 消息处理
- 私聊/群聊自动区分
- 群聊 @检�?+ 多前缀匹配（`薄一夏`/`一夏`/`小夏` + 自定义昵称）
- WebSocket 断线自动重连

### AI 对话
- DeepSeek API（支持切�?GPT-4o 等）
- 上下文窗口：最�?20 轮短时记�?+ 长期用户画像
- 温度 0.8，回�?1-3 句自然风�?
### 角色系统（面板可编辑�?- 名字 / 昵称 / 年龄 / 性别
- 性格描述 / 说话风格 / 口头�?- 爱好 / 最好朋友（QQ号绑定）/ 日常作息 / 讨厌的事
- 背景故事
- 角色配置与用户画像严格隔离，互不污染

### 双层记忆
- **短时记忆**：最�?20 轮对话，重启即清
- **长期画像**：每 10 轮自动调�?AI 提取用户信息（习惯、偏好、关系），持久保�?- 画像注入提示�?�?Bot 越聊越了解你

### 好感度评�?四维评分 0-100�?- 消息量（每条 +0.04，封�?40�?- 活跃天数（每�?+1.5，封�?30�?- 深度对话（情绪强烈时 +3，封�?20�?- 最近活跃（7天内 +10�?4�?+6�?0�?+3�?- 时间衰减�? 天不聊开始扣�?- 最好朋友（QQ 匹配）：自动免衰减，永远满好�?
### 情感分析
- 17 种情绪识别：开心、难过、生气、惊喜、喜爱、焦虑、困惑等
- 自动匹配颜文字表�?- 情绪强烈时记录为深度对话，提升好感度

### 日历感知
- 每轮对话注入实时时间（年/�?�?周几�?- 公历节日：元旦、情人节、国庆、圣诞等 16 �?- 农历节日：春节、元宵、端午、七夕、中秋、重阳（2026年映射表�?
### 图片识别
- 接收图片 �?调用 Gemini/Vision API 描述内容
- 描述注入对话上下文，Bot �?看懂"图片

### 提醒系统
- `5分钟后提醒我开会`
- `提醒�?0分钟后吃饭`
- `2小时后提醒我交作业`
- `3天后提醒我去机场`
- `明天8点提醒我开会`
- 30 秒扫描间隔，到期私聊通知
- 程序级拦截，不存�?AI 记忆

### 节日祝福
- 节假日当�?9:00 自动提醒给最好朋友发祝福
- 无需手动设置

### Web 控制面板
- **仪表�?*：NapCat/QQ 状�?+ Bot 状态，一键启�?- **设置**：可视化编辑角色人设、API Key、模型参数，保存即生�?- **日志**：实时查�?Bot 运行日志，自动刷�?- Vue3 + Vue Router，单页应�?
## 依赖

- **NapCat QQ 框架**：提�?OneBot v11 WebSocket 接口
- **DeepSeek API**：默�?AI 模型（可切换 GPT-4o 等）
- **Node.js 20+** + TypeScript

## 配置说明

### 首次安装

```bash
npm install      # 安装依赖
npm run build    # 编译 TypeScript
```

### 环境变量 `.env`

```env
# DeepSeek API（默认）
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat

# QQ Bot 连接
BOT_SELF_ID=���QQ��
BOT_WS_ENDPOINT=ws://127.0.0.1:6700
```

### 角色配置 `data/config.json`

```json
{
  "character": {
    "name": "Bot名字",
    "nicknames": ["昵称1", "昵称2"],
    "age": 0,
    "gender": "男/女",
    "personality": "性格描述",
    "speechStyle": "说话风格",
    "hobbies": ["爱好1", "爱好2"],
    "catchphrase": "口头禅",
    "dailyRoutine": "日常作息习惯",
    "dislikes": "讨厌的事",
    "bestFriend": {
      "qq": "最好朋友的QQ号",
      "nickname": "朋友昵称",
      "description": "关系描述"
    },
    "background": "角色背景故事"
  },
    "background": "24岁女青年�?11大学毕业，互联网从业�?.."
  },
  "ai": {
    "apiKey": "sk-xxx",
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

> 也可通过 Web 面板「设置」页可视化编辑，保存后重�?Bot 生效�?
### NapCat 配置

1. 确保 `NapCat.Shell/` 目录存在（含 `NapCatWinBootMain.exe` �?QQ 客户端）
2. 确保 OneBot WebSocket 服务器端口为 `6700`
3. 首次启动需扫码登录，之后可用快速登�?
### 最好朋友绑�?
�?`config.json` 中设�?`character.bestFriend.qq` 为目�?QQ 号，Bot 自动识别：完全放松、颜文字随意用、好感永不衰减�?
## 使用方式

```bash
# 1. 启动 NapCat（双击或在终端运行）
NapCat.Shell\NapCat.44498.Shell\napcat.quick.bat

# 2. 扫码登录 QQ

# 3. 启动 Bot
npm run dev

# 4. 启动控制面板（可选）
npm run panel     # 访问 http://localhost:5777

# 5. 部署模式
npm run build && node dist/index.js
```

## 后续计划

| 模块 | 方向 |
|------|------|
| 数据�?| `data/*.json` �?SQLite/PostgreSQL |
| �?Bot | 一个面板管理多�?QQ �?|
| 统计看板 | 消息量、活跃时段、情感趋势、用户排�?|
| 插件市场 | 天气查询、新闻推送、AI 绘画、翻�?|
| 语音互动 | 语音识别 + 语音回复 |
| 群管�?| 自动欢迎、禁言、群公告 |
| 权限系统 | 群白名单、敏感词过滤、管理员指令 |
| API 开�?| RESTful 接口供外部调�?|
| 容器�?| Docker 一键部�?|
