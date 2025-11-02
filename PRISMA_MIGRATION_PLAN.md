# Complete Prisma to Supabase Migration Plan

## 🎯 **Current Status Analysis**

### ✅ **Already Migrated (Working)**
- **Authentication System** - `/api/auth/*` (login, register, me)
- **Dashboard API** - `/api/dashboard/`
- **SO Sessions API (basic)** - `/api/so-sessions/` (GET, POST)
- **Library Files** - `src/lib/auth.ts`, `src/lib/logging.ts`

### 🔴 **Still Using Prisma (48 files total)**

#### **Critical API Routes (12 files) - HIGH PRIORITY**
```
src/app/api/assets/
├── [id]/route.ts          - Asset CRUD (GET, PUT, DELETE)
├── [id]/custom-values/    - Custom field values
├── bulk/                  - Bulk operations
├── by-number/             - Find by asset number
├── check-duplicates/      - Check duplicates
├── export/                - Export assets
├── generate-number/       - Generate asset numbers
├── import/                - Import assets
└── route.ts               - Asset listing (✅ Already Supabase)

src/app/api/employees/
├── [id]/route.ts          - Employee CRUD
├── import/                - Import employees
└── route.ts               - Employee listing

src/app/api/sites/
├── [id]/route.ts          - Site CRUD
└── route.ts               - Site listing

src/app/api/departments/
├── [id]/route.ts          - Department CRUD
└── route.ts               - Department listing

src/app/api/categories/
├── [id]/route.ts          - Category CRUD
└── route.ts               - Category listing
```

#### **SO Session Routes (8 files) - MEDIUM PRIORITY**
```
src/app/api/so-sessions/
├── [id]/
│   ├── cancel/             - Cancel session
│   ├── complete/           - Complete session
│   ├── delete/             - Delete session
│   ├── entries/            - Manage entries
│   ├── scan/               - Scan functionality
│   └── unidentified-assets/ - Unidentified assets
└── route.ts               - ✅ Already migrated (basic)
```

#### **Admin Routes (3 files) - LOW PRIORITY**
```
src/app/api/admin/
├── users/                 - User management
├── sessions/              - Session management
└── reports/               - Report generation
```

#### **Custom Fields & Other API Routes (5 files)**
```
src/app/api/custom-fields/
├── [id]/route.ts          - Custom field CRUD
└── route.ts               - Custom field listing

src/app/api/
├── logs/                  - System logs
├── pics/                  - Photo management
├── verify-assets/         - Asset verification
└── [other routes...]
```

## 🚀 **Migration Strategy**

### **Phase 1: Critical Core APIs (Immediate Impact)**
**Target**: Asset, Employee, Site, Department, Category CRUD operations
**Impact**: Core application functionality
**Priority**: HIGH
**Estimated Time**: 2-3 hours

#### **Migration Pattern Example:**
```typescript
// BEFORE (Prisma)
import { db } from '@/lib/db'

const asset = await db.asset.findUnique({
  where: { id: assetId }
})

// AFTER (Supabase)
import { supabaseAdmin } from '@/lib/supabase'

const { data: asset, error } = await supabaseAdmin
  .from('assets')
  .select('*')
  .eq('id', assetId)
  .single()

if (error) {
  console.error('Database error:', error)
  return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
}
```

### **Phase 2: SO Session Features (Medium Priority)**
**Target**: Complete SO session functionality
**Impact**: Stock opsession features
**Priority**: MEDIUM
**Estimated Time**: 2-3 hours

### **Phase 3: Admin & Advanced Features (Low Priority)**
**Target**: Admin panel, reports, custom fields
**Impact**: Admin functionality and advanced features
**Priority**: LOW
**Estimated Time**: 3-4 hours

## 📋 **Column Name Mappings (Critical)**

| Prisma Column | Supabase Column | Notes |
|---------------|-----------------|-------|
| `createdAt` | `createdat` | ✅ Already migrated |
| `updatedAt` | `updatedat` | ✅ Already migrated |
| `isActive` | `isactive` | ✅ Already migrated |
| `siteId` | `site_id` | Need to migrate |
| `categoryId` | `category_id` | Need to migrate |
| `departmentId` | `department_id` | Need to migrate |
| `picId` | `pic_id` | Need to migrate |
| `serialNo` | `serial_no` | Need to migrate |
| `purchaseDate` | `purchase_date` | Need to migrate |
| `imageUrl` | `image_url` | Need to migrate |
| `soSessionId` | `so_session_id` | Need to migrate |
| `customFieldId` | `custom_field_id` | Need to migrate |

## 🔧 **Tools Available**

### **1. Auto-Migration Script**
- Location: `auto-migrate-prisma-to-supabase.js`
- Purpose: Automated basic migration patterns
- **⚠️ Use with caution** - Manual review required

### **2. Complete Database Schema**
- Location: `complete-supabase-schema.sql`
- Purpose: Reference for table and column names
- **✅ Already applied** in Supabase

### **3. Migration Patterns**
```typescript
// Import replacement
// FROM: import { db } from '@/lib/db'
// TO:   import { supabaseAdmin } from '@/lib/supabase'

// Query replacement
// FROM: await db.asset.findMany()
// TO:   const { data, error } = await supabaseAdmin.from('assets').select('*')

// Error handling
if (error) {
  console.error('Database error:', error)
  return NextResponse.json({ error: 'Database operation failed' }, { status: 500 })
}

// Response transformation
return NextResponse.json(data || [])
```

## 🎯 **Recommended Action Plan**

### **Option 1: Gradual Migration (Recommended)**
1. **Deploy current fixes** (auth, dashboard, basic SO sessions)
2. **Test core functionality** in Vercel
3. **Migrate Phase 1 APIs** (critical CRUD operations)
4. **Test and deploy** each phase
5. **Continue with remaining phases**

### **Option 2: Complete Migration (Aggressive)**
1. **Migrate all 48 files** using patterns above
2. **Fix compilation errors**
3. **Test all functionality**
4. **Deploy complete solution**
5. **Remove Prisma dependencies**

### **Option 3: Hybrid Approach (Current Status)**
1. **Keep Prisma for complex operations** temporarily
2. **Use Supabase for critical paths** (auth, dashboard)
3. **Gradually migrate over time**
4. **Maintain both systems** during transition

## ⚡ **Quick Wins (Can be migrated in 30 minutes)**

1. **Assets GET/POST** - Already Supabase ✅
2. **Sites listing** - Simple table queries
3. **Categories listing** - Simple table queries
4. **Departments listing** - Simple table queries
5. **Employees listing** - Simple table queries

## 🚨 **Blockers & Considerations**

1. **Complex Relationships** - Asset ↔ Site/Category/Department joins
2. **Error Handling** - Need robust Supabase error handling
3. **Data Validation** - Ensure data integrity during migration
4. **Performance** - Optimize queries for Supabase
5. **Transactions** - Complex operations may need transaction handling

## 📊 **Success Metrics**

- ✅ All API routes return 200 OK
- ✅ No Prisma client initialization errors
- ✅ Full CRUD functionality works
- ✅ Authentication flows work
- ✅ Dashboard loads correctly
- ✅ SO sessions work completely

## 🔄 **Next Immediate Steps**

1. **Test current deployment** with completed schema
2. **Identify remaining failing routes** in Vercel
3. **Migrate 1-2 critical routes** as proof of concept
4. **Establish migration patterns** based on working examples
5. **Apply patterns to remaining routes**

## 💡 **Recommendation**

**Start with Option 1 (Gradual Migration)** because:
- ✅ Current fixes already solve main authentication issues
- ✅ Application will be functional in Vercel
- ✅ Lower risk of breaking existing functionality
- ✅ Can validate migration patterns before full commitment
- ✅ Allows incremental testing and deployment