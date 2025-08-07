// Firebase Admin SDK を使用してデータをシードするスクリプト
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Firebase Admin SDK の初期化
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seedDashboardData() {
  console.log('ダッシュボードデータの作成を開始します...');

  try {
    // 1. 工程データの作成
    console.log('工程データを作成中...');
    const processesRef = db.collection('processes');
    
    const processes = [
      {
        orderId: 'M-001',
        orderClient: 'ABC製造株式会社',
        lineNumber: 'L001',
        projectName: '製品A製造',
        managementNumber: 'MNG-2024-001',
        progress: 75,
        quantity: 100,
        salesPerson: '営業太郎',
        assignee: '田中太郎',
        fieldPerson: '田中太郎',
        assignedMachines: ['MC-01', 'MC-02'],
        workDetails: {
          setup: 2,
          machining: 8,
          finishing: 4,
          useDynamicSteps: false,
          totalEstimatedHours: 14,
          totalActualHours: 10.5
        },
        orderDate: new Date().toISOString(),
        arrivalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        dataWorkDate: new Date().toISOString(),
        processingPlanDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        remarks: 'テスト製造',
        status: 'processing',
        priority: 'high',
        dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: 'M-002',
        orderClient: 'XYZ工業株式会社',
        lineNumber: 'L002',
        projectName: '製品B製造',
        managementNumber: 'MNG-2024-002',
        progress: 40,
        quantity: 50,
        salesPerson: '営業花子',
        assignee: '佐藤次郎',
        fieldPerson: '佐藤次郎',
        assignedMachines: ['MC-03'],
        workDetails: {
          setup: 3,
          machining: 10,
          finishing: 5,
          useDynamicSteps: false,
          totalEstimatedHours: 18,
          totalActualHours: 7.2
        },
        orderDate: new Date().toISOString(),
        arrivalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        dataWorkDate: new Date().toISOString(),
        processingPlanDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        remarks: 'テスト製造2',
        status: 'processing',
        priority: 'medium',
        dueDate: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: 'M-003',
        orderClient: '株式会社テクノ',
        lineNumber: 'L003',
        projectName: '製品C製造',
        managementNumber: 'MNG-2024-003',
        progress: 90,
        quantity: 200,
        salesPerson: '営業太郎',
        assignee: '鈴木三郎',
        fieldPerson: '鈴木三郎',
        assignedMachines: ['MC-01', 'MC-04'],
        workDetails: {
          setup: 1,
          machining: 6,
          finishing: 3,
          useDynamicSteps: false,
          totalEstimatedHours: 10,
          totalActualHours: 9
        },
        orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        arrivalDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        shipmentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        dataWorkDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        processingPlanDate: new Date().toISOString(),
        remarks: 'もうすぐ完了',
        status: 'finishing',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const process of processes) {
      const docRef = await processesRef.add(process);
      console.log(`工程 ${process.projectName} を作成しました: ${docRef.id}`);
    }

    // 2. 全体タスクの作成
    console.log('全体タスクを作成中...');
    const companyTasksRef = db.collection('companyTasks');
    
    const companyTasks = [
      {
        title: '手順書作成',
        description: '新製品の製造手順書を作成する',
        status: 'completed',
        priority: 'medium',
        assignee: '田中太郎',
        assigneeId: 'user-123',
        createdBy: '管理者',
        createdById: 'admin-123',
        category: 'general',
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'ファイル整理',
        description: '製造関連ファイルの整理と分類',
        status: 'progress',
        priority: 'low',
        assignee: '田中太郎',
        assigneeId: 'user-123',
        createdBy: '管理者',
        createdById: 'admin-123',
        category: 'general',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: '新人研修資料作成',
        description: '新入社員向けの製造工程研修資料を作成',
        status: 'pending',
        priority: 'high',
        assignee: '佐藤次郎',
        assigneeId: 'user-456',
        createdBy: '管理者',
        createdById: 'admin-123',
        category: 'general',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const task of companyTasks) {
      const docRef = await companyTasksRef.add(task);
      console.log(`全体タスク ${task.title} を作成しました: ${docRef.id}`);
    }

    // 3. 個人タスクの作成
    console.log('個人タスクを作成中...');
    const personalTasksRef = db.collection('personalTasks');
    
    const personalTasks = [
      {
        title: '資料準備',
        description: '明日の会議用資料を準備',
        status: 'pending',
        priority: 'medium',
        userId: 'user-123',
        category: 'work',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'メール返信',
        description: '顧客からの問い合わせに返信',
        status: 'progress',
        priority: 'high',
        userId: 'user-123',
        category: 'work',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const task of personalTasks) {
      const docRef = await personalTasksRef.add(task);
      console.log(`個人タスク ${task.title} を作成しました: ${docRef.id}`);
    }

    // 4. 通知の作成
    console.log('通知を作成中...');
    const notificationsRef = db.collection('notifications');
    
    const notifications = [
      {
        type: 'mention',
        title: 'レビュー依頼',
        message: '製品Aの仕様書をレビューお願いします',
        priority: 'high',
        isRead: false,
        recipientId: 'user-123',
        senderId: 'user-yamada',
        senderName: '山田太郎',
        actionUrl: '/tasks',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        type: 'chat',
        title: 'メッセージ',
        message: '了解しました。本日中に対応します。',
        priority: 'normal',
        isRead: false,
        recipientId: 'user-123',
        senderId: 'user-suzuki',
        senderName: '鈴木花子',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        type: 'system',
        title: '工程完了',
        message: '工程A（製品X）が完了しました',
        priority: 'normal',
        isRead: true,
        recipientId: 'user-123',
        relatedEntityType: 'process',
        relatedEntityId: 'process-001',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        type: 'task',
        title: 'タスク割り当て',
        message: '新しいタスクが割り当てられました',
        priority: 'high',
        isRead: true,
        recipientId: 'user-123',
        senderId: 'admin-123',
        senderName: '管理者',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        updatedAt: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];

    for (const notification of notifications) {
      const docRef = await notificationsRef.add(notification);
      console.log(`通知を作成しました: ${docRef.id}`);
    }

    // 5. 全体連絡の作成
    console.log('全体連絡を作成中...');
    const announcementsRef = db.collection('announcements');
    
    const announcements = [
      {
        title: '来週の設備点検について',
        content: '来週月曜日から水曜日にかけて、第1工場の設備点検を実施します。該当する製造ラインは一時停止となりますので、スケジュールの調整をお願いします。',
        priority: 'urgent',
        category: 'maintenance',
        authorId: 'admin-123',
        authorName: '設備管理部',
        targetAudience: 'all',
        isActive: true,
        publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        readCount: 0,
        totalTargetCount: 100,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        title: '新しい安全規則の徹底',
        content: '労働安全衛生法の改正に伴い、新しい安全規則を導入します。詳細は別途配布する資料をご確認ください。全従業員の遵守をお願いします。',
        priority: 'medium',
        category: 'safety',
        authorId: 'admin-123',
        authorName: '安全管理部',
        targetAudience: 'all',
        isActive: true,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        readCount: 0,
        totalTargetCount: 100,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        title: '7月の納期スケジュール確認',
        content: '7月の納期スケジュールが確定しました。各担当者は自分の担当案件を確認し、問題がある場合は早めに報告してください。',
        priority: 'normal',
        category: 'schedule',
        authorId: 'admin-123',
        authorName: '生産管理部',
        targetAudience: 'all',
        isActive: true,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        readCount: 0,
        totalTargetCount: 100,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        title: '夏季休暇の調整',
        content: '夏季休暇の希望調査を開始します。今月末までに各部署のリーダーに提出してください。調整の上、来月初旬に確定します。',
        priority: 'normal',
        category: 'general',
        authorId: 'admin-123',
        authorName: '人事部',
        targetAudience: 'all',
        isActive: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        readCount: 0,
        totalTargetCount: 100,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const announcement of announcements) {
      const docRef = await announcementsRef.add(announcement);
      console.log(`全体連絡 ${announcement.title} を作成しました: ${docRef.id}`);
    }

    console.log('\n✅ すべてのダッシュボードデータの作成が完了しました！');
    
  } catch (error) {
    console.error('データ作成中にエラーが発生しました:', error);
  }
}

// スクリプトを実行
seedDashboardData().then(() => {
  console.log('完了しました');
  process.exit(0);
}).catch((error) => {
  console.error('エラー:', error);
  process.exit(1);
});