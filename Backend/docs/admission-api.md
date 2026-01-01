# Admission Management API Documentation

## Overview
Complete admission management system for Government College Larkana with online application, document upload, merit list generation, and admission approval workflow.

## Base URL
```
http://localhost:3000/api/admission
```

## Features
- ✅ Multi-step online admission application
- ✅ Application tracking with application number
- ✅ Document upload (photo, CNIC, certificates, domicile)
- ✅ Merit list generation based on percentage/test scores
- ✅ Admin review and approval workflow
- ✅ Admission letter PDF generation
- ✅ Public merit list viewing
- ✅ Admission statistics and reports

---

## API Endpoints

### 1. PUBLIC ENDPOINTS

#### 1.1 Submit Admission Application
Submit a new admission application with personal, academic, and document details.

**Endpoint:** `POST /api/admission/apply`

**Authentication:** None (Public)

**Request Body:**
```json
{
  // Personal Details
  "full_name": "Ahmed Ali",
  "father_name": "Ali Khan",
  "mother_name": "Fatima Khan",
  "date_of_birth": "2005-01-15",
  "gender": "male",
  "cnic": "42501-1234567-8",
  "phone": "03001234567",
  "email": "ahmed@example.com",
  "address": "House 123, Street 1, Larkana",
  "city": "Larkana",
  "province": "Sindh",
  "postal_code": "77150",
  
  // Academic Details
  "previous_qualification": "Intermediate",
  "previous_institution": "Government College Larkana",
  "passing_year": 2023,
  "obtained_marks": 950,
  "total_marks": 1100,
  "percentage": 86.36,
  "board_university": "BISE Larkana",
  
  // Admission Details
  "program_id": 1,
  "preferred_shift": "morning",
  
  // Documents (file paths after upload)
  "photo_path": "/uploads/photos/ahmed_photo.jpg",
  "cnic_path": "/uploads/cnic/ahmed_cnic.jpg",
  "matric_certificate_path": "/uploads/certificates/matric.pdf",
  "inter_certificate_path": "/uploads/certificates/inter.pdf",
  "domicile_path": "/uploads/documents/domicile.pdf"
}
```

**Response:**
```json
{
  "message": "Application submitted successfully",
  "application": {
    "id": 1,
    "application_no": "ADM-2024-123456",
    "full_name": "Ahmed Ali",
    "program_id": 1,
    "status": "submitted",
    "application_date": "2024-01-15T10:30:00.000Z"
  },
  "instructions": [
    "Please note your application number for future reference",
    "You can track your application status using the application number",
    "Keep checking for merit list publication",
    "Make sure to upload all required documents"
  ]
}
```

---

#### 1.2 Get Application Status
Track admission application status using application number.

**Endpoint:** `GET /api/admission/status/:applicationNo`

**Authentication:** None (Public)

**Path Parameters:**
- `applicationNo` (string): Application number (e.g., ADM-2024-123456)

**Example:**
```http
GET /api/admission/status/ADM-2024-123456
```

**Response:**
```json
{
  "application": {
    "application_no": "ADM-2024-123456",
    "full_name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "phone": "03001234567",
    "program": {
      "id": 1,
      "name": "Computer Science",
      "code": "CS"
    },
    "status": "merit_list_published",
    "application_date": "2024-01-15T10:30:00.000Z",
    "reviewed_at": "2024-01-20T14:00:00.000Z",
    "approved_at": null,
    "merit_score": "51.82",
    "merit_position": 5,
    "remarks": null
  },
  "timeline": [
    {
      "step": "Application Submitted",
      "status": "completed",
      "date": "2024-01-15T10:30:00.000Z"
    },
    {
      "step": "Under Review",
      "status": "completed",
      "date": "2024-01-20T14:00:00.000Z"
    },
    {
      "step": "Merit List Published",
      "status": "completed",
      "date": "2024-01-25T09:00:00.000Z"
    }
  ],
  "documents": {
    "photo": true,
    "cnic": true,
    "matric_certificate": true,
    "inter_certificate": true,
    "domicile": true
  },
  "next_steps": [
    "Merit list has been published",
    "Check your merit position",
    "If selected, complete admission formalities"
  ]
}
```

**Status Values:**
- `submitted` - Application submitted, awaiting review
- `under_review` - Documents being verified
- `approved` - Application approved, awaiting merit list
- `rejected` - Application rejected
- `merit_list_published` - Merit list published
- `admitted` - Admission confirmed

---

#### 1.3 View Merit List
View published merit list for all programs or specific program.

**Endpoint:** `GET /api/admission/merit-list`

**Authentication:** None (Public)

**Query Parameters:**
- `program_id` (optional): Filter by specific program/department

**Example:**
```http
GET /api/admission/merit-list?program_id=1
```

**Response:**
```json
{
  "merit_lists": [
    {
      "program_name": "Computer Science",
      "program_code": "CS",
      "candidates": [
        {
          "merit_position": 1,
          "application_no": "ADM-2024-123789",
          "full_name": "Sara Ahmed",
          "father_name": "Ahmed Khan",
          "merit_score": "55.45",
          "percentage": "92.42"
        },
        {
          "merit_position": 2,
          "application_no": "ADM-2024-124567",
          "full_name": "Ali Hassan",
          "father_name": "Hassan Ali",
          "merit_score": "54.20",
          "percentage": "90.33"
        }
      ]
    }
  ],
  "total_candidates": 50
}
```

---

#### 1.4 Download Admission Letter
Generate and download admission letter PDF.

**Endpoint:** `GET /api/admission/letter/:applicationNo`

**Authentication:** None (Public)

**Path Parameters:**
- `applicationNo` (string): Application number

**Example:**
```http
GET /api/admission/letter/ADM-2024-123456
```

**Response:** PDF file download

---

### 2. ADMIN ENDPOINTS

#### 2.1 Get All Applications
Get list of all admission applications with filtering.

**Endpoint:** `GET /api/admission/applications`

**Authentication:** Required (Admin/Super Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Query Parameters:**
- `status` (optional): Filter by status (submitted, under_review, approved, rejected, etc.)
- `program_id` (optional): Filter by program
- `merit_threshold` (optional): Filter by minimum merit score
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example:**
```http
GET /api/admission/applications?status=submitted&page=1&limit=20
```

**Response:**
```json
{
  "applications": [
    {
      "id": 1,
      "application_no": "ADM-2024-123456",
      "full_name": "Ahmed Ali",
      "father_name": "Ali Khan",
      "email": "ahmed@example.com",
      "phone": "03001234567",
      "program_id": 1,
      "program_name": "Computer Science",
      "program_code": "CS",
      "percentage": "86.36",
      "merit_score": "51.82",
      "status": "submitted",
      "application_date": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

#### 2.2 Review Application
Review and approve/reject an application after document verification.

**Endpoint:** `POST /api/admission/applications/:id/review`

**Authentication:** Required (Admin/Super Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Path Parameters:**
- `id` (integer): Application ID

**Request Body:**
```json
{
  "status": "approved",
  "remarks": "All documents verified"
}
```

**Response:**
```json
{
  "message": "Application approved successfully",
  "application": {
    "id": 1,
    "application_no": "ADM-2024-123456",
    "status": "approved",
    "reviewed_by": 5,
    "reviewed_at": "2024-01-20T14:00:00.000Z",
    "remarks": "All documents verified"
  }
}
```

---

#### 2.3 Generate Merit List
Generate merit list for a specific program based on merit criteria.

**Endpoint:** `POST /api/admission/merit-list/generate`

**Authentication:** Required (Admin/Super Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Request Body:**
```json
{
  "program_id": 1,
  "merit_criteria": "percentage",
  "available_seats": 50,
  "cutoff_percentage": 60
}
```

**Parameters:**
- `program_id` (required): Program/department ID
- `merit_criteria` (optional): Merit calculation method (percentage, test_score, combined)
- `available_seats` (required): Total seats available
- `cutoff_percentage` (optional): Minimum percentage required (default: 0)

**Response:**
```json
{
  "message": "Merit list generated successfully",
  "program_id": 1,
  "total_applications": 120,
  "available_seats": 50,
  "selected_candidates": 50,
  "waiting_list": 70,
  "merit_list": [
    {
      "application_no": "ADM-2024-123789",
      "full_name": "Sara Ahmed",
      "father_name": "Ahmed Khan",
      "merit_position": 1,
      "merit_score": "55.45",
      "percentage": "92.42",
      "status": "Selected"
    },
    {
      "application_no": "ADM-2024-124567",
      "full_name": "Ali Hassan",
      "father_name": "Hassan Ali",
      "merit_position": 2,
      "merit_score": "54.20",
      "percentage": "90.33",
      "status": "Selected"
    }
  ]
}
```

---

#### 2.4 Approve Admission
Final admission approval - creates student record and generates credentials.

**Endpoint:** `POST /api/admission/applications/:id/approve`

**Authentication:** Required (Admin/Super Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Path Parameters:**
- `id` (integer): Application ID

**Request Body:**
```json
{
  "admission_fee_amount": 5000,
  "admission_date": "2024-02-01",
  "remarks": "Admission confirmed"
}
```

**Response:**
```json
{
  "message": "Admission approved successfully",
  "student": {
    "roll_no": "2024-CS-001",
    "name": "Ahmed Ali",
    "program_id": 1,
    "email": "ahmed@example.com"
  },
  "credentials": {
    "email": "ahmed@example.com",
    "temporary_password": "Student@123",
    "note": "Please change your password after first login"
  }
}
```

**Note:** This creates:
- User account with student role
- Student record with generated roll number
- Updates application status to 'admitted'

---

#### 2.5 Get Admission Statistics
Get comprehensive admission statistics.

**Endpoint:** `GET /api/admission/statistics`

**Authentication:** Required (Admin/Super Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Query Parameters:**
- `program_id` (optional): Filter by program
- `session_year` (optional): Filter by year (e.g., 2024)

**Example:**
```http
GET /api/admission/statistics?program_id=1&session_year=2024
```

**Response:**
```json
{
  "statistics": {
    "total_applications": 250,
    "submitted": 180,
    "under_review": 30,
    "approved": 150,
    "rejected": 20,
    "merit_list_published": 120,
    "admitted": 80,
    "avg_merit_score": "52.35",
    "max_merit_score": "58.40",
    "min_merit_score": "45.20"
  }
}
```

---

## Database Schema

### admission_applications Table
```sql
CREATE TABLE admission_applications (
    id SERIAL PRIMARY KEY,
    application_no VARCHAR(50) UNIQUE NOT NULL,
    
    -- Personal Details
    full_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100) NOT NULL,
    mother_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    cnic VARCHAR(20),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Academic Details
    previous_qualification VARCHAR(50) NOT NULL,
    previous_institution VARCHAR(200),
    passing_year INTEGER,
    obtained_marks DECIMAL(10,2) NOT NULL,
    total_marks DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    board_university VARCHAR(200),
    
    -- Admission Details
    program_id INTEGER REFERENCES departments(id),
    preferred_shift VARCHAR(20),
    
    -- Documents
    photo_path VARCHAR(255),
    cnic_path VARCHAR(255),
    matric_certificate_path VARCHAR(255),
    inter_certificate_path VARCHAR(255),
    domicile_path VARCHAR(255),
    
    -- Status & Tracking
    status VARCHAR(30) DEFAULT 'submitted',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    admission_date DATE,
    
    -- Merit Information
    merit_score DECIMAL(5,2),
    merit_position INTEGER,
    merit_list_date TIMESTAMP,
    
    -- Additional
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Workflow

### Application Submission Flow
1. **Student Submits Application**
   - Fill multi-step form (personal, academic, documents)
   - Upload required documents (photo, CNIC, certificates)
   - Receive application number

2. **Application Tracking**
   - Check status using application number
   - View timeline of application progress
   - Receive status updates

3. **Admin Review**
   - Admin reviews submitted applications
   - Verifies uploaded documents
   - Approves or rejects application

4. **Merit List Generation**
   - Admin generates merit list based on criteria
   - System calculates merit scores
   - Assigns merit positions
   - Publishes merit list

5. **Admission Approval**
   - Selected candidates in merit list
   - Admin approves final admission
   - System creates student record
   - Generates roll number and credentials

6. **Admission Confirmation**
   - Student receives admission letter
   - Downloads admission letter PDF
   - Completes fee payment
   - Starts academic journey

---

## Merit Calculation

Default merit formula (60% previous qualification):
```
merit_score = percentage * 0.6
```

Can be customized to include:
- Test scores (entrance test)
- Interview marks
- Quotas (sports, minority, etc.)

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Application created |
| 400 | Invalid request data |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Application not found |
| 500 | Server error |

---

## Testing

### Submit Application
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

### Check Status
```bash
curl http://localhost:3000/api/admission/status/ADM-2024-123456
```

### View Merit List
```bash
curl http://localhost:3000/api/admission/merit-list?program_id=1
```

---

## Notes

1. **Document Upload:** Implement file upload middleware before production
2. **Merit Calculation:** Customize formula based on college policy
3. **Notifications:** Add email/SMS notifications for status updates
4. **Payment Integration:** Link with fee module for admission fee payment
5. **Entrance Test:** Add entrance test module if required
6. **Quotas:** Implement quota system (merit, sports, minority, etc.)

---

## Future Enhancements

- [ ] Document upload API with validation
- [ ] Email/SMS notifications
- [ ] Entrance test integration
- [ ] Multiple merit lists (open, reserved seats)
- [ ] Online interview scheduling
- [ ] Batch operations for bulk approvals
- [ ] Application form customization
- [ ] Document verification workflow
- [ ] Payment gateway integration
- [ ] Mobile app API support

---

**Created:** January 2024
**Version:** 1.0
**Author:** Government College Larkana Development Team
