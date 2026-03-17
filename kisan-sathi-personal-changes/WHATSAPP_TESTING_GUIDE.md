# 🔧 Quick Testing Guide - WhatsApp Button Loop

## How to Test Locally

### 1. Start the Backend
```bash
cd e:\Kisan-Sathi\new\kisan-sathi
python app.py
```
Or use the VS Code task: **Run Backend Flask**

### 2. Test Webhook Verification
```bash
curl -X GET "http://localhost:5000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

### 3. Simulate Button Click Messages

#### Test Language Selection
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919876543210",
            "interactive": {
              "button_reply": {
                "id": "lang_hi",
                "title": "हिंदी"
              }
            }
          }]
        }
      }]
    }]
  }'
```

#### Test Recommend Button
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919876543210",
            "interactive": {
              "button_reply": {
                "id": "recommend",
                "title": "🌾 Recommend"
              }
            }
          }]
        }
      }]
    }]
  }'
```

#### Test Location Input After Recommend
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "919876543210",
            "text": {
              "body": "Maharashtra | Pune"
            }
          }]
        }
      }]
    }]
  }'
```

---

## Expected Behavior

### Flow 1: Complete Conversation with Button Loop

**Input**: Button click `lang_hi`
**Output**: 
- Text: "✅ Language set to HI..." + Main Menu message
- Buttons: 🌾 Recommend | 📊 Market | 📅 Season

**Input**: Button click `recommend`
**Output**:
- Text: "🌾 Please send your location..."
- Buttons: 📍 Format Help | 🏠 Main Menu

**Input**: Text `Maharashtra | Pune`
**Output**:
- Text: "📍 Location: Maharashtra, Pune\n🌾 Recommended: [crop]\n..."
- Buttons: 🌾 Recommend | 📊 Market | 📅 Season

This continuous loop = **SUCCESS** ✅

---

## What You'll See in Logs

### Successful Button Flow
```
Incoming WhatsApp webhook: {"entry": [{"changes": [{"value": {"messages": [{"from": "919...", "interactive": {"button_reply": {"id": "recommend"...

Processing message from 919...: recommend -> detect_intent: recommend

Chat interaction logged to: data/chat_logs.csv

WhatsApp message sent successfully

Webhook response: OK 200
```

### Menu Sent After Command
```
Menu type: main (or location/language depending on context)
Interactive button payload sent to WhatsApp API
```

---

## Chat Logging

### Log File Location
```
data/chat_logs.csv
```

### Log Format
```
timestamp,sender,intent,user_message,bot_response
2025-01-23 10:30:42.123,919876543210,recommend,recommend,"🌾 Please send your location..."
2025-01-23 10:31:15.456,919876543210,unknown,"Maharashtra | Pune","📍 Location: Maharashtra, Pune..."
```

---

## Troubleshooting

### Issue: Buttons Not Appearing
**Cause**: `should_send_menu=False` in response tuple
**Fix**: Check `process_user_message()` return - verify menu_type is set correctly

### Issue: Same Menu Appearing Twice
**Cause**: Menu sent twice in webhook
**Fix**: Verify `whatsapp_webhook()` only calls `send_whatsapp_menu()` once per message

### Issue: Language Not Remembered
**Cause**: Session key not matching
**Check**: Verify sender phone number is consistent in user_sessions
**Debug**: Print session dict to see stored language

### Issue: "State Not Available" Error
**Cause**: Location data CSV missing or state name misspelled
**Fix**: Check if location_data is loaded properly in data initialization
**Valid States**: Maharashtra, Punjab, Tamil Nadu, Karnataka, etc.

---

## Manual Testing with curl

### Test Friendlier Format
```bash
# Test initial greeting
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{"changes": [{"value": {"messages": [{"from": "919999999999", "text": {"body": "hi"}}]}}]}]
  }'
```

### Expected Output
- First request from phone: Language selector menu
- Second request from same phone: Main action menu (language remembered)

---

## Success Criteria

You'll know it's working when:

✅ Button click → Response text + Menu buttons appear
✅ Each response followed by action buttons automatically  
✅ Language selector appears on first "hi"
✅ Location menu appears after Recommend button
✅ Main menu appears after any command finishes
✅ Same phone number doesn't get asked language again
✅ Chat logs appearing in data/chat_logs.csv
✅ No "None" or "undefined" in menu JSON payloads

---

## API Readiness

When your friend completes these endpoints, add this to your host config:

```python
# app.py - Once friend's API ready
@app.route('/api/market-insights/<crop>', methods=['GET'])
def market_insights(crop):
    # Your friend will implement this
    # Current code already calls it in process_user_message()
    pass

@app.route('/api/seasonal-recommendations/<season>', methods=['GET'])
def seasonal_recommendations(season):
    # Your friend will implement this
    # Current code already calls it in process_user_message()
    pass
```

No changes needed in WhatsApp flow - commands will work automatically once these are ready!
