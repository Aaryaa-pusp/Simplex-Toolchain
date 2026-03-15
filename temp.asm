; A simple math test
ldc 10      ; Load 10 into A
adc 20      ; Add 20 to A (A should now be 30)
adj -1      ; Move Stack Pointer down by 1
stl 0       ; Store A (30) into the stack memory
HALT        ; Stop the emulator