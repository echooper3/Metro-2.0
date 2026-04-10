
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import firebaseConfig from '../firebase-applet-config.json';

const serviceAccountPath = join(process.cwd(), 'service-account.json');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  if (existsSync(serviceAccountPath)) {
    console.log('🔑 Using service-account.json for authentication...');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId
    });
  } else {
    console.log('⚠️ No service-account.json found. Attempting default credentials...');
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function bulkUpload() {
  try {
    const dataPath = join(process.cwd(), 'data', 'events.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const events = JSON.parse(rawData);

    console.log(`🚀 Starting Admin Bulk Upload of ${events.length} events...`);

    let successCount = 0;

    const batch = db.batch();
    const eventsRef = db.collection('events');

    for (const event of events) {
      // Format date to MM/DD/YYYY if it's in YYYY-MM-DD
      let formattedDate = event.date;
      if (event.date && event.date.includes('-')) {
        const [y, m, d] = event.date.split('-');
        formattedDate = `${m}/${d}/${y}`;
      }

      const docRef = eventsRef.doc();
      const finalEvent = {
        ...event,
        id: docRef.id,
        date: formattedDate,
        userCreated: true,
        isTrending: false,
        createdAt: FieldValue.serverTimestamp(),
        imageUrl: event.imageUrl || `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800`,
        userId: 'system-bulk-upload' // Identifier for bulk uploads
      };

      batch.set(docRef, finalEvent);
      successCount++;
    }

    await batch.commit();
    console.log(`✅ Successfully committed batch of ${successCount} events.`);

    console.log('\n--- Upload Complete ---');
    console.log(`Total Success: ${successCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error during bulk upload:', err);
    console.log('\n💡 TIP: If you see a credential error, you may need to provide a service account key.');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts.');
    console.log('2. Generate a new private key and save it as "service-account.json" in the root.');
    console.log('3. Update this script to use: admin.credential.cert("service-account.json")');
    process.exit(1);
  }
}

bulkUpload();
