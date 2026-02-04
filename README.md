# Driving Test Booking Automation

Automate booking your driving test on myrta.com using Playwright with intelligent monitoring, multi-location checking, and auto-stop on success.

## Table of Contents
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Persistence & Auto-Stop](#persistence--auto-stop)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Human Behavior Simulation](#human-behavior-simulation)
- [Modal Handling](#modal-handling)
- [Multi-Location Checking](#multi-location-checking)
- [Scheduled Monitoring](#scheduled-monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Credentials
```bash
cp .env.example .env
```

Edit `.env` with your details:
```env
USER_NAME=your_license_number
PASSWORD=your_password
LOCATION=37

# Optional: Preferences
PREFERRED_DAYS=Mon,Tue,Wed
PREFERRED_TIMES=9:15 am,10:00 am,11:00 am
```

### 3. Run Your First Check
```bash
npm run check
```

This will check for available slots without booking anything (runs headless).

**Want to see the browser?** Use `npm run check:headed`

---

## Commands

### Main Commands (Headless)

| Command | Description |
|---------|-------------|
| `npm run check` | Check single location for slots (headless) |
| `npm run check:multi` | Check multiple locations (headless) |
| `npm run book` | Find and book first available slot (headless) |
| `npm run reset` | Reset SHOULD_RUN flag to true |

### Debug Commands (Show Browser)

| Command | Description |
|---------|-------------|
| `npm run check:headed` | Check slots with visible browser |
| `npm run check:multi:headed` | Check multiple locations with visible browser |
| `npm run book:headed` | Book slot with visible browser |
| `npm run codegen` | Record new actions with Playwright Inspector |

---

## Persistence & Auto-Stop

### How It Works

The script uses `config.json` to automatically stop after finding slots:

```json
{
  "SHOULD_RUN": true
}
```

**Flow:**
1. Each test checks `SHOULD_RUN` before running
2. If `false` → test skips
3. When slots are found → sets `SHOULD_RUN=false`
4. Future runs skip until you manually reset

### Use Cases

**Scheduled Monitoring:**
```bash
# Run every 5 minutes via Task Scheduler
npm run check
```

- Runs continuously until slots are found
- Automatically stops to prevent unnecessary runs
- Reset with `npm run reset` when ready to monitor again

### Manual Reset

```bash
npm run reset
```

Or edit `config.json`:
```json
{
  "SHOULD_RUN": true
}
```

### When Flag Gets Set to FALSE

- ✅ **check**: When any slots are found
- ✅ **book**: When a slot is selected
- ✅ **check:multi**: When any location has slots

---

## Configuration

### Environment Variables (`.env`)

```env
# Required
USER_NAME=your_license_number
PASSWORD=your_password

# Location
LOCATION=37                      # Single location
LOCATIONS=37,38,39              # Multiple locations (comma-separated)

# Preferences (optional)
PREFERRED_DAYS=Mon,Tue,Wed       # Filter by days
PREFERRED_TIMES=9:15 am,10:00 am # Filter by times
MIN_TIME=9:00 am                 # Earliest time
MAX_TIME=5:00 pm                 # Latest time
```

### Finding Location Codes

1. Run `npm run codegen`
2. Go through booking flow
3. Look for `selectOption('37')` in generated code
4. That number is your location code

---

## How It Works

### Check Test (`npm run check`)

1. Logs in with credentials
2. Navigates to booking page
3. Selects test type (Car → Driving Test)
4. Chooses location
5. Checks for "no slots" modal
6. Lists all available slots grouped by date
7. Highlights preferred slots
8. **Sets SHOULD_RUN=false if slots found**
9. Takes screenshot
10. Logs out

### Book Test (`npm run book`)

Same as check test, but:
- Selects the first available/preferred slot
- Clicks through to next step
- **Sets SHOULD_RUN=false after selection**
- ⚠️ Stops before final payment (add confirmation manually)

### Multi-Location Test (`npm run check:multi`)

1. Checks each location in LOCATIONS
2. Reports slots at each location
3. Compares all locations
4. **Sets SHOULD_RUN=false if any location has slots**

---

## Human Behavior Simulation

The script includes random delays to appear more human-like:

### Random Delays
- 500ms-2500ms between actions
- 100ms per character when typing
- Pauses before clicks

### Example Flow
```
Login page → 1-2s
Click "Log in" → 1.5-2.5s
Fill username → 100ms/char + 0.5-1s
Fill password → 100ms/char + 0.8-1.5s
Click Login → 2-3s
```

### Adjusting Delays

Edit in `helpers.js`:
```javascript
await humanDelay(page, 500, 1500);  // Current: 0.5-1.5s
await humanDelay(page, 1000, 3000); // Slower: 1-3s
await humanDelay(page, 200, 800);   // Faster: 0.2-0.8s
```

---

## Modal Handling

### No Slots Modal

When no slots are available, the site shows:
```
"There are no timeslots available at this location."
```

The script detects this automatically and:
- Logs clear message
- Takes screenshot
- Exits gracefully
- Keeps `SHOULD_RUN=true` (continues monitoring)

### Slot Detection

**With slots:**
```html
<a href="javascript:;" class="available">9:15 am</a>
```

**No slots:**
```html
<a href="javascript:;">9:15 am</a> <!-- No "available" class -->
<div class="rms_modal">No timeslots available</div>
```

---

## Multi-Location Checking

### Setup

```env
LOCATIONS=37,38,39,40
```

### Run

```bash
npm run check:multi
```

### Output Example

```
📍 Checking location 1/3 (code: 37)
❌ No timeslots available

📍 Checking location 2/3 (code: 38)
✅ Found 45 available slots
⭐ 12 preferred slots found!

📍 Checking location 3/3 (code: 39)
✅ Found 23 available slots

📊 SUMMARY
Location 38: 45 slots (12 preferred) ⭐
Location 39: 23 slots
Location 37: 0 slots

🛑 SHOULD_RUN set to FALSE
```

---

## Scheduled Monitoring

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Every 5 minutes
4. Action: Start a program
   - Program: `cmd`
   - Arguments: `/c cd C:\code\driving-test && npm run check`

### Workflow

1. Script runs every 5 minutes (headless)
2. Continues until slots are found
3. Sends webhook notification
4. Sets `SHOULD_RUN=false` automatically
5. Future runs skip immediately
6. Reset with `npm run reset` when ready

### Monitoring Script Example

Create `monitor.bat`:
```batch
@echo off
cd C:\code\driving-test
npm run check
```

**Note:** The script runs headless by default, perfect for scheduled tasks. Use `check:headed` only for debugging.

Schedule this file to run periodically.

---

## Troubleshooting

### Script Always Skips

**Problem:** See "⏸️ SHOULD_RUN is FALSE"

**Solution:**
```bash
npm run reset
```

### No Slots Found

**Problem:** Modal shows "No timeslots available"

**Solutions:**
- Try different location
- Check multiple locations: `npm run check:multi`
- Run at different times

### Element Not Found Errors

**Problem:** Selectors changed on website

**Solution:**
```bash
npm run codegen
# Re-record the flow and update selectors
```

### Bot Detection / 403 Errors

**Problem:** Site blocking automation

**Solutions:**
- Script already uses human-like delays
- Run in headed mode (default)
- Don't check more than once per 5 minutes
- Increase delays if needed

### Credentials Not Loading

**Problem:** USERNAME/PASSWORD undefined

**Solution:**
- Check `.env` file exists
- Verify `USER_NAME` (not USERNAME) in `.env`
- Ensure no spaces around `=`

### Flag Never Sets to FALSE

**Problem:** SHOULD_RUN stays true even after finding slots

**Solution:**
- Check console for "🛑 SHOULD_RUN set to FALSE"
- Verify slots were actually found
- Check `config.json` file exists and is writable

---

## Output Files

| File | Description |
|------|-------------|
| `config.json` | Persistence flag (SHOULD_RUN) |
| `slot-selected.png` | Screenshot after booking |
| `availability-check.png` | Schedule view (check test) |
| `availability-no-slots.png` | No slots screenshot |
| `multi-location-check.png` | Multi-location results |

---

## Tips

1. ✅ **Start with check**: Test with `npm run check` before booking
2. ✅ **Use multi-location**: Better chances with `check:multi`
3. ✅ **Set preferences**: Filter for your preferred days/times
4. ✅ **Schedule wisely**: Every 5-10 minutes is reasonable
5. ✅ **Monitor screenshots**: Check PNG files if issues occur
6. ✅ **Reset after booking**: Run `npm run reset` to monitor again

---

## Safety

- ⚠️ Booking test stops BEFORE final confirmation
- ⚠️ Add payment/confirmation steps manually if needed
- ⚠️ Test with `check` command first
- ⚠️ `.env` is in `.gitignore` (keeps credentials private)
- ⚠️ Script auto-stops after finding slots (prevents spam)

---

## Webhook Notifications

### Built-in Notification System

The script automatically sends webhook notifications when slots are found!

**Webhook URL:** `https://n8n.thopo.dev/webhook/c9a315be-62c5-4b9b-a295-36771de2f5a9`

**Payload Format:**
```json
{
  "data": {
    "source": "ozBargain",
    "message": "✅ Driving test slots available!\n📍 Location: 37\n...",
    "hostname": "n8n.thopo.dev",
    "severity": "NEWS"
  }
}
```

### What Gets Sent

**Check Test (`npm run check`):**
```
✅ Driving test slots available!
📍 Location: 37
📊 Total slots: 45
⭐ Preferred slots: 12

Top preferred slots:
1. Mon 30/03 at 9:15 am
2. Mon 30/03 at 10:00 am
...
```

**Book Test (`npm run book`):**
```
🎯 Driving test slot found and selected!
📅 Date: Mon 30/03
⏰ Time: 9:15 am
📍 Location: 37
Total available: 45 slots
```

**Multi-Location Test (`npm run check:multi`):**
```
✅ Driving test slots found across multiple locations!

📊 Summary: 2/3 locations have slots

⭐ 2 locations with preferred slots:
  📍 Location 38: 12 preferred / 45 total
  📍 Location 39: 5 preferred / 23 total
```

### Changing the Webhook

Edit the `sendNotification()` function in `helpers.js`:

```javascript
async function sendNotification(message) {
  const webhookUrl = 'YOUR_WEBHOOK_URL_HERE';

  const payload = {
    source: "DrivingTest",  // Change source
    message: message,
    hostname: "your-hostname",
    severity: "ALERT"  // Change severity
  };

  // ... rest of code
}
```

### Testing Notifications

Run a check to see if notifications work:
```bash
npm run check
```

Check your n8n workflow or webhook receiver for the notification!

---

## Project Structure

```
driving-test/
├── tests/
│   ├── book.spec.js           # Booking test
│   ├── check.spec.js          # Single location check
│   └── multi-location.spec.js # Multi-location check
├── helpers.js                 # Shared functions & config
├── debug-login.spec.js        # Debug helper
├── reset-flag.js              # Reset script
├── config.json                # Persistence storage
├── .env                       # Your credentials (not in git)
├── .env.example               # Template
├── package.json               # Dependencies & scripts
└── README.md                  # This file
```

---

## License

ISC

---

## Support

For issues or questions:
1. Check screenshots in project folder
2. Review console output
3. Run debug test: `npx playwright test debug-login.spec.js --headed`
4. Check `config.json` for SHOULD_RUN status

---

**Good luck with your driving test! 🚗**
