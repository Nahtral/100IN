#!/usr/bin/env node
const madge = require('madge');
const path = require('path');

async function checkCircularDependencies() {
  console.log('🔍 Checking for circular dependencies...\n');
  
  try {
    const result = await madge(path.resolve(__dirname, '../src'), {
      extensions: ['.ts', '.tsx'],
      tsConfig: path.resolve(__dirname, '../tsconfig.json'),
    });

    const circular = result.circular();
    
    if (circular.length > 0) {
      console.log('❌ Circular dependencies found:\n');
      circular.forEach((cycle, index) => {
        console.log(`${index + 1}. ${cycle.join(' → ')}`);
      });
      console.log('\n📋 Circular Dependencies Report:');
      console.log(`Total cycles: ${circular.length}`);
      
      // Write to file for CI
      require('fs').writeFileSync(
        path.resolve(__dirname, '../circular-deps-report.json'),
        JSON.stringify({ cycles: circular, count: circular.length }, null, 2)
      );
      
      process.exit(1);
    } else {
      console.log('✅ No circular dependencies found!');
      
      // Write empty report
      require('fs').writeFileSync(
        path.resolve(__dirname, '../circular-deps-report.json'),
        JSON.stringify({ cycles: [], count: 0 }, null, 2)
      );
    }
    
    console.log(`\n📊 Module Analysis:`);
    console.log(`Total modules: ${result.obj().length}`);
    console.log(`Dependencies checked: ${Object.keys(result.obj()).length}`);
    
  } catch (error) {
    console.error('❌ Error analyzing dependencies:', error.message);
    process.exit(1);
  }
}

checkCircularDependencies();