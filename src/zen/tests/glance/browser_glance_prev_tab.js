/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

add_task(async function test_Glance_Next_Tab() {
  await BrowserTestUtils.withNewTab({ gBrowser, url: 'https://example.com/' }, async (browser) => {
    const tabToCheck = gBrowser.selectedTab;
    await openGlanceOnTab(async (glanceTab) => {
      await BrowserTestUtils.openNewForegroundTab(window.gBrowser, 'https://example.com/', true, {
        skipAnimation: true,
      });
      const next = gBrowser.tabContainer.findNextTab(glanceTab, { direction: -1 });
      Assert.equal(
        next,
        tabToCheck,
        'The glance tab should be the second normal tab (Ignoring empty tabs)'
      );
    });
  });
});
