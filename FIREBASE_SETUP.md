# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "loss-calendar")

## 2. Register Your Web App

1. In your Firebase project, click the **Web** icon (`</>`) to add a web app
2. Register your app with a nickname (e.g., "Loss Calendar Web")
3. Copy the configuration object that appears

## 3. Enable Google Authentication

1. In the Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Click on **Google** in the providers list
5. Toggle the **Enable** switch
6. Enter your project support email
7. Click **Save**

## 4. ⚠️ CRITICAL: Configure Authorized Domains

**This step is REQUIRED for Google Sign-In to work!**

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add these domains:
   - `localhost` (for local development)
   - Your current Lovable domain (copy from browser address bar)
     - Example: `662624a7-6346-47ac-94d9-de1727187884.lovableproject.com`
   - Your production domain (if deployed)

**If you see "Failed to sign in" errors, this is usually because the domain is not authorized!**

## 5. Set Up Realtime Database

1. In the Firebase Console, go to **Build** → **Realtime Database**
2. Click "Create Database"
3. Choose a location close to your users (e.g., us-central1)
4. Start in **test mode** for development
5. Click "Enable"

## 6. Update Security Rules (For Production)

In the Realtime Database, go to the **Rules** tab and use:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

This ensures users can only read and write their own data.

## 7. Run Your App

Your Firebase configuration is already in the code. The app should now work!

## Troubleshooting

### "Failed to sign in" or "auth/unauthorized-domain" error
- Make sure you added your Lovable domain to Firebase's authorized domains (Step 4)
- Check the browser console for the exact error message
- The domain must match exactly (including subdomains)

### Database permission errors
- Verify your database rules allow authenticated users to read/write
- Make sure you're signed in before trying to add data

Your Mr.Journal app is now ready! 🎉
