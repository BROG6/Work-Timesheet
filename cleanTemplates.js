// cleanTemplates.js
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const filesToClean = [
  'Site Safety Inspection Report.docx',
  'H&S and Toolbox Meeting Worksheet.docx'
];

async function cleanDocx(fileName) {
  const filePath = path.join(__dirname, 'public', fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  console.log(`🧹 Cleaning XML tags in ${fileName}...`);
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  let docXml = await zip.file('word/document.xml').async('string');

  // Strip XML tags that break up {{ tag }} placeholders inside Word
  // Merges fragmented <w:t> tags into a clean single string tag
  const cleanedXml = docXml.replace(/\{\{[^}]*\}\}/g, (match) => {
    const plainTextTag = match.replace(/<[^>]+>/g, '');
    return `<w:t>${plainTextTag}</w:t>`;
  });

  zip.file('word/document.xml', cleanedXml);

  const updatedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(filePath, updatedBuffer);
  console.log(`✅ Successfully cleaned ${fileName}!`);
}

async function run() {
  for (const file of filesToClean) {
    await cleanDocx(file);
  }
}

run();
