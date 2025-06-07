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
    
    // Determine if we're in evaluation flow or AI management flow
    const isEvaluationFlow = breadcrumbs.includes('Evaluation');
    const isAIManagementFlow = breadcrumbs.includes("School's AI Management System");
    
    // Navigate based on breadcrumb level and flow type
    if (index === 0) {
      // Dashboard should always go to main landing page
      navigate('/dashboard');
    } else if (index === 1) {
      const secondCrumb = breadcrumbs[1];
      
      if (secondCrumb === 'Evaluation') {
        // Navigate to evaluation landing page
        navigate('/evaluation');
      } else if (secondCrumb === "School's AI Management System") {
        // Navigate to AI management system page
        navigate('/ai-management');
      } else if (secondCrumb && secondCrumb.startsWith('Class')) {
        // Handle direct class navigation (legacy support)
        const classNum = secondCrumb.replace('Class', '').replace(' ', '');
        navigate(`/class-selector/class-${classNum}`);
      }
    } else if (index === 2) {
      const thirdCrumb = breadcrumbs[2];
      
      if (isEvaluationFlow && thirdCrumb && thirdCrumb.startsWith('Class')) {
        // Evaluation flow: Navigate to term selection for this class
        const classNum = thirdCrumb.replace('Class', '').replace(' ', '');
        navigate(`/evaluation/class-${classNum}`);
      } else if (isAIManagementFlow && thirdCrumb && thirdCrumb.startsWith('Class')) {
        // AI Management flow: Navigate to class dashboard
        const classNum = thirdCrumb.replace('Class', '').replace(' ', '');
        navigate(`/class-selector/class-${classNum}`);
      } else if (breadcrumbs[1] && breadcrumbs[1].startsWith('Class')) {
        // Handle module navigation in AI management flow
        const classBreadcrumb = breadcrumbs[1];
        const moduleName = thirdCrumb;
        
        if (classBreadcrumb && classBreadcrumb.startsWith('Class')) {
          const classNum = classBreadcrumb.replace('Class', '').replace(' ', '');
          let moduleRoute = '';
          
          switch (moduleName) {
            case 'Academics':
              moduleRoute = 'academics';
              break;
            case 'Student Management':
              moduleRoute = 'student-management';
              break;
            case 'Timetable':
              moduleRoute = 'timetable';
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
      }
    } else if (index === 3) {
      const fourthCrumb = breadcrumbs[3];
      
      if (isEvaluationFlow && fourthCrumb && fourthCrumb.startsWith('Term')) {
        // Evaluation flow: Navigate to evaluation dashboard
        const classCrumb = breadcrumbs[2];
        const classNum = classCrumb.replace('Class', '').replace(' ', '');
        const termNum = fourthCrumb.replace('Term', '').replace(' ', '').toLowerCase();
        navigate(`/evaluation/class-${classNum}/term${termNum}`);
      } else if (isAIManagementFlow && breadcrumbs[2] === 'Academics') {
        // AI Management flow: Navigate to subject page
        const classBreadcrumb = breadcrumbs[1];
        const subjectName = fourthCrumb.toLowerCase().replace(/\s+/g, '-');
        
        if (classBreadcrumb && classBreadcrumb.startsWith('Class')) {
          const classNum = classBreadcrumb.replace('Class', '').replace(' ', '');
          navigate(`/class-selector/class-${classNum}/academics/${subjectName}`);
        }
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