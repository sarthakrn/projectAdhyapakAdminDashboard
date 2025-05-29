import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import '../../styles/StudentForm.css';

const StudentForm = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();
  
  let idCounter = 0;
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${++idCounter}`;
  };

  useEffect(() => {
    updateBreadcrumbs([`Class ${classNumber}`, 'Student Registration']);
  }, [classNumber, updateBreadcrumbs]);

  const [students, setStudents] = useState([
    {
      id: generateUniqueId(),
      firstName: '',
      lastName: '',
      phoneNumber: '',
      username: '',
      password: '',
      selected: false
    }
  ]);
  const [selectAll, setSelectAll] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (studentId, field, value) => {
    // Phone number validation: only digits, exactly 10 characters
    if (field === 'phoneNumber') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 10) return;
      value = numericValue;
    }

    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId 
          ? { ...student, [field]: value }
          : student
      )
    );
  };

  const handleSelectStudent = (studentId) => {
    setStudents(prevStudents => {
      const updatedStudents = prevStudents.map(student => 
        student.id === studentId 
          ? { ...student, selected: !student.selected }
          : student
      );
      
      // Update master checkbox state
      const allSelected = updatedStudents.every(student => student.selected);
      setSelectAll(allSelected);
      
      return updatedStudents;
    });
  };

  const handleMasterCheckbox = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setStudents(prevStudents => 
      prevStudents.map(student => ({ ...student, selected: newSelectAll }))
    );
  };

  const addStudent = () => {
    const newStudent = {
      id: generateUniqueId(),
      firstName: '',
      lastName: '',
      phoneNumber: '',
      username: '',
      password: '',
      selected: false
    };
    setStudents(prevStudents => [...prevStudents, newStudent]);
  };

  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const newStudents = [];
        const skippedRecords = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const phoneNumber = values[headers.indexOf('phoneNumber')] || '';
            
            // Validate phone number: must be exactly 10 digits
            const numericPhone = phoneNumber.replace(/\D/g, '');
            if (numericPhone.length !== 10 || phoneNumber !== numericPhone) {
              skippedRecords.push(`Row ${i + 1}: Invalid phone number "${phoneNumber}" - must be exactly 10 digits`);
              continue;
            }
            
            const student = {
              id: generateUniqueId(),
              firstName: values[headers.indexOf('firstName')] || '',
              lastName: values[headers.indexOf('lastName')] || '',
              phoneNumber: numericPhone,
              username: '',
              password: '',
              selected: false
            };
            newStudents.push(student);
          }
        }
        
        if (newStudents.length > 0) {
          setStudents(prevStudents => [...prevStudents, ...newStudents]);
          let message = `Successfully uploaded ${newStudents.length} students from CSV`;
          if (skippedRecords.length > 0) {
            message += `\n\nSkipped ${skippedRecords.length} records due to validation errors:\n${skippedRecords.join('\n')}`;
          }
          alert(message);
        } else if (skippedRecords.length > 0) {
          alert(`No valid records found. All records skipped due to validation errors:\n${skippedRecords.join('\n')}`);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid CSV file');
    }
    event.target.value = '';
  };

  const downloadSampleCSV = () => {
    const csvContent = "firstName,lastName,phoneNumber\nJohn,Doe,1234567890\nJane,Smith,0987654321";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSelectedStudents = () => {
    return students.filter(student => student.selected);
  };

  const addSelectedStudents = () => {
    const selectedStudents = getSelectedStudents();
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to add.');
      return;
    }
    
    // Validate phone numbers for selected students
    const validStudents = [];
    const invalidStudents = [];
    
    selectedStudents.forEach(student => {
      const numericPhone = student.phoneNumber.replace(/\D/g, '');
      if (numericPhone.length === 10 && student.phoneNumber === numericPhone) {
        validStudents.push(student);
      } else {
        invalidStudents.push(student);
      }
    });
    
    if (invalidStudents.length > 0) {
      const invalidList = invalidStudents.map(student => 
        `${student.firstName} ${student.lastName} (${student.phoneNumber || 'empty'})`
      ).join('\n');
      
      if (validStudents.length === 0) {
        alert(`Cannot add students. All selected students have invalid phone numbers:\n${invalidList}\n\nPhone numbers must be exactly 10 digits.`);
        return;
      } else {
        alert(`Warning: ${invalidStudents.length} students skipped due to invalid phone numbers:\n${invalidList}\n\nProceeding with ${validStudents.length} valid students.`);
      }
    }
    
    console.log('Adding selected students:', validStudents);
    alert(`Adding ${validStudents.length} selected students to the system:\n${validStudents.map(student => 
      `${student.firstName} ${student.lastName} - ${student.phoneNumber}`
    ).join('\n')}`);
  };

  const removeSelectedStudents = () => {
    const selectedStudents = getSelectedStudents();
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to remove.');
      return;
    }
    
    const remainingStudents = students.filter(student => !student.selected);
    if (remainingStudents.length === 0) {
      alert('Cannot remove all students. At least one student must remain.');
      return;
    }
    
    setStudents(remainingStudents);
    setSelectAll(false);
    alert(`Removed ${selectedStudents.length} selected students from the system.`);
  };

  const sendSelectedStudentsLoginDetails = () => {
    const selectedStudents = getSelectedStudents();
    if (selectedStudents.length === 0) {
      alert('Please select at least one student to send login details.');
      return;
    }
    console.log('Sending login details to selected students:', selectedStudents);
    alert(`Sending login details to ${selectedStudents.length} selected students:\n${selectedStudents.map(student => 
      `${student.firstName} ${student.lastName} - ${student.phoneNumber}`
    ).join('\n')}`);
  };

  return (
    <div className="student-form-container">
      <h2>Student Registration Form</h2>
      
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
          >
            Bulk Upload CSV
          </button>
          <button 
            type="button" 
            onClick={downloadSampleCSV}
            className="download-sample-btn"
          >
            Download Sample CSV
          </button>
        </div>
      </div>

      <form className="student-form">
        <div className="table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleMasterCheckbox}
                    className="master-checkbox"
                  />
                  Select
                </th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Phone Number</th>
                <th>Username</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className={student.selected ? 'selected-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={student.selected}
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
                      type="tel"
                      value={student.phoneNumber}
                      onChange={(e) => handleInputChange(student.id, 'phoneNumber', e.target.value)}
                      placeholder="Phone Number (10 digits)"
                      maxLength="10"
                      pattern="[0-9]{10}"
                      title="Please enter exactly 10 digits"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={student.username}
                      onChange={(e) => handleInputChange(student.id, 'username', e.target.value)}
                      placeholder="Username"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="password"
                      value={student.password}
                      onChange={(e) => handleInputChange(student.id, 'password', e.target.value)}
                      placeholder="Password"
                      required
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={addStudent} className="add-student-btn">
            Add Student
          </button>
        </div>

        <div className="global-actions">
          <button 
            type="button" 
            onClick={addSelectedStudents} 
            className="global-action-btn add-selected-btn"
          >
            Add Selected Students
          </button>
          <button 
            type="button" 
            onClick={removeSelectedStudents} 
            className="global-action-btn remove-selected-btn"
          >
            Remove Selected Students
          </button>
          <button 
            type="button" 
            onClick={sendSelectedStudentsLoginDetails} 
            className="global-action-btn send-details-btn"
          >
            Send Selected Students Login Details
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;