# Finance-Tracker

A generic, privacy-focused financial tracker that syncs directly with your personal Google Drive. 

## Quick Start (5-Minute Setup)

You need to host the file yourself. It is entirely free and takes about five minutes.

1. **Host it:** Create a free GitHub account and a new repository. Upload the `downloaded repo`, then turn on **Settings** → **Pages**. You will get an HTTPS address like `yourname.github.io/reponame`. *(Note: Cloudflare Pages and Netlify also work).*
2. **Get a Google Client ID:** In the Google Cloud Console, create a project and enable the Google Drive API. Create an OAuth Client ID of type **Web application** and add your site address under **Authorized JavaScript origins**. Add yourself as a test user on the consent screen.
3. **Paste it in:** Put the Client ID into the `CLIENT_ID` line at the top of your `js/config.js` script and re-upload/commit the file.
4. **Connect:** Open your live website on each device and tap **Connect Google Drive**.

---

## Privacy & Syncing

* **Privacy:** Your data is stored in a hidden app folder inside your own Google Drive. Only this application can see it; nobody else can access it.
* **Sync:** The newest version always wins. Avoid editing data on two devices at the exact same moment to prevent conflicts.
* **Reconnecting:** Google sign-in expires roughly hourly. After reopening the site, you may need to tap **Reconnect Drive**.

---

## FAQ: Repository Visibility

### Do I need to set up a Public or Private repository?
**Public is fine**, and it is required for the free tier of GitHub Pages (Pages on private repositories requires a paid GitHub plan). 

**Making it public exposes nothing sensitive:**
* **Your financial data never goes into the repository.** It lives strictly in your Google Drive and your local browser.
* **The Client ID is not a secret.** Google designs it to be visible in web pages, and it will only function from the specific site addresses you explicitly authorize.
* **Only the generic tracking code itself is public.**

---

## Detailed Deployment Steps

### Step 1: GitHub Pages Setup
1. Go to your repository **Settings** → **Pages**.
2. Under **Branch**, tap the **None** dropdown and choose `main`.
3. Leave the folder directory as `/ (root)` and tap **Save**.
4. Wait 1–2 minutes and refresh the page. A box at the top will display your live site address (e.g., `https://gopinath-vk.github.io/Finance-Tracker/`).
5. *Note:* Ignore the "Visibility / GitHub Enterprise" section and the "Start free for 30 days" button. You do not need them.

> **Troubleshooting:** If `main` is not in the dropdown, your repository is empty. Go back to the main page and upload your `index.html` first (**Add file** → **Upload files** → **Commit changes**).

Once the site is live, copy the base address (the part up to `.github.io`, like `https://gopinath-vk.github.io`) to use in the next step. Do not include the repository subdirectory name or a trailing slash.

### Step 2: Google Cloud Setup

#### 1. Create the Project
* Go to [console.cloud.google.com](https://google.com) and create a new project (any name).
* Open **APIs & Services** → **Library**, search for **Google Drive API**, and click **Enable**.

#### 2. Set up the Consent Screen
* Go to **APIs & Services** → **OAuth consent screen** (or **Google Auth Platform**).
* Choose **External**, fill in your App Name and user support email, and save.
* Under **Audience** (or **Test users**), add your own Google email address.
* Under **Data Access** (or **Scopes**), add `.../auth/drive.appdata` if prompted.

#### 3. Create the Client ID
* Go to **Credentials** → **Create credentials** → **OAuth client ID**.
* Select **Web application** as the application type.
* Under **Authorized JavaScript origins**, add exactly:
  ```text
  https://gopinath-vk.github.io
  ```
  *(Do not include `/Finance-Tracker/` or a trailing slash. Leave redirect URIs completely empty).*
* Click **Create** and copy the generated Client ID (it ends in `.apps.googleusercontent.com`).

#### 4. Paste the ID into your App
* In your GitHub repository, open `index.html` and click the pencil icon to edit.
* Replace `PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com` with your copied Client ID (keep the quotation marks around it).
* Click **Commit changes**, wait about a minute, and reload your live website.

---

## Connecting and Testing

1. Go to your live site: `https://gopinath-vk.github.io/Finance-Tracker/` and click **Connect Google Drive**.
2. Pick your Google account.
3. You will see a *"Google hasn't verified this app"* warning. **This is expected for personal apps.** Click **Advanced** → **Go to (app name) (unsafe)**.
4. Allow the app permission to access its Drive app data.
5. When successful, the button text will change to **"Synced with Drive"** and a *"Saved to Drive"* confirmation timestamp will appear.

> **Tip:** While the consent screen is in "Testing" mode, Google may ask you to sign in again every 7 days. If you prefer to avoid this, you can switch the publishing status to **"In production"** inside your Google Cloud Console. No official review is required for personal apps using this limited scope.

### Verify Multi-Device Syncing
To verify everything works across multiple devices:
* Add a test entry on your current device.
* Open the site on a second device (like your phone) and connect to the same Google account.
* Confirm that the test entry automatically populates.
