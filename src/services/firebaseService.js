// src/services/firebaseService.js
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
import { db } from '@/config/firebaseConfig';

const papersCollectionRef = collection(db, "edg_small_authors"); // Correct collection name

// Fetch all documents ordered by arxiv_id
export const getSmallPapers = async () => {
  try {
    const q = query(papersCollectionRef, orderBy("arxiv_id")); // Order by arxiv_id
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting documents: ", error);
    throw new Error("Failed to fetch papers from database."); // Re-throw for component handling
  }
};

// Add a new document with all required fields
export const addSmallPaper = async (paperData) => {
  // Basic validation on required fields
  if (!paperData || !paperData.arxiv_id || !paperData.title) {
    throw new Error("arXiv ID and Title are required.");
  }
  try {
    const docRef = await addDoc(papersCollectionRef, {
      arxiv_id: paperData.arxiv_id.trim(),
      title: paperData.title.trim(),
      year: paperData.year || null, // Allow optional fields
      publication: paperData.publication || null,
      authors: paperData.authors || null,
      added_by: paperData.added_by || "anonymous", // Placeholder for now
      added_at: serverTimestamp() // Add a timestamp
    });
    console.log("Document written with ID: ", docRef.id);
    return docRef; // Return the document reference
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Failed to add paper to database."); // Re-throw
  }
};

// Delete a document by its Firestore ID
export const deleteSmallPaper = async (id) => {
  if (!id) {
    throw new Error("Document ID is required for deletion.");
  }
  try {
    const paperDocRef = doc(db, "edg_small_authors", id); // Correct collection name
    await deleteDoc(paperDocRef);
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw new Error("Failed to delete paper from database."); // Re-throw
  }
};

// Note: Update functionality is not included as per the initial request,
// but could be added here if needed (e.g., using updateDoc).
