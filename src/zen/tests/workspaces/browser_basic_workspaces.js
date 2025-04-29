/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

add_setup(async function () {
  await ZenWorkspaces.createAndSaveWorkspace('Test Workspace 2');
});

add_task(async function test_Check_Creation() {
  const workspaces = await ZenWorkspaces._workspaces();
  ok(workspaces.workspaces.length, 2);
});
