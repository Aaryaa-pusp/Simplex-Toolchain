; --- Bubble Sort Program for SIMPLEX ---
; Registers used: 
; Local 0: Outer loop counter (i)
; Local 1: Inner loop counter (j)
; Local 2: Array size - 1
; Local 3: Address of array[j]
; Local 4: Value of array[j]
; Local 5: Value of array[j+1]

        ldc 0x1000      ; Initialize Stack Pointer
        a2sp            ; Move address to SP
        adj -6          ; Reserve 6 slots for local variables

        ldc count       ; Get address of the count label
        ldnl 0          ; A = memory[count] (value is 5)
        adc -1          ; We need (count - 1) for loops
        stl 2           ; Local 2 = limit (n-1)

        ldc 0           ; Initialize outer counter i = 0
        stl 0           ; Local 0 = i

outer:
        ldl 2           ; A = limit
        ldl 0           ; B = limit, A = i
        sub             ; A = limit - i → negative only when i > limit ✓
        brlz done

        ldc 0           ; Initialize inner counter j = 0
        stl 1           ; Local 1 = j

inner:
        ldl 1           ; A = j
        ldl 2           ; B = j, A = limit
        sub             ; A = limit - j
        brz next_outer  ; if j == limit, move to next outer pass

        ; --- Comparison and Swap Logic ---
        ldc array       ; A = address of array[0]
        ldl 1           ; B = addr, A = j
        add             ; A = address of array[j]
        stl 3           ; Save address of array[j] in Local 3

        ldl 3           ; A = addr(array[j])
        ldnl 0          ; A = array[j]
        stl 4           ; Save array[j] in Local 4

        ldl 3           ; A = addr(array[j])
        ldnl 1          ; A = array[j+1]
        stl 5           ; Save array[j+1] in Local 5

        ldl 4           ; A = array[j]
        ldl 5           ; B = array[j], A = array[j+1]
        sub             ; A = B - A = array[j] - array[j+1]
        brlz no_swap    ; if array[j] < array[j+1], no swap needed
        brz no_swap     ; if equal, no swap needed

        ; --- Swap Elements ---
        ldl 3           ; A = addr(array[j])
        ldnl 1          ; A = array[j+1]
        ldl 3
        stnl 0          ; array[j] = array[j+1]

        ldl 4           ; A = original array[j]
        ldl 3
        stnl 1          ; array[j+1] = original array[j]

no_swap:
        ldl 1           ; A = j
        adc 1           ; j = j + 1
        stl 1
        br inner        ; Repeat inner loop

next_outer:
        ldl 0           ; A = i
        adc 1           ; i = i + 1
        stl 0
        br outer        ; Repeat outer loop

done:
        HALT            ; Stop the emulator

; --- Data Section ---
count:  data 5          ; Number of elements
array:  data 25         ; Test data 1
        data 10         ; Test data 2
        data 44         ; Test data 3
        data 2          ; Test data 4
        data 11         ; Test data 5