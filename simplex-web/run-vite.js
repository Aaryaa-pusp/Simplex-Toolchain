import { exec } from 'child_process';
import fs from 'fs';

exec('npx vite', (error, stdout, stderr) => {
  fs.writeFileSync('vite-out.txt', stdout);
  fs.writeFileSync('vite-err.txt', stderr);
  if (error) {
    fs.writeFileSync('vite-error.txt', error.toString());
  }
});
