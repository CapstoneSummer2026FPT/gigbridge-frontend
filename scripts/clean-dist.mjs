import { access, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const distDirectory = path.resolve(projectRoot, 'dist');

const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, 'package.json'), 'utf8'),
);

if (packageJson.name !== 'gigbridge-frontend') {
  throw new Error('Refusing to clean build output outside the GigBridge frontend project.');
}

if (
  path.dirname(distDirectory) !== projectRoot
  || path.basename(distDirectory) !== 'dist'
) {
  throw new Error(`Refusing to remove unsafe build path: ${distDirectory}`);
}

await rm(distDirectory, {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 100,
});

try {
  await access(distDirectory);
  throw new Error(`Build output still exists after cleanup: ${distDirectory}`);
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}

console.log(`Cleaned build output: ${distDirectory}`);
