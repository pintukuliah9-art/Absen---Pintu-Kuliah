# Backend Setup Instructions (Google Apps Script)

This guide explains how to deploy the backend for AbsensiPro using Google Sheets and Google Apps Script.

## Prerequisites
- A Google Account.
- Access to Google Drive.

## Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com).
2. Create a new blank spreadsheet.
3. Rename it to **"AbsensiPro Database"**.

## Step 2: Open Apps Script Editor
1. In the spreadsheet, click on **Extensions** > **Apps Script**.
2. Rename the project to **"AbsensiPro Backend"**.

## Step 3: Add Code Files
1. **Code.gs**:
   - Delete any existing code in `Code.gs`.
   - Copy the content from `backend/Code.gs` in this repository.
   - Paste it into the editor.

2. **Setup.gs**:
   - Click the **(+)** icon next to **Files** > **Script**.
   - Name it `Setup`.
   - Copy the content from `backend/Setup.gs` in this repository.
   - Paste it into the editor.

3. Save all files (Ctrl+S / Cmd+S).

## Step 4: Initialize Database
1. In the toolbar dropdown, select `setupDatabase`.
2. Click **Run**.
3. You will be asked to **Review Permissions**.
   - Click **Review Permissions**.
   - Select your Google Account.
   - Click **Advanced** > **Go to AbsensiPro Backend (unsafe)**.
   - Click **Allow**.
4. Wait for the execution to complete.
5. Go back to your Google Sheet. You should see new tabs (sheets) created: `users`, `attendance`, `requests`, etc.

## Step 5: Deploy as Web App
1. Click the blue **Deploy** button (top right) > **New deployment**.
2. Click the **Select type** gear icon > **Web app**.
3. Fill in the details:
   - **Description**: "Initial Deploy"
   - **Execute as**: **Me** (your email address).
   - **Who has access**: **Anyone** (This is crucial for the frontend to access it without login prompts).
4. Click **Deploy**.
5. Copy the **Web App URL** (it starts with `https://script.google.com/macros/s/...`).

## Step 6: Connect Frontend
1. Open your frontend project.
2. Open `services/api.ts`.
3. Find the `API_URL` constant.
4. Replace the value with your new Web App URL.

```typescript
// services/api.ts
const API_URL = "https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec";
```

## Step 7: Test
1. Run your frontend app (`npm run dev`).
2. Try logging in or performing an action.
3. Check the Google Sheet to see if data is being populated.

---

## Troubleshooting

- **CORS Errors**: Ensure you selected **"Who has access: Anyone"** during deployment. If you selected "Only myself", the frontend will fail to fetch.
- **Data Not Saving**: Check the `Executions` tab in the Apps Script editor to see if there are any error logs.
- **Updates**: If you modify `Code.gs`, you must create a **New Deployment** (version) for changes to take effect. Just saving is not enough.
