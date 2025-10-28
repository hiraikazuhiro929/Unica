import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { safeFirebaseOperation, retryOperation } from '../utils/errorHandling';
import { validateOrderData } from '../utils/validation';
import { managementNumberManager } from '../utils/managementNumber';
import { logBusinessAction } from './auditLogger';

// 受注案件の型定義
export interface OrderItem {
  id?: string;
  managementNumber: string;
  projectName: string;
  client: string;
  quantity: number;
  unit: string;
  orderDate: string;
  deliveryDate: string;
  description?: string;
  estimatedAmount?: number;
  status?: 'planning' | 'data-work' | 'processing' | 'finishing' | 'completed' | 'delayed';
  priority?: 'high' | 'medium' | 'low';
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  tags?: string[];
}

const COLLECTION_NAME = 'orders';

/**
 * 新しい受注案件を作成（製番管理統合版）
 */
export const createOrder = async (
  orderData: Omit<OrderItem, 'id' | 'createdAt' | 'updatedAt' | 'managementNumber'>,
  userInfo: {
    companyId: string;
    userId: string;
    userName: string;
    userRole: string;
  }
) => {
  // バリデーション
  const validation = validateOrderData(orderData);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors_legacy?.join(', ') || 'バリデーションエラー'
    };
  }
  
  try {
    // 1. 製番を生成
    const { managementNumber, recordId } = await managementNumberManager.generateManagementNumber('order', {
      projectName: orderData.projectName,
      client: orderData.client,
      assignee: orderData.assignedTo,
      quantity: orderData.quantity,
      priority: orderData.priority
    });

    const now = new Date().toISOString();
    const newOrder: Omit<OrderItem, 'id'> = {
      ...orderData,
      managementNumber,
      status: orderData.status || 'planning',
      priority: orderData.priority || 'medium',
      progress: orderData.progress || 0,
      createdAt: now,
      updatedAt: now,
    };

    // 2. 受注データを保存
    const result = await safeFirebaseOperation(
      async () => {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), newOrder);
        
        // 3. 製番管理に受注IDを関連付け
        await managementNumberManager.linkRelatedId(managementNumber, 'orderId', docRef.id);

        // 4. 監査ログを記録
        await logBusinessAction({
          companyId: userInfo.companyId,
          userId: userInfo.userId,
          userName: userInfo.userName,
          userRole: userInfo.userRole,
          action: 'created',
          actionType: 'create',
          resourceType: 'order',
          resourceId: docRef.id,
          resourceName: `${managementNumber} - ${orderData.projectName}`,
          details: `受注案件「${managementNumber} - ${orderData.projectName}」を作成しました（顧客: ${orderData.client}）`,
          metadata: {
            managementNumber,
            client: orderData.client,
            quantity: orderData.quantity,
            orderDate: orderData.orderDate,
            deliveryDate: orderData.deliveryDate
          },
          severity: 'medium',
          status: 'success'
        });

        return {
          success: true,
          id: docRef.id,
          managementNumber,
          data: { id: docRef.id, ...newOrder }
        };
      },
      `order_draft_${managementNumber}`
    );

    return result;
    
  } catch (error: Error | unknown) {
    console.error('Order creation failed:', error);

    // 失敗時の監査ログを記録
    await logBusinessAction({
      companyId: userInfo.companyId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      userRole: userInfo.userRole,
      action: 'create_failed',
      actionType: 'create',
      resourceType: 'order',
      resourceName: orderData.projectName,
      details: `受注案件「${orderData.projectName}」の作成に失敗しました（エラー: ${error.message || '不明なエラー'}）`,
      metadata: {
        error: error.message || '不明なエラー',
        client: orderData.client
      },
      severity: 'high',
      status: 'failure'
    });

    return {
      success: false,
      error: error.message || '受注作成に失敗しました'
    };
  }
};

/**
 * 受注案件を更新（バリデーション・エラーハンドリング付き）
 */
export const updateOrder = async (
  id: string,
  updateData: Partial<OrderItem>,
  userInfo: {
    companyId: string;
    userId: string;
    userName: string;
    userRole: string;
  }
) => {
  // 部分的なバリデーション（更新時は全項目必須ではない）
  if (updateData.quantity !== undefined && updateData.quantity <= 0) {
    return {
      success: false,
      error: '数量は1以上の数値を入力してください'
    };
  }
  
  const docRef = doc(db, COLLECTION_NAME, id);

  // 🔒 安全性対策: ステータス変更時のcompletedAt管理
  const processedUpdateData = { ...updateData };

  if ('status' in processedUpdateData) {
    if (processedUpdateData.status === 'completed') {
      // 完了時: completedAtを設定
      processedUpdateData.completedAt = new Date().toISOString();
    } else {
      // 未完了時: completedAtをクリア（アーカイブ誤実行防止）
      processedUpdateData.completedAt = null;
    }
  }

  const updatedData = {
    ...processedUpdateData,
    updatedAt: new Date().toISOString()
  };

  // リトライ機能付きで実行
  return await safeFirebaseOperation(
    async () => {
      // 既存データを取得（監査ログ用）
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() as OrderItem : null;

      await updateDoc(docRef, updatedData);

      // 監査ログを記録
      const resourceName = existingData
        ? `${existingData.managementNumber} - ${existingData.projectName}`
        : `案件ID: ${id}`;

      await logBusinessAction({
        companyId: userInfo.companyId,
        userId: userInfo.userId,
        userName: userInfo.userName,
        userRole: userInfo.userRole,
        action: 'updated',
        actionType: 'update',
        resourceType: 'order',
        resourceId: id,
        resourceName,
        details: `受注案件「${resourceName}」を更新しました`,
        metadata: {
          updatedFields: Object.keys(updateData),
          oldData: existingData ? {
            status: existingData.status,
            priority: existingData.priority,
            progress: existingData.progress
          } : null,
          newData: updateData
        },
        severity: 'low',
        status: 'success'
      });

      return {
        success: true,
        id,
        data: updatedData
      };
    },
    `order_update_${id}` // ローカルストレージキー
  );
};

/**
 * 受注案件を削除
 */
export const deleteOrder = async (
  id: string,
  userInfo: {
    companyId: string;
    userId: string;
    userName: string;
    userRole: string;
  }
) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    // 削除前にデータを取得（監査ログ用）
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() as OrderItem : null;

    await deleteDoc(docRef);

    // 監査ログを記録
    const resourceName = existingData
      ? `${existingData.managementNumber} - ${existingData.projectName}`
      : `案件ID: ${id}`;

    await logBusinessAction({
      companyId: userInfo.companyId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      userRole: userInfo.userRole,
      action: 'deleted',
      actionType: 'delete',
      resourceType: 'order',
      resourceId: id,
      resourceName,
      details: `受注案件「${resourceName}」を削除しました`,
      metadata: {
        deletedData: existingData ? {
          managementNumber: existingData.managementNumber,
          client: existingData.client,
          projectName: existingData.projectName,
          status: existingData.status,
          orderDate: existingData.orderDate,
          deliveryDate: existingData.deliveryDate
        } : null
      },
      severity: 'high',
      status: 'success'
    });

    return {
      success: true,
      id
    };
  } catch (error: Error | unknown) {
    console.error('Error deleting order:', error);

    // 失敗時の監査ログを記録
    await logBusinessAction({
      companyId: userInfo.companyId,
      userId: userInfo.userId,
      userName: userInfo.userName,
      userRole: userInfo.userRole,
      action: 'delete_failed',
      actionType: 'delete',
      resourceType: 'order',
      resourceId: id,
      details: `受注案件（ID: ${id}）の削除に失敗しました（エラー: ${error.message || '不明なエラー'}）`,
      metadata: {
        error: error.message || '不明なエラー'
      },
      severity: 'critical',
      status: 'failure'
    });

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 受注案件を取得（単一）
 */
export const getOrder = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        data: { id: docSnap.id, ...docSnap.data() } as OrderItem
      };
    } else {
      return {
        success: false,
        error: '受注案件が見つかりません'
      };
    }
  } catch (error: Error | unknown) {
    console.error('Error getting order:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 受注案件リストを取得
 */
export const getOrders = async (options?: {
  limit?: number;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  status?: string;
  client?: string;
}) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    
    // クエリを構築
    let queryConstraints: any[] = [];
    
    if (options?.status) {
      queryConstraints.push(where('status', '==', options.status));
    }
    
    if (options?.client) {
      queryConstraints.push(where('client', '==', options.client));
    }
    
    if (options?.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    }
    
    if (options?.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(queryRef);
    
    const orders: OrderItem[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderItem);
    });
    
    return {
      success: true,
      data: orders
    };
  } catch (error: Error | unknown) {
    console.error('Error getting orders:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * 受注案件のリアルタイム購読
 */
export const subscribeToOrders = (
  options: {
    limit?: number;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    status?: string;
    client?: string;
  } = {},
  callback: (orders: OrderItem[]) => void
) => {
  try {
    let q = collection(db, COLLECTION_NAME);
    
    // クエリを構築
    let queryConstraints: any[] = [];
    
    if (options.status) {
      queryConstraints.push(where('status', '==', options.status));
    }
    
    if (options.client) {
      queryConstraints.push(where('client', '==', options.client));
    }
    
    if (options.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
    }
    
    if (options.limit) {
      queryConstraints.push(limit(options.limit));
    }
    
    const queryRef = query(q, ...queryConstraints);
    
    const unsubscribe = onSnapshot(queryRef, (querySnapshot) => {
      const orders: OrderItem[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as OrderItem);
      });
      callback(orders);
    }, (error) => {
      console.error('Error in orders subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error: Error | unknown) {
    console.error('Error setting up orders subscription:', error);
    return () => {}; // 空の関数を返す
  }
};

/**
 * 受注案件の統計を計算
 */
export const calculateOrderStatistics = async () => {
  try {
    const { data: orders, success } = await getOrders();
    
    if (!success || !orders) {
      return {
        success: false,
        error: '受注案件データの取得に失敗しました'
      };
    }
    
    const stats = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + (order.estimatedAmount || 0), 0),
      urgentOrders: orders.filter(order => {
        const daysUntilDelivery = Math.ceil(
          (new Date(order.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilDelivery <= 7;
      }).length,
      avgOrderValue: orders.length > 0 
        ? orders.reduce((sum, order) => sum + (order.estimatedAmount || 0), 0) / orders.length 
        : 0,
      byStatus: {
        planning: orders.filter(o => o.status === 'planning').length,
        'data-work': orders.filter(o => o.status === 'data-work').length,
        processing: orders.filter(o => o.status === 'processing').length,
        finishing: orders.filter(o => o.status === 'finishing').length,
        completed: orders.filter(o => o.status === 'completed').length,
        delayed: orders.filter(o => o.status === 'delayed').length,
      },
      byPriority: {
        high: orders.filter(o => o.priority === 'high').length,
        medium: orders.filter(o => o.priority === 'medium').length,
        low: orders.filter(o => o.priority === 'low').length,
      }
    };
    
    return {
      success: true,
      data: stats
    };
  } catch (error: Error | unknown) {
    console.error('Error calculating order statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 管理番号の生成
 */
export const generateManagementNumber = async (prefix: string = 'ORD') => {
  try {
    const year = new Date().getFullYear();
    const { data: orders } = await getOrders({
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: 1
    });
    
    const nextNumber = orders && orders.length > 0 
      ? (parseInt(orders[0].managementNumber.split('-')[2]) || 0) + 1
      : 1;
    
    return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
  } catch (error: Error | unknown) {
    console.error('Error generating management number:', error);
    // フォールバック
    return `${prefix}-${new Date().getFullYear()}-001`;
  }
};

/**
 * バッチ操作：複数の受注案件を一括更新
 */
export const batchUpdateOrders = async (updates: { id: string; data: Partial<OrderItem> }[]) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, { ...data, updatedAt: now });
    });
    
    await batch.commit();
    
    return {
      success: true,
      updatedCount: updates.length
    };
  } catch (error: Error | unknown) {
    console.error('Error batch updating orders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 検索機能
 */
export const searchOrders = async (searchQuery: string, options?: {
  limit?: number;
  fields?: string[];
}) => {
  try {
    const { data: allOrders } = await getOrders({ limit: options?.limit || 100 });
    
    const searchFields = options?.fields || ['projectName', 'managementNumber', 'client', 'description'];
    const query = searchQuery.toLowerCase();
    
    const filteredOrders = allOrders?.filter(order => 
      searchFields.some(field => {
        const value = (order as any)[field];
        return value && value.toString().toLowerCase().includes(query);
      })
    ) || [];
    
    return {
      success: true,
      data: filteredOrders,
      count: filteredOrders.length
    };
  } catch (error: Error | unknown) {
    console.error('Error searching orders:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};