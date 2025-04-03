<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'; // Added watch, nextTick
import { useInspireHelpers } from '@/composables/useInspireHelpers';
// Import the Firebase service functions
import { getSmallPapers, addSmallPaper, deleteSmallPaper, updateSmallPaper } from '@/services/firebaseService';
import { auth } from '@/config/firebaseConfig'; // Ensure auth is imported
import { onAuthStateChanged } from 'firebase/auth'; // Import listener

// --- Define Props ---
// Removed props

// Local reactive state for login status
const isLoggedIn = ref(false);
let unsubscribeAuth = null; // To hold the unsubscribe function

// --- Initialize Helpers ---
const { getAuthors, getPublicationInfo } = useInspireHelpers();

const papers = ref([]); // To hold papers { id: firestoreId, ...data }
const isLoading = ref(false); // Loading state for the main list/add/delete
const isFetchingDetails = ref(false); // Separate loading state for fetching details
const error = ref(null);
// Removed resultsContainer ref

// Refs for the new paper form
const newPaperData = ref({
  arxiv_id: '',
  title: '',
  year: null,
  publication: '',
  authors: '',
  // added_by will be set automatically based on logged-in user
});

// --- Table Headers ---
const tableHeaders = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'arXiv ID', key: 'arxiv_id', sortable: true },
  { title: 'Authors', key: 'authors', sortable: false, minWidth: '180px' },
  { title: 'Publication', key: 'publication', sortable: false },
  { title: 'Year', key: 'year', sortable: true }, // Added Year column
  { title: 'Actions', key: 'actions', sortable: false, minWidth: '120px' },
];


// --- Methods ---
async function fetchPapers() {
  isLoading.value = true;
  error.value = null;
  try {
    // Fetch papers but don't render KaTeX here directly
    papers.value = await getSmallPapers();
  } catch (err) {
    console.error("Error fetching papers: ", err);
    error.value = err.message || "Failed to load papers.";
  } finally {
    isLoading.value = false;
  }
}

async function addPaper() {
  // Validate required fields
  if (!newPaperData.value.arxiv_id?.trim() || !newPaperData.value.title?.trim()) {
      error.value = "arXiv ID and Title are required.";
      return;
  }
   // Optional: Basic validation for arXiv ID format
   const arxivRegex = /^\d{4}\.\d{4,5}(v\d+)?$/;
   if (!arxivRegex.test(newPaperData.value.arxiv_id.trim())) {
      error.value = "Invalid arXiv ID format (e.g., 2301.01234).";
      return;
   }

   // Prevent adding duplicates based on arxiv_id
   if (papers.value.some(p => p.arxiv_id === newPaperData.value.arxiv_id.trim())) {
       error.value = `arXiv ID ${newPaperData.value.arxiv_id.trim()} already exists.`;
       return;
   }

  error.value = null; // Clear previous errors

  // Check the local isLoggedIn ref and auth.currentUser for safety
  if (!isLoggedIn.value || !auth.currentUser) {
      error.value = "You must be logged in to add papers.";
      return;
  }

  const paperToAdd = {
      ...newPaperData.value,
      added_by: auth.currentUser.uid // Use user ID from auth instance
  };

  // Add Paper logic now only adds
  try {
    await addSmallPaper(paperToAdd);
    // Reset form fields
    newPaperData.value = {
        arxiv_id: '', title: '', year: null, publication: '', authors: ''
        // No need to reset added_by here
    };
    await fetchPapers(); // Refresh list
  } catch (err) {
    console.error("Error adding paper: ", err);
    error.value = err.message || "Failed to add paper.";
  }
}

// --- Function to Update a specific paper by fetching from INSPIRE ---
async function updatePaperDetails(firestoreId, arxivId) {
    if (!arxivId) {
        error.value = "Cannot update paper without arXiv ID.";
        return;
    }
    console.log(`Updating paper details for Firestore ID: ${firestoreId}, arXiv ID: ${arxivId}`);
    error.value = null;

    const query = `arxiv:${arxivId}`;
    const apiUrl = `https://inspirehep.net/api/literature?q=${query}&size=1`;

    try {
        const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            throw new Error(`INSPIRE API error! Status: ${response.status}`);
        }
        const data = await response.json();

        if (data.hits && data.hits.hits && data.hits.hits.length > 0) {
            const paper = data.hits.hits[0];
            const pubInfo = paper.metadata?.publication_info?.[0];
            const paperYear = pubInfo?.year || (paper.metadata?.earliest_date ? parseInt(paper.metadata.earliest_date.substring(0, 4)) : null);

            const updatedPaperData = {
                arxiv_id: arxivId,
                title: paper.metadata?.titles?.[0]?.title || 'N/A',
                authors: getAuthors(paper),
                publication: getPublicationInfo(paper),
                year: paperYear,
            };

            await updateSmallPaper(firestoreId, updatedPaperData);
            await fetchPapers();
        } else {
            error.value = `Paper with arXiv ID ${arxivId} not found on INSPIRE during update.`;
        }
    } catch (err) {
        console.error("Error updating paper details:", err);
        error.value = `Failed to update details: ${err.message}`;
    } finally {
        // Indicate loading finished (Optional)
    }
}


async function deletePaper(paperId) {
  // Optional: Add confirmation dialog
  // if (!confirm("Are you sure you want to delete this paper?")) { return; }
  error.value = null;
  try {
    await deleteSmallPaper(paperId);
    await fetchPapers(); // Refresh list
  } catch (err) {
    console.error("Error deleting paper: ", err);
    error.value = err.message || "Failed to delete paper.";
  }
}

// Fetch papers and set up auth listener when component mounts
onMounted(() => {
  fetchPapers();
  // Set initial state
  isLoggedIn.value = !!auth.currentUser;
  console.log('ManageSmallPapers Mounted - Initial isLoggedIn state:', isLoggedIn.value);
  // Start listening for auth state changes
  unsubscribeAuth = onAuthStateChanged(auth, async (user) => { // Make callback async
    const newState = !!user;
    if (isLoggedIn.value !== newState) { // Update only if state actually changes
        isLoggedIn.value = newState;
        console.log(`ManageSmallPapers Auth Listener: User is ${user ? 'logged in' : 'logged out'}. isLoggedIn ref: ${isLoggedIn.value}`);
        // Force update after state change
        await nextTick();
        console.log('Forced update via nextTick after auth state change.');
    }
  });
});

// Clean up the listener when the component unmounts
onUnmounted(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth();
    console.log('ManageSmallPapers Unmounted - Unsubscribed from auth changes.');
  }
});

// Removed KaTeX watcher

// --- Function to fetch details from INSPIRE based on arXiv ID ---
async function fetchPaperDetailsByArxiv() {
    const arxivId = newPaperData.value.arxiv_id?.trim();
    if (!arxivId) { error.value = "Please enter an arXiv ID first."; return; }

    isFetchingDetails.value = true; error.value = null;

    const query = `arxiv:${arxivId}`;
    const apiUrl = `https://inspirehep.net/api/literature?q=${query}&size=1`;

    try {
        const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) { throw new Error(`INSPIRE API error! Status: ${response.status}`); }
        const data = await response.json();

        if (data.hits && data.hits.hits && data.hits.hits.length > 0) {
            const paper = data.hits.hits[0];
            const pubInfo = paper.metadata?.publication_info?.[0];
            newPaperData.value.title = paper.metadata?.titles?.[0]?.title || '';
            newPaperData.value.year = pubInfo?.year || (paper.metadata?.earliest_date ? parseInt(paper.metadata.earliest_date.substring(0, 4)) : null);
            newPaperData.value.publication = getPublicationInfo(paper);
            newPaperData.value.authors = getAuthors(paper);
        } else { error.value = `Paper with arXiv ID ${arxivId} not found on INSPIRE.`; }
    } catch (err) { console.error("Error fetching paper details:", err); error.value = `Failed to fetch details: ${err.message}`; }
    finally { isFetchingDetails.value = false; }
}

// Removed renderKaTeXManagePapers function

</script>

<template>
  <v-container fluid>
    <h1 class="text-h5 mb-4">Manage Small Author Papers</h1>

    <!-- Use display classes instead of v-if for conditional visibility -->
    <!-- Add Paper Form -->
    <v-card :class="{ 'd-none': !isLoggedIn }" class="mb-6 pa-4" elevation="2">
      <h2 class="text-h6 mb-3">Add New Paper</h2>
      <v-form @submit.prevent="addPaper">
        <v-row align="start">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="newPaperData.arxiv_id" label="arXiv ID*" placeholder="e.g., 2301.01234"
              variant="outlined" density="compact" hide-details="auto" required
              append-inner-icon="mdi-download-outline" @click:append-inner="fetchPaperDetailsByArxiv"
              :loading="isFetchingDetails" :disabled="isFetchingDetails"
            ></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="8">
            <v-text-field
              v-model="newPaperData.title" label="Title*" placeholder="Paper Title"
              variant="outlined" density="compact" hide-details="auto" required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6" lg="4">
            <v-text-field
              v-model.number="newPaperData.year" label="Year" type="number" placeholder="YYYY"
              variant="outlined" density="compact" hide-details="auto"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6" lg="8">
            <v-text-field
              v-model="newPaperData.publication" label="Publication Info" placeholder="e.g., Phys.Rev.D 100, 012001"
              variant="outlined" density="compact" hide-details="auto"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="newPaperData.authors" label="Authors" placeholder="e.g., First Author et al."
              variant="outlined" density="compact" hide-details="auto"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row justify="end" class="mt-3">
          <v-col cols="auto">
            <v-btn type="submit" color="primary" :disabled="!isLoggedIn">Add Paper</v-btn>
          </v-col>
        </v-row>
        </v-form>
      </v-card>
      <!-- Removed extra </v-form> here -->
    <!-- Login Prompt Alert -->
    <v-alert :class="{ 'd-none': isLoggedIn }" type="info" variant="tonal" class="mb-6">
      Please log in to add, update, or delete papers.
    </v-alert>
    <!-- Removed template wrapper -->

    <!-- Loading Indicator -->
    <div class="text-center my-8" v-if="isLoading">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Loading paper list...</p>
    </div>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" variant="tonal" closable class="my-4" @update:modelValue="error = null">
      {{ error }}
    </v-alert>

    <!-- Paper List Table -->
    <v-card v-if="!isLoading && !error" elevation="2">
      <div> <!-- Removed ref="resultsContainer" -->
        <!-- Removed the key binding -->
        <v-data-table
          :headers="tableHeaders"
          :items="papers"
          item-value="id"
          class="elevation-0"
          density="compact"
          :items-per-page="50"
          no-data-text="No papers added yet."
        >
          <!-- Display title as plain text -->
          <template v-slot:item.title="{ item }">
            {{ item.title || 'No Title' }}
          </template>
           <!-- Removed specific slot for arxiv_id to display as plain text -->
           <!-- Conditionally render actions column content based on local isLoggedIn ref -->
           <template v-slot:item.actions="{ item }">
             <template v-if="isLoggedIn">
               <v-btn
                 color="blue-darken-1" icon="mdi-update" variant="text"
                 size="small" class="mr-1"
                 @click="updatePaperDetails(item.id, item.arxiv_id)"
                 title="Update from INSPIRE"
                 :disabled="!isLoggedIn"
               ></v-btn>
               <v-btn
                 color="grey-lighten-1" icon="mdi-delete" variant="text"
                 size="small" @click="deletePaper(item.id)"
                 :disabled="!isLoggedIn"
               ></v-btn>
             </template>
             <span v-else class="text-caption text-disabled">Log in to manage</span>
           </template>
         </v-data-table>
      </div>
    </v-card>

  </v-container>
</template>

<style scoped>
/* Add specific styles if needed */
</style>
