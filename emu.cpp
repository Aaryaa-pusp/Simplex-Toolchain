#include <fstream>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

// This class encapsulates the entire machine, ready to be plugged into a GUI
// later.
class SimplexCPU {
private:
  int A;
  int B;
  int PC;
  int SP;
  vector<int> Memory;
  int run_time;
  bool fault; // set true on any runtime error

  // Helper to print hex beautifully
  void printHex(int val, int width = 8) {
    cout << setfill('0') << setw(width) << hex << (unsigned int)val << dec;
  }

  // Print a runtime error with the PC that caused it, then set fault flag
  void runtimeError(const string &msg) {
    cerr << "[EMU RUNTIME ERROR] at PC=" << (PC - 1) << ": " << msg << "\n";
    fault = true;
  }

  // Bounds-checked memory read
  int memRead(int addr, const string &instr) {
    if (addr < 0 || addr >= (int)Memory.size()) {
      runtimeError(instr + " – memory read out of bounds (addr=" +
                   to_string(addr) + ", mem_size=" +
                   to_string(Memory.size()) + ")");
      return 0;
    }
    return Memory[addr];
  }

  // Bounds-checked memory write
  void memWrite(int addr, int val, const string &instr) {
    if (addr < 0 || addr >= (int)Memory.size()) {
      runtimeError(instr + " – memory write out of bounds (addr=" +
                   to_string(addr) + ", mem_size=" +
                   to_string(Memory.size()) + ")");
      return;
    }
    Memory[addr] = val;
  }

public:
  SimplexCPU(int mem_size = 1000) {
    A = 0;
    B = 0;
    PC = 0;
    SP = mem_size - 1; // Stack starts at the top of memory
    Memory.resize(mem_size, 0);
    run_time = 0;
    fault = false;
  }

  bool loadBinary(const string &filename) {
    ifstream file(filename, ios::binary | ios::ate);
    if (!file) {
      cout << "Failed to open binary file: " << filename << "\n";
      return false;
    }

    // Get file size and read raw binary data directly into memory
    streamsize size = file.tellg();
    file.seekg(0, ios::beg);

    int num_instructions = size / sizeof(int);
    if (num_instructions > Memory.size()) {
      cout << "Program too large for memory!\n";
      return false;
    }

    file.read(reinterpret_cast<char *>(Memory.data()), size);
    file.close();
    return true;
  }

  void dumpState() {
    cout << "PC = ";
    printHex(PC);
    cout << "\t A = " << A << "\t B = " << B << "\t SP = " << SP << "\n";
  }

  void dumpMemory() {
    cout << "\nMemory dump at end of execution\n";
    cout << "Address\tValue\n";

    // Print ALL non-zero memory locations so data regions (arrays, variables)
    // and stack values are both visible in the console.
    for (int i = 0; i < (int)Memory.size(); i++) {
      if (Memory[i] != 0) {
        cout << i << "\t" << Memory[i] << "\n";
      }
    }
    cout << "Total instructions executed: " << run_time << "\n";
  }

  // This is the function a GUI "Step" button would call
  bool step() {
    if (PC < 0 || PC >= (int)Memory.size()) {
      cerr << "[EMU RUNTIME ERROR] PC out of bounds (PC=" << PC
           << ", mem_size=" << Memory.size() << ")\n";
      return false;
    }
    if (fault)
      return false;

    dumpState();

    // Fetch Instruction
    unsigned int instruction = Memory[PC];

    // Decode: Lowest 8 bits are opcode, upper 24 bits are operand
    int opcode = instruction & 0xFF;
    int operand = instruction >> 8;

    // Sign extend the 24-bit operand to 32-bit if it's negative
    if (operand & 0x800000) {
      operand |= 0xFF000000;
    }

    // Auto-increment PC. Branch instructions will overwrite this if taken.
    PC++;
    run_time++;

    // Execute
    switch (opcode) {
    case 0:
      B = A;
      A = operand;
      break; // ldc
    case 1:
      A += operand;
      break; // adc
    case 2:
      B = A;
      A = memRead(SP + operand, "ldl");
      break; // ldl
    case 3:
      memWrite(SP + operand, A, "stl");
      A = B;
      break; // stl
    case 4:
      A = memRead(A + operand, "ldnl");
      break; // ldnl
    case 5:
      memWrite(A + operand, B, "stnl");
      break; // stnl
    case 6:
      A = B + A;
      break; // add
    case 7:
      A = B - A;
      break; // sub
    case 8:
      A = B << A;
      break; // shl
    case 9:
      A = B >> A;
      break; // shr
    case 10:
      SP += operand;
      break; // adj
    case 11:
      SP = A;
      A = B;
      break; // a2sp
    case 12:
      B = A;
      A = SP;
      break; // sp2a
    case 13:
      B = A;
      A = PC;
      PC += operand;
      break; // call
    case 14:
      PC = A;
      A = B;
      break; // return
    case 15:
      if (A == 0)
        PC += operand;
      break; // brz
    case 16:
      if (A < 0)
        PC += operand;
      break; // brlz
    case 17:
      PC += operand;
      break; // br
    case 18:
      return false; // HALT
    case 19:        /* data (ignored as execution, handled in asm) */
      break;
    case 20: /* SET (ignored as execution) */
      break;
    default:
      runtimeError("Unknown opcode " + to_string(opcode));
      return false;
    }

    return !fault;
  }

  // Run continuously until HALT (Used for CLI)
  void run() {
    while (step()) {
      // Loop runs until step() returns false (HALT)
    }
    dumpMemory();
  }
};

int main(int argc, char *argv[]) {
  if (argc < 2) {
    cout << "Usage: ./emu <filename.o>\n";
    return 1;
  }

  string filename = argv[1];

  // Instantiate our CPU with 1000 memory slots
  SimplexCPU cpu(1000);

  if (cpu.loadBinary(filename)) {
    cpu.run();
  }

  return 0;
}