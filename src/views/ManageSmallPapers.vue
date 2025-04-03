<script setup>
import { ref, onMounted } from 'vue';
// Import the Firebase service functions
import { getSmallPapers, addSmallPaper, deleteSmallPaper } from '@/services/firebaseService';

const papers = ref([]); // To hold papers { id: firestoreId, ...data }
const isLoading = ref(false);
const error = ref(null);

// Refs for the new paper form
const newPaperData = ref({
  arxiv_id: '',
  title: '',
  year: null,
  publication: '',
  authors: '',
  added_by: 'cline_user' // Default placeholder
});

// Placeholder functions for CRUD operations
async function fetchPapers() {
  isLoading.value = true;
  error.value = null;
  try {
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
  const paperToAdd = { ...newPaperData.value }; // Create copy to pass

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

async function deletePaper(paperId) {
  // Optional: Add confirmation dialog
  // if (!confirm("Are you sure you want to delete this paper?")) {
  //   return;
  // }
  error.value = null; // Clear previous errors
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
</script>

<template>
  <v-container fluid>
    <h1 class="text-h5 mb-4">Manage Small Author Papers</h1>

    <!-- Add Paper Form -->
    <v-form @submit.prevent="addPaper" class="mb-6">
       <v-row>
         <v-col cols="12" md="6" lg="4">
           <v-text-field
            v-model="newPaperData.arxiv_id"
            label="arXiv ID*"
            placeholder="e.g., 2301.01234"
            variant="outlined"
            density="compact"
            hide-details="auto"
            required
          ></v-text-field>
         </v-col>
          <v-col cols="12" md="6" lg="8">
           <v-text-field
            v-model="newPaperData.title"
            label="Title*"
            placeholder="Paper Title"
            variant="outlined"
            density="compact"
            hide-details="auto"
            required
          ></v-text-field>
         </v-col>
          <v-col cols="12" md="6" lg="4">
           <v-text-field
            v-model.number="newPaperData.year"
            label="Year"
            type="number"
            placeholder="YYYY"
            variant="outlined"
            density="compact"
            hide-details="auto"
          ></v-text-field>
         </v-col>
          <v-col cols="12" md="6" lg="8">
           <v-text-field
            v-model="newPaperData.publication"
            label="Publication Info"
            placeholder="e.g., Phys.Rev.D 100, 012001"
            variant="outlined"
            density="compact"
            hide-details="auto"
          ></v-text-field>
         </v-col>
          <v-col cols="12">
           <v-text-field
            v-model="newPaperData.authors"
            label="Authors"
            placeholder="e.g., Author A, Author B, ..."
            variant="outlined"
            density="compact"
            hide-details="auto"
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

    <!-- Paper List -->
    <v-card v-if="!isLoading && !error">
      <v-list lines="one">
        <v-list-item v-if="papers.length === 0">
          <v-list-item-title class="text-center text-medium-emphasis">No papers added yet.</v-list-item-title>
        </v-list-item>
        <v-list-item
          v-for="paper in papers"
          :key="paper.id"
          :title="paper.title || 'No Title'"
          :subtitle="`arXiv:${paper.arxiv_id || 'N/A'} - ${paper.publication || 'N/A'}`"
        >
           <template v-slot:append>
            <v-btn
              color="grey-lighten-1"
              icon="mdi-delete"
              variant="text"
              size="small"
              @click="deletePaper(paper.id)"
            ></v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

  </v-container>
</template>

<style scoped>
/* Add specific styles if needed */
</style>
