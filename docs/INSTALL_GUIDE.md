# Drop The Tabs - 安装使用指南

## 📋 前置要求

- **Chrome 浏览器** (最新版)
- **Node.js 20+** 和 **Bun** (构建用)
- **Firebase 项目** (已创建并部署)

---

## 🚀 第一步：部署 Firebase 后端

### 1.1 检查 Firestore 数据库

1. 访问 https://console.firebase.google.com/project/drop-the-tabs/firestore
2. 确认数据库已创建（应该显示 `(default)`）
3. 安全规则设置为测试模式：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

### 1.2 检查 Functions 权限

1. 访问 https://console.cloud.google.com/functions/list?project=drop-the-tabs
2. 找到 `api` 函数
3. 点击 **Permissions** → **Add Principal**
4. 输入 `allUsers`，角色选择 `Cloud Functions Invoker`
5. 保存

### 1.3 重新部署 Functions（如有更新）

```bash
cd services/firebase-backend
firebase deploy --only functions,firestore:rules
```

---

## 💻 第二步：构建 Extension

### 2.1 安装依赖

```bash
# 进入项目目录
cd /Users/leo/Documents/Projects/drop-the-tabs

# 安装所有依赖
bun install

# 构建 shared packages
cd packages/shared-core && bun run build
cd ../shared-api && bun run build
```

### 2.2 构建 Extension

```bash
cd apps/extension
bun run build
```

构建完成后，输出在 `.output/chrome-mv3-prod/`

---

## 🔌 第三步：安装到 Chrome

### 3.1 加载未打包的扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的 **"Developer mode"**（开发者模式）
3. 点击 **"Load unpacked"**（加载已解压的扩展程序）
4. 选择 `apps/extension/.output/chrome-mv3-prod/` 文件夹

### 3.2 验证安装

- Extension 图标应该出现在 Chrome 工具栏
- 点击图标，应该能看到 Popup 界面
- 底部应该显示 "Drop The Tabs v0.1.0" 和同步状态

---

## ⚙️ 第四步：配置 Firebase

### 4.1 检查 API Key（已配置）

`apps/extension/src/services/firebaseSync.ts` 中已包含正确的配置：
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyDo2tJiCGfvG7XrNdrHSNiMQsQZ8FCn3so",
  authDomain: "drop-the-tabs.firebaseapp.com",
  projectId: "drop-the-tabs",
  // ...
};
```

### 4.2 限制 API Key（安全建议）

1. 访问 https://console.cloud.google.com/apis/credentials?project=drop-the-tabs
2. 找到 API Key → 点击 **Edit**
3. 在 **Application restrictions** 中选择 **HTTP referrers (web sites)**
4. 添加：
   - `chrome-extension://*`
   - 或具体的 extension ID（安装后可见）
5. 保存

---

## ✅ 第五步：验证同步功能

### 5.1 检查 Console 日志

1. 打开 `chrome://extensions/`
2. 找到 Drop The Tabs → 点击 **"service worker"**
3. 查看 Console，应该看到：
   ```
   [DTT] Extension initialized, userId: xxx
   [FirebaseSync] Connected, userId: xxx
   ```

### 5.2 测试 Tab 同步

1. 打开几个网页（如 google.com, github.com）
2. 等待几秒钟
3. 在 Console 应该看到：
   ```
   [FirebaseSync] Tabs synced: X
   ```

### 5.3 验证 Firebase 数据

1. 访问 https://console.firebase.google.com/project/drop-the-tabs/firestore
2. 点击 `users/` → 展开你的 userId
3. 应该看到：
   - `devices/` - 设备信息
   - `sync/` - 同步的 tabs 数据
   - `sessions/` - 保存的会话

---

## 🎯 第六步：日常使用

### 6.1 基本功能

| 功能 | 操作 |
|------|------|
| **查看 Tabs** | 点击 Extension 图标 |
| **搜索 Tabs** | 在搜索框输入关键词 |
| **Group Tabs** | 点击 "Auto Group" 或搜索结果中的 "Group" |
| **Save Session** | 点击 "Save All" 或 "Save" |
| **Deduplicate** | 点击 "Deduplicate" 删除重复 tabs |

### 6.2 搜索功能

1. 在 Popup 顶部的搜索框输入关键词
2. 实时过滤匹配的 tabs
3. 点击 **Group** / **Save** / **Close** 批量操作

### 6.3 同步验证

- Footer 显示 **🟢 Synced** 表示已同步
- 显示 **🔴 Not synced** 表示未连接

---

## 🔧 故障排除

### 问题 1: Extension 显示空白

**解决：**
```bash
cd apps/extension
rm -rf .output
bun run build
```
然后重新加载到 Chrome。

### 问题 2: 无法同步到 Firebase

**检查：**
1. Console 是否有错误信息
2. Firestore 规则是否允许写入
3. Functions 是否有权限

### 问题 3: Sessions 丢失

**注意：** Sessions 同时存储在：
- 本地 Chrome Storage
- Firebase Firestore

如果本地丢失，Firebase 中还有备份。

---

## 📱 第七步：Mobile App（可选）

如果需要手机端：

```bash
cd apps/mobile
bun install
bun run ios     # 或 bun run android
```

手机端扫码配对后，即可远程查看和控制 tabs。

---

## 🔒 安全提醒

- API Key 已暴露在 GitHub，建议添加 HTTP referrers 限制
- Firestore 目前是测试模式（允许所有读写），生产环境应该限制规则
- 数据已加密存储，服务器无法读取内容

---

**完成！** 现在可以正常使用 Drop The Tabs 了 🎉
