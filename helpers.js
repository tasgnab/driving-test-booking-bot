const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Config file path
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Load credentials from environment variables or .env file
const LOGIN_URL = 'https://www.myrta.com/wps/portal/extvp/myrta/licence/tbs/tbs-login/';
const USERNAME = process.env.USER_NAME;
const PASSWORD = process.env.PASSWORD;
const LOCATION = process.env.LOCATION || '37';
const LOCATIONS = process.env.LOCATIONS?.split(',') || [LOCATION];

// Preferred booking criteria
const PREFERRED_DAYS = process.env.PREFERRED_DAYS?.split(',') || [];
const PREFERRED_TIMES = process.env.PREFERRED_TIMES?.split(',') || [];
const MIN_TIME = process.env.MIN_TIME || '8:00 am';
const MAX_TIME = process.env.MAX_TIME || '5:00 pm';

// Config management
function readConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('⚠️  Config file not found, creating default...');
    const defaultConfig = { SHOULD_RUN: true };
    writeConfig(defaultConfig);
    return defaultConfig;
  }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function shouldRun() {
  const config = readConfig();
  return config.SHOULD_RUN === true;
}

function stopFutureRuns() {
  const config = readConfig();
  config.SHOULD_RUN = false;
  writeConfig(config);
  console.log('\n🛑 SHOULD_RUN set to FALSE in config.json');
  console.log('💡 To run again, manually set SHOULD_RUN to true in config.json');
}

// Notification
async function sendNotification(message) {
  const webhookUrl = 'https://n8n.thopo.dev/webhook/c9a315be-62c5-4b9b-a295-36771de2f5a9';

  const payload = {
    source: "drivingTestBot",
    message: message,
    hostname: "n8n.thopo.dev",
    severity: "NEWS"
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Notification sent successfully');
    } else {
      console.log(`⚠️  Notification failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`⚠️  Notification error: ${error.message}`);
  }
}

// Human-like delay
async function humanDelay(page, minMs = 500, maxMs = 1500) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await page.waitForTimeout(delay);
}

// Slot filtering
function filterSlots(slotsInfo) {
  let filtered = [...slotsInfo];

  if (PREFERRED_DAYS.length > 0) {
    filtered = filtered.filter(slot =>
      PREFERRED_DAYS.some(day => slot.date?.includes(day))
    );
  }

  if (PREFERRED_TIMES.length > 0) {
    filtered = filtered.filter(slot =>
      PREFERRED_TIMES.some(time => slot.time?.includes(time))
    );
  }

  return filtered;
}

// Navigation
async function navigateToSchedule(page, location = LOCATION) {
  console.log('Navigating to login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  await humanDelay(page, 1000, 2000);

  console.log('Clicking "Log in - you have an account"...');
  await page.getByText('Log in - you have an account').click();
  await humanDelay(page, 1500, 2500);

  console.log('Waiting for login form...');
  await page.waitForSelector('#widget_cardNumber', { timeout: 10000 });
  await humanDelay(page, 500, 1000);

  console.log('Filling in credentials...');
  await page.locator('#widget_cardNumber').click();
  await humanDelay(page, 300, 600);
  await page.locator('#widget_cardNumber').fill(USERNAME, { delay: 100 });
  await humanDelay(page, 500, 1000);

  await page.locator('#widget_password').click();
  await humanDelay(page, 300, 600);
  await page.locator('#widget_password').fill(PASSWORD, { delay: 100 });
  await humanDelay(page, 800, 1500);

  await page.locator('#widget_cardNumber').click();
  await humanDelay(page, 300, 600);

  console.log('Clicking login button...');
  await page.getByRole('button', { name: 'Login >' }).click();
  await humanDelay(page, 2000, 3000);

  console.log('Navigating to book test...');
  await page.getByRole('link', { name: 'Book test »' }).click();
  await humanDelay(page, 1000, 2000);

  console.log('Selecting test type...');
  await page.locator('#labelCAR').getByText('Car').click();
  await humanDelay(page, 500, 1000);
  await page.locator('#DC').getByText('Driving Test (DT)').click();
  await humanDelay(page, 500, 1000);
  await page.getByRole('button', { name: 'Next' }).click();
  await humanDelay(page, 1000, 2000);

  console.log('Accepting terms...');
  await page.getByRole('checkbox', { name: 'I agree with these statements.' }).check();
  await humanDelay(page, 800, 1500);
  await page.getByRole('button', { name: 'Next' }).click();
  await humanDelay(page, 1000, 2000);

  console.log('Selecting location...');
  await page.getByRole('radio', { name: 'Search by location' }).check();
  await humanDelay(page, 500, 1000);
  await page.getByLabel('Choose a test location').selectOption(location);
  await humanDelay(page, 800, 1500);
  await page.getByRole('button', { name: 'Next' }).click();

  console.log('Waiting for schedule to load...');
  await page.waitForSelector('.rms_timeSelPick', { timeout: 10000 });
  await humanDelay(page, 1000, 2000);
}

// Reschedule navigation
async function navigateToReschedule(page, location = LOCATION) {
  console.log('Navigating to login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });
  await humanDelay(page, 1000, 2000);

  console.log('Clicking "Log in - you have an account"...');
  await page.getByText('Log in - you have an account').click();
  await humanDelay(page, 1500, 2500);

  console.log('Waiting for login form...');
  await page.waitForSelector('#widget_cardNumber', { timeout: 10000 });
  await humanDelay(page, 500, 1000);

  console.log('Filling in credentials...');
  await page.locator('#widget_cardNumber').click();
  await humanDelay(page, 300, 600);
  await page.locator('#widget_cardNumber').fill(USERNAME, { delay: 100 });
  await humanDelay(page, 500, 1000);

  await page.locator('#widget_password').click();
  await humanDelay(page, 300, 600);
  await page.locator('#widget_password').fill(PASSWORD, { delay: 100 });
  await humanDelay(page, 800, 1500);

  await page.locator('#widget_cardNumber').click();
  await humanDelay(page, 300, 600);

  console.log('Clicking login button...');
  await page.getByRole('button', { name: 'Login >' }).click();
  await humanDelay(page, 2000, 3000);

  console.log('Navigating to manage bookings...');
  await page.getByRole('link', { name: 'Manage booking »' }).click();
  await humanDelay(page, 1000, 2000);

  
}

// Payment (if needed)
async function makePayment(page) {
  await page.getByRole('textbox', { name: 'Credit card number' }).click();
  await page.getByRole('textbox', { name: 'Credit card number' }).fill('xxxxxxxxxxxxxxx');
  await page.getByLabel('Expiry date').selectOption('xx');
  await page.locator('#ccExpiryYear').selectOption('xx');
  await page.getByRole('textbox', { name: 'Card security number' }).click();
  await page.getByRole('textbox', { name: 'Card security number' }).fill('xxx');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'Accept terms & conditions' }).check();
  await page.getByRole('button', { name: 'Pay' }).click();
}

// Modal detection
async function checkForNoSlotsModal(page) {
  const modal = page.locator('.rms_modal:has-text("There are no timeslots available")');
  const isVisible = await modal.isVisible().catch(() => false);
  return isVisible;
}

module.exports = {
  // Constants
  LOGIN_URL,
  USERNAME,
  PASSWORD,
  LOCATION,
  LOCATIONS,
  PREFERRED_DAYS,
  PREFERRED_TIMES,
  MIN_TIME,
  MAX_TIME,

  // Functions
  readConfig,
  writeConfig,
  shouldRun,
  stopFutureRuns,
  sendNotification,
  humanDelay,
  filterSlots,
  navigateToSchedule,
  navigateToReschedule,
  makePayment,
  checkForNoSlotsModal
};
