// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
// Utility to register JSWindowActors

var gZenActorsManager = {
  _actors: new Set(),

  addJSWindowActor(...args) {
    if (this._actors.has(args[0])) {
      // Actor already registered, nothing to do
      return;
    }

    try {
      ChromeUtils.registerWindowActor(...args);
      this._actors.add(args[0]);
    } catch (e) {
      console.warn(`Failed to register JSWindowActor: ${e}`);
    }
  },
};
