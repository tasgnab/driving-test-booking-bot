const { test } = require('@playwright/test');
const {
  LOCATION,
  shouldRun,
  readConfig,
  stopFutureRuns,
  sendNotification,
  humanDelay,
  filterSlots,
  navigateToReschedule,
  checkForNoSlotsModal
} = require('../helpers');

const resultPath = './test-results';
const nowInMilliseconds = Date.now();
const unixTimestampInSeconds = Math.floor(nowInMilliseconds / 1000);

test.describe('Reschedule Driving Test', () => {
  test('should login and reschedule a driving test', async ({ page }) => {
    test.setTimeout(120000);

    // Check if script should run
    if (!shouldRun()) {
      console.log('⏸️  SHOULD_RUN is FALSE. Skipping test.');
      console.log('💡 Set SHOULD_RUN to true in config.json to run again.');
      return;
    }

    // Check mode
    const config = readConfig();
    if (config.MODE !== 'reschedule') {
      console.log(`⏸️  MODE is "${config.MODE}", not "reschedule". Skipping test.`);
      console.log('💡 Set MODE to "reschedule" in config.json to run this script.');
      return;
    }

    console.log('🔄 Starting reschedule process...');
    await navigateToReschedule(page);

    // Extract current booking date
    const currentBookingDate = await page
      .locator('th:has-text("Date of test:")').locator('..').locator('td')
      .textContent();
    console.log(`📅 Current booking date: ${currentBookingDate?.trim()}`);

    console.log('Clicking Change date/time on existing booking...');
    await page.getByRole('button', { name: 'Change date/time' }).click();
    await humanDelay(page, 1000, 2000);

    console.log('Waiting for schedule to load...');
    await page.waitForSelector('.rms_timeSelPick', { timeout: 10000 });
    await humanDelay(page, 1000, 2000);

    // Check for "no slots" modal
    const noSlotsModalVisible = await checkForNoSlotsModal(page);
    if (noSlotsModalVisible) {
      console.log('\n❌ No timeslots available at this location');
      await page.screenshot({ path: `${resultPath}/reschedule-no-slots-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log('📸 Screenshot saved.');
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    // Find all available slots
    const availableSlots = await page.locator('a.available').all();
    console.log(`\n✅ Found ${availableSlots.length} total available slots`);

    if (availableSlots.length === 0) {
      console.log('❌ No available slots found (no modal, but no slots either)');
      await page.screenshot({ path: `${resultPath}/reschedule-no-slots-${unixTimestampInSeconds}.png`, fullPage: true });
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    // Parse current booking date for comparison
    const currentBookingDateObj = new Date(currentBookingDate?.trim());

    // Helper: parse slot date headers like "Mon 26 May" or "Monday 26 May 2026"
    function parseSlotDate(dateStr) {
      if (!dateStr) return null;
      // Strip leading day name (e.g. "Mon ", "Monday ") — keep the numeric part onward
      const cleaned = dateStr.trim().replace(/^[A-Za-z]+,?\s*/, '');
      const withYear = /\d{4}/.test(cleaned)
        ? cleaned
        : `${cleaned} ${currentBookingDateObj.getFullYear()}`;
      const d = new Date(withYear);
      return isNaN(d) ? null : d;
    }

    // Extract slot information
    console.log('\n📅 All available slots:');
    const slotsInfo = [];
    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const slotText = await slot.textContent();

      const tdElement = await slot.locator('..');
      const columnIndex = await tdElement.evaluate(el => Array.from(el.parentElement.children).indexOf(el));
      const dateHeader = await page.locator('.rms_timeSelTitle th').nth(columnIndex).textContent();

      slotsInfo.push({ slot, time: slotText, date: dateHeader, index: i });
      console.log(`  ${i + 1}. ${dateHeader?.trim()} at ${slotText?.trim()}`);
    }

    // Keep only slots earlier than the current booking
    const earlierSlots = slotsInfo.filter(s => {
      const d = parseSlotDate(s.date);
      return d && d < currentBookingDateObj;
    });

    if (earlierSlots.length === 0) {
      console.log(`\n⏩ No earlier slots than ${currentBookingDate?.trim()}. Skipping reschedule.`);
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    console.log(`\n✅ ${earlierSlots.length} slot(s) earlier than current booking:`);
    earlierSlots.forEach((s, i) => console.log(`  ${i + 1}. ${s.date?.trim()} at ${s.time?.trim()}`));

    // Filter earlier slots based on preferences
    const filteredSlots = filterSlots(earlierSlots);

    if (filteredSlots.length > 0 && filteredSlots.length < earlierSlots.length) {
      console.log(`\n🎯 Filtered to ${filteredSlots.length} preferred slots:`);
      filteredSlots.forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}`);
      });
    }

    // Select slot
    const slotToBook = filteredSlots.length > 0 ? filteredSlots[0] : earlierSlots[0];

    console.log(`\n🎯 Selecting: ${slotToBook.date?.trim()} at ${slotToBook.time?.trim()}`);
    await humanDelay(page, 500, 1000);
    await slotToBook.slot.click();

    await humanDelay(page, 1500, 2500);
    await page.screenshot({ path: `${resultPath}/reschedule-slot-selected-${unixTimestampInSeconds}.png`, fullPage: true });
    console.log('📸 Screenshot saved.');

    // Confirm reschedule
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await humanDelay(page, 1500, 2500);

    console.log('✅ Confirming reschedule...');
    try {
      await page.getByRole('button', { name: /confirm|reschedule/i }).click();
      await humanDelay(page, 2000, 3000);
      await page.screenshot({ path: `${resultPath}/reschedule-confirmed-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log('📸 Screenshot saved.');
    } catch (error) {
      console.error(`💥 Confirm step failed: ${error.message}`);
      await page.screenshot({ path: `${resultPath}/reschedule-confirm-error-${unixTimestampInSeconds}.png`, fullPage: true }).catch(() => {});
      await sendNotification(
        `💥 Reschedule confirm step failed at ${LOCATION}.\n` +
        `📅 Slot attempted: ${slotToBook.date?.trim()} at ${slotToBook.time?.trim()}\n` +
        `❌ Error: ${error.message}`
      );
      throw error;
    }

    // Send notification
    const notificationMessage = `🔄 Driving test rescheduled!\n` +
      `📅 New date: ${slotToBook.date?.trim()}\n` +
      `⏰ New time: ${slotToBook.time?.trim()}\n` +
      `📅 Previous date: ${currentBookingDate?.trim()}\n` +
      `📍 Location: ${LOCATION}\n` +
      `Total available: ${availableSlots.length} slots`;

    await sendNotification(notificationMessage);

    // Stop future runs
    stopFutureRuns();

    console.log('✅ Reschedule completed successfully!');
  });
});
