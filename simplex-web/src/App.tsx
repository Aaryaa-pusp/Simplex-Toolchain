import { useState, useEffect } from 'react';
import { Play, StepForward, RefreshCw, Terminal, Cpu, HardDrive } from 'lucide-react';

interface ExecutionState {
  PC: number;
  A: number;
  B: number;
  SP: number;
  rawStr?: string;
}

function App() {
  const [code, setCode] = useState<string>('; Write SIMPLEX assembly here\nstart:\n    ldc 10\n    adc 5\n    HALT\n');
  const [logs, setLogs] = useState<string>('Welcome to SIMPLEX Simulator.\n');
  const [listfile, setListfile] = useState<string>('');
  const [memoryDump, setMemoryDump] = useState<string[]>([]);
  const [states, setStates] = useState<ExecutionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isHex, setIsHex] = useState<boolean>(false);
  const [autoRunning, setAutoRunning] = useState<boolean>(false);

  // Highlighting effect state
  const [changedRegisters, setChangedRegisters] = useState<{ PC: boolean; A: boolean; B: boolean; SP: boolean }>({ PC: false, A: false, B: false, SP: false });

  const currentState: ExecutionState = states[currentIndex] || { PC: 0, A: 0, B: 0, SP: 999 };

  // Detect state changes to flash registers
  useEffect(() => {
    if (currentIndex > 0 && states.length > 0) {
      const prev = states[currentIndex - 1];
      const curr = states[currentIndex];
      const changes = {
        PC: prev.PC !== curr.PC,
        A: prev.A !== curr.A,
        B: prev.B !== curr.B,
        SP: prev.SP !== curr.SP
      };
      setChangedRegisters(changes);
      
      // Remove flash after a short delay
      const timer = setTimeout(() => {
        setChangedRegisters({ PC: false, A: false, B: false, SP: false });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, states]);

  // Auto-run logic
  useEffect(() => {
    let interval: number | undefined;
    if (autoRunning && currentIndex < states.length - 1) {
      interval = setInterval(() => {
        setCurrentIndex(prev => prev + 1);
      }, 500) as unknown as number; // 500ms per step
    } else if (currentIndex >= states.length - 1 && states.length > 0) {
      setAutoRunning(false);
    }
    return () => clearInterval(interval);
  }, [autoRunning, currentIndex, states]);

  const handleAssembleAndRun = async () => {
    setLogs('Assembling and running...\n');
    setAutoRunning(false);
    
    try {
      const response = await fetch('http://localhost:3001/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(`Assemble Success:\n${data.logs}\n\nExecution trace mapped (${data.states.length} steps).`);
        setStates(data.states);
        setListfile(data.listfile || 'No listfile generated');
        setMemoryDump(data.memoryDump || []);
        setCurrentIndex(0);
      } else {
        setLogs(`Assemble Failed:\n${data.logs}`);
        setListfile(data.listfile || '');
        setMemoryDump([]);
        setStates([]);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      setLogs(`Error connecting to backend:\n${err.message}`);
    }
  };

  const handleStep = () => {
    if (currentIndex < states.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setLogs(prev => prev + '\nReached end of execution.');
    }
  };

  const handleReset = () => {
    setAutoRunning(false);
    setCurrentIndex(0);
    setLogs('Reset emulator state.\n');
  };

  const formatNumber = (num: number, padding: number = 8) => {
    if (num === undefined || num === null || isNaN(num)) return isHex ? '00000000' : '0';
    if (isHex) {
      // Handle negative numbers safely for hex
      const unsigned = num >>> 0;
      return unsigned.toString(16).padStart(padding, '0').toUpperCase();
    }
    return num.toString(10);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col p-4 gap-4">
      {/* Header / Controls */}
      <header className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Cpu className="text-emerald-400 w-6 h-6" />
          <h1 className="text-xl font-bold text-neutral-100 tracking-wider">SIMPLEX IDE</h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleAssembleAndRun}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            <Play className="w-4 h-4" />
            Assemble & Run
          </button>
          <button 
            onClick={handleStep}
            disabled={states.length === 0 || currentIndex >= states.length - 1}
            className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <StepForward className="w-4 h-4" />
            Step
          </button>
          <button 
            onClick={() => setAutoRunning(!autoRunning)}
            disabled={states.length === 0 || currentIndex >= states.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${autoRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50'}`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRunning ? 'animate-spin' : ''}`} />
            {autoRunning ? 'Pause Auto' : 'Auto-Step'}
          </button>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 bg-rose-900 hover:bg-rose-800 text-white px-4 py-2 rounded-lg transition-colors ml-4"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">DEC</span>
          <button 
            onClick={() => setIsHex(!isHex)}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-neutral-700 transition"
          >
            <span className={`${isHex ? 'translate-x-6 bg-emerald-400' : 'translate-x-1 bg-neutral-400'} inline-block h-4 w-4 transform rounded-full transition`} />
          </button>
          <span className="text-sm text-neutral-400">HEX</span>
        </div>
      </header>

      {/* 4-Pane Layout */}
      <div className="flex-1 grid grid-cols-12 grid-rows-2 gap-4">
        
        {/* Top Left: Editor */}
        <div className="col-span-8 row-span-1 border border-neutral-800 bg-neutral-900 rounded-xl overflow-hidden flex flex-col shadow-lg">
          <div className="bg-neutral-950 border-b border-neutral-800 p-2 text-xs font-semibold text-neutral-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Editor
          </div>
          <textarea
            className="flex-1 w-full bg-transparent p-4 text-emerald-300 font-mono text-sm resize-none focus:outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
        </div>

        {/* Top Right: Registers Dashboard */}
        <div className="col-span-4 row-span-1 border border-neutral-800 bg-neutral-900 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-neutral-950 border-b border-neutral-800 p-2 text-xs font-semibold text-neutral-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Registers
          </div>
          <div className="p-4 flex-1 flex flex-col gap-4 justify-center">
            
            <div className="grid grid-cols-2 gap-4">
              {(['PC', 'SP', 'A', 'B'] as Array<keyof typeof changedRegisters>).map((reg) => (
                <div 
                  key={reg} 
                  className={`border border-neutral-700 rounded-lg p-3 flex flex-col transition-all duration-300 ${changedRegisters[reg] ? 'bg-emerald-900/50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-neutral-950'}`}
                >
                  <span className="text-xs text-neutral-500 font-bold mb-1">{reg}</span>
                  <span className={`text-lg transition-colors duration-300 ${changedRegisters[reg] ? 'text-emerald-300' : 'text-emerald-500'}`}>
                    {reg === 'PC' || reg === 'SP' ? formatNumber(currentState[reg as keyof ExecutionState] as number, 8) : formatNumber(currentState[reg as keyof ExecutionState] as number, 0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-relaxed">
              <span className="text-neutral-500 block mb-1">State Progress</span>
              <div className="w-full bg-neutral-800 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${states.length > 0 ? ((currentIndex + 1) / states.length) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-2 text-neutral-400 text-right">
                Step {states.length > 0 ? currentIndex + 1 : 0} of {states.length}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Left: Console/Logs & Memory */}
        <div className="col-span-8 row-span-1 border border-neutral-800 bg-neutral-900 rounded-xl overflow-hidden flex flex-col shadow-lg">
          <div className="bg-neutral-950 border-b border-neutral-800 p-2 text-xs font-semibold text-neutral-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Console & Memory
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-[#0a0a0a]">
            {/* Logs & Errors */}
            <div className={`text-xs whitespace-pre-wrap mb-4 ${logs.includes('Failed') || logs.includes('Error') ? 'text-rose-400' : 'text-neutral-300'}`}>
              {logs}
            </div>
            
            {/* Memory Dump */}
            {memoryDump.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="text-xs font-bold text-amber-500 mb-2">Memory Dump:</div>
                <pre className="text-xs text-amber-400 whitespace-pre-wrap">
                  {memoryDump.join('\n')}
                </pre>
              </div>
            )}

            {currentState.rawStr && (
              <pre className="text-xs text-emerald-400 whitespace-pre-wrap mt-2 pt-2 border-t border-neutral-800 block">
                &gt; {currentState.rawStr}
              </pre>
            )}
          </div>
        </div>

        {/* Bottom Right: Listfile Viewer */}
        <div className="col-span-4 row-span-1 border border-neutral-800 bg-neutral-900 rounded-xl overflow-hidden flex flex-col shadow-lg">
          <div className="bg-neutral-950 border-b border-neutral-800 p-2 text-xs font-semibold text-neutral-400 flex flex-row items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Listfile Viewer
          </div>
          <div className="p-4 flex-1 overflow-y-auto bg-[#0a0a0a]">
            {listfile ? (
              <pre className="text-xs text-blue-300 whitespace-pre-wrap font-mono">
                {listfile}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 text-sm">
                <HardDrive className="w-8 h-8 opacity-50 mb-2" />
                <p>Run assembler to generate listfile.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
