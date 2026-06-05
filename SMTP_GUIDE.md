# Local SMTP Setup Guide for FastoClick 📧

When developing locally, it is highly recommended to use a local SMTP testing tool. This allows you to test sending emails from the FastoClick Email Module without spamming real inboxes or needing a real email provider (like SendGrid or Gmail).

The best tool for this is **MailHog** (or its modern alternative, **Mailpit**). It catches all outgoing emails and provides a beautiful web interface for you to view them.

---

## 🛠️ Method 1: Using MailHog (Recommended & Easiest)

MailHog runs a fake SMTP server on port `1025` and a web UI on port `8025`.

### 1. Installation

**On Windows:**
1. Download the latest Windows release from the official GitHub:
   [Download MailHog for Windows](https://github.com/mailhog/MailHog/releases)
   *(Look for `MailHog_windows_amd64.exe`)*
2. Rename the downloaded file to `MailHog.exe` and place it somewhere accessible (like your Desktop or Project folder).
3. Double-click `MailHog.exe` to run it. A terminal window will open showing that it is running.

**On Mac (using Homebrew):**
```bash
brew install mailhog
brew services start mailhog
```

**Using Docker:**
```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### 2. Viewing Emails
Once MailHog is running, open your web browser and go to:
👉 **http://localhost:8025**

You will see the MailHog Web UI. Any email sent by FastoClick will instantly appear in this inbox.

---

## ⚙️ Configuring FastoClick

Now that you have your local SMTP server running on port `1025`, you need to tell FastoClick to use it. 

Open your `server/.env` file and ensure the following variables are set:

```env
# Email Configuration
SMTP_SERVER=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_TLS=False
SMTP_FROM_EMAIL=noreply@fastoclick.com
```

> **Note:** MailHog does not require a username, password, or TLS encryption.

### How FastoClick Handles Emails Locally
If you do **not** have MailHog running, the FastoClick Email Sender will automatically catch the `[WinError 10061]` connection error and fall back to **"Mock Mode"**. In Mock Mode, it will simply print the email details to your python terminal. 

Once you start MailHog, FastoClick will detect it on the next campaign and start routing the emails directly to the MailHog Web UI!

---

## 🚀 Going to Production

When you deploy FastoClick to the internet and want to send *real* emails to real users, you will sign up for an SMTP provider like **SendGrid**, **Amazon SES**, or **Mailgun**.

At that point, you just update your production `.env` file:

```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_super_secret_api_key
SMTP_TLS=True
SMTP_FROM_EMAIL=marketing@yourrealdomain.com
```

No code changes are required! The microservice will automatically connect securely to your provider and dispatch the emails.


✉️ Free Gmail SMTP Limits
Daily Limit: 500 emails per rolling 24-hour period.
Cost: 100% Free!
(Note: If you have a paid Google Workspace account with a custom domain, that limit increases to 2,000 emails per day).


The best, cheapest path forward:
If you want to send thousands or millions of emails to real people and ensure they actually land in their primary inbox, you should:

Stick to Gmail for now: Use your current setup to send up to 500 emails per day for free while you are starting out.
Switch to Amazon SES when you grow: When you need more, you can connect your app to Amazon SES. It is the absolute gold standard for marketing campaigns and costs just $0.10 per 1,000 emails. That means you can send 10,000 emails for literally just $1.00.