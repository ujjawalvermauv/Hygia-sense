# Quick Start Guide

## Prerequisites

- Node.js (v16+)
- MongoDB running locally or connection string
- bun or npm installed

## One-Click Setup

### 1. Backend Setup (3 minutes)

```powershell
cd backend
npm install
# Verify .env has MONGO_URI=mongodb://localhost:27017/hygia-sense
npm run dev
```

✅ Backend running on http://localhost:5000

### 2. Frontend Setup (2 minutes)

```powershell
cd frontend
npm install
# Verify .env has VITE_API_URL=http://localhost:5000/api
npm run dev
```

✅ Frontend running on http://localhost:5173

### 3. Open Browser

Visit: http://localhost:5173

## What's Working Now

✅ **Sensor Data** - Auto-updates every 5 seconds
✅ **Live Dashboard** - Shows real-time toilet status
✅ **Task Management** - See pending cleaning tasks
✅ **Photo Uploads** - Upload & review task photos
✅ **Task Approval** - Approve/Reject tasks with notes
✅ **MongoDB Integration** - Data persisted automatically

## Create Sample Data

### Option 1: Using Frontend

1. Go to Dashboard
2. You should see auto-generated sensor readings
3. Tasks will appear as they're created

### Option 2: Using MongoDB Compass

```javascript
// Toilets collection
db.toilets.insertOne({
  name: "Washroom A",
  aqi: 45,
  waterCondition: "good",
  occupancy: false,
  cleanlinessStatus: "green",
});

// Cleaners collection
db.cleaners.insertOne({
  name: "John Doe",
  status: "available",
  assignedTasks: 0,
  completedTasks: 0,
});
```

## Features

### 🚽 Smart Sensors

- Air Quality Index (AQI)
- Temperature & Humidity
- Water Quality Monitoring
- Occupancy Detection
- Motion Sensing

### 📸 Photo Management

- Upload multiple photos per task
- View gallery in approval dialog
- Delete individual photos
- Automatic file validation

### ✅ Task Workflow

- Assign cleaning tasks
- Upload completion photos
- Admin approval/rejection
- Automatic status tracking

### 📊 Live Dashboard

- Real-time sensor readings
- Switch between washrooms
- Color-coded status indicators
- Auto-updates every 5 seconds

## API Endpoints (Quick Reference)

```bash
# Sensors
GET /api/sensor                          # All latest sensor data
GET /api/sensor/:toiletId/latest         # Latest for one toilet
GET /api/sensor/:toiletId/history        # Historical data

# Tasks
GET /api/admin-tasks                     # All tasks
GET /api/admin-tasks/pending-approval    # Pending tasks
POST /api/admin-tasks/:taskId/photos     # Upload photos
PUT /api/admin-tasks/:taskId/approve     # Approve
PUT /api/admin-tasks/:taskId/reject      # Reject

# Resources
GET /api/toilets                         # All washrooms
GET /api/cleaners                        # All cleaners
```

## Troubleshooting

| Issue                 | Solution                                        |
| --------------------- | ----------------------------------------------- |
| Backend won't start   | Check MongoDB is running, verify MONGO_URI      |
| Frontend shows errors | Check VITE_API_URL in .env                      |
| No sensor data        | Restart backend, check MongoDB connection       |
| Photos not uploading  | Ensure /backend/uploads/ exists                 |
| CORS errors           | Verify backend CORS config matches frontend URL |

## Next Steps

1. **Create More Test Data**
   - Add 5-10 toilets
   - Add 5-10 cleaners
   - Manually create some tasks

2. **Test the Workflow**
   - Go to Live Sensors → See real-time data
   - Go to Task Review → Filter and approve/reject
   - Upload photos to test file handling

3. **Customize**
   - Edit sensor dataset in server.js
   - Modify task status workflow
   - Adjust polling intervals

4. **Deploy** (Later)
   - Setup MongoDB Atlas
   - Deploy backend to Heroku/Railway
   - Deploy frontend to Vercel/Netlify

## Logs to Watch

**Backend Logs**

```
✅ MongoDB connected
✅ Sensor data updated - Cycle 1
✅ Server running on port 5000
```

**Frontend Console** (F12)

```
No CORS errors
No 404 errors on API calls
Sensor data loading successfully
```

---

🎉 **All Set!** Your full-stack app is ready.

Need help? Check [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) for detailed docs.
