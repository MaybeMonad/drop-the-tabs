#!/bin/bash

# Test script for Drop The Tabs Firebase API

FIREBASE_URL="https://us-central1-drop-the-tabs.cloudfunctions.net/api"

echo "=== Testing Drop The Tabs Firebase API ==="
echo "URL: $FIREBASE_URL"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$FIREBASE_URL/health" | jq .
echo ""

# Test 2: Generate pairing code
echo "2. Testing pairing/code endpoint..."
PAIRING_RESPONSE=$(curl -s -X POST "$FIREBASE_URL/pairing/code" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test_ext_123","publicKey":"dGVzdF9rZXk="}')

echo "Response: $PAIRING_RESPONSE"
CODE=$(echo $PAIRING_RESPONSE | jq -r '.code')
echo "Generated code: $CODE"
echo ""

# Test 3: Check pairing status
echo "3. Testing pairing/status endpoint..."
curl -s "$FIREBASE_URL/pairing/status/$CODE" | jq .
echo ""

# Test 4: Test sync/publish (will fail without valid userId, but tests endpoint)
echo "4. Testing sync/publish endpoint (expected: 400 or 500 without valid user)..."
curl -s -X POST "$FIREBASE_URL/sync/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "deviceId": "test_ext_123",
    "path": "tabs",
    "payload": {
      "iv": "test_iv",
      "data": "test_data",
      "authTag": "test_tag",
      "timestamp": 1234567890,
      "seq": 1
    }
  }'
echo ""
echo ""

echo "=== Tests Complete ==="
echo ""
echo "To see data in Firestore:"
echo "1. Open https://console.firebase.google.com/project/drop-the-tabs/firestore"
echo "2. Look for 'pairingCodes' collection (from test 2)"
echo "3. If you complete pairing, look for 'users' collection"
