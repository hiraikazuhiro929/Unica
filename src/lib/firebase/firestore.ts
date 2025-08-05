import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

export interface FirestoreDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createDocument = async (
  collectionName: string, 
  data: any, 
  customId?: string
) => {
  try {
    const timestamp = serverTimestamp();
    const docData = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (customId) {
      const docRef = doc(db, collectionName, customId);
      await setDoc(docRef, docData);
      return { id: customId, error: null };
    } else {
      const docRef = await addDoc(collection(db, collectionName), docData);
      return { id: docRef.id, error: null };
    }
  } catch (error: any) {
    return { id: null, error: error.message };
  }
};

export const getDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        data: {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null
        },
        error: null
      };
    } else {
      return { data: null, error: 'Document not found' };
    }
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (
  collectionName: string, 
  documentId: string, 
  data: any
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const deleteDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const getDocuments = async (
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null
      };
    });
    
    return { data: documents, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

export const getDocumentsByField = async (
  collectionName: string,
  fieldName: string,
  value: any,
  orderByField?: string,
  limitCount?: number
) => {
  const constraints: QueryConstraint[] = [where(fieldName, '==', value)];
  
  if (orderByField) {
    constraints.push(orderBy(orderByField, 'desc'));
  }
  
  if (limitCount) {
    constraints.push(limit(limitCount));
  }
  
  return getDocuments(collectionName, constraints);
};

export const getPaginatedDocuments = async (
  collectionName: string,
  orderByField: string,
  limitCount: number,
  lastDoc?: DocumentData
) => {
  const constraints: QueryConstraint[] = [
    orderBy(orderByField, 'desc'),
    limit(limitCount)
  ];
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  
  return getDocuments(collectionName, constraints);
};

export const subscribeToDocument = (
  collectionName: string,
  documentId: string,
  callback: (data: any) => void
) => {
  const docRef = doc(db, collectionName, documentId);
  
  // Note: onSnapshot を使用する場合は、Firebase の import に追加が必要
  // import { onSnapshot } from 'firebase/firestore';
  // return onSnapshot(docRef, (doc) => {
  //   if (doc.exists()) {
  //     const data = doc.data();
  //     callback({
  //       id: doc.id,
  //       ...data,
  //       createdAt: data.createdAt?.toDate() || null,
  //       updatedAt: data.updatedAt?.toDate() || null
  //     });
  //   }
  // });
};

export const subscribeToCollection = (
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: any[]) => void
) => {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);
  
  // Note: onSnapshot を使用する場合は、Firebase の import に追加が必要
  // return onSnapshot(q, (querySnapshot) => {
  //   const documents = querySnapshot.docs.map(doc => {
  //     const data = doc.data();
  //     return {
  //       id: doc.id,
  //       ...data,
  //       createdAt: data.createdAt?.toDate() || null,
  //       updatedAt: data.updatedAt?.toDate() || null
  //     };
  //   });
  //   callback(documents);
  // });
};

export { 
  db,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
};