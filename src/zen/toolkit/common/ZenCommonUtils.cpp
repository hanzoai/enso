#include "ZenCommonUtils.h"
#if defined(XP_WIN)
#  include "mozilla/WindowsVersion.h"
#endif

namespace zen {

// Use the macro to inject all of the definitions for nsISupports.
NS_IMPL_ISUPPORTS(ZenCommonUtils, nsIZenCommonUtils)

ZenCommonUtils::ZenCommonUtils(nsGlobalWindowOuter* aWindow) {
  nsCOMPtr<nsISupports> supports = do_QueryObject(aWindow);
  mWindow = do_GetWeakReference(supports);
}

/*
  * @brief Check if the current context can share data.
  * @param data The data to share.
  * @returns True if the current context can share data, false otherwise.
  */
NS_IMETHODIMP
ZenCommonUtils::CanShare(const nsIDOMWindow& aWindow, bool* canShare) {
  if (!aWindow || !aWindow->IsFullyActive()) {
    *canShare = false;
    return NS_OK;
  }
  *canShare = IsSharingSupported();
  return NS_OK;
}

NS_IMETHODIMP
ZenCommonUtils::Share(const nsIDOMWindow& aWindow, const nsAString& url,
                      const nsAString& title, const nsAString& text,
                      mozilla::dom::Promise** _retval) {
  if (!aWindow || !aWindow->IsFullyActive()) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (!IsSharingSupported()) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (url.IsEmpty()) {
    return NS_ERROR_INVALID_ARG;
  }
  if (title.IsEmpty() && text.IsEmpty()) {
    return NS_ERROR_INVALID_ARG;
  }
  if (aWindow->GetExtantDoc()) {
    nsCOMPtr<nsIURI> uri;
    nsresult rv = aWindow->GetExtantDoc()->ResolveWithBaseURI(url, getter_AddRefs(uri));
    if (NS_FAILED(rv) || !uri) {
      return NS_ERROR_INVALID_ARG;
    }
  }
  if (mSharePromise) {
    NS_WARNING("Only one share picker at a time per navigator instance");
    return NS_ERROR_INVALID_STATE;
  }
  mSharePromise = Promise::Create(aWindow, __func__);
  if (!mSharePromise) {
    return NS_ERROR_FAILURE;
  }
  IPCWebShareData data(title, text, url);
  auto wgc = aWindow->GetWindowGlobalChild();
  if (!wgc) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }
  wgc->SendShare(data)->Then(
    GetCurrentSerialEventTarget(), __func__,
    [self = RefPtr{this}](
        PWindowGlobalChild::SharePromise::ResolveOrRejectValue&& aResult) {
      if (aResult.IsResolve()) {
        if (NS_SUCCEEDED(aResult.ResolveValue())) {
          self->mSharePromise->MaybeResolveWithUndefined();
        } else {
          self->mSharePromise->MaybeReject(aResult.ResolveValue());
        }
      } else if (self->mSharePromise) {
        // IPC died
        self->mSharePromise->MaybeReject(NS_BINDING_ABORTED);
      }
      self->mSharePromise = nullptr;
    });
  return NS_OK;
}

auto ZenCommonUtils::IsSharingSupported() -> bool {
#if defined(XP_WIN) && !defined(__MINGW32__)
  // The first public build that supports ShareCanceled API
  return IsWindows10BuildOrLater(18956);
#else
  return true;
#endif
}

} // namespace: zen