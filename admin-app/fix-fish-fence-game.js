// Simple script to fix the fish-fence-count game
// Run this with: node fix-fish-fence-game.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase config - replace with your actual config
const firebaseConfig = {
  // Add your firebase config here or import from environment
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function fixFishFenceGame() {
  try {
    // Sign in (you'll need to provide credentials)
    await signInWithEmailAndPassword(auth, 'your-email@example.com', 'your-password');
    
    // Update the الصوم game to have gameModeId: 'fish-fence-count'
    const gameRef = doc(db, 'quizzes', 'HNONQboQkjxr23EhNvSJ'); // Use the actual quiz ID
    await updateDoc(gameRef, {
      gameModeId: 'fish-fence-count',
      updatedAt: serverTimestamp()
    });
    
    console.log('Successfully updated fish-fence-count game!');
  } catch (error) {
    console.error('Error updating game:', error);
  }
}

fixFishFenceGame();
