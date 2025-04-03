// src/composables/useInspireHelpers.js

// Reusable helper functions for processing INSPIRE paper data

export function useInspireHelpers() {

  function getAuthors(paper) {
    const authors = paper.metadata?.authors;
    if (!authors || authors.length === 0) return 'N/A'; // Handle no authors case

    const firstAuthor = authors[0]?.full_name || 'N/A'; // Get first author's full_name

    // If more than one author, append "et al."
    if (authors.length > 1) {
      return `${firstAuthor} et al.`;
    }

    // Otherwise, just return the first author's name
    return firstAuthor;
  }

  function getPublicationInfo(paper) {
      const pubInfoArray = paper.metadata?.publication_info;
      // Early exit if no publication info array
      if (!pubInfoArray || pubInfoArray.length === 0) {
           // Try arXiv as a last resort if no pub info at all
           const arxiv = paper.metadata?.arxiv_eprints?.[0]?.value;
           const year = paper.metadata?.earliest_date ? paper.metadata.earliest_date.substring(0, 4) : null;
           return arxiv ? `arXiv:${arxiv}${year ? ` (${year})` : ''}` : 'N/A';
      }
      const pubInfo = pubInfoArray[0];
      if (!pubInfo) return 'N/A'; // Should not happen if array check passed, but safe guard

      let infoString = '';

      // 1. Prioritize pubinfo_freetext
      if (pubInfo.pubinfo_freetext) {
          infoString = pubInfo.pubinfo_freetext;
      }
      // 2. Fallback: Try custom format ${journal} ${volume}, ${artid} (${year})
      else {
          const journal = pubInfo.journal_title;
          const volume = pubInfo.journal_volume;
          const artid = pubInfo.artid;
          const year = pubInfo.year;

          if (journal && year) { // Require at least journal and year for this format
              infoString = journal;
              if (volume) infoString += ` ${volume}`;
              if (artid) infoString += `, ${artid}`; // Add comma before artid
              infoString += ` (${year})`;
          }
          // 3. Fallback: arXiv info (if no freetext and custom format failed)
          else {
              const arxiv = paper.metadata?.arxiv_eprints?.[0]?.value;
              // Use the year extracted earlier if available
              const displayYear = year || (paper.metadata?.earliest_date ? paper.metadata.earliest_date.substring(0, 4) : null);
              if (arxiv) {
                  infoString = `arXiv:${arxiv}`;
                  if (displayYear && displayYear !== 'N/A') infoString += ` (${displayYear})`;
              }
          }
      }

      // 4. Final fallback
      return infoString || 'N/A';
  }

  function getDoiLink(paper) {
    const doi = paper.metadata?.dois?.[0]?.value;
    return doi ? `https://doi.org/${doi}` : null;
  }

  function getInspireLink(paper) {
    // ID is top-level on the paper object from API, not in metadata
    return paper.id ? `https://inspirehep.net/literature/${paper.id}` : '#';
  }

  function getArxivLink(paper) {
      const arxiv = paper.metadata?.arxiv_eprints?.[0]?.value;
      return arxiv ? `https://arxiv.org/abs/${arxiv}` : null;
  }

  // Return the functions so they can be destructured during import
  return {
    getAuthors,
    getPublicationInfo,
    getDoiLink,
    getInspireLink,
    getArxivLink
  };
}
