import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

export interface Company {
  id: string;
  name: string;
  nameKana?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  foundedDate?: Date;
  address?: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    street?: string;
    building?: string;
  };
  contact?: {
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
  };
  settings: {
    allowSelfRegistration: boolean;
    requireApproval: boolean;
    defaultRole: CompanyRole;
    features: {
      chat: boolean;
      orders: boolean;
      processes: boolean;
      dailyReports: boolean;
      inventory: boolean;
    };
  };
  billing?: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    nextBillingDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
  ownerId: string; // Current owner User ID
}

export type CompanyRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface CompanyMember {
  id: string; // Same as user ID
  companyId: string;
  userId: string;
  role: CompanyRole;
  department?: string;
  position?: string;
  joinedAt: Date;
  invitedBy?: string;
  inviteCode?: string;
  isActive: boolean;
  permissions?: {
    canInvite: boolean;
    canManageMembers: boolean;
    canManageSettings: boolean;
    canDeleteCompany: boolean;
    canTransferOwnership: boolean;
  };
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  code: string;
  email?: string; // Optional: specific email invitation
  role: CompanyRole;
  department?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
  usedAt?: Date;
  maxUses: number;
  useCount: number;
  isActive: boolean;
}

// =============================================================================
// COLLECTIONS
// =============================================================================

export const COMPANY_COLLECTIONS = {
  COMPANIES: 'companies',
  MEMBERS: 'companyMembers',
  INVITES: 'companyInvites',
  AUDIT_LOGS: 'companyAuditLogs',
} as const;

// =============================================================================
// ROLE HIERARCHY & PERMISSIONS
// =============================================================================

const ROLE_HIERARCHY: Record<CompanyRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  guest: 1,
};

export const ROLE_PERMISSIONS: Record<CompanyRole, CompanyMember['permissions']> = {
  owner: {
    canInvite: true,
    canManageMembers: true,
    canManageSettings: true,
    canDeleteCompany: true,
    canTransferOwnership: true,
  },
  admin: {
    canInvite: true,
    canManageMembers: true,
    canManageSettings: true,
    canDeleteCompany: false,
    canTransferOwnership: false,
  },
  manager: {
    canInvite: true,
    canManageMembers: false,
    canManageSettings: false,
    canDeleteCompany: false,
    canTransferOwnership: false,
  },
  member: {
    canInvite: false,
    canManageMembers: false,
    canManageSettings: false,
    canDeleteCompany: false,
    canTransferOwnership: false,
  },
  guest: {
    canInvite: false,
    canManageMembers: false,
    canManageSettings: false,
    canDeleteCompany: false,
    canTransferOwnership: false,
  },
};

// =============================================================================
// COMPANY CRUD OPERATIONS
// =============================================================================

/**
 * 新しい企業を作成
 */
export async function createCompany(
  userId: string,
  data: {
    name: string;
    nameKana?: string;
    description?: string;
    industry?: string;
  }
): Promise<Company> {
  const companyId = uuidv4();
  
  const company: Company = {
    id: companyId,
    name: data.name,
    nameKana: data.nameKana,
    description: data.description,
    industry: data.industry,
    settings: {
      allowSelfRegistration: false,
      requireApproval: true,
      defaultRole: 'member',
      features: {
        chat: true,
        orders: true,
        processes: true,
        dailyReports: true,
        inventory: true,
      },
    },
    billing: {
      plan: 'free',
      status: 'active',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
    ownerId: userId,
  };

  const batch = writeBatch(db);

  // undefined値を除去するヘルパー関数
  const removeUndefined = (obj: any) => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  };

  // 企業を作成
  batch.set(doc(db, COMPANY_COLLECTIONS.COMPANIES, companyId), removeUndefined({
    ...company,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  // オーナーをメンバーとして追加
  const memberId = `${companyId}_${userId}`;
  const member: CompanyMember = {
    id: memberId,
    companyId,
    userId,
    role: 'owner',
    joinedAt: new Date(),
    isActive: true,
    permissions: ROLE_PERMISSIONS.owner,
  };

  batch.set(doc(db, COMPANY_COLLECTIONS.MEMBERS, memberId), {
    ...member,
    joinedAt: serverTimestamp(),
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId,
    action: 'company.created',
    performedBy: userId,
    details: { companyName: data.name },
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  return company;
}

/**
 * 企業情報を取得
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  const docRef = doc(db, COMPANY_COLLECTIONS.COMPANIES, companyId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Company;
}

/**
 * 企業情報を更新
 */
export async function updateCompany(
  companyId: string,
  updates: Partial<Company>,
  performedBy: string
): Promise<void> {
  const batch = writeBatch(db);

  // 企業情報を更新
  batch.update(doc(db, COMPANY_COLLECTIONS.COMPANIES, companyId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId,
    action: 'company.updated',
    performedBy,
    details: { updates },
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// =============================================================================
// MEMBER MANAGEMENT
// =============================================================================

/**
 * メンバーを招待
 */
export async function createInvite(
  companyId: string,
  createdBy: string,
  options: {
    email?: string;
    role?: CompanyRole;
    department?: string;
    expiresInDays?: number;
    maxUses?: number;
  } = {}
): Promise<CompanyInvite> {
  const inviteId = uuidv4();
  const inviteCode = generateInviteCode();
  
  const invite: CompanyInvite = {
    id: inviteId,
    companyId,
    code: inviteCode,
    email: options.email,
    role: options.role || 'member',
    department: options.department,
    createdBy,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + (options.expiresInDays || 7) * 24 * 60 * 60 * 1000),
    maxUses: options.maxUses || (options.email ? 1 : 100),
    useCount: 0,
    isActive: true,
  };

  await setDoc(doc(db, COMPANY_COLLECTIONS.INVITES, inviteId), {
    ...invite,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(invite.expiresAt),
  });

  return invite;
}

/**
 * 招待コードで企業に参加
 */
export async function joinCompanyWithInvite(
  inviteCode: string,
  userId: string,
  userInfo: {
    name: string;
    email: string;
  }
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  // 招待コードを検索
  const inviteQuery = query(
    collection(db, COMPANY_COLLECTIONS.INVITES),
    where('code', '==', inviteCode),
    where('isActive', '==', true)
  );
  
  const inviteSnap = await getDocs(inviteQuery);
  
  if (inviteSnap.empty) {
    return { success: false, error: '無効な招待コードです' };
  }

  const inviteDoc = inviteSnap.docs[0];
  const invite = inviteDoc.data() as CompanyInvite;

  // 有効期限チェック
  if (invite.expiresAt.toDate() < new Date()) {
    return { success: false, error: '招待コードの有効期限が切れています' };
  }

  // 使用回数チェック
  if (invite.useCount >= invite.maxUses) {
    return { success: false, error: '招待コードの使用回数上限に達しています' };
  }

  // メールアドレスチェック（特定メール招待の場合）
  if (invite.email && invite.email !== userInfo.email) {
    return { success: false, error: 'この招待コードは別のメールアドレス宛です' };
  }

  const batch = writeBatch(db);

  // メンバーとして追加
  const memberId = `${invite.companyId}_${userId}`;
  const member: CompanyMember = {
    id: memberId,
    companyId: invite.companyId,
    userId,
    role: invite.role,
    department: invite.department,
    joinedAt: new Date(),
    invitedBy: invite.createdBy,
    inviteCode: invite.code,
    isActive: true,
    permissions: ROLE_PERMISSIONS[invite.role],
  };

  batch.set(doc(db, COMPANY_COLLECTIONS.MEMBERS, memberId), {
    ...member,
    joinedAt: serverTimestamp(),
  });

  // 招待コードの使用回数を更新
  batch.update(doc(db, COMPANY_COLLECTIONS.INVITES, inviteDoc.id), {
    useCount: invite.useCount + 1,
    usedBy: arrayUnion(userId),
    usedAt: serverTimestamp(),
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId: invite.companyId,
    action: 'member.joined',
    performedBy: userId,
    details: { 
      userName: userInfo.name,
      role: invite.role,
      inviteCode: invite.code,
    },
    timestamp: serverTimestamp(),
  });

  await batch.commit();

  return { success: true, companyId: invite.companyId };
}

/**
 * ユーザーの所属企業リストを取得
 */
export async function getUserCompanies(userId: string): Promise<CompanyMember[]> {
  console.log('🔍 getUserCompanies called for userId:', userId);
  
  const memberQuery = query(
    collection(db, COMPANY_COLLECTIONS.MEMBERS),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );

  console.log('📊 Executing query for user companies...');
  const snapshot = await getDocs(memberQuery);
  
  console.log('📊 Query result:', {
    size: snapshot.size,
    empty: snapshot.empty,
    docs: snapshot.docs.length
  });
  
  const companies = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log('👥 Found company membership:', {
      docId: doc.id,
      companyId: data.companyId,
      role: data.role,
      isActive: data.isActive
    });
    return {
      ...data,
      id: doc.id,
      joinedAt: data.joinedAt?.toDate() || new Date(),
    } as CompanyMember;
  });
  
  console.log('✅ getUserCompanies returning:', companies.length, 'companies');
  return companies;
}

/**
 * 企業のメンバーリストを取得
 */
export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const memberQuery = query(
    collection(db, COMPANY_COLLECTIONS.MEMBERS),
    where('companyId', '==', companyId),
    where('isActive', '==', true),
    orderBy('joinedAt', 'desc')
  );

  const snapshot = await getDocs(memberQuery);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      joinedAt: data.joinedAt?.toDate() || new Date(),
    } as CompanyMember;
  });
}

/**
 * メンバーの役職を変更
 */
export async function updateMemberRole(
  companyId: string,
  targetUserId: string,
  newRole: CompanyRole,
  performedBy: string
): Promise<void> {
  const memberId = `${companyId}_${targetUserId}`;
  
  const batch = writeBatch(db);

  // メンバーの役職を更新
  batch.update(doc(db, COMPANY_COLLECTIONS.MEMBERS, memberId), {
    role: newRole,
    permissions: ROLE_PERMISSIONS[newRole],
    updatedAt: serverTimestamp(),
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId,
    action: 'member.role_changed',
    performedBy,
    details: { 
      targetUserId,
      newRole,
    },
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * 企業の所有権を譲渡
 */
export async function transferOwnership(
  companyId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<void> {
  const batch = writeBatch(db);

  // 企業のオーナーIDを更新
  batch.update(doc(db, COMPANY_COLLECTIONS.COMPANIES, companyId), {
    ownerId: newOwnerId,
    updatedAt: serverTimestamp(),
  });

  // 新オーナーの役職をownerに変更
  const newOwnerMemberId = `${companyId}_${newOwnerId}`;
  batch.update(doc(db, COMPANY_COLLECTIONS.MEMBERS, newOwnerMemberId), {
    role: 'owner',
    permissions: ROLE_PERMISSIONS.owner,
    updatedAt: serverTimestamp(),
  });

  // 旧オーナーの役職をadminに変更
  const oldOwnerMemberId = `${companyId}_${currentOwnerId}`;
  batch.update(doc(db, COMPANY_COLLECTIONS.MEMBERS, oldOwnerMemberId), {
    role: 'admin',
    permissions: ROLE_PERMISSIONS.admin,
    updatedAt: serverTimestamp(),
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId,
    action: 'ownership.transferred',
    performedBy: currentOwnerId,
    details: { 
      fromUserId: currentOwnerId,
      toUserId: newOwnerId,
    },
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * メンバーを企業から削除
 */
export async function removeMember(
  companyId: string,
  targetUserId: string,
  performedBy: string
): Promise<void> {
  const memberId = `${companyId}_${targetUserId}`;
  
  const batch = writeBatch(db);

  // メンバーを非アクティブ化（完全削除ではなく）
  batch.update(doc(db, COMPANY_COLLECTIONS.MEMBERS, memberId), {
    isActive: false,
    deactivatedAt: serverTimestamp(),
    deactivatedBy: performedBy,
  });

  // 監査ログを記録
  const auditLogId = uuidv4();
  batch.set(doc(db, COMPANY_COLLECTIONS.AUDIT_LOGS, auditLogId), {
    id: auditLogId,
    companyId,
    action: 'member.removed',
    performedBy,
    details: { targetUserId },
    timestamp: serverTimestamp(),
  });

  await batch.commit();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * 招待コードを生成
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * ユーザーが特定の権限を持っているかチェック
 */
export function hasPermission(
  member: CompanyMember,
  permission: keyof CompanyMember['permissions']
): boolean {
  return member.permissions?.[permission] || false;
}

/**
 * ユーザーが特定の役職以上かチェック
 */
export function hasMinimumRole(
  memberRole: CompanyRole,
  requiredRole: CompanyRole
): boolean {
  return ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[requiredRole];
}