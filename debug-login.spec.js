const { test } = require('@playwright/test');
require('dotenv').config();

const LOGIN_URL = 'https://www.myrta.com/wps/portal/extvp/myrta/licence/tbs/tbs-login/';

test('debug - check login page structure', async ({ page }) => {
  test.setTimeout(60000);

  console.log('Going to login page...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

  console.log('Taking screenshot of initial page...');
  await page.screenshot({ path: 'debug-1-initial.png', fullPage: true });

  console.log('Looking for "Log in" link...');
  const loginLinks = await page.getByText('Log in', { exact: false }).all();
  console.log(`Found ${loginLinks.length} elements with "Log in" text`);

  if (loginLinks.length > 0) {
    console.log('Clicking first "Log in" link...');
    await loginLinks[0].click();
    await page.waitForTimeout(2000);

    console.log('Taking screenshot after clicking...');
    await page.screenshot({ path: 'debug-2-after-click.png', fullPage: true });

    // Try to find any input fields
    console.log('Looking for input fields...');
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input fields`);

    for (let i = 0; i < Math.min(inputs.length, 5); i++) {
      const type = await inputs[i].getAttribute('type');
      const name = await inputs[i].getAttribute('name');
      const id = await inputs[i].getAttribute('id');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log(`Input ${i + 1}: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
    }

    // Try to find textboxes by role
    console.log('\nLooking for textbox roles...');
    const textboxes = await page.getByRole('textbox').all();
    console.log(`Found ${textboxes.length} textbox roles`);

    for (let i = 0; i < textboxes.length; i++) {
      const name = await textboxes[i].getAttribute('name');
      const id = await textboxes[i].getAttribute('id');
      const ariaLabel = await textboxes[i].getAttribute('aria-label');
      console.log(`Textbox ${i + 1}: name="${name}", id="${id}", aria-label="${ariaLabel}"`);
    }
  } else {
    console.log('No "Log in" link found!');
  }

  console.log('\nDebug complete. Check debug-*.png files for screenshots.');
});
