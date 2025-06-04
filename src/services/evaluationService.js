class EvaluationService {
  constructor() {
    // We'll import studentApiService dynamically to avoid circular dependencies
    this.studentApiService = null;
  }

  async getStudentApiService() {
    if (!this.studentApiService) {
      const { default: studentApiService } = await import('./studentApiService');
      this.studentApiService = studentApiService;
    }
    return this.studentApiService;
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