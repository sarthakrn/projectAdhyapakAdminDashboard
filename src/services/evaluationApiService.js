class EvaluationApiService {
  constructor() {
    this.baseUrl = 'https://ab2pkk5ybl.execute-api.ap-south-1.amazonaws.com/dev';
    this.sessionExpiredCallback = null;
  }

  // Set callback function to handle session expiry
  setSessionExpiredCallback(callback) {
    this.sessionExpiredCallback = callback;
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

  // Extract school code from admin user (logged-in user) - UPPERCASE
  extractSchoolCode(user) {
    if (!user) return 'UNKNOWN';
    
    const adminUsername = user?.profile?.preferred_username || 
                         user?.profile?.['cognito:username'] || 
                         user?.profile?.username || 
                         user?.profile?.sub || 
                         'UNKNOWN';
    return adminUsername.toUpperCase();
  }

  // Update marking scheme for multiple students
  async updateMarkingScheme(termName, subjectName, markingSchemeS3Path, studentUsernames, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      if (!Array.isArray(studentUsernames) || studentUsernames.length === 0) {
        throw new Error('At least one student username is required');
      }

      // Extract school code from admin user (same for all students)
      const schoolCode = this.extractSchoolCode(user);
      
      // Prepare the users array with username and schoolCode
      const users = studentUsernames.map(username => ({
        username: username,
        schoolCode: schoolCode
      }));

      const payload = {
        common_data: {
          term_name: termName,
          subject_name: subjectName,
          marking_scheme_s3_path: markingSchemeS3Path
        },
        users: users
      };

      console.log('📤 Updating marking scheme via API:', {
        endpoint: `${this.baseUrl}/students/update_marking_scheme`,
        termName,
        subjectName,
        studentCount: users.length
      });

      const response = await fetch(`${this.baseUrl}/students/update_marking_scheme`, {
        method: 'POST',
        headers: this.getAuthHeaders(user.id_token),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.status === 401) {
        console.error('❌ Authentication failed - session expired');
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        console.error('❌ API Error:', responseData);
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      console.log('✅ Marking scheme updated successfully');
      return {
        success: true,
        data: responseData,
        message: `Marking scheme updated for ${users.length} students`
      };

    } catch (error) {
      console.error('❌ Error updating marking scheme:', error);
      return {
        success: false,
        error: error.message || 'Failed to update marking scheme'
      };
    }
  }

  // Update answer sheet for a single student
  async updateAnswerSheet(username, termName, subjectName, answerSheetS3Path, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      if (!username) {
        throw new Error('Student username is required');
      }

      const schoolCode = this.extractSchoolCode(user);

      const payload = {
        username: username,
        schoolCode: schoolCode,
        term_name: termName,
        subject_name: subjectName,
        answer_sheet_s3_path: answerSheetS3Path
      };

      console.log('📤 Updating answer sheet via API:', {
        endpoint: `${this.baseUrl}/students/update_answer_sheet`,
        username,
        termName,
        subjectName
      });

      const response = await fetch(`${this.baseUrl}/students/update_answer_sheet`, {
        method: 'POST',
        headers: this.getAuthHeaders(user.id_token),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.status === 401) {
        console.error('❌ Authentication failed - session expired');
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        console.error('❌ API Error:', responseData);
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      console.log('✅ Answer sheet updated successfully');
      return {
        success: true,
        data: responseData,
        message: `Answer sheet updated for ${username}`
      };

    } catch (error) {
      console.error('❌ Error updating answer sheet:', error);
      return {
        success: false,
        error: error.message || 'Failed to update answer sheet'
      };
    }
  }

  // Update marking scheme for multiple students with maximum marks
  async updateMarkingSchemeWithMaxMarks(termName, subjectName, markingSchemeS3Path, maximumMarks, studentUsernames, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      if (!Array.isArray(studentUsernames) || studentUsernames.length === 0) {
        throw new Error('At least one student username is required');
      }

      if (!maximumMarks || isNaN(maximumMarks) || maximumMarks <= 0) {
        throw new Error('Valid maximum marks are required');
      }

      // Extract school code from admin user (same for all students)
      const schoolCode = this.extractSchoolCode(user);
      
      // Prepare the users array with username and schoolCode
      const users = studentUsernames.map(username => ({
        username: username,
        schoolCode: schoolCode
      }));

      const payload = {
        common_data: {
          term_name: termName,
          subject_name: subjectName,
          marking_scheme_s3_path: markingSchemeS3Path,
          maximum_marks: Number(maximumMarks)
        },
        users: users
      };

      console.log('📤 Updating marking scheme with maximum marks via API:', {
        endpoint: `${this.baseUrl}/students/update_marking_scheme`,
        termName,
        subjectName,
        maximumMarks,
        studentCount: users.length
      });

      const response = await fetch(`${this.baseUrl}/students/update_marking_scheme`, {
        method: 'POST',
        headers: this.getAuthHeaders(user.id_token),
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.status === 401) {
        console.error('❌ Authentication failed - session expired');
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        console.error('❌ API Error:', responseData);
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      console.log('✅ Marking scheme with maximum marks updated successfully');
      return {
        success: true,
        data: responseData,
        message: `Marking scheme updated for ${users.length} students with maximum marks: ${maximumMarks}`
      };

    } catch (error) {
      console.error('❌ Error updating marking scheme with maximum marks:', error);
      return {
        success: false,
        error: error.message || 'Failed to update marking scheme with maximum marks'
      };
    }
  }

  // Batch update marking scheme (if needed for performance)
  async batchUpdateMarkingScheme(termName, subjectName, markingSchemeS3Path, allStudentUsernames, user, batchSize = 50) {
    try {
      const results = [];
      
      // Process in batches
      for (let i = 0; i < allStudentUsernames.length; i += batchSize) {
        const batch = allStudentUsernames.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allStudentUsernames.length / batchSize)}`);
        
        const result = await this.updateMarkingScheme(termName, subjectName, markingSchemeS3Path, batch, user);
        results.push(result);
        
        if (!result.success) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, result.error);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const totalStudents = results.reduce((sum, r) => sum + (r.data?.updated_count || 0), 0);
      
      return {
        success: successCount === results.length,
        totalBatches: results.length,
        successfulBatches: successCount,
        totalStudents: totalStudents,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      return {
        success: false,
        error: error.message || 'Batch update failed'
      };
    }
  }
}

// Export singleton instance
const evaluationApiService = new EvaluationApiService();
export default evaluationApiService;