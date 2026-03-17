# 🗺️ WhatsApp Bot - Visual Conversation Flow

## Complete User Journey Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                     KISAN WhatsApp Bot Flow (FIXED)                 │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                          🔴 FIRST MESSAGE
═══════════════════════════════════════════════════════════════════════

Farmer sends: "hi"
         │
         ↓
   Bot checks: Is language set in session?
         │
    ┌────┴─────┐
    │           │
   NO          YES
    │           │
    ↓           ↓
┌─────────┐  ┌──────────────┐
│Language │  │Greet + Send  │
│Selector │  │Main Menu     │
│Menu     │  │              │
└────┬────┘  └────┬─────────┘
     │            │
     ├─── Returns: (message, send_menu=True, menu_type="language")
     │
     └──→ WhatsApp sends LANGUAGE SELECTOR BUTTONS
         ┌─────────────────────────────┐
         │ 🇺🇸 English | 🇮🇳 हिंदी | 🇮🇳 मराठी │
         └─────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
                     LANGUAGE SELECTION (NEW!)
═══════════════════════════════════════════════════════════════════════

Farmer clicks: "हिंदी"
         │
         ↓
   Bot receives button_reply: lang_hi
         │
         ↓
   Store in session: session["language"] = "hi"
         │
         ↓
   Returns: (
       "✅ Language set to HI...",
       send_menu=True,
       menu_type="main"
   )
         │
         └──→ WhatsApp sends MAIN ACTION MENU
             ┌──────────────────────────────┐
             │ 🌾 Recommend | 📊 Market      │
             │ 📅 Season                    │
             └──────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                      MAIN ACTION SELECTION
═══════════════════════════════════════════════════════════════════════

Farmer clicks button: "recommend"
         │
         ↓
   process_user_message("recommend", sender)
         │
         ↓
   Detect intent: "recommend"
         │
         ↓
   Set session["step"] = "awaiting_location"
         │
         ↓
   Returns: (
       "🌾 Please send your location...",
       send_menu=True,
       menu_type="location"  ← CONTEXT-AWARE MENU!
   )
         │
         └──→ WhatsApp sends LOCATION HELP MENU
             ┌──────────────────────────┐
             │ 📍 Format Help | 🏠 MainMenu│
             └──────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                     LOCATION INPUT (FIXED!)
═══════════════════════════════════════════════════════════════════════

Farmer sends text: "Maharashtra | Pune"
         │
         ↓
   Webhook receives text message
         │
         ↓
   Check: Is session["step"] == "awaiting_location"? → YES
         │
         ↓
   Parse location: {"state": "Maharashtra", "district": "Pune"}
         │
         ↓
   _run_location_recommendation_logic()
   ├─ _resolve_soil_parameters()
   ├─ _resolve_weather_data()
   └─ _run_crop_recommendation_logic()
         │
         ↓
   Build recommendation response with:
   ├─ Recommended crop
   ├─ Confidence %
   ├─ Top 3 crops
   ├─ Weather data
   ├─ Soil info
         │
         └─→ Returns: (
               "📍 Location: Maharashtra, Pune\n"
               "🌾 Recommended: Rice\n"
               "✅ Confidence: 85%\n...",
               send_menu=True,
               menu_type="main"  ← BACK TO MAIN MENU
             )
                │
                └──→ WhatsApp sends MAIN ACTION MENU AGAIN
                    ┌──────────────────────────────┐
                    │ 🌾 Recommend | 📊 Market      │
                    │ 📅 Season                    │
                    └──────────────────────────────┘
                    
                    User can now click another action!


═══════════════════════════════════════════════════════════════════════
                    MARKET COMMAND FLOW
═══════════════════════════════════════════════════════════════════════

Farmer clicks: "market"
         │
         ↓
   Prompts: "Send crop name (e.g., market rice)"
         │
   Returns: (message, send_menu=False)  ← No menu (needs input)
         │
         ↓
Farmer sends: "rice"
         │
         ↓
   Calls: /api/market-insights/rice
         │
    ┌────┴─────────────┐
    │                  │
   API Ready          API Not Ready
   (LATER)            (NOW)
    │                 │
    ↓                 ↓
Forward chart      Return error msg
+ prices           gracefully
    │                │
    └────┬───────────┘
         │
         ↓
Returns: (
    "📊 Rice Market Summary\n"
    "💰 Price: ₹XX\n"
    "📈 Trend: High\n...",
    send_menu=True,
    menu_type="main"
)
    │
    └──→ MAIN MENU AGAIN → Continuous loop!


═══════════════════════════════════════════════════════════════════════
                    SEASON COMMAND FLOW
═══════════════════════════════════════════════════════════════════════

Farmer clicks: "season"
         │
         ↓
   Prompts: "Which season? (rainy/summer/winter/spring)"
         │
   Returns: (message, send_menu=False)
         │
         ↓
Farmer sends: "rainy"
         │
         ↓
   Calls: /api/seasonal-recommendations/rainy
         │
    ┌────┴─────────────┐
    │                  │
  READY               PENDING
  (LATER)             (NOW)
    │                 │
    ↓                 ↓
List season        Error message
crops              gracefully

Returns: (
    "📅 Rainy Season\n"
    "Top crops:\n"
    "- Rice\n"
    "- Sugarcane\n...",
    send_menu=True,
    menu_type="main"
)
    │
    └──→ MAIN MENU → Ready for next action


═══════════════════════════════════════════════════════════════════════
                  CONTINUOUS LOOP = SUCCESS ✅
═══════════════════════════════════════════════════════════════════════

Session example with FIXED button loop:

Message 1: "hi"
Response 1: Language menu appears ✓
         │
Message 2: Language button click
Response 2: Main menu appears ✓
         │
Message 3: Recommend button click
Response 3: Location menu appears ✓
         │
Message 4: Location text
Response 4: Main menu appears ✓ ← THIS WAS BROKEN, NOW FIXED!
         │
Message 5: Market button click
Response 5: Main menu appears ✓ ← CONTEXT-AWARE
         │
Message 6: Continuous... (can keep clicking buttons)

STATUS: Working button loop ✅


═══════════════════════════════════════════════════════════════════════
                     CODE DECISION TREE
═══════════════════════════════════════════════════════════════════════

In webhook, after process_user_message() returns (text, menu_flag, menu_type):

    if should_send_menu:
        send_whatsapp_menu(sender, menu_type)
        │
        ├─ menu_type == "language"
        │   └─→ Show 3 language buttons
        │
        ├─ menu_type == "location"
        │   └─→ Show format help + main menu
        │
        └─ menu_type == "main"
            └─→ Show Recommend/Market/Season buttons

This ensures:
✓ Right menu at right time
✓ No duplicate menus
✓ Farmer always knows what to do next
✓ Touch-friendly interface (click buttons vs type)


═══════════════════════════════════════════════════════════════════════
                  WEBHOOK DATA FLOW (FIXED)
═══════════════════════════════════════════════════════════════════════

WhatsApp Message In:
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "919876543210",
          "interactive": {              ← Button click!
            "button_reply": {
              "id": "recommend",        ← Button that was clicked
              "title": "🌾 Recommend"
            }
          }
        }]
      }
    }]
  }]
}
    │
    ↓ webhook processes
    │
    ├─ Extract button_reply.id → "recommend"
    │
    ├─ Call process_user_message("recommend", sender)
    │
    ├─ Get tuple: (response_text, True, "location")
    │
    ├─ send_whatsapp_message(sender, response_text)  ← Text sent
    │
    ├─ _log_chat_interaction()  ← Logged to CSV
    │
    └─ if should_send_menu:
        └─ send_whatsapp_menu(sender, "location")  ← Menu sent!
           
           Sends back to WhatsApp:
           {
             "messaging_product": "whatsapp",
             "to": "919876543210",
             "type": "interactive",
             "interactive": {
               "type": "button",
               "body": {"text": "📍 Send location..."},
               "action": {
                 "buttons": [
                   {"type": "reply", "reply": {"id": "location_help", "title": "📍 Format Help"}},
                   {"type": "reply", "reply": {"id": "main_menu", "title": "🏠 Main Menu"}}
                 ]
               }
             }
           }

═══════════════════════════════════════════════════════════════════════
```

## Session State Progression

```
User A (919876543210) Session Progress:

Initial state:
{
  "step": None,
  "language": None (not set)
}
  │
  ├─ User sends "hi"
  │
  └─ Change to:
{
  "step": None,
  "language": "hi"  ← Set by lang_hi button
}
  │
  ├─ User clicks "recommend"
  │
  └─ Change to:
{
  "step": "awaiting_location",
  "language": "hi"
}
  │
  ├─ User sends "Maharashtra | Pune"
  │
  └─ Change to:
{
  "step": None,  ← Reset after location processed
  "language": "hi"  ← REMEMBERED!
}
  │
  ├─ User clicks "market"
  │
  └─ Stays same (market doesn't change step)
{
  "step": None,
  "language": "hi"  ← Still there for next message
}
```

## What Was Broken ❌ → What's Fixed ✅

| Scenario | Before | After |
|----------|--------|-------|
| User clicks button | Text sent, no menu | Text + Menu buttons appear |
| After Recommend | User confused what to do | Location menu guides them |
| After location input | Back to main, no prompt | Main menu shows action options |
| Language preference | Recognized but not stored | Remembered in session |
| First time user | No language choice | Asks for language up front |
| Market command | May fail silently | Clear error + main menu |
| Season command | May fail silently | Clear error + main menu |
| Continuous conversation | Not working | Full loop with buttons ✓ |

