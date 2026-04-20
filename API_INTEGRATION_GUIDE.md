# Backend & Frontend Integration Guide

## Overview

This document describes the complete backend setup with MongoDB, automatic sensor data updates (every 5 seconds), photo upload functionality, and task approval workflow.

## Backend Setup

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/hygia-sense
CORS_ORIGIN=http://localhost:5173
```

### 2. MongoDB Setup

Ensure MongoDB is running on your system:

```powershell
# Windows - if installed locally
mongod
```

### 3. Install Dependencies

```powershell
cd backend
npm install
```

### 4. Start Backend Server

```powershell
npm run dev
```

The backend will:

- ✅ Connect to MongoDB
- ✅ Automatically update sensor data every 5 seconds with custom data
- ✅ Serve uploaded files from `/uploads` directory
- ✅ Enable CORS for frontend communication

## Frontend Setup

### 1. Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Install Dependencies

```powershell
cd frontend
npm install
# or using bun
bun install
```

### 3. Start Frontend Development Server

```powershell
npm run dev
# or
bun run dev
```

The frontend will start on `http://localhost:5173`

## API Endpoints

### Sensor Data

| Method | Endpoint                                  | Description                                |
| ------ | ----------------------------------------- | ------------------------------------------ |
| GET    | `/api/sensor`                             | Get all latest sensor data for all toilets |
| GET    | `/api/sensor/:toiletId/latest`            | Get latest sensor reading for a toilet     |
| GET    | `/api/sensor/:toiletId/history?limit=100` | Get sensor data history                    |
| PUT    | `/api/sensor/:toiletId`                   | Manual sensor data update (testing)        |

### Task Management

| Method | Endpoint                                   | Description                         |
| ------ | ------------------------------------------ | ----------------------------------- |
| GET    | `/api/admin-tasks`                         | Get all tasks                       |
| GET    | `/api/admin-tasks/pending-approval`        | Get tasks pending approval          |
| GET    | `/api/admin-tasks/:taskId`                 | Get single task details             |
| POST   | `/api/admin-tasks/assign`                  | Assign a task to cleaner            |
| POST   | `/api/admin-tasks/:taskId/photos`          | Upload photos (multipart/form-data) |
| PUT    | `/api/admin-tasks/:taskId/approve`         | Approve task                        |
| PUT    | `/api/admin-tasks/:taskId/reject`          | Reject task                         |
| DELETE | `/api/admin-tasks/:taskId/photos/:photoId` | Delete photo                        |

### Toilets

| Method | Endpoint        | Description        |
| ------ | --------------- | ------------------ |
| GET    | `/api/toilets`  | Get all toilets    |
| POST   | `/api/toilets`  | Create new toilet  |
| GET    | `/api/cleaners` | Get all cleaners   |
| POST   | `/api/cleaners` | Create new cleaner |

## Sensor Data Auto-Update

The backend automatically updates sensor data **every 5 seconds** using a custom dataset:

```javascript
// Custom dataset cycle (repeats)
[
  { aqi: 45, humidity: 65, temperature: 22, ... },  // Cycle 1
  { aqi: 78, humidity: 72, temperature: 23, ... },  // Cycle 2
  { aqi: 120, humidity: 80, temperature: 24, ... }, // Cycle 3
  { aqi: 180, humidity: 85, temperature: 25, ... }, // Cycle 4
  { aqi: 95, humidity: 70, temperature: 22, ... },  // Cycle 5
]
```

Each reading is slightly randomized for realistic simulation. Data is stored in MongoDB and includes:

- Air Quality Index (AQI)
- Humidity
- Temperature
- Water Level
- Water Quality
- Occupancy Status
- PIR Motion Detection
- Cleanliness Status

## Photo Upload Workflow

1. **Upload Photos**

   ```javascript
   const formData = new FormData();
   formData.append("photos", file1);
   formData.append("photos", file2);

   await fetch("/api/admin-tasks/:taskId/photos", {
     method: "POST",
     body: formData,
   });
   ```

2. **Photos stored in**: `/backend/uploads/`

3. **Access photos**: `http://localhost:5000/uploads/filename`

4. **Max file size**: 5MB per file

5. **Allowed formats**: JPEG, PNG, WebP

## Task Approval Workflow

### States

- `assigned` - Task assigned to cleaner
- `in-progress` - Cleaner is working on task
- `pending-approval` - Photos uploaded, waiting for approval
- `completed` - Task approved by admin
- `rejected` - Task rejected, needs redo

### Approval Statuses

- `pending` - Waiting for admin review
- `approved` - Admin approved
- `rejected` - Admin rejected

## Frontend API Services

The frontend uses service modules for API communication:

### Services Available

**sensorService.ts**

```javascript
import {
  getAllSensorData,
  getSensorDataByToilet,
  getSensorDataHistory,
  setupSensorPolling,
} from "@/services/sensorService";
```

**taskService.ts**

```javascript
import {
  getAllTasks,
  getPendingTasks,
  getTaskById,
  assignTask,
  uploadPhotos,
  approveTask,
  rejectTask,
  deletePhoto,
  setupTaskPolling,
} from "@/services/taskService";
```

**toiletService.ts**

```javascript
import { getAllToilets, getAllCleaners } from "@/services/toiletService";
```

## UI Components Updated

### TaskAssignment.tsx

- Connected to `/api/admin-tasks/pending-approval`
- Real-time photo display from uploads
- Live approval/rejection with API calls
- Auto-polling every 10 seconds

### LiveSensors.tsx

- Connected to `/api/sensor` endpoints
- Real-time sensor updates (5-second intervals)
- Toilet selection with dynamic data
- Color-coded status indicators

## Testing the Integration

### 1. Create Test Data (MongoDB)

```powershell
# Use MongoDB client to insert test data
db.toilets.insertMany([
  { name: "Washroom A", aqi: 50, occupancy: false, cleanlinessStatus: "green" },
  { name: "Washroom B", aqi: 75, occupancy: true, cleanlinessStatus: "orange" },
  { name: "Washroom C", aqi: 150, occupancy: false, cleanlinessStatus: "red" }
])

db.cleaners.insertMany([
  { name: "Rajesh Kumar", status: "available", assignedTasks: 0, completedTasks: 15 },
  { name: "Priya Sharma", status: "busy", assignedTasks: 2, completedTasks: 28 }
])
```

### 2. Test API Endpoints

```powershell
# PowerShell
$headers = @{ "Content-Type" = "application/json" }

# Get sensor data
Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Headers $headers

# Get pending tasks
Invoke-RestMethod -Uri "http://localhost:5000/api/admin-tasks/pending-approval" -Headers $headers

# Get all toilets
Invoke-RestMethod -Uri "http://localhost:5000/api/toilets" -Headers $headers
```

### 3. Test on Frontend

1. Navigate to http://localhost:5173
2. Go to Dashboard > Sensors - Should show live sensor data
3. Go to Dashboard > Task Review - Should show pending tasks
4. Select a "View" option to see photo gallery
5. Click approve/reject to test workflow

## Troubleshooting

### Sensor Data Not Updating

- Check MongoDB connection in backend logs
- Verify MONGO_URI in .env is correct
- Restart backend server

### Photos Not Uploading

- Check `/backend/uploads/` directory exists
- Verify file size < 5MB
- Check frontend console for errors
- Verify CORS is enabled in app.js

### Frontend Can't Connect to Backend

- Ensure backend running on port 5000
- Check VITE_API_URL in frontend .env
- Verify CORS origin matches request origin
- Check browser console for CORS errors

### Task Data Not Showing

- Verify tasks exist in MongoDB
- Check `approvalStatus` field is set
- Restart both frontend and backend

## File Structure

```
backend/
├── server/
│   ├── middleware/
│   │   └── uploadMiddleware.js      (Multer config)
│   ├── models/
│   │   ├── CleaningTask.js          (Updated with photos)
│   │   ├── SensorData.js            (New model)
│   │   ├── Toilet.js
│   │   ├── Cleaner.js
│   │   └── ...
│   ├── controllers/
│   │   ├── adminTaskController.js   (Updated)
│   │   ├── sensorController.js      (Updated)
│   │   └── ...
│   ├── routes/
│   │   ├── adminTaskRoutes.js       (Updated)
│   │   ├── sensorRoutes.js          (Updated)
│   │   └── ...
│   ├── app.js                       (Updated with CORS & uploads)
│   └── server.js                    (Updated with auto-updates)
├── uploads/                         (Photo storage)
├── .env
├── package.json
└── ...

frontend/
├── src/
│   ├── services/
│   │   ├── sensorService.ts         (New)
│   │   ├── taskService.ts           (New)
│   │   └── toiletService.ts         (New)
│   ├── lib/
│   │   └── api.ts                   (Updated)
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── TaskAssignment.tsx   (Updated)
│   │   │   └── LiveSensors.tsx      (Updated)
│   │   └── ...
│   └── ...
├── .env
└── ...
```

## Next Steps

1. **Customize Sensor Data**: Edit the dataset in [server.js](../backend/server/server.js#L7-L15)
2. **Add Authentication**: Implement JWT tokens for API calls
3. **Database Backups**: Setup MongoDB backup strategy
4. **Performance Monitoring**: Add logging and monitoring
5. **Image Optimization**: Resize uploads before storage
6. **Real Hardware Integration**: Connect actual sensor devices

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review backend console for error messages
3. Check frontend browser console
4. Verify all services are running (MongoDB, Backend, Frontend)
5. Ensure ports 5000 and 5173 are not in use
