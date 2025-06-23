import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import EvaluationDashboard from '../pages/EvaluationDashboard';
import { AppProvider } from '../../../context/AppContext';
import evaluationService from '../../../services/evaluationService';

// Mock the services
jest.mock('../../../services/evaluationService');
jest.mock('../../../context/AppContext', () => ({
  ...jest.requireActual('../../../context/AppContext'),
  useApp: () => ({
    updateBreadcrumbs: jest.fn(),
    user: {
      id_token: 'mock-token',
      profile: {
        preferred_username: 'XYZADMIN123'
      }
    },
    breadcrumbs: ['Dashboard', 'Evaluation', 'Class 9', 'Term 1']
  })
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    classNumber: 'class-9',
    termId: 'term1'
  }),
  useNavigate: () => jest.fn()
}));

// Mock evaluation service methods
const mockEvaluationService = {
  getStudentsForEvaluation: jest.fn(),
  getS3Service: jest.fn(),
  getEvaluationApiService: jest.fn(),
  generateEvaluationS3Path: jest.fn(),
  getStudentEvaluationData: jest.fn(),
  uploadAnswerSheet: jest.fn()
};

evaluationService.getStudentsForEvaluation = mockEvaluationService.getStudentsForEvaluation;
evaluationService.getS3Service = mockEvaluationService.getS3Service;
evaluationService.getEvaluationApiService = mockEvaluationService.getEvaluationApiService;
evaluationService.generateEvaluationS3Path = mockEvaluationService.generateEvaluationS3Path;
evaluationService.getStudentEvaluationData = mockEvaluationService.getStudentEvaluationData;
evaluationService.uploadAnswerSheet = mockEvaluationService.uploadAnswerSheet;

// Mock S3 Service
const mockS3Service = {
  initializeS3Client: jest.fn(),
  listFiles: jest.fn(),
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  bucketName: 'test-bucket'
};

// Mock Evaluation API Service
const mockEvaluationApiService = {
  updateMarkingSchemeWithMaxMarks: jest.fn(),
  getStudentData: jest.fn()
};

// Sample test data
const mockStudents = [
  {
    id: '1',
    username: 'XYZSTUDENT001',
    rollNumber: '001',
    firstName: 'John',
    section: 'A'
  },
  {
    id: '2',
    username: 'XYZSTUDENT002',
    rollNumber: '002',
    firstName: 'Jane',
    section: 'A'
  }
];

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AppProvider>
        {component}
      </AppProvider>
    </BrowserRouter>
  );
};

describe('EvaluationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockEvaluationService.getStudentsForEvaluation.mockResolvedValue({
      success: true,
      students: mockStudents
    });
    
    mockEvaluationService.getS3Service.mockResolvedValue(mockS3Service);
    mockEvaluationService.getEvaluationApiService.mockResolvedValue(mockEvaluationApiService);
    mockEvaluationService.generateEvaluationS3Path.mockReturnValue('Evaluation/Class9/Term1/Hindi/MarkingScheme');
    mockEvaluationService.getStudentEvaluationData.mockResolvedValue({
      maximum_marks: 0,
      marking_scheme_s3_path: ''
    });
    
    mockS3Service.initializeS3Client.mockResolvedValue();
    mockS3Service.listFiles.mockResolvedValue({ success: true, files: [] });
    mockS3Service.uploadFile.mockResolvedValue({ success: true, location: 'mock-location' });
    mockS3Service.deleteFile.mockResolvedValue({ success: true });
    
    mockEvaluationApiService.updateMarkingSchemeWithMaxMarks.mockResolvedValue({ success: true });
    mockEvaluationApiService.getStudentData.mockResolvedValue({ success: true, data: {} });
  });

  test('renders loading state initially', () => {
    renderWithProviders(<EvaluationDashboard />);
    expect(screen.getByText('Loading student data...')).toBeInTheDocument();
  });

  test('renders student table after loading', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
    
    expect(screen.getByText('001')).toBeInTheDocument();
    expect(screen.getByText('002')).toBeInTheDocument();
  });

  test('renders all subject headers', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Hindi')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Science')).toBeInTheDocument();
      expect(screen.getByText('Social Science')).toBeInTheDocument();
    });
  });

  test('shows "Setup Evaluation" buttons when no setup exists', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButtons = screen.getAllByText('Setup Evaluation');
      expect(setupButtons).toHaveLength(5); // One for each subject
    });
  });

  test('opens modal when "Setup Evaluation" is clicked', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    expect(screen.getByText('Setup Evaluation - Hindi')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Marks *')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload Marking Scheme (PDF) *')).toBeInTheDocument();
  });

  test('validates maximum marks input', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    const maxMarksInput = screen.getByLabelText('Maximum Marks *');
    
    // Test invalid input
    fireEvent.change(maxMarksInput, { target: { value: '-10' } });
    await waitFor(() => {
      expect(screen.getByText(/Maximum marks must be greater than 0/)).toBeInTheDocument();
    });
    
    // Test valid input
    fireEvent.change(maxMarksInput, { target: { value: '100' } });
    await waitFor(() => {
      expect(screen.queryByText(/Maximum marks must be greater than 0/)).not.toBeInTheDocument();
    });
  });

  test('validates file upload', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    const fileInput = screen.getByLabelText('Upload Marking Scheme (PDF) *');
    
    // Test invalid file type
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File must be a PDF/)).toBeInTheDocument();
    });
  });

  test('validates file size', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    const fileInput = screen.getByLabelText('Upload Marking Scheme (PDF) *');
    
    // Test oversized file (> 20MB)
    const oversizedFile = new File(['test'], 'test.pdf', { 
      type: 'application/pdf',
      size: 25 * 1024 * 1024 // 25MB
    });
    
    Object.defineProperty(oversizedFile, 'size', {
      value: 25 * 1024 * 1024,
      writable: false
    });
    
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File size cannot exceed 20MB/)).toBeInTheDocument();
    });
  });

  test('disables Save & Upload button when validation fails', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    const saveButton = screen.getByText('Save & Upload');
    expect(saveButton).toBeDisabled();
    
    // Add valid maximum marks
    const maxMarksInput = screen.getByLabelText('Maximum Marks *');
    fireEvent.change(maxMarksInput, { target: { value: '100' } });
    
    // Still disabled without file
    expect(saveButton).toBeDisabled();
    
    // Add valid file
    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Upload Marking Scheme (PDF) *');
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  test('closes modal when cancel is clicked', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    expect(screen.getByText('Setup Evaluation - Hindi')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Setup Evaluation - Hindi')).not.toBeInTheDocument();
    });
  });

  test('shows error state when student loading fails', async () => {
    mockEvaluationService.getStudentsForEvaluation.mockRejectedValue(
      new Error('Failed to load students')
    );
    
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Evaluation')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load students/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no students exist', async () => {
    mockEvaluationService.getStudentsForEvaluation.mockResolvedValue({
      success: true,
      students: []
    });
    
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No Students Found')).toBeInTheDocument();
      expect(screen.getByText('No students have been configured for this class. Please add students in the Student Management module.')).toBeInTheDocument();
    });
  });

  test('handles opt-out functionality', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const optOutButtons = screen.getAllByTitle('Exclude from evaluation');
      fireEvent.click(optOutButtons[0]);
    });
    
    await waitFor(() => {
      expect(screen.getByTitle('Include in evaluation')).toBeInTheDocument();
    });
  });

  test('shows existing setup when PDF exists in S3', async () => {
    mockS3Service.listFiles.mockResolvedValue({
      success: true,
      files: [{ Key: 'path/to/marking-scheme.pdf' }]
    });
    
    mockEvaluationService.getStudentEvaluationData.mockResolvedValue({
      maximum_marks: 100,
      marking_scheme_s3_path: 's3://bucket/path/to/MarkingScheme/'
    });
    
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Update Setup')[0]).toBeInTheDocument();
      expect(screen.getByText('Max Marks: 100')).toBeInTheDocument();
    });
  });

  test('shows sync warning for out-of-sync students', async () => {
    // Mock one student as out of sync
    mockEvaluationService.getStudentEvaluationData
      .mockResolvedValueOnce({
        maximum_marks: 100,
        marking_scheme_s3_path: 's3://bucket/correct/path/'
      })
      .mockResolvedValueOnce({
        maximum_marks: 100,
        marking_scheme_s3_path: 's3://bucket/wrong/path/'
      });
    
    mockS3Service.listFiles.mockResolvedValue({
      success: true,
      files: [{ Key: 'path/to/marking-scheme.pdf' }]
    });
    
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('🔄 Syncing...')).toBeInTheDocument();
    });
  });
});

// Utility function tests
describe('EvaluationDashboard Utility Functions', () => {
  // These would test the utility functions if they were exported
  // For now, we test them through the component behavior
  
  test('validates maximum marks correctly', async () => {
    renderWithProviders(<EvaluationDashboard />);
    
    await waitFor(() => {
      const setupButton = screen.getAllByText('Setup Evaluation')[0];
      fireEvent.click(setupButton);
    });
    
    const maxMarksInput = screen.getByLabelText('Maximum Marks *');
    
    // Test various invalid inputs
    const invalidInputs = [
      { value: '', error: 'Maximum marks is required' },
      { value: '0', error: 'Maximum marks must be greater than 0' },
      { value: '-10', error: 'Maximum marks must be greater than 0' },
      { value: '1001', error: 'Maximum marks cannot exceed 1000' },
      { value: 'abc', error: 'Maximum marks must be a valid number' }
    ];
    
    for (const testCase of invalidInputs) {
      fireEvent.change(maxMarksInput, { target: { value: testCase.value } });
      await waitFor(() => {
        if (testCase.error) {
          expect(screen.getByText(new RegExp(testCase.error))).toBeInTheDocument();
        }
      });
    }
    
    // Test valid input
    fireEvent.change(maxMarksInput, { target: { value: '100' } });
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});