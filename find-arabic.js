const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'game.js');
const content = fs.readFileSync(filePath, 'utf8');

// Find line with submit button Arabic text (around line 974)
const lines = content.split('\n');

// Search for lines with Arabic-looking corruption patterns
console.log('Searching for corrupted Arabic text...\n');

lines.forEach((line, index) => {
  // Look for patterns like Ø or Ù which are common in corrupted Arabic
  if (line.includes('Ø') || line.includes('Ù')) {
    const lineNum = index + 1;
    console.log(`Line ${lineNum}: ${line.trim().substring(0, 100)}`);
    
    // Show hex for first 50 chars if it's a short line
    if (line.length < 200) {
      const chars = [...line.trim()].slice(0, 50);
      const hexCodes = chars.map(c => c.charCodeAt(0).toString(16).padStart(4, '0'));
      console.log(`  Char codes: ${hexCodes.join(' ')}\n`);
    }
  }
});
