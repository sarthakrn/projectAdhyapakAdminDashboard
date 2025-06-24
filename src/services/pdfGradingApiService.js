import s3Service from './s3Service';

class PdfGradingApiService {
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

  // Format subject for API calls (convert to uppercase, handle special characters)
  formatSubjectForApi(subjectId) {
    const subjectMap = {
      'english': 'ENGLISH', 
      'mathematics': 'MATHEMATICS',
      'science': 'SCIENCE',
      'social-science': 'SOCIALSCIENCE',
      'social_science': 'SOCIALSCIENCE'
    };
    
    const normalized = subjectId.toLowerCase().replace(/[-_\s]/g, '');
    return subjectMap[normalized] || subjectId.toUpperCase().replace(/[-_\s]/g, '');
  }

  // Format class name for API calls (ensure uppercase CLASS prefix)
  formatClassForApi(className) {
    // className comes in as 'class-9' or similar, convert to 'CLASS9'
    const classNumber = className.replace(/class-?/i, '');
    return `CLASS${classNumber}`.toUpperCase();
  }

  // Format term for API calls (ensure uppercase TERM prefix)
  formatTermForApi(termId) {
    // termId comes in as 'term1' or similar, convert to 'TERM1'
    const termNumber = termId.replace(/term/i, '');
    return `TERM${termNumber}`.toUpperCase();
  }

  // Generate answer sheet S3 path
  generateAnswerSheetS3Path(schoolCode, className, termId, subjectId, studentUsername) {
    const upperSchoolCode = schoolCode.toUpperCase();
    const upperClassName = this.formatClassForApi(className);
    const upperTermId = this.formatTermForApi(termId);
    const upperSubject = this.formatSubjectForApi(subjectId);
    const upperUsername = studentUsername.toUpperCase();
    
    return `s3://project-adhyapak/${upperSchoolCode}/EVALUATION/${upperClassName}/${upperTermId}/${upperSubject}/ANSWERSHEET/${upperUsername}.pdf`;
  }

  // Generate marking scheme S3 path
  generateMarkingSchemeS3Path(schoolCode, className, termId, subjectId) {
    const upperSchoolCode = schoolCode.toUpperCase();
    const upperClassName = this.formatClassForApi(className);
    const upperTermId = this.formatTermForApi(termId);
    const upperSubject = this.formatSubjectForApi(subjectId);
    
    return `s3://project-adhyapak/${upperSchoolCode}/EVALUATION/${upperClassName}/${upperTermId}/${upperSubject}/MARKINGSCHEME/marking_scheme.pdf`;
  }

  // Check grading status for a student
  async checkGradingStatus(studentUsername, schoolCode, className, termId, subjectId, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      const payload = {
        username: studentUsername.toUpperCase(),
        schoolCode: schoolCode.toUpperCase(),
        subject: this.formatSubjectForApi(subjectId),
        term: this.formatTermForApi(termId)
      };

      console.log('📤 Checking grading status:', {
        endpoint: `${this.baseUrl}/students/check_grading_status`,
        payload
      });

      const response = await fetch(`${this.baseUrl}/students/check_grading_status`, {
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

      console.log('✅ Grading status checked successfully:', responseData.status);
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error checking grading status:', error);
      return {
        success: false,
        error: error.message || 'Failed to check grading status'
      };
    }
  }

  // Initiate grading process for a student
  async initiateGrading(studentUsername, schoolCode, className, termId, subjectId, markingSchemeS3Path, answerSheetS3Path, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      const payload = {
        username: studentUsername.toUpperCase(),
        schoolCode: schoolCode.toUpperCase(),
        subject: this.formatSubjectForApi(subjectId),
        class: this.formatClassForApi(className),
        term: this.formatTermForApi(termId),
        marking_scheme_s3_path: markingSchemeS3Path,
        answer_sheet_s3_path: answerSheetS3Path
      };

      console.log('📤 Initiating grading:', {
        endpoint: `${this.baseUrl}/students/initiate_grading`,
        payload: {
          ...payload,
          marking_scheme_s3_path: '***REDACTED***',
          answer_sheet_s3_path: '***REDACTED***'
        }
      });

      const response = await fetch(`${this.baseUrl}/students/initiate_grading`, {
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

      console.log('✅ Grading initiated successfully');
      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error initiating grading:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate grading'
      };
    }
  }

  // Upload file to S3 and get the S3 path
  async uploadAnswerSheet(file, schoolCode, className, termId, subjectId, studentUsername, user) {
    try {
      // This method will use the existing S3Service to upload the file
      // and return the S3 path for use in initiate grading
      const s3 = s3Service;

      // Initialize S3 client first
      try {
        await s3.initializeS3Client(user.id_token);
        console.log('✅ S3 client initialized successfully for answer sheet upload');
      } catch (initError) {
        console.error('❌ Failed to initialize S3 client:', initError);
        throw new Error('Failed to initialize file upload service. Please check your authentication and try again.');
      }

      // Generate the S3 path where the file should be uploaded
      const s3Path = this.generateAnswerSheetS3Path(schoolCode, className, termId, subjectId, studentUsername);
      
      // Extract just the key part (without s3://bucket-name/)
      const s3Key = s3Path.replace('s3://project-adhyapak/', '');

      console.log('📤 Uploading answer sheet to S3:', {
        originalFileName: file.name,
        s3Key: s3Key,
        fileSize: file.size
      });

      // Upload file to S3
      const uploadResult = await s3.uploadFile(file, s3Key, (progress) => {
        console.log(`Upload progress: ${progress}%`);
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload answer sheet to cloud storage');
      }

      console.log('✅ Answer sheet uploaded successfully');
      return {
        success: true,
        s3Path: s3Path,
        uploadData: uploadResult
      };

    } catch (error) {
      console.error('❌ Error uploading answer sheet:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload answer sheet'
      };
    }
  }
}

// Export singleton instance
const pdfGradingApiService = new PdfGradingApiService();
export default pdfGradingApiService;