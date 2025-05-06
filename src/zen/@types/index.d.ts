// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
/**
 * NOTE: Do not modify this file by hand.
 * If you're updating some of the sources, see README for instructions.
 */

/// <reference types="./lib.gecko.dom.d.ts" />
/// <reference types="./lib.gecko.glean.d.ts" />
/// <reference types="./lib.gecko.nsresult.d.ts" />
/// <reference types="./lib.gecko.services.d.ts" />
/// <reference types="./lib.gecko.xpcom.d.ts" />
/// <reference types="./lib.gecko.xpidl.d.ts" />

/// Platform specific XPCOM modules.
/// <reference types="./lib.gecko.darwin.d.ts" />
/// <reference types="./lib.gecko.linux.d.ts" />
/// <reference types="./lib.gecko.win32.d.ts" />

/// Order of references matters here, for overriding type signatures.
/// <reference types="./lib.gecko.tweaks.d.ts" />

declare global {
  const Cc: nsXPCComponents_Classes;
  const Ci: nsIXPCComponents_Interfaces;
  const Components: nsIXPCComponents;
  const Cr: nsIXPCComponents_Results;

  // Resolve typed generic overloads before the generated ones.
  const Cu: nsXPCComponents_Utils & nsIXPCComponents_Utils;

  const Services: JSServices;
  const uneval: (any) => string;
}

export {};

/// <reference types="./zen.d.ts" />
