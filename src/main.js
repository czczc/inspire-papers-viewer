import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import router from './router'; // Import the router
import { loadFonts } from './plugins/webfontloader';

loadFonts();

createApp(App)
  .use(router) // Use the router
  .use(vuetify)
  .mount('#app');
