const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xyz.supabase.co', 'dummy');
console.log(typeof supabase.storage.from('x').uploadToSignedUrl);
