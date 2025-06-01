# Student Management System Guide

## Overview

The Student Management System provides a comprehensive solution for managing student profiles in a school environment. The system is integrated with AWS backend services and consists of two main components:

1. **Student Management Page** - View, edit, and manage existing student profiles
2. **Bulk Operations Page** - Create multiple students via CSV upload or perform bulk deletions

## Navigation

From the Class Dashboard, you can access:
- **Student Management** - View and edit existing students
- **Bulk Operations** - Create/delete students in bulk

## Student Management Page

### Features

- **View All Students**: Display all students for the selected class
- **Section Filtering**: Filter students by section using the dropdown
- **Individual Editing**: Click "Edit" to modify student details inline
- **Bulk SMS**: Select multiple students and send login details via SMS
- **Real-time Status**: View SMS delivery status for each student

### How to Use

1. Navigate to **Student Management** from the class dashboard
2. Use the section filter to narrow down the student list
3. Select students using checkboxes for bulk operations
4. Click "Edit" on any student to modify their details
5. Use "Send SMS to Selected" to send login credentials

### Student Information Displayed

- Username (auto-generated)
- First Name
- Last Name
- Phone Number
- Date of Birth
- Section
- SMS Status (Pending, Sent, Failed, etc.)

## Bulk Operations Page

### Features

- **CSV Upload**: Import multiple students from a CSV file
- **Manual Entry**: Add individual students using "Add Empty Row"
- **Bulk Creation**: Create up to 100 students at once
- **Bulk Deletion**: Delete multiple students with confirmation dialogs
- **Validation**: Client-side validation before sending to backend

### CSV Format Requirements

Your CSV file must include these columns (in any order):

```
firstName,lastName,dateOfBirth,phoneNumber,className,section
```

#### Sample CSV Content:
```
firstName,lastName,dateOfBirth,phoneNumber,className,section
John,Doe,2010-01-15,1234567890,10,A
Jane,Smith,2010-02-20,9876543210,10,A
Mike,Johnson,2010-03-10,1555123456,10,B
```

#### Validation Rules:
- **First Name & Last Name**: Only letters and spaces allowed
- **Phone Number**: Exactly 10 digits (will be formatted as +91XXXXXXXXXX)
- **Date of Birth**: Must be in YYYY-MM-DD format
- **Class Name**: String value (usually matches current class)
- **Section**: String value (e.g., A, B, C)

### How to Use Bulk Operations

1. **Upload CSV**:
   - Click "Upload CSV File"
   - Select a properly formatted CSV file
   - Review the loaded students in the table
   - Correct any validation errors

2. **Manual Entry**:
   - Click "Add Empty Row" to add individual students
   - Fill in all required fields
   - Use the "×" button to remove unwanted rows

3. **Create Students**:
   - Review all student data
   - Click "Create X Students" 
   - Confirm the operation
   - Wait for the success/error message

4. **Delete Students**:
   - Select students using checkboxes
   - Click "Delete Selected"
   - Confirm twice (safety measure)
   - Only students with usernames (already created) will be deleted from backend

## Backend Integration

### API Endpoints Used

- `GET /students` - Fetch students by school and class
- `POST /students` - Create single/bulk students
- `PUT /students` - Update single/bulk students
- `DELETE /students` - Delete single/bulk students
- `POST /students/send-sms` - Send SMS to students

### Authentication

- Uses Cognito ID tokens for authorization
- School code extracted from admin's Cognito username
- All API calls include proper authentication headers

### Data Flow

1. **Admin Login**: Cognito authentication with OIDC
2. **School Context**: School code derived from admin username
3. **Class Context**: Extracted from URL parameters
4. **API Calls**: Include school code and authentication tokens

## Limitations and Constraints

### Bulk Operation Limits
- **Maximum 100 students** per bulk operation
- **CSV Upload**: Maximum 100 rows at once
- **Bulk Delete**: Maximum 100 students at once
- **Bulk SMS**: Maximum 100 recipients at once

### Validation Requirements
- Phone numbers must be exactly 10 digits
- Names must contain only letters and spaces
- Date of birth must be in YYYY-MM-DD format
- All fields are required

### SMS Functionality
- Requires AWS SNS configuration
- SMS status tracking (Pending, Sent, Failed)
- Login credentials sent include username and temporary password
- Phone numbers automatically formatted to E.164 (+91XXXXXXXXXX)

## Troubleshooting

### Common Issues

1. **"No students found"**
   - Check if students exist for the selected class
   - Try different section filters
   - Use Bulk Operations to create students first

2. **CSV Upload Errors**
   - Verify CSV format matches requirements
   - Check for missing required columns
   - Ensure phone numbers are exactly 10 digits
   - Validate date format (YYYY-MM-DD)

3. **Authentication Errors**
   - Ensure you're logged in through Cognito
   - Check if your session has expired
   - Verify proper permissions

4. **SMS Not Sending**
   - Check phone number format
   - Verify AWS SNS configuration
   - Check SMS status in the management page

### Error Messages

- **Network errors**: Check internet connection and API availability
- **Validation errors**: Review field requirements and correct data
- **Authorization errors**: Re-login through Cognito
- **Bulk limit errors**: Reduce batch size to 100 or fewer

## Technical Details

### Frontend Technology
- React 19.1.0
- React Router for navigation
- OIDC for authentication
- Glassmorphism UI design

### Backend Services
- AWS API Gateway (REST API)
- AWS Lambda (Python runtime)
- Amazon DynamoDB (student data storage)
- Amazon Cognito (authentication)
- Amazon SNS (SMS delivery)

### State Management
- React Context for global state
- Local component state for forms
- Authentication state via OIDC

## Security Features

- **Authentication**: Cognito User Pool integration
- **Authorization**: ID token validation on all API calls
- **Data Isolation**: School code-based data separation
- **Validation**: Client and server-side validation
- **Confirmation Dialogs**: Multiple confirmations for destructive operations

## Future Enhancements

Potential improvements could include:
- Real-time SMS status updates
- Advanced filtering options
- Student photo uploads
- Bulk edit capabilities
- Export functionality
- Audit logging
- Advanced reporting