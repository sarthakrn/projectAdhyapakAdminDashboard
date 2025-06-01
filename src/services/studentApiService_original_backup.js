class StudentApiService {
  constructor() {
    this.baseUrl = 'https://ab2pkk5ybl.execute-api.ap-south-1.amazonaws.com/dev';
    this.maxBulkSize = 100;
  }

  // Get authorization header with ID token
  getAuthHeaders(idToken) {
    if (!idToken) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': idToken,
      'Content-Type': 'application/json'
    };
  }

  // Format phone number to E.164 format (+91)
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return phoneNumber; // Return as-is if not 10 digits
  }

  // Extract school code from admin username (Cognito username)
  extractSchoolCode(user) {
    // Extract from OIDC user object
    return user?.profile?.preferred_username || 
           user?.profile?.['cognito:username'] || 
           user?.profile?.username || 
           user?.profile?.sub || 
           'UNKNOWN';
  }

  // Extract ID token from OIDC user object
  extractIdToken(user) {
    return user?.id_token;
  }

  // Validate bulk operation size
  validateBulkSize(items, operation) {
    if (items.length > this.maxBulkSize) {
      throw new Error(`${operation} supports maximum ${this.maxBulkSize} items at a time. You provided ${items.length} items.`);
    }
  }

  // Create students (single or bulk)
  async createStudents(studentsData, user) {
    try {
      const schoolCode = this.extractSchoolCode(user);
      const idToken = this.extractIdToken(user);
      
      let payload;
      
      if (Array.isArray(studentsData)) {
        // Bulk create
        this.validateBulkSize(studentsData, 'Bulk student creation');
        
        const formattedStudents = studentsData.map(student => ({
          firstName: student.firstName.trim(),
          lastName: student.lastName.trim(),
          dateOfBirth: student.dateOfBirth,
          phoneNumber: this.formatPhoneNumber(student.phoneNumber),
          className: student.className,
          section: student.section
        }));

        payload = {
          schoolCode,
          students: formattedStudents
        };
      } else {
        // Single create
        payload = {
          firstName: studentsData.firstName.trim(),
          lastName: studentsData.lastName.trim(),
          dateOfBirth: studentsData.dateOfBirth,
          phoneNumber: this.formatPhoneNumber(studentsData.phoneNumber),
          className: studentsData.className,
          section: studentsData.section,
          schoolCode
        };
      }

      const response = await fetch(`${this.baseUrl}/students`, {
        method: 'POST',
        headers: this.getAuthHeaders(idToken),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          status: response.status
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to create students',
          status: response.status
        };
      }
    } catch (error) {
      console.error('Error creating students:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Get students by school and class
  async getStudents(className, user) {
    try {
      const schoolCode = this.extractSchoolCode(user);
      const idToken = this.extractIdToken(user);
      
      const params = new URLSearchParams({
        schoolCode,
        className
      });

      const response = await fetch(`${this.baseUrl}/students?${params}`, {
        method: 'GET',
        headers: this.getAuthHeaders(idToken)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          students: responseData.students || responseData || []
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to fetch students',
          students: []
        };
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        students: []
      };
    }
  }

  // Update students (single or bulk)
  async updateStudents(updatesData, user) {
    try {
      const schoolCode = this.extractSchoolCode(user);
      const idToken = this.extractIdToken(user);
      
      let payload;

      if (Array.isArray(updatesData)) {
        // Bulk update
        this.validateBulkSize(updatesData, 'Bulk student update');
        
        const formattedUpdates = updatesData.map(update => ({
          username: update.username,
          schoolCode,
          fieldsToUpdate: {
            ...(update.firstName && { firstName: update.firstName.trim() }),
            ...(update.lastName && { lastName: update.lastName.trim() }),
            ...(update.phoneNumber && { phoneNumber: this.formatPhoneNumber(update.phoneNumber) }),
            ...(update.className && { className: update.className }),
            ...(update.section && { section: update.section }),
            ...(update.dateOfBirth && { dateOfBirth: update.dateOfBirth })
          }
        }));

        payload = { updates: formattedUpdates };
      } else {
        // Single update
        payload = {
          username: updatesData.username,
          schoolCode,
          fieldsToUpdate: {
            ...(updatesData.firstName && { firstName: updatesData.firstName.trim() }),
            ...(updatesData.lastName && { lastName: updatesData.lastName.trim() }),
            ...(updatesData.phoneNumber && { phoneNumber: this.formatPhoneNumber(updatesData.phoneNumber) }),
            ...(updatesData.className && { className: updatesData.className }),
            ...(updatesData.section && { section: updatesData.section }),
            ...(updatesData.dateOfBirth && { dateOfBirth: updatesData.dateOfBirth })
          }
        };
      }

      const response = await fetch(`${this.baseUrl}/students`, {
        method: 'PUT',
        headers: this.getAuthHeaders(idToken),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          status: response.status
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to update students',
          status: response.status
        };
      }
    } catch (error) {
      console.error('Error updating students:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Delete students (single or bulk)
  async deleteStudents(deletionsData, user) {
    try {
      const schoolCode = this.extractSchoolCode(user);
      const idToken = this.extractIdToken(user);
      
      let payload;

      if (Array.isArray(deletionsData)) {
        // Bulk delete
        this.validateBulkSize(deletionsData, 'Bulk student deletion');
        
        const formattedDeletions = deletionsData.map(deletion => ({
          username: deletion.username,
          schoolCode
        }));

        payload = { deletions: formattedDeletions };
      } else {
        // Single delete
        payload = {
          username: deletionsData.username,
          schoolCode
        };
      }

      const response = await fetch(`${this.baseUrl}/students`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(idToken),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          status: response.status
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to delete students',
          status: response.status
        };
      }
    } catch (error) {
      console.error('Error deleting students:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Send SMS to students (single or bulk)
  async sendStudentLoginDetailsSms(smsData, user) {
    try {
      const schoolCode = this.extractSchoolCode(user);
      const idToken = this.extractIdToken(user);
      
      let payload;

      if (Array.isArray(smsData)) {
        // Bulk SMS
        this.validateBulkSize(smsData, 'Bulk SMS sending');
        
        const formattedSms = smsData.map(sms => ({
          username: sms.username,
          schoolCode
        }));

        payload = { sms_recipients: formattedSms };
      } else {
        // Single SMS
        payload = {
          username: smsData.username,
          schoolCode
        };
      }

      const response = await fetch(`${this.baseUrl}/students/send-sms`, {
        method: 'POST',
        headers: this.getAuthHeaders(idToken),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          status: response.status
        };
      } else {
        return {
          success: false,
          error: responseData.message || 'Failed to send SMS',
          status: response.status
        };
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Validate student data
  validateStudentData(student) {
    const errors = [];

    if (!student.firstName || typeof student.firstName !== 'string' || !/^[a-zA-Z\s]+$/.test(student.firstName.trim())) {
      errors.push('First name must contain only letters and spaces');
    }

    if (!student.lastName || typeof student.lastName !== 'string' || !/^[a-zA-Z\s]+$/.test(student.lastName.trim())) {
      errors.push('Last name must contain only letters and spaces');
    }

    if (!student.phoneNumber || !/^\d{10}$/.test(student.phoneNumber.replace(/\D/g, ''))) {
      errors.push('Phone number must be exactly 10 digits');
    }

    if (!student.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(student.dateOfBirth)) {
      errors.push('Date of birth must be in YYYY-MM-DD format');
    }

    if (!student.className || typeof student.className !== 'string') {
      errors.push('Class name is required');
    }

    if (!student.section || typeof student.section !== 'string') {
      errors.push('Section is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Batch validate students
  validateStudentsBatch(students) {
    const results = students.map((student, index) => ({
      index,
      student,
      validation: this.validateStudentData(student)
    }));

    const validStudents = results.filter(r => r.validation.isValid).map(r => r.student);
    const invalidStudents = results.filter(r => !r.validation.isValid);

    return {
      validStudents,
      invalidStudents,
      hasErrors: invalidStudents.length > 0
    };
  }

  // Parse CSV data
  parseCSVData(csvText) {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['firstname', 'lastname', 'dateofbirth', 'phonenumber', 'classname', 'section'];
      
      const missingHeaders = requiredHeaders.filter(required => 
        !headers.some(header => header.includes(required.replace(/([A-Z])/g, '').toLowerCase()))
      );

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
      }

      const students = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const student = {};
        headers.forEach((header, index) => {
          const value = values[index];
          
          if (header.includes('firstname') || header.includes('first')) {
            student.firstName = value;
          } else if (header.includes('lastname') || header.includes('last')) {
            student.lastName = value;
          } else if (header.includes('dateofbirth') || header.includes('dob') || header.includes('birth')) {
            student.dateOfBirth = value;
          } else if (header.includes('phonenumber') || header.includes('phone')) {
            student.phoneNumber = value;
          } else if (header.includes('classname') || header.includes('class')) {
            student.className = value;
          } else if (header.includes('section')) {
            student.section = value;
          }
        });

        const validation = this.validateStudentData(student);
        if (validation.isValid) {
          students.push(student);
        } else {
          errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
        }
      }

      return {
        success: true,
        students,
        errors,
        totalRows: lines.length - 1,
        validRows: students.length,
        invalidRows: errors.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        students: [],
        errors: []
      };
    }
  }

  // Generate sample CSV content
  generateSampleCSV() {
    return `firstName,lastName,dateOfBirth,phoneNumber,className,section
John,Doe,2010-01-15,1234567890,10,A
Jane,Smith,2010-02-20,9876543210,10,A
Mike,Johnson,2010-03-10,1555123456,10,B
Sarah,Williams,2010-04-05,1777888999,10,B`;
  }
}

// Export singleton instance
const studentApiService = new StudentApiService();
export default studentApiService;