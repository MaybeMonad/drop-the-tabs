# 🚀 快速开始（5 分钟）

## 1. 构建 Extension（1 分钟）

```bash
cd /Users/leo/Documents/Projects/drop-the-tabs/apps/extension
bun install  # 如果还没安装
bun run build
```

## 2. 安装到 Chrome（1 分钟）

1. 打开 `chrome://extensions/`
2. 开启 **Developer mode**
3. 点击 **Load unpacked**
4. 选择 `.output/chrome-mv3-prod/`

## 3. 验证同步（3 分钟）

1. 打开几个网页
2. 点击 Extension 图标
3. 底部应显示 **🟢 Synced**
4. 访问 https://console.firebase.google.com/project/drop-the-tabs/firestore
5. 确认有数据

---

**完成！** 开始使用吧 🎉

详细指南：[INSTALL_GUIDE.md](./INSTALL_GUIDE.md)
