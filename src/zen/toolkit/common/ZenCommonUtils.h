/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_nsZenCommonUtils_h__
#define mozilla_nsZenCommonUtils_h__

#include "nsIDOMWindow.h"
#include "nsIZenCommonUtils.h"

namespace zen {

/**
 * @brief Common utility functions for Zen.
 */
class ZenCommonUtils final : public nsIZenCommonUtils {
  NS_DECL_ISUPPORTS
  NS_DECL_NSIZENCOMMONUTILS

 public:
  explicit ZenCommonUtils() = default;

 private:
  ~ZenCommonUtils() = default;

  RefPtr<mozilla::dom::Promise> mSharePromise;  // Web Share API related

  /**
   * @brief Check if the current context can share data.
   * @param data The data to share.
   * @returns True if the current context can share data, false otherwise.
   */
  static auto IsSharingSupported() -> bool;
};

}  // namespace zen

#endif
