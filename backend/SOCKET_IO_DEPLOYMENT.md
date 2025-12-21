# Socket.io Server Deployment Guide

This guide explains how to deploy the standalone Socket.io server to Render.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│              (React + Socket.io Client)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐      ┌──────────────────────┐
│  REST API        │      │  Socket.io Server    │
│  (Vercel)        │      │  (Render)            │
│  - Auth          │      │  - Real-time chat    │
│  - CRUD ops      │      │  - Interviews        │
│  - Payments      │      │  - Notifications     │
└──────────────────┘      │  - WebRTC signaling  │
                          └──────────────────────┘
```

## Local Development

### Run REST API (Vercel-compatible)

```bash
npm run dev
```

Runs on `http://localhost:3000` (or configured PORT)

### Run Socket.io Server (Render-compatible)

```bash
npm run socket:dev
```

Runs on `http://localhost:3001` (or configured SOCKET_PORT)

### Run Both Locally

Open two terminals:

**Terminal 1:**

```bash
npm run dev
```

**Terminal 2:**

```bash
npm run socket:dev
```

## Deployment to Render

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** `jobportal-socket-io`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run socket:start`
   - **Plan:** Free (or paid for production)

### Step 3: Set Environment Variables

In Render dashboard, add these environment variables:

```
NODE_ENV=production
SOCKET_PORT=3001
SECRET_KEY=your-jwt-secret-key
FRONTEND_URL=https://your-frontend-url.vercel.app
REDIS_URL=redis://your-redis-url (optional, for scaling)
```

### Step 4: Deploy

- Render automatically deploys when you push to main branch
- Your Socket.io server will be available at: `https://jobportal-socket-io.onrender.com`

## Frontend Configuration

Update your frontend Socket.io client connection:

```javascript
// src/config/socket.js
import io from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";

export const socket = io(SOCKET_URL, {
  auth: {
    token: localStorage.getItem("token"),
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

Add to `.env`:

```
REACT_APP_SOCKET_URL=https://jobportal-socket-io.onrender.com
```

## Features Supported

### Interview Management

- Join/leave interview rooms
- Real-time user presence
- Interview state management

### Chat

- Send/receive messages in rooms
- Message history (in-memory, use DB for persistence)

### WebRTC Signaling

- Offer/Answer exchange
- ICE candidate handling
- Video/audio streaming coordination

### Notifications

- Real-time notifications
- User status updates

### Presence

- User online/offline status
- Activity tracking

## Monitoring

### Health Check

```bash
curl https://jobportal-socket-io.onrender.com/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-12-17T03:30:00.000Z",
  "environment": "production",
  "connectedClients": 42
}
```

### Logs

View logs in Render dashboard:

1. Go to your service
2. Click "Logs" tab
3. Monitor real-time activity

## Scaling with Redis

For production with multiple instances:

1. **Get Redis URL:**
   - Use Render Redis: https://render.com/docs/redis
   - Or external: Redis Cloud, AWS ElastiCache

2. **Add to Render environment:**

   ```
   REDIS_URL=redis://username:password@host:port
   ```

3. **Socket.io automatically uses Redis adapter** when `REDIS_URL` is set

## Troubleshooting

### Connection Issues

- Check CORS origins in `socketServer.js`
- Verify `FRONTEND_URL` matches your frontend domain
- Check firewall/network settings

### High Memory Usage

- Implement message persistence (use MongoDB)
- Clear old messages periodically
- Use Redis for distributed caching

### Slow Performance

- Enable Redis adapter for horizontal scaling
- Increase Render plan tier
- Optimize event handlers

## Cost Estimation

| Service            | Plan         | Cost         |
| ------------------ | ------------ | ------------ |
| Vercel (API)       | Free/Pro     | $0-20/mo     |
| Render (Socket.io) | Free/Starter | $0-7/mo      |
| Redis (optional)   | Free/Starter | $0-5/mo      |
| **Total**          |              | **$0-32/mo** |

## Next Steps

1. ✅ Deploy Socket.io to Render
2. ✅ Update frontend Socket.io URL
3. ✅ Test real-time features
4. ✅ Monitor performance
5. ✅ Scale with Redis if needed

## Support

For issues:

- Check Render logs
- Verify environment variables
- Test with Socket.io client tools
- Check browser console for connection errors
