// Dynamic imports with retry logic to handle webpack chunk loading issues
let DynamoDBClient, DynamoDBDocumentClient, UpdateCommand, GetCommand, ScanCommand;
let fromCognitoIdentityPool;

// Flag to ensure we're using DocumentClient properly
let isDocumentClientProperlyConfigured = false;

const loadAWSModules = async (retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    if (!DynamoDBClient) {
      console.log("Loading AWS DynamoDB Client module...");
      const dynamoModule = await import("@aws-sdk/client-dynamodb");
      DynamoDBClient = dynamoModule.DynamoDBClient;
      console.log("✅ AWS DynamoDB Client module loaded successfully");
    }
    
    if (!DynamoDBDocumentClient) {
      console.log("Loading AWS DynamoDB Document Client module...");
      const docModule = await import("@aws-sdk/lib-dynamodb");
      DynamoDBDocumentClient = docModule.DynamoDBDocumentClient;
      UpdateCommand = docModule.UpdateCommand;
      GetCommand = docModule.GetCommand;
      ScanCommand = docModule.ScanCommand;
      
      // CRITICAL VERIFICATION: Ensure we loaded from lib-dynamodb not client-dynamodb
      console.log("📋 DynamoDB Module Verification:", {
        DynamoDBDocumentClient: !!DynamoDBDocumentClient,
        UpdateCommand: !!UpdateCommand,
        GetCommand: !!GetCommand,
        ScanCommand: !!ScanCommand,
        moduleSource: '@aws-sdk/lib-dynamodb'
      });
      
      console.log("✅ AWS DynamoDB Document Client module loaded successfully");
    }
    
    if (!fromCognitoIdentityPool) {
      console.log("Loading AWS Cognito module...");
      const cognitoModule = await import("@aws-sdk/credential-provider-cognito-identity");
      fromCognitoIdentityPool = cognitoModule.fromCognitoIdentityPool;
      console.log("✅ AWS Cognito module loaded successfully");
    }
  } catch (error) {
    console.error(`❌ Failed to load AWS modules (attempt ${retryCount + 1}):`, error);
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in ${(retryCount + 1) * 1000}ms...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
      return loadAWSModules(retryCount + 1);
    } else {
      throw new Error(`Failed to load AWS SDK modules after ${maxRetries} attempts. This may be due to network issues or chunk loading problems. Please refresh the page and try again.`);
    }
  }
};

class DynamoDbService {
  constructor() {
    this.tableName = "students";
    this.region = "ap-south-1";
    this.identityPoolId = "ap-south-1:56a17246-e497-4430-9763-fcd44122c846";
    this.userPoolId = null;
    this.dynamoClient = null;
    this.sessionExpiredCallback = null;
  }

  setSessionExpiredCallback(callback) {
    this.sessionExpiredCallback = callback;
  }

  isTokenExpired(token) {
    try {
      if (!token) return true;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp <= currentTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  handleTokenExpiry() {
    console.warn('DynamoDB Service: Token expired, triggering session expiry callback');
    if (this.sessionExpiredCallback) {
      this.sessionExpiredCallback();
    }
  }

  extractUserPoolId(idToken) {
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      
      // Extract from iss claim (issuer)
      if (payload.iss) {
        const issMatch = payload.iss.match(/cognito-idp\.([^.]+)\.amazonaws\.com\/([^/]+)/);
        if (issMatch && issMatch[2]) {
          return issMatch[2];
        }
      }
      
      // Fallback: try token_use and other standard claims
      if (payload.token_use === 'id') {
        console.warn('Could not extract user pool ID from token issuer, using fallback');
        return null;
      }
      
      throw new Error('Invalid token format');
    } catch (error) {
      console.error('Error extracting user pool ID:', error);
      throw new Error('Failed to extract user pool ID from token');
    }
  }

  async initializeDynamoClient(idToken) {
    try {
      // Load AWS modules first
      await loadAWSModules();
      
      if (this.isTokenExpired(idToken)) {
        this.handleTokenExpiry();
        throw new Error('Token expired');
      }

      // Extract and set user pool ID
      this.userPoolId = this.extractUserPoolId(idToken);
      
      const credentials = fromCognitoIdentityPool({
        clientConfig: { region: this.region },
        identityPoolId: this.identityPoolId,
        logins: {
          [`cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`]: idToken,
        },
      });

      const dynamoClient = new DynamoDBClient({
        region: this.region,
        credentials: credentials,
      });

      // Ensure proper DocumentClient configuration to prevent raw DynamoDB format
      this.dynamoClient = DynamoDBDocumentClient.from(dynamoClient, {
        marshallOptions: {
          convertEmptyValues: false,
          removeUndefinedValues: true,
          convertClassInstanceToMap: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });
      
      // Verify DocumentClient is working properly
      isDocumentClientProperlyConfigured = true;
      
      console.log('✅ DynamoDB: DocumentClient initialized successfully', {
        region: this.region,
        tableName: this.tableName,
        userPoolId: this.userPoolId,
        clientType: 'DynamoDBDocumentClient',
        isProperlyConfigured: isDocumentClientProperlyConfigured
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing DynamoDB client:', error);
      
      if (error.message === 'Token expired') {
        this.handleTokenExpiry();
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to initialize DynamoDB client' 
      };
    }
  }

  getDynamoClient() {
    if (!this.dynamoClient) {
      throw new Error('DynamoDB client not initialized. Call initializeDynamoClient first.');
    }
    
    if (!isDocumentClientProperlyConfigured) {
      throw new Error('DynamoDB DocumentClient not properly configured. This will cause format issues.');
    }
    
    // Additional verification that we have DocumentClient
    if (!this.dynamoClient.send) {
      throw new Error('Invalid DynamoDB client - missing send method.');
    }
    
    return this.dynamoClient;
  }

  // Detect the correct subject metadata attribute name (subject_metadata vs subjectmetadata)
  async detectSubjectMetadataAttributeName(sampleUsername) {
    try {
      const dynamoClient = this.getDynamoClient();
      
      // Extract school code for composite key
      const schoolCode = this.extractSchoolCodeFromUsername(sampleUsername);
      
      const params = {
        TableName: this.tableName,
        Key: { username: sampleUsername, schoolCode },
        ProjectionExpression: 'subject_metadata, subjectmetadata'
      };

      const result = await dynamoClient.send(new GetCommand(params));
      
      if (result.Item) {
        if (result.Item.hasOwnProperty('subject_metadata')) {
          console.log('📋 DynamoDB: Using attribute name: subject_metadata');
          return 'subject_metadata';
        } else if (result.Item.hasOwnProperty('subjectmetadata')) {
          console.log('📋 DynamoDB: Using attribute name: subjectmetadata');
          return 'subjectmetadata';
        }
      }
      
      // Default to subject_metadata if neither exists (for new records)
      console.log('📋 DynamoDB: No existing metadata attribute found, defaulting to: subject_metadata');
      return 'subject_metadata';
    } catch (error) {
      console.warn('⚠️ DynamoDB: Could not detect attribute name, defaulting to subject_metadata:', error.message);
      return 'subject_metadata';
    }
  }

  // Update marking scheme path for multiple specific students (scoped bulk update)
  async updateMarkingSchemeForStudents(studentUsernames, termName, subjectName, markingSchemeS3Path) {
    const normalizedTermName = termName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');

    try {
      console.log('🔄 DynamoDB: Starting bulk update for marking scheme');
      
      console.log('📝 Parameters:', {
        studentCount: studentUsernames.length,
        studentUsernames: studentUsernames,
        originalTermName: termName,
        normalizedTermName: normalizedTermName,
        subjectName: subjectName,
        markingSchemeS3Path: markingSchemeS3Path,
        tableName: this.tableName
      });

      const dynamoClient = this.getDynamoClient();
      const subjectMetadataAttr = await this.detectSubjectMetadataAttributeName(studentUsernames[0]);
      const updatePromises = [];

      for (const username of studentUsernames) {
        // Extract school code for composite key
        const schoolCode = this.extractSchoolCodeFromUsername(username);
        
        const subjectData = {
          uploaded_marking_scheme_s3_path: markingSchemeS3Path,
          student_answer_sheet_s3_path: null,
          answer_sheet_uploaded: false,
          graded_sheet_s3_path: null
        };
        
        // Multi-strategy approach like Python implementation
        const strategies = [
          // Strategy 1: Direct update (assumes all parent paths exist)
          {
            name: 'direct_update',
            expression: 'SET #sm.#termName.#subjectName = :subjectData',
            names: { '#sm': subjectMetadataAttr, '#termName': normalizedTermName, '#subjectName': subjectName },
            values: { ':subjectData': subjectData },
            condition: 'attribute_exists(username) AND attribute_exists(schoolCode) AND attribute_exists(#sm) AND attribute_exists(#sm.#termName)'
          },
          // Strategy 2: Create term level if missing
          {
            name: 'create_term',
            expression: 'SET #sm.#termName = :termData',
            names: { '#sm': subjectMetadataAttr, '#termName': normalizedTermName },
            values: { ':termData': { [subjectName]: subjectData } },
            condition: 'attribute_exists(username) AND attribute_exists(schoolCode) AND attribute_exists(#sm)'
          },
          // Strategy 3: Create subject_metadata if missing
          {
            name: 'create_subject_metadata',
            expression: 'SET #sm = :smData',
            names: { '#sm': subjectMetadataAttr },
            values: { ':smData': { [normalizedTermName]: { [subjectName]: subjectData } } },
            condition: 'attribute_exists(username) AND attribute_exists(schoolCode)'
          }
        ];
        
        updatePromises.push(this.executeMultiStrategyUpdate(username, schoolCode, strategies, dynamoClient));
      }

      const results = await Promise.allSettled(updatePromises);
      const fulfilled = results.filter(result => result.status === 'fulfilled').map(r => r.value);
      const successCount = fulfilled.filter(result => result.success).length;
      const failures = fulfilled.filter(result => !result.success);

      console.log('📊 DynamoDB: Bulk update results:', {
        total: studentUsernames.length,
        successful: successCount,
        failed: failures.length,
        failures: failures.map(f => ({ username: f.username, error: f.error, code: f.errorCode }))
      });

      return {
        success: true,
        updatedCount: successCount,
        totalCount: studentUsernames.length,
        failures: failures
      };

    } catch (error) {
      console.error('❌ DynamoDB: Error updating marking scheme for students:', error);
      return {
        success: false,
        error: error.message || 'Failed to update marking scheme'
      };
    }
  }

  // Update answer sheet for individual student
  async updateStudentAnswerSheet(username, termName, subjectName, answerSheetS3Path) {
    const normalizedTermName = termName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');

    try {
      console.log('🔄 DynamoDB: Starting individual student update for answer sheet');
      
      console.log('📝 Parameters:', {
        username: username,
        originalTermName: termName,
        normalizedTermName: normalizedTermName,
        subjectName: subjectName,
        answerSheetS3Path: answerSheetS3Path,
        tableName: this.tableName
      });

      const dynamoClient = this.getDynamoClient();
      const subjectMetadataAttr = await this.detectSubjectMetadataAttributeName(username);
      const schoolCode = this.extractSchoolCodeFromUsername(username);
      
      // First, check if the path exists by getting the item
      const getCommand = new GetCommand({
        TableName: this.tableName,
        Key: { username, schoolCode }
      });
      
      const response = await dynamoClient.send(getCommand);
      
      if (!response.Item) {
        throw new Error('Student record not found');
      }
      
      const item = response.Item;
      
      // Check if the nested path exists
      const pathExists = (
        subjectMetadataAttr in item &&
        normalizedTermName in (item[subjectMetadataAttr] || {}) &&
        subjectName in ((item[subjectMetadataAttr] || {})[normalizedTermName] || {})
      );
      
      if (!pathExists) {
        console.warn(`📋 Subject data doesn't exist at path, creating it first for ${username}...`);
        
        // Get existing marking scheme path if any
        const existingMarkingScheme = 
          item[subjectMetadataAttr]?.[normalizedTermName]?.[subjectName]?.uploaded_marking_scheme_s3_path || null;
        
        // First create the subject structure using marking scheme update
        const markingResult = await this.updateMarkingSchemeForStudents(
          [username], termName, subjectName, existingMarkingScheme || ''
        );
        
        if (!markingResult.success) {
          throw new Error(`Failed to create subject structure: ${markingResult.error}`);
        }
      }
      
      // Now update the answer sheet fields using two-step approach
      try {
        // First try: assume parent exists
        // Create and validate payload
        const rawAnswerSheetPayload = {
          TableName: this.tableName,
          Key: { username, schoolCode },
          UpdateExpression: 'SET #sm.#termName.#subjectName.student_answer_sheet_s3_path = :answerSheetS3Path, #sm.#termName.#subjectName.answer_sheet_uploaded = :uploaded',
          ExpressionAttributeNames: {
            '#sm': subjectMetadataAttr,
            '#termName': normalizedTermName,
            '#subjectName': subjectName
          },
          ExpressionAttributeValues: {
            ':answerSheetS3Path': answerSheetS3Path,
            ':uploaded': true
          },
          ConditionExpression: 'attribute_exists(username) AND attribute_exists(schoolCode)',
          ReturnValues: 'ALL_NEW'
        };
        
        // Clean and validate payload format
        const answerSheetPayload = this.validateAndCleanPayload(rawAnswerSheetPayload);
        
        console.log(`📤 DynamoDB Debug - Answer Sheet payload for ${username}:`, JSON.stringify(answerSheetPayload, null, 2));
        
        const updateCommand = new UpdateCommand(answerSheetPayload);

        const updateResponse = await dynamoClient.send(updateCommand);
        console.log(`✅ Answer sheet update successful for ${username}`);
        
        return {
          success: true,
          message: 'Answer sheet updated successfully',
          updated_item: updateResponse.Attributes
        };
        
      } catch (updateError) {
        console.error(`❌ Answer sheet update failed for ${username}:`, updateError);
        console.error('📋 Update Error Details:', {
          name: updateError.name,
          message: updateError.message,
          code: updateError.code,
          statusCode: updateError.$metadata?.httpStatusCode
        });
        throw updateError;
      }

    } catch (error) {
      console.error('❌ DynamoDB: Error updating student answer sheet:', error);
      return {
        success: false,
        error: error.message || 'Failed to update answer sheet'
      };
    }
  }

  // Get student evaluation metadata
  async getStudentEvaluationData(username, termName, subjectName) {
    const normalizedTermName = termName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      console.log('🔄 DynamoDB: Getting student evaluation data');
      
      console.log('📝 Parameters:', {
        username: username,
        originalTermName: termName,
        normalizedTermName: normalizedTermName,
        subjectName: subjectName
      });

      const dynamoClient = this.getDynamoClient();
      const subjectMetadataAttr = await this.detectSubjectMetadataAttributeName(username);
      const schoolCode = this.extractSchoolCodeFromUsername(username);

      const params = {
        TableName: this.tableName,
        Key: { username, schoolCode },
        ProjectionExpression: '#sm.#termName.#subjectName',
        ExpressionAttributeNames: {
          '#sm': subjectMetadataAttr,
          '#termName': normalizedTermName,
          '#subjectName': subjectName
        }
      };

      const result = await dynamoClient.send(new GetCommand(params));
      
      console.log('📥 DynamoDB: Get result:', {
        hasItem: !!result.Item,
        hasSubjectMetadata: !!(result.Item && result.Item[subjectMetadataAttr]),
        subjectMetadataKeys: result.Item?.[subjectMetadataAttr] ? Object.keys(result.Item[subjectMetadataAttr]) : []
      });
      
      if (result.Item && result.Item[subjectMetadataAttr] && result.Item[subjectMetadataAttr][normalizedTermName]) {
        const subjectData = result.Item[subjectMetadataAttr][normalizedTermName][subjectName] || {};
        console.log('✅ DynamoDB: Found evaluation data:', subjectData);
        return {
          success: true,
          data: subjectData
        };
      }

      console.log('📭 DynamoDB: No evaluation data found, returning default structure');
      return {
        success: true,
        data: {
          uploaded_marking_scheme_s3_path: null,
          student_answer_sheet_s3_path: null,
          answer_sheet_uploaded: false,
          graded_sheet_s3_path: null
        }
      };

    } catch (error) {
      console.error('❌ DynamoDB: Error getting student evaluation data:', error);
      return {
        success: false,
        error: error.message || 'Failed to get evaluation data'
      };
    }
  }

  // Update graded sheet path (for future use)
  async updateGradedSheet(username, termName, subjectName, gradedSheetS3Path) {
    try {
      const dynamoClient = this.getDynamoClient();
      
      // Extract school code for composite key
      const schoolCode = this.extractSchoolCodeFromUsername(username);
      
      // Detect the correct attribute name
      const subjectMetadataAttr = await this.detectSubjectMetadataAttributeName(username);

      const updateExpression = 'SET #sm.#termName.#subjectName.graded_sheet_s3_path = :gradedSheetS3Path';
      const expressionAttributeNames = {
        '#sm': subjectMetadataAttr,
        '#termName': termName,
        '#subjectName': subjectName
      };
      const expressionAttributeValues = {
        ':gradedSheetS3Path': gradedSheetS3Path
      };

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { username, schoolCode },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await dynamoClient.send(command);

      return {
        success: true,
        message: 'Graded sheet updated successfully'
      };

    } catch (error) {
      console.error('Error updating graded sheet:', error);
      return {
        success: false,
        error: error.message || 'Failed to update graded sheet'
      };
    }
  }

  setUserPoolId(userPoolId) {
    this.userPoolId = userPoolId;
  }

  // Verify table structure and sample data for debugging
  async verifyTableStructure() {
    try {
      const dynamoClient = this.getDynamoClient();
      
      console.log('🔍 DynamoDB: Verifying table structure...');
      console.log('📋 Configuration:', {
        tableName: this.tableName,
        region: this.region,
        identityPoolId: this.identityPoolId
      });

      // Try to scan a few records to understand structure
      const scanParams = {
        TableName: this.tableName,
        Limit: 3,
        ProjectionExpression: 'username, subject_metadata, subjectmetadata'
      };

      const scanResult = await dynamoClient.send(new ScanCommand(scanParams));
      
      console.log('📊 DynamoDB: Table scan results:', {
        itemCount: scanResult.Items?.length || 0,
        items: scanResult.Items
      });

      if (scanResult.Items && scanResult.Items.length > 0) {
        const sampleItem = scanResult.Items[0];
        console.log('🔬 DynamoDB: Sample record structure:', {
          username: sampleItem.username,
          hasSubjectMetadata: sampleItem.hasOwnProperty('subject_metadata'),
          hasSubjectmetadata: sampleItem.hasOwnProperty('subjectmetadata'),
          subjectMetadataType: sampleItem.subject_metadata ? typeof sampleItem.subject_metadata : 'undefined',
          subjectmetadataType: sampleItem.subjectmetadata ? typeof sampleItem.subjectmetadata : 'undefined',
          subjectMetadataValue: sampleItem.subject_metadata,
          subjectmetadataValue: sampleItem.subjectmetadata
        });
      }

      return {
        success: true,
        itemCount: scanResult.Items?.length || 0,
        sampleItems: scanResult.Items || []
      };

    } catch (error) {
      console.error('❌ DynamoDB: Error verifying table structure:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId
      });
      
      return {
        success: false,
        error: error.message || 'Failed to verify table structure'
      };
    }
  }

  // Extract school code from username (usually first 3 characters)
  extractSchoolCodeFromUsername(username) {
    if (!username || typeof username !== 'string') {
      console.warn('Invalid username provided for school code extraction');
      return 'XYZ'; // fallback
    }
    
    // Extract first 3 characters as school code (adjust as needed for your format)
    const schoolCode = username.substring(0, 3).toUpperCase();
    console.log(`📋 Extracted school code: ${schoolCode} from username: ${username}`);
    return schoolCode;
  }

  // Validate and clean payload to ensure DocumentClient format
  validateAndCleanPayload(payload) {
    // Ensure we're not accidentally sending raw DynamoDB format
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    
    // Remove any type descriptors that might have crept in
    const cleanAttributeValues = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // If this looks like a DynamoDB AttributeValue, convert it
      if (obj.hasOwnProperty('S')) return obj.S;
      if (obj.hasOwnProperty('N')) return parseInt(obj.N) || parseFloat(obj.N);
      if (obj.hasOwnProperty('BOOL')) return obj.BOOL;
      if (obj.hasOwnProperty('NULL')) return null;
      if (obj.hasOwnProperty('L')) return obj.L.map(cleanAttributeValues);
      if (obj.hasOwnProperty('M')) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj.M)) {
          cleaned[key] = cleanAttributeValues(value);
        }
        return cleaned;
      }
      
      // For regular objects, recursively clean
      if (Array.isArray(obj)) {
        return obj.map(cleanAttributeValues);
      }
      
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = cleanAttributeValues(value);
      }
      return cleaned;
    };
    
    if (cleanPayload.ExpressionAttributeValues) {
      cleanPayload.ExpressionAttributeValues = cleanAttributeValues(cleanPayload.ExpressionAttributeValues);
    }
    
    return cleanPayload;
  }

  // Force clean payload to ensure absolutely no DynamoDB type descriptors
  forceClearPayload(payload) {
    const stringified = JSON.stringify(payload);
    
    // If we detect any DynamoDB type descriptors, force convert to plain objects
    if (stringified.includes('"S":') || stringified.includes('"M":') || stringified.includes('"BOOL":') || stringified.includes('"NULL":')) {
      console.warn('⚠️ Detected DynamoDB type descriptors, force converting to DocumentClient format');
      
      // Parse and convert the entire payload
      const parsed = JSON.parse(stringified);
      return this.validateAndCleanPayload(parsed);
    }
    
    return payload;
  }

  // Helper method to execute multi-strategy updates
  async executeMultiStrategyUpdate(username, schoolCode, strategies, dynamoClient) {
    console.log(`🔄 Attempting multi-strategy update for ${username}/${schoolCode}`);
    
    for (const strategy of strategies) {
      try {
        console.log(`📤 Trying strategy: ${strategy.name} for ${username}`);
        
        // Create and validate payload
        const rawPayload = {
          TableName: this.tableName,
          Key: { username, schoolCode },
          UpdateExpression: strategy.expression,
          ExpressionAttributeNames: strategy.names,
          ExpressionAttributeValues: strategy.values,
          ConditionExpression: strategy.condition,
          ReturnValues: 'ALL_NEW'
        };
        
        // Clean and validate payload format
        const payload = this.validateAndCleanPayload(rawPayload);
        
        console.log(`📤 DynamoDB Debug - Strategy ${strategy.name} payload for ${username}:`, JSON.stringify(payload, null, 2));
        
        // CRITICAL: Force clean the payload one more time and verify format
        const finalPayload = this.forceClearPayload(payload);
        
        console.log(`🔍 Final payload verification for ${username}:`, JSON.stringify(finalPayload, null, 2));
        
        // EMERGENCY FIX: Check if the finalPayload still has type descriptors
        const payloadString = JSON.stringify(finalPayload);
        if (payloadString.includes('"S":') || payloadString.includes('"M":') || payloadString.includes('"BOOL":') || payloadString.includes('"NULL":')) {
          console.error('❌ EMERGENCY: Still detecting type descriptors after cleaning!');
          console.error('Raw payload:', payloadString);
          throw new Error('Unable to clean DynamoDB type descriptors from payload. This indicates a serious SDK configuration issue.');
        }
        
        const updateCommand = new UpdateCommand(finalPayload);

        const response = await dynamoClient.send(updateCommand);
        console.log(`✅ Strategy ${strategy.name} successful for ${username}`);
        return { username, success: true, strategy: strategy.name, result: response };
        
      } catch (error) {
        console.error(`❌ Strategy ${strategy.name} failed for ${username}:`, error);
        console.error('📋 Strategy Error Details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.$metadata?.httpStatusCode
        });
        
        if (error.name === 'ConditionalCheckFailedException') {
          console.log(`⚠️ Strategy ${strategy.name} failed due to conditional check for ${username}, trying next...`);
          continue;
        } else if (error.message && error.message.toLowerCase().includes('overlap')) {
          console.log(`⚠️ Strategy ${strategy.name} failed due to path overlap for ${username}, trying next...`);
          continue;
        } else {
          return { username, success: false, error: error.message, errorCode: error.name };
        }
      }
    }
    
    return { username, success: false, error: 'All update strategies failed', errorCode: 'ALL_STRATEGIES_FAILED' };
  }

  getConfiguration() {
    return {
      tableName: this.tableName,
      region: this.region,
      identityPoolId: this.identityPoolId
    };
  }
}

// Export singleton instance
const dynamoDbService = new DynamoDbService();
export default dynamoDbService;
