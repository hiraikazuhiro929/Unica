import { db, storage } from '@/lib/firebase/config';
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
  Timestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata
} from 'firebase/storage';

export const FILE_COLLECTIONS = {
  files: 'files',
  folders: 'folders',
};

interface FileMetadata {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  path: string;
  size?: number;
  fileType?: string;
  downloadUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  modifiedBy: string;
}

// ファイルをFirebase Storageにアップロード
export async function uploadFile(
  file: File,
  path: string,
  metadata: Omit<FileMetadata, 'downloadUrl' | 'createdAt' | 'updatedAt'>
): Promise<FileMetadata> {
  try {
    // Storage参照を作成
    const storageRef = ref(storage, `files/${path}/${file.name}`);

    // ファイルをアップロード
    const snapshot = await uploadBytes(storageRef, file);

    // ダウンロードURLを取得
    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Firestoreにメタデータを保存
    const fileDoc: FileMetadata = {
      ...metadata,
      downloadUrl,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, FILE_COLLECTIONS.files, metadata.id), fileDoc);

    return fileDoc;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// ファイルシステムの構造を取得
export async function getFileSystem(): Promise<FileMetadata[]> {
  try {
    const filesQuery = query(
      collection(db, FILE_COLLECTIONS.files),
      orderBy('path')
    );

    const snapshot = await getDocs(filesQuery);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as FileMetadata));
  } catch (error) {
    console.error('Error fetching file system:', error);
    throw error;
  }
}

// ファイルを削除
export async function deleteFile(fileId: string, storagePath?: string): Promise<void> {
  try {
    // Firestoreからメタデータを削除
    await deleteDoc(doc(db, FILE_COLLECTIONS.files, fileId));

    // Storageからファイルを削除
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// フォルダを作成
export async function createFolder(
  name: string,
  parentId: string | null,
  path: string,
  userId: string
): Promise<FileMetadata> {
  try {
    const folderId = `folder-${Date.now()}-${Math.random()}`;
    const folderDoc: FileMetadata = {
      id: folderId,
      name,
      type: 'folder',
      parentId,
      path,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      modifiedBy: userId,
    };

    await setDoc(doc(db, FILE_COLLECTIONS.files, folderId), folderDoc);
    return folderDoc;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

// ファイル/フォルダの名前を変更
export async function renameItem(
  itemId: string,
  newName: string,
  userId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, FILE_COLLECTIONS.files, itemId), {
      name: newName,
      updatedAt: Timestamp.now(),
      modifiedBy: userId,
    });
  } catch (error) {
    console.error('Error renaming item:', error);
    throw error;
  }
}

// ファイル/フォルダを移動
export async function moveItem(
  itemId: string,
  newParentId: string | null,
  newPath: string,
  userId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, FILE_COLLECTIONS.files, itemId), {
      parentId: newParentId,
      path: newPath,
      updatedAt: Timestamp.now(),
      modifiedBy: userId,
    });
  } catch (error) {
    console.error('Error moving item:', error);
    throw error;
  }
}