// Simple test script to verify announcement-notification synchronization
// Run with: node test-sync.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');

// Initialize Firebase with the demo config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com", 
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseData() {
  console.log('🔍 Testing Firebase data synchronization...\n');
  
  try {
    // Test 1: Check if announcements exist
    console.log('📢 Checking announcements...');
    const announcementsRef = collection(db, 'announcements');
    const announcementsSnapshot = await getDocs(announcementsRef);
    console.log(`Found ${announcementsSnapshot.size} announcements`);
    
    if (!announcementsSnapshot.empty) {
      announcementsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.title} (${data.priority})`);
      });
    }
    
    // Test 2: Check if notifications exist
    console.log('\n🔔 Checking notifications...');
    const notificationsRef = collection(db, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    console.log(`Found ${notificationsSnapshot.size} notifications`);
    
    if (!notificationsSnapshot.empty) {
      notificationsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.title} (${data.type}) -> ${data.recipientId}`);
      });
    }
    
    // Test 3: Check for announcement-related notifications
    console.log('\n🔗 Checking announcement-notification synchronization...');
    const announcementNotifications = query(
      notificationsRef,
      where('type', '==', 'announcement')
    );
    const syncedNotifications = await getDocs(announcementNotifications);
    console.log(`Found ${syncedNotifications.size} announcement notifications`);
    
    if (!syncedNotifications.empty) {
      syncedNotifications.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${data.title} -> ${data.recipientId} (from ${data.senderName})`);
      });
    }
    
    // Summary
    console.log('\n📊 Synchronization Summary:');
    console.log(`  • Announcements: ${announcementsSnapshot.size}`);
    console.log(`  • Total Notifications: ${notificationsSnapshot.size}`);
    console.log(`  • Announcement Notifications: ${syncedNotifications.size}`);
    console.log(`  • Sync Working: ${syncedNotifications.size > 0 ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error testing Firebase data:', error.message);
    
    // If it's a connection error, it might be because we're using demo config
    if (error.code === 'auth/invalid-api-key' || error.message.includes('project not found')) {
      console.log('\n💡 Note: This is expected with demo Firebase configuration.');
      console.log('To test with real Firebase:');
      console.log('1. Replace .env.local with your actual Firebase project config');
      console.log('2. Update firebase-service-account.json with your service account key');
      console.log('3. Run the seeding script again: npm run seed');
    }
  }
}

// Run the test
testFirebaseData().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});