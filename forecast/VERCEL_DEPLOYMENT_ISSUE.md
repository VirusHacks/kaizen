# Vercel Deployment Issue - Size Limit Exceeded

## Problem

Vercel has a **hard 250MB unzipped size limit** for serverless functions. The forecast service exceeds this limit because:

### Large Dependencies:
- **Prophet** (~150MB): Facebook's time series forecasting library
- **pandas** (~50MB): Data manipulation library
- **numpy** (~30MB): Numerical computing
- **scikit-learn** (~40MB): Machine learning utilities
- **scipy** (~80MB): Scientific computing (Prophet dependency)
- **Other dependencies**: ~20MB

**Total: ~370MB+ (exceeds 250MB limit)**

## Why Vercel Won't Work

1. **Hard Limit**: Vercel's 250MB limit is non-negotiable for serverless functions
2. **Prophet is Essential**: Prophet is core to the forecasting functionality and cannot be removed
3. **Dependencies are Required**: All ML libraries are necessary for the service to function

## ✅ Recommended Solution: Railway

Railway is the **best alternative** for this ML service:

### Why Railway?
- ✅ **No size limits** - Perfect for ML services
- ✅ **Built for Python** - Excellent Python/ML support
- ✅ **Easy deployment** - Simple CLI and dashboard
- ✅ **Free tier** - $5 credit monthly
- ✅ **Automatic HTTPS** - Production-ready
- ✅ **Environment variables** - Easy configuration

### Quick Deploy to Railway:

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Navigate to forecast-service
cd forecast-service

# 3. Login to Railway
railway login

# 4. Initialize project
railway init

# 5. Deploy
railway up
```

### Set Environment Variables in Railway Dashboard:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

### Update Your Main App:

After deployment, update your main app's `.env`:

```env
FORECAST_SERVICE_URL=https://your-service-name.railway.app
```

## Alternative Options

If Railway doesn't work for you, see [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Render
- Fly.io
- Docker deployments
- Other platforms

## Conclusion

**Vercel is not suitable for ML services with large dependencies like Prophet.**

**Railway is the recommended solution** - it's designed for exactly this use case and will deploy without issues.

