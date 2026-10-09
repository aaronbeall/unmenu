# RevenueCat Admin Guide: Management & Troubleshooting

## Admin Workflows

### 1. View All Pro Subscribers

**Database Query (Direct)**
```sql
SELECT 
  id,
  email,
  subscription_tier,
  subscription_source,
  subscription_expires_at,
  scans_remaining,
  created_at,
  updated_at
FROM "User"
WHERE subscription_tier = 'pro'
ORDER BY subscription_expires_at DESC;
```

**With Expiry Status**
```sql
SELECT 
  email,
  subscription_tier,
  subscription_expires_at,
  CASE 
    WHEN subscription_expires_at > NOW() THEN 'Active'
    WHEN subscription_expires_at > NOW() - INTERVAL '5 days' THEN 'Grace Period'
    ELSE 'Expired'
  END as status,
  EXTRACT(DAY FROM subscription_expires_at - NOW()) as days_remaining
FROM "User"
WHERE subscription_tier = 'pro'
ORDER BY subscription_expires_at ASC;
```

**Revenue Insight (This Month)**
```sql
SELECT 
  COUNT(*) as total_pro_users,
  COUNT(CASE WHEN subscription_expires_at > NOW() THEN 1 END) as active_users,
  COUNT(CASE WHEN subscription_expires_at <= NOW() THEN 1 END) as expired_users
FROM "User"
WHERE subscription_tier = 'pro'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND created_at < DATE_TRUNC('month', NOW() + INTERVAL '1 month');
```

### 2. RevenueCat Dashboard: Check Customer Details

In **RevenueCat Dashboard**:
1. Click **Customers** (left sidebar)
2. Search by **email address**
3. View:
   - Entitlements (pro = subscribed)
   - Expiration dates
   - Subscription history
   - Purchase receipts
   - Refunds/cancellations

### 3. Investigate a Specific User (Customer Support)

**Scenario:** User says "I paid but I'm still Free"

**Step 1: Find user**
```sql
SELECT * FROM "User" WHERE email = 'user@example.com';
```

**Check:**
- `subscription_tier` – is it 'pro'?
- `subscription_expires_at` – is future date?
- `revenuecat_app_user_id` – is it populated?

**Step 2: Check RevenueCat**
1. Go to **Customers** → search email
2. Check **Entitlements** section
   - Should show `pro` entitlement as "Active"
3. Check **Subscription History**
   - Should show INITIAL_PURCHASE or recent RENEWAL

**Step 3: Check Backend Logs**
```bash
# Look for webhook receipt
grep "INITIAL_PURCHASE\|<user-email>" backend.log

# Check if backend received webhook
grep "webhook.*POST" backend.log | tail -20
```

**Step 4: Resolution Paths**

| Scenario | Fix |
|---|---|
| Backend has tier=free but RevenueCat shows pro | User should tap "Restore Purchases" in Profile. If that fails, webhook wasn't processed. Check backend logs for webhook errors |
| RevenueCat shows free but user paid | Check Play Store Console for receipt. Validate receipt in RevenueCat Customers page. If receipt is valid but entitlement missing, it's a RevenueCat bug |
| Both show pro but user doesn't believe it | Confirm `subscription_expires_at` is future date. Show user the Pro badge in Profile. If future date but no pro badge, clear app cache and retry |

### 4. Debug: Webhook Not Received

**Check Backend Webhook Logs**
```bash
# Start backend in verbose mode
cd backend
NODE_DEBUG=* npm run dev 2>&1 | grep -i "webhook\|billing"

# Or check app logs if deployed
# Look for: "[Billing] Received webhook" or "[Billing] Webhook error"
```

**Manual Webhook Test in RevenueCat**
1. Go to **Project Settings** → **Integrations** → **Webhooks**
2. Find your webhook URL
3. Click **Send test event**
   - Select event type: INITIAL_PURCHASE
   - Should return **200 OK**
   - If **401** or **500**, backend is misconfigured

**Webhook Checklist**
- [ ] `REVENUECAT_WEBHOOK_SECRET` matches RevenueCat config
- [ ] Backend is deployed and accessible at webhook URL
- [ ] Webhook URL in RevenueCat is correct (https, not http)
- [ ] Backend logs show "Webhook received" lines
- [ ] Database has `subscription_source`, `subscription_expires_at` columns

### 5. Fix Out-of-Sync Subscription State

**Problem:** Backend says `free` but RevenueCat says `pro`

**Quick Fix for User:**
1. Tell user: "Tap Profile → Restore Purchases"
2. App calls `restorePurchases()` → RevenueCat checks Play Store
3. If RevenueCat re-fires webhook, backend auto-corrects

**Manual Backend Fix (Admin):**
```typescript
// Import prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Find user
const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });

// Check RevenueCat (manual lookup or export)
// If confirmed pro in RevenueCat, manually fix backend:
const updated = await prisma.user.update({
  where: { id: user.id },
  data: {
    subscription_tier: 'pro',
    subscription_expires_at: new Date('2025-04-05T00:00:00Z'), // Set to actual expiry
    scans_remaining: 35
  }
});

console.log('Updated user:', updated);
```

### 6. Handle Refunds & Cancellations

**User Requests Refund**

In **Google Play Console**:
1. Go to **Orders** → find transaction
2. Click **Refund** → Choose **Full refund**
3. Approve (charge is reversed immediately)

**What Happens:**
- Play Store sends refund notification
- RevenueCat detects REFUND event
- Webhook fires → backend sets `subscription_tier = 'free'`
- User automatically downgraded

**User Requests to Cancel**
- Best practice: Guide user to Play Store settings
- Or in app: tap "Manage / Cancel Subscription"
- User cancels directly in Play Store (UnMenu doesn't need to do anything)

### 7. Monitor Subscription Churn

**Cancellations This Month**
```sql
SELECT 
  COUNT(*) as cancelled_count,
  DATE(subscription_expires_at) as cancelled_date
FROM "User"
WHERE subscription_tier = 'free'
  AND updated_at >= DATE_TRUNC('month', NOW())
ORDER BY cancelled_date;
```

**Churn Rate**
```sql
SELECT 
  COUNT(CASE WHEN subscription_tier = 'free' THEN 1 END)::float / 
  COUNT(*)::float * 100 as percent_free
FROM "User"
WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  AND created_at < DATE_TRUNC('month', NOW());
```

## Development & Testing

### Test Complete Purchase Flow Locally

**Step 1: Configure Sandbox**
```json
// mobile/app.json
{
  "expo": {
    "extra": {
      "revenueCatAndroidApiKey": "your-sandbox-key"
    }
  }
}
```

**Step 2: Build & Install on Android Device**
```bash
cd mobile
npm run android
# Opens Android emulator or connected device
```

**Step 3: Trigger Purchase**
1. Run backend locally:
   ```bash
   cd backend
   npm run dev
   ```
2. In app:
   - Register/login (new test account)
   - Tap "Scan Menu" → "Profile"
   - Tap "Upgrade to Pro"
3. Google Play Sandbox shows fake purchase sheet
   - Payment auto-approves instantly (no real charge)
   - Receipt issued immediately

**Step 4: Verify Webhook**
1. Check backend logs:
   ```bash
   # Look for:
   # [Billing] Webhook received: type=INITIAL_PURCHASE
   # [Billing] Updated user subscription_tier to 'pro'
   ```
2. Check database:
   ```sql
   SELECT email, subscription_tier, subscription_expires_at 
   FROM "User" 
   WHERE email = 'your-test-email@example.com';
   ```
3. Check mobile: refresh profile → should show "Pro Member"

### Test Renewal (Manual)

Since Play Store doesn't actually renew in sandbox, you can manually trigger:

**Option 1: Via RevenueCat Dashboard**
1. Go to **Customers** → find test user
2. Scroll to **Subscription History**
3. Click **Trigger Renewal** (test users only)
4. Watch webhook fire in backend logs

**Option 2: Simulate Webhook Locally**
```bash
# Use curl to POST a webhook to your local backend
curl -X POST http://localhost:3000/api/billing/revenuecat/webhook \
  -H "Authorization: Bearer your-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "RENEWAL",
      "app_user_id": "<test-user-id>",
      "entitlement_ids": ["pro"],
      "expiration_at_ms": 1741046400000,
      "store": "google_play"
    }
  }'
```

### Test Error Paths

**Test Invalid Webhook Secret**
```bash
curl -X POST http://localhost:3000/api/billing/revenuecat/webhook \
  -H "Authorization: Bearer wrong-secret" \
  -d '{"event":{"type":"INITIAL_PURCHASE","app_user_id":"test"}}'
# Should get 401 response
```

**Test Missing User**
```bash
curl -X POST http://localhost:3000/api/billing/revenuecat/webhook \
  -H "Authorization: Bearer your-secret" \
  -d '{"event":{"type":"INITIAL_PURCHASE","app_user_id":"nonexistent-user-id"}}'
# Should get 200 (ignored, no user to update)
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|---|---|---|
| User upgraded but still shows "Free" in app | Webhook received but app was open; UI not refreshed | User should close and reopen app, or tap Profile again |
| "Restore Purchases" doesn't work | RevenueCat SDK not initialized | Make sure `configureRevenueCat(userId)` called after login |
| Webhook returns 401 | Webhook secret mismatch | Check `REVENUECAT_WEBHOOK_SECRET` in backend .env matches RevenueCat config |
| Webhook returns 500 | Database field missing or Prisma error | Run `npm run prisma:migrate`. Check migration was applied. |
| User can't upgrade; purchase sheet doesn't open | RevenueCat SDK not configured or no offerings | Check `revenueCatAndroidApiKey` in app.json. Check Offering exists in RevenueCat. |
| No scans after upgrade | `scans_remaining` not set by webhook | Check backend webhook handler sets `scans_remaining: 35`. Check logs. |
| Subscription expires but user still sees "Pro" | Grace period or app cache | User should close/reopen app. Grace period lasts ~3-5 days during which user stays "Pro" |

## Production Checklist Before Launch

- [ ] Switch from Sandbox to Production API key in app.json
- [ ] Verify `REVENUECAT_WEBHOOK_SECRET` is strong (e.g., generated with `openssl rand -hex 32`)
- [ ] Test webhook URL is publicly accessible (not localhost)
- [ ] Test complete purchase flow with real payment method (can refund within 1 hour)
- [ ] Verify backend logs show webhook received
- [ ] Verify user shows "Pro" badge after purchase
- [ ] Test "Manage / Cancel Subscription" links to actual Play Store settings
- [ ] Verify "Restore Purchases" works if purchase was missed
- [ ] Load test: webhook endpoint can handle ~100 req/min (normal peak)
- [ ] Monitor webhook logs for 401/5xx errors in first 24 hours

## Cost Monitoring

**RevenueCat Free Tier**
- ~$10,000 MRR tracked revenue
- Above that: ~2% fee on revenue

**Google Play Revenue**
- Google takes 30%, you get 70%
- E.g., $4.99/mo × 100 users × 12 months = $5,988 revenue → you net ~$4,191

**Monitor in RevenueCat Dashboard**
- Go to **Analytics** → **Revenue**
- See MRR, churn, lifetime value
- Alerts if exceeding free tier threshold

---

See [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md) for initial setup.
See [REVENUECAT_ARCHITECTURE.md](REVENUECAT_ARCHITECTURE.md) for how it works.
