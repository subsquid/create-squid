#!/usr/bin/env node

/**
 * Script to generate create-squid.schema.json with up-to-date network list
 * Fetches network data from Subsquid archives and updates the schema
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const ARCHIVES_URL = 'https://cdn.subsquid.io/archives/evm.json';
const TEMPLATE_FILE = path.join(__dirname, 'create-squid.schema.mustache');
const OUTPUT_FILE = path.join(__dirname, 'create-squid.schema.json');

/**
 * Fetch network data from Subsquid archives
 */
async function fetchNetworks() {
  return new Promise((resolve, reject) => {
    console.log('Fetching network data from Subsquid archives...');
    
    https.get(ARCHIVES_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
  });
}

/**
 * Extract network IDs from archives data
 */
function extractNetworkIds(archivesData) {
  if (!archivesData.archives || !Array.isArray(archivesData.archives)) {
    throw new Error('Invalid archives data format');
  }

  const networkIds = archivesData.archives.map(archive => archive.id);
  
  // Sort alphabetically for consistent output
  networkIds.sort();
  
  console.log(`Found ${networkIds.length} networks:`);
  networkIds.forEach(id => console.log(`  - ${id}`));
  
  return networkIds;
}

/**
 * Simple mustache template renderer
 */
function renderTemplate(template, data) {
  let result = template;
  
  // Replace {{#networks}}...{{/networks}} section
  const networksRegex = /\{\{#networks\}\}(.*?)\{\{\/networks\}\}/s;
  const match = result.match(networksRegex);
  
  if (match) {
    const innerTemplate = match[1];
    const networksList = data.networks
      .map((network, index) => {
        const isLast = index === data.networks.length - 1;
        return innerTemplate
          .replace('{{.}}', network)
          .replace('{{^last}},{{/last}}', isLast ? '' : ',')
          .trim();
      })
      .join('\n                    ');
    
    result = result.replace(networksRegex, `${networksList}`);
  }
  
  return result;
}

/**
 * Generate the schema file
 */
async function generateSchema() {
  try {
    // Read the mustache template
    console.log('Reading template file...');
    const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
    
    // Fetch network data
    const archivesData = await fetchNetworks();
    
    // Extract network IDs
    const networkIds = extractNetworkIds(archivesData);
    
    // Prepare template data
    const templateData = {
      networks: networkIds
    };
    
    // Render the template
    console.log('Generating schema...');
    const schemaContent = renderTemplate(template, templateData);
    
    // Write the output file
    fs.writeFileSync(OUTPUT_FILE, schemaContent, 'utf8');
    
    console.log(`✅ Schema generated successfully: ${OUTPUT_FILE}`);
    console.log(`📊 Total networks included: ${networkIds.length}`);
    
  } catch (error) {
    console.error('❌ Error generating schema:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateSchema();
}

module.exports = { generateSchema, fetchNetworks, extractNetworkIds };
