# Connecting Google Drive + OneDrive

The app is at **https://hardikp98.github.io/markdown-pwa/**. To enable direct cloud open/save, register
the app with each provider (free, ~15 min total) and paste the IDs into `config.js`.

These IDs are **public** — browser OAuth uses no secret — so they are safe to commit.

---

## Google Drive (~10 min)

1. Go to **https://console.cloud.google.com** → select project **pm-job-pipeline** (or create one).
2. **APIs & Services → Library** → enable **Google Drive API** and **Google Picker API**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Markdown PWA`
   - **Authorized JavaScript origins:** `https://hardikp98.github.io`
   - (No redirect URI needed — this app uses the token flow.)
   - Create → copy the **Client ID**.
4. **Create Credentials → API key** → copy it. (Optional: restrict it to the Drive + Picker APIs and to
   the `hardikp98.github.io` referrer.)
5. **OAuth consent screen:** if the app is in "Testing", add your Google account under **Test users**
   (otherwise sign-in is blocked). Scopes needed: `.../auth/drive.file` (non-sensitive once you only use
   `drive.file`, so no Google verification review required).

Paste both values into `config.js`:
```
GOOGLE_CLIENT_ID: "....apps.googleusercontent.com",
GOOGLE_API_KEY:   "AIza....",
```

---

## OneDrive (~5 min)

1. Go to **https://portal.azure.com** → **App registrations**.
   You can reuse the existing **"To Do MCP"** app or create a new one (`Markdown PWA`).
2. **Authentication → Add a platform → Single-page application (SPA)**
   - Redirect URI: `https://hardikp98.github.io/markdown-pwa/`
   - (SPA type is required — it enables the CORS/PKCE flow the browser needs.)
3. **API permissions → Add → Microsoft Graph → Delegated:** add `Files.ReadWrite` and `User.Read`.
   (No admin consent needed for a personal account.)
4. **Overview** → copy the **Application (client) ID**.

Paste into `config.js`:
```
MS_CLIENT_ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
```
Leave `MS_AUTHORITY` as `https://login.microsoftonline.com/common` (allows personal + work accounts).

---

## After filling config.js

Tell me, or run:
```
cd ~/markdown-pwa && git add config.js && git commit -m "add oauth client ids" && git push
```
GitHub Pages redeploys in ~1 min. Reload the app on your phone (and re-add to Home Screen once so the
service worker updates). The Documents menu will then show **Open from Google Drive** / **Open from OneDrive**.

## Notes / known rough edges
- **Standalone PWA + OAuth popups on iOS** can be finicky; if a sign-in window doesn't return cleanly,
  opening the app once in Safari (not the Home Screen icon) and signing in there primes the token cache.
- Google uses `drive.file` scope = the app only sees files **you pick** (most private; no verification review).
- OneDrive "Open" lists `.md` files from your OneDrive; Save writes back to the same item.
