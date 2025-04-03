<script setup>
import { ref, onMounted } from 'vue';
import { useInspireHelpers } from '@/composables/useInspireHelpers';
// Import the Firebase service functions
import { getSmallPapers, addSmallPaper, deleteSmallPaper, updateSmallPaper } from '@/services/firebaseService';

// --- Initialize Helpers ---
const { getAuthors, getPublicationInfo } = useInspireHelpers();

const papers = ref([]); // To hold papers { id: firestoreId, ...data }
const isLoading = ref(false); // Loading state for the main list/add/delete
const isFetchingDetails = ref(false); // Separate loading state for fetching details
const error = ref(null);
const resultsContainer = ref(null); // Ref for KaTeX rendering

// Refs for the new paper form
const newPaperData = ref({
  arxiv_id: '',
  title: '',
  year: null,
  publication: '',
  authors: '',
  added_by: 'cline_user' // Default placeholder
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
    papers.value = await getSmallPapers();
    // Trigger KaTeX after fetching papers for the table
    renderKaTeXManagePapers();
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
  const paperToAdd = { ...newPaperData.value }; // Create copy to pass

  // Add Paper logic now only adds
  try {
    await addSmallPaper(paperToAdd);
    // Reset form fields
    newPaperData.value = {
        arxiv_id: '', title: '', year: null, publication: '', authors: '', added_by: 'cline_user'
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

// Fetch papers when component mounts
onMounted(() => {
  fetchPapers();
});

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

// --- Function to explicitly render KaTeX ---
function renderKaTeXManagePapers() {
    setTimeout(() => {
        if (resultsContainer.value && window.renderMathInElement) {
            try {
                console.log("Rendering KaTeX on ManageSmallPapers container");
                window.renderMathInElement(resultsContainer.value, {
                    delimiters: [ { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true } ],
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "a"], throwOnError: false
                });
            } catch (error) { console.error("KaTeX rendering failed on ManageSmallPapers:", error); }
        } else if (!window.renderMathInElement) { console.warn("KaTeX auto-render function not found."); }
    }, 150);
}

</script>

<template>
  <v-container fluid>
    <h1 class="text-h5 mb-4">Manage Small Author Papers</h1>

    <!-- Add Paper Form -->
    <v-form @submit.prevent="addPaper" class="mb-6">
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
            <v-btn type="submit" color="primary">Add Paper</v-btn>
          </v-col>
       </v-row>
    </v-form>

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
       <div ref="resultsContainer"> <!-- Add ref here for KaTeX -->
         <v-data-table
           :headers="tableHeaders"
           :items="papers"
           item-value="id"
           class="elevation-0"
           density="compact"
           :items-per-page="50"
           no-data-text="No papers added yet."
         >
           <template v-slot:item.title="{ item }">
             <span v-html="item.title || 'No Title'"></span>
           </template>
           <!-- Removed specific slot for arxiv_id to display as plain text -->
           <template v-slot:item.actions="{ item }">
              <v-btn
                color="blue-darken-1" icon="mdi-update" variant="text"
                size="small" class="mr-1"
                @click="updatePaperDetails(item.id, item.arxiv_id)"
                title="Update from INSPIRE"
              ></v-btn>
              <v-btn
                color="grey-lighten-1" icon="mdi-delete" variant="text"
                size="small" @click="deletePaper(item.id)"
              ></v-btn>
           </template>
         </v-data-table>
       </div>
    </v-card>

  </v-container>
</template>

<style scoped>
/* Add specific styles if needed */
</style>
