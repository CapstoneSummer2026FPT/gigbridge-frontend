import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testPdf() {
  const filePath = 'C:/Users/OS/Downloads/AvePoint Fresher - Junior Software Developer (1).pdf';
  console.log('Testing file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist at path!');
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  console.log('File size in bytes:', buffer.length);

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully! Total pages:', pdf.numPages);

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str || '').join(' ');
      console.log(`--- Page ${i} (${content.items.length} text items) ---`);
      console.log(pageText.slice(0, 300));
      fullText += pageText + '\n';
    }

    console.log('Total extracted text length:', fullText.trim().length);
    if (fullText.trim().length === 0) {
      console.log('WARNING: Extracted text length is 0! The PDF might be scanned/image-based or using special font encoding.');
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
  }
}

testPdf();
