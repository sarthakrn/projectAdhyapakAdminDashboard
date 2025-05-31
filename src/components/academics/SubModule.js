import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import FileManager from '../files/FileManager';
import './SubModule.css';

const SubModule = () => {
  const { classNumber, subject, subModule } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    const subjectName = subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const subModuleName = subModule
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, 'Academics', subjectName, subModuleName]);
  }, [classNumber, subject, subModule, updateBreadcrumbs]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const subModuleName = subModule
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const getSubModuleInfo = (subModuleId) => {
    const subModuleMap = {
      'syllabus': {
        icon: '📋',
        description: 'Complete syllabus and curriculum documents',
        color: 'rgba(0, 123, 255, 0.8)'
      },
      'academic-material': {
        icon: '📚',
        description: 'Study materials, textbooks, and reference documents',
        color: 'rgba(40, 167, 69, 0.8)'
      },
      'assignments': {
        icon: '📝',
        description: 'Practice assignments, homework, and exercises',
        color: 'rgba(253, 126, 20, 0.8)'
      },
      'notes': {
        icon: '📖',
        description: 'Study notes, important points, and summaries',
        color: 'rgba(220, 53, 69, 0.8)'
      },
      'sample-papers': {
        icon: '📄',
        description: 'Previous year papers, sample tests, and mock exams',
        color: 'rgba(111, 66, 193, 0.8)'
      }
    };

    return subModuleMap[subModuleId] || {
      icon: '📁',
      description: 'Documents and materials',
      color: 'rgba(108, 117, 125, 0.8)'
    };
  };

  const subModuleInfo = getSubModuleInfo(subModule);

  return (
    <div className="sub-module-container">
      <div className="sub-module-header">
        <div className="sub-module-header-content">
          <div 
            className="sub-module-icon-large"
            style={{ backgroundColor: subModuleInfo.color }}
          >
            {subModuleInfo.icon}
          </div>
          
          <div className="sub-module-header-text">
            <h1 className="sub-module-title">
              {subModuleName}
            </h1>
            <p className="sub-module-subtitle">
              Class{classNumber.replace('class-', '')} - {subjectName}
            </p>
            <p className="sub-module-description">
              {subModuleInfo.description}
            </p>
          </div>
        </div>
      </div>

      <div className="sub-module-content">
        <FileManager
          classNumber={classNumber}
          module="Academics"
          subject={subjectName}
          subSection={subModuleName}
          title={`${subModuleName} Files`}
        />
      </div>
    </div>
  );
};

export default SubModule;