# Hygia Sense

Smart Washroom Monitoring and Cleaning Operations Platform

Hygia Sense is a full-stack system for monitoring public washrooms, assigning cleaning work, validating task execution on-site, and auditing cleaning quality with AI-assisted scoring.

It combines:

- Real-time sensor simulation and monitoring
- Cleaner workflow with QR-first task start
- Before/after photo evidence and AI comparison
- Admin approval and exception handling
- Risk-based AI recommendations and auto-assignment
- Alerting over SMS/WhatsApp with fallback and event logs
- Reporting exports (CSV/PDF)

## 1) Why This Project Exists

Public washroom operations usually fail for three reasons:

- No real-time visibility into hygiene status
- No proof that cleaning happened at the right location and time
- No structured way to prioritize high-risk units

Hygia Sense addresses these by creating a digital workflow from detection to assignment to evidence-backed closure.

## 2) Core Features (Complete)

### A. Admin Features

1. Live dashboard with AI risk overview

- Risk score per washroom (0-100)
- Priority classification (low, medium, high, critical)
- Suggested actions from AI rules
- Predicted next cleaning time

2. Task review and approval console

- View all cleaning submissions with photos and review history
- Approve/reject tasks manually
- See SLA countdown and QR verification state
- Auto-assign high-risk tasks with one click

3. Cleaner lifecycle management

- Cleaner signup request approval/rejection
- Roster control (activate/deactivate, shift update)
- Approval history and shift history tracking

4. Alert operations center

- Configure admin recipients
- Toggle cleaner alert delivery
- Choose delivery mode: SMS, WhatsApp, or auto
- Track alert event status: sent, failed, suppressed

5. Reports and exports

- Task reports (CSV/PDF)
- Toilet health reports (CSV/PDF)
- Cleaner-specific reports (CSV/PDF)
- Monthly trend charting

### B. Cleaner Features

1. Cleaner authentication flow

- Signup request
- Admin approval gate before full usage
- Cleaner login after approval

2. Shift lifecycle and controls

- Start/stop shift from cleaner dashboard
- Enforced rest gap and shift constraints
- Automatic reassignment protection for unfinished tasks

3. QR-first task start (mandatory)

- Cleaner must scan matching toilet QR before task can begin
- Captures startedAt timestamp
- Captures geo coordinates if device permission is granted

4. Evidence-first task completion

- Upload before and after photos
- AI-assisted improvement scoring
- Time + photo + verification based final efficiency
- Auto-approved if efficiency exceeds threshold, else sent for manual review

5. Issue reporting

- Text or voice issue reporting
- Severity tagging (low, medium, high)
- Stored in task issue history for admin review

### C. Public and Display Features

1. TV display mode

- Live washroom status feed
- Visual highlights for high-risk or dirty conditions
- Periodic refresh for public guidance

2. QR-based user feedback

- Feedback endpoints for toilet-specific ratings
- Feedback affects AI risk and recommendation logic

## 3) AI and Algorithms Used

This section answers exactly which AI/algo is used and how.

### 3.1 Before vs After Toilet Photo Comparison

Primary AI path:

- OpenAI vision through Responses API
- Default model: gpt-4o-mini (configurable)
- Prompt asks model to compare before and after images and return JSON:
  - beforeScore
  - afterScore
  - improvementScore
  - cleanlinessDelta
  - shortReason

Fallback chain:

1. OpenAI vision model (if OPENAI_API_KEY is configured)
2. Generic custom endpoint (if PHOTO_AI_ENDPOINT is configured)
3. Local heuristic fallback (if no AI endpoint is available)

Heuristic fallback behavior:

- Uses relative file-size delta between before and after photos
- Applies bounded bonus/penalty and clamp limits
- Produces a safe improvement score even without external AI

Why this design:

- Keeps the workflow resilient when cloud AI is unavailable
- Prevents complete pipeline failure
- Guarantees deterministic score output for every submission

### 3.2 Task Completion Scoring Algorithm

Final efficiency score is computed as:

finalEfficiency = clamp(0.45 _ timeEfficiency + 0.45 _ photoImprovementScore + verificationBonus, 0, 100)

where:

- timeEfficiency = targetMinutes / actualElapsedMinutes scaled to 0-100
- photoImprovementScore = AI/endpoint/heuristic improvement score (0-100)
- verificationBonus = 10 if QR verification exists

Auto-approval rule:

- If finalEfficiency > 85, task is auto-approved
- Otherwise it moves to pending manual admin review

Why this weighting:

- Time alone can be gamed
- Photos alone can be misleading
- QR presence alone is insufficient
- A weighted blend gives better operational trust

### 3.3 AI Risk Scoring for Washrooms

Risk score is generated from:

- AQI trend
- Humidity trend
- Usage intensity
- Low-rating feedback ratio
- Water quality and water level risk
- Occupancy pressure
- Existing pending task pressure
- Recency weighting of latest sensor timestamp

Output:

- riskScore (0-100)
- priority bucket
- SLA suggestion
- next cleaning time estimate
- actionable recommendations

Why this algorithm:

- Combines environment + behavior + user sentiment
- Prioritizes active risk, not static checklist status

### 3.4 AI Cleaner Recommendation and Auto-Assignment

Cleaner ranking score uses:

- Availability bonus
- Active task penalty
- Completed task bonus
- Speed bonus from average completion time

Auto-assignment fairness rule:

- Uses least-loaded cleaner baseline
- Keeps AI-recommended cleaner if workload difference is small
- Otherwise prioritizes load balance

Why this algorithm:

- Balances quality and fairness
- Avoids overloading high-performing cleaners
- Prevents starvation of other available cleaners

## 4) Edge Cases and Operational Safeguards

### QR, Location, and Time Validation

1. Wrong QR scan blocked

- Task start is rejected if scanned code does not match toilet

2. Mandatory scan before completion

- Task cannot be completed unless started via QR verification

3. Start timestamp captured

- startedAt is recorded only after successful QR start

4. Location captured with tolerance

- Latitude/longitude/accuracy are stored when valid geolocation data exists
- Invalid numeric data is normalized out safely

### Photo and Evidence Safety

1. At least two photos required in completion flow

- Prevents evidence-less closure

2. Upload constraints

- MIME allowed: JPEG, PNG, WebP
- Max file size: 5MB per image

3. Upload error handling

- Graceful message for size/type failures

### Task Integrity

1. One open task per toilet

- Prevents duplicate in-progress work for same unit

2. Off-shift gating

- Off-shift cleaner cannot receive/start new tasks

3. Approval safeguards

- Manual approval path available for low-confidence submissions

4. Review audit trail

- Task reviewHistory logs assign/start/complete/auto-approved/manual-review/reassign/issue events

### Shift and Workforce Edge Cases

1. Minimum rest rule

- Cleaner cannot start next shift before 6-hour cooldown from last shift end

2. One shift close action per day rule

- Prevents repeated status toggling abuse

3. Reassignment on shift end

- Active assigned/in-progress tasks are reassigned to available cleaners
- QR verification and start location are reset on reassigned task

4. No replacement cleaner guard

- Shift end is blocked if no eligible replacement exists for active tasks

### Alert Delivery Reliability

1. Multi-provider channel strategy

- Twilio SMS
- WhatsApp Cloud API
- Twilio WhatsApp
- Log fallback

2. Duplicate failure suppression

- Cooldown-based suppression avoids alert storms

3. Persistent alert events

- Every alert attempt is recorded with delivery metadata

## 5) System Workflow (End-to-End)

1. Sensors and feedback continuously update toilet condition signals
2. AI overview computes risk and recommendations
3. Admin or AI assigns task to suitable cleaner
4. Cleaner starts task by scanning toilet QR
5. Start timestamp and optional geolocation are captured
6. Cleaner uploads before/after images
7. AI compares images and returns improvement score
8. Final efficiency is calculated
9. If score > 85: auto-approved and toilet state resets
10. Else: pending admin review for approve/reject
11. Notifications and audit logs are generated throughout

## 6) Tech Stack and Why We Used It

### Frontend

- React + TypeScript: component-driven UI with type safety
- Vite: fast local dev and build pipeline
- Tailwind CSS + shadcn/ui + Radix: rapid, consistent UI development
- React Router: role-based route organization
- TanStack Query: polling and async state for live data
- Recharts: dashboard trend visualization
- html5-qrcode: camera-based QR scanning in cleaner workflow
- jsPDF + jspdf-autotable: operational export reports as PDF
- Zod + React Hook Form: input validation and form reliability

### Backend

- Node.js + Express: lightweight API service and middleware composition
- MongoDB + Mongoose: flexible schema for sensor/task/event documents
- Multer: secure image upload handling
- dotenv + CORS: environment management and browser integration
- Jest + Supertest: backend controller/API tests

### AI/Integration

- OpenAI Responses API for vision comparison
- Custom vision endpoint support as pluggable alternative
- Twilio + WhatsApp Cloud support for alert channels

## 7) Project Structure

- backend
  - server/controllers: business workflows (task, cleaner, admin, AI, feedback, sensors)
  - server/services: AI scoring, insights, notification delivery
  - server/models: MongoDB schemas
  - server/routes: REST endpoints
  - server/middleware: upload validation
  - tests: backend test coverage
- frontend
  - src/pages/dashboard: admin pages
  - src/pages/cleaner: cleaner pages
  - src/pages/TVDisplay.tsx: public screen mode
  - src/services: API wrappers and data contracts
  - src/components: reusable UI blocks

## 8) Setup and Run

### Prerequisites

- Node.js 16+
- MongoDB local or Atlas

### Backend

1. Install dependencies

```bash
cd backend
npm install
```

2. Create backend .env

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/hygia-sense
CORS_ORIGIN=http://localhost:5173

# Optional AI image comparison
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o-mini
PHOTO_AI_ENDPOINT=
PHOTO_AI_API_KEY=

# Optional notification providers
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
TWILIO_WHATSAPP_FROM=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_CLOUD_API_VERSION=v21.0

# Alert recipients
ADMIN_PHONE_NUMBERS=
ADMIN_WHATSAPP_NUMBERS=
ALERT_DELIVERY_MODE=auto
ALERT_FAILURE_COOLDOWN_MS=300000
```

3. Start backend

```bash
npm run dev
```

### Frontend

1. Install dependencies

```bash
cd frontend
npm install
```

2. Create frontend .env

```env
VITE_API_URL=http://localhost:5000/api
```

3. Start frontend

```bash
npm run dev
```

### Test backend

```bash
cd backend
npm test
```

## 9) Main API Modules

- /api/toilets
- /api/sensor
- /api/tasks
- /api/admin-tasks
- /api/ai
- /api/cleaners
- /api/feedback
- /api/admin
- /api/health

## 10) Unique Points of This Implementation

1. QR-first cleaning start with location capture support
2. Evidence-based closure with AI photo comparison
3. Blended efficiency scoring and automatic approvals
4. Risk-driven AI recommendations and auto-assignment
5. Shift-aware workforce protection and reassignment logic
6. Multi-channel alerting with failure suppression and event logging
7. Exportable operation-grade reports for compliance and audits

## 11) Contributors

- Ujjawal Verma
- Srashti Shukla

## 12) License

Educational and academic project use.
