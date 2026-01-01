# Fee Management System - API Documentation

## Overview
Complete fee management system with fee structure setup, student fee assignment, voucher generation, payment processing, online payment integration, and comprehensive reporting.

## Features
- ✅ Fee structure management (department-wise, semester-wise)
- ✅ Auto/manual fee assignment to students
- ✅ Fee voucher generation with QR code
- ✅ Payment processing (Cash, Bank, Online)
- ✅ Online payment integration (JazzCash, EasyPaisa, Bank)
- ✅ Receipt generation with PDF download
- ✅ Comprehensive reports (unpaid, collection, statistics)
- ✅ Late fee calculation
- ✅ Fee breakdown by components

---

## Base URLs
- Admin: `/api/admin`
- Student: `/api/student`
- Public: `/api/payment`

---

## 1. Fee Structure Management

### 1.1 Create Fee Structure
**POST** `/api/admin/fee-structure`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "department_id": 1,
  "semester_number": 1,
  "session_id": 1,
  "tuition_fee": 15000.00,
  "lab_fee": 3000.00,
  "library_fee": 1000.00,
  "sports_fee": 500.00,
  "exam_fee": 2000.00,
  "admission_fee": 5000.00,
  "other_fee": 500.00,
  "late_fee_per_day": 50.00,
  "description": "Semester 1 fee structure for Computer Science"
}
```

**Response (201):**
```json
{
  "message": "Fee structure created successfully",
  "fee_structure": {
    "id": 1,
    "department_id": 1,
    "semester_number": 1,
    "session_id": 1,
    "tuition_fee": 15000.00,
    "lab_fee": 3000.00,
    "library_fee": 1000.00,
    "sports_fee": 500.00,
    "exam_fee": 2000.00,
    "admission_fee": 5000.00,
    "other_fee": 500.00,
    "total_fee": 27000.00,
    "late_fee_per_day": 50.00,
    "description": "...",
    "created_at": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 1.2 Get Fee Structures
**GET** `/api/admin/fee-structure`

**Authentication:** Required (Admin)

**Query Parameters:**
- `department_id` (optional): Filter by department
- `session_id` (optional): Filter by session
- `semester_number` (optional): Filter by semester

**Example:** `GET /api/admin/fee-structure?department_id=1&session_id=1`

**Response (200):**
```json
{
  "message": "Fee structures fetched successfully",
  "fee_structures": [
    {
      "id": 1,
      "department": {
        "id": 1,
        "name": "Computer Science",
        "code": "CS"
      },
      "session": {
        "id": 1,
        "name": "2023-2024",
        "years": "2023-2024"
      },
      "semester_number": 1,
      "fee_components": {
        "tuition_fee": 15000.00,
        "lab_fee": 3000.00,
        "library_fee": 1000.00,
        "sports_fee": 500.00,
        "exam_fee": 2000.00,
        "admission_fee": 5000.00,
        "other_fee": 500.00,
        "total_fee": 27000.00
      },
      "late_fee_per_day": 50.00,
      "description": "...",
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 1.3 Update Fee Structure
**PUT** `/api/admin/fee-structure/:id`

**Authentication:** Required (Admin)

**Request Body:** (All fields optional)
```json
{
  "tuition_fee": 16000.00,
  "lab_fee": 3500.00,
  "late_fee_per_day": 75.00,
  "description": "Updated fee structure"
}
```

**Response (200):**
```json
{
  "message": "Fee structure updated successfully",
  "fee_structure": { /* updated structure */ }
}
```

---

## 2. Student Fee Assignment

### 2.1 Auto-Assign Fees
**POST** `/api/admin/assign-fees`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "department_id": 1,
  "semester_id": 1,
  "fee_structure_id": 1,
  "due_date": "2024-03-31",
  "apply_to_all": true,
  "student_ids": []
}
```

**Fields:**
- `apply_to_all`: If true, applies to all active students in department
- `student_ids`: If `apply_to_all` is false, provide specific student IDs

**Response (201):**
```json
{
  "message": "Fees assigned successfully to 45 students",
  "assigned_count": 45,
  "error_count": 2,
  "errors": [
    {
      "student_id": 10,
      "error": "Fee already assigned"
    }
  ]
}
```

---

### 2.2 Manual Fee Assignment
**POST** `/api/admin/assign-fee-manual`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "student_id": 101,
  "semester_id": 1,
  "fee_structure_id": 1,
  "custom_amount": 25000.00,
  "due_date": "2024-03-31",
  "remarks": "Scholarship discount applied"
}
```

**Note:** Either `fee_structure_id` or `custom_amount` must be provided

**Response (201):**
```json
{
  "message": "Fee assigned successfully",
  "student_fee": {
    "id": 1,
    "student_id": 101,
    "semester_id": 1,
    "fee_structure_id": 1,
    "total_amount": 25000.00,
    "paid_amount": 0.00,
    "due_amount": 25000.00,
    "due_date": "2024-03-31",
    "status": "pending",
    "remarks": "Scholarship discount applied"
  }
}
```

---

### 2.3 Get Student Fees (Student View)
**GET** `/api/student/fees`

**Authentication:** Required (Student)

**Query Parameters:**
- `status` (optional): Filter by status (pending, partial, paid, overdue)
- `semester_id` (optional): Filter by semester

**Response (200):**
```json
{
  "message": "Student fees fetched successfully",
  "fees": [
    {
      "id": 1,
      "semester": {
        "id": 1,
        "name": "Semester 1",
        "number": 1
      },
      "session": "2023-2024",
      "fee_breakdown": {
        "tuition_fee": 15000.00,
        "lab_fee": 3000.00,
        "library_fee": 1000.00,
        "sports_fee": 500.00,
        "exam_fee": 2000.00,
        "admission_fee": 5000.00,
        "other_fee": 500.00
      },
      "total_amount": 27000.00,
      "paid_amount": 10000.00,
      "due_amount": 17000.00,
      "late_fee": 500.00,
      "total_payable": 17500.00,
      "due_date": "2024-03-31",
      "status": "overdue",
      "remarks": null,
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 2.4 Get Fee History
**GET** `/api/student/fee-history`

**Authentication:** Required (Student)

**Response (200):**
```json
{
  "message": "Fee history fetched successfully",
  "payments": [
    {
      "id": 1,
      "student_fee_id": 1,
      "amount": 10000.00,
      "payment_method": "bank",
      "transaction_id": "TXN123456",
      "payment_date": "2024-02-01",
      "receipt_no": "RCP-202402-12345",
      "semester_name": "Semester 1",
      "received_by_email": "admin@govtcollegelarkana.edu.pk"
    }
  ]
}
```

---

## 3. Fee Voucher Generation

### 3.1 Generate Voucher
**POST** `/api/admin/generate-voucher`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "student_id": 101,
  "student_fee_id": 1,
  "valid_days": 30,
  "bank_name": "Allied Bank Limited"
}
```

**Response (201):**
```json
{
  "message": "Voucher generated successfully",
  "voucher": {
    "id": 1,
    "voucher_no": "GCL-202401-2023CS001-1234",
    "bank_name": "Allied Bank Limited",
    "issue_date": "2024-01-15",
    "valid_until": "2024-02-14",
    "status": "issued"
  },
  "student_info": {
    "name": "Ali Ahmed",
    "roll_no": "2023-CS-001",
    "department": "Computer Science",
    "semester": "Semester 1"
  },
  "fee_info": {
    "amount": 27000.00,
    "due_date": "2024-03-31"
  }
}
```

---

### 3.2 Get Voucher (Student View)
**GET** `/api/student/voucher/:feeId`

**Authentication:** Required (Student)

**Response (200):**
```json
{
  "message": "Voucher fetched successfully",
  "voucher": {
    "voucher_no": "GCL-202401-2023CS001-1234",
    "status": "issued",
    "issue_date": "2024-01-15",
    "valid_until": "2024-02-14",
    "bank_name": "Allied Bank Limited",
    "student": {
      "name": "Ali Ahmed",
      "roll_no": "2023-CS-001",
      "cnic": "42201-1234567-1",
      "phone": "03001234567",
      "department": "Computer Science",
      "semester": "Semester 1"
    },
    "fee_breakdown": {
      "tuition_fee": 15000.00,
      "lab_fee": 3000.00,
      "library_fee": 1000.00,
      "sports_fee": 500.00,
      "exam_fee": 2000.00,
      "admission_fee": 5000.00,
      "other_fee": 500.00,
      "total": 27000.00
    },
    "payment": {
      "total_amount": 27000.00,
      "paid_amount": 0.00,
      "due_amount": 27000.00,
      "due_date": "2024-03-31"
    },
    "qr_code": "data:image/png;base64,...",
    "bank_details": {
      "bank_name": "Allied Bank Limited",
      "account_title": "Government College Larkana",
      "account_no": "0010123456789",
      "branch_code": "0010"
    }
  }
}
```

---

### 3.3 Download Voucher PDF
**GET** `/api/student/voucher/:feeId/download`

**Authentication:** Required (Student)

**Response:** PDF file download

---

## 4. Payment Processing

### 4.1 Record Payment (Admin/Cashier)
**POST** `/api/admin/record-payment`

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "student_fee_id": 1,
  "amount": 10000.00,
  "payment_method": "bank",
  "transaction_id": "TXN123456789",
  "payment_date": "2024-02-01"
}
```

**Payment Methods:** `cash`, `bank`, `online`, `cheque`

**Response (201):**
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "id": 1,
    "student_fee_id": 1,
    "amount": 10000.00,
    "payment_method": "bank",
    "transaction_id": "TXN123456789",
    "payment_date": "2024-02-01",
    "receipt_no": "RCP-202402-12345",
    "received_by": 1
  },
  "receipt_no": "RCP-202402-12345",
  "student": {
    "name": "Ali Ahmed",
    "roll_no": "2023-CS-001"
  },
  "remaining_balance": 17000.00
}
```

**System Actions:**
- Updates `student_fees` table (paid_amount, due_amount, status)
- Updates voucher status to 'paid'
- Generates unique receipt number

---

### 4.2 Pay Online (Student)
**POST** `/api/student/pay-online`

**Authentication:** Required (Student)

**Request Body:**
```json
{
  "student_fee_id": 1,
  "amount": 27000.00,
  "payment_gateway": "jazzcash",
  "phone_number": "03001234567",
  "email": "student@example.com"
}
```

**Payment Gateways:** `jazzcash`, `easypaisa`, `bank`

**Response (200):**
```json
{
  "message": "Payment initiated",
  "status": "pending",
  "transaction_id": "JAZZCASH-1705316400000-1234",
  "payment_gateway": "jazzcash",
  "amount": 27000.00,
  "redirect_url": "https://payment.jazzcash.com/checkout/JAZZCASH-1705316400000-1234",
  "note": "Please complete payment on the payment gateway page"
}
```

**Note:** This is a simulated integration. In production, integrate with actual payment gateway APIs.

---

### 4.3 Verify Payment
**POST** `/api/payment/verify/:transactionId`

**Authentication:** Not required (Public endpoint)

**Response (200):**
```json
{
  "status": "success",
  "transaction_id": "JAZZCASH-1705316400000-1234",
  "payment_gateway": "jazzcash",
  "verified_at": "2024-01-15T11:00:00.000Z",
  "message": "Payment verified successfully"
}
```

**OR**

```json
{
  "status": "failed",
  "transaction_id": "JAZZCASH-1705316400000-1234",
  "message": "Payment verification failed"
}
```

---

### 4.4 Get Receipts (Student)
**GET** `/api/student/receipts`

**Authentication:** Required (Student)

**Response (200):**
```json
{
  "message": "Receipts fetched successfully",
  "receipts": [
    {
      "id": 1,
      "student_fee_id": 1,
      "amount": 10000.00,
      "payment_method": "bank",
      "transaction_id": "TXN123456",
      "payment_date": "2024-02-01",
      "receipt_no": "RCP-202402-12345",
      "semester_name": "Semester 1",
      "fee_total": 27000.00,
      "received_by_email": "admin@govtcollegelarkana.edu.pk"
    }
  ]
}
```

---

### 4.5 Download Receipt PDF
**GET** `/api/student/receipt/:id/download`

**Authentication:** Required (Student)

**Response:** PDF file download

---

## 5. Fee Reports

### 5.1 Unpaid Fees Report
**GET** `/api/admin/fee-reports/unpaid`

**Authentication:** Required (Admin)

**Query Parameters:**
- `department_id` (optional): Filter by department
- `semester_id` (optional): Filter by semester
- `status` (optional): Filter by status (pending, partial, overdue, all)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Example:** `GET /api/admin/fee-reports/unpaid?department_id=1&status=overdue&page=1`

**Response (200):**
```json
{
  "message": "Unpaid fees report fetched successfully",
  "unpaid_fees": [
    {
      "id": 1,
      "student_name": "Ali Ahmed",
      "roll_no": "2023-CS-001",
      "phone": "03001234567",
      "department_name": "Computer Science",
      "semester_name": "Semester 1",
      "session_name": "2023-2024",
      "total_amount": 27000.00,
      "paid_amount": 0.00,
      "due_amount": 27000.00,
      "due_date": "2024-03-31",
      "status": "overdue"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "pages": 3
  },
  "summary": {
    "total_unpaid": 3375000.00
  }
}
```

---

### 5.2 Collection Report
**GET** `/api/admin/fee-reports/collection`

**Authentication:** Required (Admin)

**Query Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `department_id` (optional): Filter by department
- `payment_method` (optional): Filter by payment method
- `group_by` (optional): Group by (date, department, method) - default: date

**Example:** `GET /api/admin/fee-reports/collection?start_date=2024-01-01&end_date=2024-01-31&group_by=department`

**Response (200):**
```json
{
  "message": "Collection report fetched successfully",
  "collections": [
    {
      "payment_date": "2024-01-15",
      "department_name": "Computer Science",
      "payment_method": "bank",
      "transaction_count": 25,
      "total_collected": 450000.00
    },
    {
      "payment_date": "2024-01-15",
      "department_name": "Computer Science",
      "payment_method": "cash",
      "transaction_count": 15,
      "total_collected": 300000.00
    }
  ],
  "summary": {
    "total_collected": 750000.00,
    "total_transactions": 40,
    "by_method": {
      "bank": 450000.00,
      "cash": 300000.00
    }
  }
}
```

---

### 5.3 Fee Statistics
**GET** `/api/admin/fee-reports/statistics`

**Authentication:** Required (Admin)

**Query Parameters:**
- `department_id` (optional): Filter by department
- `session_id` (optional): Filter by session

**Example:** `GET /api/admin/fee-reports/statistics?department_id=1`

**Response (200):**
```json
{
  "message": "Fee statistics fetched successfully",
  "statistics": {
    "total_fees_assigned": 500,
    "total_paid": 350,
    "total_pending": 100,
    "total_partial": 30,
    "total_overdue": 20,
    "total_amount_assigned": 13500000.00,
    "total_amount_collected": 9450000.00,
    "total_amount_due": 4050000.00,
    "collection_percentage": "70.00"
  }
}
```

---

## Fee Status Flow

```
pending → partial → paid
   ↓
overdue (if due_date passed and due_amount > 0)
```

**Status Descriptions:**
- **pending**: No payment made yet
- **partial**: Some payment made, but not full
- **paid**: Fully paid
- **overdue**: Due date passed with outstanding amount

---

## Late Fee Calculation

If a fee becomes overdue, late fee is calculated as:
```
Late Fee = Days Late × Late Fee Per Day
Total Payable = Due Amount + Late Fee
```

**Example:**
- Due Date: 2024-03-31
- Current Date: 2024-04-10
- Days Late: 10 days
- Late Fee Per Day: Rs. 50
- Late Fee: 10 × 50 = Rs. 500

---

## Payment Gateway Integration

### Supported Gateways
1. **JazzCash** - Mobile wallet payment
2. **EasyPaisa** - Mobile wallet payment
3. **Bank Transfer** - Direct bank transfer

### Integration Flow
1. Student initiates payment → Receives `transaction_id` and `redirect_url`
2. Student completes payment on gateway page
3. Gateway sends callback/webhook to verify endpoint
4. System verifies payment and updates records
5. Student receives confirmation and receipt

**Note:** Current implementation is simulated. For production:
- Integrate with official payment gateway SDKs
- Implement webhook handlers for payment callbacks
- Add proper transaction security and encryption

---

## PDF Generation

### Voucher PDF
- College header with logo
- Student information
- Fee breakdown by component
- Bank details
- QR code for verification
- Voucher number and validity

### Receipt PDF
- College header
- Receipt number and date
- Student information
- Payment details (amount, method, transaction ID)
- Received by information
- Computer-generated receipt note

---

## Error Handling

**Common Error Responses:**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error"
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error, duplicate, invalid data)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Voucher Number Format

```
GCL-YYYYMM-ROLLNO-RANDOM
```

**Example:** `GCL-202401-2023CS001-1234`

**Components:**
- `GCL`: College code (Government College Larkana)
- `YYYYMM`: Year and month (202401)
- `ROLLNO`: Student roll number (2023CS001)
- `RANDOM`: 4-digit random number (1234)

---

## Receipt Number Format

```
RCP-YYYYMM-RANDOM
```

**Example:** `RCP-202402-12345`

**Components:**
- `RCP`: Receipt prefix
- `YYYYMM`: Year and month (202402)
- `RANDOM`: 5-digit random number (12345)

---

## Transaction ID Format (Online Payments)

```
GATEWAY-TIMESTAMP-RANDOM
```

**Example:** `JAZZCASH-1705316400000-1234`

**Components:**
- `GATEWAY`: Payment gateway name (JAZZCASH, EASYPAISA)
- `TIMESTAMP`: Unix timestamp in milliseconds
- `RANDOM`: 4-digit random number

---

## Database Tables

### fee_structures
```sql
- id, department_id, semester_number, session_id
- tuition_fee, lab_fee, library_fee, sports_fee
- exam_fee, admission_fee, other_fee, total_fee
- late_fee_per_day, description, created_at
```

### student_fees
```sql
- id, student_id, semester_id, fee_structure_id
- total_amount, paid_amount, due_amount
- due_date, status, remarks, created_at
```

### fee_payments
```sql
- id, student_fee_id, amount, payment_method
- transaction_id, payment_date, receipt_no
- received_by, created_at
```

### fee_vouchers
```sql
- id, student_id, student_fee_id, voucher_no
- bank_name, issue_date, valid_until
- status, created_at
```

---

## Testing Guide

### 1. Create Fee Structure
```bash
POST /api/admin/fee-structure
{
  "department_id": 1,
  "semester_number": 1,
  "session_id": 1,
  "tuition_fee": 15000,
  "lab_fee": 3000,
  "library_fee": 1000,
  "sports_fee": 500,
  "exam_fee": 2000,
  "admission_fee": 5000,
  "other_fee": 500
}
```

### 2. Assign Fees to Students
```bash
POST /api/admin/assign-fees
{
  "department_id": 1,
  "semester_id": 1,
  "fee_structure_id": 1,
  "due_date": "2024-03-31",
  "apply_to_all": true
}
```

### 3. Generate Voucher
```bash
POST /api/admin/generate-voucher
{
  "student_id": 101,
  "student_fee_id": 1,
  "valid_days": 30
}
```

### 4. Student Views Voucher
```bash
GET /api/student/voucher/1
```

### 5. Record Payment
```bash
POST /api/admin/record-payment
{
  "student_fee_id": 1,
  "amount": 10000,
  "payment_method": "bank",
  "transaction_id": "TXN123"
}
```

### 6. Get Reports
```bash
GET /api/admin/fee-reports/unpaid?status=overdue
GET /api/admin/fee-reports/collection?start_date=2024-01-01
GET /api/admin/fee-reports/statistics
```

---

## API Count Summary

**Total APIs: 18**

**By Category:**
- Fee Structure: 3 APIs
- Fee Assignment: 4 APIs
- Voucher: 3 APIs
- Payment: 5 APIs
- Reports: 3 APIs

**By Role:**
- Admin: 12 APIs
- Student: 6 APIs
- Public: 1 API (payment verification)

---

## Module Files

- **Service:** `Backend/src/modules/fee/fee.service.js` (~1100 lines)
- **Controller:** `Backend/src/modules/fee/fee.controller.js`
- **Routes:** `Backend/src/modules/fee/fee.routes.js`
- **Index:** `Backend/src/modules/fee/index.js`

---

## Dependencies

```json
{
  "pdfkit": "^0.17.2",
  "qrcode": "^1.5.3"
}
```

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Contact:** admin@govtcollegelarkana.edu.pk
