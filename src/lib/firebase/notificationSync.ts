import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';
import { createNotification } from './notifications';
import type { Announcement } from './announcements';

// =============================================================================
// NOTIFICATION SYNCHRONIZATION SERVICE
// =============================================================================

export class NotificationSynchronizationService {
  
  /**
   * Create notifications for new announcements
   * This should be called whenever an announcement is published
   */
  static async handleAnnouncementPublished(announcement: Announcement): Promise<void> {
    try {
      console.log(`Creating notifications for announcement: ${announcement.title}`);
      
      // Determine target users based on targetAudience
      let targetUsers: string[] = [];
      
      switch (announcement.targetAudience) {
        case 'all':
          // In a real implementation, this would fetch all active users
          targetUsers = await this.getAllActiveUsers();
          break;
        case 'department':
          if (announcement.targetDepartments) {
            targetUsers = await this.getUsersByDepartments(announcement.targetDepartments);
          }
          break;
        case 'specific':
          if (announcement.targetUserIds) {
            targetUsers = announcement.targetUserIds;
          }
          break;
      }

      // Create notification for each target user
      const notificationPromises = targetUsers.map(userId => 
        createNotification({
          type: 'announcement',
          title: `📢 ${announcement.title}`,
          message: `新しいお知らせ: ${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''}`,
          priority: announcement.priority === 'urgent' ? 'urgent' : 
                   announcement.priority === 'high' ? 'high' : 'normal',
          recipientId: userId,
          senderId: announcement.authorId,
          senderName: announcement.authorName,
          relatedEntityType: 'announcement',
          relatedEntityId: announcement.id,
          actionUrl: `/announcements?id=${announcement.id}`,
          metadata: {
            announcementId: announcement.id,
            category: announcement.category,
            isAnnouncementNotification: true
          }
        })
      );

      const results = await Promise.allSettled(notificationPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Announcement notifications created: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        console.warn('Some notification creations failed:', 
          results
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason)
        );
      }

    } catch (error) {
      console.error('Error creating announcement notifications:', error);
    }
  }

  /**
   * Handle notification read - sync back to announcement read tracking
   */
  static async handleNotificationRead(notificationId: string, userId: string): Promise<void> {
    try {
      // This is called when a notification related to an announcement is read
      // We should also mark the announcement as viewed
      
      // For now, just log - in a full implementation, this would:
      // 1. Check if the notification is announcement-related
      // 2. Mark the announcement as viewed by the user
      // 3. Update announcement read statistics
      
      console.log(`Notification ${notificationId} read by user ${userId} - sync to announcement read status`);
      
    } catch (error) {
      console.error('Error syncing notification read to announcement:', error);
    }
  }

  /**
   * Handle notification interaction - track engagement
   */
  static async handleNotificationInteraction(
    notificationId: string, 
    userId: string, 
    interactionType: 'clicked' | 'dismissed' | 'archived'
  ): Promise<void> {
    try {
      console.log(`Notification ${notificationId} ${interactionType} by user ${userId}`);
      
      // In a full implementation, this would update engagement metrics
      // and potentially influence future notification delivery

    } catch (error) {
      console.error('Error handling notification interaction:', error);
    }
  }

  /**
   * Cleanup expired announcement notifications
   */
  static async cleanupExpiredAnnouncementNotifications(): Promise<void> {
    try {
      // Find announcements that have expired
      const expiredAnnouncementsQuery = query(
        collection(db, 'announcements'),
        where('expiresAt', '<', new Date().toISOString()),
        where('isActive', '==', false)
      );

      const expiredAnnouncements = await getDocs(expiredAnnouncementsQuery);
      
      if (expiredAnnouncements.empty) {
        console.log('No expired announcements found');
        return;
      }

      // Get notifications related to expired announcements
      const expiredAnnouncementIds = expiredAnnouncements.docs.map(doc => doc.id);
      
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('relatedEntityType', '==', 'announcement'),
        where('relatedEntityId', 'in', expiredAnnouncementIds)
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      // Mark these notifications as archived or delete them
      const updatePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          isArchived: true,
          archivedAt: serverTimestamp(),
          archivedReason: 'announcement_expired'
        })
      );

      await Promise.all(updatePromises);
      
      console.log(`Archived ${updatePromises.length} notifications for expired announcements`);

    } catch (error) {
      console.error('Error cleaning up expired announcement notifications:', error);
    }
  }

  // =============================================================================
  // HELPER METHODS (Mock implementations)
  // =============================================================================

  /**
   * Get all active users - mock implementation
   */
  private static async getAllActiveUsers(): Promise<string[]> {
    // In a real implementation, this would query the users collection
    // For now, return mock user IDs (temporary implementation)
    return ['mock-user-1', 'mock-user-2', 'mock-user-3'];
  }

  /**
   * Get users by departments - mock implementation
   */
  private static async getUsersByDepartments(departments: string[]): Promise<string[]> {
    // In a real implementation, this would query users by department
    // For now, return mock user IDs based on department (temporary implementation)
    return ['mock-user-1', 'mock-user-2'];
  }

  /**
   * Check if user should receive announcement notifications
   */
  private static async shouldReceiveNotification(userId: string, announcement: Announcement): Promise<boolean> {
    // In a real implementation, this would check:
    // - User notification preferences
    // - User's role and permissions
    // - User's department/team membership
    // - Do not disturb settings
    
    // For now, always return true
    return true;
  }
}

// =============================================================================
// ENHANCED ANNOUNCEMENT FUNCTIONS WITH NOTIFICATION SYNC
// =============================================================================

/**
 * Enhanced announcement creation that also creates notifications
 */
export const createAnnouncementWithNotifications = async (
  announcementData: Omit<Announcement, 'id' | 'readCount' | 'totalTargetCount' | 'createdAt' | 'updatedAt'>
): Promise<{ id: string | null; error: string | null }> => {
  try {
    // First create the announcement using the existing function
    const { createAnnouncement } = await import('./announcements');
    const result = await createAnnouncement(announcementData);
    
    if (result.id && announcementData.isActive) {
      // Create the full announcement object for notification creation
      const fullAnnouncement: Announcement = {
        id: result.id,
        ...announcementData,
        readCount: 0,
        totalTargetCount: 0, // This will be calculated
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create notifications for the announcement
      await NotificationSynchronizationService.handleAnnouncementPublished(fullAnnouncement);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error creating announcement with notifications:', error);
    return { id: null, error: error.message };
  }
};

/**
 * Enhanced urgent announcement creation
 */
export const createUrgentAnnouncementWithNotifications = async (data: {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category?: string;
  targetAudience?: 'all' | 'department' | 'specific';
  targetDepartments?: string[];
  targetUserIds?: string[];
}): Promise<{ id: string | null; error: string | null }> => {
  return createAnnouncementWithNotifications({
    title: data.title,
    content: data.content,
    priority: 'urgent',
    category: (data.category as any) || 'general',
    authorId: data.authorId,
    authorName: data.authorName,
    targetAudience: data.targetAudience || 'all',
    targetDepartments: data.targetDepartments,
    targetUserIds: data.targetUserIds,
    isActive: true,
    publishedAt: new Date().toISOString()
  });
};

