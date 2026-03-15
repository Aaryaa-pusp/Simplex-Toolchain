; Test error handling - errors across both passes
label:
label: ; duplicate label (Pass 1)
br nonesuch ; undefined label (Pass 2)
ldc 08ge ; not a number (Pass 2)
ldc ; missing operand (Pass 2)
add 5 ; unexpected operand (Pass 2)
ldc 5, 6; extra on end of line (Pass 1)
0def: ; bogus label name
fibble; bogus mnemonic (Pass 1)
0def ; bogus mnemonic (Pass 1)
