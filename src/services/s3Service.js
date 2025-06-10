// Dynamic imports with retry logic to handle webpack chunk loading issues
let S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand;
let fromCognitoIdentityPool;
let getSignedUrl;

const loadAWSModules = async (retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    if (!S3Client) {
      console.log("Loading AWS S3 module...");
      const s3Module = await import("@aws-sdk/client-s3");
      S3Client = s3Module.S3Client;
      PutObjectCommand = s3Module.PutObjectCommand;
      ListObjectsV2Command = s3Module.ListObjectsV2Command;
      DeleteObjectCommand = s3Module.DeleteObjectCommand;
      GetObjectCommand = s3Module.GetObjectCommand;
      console.log("✅ AWS S3 module loaded successfully");
    }
    
    if (!fromCognitoIdentityPool) {
      console.log("Loading AWS Cognito module...");
      const cognitoModule = await import("@aws-sdk/credential-provider-cognito-identity");
      fromCognitoIdentityPool = cognitoModule.fromCognitoIdentityPool;
      console.log("✅ AWS Cognito module loaded successfully");
    }
    
    if (!getSignedUrl) {
      console.log("Loading AWS S3 Presigner module...");
      const presignerModule = await import("@aws-sdk/s3-request-presigner");
      getSignedUrl = presignerModule.getSignedUrl;
      console.log("✅ AWS S3 Presigner module loaded successfully");
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

class S3Service {
  constructor() {
    this.bucketName = "project-adhyapak";
    this.region = "ap-south-1";
    this.identityPoolId = "ap-south-1:56a17246-e497-4430-9763-fcd44122c846";
    this.userPoolId = null; // Will be set dynamically from user token
    this.s3Client = null;
    this.sessionExpiredCallback = null;
  }

  // Set callback function to handle session expiry
  setSessionExpiredCallback(callback) {
    this.sessionExpiredCallback = callback;
  }

  // Check if token is expired by examining JWT payload
  isTokenExpired(token) {
    try {
      if (!token) return true;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp && payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }

  // Handle token expiry scenarios
  handleTokenExpiry() {
    console.warn('S3 Service: Token expired or unauthorized access detected');
    if (this.sessionExpiredCallback) {
      this.sessionExpiredCallback();
    }
  }

  // Extract user pool ID from ID token
  extractUserPoolId(idToken) {
    try {
      console.log("=== EXTRACTING USER POOL ID ===");
      // Decode JWT token to get issuer (iss) claim
      const tokenParts = idToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      
      console.log("Token payload iss:", payload.iss);
      
      // Extract user pool ID from issuer URL
      // Format: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
      const issuer = payload.iss;
      const userPoolId = issuer.split('/').pop();
      
      console.log("Extracted User Pool ID:", userPoolId);
      console.log("=== END EXTRACTING USER POOL ID ===");
      
      return userPoolId;
    } catch (error) {
      console.error("❌ Error extracting user pool ID:", error);
      // Fallback to a default format - user will need to provide correct one
      console.log("⚠️ Using fallback User Pool ID");
      return "ap-south-1_Xp11tf9vC"; // Default placeholder
    }
  }

  // Initialize S3 client with Cognito credentials
  async initializeS3Client(idToken) {
    try {
      console.log("=== S3 CLIENT INITIALIZATION DEBUG ===");
      console.log("1. Input ID Token:", idToken ? `${idToken.substring(0, 50)}...` : "No token provided");
      
      // Load AWS modules dynamically
      await loadAWSModules();
      
      // Check token expiry before initialization
      if (this.isTokenExpired(idToken)) {
        this.handleTokenExpiry();
        throw new Error('Token has expired. Please log in again.');
      }
      
      // Extract user pool ID from token if not already set
      if (!this.userPoolId) {
        this.userPoolId = this.extractUserPoolId(idToken);
      }

      console.log("2. Extracted User Pool ID:", this.userPoolId);
      console.log("3. Identity Pool ID:", this.identityPoolId);
      console.log("4. Region:", this.region);

      const cognitoIdentityProvider = `cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
      console.log("5. Login Provider Key:", cognitoIdentityProvider);
      
      // Decode token to see its contents
      try {
        const tokenParts = idToken.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log("6. Token Payload:", {
          iss: payload.iss,
          aud: payload.aud,
          token_use: payload.token_use,
          auth_time: payload.auth_time,
          exp: payload.exp,
          sub: payload.sub,
          username: payload.username || payload.preferred_username || payload['cognito:username']
        });
        
        // Verify token issuer matches our login provider
        const expectedIssuer = `https://${cognitoIdentityProvider}`;
        console.log("7. Expected Issuer:", expectedIssuer);
        console.log("8. Actual Issuer:", payload.iss);
        console.log("9. Issuer Match:", payload.iss === expectedIssuer);
        
      } catch (decodeError) {
        console.error("6. Error decoding token:", decodeError);
      }

      console.log("10. Creating credential provider...");
      const credentials = fromCognitoIdentityPool({
        clientConfig: { region: this.region },
        identityPoolId: this.identityPoolId,
        logins: {
          [cognitoIdentityProvider]: idToken
        }
      });

      console.log("11. Creating S3 client...");
      this.s3Client = new S3Client({
        region: this.region,
        credentials
      });

      console.log("12. S3 client created successfully");
      console.log("=== END S3 CLIENT INITIALIZATION DEBUG ===");
      return this.s3Client;
    } catch (error) {
      console.error("❌ Error initializing S3 client:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      throw new Error("Failed to initialize S3 client. Please check your Cognito configuration.");
    }
  }

  // Get S3 client instance
  getS3Client() {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized. Call initializeS3Client first.");
    }
    return this.s3Client;
  }

  // Validate file type and size
  validateFile(file) {
    const allowedTypes = {
      'application/pdf': { maxSize: 10 * 1024 * 1024, category: 'document' }, // 10MB
      'image/png': { maxSize: 2 * 1024 * 1024, category: 'image' }, // 2MB
      'image/jpg': { maxSize: 2 * 1024 * 1024, category: 'image' }, // 2MB
      'image/jpeg': { maxSize: 2 * 1024 * 1024, category: 'image' }, // 2MB
      'image/gif': { maxSize: 2 * 1024 * 1024, category: 'image' }, // 2MB
    };

    const fileType = file.type;
    const fileSize = file.size;

    if (!allowedTypes[fileType]) {
      return {
        isValid: false,
        error: `File type ${fileType} is not supported. Supported types: PDF, PNG, JPG, JPEG`
      };
    }

    if (fileSize > allowedTypes[fileType].maxSize) {
      const maxSizeMB = allowedTypes[fileType].maxSize / (1024 * 1024);
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${maxSizeMB}MB for ${allowedTypes[fileType].category} files`
      };
    }

    return { isValid: true };
  }

  // Validate upload batch constraints
  validateUploadBatch(files) {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    const imageFiles = files.filter(file => 
      file.type === 'image/png' || 
      file.type === 'image/jpg' || 
      file.type === 'image/jpeg' ||
      file.type === 'image/gif'
    );

    // Check PDF file count limit
    if (pdfFiles.length > 5) {
      return {
        isValid: false,
        error: `Cannot upload more than 5 PDF files at once. You selected ${pdfFiles.length} PDF files.`
      };
    }

    // Check image file count limit
    if (imageFiles.length > 5) {
      return {
        isValid: false,
        error: `Cannot upload more than 5 image files at once. You selected ${imageFiles.length} image files.`
      };
    }

    return { isValid: true };
  }

  // Check if category has reached file limit
  async checkCategoryFileLimit(s3Prefix) {
    try {
      const result = await this.listFiles(s3Prefix);
      
      if (!result.success) {
        // If we can't check, allow upload but warn
        console.warn('Could not check file count limit:', result.error);
        return { isAtLimit: false, count: 0 };
      }

      const currentCount = result.files.length;
      
      return {
        isAtLimit: currentCount >= 20,
        count: currentCount,
        remaining: Math.max(0, 20 - currentCount)
      };
    } catch (error) {
      console.error('Error checking file limit:', error);
      // If we can't check, allow upload but warn
      return { isAtLimit: false, count: 0 };
    }
  }

  // Sanitize filename
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Clean class number to extract just the number
  cleanClassNumber(classNumber) {
    if (typeof classNumber === 'string') {
      // Remove various prefixes and suffixes to get just the number
      return classNumber
        .replace(/^class-?/i, '') // Remove 'class-' or 'class' prefix
        .replace(/^Class/i, '') // Remove 'Class' prefix
        .replace(/th$|st$|nd$|rd$/i, ''); // Remove ordinal suffixes
    }
    return classNumber;
  }

  // Transform breadcrumb text to S3-compliant segment
  breadcrumbToS3Segment(breadcrumb) {
    if (!breadcrumb || typeof breadcrumb !== 'string') {
      return '';
    }
    
    return breadcrumb
      // Remove special characters like apostrophes
      .replace(/['']/g, '')
      // Split by spaces and capitalize each word
      .split(' ')
      .map(word => {
        // Preserve common acronyms (all uppercase, 2-4 characters)
        if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase()) {
          return word;
        }
        // Regular PascalCase transformation
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      // Join without spaces (PascalCase)
      .join('');
  }

  // Transform breadcrumbs array to S3 path (excluding username and Dashboard)
  transformBreadcrumbsToS3Path(breadcrumbs) {
    if (!breadcrumbs || !Array.isArray(breadcrumbs) || breadcrumbs.length === 0) {
      return '';
    }
    
    // Skip "Dashboard" breadcrumb (first item) and transform the rest
    const pathSegments = breadcrumbs
      .slice(1) // Skip Dashboard
      .map(breadcrumb => this.breadcrumbToS3Segment(breadcrumb))
      .filter(segment => segment.length > 0);
    
    return pathSegments.join('/');
  }

  // Construct S3 key path using breadcrumbs
  constructS3Key(username, breadcrumbs, filename) {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const s3Path = this.transformBreadcrumbsToS3Path(breadcrumbs);
    
    if (!s3Path) {
      // Fallback to old behavior if breadcrumbs are not available
      throw new Error('Breadcrumbs are required for S3 path generation');
    }
    
    return `${username}/${s3Path}/${sanitizedFilename}`;
  }

  // Legacy method for backward compatibility - deprecated
  constructS3KeyLegacy(username, classNumber, module, subject, subSection, filename) {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const cleanClass = this.cleanClassNumber(classNumber);
    
    let path = `${username}/ClassSelector/Class${cleanClass}/${module}`;
    
    if (subject) {
      path += `/${subject}`;
    }
    
    if (subSection) {
      path += `/${subSection}`;
    }
    
    path += `/${sanitizedFilename}`;
    
    return path;
  }

  // Upload file to S3
  async uploadFile(file, s3Key, onProgress = null) {
    try {
      const s3Client = this.getS3Client();
      
      // Convert File to ArrayBuffer for browser compatibility
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);
      
      const params = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: uint8Array,
        ContentType: file.type,
        ContentLength: file.size,
      };

      console.log(`📤 Uploading file: ${file.name} (${file.size} bytes) to ${s3Key}`);
      
      const command = new PutObjectCommand(params);
      
      // For progress tracking, we'd need to use multipart upload for large files
      // For now, using simple put operation
      const result = await s3Client.send(command);
      
      console.log(`✅ Upload successful: ${s3Key}`, result);
      
      return {
        success: true,
        key: s3Key,
        etag: result.ETag,
        location: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`
      };
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      return {
        success: false,
        error: error.message || "Failed to upload file"
      };
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, getS3KeyFunction, onProgress = null) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        results.push({
          file: file.name,
          success: false,
          error: validation.error
        });
        errorCount++;
        continue;
      }

      // Get S3 key for this file
      const s3Key = getS3KeyFunction(file.name);
      
      // Upload file
      const result = await this.uploadFile(file, s3Key);
      results.push({
        file: file.name,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Call progress callback
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: files.length,
          successCount,
          errorCount,
          currentFile: file.name
        });
      }
    }

    return {
      results,
      summary: {
        total: files.length,
        success: successCount,
        errors: errorCount
      }
    };
  }

  // List files in S3 prefix
  async listFiles(s3Prefix) {
    try {
      const s3Client = this.getS3Client();
      
      const params = {
        Bucket: this.bucketName,
        Prefix: s3Prefix,
      };

      const command = new ListObjectsV2Command(params);
      const data = await s3Client.send(command);
      
      // Filter out folder objects and return file details
      const files = data.Contents 
        ? data.Contents
            .filter(item => !item.Key.endsWith('/'))
            .map(item => ({
              key: item.Key,
              name: item.Key.split('/').pop(),
              size: item.Size,
              lastModified: item.LastModified,
              formattedSize: this.formatFileSize(item.Size),
              formattedDate: this.formatDate(item.LastModified),
              fileType: this.getFileType(item.Key)
            }))
        : [];

      return {
        success: true,
        files,
        count: files.length
      };
    } catch (error) {
      console.error("Error listing files:", error);
      return {
        success: false,
        error: error.message || "Failed to list files",
        files: []
      };
    }
  }

  // Generate pre-signed URL for file viewing
  async getFileViewUrl(s3Key, expiresIn = 3600) {
    try {
      const s3Client = this.getS3Client();
      
      const params = { 
        Bucket: this.bucketName, 
        Key: s3Key 
      };
      
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(s3Client, command, { expiresIn });
      
      return {
        success: true,
        url
      };
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return {
        success: false,
        error: error.message || "Failed to generate file URL"
      };
    }
  }

  // Delete file from S3
  async deleteFile(s3Key) {
    try {
      const s3Client = this.getS3Client();
      
      const params = {
        Bucket: this.bucketName,
        Key: s3Key,
      };

      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);
      
      return {
        success: true,
        message: "File deleted successfully"
      };
    } catch (error) {
      console.error("Error deleting file:", error);
      return {
        success: false,
        error: error.message || "Failed to delete file"
      };
    }
  }

  // Delete multiple files
  async deleteMultipleFiles(s3Keys, onProgress = null) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < s3Keys.length; i++) {
      const s3Key = s3Keys[i];
      
      const result = await this.deleteFile(s3Key);
      results.push({
        key: s3Key,
        fileName: s3Key.split('/').pop(),
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Call progress callback
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: s3Keys.length,
          successCount,
          errorCount,
          currentFile: s3Key.split('/').pop()
        });
      }
    }

    return {
      results,
      summary: {
        total: s3Keys.length,
        success: successCount,
        errors: errorCount
      }
    };
  }

  // Utility: Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Utility: Format date
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Utility: Get file type from extension
  getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'PDF Document',
      png: 'PNG Image',
      jpg: 'JPEG Image',
      jpeg: 'JPEG Image',
      gif: 'GIF Image'
    };
    return typeMap[extension] || 'Unknown';
  }

  // Get S3 prefix for listing files using breadcrumbs
  getS3Prefix(username, breadcrumbs) {
    const s3Path = this.transformBreadcrumbsToS3Path(breadcrumbs);
    
    if (!s3Path) {
      // Fallback to root user folder if breadcrumbs are not available
      throw new Error('Breadcrumbs are required for S3 path generation');
    }
    
    return `${username}/${s3Path}/`;
  }

  // Legacy method for backward compatibility - deprecated
  getS3PrefixLegacy(username, classNumber, module, subject = null, subSection = null) {
    const cleanClass = this.cleanClassNumber(classNumber);
    let prefix = `${username}/ClassSelector/Class${cleanClass}/${module}`;
    
    if (subject) {
      prefix += `/${subject}`;
    }
    
    if (subSection) {
      prefix += `/${subSection}`;
    }
    
    prefix += '/';
    
    return prefix;
  }

  // Set user pool ID manually if needed
  setUserPoolId(userPoolId) {
    this.userPoolId = userPoolId;
  }

  // Get current configuration
  getConfiguration() {
    return {
      bucketName: this.bucketName,
      region: this.region,
      identityPoolId: this.identityPoolId,
      userPoolId: this.userPoolId
    };
  }
}

// Export singleton instance
const s3Service = new S3Service();
export default s3Service;