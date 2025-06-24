class MarkingSchemeService {
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

  // Extract school code from admin user (logged-in user)
  extractSchoolCode(user) {
    if (!user) return 'UNKNOWN';
    
    const adminUsername = user?.profile?.preferred_username || 
                         user?.profile?.['cognito:username'] || 
                         user?.profile?.username || 
                         user?.profile?.sub || 
                         'UNKNOWN';
    return adminUsername.toUpperCase();
  }

  // Generate S3 path for marking scheme - ALL COMPONENTS MUST BE UPPERCASE
  generateMarkingSchemeS3Path(user, className, termName, subjectName) {
    const schoolCode = this.extractSchoolCode(user);
    
    // Ensure all components are uppercase - CRITICAL FIX for case consistency
    const upperSchoolCode = schoolCode.toString().toUpperCase();
    const upperClassName = className.toString().toUpperCase();
    const upperTermName = termName.toString().toUpperCase();
    const upperSubjectName = this.formatSubjectForS3(subjectName).toString().toUpperCase();
    
    // Fixed structure: SCHOOLCODE/EVALUATION/CLASSNAME/TERM/SUBJECT/MARKINGSCHEME/marking_scheme.pdf
    const s3Key = `${upperSchoolCode}/EVALUATION/${upperClassName}/${upperTermName}/${upperSubjectName}/MARKINGSCHEME/marking_scheme.pdf`;
    
    console.log('📁 Generated S3 Path (ALL UPPERCASE):', s3Key);
    return s3Key;
  }

  // Format subject name for S3 (handle special characters and ensure consistency)
  formatSubjectForS3(subjectName) {
    // Convert subject names to consistent format for S3
    const subjectMap = {
      'english': 'ENGLISH', 
      'mathematics': 'MATHEMATICS',
      'science': 'SCIENCE',
      'social-science': 'SOCIALSCIENCE',
      'social_science': 'SOCIALSCIENCE'
    };
    
    const normalized = subjectName.toLowerCase().replace(/[-_\s]/g, '');
    return subjectMap[normalized] || subjectName.toUpperCase().replace(/[-_\s]/g, '');
  }

  // Check if marking scheme exists for a specific class/term/subject
  async getMarkingScheme(className, termName, subjectName, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      const schoolCode = this.extractSchoolCode(user);
      
      const queryParams = new URLSearchParams({
        schoolCode: schoolCode,
        className: className,
        term: termName,
        subject: subjectName
      });

      console.log('📤 Checking marking scheme existence:', {
        endpoint: `${this.baseUrl}/students/update_marking_scheme?${queryParams}`,
        schoolCode,
        className,
        term: termName,
        subject: subjectName
      });

      const response = await fetch(`${this.baseUrl}/students/update_marking_scheme?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': user.id_token,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('❌ Authentication failed - session expired');
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (response.status === 404) {
        console.log('📭 No marking scheme found for:', { className, termName, subjectName });
        return {
          success: true,
          exists: false,
          data: null
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('✅ Marking scheme found:', responseData);

      return {
        success: true,
        exists: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error checking marking scheme:', error);
      return {
        success: false,
        error: error.message || 'Failed to check marking scheme'
      };
    }
  }

  // Create new marking scheme record
  async createMarkingScheme(className, termName, subjectName, s3Path, user) {
    try {
      if (!user || !user.id_token) {
        throw new Error('User authentication is required');
      }

      const schoolCode = this.extractSchoolCode(user);

      const payload = {
        schoolCode: schoolCode,
        className: className,
        term: termName,
        subject: subjectName,
        s3_path: s3Path
      };

      console.log('📤 Creating marking scheme record:', {
        endpoint: `${this.baseUrl}/students/update_marking_scheme`,
        payload
      });

      const response = await fetch(`${this.baseUrl}/students/update_marking_scheme`, {
        method: 'POST',
        headers: this.getAuthHeaders(user.id_token),
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        console.error('❌ Authentication failed - session expired');
        if (this.sessionExpiredCallback) {
          this.sessionExpiredCallback();
        }
        throw new Error('Session expired. Please log in again.');
      }

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', responseData);
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      console.log('✅ Marking scheme record created successfully:', responseData);
      return {
        success: true,
        data: responseData,
        message: 'Marking scheme created successfully'
      };

    } catch (error) {
      console.error('❌ Error creating marking scheme:', error);
      return {
        success: false,
        error: error.message || 'Failed to create marking scheme'
      };
    }
  }

  // Upload marking scheme PDF to S3
  async uploadMarkingSchemePDF(file, className, termName, subjectName, user, onProgress = null) {
    try {
      // Import S3Service dynamically
      const { default: s3Service } = await import('./s3Service');
      
      // Initialize S3 client
      await s3Service.initializeS3Client(user.id_token);
      
      // Generate S3 path with uppercase components
      const s3Key = this.generateMarkingSchemeS3Path(user, className, termName, subjectName);
      
      console.log('📤 Uploading marking scheme PDF to S3:', {
        fileName: file.name,
        s3Key: s3Key,
        fileSize: file.size
      });

      // Upload file
      const uploadResult = await s3Service.uploadFile(
        file,
        s3Key,
        onProgress
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file to S3');
      }

      // Generate full S3 path for database storage
      const fullS3Path = `s3://${s3Service.bucketName}/${s3Key}`;
      
      console.log('✅ Marking scheme PDF uploaded successfully:', fullS3Path);
      
      return {
        success: true,
        s3Path: fullS3Path,
        s3Key: s3Key,
        message: 'PDF uploaded successfully'
      };

    } catch (error) {
      console.error('❌ Error uploading marking scheme PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload PDF'
      };
    }
  }

  // Complete workflow: Upload PDF and create database record
  async uploadAndCreateMarkingScheme(file, className, termName, subjectName, user, onProgress = null) {
    try {
      // Step 1: Upload PDF to S3
      const uploadResult = await this.uploadMarkingSchemePDF(
        file, 
        className, 
        termName, 
        subjectName, 
        user, 
        onProgress
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Step 2: Create database record
      const createResult = await this.createMarkingScheme(
        className,
        termName,
        subjectName,
        uploadResult.s3Path,
        user
      );

      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      return {
        success: true,
        data: createResult.data,
        s3Path: uploadResult.s3Path,
        s3Key: uploadResult.s3Key,
        message: 'Marking scheme uploaded and created successfully'
      };

    } catch (error) {
      console.error('❌ Error in complete marking scheme workflow:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload and create marking scheme'
      };
    }
  }

  // Replace existing marking scheme PDF (S3 only, no database update needed)
  async replaceMarkingSchemePDF(file, className, termName, subjectName, user, onProgress = null) {
    try {
      // This will overwrite the existing file at the same S3 path
      const uploadResult = await this.uploadMarkingSchemePDF(
        file, 
        className, 
        termName, 
        subjectName, 
        user, 
        onProgress
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      console.log('✅ Marking scheme PDF replaced successfully');
      
      return {
        success: true,
        s3Path: uploadResult.s3Path,
        s3Key: uploadResult.s3Key,
        message: 'Marking scheme replaced successfully'
      };

    } catch (error) {
      console.error('❌ Error replacing marking scheme PDF:', error);
      return {
        success: false,
        error: error.message || 'Failed to replace marking scheme'
      };
    }
  }

  // Get S3 URL for viewing marking scheme PDF using signed URL
  async getMarkingSchemeViewUrl(markingSchemeData, user) {
    try {
      console.log('🔍 Starting view URL generation with data:', markingSchemeData);
      
      if (!markingSchemeData || !markingSchemeData.s3_path) {
        throw new Error('No marking scheme data or S3 path provided');
      }

      if (!user || !user.id_token) {
        throw new Error('User authentication token is required');
      }

      // Import S3Service dynamically
      const { default: s3Service } = await import('./s3Service');
      
      // Always try to initialize/reinitialize S3 client to ensure it's ready
      try {
        await s3Service.initializeS3Client(user.id_token);
        console.log('✅ S3 client initialized successfully');
      } catch (initError) {
        console.log('🔄 S3 client already initialized or reinitializing:', initError.message);
        // Continue if already initialized
      }

      // CRITICAL FIX: Handle case inconsistency in s3_path
      const s3Path = markingSchemeData.s3_path;
      console.log('📁 Original S3 Path from DB:', s3Path);
      
      if (!s3Path.startsWith('s3://')) {
        throw new Error('Invalid S3 path format. Expected s3://bucket/key');
      }
      
      let s3Key = s3Path.replace(/^s3:\/\/[^/]+\//, '');
      console.log('🔑 Extracted S3 Key (original):', s3Key);
      
      // FIX: Ensure the S3 key is in uppercase format to match upload path
      // Convert case-inconsistent paths to proper uppercase format
      const pathParts = s3Key.split('/');
      if (pathParts.length >= 6) {
        // Expected format: SCHOOLCODE/EVALUATION/CLASSNAME/TERM/SUBJECT/MARKINGSCHEME/marking_scheme.pdf
        pathParts[0] = pathParts[0].toUpperCase(); // SCHOOLCODE
        pathParts[1] = 'EVALUATION'; // Force uppercase
        pathParts[2] = pathParts[2].toUpperCase(); // CLASSNAME
        pathParts[3] = pathParts[3].toUpperCase(); // TERM
        pathParts[4] = pathParts[4].toUpperCase(); // SUBJECT
        pathParts[5] = 'MARKINGSCHEME'; // Force uppercase
        s3Key = pathParts.join('/');
      }
      
      console.log('🔑 Normalized S3 Key (uppercase):', s3Key);
      
      if (!s3Key || s3Key.trim() === '') {
        throw new Error('Unable to extract S3 key from path');
      }
      
      console.log('📤 Generating signed URL for S3 key:', s3Key);
      
      // Generate signed URL (valid for 1 hour)
      const urlResult = await s3Service.getFileViewUrl(s3Key, 3600);
      
      console.log('🔗 URL generation result:', urlResult);
      
      if (!urlResult.success) {
        throw new Error(urlResult.error || 'Failed to generate signed URL from S3 service');
      }

      if (!urlResult.url) {
        throw new Error('S3 service returned success but no URL was generated');
      }

      console.log('✅ Signed URL generated successfully');
      return urlResult.url;

    } catch (error) {
      console.error('❌ Error generating view URL:', {
        message: error.message,
        stack: error.stack,
        markingSchemeData: markingSchemeData,
        userToken: user?.id_token ? 'Present' : 'Missing'
      });
      return null;
    }
  }

  // Validate file for marking scheme upload
  validateMarkingSchemeFile(file) {
    const errors = [];
    
    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }
    
    if (!file.type.includes('pdf')) {
      errors.push('File must be a PDF');
    }
    
    if (file.size > 20 * 1024 * 1024) {
      errors.push('File size cannot exceed 20MB');
    }
    
    if (file.size < 1024) {
      errors.push('File appears to be too small or corrupted');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // Format term name for API (Term1, Term2, etc.)
  formatTermName(termId) {
    // Convert termId like 'term1' or 'term-1' to 'Term1'
    const termNumber = termId.replace(/\D/g, ''); // Extract digits only
    return `Term${termNumber}`;
  }

  // Format class name for API (CLASS9, CLASS10, etc.)
  formatClassName(classNumber) {
    // Convert classNumber like 'class-9' to 'CLASS9'
    const classNum = classNumber.replace(/\D/g, ''); // Extract digits only
    return `CLASS${classNum}`;
  }
}

// Export singleton instance
const markingSchemeService = new MarkingSchemeService();
export default markingSchemeService;