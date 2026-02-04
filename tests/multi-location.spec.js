const { test } = require('@playwright/test');
const {
  LOCATIONS,
  shouldRun,
  stopFutureRuns,
  sendNotification,
  humanDelay,
  filterSlots,
  navigateToSchedule,
  checkForNoSlotsModal
} = require('../helpers');

test.describe('Multi-Location Check', () => {
  test('should check multiple locations for available slots', async ({ page }) => {
    test.setTimeout(300000);

    // Check if script should run
    if (!shouldRun()) {
      console.log('⏸️  SHOULD_RUN is FALSE. Skipping test.');
      console.log('💡 Set SHOULD_RUN to true in config.json to run again.');
      return;
    }

    if (LOCATIONS.length === 1) {
      console.log('⚠️  Only one location configured. Set LOCATIONS in .env to check multiple locations.');
      return;
    }

    console.log(`🔍 Checking ${LOCATIONS.length} locations for availability...\n`);

    const results = [];

    for (let i = 0; i < LOCATIONS.length; i++) {
      const location = LOCATIONS[i];
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 Checking location ${i + 1}/${LOCATIONS.length} (code: ${location})`);
      console.log(`${'='.repeat(50)}`);

      try {
        if (i === 0) {
          await navigateToSchedule(page, location);
        } else {
          await page.getByText('< Back').click();
          await page.waitForTimeout(1000);
          await page.getByLabel('Choose a test location').selectOption(location);
          await page.getByRole('button', { name: 'Next' }).click();
          await page.waitForSelector('.rms_timeSelPick', { timeout: 10000 });
          await page.waitForTimeout(1000);
        }

        // Check for modal
        const noSlotsModalVisible = await checkForNoSlotsModal(page);
        if (noSlotsModalVisible) {
          console.log('❌ No timeslots available');
          results.push({ location, available: 0, preferred: 0 });
          continue;
        }

        // Count slots
        const availableSlots = await page.locator('a.available').all();
        console.log(`✅ Found ${availableSlots.length} available slots`);

        if (availableSlots.length > 0) {
          const slotsInfo = [];
          for (let j = 0; j < Math.min(availableSlots.length, 20); j++) {
            const slot = availableSlots[j];
            const slotText = await slot.textContent();
            const tdElement = await slot.locator('..');
            const columnIndex = await tdElement.evaluate(el => Array.from(el.parentElement.children).indexOf(el));
            const dateHeader = await page.locator('.rms_timeSelTitle th').nth(columnIndex).textContent();
            slotsInfo.push({ slot, time: slotText, date: dateHeader, index: j });
          }

          const preferredSlots = filterSlots(slotsInfo);

          if (preferredSlots.length > 0) {
            console.log(`⭐ ${preferredSlots.length} preferred slots found!`);
            preferredSlots.slice(0, 5).forEach((slot, idx) => {
              console.log(`  ${idx + 1}. ${slot.date?.trim()} at ${slot.time?.trim()}`);
            });
          }

          results.push({
            location,
            available: availableSlots.length,
            preferred: preferredSlots.length,
            firstFew: slotsInfo.slice(0, 3)
          });
        } else {
          results.push({ location, available: 0, preferred: 0 });
        }

      } catch (error) {
        console.error(`❌ Error checking location ${location}: ${error.message}`);
        results.push({ location, available: 0, preferred: 0, error: error.message });
      }

      console.log('');
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 SUMMARY - All Locations');
    console.log(`${'='.repeat(50)}`);

    results.forEach((result, i) => {
      const status = result.available > 0 ? '✅' : '❌';
      console.log(`${status} Location ${result.location}: ${result.available} slots`);
      if (result.preferred > 0) {
        console.log(`   ⭐ ${result.preferred} preferred slots`);
      }
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
    });

    const locationsWithSlots = results.filter(r => r.available > 0);
    const locationsWithPreferred = results.filter(r => r.preferred > 0);

    console.log(`\n📈 Total: ${locationsWithSlots.length}/${results.length} locations have available slots`);
    if (locationsWithPreferred.length > 0) {
      console.log(`⭐ ${locationsWithPreferred.length} locations have preferred slots!`);
      console.log('\nBest locations:');
      locationsWithPreferred
        .sort((a, b) => b.preferred - a.preferred)
        .forEach(r => {
          console.log(`  - Location ${r.location}: ${r.preferred} preferred slots`);
        });
    }

    // Send notification if any slots found
    if (locationsWithSlots.length > 0) {
      let notificationMessage = `✅ Driving test slots found across multiple locations!\n\n`;
      notificationMessage += `📊 Summary: ${locationsWithSlots.length}/${results.length} locations have slots\n\n`;

      if (locationsWithPreferred.length > 0) {
        notificationMessage += `⭐ ${locationsWithPreferred.length} locations with preferred slots:\n`;
        locationsWithPreferred
          .sort((a, b) => b.preferred - a.preferred)
          .slice(0, 5)
          .forEach(r => {
            notificationMessage += `  📍 Location ${r.location}: ${r.preferred} preferred / ${r.available} total\n`;
          });
      } else {
        notificationMessage += 'Top locations:\n';
        locationsWithSlots
          .sort((a, b) => b.available - a.available)
          .slice(0, 5)
          .forEach(r => {
            notificationMessage += `  📍 Location ${r.location}: ${r.available} slots\n`;
          });
      }

      await sendNotification(notificationMessage);
      stopFutureRuns();
    }

    console.log(`${'='.repeat(50)}`);

    await page.screenshot({ path: 'multi-location-check.png', fullPage: true });
    console.log('📸 Screenshot saved as multi-location-check.png');
  });
});
