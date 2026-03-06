# Getting Started with Claude Code + ForeLive

### A step-by-step guide for non-technical folks

---

## What You're Setting Up

You're going to install a tool called **Claude Code** that lets you talk to an AI in your terminal (the black screen where you type commands). You'll tell it what to change in the ForeLive app, and it will write the code for you. Think of it like texting a developer who lives inside your computer.

---

## STEP 1: Open the Terminal

The Terminal is an app on your Mac that lets you type commands.

1. Press **Command + Space** on your keyboard (this opens Spotlight search)
2. Type **Terminal**
3. Press **Enter**
4. A window with a blinking cursor will appear — this is your terminal

**Leave this window open for the rest of the guide.**

---

## STEP 2: Install Homebrew

Homebrew is a tool that installs other tools. Copy and paste this entire command into your terminal, then press **Enter**:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

- It will ask for your **Mac password** — type it and press Enter (you won't see the letters appear, that's normal)
- It may ask you to press **Enter** again to confirm
- Wait for it to finish (could take 2-5 minutes)

**IMPORTANT:** When it finishes, it may show a "Next steps" message with commands to run. If it does, copy and paste those commands one at a time and press Enter after each one. They usually look something like:

```
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

## STEP 3: Install Git and Node.js

Git lets you download and upload code. Node.js runs the app. Copy and paste this command:

```
brew install git node
```

Wait for it to finish (1-2 minutes).

---

## STEP 4: Set Up Your GitHub Account

You need a free GitHub account to access our app's code.

1. Go to **https://github.com** in your web browser
2. Click **Sign Up** and create a free account (remember your username and password!)
3. **Tell James your GitHub username** so he can give you access to the ForeLive repo

**Wait until James confirms you have access before continuing.**

---

## STEP 5: Log Into GitHub from Your Terminal

Copy and paste this command:

```
gh auth login
```

**Oh wait** — you need to install the GitHub CLI tool first:

```
brew install gh
```

Now run:

```
gh auth login
```

It will ask you some questions. Choose these answers:

1. **What account do you want to log into?** → Choose `GitHub.com`
2. **What is your preferred protocol?** → Choose `HTTPS`
3. **Authenticate Git with your GitHub credentials?** → Choose `Yes`
4. **How would you like to authenticate?** → Choose `Login with a web browser`
5. It will give you a **code** — copy it
6. Press **Enter** and a browser window will open
7. Paste the code into the browser and click **Authorize**

You should see a green checkmark in your terminal. You're logged in!

---

## STEP 6: Download the ForeLive Code

This copies the app's code to your computer. Copy and paste:

```
cd ~/Desktop
git clone https://github.com/justlookingaround5/golf-trip.git
cd golf-trip
```

You should now see a folder called **golf-trip** on your Desktop.

---

## STEP 7: Install the App's Dependencies

This downloads all the libraries the app needs:

```
npm install
```

Wait for it to finish (1-3 minutes). You might see some warnings — that's okay. As long as it doesn't say "ERROR" in red, you're fine.

---

## STEP 8: Install Claude Code

This is the AI tool you'll use to make changes. Copy and paste:

```
npm install -g @anthropic-ai/claude-code
```

---

## STEP 9: Start Claude Code

Make sure you're in the golf-trip folder, then start Claude:

```
cd ~/Desktop/golf-trip
claude
```

The first time you run this:
- It will ask you to log in to your **Anthropic account**
- If you don't have one, go to **https://console.anthropic.com** and sign up
- Follow the prompts to authenticate (similar to the GitHub login — it opens a browser)

Once logged in, you'll see a prompt where you can type messages to Claude.

---

## STEP 10: Talk to Claude!

Now you can just type what you want in plain English. Here are some examples:

**To understand the app:**
```
What does this app do? Give me a quick summary.
```

**To make a change:**
```
Change the app name from "ForeLive" to "Birdie Buddies" everywhere it appears.
```

**To fix something:**
```
The leaderboard page is showing the wrong order. Can you look at it and fix it?
```

**To ask a question:**
```
Where is the code that handles live scoring?
```

Claude will read the code, suggest changes, and ask your permission before modifying files.

---

## STEP 11: Save Your Changes to GitHub

After Claude makes changes you're happy with, you need to push them to GitHub so the live app updates.

Just tell Claude:

```
commit and push all changes
```

Claude will handle the git commands for you!

---

## Daily Workflow (After Initial Setup)

Every time you want to work on the app, just do these 3 things:

1. **Open Terminal** (Command + Space, type "Terminal", press Enter)

2. **Go to the project and start Claude:**
```
cd ~/Desktop/golf-trip
claude
```

3. **Tell Claude what you want.** When you're done, say "commit and push".

That's it!

---

## Troubleshooting

**"command not found: claude"**
Run this and try again:
```
npm install -g @anthropic-ai/claude-code
```

**"command not found: git" or "command not found: node"**
Run this and try again:
```
brew install git node
```

**"Permission denied" when pushing to GitHub**
Run `gh auth login` again and follow the steps.

**"Your branch is behind"**
Someone else made changes. Tell Claude:
```
pull the latest changes from GitHub
```

**Something went really wrong and you want to start fresh:**
```
cd ~/Desktop
rm -rf golf-trip
git clone https://github.com/justlookingaround5/golf-trip.git
cd golf-trip
npm install
claude
```

---

## Important Rules

1. **Always say "commit and push" when you're done** — otherwise your changes only exist on your computer
2. **Don't be afraid to ask Claude questions** — it can explain anything about the app
3. **Claude will ask permission before changing files** — read what it says and type "y" for yes
4. **If something breaks, don't panic** — tell Claude "undo the last change" or ask James for help

---

*Guide created March 2026 for the ForeLive golf trip app*
*Questions? Text James.*
