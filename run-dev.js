
const { spawn } = require('child_process');
const path = require('path');
const concurrently = require('concurrently');

// Run frontend and backend concurrently
concurrently([
  { 
    command: 'npm run dev', 
    name: 'frontend', 
    prefixColor: 'green' 
  },
  { 
    command: 'node src/server.js', 
    name: 'backend', 
    prefixColor: 'blue',
    cwd: 'server'
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success']
}).then(
  () => process.exit(0),
  () => process.exit(1)
);

console.log('\n✅ Development servers starting...');
console.log('🚀 Frontend: http://localhost:8080');
console.log('🚀 Backend: http://localhost:5000');
console.log('\nPress Ctrl+C to stop all servers.\n');
