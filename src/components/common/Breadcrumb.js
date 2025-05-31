import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const { breadcrumbs, navigateToBreadcrumb } = useApp();
  const navigate = useNavigate();

  const handleBreadcrumbClick = (index) => {
    // Update breadcrumbs first
    navigateToBreadcrumb(index);
    
    // Navigate based on breadcrumb level
    if (index === 0) {
      // Navigate to class selector page
      navigate('/class-selector');
    } else if (index === 1 && breadcrumbs[1]) {
      // Extract class number from breadcrumb (e.g., "Class9" -> "class-9")
      const classBreadcrumb = breadcrumbs[1];
      if (classBreadcrumb.startsWith('Class')) {
        const classNum = classBreadcrumb.replace('Class', '');
        navigate(`/class-selector/class-${classNum}`);
      }
    } else if (index === 2 && breadcrumbs[2]) {
      // Navigate to module page - handle specific module mappings
      const classBreadcrumb = breadcrumbs[1];
      const moduleName = breadcrumbs[2];
      
      if (classBreadcrumb && classBreadcrumb.startsWith('Class')) {
        const classNum = classBreadcrumb.replace('Class', '');
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
        
        navigate(`/class-selector/class-${classNum}/${moduleRoute}`);
      }
    } else if (index === 3 && breadcrumbs[3]) {
      // Navigate to subject page for academics
      const classBreadcrumb = breadcrumbs[1];
      const subjectName = breadcrumbs[3].toLowerCase().replace(/\s+/g, '-');
      
      if (classBreadcrumb && classBreadcrumb.startsWith('Class')) {
        const classNum = classBreadcrumb.replace('Class', '');
        navigate(`/class-selector/class-${classNum}/academics/${subjectName}`);
      }
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