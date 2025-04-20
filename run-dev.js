
const { spawn } = require('child_process');
const path = require('path');

// Function to run a command in a specific directory
function runCommand(command, args, cwd) {
  console.log(`Running command in ${cwd}: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (error) => {
    console.error(`Error running ${command}: ${error.message}`);
  });

  return child;
}

console.log('Starting development servers...');

// Start the frontend (Vite)
const frontendProcess = runCommand('npm', ['run', 'dev'], process.cwd());

// Start the backend (Express)
const serverDir = path.join(process.cwd(), 'server');
const backendProcess = runCommand('node', ['src/server.js'], serverDir);

// Handle process termination
const handleTermination = () => {
  console.log('Shutting down development servers...');
  frontendProcess.kill();
  backendProcess.kill();
  process.exit(0);
};

// Listen for termination signals
process.on('SIGINT', handleTermination);
process.on('SIGTERM', handleTermination);
process.on('exit', handleTermination);

console.log('\n✅ Development servers running!');
console.log('🚀 Frontend: http://localhost:8080');
console.log('🚀 Backend: http://localhost:5000');
console.log('\nPress Ctrl+C to stop all servers.\n');
