import SafariServices
import os.log

/// Where `browser.runtime.sendNativeMessage` lands. Kit Scrobbler's JavaScript
/// does not use it, so this only answers to keep the channel healthy.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
	/// Safari passes the page's payload under this key, both ways.
	private let messageKey = "message"

	func beginRequest(with context: NSExtensionContext) {
		let item = context.inputItems.first as? NSExtensionItem
		let message = item?.userInfo?[messageKey]

		os_log(.default, "Kit Scrobbler received: %@", String(describing: message))

		let response = NSExtensionItem()
		response.userInfo = [messageKey: ["received": true]]
		context.completeRequest(returningItems: [response], completionHandler: nil)
	}
}
