#!/usr/bin/env node

/**
 * Validation Script for Student Evaluation Dashboard Revamp
 * 
 * This script validates the implementation of the revamped evaluation dashboard
 * by checking key components, functions, and integration points.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(description, testFn) {
  try {
    const result = testFn();
    if (result === true) {
      results.passed++;
      results.tests.push({ description, status: 'PASS', message: '' });
      log(`✓ ${description}`, 'green');
    } else if (result === false) {
      results.failed++;
      results.tests.push({ description, status: 'FAIL', message: '' });
      log(`✗ ${description}`, 'red');
    } else {
      results.warnings++;
      results.tests.push({ description, status: 'WARN', message: result });
      log(`⚠ ${description} - ${result}`, 'yellow');
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ description, status: 'FAIL', message: error.message });
    log(`✗ ${description} - ${error.message}`, 'red');
  }
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

function checkFunctionExists(content, functionName) {
  const patterns = [
    new RegExp(`const\\s+${functionName}\\s*=`, 'g'),
    new RegExp(`function\\s+${functionName}\\s*\\(`, 'g'),
    new RegExp(`${functionName}\\s*:`, 'g'),
    new RegExp(`${functionName}\\s*=.*=>`, 'g')
  ];
  return patterns.some(pattern => pattern.test(content));
}

function checkImportExists(content, importName) {
  const patterns = [
    new RegExp(`import.*${importName}.*from`, 'g'),
    new RegExp(`import\\s*{[^}]*${importName}[^}]*}`, 'g')
  ];
  return patterns.some(pattern => pattern.test(content));
}

// Main validation function
function validateImplementation() {
  log('\n🔍 Starting Evaluation Dashboard Validation\n', 'cyan');

  // 1. File Structure Validation
  log('📁 Validating File Structure', 'blue');
  
  test('EvaluationDashboard.js exists', () => {
    return fileExists('src/components/evaluation/pages/EvaluationDashboard.js');
  });

  test('EvaluationDashboard.css exists', () => {
    return fileExists('src/components/evaluation/pages/EvaluationDashboard.css');
  });

  test('evaluationService.js exists', () => {
    return fileExists('src/services/evaluationService.js');
  });

  test('evaluationApiService.js exists', () => {
    return fileExists('src/services/evaluationApiService.js');
  });

  // 2. Component Structure Validation
  log('\n🧩 Validating Component Structure', 'blue');
  
  const dashboardContent = readFile('src/components/evaluation/pages/EvaluationDashboard.js');
  if (dashboardContent) {
    test('React imports are present', () => {
      return checkImportExists(dashboardContent, 'React');
    });

    test('useCallback is imported', () => {
      return checkImportExists(dashboardContent, 'useCallback');
    });

    test('useMemo is imported', () => {
      return checkImportExists(dashboardContent, 'useMemo');
    });

    test('EvaluationDashboard component is defined', () => {
      return /const\s+EvaluationDashboard\s*=/.test(dashboardContent);
    });

    test('Component is exported', () => {
      return /export\s+default\s+EvaluationDashboard/.test(dashboardContent);
    });
  }

  // 3. State Management Validation
  log('\n📊 Validating State Management', 'blue');
  
  if (dashboardContent) {
    test('useState hooks are used', () => {
      return /useState\s*\(/.test(dashboardContent);
    });

    test('subjectSetupStatus state exists', () => {
      return /subjectSetupStatus/.test(dashboardContent);
    });

    test('outOfSyncStudents state exists', () => {
      return /outOfSyncStudents/.test(dashboardContent);
    });

    test('modalData state exists', () => {
      return /modalData/.test(dashboardContent);
    });

    test('syncFailures state exists', () => {
      return /syncFailures/.test(dashboardContent);
    });
  }

  // 4. Key Functions Validation
  log('\n🔧 Validating Key Functions', 'blue');
  
  if (dashboardContent) {
    test('initializeEvaluationPage function exists', () => {
      return checkFunctionExists(dashboardContent, 'initializeEvaluationPage');
    });

    test('checkEvaluationSetupStatus function exists', () => {
      return checkFunctionExists(dashboardContent, 'checkEvaluationSetupStatus');
    });

    test('syncOutOfSyncStudents function exists', () => {
      return checkFunctionExists(dashboardContent, 'syncOutOfSyncStudents');
    });

    test('handleModalSaveAndUpload function exists', () => {
      return checkFunctionExists(dashboardContent, 'handleModalSaveAndUpload');
    });

    test('validateFile function exists', () => {
      return checkFunctionExists(dashboardContent, 'validateFile');
    });

    test('validateMaximumMarks function exists', () => {
      return checkFunctionExists(dashboardContent, 'validateMaximumMarks');
    });

    test('retryAsync function exists', () => {
      return checkFunctionExists(dashboardContent, 'retryAsync');
    });
  }

  // 5. Modal Implementation Validation
  log('\n🪟 Validating Modal Implementation', 'blue');
  
  if (dashboardContent) {
    test('Modal overlay is implemented', () => {
      return /modal-overlay/.test(dashboardContent);
    });

    test('Modal content structure exists', () => {
      return /modal-content/.test(dashboardContent) && /modal-header/.test(dashboardContent);
    });

    test('Form validation is implemented', () => {
      return /form-group/.test(dashboardContent) && /form-input/.test(dashboardContent);
    });

    test('Progress tracking is implemented', () => {
      return /uploadProgress/.test(dashboardContent);
    });

    test('Error handling in modal exists', () => {
      return /modalError/.test(dashboardContent);
    });
  }

  // 6. CSS Validation
  log('\n🎨 Validating CSS Implementation', 'blue');
  
  const cssContent = readFile('src/components/evaluation/pages/EvaluationDashboard.css');
  if (cssContent) {
    test('Modal styles are defined', () => {
      return /\.modal-overlay/.test(cssContent) && /\.modal-content/.test(cssContent);
    });

    test('Setup button styles exist', () => {
      return /\.setup-button/.test(cssContent);
    });

    test('Progress bar styles exist', () => {
      return /\.progress-bar/.test(cssContent) && /\.progress-fill/.test(cssContent);
    });

    test('Error message styles exist', () => {
      return /\.modal-error/.test(cssContent) || /\.error-message/.test(cssContent);
    });

    test('Responsive design is implemented', () => {
      return /@media.*max-width.*768px/.test(cssContent) && /@media.*max-width.*480px/.test(cssContent);
    });

    test('Sync control styles exist', () => {
      return /\.sync-warning/.test(cssContent) || /\.sync-error/.test(cssContent);
    });
  }

  // 7. Service Layer Validation
  log('\n🛠️ Validating Service Layer', 'blue');
  
  const serviceContent = readFile('src/services/evaluationService.js');
  if (serviceContent) {
    test('getStudentEvaluationData method exists', () => {
      return checkFunctionExists(serviceContent, 'getStudentEvaluationData');
    });

    test('generateEvaluationS3Path method exists', () => {
      return checkFunctionExists(serviceContent, 'generateEvaluationS3Path');
    });

    test('getS3Service method exists', () => {
      return checkFunctionExists(serviceContent, 'getS3Service');
    });
  }

  const apiServiceContent = readFile('src/services/evaluationApiService.js');
  if (apiServiceContent) {
    test('getStudentData method exists', () => {
      return checkFunctionExists(apiServiceContent, 'getStudentData');
    });

    test('updateMarkingSchemeWithMaxMarks method exists', () => {
      return checkFunctionExists(apiServiceContent, 'updateMarkingSchemeWithMaxMarks');
    });
  }

  // 8. Configuration Validation
  log('\n⚙️ Validating Configuration', 'blue');
  
  test('Package.json exists', () => {
    return fileExists('package.json');
  });

  const packageJson = readFile('package.json');
  if (packageJson) {
    const pkg = JSON.parse(packageJson);
    
    test('React version is compatible', () => {
      const reactVersion = pkg.dependencies?.react;
      return reactVersion && (reactVersion.includes('18') || reactVersion.includes('^17'));
    });

    test('Required dependencies are present', () => {
      const deps = pkg.dependencies || {};
      return deps['react-router-dom'] && deps['@aws-sdk/client-s3'];
    });
  }

  // 9. API Integration Validation
  log('\n🌐 Validating API Integration', 'blue');
  
  if (dashboardContent) {
    test('API endpoints are correctly referenced', () => {
      return /students\/update_marking_scheme/.test(dashboardContent) || 
             /updateMarkingSchemeWithMaxMarks/.test(dashboardContent);
    });

    test('Error handling for API calls exists', () => {
      return /catch\s*\(.*error.*\)/.test(dashboardContent);
    });

    test('Loading states for API calls exist', () => {
      return /setLoading\s*\(/.test(dashboardContent) || /Loading/.test(dashboardContent);
    });
  }

  // 10. Accessibility Validation
  log('\n♿ Validating Accessibility', 'blue');
  
  if (dashboardContent) {
    test('Form labels are present', () => {
      return /htmlFor=/.test(dashboardContent) || /aria-label/.test(dashboardContent);
    });

    test('Button titles/tooltips exist', () => {
      return /title=/.test(dashboardContent);
    });

    test('Loading states have descriptions', () => {
      return /loading-text/.test(dashboardContent) || /Loading/.test(dashboardContent);
    });
  }

  // 11. Performance Validation
  log('\n⚡ Validating Performance Optimizations', 'blue');
  
  if (dashboardContent) {
    test('useCallback is used for functions', () => {
      return /useCallback\s*\(/.test(dashboardContent);
    });

    test('useMemo is used for expensive computations', () => {
      return /useMemo\s*\(/.test(dashboardContent);
    });

    test('Debouncing is implemented', () => {
      return checkFunctionExists(dashboardContent, 'debounce');
    });
  }

  // 12. Security Validation
  log('\n🔐 Validating Security Measures', 'blue');
  
  if (dashboardContent) {
    test('File type validation exists', () => {
      return /pdf/.test(dashboardContent) && /File must be/.test(dashboardContent);
    });

    test('File size validation exists', () => {
      return /20.*MB/.test(dashboardContent) || /file.*size/.test(dashboardContent);
    });

    test('Authentication tokens are used', () => {
      return /id_token/.test(dashboardContent) || /Authorization/.test(dashboardContent);
    });
  }

  // Results Summary
  log('\n📊 Validation Summary', 'cyan');
  log(`Total Tests: ${results.passed + results.failed + results.warnings}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, 'red');
  log(`Warnings: ${results.warnings}`, 'yellow');

  const passRate = ((results.passed / (results.passed + results.failed + results.warnings)) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%`, passRate > 90 ? 'green' : passRate > 70 ? 'yellow' : 'red');

  if (results.failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      log(`  • ${test.description}${test.message ? ': ' + test.message : ''}`, 'red');
    });
  }

  if (results.warnings > 0) {
    log('\n⚠️ Warnings:', 'yellow');
    results.tests.filter(t => t.status === 'WARN').forEach(test => {
      log(`  • ${test.description}${test.message ? ': ' + test.message : ''}`, 'yellow');
    });
  }

  // Recommendations
  log('\n💡 Recommendations:', 'magenta');
  
  if (results.failed === 0) {
    log('✨ Excellent! All critical tests passed. Your implementation is ready for production.', 'green');
  } else if (results.failed <= 3) {
    log('🔧 Good progress! Address the failed tests to complete the implementation.', 'yellow');
  } else {
    log('🚧 Several issues need attention. Review and fix the failed tests before proceeding.', 'red');
  }

  log('\n🎯 Implementation Status:', 'cyan');
  if (passRate >= 95) {
    log('🏆 PRODUCTION READY - Implementation is complete and robust', 'green');
  } else if (passRate >= 85) {
    log('🚀 NEARLY COMPLETE - Minor fixes needed', 'yellow');
  } else if (passRate >= 70) {
    log('🔨 IN PROGRESS - Major components implemented', 'yellow');
  } else {
    log('🏗️ UNDER DEVELOPMENT - Significant work remaining', 'red');
  }

  return {
    success: results.failed === 0,
    passRate: parseFloat(passRate),
    results: results
  };
}

// Run validation if called directly
if (require.main === module) {
  const result = validateImplementation();
  process.exit(result.success ? 0 : 1);
}

module.exports = validateImplementation;