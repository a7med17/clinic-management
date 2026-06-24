#!/usr/bin/env node

// Development launcher: frees Metro's default port before starting Expo with a clean LAN bundle.

const { execSync } = require('child_process');
const os = require('os');

// Kill any process using port 8081
if (os.platform() === 'win32') {
  try {
    const output = execSync('netstat -ano | findstr :8081', { encoding: 'utf8' });
    const pids = new Set();
    output.split('\n').forEach(line => {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) pids.add(match[1]);
    });
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`✓ Killed process on port 8081 (PID: ${pid})`);
      } catch (e) {
        // Already dead
      }
    });
  } catch (e) {
    // Port is free
  }
} else {
  try {
    const output = execSync('lsof -i :8081 -t', { encoding: 'utf8' });
    output.trim().split('\n').forEach(pid => {
      if (pid) {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        console.log(`✓ Killed process on port 8081 (PID: ${pid})`);
      }
    });
  } catch (e) {
    // Port is free
  }
}

// Launch Expo
console.log('\nStarting Expo in LAN mode (clearing cache)...\n');
execSync('expo start --lan --clear', { stdio: 'inherit' });
