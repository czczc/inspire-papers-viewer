import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/search', // Changed path
    name: 'SingleCollaborationSearch',
    component: () => import('@/views/SingleCollaborationSearch.vue'),
    meta: { title: 'Search Collaboration' }
  },
  {
    path: '/', // Changed path to be the default
    name: 'AllCollaborationsOverview',
    // Lazy-load the component
    component: () => import('@/views/AllCollaborationsOverview.vue'),
    meta: { title: 'Collaboration Overview' }
  },
  {
    path: '/manage-small-papers',
    name: 'ManageSmallPapers',
    component: () => import('@/views/ManageSmallPapers.vue'),
    meta: { title: 'Manage Small Papers' }
  },
  // Optional: Add a catch-all route for 404s
  // { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundComponent },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Use history mode
  routes,
});

// Optional: Update document title on route change
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | INSPIRE Papers` : 'INSPIRE Papers';
});

export default router;
