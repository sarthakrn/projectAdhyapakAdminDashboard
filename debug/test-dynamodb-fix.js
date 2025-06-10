/**
 * DynamoDB Fix Verification Script
 * 
 * This script helps debug and verify the DynamoDB update fixes for the evaluation module.
 * Run this script to test the specific scenarios that were failing.
 */

// Removed AWS SDK v2 import to prevent conflicts
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration - Update these values for your environment
const CONFIG = {
  region: 'ap-south-1',
  tableName: 'students',
  testUsername: 'XYZMJ0309109', // Student username from the bug report
  testSchoolCode: 'XYZ',         // Extracted from username (first 3 chars)
  originalTermName: 'Term 1',    // Original term name with space
  subjectName: 'Hindi',          // Subject from the bug report
  markingSchemeS3Path: 'https://project-adhyapak.s3.ap-south-1.amazonaws.com/xyz/Evaluation/Class9/Term1/Hindi/MarkingScheme/scheme.pdf',
  answerSheetS3Path: 'https://project-adhyapak.s3.ap-south-1.amazonaws.com/xyz/Evaluation/Class9/Term1/Hindi/AnswerSheet/XYZMJ0309109.pdf'
};

class DynamoDBTester {
  constructor() {
    this.dynamoClient = null;
    this.tableName = CONFIG.tableName;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing DynamoDB client...');
      
      // Initialize DynamoDB client
      const client = new DynamoDBClient({ 
        region: CONFIG.region,
        // Add your credentials here if needed
        // accessKeyId: 'your-access-key',
        // secretAccessKey: 'your-secret-key'
      });
      
      this.dynamoClient = DynamoDBDocumentClient.from(client);
      console.log('✅ DynamoDB client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize DynamoDB client:', error);
      return false;
    }
  }

  // Normalize term name (same logic as the fix)
  normalizeTermName(termName) {
    return termName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  }

  // Extract school code from username (same logic as main service)
  extractSchoolCodeFromUsername(username) {
    if (!username || typeof username !== 'string') {
      console.warn('Invalid username provided for school code extraction');
      return 'XYZ'; // fallback
    }
    
    // Extract first 3 characters as school code
    const schoolCode = username.substring(0, 3).toUpperCase();
    console.log(`📋 Extracted school code: ${schoolCode} from username: ${username}`);
    return schoolCode;
  }

  // Test 1: Verify student record exists
  async testStudentExists() {
    console.log('\n🧪 Test 1: Verifying student record exists');
    
    try {
      const schoolCode = this.extractSchoolCodeFromUsername(CONFIG.testUsername);
      const params = {
        TableName: this.tableName,
        Key: { 
          username: CONFIG.testUsername,
          schoolCode: schoolCode
        }
      };

      const result = await this.dynamoClient.send(new GetCommand(params));
      
      if (result.Item) {
        console.log('✅ Student record found');
        console.log('📋 Current record structure:', {
          username: result.Item.username,
          hasSubjectMetadata: !!result.Item.subject_metadata,
          subjectMetadataKeys: result.Item.subject_metadata ? Object.keys(result.Item.subject_metadata) : []
        });
        return true;
      } else {
        console.log('❌ Student record not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking student record:', error);
      return false;
    }
  }

  // Test 2: Test the fixed UpdateExpression for answer sheet
  async testAnswerSheetUpdate() {
    console.log('\n🧪 Test 2: Testing answer sheet update with fixed expression');
    
    const normalizedTermName = this.normalizeTermName(CONFIG.originalTermName);
    console.log(`📝 Original term: "${CONFIG.originalTermName}" → Normalized: "${normalizedTermName}"`);

    try {
      const updateExpression = `
        SET #sm = if_not_exists(#sm, :emptyMap),
            #sm.#termName = if_not_exists(#sm.#termName, :emptyMap),
            #sm.#termName.#subjectName = :subjectData
      `.trim();
      
      const expressionAttributeNames = {
        '#sm': 'subject_metadata',
        '#termName': normalizedTermName,
        '#subjectName': CONFIG.subjectName
      };
      
      const expressionAttributeValues = {
        ':emptyMap': {},
        ':subjectData': {
          uploaded_marking_scheme_s3_path: null,
          student_answer_sheet_s3_path: CONFIG.answerSheetS3Path,
          answer_sheet_uploaded: true,
          graded_sheet_s3_path: null
        }
      };

      const schoolCode = this.extractSchoolCodeFromUsername(CONFIG.testUsername);
      const updateCommand = new UpdateCommand({
        TableName: this.tableName,
        Key: { 
          username: CONFIG.testUsername,
          schoolCode: schoolCode
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(username) AND attribute_exists(schoolCode)'
      });

      console.log('📤 Sending update command:', {
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      const result = await this.dynamoClient.send(updateCommand);
      console.log('✅ Answer sheet update successful:', result);
      
      return true;
    } catch (error) {
      console.error('❌ Answer sheet update failed:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode
      });
      return false;
    }
  }

  // Test 3: Verify the update was successful
  async verifyUpdate() {
    console.log('\n🧪 Test 3: Verifying the update was applied');
    
    const normalizedTermName = this.normalizeTermName(CONFIG.originalTermName);
    
    try {
      const schoolCode = this.extractSchoolCodeFromUsername(CONFIG.testUsername);
      const params = {
        TableName: this.tableName,
        Key: { 
          username: CONFIG.testUsername,
          schoolCode: schoolCode
        }
      };

      const result = await this.dynamoClient.send(new GetCommand(params));
      
      if (result.Item && result.Item.subject_metadata) {
        console.log('✅ subject_metadata attribute exists');
        
        const subjectMetadata = result.Item.subject_metadata;
        console.log('📋 subject_metadata structure:', JSON.stringify(subjectMetadata, null, 2));
        
        if (subjectMetadata[normalizedTermName]) {
          console.log(`✅ Term "${normalizedTermName}" exists in metadata`);
          
          if (subjectMetadata[normalizedTermName][CONFIG.subjectName]) {
            console.log(`✅ Subject "${CONFIG.subjectName}" exists in term`);
            
            const subjectData = subjectMetadata[normalizedTermName][CONFIG.subjectName];
            console.log('📊 Subject data:', subjectData);
            
            // Verify specific fields
            const checks = [
              { field: 'student_answer_sheet_s3_path', expected: CONFIG.answerSheetS3Path },
              { field: 'answer_sheet_uploaded', expected: true },
              { field: 'uploaded_marking_scheme_s3_path', expected: null },
              { field: 'graded_sheet_s3_path', expected: null }
            ];
            
            let allChecksPass = true;
            checks.forEach(check => {
              const actual = subjectData[check.field];
              const passes = actual === check.expected;
              console.log(`${passes ? '✅' : '❌'} ${check.field}: ${JSON.stringify(actual)} ${passes ? '===' : '!=='} ${JSON.stringify(check.expected)}`);
              if (!passes) allChecksPass = false;
            });
            
            return allChecksPass;
          } else {
            console.log(`❌ Subject "${CONFIG.subjectName}" not found in term data`);
          }
        } else {
          console.log(`❌ Term "${normalizedTermName}" not found in metadata`);
          console.log('📋 Available terms:', Object.keys(subjectMetadata));
        }
      } else {
        console.log('❌ subject_metadata attribute still missing after update');
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error verifying update:', error);
      return false;
    }
  }

  // Test 4: Test marking scheme update
  async testMarkingSchemeUpdate() {
    console.log('\n🧪 Test 4: Testing marking scheme update');
    
    const normalizedTermName = this.normalizeTermName(CONFIG.originalTermName);
    
    try {
      const updateExpression = `
        SET #sm = if_not_exists(#sm, :emptyMap),
            #sm.#termName = if_not_exists(#sm.#termName, :emptyMap),
            #sm.#termName.#subjectName = :subjectData
      `.trim();
      
      const expressionAttributeNames = {
        '#sm': 'subject_metadata',
        '#termName': normalizedTermName,
        '#subjectName': CONFIG.subjectName
      };
      
      const expressionAttributeValues = {
        ':emptyMap': {},
        ':subjectData': {
          uploaded_marking_scheme_s3_path: CONFIG.markingSchemeS3Path,
          student_answer_sheet_s3_path: CONFIG.answerSheetS3Path, // Keep existing value
          answer_sheet_uploaded: true, // Keep existing value
          graded_sheet_s3_path: null
        }
      };

      const schoolCode = this.extractSchoolCodeFromUsername(CONFIG.testUsername);
      const updateCommand = new UpdateCommand({
        TableName: this.tableName,
        Key: { 
          username: CONFIG.testUsername,
          schoolCode: schoolCode
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(username) AND attribute_exists(schoolCode)'
      });

      console.log('📤 Sending marking scheme update...');
      const result = await this.dynamoClient.send(updateCommand);
      console.log('✅ Marking scheme update successful');
      
      return true;
    } catch (error) {
      console.error('❌ Marking scheme update failed:', error);
      return false;
    }
  }

  // Test 5: Test with different term names
  async testTermNameNormalization() {
    console.log('\n🧪 Test 5: Testing term name normalization');
    
    const testCases = [
      'Term 1',
      'Term 2',
      'Mid Term',
      'Final Exam',
      'Unit Test 1',
      'TERM-1',
      'term_2'
    ];
    
    testCases.forEach(termName => {
      const normalized = this.normalizeTermName(termName);
      console.log(`📝 "${termName}" → "${normalized}"`);
    });
    
    return true;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting DynamoDB Fix Verification Tests');
    console.log('=' .repeat(60));
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('💥 Failed to initialize. Please check your AWS credentials and configuration.');
      return;
    }

    const tests = [
      { name: 'Student Exists', fn: () => this.testStudentExists() },
      { name: 'Term Normalization', fn: () => this.testTermNameNormalization() },
      { name: 'Answer Sheet Update', fn: () => this.testAnswerSheetUpdate() },
      { name: 'Verify Update', fn: () => this.verifyUpdate() },
      { name: 'Marking Scheme Update', fn: () => this.testMarkingSchemeUpdate() },
      { name: 'Final Verification', fn: () => this.verifyUpdate() }
    ];

    let passedTests = 0;
    const results = [];

    for (const test of tests) {
      try {
        const passed = await test.fn();
        results.push({ name: test.name, passed });
        if (passed) passedTests++;
        
        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`💥 Test "${test.name}" threw an error:`, error);
        results.push({ name: test.name, passed: false, error: error.message });
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.name}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Overall: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('🎉 All tests passed! The DynamoDB fix appears to be working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above and check your configuration.');
    }
  }
}

// Instructions for running the script
console.log(`
📋 INSTRUCTIONS FOR RUNNING THIS SCRIPT:

1. Update the CONFIG object at the top with your actual values:
   - region: Your AWS region
   - tableName: Your DynamoDB table name
   - testUsername: A valid student username from your table
   - Test S3 paths

2. Ensure AWS credentials are configured:
   - Via AWS CLI: aws configure
   - Via environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   - Via IAM role (if running on EC2)

3. Install dependencies:
   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

4. Run the script:
   node test-dynamodb-fix.js

5. Review the output to verify the fixes are working.

Note: This script will make actual changes to your DynamoDB table.
Make sure you're using a test environment or have backups.
`);

// Auto-run if this script is executed directly
if (require.main === module) {
  const tester = new DynamoDBTester();
  tester.runAllTests().catch(console.error);
}

module.exports = DynamoDBTester;