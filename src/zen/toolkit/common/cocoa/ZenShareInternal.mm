/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ZenShareInternal.h"
#include "nsIWindowsUIUtils.h"

#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>

@interface nsZenNativeShareInternal : NSObject
- (void)ShowNativeDialog:(nsCOMPtr<mozIDOMWindowProxy>& aWindow, nsIURI* aUrl,
                        const nsACString& aTitle, const nsACString& aText,
                        uint32_t aX, uint32_t aY) {
  // Just use the URL since apple doesn't support sharing text
  // and title in the share dialog
  NSSharingServicePicker* sharingPicker =
      [[NSSharingServicePicker alloc] initWithItems:@[ aUrl ]];
  sharingPicker.delegate = self;
  sharingPicker.showRelativeToRect:NSMakeRect(aX, aY, 0, 0)
      ofView:(NSView*)aWindow
      preferredEdge:NSMinYEdge;
}

@end