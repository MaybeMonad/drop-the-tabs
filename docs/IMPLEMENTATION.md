# Drop The Tabs - Implementation Details

## 已完成的架构

### 文件结构
```
drop-the-tabs/
├── wxt.config.ts          # WXT 配置文件
├── package.json           # 依赖管理
├── tsconfig.json          # TypeScript 配置
├── tailwind.config.js     # Tailwind 配置
├── postcss.config.js      # PostCSS 配置
├── README.md              # 项目说明
├── .gitignore             # Git 忽略规则
├── src/
│   ├── background.ts      # Service Worker (后台脚本)
│   ├── popup.tsx          # 弹出窗口入口
│   ├── popup.html         # 弹出窗口 HTML
│   ├── options.tsx        # 设置页面入口
│   ├── options.html       # 设置页面 HTML
│   ├── style.css          # 全局样式 (Tailwind)
│   ├── components/
│   │   └── Popup.tsx      # 主界面组件 (React)
│   └── utils/
│       ├── tabManager.ts      # 标签页管理核心
│       ├── statsCollector.ts  # 使用时长统计
│       ├── autoReminder.ts    # 智能提醒
│       └── types.ts           # TypeScript 类型定义
```

## 核心功能实现

### 1. 自动分组 (TabManager.autoGroupTabs)
- 基于域名匹配规则
- 支持 5 种默认分组：Work/Social/Shopping/Video/News
- 使用 Chrome TabGroups API
- 优先级系统（高优先级规则覆盖低优先级）

### 2. 自动去重 (TabManager.deduplicateTabs)
- URL 指纹生成（移除 hash 和 tracking 参数）
- 保留最近活跃的标签页
- 关闭其他重复项

### 3. 会话管理 (TabManager.saveSession/restoreSession)
- 保存当前窗口所有标签页
- 支持在新窗口恢复
- 使用 Chrome Storage 存储

### 4. 使用时长统计 (StatsCollector)
- 监听标签页切换事件
- 按域名聚合统计
- 每日数据记录
- 持久化存储到 IndexedDB

### 5. 智能提醒 (AutoReminder)
- 当标签页超过阈值（默认15个）时提醒
- 10分钟冷却时间避免频繁打扰
- 支持快捷操作（一键分组/去重）

### 6. 数据导出 (CSV/JSON/Markdown)
- CSV: 适合 Excel 分析
- JSON: 完整数据备份
- Markdown: 适合导入 Obsidian

## 下一步开发

1. **安装依赖并测试**
   ```bash
   cd /Users/leo/Documents/Projects/drop-the-tabs
   npm install
   npm run dev
   ```

2. **加载到 Chrome**
   - 打开 `chrome://extensions/`
   - 开启开发者模式
   - 加载 `.output/chrome-mv3-dev` 文件夹

3. **迭代优化**
   - 根据使用反馈调整分组规则
   - 添加更多导出格式选项
   - 优化 UI/UX

## 技术决策记录

- **WXT**: 选择 WXT 是因为它是目前最好的 Web Extension 开发框架，支持 React/Vue，热重载，自动处理 Manifest
- **React + Tailwind**: 比 Vanilla 更好的组件化开发体验，适合长期迭代
- **CSV 优先**: 用户需要数据分析，CSV 最通用
- **智能提醒**: 比全自动更可控，不会打扰用户工作流
