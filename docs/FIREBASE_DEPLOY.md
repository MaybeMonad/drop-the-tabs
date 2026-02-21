# Deploy to Firebase

## Prerequisites

1. **Firebase Account**: https://firebase.google.com
2. **Firebase CLI**: `npm install -g firebase-tools`
3. **Firebase Project**: Create at https://console.firebase.google.com

## Setup

### 1. Create Firebase Project

```bash
# Login
firebase login

# Create project (or use existing)
firebase projects:create drop-the-tabs-prod
# OR
firebase use --add  # Select existing project
```

### 2. Configure Project

Update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 3. Enable Services

In Firebase Console, enable:
- Cloud Functions
- Cloud Firestore
- Firebase Storage
- Authentication (Anonymous)

### 4. Install Dependencies

```bash
cd services/firebase-backend/functions
npm install
```

## Deploy

### Manual Deploy

```bash
# Deploy everything
bun run deploy:firebase

# Deploy only functions
bun run deploy:firebase:functions

# Deploy only rules
bun run deploy:firebase:rules
```

### Local Testing

```bash
# Start emulators
bun run dev:firebase

# Or from the directory
cd services/firebase-backend
firebase emulators:start
```

Emulator UI: http://localhost:4000

### CI/CD (GitHub Actions)

1. Get Firebase token:
```bash
firebase login:ci
```

2. Add to GitHub Secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add `FIREBASE_TOKEN` with the token from step 1

3. Push to main branch triggers automatic deploy

## Environment URLs

After deploy, your API will be at:

```
https://us-central1-<project-id>.cloudfunctions.net/api
```

Example:
```
https://us-central1-drop-the-tabs-prod.cloudfunctions.net/api/health
```

## Update Clients

Update Extension and Mobile apps to use Firebase URL:

```typescript
// For Firebase
const FIREBASE_API_URL = 'https://us-central1-your-project.cloudfunctions.net/api';
```

## Monitoring

- Firebase Console: https://console.firebase.google.com
- Functions logs: `firebase functions:log`
- Firestore data viewer in console

## Troubleshooting

### Permission Denied
```bash
# Check rules are deployed
firebase deploy --only firestore:rules
```

### Function Cold Start
- First request may be slow (cold start)
- Consider min instances for production

### Quota Limits
- Check usage in Firebase Console
- Upgrade to Blaze plan if needed
