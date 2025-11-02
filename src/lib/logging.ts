import { supabaseAdmin } from './supabase';

export interface LogData {
  userId: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "VIEW"
    | "LOGIN"
    | "LOGOUT"
    | "EXPORT"
    | "IMPORT";
  entityType: string;
  entityId: string;
  description?: string;
  oldValues?: string; // JSON string
  newValues?: string; // JSON string
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create a system log entry
 */
export async function createLog(logData: LogData) {
  try {
    const { error } = await supabaseAdmin
      .from('logs')
      .insert({
        user_id: logData.userId,
        level: 'INFO',
        message: logData.description || `${logData.action} ${logData.entityType}`,
        data: {
          action: logData.action,
          entity_type: logData.entityType,
          entity_id: logData.entityId,
          old_values: logData.oldValues,
          new_values: logData.newValues
        },
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent
      });

    if (error) {
      console.error("Failed to create system log:", error);
    }
  } catch (error) {
    console.error("Failed to create system log:", error);
  }
}

/**
 * Create a log entry for asset creation
 */
export async function logAssetCreation(
  userId: string,
  assetId: string,
  assetName: string,
  assetData: any
) {
  return createLog({
    userId,
    action: "CREATE",
    entityType: "Asset",
    entityId: assetId,
    description: `Created asset: ${assetName}`,
    newValues: JSON.stringify(assetData),
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for asset update
 */
export async function logAssetUpdate(
  userId: string,
  assetId: string,
  assetName: string,
  oldData: any,
  newData: any
) {
  return createLog({
    userId,
    action: "UPDATE",
    entityType: "Asset",
    entityId: assetId,
    description: `Updated asset: ${assetName}`,
    oldValues: JSON.stringify(oldData),
    newValues: JSON.stringify(newData),
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for asset deletion
 */
export async function logAssetDeletion(
  userId: string,
  assetId: string,
  assetName: string,
  assetData: any
) {
  return createLog({
    userId,
    action: "DELETE",
    entityType: "Asset",
    entityId: assetId,
    description: `Deleted asset: ${assetName}`,
    oldValues: JSON.stringify(assetData),
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for asset view
 */
export async function logAssetView(
  userId: string,
  assetId: string,
  assetName: string
) {
  return createLog({
    userId,
    action: "VIEW",
    entityType: "Asset",
    entityId: assetId,
    description: `Viewed asset: ${assetName}`,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for user login
 */
export async function logUserLogin(userId: string, userEmail: string) {
  return createLog({
    userId,
    action: "LOGIN",
    entityType: "User",
    entityId: userId,
    description: `User logged in: ${userEmail}`,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for user logout
 */
export async function logUserLogout(userId: string, userEmail: string) {
  return createLog({
    userId,
    action: "LOGOUT",
    entityType: "User",
    entityId: userId,
    description: `User logged out: ${userEmail}`,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Create a log entry for data export
 */
export async function logDataExport(
  userId: string,
  entityType: string,
  count?: number
) {
  return createLog({
    userId,
    action: "EXPORT",
    entityType,
    entityId: "all",
    description: `Exported ${count || ""} ${entityType}(s)`,
    ipAddress: getClientIP(),
    userAgent: getUserAgent(),
  });
}

/**
 * Get client IP address (server-side only)
 */
function getClientIP(): string {
  // This is a placeholder - in a real implementation,
  // you would extract the IP from the request headers
  return "unknown";
}

/**
 * Get user agent string (server-side only)
 */
function getUserAgent(): string {
  // This is a placeholder - in a real implementation,
  // you would extract the user agent from the request headers
  return "unknown";
}
