const { test } = require('@playwright/test');
const {
  LOCATION,
  shouldRun,
  stopFutureRuns,
  sendNotification,
  humanDelay,
  filterSlots,
  navigateToSchedule,
  checkForNoSlotsModal
} = require('../helpers');

test.describe('Book Driving Test', () => {
  test('should login and book a driving test', async ({ page }) => {
    test.setTimeout(120000);

    // Check if script should run
    if (!shouldRun()) {
      console.log('⏸️  SHOULD_RUN is FALSE. Skipping test.');
      console.log('💡 Set SHOULD_RUN to true in config.json to run again.');
      return;
    }

    // Navigate through login and to schedule page
    console.log('🚀 Starting booking process...');
    await navigateToSchedule(page);

    // Check for "no slots" modal
    const noSlotsModalVisible = await checkForNoSlotsModal(page);
    if (noSlotsModalVisible) {
      console.log('\n❌ No timeslots available at this location');
      console.log('💡 The site is showing "There are no timeslots available at this location."');
      await page.screenshot({ path: `${resultPath}/no-slots-modal-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log('📸 Screenshot saved as no-slots-modal.png');
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
    }

    // Find all available slots
    const availableSlots = await page.locator('a.available').all();
    console.log(`\n✅ Found ${availableSlots.length} total available slots`);

    if (availableSlots.length === 0) {
      console.log('❌ No available slots found (no modal, but no slots either)');
      await page.screenshot({ path: `${resultPath}/no-slots-${unixTimestampInSeconds}.png`, fullPage: true });
      console.log('📸 Screenshot saved as no-slots.png');
      await page.getByRole('link', { name: 'Log Out' }).click();
      return;
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

    // Filter slots based on preferences
    const filteredSlots = filterSlots(slotsInfo);

    if (filteredSlots.length > 0 && filteredSlots.length < slotsInfo.length) {
      console.log(`\n🎯 Filtered to ${filteredSlots.length} preferred slots:`);
      filteredSlots.forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}`);
      });
    }

    // Select slot
    const slotToBook = filteredSlots.length > 0 ? filteredSlots[0] : slotsInfo[0];

    console.log(`\n🎯 Selecting: ${slotToBook.date?.trim()} at ${slotToBook.time?.trim()}`);
    await humanDelay(page, 500, 1000);
    await slotToBook.slot.click();

    await humanDelay(page, 1500, 2500);
    await page.screenshot({ path: `${resultPath}/slot-selected.png-${unixTimestampInSeconds}.png`, fullPage: true });
    console.log('📸 Screenshot saved as slot-selected.png');

    // Send notification
    const notificationMessage = `🎯 Driving test slot found and selected!\n` +
      `📅 Date: ${slotToBook.date?.trim()}\n` +
      `⏰ Time: ${slotToBook.time?.trim()}\n` +
      `📍 Location: ${LOCATION}\n` +
      `Total available: ${availableSlots.length} slots`;

    await sendNotification(notificationMessage);

    // Stop future runs
    stopFutureRuns();

    // Continue to next step
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    console.log('✅ Slot selected successfully!');
  });
});
