#!/bin/bash

echo "=== Getting Firebase API Key ==="
echo ""
echo "Method 1: Firebase Console (推荐)"
echo "1. 打开 https://console.firebase.google.com/project/drop-the-tabs/settings/general"
echo "2. 找到 'Your apps' 部分"
echo "3. 点击 '</>' (Web app)"
echo "4. 复制 firebaseConfig 中的 apiKey"
echo ""
echo "Method 2: Command line"
firebase apps:list --project drop-the-tabs 2>/dev/null || echo "需要 firebase CLI"
echo ""
echo "你的 API Key 应该类似: AIzaSyC..."
