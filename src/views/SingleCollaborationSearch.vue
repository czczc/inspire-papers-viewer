<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import { useInspireHelpers } from '@/composables/useInspireHelpers'; // Import the composable

// --- Initialize Helpers ---
const { getAuthors, getPublicationInfo, getDoiLink, getInspireLink, getArxivLink } = useInspireHelpers();

// --- State ---
const collaboration = ref('DUNE'); // Default collaboration
const year = ref(new Date().getFullYear().toString()); // Default year
const papers = ref([]); // Holds the raw filtered list from API
const isLoading = ref(false);
const error = ref(null);
const searchAttempted = ref(false);
const viewMode = ref('table'); // Default view
const resultsContainer = ref(null);
// Removed showPublishedOnly ref

// --- Predefined Collaboration List ---
const collaborationSuggestions = [
  'DUNE', 'MicroBooNE', 'ICARUS', 'SBND', 'Belle-II',
  'Daya Bay', 'PROSPECT', 'Muon g-2', 'MINOS'
];

// --- Table Headers ---
const tableHeaders = [
  { title: 'Title', key: 'title', sortable: true },
  { title: 'Collaboration', key: 'collaborationDisplay', sortable: true },
  { title: 'Publication', key: 'publication', sortable: false },
  { title: 'Links', key: 'links', sortable: false, align: 'start', minWidth: '150px' },
];

// --- Computed property removed ---
// const displayedPapers = computed(...)

// --- Methods ---
async function fetchPapers() {
  // Validation...
  if (!collaboration.value || !year.value) {
      error.value = 'Please enter both Collaboration Name and Year.';
      papers.value = []; searchAttempted.value = true; return;
  }
   if (isNaN(parseInt(year.value))) {
      error.value = 'Year must be a valid number.';
      papers.value = []; searchAttempted.value = true; return;
  }

  isLoading.value = true; error.value = null; papers.value = []; searchAttempted.value = true;

  const collabValue = typeof collaboration.value === 'string' ? collaboration.value.trim() : collaboration.value;
  let query = `cn:${encodeURIComponent(collabValue)} and year:${year.value}`;
  const apiUrl = `https://inspirehep.net/api/literature?q=${query}&size=250&sort=mostrecent`;

  try {
    const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }
    const data = await response.json();
    if (data.hits && data.hits.hits) {
      const filteredPapers = data.hits.hits.filter(paper => { // Initial filtering
          const hasEnoughAuthors = paper.metadata?.authors && paper.metadata.authors.length >= 30;
          if (!hasEnoughAuthors) return false;
          if (collabValue.toLowerCase() === 'belle-ii') {
              const collaborations = paper.metadata?.collaborations;
              if (!Array.isArray(collaborations)) return false;
              const includesBelleII = collaborations.some(c => c?.value === 'Belle-II');
              const includesSubCollaboration = collaborations.some(c => c?.value?.startsWith('Belle-II '));
              return includesBelleII && !includesSubCollaboration;
          }
          return true;
      });
      // Map data
      papers.value = filteredPapers.map(paper => {
          const pubInfo = paper.metadata?.publication_info?.[0];
          const arxivData = paper.metadata?.arxiv_eprints?.[0];
          const paperYear = pubInfo?.year || (paper.metadata?.earliest_date ? paper.metadata.earliest_date.substring(0, 4) : 'N/A');
          const collaborationDisplay = Array.isArray(paper.metadata?.collaborations) ? paper.metadata.collaborations.map(c => c.value).join(', ') : 'N/A';
          return {
              id: paper.id, title: paper.metadata?.titles?.[0]?.title || 'No Title Available',
              authors: getAuthors(paper), // Still needed for Cards view subtitle
              collaborationDisplay: collaborationDisplay, // For table view
              publication: getPublicationInfo(paper), // Formatted publication string
              inspireLink: getInspireLink(paper), doiLink: getDoiLink(paper), arxivLink: getArxivLink(paper),
              journal: pubInfo?.journal_title || null, // Keep journal for potential future use, but not used for filtering now
              year: paperYear, arxivId: arxivData?.value || null,
          };
      });
    } else { papers.value = []; }
  } catch (err) { error.value = `Failed to fetch papers: ${err.message}`; papers.value = []; }
  finally { isLoading.value = false; }
}

// --- Watcher for KaTeX rendering ---
// Watch the raw 'papers' ref again
watch([papers, viewMode], async () => {
  await nextTick();
  if (resultsContainer.value && window.renderMathInElement) {
    try {
      // console.log("Rendering KaTeX in SingleCollaborationSearch");
      window.renderMathInElement(resultsContainer.value, {
        delimiters: [ { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true } ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "a"], throwOnError: false
      });
    } catch (error) { console.error("KaTeX rendering failed:", error); }
  } else if (resultsContainer.value && !window.renderMathInElement) {
    console.warn("KaTeX auto-render function (renderMathInElement) not found.");
  }
}, { deep: true });

// --- Helper Functions Removed (Now imported from composable) ---

</script>

<template>
  <v-container fluid>
    <v-form @submit.prevent="fetchPapers">
      <v-row align="center">
        <v-col cols="12" md="5">
          <v-combobox
            v-model="collaboration" :items="collaborationSuggestions" label="Collaboration Name"
            placeholder="Select or type a name" variant="outlined" density="compact"
            hide-details="auto" required
          ></v-combobox>
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="year" label="Year" type="number" placeholder="e.g., 2023"
            variant="outlined" density="compact" hide-details="auto" min="1900"
            :max="new Date().getFullYear() + 1" required
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="3">
          <v-btn type="submit" :loading="isLoading" :disabled="isLoading" color="primary" block size="large">
            {{ isLoading ? 'Searching...' : 'Search Papers' }}
          </v-btn>
        </v-col>
      </v-row>
       <!-- Removed Switch for Published Only Filter -->
    </v-form>

    <div class="text-center my-8" v-if="isLoading">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Loading results...</p>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" closable class="my-4" @update:modelValue="error = null">
      {{ error }}
    </v-alert>

    <div v-if="!isLoading && searchAttempted && !error" class="results-section mt-6">
      <v-row justify="space-between" align="center" class="mb-4">
         <v-col cols="auto">
            <h2 class="text-h5">Results for {{ collaboration }} ({{ year }})</h2>
            <!-- Use papers.length for count -->
            <p v-if="papers.length > 0">Found {{ papers.length }} papers (authors >= 30).</p>
            <p v-else>No papers found matching your criteria.</p>
         </v-col>
         <v-col cols="auto" v-if="papers.length > 0">
             <v-btn-toggle v-model="viewMode" variant="outlined" divided density="compact" mandatory>
                <v-btn value="cards" icon="mdi-view-dashboard"></v-btn>
                <v-btn value="table" icon="mdi-table"></v-btn>
                <v-btn value="text" icon="mdi-format-list-text"></v-btn>
             </v-btn-toggle>
         </v-col>
      </v-row>

      <div ref="resultsContainer">
        <!-- Cards View - Use papers -->
        <v-row v-if="viewMode === 'cards' && papers.length > 0">
          <v-col v-for="paper in papers" :key="paper.id" cols="12" md="6" lg="4">
            <v-card class="mb-4" elevation="2">
              <v-card-title><span v-html="paper.title"></span></v-card-title>
              <v-card-subtitle>Authors: {{ paper.authors }}</v-card-subtitle>
              <v-card-text><p><strong>Publication:</strong> {{ paper.publication }}</p></v-card-text>
              <v-card-actions>
                <v-btn :href="paper.inspireLink" target="_blank" rel="noopener noreferrer" size="small" variant="text">INSPIRE</v-btn>
                <v-btn v-if="paper.arxivLink" :href="paper.arxivLink" target="_blank" rel="noopener noreferrer" size="small" variant="text">arXiv</v-btn>
                <v-btn v-if="paper.doiLink" :href="paper.doiLink" target="_blank" rel="noopener noreferrer" size="small" variant="text">DOI</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Table View - Use papers -->
        <v-card v-if="viewMode === 'table' && papers.length > 0" elevation="2">
          <v-data-table
            :headers="tableHeaders" :items="papers" item-value="id"
            class="elevation-1" density="compact" :items-per-page="50"
          >
            <template v-slot:item.title="{ item }"><span v-html="item.title"></span></template>
             <template v-slot:item.links="{ item }">
                <v-btn :href="item.inspireLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">INSPIRE</v-btn>
                <v-btn v-if="item.arxivLink" :href="item.arxivLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">arXiv</v-btn>
                <v-btn v-if="item.doiLink" :href="item.doiLink" target="_blank" rel="noopener noreferrer" size="x-small" variant="text" class="px-1">DOI</v-btn>
              </template>
          </v-data-table>
        </v-card>

        <!-- Plain Text View - Use papers -->
        <div v-if="viewMode === 'text' && papers.length > 0" class="text-view">
          <v-list lines="one" density="compact" class="py-0">
            <v-list-item v-for="paper in papers" :key="paper.id" class="px-1 py-2 border-bottom">
              <v-list-item-title class="text-wrap" style="line-height: 1.5;">
                <span class="font-weight-medium" v-html="paper.title"></span>.
                <span v-if="collaboration"> {{ collaboration }} collaboration, </span>
                <span>{{ paper.publication }}</span>.
                <template v-if="paper.arxivId && !paper.publication.includes('arXiv')">
                  arXiv:<a :href="paper.arxivLink" target="_blank" rel="noopener noreferrer" class="text-decoration-none"> {{ paper.arxivId }}</a>.
                </template>
              </v-list-item-title>
             </v-list-item>
          </v-list>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading && !searchAttempted && !error" class="text-center mt-8 text-medium-emphasis">
      <p>Enter a collaboration name and year, then click "Search Papers".</p>
    </div>
  </v-container>
</template>
