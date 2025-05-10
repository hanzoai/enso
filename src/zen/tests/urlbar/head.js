/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

function simulateClick(win = window) {
  let target = win.gURLBar.inputField;
  let promise = BrowserTestUtils.waitForEvent(target, 'click');
  EventUtils.synthesizeMouseAtCenter(target, {});
  return promise;
}
