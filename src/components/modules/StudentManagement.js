import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import studentApiService from '../../services/studentApiService';
import '../../styles/StudentManagement.css';

const StudentManagement = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [sections, setSections] = useState([]);
  
  // Bulk operations state
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [csvStudents, setCsvStudents] = useState([]);
  const [selectedCsvStudents, setSelectedCsvStudents] = useState(new Set());
  const [csvSelectAll, setCsvSelectAll] = useState(false);
  const fileInputRef = useRef(null);
  
  // Single student form state
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [singleStudentForm, setSingleStudentForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    section: '',
    rollNumber: ''
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const cleanClassNumber = classNumber.replace('class-', '');
      console.log('Loading students for class:', cleanClassNumber);
      console.log('User object:', user);
      
      const result = await studentApiService.getStudents(cleanClassNumber, user);
      console.log('API result:', result);
      
      if (result.success) {
        const studentsData = result.students || [];
        setStudents(studentsData);
        console.log('Loaded students:', studentsData.length);
        
        // Extract unique sections
        const uniqueSections = [...new Set(studentsData.map(student => student.section))].filter(Boolean).sort();
        setSections(uniqueSections);
        console.log('Available sections:', uniqueSections);
      } else {
        const errorMessage = result.error || 'Failed to load students';
        console.error('Failed to load students:', errorMessage);
        setError(errorMessage);
        setStudents([]);
        setSections([]);
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setError(`Network error: ${err.message || 'Unknown error occurred'}`);
      setStudents([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [classNumber, user]);

  const filterStudentsBySection = useCallback(() => {
    if (!selectedSection) {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(students.filter(student => student.section === selectedSection));
    }
    setSelectedStudents(new Set());
    setSelectAll(false);
  }, [students, selectedSection]);

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, 'Student Management']);
  }, [classNumber, updateBreadcrumbs]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    filterStudentsBySection();
  }, [filterStudentsBySection]);

  const clearMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
  };

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  const handleSelectStudent = (username) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(username)) {
      newSelected.delete(username);
    } else {
      newSelected.add(username);
    }
    setSelectedStudents(newSelected);
    
    // Update select all checkbox
    setSelectAll(newSelected.size === filteredStudents.length && filteredStudents.length > 0);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      setSelectedStudents(new Set(filteredStudents.map(student => student.username)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent({
      ...student
    });
  };

  const convertDateToDisplay = (dateStr) => {
    if (!dateStr) return '';
    
    // If already in DD-MM-YYYY format, return as is
    if (studentApiService.validateDateFormat(dateStr)) {
      return dateStr;
    }
    
    // If in YYYY-MM-DD format, convert to DD-MM-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    
    return dateStr;
  };

  const convertDateForEdit = (dateStr) => {
    if (!dateStr) return '';
    
    // Convert DD-MM-YYYY to YYYY-MM-DD for HTML date input
    if (studentApiService.validateDateFormat(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    }
    
    return dateStr;
  };

  /**
   * Date Format Conversion Strategy:
   * 
   * The system has different date format requirements at different stages:
   * 1. HTML date input provides: YYYY-MM-DD
   * 2. Internal validation expects: DD-MM-YYYY
   * 3. Backend API expects: YYYY-MM-DD
   * 
   * Flow: HTML Input (YYYY-MM-DD) -> Validation (DD-MM-YYYY) -> API (YYYY-MM-DD)
   */

  const convertDateFromEdit = (dateStr) => {
    if (!dateStr) return '';
    
    // Convert YYYY-MM-DD to DD-MM-YYYY for validation
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    
    return dateStr;
  };

  const convertDateForAPI = (dateStr) => {
    if (!dateStr) return '';
    
    // Convert DD-MM-YYYY back to YYYY-MM-DD for API
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    }
    
    return dateStr;
  };

  // Convert date from DD-MM-YYYY to YYYY-MM-DD format for bulk CSV operations
  const convertDateForBulkAPI = (dateStr) => {
    if (!dateStr) return '';
    
    console.log('🔄 convertDateForBulkAPI called with:', dateStr);
    
    // Convert DD-MM-YYYY to YYYY-MM-DD for API
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      const converted = `${year}-${month}-${day}`;
      console.log('✅ Bulk date converted:', dateStr, '->', converted);
      return converted;
    }
    
    console.log('❌ Bulk date format not recognized, returning as-is:', dateStr);
    return dateStr;
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;

    // Convert date format for validation (YYYY-MM-DD to DD-MM-YYYY)
    const studentToValidate = {
      ...editingStudent,
      dateOfBirth: convertDateFromEdit(editingStudent.dateOfBirth)
    };

    const validation = studentApiService.validateStudentData(studentToValidate);
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // Convert date for API (DD-MM-YYYY to YYYY-MM-DD)
    const studentDataForAPI = {
      ...editingStudent,
      dateOfBirth: convertDateForAPI(studentToValidate.dateOfBirth)
    };

    setLoading(true);
    try {
      console.log('Updating student:', studentDataForAPI);
      const result = await studentApiService.updateStudents(studentDataForAPI, user);
      console.log('Update result:', result);
      
      if (result.success) {
        if (result.isFireAndForget) {
          showSuccess('Student update process started. The list will update shortly.');
          setTimeout(() => loadStudents(), 2000);
        } else {
          showSuccess('Student updated successfully!');
          await loadStudents();
        }
        setEditingStudent(null);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        console.error('Update failed:', errorMessage);
        showError(`Failed to update student: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Update error:', err);
      showError(`Network error occurred while updating student: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };



  const handleBulkDelete = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student to delete.');
      return;
    }

    const selectedUsernames = Array.from(selectedStudents);
    const selectedStudentsList = filteredStudents.filter(student => 
      selectedUsernames.includes(student.username)
    );
    const studentNames = selectedStudentsList.map(s => `${s.firstName} ${s.lastName}`).join('\n');
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete these ${selectedStudents.size} selected students? This action cannot be undone.\n\nStudents:\n${studentNames}`
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      const deletionsData = selectedUsernames.map(username => ({ username }));
      const result = await studentApiService.deleteStudents(deletionsData, user);
      
      if (result.success) {
        if (result.isFireAndForget) {
          showSuccess('Selected students are being deleted. The list will update shortly.');
          setTimeout(() => loadStudents(), 2000);
        } else {
          showSuccess(`${selectedStudents.size} students deleted successfully!`);
          await loadStudents();
        }
        setSelectedStudents(new Set());
        setSelectAll(false);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        showError(`Failed to delete students: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      showError(`Network error occurred while deleting students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'firstName' || field === 'lastName') {
      // Only allow letters and spaces
      const textValue = value.replace(/[^a-zA-Z\s]/g, '');
      setEditingStudent(prev => ({ ...prev, [field]: textValue }));
    } else if (field === 'rollNumber') {
      // Allow alphanumeric characters and common separators
      const rollValue = value.replace(/[^a-zA-Z0-9\-_]/g, '');
      setEditingStudent(prev => ({ ...prev, [field]: rollValue }));
    } else {
      setEditingStudent(prev => ({ ...prev, [field]: value }));
    }
  };

  // CSV Upload Functions
  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const parseResult = studentApiService.parseCSVData(csv);
        
        if (!parseResult.success) {
          showError(`CSV parsing failed: ${parseResult.error}`);
          return;
        }

        if (parseResult.errors.length > 0) {
          const errorMessage = `CSV validation issues:\n${parseResult.errors.join('\n')}`;
          if (parseResult.students.length > 0) {
            showError(`${errorMessage}\n\nProceeding with ${parseResult.students.length} valid students.`);
          } else {
            showError(errorMessage);
            return;
          }
        }

        if (parseResult.students.length > 100) {
          showError(`Cannot upload more than 100 students at once. Your CSV contains ${parseResult.students.length} students.`);
          return;
        }

        const studentsWithIds = parseResult.students.map(student => ({
          ...student,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        setCsvStudents(studentsWithIds);
        setSelectedCsvStudents(new Set());
        setCsvSelectAll(false);
        
        showSuccess(`Successfully loaded ${studentsWithIds.length} students from CSV. Review and create them below.`);
      };
      reader.readAsText(file);
    } else {
      showError('Please select a valid CSV file');
    }
    event.target.value = '';
  };

  const downloadSampleCSV = () => {
    const csvContent = studentApiService.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCsvSelectStudent = (studentId) => {
    const newSelected = new Set(selectedCsvStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedCsvStudents(newSelected);
    setCsvSelectAll(newSelected.size === csvStudents.length && csvStudents.length > 0);
  };

  const handleCsvSelectAll = () => {
    const newSelectAll = !csvSelectAll;
    setCsvSelectAll(newSelectAll);
    
    if (newSelectAll) {
      setSelectedCsvStudents(new Set(csvStudents.map(student => student.id)));
    } else {
      setSelectedCsvStudents(new Set());
    }
  };

  const handleCsvInputChange = (studentId, field, value) => {
    setCsvStudents(prevStudents => 
      prevStudents.map(student => {
        if (student.id !== studentId) return student;
        
        let updatedValue = value;
        
        if (field === 'firstName' || field === 'lastName') {
          updatedValue = value.replace(/[^a-zA-Z\s]/g, '');
        } else if (field === 'rollNumber') {
          updatedValue = value.replace(/[^a-zA-Z0-9\-_]/g, '');
        }
        
        return { ...student, [field]: updatedValue };
      })
    );
  };

  const handleCreateSelectedCsvStudents = async () => {
    if (selectedCsvStudents.size === 0) {
      alert('Please select at least one student to create.');
      return;
    }

    const selectedStudentsData = csvStudents.filter(student => 
      selectedCsvStudents.has(student.id)
    );

    setLoading(true);
    try {
      // Debug: Log original students before conversion
      console.log('🔍 CSV DEBUG: Original students before date conversion:', selectedStudentsData.map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        originalDate: s.dateOfBirth
      })));

      // Convert date format for all students before sending to API
      const studentsWithConvertedDates = selectedStudentsData.map(student => {
        const originalDate = student.dateOfBirth;
        const convertedDate = convertDateForBulkAPI(student.dateOfBirth);
        
        console.log(`🔄 CSV Converting date for ${student.firstName} ${student.lastName}: "${originalDate}" -> "${convertedDate}"`);
        
        return {
          ...student,
          dateOfBirth: convertedDate
        };
      });

      // Debug: Log final converted students
      console.log('✅ CSV DEBUG: Final students with converted dates:', studentsWithConvertedDates.map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        convertedDate: s.dateOfBirth
      })));

      const cleanClassNumber = classNumber.replace('class-', '');
      const result = await studentApiService.createStudents(studentsWithConvertedDates, user, cleanClassNumber);
      
      if (result.success) {
        if (result.isFireAndForget) {
          showSuccess('Bulk student creation process started. The student list will reflect changes once processing is complete. You can refresh the data later.');
          setCsvStudents([]);
          setSelectedCsvStudents(new Set());
          setCsvSelectAll(false);
          setTimeout(() => loadStudents(), 3000);
        } else {
          showSuccess(`${selectedStudentsData.length} students created successfully!`);
          setCsvStudents([]);
          setSelectedCsvStudents(new Set());
          setCsvSelectAll(false);
          await loadStudents();
        }
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        showError(`Failed to create students: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Create students error:', err);
      showError(`Network error occurred while creating students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Single Student Form Functions
  const handleSingleFormChange = (field, value) => {
    let updatedValue = value;
    
    if (field === 'firstName' || field === 'lastName') {
      updatedValue = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (field === 'rollNumber') {
      updatedValue = value.replace(/[^a-zA-Z0-9\-_]/g, '');
    }
    
    setSingleStudentForm(prev => ({ ...prev, [field]: updatedValue }));
  };

  const handleCreateSingleStudent = async () => {
    // Validate form
    if (!singleStudentForm.firstName.trim() || !singleStudentForm.lastName.trim() || 
        !singleStudentForm.dateOfBirth || !singleStudentForm.section.trim() || 
        !singleStudentForm.rollNumber.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    // Convert date for validation (YYYY-MM-DD to DD-MM-YYYY)
    const studentDataForValidation = {
      ...singleStudentForm,
      dateOfBirth: convertDateFromEdit(singleStudentForm.dateOfBirth)
    };

    const validation = studentApiService.validateStudentData(studentDataForValidation);
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // Convert date for API (DD-MM-YYYY to YYYY-MM-DD)
    const studentDataForAPI = {
      ...singleStudentForm,
      dateOfBirth: convertDateForAPI(studentDataForValidation.dateOfBirth)
    };

    setLoading(true);
    try {
      const cleanClassNumber = classNumber.replace('class-', '');
      const result = await studentApiService.createStudents(studentDataForAPI, user, cleanClassNumber);
      
      if (result.success) {
        if (result.isFireAndForget) {
          showSuccess('Student creation process started. The student list will reflect changes once processing is complete.');
          setSingleStudentForm({ firstName: '', lastName: '', dateOfBirth: '', section: '', rollNumber: '' });
          setTimeout(() => loadStudents(), 2000);
        } else {
          showSuccess('Student created successfully!');
          setSingleStudentForm({ firstName: '', lastName: '', dateOfBirth: '', section: '', rollNumber: '' });
          await loadStudents();
        }
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        showError(`Failed to create student: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Create student error:', err);
      showError(`Network error occurred while creating student: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="student-management-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading students for Class {classNumber.replace('class-', '')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-management-container">
      <h2>Student Management</h2>
      
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => { clearMessages(); loadStudents(); }} className="retry-btn">Retry</button>
        </div>
      )}

      {successMessage && (
        <div className="success-banner">
          <p>{successMessage}</p>
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}

      <div className="top-actions">
        <button 
          onClick={loadStudents}
          disabled={loading}
          className="refresh-icon-btn"
          title="Refresh Data"
        >
          {loading ? '↻' : '🔄'}
        </button>
        <button 
          onClick={() => setShowBulkOperations(!showBulkOperations)}
          className="bulk-create-btn"
        >
          {showBulkOperations ? 'Hide' : ''} Bulk Create
        </button>
      </div>

      {/* Single Student Form */}
      {showSingleForm && (
        <div className="single-student-form">
          <h3>Add Single Student</h3>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={singleStudentForm.firstName}
                onChange={(e) => handleSingleFormChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={singleStudentForm.lastName}
                onChange={(e) => handleSingleFormChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth * (DD-MM-YYYY)</label>
              <input
                type="date"
                value={singleStudentForm.dateOfBirth}
                onChange={(e) => handleSingleFormChange('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Section *</label>
              <input
                type="text"
                value={singleStudentForm.section}
                onChange={(e) => handleSingleFormChange('section', e.target.value)}
                placeholder="Enter section (e.g., A, B, C)"
                maxLength="5"
              />
            </div>
            <div className="form-group">
              <label>Roll Number *</label>
              <input
                type="text"
                value={singleStudentForm.rollNumber}
                onChange={(e) => handleSingleFormChange('rollNumber', e.target.value)}
                placeholder="Enter roll number"
                maxLength="10"
              />
            </div>
            <div className="form-group">
              <button 
                onClick={handleCreateSingleStudent}
                disabled={loading}
                className="create-btn"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations */}
      {showBulkOperations && (
        <div className="bulk-operations">
          <h3>Bulk Operations</h3>
          
          <div className="upload-section">
            <div className="upload-controls">
              <button onClick={downloadSampleCSV} className="download-sample-btn">
                Download Sample CSV
              </button>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="upload-btn"
              >
                Upload CSV File
              </button>
            </div>
            <p className="csv-format-info">
              CSV Format: FirstName, LastName, DateOfBirth (DD-MM-YYYY), Section, RollNumber
            </p>
          </div>

          {csvStudents.length > 0 && (
            <div className="csv-review">
              <h4>Review CSV Data ({csvStudents.length} students loaded)</h4>
              
              <div className="csv-actions">
                <button 
                  onClick={handleCreateSelectedCsvStudents}
                  disabled={selectedCsvStudents.size === 0 || loading}
                  className="create-selected-btn"
                >
                  Create Selected Students ({selectedCsvStudents.size})
                </button>
                <button 
                  onClick={() => { setCsvStudents([]); setSelectedCsvStudents(new Set()); setCsvSelectAll(false); }}
                  className="clear-csv-btn"
                >
                  Clear CSV Data
                </button>
              </div>

              <div className="csv-table-container">
                <table className="csv-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={csvSelectAll}
                          onChange={handleCsvSelectAll}
                        />
                      </th>
                      <th>First Name</th>
                      <th>Last Name</th>
                      <th>Date of Birth</th>
                      <th>Section</th>
                      <th>Roll Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedCsvStudents.has(student.id)}
                            onChange={() => handleCsvSelectStudent(student.id)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.firstName}
                            onChange={(e) => handleCsvInputChange(student.id, 'firstName', e.target.value)}
                            className="csv-edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.lastName}
                            onChange={(e) => handleCsvInputChange(student.id, 'lastName', e.target.value)}
                            className="csv-edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.dateOfBirth}
                            onChange={(e) => handleCsvInputChange(student.id, 'dateOfBirth', e.target.value)}
                            placeholder="DD-MM-YYYY"
                            className="csv-edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.section}
                            onChange={(e) => handleCsvInputChange(student.id, 'section', e.target.value)}
                            className="csv-edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.rollNumber}
                            onChange={(e) => handleCsvInputChange(student.id, 'rollNumber', e.target.value)}
                            className="csv-edit-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="section-filter">Filter by Section:</label>
          <select
            id="section-filter"
            value={selectedSection}
            onChange={handleSectionChange}
            className="section-filter"
          >
            <option value="">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
        
        <div className="student-count">
          <span>
            Showing {filteredStudents.length} of {students.length} students
            {selectedStudents.size > 0 && ` (${selectedStudents.size} selected)`}
          </span>
        </div>
      </div>

      {/* Always show table with header */}
      <div className="table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="master-checkbox"
                  disabled={filteredStudents.length === 0}
                />
              </th>
              <th>Username</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Date of Birth</th>
              <th>Section</th>
              <th>Roll Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-students-row">
                  <div className="no-students">
                    <p>
                      {selectedSection 
                        ? `No students found in section "${selectedSection}".`
                        : `No students found for Class ${classNumber.replace('class-', '')}.`
                      }
                    </p>
                    <p>
                      {students.length === 0 
                        ? "You can add students individually or via bulk upload. Refresh to see updates."
                        : "Try selecting a different section or clearing the filter."
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr 
                  key={student.username} 
                  className={selectedStudents.has(student.username) ? 'selected-row' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.username)}
                      onChange={() => handleSelectStudent(student.username)}
                      className="student-checkbox"
                    />
                  </td>
                  <td className="username-cell">{student.username}</td>
                  <td>
                    {editingStudent?.username === student.username ? (
                      <input
                        type="text"
                        value={editingStudent.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      student.firstName
                    )}
                  </td>
                  <td>
                    {editingStudent?.username === student.username ? (
                      <input
                        type="text"
                        value={editingStudent.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      student.lastName
                    )}
                  </td>
                  <td>
                    {editingStudent?.username === student.username ? (
                      <input
                        type="date"
                        value={convertDateForEdit(editingStudent.dateOfBirth)}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      convertDateToDisplay(student.dateOfBirth)
                    )}
                  </td>
                  <td>
                    {editingStudent?.username === student.username ? (
                      <input
                        type="text"
                        value={editingStudent.section}
                        onChange={(e) => handleInputChange('section', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      student.section
                    )}
                  </td>
                  <td>
                    {editingStudent?.username === student.username ? (
                      <input
                        type="text"
                        value={editingStudent.rollNumber}
                        onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      student.rollNumber
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingStudent?.username === student.username ? (
                      <div className="edit-actions">
                        <button 
                          onClick={handleSaveEdit} 
                          className="save-btn"
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit} 
                          className="cancel-btn"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleEditStudent(student)} 
                        className="edit-btn"
                        disabled={loading}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      {filteredStudents.length > 0 && (
        <div className="bulk-actions">
          <button 
            onClick={() => setShowSingleForm(!showSingleForm)}
            className="add-single-btn"
          >
            Add Single Student
          </button>
          <button 
            onClick={handleBulkDelete}
            disabled={selectedStudents.size === 0 || loading}
            className="bulk-action-btn delete-selected-btn"
          >
            Delete Selected Students ({selectedStudents.size})
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;