# 🔌 WhatsApp Integration Setup Guide

## Problem Identified ✅

Your bot code is **working perfectly** (`✓ All tests passed`), but the bot can't send WhatsApp messages because **API credentials are not configured**.

When you run the bot, you'll see:
```
WARNING:app:WhatsApp config missing. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.
```

This is **not a code problem** - it's a **missing configuration**.

---

## Solution: Configure WhatsApp API Credentials

### Step 1: Create `.env` File

Copy `.env.example` to `.env` in your project root:

```bash
cp .env.example .env
```

Or manually create `e:\Kisan-Sathi\new\kisan-sathi\.env` with:

```
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
WHATSAPP_VERIFY_TOKEN=any_random_string_here
```

### Step 2: Get WhatsApp API Credentials

#### 2A. Create Meta Business Account
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app (Messenger/WhatsApp)
3. Select "Business" app type

#### 2B. Get WhatsApp Business Account
1. In your Meta app dashboard, add WhatsApp product
2. Create/connect a WhatsApp Business Account
3. Verify your phone number (this becomes your `WHATSAPP_PHONE_NUMBER_ID`)

#### 2C. Generate Access Token
1. Go to **Settings → API Credentials**
2. Generate a **Permanent Access Token** (not temporary!)
3. Copy this to `WHATSAPP_ACCESS_TOKEN` in `.env`

#### 2D. Get Phone Number ID
1. In WhatsApp settings, find your phone number
2. Click "Manage Phone Number"
3. The ID shown is your `WHATSAPP_PHONE_NUMBER_ID`
4. Copy this to `.env`

---

## Step 3: Update app.py to Load .env

The app already has env variable loading, but let's ensure it works:

```python
# At the top of app.py (line ~388)
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
```

If `load_dotenv` doesn't work, install it:
```bash
pip install python-dotenv
```

---

## Step 4: Test After Configuration

### Test 1: Verify Credentials Loaded
```bash
# In VS Code terminal:
cd e:\Kisan-Sathi\new\kisan-sathi
python -c "from app import WHATSAPP_ACCESS_TOKEN; print('✓ Token loaded!' if WHATSAPP_ACCESS_TOKEN else '✗ Token missing')"
```

Should output: `✓ Token loaded!`

### Test 2: Run Flask App
```bash
python app.py
```

Should NOT show the warning about WhatsApp config missing.

### Test 3: Send Test Message via Webhook
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919876543210",
            "text": {"body": "hello"}
          }]
        }
      }]
    }]
  }'
```

---

## Step 5: Deploy to Production

### Option A: Set Environment Variables at Runtime

#### On Windows (Batch):
```batch
set WHATSAPP_ACCESS_TOKEN=your_token_here
set WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
python app.py
```

#### On Linux/macOS:
```bash
export WHATSAPP_ACCESS_TOKEN=your_token_here
export WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
python app.py
```

### Option B: Use .env File (Recommended for Development)
- Create `.env` in project root
- Never commit `.env` to git (add to `.gitignore`)
- Use `.env.example` as template for others

### Option C: Use Heroku/Cloud Deployment
In your hosting platform's environment variables settings:
```
WHATSAPP_ACCESS_TOKEN = your_token_here
WHATSAPP_PHONE_NUMBER_ID = your_phone_id_here
WHATSAPP_VERIFY_TOKEN = your_verify_token_here
```

---

## Verification Checklist

- [ ] `.env` file created with credentials
- [ ] `WHATSAPP_ACCESS_TOKEN` is not empty
- [ ] `WHATSAPP_PHONE_NUMBER_ID` is not empty
- [ ] `python -c "from app import WHATSAPP_ACCESS_TOKEN; print(WHATSAPP_ACCESS_TOKEN)"` shows token
- [ ] Flask app starts without "WhatsApp config missing" warning
- [ ] Webhook curl test returns `('OK', 200)`
- [ ] Test message via WhatsApp shows response

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still seeing "WhatsApp config missing" | Verify `.env` file is in correct location: `e:\Kisan-Sathi\new\kisan-sathi\.env` |
| Token not loading | Run `pip install python-dotenv` then restart Flask |
| Bot still not responding | Check WhatsApp webhook URL is pointing to your server in Meta dashboard |
| 401 Unauthorized error | Token may be expired - regenerate in Meta dashboard |
| 400 Bad Request error | Check `WHATSAPP_PHONE_NUMBER_ID` is correct - should be just numbers |

---

## Security Notes ⚠️

1. **NEVER commit `.env` to git** - Always add to `.gitignore`
2. **Keep tokens private** - Don't share in emails or messages
3. **Rotate tokens regularly** - At least every 6 months
4. **Use permanent tokens** - Not temporary for production

---

## What Happens Next

Once credentials are configured:

1. ✅ Bot receives messages from WhatsApp
2. ✅ Bot processes messages (language selection works)
3. ✅ Bot sends text responses in user's language
4. ✅ Bot sends interactive menus (buttons)
5. ✅ Location translation works (Hindi/Marathi → English)
6. ✅ Crop recommendations display in user's language

**All code is ready - just needs the API connection!** 🎉

---

## Quick Reference

```bash
# Windows - Setup
cd e:\Kisan-Sathi\new\kisan-sathi
copy .env.example .env
# Edit .env with your credentials

# Run app
python app.py

# If port 5000 is in use, use different port:
python -c "import os; os.environ['FLASK_PORT'] = '5001'; exec(open('app.py').read())"
```

Need help? Check the [Meta WhatsApp API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api).
