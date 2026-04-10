// Initialize window.ENV if it doesn't exist
window.ENV = window.ENV || {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: ''
};

console.log('Config.js - Initial ENV:', window.ENV);

// Load environment variables from a global config object
const ENV = {
    SUPABASE_URL: window.ENV.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: window.ENV.SUPABASE_ANON_KEY || ''
};

console.log('Config.js - Loaded ENV:', ENV);

// Make it globally accessible
window.ENV = ENV;

console.log('Config.js - Final ENV:', window.ENV);