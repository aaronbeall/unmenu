# Deployment Guide

## Backend Deployment

### Prerequisites

- PostgreSQL database (e.g., AWS RDS, Heroku Postgres, Supabase)
- Redis instance (e.g., Redis Cloud, AWS ElastiCache)
- OpenAI API key

### Recommended Platforms

#### Option 1: Railway

1. Create new project on Railway
2. Add PostgreSQL and Redis services
3. Deploy backend:
   ```bash
   cd backend
   railway up
   ```
4. Set environment variables in Railway dashboard

#### Option 2: Heroku

1. Create new Heroku app
2. Add PostgreSQL and Redis add-ons
3. Deploy:
   ```bash
   cd backend
   git init
   heroku git:remote -a your-app-name
   git push heroku main
   ```

#### Option 3: AWS (Production)

- **EC2/ECS** for API servers
- **RDS** for PostgreSQL
- **ElastiCache** for Redis
- **S3** for image storage
- **CloudFront** for CDN
- **Load Balancer** for scaling

### Environment Setup

Set all variables from `.env.example`:

- Database credentials
- Redis URL
- OpenAI API key
- JWT secret

### Database Migration

```bash
npm run prisma:migrate
```

## Mobile App Deployment

### Prerequisites

- Apple Developer Account ($99/year) for iOS
- Google Play Developer Account ($25 one-time) for Android
- EAS (Expo Application Services) account

### Build Configuration

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

2. Configure EAS:

```bash
cd mobile
eas build:configure
```

3. Update `app.json` with your bundle identifiers

### iOS Deployment

1. Build for iOS:

```bash
eas build --platform ios
```

2. Submit to App Store:

```bash
eas submit --platform ios
```

3. Configure App Store listing:

- Screenshots
- Description
- Keywords
- Privacy policy
- Age rating

### Android Deployment

1. Build for Android:

```bash
eas build --platform android
```

2. Submit to Google Play:

```bash
eas submit --platform android
```

3. Configure Play Store listing:

- Screenshots
- Description
- Category
- Content rating
- Privacy policy

## Production Checklist

### Backend

- [ ] Set NODE_ENV=production
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS only
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Configure rate limiting
- [ ] Set up logging
- [ ] Enable CORS for mobile app domain
- [ ] Set up backup strategy for database
- [ ] Configure auto-scaling

### Mobile

- [ ] Update API_URL to production backend
- [ ] Test on real devices
- [ ] Configure app icons
- [ ] Set up crash reporting
- [ ] Add analytics (optional)
- [ ] Test payment integration
- [ ] Prepare App Store screenshots
- [ ] Write privacy policy
- [ ] Write terms of service

### Legal & Compliance

- [ ] Privacy policy (GDPR, CCPA compliant)
- [ ] Terms of service
- [ ] Allergen disclaimer (prominent)
- [ ] Data retention policy
- [ ] Cookie policy (if web version)

## Monitoring & Maintenance

### Recommended Tools

- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Mixpanel/Amplitude** - Analytics
- **StatusPage** - Status monitoring
- **PagerDuty** - Alerting

### Key Metrics to Monitor

- API response times
- Error rates
- Scan success rate
- User retention
- Subscription conversion
- OpenAI API costs
- S3 storage costs

## Scaling Considerations

### Backend

- Implement worker queues (Bull/BullMQ)
- Add Redis caching layer
- Use CDN for static assets
- Database read replicas
- Horizontal scaling with load balancer

### Cost Optimization

- Cache popular menus (30-day TTL)
- Implement image deduplication
- Use OCR before full AI processing
- Set OpenAI token limits
- Compress images before upload
- Clean up old scans periodically

## Security

### Best Practices

- Use HTTPS everywhere
- Implement rate limiting
- Validate all inputs
- Sanitize user data
- Use prepared statements (Prisma handles this)
- Rotate secrets regularly
- Enable 2FA for admin accounts
- Regular security audits
- Keep dependencies updated

## Support & Updates

### OTA Updates (Mobile)

Use Expo Updates for instant fixes:

```bash
eas update --branch production
```

### Backend Updates

- Use blue-green deployment
- Run migrations before deployment
- Test in staging environment
- Have rollback plan ready
