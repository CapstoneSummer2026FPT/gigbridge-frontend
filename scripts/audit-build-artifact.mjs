import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const distDirectory = path.resolve(projectRoot, 'dist');
const indexPath = path.join(distDirectory, 'index.html');
const textExtensions = new Set(['.css', '.html', '.js', '.mjs']);
const forbiddenRuntimeReferences = [
  { label: '/admin/cheating', pattern: /\/admin\/cheating/i },
  { label: 'cheating-events', pattern: /cheating-events/i },
  { label: 'ProposalCheatingEvent', pattern: /ProposalCheatingEvent/i },
  { label: 'FreelancerCheatingViolation', pattern: /FreelancerCheatingViolation/i },
  { label: 'logCheatingEvent', pattern: /logCheatingEvent/i },
  { label: 'Secure interview mode', pattern: /Secure interview mode/i },
  { label: 'Anti-Cheat System', pattern: /Anti-Cheat System/i },
];

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Unexpected symbolic link in build artifact: ${entryPath}`);
    }

    if (entry.isDirectory()) {
      files.push(...await collectTextFiles(entryPath));
      continue;
    }

    if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

const homepageHtml = await readFile(indexPath, 'utf8').catch((error) => {
  throw new Error(`Production build is missing dist/index.html: ${error.message}`);
});

const homepageRequirements = [
  { label: 'prerendered landing root', pattern: /<div id="landing-root">/ },
  { label: 'homepage canonical', pattern: /<link rel="canonical" href="https:\/\/gigbridge\.id\.vn\/">/ },
  { label: 'landing stylesheet', pattern: /\/assets\/landing\.css/ },
  { label: 'landing hydration entry', pattern: /\/assets\/landing-client\.js/ },
  { label: 'semantic homepage heading', pattern: /<h1[^>]*>Kết nối đúng freelancer\./ },
];

for (const requirement of homepageRequirements) {
  if (!requirement.pattern.test(homepageHtml)) {
    throw new Error(`Production homepage is missing ${requirement.label}.`);
  }
}

if (/accounts\.google\.com\/gsi\/client/.test(homepageHtml)) {
  throw new Error('Production homepage must not load the Google Login SDK.');
}

if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(homepageHtml)) {
  throw new Error('Production homepage must not load external font stylesheets.');
}

if (/<link rel="stylesheet"[^>]*href="\/assets\/index-[^"]+\.css"/.test(homepageHtml)) {
  throw new Error('Production homepage must not load the main SPA stylesheet.');
}

if (/<script type="module"[^>]*src="\/assets\/index-[^"]+\.js"/.test(homepageHtml)) {
  throw new Error('Production homepage must not load the main SPA entry.');
}

if ((homepageHtml.match(/<h1(?:\s|>)/g) ?? []).length !== 1) {
  throw new Error('Production homepage must contain exactly one h1.');
}

const artifactFiles = await collectTextFiles(distDirectory);
const violations = [];

for (const filePath of artifactFiles) {
  const content = await readFile(filePath, 'utf8');

  for (const reference of forbiddenRuntimeReferences) {
    if (reference.pattern.test(content)) {
      violations.push({
        file: path.relative(projectRoot, filePath),
        reference: reference.label,
      });
    }
  }
}

if (violations.length > 0) {
  const details = violations
    .map(({ file, reference }) => `- ${file}: ${reference}`)
    .join('\n');

  throw new Error(`Retired anti-cheat runtime references found in production artifact:\n${details}`);
}

console.log(
  `Artifact audit passed: ${artifactFiles.length} HTML/JS/CSS files contain no retired anti-cheat runtime references.`,
);
