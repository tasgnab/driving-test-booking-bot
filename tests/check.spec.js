const { test } = require('@playwright/test');
const {
  LOCATION,
  shouldRun,
  stopFutureRuns,
  sendNotification,
  filterSlots,
  navigateToSchedule,
  checkForNoSlotsModal
} = require('../helpers');


const resultPath = './test-results';
const nowInMilliseconds = Date.now();
const unixTimestampInSeconds = Math.floor(nowInMilliseconds / 1000);

test.describe('Check Available Slots', () => {
  test('should check for available slots without booking', async ({ page }) => {
    test.setTimeout(120000);

    // Check if script should run
    if (!shouldRun()) {
      console.log('⏸️  SHOULD_RUN is FALSE. Skipping test.');
      console.log('💡 Set SHOULD_RUN to true in config.json to run again.');
      return;
    }

    console.log('🔍 Checking slot availability...');
    await navigateToSchedule(page);

    console.log(`\n📊 Availability Report`);
    console.log(`${'='.repeat(50)}`);

    // Check for "no slots" modal
    const noSlotsModalVisible = await checkForNoSlotsModal(page);
    if (noSlotsModalVisible) {
      console.log('❌ No timeslots available at this location');
      console.log('💡 The site displayed: "There are no timeslots available at this location."');
      await page.screenshot({ path: `${resultPath}/availability-no-slots-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log('📸 Screenshot saved as availability-no-slots.png');
      console.log(`${'='.repeat(50)}`);
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    // Find all available slots
    const availableSlots = await page.locator('a.available').all();
    console.log(`Total available slots: ${availableSlots.length}`);

    if (availableSlots.length === 0) {
      console.log('❌ No slots available (no modal shown, but no available slots found)');
      await page.screenshot({ path: `${resultPath}/availability-check-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log(`${'='.repeat(50)}`);
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    // Group slots by date and time
    const slotsByDate = {};

    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const slotText = await slot.textContent();
      const tdElement = await slot.locator('..');
      const columnIndex = await tdElement.evaluate(el => Array.from(el.parentElement.children).indexOf(el));
      const dateHeader = await page.locator('.rms_timeSelTitle th').nth(columnIndex).textContent();
      const date = dateHeader?.trim() || 'Unknown';

      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push(slotText?.trim());
    }

    // Display grouped slots
    console.log('\n📅 Available slots by date:');
    for (const [date, times] of Object.entries(slotsByDate)) {
      console.log(`\n  ${date}:`);
      times.forEach(time => console.log(`    • ${time}`));
    }

    // Check for preferred slots
    const slotsInfo = [];
    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const slotText = await slot.textContent();
      const tdElement = await slot.locator('..');
      const columnIndex = await tdElement.evaluate(el => Array.from(el.parentElement.children).indexOf(el));
      const dateHeader = await page.locator('.rms_timeSelTitle th').nth(columnIndex).textContent();
      slotsInfo.push({ slot, time: slotText, date: dateHeader, index: i });
    }

    const preferredSlots = filterSlots(slotsInfo);
    if (preferredSlots.length > 0) {
      console.log(`\n⭐ ${preferredSlots.length} preferred slots found!`);
      preferredSlots.forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}`);
      });
    } else if (process.env.PREFERRED_DAYS || process.env.PREFERRED_TIMES) {
      console.log('\n❌ No slots match your preferences');
    }

    // Build notification message
    let notificationMessage = `✅ Driving test slots available!\n` +
      `📍 Location: ${LOCATION}\n` +
      `📊 Total slots: ${availableSlots.length}\n`;

    if (preferredSlots.length > 0) {
      notificationMessage += `⭐ Preferred slots: ${preferredSlots.length}\n\n`;
      notificationMessage += 'Top preferred slots:\n';
      preferredSlots.slice(0, 5).forEach((slot, i) => {
        notificationMessage += `${i + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}\n`;
      });
    } else {
      notificationMessage += '\nFirst few slots:\n';
      slotsInfo.slice(0, 5).forEach((slot, i) => {
        notificationMessage += `${i + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}\n`;
      });
    }

    await sendNotification(notificationMessage);
    stopFutureRuns();

    await page.screenshot({ path: `${resultPath}/availability-check-${unixTimestampInSeconds}.png`, fullPage: true });
    console.log('\n📸 Screenshot saved as availability-check.png');
    console.log(`${'='.repeat(50)}`);
    await page.getByRole('link', { name: 'Log Out' }).click();
  });
});
