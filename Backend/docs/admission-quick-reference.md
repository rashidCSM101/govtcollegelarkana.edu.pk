# Admission Module - Quick Reference

## 🚀 Quick Start

### Application Submission
```bash
POST /api/admission/apply
```
```json
{
  "full_name": "Ahmed Ali",
  "father_name": "Ali Khan",
  "date_of_birth": "2005-01-15",
  "gender": "male",
  "phone": "03001234567",
  "email": "ahmed@example.com",
  "previous_qualification": "Intermediate",
  "obtained_marks": 950,
  "total_marks": 1100,
  "program_id": 1
}
```

### Track Application
```bash
GET /api/admission/status/ADM-2024-123456
```

### View Merit List
```bash
GET /api/admission/merit-list?program_id=1
```

---

## 📋 All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admission/apply` | No | Submit application |
| GET | `/api/admission/status/:applicationNo` | No | Track status |
| GET | `/api/admission/merit-list` | No | View merit list |
| GET | `/api/admission/letter/:applicationNo` | No | Download letter PDF |
| GET | `/api/admission/applications` | Admin | List applications |
| POST | `/api/admission/applications/:id/review` | Admin | Review application |
| POST | `/api/admission/merit-list/generate` | Admin | Generate merit list |
| POST | `/api/admission/applications/:id/approve` | Admin | Approve admission |
| GET | `/api/admission/statistics` | Admin | View statistics |

---

## 🔄 Status Flow

```
submitted → under_review → approved → merit_list_published → admitted
                    ↓
                rejected
```

---

## 🎯 Common Use Cases

### 1. Student Applies
```bash
curl -X POST http://localhost:3000/api/admission/apply \
-H "Content-Type: application/json" \
-d '{
  "full_name": "Ahmed Ali",
  "father_name": "Ali Khan",
  "date_of_birth": "2005-01-15",
  "gender": "male",
  "phone": "03001234567",
  "email": "ahmed@example.com",
  "previous_qualification": "Intermediate",
  "obtained_marks": 950,
  "total_marks": 1100,
  "program_id": 1
}'
```

### 2. Admin Reviews
```bash
curl -X POST http://localhost:3000/api/admission/applications/1/review \
-H "Authorization: Bearer <admin_token>" \
-H "Content-Type: application/json" \
-d '{
  "status": "approved",
  "remarks": "All documents verified"
}'
```

### 3. Generate Merit List
```bash
curl -X POST http://localhost:3000/api/admission/merit-list/generate \
-H "Authorization: Bearer <admin_token>" \
-H "Content-Type: application/json" \
-d '{
  "program_id": 1,
  "available_seats": 50,
  "cutoff_percentage": 60
}'
```

### 4. Approve Admission
```bash
curl -X POST http://localhost:3000/api/admission/applications/1/approve \
-H "Authorization: Bearer <admin_token>" \
-H "Content-Type: application/json" \
-d '{
  "admission_fee_amount": 5000,
  "admission_date": "2024-02-01"
}'
```

---

## 📊 Query Filters

### List Applications
```
GET /api/admission/applications?status=submitted&program_id=1&page=1&limit=20
```

### View Statistics
```
GET /api/admission/statistics?program_id=1&session_year=2024
```

---

## 🧮 Merit Formula

```javascript
merit_score = percentage * 0.6
```

Can be customized in `admission.service.js` → `submitApplication()` method

---

## 🎓 Roll Number Format

```
YEAR-DEPT_CODE-SERIAL
Example: 2024-CS-001
```

Generated automatically on admission approval.

---

## 📄 Required Application Fields

**Minimum Required:**
- full_name
- father_name
- date_of_birth
- gender
- phone
- email
- previous_qualification
- obtained_marks
- total_marks
- program_id

**Optional:**
- All document paths
- mother_name
- address details
- previous institution details

---

## 🔐 Authentication

### Public Endpoints (No Auth)
- `/apply`
- `/status/:applicationNo`
- `/merit-list`
- `/letter/:applicationNo`

### Admin Endpoints (JWT Required)
```javascript
headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## ⚠️ Error Handling

| Code | Message | Solution |
|------|---------|----------|
| 400 | Required fields missing | Check all required fields |
| 404 | Application not found | Verify application number |
| 401 | Unauthorized | Add JWT token |
| 403 | Forbidden | Check admin role |
| 500 | Server error | Check logs |

---

## 📁 File Structure

```
admission/
├── admission.service.js      # Business logic
├── admission.controller.js   # HTTP handlers
└── admission.routes.js       # Route definitions
```

---

## 💾 Database

**Table:** `admission_applications`
**Indexes:** 
- application_no (unique)
- status
- program_id
- merit_score (DESC)

---

## 🧪 Quick Tests

### Test Application Submission
```bash
curl -X POST http://localhost:3000/api/admission/apply \
-H "Content-Type: application/json" \
-d @test-application.json
```

### Test Status Tracking
```bash
curl http://localhost:3000/api/admission/status/ADM-2024-123456
```

### Test Merit List
```bash
curl http://localhost:3000/api/admission/merit-list
```

---

## 🔧 Configuration

### Merit Calculation
Edit `admission.service.js` line ~100:
```javascript
const merit_score = parseFloat(calculatedPercentage) * 0.6;
```

### Roll Number Format
Edit `admission.service.js` line ~570:
```javascript
const roll_no = `${year}-${deptCode}-${String(serial).padStart(3, '0')}`;
```

### Default Password
Edit `admission.service.js` line ~579:
```javascript
VALUES ($1, $2, 'student', true, false)
', [app.email, '$2b$10$defaultpassword']);
```

---

## 📚 Related Modules

- **Departments:** Program selection
- **Students:** Final record creation
- **Users:** Account creation
- **Fee:** Admission fee (future)

---

## 🎯 Workflow Summary

1. **Submit** → Application created (status: submitted)
2. **Review** → Admin verifies (status: approved/rejected)
3. **Merit** → List generated (status: merit_list_published)
4. **Approve** → Student created (status: admitted)
5. **Download** → Admission letter PDF

---

## 🚨 Important Notes

1. **Application Number** is auto-generated (ADM-YEAR-RANDOM)
2. **Merit Score** is calculated automatically
3. **Roll Number** is generated on admission approval
4. **Default Password** is `Student@123`
5. **Documents** are path references (upload separately)

---

## 📞 Quick Help

**Check Application Status:**
```javascript
const response = await fetch(
  `http://localhost:3000/api/admission/status/${applicationNo}`
);
const data = await response.json();
console.log(data.application.status);
```

**Get Merit Position:**
```javascript
const response = await fetch(
  'http://localhost:3000/api/admission/merit-list'
);
const data = await response.json();
// Find your application in data.merit_lists
```

**Admin Login First:**
```javascript
const loginResponse = await fetch(
  'http://localhost:3000/api/auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@govtcollegelarkana.edu.pk',
      password: 'Admin@123'
    })
  }
);
const { token } = await loginResponse.json();
// Use token in Authorization header
```

---

## 📖 Full Documentation

See `admission-api.md` for complete API documentation.

---

**Quick Reference Version:** 1.0
**Last Updated:** January 2024
