<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>EDG Publications</v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- Added mr-2 for spacing -->
      <v-btn to="/" text class="mr-2">
        Overview by Year
      </v-btn>
      <v-btn to="/search" text class="mr-2">
        Search Collaboration
      </v-btn>
      <v-btn to="/manage-small-papers" text class="mr-2">
        Manage Small Papers
      </v-btn>

      <!-- Login Button -->
      <v-btn v-if="!currentUser" @click="handleSignIn" color="white" outlined>
        <v-icon left>mdi-google</v-icon>
        Login
      </v-btn>

      <!-- User Info and Logout Button -->
      <template v-if="currentUser">
        <!-- Display First Name in Avatar -->
        <v-avatar color="info" size="36" class="mr-2">
          <span class="text-h6">{{ firstName.charAt(0) }}</span> <!-- Show first initial -->
        </v-avatar>
        <!-- <span class="mr-3 white--text">{{ firstName }}</span>  -->
        <!-- Logout Button -->
        <v-btn @click="handleSignOut" color="white" outlined>
          Logout
        </v-btn>
      </template>

    </v-app-bar>

    <v-main>
      <!-- Pass isLoggedIn state down (though ManageSmallPapers won't use it directly now) -->
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" :is-logged-in="isLoggedIn" /> <!-- Removed key binding -->
        </v-fade-transition>
      </router-view>
    </v-main>

    <!-- <v-footer app class="pa-3" color="grey-lighten-1">
      <v-spacer></v-spacer>
      <div>Data from &copy; INSPIRE-HEP {{ new Date().getFullYear() }}</div>
    </v-footer> -->
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'; // Added computed
import { signInWithGoogle, signOutUser, onAuthStateChangedListener } from '@/services/firebaseService';
import { useRouter } from 'vue-router'; // Import useRouter

const currentUser = ref(null);
const router = useRouter(); // Get router instance
let unsubscribeAuth = null; // To hold the unsubscribe function

// Computed property for boolean login status
const isLoggedIn = computed(() => !!currentUser.value);

// Computed property for user's first name
const firstName = computed(() => {
  return currentUser.value?.displayName?.split(' ')[0] || '';
});

// --- Authentication Handlers ---
async function handleSignIn() {
  try {
    await signInWithGoogle();
    // Auth state change will update currentUser via the listener
  } catch (error) {
    console.error("Login failed in App.vue:", error);
    // Optionally show an error message to the user
  }
}

async function handleSignOut() {
  try {
    await signOutUser();
    // Auth state change will update currentUser via the listener
    // Redirect to home page after logout
    router.push('/');
  } catch (error) {
    console.error("Logout failed in App.vue:", error);
    // Optionally show an error message
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  // Start listening for auth state changes when the component mounts
  unsubscribeAuth = onAuthStateChangedListener((user) => {
    currentUser.value = user;
    console.log("Auth State Changed - Current User:", user?.displayName || 'Logged Out');
  });
});

onUnmounted(() => {
  // Stop listening when the component unmounts to prevent memory leaks
  if (unsubscribeAuth) {
    unsubscribeAuth();
  }
});

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
