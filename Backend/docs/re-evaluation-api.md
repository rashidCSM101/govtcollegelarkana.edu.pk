# Re-Evaluation Request System API Documentation

## Overview
The Re-Evaluation Request System allows students to request re-evaluation of their exam papers. The system includes a complete workflow:
1. Student submits re-evaluation request with reason
2. Student pays re-evaluation fee
3. Admin reviews and approves/rejects the request
4. Admin assigns approved request to a teacher
5. Teacher reviews the paper and updates marks
6. System automatically recalculates results
7. Student is notified of the outcome

## Base URLs
- Student: `/api/student/re-evaluation`
- Teacher: `/api/teacher/re-evaluation`
- Admin: `/api/admin/re-evaluation`

---

## Student APIs

### 1. Submit Re-Evaluation Request
Submit a new re-evaluation request for an exam.

**Endpoint:** `POST /api/student/re-evaluation/request`

**Authentication:** Required (Student)

**Request Body:**
```json
{
  "exam_schedule_id": 1,
  "reason": "I believe my paper was not evaluated properly. My answer to question 5 was correct but marked wrong."
}
```

**Validation Rules:**
- `exam_schedule_id`: Required, must exist
- `reason`: Required, detailed explanation
- Student must have marks for the exam
- Request deadline: 30 days from exam date
- No duplicate active requests allowed

**Response (201):**
```json
{
  "message": "Re-evaluation request submitted successfully",
  "request": {
    "id": 1,
    "student_id": 101,
    "exam_schedule_id": 1,
    "reason": "...",
    "current_marks": 45.00,
    "fee_amount": 500.00,
    "fee_paid": false,
    "status": "pending",
    "request_date": "2024-01-15T10:30:00.000Z"
  },
  "exam_details": {
    "course_name": "Database Systems",
    "course_code": "CS301",
    "exam_name": "Mid Term",
    "current_marks": 45.00,
    "total_marks": 100.00
  },
  "note": "Please pay the re-evaluation fee to process your request."
}
```

**Error Responses:**
- `400`: Missing required fields, duplicate request, or deadline passed
- `404`: Student or exam not found

---

### 2. Pay Re-Evaluation Fee
Record payment for a re-evaluation request.

**Endpoint:** `POST /api/student/re-evaluation/requests/:requestId/pay`

**Authentication:** Required (Student)

**Path Parameters:**
- `requestId`: ID of the re-evaluation request

**Request Body:**
```json
{
  "payment_method": "online_banking",
  "transaction_id": "TXN123456789"
}
```

**Optional Fields:**
- `payment_method`: cash | online_banking | card (default: cash)
- `transaction_id`: Transaction reference number

**Response (200):**
```json
{
  "message": "Fee payment recorded successfully",
  "request": {
    "id": 1,
    "status": "paid",
    "fee_paid": true,
    "fee_amount": 500.00,
    "payment_method": "online_banking",
    "transaction_id": "TXN123456789",
    "paid_at": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Fee already paid
- `404`: Request not found

---

### 3. Get All My Re-Evaluation Requests
Get list of all re-evaluation requests submitted by the student.

**Endpoint:** `GET /api/student/re-evaluation/requests`

**Authentication:** Required (Student)

**Query Parameters:**
- `status`: Filter by status (pending | paid | approved | in_review | completed | rejected)

**Example:** `GET /api/student/re-evaluation/requests?status=pending`

**Response (200):**
```json
{
  "message": "Re-evaluation requests fetched successfully",
  "requests": [
    {
      "id": 1,
      "exam": {
        "exam_name": "Mid Term",
        "exam_type": "theory",
        "course_name": "Database Systems",
        "course_code": "CS301",
        "exam_date": "2024-01-10"
      },
      "current_marks": 45.00,
      "new_marks": 52.00,
      "reason": "...",
      "status": "completed",
      "fee_amount": 500.00,
      "fee_paid": true,
      "request_date": "2024-01-15T10:30:00.000Z",
      "resolved_at": "2024-01-20T15:00:00.000Z",
      "assigned_to": "teacher@govtcollegelarkana.edu.pk",
      "remarks": "After review, marks increased from 45 to 52"
    }
  ]
}
```

---

### 4. Get Re-Evaluation Request Status
Get detailed status and timeline of a specific request.

**Endpoint:** `GET /api/student/re-evaluation/requests/:requestId/status`

**Authentication:** Required (Student)

**Path Parameters:**
- `requestId`: ID of the re-evaluation request

**Response (200):**
```json
{
  "request": {
    "id": 1,
    "status": "in_review",
    "request_date": "2024-01-15T10:30:00.000Z",
    "resolved_at": null
  },
  "exam": {
    "exam_name": "Mid Term",
    "exam_type": "theory",
    "course_name": "Database Systems",
    "course_code": "CS301",
    "exam_date": "2024-01-10"
  },
  "marks": {
    "current": 45.00,
    "new": null,
    "total": 100.00,
    "change": null
  },
  "fee": {
    "amount": 500.00,
    "paid": true,
    "payment_method": "online_banking",
    "paid_at": "2024-01-15T11:00:00.000Z"
  },
  "reason": "I believe my paper was not evaluated properly...",
  "remarks": null,
  "assigned_to": "Dr. Ahmed Khan",
  "timeline": [
    {
      "step": "Submitted",
      "status": "completed",
      "date": "2024-01-15T10:30:00.000Z"
    },
    {
      "step": "Fee Paid",
      "status": "completed",
      "date": "2024-01-15T11:00:00.000Z"
    },
    {
      "step": "Approved",
      "status": "completed",
      "date": "2024-01-16T09:00:00.000Z"
    },
    {
      "step": "Under Review",
      "status": "in_progress",
      "date": "2024-01-16T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `404`: Request not found

---

## Admin APIs

### 5. Get All Re-Evaluation Requests
Get list of all re-evaluation requests with filters and pagination.

**Endpoint:** `GET /api/admin/re-evaluation/requests`

**Authentication:** Required (Admin)

**Query Parameters:**
- `status`: Filter by status (pending | paid | approved | in_review | completed | rejected)
- `course_id`: Filter by course ID
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Example:** `GET /api/admin/re-evaluation/requests?status=paid&page=1&limit=10`

**Response (200):**
```json
{
  "message": "Re-evaluation requests fetched successfully",
  "requests": [
    {
      "id": 1,
      "student_name": "Ali Ahmed",
      "roll_no": "2023-CS-001",
      "department_name": "Computer Science",
      "course_name": "Database Systems",
      "course_code": "CS301",
      "exam_name": "Mid Term",
      "exam_type": "theory",
      "exam_date": "2024-01-10",
      "current_marks": 45.00,
      "new_marks": null,
      "reason": "...",
      "status": "paid",
      "fee_amount": 500.00,
      "fee_paid": true,
      "payment_method": "online_banking",
      "request_date": "2024-01-15T10:30:00.000Z",
      "assigned_to_email": null,
      "teacher_name": null,
      "remarks": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 6. Approve/Reject Re-Evaluation Request
Process a re-evaluation request by approving or rejecting it.

**Endpoint:** `POST /api/admin/re-evaluation/requests/:requestId/process`

**Authentication:** Required (Admin)

**Path Parameters:**
- `requestId`: ID of the re-evaluation request

**Request Body:**
```json
{
  "action": "approve",
  "remarks": "Request approved. Valid concern raised by student."
}
```

**Fields:**
- `action`: Required, must be "approve" or "reject"
- `remarks`: Optional, reason for decision

**Response (200):**
```json
{
  "message": "Re-evaluation request approved successfully",
  "request": {
    "id": 1,
    "status": "approved",
    "approved_at": "2024-01-16T09:00:00.000Z",
    "resolved_by": 1,
    "remarks": "Request approved. Valid concern raised by student."
  }
}
```

**Validation Rules:**
- Fee must be paid before approval
- Request must be in 'pending' or 'paid' status
- Cannot process already completed/rejected requests

**Error Responses:**
- `400`: Invalid action, fee not paid, or invalid status
- `404`: Request not found

---

### 7. Assign Re-Evaluation to Teacher
Assign an approved re-evaluation request to a teacher for review.

**Endpoint:** `POST /api/admin/re-evaluation/requests/:requestId/assign`

**Authentication:** Required (Admin)

**Path Parameters:**
- `requestId`: ID of the re-evaluation request

**Request Body:**
```json
{
  "teacher_id": 5,
  "instructions": "Please review question 5 carefully. Student claims answer was correct."
}
```

**Fields:**
- `teacher_id`: Required, ID of the teacher to assign
- `instructions`: Optional, special instructions for the teacher

**Response (200):**
```json
{
  "message": "Re-evaluation assigned to teacher successfully",
  "request": {
    "id": 1,
    "status": "in_review",
    "assigned_to": 15,
    "assigned_at": "2024-01-16T10:00:00.000Z",
    "instructions": "Please review question 5 carefully..."
  },
  "teacher": {
    "id": 5,
    "name": "Dr. Ahmed Khan"
  }
}
```

**Validation Rules:**
- Request must be in 'approved' status
- Teacher must exist in system

**Error Responses:**
- `400`: Invalid status
- `404`: Request or teacher not found

---

### 8. Get Re-Evaluation Statistics
Get comprehensive statistics about re-evaluation requests.

**Endpoint:** `GET /api/admin/re-evaluation/statistics`

**Authentication:** Required (Admin)

**Query Parameters:**
- `department_id`: Filter by department (optional)
- `semester_id`: Filter by semester (optional)

**Example:** `GET /api/admin/re-evaluation/statistics?department_id=1`

**Response (200):**
```json
{
  "message": "Statistics fetched successfully",
  "statistics": {
    "total_requests": 150,
    "pending": 10,
    "paid": 15,
    "approved": 20,
    "in_review": 8,
    "completed": 85,
    "rejected": 12,
    "fees_collected": 130,
    "marks_increased": 45,
    "marks_decreased": 8,
    "average_change": "3.45"
  }
}
```

---

## Teacher APIs

### 9. Get Assigned Re-Evaluation Requests
Get list of re-evaluation requests assigned to the teacher.

**Endpoint:** `GET /api/teacher/re-evaluation/requests`

**Authentication:** Required (Teacher)

**Response (200):**
```json
{
  "message": "Assigned re-evaluation requests fetched successfully",
  "requests": [
    {
      "id": 1,
      "student_name": "Ali Ahmed",
      "roll_no": "2023-CS-001",
      "department_name": "Computer Science",
      "course_name": "Database Systems",
      "course_code": "CS301",
      "exam_name": "Mid Term",
      "exam_type": "theory",
      "exam_date": "2024-01-10",
      "current_marks": 45.00,
      "new_marks": null,
      "reason": "I believe my paper was not evaluated properly...",
      "status": "in_review",
      "fee_amount": 500.00,
      "fee_paid": true,
      "assigned_at": "2024-01-16T10:00:00.000Z",
      "instructions": "Please review question 5 carefully..."
    }
  ]
}
```

---

### 10. Update Re-Evaluation Result
Submit updated marks after reviewing the student's paper.

**Endpoint:** `POST /api/teacher/re-evaluation/requests/:requestId/update`

**Authentication:** Required (Teacher)

**Path Parameters:**
- `requestId`: ID of the re-evaluation request

**Request Body:**
```json
{
  "new_marks": 52.00,
  "remarks": "After careful review, found that question 5 answer was indeed correct. Marks increased from 45 to 52."
}
```

**Fields:**
- `new_marks`: Required, updated marks (0-100)
- `remarks`: Optional, explanation of changes

**Response (200):**
```json
{
  "message": "Re-evaluation completed and marks updated successfully",
  "previous_marks": 45.00,
  "new_marks": 52.00,
  "change": "7.00"
}
```

**System Actions:**
1. Updates marks in marks table
2. Changes request status to 'completed'
3. Triggers automatic grade recalculation
4. Updates result records
5. Notifies student (if notification system is active)

**Validation Rules:**
- Marks must be between 0 and 100
- Request must be assigned to the teacher
- Request must be in 'in_review' status
- Uses database transaction for data integrity

**Error Responses:**
- `400`: Invalid marks or status
- `404`: Request not found or not assigned to teacher

---

## Status Flow

The re-evaluation request goes through the following status transitions:

```
pending → paid → approved → in_review → completed
                    ↓
                rejected
```

### Status Descriptions:
- **pending**: Request submitted, fee payment pending
- **paid**: Fee paid, awaiting admin approval
- **approved**: Approved by admin, ready for teacher assignment
- **in_review**: Assigned to teacher, under review
- **completed**: Review completed, marks updated
- **rejected**: Request rejected by admin

---

## Fee Structure

- **Re-evaluation Fee**: PKR 500.00 per exam
- **Payment Methods**: 
  - Cash
  - Online Banking
  - Card Payment
- **Refund Policy**: Fee is refundable if request is rejected by admin

---

## Important Notes

1. **Deadline**: Students can request re-evaluation within 30 days of exam date
2. **Duplicate Requests**: Students cannot submit duplicate requests for the same exam
3. **Fee Requirement**: Fee must be paid before admin approval
4. **Marks Range**: Updated marks must be between 0-100
5. **Automatic Updates**: System automatically recalculates grades and GPA after marks update
6. **Transaction Safety**: Marks updates use database transactions to ensure data integrity
7. **No Marks Case**: Students cannot request re-evaluation if they have no marks for the exam

---

## Testing the APIs

### Test Sequence (Happy Path):

1. **Login as Student**
```bash
POST /api/auth/login
{
  "email": "student@example.com",
  "password": "password123"
}
```

2. **Submit Request**
```bash
POST /api/student/re-evaluation/request
{
  "exam_schedule_id": 1,
  "reason": "Detailed reason..."
}
```

3. **Pay Fee**
```bash
POST /api/student/re-evaluation/requests/1/pay
{
  "payment_method": "online_banking",
  "transaction_id": "TXN123"
}
```

4. **Login as Admin**
```bash
POST /api/auth/login
{
  "email": "admin@govtcollegelarkana.edu.pk",
  "password": "Admin@123"
}
```

5. **Approve Request**
```bash
POST /api/admin/re-evaluation/requests/1/process
{
  "action": "approve",
  "remarks": "Approved"
}
```

6. **Assign to Teacher**
```bash
POST /api/admin/re-evaluation/requests/1/assign
{
  "teacher_id": 1,
  "instructions": "Please review carefully"
}
```

7. **Login as Teacher**
```bash
POST /api/auth/login
{
  "email": "teacher@example.com",
  "password": "password123"
}
```

8. **Update Marks**
```bash
POST /api/teacher/re-evaluation/requests/1/update
{
  "new_marks": 55.00,
  "remarks": "Marks increased after review"
}
```

9. **Check Status (Student)**
```bash
GET /api/student/re-evaluation/requests/1/status
```

---

## Error Handling

All endpoints follow standard error response format:

```json
{
  "success": false,
  "message": "Error message description",
  "error": "Detailed error information"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Database Schema

```sql
CREATE TABLE re_evaluation_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    exam_schedule_id INTEGER REFERENCES exam_schedule(id),
    reason TEXT NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    current_marks DECIMAL(5,2),
    new_marks DECIMAL(5,2),
    fee_amount DECIMAL(10,2) DEFAULT 500.00,
    fee_paid BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP,
    approved_at TIMESTAMP,
    assigned_to INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    remarks TEXT,
    instructions TEXT
);
```

---

## Module Files

- **Service**: `Backend/src/modules/re-evaluation/re-evaluation.service.js` (~700 lines)
- **Controller**: `Backend/src/modules/re-evaluation/re-evaluation.controller.js`
- **Routes**: `Backend/src/modules/re-evaluation/re-evaluation.routes.js`
- **Documentation**: `Backend/docs/re-evaluation-api.md`

---

## Features Implemented

✅ Student request submission with deadline validation  
✅ Fee payment tracking with multiple payment methods  
✅ Admin approval/rejection workflow  
✅ Teacher assignment with custom instructions  
✅ Teacher marks update with automatic result recalculation  
✅ Comprehensive status tracking with timeline  
✅ Statistics and analytics  
✅ Duplicate request prevention  
✅ Transaction-safe marks updates  
✅ Complete API documentation  

---

## Future Enhancements

- Email/SMS notifications at each status change
- Fee refund processing for rejected requests
- File upload for supporting documents
- Bulk request processing for admin
- Teacher feedback on common errors
- Student appeal for rejected requests
- Integration with payment gateway

---

**Version:** 1.0.0  
**Last Updated:** January 2024  
**Contact:** admin@govtcollegelarkana.edu.pk
