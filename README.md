# INSPIRE Papers Viewer

A web application to view papers from High Energy Physics collaborations, fetched from INSPIRE-HEP.

## Features

*   Search for papers by collaboration name and year.
*   Filter papers to show only those with 30 or more authors.
*   Special filtering for "Belle-II" to exclude sub-collaborations.
*   View results in Cards, Table (default), or Text format.
*   Table view defaults to 50 items per page and left-aligns links.
*   Renders LaTeX in paper titles using KaTeX.
*   Separate views for single collaboration search and multi-collaboration overview by year.
*   Overview page loads data for the current year automatically.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```
