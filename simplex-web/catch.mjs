import * as fs from 'fs';
try {
  await import('./vite.config.ts');
} catch (e) {
  fs.writeFileSync('vite-err-detail.txt', e.stack || e.message);
  console.log('Error caught and written to vite-err-detail.txt');
}
