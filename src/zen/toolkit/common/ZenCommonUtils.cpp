/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ZenCommonUtils.h"
#include "ZenShareInternal.h"

#include "nsGlobalWindowOuter.h"
#include "nsQueryObject.h"
#include "nsIWindowMediator.h"
#include "nsServiceManagerUtils.h"
#include "nsISharePicker.h"

#if defined(XP_WIN)
#  include "mozilla/WindowsVersion.h"
#endif

namespace zen {

// Use the macro to inject all of the definitions for nsISupports.
NS_IMPL_ISUPPORTS(ZenCommonUtils, nsIZenCommonUtils)
using WindowGlobalChild = mozilla::dom::WindowGlobalChild;

namespace {
/**
  * @brief Helper function to fetch the most recent window proxy.
  * @param aWindow The window to query.
  * @returns The most recent window.
  */
static nsresult GetMostRecentWindowProxy(mozIDOMWindowProxy** aWindow) {
  nsresult rv;
  nsCOMPtr<nsIWindowMediator> med(
      do_GetService(NS_WINDOWMEDIATOR_CONTRACTID, &rv));
  if (NS_FAILED(rv)) return rv;

  if (med) return med->GetMostRecentBrowserWindow(aWindow);

  return NS_ERROR_FAILURE;
}
/**
  * @brief Helper function to query and get a reference to the window.
  * @param aWindow The window to query.
  */
static nsCOMPtr<mozIDOMWindowProxy> GetMostRecentWindow() {
  nsCOMPtr<mozIDOMWindowProxy> aWindow;
  nsresult rv = GetMostRecentWindowProxy(getter_AddRefs(aWindow));
  if (NS_FAILED(rv) || !aWindow) {
    return nullptr;
  }
  return aWindow;
}
}

using mozilla::dom::WindowGlobalChild;

#define NS_ZEN_CAN_SHARE_FAILURE() \
  *canShare = false; \
  return NS_OK;

/*
  * @brief Check if the current context can share data.
  * @param data The data to share.
  * @returns True if the current context can share data, false otherwise.
  */
NS_IMETHODIMP
ZenCommonUtils::CanShare(bool* canShare) {
  auto aWindow = GetMostRecentWindow();
  if (!aWindow) {
    NS_ZEN_CAN_SHARE_FAILURE();
  }
  *canShare = IsSharingSupported();
  return NS_OK;
}

NS_IMETHODIMP
ZenCommonUtils::Share(nsIURI* url, const nsACString& title, 
    const nsACString& text, uint32_t aX, uint32_t aY) {
  auto aWindow = GetMostRecentWindow();
  if (!aWindow) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (!IsSharingSupported()) {
    return NS_OK; // We don't want to throw an error here
  }
  *_retval = ShareInternal(aWindow, url, title, text, aX, aY);
  return NS_OK;
}

void ZenCommonUtils::ShareInternal(nsCOMPtr<mozIDOMWindowProxy>& aWindow, nsIURI* url,
    const nsACString& title, const nsACString& text, uint32_t aX, uint32_t aY) {
  // We shoud've had done pointer checks before, so we can assume
  // aWindow is valid.
#ifdef ZEN_CAN_SHARE_NATIVE
  ::nsZenNativeShareInternal(aWindow, url, title, text, aX, aY);
#else
}

auto ZenCommonUtils::IsSharingSupported() -> bool {
#if defined(XP_WIN) && !defined(__MINGW32__)
  // The first public build that supports ShareCanceled API
  return IsWindows10BuildOrLater(18956);
#elif defined(NS_ZEN_CAN_SHARE_NATIVE)
  return NS_ZEN_CAN_SHARE_NATIVE;
#else
  return true;
#endif
}

} // namespace: zen