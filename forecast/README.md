# Forecast Service Setup

This Python service uses Facebook Prophet for time series forecasting.

## Installation

1. Install Python dependencies:
```bash
cd forecast-service
pip install -r requirements.txt
```

Note: Prophet requires additional system dependencies on some platforms. If you encounter issues:

**macOS:**
```bash
brew install pkg-config
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install pkg-config
```

## Running the Service

```bash
python app.py
```

The service will start on `http://localhost:4000`

## Environment Variables

Add to your `.env` file in the Pixro root directory:

```env
FORECAST_SERVICE_URL=http://localhost:4000

# Twilio Configuration (Required for WhatsApp sending)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Getting Twilio Credentials

1. Sign up for a [Twilio account](https://www.twilio.com/try-twilio)
2. Get your Account SID and Auth Token from the [Twilio Console](https://console.twilio.com/)
3. For WhatsApp, you need to:
   - Use Twilio's Sandbox (for testing): Join the sandbox by sending a message to the number provided in your Twilio Console
   - Or get a WhatsApp Business API number (for production)
4. Set `TWILIO_WHATSAPP_FROM` to your Twilio WhatsApp number in format: `whatsapp:+14155238886`

## API Endpoints

### Health Check
```
GET /health
```

### Forecast
```
POST /forecast
Content-Type: application/json

{
  "monthlyData": [
    { "month": "2024-01", "revenue": 10000, "aov": 50, "orders": 200 },
    ...
  ],
  "periods": 6,
  "type": "revenue"  // or "aov" or "orders"
}
```

### WhatsApp Send
```
POST /whatsapp/send
Content-Type: application/json

{
  "recipients": [
    {
      "phone": "+1234567890",
      "message": "Hello! This is a test message.",
      "customerName": "John Doe"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 1,
  "sent": 1,
  "failed": 0,
  "results": [
    {
      "phone": "+1234567890",
      "formattedPhone": "+12345678900",
      "customerName": "John Doe",
      "success": true,
      "messageId": "SM1234567890abcdef",
      "status": "queued"
    }
  ]
}
```

**Note:** Phone numbers are automatically formatted to E.164 format. The service accepts various formats (with/without country code, with/without dashes/spaces) and converts them automatically.

## Deployment

### ⚠️ Vercel Deployment Issue

Vercel has a **250MB unzipped size limit** for serverless functions. The Prophet library and its dependencies often exceed this limit.

**Optimizations applied:**
- Updated `.vercelignore` to exclude unnecessary files
- Pinned dependency versions
- Removed duplicate dependencies

**If you still get the 250MB error**, see [DEPLOYMENT.md](./DEPLOYMENT.md) for alternative deployment options.

### Recommended: Railway Deployment

Railway is the best option for ML services with large dependencies:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
cd forecast-service
railway login
railway init
railway up
```

Set environment variables in Railway dashboard:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

### Docker Deployment

```bash
docker build -t forecast-service .
docker run -p 4000:4000 forecast-service
```

For more deployment options (Render, Fly.io, etc.), see [DEPLOYMENT.md](./DEPLOYMENT.md).

