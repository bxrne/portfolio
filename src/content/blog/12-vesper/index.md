---
title: "vesper: a RISC-V64 kernel in Rust, no_std, no crates"
description: "Building an OS from M-mode boot up to ELF parsing on QEMU virt, following Stephen Marz's OsBlog"
date: "Apr 30 2026"
demoURL: "#"
repoURL: "https://github.com/bxrne/vesper"
---

> A 64-bit RISC-V kernel written from scratch in Rust 2024 edition. Zero crate dependencies. Boots on QEMU's virt machine, owns M-mode itself, and gets all the way to parsing ELF binaries off a Minix 3 filesystem on a virtio block device.

## Why a kernel

Two reasons. The first is that I wanted to learn Rust through a project where the abstractions earn their keep, not one where they save me from a footgun the borrow checker invented. A bare-metal kernel is the right shape for that. There is no `std`, there is no allocator until you write one, and the only thing standing between you and a triple fault is your own page table.

The second is that following along with [Stephen Marz's OsBlog](https://osblog.stephenmarz.com/) chapter by chapter is the most honest way I have found to understand what a kernel actually does. The series is in Rust, the target is RISC-V, and the structure forces you to confront one subsystem at a time without the option of waving your hands.

[vesper](https://github.com/bxrne/vesper) is the result. About two thousand lines of Rust over three days, zero external crates (the entire `[dependencies]` block in `Cargo.toml` is empty), targeting `riscv64gc-unknown-none-elf` and running on QEMU virt with four harts and 128 MiB of RAM.

## Why RISC-V

Three honest reasons. The ISA is small enough that a single person can hold the relevant instructions in their head. The privilege model is clean: M-mode, S-mode, U-mode, with explicit CSRs for each. And QEMU has a stable virt machine with documented MMIO addresses, so the platform spec is a markdown table rather than a folder full of ACPI dumps.

There is no BIOS or OpenSBI in the picture. The QEMU invocation passes `-bios none`, which means vesper is the first instruction to execute on the simulated machine. M-mode is mine, not an SBI implementation's.

## The boot path

`_start` lives in `src/arch/riscv64/asm/boot.S`. It does five things before handing off to Rust:

1. Reads `mhartid` and parks every hart that is not zero on `wfi`. The kernel is single-hart for now, and an unparked extra hart will race the BSS zero loop.
2. Explicitly writes zero to `satp`. A stale `satp` from a previous QEMU boot can leave paging on at the wrong moment, and finding out about it is unpleasant.
3. Configures one PMP entry covering all of physical memory with R+W+X (`pmpaddr0 = -1, pmpcfg0 = 0x0f`, TOR mode). Newer QEMU builds enforce PMP for S-mode fetches, and the default is "deny everything".
4. Loads `gp` with linker relaxation disabled (you cannot relax a load relative to the symbol you are loading).
5. Zero-fills `.bss` in eight-byte chunks with `sd zero`, sets `sp = _stack_end`, and `mret`s into `kinit` in M-mode.

`kinit` (in `src/boot/entry.rs`) brings up the rest of the platform: UART, the page-frame allocator, the Sv39 page table with identity mappings for every kernel section and the MMIO ranges, the M-mode trap handler with its dedicated 16 KiB trap stack, the PLIC, and a virtio bus probe. It then `enable_interrupts()` and `mret`s a second time, this time into `skmain` running in S-mode with paging live.

`skmain` does a block driver smoke test, mounts the Minix 3 filesystem, optionally walks an ELF binary, spawns a kernel thread (`init_process`), and drops into `wfi`. From there the timer drives the scheduler.

## All traps in M-mode

The kernel runs in S-mode but routes every trap through M-mode. The reason is plumbing. M-mode does not go through the page table, so the trap handler can reach the `TrapFrame`, the trap stack, the UART, the CLINT, and the PLIC by physical address with no mapping ceremony. There is no chicken-and-egg between paging and interrupts.

The trap vector in `src/arch/riscv64/asm/trap.S` is the textbook save-restore frame, with one trick. The first instruction is `csrrw t6, mscratch, t6`. That single instruction atomically swaps `t6` with `mscratch`: the user's `t6` ends up in `mscratch`, and the frame pointer (which the kernel had stashed in `mscratch` ahead of time) ends up in `t6`. From there, an `.altmacro` loop saves `x1` through `x30`, the `t6` (`x31`) special case is recovered from `mscratch`, the architectural CSRs are marshalled into `a0` through `a5` for the C ABI call to `m_trap`, and the trap stack pointer is loaded from a fixed offset in the frame.

The Rust dispatcher `m_trap` decodes `mcause` and routes:

- Cause 7 (machine timer) rearms `CLINT_MTIMECMP` for one second in the future and calls `process::schedule()`. If the scheduler returns a different process, `mscratch` is updated to point at the new frame so the trap vector restores the new process's GPRs on the way out.
- Cause 11 (machine external) claims the PLIC and dispatches: UART IRQ 10 to the echo handler, virtio IRQs to the pending-completion sweep.
- Sync causes (illegal instruction, ecall, page faults) are handled in place. Page faults currently print and skip the faulting instruction, which is enough to debug page table construction without crashing.

The frame layout is documented in `src/arch/riscv64/trap_frame.rs` with explicit byte offsets, because the assembly hard-codes them:

```rust
#[repr(C)]
pub struct TrapFrame {
    pub regs:       [usize; 32],  // offset   0
    pub fregs:      [usize; 32],  // offset 256
    pub satp:       usize,        // offset 512
    pub trap_stack: *mut u8,      // offset 520
    pub hartid:     usize,        // offset 528
}
```

If the offsets and the `repr(C)` annotation drift, you find out about it through a corrupted return address, which is the worst possible debugging experience. So they live next to each other in source and the assembly references the offsets by literal number.

## The page-frame allocator

`src/mm/alloc/page_frame.rs` is a first-fit bitmap allocator with out-of-band metadata. One `PageDesc` byte per 4 KiB data page, stored at the heap base. Bit 0 is `TAKEN`, bit 1 is `LAST`. `LAST` marks the final page in an allocation so `deallocate` can walk forward without being told the length. `allocate(n)` scans descriptors with `windows(n)` for the first free run.

`zallocate(n)` adds a zero-fill pass using `fill(0)` on a `&mut [u64]` view of the page, which is eight times faster than the byte version and is what page-table allocations want anyway because intermediate tables need V=0 in every slot to count as invalid.

There is no general allocator. Everything is page-granular. That is the right place to be at this stage of the project: writing a `Box` before you have a working scheduler is the kernel equivalent of writing your own logger before you have an `fmt::Write`.

## Sv39 paging

Sv39 is the three-level RISC-V scheme: 39-bit virtual addresses, 9 bits per level, 12 bits of page offset. `src/mm/paging/sv39/types.rs` defines `Table` as a `#[repr(C)]` array of 512 `Entry` values, which is exactly one page. `Entry` wraps an `i64`. The signed type is deliberate: PPN extraction uses arithmetic shifts, and a signed type means sign extension behaves consistently across the Rust intrinsics.

Two design calls worth noting.

First, ACCESSED and DIRTY are pre-set on every mapping. The hardware on RISC-V can either update A and D itself (Svadu extension) or trap to software for the update. The early kernels in the OsBlog series do not implement either, so they pre-set both. This is imprecise (the kernel cannot tell which pages are actually used) but it sidesteps a whole trap path.

Second, `kinit` identity-maps every kernel section with the right permissions: RX for `.text`, RO for `.rodata`, RW for `.data`, `.bss`, the kernel stack, and the heap. MMIO ranges (UART at `0x1000_0000`, virtio MMIO from `0x1000_1000` to `0x1000_8000`) are mapped RW. Identity mapping is not what a real kernel would do (a high-half mapping has all sorts of advantages around fork and process address-space layout) but it makes the early bring-up simpler by removing the virtual-vs-physical distinction.

The transition to S-mode lives in `src/arch/riscv64/paging.rs`. It builds `satp = (8 << 60) | (root_addr >> 12)` (mode 8 selects Sv39), writes it, issues `sfence.vma x0, x0` to invalidate any stale TLB entries, sets `mepc` to `skmain`, programs `mstatus` with `MPP=01` (Supervisor) and `MPIE=1`, and `mret`s.

## VirtIO block, written from the spec

The virtio block driver is the most satisfying part of the project. There is no abstraction layer; the code in `src/drivers/virtio/spec.rs` is the on-the-wire layout straight from the virtio 1.0 legacy MMIO spec, expressed as `#[repr(C)]` structs and a `#[repr(usize)]` enum of register offsets.

`bus.rs` walks the virtio MMIO window in 4 KiB steps, probing each slot by reading the magic value (`0x74726976`, ASCII "virt"). A mismatched magic or device ID 0 means the slot is empty. Block devices (type 2) go through `setup_block_device()` in `device.rs`, which performs the legacy initialisation sequence:

1. Reset the device.
2. Acknowledge.
3. Driver.
4. Read device features, strip read-only, write back as driver features.
5. Features OK.
6. Set queue size to 8 entries.
7. Allocate the virtqueue pages (descriptor ring, available ring, used ring).
8. Write the queue PFN.
9. Driver OK.

After that, block I/O is a 3-descriptor chain: a `VIRTIO_BLK_T_IN` or `_OUT` header with the sector number, a data buffer, and a one-byte status. `block_op()` posts the chain, rings the `QueueNotify` doorbell, and spin-polls `pending()` until the status byte changes from `0xff`. Synchronous, but that is fine: the kernel does not yet have anything to do while it waits.

## Minix 3, because it fits on a postcard

`src/fs/minix3/mod.rs` is a read-only Minix 3 filesystem reader. The on-disk layout is small enough to remember: block 0 is boot, block 1 is the superblock, then the inode and zone bitmaps, the inode table, and the data zones. `mount(dev)` reads block 1 (1 KiB at byte offset 1024), validates the magic (`0x4d5a`), and stashes the superblock fields it needs.

`read_file()` walks all four indirection levels: 7 direct zones, single indirect (zones[7] points at a block of u32 zone numbers), double indirect (zones[8]), and triple indirect (zones[9]). Sparse zones (zone number 0) are skipped. Scratch blocks come from a RAII `Buffer` type in `blocks.rs` that wraps a page-frame allocation and frees it on drop, which keeps `?` returns from leaking pages.

Syscall 63 (`read`) routes a request through `Fs::mount() + read_inode() + read_file()` synchronously. Not the kernel I want to write at twenty thousand lines, but exactly the kernel I want to write at two thousand.

## Round-robin scheduler with a `MAX_PROCESSES = 16` table

Process state lives in `src/process/mod.rs`. A static array of 16 slots, each holding a `Process` with its own 8 KiB stack and a `TrapFrame`. `spawn_kernel(entry)` allocates the stack, zeroes the frame, sets `regs[2]` (sp) to the stack top, assigns a monotonically increasing PID, and drops the process into the first free slot.

`schedule(epc)` saves the current process's PC into its frame, then scans round-robin for the next `Running` process. It returns `(*mut TrapFrame, usize)`, which the trap handler uses to update `mscratch` for the GPR restore and `mepc` for the return PC.

Syscall 93 (`exit`) marks the process dead, schedules immediately, and patches `mscratch` and the return PC so the trap vector never sees the dead process again. Syscall 1 is a ping. Syscall 63 is the Minix 3 read above.

The placeholder `init_process` thread is intentionally dumb: it counts to a million in a `core::hint::black_box` loop (so the optimiser does not collapse it), then issues `ecall` with `a0 = 1`. That is enough to prove the timer interrupt fires, the scheduler picks the next runnable process, the trap vector restores the right registers, and the syscall path works end-to-end.

## ELF, with the obvious caveat

`src/exec/elf.rs` is a zero-copy ELF64 parser. `parse(buf)` validates the magic, the machine field (`0xf3` for RISC-V), and the type (2 for executable), and bounds-checks the program header table. `program_headers(buf, hdr)` returns an iterator over `&ProgramHeader` references into the original buffer. No allocations.

`test_elf()` in `entry.rs` reads a binary off Minix 3 by inode, parses it, and prints each `PT_LOAD` segment's vaddr, filesz, memsz, and flags. What it does not yet do is jump to the entry point in U-mode. That requires per-process page tables and a `satp` switch in the M-mode trap vector before the `mret` into U-mode, and that wiring is the next chapter.

## Why no external crates

Every dependency in a kernel is a dependency you have to audit at the bit level. `core` is part of the language and gets the same scrutiny rustc itself does. Beyond that, every crate is a thing that might assume an allocator, might emit code that the linker cannot place, might have a panic path that calls into `std`, and might break in subtle ways the next time the toolchain bumps the target spec.

For a learning project the trade-off is even sharper. If a `Box` falls out of `alloc`, you have not learned anything about how a heap works. If you write the page-frame allocator yourself, you know precisely how a heap works, and you understand why every embedded kernel ships an arena, a slab, and a buddy allocator and uses each for a different job.

There is no ideological commitment to staying that way forever. There is a pragmatic commitment to staying that way until the kernel is doing something that genuinely needs an external piece of code. So far that has not happened.

## What works, what does not

What works at the current commit: M-mode boot, Sv39 paging with identity mapping, the page-frame allocator, the M-mode trap handler with timer + external interrupts + ecalls + page-fault stubs, the PLIC, the NS16550A UART with interrupt-driven echo and a small ANSI escape parser, the CLINT-driven round-robin scheduler with context switch, the legacy virtio MMIO block driver, the Minix 3 reader (superblock, inodes, all three indirection levels), three syscalls (1, 63, 93), and the ELF64 parser.

What does not work yet: U-mode ELF execution (needs per-process `satp` switching in the trap vector), SMP (secondary harts park), per-process address spaces (everything is in the kernel's identity map), an `mmap`/`brk` story, blocking I/O (virtio is synchronous, no sleep/wake), filesystem writes, and a general-purpose heap.

Each of those is a chapter. The point of vesper was not to compete with Linux; it was to walk the floor of the building from the M-mode mret on power-up to the moment a process can read a file off a disk. That part is done. The rest is the next set of weekends.

