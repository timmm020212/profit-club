// Patch prompts to auto-accept in non-TTY environments
const path = require('path');
const fs = require('fs');

const promptsPath = path.join(__dirname, '..', 'node_modules', 'prompts', 'lib', 'elements', 'confirm.js');

if (fs.existsSync(promptsPath)) {
  let content = fs.readFileSync(promptsPath, 'utf8');
  // Already patched?
  if (!content.includes('AUTO_ACCEPT')) {
    content = content.replace(
      'class ConfirmPrompt',
      `// AUTO_ACCEPT patch for non-TTY
class ConfirmPrompt`
    );
    // Patch the constructor to auto-submit true
    content = content.replace(
      'this.value = this.initial;',
      'this.value = true; if (!process.stdin.isTTY) { setTimeout(() => this.submit(), 10); }'
    );
    fs.writeFileSync(promptsPath, content);
    console.log('Patched prompts to auto-accept');
  } else {
    console.log('Already patched');
  }
} else {
  console.log('prompts not found at', promptsPath);
}
