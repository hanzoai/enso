/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ZenShareInternal.h"
#include "nsCocoaUtils.h"

extern mozilla::LazyLogModule gCocoaUtilsLog;
#undef LOG
#define LOG(...) MOZ_LOG(gCocoaUtilsLog, mozilla::LogLevel::Debug, (__VA_ARGS__))

#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>

auto nsZenNativeShareInternal::ShowNativeDialog(
      nsCOMPtr<mozIDOMWindowProxy>& aWindow, nsIURI* aUrl,
      const nsACString& aTitle, const nsACString& aText,
      uint32_t aX, uint32_t aY) const
    -> void {
  // Just use the URL since apple doesn't support sharing text
  // and title in the share dialog
  nsAutoCString pageUrlAsStringTemp;
  if (aUrl) {
    nsresult rv = aUrl->GetSpec(pageUrlAsStringTemp);
    MOZ_ASSERT(NS_SUCCEEDED(rv));
    mozilla::Unused << rv;
  } else {
    pageUrlAsStringTemp.SetIsVoid(true);
  }
  NSURL* pageUrl = nsCocoaUtils::ToNSURL(
    NS_ConvertUTF8toUTF16(pageUrlAsStringTemp)
  );
  LOG("pageUrl: %s", pageUrlAsStringTemp.get());
  if (!pageUrl || (![pageUrl.scheme isEqualToString:@"https"] &&
                   ![pageUrl.scheme isEqualToString:@"http"])) {
    return;
  }
  NSSharingServicePicker* sharingPicker =
      [[NSSharingServicePicker alloc] initWithItems:@[ pageUrl ]];
  // Create a rect for the sharing picker
  NSRect rect = NSMakeRect(aX, aY, 0, 0);
  [sharingPicker showRelativeToRect:rect];
}
