require('dotenv').config({path: '.env.local'});
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
});

const { executeGlobalSearch } = require('./lib/repositories/search');
executeGlobalSearch('763b4433-833d-4c63-bb09-c7e456d53616', 'sub').then(r => console.log(r)).catch(e => console.error(e));
