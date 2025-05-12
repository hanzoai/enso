/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ZenShareInternal.h"
#include "nsIWindowsUIUtils.h"

auto nsZenNativeShareInternal::ShowNativeDialog(
      nsCOMPtr<mozIDOMWindowProxy>& aWindow, nsIURI* aUrl,
      const nsACString& aTitle, const nsACString& aText,
      uint32_t aX, uint32_t aY) const
    -> void {
  nsAutoCString urlString;
  if (aUrl) {
    nsresult rv = aUrl->GetSpec(urlString);
    MOZ_ASSERT(NS_SUCCEEDED(rv));
    mozilla::Unused << rv;
  } else {
    urlString.SetIsVoid(true);
  }
  (void)WindowsUIUtils::Share(NS_ConvertUTF8toUTF16_MaybeVoid(aTitle),
                              NS_ConvertUTF8toUTF16_MaybeVoid(aText),
                              NS_ConvertUTF8toUTF16_MaybeVoid(urlString));
}
