const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  fs.readdirSync(src).forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Function to combine supplementary content with snippet
function combineWithSupplementary(snippetPath, supplementaryDir) {
  const snippetContent = fs.readFileSync(snippetPath, 'utf8');
  const snippetName = path.basename(snippetPath);
  const supplementaryPath = path.join(supplementaryDir, snippetName);
  
  if (!fs.existsSync(supplementaryPath)) {
    // No supplementary content needed
    return snippetContent;
  }
  
  const supplementaryContent = fs.readFileSync(supplementaryPath, 'utf8');
  
  // Combine supplementary content first, then snippet content
  // This allows the snippet to reference entities defined in supplementary
  // Ensure proper spacing between sections
  return supplementaryContent.trim() + '\n\n' + snippetContent.trim();
}

// Function to validate TypedMind snippets
function validateSnippets() {
  const snippetsDir = path.join(__dirname, 'snippets');
  const supplementaryDir = path.join(__dirname, 'snippets-supplementary');
  
  if (!fs.existsSync(snippetsDir)) {
    console.log(`${colors.yellow}Warning: snippets directory not found${colors.reset}`);
    return true;
  }

  const snippetFiles = fs.readdirSync(snippetsDir).filter(file => file.endsWith('.tmd'));
  
  if (snippetFiles.length === 0) {
    console.log(`${colors.yellow}Warning: No .tmd files found in snippets directory${colors.reset}`);
    return true;
  }

  console.log(`${colors.blue}Validating ${snippetFiles.length} TypedMind snippet files...${colors.reset}`);
  console.log(`${colors.blue}Using supplementary content system from: ${supplementaryDir}${colors.reset}`);
  
  let validCount = 0;
  let errorCount = 0;

  for (const file of snippetFiles) {
    const filePath = path.join(snippetsDir, file);
    
    // Create temporary file with combined content for validation
    const tempDir = path.join(__dirname, 'temp-validation');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, file);
    const combinedContent = combineWithSupplementary(filePath, supplementaryDir);
    fs.writeFileSync(tempFilePath, combinedContent);
    
    try {
      // Use the TypedMind CLI to validate the combined file
      let cliCommand = 'typed-mind';
      
      // First try to find the CLI in the local project (tsup emits cli.cjs since v1.0.0)
      const localCliCandidates = [
        path.join(__dirname, '..', 'typed-mind-cli', 'dist', 'cli.cjs'),
        path.join(__dirname, '..', 'typed-mind-cli', 'dist', 'cli.js')
      ];
      const localCliPath = localCliCandidates.find(candidate => fs.existsSync(candidate));
      if (localCliPath) {
        cliCommand = `node "${localCliPath}"`;
      }
      
      execSync(`${cliCommand} -c "${tempFilePath}" --skip-orphan-check`, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      validCount++;
      const hasSupplementary = fs.existsSync(path.join(supplementaryDir, file));
      const supplementaryIndicator = hasSupplementary ? ` ${colors.blue}(+supplementary)${colors.reset}` : '';
      console.log(`  ${colors.green}✓${colors.reset} ${file}${supplementaryIndicator}`);
      
    } catch (error) {
      errorCount++;
      const hasSupplementary = fs.existsSync(path.join(supplementaryDir, file));
      const supplementaryIndicator = hasSupplementary ? ` ${colors.blue}(+supplementary)${colors.reset}` : '';
      console.log(`  ${colors.red}✗${colors.reset} ${file}${supplementaryIndicator}`);
      
      // Parse error output to show specific validation issues
      const errorOutput = error.stdout || error.stderr || error.message;
      const lines = errorOutput.split('\n').filter(line => line.trim());
      
      // Show relevant error lines (skip CLI usage info)
      for (const line of lines) {
        if (line.includes('Error:') || line.includes('ValidationError:') || line.includes('SyntaxError:')) {
          console.log(`    ${colors.red}${line.trim()}${colors.reset}`);
        }
      }
    }
    
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  // Clean up temporary directory if empty
  try {
    const tempDir = path.join(__dirname, 'temp-validation');
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  } catch (cleanupError) {
    // Ignore cleanup errors
  }

  console.log(`\n${colors.bright}Validation Summary:${colors.reset}`);
  console.log(`  Valid: ${colors.green}${validCount}${colors.reset}`);
  console.log(`  Errors: ${colors.red}${errorCount}${colors.reset}`);
  console.log(`  Total: ${snippetFiles.length}`);
  console.log(`  ${colors.blue}Note: Snippets with supplementary content are marked (+supplementary)${colors.reset}`);

  // Fail the build if there are validation errors
  if (errorCount > 0) {
    console.log(`\n${colors.red}${colors.bright}Build failed: Some snippets have validation errors${colors.reset}`);
    console.log(`Please fix the validation errors above before building.`);
    return false;
  }

  return true;
}

console.log(`${colors.bright}${colors.blue}TypedMind Static Website Build${colors.reset}\n`);

// Step 1: Validate all TypedMind snippets
console.log(`${colors.bright}Step 1: Validating TypedMind snippets${colors.reset}`);
if (!validateSnippets()) {
  process.exit(1);
}

console.log(`\n${colors.bright}Step 2: Building website${colors.reset}`);

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy all files from src directory (including subdirectories)
const srcDir = path.join(__dirname, 'src');
copyDirectory(srcDir, distDir);

// Copy assets
const assetsDir = path.join(__dirname, 'assets');
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

// Copy CSS
const cssDir = path.join(assetsDir, 'css');
const distCssDir = path.join(distAssetsDir, 'css');
if (!fs.existsSync(distCssDir)) {
  fs.mkdirSync(distCssDir, { recursive: true });
}
fs.readdirSync(cssDir).forEach(file => {
  fs.copyFileSync(path.join(cssDir, file), path.join(distCssDir, file));
});

// Copy JS
const jsDir = path.join(assetsDir, 'js');
const distJsDir = path.join(distAssetsDir, 'js');
if (!fs.existsSync(distJsDir)) {
  fs.mkdirSync(distJsDir, { recursive: true });
}

// Copy JS files and directories
fs.readdirSync(jsDir).forEach(item => {
  const srcPath = path.join(jsDir, item);
  const destPath = path.join(distJsDir, item);
  
  if (fs.statSync(srcPath).isDirectory()) {
    copyDirectory(srcPath, destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Copy typed-mind library
const typedMindSrc = path.join(__dirname, '..', 'typed-mind', 'dist');
const typedMindDist = path.join(distAssetsDir, 'typed-mind', 'dist');
if (!fs.existsSync(typedMindDist)) {
  fs.mkdirSync(typedMindDist, { recursive: true });
}

// Copy necessary files from typed-mind dist
const typedMindFiles = ['parser.js', 'grammar-validator.js', 'index.js'];
typedMindFiles.forEach(file => {
  const srcFile = path.join(typedMindSrc, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(typedMindDist, file));
  }
});

// Copy grammar.md from typed-mind root
const grammarSrc = path.join(__dirname, '..', 'typed-mind', 'grammar.md');
const grammarDest = path.join(distAssetsDir, 'typed-mind', 'grammar.md');
if (fs.existsSync(grammarSrc)) {
  fs.copyFileSync(grammarSrc, grammarDest);
  console.log('Copied grammar.md to dist/assets/typed-mind/');
}

// Copy snippets directory to dist
const snippetsDir = path.join(__dirname, 'snippets');
const distSnippetsDir = path.join(distDir, 'snippets');
if (fs.existsSync(snippetsDir)) {
  if (!fs.existsSync(distSnippetsDir)) {
    fs.mkdirSync(distSnippetsDir, { recursive: true });
  }
  copyDirectory(snippetsDir, distSnippetsDir);
  console.log('Copied snippets directory to dist/snippets/');
}

console.log(`\n${colors.green}${colors.bright}Build completed successfully!${colors.reset}`);