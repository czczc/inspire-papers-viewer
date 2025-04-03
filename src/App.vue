<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>EDG Publications</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn to="/" text> <!-- Updated path -->
        Overview by Year
      </v-btn>
      <v-btn to="/search" text>
        Search Collaboration
      </v-btn>
      <v-btn to="/manage-small-papers" text>
        Manage Small Papers
      </v-btn>
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>

    <v-footer app class="pa-3" color="grey-lighten-1">
      <v-spacer></v-spacer>
      <div>Data from &copy; INSPIRE-HEP {{ new Date().getFullYear() }}</div>
    </v-footer>
  </v-app>
</template>

<script setup>
// No script logic needed in the main layout for now
</script>

<style>
/* Global styles can remain or be moved if needed */
/* Keep styles needed for KaTeX if not handled elsewhere */
.v-list-item-title a {
    margin-left: 0.2em;
    text-decoration: underline !important;
}
.v-list-item-title a:hover {
    /* Optional hover */
}
.v-card-actions .v-btn,
.v-data-table .v-btn {
    text-decoration: underline !important;
    text-transform: none !important;
    letter-spacing: normal !important;
}
.v-card-actions .v-btn:hover::before,
.v-data-table .v-btn:hover::before {
    opacity: 0 !important;
}
.v-data-table__td, .v-data-table__th {
    font-size: 0.875rem !important;
}
.v-btn-toggle .v-btn {
    border-color: rgba(0,0,0,.12) !important;
}

/* Ensure router transitions look smooth */
.v-fade-transition-leave-active {
  transition: opacity 0.1s ease-out;
}
.v-fade-transition-enter-active {
  transition: opacity 0.2s ease-in;
}
.v-fade-transition-enter-from,
.v-fade-transition-leave-to {
  opacity: 0;
}
</style>
