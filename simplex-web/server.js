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
  exec(asmCmd, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
    // Attempt to read listfile if it exists, to show errors inline
    let listfileContent = '';
    if (fs.existsSync(tempListfilePath)) {
      listfileContent = fs.readFileSync(tempListfilePath, 'utf8');
    }

    // 3. If compilation fails, return error logs
    if (error) {
      let compilerLogs = error.message;
      if (fs.existsSync(tempLogPath)) {
        compilerLogs = fs.readFileSync(tempLogPath, 'utf8');
      }
      return res.json({ success: false, logs: compilerLogs, listfile: listfileContent });
    }

    // 4. If compilation succeeds, run emulator
    exec(emuCmd, { cwd: PROJECT_ROOT }, (emuError, emuStdout, emuStderr) => {
      if (emuError) {
        return res.json({ success: false, logs: emuError.message, listfile: listfileContent });
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

        if (trimmed.includes('Memory dump at end of execution')) {
          parsingMemory = true;
          return;
        }

        if (parsingMemory) {
          memoryDump.push(trimmed);
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

      return res.json({
        success: true,
        logs: successLogs,
        states: states,
        listfile: listfileContent,
        memoryDump: memoryDump
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
