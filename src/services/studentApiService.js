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

  // Validate DD-MM-YYYY date format
  validateDateFormat(dateString) {
    const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!ddmmyyyyRegex.test(dateString)) {
      return false;
    }
    
    const [day, month, year] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  }

  // Extract school code from admin username (Cognito username) - UPPERCASE
  extractSchoolCode(user) {
    const schoolCode = user?.profile?.preferred_username || 
                     user?.profile?.['cognito:username'] || 
                     user?.profile?.username || 
                     user?.profile?.sub || 
                     'UNKNOWN';
    return schoolCode.toUpperCase();
  }

  // Format class name to UPPERCASE (e.g., "Class9" -> "CLASS9")
  formatClassName(className) {
    if (!className) return '';
    const cleanClass = className.toString().replace(/^class-?/i, '');
    return `CLASS${cleanClass}`.toUpperCase();
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

  // Check if response indicates fire and forget operation
  isFireAndForget(status) {
    return status === 202 || status === 207;
  }

  // Create students (single or bulk)
  async createStudents(studentsData, user, classNumber = null) {
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
          className: this.formatClassName(student.className || classNumber),
          section: student.section.toUpperCase(),
          rollNumber: student.rollNumber.trim()
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
          className: this.formatClassName(studentsData.className || classNumber),
          section: studentsData.section.toUpperCase(),
          rollNumber: studentsData.rollNumber.trim(),
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
          status: response.status,
          isFireAndForget: this.isFireAndForget(response.status)
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
      const formattedClassName = this.formatClassName(className);
      
      const params = new URLSearchParams({
        schoolCode,
        className: formattedClassName
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
            ...(update.className && { className: this.formatClassName(update.className) }),
            ...(update.section && { section: update.section.toUpperCase() }),
            ...(update.dateOfBirth && { dateOfBirth: update.dateOfBirth }),
            ...(update.rollNumber && { rollNumber: update.rollNumber.trim() })
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
            ...(updatesData.className && { className: this.formatClassName(updatesData.className) }),
            ...(updatesData.section && { section: updatesData.section.toUpperCase() }),
            ...(updatesData.dateOfBirth && { dateOfBirth: updatesData.dateOfBirth }),
            ...(updatesData.rollNumber && { rollNumber: updatesData.rollNumber.trim() })
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
          status: response.status,
          isFireAndForget: this.isFireAndForget(response.status)
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
          status: response.status,
          isFireAndForget: this.isFireAndForget(response.status)
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

  // Validate student data (no phone number validation)
  validateStudentData(student) {
    const errors = [];

    if (!student.firstName || typeof student.firstName !== 'string' || !/^[a-zA-Z\s]+$/.test(student.firstName.trim())) {
      errors.push('First name must contain only letters and spaces');
    }

    if (!student.lastName || typeof student.lastName !== 'string' || !/^[a-zA-Z\s]+$/.test(student.lastName.trim())) {
      errors.push('Last name must contain only letters and spaces');
    }

    if (!student.dateOfBirth || !this.validateDateFormat(student.dateOfBirth)) {
      errors.push('Date of birth must be in DD-MM-YYYY format');
    }

    if (!student.section || typeof student.section !== 'string') {
      errors.push('Section is required');
    }

    if (!student.rollNumber || typeof student.rollNumber !== 'string' || student.rollNumber.trim().length === 0) {
      errors.push('Roll number is required');
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

  // Parse CSV data (new format: FirstName, LastName, DateOfBirth, Section)
  parseCSVData(csvText) {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['firstname', 'lastname', 'dateofbirth', 'section', 'rollnumber'];
      
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
          } else if (header.includes('section')) {
            student.section = value;
          } else if (header.includes('rollnumber') || header.includes('roll')) {
            student.rollNumber = value;
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

  // Generate sample CSV content (new format)
  generateSampleCSV() {
    return `FirstName,LastName,DateOfBirth,Section,RollNumber
John,Doe,21-07-2010,A,001
Jane,Smith,15-08-2010,A,002
Mike,Johnson,03-09-2010,B,003
Sarah,Williams,12-11-2010,B,004`;
  }
}

// Export singleton instance
const studentApiService = new StudentApiService();
export default studentApiService;