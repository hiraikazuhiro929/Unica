import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// コレクション名
export const PARTNERS_COLLECTIONS = {
  PARTNERS: 'partners',
  CONTACTS: 'partner-contacts',
  ORDERS: 'partner-orders',
  NOTES: 'partner-notes',
} as const;

// 型定義
export interface Partner {
  id: string;
  name: string;
  nameKana: string;
  type: PartnerType;
  category: PartnerCategory;
  status: "active" | "inactive" | "potential" | "suspended";
  priority: "low" | "normal" | "high" | "vip";
  isStarred: boolean;
  contactInfo: ContactInfo;
  address: Address;
  businessInfo: BusinessInfo;
  financialInfo: FinancialInfo;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

export interface ContactInfo {
  phone: string;
  fax?: string;
  email: string;
  website?: string;
}

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
}

export interface BusinessInfo {
  industry: string;
  employeeCount?: number;
  annualRevenue?: number;
  established?: Date;
  representativeName: string;
  representativeTitle: string;
}

export interface FinancialInfo {
  paymentTerms: string;
  creditLimit?: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
}

export interface PartnerOrder {
  id: string;
  partnerId: string;
  orderNumber: string;
  orderDate: Date;
  deliveryDate?: Date;
  status: "draft" | "confirmed" | "production" | "shipped" | "completed" | "cancelled";
  totalAmount: number;
  products: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerContact {
  id: string;
  partnerId: string;
  name: string;
  title: string;
  department?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerNote {
  id: string;
  partnerId: string;
  content: string;
  category: "general" | "meeting" | "call" | "email" | "other";
  author: string;
  createdAt: Date;
  createdBy: string;
}

export type PartnerType = "customer" | "supplier" | "both";
export type PartnerCategory = "automotive" | "electronics" | "machinery" | "medical" | "aerospace" | "other";

// パートナー操作関数
export const createPartner = async (partnerData: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, PARTNERS_COLLECTIONS.PARTNERS), {
      ...partnerData,
      businessInfo: {
        ...partnerData.businessInfo,
        established: partnerData.businessInfo.established ? Timestamp.fromDate(partnerData.businessInfo.established) : null,
      },
      lastContactDate: partnerData.lastContactDate ? Timestamp.fromDate(partnerData.lastContactDate) : null,
      nextFollowUpDate: partnerData.nextFollowUpDate ? Timestamp.fromDate(partnerData.nextFollowUpDate) : null,
      financialInfo: {
        ...partnerData.financialInfo,
        lastOrderDate: partnerData.financialInfo.lastOrderDate ? Timestamp.fromDate(partnerData.financialInfo.lastOrderDate) : null,
      },
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating partner:', error);
    throw error;
  }
};

export const getPartners = async (): Promise<Partner[]> => {
  try {
    const q = query(
      collection(db, PARTNERS_COLLECTIONS.PARTNERS),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        businessInfo: {
          ...data.businessInfo,
          established: data.businessInfo?.established?.toDate(),
        },
        financialInfo: {
          ...data.financialInfo,
          lastOrderDate: data.financialInfo?.lastOrderDate?.toDate(),
        },
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastContactDate: data.lastContactDate?.toDate(),
        nextFollowUpDate: data.nextFollowUpDate?.toDate(),
      } as Partner;
    });
  } catch (error) {
    console.error('Error getting partners:', error);
    throw error;
  }
};

export const updatePartner = async (id: string, updates: Partial<Partner>): Promise<void> => {
  try {
    const docRef = doc(db, PARTNERS_COLLECTIONS.PARTNERS, id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Date型のフィールドを適切に変換
    if (updates.businessInfo?.established) {
      updateData.businessInfo = {
        ...updateData.businessInfo,
        established: Timestamp.fromDate(updates.businessInfo.established),
      };
    }
    if (updates.lastContactDate) {
      updateData.lastContactDate = Timestamp.fromDate(updates.lastContactDate);
    }
    if (updates.nextFollowUpDate) {
      updateData.nextFollowUpDate = Timestamp.fromDate(updates.nextFollowUpDate);
    }
    if (updates.financialInfo?.lastOrderDate) {
      updateData.financialInfo = {
        ...updateData.financialInfo,
        lastOrderDate: Timestamp.fromDate(updates.financialInfo.lastOrderDate),
      };
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating partner:', error);
    throw error;
  }
};

export const deletePartner = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PARTNERS_COLLECTIONS.PARTNERS, id));
  } catch (error) {
    console.error('Error deleting partner:', error);
    throw error;
  }
};

// タイプ別取得
export const getPartnersByType = async (type: PartnerType): Promise<Partner[]> => {
  try {
    const q = query(
      collection(db, PARTNERS_COLLECTIONS.PARTNERS),
      where('type', '==', type),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastContactDate: doc.data().lastContactDate?.toDate(),
      nextFollowUpDate: doc.data().nextFollowUpDate?.toDate(),
    } as Partner));
  } catch (error) {
    console.error('Error getting partners by type:', error);
    throw error;
  }
};

// リアルタイム取得
export const subscribeToPartners = (callback: (partners: Partner[]) => void) => {
  const q = query(
    collection(db, PARTNERS_COLLECTIONS.PARTNERS),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const partners = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        businessInfo: {
          ...data.businessInfo,
          established: data.businessInfo?.established?.toDate(),
        },
        financialInfo: {
          ...data.financialInfo,
          lastOrderDate: data.financialInfo?.lastOrderDate?.toDate(),
        },
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        lastContactDate: data.lastContactDate?.toDate(),
        nextFollowUpDate: data.nextFollowUpDate?.toDate(),
      } as Partner;
    });
    callback(partners);
  });
};

// パートナー統計
export const getPartnerStatistics = async () => {
  try {
    const partners = await getPartners();
    
    const totalPartners = partners.length;
    const activePartners = partners.filter(p => p.status === 'active').length;
    const potentialPartners = partners.filter(p => p.status === 'potential').length;
    const customers = partners.filter(p => p.type === 'customer' || p.type === 'both').length;
    const suppliers = partners.filter(p => p.type === 'supplier' || p.type === 'both').length;
    const vipPartners = partners.filter(p => p.priority === 'vip').length;
    const totalRevenue = partners.reduce((sum, p) => sum + (p.financialInfo.totalRevenue || 0), 0);
    
    // フォローアップ期限切れ
    const now = new Date();
    const overdueFollowups = partners.filter(p => {
      if (!p.nextFollowUpDate) return false;
      return p.nextFollowUpDate < now;
    }).length;

    return {
      totalPartners,
      activePartners,
      potentialPartners,
      customers,
      suppliers,
      vipPartners,
      totalRevenue,
      overdueFollowups,
    };
  } catch (error) {
    console.error('Error getting partner statistics:', error);
    throw error;
  }
};