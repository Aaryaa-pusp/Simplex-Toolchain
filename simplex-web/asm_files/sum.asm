; --- Array Sum Program for SIMPLEX ---
; Registers used: 
; Local 0: Loop counter (i)
; Local 1: Array size (limit)
; Local 2: Running Total (sum)

        ldc 1000        ; Initialize Stack Pointer
        a2sp            ; Move address to SP
        adj -3          ; Reserve 3 slots for local variables

        ; Initialize sum = 0
        ldc 0
        stl 2           ; Local 2 = sum (0)

        ; Load array count 
        ldc count       ; Get address of the count label
        ldnl 0          ; A = memory[count] (value is 5)
        stl 1           ; Local 1 = limit (5)

        ; Initialize loop counter i = 0
        ldc 0           ; Initialize counter i = 0
        stl 0           ; Local 0 = i

loop:
        ; Check if i >= limit
        ldl 1           ; A = limit
        ldl 0           ; B = limit, A = i
        sub             ; A = limit - i
        brlz done       ; If (limit - i) < 0 (i.e. i >= limit), branch to done
        brz done        ; If (limit - i) == 0 (i.e. i == limit), branch to done

        ; Load array[i]
        ldc array       ; A = base address of array
        ldl 0           ; B = addr, A = i
        add             ; A = address of array[i]
        ldnl 0          ; A = memory[array + i]

        ; Add array[i] to sum
        ldl 2           ; B = array[i], A = current sum
        add             ; A = sum + array[i]
        stl 2           ; Save new sum in Local 2

        ; Increment i
        ldl 0           ; A = i
        adc 1           ; A = i + 1
        stl 0           ; Save new i

        ; Repeat loop
        br loop

done:
        ; Store final sum in memory structure
        ldl 2           ; A = final sum
        ldc totalsum    ; B = sum, A = address of totalsum
        stnl 0          ; memory[totalsum] = A (final sum)
        
        HALT            ; Stop the emulator

; --- Data Section ---
count:    data 5          ; Number of elements in the array
array:    data 10         ; Element 1
          data 20         ; Element 2
          data 30         ; Element 3
          data 40         ; Element 4
          data 50         ; Element 5
totalsum: data 0          ; Result will be stored here
