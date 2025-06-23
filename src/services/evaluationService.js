class EvaluationService {
  constructor() {
    // We'll import services dynamically to avoid circular dependencies
    this.studentApiService = null;
    this.s3Service = null;
    this.evaluationApiService = null;
  }

  async getStudentApiService() {
    if (!this.studentApiService) {
      const { default: studentApiService } = await import('./studentApiService');
      this.studentApiService = studentApiService;
    }
    return this.studentApiService;
  }

  async getS3Service() {
    if (!this.s3Service) {
      const { default: s3Service } = await import('./s3Service');
      this.s3Service = s3Service;
    }
    return this.s3Service;
  }

  async getEvaluationApiService() {
    if (!this.evaluationApiService) {
      const { default: evaluationApiService } = await import('./evaluationApiService');
      this.evaluationApiService = evaluationApiService;
    }
    return this.evaluationApiService;
  }

  // Fetch students for evaluation from the backend
  async getStudentsForEvaluation(classNumber, user) {
    try {
      const studentApi = await this.getStudentApiService();
      const cleanClassNumber = classNumber.replace('class-', '');
      
      const result = await studentApi.getStudents(cleanClassNumber, user);
      
      if (result.success) {
        const students = result.students || [];
        
        // Format students for evaluation use
        const formattedStudents = students.map(student => ({
          id: student.username, // Use username as unique ID
          name: `${student.firstName} ${student.lastName}`,
          rollNumber: student.rollNumber || 'N/A',
          section: student.section || 'N/A',
          status: 'Pending Evaluation', // Default status for new evaluations
          username: student.username,
          firstName: student.firstName,
          lastName: student.lastName,
          dateOfBirth: student.dateOfBirth
        }));

        return {
          success: true,
          students: formattedStudents,
          count: formattedStudents.length
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to fetch students',
          students: [],
          count: 0
        };
      }
    } catch (error) {
      console.error('Error fetching students for evaluation:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        students: [],
        count: 0
      };
    }
  }

  // Get students filtered by section
  async getStudentsBySection(classNumber, section, user) {
    try {
      const result = await this.getStudentsForEvaluation(classNumber, user);
      
      if (result.success) {
        const filteredStudents = section 
          ? result.students.filter(student => student.section === section)
          : result.students;

        return {
          success: true,
          students: filteredStudents,
          count: filteredStudents.length
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error filtering students by section:', error);
      return {
        success: false,
        error: error.message || 'Error filtering students',
        students: [],
        count: 0
      };
    }
  }

  // Get unique sections for a class
  async getSectionsForClass(classNumber, user) {
    try {
      const result = await this.getStudentsForEvaluation(classNumber, user);
      
      if (result.success) {
        const sections = [...new Set(result.students.map(student => student.section))].filter(Boolean).sort();
        return {
          success: true,
          sections
        };
      }
      
      return {
        success: false,
        error: result.error,
        sections: []
      };
    } catch (error) {
      console.error('Error getting sections:', error);
      return {
        success: false,
        error: error.message || 'Error getting sections',
        sections: []
      };
    }
  }

  // Update student evaluation status (local storage for Phase 1.5)
  updateStudentStatus(classNumber, subject, termId, studentId, status) {
    try {
      const storageKey = `evaluation_status_${classNumber}_${subject}_${termId}`;
      const existingData = localStorage.getItem(storageKey);
      const statusData = existingData ? JSON.parse(existingData) : {};
      
      statusData[studentId] = {
        status,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(statusData));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating student status:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update status' 
      };
    }
  }

  // Get student evaluation status (local storage for Phase 1.5)
  getStudentStatus(classNumber, subject, termId, studentId) {
    try {
      const storageKey = `evaluation_status_${classNumber}_${subject}_${termId}`;
      const statusData = localStorage.getItem(storageKey);
      
      if (statusData) {
        const parsed = JSON.parse(statusData);
        return parsed[studentId]?.status || 'Pending Evaluation';
      }
      
      return 'Pending Evaluation';
    } catch (error) {
      console.error('Error getting student status:', error);
      return 'Pending Evaluation';
    }
  }

  // Get all student statuses for a term
  getAllStudentStatuses(classNumber, subject, termId) {
    try {
      const storageKey = `evaluation_status_${classNumber}_${subject}_${termId}`;
      const statusData = localStorage.getItem(storageKey);
      
      return statusData ? JSON.parse(statusData) : {};
    } catch (error) {
      console.error('Error getting all student statuses:', error);
      return {};
    }
  }

  // Apply saved statuses to student list
  applyStatusesToStudents(students, classNumber, subject, termId) {
    const allStatuses = this.getAllStudentStatuses(classNumber, subject, termId);
    
    return students.map(student => ({
      ...student,
      status: allStatuses[student.id]?.status || 'Pending Evaluation'
    }));
  }

  // Get evaluation statistics
  getEvaluationStats(students) {
    const total = students.length;
    const completed = students.filter(s => s.status === 'Answer Submitted').length;
    const pending = students.filter(s => s.status === 'Pending Evaluation').length;
    
    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // Validate student data for evaluation
  validateStudentForEvaluation(student) {
    const errors = [];
    
    if (!student.name || student.name.trim().length === 0) {
      errors.push('Student name is required');
    }
    
    if (!student.rollNumber || student.rollNumber.trim().length === 0) {
      errors.push('Roll number is required');
    }
    
    if (!student.section || student.section.trim().length === 0) {
      errors.push('Section is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate S3 path for evaluation based on breadcrumbs
  generateEvaluationS3Path(breadcrumbs, subjectName, folder) {
    try {
      const s3Service = this.s3Service;
      if (!s3Service) {
        throw new Error('S3 service not initialized');
      }
      
      // Transform breadcrumbs to S3 path, then append subject and folder
      const basePath = s3Service.transformBreadcrumbsToS3Path(breadcrumbs);
      return `${basePath}/${subjectName}/${folder}`;
    } catch (error) {
      console.error('Error generating S3 path:', error);
      throw error;
    }
  }

  // Upload marking scheme for a subject
  async uploadMarkingScheme(file, breadcrumbs, subjectName, studentUsernames, user) {
    try {
      const s3Service = await this.getS3Service();
      const evaluationApiService = await this.getEvaluationApiService();

      // Initialize services
      await s3Service.initializeS3Client(user.id_token);

      // Extract username from user
      const username = user?.profile?.preferred_username || 
                      user?.profile?.username || 
                      user?.profile?.['cognito:username'] ||
                      user?.preferred_username ||
                      user?.username ||
                      user?.sub;

      if (!username) {
        throw new Error('Could not extract username from user object');
      }

      // Generate S3 path for marking scheme
      const s3Path = this.generateEvaluationS3Path(breadcrumbs, subjectName, 'MarkingScheme');
      const s3Key = `${username}/${s3Path}/${file.name}`;

      // Upload file to S3
      const uploadResult = await s3Service.uploadFile(file, s3Key);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file to S3');
      }

      // Extract term name from breadcrumbs
      const termName = breadcrumbs.find(crumb => crumb.toLowerCase().includes('term'));
      if (!termName) {
        throw new Error('Could not extract term name from breadcrumbs');
      }

      // Update marking scheme metadata via API Gateway
      const apiResult = await evaluationApiService.updateMarkingScheme(
        termName,
        subjectName,
        uploadResult.location || `s3://${s3Service.bucketName}/${s3Key}`,
        studentUsernames,
        user
      );

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Failed to update marking scheme metadata');
      }

      return {
        success: true,
        s3Key,
        s3Url: uploadResult.location,
        apiUpdateResult: apiResult,
        message: `Marking scheme uploaded successfully for ${studentUsernames.length} students`
      };

    } catch (error) {
      console.error('Error uploading marking scheme:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload marking scheme'
      };
    }
  }

  // Upload marking scheme for a subject with maximum marks
  async uploadMarkingSchemeWithMaxMarks(file, breadcrumbs, subjectName, studentUsernames, maximumMarks, user) {
    try {
      const s3Service = await this.getS3Service();
      const evaluationApiService = await this.getEvaluationApiService();

      // Initialize services
      await s3Service.initializeS3Client(user.id_token);

      // Extract username from user
      const username = user?.profile?.preferred_username || 
                      user?.profile?.username || 
                      user?.profile?.['cognito:username'] ||
                      user?.preferred_username ||
                      user?.username ||
                      user?.sub;

      if (!username) {
        throw new Error('Could not extract username from user object');
      }

      // Validate maximum marks and ensure it's a proper number
      const numericMaxMarks = Number(maximumMarks);
      if (!maximumMarks || isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
        throw new Error('Valid maximum marks are required');
      }
      
      // Round to avoid floating point precision issues that could cause Decimal storage
      const roundedMaxMarks = Math.round(numericMaxMarks * 100) / 100;

      // Generate S3 path for marking scheme
      const s3Path = this.generateEvaluationS3Path(breadcrumbs, subjectName, 'MarkingScheme');
      const s3Key = `${username}/${s3Path}/${file.name}`;

      // Upload file to S3
      const uploadResult = await s3Service.uploadFile(file, s3Key);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file to S3');
      }

      // Extract term name from breadcrumbs
      const termName = breadcrumbs.find(crumb => crumb.toLowerCase().includes('term'));
      if (!termName) {
        throw new Error('Could not extract term name from breadcrumbs');
      }

      // Update marking scheme metadata via API Gateway with maximum marks
      const apiResult = await evaluationApiService.updateMarkingSchemeWithMaxMarks(
        termName,
        subjectName,
        uploadResult.location || `s3://${s3Service.bucketName}/${s3Key}`,
        roundedMaxMarks,
        studentUsernames,
        user
      );

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Failed to update marking scheme metadata');
      }

      return {
        success: true,
        s3Key,
        s3Url: uploadResult.location,
        apiUpdateResult: apiResult,
        message: `Marking scheme uploaded successfully for ${studentUsernames.length} students with maximum marks: ${roundedMaxMarks}`
      };

    } catch (error) {
      console.error('Error uploading marking scheme with maximum marks:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload marking scheme'
      };
    }
  }

  // Upload answer sheet for a student
  async uploadAnswerSheet(file, breadcrumbs, subjectName, studentUsername, user) {
    try {
      const s3Service = await this.getS3Service();
      const evaluationApiService = await this.getEvaluationApiService();

      // Initialize services
      await s3Service.initializeS3Client(user.id_token);

      // Extract username from user (teacher/admin)
      const teacherUsername = user?.profile?.preferred_username || 
                             user?.profile?.username || 
                             user?.profile?.['cognito:username'] ||
                             user?.preferred_username ||
                             user?.username ||
                             user?.sub;

      if (!teacherUsername) {
        throw new Error('Could not extract username from user object');
      }

      // Validate file size (20MB limit)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 20MB limit');
      }

      // Generate S3 path for answer sheet
      const s3Path = this.generateEvaluationS3Path(breadcrumbs, subjectName, 'AnswerSheet');
      const fileName = `${studentUsername}.pdf`;
      const s3Key = `${teacherUsername}/${s3Path}/${fileName}`;

      // Upload file to S3
      const uploadResult = await s3Service.uploadFile(file, s3Key);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file to S3');
      }

      // Extract term name from breadcrumbs
      const termName = breadcrumbs.find(crumb => crumb.toLowerCase().includes('term'));
      if (!termName) {
        throw new Error('Could not extract term name from breadcrumbs');
      }

      // Update answer sheet metadata via API Gateway
      const apiResult = await evaluationApiService.updateAnswerSheet(
        studentUsername,
        termName,
        subjectName,
        uploadResult.location || `s3://${s3Service.bucketName}/${s3Key}`,
        user
      );

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Failed to update answer sheet metadata');
      }

      return {
        success: true,
        s3Key,
        s3Url: uploadResult.location,
        apiUpdateResult: apiResult,
        message: `Answer sheet uploaded successfully for student ${studentUsername}`
      };

    } catch (error) {
      console.error('Error uploading answer sheet:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload answer sheet'
      };
    }
  }

  // Get student evaluation metadata (placeholder for future API implementation)
  async getStudentEvaluationData(studentUsername, termName, subjectName, user) {
    try {
      const evaluationApiService = await this.getEvaluationApiService();
      
      // Get student data from API
      const result = await evaluationApiService.getStudentData(studentUsername, user);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get student data'
        };
      }

      // Extract the class from breadcrumbs or user context
      const classNumber = this.extractClassFromContext(user);
      const normalizedTermName = termName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      
      // Navigate to the evaluation data path
      const evaluationPath = `personalized_info.${classNumber}.${normalizedTermName}.${subjectName}`;
      const evaluationData = this.getNestedProperty(result.data, evaluationPath);
      
      if (!evaluationData) {
        return {
          maximum_marks: 0,
          marking_scheme_s3_path: ''
        };
      }

      return {
        maximum_marks: evaluationData.marks_metadata?.maximum_marks?.value || 0,
        marking_scheme_s3_path: evaluationData.marking_scheme_metadata?.marking_scheme_s3_path || ''
      };

    } catch (error) {
      console.error('Error getting student evaluation data:', error);
      return {
        maximum_marks: 0,
        marking_scheme_s3_path: ''
      };
    }
  }

  // Helper method to extract class from user context
  extractClassFromContext(user) {
    // Try to extract from current URL or context
    if (typeof window !== 'undefined' && window.location) {
      const pathMatch = window.location.pathname.match(/class-(\d+)/);
      if (pathMatch) {
        return `CLASS${pathMatch[1]}`;
      }
    }
    
    // Fallback to a default or extract from user data
    return 'CLASS9'; // Default fallback
  }

  // Helper method to get nested property from object
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Export evaluation data (for future use)
  exportEvaluationData(classNumber, subject, termId, students) {
    try {
      const exportData = {
        class: classNumber,
        subject,
        term: termId,
        exportDate: new Date().toISOString(),
        students: students.map(student => ({
          rollNumber: student.rollNumber,
          name: student.name,
          section: student.section,
          status: student.status
        }))
      };
      
      return {
        success: true,
        data: exportData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to export data'
      };
    }
  }
}

// Export singleton instance
const evaluationService = new EvaluationService();
export default evaluationService;