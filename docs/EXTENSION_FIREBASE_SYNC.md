# Extension ↔ Firebase 通信流程

## 架构概览

```
┌─────────────┐     HTTP/REST      ┌─────────────────┐     ┌─────────────┐
│  Extension  │ ─────────────────► │ Firebase        │ ───►│  Firestore  │
│  (Chrome)   │                    │ Cloud Functions │     │  Database   │
└─────────────┘                    └─────────────────┘     └─────────────┘
                                        │
                                        │ (Admin SDK)
                                        ▼
                                   ┌─────────────┐
                                   │  Realtime   │
                                   │  Updates    │
                                   └─────────────┘
```

## 通信流程

### 1. Extension 配置后端 URL

Extension 从 Chrome Storage 读取配置：

```typescript
// 默认 Firebase URL（需要替换 PROJECT_ID）
const DEFAULT_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api';

// 实际使用时需要在 Options 页面配置
const apiUrl = 'https://us-central1-your-actual-project.cloudfunctions.net/api';
```

### 2. 配对流程

#### Step 1: Extension 生成配对码
```javascript
// Extension → Firebase Function
POST https://us-central1-PROJECT_ID.cloudfunctions.net/api/pairing/code
Body: {
  "deviceId": "ext_123456789",
  "publicKey": "base64_encoded_public_key"
}

// Firebase → Firestore
// Collection: pairingCodes/{code}
{
  "deviceId": "ext_123456789",
  "publicKey": "base64_encoded_public_key",
  "expiresAt": "2024-01-01T00:05:00Z",
  "used": false,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Step 2: Mobile 完成配对
```javascript
// Mobile → Firebase Function
POST https://us-central1-PROJECT_ID.cloudfunctions.net/api/pairing/pair
Body: {
  "code": "123456",
  "deviceId": "mobile_987654321",
  "type": "mobile",
  "name": "iPhone",
  "os": "iOS"
}

// Firebase → Firestore
// Collection: users/{userId}
{
  "anonymousId": "anon_xxx",
  "createdAt": "2024-01-01T00:00:00Z"
}

// Collection: users/{userId}/devices/{deviceId}
{
  "deviceId": "ext_123456789",
  "type": "browser",
  "isOnline": true
}
{
  "deviceId": "mobile_987654321",
  "type": "mobile",
  "isOnline": true
}
```

### 3. 数据同步流程

#### Extension 发布数据
```javascript
// Extension → Firebase Function
POST https://us-central1-PROJECT_ID.cloudfunctions.net/api/sync/publish
Body: {
  "userId": "user_uuid",
  "deviceId": "ext_123456789",
  "path": "tabs",
  "payload": {           // <-- 加密后的数据
    "iv": "base64_iv",
    "data": "base64_encrypted_data",
    "authTag": "base64_auth_tag",
    "timestamp": 1700000000000,
    "seq": 1
  }
}

// Firebase → Firestore
// Collection: users/{userId}/sync/{syncId}
{
  "deviceId": "ext_123456789",
  "path": "tabs",
  "payload": {           // <-- 服务器无法解密
    "iv": "base64_iv",
    "data": "base64_encrypted_data",
    "authTag": "base64_auth_tag",
    "timestamp": 1700000000000,
    "seq": 1
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Mobile 获取数据
```javascript
// Mobile → Firebase Function
GET https://us-central1-PROJECT_ID.cloudfunctions.net/api/sync/data?userId=xxx&path=tabs

// Firebase → Firestore 查询 → 返回加密数据
// Mobile 用密钥解密
```

## Firestore 数据结构

```
Firestore
├── pairingCodes/{code}          # 临时配对码 (5分钟TTL)
│   ├── deviceId
│   ├── publicKey
│   ├── expiresAt
│   └── used
│
├── users/{userId}               # 用户根文档
│   ├── anonymousId
│   ├── createdAt
│   └── devices/{deviceId}       # 子集合：设备列表
│       ├── deviceId
│       ├── type (browser|mobile)
│       ├── publicKey
│       ├── isOnline
│       └── lastSeen
│   └── sync/{syncId}            # 子集合：同步数据 (加密)
│       ├── deviceId
│       ├── path
│       ├── payload (加密)
│       └── timestamp
│   └── sessions/{sessionId}     # 子集合：保存的会话
│       ├── name
│       ├── tabs
│       └── createdAt
│   └── presence/{deviceId}      # 子集合：在线状态
│       ├── online
│       └── lastActive
```

## 配置检查清单

### 1. Firebase 部署状态

```bash
# 检查 Functions 是否部署成功
firebase functions:list

# 查看日志
firebase functions:log

# 测试 API 是否可访问
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/health
```

### 2. Extension 配置

在 Extension Options 页面：

1. 切换到 **Backend** 标签
2. 选择 **Firebase Cloud**
3. 输入 **Project ID** (例如: `drop-the-tabs-prod`)
4. 点击 **Save Backend Settings**

### 3. 验证通信

```bash
# 测试配对 API
curl -X POST https://us-central1-PROJECT_ID.cloudfunctions.net/api/pairing/code \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","publicKey":"test"}'

# 预期返回: {"code": "123456", "expiresIn": 300}
```

## 常见问题

### Q: 为什么 Firestore 中没有数据？

可能原因：
1. **Firebase 未部署** - 运行 `bun run deploy:firebase`
2. **Project ID 错误** - 检查 Extension Options 中的配置
3. **Firestore 数据库未创建** - 在 Firebase Console 中创建
4. **权限问题** - 检查 Firestore Rules 是否已部署

### Q: Extension 如何知道 Firebase URL？

Extension 从 Chrome Storage 读取：
```javascript
const result = await chrome.storage.local.get(['backend_config']);
const apiUrl = result.backend_config.apiUrl;
```

### Q: 数据是明文的吗？

**不是！** 服务器只存储加密后的 payload：
```javascript
// 明文数据 (Extension 本地)
const tabs = [{id: 1, url: "https://google.com", title: "Google"}];

// 加密后发送到服务器
const encrypted = await encrypt(tabs);  // AES-256-GCM
// Server stores: { iv, data, authTag } - 无法解密
```

### Q: 实时同步如何实现？

Firebase 版本使用 **Firestore Realtime Listeners**：
```javascript
// Mobile 监听 sync 集合变化
db.collection('users').doc(userId).collection('sync')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .onSnapshot(snapshot => {
    // 有新数据，解密并更新 UI
  });
```

Docker 版本使用 **WebSocket**。

## 调试技巧

### 查看 Firestore 数据

1. 打开 [Firebase Console](https://console.firebase.google.com)
2. 选择你的项目
3. 左侧菜单 → Firestore Database
4. 查看 `pairingCodes`, `users` 集合

### 查看 Functions 日志

```bash
firebase functions:log --only api
```

### Extension 开发者工具

1. 打开 Chrome Extension (popup)
2. 右键 → Inspect → Console
3. 查看网络请求和错误

## 总结

| 组件 | 职责 |
|------|------|
| **Extension** | 加密数据 → HTTP POST → Firebase Function |
| **Firebase Function** | 接收请求 → 写入 Firestore |
| **Firestore** | 存储加密数据 |
| **Mobile** | 监听 Firestore → 解密数据 → 显示 |

**关键点**: Extension 和 Mobile 通过 Firebase 交换**加密数据**，服务器只是中转，无法读取内容。
