const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

async function run() {
  console.log("Starting migration: is_temp_password → is_first_time");

  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.is_temp_password !== undefined) {
      await doc.ref.update({
        is_first_time: data.is_temp_password,
        is_temp_password: admin.firestore.FieldValue.delete()
      });

      console.log(`Updated user: ${doc.id}`);
    }
  }

  console.log("Migration complete.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
});
