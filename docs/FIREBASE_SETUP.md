# Firebase Setup Guide

## 问题：403 Forbidden / Internal Server Error

### 根本原因

Firebase Functions 需要以下配置才能正常工作：

1. **Firestore 数据库必须已创建**
2. **Functions 需要正确的 IAM 权限**
3. **Firestore 安全规则需要允许写入**

---

## 手动设置步骤

### 步骤 1：创建 Firestore 数据库

1. 打开 https://console.firebase.google.com/project/drop-the-tabs/firestore
2. 点击 "Create database"
3. 选择 **"Start in production mode"** 或 **"Start in test mode"**
4. 选择位置 (us-central1)
5. 点击 "Enable"

### 步骤 2：更新 Firestore 规则

在 Firebase Console 中，点击 "Rules" 标签，粘贴：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // 测试模式，生产环境需要限制
    }
  }
}
```

点击 "Publish"

### 步骤 3：设置 Functions 权限

1. 打开 https://console.cloud.google.com/functions/list?project=drop-the-tabs
2. 点击 `api` 函数
3. 点击 "Permissions" 标签
4. 点击 "Add principal"
5. 输入 `allUsers`
6. 选择角色 `Cloud Functions Invoker`
7. 点击 "Save"

---

## 或者使用命令行

如果你有 gcloud CLI：

```bash
# 设置项目
gcloud config set project drop-the-tabs

# 创建 Firestore 数据库
gcloud firestore databases create --region=us-central1

# 设置 Functions 权限
gcloud functions add-iam-policy-binding api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"
```

---

## 验证

设置完成后，测试：

```bash
curl -X POST https://us-central1-drop-the-tabs.cloudfunctions.net/api/pairing/code \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","publicKey":"test"}'
```

应该返回：
```json
{"code": "123456", "expiresIn": 300}
```

---

## 下一步

完成上述设置后：
1. Extension 应该可以正常配对
2. Tab 数据会自动同步到 Firestore
3. 在 Firebase Console 中可以看到数据
