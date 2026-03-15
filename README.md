# SIMPLEX Architecture Simulator

This project contains a Node.js Express backend in `server.js` and a Vite React frontend in the `simplex-web` folder. 
The backend bridges the web interface with your custom C++ Assembler (`asm.exe` / `asm`) and Emulator (`emu.exe` / `emu`).

## Prerequisites
1. Ensure you have **Node.js** installed on your windows machine.
2. Make sure your C++ executables `asm.exe` and `emu.exe` are compiled and present at the root of `C:\Users\aryap\OneDrive\Desktop\Uranus`.
   - Compile them if you haven't:
     ```bash
     g++ asm.cpp -o asm.exe
     g++ emu.cpp -o emu.exe
     ```

## How to Run the Simulator

### 1. Start the Node.js Bridge Server
Open a terminal in the `Uranus\simplex-web` directory and run:
```bash
npm install express cors
node server.js
```
*This server will listen on port 3001 and wait for requests to compile and run the assembly text.*

### 2. Start the React Frontend
Open a **new, separate** terminal in the `Uranus\simplex-web` directory and run:
```bash
npm install
npm run dev
```
*This will start Vite. Open the displayed URL (usually `http://localhost:5173`) in your browser.*

### Features
- **Top Left:** Write your SIMPLEX Assembly in the editor.
- **Top Right (Dashboard):** Live view of `PC`, `SP`, `A`, and `B` with DEC/HEX toggle and visual flashing.
- **Bottom Left:** Console for Assembler logs, errors, and system trace outputs.
- **Bottom Right:** Memory placeholder. Update `emu.cpp` to print full memory dumps if you want to inspect exact memory indices!
- **Auto-Step / Step:** Click to walk through the emulator execution history cycle-by-cycle!
