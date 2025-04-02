<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useInspireHelpers } from '@/composables/useInspireHelpers'; // Import the composable

// --- Initialize Helpers ---
const { getAuthors, getPublicationInfo, getDoiLink, getInspireLink, getArxivLink } = useInspireHelpers();

// --- State ---
const year = ref(new Date().getFullYear().toString()); // Default year
const papersByCollaboration = ref({}); // Object to store papers keyed by collab name
const isLoading = ref(false);
const error = ref(null);
const searchAttempted = ref(false);
const viewMode = ref('table'); // Add view mode state, default to table
const resultsContainer = ref(null); // Ref for KaTeX rendering

// --- Predefined Collaboration List ---
const collaborationsToFetch = [
  'DUNE', 'MicroBooNE', 'ICARUS', 'SBND', 'Belle-II',
  'Daya Bay', 'PROSPECT', 'Muon g-2', 'MINOS'
];

// --- Computed property for total paper count ---
const totalPaperCount = computed(() => {
  return Object.values(papersByCollaboration.value).reduce((sum, papersArray) => sum + (papersArray?.length || 0), 0);
});

// --- Table Headers ---
const tableHeaders = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Collaboration', key: 'collaborationDisplay', sortable: true }, // Keep this
  { title: 'Publication', key: 'publication', sortable: false },
  { title: 'Links', key: 'links', sortable: false, align: 'start', minWidth: '150px' },
];

// --- Methods ---
async function fetchAllCollaborations() {
  if (!year.value || isNaN(parseInt(year.value))) {
    error.value = 'Please enter a valid Year.';
    papersByCollaboration.value = {}; searchAttempted.value = true; return;
  }

  isLoading.value = true; error.value = null; papersByCollaboration.value = {}; searchAttempted.value = true;

  const fetchPromises = collaborationsToFetch.map(collabName =>
    fetchSingleCollaboration(collabName, year.value)
  );

  try {
    const results = await Promise.allSettled(fetchPromises);
    const newPapersByCollab = {};
    results.forEach((result, index) => {
      const collabName = collaborationsToFetch[index];
      if (result.status === 'fulfilled' && result.value) {
        newPapersByCollab[collabName] = result.value;
      } else {
        console.error(`Failed to fetch papers for ${collabName}:`, result.reason || 'Unknown error');
        newPapersByCollab[collabName] = [];
      }
    });
    papersByCollaboration.value = newPapersByCollab;

    // Watcher will now handle KaTeX rendering after data load or view change
    // await nextTick();
    // renderKaTeXOverview(); // Removed explicit call

  } catch (err) {
    console.error("Error processing fetch results:", err);
    error.value = "An unexpected error occurred while fetching data.";
  } finally {
    isLoading.value = false;
  }
}

// Helper function (remains the same)
async function fetchSingleCollaboration(collabName, yearValue) {
  const query = `cn:${encodeURIComponent(collabName)} and year:${yearValue}`;
  const apiUrl = `https://inspirehep.net/api/literature?q=${query}&size=250&sort=mostrecent`;
  const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error(`HTTP error ${response.status} for ${collabName}`);
  const data = await response.json();
  if (data.hits && data.hits.hits) {
    const filteredPapers = data.hits.hits.filter(paper => {
        const hasEnoughAuthors = paper.metadata?.authors && paper.metadata.authors.length >= 30;
        if (!hasEnoughAuthors) return false;
        if (collabName.toLowerCase() === 'belle-ii') {
            const collaborations = paper.metadata?.collaborations;
            if (!Array.isArray(collaborations)) return false;
            const includesBelleII = collaborations.some(c => c?.value === 'Belle-II');
            const includesSubCollaboration = collaborations.some(c => c?.value?.startsWith('Belle-II '));
            return includesBelleII && !includesSubCollaboration;
        }
        return true;
    });
    return filteredPapers.map(paper => {
        const pubInfo = paper.metadata?.publication_info?.[0];
        const arxivData = paper.metadata?.arxiv_eprints?.[0];
        const paperYear = pubInfo?.year || (paper.metadata?.earliest_date ? paper.metadata.earliest_date.substring(0, 4) : 'N/A');
        // Extract and join all collaboration names (Corrected based on file state)
        const collaborationDisplay = Array.isArray(paper.metadata?.collaborations)
            ? paper.metadata.collaborations.map(c => c.value).join(', ')
            : 'N/A';

        return {
            id: paper.id, title: paper.metadata?.titles?.[0]?.title || 'No Title Available',
            authors: getAuthors(paper), // Keep for potential future use
            collaborationDisplay: collaborationDisplay, // Add collaboration for table display
            publication: getPublicationInfo(paper),
            inspireLink: getInspireLink(paper), doiLink: getDoiLink(paper), arxivLink: getArxivLink(paper),
            journal: pubInfo?.journal_title || 'N/A', year: paperYear, arxivId: arxivData?.value || null,
        };
    });
  } else { return []; }
}

// --- Function to explicitly render KaTeX on the overview container (kept for watcher) ---
// Renamed for clarity
function renderKaTeXInOverview() {
    setTimeout(() => { // Delay for safety
        if (resultsContainer.value && window.renderMathInElement) {
            try {
                // console.log("Rendering KaTeX on Overview container");
                window.renderMathInElement(resultsContainer.value, {
                    delimiters: [ { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true } ],
                    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "a"], throwOnError: false
                });
            } catch (error) { console.error("KaTeX rendering failed on overview:", error); }
        } else if (!window.renderMathInElement) { console.warn("KaTeX auto-render function (renderMathInElement) not found."); }
    }, 150); // Adjusted delay slightly if needed
}

// --- Watcher for KaTeX rendering ---
// Watch for changes in the total count (indicating data loaded) or view mode
watch([totalPaperCount, viewMode], async (newValues, oldValues) => {
    // Check if data has been loaded (searchAttempted is true and not loading)
    // and if either total count changed (data loaded/updated) or view mode changed
    const dataLoaded = searchAttempted.value && !isLoading.value;
    const countChanged = newValues[0] !== oldValues[0];
    const viewChanged = newValues[1] !== oldValues[1];

    if (dataLoaded && (countChanged || viewChanged)) {
        await nextTick(); // Ensure DOM is updated based on viewMode/data
        renderKaTeXInOverview(); // Call the rendering function
    }
}, { deep: true, immediate: false }); // deep might not be necessary if watching primitives/refs


// --- Helper Functions Removed (Now imported from composable) ---


// --- Lifecycle Hooks ---
onMounted(() => {
  // Fetch data for the default year when the component mounts
  fetchAllCollaborations();
});

</script>

<template>
  <v-container fluid>
    <!-- <h1 class="text-h5 text-center mb-4">Collaboration Overview by Year</h1> -->

    <!-- Row for Total Count and Search Form -->
    <v-row align="center" justify="space-between" class="mb-4">
      <!-- Total Count Display (Left) -->
      <v-col cols="auto">
        <p v-if="!isLoading && searchAttempted && totalPaperCount > 0" class="text-h6">
          EDG Papers in {{ year }}: {{ totalPaperCount }}
        </p>
         <p v-else-if="!isLoading && searchAttempted" class="text-subtitle-1 text-medium-emphasis">
             Total Papers: 0
         </p>
         <div v-else style="min-height: 28px;"></div> 
      </v-col>

      <!-- Search Form & View Toggle (Right) -->
      <v-col cols="12" md="8" lg="7">
        <v-form @submit.prevent="fetchAllCollaborations">
          <v-row align="center" justify="end" no-gutters>
             <v-col cols="12" sm="5" md="5" class="pr-2">
               <v-text-field
                v-model="year" label="Year" type="number" placeholder="Enter Year"
                variant="outlined" density="compact" hide-details="auto" min="1900"
                :max="new Date().getFullYear() + 1" required
              ></v-text-field>
            </v-col>
             <v-col cols="12" sm="3" md="3" class="pr-2">
               <v-btn type="submit" :loading="isLoading" :disabled="isLoading" color="primary" block size="large">
                 {{ isLoading ? 'Loading...' : 'Search' }}
               </v-btn>
             </v-col>
             <v-col cols="auto" v-if="!isLoading && searchAttempted && totalPaperCount > 0">
                 <!-- View Mode Toggle -->
                 <v-btn-toggle v-model="viewMode" variant="outlined" divided density="compact" mandatory>
                    <v-btn value="table" icon="mdi-table" size="large"></v-btn> 
                    <v-btn value="text" icon="mdi-format-list-text" size="large"></v-btn> 
                 </v-btn-toggle>
             </v-col>
          </v-row>
        </v-form>
      </v-col>
    </v-row>

    <!-- Loading Indicator -->
    <div class="text-center my-8" v-if="isLoading">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Loading data for all collaborations...</p>
    </div>

    <!-- Error Alert -->
    <v-alert v-if="error" type="warning" variant="tonal" closable class="my-4" @update:modelValue="error = null">
      {{ error }}
    </v-alert>

    <!-- Results Section -->
    <div v-if="!isLoading && searchAttempted && !error" class="results-section mt-2" ref="resultsContainer">
       <!-- Removed duplicate Total Count and View Toggle Row -->

      <!-- Table View -->
      <div v-if="viewMode === 'table'">
        <template v-for="collab in collaborationsToFetch" :key="collab + '-table'">
          <div v-if="papersByCollaboration[collab] && papersByCollaboration[collab].length > 0" class="mb-8">
          <h2 class="text-h6 mb-3">{{ collab }} ({{ papersByCollaboration[collab].length }})</h2>
          <v-card elevation="2">
            <v-data-table
              :headers="tableHeaders"
              :items="papersByCollaboration[collab]"
              item-value="id"
              class="elevation-0"
              density="compact"
              :items-per-page="50"
            >
              <template v-slot:item.title="{ item }"><span v-html="item.title"></span></template>
              <template v-slot:item.links="{ item }">
                 <v-btn :href="item.inspireLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">INSPIRE</v-btn>
                 <v-btn v-if="item.arxivLink" :href="item.arxivLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">arXiv</v-btn>
                 <v-btn v-if="item.doiLink" :href="item.doiLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">DOI</v-btn>
                </template>
            </v-data-table>
          </v-card>
        </div>
      </template>
      <!-- Optional: Message if NO collaborations had results -->
       <p v-if="viewMode === 'table' && Object.values(papersByCollaboration).every(papers => papers.length === 0)" class="text-center text-medium-emphasis pa-4">
         No papers found for any listed collaboration (authors >= 30) in {{ year }}.
       </p>
      </div>

      <!-- Text View -->
      <div v-if="viewMode === 'text'" class="text-view">
         <template v-for="collab in collaborationsToFetch" :key="collab + '-text'">
            <div v-if="papersByCollaboration[collab] && papersByCollaboration[collab].length > 0" class="mb-6">
              <h2 class="text-h6 mb-2">{{ collab }} ({{ papersByCollaboration[collab].length }})</h2>
              <v-list lines="one" density="compact" class="py-0">
                <v-list-item v-for="paper in papersByCollaboration[collab]" :key="paper.id" class="px-1 py-2 border-bottom">
                  <v-list-item-title class="text-wrap" style="line-height: 1.5;">
                    <span>"{{ paper.title }}", </span>
                    <!-- Display specific collaboration for this paper and append " Collaboration" -->
                    <span> {{ paper.collaborationDisplay }} collaboration, </span>
                    <span>{{ paper.publication }}</span>.
                    <template v-if="paper.arxivId && !paper.publication.includes('arXiv')">
                      arXiv:<a :href="paper.arxivLink" target="_blank" rel="noopener noreferrer" class="text-decoration-none"> {{ paper.arxivId }}</a>.
                    </template>
                  </v-list-item-title>
                </v-list-item>
                <hr class="mt-2" />
              </v-list>
            </div>
         </template>
         <p v-if="viewMode === 'text' && Object.values(papersByCollaboration).every(papers => papers.length === 0)" class="text-center text-medium-emphasis pa-4">
           No papers found for any listed collaboration (authors >= 30) in {{ year }}.
         </p>
      </div>
    </div>

     <div v-else-if="!isLoading && !searchAttempted && !error" class="text-center mt-8 text-medium-emphasis">
        <p>Enter a year and click "Load Overview".</p>
     </div>

  </v-container>
</template>

<style scoped>
/* Styles remain the same */
.v-tab {
    font-size: 0.8rem;
}
</style>
