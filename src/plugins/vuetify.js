// src/plugins/vuetify.js

// Styles
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css'; // Ensure you are using css-loader

// Composables
import { createVuetify } from 'vuetify';

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'light', // Or 'dark'
  },
  icons: {
    defaultSet: 'mdi', // Ensure you have installed @mdi/font
  },
  // You can add more configuration here if needed
  // components: { ... },
  // directives: { ... },
});
