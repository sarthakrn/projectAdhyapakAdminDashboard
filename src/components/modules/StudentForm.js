import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import studentApiService from '../../services/studentApiService';
import '../../styles/StudentForm.css';

const StudentForm = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, 'Bulk Operations']);
  }, [classNumber, updateBreadcrumbs]);

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

        const cleanClassNumber = classNumber.replace('class-', '');
        const studentsWithClass = parseResult.students.map(student => ({
          ...student,
          className: student.className || cleanClassNumber,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        setStudents(studentsWithClass);
        setSelectedStudents(new Set());
        setSelectAll(false);
        
        console.log('CSV parsed successfully:', {
          totalRows: parseResult.totalRows,
          validRows: parseResult.validRows,
          invalidRows: parseResult.invalidRows,
          loadedStudents: studentsWithClass.length
        });
        
        showSuccess(`Successfully loaded ${studentsWithClass.length} students from CSV. You can now review and create them.`);
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

  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
    
    setSelectAll(newSelected.size === students.length && students.length > 0);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      setSelectedStudents(new Set(students.map(student => student.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleInputChange = (studentId, field, value) => {
    setStudents(prevStudents => 
      prevStudents.map(student => {
        if (student.id !== studentId) return student;
        
        let updatedValue = value;
        
        if (field === 'phoneNumber') {
          updatedValue = value.replace(/\D/g, '');
          if (updatedValue.length > 10) return student;
        } else if (field === 'firstName' || field === 'lastName') {
          updatedValue = value.replace(/[^a-zA-Z\s]/g, '');
        }
        
        return { ...student, [field]: updatedValue };
      })
    );
  };

  const addEmptyStudent = () => {
    const cleanClassNumber = classNumber.replace('class-', '');
    const newStudent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phoneNumber: '',
      className: cleanClassNumber,
      section: ''
    };
    setStudents(prev => [...prev, newStudent]);
    clearMessages();
  };

  const removeStudent = (studentId) => {
    setStudents(prev => prev.filter(student => student.id !== studentId));
    setSelectedStudents(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(studentId);
      return newSelected;
    });
    setSelectAll(false);
  };

  const handleBulkCreate = async () => {
    if (students.length === 0) {
      showError('Please add students to create.');
      return;
    }

    if (students.length > 100) {
      showError('Cannot create more than 100 students at once.');
      return;
    }

    const validation = studentApiService.validateStudentsBatch(students);
    
    if (validation.hasErrors) {
      const errorMessages = validation.invalidStudents.map(
        item => `Row ${item.index + 1}: ${item.validation.errors.join(', ')}`
      );
      
      if (validation.validStudents.length === 0) {
        showError(`All students have validation errors:\n${errorMessages.join('\n')}`);
        return;
      } else {
        const proceedConfirm = window.confirm(
          `${validation.invalidStudents.length} students have validation errors and will be skipped:\n${errorMessages.join('\n')}\n\nProceed with ${validation.validStudents.length} valid students?`
        );
        if (!proceedConfirm) return;
      }
    }

    const studentsToCreate = validation.validStudents.length > 0 ? validation.validStudents : students;
    
    const studentNames = studentsToCreate.map(s => `${s.firstName} ${s.lastName} (${s.section})`).join('\n');
    const confirmCreate = window.confirm(
      `Create ${studentsToCreate.length} students in the system?\n\nStudents to create:\n${studentNames.substring(0, 500)}${studentNames.length > 500 ? '...' : ''}`
    );
    
    if (!confirmCreate) return;

    setLoading(true);
    clearMessages();
    
    try {
      console.log('Creating students:', studentsToCreate);
      console.log('User object:', user);
      
      const result = await studentApiService.createStudents(studentsToCreate, user);
      console.log('Create result:', result);
      
      if (result.success) {
        showSuccess(`Successfully created ${studentsToCreate.length} students!`);
        setStudents([]);
        setSelectedStudents(new Set());
        setSelectAll(false);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        console.error('Create failed:', errorMessage);
        showError(`Failed to create students: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Create error:', err);
      showError(`Network error occurred while creating students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedStudents);
    if (selectedIds.length === 0) {
      showError('Please select students to delete.');
      return;
    }

    if (selectedIds.length > 100) {
      showError('Cannot delete more than 100 students at once.');
      return;
    }

    const selectedStudentsList = students.filter(student => selectedIds.includes(student.id));
    
    // Check if selected students have usernames (indicating they exist in the backend)
    const studentsWithUsernames = selectedStudentsList.filter(student => student.username);
    
    if (studentsWithUsernames.length === 0) {
      // Just remove from local list if no usernames (not yet created)
      const confirmRemove = window.confirm(
        `Remove ${selectedIds.length} students from the current list? (These students haven't been created yet)`
      );
      
      if (!confirmRemove) return;
      
      setStudents(prev => prev.filter(student => !selectedIds.includes(student.id)));
      setSelectedStudents(new Set());
      setSelectAll(false);
      showSuccess(`Removed ${selectedIds.length} students from the list.`);
      return;
    }

    const studentNames = studentsWithUsernames.map(s => `${s.firstName} ${s.lastName} (${s.username})`).join('\n');
    const confirmDelete = window.confirm(
      `⚠️ WARNING: This will permanently delete ${studentsWithUsernames.length} students from the system.\n\nStudents to delete:\n${studentNames}\n\nThis action cannot be undone. Are you sure you want to proceed?`
    );
    
    if (!confirmDelete) return;

    const secondConfirm = window.confirm(
      `Please confirm again: DELETE ${studentsWithUsernames.length} students permanently?`
    );
    
    if (!secondConfirm) return;

    setLoading(true);
    clearMessages();
    
    try {
      const deletionsData = studentsWithUsernames.map(student => ({
        username: student.username
      }));
      
      console.log('Deleting students:', deletionsData);
      console.log('User object:', user);
      
      const result = await studentApiService.deleteStudents(deletionsData, user);
      console.log('Delete result:', result);
      
      if (result.success) {
        setStudents(prev => prev.filter(student => !selectedIds.includes(student.id)));
        setSelectedStudents(new Set());
        setSelectAll(false);
        showSuccess(`Successfully deleted ${studentsWithUsernames.length} students from the system!`);
      } else {
        const errorMessage = result.error || 'Unknown error occurred';
        console.error('Delete failed:', errorMessage);
        showError(`Failed to delete students: ${errorMessage}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      showError(`Network error occurred while deleting students: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-form-container">
      <h2>Bulk Student Operations</h2>
      
      {error && (
        <div className="message-banner error-banner">
          <p>{error}</p>
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}
      
      {successMessage && (
        <div className="message-banner success-banner">
          <p>{successMessage}</p>
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}

      <div className="bulk-actions">
        <div className="bulk-upload-section">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleBulkUpload}
            style={{ display: 'none' }}
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current.click()}
            className="bulk-upload-btn"
            disabled={loading}
          >
            Upload CSV File
          </button>
          <button 
            type="button" 
            onClick={downloadSampleCSV}
            className="download-sample-btn"
            disabled={loading}
          >
            Download Sample CSV
          </button>
          <button 
            type="button" 
            onClick={addEmptyStudent}
            className="add-empty-btn"
            disabled={loading}
          >
            Add Empty Row
          </button>
        </div>
      </div>

      <div className="student-count-info">
        <span>
          Total Students: {students.length} / 100 max
          {selectedStudents.size > 0 && ` (${selectedStudents.size} selected)`}
        </span>
      </div>

      {students.length > 0 && (
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="master-checkbox"
                  />
                  Select
                </th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Date of Birth</th>
                <th>Phone Number</th>
                <th>Class</th>
                <th>Section</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className={selectedStudents.has(student.id) ? 'selected-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                      className="student-checkbox"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.firstName}
                      onChange={(e) => handleInputChange(student.id, 'firstName', e.target.value)}
                      placeholder="First Name"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.lastName}
                      onChange={(e) => handleInputChange(student.id, 'lastName', e.target.value)}
                      placeholder="Last Name"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={student.dateOfBirth}
                      onChange={(e) => handleInputChange(student.id, 'dateOfBirth', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="tel"
                      value={student.phoneNumber}
                      onChange={(e) => handleInputChange(student.id, 'phoneNumber', e.target.value)}
                      placeholder="10 digits"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      title="Please enter exactly 10 digits"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.className}
                      onChange={(e) => handleInputChange(student.id, 'className', e.target.value)}
                      placeholder="Class"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.section}
                      onChange={(e) => handleInputChange(student.id, 'section', e.target.value)}
                      placeholder="Section"
                      required
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      className="remove-btn"
                      disabled={loading}
                      title="Remove this student"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length === 0 && !error && (
        <div className="empty-state">
          <p>No students added yet.</p>
          <p>Upload a CSV file with student data or add individual students using the "Add Empty Row" button.</p>
          <p><strong>Note:</strong> Maximum 100 students can be processed at once.</p>
        </div>
      )}

      {students.length > 0 && (
        <div className="global-actions">
          <button 
            type="button" 
            onClick={handleBulkCreate} 
            className="global-action-btn create-btn"
            disabled={loading || students.length === 0}
          >
            {loading ? 'Creating...' : `Create ${students.length} Students`}
          </button>
          <button 
            type="button" 
            onClick={handleBulkDelete} 
            className="global-action-btn delete-btn"
            disabled={loading || selectedStudents.size === 0}
          >
            {loading ? 'Processing...' : `Delete Selected (${selectedStudents.size})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentForm;