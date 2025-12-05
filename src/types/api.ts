/**
 * API type definitions
 */

export interface AssetUpdateData {
  name?: string;
  noAsset?: string;
  status?: string;
  serialNo?: string | null;
  purchaseDate?: Date | null;
  cost?: number | null;
  brand?: string | null;
  model?: string | null;
  siteId?: string | null;
  categoryId?: string | null;
  departmentId?: string | null;
  picId?: string | null;
  pic?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
}

export interface AssetData extends AssetUpdateData {
  id: string;
  dateCreated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  sortOrder: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  name: string;
  sortOrder: number;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  department?: string;
  position?: string;
  joinDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SO_ASSET_USER" | "VIEWER";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOSession {
  id: string;
  name: string;
  year: number;
  description?: string;
  notes?: string;
  completionNotes?: string;
  planStart?: Date;
  planEnd?: Date;
  status: string;
  totalAssets: number;
  scannedAssets: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SOAssetEntry {
  id: string;
  soSessionId: string;
  assetId: string;
  scannedAt: Date;
  status: string;
  isIdentified: boolean;
  isCrucial: boolean;
  crucialNotes?: string;
  tempPurchaseDate?: Date;
  tempName?: string;
  tempStatus?: string;
  tempNoAsset?: string;
  tempSerialNo?: string;
  tempPic?: string;
  tempNotes?: string;
  tempBrand?: string;
  tempModel?: string;
  tempCost?: number;
  tempImageUrl?: string;
  tempSiteId?: string;
  tempCategoryId?: string;
  tempDepartmentId?: string;
  tempPicId?: string;
  createdAt: Date;
  updatedAt: Date;
  asset?: AssetData;
  soSession?: SOSession;
}

export interface AssetEvent {
  id: string;
  assetId: string;
  type: string;
  actor?: string;
  checkoutId?: string;
  soSessionId?: string;
  soAssetEntryId?: string;
  payload?: string;
  createdAt: Date;
  asset?: AssetData;
  checkout?: AssetCheckout;
  soSession?: SOSession;
  soAssetEntry?: SOAssetEntry;
}

export interface AssetCheckout {
  id: string;
  assetId: string;
  assignToId: string;
  departmentId?: string;
  checkoutDate: Date;
  dueDate?: Date;
  notes?: string;
  signatureData?: string;
  status: string;
  returnedAt?: Date;
  returnNotes?: string;
  receivedById?: string;
  returnSignatureData?: string;
  createdAt: Date;
  updatedAt: Date;
  asset?: AssetData;
  assignTo?: Employee;
  receivedBy?: Employee;
  department?: Department;
}

export interface Backup {
  id: string;
  name: string;
  filePath: string;
  fileSize?: number;
  status: string;
  createdAt: Date;
  createdBy?: string;
  creator?: User;
}

export interface Log {
  id: string;
  level: string;
  message: string;
  data?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}