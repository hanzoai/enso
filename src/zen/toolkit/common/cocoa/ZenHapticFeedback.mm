/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ZenCommonUtils.h"
#include "nsCocoaUtils.h"

#include "nsPIDOMWindow.h"
#include "WidgetUtils.h"
#include "nsIWidget.h"

extern mozilla::LazyLogModule gCocoaUtilsLog;
#undef LOG
#define LOG(...) MOZ_LOG(gCocoaUtilsLog, mozilla::LogLevel::Info, (__VA_ARGS__))

#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>

namespace zen {
using ::mozilla::widget::WidgetUtils;
namespace {
/**
 * Get the native haptic feedback type from the uint32_t.
 *
 * @param type The uint32_t to convert.
 * @return The native haptic feedback type.
 */
inline UIImpactFeedbackStyle GetNativeHapticFeedbackType(uint32_t type) {
  return static_cast<UIImpactFeedbackStyle>(type);
}
}

nsresult ZenCommonUtils::PlayHapticFeedbackInternal(uint32_t type) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;
  auto style = GetNativeHapticFeedbackType(type);
  if (@available(iOS 10.0, macOS 10.14, *)) {
    UIImpactFeedbackGenerator *generator = [[UIImpactFeedbackGenerator alloc] initWithStyle:style];
    [generator prepare];
    [generator impactOccurred];
    generator = nil;
  } else {
    // Fallback on earlier versions
    // Note: This is a no-op on older versions of iOS/macOS
  }
  NS_OBJC_END_TRY_BLOCK_RETURN(nil);
}
}

