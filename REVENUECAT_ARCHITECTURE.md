# RevenueCat + Google Play Architecture & How It Works

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      UnMenu Ecosystem                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐        ┌──────────────────┐                 │
│  │ Mobile App   │◄──────►│ Your Backend     │                 │
│  │ (React       │        │ (Express +       │                 │
│  │  Native)     │        │  Prisma)         │                 │
│  └──────┬───────┘        └────────┬─────────┘                 │
│         │                         │                            │
│    JWT token                PostgreSQL                          │
│    stored               subscription                            │
│    locally              fields                                  │
│         │                         │                            │
│         └─────────────┬───────────┘                            │
│                       │                                         │
│  ┌────────────────────▼──────────────────┐                    │
│  │         RevenueCat Service             │                    │
│  │  (Payment Orchestrator)                │                    │
│  │                                        │                    │
│  │  • Manages entitlements                │                    │
│  │  • Handles receipt validation          │                    │
│  │  • Sends webhook events                │                    │
│  └────────┬───────────────────┬──────────┘                    │
│           │                   │                                │
│        (SDK)               (Webhook)                            │
│           │                   │                                │
│  ┌────────▼──────┐  ┌────────▼─────────────┐                 │
│  │ Google Play    │  │ POST /api/billing/   │                 │
│  │ Billing API    │  │ revenuecat/webhook   │                 │
│  │                │  │ (Backend receives    │                 │
│  │ • Processes    │  │  entitlement events) │                 │
│  │   payments     │  └────────┬─────────────┘                 │
│  │ • Validates    │           │                                │
│  │   receipts     │    Updates subscription_tier               │
│  │ • Manages      │    updates subscription_expires_at         │
│  │   subscriptions│                                             │
│  └────────────────┘                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Subscription State Machine

```
                        ┌─────────────┐
                        │ Free Tier   │
                        │ (initial)   │
                        └─────┬───────┘
                              │
                              │ User taps "Upgrade"
                              │ → purchasePro() called
                              ▼
                    ┌──────────────────┐
                    │ Google Play      │
                    │ Purchase Sheet   │
                    │ (native)         │
                    └──────┬───────────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
      User            User cancels      User completes
      closes          or closes          payment
         │                 │                  │
         ▼                 ▼                  ▼
    ┌────────┐         ┌────────┐      ┌──────────┐
    │ Free   │         │ Free   │      │ Pending  │
    │ (no    │         │ (no    │      │ (receipt │
    │change) │         │change) │      │ sent to  │
    └────────┘         └────────┘      │ Google)  │
                                       └────┬─────┘
                                            │
                                    Google validates
                                    receipt
                                            │
         ┌──────────────────────────────────┼──────────────────────┐
         │                                  │                      │
      Invalid                          Valid receipt           Can't validate
      receipt                               │                      │
         │                                  ▼                      │
         ▼                          ┌────────────────┐             ▼
    ┌────────┐                      │ Pro Tier       │       RevenueCat
    │ Free   │                      │ (subscription  │       retries
    │ (user  │                      │  active)       │
    │ sees   │                      │                │
    │ error) │                      │ Renewal date   │
    └────────┘                      │ set based on   │
                                    │ play store     │
                                    └────┬───────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                  Subscription       Auto-renew    Grace period
                  expires (no         next cycle    (still active
                  renewal)                          ~3-5 days)
                         │               │               │
                         ▼               ▼               ▼
                    ┌────────┐   ┌─────────────┐   ┌──────────┐
                    │ Free   │   │ Pro         │   │ Pro      │
                    │ (data  │   │ (refreshed) │   │ (grace)  │
                    │ stays) │   └─────────────┘   └────┬─────┘
                    └────────┘                        Fails to renew
                                                           │
                                                           ▼
                                                      ┌────────┐
                                                      │ Free   │
                                                      │(after  │
                                                      │grace)  │
                                                      └────────┘

RevenueCat Webhook Event Types:
├─ INITIAL_PURCHASE      → Pro (new subscription)
├─ RENEWAL               → Pro (annual/monthly refresh)
├─ UNCANCELLATION        → Pro (user reinstated)
├─ SUBSCRIPTION_EXTENDED → Pro (extended manually)
├─ PRODUCT_CHANGE        → Pro (tier changed)
├─ EXPIRATION            → Free (subscription ended)
├─ REFUND                → Free (user refunded)
├─ SUBSCRIPTION_PAUSED   → Free (user paused)
└─ BILLING_ISSUE         → Webhook to investigate
```

## Data Flow: Purchase → Backend Entitlement

### Happy Path (Successful Purchase)

```
┌──────────────────────────────────────┐
│ 1. User logs in                      │
│                                      │
│ Mobile calls:                        │
│ configureRevenueCat(user.id)         │
│                                      │
│ → RevenueCat SDK initialized with   │
│   appUserID = user.id              │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 2. User taps "Upgrade to Pro"       │
│                                      │
│ Mobile calls:                        │
│ purchasePro()                        │
│                                      │
│ → RevenueCat SDK shows native       │
│   Google Play Billing purchase sheet│
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 3. User enters payment in Play Store │
│                                      │
│ Google Play:                         │
│ • Validates payment method           │
│ • Processes charge (transaction ID)  │
│ • Marks user as subscribed           │
│ • Issues receipt token               │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 4. RevenueCat Validates Receipt      │
│                                      │
│ RevenueCat service:                  │
│ • Calls Google Play API              │
│ • Validates token with Play Console  │
│   Service Account credentials        │
│ • Extracts entitlements (pro)        │
│ • Sets expiration_date               │
│ • Fires INITIAL_PURCHASE event       │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 5. Webhook to Backend                │
│                                      │
│ POST /api/billing/revenuecat/webhook │
│ Headers: Authorization: Bearer token │
│ Body: {                              │
│   event: {                           │
│     type: "INITIAL_PURCHASE",       │
│     app_user_id: "<user-mongo-id>", │
│     entitlement_ids: ["pro"],       │
│     expiration_at_ms: 1709424000000,│
│     transaction_id: "...",          │
│     store: "google_play"            │
│   }                                  │
│ }                                    │
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 6. Backend Updates Database          │
│                                      │
│ UPDATE "User" SET                    │
│   subscription_tier = 'pro'          │
│   subscription_source = 'google_play'│
│   subscription_expires_at = ...      │
│   revenuecat_app_user_id = ...      │
│ WHERE id = '<user-mongo-id>'        │
│                                      │
│ Scans remaining: set to 35 (PRO_TIER)│
└──────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│ 7. Mobile Refreshes Profile          │
│                                      │
│ GET /api/user/profile (auth)         │
│ Returns: subscription_tier: 'pro'    │
│                                      │
│ UI updates:                          │
│ • Show "Pro Member" badge            │
│ • Hide "Upgrade" button              │
│ • Show "Manage / Cancel"             │
│ • Scans remaining now higher         │
└──────────────────────────────────────┘
```

## Renewal Flow (Next Month)

When a subscription is set to auto-renew:

1. **Scheduled by Play Store** – Date set from initial purchase date + 1 month
2. **Google Play renews** – Charge user, issue new receipt
3. **RevenueCat validates** – Detects RENEWAL event, updates `subscription_expires_at`
4. **Webhook fires** – `POST /api/billing/revenuecat/webhook` with type: "RENEWAL"
5. **Backend updates** – Sets `subscription_tier = 'pro'`, new expiry date
6. **Timeline** – User sees new expiry date in profile

## Cancellation Flow

### User Cancels in Play Store
1. User opens Play Store → Subscriptions → UnMenu → Manage
2. Taps "Cancel subscription"
3. Confirms cancellation
4. Play Store marks subscription as cancelled
5. Grace period starts (~3-5 days)
6. After grace period ends, subscription expires
7. RevenueCat detects expiration, fires webhook with type: "EXPIRATION"
8. Backend receives webhook, sets `subscription_tier = 'free'`

### User Taps "Manage / Cancel" in App
- App opens `openSubscriptionManagement()`
- Links to Play Store subscription settings
- User follows Play Store flow above

## Understanding Webhook Events (Backend)

Backend processes these event types:

| Event Type | Action | Tier Set To | Notes |
|---|---|---|---|
| `INITIAL_PURCHASE` | First subscription | `pro` | Sets scans_remaining = 35 |
| `RENEWAL` | Auto-renewed | `pro` | Refreshes expiration_at |
| `UNCANCELLATION` | User reinstated | `pro` | Reactivated after cancellation |
| `SUBSCRIPTION_EXTENDED` | Time added (gift) | `pro` | New expiration_at |
| `PRODUCT_CHANGE` | Tier upgrade | `pro` | (Currently we only have 1 tier) |
| `EXPIRATION` | Subscription lapsed | `free` | Data stays, scans reset to free quota |
| `REFUND` | User refunded | `free` | Full refund issued |
| `SUBSCRIPTION_PAUSED` | User paused | `free` | Paused, can resume later |
| `BILLING_ISSUE` | Payment failed | (no change) | Notification; user in grace period |

## Data Consistency: What's Source of Truth?

**RevenueCat (Play Store) is the source of truth.** Your backend mirrors.

| Piece of Data | Source of Truth | Backup Logic |
|---|---|---|
| User subscribed? | RevenueCat webhook | Mobile can call `restorePurchases()` to sync |
| When expires? | Play Store | RevenueCat updates `expiration_at_ms` |
| Can scan? | Backend checks `subscription_tier` | Mobile can verify in RevenueCat SDK if offline |
| How many scans? | Backend `scans_remaining` field | If lost, can query Play Store via RevenueCat |

**If backend database is out of sync:**
- User taps "Restore Purchases" in Profile  
- Mobile SDK calls `restorePurchases()` (RevenueCat → Google Play)
- RevenueCat re-fires webhook if needed
- Backend corrects its state

## Sandbox vs. Production

### Sandbox (Testing)
- **RevenueCat API Key**: "Sandbox" key  
- **App in app.json**: `revenueCatAndroidApiKey = sandbox_key`
- **Testing Flow**: Play Store Sandbox automatically approves all purchases within seconds (no real charge)
- **Reset**: Data persists on test device between app uninstalls

### Production
- **RevenueCat API Key**: "Production" key
- **App in app.json**: `revenueCatAndroidApiKey = production_key`
- **Real Charges**: Google Play charges actual payment method (can refund within 1 hour)
- **Production Webhook**: Must use production backend URL + secret

---

See [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md) for step-by-step setup.
See [REVENUECAT_ADMIN.md](REVENUECAT_ADMIN.md) for managing subscriptions.
