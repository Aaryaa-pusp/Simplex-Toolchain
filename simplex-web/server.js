import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ASM_FILES_DIR = path.join(__dirname, 'asm_files');
const OUTPUT_FILES_DIR = path.join(__dirname, 'output_files');

// Ensure output directory exists (redundant if already created but safe)
if (!fs.existsSync(OUTPUT_FILES_DIR)) fs.mkdirSync(OUTPUT_FILES_DIR);

app.get('/api/asm-files', (req, res) => {
  if (!fs.existsSync(ASM_FILES_DIR)) return res.json([]);
  const files = fs.readdirSync(ASM_FILES_DIR).filter(f => f.endsWith('.asm'));
  res.json(files);
});

app.get('/api/asm-file/:name', (req, res) => {
  const filePath = path.join(ASM_FILES_DIR, req.params.name);
  if (fs.existsSync(filePath)) {
    res.send(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// The root folder is Uranus where asm/emu are located
const PROJECT_ROOT = path.join(__dirname, '..');

app.post('/api/simulate', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const tempAsmPath = path.join(PROJECT_ROOT, 'temp.asm');
  const tempLogPath = path.join(PROJECT_ROOT, 'temp_logfile.txt');
  const tempObjPath = path.join(PROJECT_ROOT, 'temp_obj.o');
  const tempListfilePath = path.join(PROJECT_ROOT, 'temp_listfile.lst');

  // 1. Save code to temp.asm
  fs.writeFileSync(tempAsmPath, code);

  // Helper to determine executable commands based on OS
  const isWin = process.platform === "win32";
  const asmCmd = isWin ? `.\\asm.exe temp.asm` : `./asm temp.asm`;
  const emuCmd = isWin ? `.\\emu.exe temp_obj.o` : `./emu temp_obj.o`;

  // 2. Run assembler
  exec(asmCmd, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    // --- Print every stderr line to the server console ---
    if (stderr) {
      stderr.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed) console.error('[ASM STDERR]', trimmed);
      });
    }
    if (stdout) {
      stdout.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed) console.log('[ASM STDOUT]', trimmed);
      });
    }

    // Attempt to read listfile if it exists
    let listfileContent = '';
    if (fs.existsSync(tempListfilePath)) {
      listfileContent = fs.readFileSync(tempListfilePath, 'utf8');
    }

    // 3. If compilation fails, return both stderr (line-by-line) and log file
    if (error) {
      let logfileContent = '';
      if (fs.existsSync(tempLogPath)) {
        logfileContent = fs.readFileSync(tempLogPath, 'utf8');
      }
      // Combine stderr lines and logfile for a complete picture
      const combinedLogs = (stderr || '').trim() + (logfileContent ? '\n' + logfileContent : '');
      return res.json({
        success: false,
        logs: combinedLogs,
        errors: (stderr || '').trim().split('\n').filter(l => l.trim()),
        listfile: listfileContent
      });
    }

    // 4. If compilation succeeds, run emulator
    exec(emuCmd, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 * 10 }, (emuError, emuStdout, emuStderr) => {
      // --- Print every emulator stderr line to the server console ---
      if (emuStderr) {
        emuStderr.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed) console.error('[EMU STDERR]', trimmed);
        });
      }

      if (emuError) {
        const combinedLogs = (emuStderr || '').trim() + '\n' + (emuError.message || '');
        return res.json({
          success: false,
          logs: combinedLogs,
          errors: (emuStderr || '').trim().split('\n').filter(l => l.trim()),
          listfile: listfileContent
        });
      }

      // 5 & 6. Parse stdout into states and memory dump
      const lines = emuStdout.split('\n');
      const states = [];
      let memoryDump = [];

      let currentState = { PC: 0, A: 0, B: 0, SP: 0 };
      let parsingMemory = false;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.includes('Emulator Output:')) {
          parsingMemory = true;
          memoryDump.push(trimmed);
          return;
        }

        // Keep storing everything after 'Emulator Output:' into memoryDump
        if (parsingMemory) {
          if (!trimmed.includes('HALT encountered')) {
            memoryDump.push(trimmed);
          } else {
            // Include HALT line and registers in memory output as requested
            memoryDump.push(trimmed);
          }
          return;
        }

        const pcMatch = trimmed.match(/PC\s*=\s*(\w+)/);
        const aMatch = trimmed.match(/A\s*=\s*(-\d+|\d+)/);
        const bMatch = trimmed.match(/B\s*=\s*(-\d+|\d+)/);
        const spMatch = trimmed.match(/SP\s*=\s*(-\d+|\d+)/);

        if (pcMatch || aMatch || bMatch || spMatch) {
          const parsedPc = pcMatch ? parseInt(pcMatch[1], 16) : currentState.PC;
          const parsedA = aMatch ? parseInt(aMatch[1], 10) : currentState.A;
          const parsedB = bMatch ? parseInt(bMatch[1], 10) : currentState.B;
          const parsedSp = spMatch ? parseInt(spMatch[1], 10) : currentState.SP;
          
          currentState = {
            PC: parsedPc,
            A: parsedA,
            B: parsedB,
            SP: parsedSp,
            rawStr: trimmed
          };
          
          states.push({ ...currentState });
        }
      });

      // Also get success log
      let successLogs = stdout;
      if (fs.existsSync(tempLogPath)) {
        successLogs = fs.readFileSync(tempLogPath, 'utf8');
      }

      // Save outputs to output_files if it was a named file (we'll implement this later)
      // For now, always save temp results as 'last' in output_files
      fs.copyFileSync(tempObjPath, path.join(OUTPUT_FILES_DIR, 'bubble_obj.o'));
      fs.copyFileSync(tempListfilePath, path.join(OUTPUT_FILES_DIR, 'bubble_listfile.lst'));
      fs.writeFileSync(path.join(OUTPUT_FILES_DIR, 'bubble_logfile.log'), successLogs + "\n" + emuStdout);

      return res.json({
        success: true,
        logs: successLogs,
        states: states,
        listfile: listfileContent,
        memoryDump: memoryDump,
        errors: []
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
