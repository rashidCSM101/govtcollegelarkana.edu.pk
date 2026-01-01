# Fee Management System - Quick Reference

## 🚀 Quick Start

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

### 4. Record Payment
```bash
POST /api/admin/record-payment
{
  "student_fee_id": 1,
  "amount": 27000,
  "payment_method": "bank",
  "transaction_id": "TXN123"
}
```

---

## 📋 All APIs

### Fee Structure
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/fee-structure` | Create fee structure |
| GET | `/api/admin/fee-structure` | Get fee structures |
| PUT | `/api/admin/fee-structure/:id` | Update fee structure |

### Fee Assignment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/assign-fees` | Auto-assign fees |
| POST | `/api/admin/assign-fee-manual` | Manual assign |
| GET | `/api/student/fees` | Get student fees |
| GET | `/api/student/fee-history` | Get payment history |

### Voucher
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/generate-voucher` | Generate voucher |
| GET | `/api/student/voucher/:feeId` | Get voucher |
| GET | `/api/student/voucher/:feeId/download` | Download PDF |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/record-payment` | Record payment |
| POST | `/api/student/pay-online` | Pay online |
| POST | `/api/payment/verify/:transactionId` | Verify payment |
| GET | `/api/student/receipts` | Get receipts |
| GET | `/api/student/receipt/:id/download` | Download receipt |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/fee-reports/unpaid` | Unpaid fees |
| GET | `/api/admin/fee-reports/collection` | Collections |
| GET | `/api/admin/fee-reports/statistics` | Statistics |

---

## 💰 Fee Components

1. **Tuition Fee** - Main course charges
2. **Lab Fee** - Laboratory usage
3. **Library Fee** - Library access
4. **Sports Fee** - Sports facilities
5. **Exam Fee** - Examination charges
6. **Admission Fee** - One-time admission
7. **Other Fee** - Miscellaneous

**Total Fee** = Sum of all components

---

## 📊 Fee Status

- **pending** - No payment made
- **partial** - Partially paid
- **paid** - Fully paid
- **overdue** - Past due date with balance

---

## 🎫 Number Formats

**Voucher:** `GCL-202401-2023CS001-1234`  
**Receipt:** `RCP-202402-12345`  
**Transaction:** `JAZZCASH-1705316400000-1234`

---

## 💳 Payment Methods

- **cash** - Cash payment
- **bank** - Bank deposit
- **online** - Online payment
- **cheque** - Bank cheque

---

## 🌐 Payment Gateways

- **jazzcash** - JazzCash wallet
- **easypaisa** - EasyPaisa wallet
- **bank** - Bank transfer

---

## ⏰ Late Fee Formula

```
Late Fee = Days Late × Late Fee Per Day
Total Payable = Due Amount + Late Fee
```

---

## 📄 PDF Downloads

- **Voucher PDF:** `/api/student/voucher/:feeId/download`
- **Receipt PDF:** `/api/student/receipt/:id/download`

---

## 🔍 Report Filters

**Unpaid Fees:**
- `department_id`, `semester_id`, `status`, `page`, `limit`

**Collection:**
- `start_date`, `end_date`, `department_id`, `payment_method`, `group_by`

**Statistics:**
- `department_id`, `session_id`

---

## ✅ Module Status

- **APIs:** 18
- **Status:** ✅ Complete
- **Server:** Running on port 3000
- **Database:** ✅ Tables created

---

## 📚 Documentation

- **Full API Docs:** `Backend/docs/fee-api.md`
- **Implementation Summary:** `Backend/docs/fee-summary.md`
- **Quick Reference:** `Backend/docs/fee-quick-reference.md`

---

## 🔐 Authentication

All endpoints require JWT token except:
- `POST /api/payment/verify/:transactionId` (Public)

**Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🎯 Common Workflows

### Workflow 1: Complete Fee Cycle
1. Create fee structure
2. Assign to students
3. Generate voucher
4. Student pays
5. Record payment
6. Generate receipt

### Workflow 2: Bulk Fee Assignment
1. Create fee structure
2. Auto-assign to all in department
3. Generate vouchers for all
4. Students view and pay
5. Monitor via reports

### Workflow 3: Custom Fee
1. Manual fee assignment
2. Set custom amount
3. Add remarks (scholarship, etc.)
4. Generate voucher
5. Process payment

---

## 📈 Key Features

✅ Component-based fee structure  
✅ Bulk fee assignment  
✅ QR code on vouchers  
✅ Late fee auto-calculation  
✅ Multiple payment methods  
✅ Online payment integration  
✅ PDF generation  
✅ Comprehensive reports  
✅ Transaction safety  
✅ Status tracking  

---

**Version:** 1.0.0  
**Contact:** admin@govtcollegelarkana.edu.pk
