import Expo
import React
import ReactAppDependencyProvider

private func extractBundleURL(from incomingURL: URL?) -> URL? {
  guard
    let incomingURL,
    let components = URLComponents(url: incomingURL, resolvingAgainstBaseURL: false),
    let rawBundleURL = components.queryItems?.first(where: { $0.name == "url" })?.value,
    let bundleURL = URL(string: rawBundleURL)
  else {
    return nil
  }
  return bundleURL
}

private func extractPackagerHostPort(from incomingURL: URL?) -> String? {
  guard let bundleURL = extractBundleURL(from: incomingURL), let components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false), let host = components.host else {
    return nil
  }
  if let port = components.port {
    return "\(host):\(port)"
  }
  return host
}

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let launchURL = launchOptions?[.url] as? URL
    ReactNativeDelegate.injectedPackagerHostPort = extractPackagerHostPort(from: launchURL)
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    ReactNativeDelegate.injectedPackagerHostPort = extractPackagerHostPort(from: url) ?? ReactNativeDelegate.injectedPackagerHostPort
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins
  static var injectedPackagerHostPort: String?

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    let bridgeURL = bridge.bundleURL
    let fallbackURL = bundleURL()
    return bridgeURL ?? fallbackURL
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let settings = RCTBundleURLProvider.sharedSettings()
    if let injectedPackagerHostPort = ReactNativeDelegate.injectedPackagerHostPort, (settings.jsLocation == nil || settings.jsLocation?.isEmpty == true) {
      settings.jsLocation = injectedPackagerHostPort
    }
    return settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
