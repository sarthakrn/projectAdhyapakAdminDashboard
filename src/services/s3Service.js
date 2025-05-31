import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

class S3Service {
  constructor() {
    this.bucketName = "project-adhyapak";
    this.region = "ap-south-1";
    this.identityPoolId = "ap-south-1:56a17246-e497-4430-9763-fcd44122c846";
    this.userPoolId = null; // Will be set dynamically from user token
    this.s3Client = null;
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
      'application/pdf': { maxSize: 50 * 1024 * 1024, category: 'document' }, // 50MB
      'image/png': { maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
      'image/jpg': { maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
      'image/jpeg': { maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
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

  // Construct S3 key path
  constructS3Key(username, classNumber, module, subject, subSection, filename) {
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
      jpeg: 'JPEG Image'
    };
    return typeMap[extension] || 'Unknown';
  }

  // Get S3 prefix for listing files
  getS3Prefix(username, classNumber, module, subject = null, subSection = null) {
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