#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Ports used by the ron-ai application
const PORTS = [3000, 8000]; // Frontend (Next.js), Backend (Python API)

async function killPort(port) {
  try {
    console.log(`🔍 Checking port ${port}...`);
    
    if (process.platform === 'win32') {
      // Windows command
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (stdout.trim()) {
          await execAsync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`);
          console.log(`✅ Killed process(es) on port ${port}`);
        } else {
          console.log(`✅ Port ${port} is free`);
        }
      } catch (error) {
        console.log(`✅ Port ${port} is free`);
      }
    } else {
      // Unix/Linux/macOS command
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          console.log(`⚠️  Found ${pids.length} process(es) on port ${port}`);
          
          for (const pid of pids) {
            try {
              await execAsync(`kill -9 ${pid}`);
              console.log(`✅ Killed process ${pid} on port ${port}`);
            } catch (error) {
              console.log(`⚠️  Process ${pid} may have already been killed`);
            }
          }
        } else {
          console.log(`✅ Port ${port} is free`);
        }
      } catch (error) {
        if (error.code === 1) {
          console.log(`✅ Port ${port} is free`);
        } else {
          console.log(`❌ Error checking port ${port}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error with port ${port}:`, error.message);
  }
}

async function killAllPorts() {
  console.log('🧹 Cleaning up ports before starting ron-ai services...\n');
  
  for (const port of PORTS) {
    await killPort(port);
  }
  
  console.log('\n🎉 All ports cleaned up! Ready to start ron-ai services.\n');
}

// Run if called directly
if (require.main === module) {
  killAllPorts().catch(console.error);
}

module.exports = { killAllPorts, killPort };