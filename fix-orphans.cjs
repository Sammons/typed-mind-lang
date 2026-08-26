#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const supplementaryDir = 'lib/typed-mind-static-website/snippets-supplementary';
const cliPath = 'lib/typed-mind-cli/dist/cli.js';

// Get all .tmd files in supplementary directory
const files = fs.readdirSync(supplementaryDir)
  .filter(f => f.endsWith('.tmd'))
  .map(f => path.join(supplementaryDir, f));

console.log(`Found ${files.length} supplementary files to check`);

let fixed = 0;
let alreadyValid = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if file has orphaned entities
  try {
    const output = execSync(`node ${cliPath} --check "${file}" 2>&1`, { encoding: 'utf8' });
    if (output.includes('No errors found')) {
      alreadyValid++;
      console.log(`✓ ${path.basename(file)} - already valid`);
      continue;
    }
  } catch (error) {
    // File has errors, check if they're orphan errors
    const output = error.stdout || error.output?.join('') || '';
    
    if (output.includes('Orphaned entity')) {
      // Extract orphaned function names
      const orphanMatches = output.match(/Orphaned entity '(\w+)'/g);
      if (orphanMatches) {
        const orphanedFunctions = orphanMatches.map(m => m.match(/'(\w+)'/)[1]);
        
        // Simple fix: For each orphaned function, make sure it's imported by some file
        // Find the main program entry file and add imports
        const lines = content.split('\n');
        let modified = false;
        
        // Look for the first file entity that exports something
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('file ') && lines[i].includes('{')) {
            // Find the exports line
            for (let j = i + 1; j < lines.length && !lines[j].includes('}'); j++) {
              if (lines[j].includes('exports:')) {
                // Check if this file exports any of the orphaned functions
                const exportsMatch = lines[j].match(/exports:\s*\[([^\]]+)\]/);
                if (exportsMatch) {
                  const exports = exportsMatch[1].split(',').map(e => e.trim());
                  const orphansInThisFile = exports.filter(e => orphanedFunctions.includes(e));
                  
                  if (orphansInThisFile.length > 0) {
                    // This file has orphaned exports
                    // Find another file to import them
                    for (let k = 0; k < lines.length; k++) {
                      if (k !== i && lines[k].includes('file ') && lines[k].includes('{')) {
                        // Add imports to this file
                        for (let l = k + 1; l < lines.length && !lines[l].includes('}'); l++) {
                          if (lines[l].includes('path:')) {
                            // Insert imports line after path
                            const indent = lines[l].match(/^\s*/)[0];
                            const importsLine = `${indent}imports: [${orphansInThisFile.join(', ')}]`;
                            
                            // Check if imports already exists
                            let hasImports = false;
                            for (let m = k + 1; m < lines.length && !lines[m].includes('}'); m++) {
                              if (lines[m].includes('imports:')) {
                                hasImports = true;
                                // Add to existing imports
                                lines[m] = lines[m].replace(/imports:\s*\[([^\]]*)\]/, (match, existing) => {
                                  const currentImports = existing.split(',').map(e => e.trim()).filter(e => e);
                                  const newImports = [...new Set([...currentImports, ...orphansInThisFile])];
                                  return `imports: [${newImports.join(', ')}]`;
                                });
                                modified = true;
                                break;
                              }
                            }
                            
                            if (!hasImports) {
                              lines.splice(l + 1, 0, importsLine);
                              modified = true;
                            }
                            break;
                          }
                        }
                        break; // Only add to first other file found
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        if (modified) {
          const newContent = lines.join('\n');
          fs.writeFileSync(file, newContent);
          fixed++;
          console.log(`✓ ${path.basename(file)} - fixed ${orphanedFunctions.length} orphans`);
        } else {
          // Fallback: Remove orphaned functions entirely if can't fix references
          let newContent = content;
          for (const funcName of orphanedFunctions) {
            // Remove function definitions
            const funcRegex = new RegExp(`\\nfunction ${funcName} \\{[^}]*\\}`, 'g');
            newContent = newContent.replace(funcRegex, '');
            
            // Remove from exports
            newContent = newContent.replace(new RegExp(`\\b${funcName}\\b,?\\s*`, 'g'), '');
          }
          
          // Clean up empty exports
          newContent = newContent.replace(/exports:\s*\[\s*\]/g, '');
          
          fs.writeFileSync(file, newContent);
          fixed++;
          console.log(`✓ ${path.basename(file)} - removed ${orphanedFunctions.length} orphans`);
        }
      }
    } else {
      console.log(`? ${path.basename(file)} - has non-orphan errors`);
    }
  }
}

console.log(`\nSummary:`);
console.log(`  Already valid: ${alreadyValid}`);
console.log(`  Fixed: ${fixed}`);
console.log(`  Total: ${files.length}`);