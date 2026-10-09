import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { CustomerInfo } from 'react-native-purchases';
import {
  configureRevenueCat,
  getCustomerInfo,
  hasProEntitlementFromInfo,
  addCustomerInfoUpdateListener,
  presentPaywall,
  presentPaywallIfNeeded,
  presentCustomerCenter,
  restorePurchases,
  logoutRevenueCat,
  PAYWALL_RESULT,
  ENTITLEMENT_ID,
} from './revenuecat';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueCatContextValue {
  /** Whether the SDK has been configured for the current user */
  isConfigured: boolean;
  /** Whether the user has the "Unmenu Pro" entitlement */
  isPro: boolean;
  /** Latest CustomerInfo from RevenueCat (null until first fetch) */
  customerInfo: CustomerInfo | null;
  /** True while we are loading customer info for the first time */
  loading: boolean;
  /** Configure the SDK for a specific user */
  configure: (userId: string) => Promise<void>;
  /** Present the RevenueCat Paywall */
  showPaywall: () => Promise<PAYWALL_RESULT>;
  /** Present the paywall only if the user does not have Unmenu Pro */
  showPaywallIfNeeded: () => Promise<PAYWALL_RESULT>;
  /** Present the RevenueCat Customer Center */
  showCustomerCenter: () => Promise<void>;
  /** Restore previous purchases */
  restore: () => Promise<CustomerInfo>;
  /** Logout from RevenueCat */
  logout: () => Promise<void>;
  /** Manually refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const isPro = useMemo(
    () => (customerInfo ? hasProEntitlementFromInfo(customerInfo) : false),
    [customerInfo]
  );

  // Listen for real-time customer info updates from RevenueCat
  useEffect(() => {
    if (!isConfigured) return;

    const unsubscribe = addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });

    return unsubscribe;
  }, [isConfigured]);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[RevenueCat] Failed to refresh customer info:', error);
    }
  }, []);

  const configure = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      await configureRevenueCat(userId);
      setIsConfigured(true);
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('[RevenueCat] Configuration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const showPaywall = useCallback(async () => {
    const result = await presentPaywall();
    // Refresh customer info after paywall interaction
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      await refreshCustomerInfo();
    }
    return result;
  }, [refreshCustomerInfo]);

  const showPaywallIfNeeded = useCallback(async () => {
    const result = await presentPaywallIfNeeded();
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      await refreshCustomerInfo();
    }
    return result;
  }, [refreshCustomerInfo]);

  const showCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
    // Refresh after customer center interaction (user may have changed subscription)
    await refreshCustomerInfo();
  }, [refreshCustomerInfo]);

  const restore = useCallback(async () => {
    const info = await restorePurchases();
    setCustomerInfo(info);
    return info;
  }, []);

  const logout = useCallback(async () => {
    await logoutRevenueCat();
    setIsConfigured(false);
    setCustomerInfo(null);
  }, []);

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      isConfigured,
      isPro,
      customerInfo,
      loading,
      configure,
      showPaywall,
      showPaywallIfNeeded,
      showCustomerCenter,
      restore,
      logout,
      refreshCustomerInfo,
    }),
    [
      isConfigured,
      isPro,
      customerInfo,
      loading,
      configure,
      showPaywall,
      showPaywallIfNeeded,
      showCustomerCenter,
      restore,
      logout,
      refreshCustomerInfo,
    ]
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRevenueCat(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error('useRevenueCat must be used within a <RevenueCatProvider>');
  }
  return ctx;
}
