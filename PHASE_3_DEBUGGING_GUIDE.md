# Phase 3 DynamoDB Integration Debugging Guide

## Critical Issues Fixed

### 1. Table Name Mismatch
**Problem**: Code used `student-records` but actual table is `students`
**Fix**: Updated `dynamoDbService.js` table name to `students`
**Verification**: Check AWS console - table name should match exactly

### 2. Data Type Conflict: subject_metadata
**Problem**: Existing records have `subjectmetadata` as String ("") but code expects Map
**Fix**: Dynamic attribute detection and forced Map initialization
**Verification**: Check student records for attribute type

### 3. Missing S3 URL in Database Updates
**Problem**: S3 path not properly passed to DynamoDB
**Fix**: Use `uploadResult.location` instead of undefined `s3Url`
**Verification**: Check DynamoDB records for complete S3 URLs

## Testing Procedure

### Step 1: Check DynamoDB Table Structure
```
1. Open AWS Console → DynamoDB → Tables
2. Verify table name is "students" (not "student-records")
3. Check sample student record structure
4. Note if attribute is "subjectmetadata" or "subject_metadata"
5. Check if existing values are String ("") or Map ({})
```

### Step 2: Test Marking Scheme Upload
```
1. Navigate to Evaluation Dashboard
2. Open browser Developer Tools → Console
3. Click "Upload Marking Scheme" for any subject
4. Upload a PDF file
5. Monitor console logs for:
   - "🔄 DynamoDB: Starting bulk update for marking scheme"
   - "📝 Parameters:" with student list
   - "📤 DynamoDB: Updating student [username]"
   - "✅ DynamoDB: Successfully updated..." OR error details
```

### Step 3: Verify DynamoDB Updates
```
1. Go to AWS Console → DynamoDB → Explore items
2. Select "students" table
3. Find a student record that should have been updated
4. Check if subject_metadata (or subjectmetadata) is now a Map
5. Verify the nested structure exists:
   - Term1 → Subject → uploaded_marking_scheme_s3_path
6. Confirm S3 URL is complete (starts with https://)
```

### Step 4: Test Answer Sheet Upload
```
1. Ensure marking scheme is uploaded first
2. Set maximum marks for the subject
3. Click "Start Evaluation" for a specific student
4. Upload a PDF file (under 20MB)
5. Monitor console for:
   - "🔄 DynamoDB: Starting individual student update"
   - S3 upload success messages
   - DynamoDB update confirmation
```

## Console Log Analysis

### Successful Marking Scheme Upload Logs
```
📝 Parameters: {studentCount: 5, termName: "Term1", subjectName: "Hindi", ...}
📋 DynamoDB: Using attribute name: subject_metadata
📤 DynamoDB: Updating student student001 with command: {...}
✅ DynamoDB: Successfully updated answer sheet for student001
📊 DynamoDB: Bulk update results: {total: 5, successful: 5, failed: 0}
```

### Error Indicators to Watch For
```
❌ DynamoDB: Error updating marking scheme for students:
🔍 Error details: {name: "ValidationException", message: "..."}
- Check if statusCode is 400 (bad request)
- Look for "ValidationException" errors
- Check if tableName is correct
```

## Common Error Scenarios

### Error 1: ResourceNotFoundException
```
Cause: Wrong table name
Solution: Verify table name in AWS console matches code
Log: "The table [table-name] does not exist"
```

### Error 2: ValidationException - Invalid UpdateExpression
```
Cause: Trying to update String as Map
Solution: Code now handles this automatically
Log: "The provided expression refers to an attribute that does not exist"
```

### Error 3: ConditionalCheckFailedException
```
Cause: Student username doesn't exist in table
Solution: Verify student records exist before upload
Log: "The conditional request failed"
```

### Error 4: AccessDeniedException
```
Cause: Insufficient Cognito permissions
Solution: Check IAM policies for DynamoDB access
Log: "User is not authorized to perform: dynamodb:UpdateItem"
```

## Manual Database Fixes

### Fix String subject_metadata to Map
If automated detection fails, manually fix in AWS console:
```
1. Go to DynamoDB → Tables → students → Explore items
2. Find affected student record
3. Edit item
4. Delete the "subjectmetadata" attribute (if it's a String)
5. Add new attribute "subject_metadata" with type Map
6. Save changes
7. Retry the upload
```

### Sample Correct subject_metadata Structure
```json
{
  "subject_metadata": {
    "Term1": {
      "Hindi": {
        "uploaded_marking_scheme_s3_path": "https://project-adhyapak.s3.ap-south-1.amazonaws.com/...",
        "student_answer_sheet_s3_path": null,
        "answer_sheet_uploaded": false,
        "graded_sheet_s3_path": null
      }
    }
  }
}
```

## Verification Checklist

### After Marking Scheme Upload:
- [ ] Console shows "📊 DynamoDB: Bulk update results" with success count
- [ ] AWS DynamoDB console shows updated records for all visible students
- [ ] subject_metadata is now a Map (not String)
- [ ] S3 URL is complete and accessible
- [ ] UI shows "✓ Uploaded" status

### After Answer Sheet Upload:
- [ ] Console shows successful individual student update
- [ ] DynamoDB record shows answer_sheet_uploaded: true
- [ ] S3 contains file with student username as filename
- [ ] UI shows "✓ Answer Sheet Uploaded" with timestamp

## Performance Monitoring

### Normal Operation Indicators:
- Marking scheme upload: 2-5 seconds for 10 students
- Answer sheet upload: 1-3 seconds per file
- No repeated retry attempts in logs
- Success rate > 95% for valid files

### Performance Issues to Watch:
- Timeout errors (increase retry logic)
- Frequent credential refresh (check token expiry)
- High failure rates (check permissions)

## Advanced Debugging

### Enable Detailed AWS SDK Logging:
Add to browser console before testing:
```javascript
localStorage.setItem('debug', 'aws*');
```

### Check Network Tab:
- DynamoDB API calls should return 200 status
- Request payload should contain correct table name
- Response should show successful update metadata

### Cognito Token Validation:
Verify in console that user tokens are valid:
```javascript
// Check token expiry
const token = user.id_token;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));
```

## Recovery Procedures

### If Bulk Update Partially Fails:
1. Check console logs for which students failed
2. Verify failed students exist in DynamoDB
3. Manually retry for failed students only
4. Consider data cleanup if needed

### If S3 Upload Succeeds but DynamoDB Fails:
1. File exists in S3 but database not updated
2. Check DynamoDB permissions and table access
3. Manually update database record with S3 URL
4. Re-test with corrected permissions

This debugging guide should help identify and resolve the critical DynamoDB integration issues in Phase 3.