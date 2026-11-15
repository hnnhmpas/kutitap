# Email Reminders setup (free, about 15 minutes)

Think of it like this: the app saves your reminder choices, and once a day a small helper on Vercel looks at them and sends the emails.
It needs 3 things: an email sender (Resend), permission to read/write your tracker data (a Firebase key), and a secret password for the daily job.

## Part 1: Resend (sends the emails, free)
1. Go to resend.com and click **Sign up**. Use the SAME Gmail address that should receive the reminders (important: the free sender can only deliver to the address you sign up with).
2. After logging in, click **API Keys** on the left, then **Create API Key**. Name it `kutitap`, permission **Sending access**, click **Add**.
3. Click the copy button and paste the key somewhere safe for a minute (Notepad). You will not see it again.

## Part 2: Firebase key (lets the helper read your loans and mark them Paid)
1. Open console.firebase.google.com, open your Kutitap project.
2. Click the gear next to **Project Overview**, then **Project settings**, then the **Service accounts** tab.
3. Click **Generate new private key**, then **Generate key**. A small file ending in `.json` downloads.
4. Open that file with Notepad, press Ctrl+A, then Ctrl+C. You will paste it in Part 3. Afterwards, delete the downloaded file. Never put it in your code folder.

## Part 3: Vercel settings
1. Open vercel.com, open your Kutitap project, click **Settings**, then **Environment Variables**.
2. Add these one at a time (Name, Value, then **Save**). Tick **Sensitive** if offered:
   - `RESEND_API_KEY` = the key from Part 1
   - `FIREBASE_SERVICE_ACCOUNT` = everything you copied in Part 2 (the whole thing, starting with `{`)
   - `CRON_SECRET` = any made-up text of 24+ letters and numbers (example: `kt9Lm2QxV7pR4wZ8bN3cH6yD`)
3. Optional: `SITE_URL` = your live site address, like `https://your-app.vercel.app`. Only needed if the email buttons open the wrong address.

## Part 4: Put the new files in your project
1. In your project folder, replace your whole `src` folder with the `src` from the zip.
2. Copy these from the `OUTSIDE_SRC` folder of the zip into the project's main folder (next to `package.json`):
   - the `api` folder
   - `vercel.json` (if you already have one, tell me and I will merge it)
   - the `public/email` folder (put it inside your existing `public` folder)
3. In the terminal run:
   `git add .`
   `git commit -m "Add email reminders"`
   `git push origin main`
4. On Vercel, wait until the newest deployment says **Ready**. (Variables only apply to deployments made after you saved them. If you saved them last, click the three dots on the newest deployment, then **Redeploy**.)

## Part 4b: One new Firestore rule (needed for the Sent logs drawer)
1. Firebase console, **Firestore Database**, **Rules** tab.
2. Keep what is already there. Add this block right after your existing `match /financeTracker/user_data { ... }` block, using the SAME user id you already have in that block instead of `PASTE_OWNER_UID`:
   ```
   match /financeTracker/user_data/reminderLogs/{logId} {
     allow read: if request.auth != null && request.auth.uid == 'PASTE_OWNER_UID';
     allow write: if false;
   }
   ```
3. Click **Publish**. (The ready-made file is `firestore.rules` in this folder. Do not paste its placeholder id.) No indexes are needed.

## Part 5: Test it
1. In the app: Loans, **Email Reminders**. Tick a small loan and set its due date to 2 days from today. (Today's date as due date also works: that sends the "due today" email.)
2. On Vercel: Project, **Settings**, **Cron Jobs**, find `/api/send-reminders`, click **Run**.
3. Within a minute the email should arrive. Check Spam the first time and click **Not spam**.
4. Tap **Paid** in the email, then tap the green confirm button on the page that opens. Back in the app, that loan turns green in its sub-tab.

## Extra features
- **On-time streak:** counts loans (with reminders on) marked Paid on or before their due date. Shows as a fire badge in the email footer at 2 or more. Resets to 0 when a due date passes unpaid or a loan is paid late.
- **Boss defeated:** when every installment of a multi-part loan (a column with 2 or more entries) is Paid, one victory email is sent. Tapping Paid in an email sends it right away; paying in the app sends it on the next morning run.
- **Red alert:** 1 day after the due date, if still unpaid, a red email with the Paid button goes out.
- **Sent logs:** Loans, Email Reminders, **Sent logs**. Shows the latest 100 with type, time and status (Sent, Clicked Paid, Snoozed, Cancelled).

## How it behaves
- The daily job runs once a day at about 8:00 AM Manila time (free Vercel plan: it can land anywhere within that hour).
- 2 days before the due date: first email with **Paid** and **Remind me again**. On the due date: follow-up with **Paid**. The day after: red alert with **Paid**.
- A loan already marked Paid in the tracker (by you, or from an email) gets no more emails.
- If you pick a due date less than 2 days away, the first email is skipped and only the due-date email is sent.
- Changing a loan's due date restarts its schedule. Unticking or **Opt out** stops its emails at any time.
- The tracker's 15th and 30th rows are never changed by the reminder due dates.
- Each email uses a different template until all 25 are used, then the cycle starts again.

## If something goes wrong
- No email at all: in Vercel, Project, **Logs**, look for `reminders failed`. Most often a variable is missing or has a typo. Fix it and redeploy.
- Email went to Spam: mark **Not spam**. The sender name is "Kutitap - Your Kash Kasama", but the address is Resend's free test address.
- Email arrives but nothing sends to another address: the free Resend sender only delivers to the address you signed up with.
- Button page says the link does not work: links expire about 3 weeks after the due date, or the loan was removed.
- Cron says unauthorized: `CRON_SECRET` is missing or shorter than 16 characters.
