// This file is intentionally left empty
// Environment variables are injected directly in the HTML file
// This file exists to prevent 404 errors when the script is referenced 

// This file ensures environment variables and Supabase client are properly loaded
// Environment variables are injected directly in the HTML file

// Make sure window.ENV exists
window.ENV = window.ENV || {};
console.log('Environment variables:', window.ENV);

// Initialize Supabase client
function initializeSupabase() {
    console.log('Initializing Supabase client');
    
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return;
    }
    console.log('Supabase library loaded');

    if (!window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
        console.error('Supabase configuration missing');
        return;
    }
    console.log('Supabase configuration found');

    try {
        // Create Supabase client
        const supabase = window.supabase.createClient(
            window.ENV.SUPABASE_URL,
            window.ENV.SUPABASE_ANON_KEY
        );

        // Make it globally accessible
        window.supabaseClient = supabase;

        console.log('Supabase client initialized successfully');
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
    }
}

// Initialize Supabase when the script loads
initializeSupabase(); 