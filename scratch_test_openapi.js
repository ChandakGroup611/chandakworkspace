const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function fetchSchema() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(url);
  const data = await response.json();
  
  // Find definitions for tasks
  const paths = data.paths;
  console.log(JSON.stringify(paths['/tasks'], null, 2).substring(0, 500));
}

fetchSchema();
