# Leave Management Module - API Summary

## Overview
Complete leave management system with student/teacher leave applications, approval workflows, balance tracking, and calendar view.

## Total APIs: 12

---

## Student Leave APIs (3)

### 1. Apply for Leave
- **Endpoint**: `POST /api/student/leave/apply`
- **Auth**: Student only
- **Body**:
```json
{
  "leave_type": "Medical/Casual/Emergency/Other",
  "start_date": "2024-01-15",
  "end_date": "2024-01-17",
  "reason": "Medical treatment",
  "document_path": "/uploads/medical-cert.pdf"
}
```
- **Features**:
  - 30-day annual limit check
  - Date validation (start < end, not in past)
  - Leave balance verification
  - Support documents optional

### 2. Get Leave History
- **Endpoint**: `GET /api/student/leave/history`
- **Auth**: Student only
- **Query Params**: `?status=Pending&leave_type=Medical&page=1&limit=10`
- **Returns**: Paginated leave history with filters

### 3. Get Leave Balance
- **Endpoint**: `GET /api/student/leave/balance`
- **Auth**: Student only
- **Returns**:
```json
{
  "total_allowed": 30,
  "used": 5,
  "remaining": 25,
  "by_type": {
    "Medical": { "used": 3, "pending": 0 },
    "Casual": { "used": 2, "pending": 0 }
  }
}
```

---

## Teacher Approval APIs (3)

### 4. Get Pending Student Leaves
- **Endpoint**: `GET /api/teacher/leave/pending`
- **Auth**: Teacher only
- **Query Params**: `?page=1&limit=10`
- **Returns**: All pending leaves from teacher's department students

### 5. Approve Leave
- **Endpoint**: `POST /api/teacher/leave/approve/:id`
- **Auth**: Teacher only
- **Body**:
```json
{
  "remarks": "Approved for medical reasons"
}
```

### 6. Reject Leave
- **Endpoint**: `POST /api/teacher/leave/reject/:id`
- **Auth**: Teacher only
- **Body**:
```json
{
  "remarks": "Insufficient documentation provided"
}
```

---

## Teacher Leave APIs (3)

### 7. Apply for Leave (Teacher)
- **Endpoint**: `POST /api/teacher/leave/apply`
- **Auth**: Teacher only
- **Body**:
```json
{
  "leave_type": "Casual/Sick/Earned/Maternity",
  "start_date": "2024-01-15",
  "end_date": "2024-01-17",
  "reason": "Personal work",
  "document_path": "/uploads/document.pdf"
}
```
- **Leave Limits**:
  - Casual: 10 days/year
  - Sick: 15 days/year
  - Earned: 20 days/year
  - Maternity: 90 days/year

### 8. Get Teacher Leave History
- **Endpoint**: `GET /api/teacher/leave/history`
- **Auth**: Teacher only
- **Query Params**: `?status=Approved&leave_type=Casual&page=1&limit=10`

### 9. Get Teacher Leave Balance
- **Endpoint**: `GET /api/teacher/leave/balance`
- **Auth**: Teacher only
- **Returns**:
```json
{
  "Casual": { "allowed": 10, "used": 3, "remaining": 7 },
  "Sick": { "allowed": 15, "used": 5, "remaining": 10 },
  "Earned": { "allowed": 20, "used": 0, "remaining": 20 },
  "Maternity": { "allowed": 90, "used": 0, "remaining": 90 }
}
```

---

## Admin Leave APIs (4)

### 10. Get All Teacher Leaves
- **Endpoint**: `GET /api/admin/teacher-leaves`
- **Auth**: Admin only
- **Query Params**: `?status=Pending&leave_type=Sick&department_id=1&page=1&limit=20`
- **Returns**: All teacher leaves with filters

### 11. Approve Teacher Leave
- **Endpoint**: `POST /api/admin/teacher-leaves/:id/approve`
- **Auth**: Admin only
- **Body**:
```json
{
  "remarks": "Approved by Principal"
}
```

### 12. Reject Teacher Leave
- **Endpoint**: `POST /api/admin/teacher-leaves/:id/reject`
- **Auth**: Admin only
- **Body**:
```json
{
  "remarks": "Need to reschedule"
}
```

### 13. Get Leave Calendar
- **Endpoint**: `GET /api/admin/leave-calendar`
- **Auth**: Admin only
- **Query Params**: `?year=2024&month=1&type=teacher/student`
- **Returns**: Month view of all leaves for calendar display

---

## Business Rules

### Student Leave:
- Maximum 30 days per academic year
- Cannot exceed remaining balance
- Start date cannot be in the past
- End date must be after start date
- Requires department teacher/HOD approval
- Support documents optional

### Teacher Leave:
- Type-specific annual limits
- Admin approval required
- Balance tracked separately by type
- Cannot exceed type limit
- Start date cannot be in the past
- End date must be after start date

### Leave Status Flow:
1. **Pending** → Initial state after application
2. **Approved** → Approved by teacher (student) or admin (teacher)
3. **Rejected** → Rejected with remarks

---

## Database Tables

### leave_applications (Student Leaves)
- id, student_id, leave_type, start_date, end_date
- reason, document_path, status, approved_by, remarks
- created_at, updated_at

### teacher_leaves (Teacher Leaves)
- id, teacher_id, leave_type, start_date, end_date
- reason, document_path, status, approved_by, remarks
- created_at, updated_at

---

## Files Created
1. **leave.service.js** (~650 lines) - Business logic
2. **leave.controller.js** - HTTP request handlers
3. **Routes Updated**:
   - student.routes.js (3 endpoints)
   - teacher.routes.js (6 endpoints)
   - admin.routes.js (4 endpoints)

---

## Testing Checklist
- [ ] Student can apply for leave
- [ ] Student cannot exceed 30-day limit
- [ ] Student can view leave history
- [ ] Student can check leave balance
- [ ] Teacher can view pending leaves from their department
- [ ] Teacher can approve/reject student leaves
- [ ] Teacher can apply for their own leave
- [ ] Teacher leave respects type-specific limits
- [ ] Teacher can view their leave history
- [ ] Admin can view all teacher leaves
- [ ] Admin can approve/reject teacher leaves
- [ ] Calendar view shows all leaves correctly

---

## Module Status: ✅ COMPLETE
All 12 APIs implemented and routes registered.
