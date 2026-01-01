const { query, getClient } = require('../../config/database');
const { validateRequired } = require('../../utils/validator');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

class FeeService {

  // ==================== FEE STRUCTURE MANAGEMENT ====================

  // Create fee structure
  async createFeeStructure(feeData) {
    const { 
      department_id, 
      semester_number, 
      session_id,
      tuition_fee = 0,
      lab_fee = 0,
      library_fee = 0,
      sports_fee = 0,
      exam_fee = 0,
      admission_fee = 0,
      other_fee = 0,
      late_fee_per_day = 50,
      description
    } = feeData;

    const validation = validateRequired(
      { department_id, semester_number, session_id }, 
      ['department_id', 'semester_number', 'session_id']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify department and session exist
    const deptResult = await query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
    if (deptResult.rows.length === 0) {
      throw { status: 404, message: 'Department not found' };
    }

    const sessionResult = await query('SELECT id, name FROM sessions WHERE id = $1', [session_id]);
    if (sessionResult.rows.length === 0) {
      throw { status: 404, message: 'Session not found' };
    }

    // Check if fee structure already exists
    const existing = await query(`
      SELECT id FROM fee_structures 
      WHERE department_id = $1 AND semester_number = $2 AND session_id = $3
    `, [department_id, semester_number, session_id]);

    if (existing.rows.length > 0) {
      throw { 
        status: 400, 
        message: 'Fee structure already exists for this department, semester, and session' 
      };
    }

    // Calculate total fee
    const total_fee = parseFloat(tuition_fee) + parseFloat(lab_fee) + 
                      parseFloat(library_fee) + parseFloat(sports_fee) + 
                      parseFloat(exam_fee) + parseFloat(admission_fee) + 
                      parseFloat(other_fee);

    const result = await query(`
      INSERT INTO fee_structures (
        department_id, semester_number, session_id,
        tuition_fee, lab_fee, library_fee, sports_fee, 
        exam_fee, admission_fee, other_fee, total_fee,
        late_fee_per_day, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      department_id, semester_number, session_id,
      tuition_fee, lab_fee, library_fee, sports_fee,
      exam_fee, admission_fee, other_fee, total_fee,
      late_fee_per_day, description
    ]);

    return {
      message: 'Fee structure created successfully',
      fee_structure: result.rows[0]
    };
  }

  // Get all fee structures with filters
  async getFeeStructures(filters = {}) {
    const { department_id, session_id, semester_number } = filters;

    let sql = `
      SELECT fs.*, 
             d.name as department_name, d.code as department_code,
             s.name as session_name, s.start_year, s.end_year
      FROM fee_structures fs
      JOIN departments d ON fs.department_id = d.id
      JOIN sessions s ON fs.session_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      sql += ` AND fs.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (session_id) {
      paramCount++;
      sql += ` AND fs.session_id = $${paramCount}`;
      params.push(session_id);
    }

    if (semester_number) {
      paramCount++;
      sql += ` AND fs.semester_number = $${paramCount}`;
      params.push(semester_number);
    }

    sql += ' ORDER BY fs.created_at DESC';

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      department: {
        id: row.department_id,
        name: row.department_name,
        code: row.department_code
      },
      session: {
        id: row.session_id,
        name: row.session_name,
        years: `${row.start_year}-${row.end_year}`
      },
      semester_number: row.semester_number,
      fee_components: {
        tuition_fee: parseFloat(row.tuition_fee),
        lab_fee: parseFloat(row.lab_fee),
        library_fee: parseFloat(row.library_fee),
        sports_fee: parseFloat(row.sports_fee),
        exam_fee: parseFloat(row.exam_fee),
        admission_fee: parseFloat(row.admission_fee),
        other_fee: parseFloat(row.other_fee),
        total_fee: parseFloat(row.total_fee)
      },
      late_fee_per_day: parseFloat(row.late_fee_per_day),
      description: row.description,
      created_at: row.created_at
    }));
  }

  // Update fee structure
  async updateFeeStructure(id, feeData) {
    const { 
      tuition_fee,
      lab_fee,
      library_fee,
      sports_fee,
      exam_fee,
      admission_fee,
      other_fee,
      late_fee_per_day,
      description
    } = feeData;

    // Get existing structure
    const existing = await query('SELECT * FROM fee_structures WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw { status: 404, message: 'Fee structure not found' };
    }

    const current = existing.rows[0];

    // Use existing values if not provided
    const newTuition = tuition_fee !== undefined ? tuition_fee : current.tuition_fee;
    const newLab = lab_fee !== undefined ? lab_fee : current.lab_fee;
    const newLibrary = library_fee !== undefined ? library_fee : current.library_fee;
    const newSports = sports_fee !== undefined ? sports_fee : current.sports_fee;
    const newExam = exam_fee !== undefined ? exam_fee : current.exam_fee;
    const newAdmission = admission_fee !== undefined ? admission_fee : current.admission_fee;
    const newOther = other_fee !== undefined ? other_fee : current.other_fee;
    const newLateFee = late_fee_per_day !== undefined ? late_fee_per_day : current.late_fee_per_day;
    const newDescription = description !== undefined ? description : current.description;

    // Calculate new total
    const total_fee = parseFloat(newTuition) + parseFloat(newLab) + 
                      parseFloat(newLibrary) + parseFloat(newSports) +
                      parseFloat(newExam) + parseFloat(newAdmission) + 
                      parseFloat(newOther);

    const result = await query(`
      UPDATE fee_structures 
      SET tuition_fee = $1, lab_fee = $2, library_fee = $3, sports_fee = $4,
          exam_fee = $5, admission_fee = $6, other_fee = $7, total_fee = $8,
          late_fee_per_day = $9, description = $10
      WHERE id = $11
      RETURNING *
    `, [
      newTuition, newLab, newLibrary, newSports,
      newExam, newAdmission, newOther, total_fee,
      newLateFee, newDescription, id
    ]);

    return {
      message: 'Fee structure updated successfully',
      fee_structure: result.rows[0]
    };
  }

  // ==================== STUDENT FEE ASSIGNMENT ====================

  // Auto-assign fees to students
  async autoAssignFees(assignData) {
    const { 
      department_id, 
      semester_id, 
      fee_structure_id, 
      due_date,
      apply_to_all = true,
      student_ids = []
    } = assignData;

    const validation = validateRequired(
      { fee_structure_id, semester_id, due_date }, 
      ['fee_structure_id', 'semester_id', 'due_date']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Get fee structure
    const feeStructure = await query('SELECT * FROM fee_structures WHERE id = $1', [fee_structure_id]);
    if (feeStructure.rows.length === 0) {
      throw { status: 404, message: 'Fee structure not found' };
    }

    const fee = feeStructure.rows[0];

    // Get students to assign fees
    let studentQuery = `
      SELECT s.id, s.name, s.roll_no, s.department_id
      FROM students s
      WHERE s.status = 'active'
    `;
    const studentParams = [];
    let paramCount = 0;

    if (apply_to_all && department_id) {
      paramCount++;
      studentQuery += ` AND s.department_id = $${paramCount}`;
      studentParams.push(department_id);
    } else if (!apply_to_all && student_ids.length > 0) {
      paramCount++;
      studentQuery += ` AND s.id = ANY($${paramCount}::int[])`;
      studentParams.push(student_ids);
    } else {
      throw { status: 400, message: 'Either department_id or student_ids must be provided' };
    }

    const students = await query(studentQuery, studentParams);

    if (students.rows.length === 0) {
      throw { status: 404, message: 'No eligible students found' };
    }

    const client = await getClient();
    const assigned = [];
    const errors = [];

    try {
      await client.query('BEGIN');

      for (const student of students.rows) {
        try {
          // Check if already assigned
          const existing = await client.query(`
            SELECT id FROM student_fees 
            WHERE student_id = $1 AND semester_id = $2
          `, [student.id, semester_id]);

          if (existing.rows.length > 0) {
            errors.push({ student_id: student.id, error: 'Fee already assigned' });
            continue;
          }

          // Assign fee
          const result = await client.query(`
            INSERT INTO student_fees (
              student_id, semester_id, fee_structure_id,
              total_amount, paid_amount, due_amount, due_date, status
            )
            VALUES ($1, $2, $3, $4, 0, $4, $5, 'pending')
            RETURNING *
          `, [student.id, semester_id, fee_structure_id, fee.total_fee, due_date]);

          assigned.push(result.rows[0]);
        } catch (err) {
          errors.push({ student_id: student.id, error: err.message });
        }
      }

      await client.query('COMMIT');

      return {
        message: `Fees assigned successfully to ${assigned.length} students`,
        assigned_count: assigned.length,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Manual fee assignment
  async manualAssignFee(assignData) {
    const { 
      student_id, 
      semester_id, 
      fee_structure_id, 
      custom_amount,
      due_date,
      remarks
    } = assignData;

    const validation = validateRequired(
      { student_id, semester_id, due_date }, 
      ['student_id', 'semester_id', 'due_date']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Verify student exists
    const studentResult = await query('SELECT id, name FROM students WHERE id = $1', [student_id]);
    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student not found' };
    }

    let total_amount;

    if (custom_amount) {
      total_amount = custom_amount;
    } else if (fee_structure_id) {
      const feeStructure = await query('SELECT total_fee FROM fee_structures WHERE id = $1', [fee_structure_id]);
      if (feeStructure.rows.length === 0) {
        throw { status: 404, message: 'Fee structure not found' };
      }
      total_amount = feeStructure.rows[0].total_fee;
    } else {
      throw { status: 400, message: 'Either fee_structure_id or custom_amount is required' };
    }

    // Check if already assigned
    const existing = await query(`
      SELECT id FROM student_fees 
      WHERE student_id = $1 AND semester_id = $2
    `, [student_id, semester_id]);

    if (existing.rows.length > 0) {
      throw { status: 400, message: 'Fee already assigned for this semester' };
    }

    const result = await query(`
      INSERT INTO student_fees (
        student_id, semester_id, fee_structure_id,
        total_amount, paid_amount, due_amount, due_date, remarks, status
      )
      VALUES ($1, $2, $3, $4, 0, $4, $5, $6, 'pending')
      RETURNING *
    `, [student_id, semester_id, fee_structure_id, total_amount, due_date, remarks]);

    return {
      message: 'Fee assigned successfully',
      student_fee: result.rows[0]
    };
  }

  // Get student fees
  async getStudentFees(studentId, filters = {}) {
    const { status, semester_id } = filters;

    let sql = `
      SELECT sf.*, 
             sem.name as semester_name, sem.number as semester_number,
             fs.tuition_fee, fs.lab_fee, fs.library_fee, fs.sports_fee,
             fs.exam_fee, fs.admission_fee, fs.other_fee,
             sess.name as session_name
      FROM student_fees sf
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN sessions sess ON fs.session_id = sess.id
      WHERE sf.student_id = $1
    `;
    const params = [studentId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      sql += ` AND sf.status = $${paramCount}`;
      params.push(status);
    }

    if (semester_id) {
      paramCount++;
      sql += ` AND sf.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    sql += ' ORDER BY sf.created_at DESC';

    const result = await query(sql, params);

    // Check for overdue fees
    const currentDate = new Date();
    return result.rows.map(row => {
      let status = row.status;
      if (row.due_date && new Date(row.due_date) < currentDate && row.due_amount > 0) {
        status = 'overdue';
      }

      // Calculate late fee if overdue
      let late_fee = 0;
      if (status === 'overdue' && row.late_fee_per_day) {
        const daysLate = Math.floor((currentDate - new Date(row.due_date)) / (1000 * 60 * 60 * 24));
        late_fee = daysLate * parseFloat(row.late_fee_per_day);
      }

      return {
        id: row.id,
        semester: {
          id: row.semester_id,
          name: row.semester_name,
          number: row.semester_number
        },
        session: row.session_name,
        fee_breakdown: {
          tuition_fee: parseFloat(row.tuition_fee || 0),
          lab_fee: parseFloat(row.lab_fee || 0),
          library_fee: parseFloat(row.library_fee || 0),
          sports_fee: parseFloat(row.sports_fee || 0),
          exam_fee: parseFloat(row.exam_fee || 0),
          admission_fee: parseFloat(row.admission_fee || 0),
          other_fee: parseFloat(row.other_fee || 0)
        },
        total_amount: parseFloat(row.total_amount),
        paid_amount: parseFloat(row.paid_amount),
        due_amount: parseFloat(row.due_amount),
        late_fee: late_fee,
        total_payable: parseFloat(row.due_amount) + late_fee,
        due_date: row.due_date,
        status: status,
        remarks: row.remarks,
        created_at: row.created_at
      };
    });
  }

  // Get fee history (payments)
  async getFeeHistory(studentId) {
    const result = await query(`
      SELECT fp.*, sf.semester_id, sf.total_amount,
             sem.name as semester_name,
             u.email as received_by_email
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN users u ON fp.received_by = u.id
      WHERE sf.student_id = $1
      ORDER BY fp.payment_date DESC
    `, [studentId]);

    return result.rows;
  }

  // ==================== VOUCHER GENERATION ====================

  // Generate fee voucher
  async generateVoucher(voucherData) {
    const { student_id, student_fee_id, valid_days = 30, bank_name = 'Allied Bank Limited' } = voucherData;

    const validation = validateRequired(
      { student_id, student_fee_id }, 
      ['student_id', 'student_fee_id']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Get student and fee details
    const studentResult = await query(`
      SELECT s.*, d.name as department_name,
             sf.total_amount, sf.due_amount, sf.due_date, sf.status,
             sem.name as semester_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      JOIN student_fees sf ON sf.student_id = s.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      WHERE s.id = $1 AND sf.id = $2
    `, [student_id, student_fee_id]);

    if (studentResult.rows.length === 0) {
      throw { status: 404, message: 'Student or fee not found' };
    }

    const student = studentResult.rows[0];

    if (student.status === 'paid') {
      throw { status: 400, message: 'Fee already paid' };
    }

    // Check if voucher already exists
    const existingVoucher = await query(`
      SELECT id, voucher_no FROM fee_vouchers 
      WHERE student_fee_id = $1 AND status NOT IN ('expired', 'cancelled')
    `, [student_fee_id]);

    if (existingVoucher.rows.length > 0) {
      throw { 
        status: 400, 
        message: 'Active voucher already exists',
        voucher_no: existingVoucher.rows[0].voucher_no
      };
    }

    // Generate voucher number: GCL-YYYYMM-ROLLNO-RANDOM
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 9000) + 1000;
    const voucher_no = `GCL-${yearMonth}-${student.roll_no}-${random}`;

    const issue_date = new Date();
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + valid_days);

    const result = await query(`
      INSERT INTO fee_vouchers (
        student_id, student_fee_id, voucher_no, 
        bank_name, issue_date, valid_until, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'issued')
      RETURNING *
    `, [student_id, student_fee_id, voucher_no, bank_name, issue_date, valid_until]);

    return {
      message: 'Voucher generated successfully',
      voucher: result.rows[0],
      student_info: {
        name: student.name,
        roll_no: student.roll_no,
        department: student.department_name,
        semester: student.semester_name
      },
      fee_info: {
        amount: parseFloat(student.due_amount),
        due_date: student.due_date
      }
    };
  }

  // Get voucher details
  async getVoucher(studentId, feeId) {
    const result = await query(`
      SELECT fv.*, 
             s.name as student_name, s.roll_no, s.cnic, s.phone,
             d.name as department_name,
             sf.total_amount, sf.paid_amount, sf.due_amount, sf.due_date,
             sem.name as semester_name,
             fs.tuition_fee, fs.lab_fee, fs.library_fee, fs.sports_fee,
             fs.exam_fee, fs.admission_fee, fs.other_fee
      FROM fee_vouchers fv
      JOIN students s ON fv.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN student_fees sf ON fv.student_fee_id = sf.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      WHERE fv.student_id = $1 AND fv.student_fee_id = $2
      ORDER BY fv.issue_date DESC
      LIMIT 1
    `, [studentId, feeId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Voucher not found' };
    }

    const voucher = result.rows[0];

    // Generate QR code
    const qrData = {
      voucher_no: voucher.voucher_no,
      student_name: voucher.student_name,
      roll_no: voucher.roll_no,
      amount: parseFloat(voucher.due_amount),
      due_date: voucher.due_date
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

    return {
      voucher_no: voucher.voucher_no,
      status: voucher.status,
      issue_date: voucher.issue_date,
      valid_until: voucher.valid_until,
      bank_name: voucher.bank_name,
      student: {
        name: voucher.student_name,
        roll_no: voucher.roll_no,
        cnic: voucher.cnic,
        phone: voucher.phone,
        department: voucher.department_name,
        semester: voucher.semester_name
      },
      fee_breakdown: {
        tuition_fee: parseFloat(voucher.tuition_fee || 0),
        lab_fee: parseFloat(voucher.lab_fee || 0),
        library_fee: parseFloat(voucher.library_fee || 0),
        sports_fee: parseFloat(voucher.sports_fee || 0),
        exam_fee: parseFloat(voucher.exam_fee || 0),
        admission_fee: parseFloat(voucher.admission_fee || 0),
        other_fee: parseFloat(voucher.other_fee || 0),
        total: parseFloat(voucher.total_amount)
      },
      payment: {
        total_amount: parseFloat(voucher.total_amount),
        paid_amount: parseFloat(voucher.paid_amount),
        due_amount: parseFloat(voucher.due_amount),
        due_date: voucher.due_date
      },
      qr_code: qrCode,
      bank_details: {
        bank_name: voucher.bank_name,
        account_title: 'Government College Larkana',
        account_no: '0010123456789',
        branch_code: '0010'
      }
    };
  }

  // Generate voucher PDF
  async generateVoucherPDF(studentId, feeId) {
    const voucherData = await this.getVoucher(studentId, feeId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('Government College Larkana', { align: 'center' });
        doc.fontSize(12).text('Fee Payment Voucher', { align: 'center' });
        doc.moveDown();

        // Voucher Info
        doc.fontSize(10);
        doc.text(`Voucher No: ${voucherData.voucher_no}`, { continued: true });
        doc.text(`Issue Date: ${new Date(voucherData.issue_date).toLocaleDateString()}`, { align: 'right' });
        doc.text(`Valid Until: ${new Date(voucherData.valid_until).toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Student Info
        doc.fontSize(12).text('Student Information:', { underline: true });
        doc.fontSize(10);
        doc.text(`Name: ${voucherData.student.name}`);
        doc.text(`Roll No: ${voucherData.student.roll_no}`);
        doc.text(`Department: ${voucherData.student.department}`);
        doc.text(`Semester: ${voucherData.student.semester}`);
        doc.moveDown();

        // Fee Breakdown
        doc.fontSize(12).text('Fee Breakdown:', { underline: true });
        doc.fontSize(10);
        Object.entries(voucherData.fee_breakdown).forEach(([key, value]) => {
          if (value > 0 && key !== 'total') {
            doc.text(`${key.replace(/_/g, ' ').toUpperCase()}: Rs. ${value.toFixed(2)}`);
          }
        });
        doc.text(`TOTAL AMOUNT: Rs. ${voucherData.fee_breakdown.total.toFixed(2)}`, { bold: true });
        doc.moveDown();

        // Bank Details
        doc.fontSize(12).text('Bank Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Bank Name: ${voucherData.bank_details.bank_name}`);
        doc.text(`Account Title: ${voucherData.bank_details.account_title}`);
        doc.text(`Account No: ${voucherData.bank_details.account_no}`);
        doc.moveDown();

        // QR Code
        doc.image(voucherData.qr_code, doc.page.width - 150, doc.y, { width: 100 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== PAYMENT PROCESSING ====================

  // Record payment
  async recordPayment(userId, paymentData) {
    const { 
      student_fee_id, 
      amount, 
      payment_method = 'cash',
      transaction_id,
      payment_date = new Date()
    } = paymentData;

    const validation = validateRequired(
      { student_fee_id, amount }, 
      ['student_fee_id', 'amount']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    if (amount <= 0) {
      throw { status: 400, message: 'Amount must be greater than 0' };
    }

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get student fee details
      const feeResult = await client.query(`
        SELECT sf.*, s.name as student_name, s.roll_no
        FROM student_fees sf
        JOIN students s ON sf.student_id = s.id
        WHERE sf.id = $1
      `, [student_fee_id]);

      if (feeResult.rows.length === 0) {
        throw { status: 404, message: 'Student fee not found' };
      }

      const fee = feeResult.rows[0];

      if (parseFloat(amount) > parseFloat(fee.due_amount)) {
        throw { status: 400, message: 'Payment amount exceeds due amount' };
      }

      // Generate receipt number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 90000) + 10000;
      const receipt_no = `RCP-${year}${month}-${random}`;

      // Record payment
      const paymentResult = await client.query(`
        INSERT INTO fee_payments (
          student_fee_id, amount, payment_method, transaction_id,
          payment_date, receipt_no, received_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [student_fee_id, amount, payment_method, transaction_id, payment_date, receipt_no, userId]);

      // Update student fee
      const newPaidAmount = parseFloat(fee.paid_amount) + parseFloat(amount);
      const newDueAmount = parseFloat(fee.total_amount) - newPaidAmount;
      const newStatus = newDueAmount === 0 ? 'paid' : newDueAmount < parseFloat(fee.total_amount) ? 'partial' : 'pending';

      await client.query(`
        UPDATE student_fees 
        SET paid_amount = $1, due_amount = $2, status = $3
        WHERE id = $4
      `, [newPaidAmount, newDueAmount, newStatus, student_fee_id]);

      // Update voucher status if exists
      await client.query(`
        UPDATE fee_vouchers 
        SET status = 'paid'
        WHERE student_fee_id = $1 AND status = 'issued'
      `, [student_fee_id]);

      await client.query('COMMIT');

      return {
        message: 'Payment recorded successfully',
        payment: paymentResult.rows[0],
        receipt_no: receipt_no,
        student: {
          name: fee.student_name,
          roll_no: fee.roll_no
        },
        remaining_balance: newDueAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Online payment (simulated integration)
  async processOnlinePayment(studentId, paymentData) {
    const { 
      student_fee_id, 
      amount, 
      payment_gateway = 'jazzcash', // jazzcash, easypaisa, bank
      phone_number,
      email
    } = paymentData;

    const validation = validateRequired(
      { student_fee_id, amount, phone_number }, 
      ['student_fee_id', 'amount', 'phone_number']
    );
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }

    // Get fee details
    const feeResult = await query(`
      SELECT sf.*, s.name as student_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      WHERE sf.id = $1 AND sf.student_id = $2
    `, [student_fee_id, studentId]);

    if (feeResult.rows.length === 0) {
      throw { status: 404, message: 'Fee not found' };
    }

    const fee = feeResult.rows[0];

    if (parseFloat(amount) > parseFloat(fee.due_amount)) {
      throw { status: 400, message: 'Payment amount exceeds due amount' };
    }

    // Simulate payment gateway transaction
    const transaction_id = `${payment_gateway.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // In real implementation, integrate with actual payment gateway API
    // For now, return pending transaction
    return {
      message: 'Payment initiated',
      status: 'pending',
      transaction_id: transaction_id,
      payment_gateway: payment_gateway,
      amount: parseFloat(amount),
      redirect_url: `https://payment.${payment_gateway}.com/checkout/${transaction_id}`,
      note: 'Please complete payment on the payment gateway page'
    };
  }

  // Verify online payment
  async verifyPayment(transactionId) {
    // In real implementation, verify with payment gateway API
    // For simulation, we'll assume payment is successful

    // Extract payment gateway from transaction ID
    const gateway = transactionId.split('-')[0].toLowerCase();

    // Simulate verification response
    const verified = Math.random() > 0.1; // 90% success rate for simulation

    if (verified) {
      return {
        status: 'success',
        transaction_id: transactionId,
        payment_gateway: gateway,
        verified_at: new Date(),
        message: 'Payment verified successfully'
      };
    } else {
      return {
        status: 'failed',
        transaction_id: transactionId,
        message: 'Payment verification failed'
      };
    }
  }

  // Get receipts
  async getReceipts(studentId) {
    const result = await query(`
      SELECT fp.*, 
             sf.semester_id, sf.total_amount as fee_total,
             sem.name as semester_name,
             u.email as received_by_email
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN users u ON fp.received_by = u.id
      WHERE sf.student_id = $1
      ORDER BY fp.payment_date DESC
    `, [studentId]);

    return result.rows;
  }

  // Get single receipt
  async getReceipt(receiptId, studentId) {
    const result = await query(`
      SELECT fp.*, 
             s.name as student_name, s.roll_no, s.cnic,
             d.name as department_name,
             sf.semester_id, sf.total_amount as fee_total,
             sem.name as semester_name,
             u.email as received_by_email, u.name as received_by_name
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      JOIN students s ON sf.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN users u ON fp.received_by = u.id
      WHERE fp.id = $1 AND sf.student_id = $2
    `, [receiptId, studentId]);

    if (result.rows.length === 0) {
      throw { status: 404, message: 'Receipt not found' };
    }

    return result.rows[0];
  }

  // Generate receipt PDF
  async generateReceiptPDF(receiptId, studentId) {
    const receipt = await this.getReceipt(receiptId, studentId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('Government College Larkana', { align: 'center' });
        doc.fontSize(12).text('Fee Payment Receipt', { align: 'center' });
        doc.moveDown();

        // Receipt Info
        doc.fontSize(10);
        doc.text(`Receipt No: ${receipt.receipt_no}`, { continued: true });
        doc.text(`Date: ${new Date(receipt.payment_date).toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();

        // Student Info
        doc.fontSize(12).text('Student Information:', { underline: true });
        doc.fontSize(10);
        doc.text(`Name: ${receipt.student_name}`);
        doc.text(`Roll No: ${receipt.roll_no}`);
        doc.text(`Department: ${receipt.department_name}`);
        doc.text(`Semester: ${receipt.semester_name}`);
        doc.moveDown();

        // Payment Details
        doc.fontSize(12).text('Payment Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Amount Paid: Rs. ${parseFloat(receipt.amount).toFixed(2)}`);
        doc.text(`Payment Method: ${receipt.payment_method.toUpperCase()}`);
        if (receipt.transaction_id) {
          doc.text(`Transaction ID: ${receipt.transaction_id}`);
        }
        doc.moveDown();

        // Received By
        doc.text(`Received By: ${receipt.received_by_name || receipt.received_by_email}`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(8).text('This is a computer-generated receipt', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==================== FEE REPORTS ====================

  // Get unpaid fees report
  async getUnpaidFeesReport(filters = {}) {
    const { department_id, semester_id, status = 'pending', page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sf.*, 
             s.name as student_name, s.roll_no, s.phone,
             d.name as department_name,
             sem.name as semester_name,
             sess.name as session_name
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN semesters sem ON sf.semester_id = sem.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      LEFT JOIN sessions sess ON fs.session_id = sess.id
      WHERE sf.status IN ('pending', 'partial', 'overdue')
    `;
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      sql += ` AND s.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (semester_id) {
      paramCount++;
      sql += ` AND sf.semester_id = $${paramCount}`;
      params.push(semester_id);
    }

    if (status && status !== 'all') {
      paramCount++;
      sql += ` AND sf.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` ORDER BY sf.due_date ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) 
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      WHERE sf.status IN ('pending', 'partial', 'overdue')
    `;
    const countParams = [];
    let countParamCount = 0;

    if (department_id) {
      countParamCount++;
      countSql += ` AND s.department_id = $${countParamCount}`;
      countParams.push(department_id);
    }

    if (semester_id) {
      countParamCount++;
      countSql += ` AND sf.semester_id = $${countParamCount}`;
      countParams.push(semester_id);
    }

    if (status && status !== 'all') {
      countParamCount++;
      countSql += ` AND sf.status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);

    return {
      unpaid_fees: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      },
      summary: {
        total_unpaid: result.rows.reduce((sum, row) => sum + parseFloat(row.due_amount), 0)
      }
    };
  }

  // Get collection report
  async getCollectionReport(filters = {}) {
    const { 
      start_date, 
      end_date, 
      department_id, 
      payment_method,
      group_by = 'date' // date, department, method
    } = filters;

    let sql = `
      SELECT 
        DATE(fp.payment_date) as payment_date,
        d.name as department_name,
        fp.payment_method,
        COUNT(fp.id) as transaction_count,
        SUM(fp.amount) as total_collected
      FROM fee_payments fp
      JOIN student_fees sf ON fp.student_fee_id = sf.id
      JOIN students s ON sf.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      sql += ` AND fp.payment_date >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      sql += ` AND fp.payment_date <= $${paramCount}`;
      params.push(end_date);
    }

    if (department_id) {
      paramCount++;
      sql += ` AND s.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (payment_method) {
      paramCount++;
      sql += ` AND fp.payment_method = $${paramCount}`;
      params.push(payment_method);
    }

    // Group by clause
    if (group_by === 'date') {
      sql += ' GROUP BY DATE(fp.payment_date), d.name, fp.payment_method';
      sql += ' ORDER BY DATE(fp.payment_date) DESC';
    } else if (group_by === 'department') {
      sql += ' GROUP BY d.name, fp.payment_method, DATE(fp.payment_date)';
      sql += ' ORDER BY d.name, DATE(fp.payment_date) DESC';
    } else if (group_by === 'method') {
      sql += ' GROUP BY fp.payment_method, d.name, DATE(fp.payment_date)';
      sql += ' ORDER BY fp.payment_method, DATE(fp.payment_date) DESC';
    }

    const result = await query(sql, params);

    // Calculate summary
    const summary = {
      total_collected: result.rows.reduce((sum, row) => sum + parseFloat(row.total_collected), 0),
      total_transactions: result.rows.reduce((sum, row) => sum + parseInt(row.transaction_count), 0),
      by_method: {}
    };

    // Group by payment method for summary
    result.rows.forEach(row => {
      if (!summary.by_method[row.payment_method]) {
        summary.by_method[row.payment_method] = 0;
      }
      summary.by_method[row.payment_method] += parseFloat(row.total_collected);
    });

    return {
      collections: result.rows,
      summary
    };
  }

  // Get fee statistics
  async getFeeStatistics(filters = {}) {
    const { department_id, session_id } = filters;

    let sql = `
      SELECT 
        COUNT(DISTINCT sf.id) as total_fees_assigned,
        COUNT(DISTINCT CASE WHEN sf.status = 'paid' THEN sf.id END) as total_paid,
        COUNT(DISTINCT CASE WHEN sf.status = 'pending' THEN sf.id END) as total_pending,
        COUNT(DISTINCT CASE WHEN sf.status = 'partial' THEN sf.id END) as total_partial,
        COUNT(DISTINCT CASE WHEN sf.status = 'overdue' THEN sf.id END) as total_overdue,
        SUM(sf.total_amount) as total_amount_assigned,
        SUM(sf.paid_amount) as total_amount_collected,
        SUM(sf.due_amount) as total_amount_due
      FROM student_fees sf
      JOIN students s ON sf.student_id = s.id
      LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      sql += ` AND s.department_id = $${paramCount}`;
      params.push(department_id);
    }

    if (session_id) {
      paramCount++;
      sql += ` AND fs.session_id = $${paramCount}`;
      params.push(session_id);
    }

    const result = await query(sql, params);

    return {
      statistics: {
        total_fees_assigned: parseInt(result.rows[0].total_fees_assigned),
        total_paid: parseInt(result.rows[0].total_paid),
        total_pending: parseInt(result.rows[0].total_pending),
        total_partial: parseInt(result.rows[0].total_partial),
        total_overdue: parseInt(result.rows[0].total_overdue),
        total_amount_assigned: parseFloat(result.rows[0].total_amount_assigned || 0),
        total_amount_collected: parseFloat(result.rows[0].total_amount_collected || 0),
        total_amount_due: parseFloat(result.rows[0].total_amount_due || 0),
        collection_percentage: (
          (parseFloat(result.rows[0].total_amount_collected || 0) / 
           parseFloat(result.rows[0].total_amount_assigned || 1)) * 100
        ).toFixed(2)
      }
    };
  }
}

module.exports = new FeeService();
