import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const { breadcrumbs, navigateToBreadcrumb, selectedClass } = useApp();
  const navigate = useNavigate();

  const handleBreadcrumbClick = (index) => {
    // Update breadcrumbs first
    navigateToBreadcrumb(index);
    
    // Navigate based on breadcrumb level
    if (index === 0 && selectedClass) {
      // Navigate to class dashboard
      navigate(`/dashboard/${selectedClass}`);
    } else if (index === 1 && breadcrumbs[1] && selectedClass) {
      // Navigate to module page - handle specific module mappings
      const moduleName = breadcrumbs[1];
      let moduleRoute = '';
      
      switch (moduleName) {
        case 'Student Registration':
          moduleRoute = 'student-registration';
          break;
        case 'Academics':
          moduleRoute = 'academics';
          break;
        case 'Notification':
          moduleRoute = 'notifications';
          break;
        case 'Holiday Calendar':
          moduleRoute = 'holiday-calendar';
          break;
        case "School's Competency Model":
          moduleRoute = 'competency-model';
          break;
        default:
          // Fallback to lowercase with dashes
          moduleRoute = moduleName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
      }
      
      navigate(`/dashboard/${selectedClass}/${moduleRoute}`);
    } else if (index === 2 && breadcrumbs[2] && selectedClass) {
      // Navigate to subject page for academics
      const subjectName = breadcrumbs[2].toLowerCase().replace(/\s+/g, '-');
      navigate(`/dashboard/${selectedClass}/academics/${subjectName}`);
    }
  };

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumb-container">
      <div className="breadcrumb-content">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index === breadcrumbs.length - 1 ? (
              <span className="breadcrumb-current">{crumb}</span>
            ) : (
              <>
                <button
                  className="breadcrumb-link"
                  onClick={() => handleBreadcrumbClick(index)}
                  type="button"
                >
                  {crumb}
                </button>
                <span className="breadcrumb-separator">/</span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default Breadcrumb;