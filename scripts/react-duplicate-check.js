#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

function checkReactDuplicates() {
  console.log('🔍 Checking for duplicate React instances...\n');
  
  try {
    // Check npm ls for React duplicates
    const npmLs = execSync('npm ls react', { encoding: 'utf8', cwd: path.resolve(__dirname, '..') });
    
    if (npmLs.includes('-- react@') && npmLs.split('react@').length > 2) {
      console.log('❌ Multiple React versions detected in dependency tree:\n');
      console.log(npmLs);
      console.log('\n🔧 Run: npm dedupe or yarn dedupe to fix');
      process.exit(1);
    }
    
    // Check react-dom too
    const npmLsReactDom = execSync('npm ls react-dom', { encoding: 'utf8', cwd: path.resolve(__dirname, '..') });
    
    if (npmLsReactDom.includes('-- react-dom@') && npmLsReactDom.split('react-dom@').length > 2) {
      console.log('❌ Multiple React-DOM versions detected in dependency tree:\n');
      console.log(npmLsReactDom);
      console.log('\n🔧 Run: npm dedupe or yarn dedupe to fix');
      process.exit(1);
    }
    
    console.log('✅ No duplicate React instances found!');
    console.log('React version:', execSync('npm ls react --depth=0', { encoding: 'utf8', cwd: path.resolve(__dirname, '..') }).trim());
    
  } catch (error) {
    if (error.status === 1 && error.stdout) {
      // npm ls returns 1 if there are issues, but still outputs info
      const output = error.stdout.toString();
      
      if (output.includes('deduped')) {
        console.log('⚠️  React packages are deduped, but check for version conflicts:\n');
        console.log(output);
      } else {
        console.log('❌ React dependency check failed:\n');
        console.log(output);
        process.exit(1);
      }
    } else {
      console.error('❌ Error checking React dependencies:', error.message);
      process.exit(1);
    }
  }
}

checkReactDuplicates();