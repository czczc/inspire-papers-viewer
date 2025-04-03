// src/services/firebaseService.js
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp, where, limit, updateDoc } from 'firebase/firestore'; // Added where, limit, updateDoc
import { db } from '@/config/firebaseConfig';

const papersCollectionRef = collection(db, "edg_small_authors");

// Fetch all documents ordered by arxiv_id descending
export const getSmallPapers = async () => {
  try {
    const q = query(papersCollectionRef, orderBy("arxiv_id", "desc")); // Order by arxiv_id descending
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting documents: ", error);
    throw new Error("Failed to fetch papers from database."); // Re-throw for component handling
  }
};

// Find a paper by its arXiv ID (returns Firestore doc ID if found, null otherwise)
export const findPaperByArxivId = async (arxivId) => {
    if (!arxivId || !arxivId.trim()) {
        throw new Error("arXiv ID cannot be empty for search.");
    }
    try {
        const q = query(papersCollectionRef, where("arxiv_id", "==", arxivId.trim()), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // Return the Firestore document ID of the first match
            return querySnapshot.docs[0].id;
        }
        return null; // Not found
    } catch (error) {
        console.error("Error finding document by arXiv ID: ", error);
        throw new Error("Failed to search for existing paper.");
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

// Update an existing document by its Firestore ID
export const updateSmallPaper = async (id, paperData) => {
     if (!id) {
        throw new Error("Document ID is required for update.");
     }
     // Basic validation on required fields
     if (!paperData || !paperData.arxiv_id || !paperData.title) {
        throw new Error("arXiv ID and Title are required for update.");
     }
     try {
        const paperDocRef = doc(db, "edg_small_authors", id);
        // Prepare data, ensuring only fields present in paperData are updated
        // and add an updated timestamp
        const dataToUpdate = {
            ...paperData, // Spread existing fields
            updated_at: serverTimestamp() // Add/update timestamp
        };
        // Remove fields that shouldn't be directly updated if necessary (like added_by, added_at)
        // delete dataToUpdate.added_by;
        // delete dataToUpdate.added_at;

        await updateDoc(paperDocRef, dataToUpdate);
        console.log("Document successfully updated!");
     } catch (error) {
        console.error("Error updating document: ", error);
        throw new Error("Failed to update paper in database.");
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
