#include <bits/stdc++.h>
using namespace std;

#define pb push_back

struct Codeline
{
    int pc;
    int line_num;
    int op_code;
    string mnemonic;
    string operand;
    string label;
};

unordered_map<string, int> opcode_map = {
    {"ldc", 0},     // B := A; A := value;
    {"adc", 1},     // A := A + value;
    {"ldl", 2},     // B := A; A := memory[SP + offset];
    {"stl", 3},     // memory[SP + offset] := A; A := B;
    {"ldnl", 4},    // A := memory[A + offset];
    {"stnl", 5},    // memory[A + offset] := B;
    {"add", 6},     // A := B + A;
    {"sub", 7},     // A := B - A;
    {"shl", 8},     // A := B << A;
    {"shr", 9},     // A := B >> A;
    {"adj", 10},    // SP := SP + value;
    {"a2sp", 11},   // SP := A; A := B
    {"sp2a", 12},   // B := A; A := SP;
    {"call", 13},   // B := A; A := PC; PC := PC + offset;
    {"return", 14}, // PC := A; A := B;
    {"brz", 15},    // if A == 0 then PC := PC + offset
    {"brlz", 16},   // if A < 0 then PC := PC + offset;
    {"br", 17},     // PC := PC + offset;
    {"HALT", 18},   // stop the emulator
    {"data", 19},   // reserve a mem loc initialized to value specifies
    {"SET", 20}     // set the label on this line to specified value
};

unordered_map<string, int> label_table;
vector<string> error_log;
vector<Codeline> instructions;

void logError(int line, const string &msg)
{
    error_log.pb("line" + to_string(line) + ':' + msg);
}

// converting decimal number to hex
string toHex(unsigned int value, int padding)
{
    stringstream ss;
    ss << setfill('0') << setw(padding) << hex << value;
    string res = ss.str();
    // substr(begining , length) so here we omit length so until end string will be returned
    return (res.length() > padding) ? res.substr(res.length() - padding) : res;
}

int resolveOperand(const string &op, int current_pc, int line_num, bool is_branch)
{
    if (op.empty())
        return 0;

    if (label_table.count(op))
    {
        int target = label_table[op];
        return is_branch ? (target - current_pc - 1) : target;
    }

    try
    {
        return stoi(op, nullptr, 0);
    }
    catch (...)
    {
        logError(line_num, "Invalid operand or undefined label: " + op);
        return 0;
    }
}

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        cout << "Usage: ./asm <filename.asm>\n";
        return 1;
    }

    string filename = argv[1];
    ifstream infile(filename);

    if (!infile)
    {
        cout << "Failed to open file\n";
        return 1;
    }

    string line;
    int pc_counter = 0;
    int line_counter = 1;

    while (getline(infile, line))
    {
        size_t comment_pos = line.find(';');
        if (comment_pos != string::npos)
        {
            line = line.substr(0, comment_pos);
        }

        stringstream ss(line);
        string token, label, mnemonic, operand;

        // if there are no more words to be read
        if (!(ss >> token))
        {
            line_counter++;
            continue;
        }

        if (token.back() == ':')
        {
            label = token.substr(0, token.length() - 1);
            if (label_table.count(label))
            {
                logError(line_counter, "Duplicate label detected: " + label);
            }
            else
            {
                label_table[label] = pc_counter;
            }

            if (!(ss >> mnemonic))
            {
                line_counter++;
                continue;
            }
        }
        else
            mnemonic = token;

        ss >> operand;

        string extra;
        if (ss >> extra)
        {
            logError(line_counter, "Too many operands");
        }

        int op_val = -1;
        if (opcode_map.count(mnemonic))
        {
            op_val = opcode_map[mnemonic];
        }
        else
        {
            logError(line_counter, "Unknown mnemonic: " + mnemonic);
        }

        instructions.push_back({pc_counter, line_counter, op_val, mnemonic, operand, label});
        pc_counter++;
        line_counter++;
    }

    infile.close();

    if (!error_log.empty())
    {
        ofstream logfile(filename + "_logfile.txt");
        logfile << "Errors detected during Pass 1. Assembly halted.\n";
        for (const auto &err : error_log)
            logfile << err << "\n";
        return 1;
    }

    string base_name = filename.substr(0, filename.find_last_of('.'));
    ofstream list_file(base_name + "_listfile.lst");
    ofstream obj_file(base_name + "_obj.o", ios::binary);

    for (const auto &inst : instructions)
    {
        int opcode = inst.op_code;
        int val = 0;
        bool needs_operand = false;
        bool is_branch = false;

        if ((opcode >= 0 && opcode <= 5) || opcode == 19 || opcode == 10 || opcode == 20)
        {
            needs_operand = true;
        }
        else if (opcode == 13 || (opcode >= 15 && opcode <= 17))
        {
            needs_operand = true;
            is_branch = true;
        }
        if (needs_operand)
        {
            if (inst.operand.empty())
                logError(inst.line_num, "Missing operand");
            val = resolveOperand(inst.operand, inst.pc, inst.line_num, is_branch);

            if (val < -8388608 || val > 8388607)
            {
                logError(inst.line_num, "Operand out of 24-bit range");
            }
        }
        else if (!inst.operand.empty())
        {
            logError(inst.line_num, "Unexpected operand");
        }

        unsigned int binary_inst;

        // If it's 'data' or 'SET', do not attach an opcode. Just use the raw 32-bit value.
        if (opcode == 19 || opcode == 20)
        {
            binary_inst = val;
        }
        else
        {
            // For normal instructions, shift the 24-bit operand and attach the 8-bit opcode
            binary_inst = ((val & 0xFFFFFF) << 8) | (opcode & 0xFF);
        }
        string res_pc = toHex(inst.pc, 8);
        string machine_code_str = toHex(binary_inst, 8);

        if (!inst.label.empty())
        {
            list_file << res_pc << "\t        \t" << inst.label << ":\n";
        }

        list_file << res_pc << "\t" << machine_code_str << "\t" << inst.mnemonic << " " << inst.operand << "\n";

        obj_file.write(reinterpret_cast<const char *>(&binary_inst), sizeof(binary_inst));
    }

    if (!error_log.empty())
    {
        ofstream logfile(base_name + "_logfile.txt");
        logfile << "Errors detected during Pass 2. Assembly failed.\n";
        for (const auto &err : error_log)
            logfile << err << "\n";
        return 1;
    }

    ofstream logfile(base_name + "_logfile.txt");
    logfile << "Code Compiled Successfully. Generated " << base_name << "_listfile.lst and " << base_name << "_obj.o files\n";
}