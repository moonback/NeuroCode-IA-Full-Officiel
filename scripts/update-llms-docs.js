#!/usr/bin/env node

/**
 * Script to update llms.txt files from URLs
 * Usage: node scripts/update-llms-docs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'app', 'lib', 'common', 'llms-docs');

// Define sources for llms.txt files
const sources = [
  {
    name: 'fireproof',
    url: 'https://use-fireproof.com/llms.txt',
    outputPath: path.join(docsDir, 'fireproof.txt'),
  },
  {
    name: 'openrouter',
    url: 'https://openrouter.ai/docs/llms-full.txt',
    outputPath: path.join(docsDir, 'openrouter.txt'),
  },
  // Add more sources here as needed
];

async function fetchLlmsDoc(source) {
  console.log(`Fetching ${source.name} from ${source.url}...`);

  try {
    const response = await fetch(source.url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.statusText}`);
    }

    const text = await response.text();
    fs.writeFileSync(source.outputPath, text, 'utf8');
    console.log(`Successfully updated ${source.name} at ${source.outputPath}`);
  } catch (error) {
    console.error(`Error updating ${source.name}:`, error.message);
  }
}

// Ensure the directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Update all sources
async function updateAll() {
  for (const source of sources) {
    await fetchLlmsDoc(source);
  }
}

updateAll().then(() => console.log('Done updating llms docs.'));