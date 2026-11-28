/* ============================================================
   11 内存管理与底层原理
   ============================================================ */
(function () {
  "use strict";

  EIK.register("memory-management", {
    chapters: [
      {
        id: "layout",
        title: "布局与对齐",
        topics: [
          { id: "map", title: "MCU 内存布局" },
          { id: "align", title: "对齐与打包" }
        ]
      },
      {
        id: "stack",
        title: "栈、堆与泄漏",
        topics: [
          { id: "stack", title: "栈溢出与检测" },
          { id: "leak", title: "内存泄漏排查" }
        ]
      },
      {
        id: "linker",
        title: "链接与启动",
        topics: [
          { id: "linker", title: "链接脚本与段布局" },
          { id: "vector", title: "向量表重定位" }
        ]
      }
    ],

    questions: [
      {
        id: "MM-01",
        chapter: "layout",
        topic: "map",
        title: "MCU 的内存布局是怎样的？一个变量到底存在哪？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: ".text/.rodata/.data/.bss/heap/stack 的归属，以及各类变量的实际位置。",
        q: `<p>面试官：画一下 MCU 的<strong>内存布局</strong>。全局变量、初始化为 0 的全局变量、局部变量、字符串常量、<code>malloc</code> 出来的内存，分别在哪？</p>`,
        exam: `<p>这是理解嵌入式程序的基础题。能准确说出“字符串常量在 .rodata 也就是 Flash”“局部变量在栈”“malloc 在堆”“未初始化全局在 .bss”，并且知道 .bss 不占 Flash，说明你真正看过 map 文件。</p>`,
        core: `<p>Flash 里放向量表、.text 和 .rodata；RAM 里放 .data（非零初值，启动时从 Flash 拷贝）、.bss（零初始化，启动时清零）、堆和栈；.bss 不占 Flash。</p>`,
        answer: `<p>从低地址到高地址，Flash 侧是：中断向量表、<code>.text</code>（代码）、<code>.rodata</code>（只读常量，包括字符串字面量和 const 全局数组）。</p>
<p>RAM 侧是：<code>.data</code>（初始化为非零的全局/静态变量，初值存在 Flash，启动时拷贝过来）、<code>.bss</code>（未初始化或初始化为 0 的全局/静态变量，启动时清零）、堆（向上增长）、空闲区、栈（从高地址向下增长）。</p>
<p>具体到变量：普通全局变量在 .data 或 .bss；<code>const</code> 全局数组和字符串常量在 .rodata（Flash）；函数内的局部变量在栈上；<code>static</code> 局部变量在 .data/.bss；<code>malloc</code> 的内存在堆上。</p>
<p>关键点是：<strong>.bss 不占 Flash 空间</strong>，它只记录“需要多大 RAM”，启动时由代码清零。注意区分：只有<strong>非零</strong>初值才会进 .data、占用 Flash；写成 <code>int a[1000] = {0};</code> 这种全零初始化，编译器仍然把它放进 .bss，一样不占 Flash（写不写显式零值只影响可读性，不影响占用）。</p>`,
        principle: `<p>链接脚本决定每个段放在哪个地址。以 STM32 为例，Flash 从 0x08000000 开始，SRAM 从 0x20000000 开始。<code>.data</code> 段的加载地址（LMA）在 Flash，运行地址（VMA）在 RAM，启动代码负责按 LMA 读取、按 VMA 写入。</p>
<p>栈的大小在启动文件或链接脚本里固定（比如 1KB），堆的大小由 <code>_Min_Heap_Size</code> 指定。两者相向增长，一旦相遇就是溢出。</p>`,
        fig: {
          type: "memmap",
          title: "STM32 的 Flash 与 SRAM 布局",
          tag: "memory map",
          rows: [
            { name: "Flash", text: "向量表 + .text 代码 + .rodata 常量", addr: "0x0800_0000", cls: "a" },
            { name: "Flash", text: ".data 初值（启动时拷贝到 RAM）", addr: "", cls: "a" },
            { name: "SRAM", text: ".data 已初始化变量", addr: "0x2000_0000", cls: "b" },
            { name: "SRAM", text: ".bss 未初始化变量", addr: "", cls: "c" },
            { name: "SRAM", text: "heap（malloc，向上增长）", addr: "", cls: "d" },
            { name: "SRAM", text: "stack（向下增长，MSP 初始在末尾）", addr: "0x2000_5000", cls: "e" }
          ],
          note: "地址为示意值，实际取决于芯片型号和链接脚本。"
        },
        code: {
          lang: "c",
          title: "sections.c",
          src: `#include <stdint.h>

int          g_inited   = 42;        /* .data：初值在 Flash，运行时在 RAM */
int          g_zero;                 /* .bss：启动时清零，不占 Flash */
const int    g_table[4] = {1,2,3,4}; /* .rodata：只在 Flash，不占 RAM */
char        *g_str      = "hello";   /* 指针在 .data，字符串在 .rodata */

void demo(void)
{
    int      local = 1;              /* 栈：函数返回即失效 */
    static int s_count;              /* .bss：函数退出后仍保留 */
    char     buf[64];                /* 栈：64 字节 */
    char    *heap = malloc(128);     /* 堆：需要手动释放 */

    (void)local; (void)buf;
    free(heap);
}

/* 查看各段大小：arm-none-eabi-size firmware.elf
 *    text    data     bss     dec     hex
 *   12345     120    2048   14513    38B1
 * text 包含 .text + .rodata，烧录大小约 text + data
 */`
        },
        apply: `<p>Flash 不够时，先看 map 文件里最大的符号：常见元凶是巨大的 const 表、重复的字符串、未开启 <code>--gc-sections</code> 导致的无用函数。RAM 不够时看 .bss：把大缓冲改成动态分配、把只读数据加 const、合并位标志。</p>
<p>还可以把不常用的初始化数据放到外部 Flash 或通过压缩存储，运行时解压到 RAM，用时间换空间。</p>`,
        pitfalls: [
          "<b>以为 .bss 占 Flash。</b>它只占 RAM，Flash 里只有段大小信息。写成 <code>= {0}</code> 这种全零初始化，编译器仍然放进 .bss，并不产生初值副本。",
          "<b>以为 const 一定在 Flash。</b>局部 const 变量通常在栈上，只有静态存储期的 const 才可能进 .rodata。",
          "<b>把大数组定义在栈上。</b>局部数组超过栈大小会静默覆盖相邻内存，现象是“某个全局变量莫名其妙变了”。"
        ],
        follow: [
          [
            "如何查看某个变量在哪个段？",
            "用 <code>arm-none-eabi-nm -S --size-sort firmware.elf</code> 看符号地址和大小，再对照 map 文件里的段范围；或者用 <code>objdump -t</code> 查看符号表。"
          ],
          [
            "text 段为什么包含 rodata？",
            "因为两者都是只读的，链接器通常把它们放在同一个可执行段（RX）里。所以 <code>size</code> 命令输出的 text 包含代码和常量，烧录大小约等于 text + data。"
          ],
          [
            "堆和栈会不会重叠？",
            "会。它们从两端相向增长，中间没有硬件隔离。重叠时会互相踩踏，表现为随机死机。要靠估算和检测（栈填充、堆水位）来预防。"
          ]
        ]
      },

      {
        id: "MM-02",
        chapter: "layout",
        topic: "align",
        title: "内存对齐为什么重要？什么时候必须用 packed？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "对齐的硬件原因、非对齐访问的后果，以及 packed 的正确用法与风险。",
        q: `<p>面试官：为什么有些 CPU 不支持<strong>非对齐访问</strong>？结构体加了 <code>__attribute__((packed))</code> 之后有什么风险？协议解析时应该怎么处理？</p>`,
        exam: `<p>考察对硬件访问约束的理解。能说清“32 位总线按字访问，非对齐要拆成两次”“Cortex-M0 非对齐访问直接 HardFault”“packed 结构体取成员可能生成非对齐访问”，说明你踩过这个坑。</p>`,
        core: `<p>数据对齐是 32 位总线一次读 4 字节的地址要求，不对齐会被编译器插填充或拆成多次访问，M0 上甚至直接 HardFault；packed 结构体访问会生成多次非对齐访问，协议解析要逐字段拷贝到本地变量，别直接强转。</p>`,
        answer: `<p>对齐要求来自硬件：32 位总线一次读 4 字节，地址必须是 4 的倍数。如果 <code>int</code> 放在地址 1，硬件要么拆成两次访问再拼接（M3/M4 支持），要么直接触发异常（M0 不支持）。</p>
<p>编译器为了保证对齐，会在结构体成员之间插入填充字节，这就是结构体大小不等于成员大小之和的原因。</p>
<p><code>packed</code> 取消填充，让结构体紧凑，适合映射协议帧或存储格式。风险是成员的地址可能不对齐，访问时编译器会生成“逐字节读取再拼接”的代码，速度慢；在某些内核上如果编译器优化不当，还可能产生非对齐访问导致 HardFault。</p>
<p>所以协议解析的正确做法是：不要直接把接收缓冲区强转成 packed 结构体指针，而是用 <code>memcpy</code> 到本地结构体，或者用移位逐字段解析。这样既避免对齐问题，也避免端序问题。</p>`,
        principle: `<p>Cortex-M3/M4 支持部分非对齐访问（如 LDR 非对齐字），但会拆成两次总线访问，性能下降；Cortex-M0/M0+ 完全不支持，非对齐访问直接 HardFault。Cortex-M7 可以通过配置允许或禁止。</p>
<p>除了对齐，packed 还会影响编译器优化：它不能假设成员地址对齐，所以不能使用某些批量读写指令，代码体积和执行时间都会增加。</p>`,
        fig: {
          type: "table",
          title: "不同内核对非对齐访问的支持",
          tag: "compare",
          head: ["内核", "非对齐字访问", "后果"],
          rows: [
            ["Cortex-M0/M0+", "不支持", "HardFault"],
            ["Cortex-M3/M4", "部分支持", "拆成两次访问，变慢"],
            ["Cortex-M7", "可配置", "默认支持，可开启异常"],
            ["Cortex-A", "通常支持", "性能下降，可配置陷阱"]
          ]
        },
        code: {
          lang: "c",
          title: "align_pack.c",
          src: `#include <stdint.h>
#include <string.h>

/* 协议帧：紧凑排列，用于描述格式，不直接强转 */
typedef struct __attribute__((packed)) {
    uint8_t  head;
    uint16_t len;
    uint32_t seq;
    uint8_t  crc;
} frame_t;

/* 错误做法：把接收缓冲区强转成 packed 指针再取成员
 * 在 M0 上 seq 可能落在非对齐地址，直接 HardFault
 */
uint32_t bad_get_seq(const uint8_t *buf)
{
    const frame_t *f = (const frame_t *)buf;
    return f->seq;                  /* 危险：非对齐访问 */
}

/* 正确做法 1：memcpy 到本地对齐变量 */
uint32_t good_get_seq_memcpy(const uint8_t *buf)
{
    uint32_t seq;
    memcpy(&seq, buf + 3, sizeof(seq));   /* 编译器生成安全的字节拷贝 */
    return seq;
}

/* 正确做法 2：移位解析，同时处理端序 */
uint32_t good_get_seq_shift(const uint8_t *buf)
{
    return ((uint32_t)buf[3] << 0)  |
           ((uint32_t)buf[4] << 8)  |
           ((uint32_t)buf[5] << 16) |
           ((uint32_t)buf[6] << 24);      /* 小端；大端则反过来 */
}

/* 需要 DMA 的结构体：强制按 Cache 行对齐 */
typedef struct {
    uint8_t data[512];
} __attribute__((aligned(32))) dma_buf_t;

dma_buf_t g_dma_buf;                    /* 地址一定是 32 的倍数 */`
        },
        apply: `<p>工程上的三条规则：协议结构体加 packed 只用于描述格式和计算大小，不要直接强转；DMA 缓冲区必须按 4 字节或 Cache 行对齐；共享内存的结构体要考虑伪共享（false sharing），把不同核写的字段分开到不同 Cache 行。</p>
<p>如果必须用 packed 结构体访问，可以把指针声明为 <code>const volatile</code> 并确保缓冲区本身对齐，或者先拷贝到对齐的本地结构体。</p>`,
        pitfalls: [
          "<b>把接收缓冲区强转成 packed 结构体。</b>对齐、端序、编译器差异三重风险，换平台必挂。",
          "<b>以为 packed 只影响大小。</b>它还会让成员访问变慢，甚至在某些内核上异常。",
          "<b>忘记 DMA 缓冲区对齐。</b>传输首尾字节错位，或 Cache 维护时波及相邻数据。"
        ],
        follow: [
          [
            "结构体大小怎么算最快？",
            "按“每个成员偏移对齐到自身大小，总大小对齐到最大成员大小”的规则手算，或者写个 <code>printf(\"%zu\", sizeof(struct S))</code> 实际编译验证。",
            ],
          [
            "什么是伪共享？",
            "多核系统中，两个核分别写同一 Cache 行内的不同变量，会导致该行在核间反复失效同步，性能急剧下降。解决方法是填充字节，让热点变量各占一行。"
          ],
          [
            "位域的对齐规则是什么？",
            "位域由编译器实现定义，分配方向（从低位还是高位）、跨存储单元的处理都可能不同。跨平台协议不能用位域直接映射，必须手工移位。"
          ]
        ]
      },

      {
        id: "MM-03",
        chapter: "stack",
        topic: "stack",
        title: "栈溢出怎么检测？有哪些预防手段？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "栈增长方向、溢出后果、填充检测与 MPU 保护。",
        q: `<p>面试官：<strong>栈溢出</strong>会有什么现象？怎么检测？如果线上设备偶发死机，怀疑是栈溢出，你怎么定位？</p>`,
        exam: `<p>考察调试经验。能说清“栈向下增长、溢出会覆盖相邻内存”“填充魔数法测高水位”“MPU 保护栈底”“RTOS 有溢出钩子”，说明你处理过真实的稳定性问题。</p>`,
        core: `<p>Cortex-M 栈向下增长，溢出会踩坏 .bss、堆或别的任务栈，表现是随机死机；可用魔数高水位、栈底保护字或 MPU 检测。</p>`,
        answer: `<p>Cortex-M 的栈是满递减的，从高地址往低地址增长。溢出时会覆盖栈底以下的区域——可能是 .bss 里的全局变量、堆，或者另一个任务的栈。</p>
<p>现象非常随机：可能是某个无关变量莫名其妙变了、函数返回地址被覆盖导致跑飞、或者直接 HardFault。所以这类问题往往表现为“偶尔死机”，很难复现。</p>
<p>检测方法有几种：一是在启动时把栈区填充成固定魔数（比如 0xA5），运行一段时间后从栈底往上找第一个被改写的位置，算出栈的高水位；二是在栈底放保护字，定期检查是否被改写；三是用 MPU 把栈底一小段设为不可访问，溢出立刻触发 MemManage 异常，能精确定位。</p>
<p>RTOS 下每个任务有独立栈，FreeRTOS 提供 <code>configCHECK_FOR_STACK_OVERFLOW</code> 和 <code>uxTaskGetStackHighWaterMark</code>，是排查任务栈最方便的工具。</p>`,
        principle: `<p>栈溢出的根本原因是“栈空间固定，但调用深度和局部变量大小不可控”。递归、大局部数组、深层调用链、中断嵌套，都会让栈突然变深。</p>
<p>填充法的原理是：栈使用是连续的，未被使用的区域保持魔数。找到第一个非魔数的位置，就知道最坏情况下栈用到多深。它的局限是只能反映“历史最坏”，不能实时阻止溢出。</p>`,
        fig: {
          type: "flow",
          title: "栈溢出的破坏路径",
          tag: "memory",
          items: [
            { t: "栈向下增长", d: "局部变量 + 返回地址" },
            { t: "越过栈底", d: "进入 .bss / 堆" },
            { t: "覆盖全局变量", d: "数据错乱" },
            { t: "覆盖返回地址", d: "跑飞 / HardFault" }
          ]
        },
        code: {
          lang: "c",
          title: "stack_guard.c",
          src: `#include <stdint.h>

#define STACK_FILL  0xA5A5A5A5u

extern uint32_t _sstack;      /* 链接脚本里定义的栈底 */
extern uint32_t _estack;      /* 栈顶 */

/* 启动时尽早调用：只把“还没用过”的栈区填成魔数 */
void stack_paint(void)
{
    uint32_t *sp = (uint32_t *)__get_MSP();   /* 当前栈指针：再往上的区域已经被用了 */
    uint32_t *p  = &_sstack;

    while (p < sp) {                          /* 绝不能填到 _estack，那会覆盖调用栈和返回地址 */
        *p++ = STACK_FILL;
    }
}

/* 统计栈峰值：从栈底往上数还有多少没被用过 */
uint32_t stack_used_bytes(void)
{
    uint32_t *p = &_sstack;
    while (p < &_estack && *p == STACK_FILL) p++;
    return (uint32_t)((uint8_t *)&_estack - (uint8_t *)p);
}

/* 定期检查栈底保护字（放在栈底往上 16 字节处） */
#define GUARD_WORDS 4
static uint32_t *guard = &_sstack;

int stack_guard_ok(void)
{
    for (int i = 0; i < GUARD_WORDS; i++) {
        if (guard[i] != STACK_FILL) return 0;
    }
    return 1;
}

/* 反例：大数组 + 递归，栈深不可控 */
void bad_recursive(int depth)
{
    uint8_t buf[256];             /* 每层 256 字节 */
    buf[0] = (uint8_t)depth;
    if (depth > 0) bad_recursive(depth - 1);
}

/* 正例：改为迭代 + 静态缓冲 */
static uint8_t s_buf[256];

void good_iterative(int depth)
{
    for (int i = 0; i < depth; i++) {
        s_buf[0] = (uint8_t)i;
    }
}`
        },
        apply: `<p>实际排查步骤：先在调试版里填充魔数，跑完所有功能（包括异常分支、日志、浮点运算），读高水位；如果发现接近栈底，就调整栈大小或减少局部变量。</p>
<p>线上设备偶发死机时，可以在 HardFault 处理里打印栈指针和栈底的距离，判断是否已经越界；同时记录复位原因，看是否伴随看门狗复位。</p>`,
        pitfalls: [
          "<b>只测主流程不测异常分支。</b>错误处理的调用链可能更深，栈峰值出现在异常路径上。",
          "<b>在中断里定义大数组。</b>中断用 MSP，嵌套时栈深叠加，很容易溢出。",
          "<b>以为栈溢出一定崩溃。</b>可能只是悄悄改了一个变量，系统带病运行，问题在别处爆发。"
        ],
        follow: [
          [
            "为什么栈要从高地址向下增长？",
            "历史习惯，便于区分堆和栈的增长方向，也方便检测溢出（栈底固定，越界立即踩到已知区域）。ARM 的满递减栈还让 PUSH 指令可以直接用 SP 偏移寻址。"
          ],
          [
            "如何估算栈的合理大小？",
            "静态分析最深调用链的栈帧总和，加上中断嵌套开销和 20%~30% 余量；再用填充法实测校正。不要凭感觉拍数字。"
          ],
          [
            "MPU 怎么保护栈？",
            "把栈底一个区域（如 32 字节）配置为不可读写，栈溢出访问到这里立刻触发 MemManage 异常，能在溢出瞬间捕获，比事后检测更精确。"
          ]
        ]
      },

      {
        id: "MM-04",
        chapter: "stack",
        topic: "leak",
        title: "MCU 上没有 valgrind，内存泄漏怎么排查？",
        diff: "中级",
        freq: "中频",
        type: "故障排查题",
        point: "泄漏的表现、静态统计、分配钩子与内存池替代方案。",
        q: `<p>面试官：设备运行几天后 <code>malloc</code> 失败，怀疑是<strong>内存泄漏</strong>。没有 valgrind，你怎么定位？怎么从设计上避免？</p>`,
        exam: `<p>考察实际排查能力。能说清“统计已分配块数和总字节”“在 malloc/free 里加钩子记录调用位置”“用内存池替代动态分配”，说明你处理过长期运行的稳定性问题。</p>`,
        core: `<p>先看堆剩余量是否周期性下降、已分配块数是否持续上升来判断泄漏；再在 malloc/free 外包一层记录指针、大小和调用行号，找出未释放的块。</p>`,
        answer: `<p>先确认是不是泄漏：周期性打印堆的剩余量和已分配块数。如果剩余量单调下降、块数单调上升，基本可以确定是泄漏；如果只是碎片化，剩余量会波动但不持续下降。</p>
<p>定位方法是在 <code>malloc</code>/<code>free</code> 外包一层钩子，记录每次分配的指针、大小和调用处的文件行号（用 <code>__FILE__</code>/<code>__LINE__</code> 宏），释放时清除记录。运行一段时间后 dump 还没释放的块，就能看到是谁分配的。</p>
<p>更彻底的办法是从设计上避免：嵌入式里尽量不用动态分配，改用固定块内存池，分配释放都是 O(1)，不会碎片，也不会有“忘记释放”导致的持续增长（池满会立刻暴露问题）。</p>`,
        principle: `<p>内存泄漏的本质是“分配了但没释放”，长期运行后堆被耗尽。另一种类似的现象是“碎片化”：总空闲量够但没有足够大的连续块，分配同样会失败，但统计上剩余量并不为零。</p>
<p>钩子法的开销在于每次分配都要记录，通常只在调试版启用。记录表本身也要占内存，所以只记录前 N 次分配，或者用哈希表按指针索引。</p>`,
        code: {
          lang: "c",
          title: "mem_trace.c",
          src: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TRACE_MAX 64

typedef struct {
    void       *ptr;
    size_t      size;
    const char *file;
    int         line;
} alloc_rec_t;

static alloc_rec_t s_recs[TRACE_MAX];
static int         s_rec_count;
static size_t      s_total_bytes;

/* 包装 malloc：记录调用位置 */
void *dbg_malloc(size_t size, const char *file, int line)
{
    void *p = malloc(size);
    if (!p) return NULL;

    if (s_rec_count < TRACE_MAX) {
        s_recs[s_rec_count].ptr  = p;
        s_recs[s_rec_count].size = size;
        s_recs[s_rec_count].file = file;
        s_recs[s_rec_count].line = line;
        s_rec_count++;
        s_total_bytes += size;      /* 只有被记录的块才统计，free 时才能配对扣减 */
    }
    return p;
}

/* 包装 free：清除记录 */
void dbg_free(void *p, const char *file, int line)
{
    for (int i = 0; i < s_rec_count; i++) {
        if (s_recs[i].ptr == p) {
            s_total_bytes -= s_recs[i].size;
            s_recs[i] = s_recs[--s_rec_count];   /* 尾部覆盖 */
            break;
        }
    }
    free(p);
}

/* 打印仍然存活的分配，定位泄漏源 */
void dbg_dump_leaks(void)
{
    printf("alive blocks: %d, total %u bytes\\n", s_rec_count, (unsigned)s_total_bytes);
    for (int i = 0; i < s_rec_count; i++) {
        printf("  %p  %u bytes  at %s:%d\\n",
               s_recs[i].ptr, (unsigned)s_recs[i].size,
               s_recs[i].file, s_recs[i].line);
    }
}

#define MALLOC(n)  dbg_malloc((n), __FILE__, __LINE__)
#define FREE(p)    dbg_free((p), __FILE__, __LINE__)`
        },
        apply: `<p>实际项目里，我会在调试版周期打印 <code>xPortGetFreeHeapSize</code> 和 <code>xPortGetMinimumEverFreeHeapSize</code>，后者反映历史最低点，比当前值更能发现缓慢泄漏。</p>
<p>如果确认泄漏，先在代码里搜索所有 <code>malloc</code>，逐个检查错误分支是否释放；重点关注“中途 return”“goto 错误处理”“异常路径”。</p>`,
        pitfalls: [
          "<b>把碎片化当成泄漏。</b>剩余量没有持续下降，只是找不到连续块。要统计最大可用块，而不只是总量。",
          "<b>钩子记录表本身溢出。</b>只记录前 64 次分配，后面的泄漏看不到。要记录“未记录次数”并告警。",
          "<b>只在调试版排查。</b>发布版的编译选项不同（优化级别、断言），问题可能只在发布版出现。"
        ],
        follow: [
          [
            "如何区分泄漏和碎片？",
            "泄漏表现为剩余总量持续下降、已分配块数持续上升；碎片表现为总量稳定但最大连续块变小，大块分配失败而小块正常。"
          ],
          [
            "嵌入式为什么推荐内存池？",
            "固定块分配，无碎片、时间确定（O(1)）、失败可预测（池满立刻返回 NULL），便于静态分析最坏情况。适合实时系统和长期运行设备。"
          ],
          [
            "如何避免忘记释放？",
            "遵循“谁分配谁释放”的约定；用 goto cleanup 统一出口；用 RAII 思想（C 里可以用 cleanup 属性或成对的 open/close）；代码评审时重点检查错误分支。"
          ]
        ]
      },

      {
        id: "MM-05",
        chapter: "linker",
        topic: "linker",
        title: "链接脚本里 LMA 和 VMA 有什么区别？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "加载地址与运行地址、段布局、启动时的拷贝，以及自定义段。",
        q: `<p>面试官：链接脚本里的 <code>&gt;FLASH</code> 和 <code>AT&gt;FLASH</code> 有什么区别？<strong>LMA 和 VMA</strong> 分别是什么？为什么 .data 段需要启动代码拷贝？</p>`,
        exam: `<p>这是理解启动流程和内存布局的关键。能说清“VMA 是运行地址、LMA 是加载地址”“.data 的 VMA 在 RAM、LMA 在 Flash”“启动代码按 LMA 读、按 VMA 写”，说明你读过链接脚本。</p>`,
        core: `<p>VMA 是变量运行时地址，LMA 是烧录文件里的加载地址；.data 的 VMA 在 RAM、LMA 在 Flash，启动代码按这两个地址把初值拷过去。</p>`,
        answer: `<p>VMA 是虚拟内存地址，也就是程序运行时变量实际所在的地址；LMA 是加载地址，也就是这段数据在烧录文件里的位置。</p>
<p>对于 .text 和 .rodata，VMA 和 LMA 相同，都在 Flash，因为代码直接在 Flash 里执行（XIP）。对于 .data，VMA 在 RAM（变量必须能读写），但初值必须存在非易失存储器里，所以 LMA 在 Flash。启动代码根据这两个地址，把初值从 Flash 拷贝到 RAM。</p>
<p>链接脚本里 <code>&gt;FLASH</code> 指定 VMA 所在的区域，<code>AT&gt;FLASH</code> 指定 LMA 所在的区域。比如 <code>.data : { ... } &gt;RAM AT&gt;FLASH</code> 表示运行在 RAM、加载在 Flash。</p>
<p>理解这一点就能明白：为什么 bin 文件的大小包含 .data 的初值，为什么启动代码里有一段汇编在做拷贝，为什么改链接脚本能实现“代码搬到 RAM 里跑”。</p>`,
        principle: `<p>链接器生成 elf 时，每个段都有一个 VMA 和一个 LMA。objcopy 转 bin 时，按 LMA 排列输出，所以 bin 里 .data 的初值紧跟在 .text 后面。</p>
<p>启动代码通过链接脚本导出的符号（<code>_sidata</code>、<code>_sdata</code>、<code>_edata</code>）知道从哪读到哪写。这些符号不是变量，而是地址常量，用 <code>extern</code> 声明即可。</p>`,
        fig: {
          type: "table",
          title: "典型段的 LMA 与 VMA",
          tag: "linker",
          head: ["段", "VMA（运行）", "LMA（加载）", "是否需拷贝"],
          rows: [
            [".text", "Flash", "Flash", "否，直接执行"],
            [".rodata", "Flash", "Flash", "否"],
            [".data", "RAM", "Flash", "是，启动时拷贝"],
            [".bss", "RAM", "无", "否，启动时清零"],
            [".ramfunc", "RAM", "Flash", "是，为了提速"]
          ]
        },
        code: {
          lang: "text",
          title: "link.ld",
          src: `MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    /* 向量表必须放在 Flash 起始 */
    .isr_vector : {
        KEEP(*(.isr_vector))
    } > FLASH

    .text : {
        *(.text*)
        *(.rodata*)
        . = ALIGN(4);
        _etext = .;
    } > FLASH

    /* .data：运行在 RAM，初值存在 Flash */
    _sidata = LOADADDR(.data);
    .data : {
        _sdata = .;
        *(.data*)
        . = ALIGN(4);
        _edata = .;
    } > RAM AT > FLASH

    /* .bss：不占 Flash，启动时清零 */
    .bss : {
        _sbss = .;
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;
    } > RAM

    /* 自定义段：放到 RAM 执行的函数 */
    .ramfunc : {
        _sramfunc = .;
        *(.ramfunc*)
        . = ALIGN(4);
        _eramfunc = .;
    } > RAM AT > FLASH
}`
        },
        apply: `<p>实际用途：把中断服务函数或热点循环放进 <code>.ramfunc</code> 段，避开 Flash 等待周期，降低中断延迟；把配置参数放到固定地址的段，方便 bootloader 和 APP 共享；把大数组放到外部 SDRAM 段，缓解内部 RAM 压力。</p>
<p>改链接脚本后一定要检查 map 文件，确认段的地址和大小符合预期，避免段重叠或超出容量。</p>`,
        pitfalls: [
          "<b>混淆 &gt; 和 AT&gt;。</b>只写 <code>&gt;RAM</code> 不写 <code>AT&gt;FLASH</code>，链接器会把初值也放在 RAM 地址，bin 文件巨大且启动后数据是错的。",
          "<b>忘记在启动代码里拷贝 .data。</b>所有带初值的全局变量都会是 0 或随机值。",
          "<b>自定义段没有 KEEP。</b>链接器开启 gc-sections 后，没有被引用的段会被删掉，向量表就是典型受害者。"
        ],
        follow: [
          [
            "为什么向量表要用 KEEP？",
            "向量表里的函数地址不是通过代码引用建立的，链接器看不到引用关系，开 <code>--gc-sections</code> 时会把它当垃圾回收。KEEP 强制保留。"
          ],
          [
            "如何把函数放到 RAM 里执行？",
            "用 <code>__attribute__((section(\".ramfunc\")))</code> 标记函数，链接脚本里定义该段 VMA 在 RAM、LMA 在 Flash，启动代码拷贝过去即可。"
          ],
          [
            "bin 文件和 hex 文件有什么区别？",
            "bin 是纯二进制，按 LMA 连续排列，烧录时需要知道起始地址；hex 带地址信息和校验，可以描述不连续的段，烧录工具能自动定位。"
          ]
        ]
      },

      {
        id: "MM-06",
        chapter: "linker",
        topic: "vector",
        title: "bootloader 怎么跳转到 APP？向量表为什么要重定位？",
        diff: "高级",
        freq: "进阶",
        type: "工程应用题",
        point: "VTOR、栈顶初始化、跳转前的现场清理，以及 APP 的链接地址设置。",
        q: `<p>面试官：bootloader 升级完固件后，怎么<strong>跳转到 APP</strong>？为什么 APP 要重定位向量表？跳转前要做哪些清理？跳过去之后中断进不去是什么原因？</p>`,
        exam: `<p>OTA 是项目面试的高频话题。能说清“APP 的链接地址要偏移”“跳转前设置 MSP 和 VTOR”“关中断、关外设、清标志”，以及“APP 里忘记设 VTOR 导致中断跳到 bootloader”，说明你做过完整的 bootloader。</p>`,
        core: `<p>跳转 APP 前先校验固件、关中断和外设，再把 APP 向量表第 0 项写入 MSP、第 1 项取复位向量；APP 还要把 VTOR 指向自己的向量表。跳过去中断进不去，通常是 VTOR 没重定位或中断仍关着。</p>`,
        answer: `<p>跳转的本质是把 CPU 的执行流交给 APP 的复位向量。步骤是：</p>
<p>第一，检查 APP 区是否有有效固件（比如检查栈顶是否在 RAM 范围内、复位向量是否在 Flash 范围内、CRC 是否正确）。</p>
<p>第二，关闭所有中断和外设（尤其是 SysTick、DMA、串口），清除挂起标志，避免跳转后旧中断还在触发。</p>
<p>第三，从 APP 起始地址读出初始栈顶，写入 MSP；读出复位向量，跳转过去。</p>
<p>第四，APP 启动后必须把 <code>SCB-&gt;VTOR</code> 设置为自己的向量表地址，否则中断会跳到 bootloader 的向量表，表现为“APP 能跑但一进中断就死”。</p>
<p>另外，APP 的链接地址要设置为 APP 区的起始地址（比如 0x08010000），否则代码里的绝对地址跳转全部错误。</p>`,
        principle: `<p>Cortex-M 复位时从地址 0 取 MSP、从地址 4 取复位向量。bootloader 跳转时模拟这个过程：手动设置 MSP 和 PC。但 VTOR 不会自动更新，必须由 APP 自己设置。</p>
<p>跳转前必须关中断，因为跳转过程中如果来了中断，会使用旧的向量表和栈，行为不可预测。跳转后 APP 初始化完成再重新开中断。</p>`,
        fig: {
          type: "flow",
          title: "bootloader 跳转流程",
          tag: "boot",
          items: [
            { t: "校验 APP", d: "栈顶/向量/CRC" },
            { t: "关中断", d: "清挂起标志" },
            { t: "反初始化外设", d: "DMA/UART/SysTick" },
            { t: "设置 MSP", d: "APP 栈顶" },
            { t: "跳转", d: "APP 复位向量" },
            { t: "APP 设 VTOR", d: "重定位向量表" }
          ]
        },
        code: {
          lang: "c",
          title: "jump_app.c",
          src: `#include <stdint.h>

#define APP_ADDR   0x08010000u
#define APP_END    0x08080000u

typedef void (*app_entry_t)(void);

/* 校验 APP 是否有效：栈顶在 RAM、复位向量在 Flash */
int app_is_valid(void)
{
    uint32_t sp = *(volatile uint32_t *)APP_ADDR;
    uint32_t pc = *(volatile uint32_t *)(APP_ADDR + 4);

    if (sp < 0x20000000u || sp > 0x20020000u) return 0;   /* 栈顶不在 RAM */
    if (pc < APP_ADDR || pc > APP_END) return 0;          /* 向量不在 APP 区 */

    return 1;
}

/* 跳转到 APP */
void jump_to_app(void)
{
    if (!app_is_valid()) return;

    uint32_t app_sp = *(volatile uint32_t *)APP_ADDR;
    uint32_t app_pc = *(volatile uint32_t *)(APP_ADDR + 4);

    /* 1. 关闭全局中断，清除所有挂起 */
    __disable_irq();
    for (int i = 0; i < 8; i++) {
        NVIC->ICER[i] = 0xFFFFFFFFu;
        NVIC->ICPR[i] = 0xFFFFFFFFu;
    }

    /* 2. 反初始化用过的外设，避免残留中断 */
    HAL_DeInit();
    SysTick->CTRL = 0;
    SysTick->LOAD = 0;
    SysTick->VAL  = 0;

    /* 3. 重定位向量表（APP 里还会再设一次，双保险） */
    SCB->VTOR = APP_ADDR;

    /* 4. 设置栈顶并跳转 */
    __set_MSP(app_sp);
    app_entry_t entry = (app_entry_t)app_pc;
    entry();

    /* 正常情况下不会返回 */
    for (;;) { }
}

/* ---------- APP 侧：main 开头必须调用 ---------- */
void app_vector_init(void)
{
    SCB->VTOR = 0x08010000u;      /* 与 APP 链接地址一致 */
    __DSB();
    __ISB();
}`
        },
        codeNote: `<b>关键：</b>APP 的链接地址、<code>SCB-&gt;VTOR</code>、bootloader 里的 <code>APP_ADDR</code> 三者必须完全一致。任何一处写错，都会出现“能启动但中断异常”的诡异现象。`,
        apply: `<p>做 OTA 时，通常还涉及分区表：bootloader 区、APP 运行区、APP 备份区、参数区。升级流程是“下载到备份区 → 校验 → 拷贝到运行区（或直接切换启动标志）→ 重启”。双区方案可以在升级失败时回滚，是最可靠的做法。</p>
<p>跳转前还要考虑：如果 APP 用到了 bootloader 初始化的时钟，跳转后不要重新初始化（或先反初始化），否则可能出现时钟配置冲突。</p>`,
        pitfalls: [
          "<b>APP 忘记设置 VTOR。</b>中断跳回 bootloader 的向量表，bootloader 里没有对应的处理函数，直接跑飞。",
          "<b>跳转前没关中断。</b>残留的 SysTick 或串口中断在跳转瞬间触发，使用旧的栈和向量，系统崩溃。",
          "<b>APP 链接地址没偏移。</b>编译出来的代码按 0x08000000 寻址，实际烧到 0x08010000，所有绝对跳转都错位。"
        ],
        follow: [
          [
            "什么是双区 OTA？",
            "Flash 分成运行区和备份区。新固件先写入备份区，校验通过后设置启动标志，重启由 bootloader 决定从哪个区启动。升级失败可以回滚到旧版本，避免变砖。"
          ],
          [
            "如何保证固件完整性？",
            "写入时计算 CRC32 或 SHA256，与固件头部记录的值比对；还可以加数字签名防止篡改。校验失败就不切换启动区。"
          ],
          [
            "跳转后时钟需要重新配置吗？",
            "取决于 APP 的假设。如果 APP 的 SystemInit 会重新配置 PLL，而 PLL 已经锁定，重复配置可能失败。稳妥做法是 bootloader 跳转前把时钟恢复到复位默认（HSI），让 APP 从头配置。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("memory-management", {
    chapters: [
      {
        id: "layout",
        topics: [
          { id: "section", title: "数据段与启动清零" },
          { id: "scatter", title: "分散加载" },
          { id: "mpu", title: "MPU 内存保护" },
          { id: "cache", title: "Cache 与 DMA 一致性" },
          { id: "barrier", title: "内存屏障" }
        ]
      },
      {
        id: "stack",
        topics: [
          { id: "pool", title: "内存池" },
          { id: "tlsf", title: "TLSF 分配器" },
          { id: "frag", title: "内存碎片" }
        ]
      }
    ],
    questions: [
      {
        id: "MM-07",
        chapter: "stack",
        topic: "pool",
        title: "固定块内存池怎么实现？为什么它比 malloc 更适合嵌入式？",
        diff: "中级",
        freq: "高频",
        type: "代码设计题",
        point: "预分配固定大小块 + 空闲链表，分配释放 O(1)，无碎片，时间可预测。",
        q: `<p>面试官：系统要频繁分配相同大小的缓冲区，用 malloc 还是自己写内存池？</p>`,
        exam: `<p>考察内存管理设计。能说出“固定块、空闲链表、无碎片、O(1)”，就很好。</p>`,
        core: `<p>内存池启动时把一大块内存切成等长块并用空闲链表串起来，分配释放都是链表摘挂，O(1) 且不会碎片；代价是块大小固定，大对象要用多个不同大小的池。</p>`,
        answer: `<p><b>内存池的做法：</b></p>
<ul>
<li>启动时一次性分配一大块内存，按固定大小切成 N 个块；</li>
<li>用空闲链表把所有块串起来，分配时从头部摘一个，释放时插回头部；</li>
<li>分配和释放都是 O(1)，不需要查找合适大小的块。</li>
</ul>
<p><b>相比 malloc 的优势：</b></p>
<ul>
<li><b>无碎片</b>：所有块大小相同，释放后一定能被复用；</li>
<li><b>时间可预测</b>：O(1)，适合实时系统；</li>
<li><b>无元数据开销</b>：不需要每个块记录大小和空闲标记；</li>
<li><b>可静态分配</b>：内存池本身可以是静态数组，不依赖堆。</li>
</ul>
<p><b>代价：</b>块大小固定，小数据浪费空间，大数据放不下。可以按大小做多个池（如 32/64/128 字节），按需选择。</p>
<p><b>实现细节：</b>空闲链表节点可以直接复用块内存（块至少能放下一个指针）；分配时返回块地址，释放时把块插回链表。多任务下需要加锁或使用无锁栈。</p>`,
        principle: `<p>通用堆分配器需要处理任意大小、合并、分割，逻辑复杂且时间不确定。固定块池把问题简化成“链表摘取/插入”，用空间换确定性。</p>
<p>碎片来自“大小不一 + 分割合并”，固定块从根本上消除了这个前提。</p>`,
        fig: {
          type: "memmap",
          title: "固定块内存池",
          tag: "memory pool",
          rows: [
            { name: "块 0", text: "已分配", addr: "0x20001000", cls: "a" },
            { name: "块 1", text: "空闲 → 下一个空闲块", addr: "0x20001020", cls: "b" },
            { name: "块 2", text: "已分配", addr: "0x20001040", cls: "c" },
            { name: "块 3", text: "空闲 → NULL", addr: "0x20001060", cls: "d" }
          ],
          note: "空闲块内部存下一个空闲块的指针，不需要额外的链表节点。"
        },
        code: {
          lang: "c",
          title: "mempool.c",
          src: `#include <stdint.h>
#include <stddef.h>

#define POOL_BLOCK_SIZE  32
#define POOL_BLOCK_COUNT 16

typedef struct block {
    struct block *next;
} block_t;

static uint8_t pool_mem[POOL_BLOCK_SIZE * POOL_BLOCK_COUNT]
    __attribute__((aligned(8)));
static block_t *free_list;

void pool_init(void)
{
    free_list = NULL;
    for (int i = POOL_BLOCK_COUNT - 1; i >= 0; i--) {
        block_t *b = (block_t *)(pool_mem + i * POOL_BLOCK_SIZE);
        b->next = free_list;
        free_list = b;
    }
}

void *pool_alloc(void)
{
    block_t *b = free_list;
    if (!b) return NULL;          /* 池耗尽 */
    free_list = b->next;
    return b;
}

void pool_free(void *p)
{
    if (!p) return;
    block_t *b = (block_t *)p;
    b->next = free_list;
    free_list = b;
}`
        },
        codeNote: "池耗尽时返回 NULL，调用者必须检查；多任务下要给 pool_alloc/free 加临界区保护。",
        apply: `<p>我做通信模块时，为每个连接预分配固定大小的收发缓冲，连接数固定，内存池大小也就固定，运行中完全不会分配失败。</p>
<p>如果对象大小差异大，按大小分几个池，或者用 TLSF 这类支持可变大小但时间可控的分配器。</p>`,
        pitfalls: [
          "<b>块太小放不下数据。</b>写入越界，破坏相邻块。",
          "<b>重复释放同一块。</b>空闲链表成环，后续分配拿到同一块。",
          "<b>多任务不加锁。</b>链表竞争，块丢失。",
          "<b>池耗尽不处理。</b>返回 NULL 后继续解引用。"
        ],
        follow: [
          ["内存池和 slab 分配器有什么关系？", "slab 是 Linux 内核的对象缓存，按对象类型预分配，思路与固定块池类似，但增加了 per-CPU 缓存和构造/析构。"],
          ["如何检测重复释放？", "在块里加魔数或使用位图记录分配状态，释放时校验；调试版本可以加保护字节检测越界。" ]
        ]
      },

      {
        id: "MM-08",
        chapter: "stack",
        topic: "tlsf",
        title: "TLSF 分配器是什么？为什么它适合实时系统？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "两级位图 + 分级空闲链表，分配和释放都是 O(1)，碎片可控。",
        q: `<p>面试官：需要支持可变大小分配，又要求时间确定，用什么分配器？TLSF 是怎么做到 O(1) 的？</p>`,
        exam: `<p>考察对分配器算法的了解。能说出“分级链表 + 位图查找、首次适配、O(1)”，就很好。</p>`,
        core: `<p>TLSF 按 2 的幂和子区间分级空闲块，用两级位图和 CLZ/CTZ 直接定位可用块，分配释放都是 O(1)，不随块数量变慢，长期运行仍可能有一定碎片。</p>`,
        answer: `<p><b>TLSF（Two-Level Segregated Fit）</b>把空闲块按大小分级：</p>
<ul>
<li>第一级按 2 的幂划分（如 32B、64B、128B…）；</li>
<li>第二级在每个区间内再细分（如 64~128 分成 4 个子区间）；</li>
<li>用两级位图记录哪些区间有空闲块，查找时用 CLZ/CTZ 指令快速定位。</li>
</ul>
<p><b>为什么 O(1)：</b></p>
<ul>
<li>分配时根据请求大小算出对应的级别，查位图找到第一个有空闲块的区间，从链表头取一块；</li>
<li>释放时把块插回对应级别的链表，并更新位图；</li>
<li>不需要遍历所有空闲块，操作次数与块数量无关。</li>
</ul>
<p><b>碎片：</b>TLSF 使用“好适配”（good fit）策略，尽量选择接近请求大小的块，碎片比首次适配小；但长期运行仍可能产生碎片，只是程度可控。</p>
<p><b>适用场景：</b>需要动态大小分配、又要求时间可预测的实时系统；代码量比固定块池大，但比通用 malloc 可控。</p>`,
        principle: `<p>通用分配器（如 dlmalloc）为了减少碎片会做复杂的合并和分割，时间不确定。TLSF 用“分级 + 位图”把查找变成常数时间的位操作，牺牲一点空间利用率换取确定性。</p>
<p>位图让“找第一个非空级别”变成一条指令，这是 O(1) 的关键。</p>`,
        fig: {
          type: "layers",
          title: "TLSF 的两级分级",
          tag: "tlsf",
          items: [
            { tag: "一级", t: "按 2 的幂分区间", d: "32B、64B、128B…" },
            { tag: "二级", t: "区间内线性细分", d: "每个区间 4~32 个子级" },
            { tag: "位图", t: "标记非空级别", d: "CLZ/CTZ 快速定位" },
            { tag: "链表", t: "每个级别一条空闲链表", d: "取头节点，O(1)" }
          ]
        },
        code: {
          lang: "c",
          title: "tlsf_usage.c",
          src: `#include <stdint.h>
#include <stddef.h>

/* TLSF 通常以库的形式提供，这里展示使用方式 */
#define TLSF_POOL_SIZE (16 * 1024)

static uint8_t tlsf_pool[TLSF_POOL_SIZE] __attribute__((aligned(8)));
static tlsf_t tlsf;

void mem_init(void)
{
    /* 初始化：把一块内存交给 TLSF 管理 */
    tlsf = tlsf_create_with_pool(tlsf_pool, sizeof(tlsf_pool));
}

void *mem_alloc(size_t size)
{
    /* 分配是 O(1)，不会遍历空闲链表 */
    return tlsf_malloc(tlsf, size);
}

void mem_free(void *p)
{
    tlsf_free(tlsf, p);
}

/* 调试：查看碎片情况 */
void mem_report(void)
{
    tlsf_walk_pool(tlsf_get_pool(tlsf), NULL, NULL);
}`
        },
        codeNote: "TLSF 的池大小和最大块受配置影响，初始化前要确认对齐要求（通常 4/8 字节）。",
        apply: `<p>我在需要动态创建连接或缓冲区的网关项目里用 TLSF，分配时间稳定在几微秒，不会因为碎片导致偶发长延迟。</p>
<p>即使使用 TLSF，我也尽量在启动阶段分配好大部分对象，运行中只做少量短生命周期分配，进一步降低碎片风险。</p>`,
        pitfalls: [
          "<b>以为 TLSF 不会碎片。</b>长期运行仍会碎片，只是可控。",
          "<b>池太小。</b>分配失败，业务受影响。",
          "<b>多任务不加锁。</b>TLSF 本身不是线程安全的。",
          "<b>分配后不检查 NULL。</b>直接使用导致 HardFault。"
        ],
        follow: [
          ["TLSF 和 FreeRTOS 的 heap_4 有什么区别？", "heap_4 是首次适配 + 相邻合并，查找可能遍历链表；TLSF 用位图分级，查找 O(1)，时间更确定。"],
          ["如何评估分配器的实时性？", "测量最坏情况分配时间（WCET），在不同碎片程度下反复测试，看是否稳定；不能只看平均值。" ]
        ]
      },

      {
        id: "MM-09",
        chapter: "stack",
        topic: "frag",
        title: "内存碎片是怎么产生的？如何检测和缓解？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "外碎片来自分配释放后的空洞，内碎片来自对齐和固定块；用固定块池、减少分配、监控空闲块分布。",
        q: `<p>面试官：设备运行几天后 malloc 失败，但系统显示还有很多空闲内存，为什么？</p>`,
        exam: `<p>考察对碎片的直观理解。能区分内碎片/外碎片，并说出检测和缓解方法，就很好。</p>`,
        core: `<p>外碎片是总空闲够但没有连续大块，内碎片是分配块比请求大造成的浪费；统计最大空闲块和分配失败请求，用固定块池或按大小分级的内存池缓解。</p>`,
        answer: `<p><b>外碎片：</b>空闲内存被分割成许多不连续的小块。总空闲量足够，但找不到一块足够大的连续内存，分配失败。常见于频繁分配/释放不同大小的块。</p>
<p><b>内碎片：</b>分配器为了对齐或管理，实际分配的块比请求的大，浪费的部分叫内碎片。固定块池的浪费也属于内碎片。</p>
<p><b>检测：</b></p>
<ul>
<li>统计空闲块的数量和大小分布，看最大空闲块是否远小于总空闲量；</li>
<li>记录分配失败时的请求大小和当前最大空闲块；</li>
<li>用分配器的调试接口遍历堆（如 TLSF 的 walk_pool）。</li>
</ul>
<p><b>缓解：</b></p>
<ul>
<li>减少运行中动态分配，启动时一次性分配；</li>
<li>用固定块池或按大小分级的池；</li>
<li>避免大小频繁变化的分配模式；</li>
<li>用支持合并的分配器（heap_4、TLSF）；</li>
<li>定期重启或做内存整理（嵌入式很少做，因为需要移动数据）。</li>
</ul>`,
        principle: `<p>碎片是动态内存管理的固有代价：分配器无法预知未来的请求，只能在当前状态下做局部最优决策，长期运行后空闲空间被切割。</p>
<p>实时系统更倾向于用固定块池从根源消除外碎片，用少量内碎片换取确定性。</p>`,
        fig: {
          type: "memmap",
          title: "外碎片的形成",
          tag: "fragmentation",
          rows: [
            { name: "已分配 A", text: "占用 64B", addr: "0x20000000", cls: "a" },
            { name: "空闲 32B", text: "太小，放不下 48B 请求", addr: "0x20000040", cls: "b" },
            { name: "已分配 B", text: "占用 128B", addr: "0x20000060", cls: "c" },
            { name: "空闲 32B", text: "与上面的空闲块不相邻", addr: "0x200000E0", cls: "d" }
          ],
          note: "总空闲 64B，但没有连续的 48B 块，分配失败。"
        },
        code: {
          lang: "c",
          title: "frag_stats.c",
          src: `#include <stdint.h>

typedef struct {
    uint32_t total_free;
    uint32_t largest_free;
    uint32_t free_blocks;
} heap_stats_t;

/* 由分配器提供遍历接口，统计空闲块分布 */
void heap_collect(heap_stats_t *s);

void heap_check(void)
{
    heap_stats_t s = {0};
    heap_collect(&s);

    /* 最大空闲块远小于总空闲量，说明碎片严重 */
    if (s.largest_free * 4 < s.total_free && s.free_blocks > 8) {
        /* 记录告警，考虑重启或调整分配策略 */
    }
}`
        },
        codeNote: "碎片指标要结合业务请求大小看：最大空闲块小于常见请求，就已经影响可用性。",
        apply: `<p>我在网关项目里监控“最大空闲块”而不是“总空闲量”，因为前者才能反映还能不能分配大对象。低于阈值就提前告警，避免现场突然失败。</p>
<p>根本解决办法还是减少运行中分配：连接池、固定缓冲、启动时预分配。</p>`,
        pitfalls: [
          "<b>只看总空闲量。</b>碎片严重时总空闲量仍可能很大。",
          "<b>频繁分配不同大小。</b>碎片增长最快。",
          "<b>以为合并能解决一切。</b>不相邻的空闲块无法合并。",
          "<b>长期运行不监控。</b>问题在几天后才暴露。"
        ],
        follow: [
          ["内碎片和外碎片哪个更严重？", "外碎片会导致“有内存却分配失败”，更难处理；内碎片只是浪费空间，通常可预测。"],
          ["能通过移动内存消除碎片吗？", "理论上可以（压缩），但需要更新所有指针，嵌入式里几乎不可行；Java 的 GC 能做是因为有对象引用信息。" ]
        ]
      },

      {
        id: "MM-10",
        chapter: "stack",
        topic: "stack",
        title: "栈是向高地址还是低地址增长？栈帧里有什么？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "Cortex-M 使用满递减栈，栈向低地址增长；栈帧含返回地址、保存的寄存器、局部变量。",
        q: `<p>面试官：局部变量在栈上是怎么分配的？为什么数组越界会踩坏返回地址？</p>`,
        exam: `<p>考察栈的物理布局。能说出“满递减、SP 先减后存、返回地址在栈帧里”，就很好。</p>`,
        core: `<p>Cortex-M 栈满递减，PUSH 先减 SP 再存、POP 先取再增，SP 指向最后一个入栈元素；局部数组向高地址越界会覆盖返回地址，函数返回就跑飞。</p>`,
        answer: `<p><b>增长方向：</b>Cortex-M 使用“满递减栈”（Full Descending）：栈向<b>低地址</b>增长，SP 指向最后一个入栈的元素。PUSH 时先减 SP 再存，POP 时先取再增。</p>
<p><b>栈帧内容（从高地址到低地址）：</b></p>
<ul>
<li>调用者的栈帧；</li>
<li>函数参数（超出寄存器的那部分）；</li>
<li>返回地址（LR）；</li>
<li>保存的寄存器（如 R7 帧指针、被调用者保存寄存器）；</li>
<li>局部变量；</li>
<li>SP 当前指向栈顶。</li>
</ul>
<p><b>数组越界为什么危险：</b>局部数组在栈帧内，向上越界（高地址）会覆盖保存的寄存器、返回地址，导致函数返回时跳到错误地址（跑飞）；向下越界会踩坏其它局部变量或栈保护字。</p>
<p>编译器可以在栈帧里插入 canary（栈保护字），函数返回前检查是否被改写，发现溢出就调用 <code>__stack_chk_fail</code>。</p>`,
        principle: `<p>栈是一块连续内存，SP 指向栈顶。函数调用时分配栈帧，返回时释放，后进先出。栈的大小在启动文件或链接脚本里固定，溢出会踩到相邻区域（堆或全局变量）。</p>
<p>栈帧的布局由 ABI 和编译器决定，开启优化后可能省略帧指针、把变量放进寄存器，布局会变化。</p>`,
        fig: {
          type: "memmap",
          title: "Cortex-M 的栈帧布局",
          tag: "stack frame",
          rows: [
            { name: "高地址", text: "调用者的栈帧", addr: "SP 增大方向", cls: "a" },
            { name: "参数", text: "第 5 个及以后的参数", addr: "调用者压入", cls: "b" },
            { name: "返回地址", text: "LR（下一条指令）", addr: "PUSH {r7, lr}", cls: "c" },
            { name: "局部变量", text: "数组、结构体", addr: "SP 指向栈顶", cls: "d" },
            { name: "低地址", text: "栈的增长方向", addr: "越界会踩坏相邻内存", cls: "e" }
          ]
        },
        code: {
          lang: "c",
          title: "stack_layout.c",
          src: `#include <stdint.h>

/* 查看栈的增长方向：把地址转成整数再比较（对不同对象直接做 < 比较是未定义行为） */
int stack_grows_down(void)
{
    volatile int a = 0;
    volatile int b = 0;
    return (uintptr_t)&b < (uintptr_t)&a;   /* Cortex-M 向下增长，通常返回 1 */
}

/* 典型栈溢出：局部数组过大 */
void overflow_demo(void)
{
    uint8_t buf[4096];   /* 任务栈只有 1KB 时直接溢出 */
    buf[0] = 1;
    (void)buf;
}

/* 长度检查：事前阻止越界写（真正的 canary 是在缓冲区后面放哨兵字，拷贝后校验） */
void guarded_copy(const uint8_t *src, uint32_t len)
{
    uint8_t buf[16];
    if (len > sizeof(buf)) return;
    for (uint32_t i = 0; i < len; i++) buf[i] = src[i];
}`
        },
        codeNote: "大数组不要放栈上，改用静态区或内存池；栈大小要按最坏调用链估算。",
        apply: `<p>我见过最典型的栈溢出是“在中断里定义了一个 1KB 的临时数组”。在 Cortex-M 上，ISR 用的是 MSP，和任务的 PSP 是两套栈，所以这 1KB 直接把主栈（MSP）打穿，任务栈反而没动——排查时容易找错方向。后来规定超过 64 字节的缓冲一律静态分配。</p>
<p>调试时用栈高水位和 canary 检查，比等它崩溃后再查容易得多。</p>`,
        pitfalls: [
          "<b>大数组放栈上。</b>直接溢出。",
          "<b>递归深度不可控。</b>栈帧累积。",
          "<b>以为栈向上增长。</b>越界方向判断错误。",
          "<b>中断里用大局部变量。</b>中断栈空间更紧张。"
        ],
        follow: [
          ["为什么栈溢出往往表现为“跑飞”而不是报错？", "返回地址被覆盖，函数返回时跳到非法地址，触发 HardFault 或执行随机指令。"],
          ["如何估算任务栈大小？", "统计最坏调用链的局部变量和保存寄存器，加上中断嵌套开销，再用高水位实测并留 30% 余量。" ]
        ]
      },

      {
        id: "MM-11",
        chapter: "stack",
        topic: "stack",
        title: "栈和堆会相撞吗？怎么检测栈溢出？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "栈向下、堆向上，共享一段内存时会相撞；用填充图案、保护字、MPU 或高水位检测。",
        q: `<p>面试官：启动文件里栈和堆的大小是怎么定的？如果栈溢出到堆里会发生什么？</p>`,
        exam: `<p>考察对内存布局和检测手段的理解。能说出“填充图案、canary、MPU、高水位”，就很好。</p>`,
        core: `<p>栈和堆大小在启动文件或链接脚本里写死，不是运行时分配；栈从 RAM 顶部向下、堆从栈底向上，两者共享中间区域，用超了会互相踩。</p>`,
        answer: `<p><b>大小怎么定：</b>栈和堆的大小是在启动文件或链接脚本里写死的两个常量。Keil 的汇编启动文件里是 <code>Stack_Size EQU 0x00000400</code>（1KB）、<code>Heap_Size EQU 0x00000200</code>（512B），并在栈顶标号 <code>__initial_sp</code> 作为 MSP 初值；GCC 工具链通常在链接脚本里用 <code>_Min_Stack_Size</code> / <code>_Min_Heap_Size</code> 配合 <code>._user_heap_stack</code> 段，链接时剩余 RAM 不够会直接报错。改容量就是改这两个值，不是运行时分配的。</p>
<p><b>布局：</b>在传统 ARM 启动文件里，栈从 RAM 顶部向下增长，堆从栈底向上增长，两者共享中间区域。如果栈用超了，就会进入堆区，踩坏动态分配的数据；反之堆用超了也会撞栈。</p>
<p><b>检测方法：</b></p>
<ul>
<li><b>填充图案</b>：启动时把栈区域填成固定值（如 0xCD），运行一段时间后检查尾部图案被破坏了多少，估算最大使用量；</li>
<li><b>栈保护字（canary）</b>：在栈帧或栈边界放魔数，函数返回或定期检查，被改写就报错；</li>
<li><b>MPU 保护</b>：把栈边界下方设为不可访问，溢出立即触发 MemManage Fault，能第一时间发现；</li>
<li><b>RTOS 高水位</b>：FreeRTOS 的 <code>uxTaskGetStackHighWaterMark</code> 统计历史最小剩余；</li>
<li><b>编译期分析</b>：<code>-fstack-usage</code> 生成每个函数的栈用量，累加调用链。</li>
</ul>
<p><b>建议：</b>栈和堆分开规划，不要共享；栈放在 RAM 两端，中间留足空隙；开启 MPU 保护边界。</p>`,
        principle: `<p>栈和堆相撞的本质是“两个增长方向相反的区域共享同一段地址空间”。没有硬件保护时，越界只是普通的内存写，不会立即报错，等到数据被破坏才表现出来。</p>
<p>MPU 能把“越界写”变成“立即异常”，把难以定位的数据损坏变成可定位的故障。</p>`,
        fig: {
          type: "memmap",
          title: "栈堆相撞的布局",
          tag: "stack heap collision",
          rows: [
            { name: "RAM 顶部", text: "栈起始，向低地址增长", addr: "MSP 初值", cls: "a" },
            { name: "栈区", text: "局部变量、栈帧", addr: "↓", cls: "b" },
            { name: "空闲", text: "安全间隙（建议保留）", addr: "两者之间", cls: "c" },
            { name: "堆区", text: "动态分配，向高地址增长", addr: "↑", cls: "d" },
            { name: "RAM 底部", text: "全局变量 .data/.bss", addr: "0x20000000", cls: "e" }
          ]
        },
        code: {
          lang: "c",
          title: "stack_check.c",
          src: `#include <stdint.h>

/* 启动时填充栈区域：从 _sstack 填到“当前 SP”为止 */
extern uint32_t _sstack[];
extern uint32_t _estack[];

#define STACK_FILL 0xCDCDCDCDu

void stack_fill(void)
{
    uint32_t *sp = (uint32_t *)__get_MSP();   /* 当前 SP 以上已经是活的栈帧，不能碰 */

    for (uint32_t *p = _sstack; p < sp; p++) {
        *p = STACK_FILL;
    }
}

/* 从栈底扫到第一个被写过的字，得到已用字数（高水位） */
uint32_t stack_used_words(void)
{
    uint32_t *p = _sstack;
    while (p < _estack && *p == STACK_FILL) p++;
    return (uint32_t)(_estack - p);
}

/* 检查栈边界保护字是否被改写：魔数要与填充值一致 */
int stack_guard_ok(const uint32_t *guard)
{
    return *guard == STACK_FILL;
}`
        },
        codeNote: "填充法只能估算“曾经用过多少”，不能发现瞬间越界后又恢复的情况；边界保护更可靠。",
        apply: `<p>我在链接脚本里把栈放在 RAM 末尾，堆放在 .bss 之后，中间留 1KB 安全间隙，并在栈底放保护字，启动时填充。跑完压力测试后看高水位，再调整栈大小。</p>
<p>带 MPU 的型号直接把栈边界下方设为不可访问，溢出立即进 MemManage，比事后分析快得多。</p>`,
        pitfalls: [
          "<b>栈堆共享一段内存。</b>相撞后数据损坏，难定位。",
          "<b>只填充不检查。</b>不知道实际用了多少。",
          "<b>保护字放在栈顶。</b>应该放在栈增长方向的边界。",
          "<b>忽略中断栈。</b>中断嵌套会额外消耗栈。"
        ],
        follow: [
          ["为什么中断会消耗任务栈？", "Cortex-M 中断使用 MSP，但中断处理程序可能调用函数、使用局部变量，这些都在当前栈上；如果中断嵌套，消耗更大。"],
          ["链接脚本怎么把栈放到指定位置？", "定义 _estack 符号为 RAM 末尾，启动文件把它加载到 MSP；栈区不放在 .bss 里，避免被清零。" ]
        ]
      },

      {
        id: "MM-12",
        chapter: "layout",
        topic: "section",
        title: ".bss、.data、.rodata、.text 分别放什么？启动时为什么要清零 .bss？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "text 代码、rodata 常量、data 已初始化全局、bss 未初始化全局；bss 不占 Flash，启动时清零。",
        q: `<p>面试官：全局变量和局部变量分别存在哪？为什么未初始化的全局变量不占 Flash 空间？</p>`,
        exam: `<p>考察内存分区和启动流程。能说出“data 从 Flash 拷贝到 RAM、bss 清零”，就很好。</p>`,
        core: `<p>.text 和 .rodata 在 Flash；.data 初值存 Flash、运行时拷到 RAM；.bss 只占 RAM、启动时清零；栈和堆运行时使用，局部变量在栈上，static 局部在 .data/.bss。</p>`,
        answer: `<p><b>常见段：</b></p>
<ul>
<li><b>.text</b>：代码，放在 Flash，只读；</li>
<li><b>.rodata</b>：只读常量（字符串字面量、const 全局），放在 Flash；</li>
<li><b>.data</b>：已初始化的全局/静态变量，初始值存在 Flash，启动时拷贝到 RAM；</li>
<li><b>.bss</b>：未初始化或初始化为 0 的全局/静态变量，不占 Flash 空间，启动时在 RAM 里清零；</li>
<li><b>栈/堆</b>：运行时动态使用，不在这些段里。</li>
</ul>
<p><b>为什么 bss 不占 Flash：</b>未初始化变量的值都是 0，没必要在 Flash 里存一堆 0；链接器只记录“需要多大空间”，启动代码把这块 RAM 清零即可。这样能显著减小固件体积。</p>
<p><b>启动流程：</b>复位后，启动文件先把向量表第 0 项（栈顶地址）装入 MSP，紧接着调用 <code>SystemInit</code> 配置时钟和 FPU；然后由 C 库的启动代码（<code>__main</code>/scatter loading）把 .data 从 Flash 拷到 RAM、把 .bss 清零，再调用 <code>__libc_init_array</code>（C++ 全局构造）和 <code>main</code>。</p>
<p><b>局部变量</b>在栈上，函数返回即失效；<code>static</code> 局部变量放在 .data 或 .bss，生命周期贯穿程序。</p>`,
        principle: `<p>链接器把不同类型的数据分配到不同段，加载时决定哪些放 Flash、哪些拷贝到 RAM。这样既节省 Flash，又保证可写变量有正确的初始值。</p>
<p>.bss 的“零初始化”是 C 标准保证的：未初始化的全局变量默认为 0，实现方式就是启动时清零，而不是在 Flash 里存 0。</p>`,
        fig: {
          type: "memmap",
          title: "Flash 与 RAM 的分段布局",
          tag: "sections",
          rows: [
            { name: ".text", text: "代码", addr: "Flash", cls: "a" },
            { name: ".rodata", text: "常量、字符串", addr: "Flash", cls: "b" },
            { name: ".data 初值", text: "已初始化变量的初始值", addr: "Flash（启动时拷贝）", cls: "c" },
            { name: ".data", text: "已初始化全局/静态变量", addr: "RAM", cls: "d" },
            { name: ".bss", text: "未初始化变量（启动清零）", addr: "RAM", cls: "e" }
          ]
        },
        code: {
          lang: "c",
          title: "sections.c",
          src: `#include <stdint.h>

int g_inited = 42;             /* .data：Flash 存初值，启动拷贝到 RAM */
int g_zero;                    /* .bss：启动时清零 */
const int g_const = 100;       /* .rodata：只读，放 Flash */
static int s_count;            /* .bss */

const char *msg = "hello";     /* 指针在 .data，字符串在 .rodata */

void demo(void)
{
    int local = 1;             /* 栈 */
    static int s_local;        /* .bss，生命周期贯穿程序 */

    (void)local;
    (void)s_local;
}

/* 启动文件里通常有类似逻辑（由链接脚本提供符号） */
extern uint32_t _sdata[], _edata[], _sidata[];
extern uint32_t _sbss[], _ebss[];

void copy_data_and_clear_bss(void)
{
    uint32_t *src = _sidata;
    for (uint32_t *dst = _sdata; dst < _edata; ) *dst++ = *src++;
    for (uint32_t *dst = _sbss; dst < _ebss; ) *dst++ = 0;
}`
        },
        codeNote: "链接脚本里的符号（_sdata、_edata 等）由启动文件使用，名字和顺序必须与脚本一致。",
        apply: `<p>优化固件体积时，我会看 map 文件的段大小：.rodata 太大通常是字符串表或常量数组，可以移到外部 Flash 或压缩；.bss 太大说明全局缓冲过多，考虑复用。</p>
<p>大数组如果初始化为全 0，放 .bss 不占 Flash；如果初始化非 0，会占用 Flash 存初值，要注意体积。</p>`,
        pitfalls: [
          "<b>以为未初始化变量在 Flash 里。</b>实际只占 RAM。",
          "<b>大数组初始化非 0。</b>Flash 被初值占满。",
          "<b>启动文件没清 .bss。</b>全局变量是随机值。",
          "<b>把 const 数据放 RAM。</b>浪费 RAM，应该放 Flash。"
        ],
        follow: [
          ["const 变量一定在 Flash 吗？", "不一定，取决于链接脚本和是否取地址；在 MCU 上通常放 .rodata（Flash），但局部 const 可能在栈上。"],
          ["如何查看各段大小？", "编译后看 map 文件，或用 size 命令查看 text/data/bss 的大小。" ]
        ]
      },

      {
        id: "MM-13",
        chapter: "layout",
        topic: "scatter",
        title: "分散加载文件（scatter file）是做什么的？什么时候需要它？",
        diff: "高级",
        freq: "进阶",
        type: "链接配置题",
        point: "描述代码和数据放到哪些物理地址，支持多块不连续内存、外部 RAM、Overlay。",
        q: `<p>面试官：板子上有内部 SRAM 和外部 SDRAM，怎么把特定函数或数据放到指定地址？</p>`,
        exam: `<p>考察链接配置能力。能说出“分散加载/链接脚本、段属性、指定地址”，就很好。</p>`,
        core: `<p>分散加载或链接脚本描述每个段放在哪个 Flash 或 RAM 地址；可用 __attribute__((section)) 把函数或缓冲放到指定段，实现 RAM 执行、外部内存或固定参数区。</p>`,
        answer: `<p><b>分散加载（scatter file）</b>是 ARM 工具链的链接配置，描述：</p>
<ul>
<li>每个加载域（load region）放在哪个物理地址；</li>
<li>每个运行域（execution region）在运行时位于哪里；</li>
<li>哪些段（.text、.data、自定义段）放到哪个区域。</li>
</ul>
<p>GCC 用链接脚本（.ld）实现同样的功能，通过 <code>MEMORY</code> 定义内存区域，<code>SECTIONS</code> 指定段的放置。</p>
<p><b>典型用途：</b></p>
<ul>
<li>把中断向量表放到 Flash 起始；</li>
<li>把频繁执行的代码放到 RAM（提高速度，避免 Flash 等待）；</li>
<li>把大缓冲区放到外部 SDRAM；</li>
<li>把配置参数固定到某个 Flash 扇区；</li>
<li>Overlay：多个函数共用同一块 RAM，不同时运行。</li>
</ul>
<p><b>使用方法：</b>给函数或变量加段属性，如 <code>__attribute__((section(".ramfunc")))</code>，再在链接脚本里把该段放到 RAM 区域，启动时从 Flash 拷贝过去。</p>`,
        principle: `<p>链接器需要知道每个段放在哪个地址，才能生成正确的地址引用。默认布局把所有段连续放置，但实际硬件可能有多个不连续的内存区域，必须通过脚本描述。</p>
<p>“加载地址”和“运行地址”可以不同：代码存在 Flash（加载地址），运行时拷贝到 RAM（运行地址），启动代码负责搬运。</p>`,
        fig: {
          type: "table",
          title: "常见段放置需求",
          tag: "scatter",
          head: ["内容", "加载地址", "运行地址", "目的"],
          rows: [
            ["向量表", "Flash 0x08000000", "同左", "复位入口"],
            ["普通代码", "Flash", "Flash", "节省 RAM"],
            ["RAM 函数", "Flash", "SRAM", "提高速度"],
            ["大缓冲", "—", "外部 SDRAM", "扩展容量"],
            ["参数区", "Flash 固定扇区", "同左", "掉电保存"]
          ]
        },
        code: {
          lang: "c",
          title: "linker.ld",
          src: `/* GCC 链接脚本片段：定义内存区域 */
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
    SDRAM (rwx) : ORIGIN = 0xC0000000, LENGTH = 8M
}

SECTIONS
{
    .text : {
        KEEP(*(.isr_vector))
        *(.text*)
        *(.rodata*)
    } > FLASH

    /* 需要从 Flash 拷贝到 RAM 运行的代码 */
    .ramfunc : {
        _sramfunc = .;
        *(.ramfunc*)
        _eramfunc = .;
    } > RAM AT > FLASH

    .data : { ... } > RAM AT > FLASH
    .bss  : { ... } > RAM

    /* 大缓冲区放到外部 SDRAM */
    .sdram (NOLOAD) : {
        *(.sdram_buf)
    } > SDRAM
}`
        },
        codeNote: "RAM 函数的拷贝需要启动代码完成，链接脚本只定义符号，不会自动搬运。",
        apply: `<p>我做高速采样时，把 ADC 中断处理函数放到 RAM 运行，避免 Flash 等待周期导致的抖动；用 section 属性标记，启动时拷贝。</p>
<p>大图像缓冲区放到外部 SDRAM，链接脚本单独划分区域，避免挤占内部 RAM。</p>`,
        pitfalls: [
          "<b>只改脚本不改启动代码。</b>RAM 函数没有被拷贝，运行的是 Flash 里的旧内容或垃圾。",
          "<b>段名拼写不一致。</b>变量没有放到预期区域。",
          "<b>地址重叠。</b>链接报错或运行时数据被覆盖。",
          "<b>忘记 NOLOAD。</b>启动时试图从 Flash 加载 SDRAM 初值，失败。"
        ],
        follow: [
          ["加载地址和运行地址为什么要分开？", "代码可以存在便宜的 Flash 里，运行时拷贝到快速的 RAM 执行；启动代码负责搬运，链接器负责生成两套地址。"],
          ["如何确认变量真的放到了指定段？", "看 map 文件的段分配，或用调试器查看变量地址是否落在目标区域。" ]
        ]
      },

      {
        id: "MM-14",
        chapter: "layout",
        topic: "mpu",
        title: "MPU 怎么防止内存越界？区域配置有哪些限制？",
        diff: "高级",
        freq: "中频",
        type: "保护机制题",
        point: "按区域配置基址、大小、权限；大小必须是 2 的幂且对齐，区域数量有限。",
        q: `<p>面试官：想让一个任务只能访问自己的栈和缓冲区，越界就复位，怎么用 MPU 实现？</p>`,
        exam: `<p>考察 MPU 的实际配置。能说出“区域对齐、权限、背景区域、越界触发 MemManage”，就很好。</p>`,
        core: `<p>MPU 按区域设基址、大小和读写执行权限，任务切换时更新区域，越权触发 MemManage；区域大小必须是 2 的幂且数量有限，没有地址翻译。</p>`,
        answer: `<p><b>配置步骤：</b></p>
<ol>
<li>规划内存区域：代码区（只读可执行）、只读数据、每个任务的栈和缓冲区、外设区（仅特权可访问）；</li>
<li>为每个区域设置基址、大小、权限（读/写/执行，特权/用户）；</li>
<li>使能 MPU 和背景区域（PRIVDEFENA），让未覆盖的区域按默认权限访问；</li>
<li>任务切换时更新 MPU 区域，把当前任务的栈设为可访问，其它任务的区域设为不可访问；</li>
<li>越界访问触发 MemManage Fault，在 Handler 里终止任务或复位。</li>
</ol>
<p><b>限制：</b></p>
<ul>
<li>区域大小必须是 2 的幂，且基址按大小对齐；</li>
<li>区域数量有限（通常 8 或 16 个），需要仔细规划；</li>
<li>区域可以重叠，编号高的优先级高；</li>
<li>没有地址翻译，不能实现虚拟内存；</li>
<li>配置错误可能导致合法访问被拒绝，调试时要看 MMFAR。</li>
</ul>`,
        principle: `<p>MPU 在总线访问阶段检查地址是否落在某个区域、权限是否允许。越权访问被阻止并触发异常，实现故障隔离。</p>
<p>区域大小必须是 2 的幂，是因为硬件用位掩码比较地址，简化逻辑、降低成本。</p>`,
        fig: {
          type: "table",
          title: "典型 MPU 区域规划",
          tag: "mpu",
          head: ["区域", "地址范围", "权限", "说明"],
          rows: [
            ["代码", "Flash", "只读 + 可执行", "防止自修改"],
            ["只读数据", "Flash", "只读", "常量"],
            ["当前任务栈", "SRAM 某段", "用户可读写", "任务私有"],
            ["其它任务", "SRAM 其它段", "禁止访问", "隔离"],
            ["外设", "0x40000000", "仅特权", "防止用户误操作"]
          ]
        },
        code: {
          lang: "c",
          title: "mpu_region.c",
          src: `#include <stdint.h>

/* 配置一个 MPU 区域：基址、大小（2 的幂）、权限 */
int mpu_config(uint32_t region, uint32_t base, uint32_t size, uint32_t attr)
{
    /* 检查对齐：基址必须按大小对齐 */
    if (base & (size - 1u)) return -1;

    /* 计算 SIZE 字段：log2(size) - 1 */
    uint32_t sz = 0;
    while ((1u << (sz + 1)) < size) sz++;

    MPU->RNR  = region;
    MPU->RBAR = base & MPU_RBAR_ADDR_Msk;
    MPU->RASR = (1u << MPU_RASR_ENABLE_Pos) |
                attr |
                ((sz & 0x1Fu) << MPU_RASR_SIZE_Pos);
    return 0;
}

/* 任务切换时更新区域：只允许访问当前任务的栈 */
void mpu_switch_task(uint32_t stack_base, uint32_t stack_size)
{
    mpu_config(0, stack_base, stack_size,
               MPU_RASR_AP_FULL_ACCESS | MPU_RASR_XN_Msk);

    __asm volatile ("dsb 0xF" ::: "memory");
    __asm volatile ("isb 0xF" ::: "memory");
}`
        },
        codeNote: "切换任务时只更新必要的区域，避免每次重配全部区域带来的开销。",
        apply: `<p>我做安全设备时，把密钥区设为仅特权可读，任务即使有缓冲区溢出也读不到密钥；任务栈之间互相隔离，一个任务越界不会破坏另一个任务。</p>
<p>调试 MPU 问题时，先看 MemManage 的 MMFAR（出错地址），再对照区域配置，通常能快速发现是大小算错还是权限配错。</p>`,
        pitfalls: [
          "<b>区域大小不是 2 的幂。</b>配置无效。",
          "<b>基址未对齐。</b>区域覆盖范围错误。",
          "<b>忘记使能 MPU。</b>配置写了但不生效。",
          "<b>区域重叠且优先级没考虑。</b>访问权限与预期不符。"
        ],
        follow: [
          ["MPU 能防止栈溢出吗？", "可以，把栈边界下方设为不可访问，溢出立即触发 MemManage；但只能保护区域边界，不能发现栈内的越界写。"],
          ["MPU 和 TrustZone 有什么区别？", "MPU 做区域权限检查，TrustZone 把系统分成安全/非安全两个世界，提供更强的隔离和安全服务调用。" ]
        ]
      },

      {
        id: "MM-15",
        chapter: "layout",
        topic: "cache",
        title: "DMA 和 Cache 为什么会不一致？怎么维护？",
        diff: "高级",
        freq: "高频",
        type: "原理分析题",
        point: "DMA 直接访问内存，绕过 Cache；CPU 可能读到旧缓存，或 DMA 读到未写回的数据。",
        q: `<p>面试官：带 Cache 的 MCU 上，DMA 接收的数据 CPU 读不到，为什么？怎么解决？</p>`,
        exam: `<p>考察 Cache 一致性。能说出“clean/invalidate、按行对齐、non-cache 区域”，就很好。</p>`,
        core: `<p>DMA 不经过 Cache，接收完成后 CPU 读之前要 invalidate，发送前 CPU 写之后要 clean；缓冲区按 Cache 行对齐，或直接放 non-cache 区。</p>`,
        answer: `<p><b>问题根源：</b>CPU 访问内存时先查 Cache，DMA 直接访问物理内存，不经过 Cache。两者可能看到不同的数据：</p>
<ul>
<li><b>DMA 写内存，CPU 读：</b>CPU 可能命中旧缓存，读到 DMA 写入前的数据；</li>
<li><b>CPU 写内存，DMA 读：</b>CPU 的写可能还在 Cache 里没写回内存，DMA 读到旧数据。</li>
</ul>
<p><b>解决方法：</b></p>
<ul>
<li><b>DMA 写内存后、CPU 读之前：</b>invalidate（无效化）对应 Cache 行，强制 CPU 下次从内存读；</li>
<li><b>CPU 写内存后、DMA 读之前：</b>clean（清理/写回）对应 Cache 行，把数据写回内存；</li>
<li><b>按 Cache 行对齐：</b>clean/invalidate 以行为单位，缓冲区首尾要对齐，避免影响相邻数据；</li>
<li><b>把缓冲区放到 non-cache 区域：</b>MPU 配置该区域不可缓存，彻底避免一致性问题，但性能下降；</li>
<li><b>使用硬件一致性总线：</b>部分多核芯片支持硬件维护，成本更高。</li>
</ul>
<p><b>顺序：</b>CPU 写数据 → clean → 启动 DMA；DMA 完成 → invalidate → CPU 读数据。</p>`,
        principle: `<p>Cache 是 CPU 和内存之间的高速缓冲，保存最近访问的数据副本。DMA 是独立的主设备，直接读写内存，不经过 CPU 的 Cache，因此两者可能不同步。</p>
<p>clean 把 Cache 里的脏数据写回内存；invalidate 把 Cache 行标记为无效，下次访问重新从内存加载。</p>`,
        fig: {
          type: "flow",
          title: "DMA 与 Cache 的一致性维护",
          tag: "cache coherency",
          items: [
            { t: "CPU 写缓冲", d: "数据可能还在 Cache" },
            { t: "clean", d: "写回内存，DMA 才能读到" },
            { t: "启动 DMA", d: "DMA 直接访问内存" },
            { t: "DMA 完成", d: "内存已更新，Cache 仍是旧值" },
            { t: "invalidate", d: "CPU 重新从内存加载" }
          ]
        },
        code: {
          lang: "c",
          title: "cache_dma.c",
          src: `#include "stm32h7xx_hal.h"

/* 发送：CPU 写数据后 clean，再启动 DMA */
void dma_send(const uint8_t *buf, uint32_t len)
{
    /* 缓冲区必须按 Cache 行对齐，长度按行向上取整 */
    SCB_CleanDCache_by_Addr((uint32_t *)buf, (int32_t)len);
    __DSB();

    HAL_DMA_Start(&hdma, (uint32_t)buf, (uint32_t)&UART->DR, len);
}

/* 接收：DMA 完成后 invalidate，再读数据 */
void dma_recv_done(uint8_t *buf, uint32_t len)
{
    SCB_InvalidateDCache_by_Addr((uint32_t *)buf, (int32_t)len);
    __DSB();

    /* 现在 CPU 读到的是 DMA 写入的新数据 */
    process(buf, len);
}`
        },
        codeNote: "clean/invalidate 的地址和长度要按 Cache 行（通常 32 字节）对齐，否则可能影响相邻变量。",
        apply: `<p>我在 H7 上做以太网接收时，DMA 描述符和缓冲区都按 32 字节对齐，收到帧后先 invalidate 再解析，否则经常读到上一帧的数据。</p>
<p>对频繁小数据，我把缓冲区放到 non-cache 区域，省去维护操作，用性能换简单。</p>`,
        pitfalls: [
          "<b>只 invalidate 不 clean。</b>发送方向数据没写回。",
          "<b>地址不对齐。</b>影响相邻数据，出现随机错误。",
          "<b>忘记 DSB。</b>维护操作还没完成就启动 DMA。",
          "<b>以为所有 MCU 都有 Cache。</b>M3/M4 通常没有，不需要维护。"
        ],
        follow: [
          ["invalidate 会不会丢掉 CPU 还没写回的数据？", "会，如果 Cache 行是脏的，invalidate 直接丢弃，数据就丢了；所以接收方向要确保该区域没有 CPU 未写回的数据。"],
          ["为什么缓冲区要按 Cache 行对齐？", "维护操作以行为单位，如果缓冲区跨越两行，可能把相邻变量也 invalidate 或 clean，造成数据损坏。" ]
        ]
      },

      {
        id: "MM-16",
        chapter: "layout",
        topic: "barrier",
        title: "编译器优化会怎样改变内存访问顺序？怎么阻止？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "编译器可能重排、合并、删除访存；volatile 和编译器屏障用于约束，硬件屏障约束 CPU。",
        q: `<p>面试官：代码里先写数据再置标志，开了 -O2 后对方却先看到标志，为什么？</p>`,
        exam: `<p>考察对编译器和内存模型的理解。能区分编译器屏障与硬件屏障，就很好。</p>`,
        core: `<p>编译器会重排访存、合并或删除它认为无用的读写，volatile 只保证每次真实访问、不保证顺序；跨线程或 DMA 要加编译屏障，并用 DMB 或 release 语义保证先写数据再置标志。</p>`,
        answer: `<p><b>编译器会做什么：</b></p>
<ul>
<li>把多次访问合并（如连续写同一变量只保留最后一次）；</li>
<li>把循环里的不变访问提到循环外；</li>
<li>删除“看起来无用”的读写；</li>
<li>重排没有依赖关系的访存，以提高流水线效率。</li>
</ul>
<p>所以在“写数据 → 写标志”的代码里，编译器可能把标志的写提前，或者把数据的写延后，导致对方看到标志时数据还没准备好。</p>
<p><b>volatile 的作用：</b>告诉编译器该变量可能被外部改变，必须每次实际访问，不能缓存到寄存器、不能删除。但它<b>不阻止不同 volatile 变量之间的重排</b>，也不保证 CPU 层面的顺序。</p>
<p><b>编译器屏障：</b><code>__asm volatile ("" ::: "memory")</code>，告诉编译器不要跨越此处重排内存访问。</p>
<p><b>硬件屏障：</b>DMB/DSB，约束 CPU 的访存顺序（见内存屏障题目）。</p>
<p><b>正确写法：</b>写数据 → 编译器屏障 → 写标志；读侧：读标志 → 编译器屏障 → 读数据。</p>`,
        principle: `<p>编译器只保证单线程语义下的结果正确，不考虑其它观察者（DMA、中断、其它核）。所以跨上下文共享数据时，必须显式告诉编译器“这里的顺序很重要”。</p>
<p>volatile 是“访问语义”的约束，屏障是“顺序语义”的约束，两者解决不同问题。</p>`,
        fig: {
          type: "table",
          title: "三种约束的作用范围",
          tag: "memory ordering",
          head: ["机制", "约束对象", "能解决"],
          rows: [
            ["volatile", "编译器", "不缓存、不删除访问"],
            ["编译器屏障", "编译器", "不重排访存"],
            ["DMB", "CPU", "不重排访存（不等待完成）"],
            ["DSB", "CPU", "不重排，且等待访存真正完成"],
            ["原子操作", "编译器和 CPU", "原子性与顺序"]
          ]
        },
        code: {
          lang: "c",
          title: "compiler_barrier.c",
          src: `#include <stdint.h>

#define COMPILER_BARRIER() __asm volatile ("" ::: "memory")

volatile uint32_t g_flag;
uint32_t g_data[16];

/* 生产者：先写数据，再置标志 */
void produce(void)
{
    for (int i = 0; i < 16; i++) g_data[i] = (uint32_t)i;

    COMPILER_BARRIER();       /* 防止数据写被移到标志之后 */
    g_flag = 1;
}

/* 消费者：先看标志，再读数据 */
int consume(void)
{
    if (g_flag != 1) return 0;

    COMPILER_BARRIER();       /* 防止数据读被移到标志之前 */
    return (int)g_data[0];
}`
        },
        codeNote: "单核 MCU 上编译器屏障通常足够；多核或 DMA 场景还需要硬件屏障。",
        apply: `<p>我做双缓冲切换时，先填充后台缓冲区，加编译器屏障，再切换索引；读侧先读索引，加屏障，再访问缓冲区。这样不会读到半成品。</p>
<p>调试这类问题时，对比 -O0 和 -O2 的行为差异，往往能确认是编译器重排导致的。</p>`,
        pitfalls: [
          "<b>以为 volatile 能保证顺序。</b>它只保证访问不被优化。",
          "<b>只在写侧加屏障。</b>读侧也需要，否则读可能提前。",
          "<b>用普通变量做跨上下文标志。</b>可能被缓存到寄存器。",
          "<b>多核只加编译器屏障。</b>CPU 仍可能乱序。"
        ],
        follow: [
          ["为什么中断和主循环共享的变量要加 volatile？", "主循环可能把变量缓存在寄存器里，中断修改后主循环看不到；volatile 强制每次从内存读取。"],
          ["C11 的 atomic 能替代屏障吗？", "可以。C11 用 <code>&lt;stdatomic.h&gt;</code> 的 <code>_Atomic</code> 类型和 <code>atomic_store_explicit</code> 等接口，配合 <code>memory_order_*</code> 表达明确的内存序，比手写屏障更安全（<code>std::atomic</code> 属于 C++11，别混淆）。代价是部分嵌入式工具链支持不完整。" ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第三批：RAM 占用优化） ---------------- */
  EIK.extend("memory-management", {
    chapters: [
      {
        id: "stack",
        topics: [
          { id: "opt", title: "RAM 占用优化" }
        ]
      }
    ],
    questions: [
      {
        id: "MM-17",
        chapter: "stack",
        topic: "opt",
        title: "RAM 快用完了，代码里有哪些省 RAM 的办法？",
        diff: "高级",
        freq: "高频",
        type: "工程实践题",
        point: "从存储位置、数据布局、缓冲复用、工具链四个方向压 RAM 的具体手段，以及各自的代价。",
        q: `<p>面试官：项目 RAM 已经用到 90%，硬件不能改，你从代码里还能挤出多少空间？按什么顺序下手？</p>`,
        exam: `<p>考察优化的系统性。能先看 map 文件定位大头、再分方向下手，比背一堆技巧更有说服力。</p>`,
        core: `<p>先看 map 文件找最大的 RAM 占用，再把常量加 const 下沉到 Flash、复用生命周期不重叠的缓冲、压缩结构体对齐、按高水位收任务栈；还可用 -Os 和 --gc-sections 删无用代码。</p>`,
        answer: `<p><b>第一步不是改代码，是看 map 文件</b>，搞清楚 RAM 到底被谁占了：.data、.bss、heap、stack 各多少，哪几个符号最大。很多时候是某个 4KB 的全局缓冲或一张字库表，定位到就解决一半。</p>
<p><b>四个方向，按性价比排序：</b></p>
<ul>
<li><b>常量下沉到 Flash</b>：字符串、查表、字库、配置表加 const，进 .rodata 只占 Flash 不占 RAM。注意要真的 const，否则照样在 .data 里。</li>
<li><b>缓冲复用</b>：接收缓冲、解析缓冲、DMA 缓冲如果生命周期不重叠，用 union 让它们共用一块内存；双缓冲在低速场景可以降级成分块单缓冲。这一项常常能省几百字节到几 KB。</li>
<li><b>数据布局</b>：结构体字段按大小降序排减少 padding；多个 bool 标志打包成位域或一个 uint16 的位；能用 uint8_t 就别用 int。对大数组尤其有效。</li>
<li><b>栈与堆</b>：用 uxTaskGetStackHighWaterMark 把任务栈从“拍脑袋的 1KB”收到实测值 +30%；堆用固定块内存池替 malloc，省元数据也避免碎片；去掉大局部数组和递归。</li>
</ul>
<p><b>工具链层面还有几招：</b>-Os 优化尺寸；-ffunction-sections -fdata-sections 配合 --gc-sections 删掉没被引用的函数和数据；用 newlib-nano 替换标准库，光 printf 就能省几 KB；如果用了 %f 打印浮点，链接器会拉进几十 KB 的软浮点库，能不用就不用。</p>
<p><b>最后是架构层面：</b>大只读表（字库、图片）放外部 SPI Flash 或 QSPI 并 XIP 执行；大缓冲放外部 SRAM。这属于改硬件方案了，作为备选。</p>`,
        principle: `<p>RAM 的构成要分清：.data 有初值，既占 Flash 又占 RAM（启动时从 Flash 拷过来）；.bss 是零初始化，只占 RAM；heap 和 stack 是运行时才用的区域，链接时只预留。</p>
<p>所以“把变量改成 const”省的是 RAM（从 .data 挪到 .rodata），而“把变量改成 0 初始化”省的是 Flash（从 .data 挪到 .bss），两者方向不同。理解这一点才能有针对性地优化。</p>
<p>优化有代价：union 复用会让调试变难（同一块内存含义随阶段变化）；位域打包会牺牲访问速度且不利于原子操作；-Os 可能让热点代码变慢。所以应该在 RAM 真的紧张时才做，并保留清晰的注释。</p>`,
        fig: {
          type: "table",
          title: "省 RAM 手段与代价",
          tag: "ram-opt",
          head: ["手段", "典型收益", "代价"],
          rows: [
            ["常量加 const 进 Flash", "整张表搬走，几百 B~几 KB", "几乎无，注意别被误改"],
            ["union 复用缓冲", "省下一整块缓冲", "调试时含义随阶段变化"],
            ["结构体按大小排序", "每结构省 10%~30%", "需重排字段，注意兼容性"],
            ["标志位打包", "几十字节", "访问变慢，不利于原子操作"],
            ["任务栈收紧", "每任务几百 B", "余量不足会栈溢出"],
            ["-Os + gc-sections", "几 KB 代码，间接省栈", "热点代码可能变慢"],
            ["newlib-nano", "几 KB（printf 相关）", "部分格式化功能缺失"]
          ]
        },
        code: {
          lang: "c",
          title: "ram_save.c",
          src: `/* 反面例子：字段顺序随意，编译器要插 6 字节 padding */
typedef struct {
    uint8_t  id;        /* 1 字节，后面补 3 字节 */
    uint32_t value;     /* 4 字节 */
    uint8_t  flag;      /* 1 字节，后面补 3 字节 */
    uint32_t ts;        /* 4 字节 */
} bad_t;                /* sizeof = 16 */

/* 正面例子：按大小降序排列，只剩尾部对齐的 2 字节 */
typedef struct {
    uint32_t value;
    uint32_t ts;
    uint8_t  id;
    uint8_t  flag;
} good_t;               /* sizeof = 12，省 25% */

/* 缓冲复用：同一块内存在不同阶段承担不同角色 */
typedef union {
    uint8_t rx_raw[512];        /* 阶段一：DMA 直接写入的原始字节 */
    struct {
        uint8_t cmd;
        uint8_t len;
        uint8_t payload[510];
    } frame;                     /* 阶段二：按协议解析后的视图 */
} io_buf_t;

static io_buf_t g_io;            /* 512 字节同时充当两个角色 */

/* 标志位打包：8 个 bool 从 8 字节压到 1 字节 */
typedef struct {
    uint8_t wifi_ok   : 1;
    uint8_t mqtt_ok   : 1;
    uint8_t ota_busy  : 1;
    uint8_t cfg_dirty : 1;
    uint8_t rsv       : 4;
} dev_flags_t;`
        },
        codeNote: "union 复用的前提是“两个角色不会同时需要”。一旦有并发访问（DMA 还在写、CPU 已经开始解析），就会出现数据被覆盖的 bug，这类问题比省下来的内存难处理得多。用之前必须确认生命周期不重叠。",
        apply: `<p>做过一个 RAM 只有 20KB 的 M0 项目，功能加到一个阶段后 .bss 占了 18KB，随时可能栈溢出。排查 map 发现是一张 6KB 的汉字字库表被定义成了全局数组。加了 const 之后立刻降到 12KB，一行代码解决。</p>
<p>另一轮优化是把三个独立缓冲（串口接收、协议解析、显示屏刷新）改成 union 复用，省了 2KB；再加结构体重排和标志位打包，又省了 400 字节。整个过程没动任何业务逻辑，但前提是先看 map 知道大头在哪。</p>
<p>也踩过坑：为了省空间把 -Os 打开，结果一个时序敏感的加密函数被优化得变慢，看门狗超时。所以热点代码要单独用 -O2 或加 __attribute__((optimize))。</p>`,
        pitfalls: [
          "<b>不看 map 文件就盲目改代码。</b>省了几十字节，真正的大头还在那。",
          "<b>以为加了 const 就一定进 Flash。</b>如果取地址传给非 const 指针，或者编译器判断要可写，仍可能留在 RAM。",
          "<b>union 复用有并发。</b>DMA 与 CPU 同时访问同一块，数据被覆盖，问题极难定位。",
          "<b>把任务栈压到极限。</b>余量不足时偶发栈溢出，表现是随机死机，查起来比省下的内存代价大得多。"
        ],
        follow: [
          ["怎么快速找到 RAM 占用最大的符号？", "看编译生成的 .map 文件，找 .bss 和 .data 段按大小排序的符号表；或者用 nm/size 工具加脚本排序。这是最快定位大头的办法。"],
          ["位域和位运算打包哪个好？", "位域写法直观但访问要读改写、不可原子、布局依赖编译器；位运算（一个 uint16 加掩码宏）访问明确、可原子操作，更适合寄存器和多任务共享的标志。"],
          ["为什么用了 printf 浮点会暴涨？", "格式化浮点需要软浮点库和完整的格式化引擎，newlib 下常带进来几十 KB 代码和数据。用整数定点打印（先乘 100 再自己插小数点）能完全避免。"]
        ]
      }
    ]
  });
})();
