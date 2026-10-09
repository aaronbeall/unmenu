import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ENTITLEMENT_ID = 'Unmenu Pro';

export const PACKAGE_IDENTIFIERS = {
  LIFETIME: '$rc_lifetime',
  YEARLY: '$rc_annual',
  MONTHLY: '$rc_monthly',
} as const;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let configuredForUserId: string | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const extra = Constants.expoConfig?.extra as
    | {
        revenueCatAndroidApiKey?: string;
        revenueCatIosApiKey?: string;
      }
    | undefined;

  if (Platform.OS === 'android') {
    return extra?.revenueCatAndroidApiKey || '';
  }

  if (Platform.OS === 'ios') {
    return extra?.revenueCatIosApiKey || '';
  }

  return '';
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export async function configureRevenueCat(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('Missing user ID for RevenueCat configuration');
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'RevenueCat API key is missing. Set expo.extra.revenueCatAndroidApiKey/revenueCatIosApiKey in app.json.'
    );
  }

  if (configuredForUserId === userId) {
    return;
  }

  if (__DEV__) {
    await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({ apiKey, appUserID: userId });
  configuredForUserId = userId;
}

// ---------------------------------------------------------------------------
// Customer info & entitlements
// ---------------------------------------------------------------------------

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function hasProEntitlement(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return ENTITLEMENT_ID in customerInfo.entitlements.active;
}

export function hasProEntitlementFromInfo(customerInfo: CustomerInfo): boolean {
  return ENTITLEMENT_ID in customerInfo.entitlements.active;
}

export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

// ---------------------------------------------------------------------------
// Offerings & products
// ---------------------------------------------------------------------------

export async function getOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
}

export interface AvailableProducts {
  lifetime?: PurchasesPackage;
  yearly?: PurchasesPackage;
  monthly?: PurchasesPackage;
  all: PurchasesPackage[];
}

export async function getAvailableProducts(): Promise<AvailableProducts> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;

  if (!current || current.availablePackages.length === 0) {
    return { all: [] };
  }

  const findPkg = (id: string) =>
    current.availablePackages.find((pkg) => pkg.identifier === id);

  return {
    lifetime: findPkg(PACKAGE_IDENTIFIERS.LIFETIME),
    yearly: findPkg(PACKAGE_IDENTIFIERS.YEARLY),
    monthly: findPkg(PACKAGE_IDENTIFIERS.MONTHLY),
    all: current.availablePackages,
  };
}

// ---------------------------------------------------------------------------
// Manual purchasing (fallback – prefer Paywall UI below)
// ---------------------------------------------------------------------------

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function purchasePro(): Promise<CustomerInfo> {
  const products = await getAvailableProducts();

  const preferredPackage =
    products.monthly || products.yearly || products.lifetime || products.all[0];

  if (!preferredPackage) {
    throw new Error('No subscription packages available from RevenueCat offerings.');
  }

  const customerInfo = await purchasePackage(preferredPackage);

  if (!hasProEntitlementFromInfo(customerInfo)) {
    throw new Error('Purchase completed but Unmenu Pro entitlement is not active yet.');
  }

  return customerInfo;
}

// ---------------------------------------------------------------------------
// RevenueCat Paywall (recommended)
// ---------------------------------------------------------------------------

export { PAYWALL_RESULT };

export async function presentPaywall(): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywall();
}

export async function presentPaywallIfNeeded(): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: ENTITLEMENT_ID,
  });
}

// ---------------------------------------------------------------------------
// Customer Center (subscription management UI by RevenueCat)
// ---------------------------------------------------------------------------

export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}

// ---------------------------------------------------------------------------
// Restore purchases
// ---------------------------------------------------------------------------

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logoutRevenueCat(): Promise<void> {
  if (!configuredForUserId) {
    return;
  }

  await Purchases.logOut();
  configuredForUserId = null;
}

// ---------------------------------------------------------------------------
// Legacy: open platform subscription management page
// ---------------------------------------------------------------------------

export async function openSubscriptionManagement(): Promise<void> {
  const manageUrl =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';

  const canOpen = await Linking.canOpenURL(manageUrl);
  if (!canOpen) {
    throw new Error('Unable to open subscription management URL');
  }

  await Linking.openURL(manageUrl);
}
