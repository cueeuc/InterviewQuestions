/* ============================================================
   12 嵌入式调试与故障排查
   ============================================================ */
(function () {
  "use strict";

  EIK.register("debugging", {
    chapters: [
      {
        id: "boot",
        title: "启动与异常",
        topics: [
          { id: "nostart", title: "程序无法启动" },
          { id: "hardfault", title: "HardFault 定位" },
          { id: "runaway", title: "跑飞与复位" }
        ]
      },
      {
        id: "periph",
        title: "外设与通信异常",
        topics: [
          { id: "uart", title: "串口乱码" },
          { id: "i2c", title: "I2C / SPI 异常" },
          { id: "clock", title: "时钟与定时异常" }
        ]
      },
      {
        id: "tool",
        title: "调试工具与方法",
        topics: [{ id: "tools", title: "SWD 与逻辑分析仪" }]
      }
    ],

    questions: [
      {
        id: "G-01",
        chapter: "boot",
        topic: "nostart",
        title: "程序烧录后完全不运行，怎么一步步排查？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "从供电、复位、时钟、启动模式到向量表，建立可验证的排查顺序。",
        q: `<p>面试官：板子烧录固件后<strong>完全没有反应</strong>，串口没输出，LED 不亮。你会怎么排查？请给出有顺序的步骤。</p>`,
        exam: `<p>考察系统化排查能力，而不是“试试这个试试那个”。能给出“先硬件后软件、先电源后时钟、先最小系统后外设”的顺序，并且每一步都有明确的验证方法，说明你独立解决过问题。</p>`,
        core: `<p>按“硬件 → 启动 → 时钟 → 代码”顺序，每步都能验证。① 量电源：3.3V 是否正常、纹波是否过大、VDDA 是否接、去耦有没有焊，电源不对后面全白搭；② 看复位：NRST 是否一直为低（被拉死）、复位电容过大导致上电复位时间过长；③ 确认启动模式：BOOT0/BOOT1 电平是否正确，是否从 Flash 启动而不是 ISP；④ 确认下载成功：读回 Flash 校验，或用调试器连上看 PC 停在哪；⑤ 看时钟：HSE 是否起振（示波器看波形），起振失败代码可能卡在等 HSERDY 的循环；⑥ 看代码：是否卡在 SystemInit、是否进 HardFault、向量表前两个字是否正确。</p>`,
        answer: `<p>我会按“硬件 → 启动 → 时钟 → 代码”的顺序，每一步都要能验证。</p>
<p>第一步，量电源：3.3V 是否正常、纹波是否过大、VDDA 是否接、去耦电容是否焊了。电源不对，后面全白搭。</p>
<p>第二步，看复位：NRST 是否一直为低（复位被拉死）、复位电容是否过大导致上电复位时间过长。</p>
<p>第三步，确认启动模式：BOOT0/BOOT1 引脚电平是否正确，是否从 Flash 启动而不是从系统存储器（ISP）启动。</p>
<p>第四步，确认下载成功：读回 Flash 校验，或者用调试器连上看 PC 停在哪里。</p>
<p>第五步，看时钟：HSE 是否起振（示波器看晶振波形），如果起振失败代码可能卡在等待 HSERDY 的循环里。</p>
<p>第六步，看代码：是否在 <code>SystemInit</code> 里卡死、是否进 HardFault、向量表前两个字是否正确。</p>`,
        principle: `<p>“完全不运行”通常不是代码逻辑问题，而是更底层的东西：供电、复位、时钟、启动配置。这些是“程序能不能开始跑”的前提，必须先排除。</p>
<p>调试器能连上但程序不跑，说明 SWD 正常、内核供电正常，问题在启动配置或代码；调试器都连不上，说明硬件层面就有问题。</p>`,
        fig: {
          type: "flow",
          title: "不启动的排查顺序",
          tag: "troubleshooting",
          items: [
            { t: "量电源", d: "3.3V / VDDA" },
            { t: "查复位", d: "NRST 电平" },
            { t: "确认启动模式", d: "BOOT0/1" },
            { t: "验证烧录", d: "读回校验" },
            { t: "看时钟", d: "HSE 起振" },
            { t: "查代码", d: "PC / 向量表" }
          ]
        },
        apply: `<p>几个快速判断技巧：</p>
<ul>
<li>用调试器暂停，看 PC 停在哪个地址。停在 <code>0x1FFFxxxx</code> 说明进了系统存储器（ISP 模式），BOOT0 接错了；停在 <code>0xFFFFFFFE</code> 说明 HardFault。</li>
<li>读地址 0 和 4，确认栈顶在 RAM 范围、复位向量在 Flash 范围。如果都是 0xFFFFFFFF，说明 Flash 是空的，烧录没成功。</li>
<li>把 <code>main</code> 第一行改成翻转 GPIO，用示波器看有没有波形，能快速区分“没跑到 main”和“跑到了但串口没配好”。</li>
</ul>`,
        pitfalls: [
          "<b>一上来就怀疑代码。</b>大部分“不启动”是电源、复位、BOOT 引脚的问题，代码还没开始执行。",
          "<b>忽略 VDDA 和去耦电容。</b>模拟电源没接，ADC 不准；去耦缺失，高频下电源抖动导致随机复位。",
          "<b>用错启动文件或链接脚本。</b>向量表地址不对，复位后直接跑飞。"
        ],
        follow: [
          [
            "调试器连不上怎么办？",
            "检查 SWDIO/SWCLK 接线、目标板供电、复位引脚是否被拉低；把下载速度降到 1MHz 以下；用 connect under reset 模式；确认芯片没有被读保护。"
          ],
          [
            "如何确认 HSE 是否起振？",
            "用示波器看晶振引脚（探头要选 10x，负载电容会影响起振）；或者读 RCC_CR 的 HSERDY 位；也可以在代码里加超时，起振失败就切回 HSI 并点亮错误灯。"
          ],
          [
            "为什么程序在调试器下正常，脱机就不跑？",
            "常见原因：调试器初始化了某些外设或时钟；代码依赖调试器提供的延时；看门狗在脱机后生效；或者 Flash 等待周期配置不对，脱机后取指出错。"
          ]
        ]
      },

      {
        id: "G-02",
        chapter: "boot",
        topic: "hardfault",
        title: "HardFault 怎么定位到具体的代码行？",
        diff: "高级",
        freq: "高频",
        type: "故障排查题",
        point: "栈帧分析、CFSR/HFSR/MMFAR/BFAR 寄存器，以及从 LR 和 PC 反查代码。",
        q: `<p>面试官：程序跑着跑着进了 <strong>HardFault</strong>，怎么定位是哪一行代码出的问题？CFSR 寄存器里的信息怎么看？</p>`,
        exam: `<p>这是嵌入式调试的核心技能。能说清“从栈里取出压入的 PC/LR”“CFSR 的 PRECISERR、IMPRECISERR、UNDEFINSTR 等位”“BFAR 给出出错地址”，并且能写出 HardFault 处理函数，说明你真正定位过这类问题。</p>`,
        core: `<p>HardFault 时硬件已把 R0-R3、R12、LR、PC、xPSR 压栈，第一步是从栈里取 PC——那就是出事时正在执行的指令地址。关键是知道用的哪个栈：出错前在中断里用 MSP，在任务里用 PSP，可通过 LR（EXC_RETURN）的 bit2 判断。取出 PC 后用 addr2line 或 IDE 反汇编窗口定位到源文件和行号。</p><p>再看 CFSR：<code>PRECISERR</code> 是精确数据访问错误，此时 BFAR 就是出错地址；<code>IMPRECISERR</code> 是不精确错误（通常是写缓冲导致），要结合其他信息；<code>UNDEFINSTR</code> 未定义指令；<code>INVSTATE</code> 试图执行非 Thumb 代码；<code>UNALIGNED</code> 非对齐访问。</p>`,
        answer: `<p>HardFault 发生时，硬件已经把 R0-R3、R12、LR、PC、xPSR 压栈了。所以第一步是从栈里把 PC 取出来——那就是出错时正在执行的指令地址。</p>
<p>关键是要知道用的是哪个栈：如果出错前在中断里，用的是 MSP；如果在任务里，用的是 PSP。可以通过 LR（EXC_RETURN）的 bit2 判断。</p>
<p>取出 PC 后，用 <code>addr2line</code> 或 IDE 的反汇编窗口定位到源文件和行号。</p>
<p>然后看 CFSR（可配置故障状态寄存器）：<code>PRECISERR</code> 表示精确数据访问错误，此时 <code>BFAR</code> 里就是出错的地址；<code>IMPRECISERR</code> 表示不精确错误（通常是写缓冲导致），需要结合其他信息；<code>UNDEFINSTR</code> 是未定义指令；<code>INVSTATE</code> 是试图执行非 Thumb 代码；<code>UNALIGNED</code> 是非对齐访问。</p>`,
        principle: `<p>“精确”与“不精确”的区别在于错误是否能定位到具体指令。读操作通常是精确的，出错时 PC 就是那条 load 指令；写操作可能经过写缓冲，错误报告会延迟几条指令，此时 PC 已经往后走了，而且硬件<b>不再提供出错地址</b>（IMPRECISERR 时 BFAR 不更新、BFARVALID 也不会置位，读出来只是上次的残留值）。要定位这类问题，得在可疑的写操作之后加 <code>DSB</code> 或立刻读回该地址，把不精确错误逼成精确错误。</p>
<p>如果 CFSR 全为 0，可能是栈溢出导致返回地址被改写，或者跳转到了非法地址（如函数指针为空）。这时要看栈内容是否合理。</p>`,
        fig: {
          type: "table",
          title: "CFSR 常见标志位",
          tag: "register",
          head: ["标志位", "含义", "典型原因"],
          rows: [
            ["IACCVIOL", "取指访问违规", "跳转到不可执行区域"],
            ["DACCVIOL", "数据访问违规", "MPU 保护区域被访问"],
            ["MUNSTKERR", "出栈错误", "栈指针被破坏"],
            ["MSTKERR", "入栈错误", "栈溢出到非法地址"],
            ["PRECISERR", "精确数据总线错误", "访问非法地址，BFAR 有效"],
            ["IMPRECISERR", "不精确总线错误", "写缓冲延迟，BFAR 无效，需 DSB 转换"],
            ["UNDEFINSTR", "未定义指令", "PC 跑飞、执行了数据"],
            ["INVSTATE", "非法状态", "跳转到非 Thumb 地址（LSB=0）"]
          ]
        },
        code: {
          lang: "c",
          title: "hardfault.c",
          src: `#include <stdint.h>
#include <stdio.h>

/* 与硬件压栈顺序一致的结构体 */
typedef struct {
    uint32_t r0;
    uint32_t r1;
    uint32_t r2;
    uint32_t r3;
    uint32_t r12;
    uint32_t lr;
    uint32_t pc;
    uint32_t psr;
} stack_frame_t;

void __attribute__((naked)) HardFault_Handler(void)
{
    __asm volatile (
        "TST LR, #4        \\n"   /* 检查 EXC_RETURN 的 bit2 */
        "ITE EQ            \\n"
        "MRSEQ R0, MSP     \\n"   /* 为 0 用 MSP */
        "MRSNE R0, PSP     \\n"   /* 为 1 用 PSP */
        "B hardfault_report\\n"
    );
}

/* 用 C 打印，方便定位 */
void hardfault_report(stack_frame_t *frame)
{
    uint32_t cfsr  = SCB->CFSR;
    uint32_t hfsr  = SCB->HFSR;
    uint32_t mmfar = SCB->MMFAR;
    uint32_t bfar  = SCB->BFAR;

    printf("\\n=== HardFault ===\\n");
    printf("R0 =0x%08X  R1 =0x%08X  R2 =0x%08X  R3 =0x%08X\\n",
           frame->r0, frame->r1, frame->r2, frame->r3);
    printf("R12=0x%08X  LR =0x%08X  PC =0x%08X  PSR=0x%08X\\n",
           frame->r12, frame->lr, frame->pc, frame->psr);
    printf("CFSR=0x%08X  HFSR=0x%08X  MMFAR=0x%08X  BFAR=0x%08X\\n",
           cfsr, hfsr, mmfar, bfar);

    if (cfsr & (1u << 1))  printf("-> DACCVIOL: MPU 数据访问违规\\n");
    if (cfsr & (1u << 3))  printf("-> MUNSTKERR: 出栈失败\\n");
    if (cfsr & (1u << 4))  printf("-> MSTKERR: 入栈失败，疑似栈溢出\\n");
    if (cfsr & (1u << 7))  printf("-> MMARVALID: MMFAR=0x%08X 有效\\n", mmfar);
    if (cfsr & (1u << 9))  printf("-> PRECISERR: 非法地址访问，BFAR=0x%08X\\n", bfar);
    if (cfsr & (1u << 10)) printf("-> IMPRECISERR: 不精确总线错误（BFAR 不可信）\\n");
    if (cfsr & (1u << 16)) printf("-> UNDEFINSTR: 未定义指令\\n");
    if (cfsr & (1u << 17)) printf("-> INVSTATE: 非法 Thumb 状态\\n");

    /* 停在这里，用调试器看调用栈，或用 addr2line 解析 PC */
    for (;;) { }
}`
        },
        codeNote: `<b>用 addr2line 定位：</b><code>arm-none-eabi-addr2line -e app.elf -f -C 0x08001234</code>，把打印出来的 PC 值代入，就能得到源文件和行号。记得编译时加 <code>-g</code> 保留调试信息。`,
        apply: `<p>实际排查时，先看 PC 落在哪个函数，再看 CFSR 判断原因：访问非法地址就查指针，未定义指令就查函数指针或栈溢出，非对齐就查结构体强转。</p>
<p>如果 PC 看起来是随机值（不在代码区），基本可以确定是栈溢出或野指针把返回地址覆盖了，要去查栈使用和数组越界。</p>`,
        pitfalls: [
          "<b>HardFault 处理函数里用 printf。</b>如果故障原因是栈溢出或堆损坏，printf 可能再次崩溃，什么也打印不出来。应该用寄存器直接写串口或点亮 LED 编码错误类型。",
          "<b>忘记判断 MSP/PSP。</b>取错栈就会解析出完全错误的 PC，误导排查方向。",
          "<b>编译没加 -g 或优化掉了调试信息。</b>addr2line 定位不到行号，只能看反汇编。"
        ],
        follow: [
          [
            "什么是总线错误、用法错误、存储器管理错误？",
            "Cortex-M 把故障分成三类：BusFault（总线访问错误）、UsageFault（未定义指令、非对齐、除零等）、MemManage（MPU 违规）。它们可以单独使能，也可以全部升级为 HardFault。"
          ],
          [
            "为什么写操作会出现不精确错误？",
            "写操作经过写缓冲，CPU 不等写完就继续执行。错误发生时已经过了几条指令，硬件无法精确定位，只能给出 BFAR 地址。解决方法是读回该地址强制同步，或用 DSB 屏障。"
          ],
          [
            "如何复现偶发的 HardFault？",
            "在 HardFault 里记录 PC、LR 和关键变量到非易失存储，重启后读出来分析；同时开启看门狗，让设备能自动恢复。多次记录后统计规律，往往能发现共同的调用路径。"
          ]
        ]
      },

      {
        id: "G-03",
        chapter: "boot",
        topic: "runaway",
        title: "程序跑飞、反复复位，怎么查？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "复位原因寄存器、看门狗、栈溢出与野指针，以及现场保留手段。",
        q: `<p>面试官：设备在现场<strong>偶尔重启</strong>，日志显示是看门狗复位。你会怎么排查？怎么区分是软件跑飞还是硬件干扰？</p>`,
        exam: `<p>考察系统性排查思路。能说清“先读复位原因寄存器”“判断是看门狗、上电还是外部复位”“区分死循环、栈溢出、电源跌落”，并且知道“保留现场”的重要性，说明你处理过现场问题。</p>`,
        core: `<p>先确认复位原因：读 RCC 的 CSR 寄存器，看是看门狗、上电、软件还是外部引脚复位，不同原因排查方向完全不同。</p><p>看门狗复位说明程序卡住或喂狗被阻塞，常见是死等某个标志（外设没响应）、栈溢出跑飞、中断优先级配错导致高优先级中断一直占 CPU、任务死锁。上电复位（POR）要怀疑电源：负载突变电压跌落、电池电量低、纹波过大。外部复位查复位引脚干扰、电容是否合适、按键误触发。</p><p>区分软硬件：复位前把关键状态（PC、任务状态、错误码）写备份寄存器或 Flash，重启后读出来。每次都在同一处卡住是软件问题；位置随机且伴随电源波动，多半是硬件。</p>`,
        answer: `<p>第一步是确认复位原因：读 RCC 的 CSR 寄存器，看是看门狗复位、上电复位、软件复位还是外部引脚复位。不同原因对应完全不同的排查方向。</p>
<p>如果是看门狗复位，说明程序卡住了或者喂狗被阻塞。常见原因：死循环等待某个标志（外设没响应）、栈溢出导致跑飞、中断优先级配置错误导致高优先级中断一直占着 CPU、任务死锁。</p>
<p>如果是上电复位（POR），要怀疑电源：负载突变导致电压跌落、电池电量低、电源纹波过大。</p>
<p>如果是外部复位，检查复位引脚是否有干扰、电容是否合适、是否有按键误触发。</p>
<p>区分软硬件的方法是：在复位前把关键状态（PC、任务状态、错误码）写入备份寄存器或 Flash，重启后读出来。如果每次都在同一个地方卡住，是软件问题；如果位置随机且伴随电源波动，多半是硬件。</p>`,
        principle: `<p>看门狗复位的本质是“喂狗超时”。喂狗超时可能是主循环卡住，也可能是喂狗任务被饿死（优先级太低，高优先级任务一直占 CPU）。所以不能只看“有没有喂狗”，要看“为什么没喂”。</p>
<p>备份寄存器（RTC 域的 BKP 寄存器）在主复位后内容不丢失，是保存复位现场的理想位置，比写 Flash 快且不磨损。</p>`,
        fig: {
          type: "flow",
          title: "复位排查路径",
          tag: "troubleshooting",
          items: [
            { t: "读复位原因", d: "RCC->CSR" },
            { t: "看门狗复位", d: "查喂狗链路" },
            { t: "上电复位", d: "查电源跌落" },
            { t: "外部复位", d: "查 NRST 干扰" },
            { t: "保留现场", d: "BKP / Flash" }
          ]
        },
        code: {
          lang: "c",
          title: "reset_reason.c",
          src: `#include "stm32f1xx_hal.h"

typedef enum {
    RST_UNKNOWN = 0,
    RST_POWER_ON,
    RST_PIN,
    RST_SOFTWARE,
    RST_IWDG,
    RST_WWDG,
    RST_LOW_POWER
} reset_reason_t;

/* 上电后第一时间读，读完要清标志 */
reset_reason_t get_reset_reason(void)
{
    uint32_t csr = RCC->CSR;
    reset_reason_t r = RST_UNKNOWN;

    if (csr & RCC_CSR_PORRSTF)  r = RST_POWER_ON;
    else if (csr & RCC_CSR_PINRSTF) r = RST_PIN;
    else if (csr & RCC_CSR_SFTRSTF) r = RST_SOFTWARE;
    else if (csr & RCC_CSR_IWDGRSTF) r = RST_IWDG;
    else if (csr & RCC_CSR_WWDGRSTF) r = RST_WWDG;

    __HAL_RCC_CLEAR_RESET_FLAGS();
    return r;
}

/* 用备份寄存器保存现场：复位后仍可读 */
#define BKP_MAGIC   0x5A5A
#define BKP_REASON  RTC_BKP_DR1
#define BKP_PC      RTC_BKP_DR2
#define BKP_TASK    RTC_BKP_DR3

void save_crash_context(uint32_t pc, uint32_t task_id)
{
    HAL_RTCEx_BKUPWrite(&hrtc, BKP_REASON, BKP_MAGIC);
    HAL_RTCEx_BKUPWrite(&hrtc, BKP_PC, pc);
    HAL_RTCEx_BKUPWrite(&hrtc, BKP_TASK, task_id);
}

void report_last_crash(void)
{
    if (HAL_RTCEx_BKUPRead(&hrtc, BKP_REASON) != BKP_MAGIC) return;

    uint32_t pc   = HAL_RTCEx_BKUPRead(&hrtc, BKP_PC);
    uint32_t task = HAL_RTCEx_BKUPRead(&hrtc, BKP_TASK);

    printf("last crash: pc=0x%08X task=%u\\n", pc, task);
    HAL_RTCEx_BKUPWrite(&hrtc, BKP_REASON, 0);      /* 清除标记 */
}

/* 喂狗任务要监控所有关键任务，而不是无脑喂 */
void watchdog_task(void *arg)
{
    for (;;) {
        if (task_all_alive()) {
            HAL_IWDG_Refresh(&hiwdg);
        } else {
            Log_Error("task hang detected");
            /* 故意不喂，让看门狗复位，比带病运行安全 */
        }
        vTaskDelay(pdMS_TO_TICKS(200));
    }
}`
        },
        apply: `<p>现场设备排查的黄金法则是“先保现场，再谈修复”。在 HardFault、看门狗即将复位前，把 PC、任务 ID、关键变量写进备份寄存器或 Flash 日志区，重启后上报云端，比盲目复现高效得多。</p>
<p>如果复位原因显示上电复位，但设备明明一直在供电，要重点查电源：示波器抓复位瞬间的 3.3V 波形，看是否有跌落；检查负载突变（如电机启动、射频发射）时的电流冲击。</p>`,
        pitfalls: [
          "<b>复位后立刻清标志。</b>还没记录原因就清了，永远不知道上次为什么复位。",
          "<b>只看门狗不看喂狗链路。</b>喂狗任务被饿死也会复位，根因是优先级或死锁，不是看门狗本身。",
          "<b>带病运行。</b>检测到任务卡死还继续喂狗，系统功能已经异常但没人知道，比复位更危险。"
        ],
        follow: [
          [
            "看门狗复位和硬件复位怎么区分？",
            "读 RCC_CSR 的 IWDGRSTF 和 PINRSTF 标志。看门狗复位通常是软件问题，外部复位多为硬件干扰。两者可能同时置位，要看优先级和现场。"
          ],
          [
            "如何定位死循环？",
            "在调试器里暂停，看 PC 停在哪里，多次暂停如果都在同一区域，基本就是死循环。也可以在可疑循环里加计数器，超限就记录并跳出。"
          ],
          [
            "为什么设备在实验室正常，现场却复位？",
            "现场有更强的电磁干扰、更大的电源波动、更宽的温度范围。要按工业级标准做 EMC 测试，加 TVS、滤波、屏蔽，并留足电源余量。"
          ]
        ]
      },

      {
        id: "G-04",
        chapter: "periph",
        topic: "uart",
        title: "串口打印乱码，可能是什么原因？",
        diff: "初级",
        freq: "高频",
        type: "故障排查题",
        point: "波特率、时钟、接线、电平、格式配置，按概率排序的排查清单。",
        q: `<p>面试官：串口助手收到的全是<strong>乱码</strong>，你怎么排查？如果波特率看起来是对的，还可能是什么问题？</p>`,
        exam: `<p>看似简单，实则考察排查的条理性。能按“波特率 → 时钟 → 接线 → 电平 → 帧格式”的顺序排查，并且知道“用示波器测一位宽度反算波特率”，说明你有实战经验。</p>`,
        core: `<p>乱码本质是“采样点错位”，接收方在错误位置读了电平。按概率排：① 波特率不匹配最常见，包括代码设的和串口助手不一致，以及实际时钟与代码假设不一致（HSE 没起振退回 HSI 8MHz，波特率差 9 倍）；② 时钟配置错，系统时钟不是你以为的频率，用示波器测一位宽度反算实际波特率一比就知道；③ 接线问题，TX/RX 接反、没共地、接触不良，接反通常完全收不到而不是乱码；④ 电平不匹配，3.3V TTL 直连 RS232 的 ±12V 或经 MAX232 后极性反了，会乱码甚至损坏接口；⑤ 帧格式不一致，数据位、停止位、校验位配错，比如发 8N1 收 8E1，会出现规律性错误。</p>`,
        answer: `<p>乱码的本质是“采样点错位”，接收方在错误的位置读了电平。按概率排序：</p>
<p>第一，波特率不匹配。这是最常见的原因，包括代码里设的波特率和串口助手不一致，以及实际时钟与代码假设不一致（比如 HSE 没起振，退回 HSI 8MHz，波特率差 9 倍）。</p>
<p>第二，时钟配置错误。系统时钟不是你以为的频率，导致分频后的波特率偏差。用示波器测一位的宽度，反算实际波特率，一比就知道。</p>
<p>第三，接线问题。TX/RX 接反、没有共地、接触不良。接反时通常完全收不到数据，而不是乱码。</p>
<p>第四，电平不匹配。3.3V TTL 直接接 RS232 的 ±12V，或者经过 MAX232 后极性反了，都会乱码或损坏接口。</p>
<p>第五，帧格式不一致。数据位、停止位、校验位配错，比如发送端 8N1、接收端 8E1，会出现规律性的错误。</p>`,
        principle: `<p>UART 靠起始位同步，每位采样一次。如果波特率偏差超过约 5%，累积到最后一个数据位就会采错。所以“看起来差不多”的波特率其实不够，必须精确匹配。</p>
<p>用示波器测量：抓一个字节，量起始位下降沿到第一个数据位边沿的时间，就是一位的时间。1/位宽 就是波特率。比如 8.68 微秒对应 115200。</p>`,
        fig: {
          type: "table",
          title: "乱码原因与判断方法",
          tag: "troubleshooting",
          head: ["原因", "现象", "验证方法"],
          rows: [
            ["波特率不匹配", "全部乱码，偶尔有正确字符", "示波器测位宽反算"],
            ["时钟错误", "固定比例的错误", "量 MCO 输出或翻转 GPIO"],
            ["未共地", "乱码伴随随机丢字节", "万用表测两地电位差"],
            ["电平不匹配", "乱码或无数据，可能损坏", "示波器看电平幅度"],
            ["帧格式不一致", "规律性错误，校验失败", "核对数据位/停止位/校验"]
          ]
        },
        code: {
          lang: "c",
          title: "uart_debug.c",
          src: `#include "stm32f1xx_hal.h"

/* 自检：打印实际系统时钟和波特率寄存器，确认配置生效 */
void uart_self_check(void)
{
    printf("SYSCLK = %u Hz\\n", (unsigned)HAL_RCC_GetSysClockFreq());
    printf("PCLK2  = %u Hz\\n", (unsigned)HAL_RCC_GetPCLK2Freq());
    printf("BRR    = 0x%04X\\n", (unsigned)USART1->BRR);

    /* 期望波特率 = PCLK2 / BRR（16 倍过采样） */
    uint32_t expect = HAL_RCC_GetPCLK2Freq() / USART1->BRR;
    printf("actual baud ~ %u\\n", (unsigned)expect);
}

/* 用 GPIO 翻转测量实际主频：翻转频率 = 主频 / (2 × 循环次数) */
void clock_output_test(void)
{
    /* 配置 MCO 引脚输出 SYSCLK/1，用示波器直接看 */
    __HAL_RCC_GPIOA_CLK_ENABLE();
    GPIO_InitTypeDef g = {0};
    g.Pin  = GPIO_PIN_8;
    g.Mode = GPIO_MODE_AF_PP;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    HAL_RCC_MCOConfig(RCC_MCO1, RCC_MCO1SOURCE_SYSCLK, RCC_MCODIV_1);
}

/* 发送固定测试串：AA 55 00 FF，方便示波器/逻辑分析仪解码 */
void uart_send_test_pattern(void)
{
    const uint8_t pattern[] = { 0xAA, 0x55, 0x00, 0xFF, 0x0F, 0xF0 };
    HAL_UART_Transmit(&huart1, (uint8_t *)pattern, sizeof(pattern), 100);
}`
        },
        apply: `<p>最快的定位方法：让设备循环发送 <code>0x55</code>（二进制 01010101），示波器上会看到规整的方波，量周期就能算出波特率，同时也能看出电平幅度和波形质量。</p>
<p>如果波形上升沿很缓、幅度不足 3V，说明驱动能力不够或线太长，要加缓冲或降低波特率。</p>`,
        pitfalls: [
          "<b>只改代码不改串口助手。</b>两边波特率不一致，怎么调都是乱码。",
          "<b>忽略 HSE 起振失败。</b>代码以为 72MHz，实际跑 8MHz，波特率差 9 倍，现象是“全是乱码但偶尔有个别字符对”。",
          "<b>用 USB 转串口模块但不共地。</b>参考电平不同，数据全乱，甚至模块发热。"
        ],
        follow: [
          [
            "为什么偶尔能收到正确字符？",
            "波特率有偏差时，短的字节（如 0x00、0xFF）可能刚好采样正确，长的字节就错了。所以“偶尔正确”恰恰说明波特率接近但不精确。"
          ],
          [
            "TTL、RS232、RS485 电平有什么区别？",
            "TTL 是 0/3.3V 单端；RS232 是 ±3~15V 单端，抗干扰好一些但距离短；RS485 是差分，抗干扰强、距离远。三者不能直接互连，需要转换芯片。"
          ],
          [
            "如何提高串口通信的可靠性？",
            "加帧头帧尾和 CRC 校验、设置合理的超时和重传、降低波特率、使用差分传输、加隔离和 TVS 防护。"
          ]
        ]
      },

      {
        id: "G-05",
        chapter: "periph",
        topic: "i2c",
        title: "I2C 通信失败怎么排查？从硬件到软件的顺序是什么？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "上拉、地址、时序、总线死锁与 ACK 检测，建立分层排查清单。",
        q: `<p>面试官：I2C 读不到数据，返回 NACK 或者一直超时。<strong>你会怎么排查？</strong>示波器上应该重点看什么？</p>`,
        exam: `<p>考察硬件与软件结合排查的能力。能说清“先量上拉和电压、再扫地址、再看波形和 ACK 位、最后查总线死锁”，说明你独立调试过 I2C 设备。</p>`,
        core: `<p>按“电 → 地址 → 时序 → 协议”排查。① 量电平：SCL、SDA 空闲是否高（3.3V），一直低可能是从机把总线拉死、上拉没焊或阻值太大；② 扫地址：用 <code>HAL_I2C_IsDeviceReady</code> 遍历 0x08~0x77 看设备在不在线，很多“读不到”其实是地址搞错——7 位和 8 位地址混用是最常见的坑；③ 看波形：示波器或逻辑分析仪抓 SCL/SDA，看起始条件是否正常、第 9 个时钟有没有 ACK（SDA 被从机拉低）、上升沿是否太缓（上拉太大或总线电容太大）；④ 查协议：寄存器地址对不对、读写方向位对不对、是否需要先写地址再 repeated start 读。</p><p>SDA 一直被拉低、总线死锁时，把 SCL 切成 GPIO 手动发 9 个时钟脉冲恢复，再补 STOP、复位外设。</p>`,
        answer: `<p>按“电 → 地址 → 时序 → 协议”的顺序排查。</p>
<p>第一步，量电平：SCL 和 SDA 空闲时是否为高（3.3V）？如果一直是低，可能是从机把总线拉死了，或者上拉电阻没焊、阻值太大。</p>
<p>第二步，扫地址：用 <code>HAL_I2C_IsDeviceReady</code> 遍历 0x08~0x77，看设备是否在线。很多“读不到数据”其实是地址搞错了——7 位地址和 8 位地址混用是最常见的坑。</p>
<p>第三步，看波形：用示波器或逻辑分析仪抓 SCL/SDA。重点看起始条件是否正常、第 9 个时钟有没有 ACK（SDA 被从机拉低）、上升沿是否太缓（上拉太大或总线电容太大）。</p>
<p>第四步，查协议：寄存器地址是否正确、读写方向位是否对、是否需要先写地址再 repeated start 读。</p>
<p>如果 SDA 一直被拉低、总线死锁，用 9 个时钟脉冲恢复（把 SCL 当 GPIO 手动发时钟）。</p>`,
        principle: `<p>I2C 的 ACK 是硬件判定的：主机发完 8 位后释放 SDA，从机如果存在并把 SDA 拉低，就是 ACK。如果从机不存在或地址错，SDA 保持高，就是 NACK。所以“有没有 ACK”能直接区分“设备不在”和“数据错”。</p>
<p>上升沿时间由上拉电阻和总线电容决定（RC 充电）。400kHz 模式下，上升时间不能超过 300ns，上拉太大或线太长都会超时。</p>`,
        fig: {
          type: "flow",
          title: "I2C 排查顺序",
          tag: "troubleshooting",
          items: [
            { t: "量电平", d: "空闲是否为高" },
            { t: "扫地址", d: "0x08 ~ 0x77" },
            { t: "看 ACK", d: "第 9 个时钟" },
            { t: "查时序", d: "上升沿 / 速率" },
            { t: "恢复总线", d: "9 个时钟" }
          ]
        },
        apply: `<p>逻辑分析仪比示波器更适合调试 I2C：它能直接解码出地址、读写位、数据和 ACK，一眼就能看出是地址错还是数据错。几十块钱的 8 通道分析仪配合开源软件（如 PulseView）就够用。</p>
<p>如果总线上有多个设备，先逐个断开确认是哪个设备把总线拉死；有些设备在上电时会短暂拉低 SDA，需要等它初始化完成再访问。</p>`,
        pitfalls: [
          "<b>7 位地址和 8 位地址混用。</b>HAL 库要求传 <code>addr &lt;&lt; 1</code>，直接传 7 位地址会 NACK，这是最高频的错误。",
          "<b>上拉电阻缺失或太大。</b>波形上升沿变成缓慢的 RC 曲线，高速时根本读不出来。",
          "<b>总线死锁不恢复。</b>从机卡在等待时钟，主机复位后依然拉低 SDA，必须发 9 个时钟解锁。"
        ],
        follow: [
          [
            "为什么 I2C 需要上拉电阻？",
            "I2C 是开漏输出，只能主动拉低，不能主动输出高。高电平靠上拉电阻把线拉起来，所以上拉是必需的，且阻值影响上升沿速度。"
          ],
          [
            "什么是时钟拉伸？主机怎么处理？",
            "从机来不及处理时把 SCL 拉低，主机必须等 SCL 真正变高才能继续。硬件 I2C 会自动等待；软件模拟必须检查 SCL 电平，否则会读错。"
          ],
          [
            "SPI 通信异常怎么排查？",
            "先确认片选是否拉低、时钟是否有波形；再确认 CPOL/CPHA 模式是否匹配（模式 0 和 3 最常用）；最后检查速率是否超过从机能力、MISO 是否有数据。"
          ]
        ]
      },

      {
        id: "G-06",
        chapter: "periph",
        topic: "clock",
        title: "定时器不准、延时不对，是什么原因？",
        diff: "中级",
        freq: "中频",
        type: "故障排查题",
        point: "时钟源误差、分频计算、中断延迟与优先级，以及测量方法。",
        q: `<p>面试官：定时器配置的 1ms 中断，实测是 1.2ms；或者 <code>delay_ms(1000)</code> 实际只延时了 800ms。<strong>可能是什么原因？</strong></p>`,
        exam: `<p>考察对时钟链和定时器计算的理解。能说清“定时器时钟不是系统时钟”“APB 分频后定时器时钟 ×2”“中断延迟导致累计误差”“内部 RC 精度差”，说明你算过也测过。</p>`,
        core: `<p>先确认时钟源：定时器时钟来自 APB，而 APB 预分频不为 1 时定时器时钟是 APB 时钟的 2 倍，很多人直接用 PCLK1 算结果差一倍。</p><p>再确认分频：<code>f = fCK/((PSC+1)×(ARR+1))</code>，两者都要加 1，因为计数器从 0 开始，少加 1 会偏千分之一到几十分之一。中断方式还要考虑中断延迟：每次有响应时间，中断处理耗时接近周期时实际频率偏低，用“中断里累加计数、主循环测总时间”能看出累计误差。</p><p>内部 RC（HSI、LSI）精度只有 ±1%~5%，温漂明显，不能做精确计时，要精确必须用 HSE 或 LSE。软件空循环延时受优化级别、主频、Flash 等待周期影响，根本不可靠。</p>`,
        answer: `<p>先确认时钟源。定时器的时钟来自 APB 总线，而 APB 预分频不为 1 时，定时器时钟是 APB 时钟的 2 倍。很多人直接用 PCLK1 算，结果差一倍。</p>
<p>然后确认分频计算。<code>f = fCK / ((PSC+1) × (ARR+1))</code>，注意都要加 1，因为计数器从 0 开始。少加 1 会导致频率偏差千分之一到几十分之一。</p>
<p>如果是中断方式，还要考虑中断延迟：每次中断都有响应时间，如果中断处理耗时接近周期，实际频率会偏低。用“中断里累加计数、主循环里测总时间”能看出累计误差。</p>
<p>如果是内部 RC 振荡器（HSI、LSI），精度只有 ±1%~5%，温漂明显，绝对不适合做精确计时。要精确必须用外部晶振（HSE）或 RTC 晶振（LSE）。</p>
<p>最后，软件延时用空循环的话，编译器优化级别、主频、Flash 等待周期都会影响，根本不可靠。</p>`,
        principle: `<p>定时器的计数时钟经过 PSC 分频后驱动 CNT，CNT 计到 ARR 产生更新事件。所以一个周期的计数次数是 ARR+1，不是 ARR。</p>
<p>中断延迟包括：当前指令执行完、压栈、取向量、跳转。多周期指令（除法、浮点）会拉长这个时间。如果定时周期只有几微秒，延迟占比就很可观。</p>`,
        fig: {
          type: "table",
          title: "常见定时误差原因",
          tag: "troubleshooting",
          head: ["原因", "误差特征", "解决办法"],
          rows: [
            ["定时器时钟算错", "固定倍数偏差（常为 2 倍）", "用 APB×2 的规则重算"],
            ["PSC/ARR 少加 1", "小比例固定偏差", "公式里都 +1"],
            ["内部 RC 时钟", "随温度漂移", "改用外部晶振"],
            ["中断延迟", "频率偏低，负载越重越明显", "提高优先级、缩短 ISR"],
            ["空循环延时", "随优化级别变化", "改用硬件定时器"]
          ]
        },
        code: {
          lang: "c",
          title: "timer_check.c",
          src: `#include "stm32f1xx_hal.h"

/* 正确计算定时器参数：注意 APB 分频与 +1 */
void timer1k_init(void)
{
    /* TIM2 在 APB1 上；APB1 分频为 2 时，定时器时钟 = PCLK1 × 2 */
    uint32_t pclk1 = HAL_RCC_GetPCLK1Freq();
    uint32_t tim_clk = (pclk1 == HAL_RCC_GetHCLKFreq()) ? pclk1 : pclk1 * 2;

    uint32_t psc = 71;                                  /* 分频到 1MHz */
    uint32_t arr = tim_clk / ((psc + 1) * 1000) - 1;    /* 1kHz，注意 -1 */

    htim2.Instance           = TIM2;
    htim2.Init.Prescaler     = psc;
    htim2.Init.Period        = arr;
    htim2.Init.CounterMode   = TIM_COUNTERMODE_UP;
    htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_ENABLE;
    HAL_TIM_Base_Init(&htim2);

    HAL_NVIC_SetPriority(TIM2_IRQn, 1, 0);              /* 高优先级，减少延迟 */
    HAL_NVIC_EnableIRQ(TIM2_IRQn);
    HAL_TIM_Base_Start_IT(&htim2);

    printf("PCLK1=%u, TIM2CLK=%u, PSC=%u, ARR=%u\\n",
           (unsigned)pclk1, (unsigned)tim_clk, (unsigned)psc, (unsigned)arr);
}

/* 用 DWT 周期计数器做微秒级测量，比空循环可靠 */
void dwt_init(void)
{
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->CYCCNT = 0;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
}

uint32_t dwt_us(void)
{
    return DWT->CYCCNT / (SystemCoreClock / 1000000u);
}

/* 验证：测量 100 次 1ms 中断的总时间，看是否有累计误差 */
volatile uint32_t g_tick;

void TIM2_IRQHandler(void)
{
    if (__HAL_TIM_GET_FLAG(&htim2, TIM_FLAG_UPDATE)) {
        __HAL_TIM_CLEAR_FLAG(&htim2, TIM_FLAG_UPDATE);
        g_tick++;
    }
}`
        },
        apply: `<p>验证定时精度最直接的方法：让定时器中断翻转一个 GPIO，用示波器测频率和占空比。如果频率对但抖动大，是中断延迟；如果频率本身就偏，是时钟或分频算错。</p>
<p>对于长时间计时（比如 RTC），要用 32.768kHz 晶振，并且做温度补偿；内部 LSI 误差可能到 ±50%，只能做粗略超时。</p>`,
        pitfalls: [
          "<b>直接用 PCLK 算定时器时钟。</b>APB 分频不为 1 时定时器时钟是它的 2 倍，算出来频率差一倍。",
          "<b>PSC 或 ARR 忘记减 1。</b>频率偏低一点，长时间累积误差明显。",
          "<b>用空循环做精确延时。</b>换优化级别或主频就失效，跨平台完全不可用。"
        ],
        follow: [
          [
            "为什么 APB 分频后定时器时钟要乘 2？",
            "这是 ST 的设计：为了让定时器在 APB 分频后仍能获得较高时钟，硬件自动把定时器时钟设为 APB 时钟的 2 倍（当分频系数不为 1 时）。"
          ],
          [
            "如何测量中断延迟？",
            "在中断入口翻转 GPIO，用示波器同时看触发信号和 GPIO，两者时间差就是延迟。也可以用 DWT 周期计数器在中断里读时间戳。"
          ],
          [
            "RTC 为什么用 32.768kHz？",
            "32768 是 2 的 15 次方，经过 15 级二分频正好得到 1Hz，硬件实现简单且功耗极低。"
          ]
        ]
      },

      {
        id: "G-07",
        chapter: "tool",
        topic: "tools",
        title: "SWD 调试和逻辑分析仪分别适合什么问题？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "断点调试的局限、SWO/ITM 打印、逻辑分析仪的时序视角。",
        q: `<p>面试官：你平时怎么调试？<strong>SWD 断点</strong>和<strong>逻辑分析仪</strong>分别解决什么问题？什么时候不能用断点？</p>`,
        exam: `<p>考察调试工具的实际使用经验。能说清“断点会破坏实时性，通信和电机控制场景不能用”“逻辑分析仪看时序和协议解码”“SWO 可以无侵入打印”，说明你有手段而不只是 printf。</p>`,
        core: `<p>SWD 断点适合查逻辑错误：变量不对、分支没进、函数没调用，能单步、看调用栈、看外设寄存器，最常用。但断点会暂停 CPU 破坏实时性，调通信协议、电机控制、USB 时序时一停对端就超时，根本没法用；断点还会改变时序，有些 bug 一加断点就消失（海森堡 bug）。</p><p>逻辑分析仪适合看时序和协议：I2C/SPI/UART 波形、片选和时钟配合、中断和 GPIO 的先后关系，不影响程序运行，能看到真实时间关系。此外 SWO/ITM 能在不影响实时性的情况下打日志，比串口 printf 更快占用更少；数据观察点（watchpoint）由 DWT 地址比较器命中后让内核停在现场，能精确抓“谁写坏了这个地址”，但它同样暂停 CPU，想完全不打断只能靠 SWO/ITM 或 ETM 指令 trace。</p>`,
        answer: `<p>SWD 断点适合查逻辑错误：变量值不对、分支没进去、函数没调用。可以单步、看调用栈、看外设寄存器，是最常用的手段。</p>
<p>但断点会暂停 CPU，破坏实时性。调试通信协议、电机控制、USB 时序时，一停下来对端就超时了，根本没法用。而且断点会改变时序，有些 bug 一加断点就消失（海森堡 bug）。</p>
<p>逻辑分析仪适合看时序和协议：I2C/SPI/UART 的波形、片选和时钟的配合、中断和 GPIO 的先后关系。它不影响程序运行，能看到真实的时间关系。</p>
<p>另外，SWO/ITM 可以在不影响实时性的情况下打印日志（通过调试口输出），比串口 printf 更快、占用更少。数据观察点（watchpoint）则由 DWT 地址比较器命中后让内核停在现场，能精确抓到“谁写坏了这个地址”；但它同样会暂停 CPU，想完全不打断运行就只能靠 SWO/ITM 或 ETM 指令 trace。</p>`,
        principle: `<p>断点的实现有两种：硬件断点用内核的 FPB 单元，数量有限（通常 4~6 个），不改代码；软件断点把指令替换成 BKPT，会修改 Flash 或 RAM 内容，在 Flash 上需要临时擦写。</p>
<p>数据观察点用 DWT 的比较器，当地址被访问时触发断点，非常适合抓“谁改了我的变量”。这是查野指针和越界写的利器。</p>`,
        fig: {
          type: "table",
          title: "调试手段的适用场景",
          tag: "compare",
          head: ["手段", "是否影响实时性", "适合问题", "局限"],
          rows: [
            ["SWD 断点", "会暂停 CPU", "逻辑错误、变量异常", "破坏时序，通信场景不可用"],
            ["数据观察点", "访问时暂停", "谁改了变量、越界写", "数量有限"],
            ["SWO / ITM", "几乎无影响", "日志、时间戳", "需要引脚支持"],
            ["逻辑分析仪", "无影响", "时序、协议、硬件问题", "看不到软件内部状态"],
            ["示波器", "无影响", "信号质量、电源、干扰", "通道少，不适合长时序"]
          ]
        },
        code: {
          lang: "c",
          title: "itm_log.c",
          src: `#include <stdint.h>

/* SWO/ITM 打印：不占用串口，几乎不影响实时性 */
#define ITM_PORT0  (*((volatile uint32_t *)0xE0000000))

void itm_send_char(char c)
{
    if ((ITM->TER & 1) == 0) return;        /* 未使能则跳过 */
    while (ITM->PORT[0].u32 == 0) { }
    ITM->PORT[0].u8 = (uint8_t)c;
}

void itm_log(const char *s)
{
    while (*s) itm_send_char(*s++);
}

/* 配合 DWT 时间戳，能看出函数耗时 */
#define LOG_STAMP(msg) do {                    \\
    itm_log("[t=");                            \\
    itm_log_u32(DWT->CYCCNT);                  \\
    itm_log("] " msg "\\n");                    \\
} while (0)

/* 调试 GPIO：在关键路径翻转，用逻辑分析仪看时序 */
static inline void dbg_pin_high(void) { GPIOA->BSRR = (1u << 8); }
static inline void dbg_pin_low(void)  { GPIOA->BSRR = (1u << 24); }

void isr_with_marker(void)
{
    dbg_pin_high();          /* 标记中断开始 */
    /* ... 中断处理 ... */
    dbg_pin_low();           /* 标记中断结束 */
}`
        },
        apply: `<p>实际调试组合拳：先用逻辑分析仪确认硬件时序没问题，再用 SWO 打印关键变量看软件流程，最后用断点和观察点定位具体代码。三者结合，比单一手段快得多。</p>
<p>查“变量被谁改了”时，数据观察点是最有效的：在变量地址上设 watchpoint，谁写它就停在哪里，一次就能找到凶手。</p>`,
        pitfalls: [
          "<b>在通信中断里打断点。</b>CPU 一停，对端超时重发或断开，问题现象完全变了。",
          "<b>只用 printf 调试。</b>printf 本身耗时且可能改变时序，还会占用串口，影响被测功能。",
          "<b>逻辑分析仪采样率不够。</b>测高速 SPI 或 PWM 细节时，采样率不足会看到失真的波形，误判为信号问题。"
        ],
        follow: [
          [
            "什么是海森堡 bug？",
            "指加了调试手段（断点、打印）后 bug 就消失的现象。通常是因为时序敏感或内存布局改变，说明问题与时间或内存有关，要特别警惕。"
          ],
          [
            "SWO 需要什么硬件支持？",
            "需要 MCU 的 SWO 引脚（通常是 PB3）接到调试器的相应引脚，并在 IDE 里配置 ITM 通道和时钟频率。不是所有调试器都支持。"
          ],
          [
            "如何用逻辑分析仪解码协议？",
            "把探头接到 SCL/SDA 或 SCK/MOSI/MISO/CS，设置正确的阈值电压和采样率，选择对应的协议解码器（I2C/SPI/UART），软件会自动解析出地址、数据和 ACK。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("debugging", {
    chapters: [
      {
        id: "boot",
        topics: [{ id: "assert", title: "断言与防御式编程" }]
      },
      {
        id: "periph",
        topics: [
          { id: "timing", title: "时序违例" },
          { id: "power", title: "功耗异常" },
          { id: "deadlock", title: "死锁与卡死" },
          { id: "overflow", title: "内存越界" }
        ]
      },
      {
        id: "tool",
        topics: [
          { id: "log", title: "现场日志与黑匣子" },
          { id: "breakpoint", title: "断点与单步" },
          { id: "semihost", title: "printf 重定向与 semihosting" },
          { id: "perf", title: "性能分析" },
          { id: "selftest", title: "生产自检" }
        ]
      }
    ],
    questions: [
      {
        id: "G-08",
        chapter: "boot",
        topic: "assert",
        title: "assert 怎么用？为什么量产固件要保留断言？",
        diff: "中级",
        freq: "中频",
        type: "工程实践题",
        point: "断言检查“不该发生”的条件，失败时记录现场并停机；量产可保留但要做成可恢复。",
        q: `<p>面试官：assert 会不会影响性能？发布版本要不要关掉？</p>`,
        exam: `<p>考察防御式编程意识。能区分“参数检查”和“内部不变量断言”，以及量产时的处理策略，就很好。</p>`,
        core: `<p>定位：检查“程序内部不应该发生”的情况，比如状态机进入非法状态、链表指针为空、缓冲区索引越界；它不是处理用户输入错误（那应返回错误码），而是尽早暴露代码 bug。</p><p>要不要关：开发阶段必须开，失败停机并保存现场便于定位；量产可以保留，但建议做成“记录 + 复位”而不是死循环，避免设备永久卡死；对性能极敏感的中断路径可以只在调试版开。</p><p>实现要点：失败时把文件名、行号、表达式、关键变量存备份寄存器或日志；关中断避免现场被破坏；可选死循环（调试器可 attach）或复位（现场设备）；不要用 assert 做参数校验，因为发布版可能被关掉，非法输入就直接进业务了。</p>`,
        answer: `<p><b>assert 的定位：</b>检查“程序内部不应该发生”的情况，比如状态机进入了非法状态、链表指针为空、缓冲区索引越界。它不是为了处理用户输入错误（那应该返回错误码），而是为了尽早暴露代码 bug。</p>
<p><b>要不要关：</b></p>
<ul>
<li>开发阶段必须开启，失败时停机并保存现场，便于定位；</li>
<li>量产版本可以保留，但建议做成“记录 + 复位”而不是“死循环”，避免设备永久卡死；</li>
<li>对性能极敏感的中断路径，可以只在调试版本开启。</li>
</ul>
<p><b>实现要点：</b></p>
<ul>
<li>断言失败时保存文件名、行号、表达式、关键变量到备份寄存器或日志；</li>
<li>关闭中断，避免现场被破坏；</li>
<li>可以选择死循环（调试器可 attach）或复位（现场设备）；</li>
<li>不要用 assert 做参数校验，因为发布版本可能被关掉，导致非法输入直接进入业务。</li>
</ul>`,
        principle: `<p>断言把“隐式的假设”变成“显式的检查”。程序里大量 bug 来自未验证的假设（指针非空、索引在范围内、状态合法），断言能在问题发生的瞬间抓住它，而不是等到数据被破坏后。</p>
<p>断言的成本是一次比较和分支，通常可以接受；关键路径可以用编译期开关控制。</p>`,
        fig: {
          type: "table",
          title: "断言与错误码的分工",
          tag: "assert",
          head: ["场景", "手段", "原因"],
          rows: [
            ["用户输入非法", "返回错误码", "可预期，需要处理"],
            ["硬件超时", "返回错误码", "可重试或降级"],
            ["内部状态非法", "assert", "代码 bug，不应发生"],
            ["指针为空", "assert", "调用者违约"],
            ["数组越界", "assert + 边界检查", "内存安全问题"]
          ]
        },
        code: {
          lang: "c",
          title: "assert_impl.c",
          src: `#include <stdint.h>

/* 自定义断言：保存现场后复位或停机 */
#define ASSERT(expr)                                                  \\
    do {                                                              \\
        if (!(expr)) {                                                \\
            assert_fail(__FILE__, __LINE__, #expr);                   \\
        }                                                             \\
    } while (0)

void assert_fail(const char *file, int line, const char *expr)
{
    __disable_irq();

    /* 1. 保存到备份寄存器或日志区 */
    fault_log_save(file, line, expr);

    /* 2. 调试版本停机，便于 attach；量产版本复位 */
#ifdef DEBUG_BUILD
    for (;;) { }
#else
    NVIC_SystemReset();
#endif
}

/* 使用示例：检查内部不变量 */
void ringbuf_push_checked(ringbuf_t *rb, uint8_t v)
{
    ASSERT(rb != NULL);
    ASSERT(rb->count <= rb->size);
    /* ... */
}`
        },
        codeNote: "ASSERT 宏里的表达式不要有副作用（如 i++），否则关闭断言时行为会改变。",
        apply: `<p>我在项目里把断言失败信息写入 Flash 日志区，量产设备复位后上报，能统计出哪些断言最常触发，反向定位代码薄弱点。</p>
<p>对外部输入一律用错误码，不用断言；断言只用于“如果这里成立，说明代码写错了”的场景。</p>`,
        pitfalls: [
          "<b>用 assert 校验用户输入。</b>发布版本关闭后失去保护。",
          "<b>断言里有副作用。</b>关闭断言后逻辑改变。",
          "<b>失败后死循环。</b>现场设备永久卡死。",
          "<b>不保存现场。</b>复位后什么都不知道。"
        ],
        follow: [
          ["assert 和 if-return 怎么选？", "可预期的错误（参数、超时）用 if-return；不可预期的内部错误（不变量被破坏）用 assert。"],
          ["断言失败后应该复位还是停机？", "调试阶段停机便于 attach；量产设备复位并记录，避免永久不可用。" ]
        ]
      },

      {
        id: "G-09",
        chapter: "tool",
        topic: "log",
        title: "现场设备没有调试器，怎么保留故障现场？",
        diff: "高级",
        freq: "高频",
        type: "工程实践题",
        point: "黑匣子：复位原因、栈帧、环形日志、关键变量快照，掉电保存并可导出。",
        q: `<p>面试官：客户现场的設備死机了，拿回来复位一下就好了，怎么查？</p>`,
        exam: `<p>考察“可观测性”设计。能说出“复位原因、HardFault 栈帧、环形日志、快照”，就很好。</p>`,
        core: `<p>黑匣子设计：① 复位原因，读 RCC 复位标志区分上电、看门狗、软件复位；② 异常现场，HardFault 时保存 R0-R3、R12、LR、PC、xPSR、CFSR、HFSR、MMFAR、BFAR；③ 环形日志，关键事件带时间戳存 RAM 环形区，异常时转存 Flash；④ 关键变量快照，任务状态、队列长度、栈高水位、错误计数；⑤ 掉电保存，用备份寄存器存少量关键值或用 Flash 保留扇区；⑥ 导出接口，通过串口、USB、蓝牙或云端读取，不必拆机。</p><p>使用流程：复位后先读黑匣子，判断上次是看门狗复位还是 HardFault；是 HardFault 就用保存的 PC/LR 对照 map 文件定位函数，再结合日志看最后几个事件。注意日志写入要轻量不能影响实时性，保存现场时关中断避免数据被覆盖。</p>`,
        answer: `<p><b>黑匣子设计：</b></p>
<ul>
<li><b>复位原因</b>：读 RCC 复位标志，区分上电、看门狗、软件复位；</li>
<li><b>异常现场</b>：HardFault 时保存 R0-R3、R12、LR、PC、xPSR、CFSR、HFSR、MMFAR、BFAR；</li>
<li><b>环形日志</b>：关键事件带时间戳，存在 RAM 环形区，异常时转存到 Flash；</li>
<li><b>关键变量快照</b>：任务状态、队列长度、堆栈高水位、错误计数；</li>
<li><b>掉电保存</b>：用备份寄存器保存少量关键值，或用 Flash 保留扇区；</li>
<li><b>导出接口</b>：通过串口、USB、蓝牙或云端读取，不必拆机。</li>
</ul>
<p><b>使用流程：</b>设备复位后先读取黑匣子，判断上次是看门狗复位还是 HardFault；如果是 HardFault，用保存的 PC/LR 对照 map 文件定位函数；再结合日志看最后几个事件。</p>
<p><b>注意：</b>日志写入要轻量，不能影响实时性；保存现场时关闭中断，避免数据被覆盖。</p>`,
        principle: `<p>现场问题的最大障碍是“不可复现、无信息”。黑匣子把瞬时的故障状态固化下来，让事后分析成为可能。</p>
<p>复位会清空大部分 RAM，所以关键信息必须存到非易失区域或备份域；保存动作要在复位前完成。</p>`,
        fig: {
          type: "flow",
          title: "黑匣子的记录与恢复",
          tag: "black box",
          items: [
            { t: "正常运行", d: "环形日志记录关键事件" },
            { t: "异常发生", d: "HardFault / 看门狗" },
            { t: "保存现场", d: "栈帧 + 日志写入保留区" },
            { t: "复位重启", d: "读取复位原因和现场" },
            { t: "导出分析", d: "串口/云端读取，对照 map" }
          ]
        },
        code: {
          lang: "c",
          title: "blackbox.c",
          src: `#include <stdint.h>
#include <string.h>

typedef struct {
    uint32_t magic;
    uint32_t reset_reason;
    uint32_t pc;
    uint32_t lr;
    uint32_t cfsr;
    uint32_t hfsr;
    uint32_t log_tail[32];
    uint32_t crc;
} blackbox_t;

/* 保留在备份 SRAM 或 Flash 保留扇区 */
static blackbox_t g_box __attribute__((section(".blackbox")));

void blackbox_record_fault(uint32_t *stack)
{
    g_box.magic = 0x424C4B42u;      /* 'BLKB' */
    g_box.pc    = stack[6];
    g_box.lr    = stack[5];
    g_box.cfsr  = SCB->CFSR;
    g_box.hfsr  = SCB->HFSR;

    /* 把 RAM 环形日志的最后一段复制进来 */
    log_copy_tail(g_box.log_tail, 32);

    g_box.crc = crc32(&g_box, sizeof(g_box) - sizeof(g_box.crc));
}

int blackbox_valid(void)
{
    return g_box.magic == 0x424C4B42u &&
           g_box.crc == crc32(&g_box, sizeof(g_box) - sizeof(g_box.crc));
}`
        },
        codeNote: "黑匣子结构要放在链接脚本指定的保留区，确保复位/掉电后不被清零。",
        apply: `<p>我做过的产品在 Flash 里留了两个扇区做黑匣子，设备重启后自动把上次的故障信息上报云端。现场问题不用返厂，看云端数据就能定位到具体函数。</p>
<p>日志只记关键事件（状态切换、通信失败、复位），不记高频数据，避免磨损 Flash。</p>`,
        pitfalls: [
          "<b>黑匣子放在普通 RAM。</b>复位后丢失。",
          "<b>保存现场时不关中断。</b>数据被覆盖。",
          "<b>日志太多。</b>磨损 Flash，影响实时性。",
          "<b>没有 CRC。</b>数据损坏后误判。"
        ],
        follow: [
          ["备份寄存器能存多少信息？", "通常几十个字节，适合存复位原因、故障码、少量计数器；大量日志还是要用 Flash 保留区。"],
          ["如何把 PC 地址定位到代码行？", "用 addr2line 或 IDE 的反汇编视图，结合编译生成的 .map 和 .elf 文件，把地址映射到函数和行号。" ]
        ]
      },

      {
        id: "G-10",
        chapter: "tool",
        topic: "breakpoint",
        title: "硬件断点和软件断点有什么区别？为什么有时断点打不上？",
        diff: "中级",
        freq: "中频",
        type: "调试工具题",
        point: "软件断点替换指令，硬件断点用比较器；Flash 中的代码和数量限制会影响断点。",
        q: `<p>面试官：为什么在 Flash 里的代码上打断点，有时候会失败或者程序跑飞？</p>`,
        exam: `<p>考察调试器工作原理。能说出“软件断点改写指令、硬件断点数量有限、Flash 不可写”，就很好。</p>`,
        core: `<p>软件断点：调试器把目标地址的指令替换成特殊断点指令（ARM 的 BKPT），执行到那里触发异常由调试器接管，恢复时写回原指令。需要目标内存可写，数量不受硬件限制，但 Flash 里无法直接改写，调试器通常改用硬件断点或把代码搬到 RAM。</p><p>硬件断点：CPU 内部若干地址比较器，执行到指定地址触发调试异常，不修改内存、可用于 Flash，但数量有限（Cortex-M 通常 2~6 个），也能设数据断点监视某地址读写。</p><p>打不上的原因：硬件断点用完了；代码在 Flash 且调试器不支持软件断点；优化后代码被内联重排，地址对不上；断点设在未执行的路径。建议调试时降低优化等级（<code>-O0/-Og</code>），关键位置用硬件断点，必要时把函数放到 RAM 调试。</p>`,
        answer: `<p><b>软件断点：</b>调试器把目标地址的指令替换成一条特殊的断点指令（如 ARM 的 BKPT），程序执行到那里触发异常，调试器接管。恢复时再写回原指令。</p>
<ul>
<li>需要目标内存可写；</li>
<li>数量不受硬件限制；</li>
<li>在 Flash 中无法直接改写，调试器通常用硬件断点或把代码搬到 RAM。</li>
</ul>
<p><b>硬件断点：</b>CPU 内部有若干地址比较器，执行到指定地址时触发调试异常。</p>
<ul>
<li>不修改内存，可用于 Flash；</li>
<li>数量有限（Cortex-M 通常 2~6 个）；</li>
<li>可以设置数据断点（监视某个地址的读写）。</li>
</ul>
<p><b>断点打不上的原因：</b>硬件断点用完了；代码在 Flash 且调试器不支持软件断点；优化后代码被内联/重排，地址对不上；断点设在未执行的代码路径。</p>
<p><b>建议：</b>调试时降低优化等级（-O0/-Og），关键位置用硬件断点，必要时把函数放到 RAM 调试。</p>`,
        principle: `<p>断点的本质是“让 CPU 在特定位置停下来，把控制权交给调试器”。软件断点靠修改指令实现，硬件断点靠地址比较器实现，两者互补。</p>
<p>Flash 只能按页擦写，无法像 RAM 那样单字节替换，所以软件断点在 Flash 上不可行。</p>`,
        fig: {
          type: "table",
          title: "软件断点与硬件断点",
          tag: "breakpoint",
          head: ["维度", "软件断点", "硬件断点"],
          rows: [
            ["实现", "替换指令为 BKPT", "地址比较器"],
            ["内存要求", "可写", "无"],
            ["数量", "几乎无限", "有限（2~6 个）"],
            ["Flash 代码", "通常不可用", "可用"],
            ["数据监视", "不支持", "支持（watchpoint）"]
          ]
        },
        code: {
          lang: "c",
          title: "debug_hint.c",
          src: `#include <stdint.h>

/* 手动触发断点：调试器可以在这里停下 */
#define BREAKPOINT() __asm volatile ("bkpt 0")

void suspicious_path(void)
{
    /* 条件断点不方便时，可以在代码里加手动断点 */
    if (unexpected_state) {
        BREAKPOINT();
    }
}

/* 把函数放到 RAM 便于调试（配合链接脚本） */
__attribute__((section(".ramfunc"), noinline))
void ram_debug_func(void)
{
    volatile int x = 0;
    x++;
}`
        },
        codeNote: "发布版本一定要移除 BKPT，否则会触发 HardFault 或调试异常。",
        apply: `<p>调试 Flash 中的驱动时，我优先用硬件断点，避免调试器尝试改写 Flash 失败。数据断点用来抓“谁改了这个变量”，定位越界写非常有效。</p>
<p>如果断点行为诡异，先确认优化等级和代码是否被内联，再看反汇编地址是否与源码行对应。</p>`,
        pitfalls: [
          "<b>硬件断点超限。</b>后面的断点静默失效。",
          "<b>在优化后的代码上调试。</b>行号与指令不对应。",
          "<b>发布版本残留 BKPT。</b>触发异常。",
          "<b>以为断点一定能停。</b>代码路径没执行到。"
        ],
        follow: [
          ["什么是数据断点（watchpoint）？", "监视某个地址的读写，访问时触发断点，用于定位“谁改坏了这个变量”，需要硬件支持。"],
          ["为什么断点会影响时序？", "断点暂停 CPU，外设可能继续运行（DMA、定时器），恢复后时序已经变化，实时性问题可能无法复现。" ]
        ]
      },

      {
        id: "G-11",
        chapter: "periph",
        topic: "deadlock",
        title: "系统卡死但没复位，怎么判断是死循环、死锁还是中断风暴？",
        diff: "高级",
        freq: "高频",
        type: "故障排查题",
        point: "用调试器暂停看 PC/调用栈，检查任务状态、中断计数和锁持有关系。",
        q: `<p>面试官：设备卡死，看门狗也没复位，怎么定位卡在哪？</p>`,
        exam: `<p>考察现场分析能力。能说出“暂停看 PC、任务列表、中断计数、锁状态”，就很好。</p>`,
        core: `<p>① 确认是否真卡死：调试器 attach，暂停看 PC 停在哪——停在某个循环是死循环（等标志、等硬件），停在空闲任务或 WFI 说明没死只是没任务可跑（可能都阻塞了），频繁进出某个中断是中断风暴。</p><p>② 看任务状态：RTOS 视图看每个任务状态和阻塞原因，都阻塞在信号量/队列上是死锁或事件丢失，某个任务一直 Running 是该任务死循环或优先级过高，栈高水位接近 0 是栈溢出。</p><p>③ 看中断：统计计数器暴涨说明中断源没清、反复触发。④ 看锁：用互斥量时查谁持有、谁在等、是否循环等待。⑤ 看门狗为什么没复位：可能喂狗在中断里、看门狗被禁用，或者卡死发生在喂狗任务之前。</p>`,
        answer: `<p><b>第一步：确认是否真的卡死。</b>用调试器 attach，暂停后看 PC 停在哪里：</p>
<ul>
<li>停在某个循环里 → 死循环（等待标志、等待硬件）；</li>
<li>停在空闲任务或 WFI → 系统没死，只是没任务可运行（可能是任务都阻塞了）；</li>
<li>频繁进出某个中断 → 中断风暴。</li>
</ul>
<p><b>第二步：看任务状态。</b>用 RTOS 视图查看每个任务的状态和阻塞原因：</p>
<ul>
<li>所有任务都阻塞在信号量/队列上 → 死锁或事件丢失；</li>
<li>某个任务一直 Running → 该任务死循环或优先级过高；</li>
<li>栈高水位接近 0 → 栈溢出。</li>
</ul>
<p><b>第三步：看中断。</b><code>/proc/interrupts</code>（Linux）或统计计数器，某个中断计数暴涨说明中断源没有清除，反复触发。</p>
<p><b>第四步：看锁。</b>如果用了互斥量，检查谁持有、谁在等，是否存在循环等待。</p>
<p><b>第五步：看门狗为什么没复位。</b>可能喂狗在中断里，或者看门狗被禁用，或者卡死发生在喂狗任务之前。</p>`,
        principle: `<p>“卡死”有多种形态：CPU 仍在跑但逻辑不前进（死循环）、CPU 被阻塞（死锁）、CPU 被中断占满（中断风暴）、CPU 睡了但没人唤醒（事件丢失）。不同的 PC 和任务状态对应不同原因。</p>
<p>调试器的“暂停”能冻结当前状态，是最直接的现场快照。</p>`,
        fig: {
          type: "flow",
          title: "卡死问题的排查路径",
          tag: "hang debug",
          items: [
            { t: "暂停看 PC", d: "循环 / 空闲 / 中断" },
            { t: "看任务状态", d: "阻塞原因、栈水位" },
            { t: "看中断计数", d: "是否中断风暴" },
            { t: "看锁持有", d: "是否循环等待" },
            { t: "看门狗", d: "为何没复位" }
          ]
        },
        code: {
          lang: "c",
          title: "hang_probe.c",
          src: `#include <stdint.h>

/* 在可能死循环的等待处加超时和诊断计数 */
int wait_flag_timeout(volatile uint32_t *reg, uint32_t mask, uint32_t timeout)
{
    while ((*reg & mask) == 0) {
        if (--timeout == 0) {
            /* 记录是哪个等待点超时 */
            diag_record(WAIT_TIMEOUT, (uint32_t)reg);
            return -1;
        }
    }
    return 0;
}

/* 中断计数：异常时打印，判断是否风暴 */
static volatile uint32_t irq_count[64];

void irq_count_hook(uint32_t irq)
{
    if (irq < 64) irq_count[irq]++;
}

void dump_irq_counts(void)
{
    for (int i = 0; i < 64; i++) {
        if (irq_count[i]) {
            log_printf("irq %d: %u\\n", i, irq_count[i]);
        }
    }
}`
        },
        codeNote: "所有“等待硬件标志”的循环都应该有超时，否则硬件异常时直接卡死。",
        apply: `<p>我遇到过一次卡死：I2C 等待 BUSY 标志的 while 循环没有超时，从机拉住总线后主程序永远卡在那里，看门狗因为喂狗在定时器中断里所以没复位。后来所有等待都加了超时。</p>
<p>调试时先暂停看 PC，再对照 map 文件，通常几分钟就能定位到具体循环。</p>`,
        pitfalls: [
          "<b>等待标志没有超时。</b>硬件异常直接卡死。",
          "<b>喂狗在中断里。</b>主循环卡死也不会复位。",
          "<b>中断标志没清。</b>中断风暴，CPU 无法前进。",
          "<b>只看 PC 不看任务状态。</b>误判为死循环。"
        ],
        follow: [
          ["如何判断是中断风暴？", "暂停后看 PC 是否总在某个中断处理程序，或统计中断计数在短时间内暴涨；也可能是中断优先级配置导致反复抢占。"],
          ["死锁和活锁有什么区别？", "死锁是双方都阻塞、永远不前进；活锁是双方都在运行但无法推进（如不断重试冲突），CPU 占用高但业务无进展。" ]
        ]
      },

      {
        id: "G-12",
        chapter: "periph",
        topic: "overflow",
        title: "内存越界怎么写坏了别的变量？怎么定位？",
        diff: "高级",
        freq: "高频",
        type: "故障排查题",
        point: "越界写破坏相邻内存，症状远离根因；用保护字节、数据断点、MPU、二分排查定位。",
        q: `<p>面试官：一个全局变量莫名其妙被改成 0，查不到谁改的，怎么办？</p>`,
        exam: `<p>考察内存问题排查思路。能说出“保护字节、数据断点、MPU、链接顺序分析”，就很好。</p>`,
        core: `<p>越界的典型特征是症状出现在远离根因的地方：数组越界写坏相邻全局变量，表现为某个无关状态异常；栈溢出写坏返回地址，表现为跑飞。</p><p>定位：查 map 文件看被改变量前后是什么，推测哪个数组越界会写到它；在可疑数组前后放魔数（canary）定期检查，被改写就说明越界；用调试器数据断点监视该变量地址，谁写它就断在哪；MPU 把数组边界设为不可访问，越界立即异常；二分排查注释掉部分功能看问题是否消失；PC 上开 <code>-fsanitize=address</code>、加 <code>-fstack-protector</code>。</p><p>常见根因：<code>strcpy</code>/<code>sprintf</code> 没长度限制、数组下标没检查、<code>memcpy</code> 长度按元素而非字节、结构体大小算错。</p>`,
        answer: `<p><b>越界的典型特征：</b>症状出现在远离根因的地方。比如数组越界写坏了相邻的全局变量，表现为某个无关状态异常；栈溢出写坏了返回地址，表现为跑飞。</p>
<p><b>定位方法：</b></p>
<ul>
<li><b>看内存布局</b>：查 map 文件，看被改变量前后是什么，推测哪个数组越界会写到它；</li>
<li><b>保护字节（canary）</b>：在可疑数组前后放魔数，定期检查，被改写就说明越界；</li>
<li><b>数据断点</b>：用调试器监视该变量的地址，谁写它就断在哪里；</li>
<li><b>MPU</b>：把数组边界设为不可访问，越界立即触发异常；</li>
<li><b>二分排查</b>：注释掉部分功能，看问题是否消失，缩小范围；</li>
<li><b>编译器检查</b>：开启 <code>-fsanitize=address</code>（PC 上）、<code>-fstack-protector</code>。</li>
</ul>
<p><b>常见根因：</b><code>strcpy</code>/<code>sprintf</code> 没有长度限制、数组下标没检查、<code>memcpy</code> 长度按元素而非字节、结构体大小计算错误。</p>`,
        principle: `<p>内存越界本质是“用错误的地址写数据”。C 语言不做边界检查，越界写会直接修改相邻内存，破坏哪个变量取决于链接布局，所以症状和根因往往不在一个模块。</p>
<p>保护字节和数据断点都是把“隐形的越界”变成“可观测的事件”。</p>`,
        fig: {
          type: "memmap",
          title: "数组越界写坏相邻变量",
          tag: "overflow",
          rows: [
            { name: "buf[16]", text: "实际写入了 20 字节", addr: "0x20000100", cls: "a" },
            { name: "越界部分", text: "写到 buf 之外", addr: "0x20000110", cls: "b" },
            { name: "g_state", text: "被覆盖，值变成垃圾", addr: "0x20000114", cls: "c" },
            { name: "canary", text: "保护字被改写，可检测", addr: "0x20000118", cls: "d" }
          ]
        },
        code: {
          lang: "c",
          title: "canary.c",
          src: `#include <stdint.h>
#include <stddef.h>

#define CANARY 0xDEADBEEFu

typedef struct {
    uint32_t guard_head;
    uint8_t  buf[16];
    uint32_t guard_tail;
} guarded_buf_t;

static guarded_buf_t g_buf = {
    .guard_head = CANARY,
    .guard_tail = CANARY
};

int guarded_write(const uint8_t *src, uint32_t len)
{
    if (len > sizeof(g_buf.buf)) return -1;   /* 显式边界检查 */
    for (uint32_t i = 0; i < len; i++) g_buf.buf[i] = src[i];
    return 0;
}

/* 定期检查保护字，发现越界立即记录 */
int guarded_check(void)
{
    if (g_buf.guard_head != CANARY || g_buf.guard_tail != CANARY) {
        fault_log_save(__FILE__, __LINE__, "buffer overflow");
        return -1;
    }
    return 0;
}`
        },
        codeNote: "保护字只能发现“写到了边界外”，无法发现“写在数组内部但逻辑错误”的问题。",
        apply: `<p>我遇到过一个变量被改成 0 的问题，查 map 发现它紧挨着一个 32 字节的协议缓冲，而解析函数用 <code>memcpy</code> 时把长度单位搞错，写了 4 倍长度。加了边界检查后再没出现。</p>
<p>现在所有外部数据拷贝都走统一的 <code>safe_copy(dst, cap, src, len)</code>，从源头避免。</p>`,
        pitfalls: [
          "<b>用 strcpy/sprintf。</b>没有长度限制，最容易越界。",
          "<b>memcpy 长度按元素算。</b>实际写入字节数是元素数乘大小。",
          "<b>只检查上界不检查下界。</b>负索引同样越界。",
          "<b>越界后继续运行。</b>数据已损坏，应该立即记录并复位。"
        ],
        follow: [
          ["为什么越界写不一定立即崩溃？", "C 不做边界检查，越界地址可能仍是可写内存，写入成功但破坏了别的数据，症状延后出现。"],
          ["如何在 PC 上复现这类问题？", "用 AddressSanitizer 编译，能在越界发生的瞬间报错并给出调用栈，比在 MCU 上排查容易得多。" ]
        ]
      },

      {
        id: "G-13",
        chapter: "periph",
        topic: "timing",
        title: "时序问题怎么用示波器定位？触发和测量要注意什么？",
        diff: "中级",
        freq: "中频",
        type: "调试方法题",
        point: "用边沿/脉宽触发抓偶发事件，测建立保持时间、时钟频率和信号完整性。",
        q: `<p>面试官：SPI 通信偶尔出错，代码看起来没问题，怎么用示波器确认？</p>`,
        exam: `<p>考察硬件调试能力。能说出“多通道同时抓 CS/SCK/MOSI/MISO、看建立保持时间、检查过冲”，就很好。</p>`,
        core: `<p>抓取设置：4 通道同时接 CS、SCK、MOSI、MISO 保证时间对齐；触发选 CS 下降沿或某个异常数据模式抓单次传输；时基按 SPI 时钟设，保证能看到多个时钟周期；偶发问题用序列触发或长时间录制抓出错那一帧。</p><p>要检查：时钟频率和占空比是否与配置一致；CS 建立/保持时间是否满足从设备要求；数据在时钟边沿的建立/保持时间；信号完整性（过冲、振铃、上升沿过慢）；MISO 是否有多个设备同时驱动（电平冲突）。</p><p>常见根因：SPI 模式 CPOL/CPHA 配错、片选切换太快、走线过长、上拉或串联电阻不合适、从设备供电不足。</p>`,
        answer: `<p><b>抓取设置：</b></p>
<ul>
<li>用 4 通道同时接 CS、SCK、MOSI、MISO，保证时间对齐；</li>
<li>触发方式选 CS 下降沿（或某个异常数据模式），抓单次传输；</li>
<li>时基按 SPI 时钟设置，保证能看到多个时钟周期；</li>
<li>偶发问题用“序列触发”或长时间录制，抓出错的那一帧。</li>
</ul>
<p><b>要检查的项：</b></p>
<ul>
<li><b>时钟频率和占空比</b>是否与配置一致；</li>
<li><b>CS 建立/保持时间</b>是否满足从设备要求；</li>
<li><b>数据在时钟边沿的稳定性</b>（建立/保持时间）；</li>
<li><b>信号完整性</b>：过冲、振铃、上升沿过慢；</li>
<li><b>MISO 是否有多个设备同时驱动</b>（电平冲突）。</li>
</ul>
<p><b>常见根因：</b>SPI 模式（CPOL/CPHA）配错、片选切换太快、走线过长、上拉/串联电阻不合适、从设备供电不足。</p>`,
        principle: `<p>数字通信的可靠性依赖“在采样时刻数据稳定”。示波器能直接看到电平随时间的变化，判断是否满足建立/保持时间，这是逻辑分析仪（只显示高低电平）做不到的。</p>
<p>偶发错误往往与时序裕量不足有关，温度、电压、负载变化时才会暴露。</p>`,
        fig: {
          type: "table",
          title: "SPI 时序检查项",
          tag: "timing",
          head: ["检查项", "要求", "异常表现"],
          rows: [
            ["SCK 频率", "≤ 从设备上限", "偶发误码"],
            ["CS 建立时间", "满足 datasheet", "首字节错误"],
            ["数据建立/保持", "采样边沿前后稳定", "随机位错误"],
            ["上升沿", "足够陡峭", "高速下误判"],
            ["MISO 冲突", "仅一个设备驱动", "电平异常"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_timing.c",
          src: `#include "stm32f4xx_hal.h"

/* 降低 SPI 时钟，验证是否是时序裕量问题 */
void spi_slow_down(void)
{
    hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_64;
    HAL_SPI_Init(&hspi1);
}

/* 在片选前后加延时，满足从设备建立/保持时间 */
void spi_write_with_delay(uint8_t cmd, const uint8_t *buf, uint16_t len)
{
    HAL_GPIO_WritePin(CS_PORT, CS_PIN, GPIO_PIN_RESET);
    for (volatile int i = 0; i < 10; i++) { }   /* 建立时间 */

    HAL_SPI_Transmit(&hspi1, &cmd, 1, 10);
    if (len) HAL_SPI_Transmit(&hspi1, (uint8_t *)buf, len, 100);

    for (volatile int i = 0; i < 10; i++) { }   /* 保持时间 */
    HAL_GPIO_WritePin(CS_PORT, CS_PIN, GPIO_PIN_SET);
}`
        },
        codeNote: "延时循环的时长受编译优化和主频影响，精确时序应该用定时器或硬件 SPI 的时序参数。",
        apply: `<p>我做 SPI 屏调试时，遇到偶发花屏，示波器发现 CS 释放到下一次拉低之间太短，屏幕还没处理完。加延时后问题消失。</p>
<p>另一个经验：先降速验证。如果降速后正常，基本可以确定是时序裕量或信号完整性问题，而不是协议逻辑错误。</p>`,
        pitfalls: [
          "<b>只看逻辑分析仪不看波形。</b>看不到电平质量和建立时间。",
          "<b>探头接地不良。</b>测到的波形失真，误判。",
          "<b>时基太大。</b>看不清单个时钟周期。",
          "<b>忽略电源和地噪声。</b>信号完整性问题常与电源有关。"
        ],
        follow: [
          ["逻辑分析仪和示波器怎么配合？", "逻辑分析仪看协议内容和时序关系，示波器看电平和信号完整性；先用逻辑分析仪定位哪一帧错，再用示波器看波形。"],
          ["为什么降低 SPI 速度能解决很多问题？", "降速增加了时序裕量，掩盖了建立/保持时间不足、走线延迟和信号完整性问题，是快速验证手段。" ]
        ]
      },

      {
        id: "G-14",
        chapter: "periph",
        topic: "power",
        title: "产品功耗比设计值高很多，怎么定位？",
        diff: "高级",
        freq: "中频",
        type: "故障排查题",
        point: "分模块断电、看电流波形找周期尖峰、检查 GPIO 和 LDO 静态电流。",
        q: `<p>面试官：低功耗产品实测休眠电流 200μA，设计值是 10μA，怎么查？</p>`,
        exam: `<p>考察功耗调试方法。能说出“分块断开、波形分析、GPIO 状态、LDO 静态电流”，就很好。</p>`,
        core: `<p>顺序：① 确认测量点和方法，电流表串整板供电回路、量程合适，注意表的内阻和采样时间；② 看波形，示波器加电流探头或采样电阻看周期性尖峰，有尖峰说明有外设或中断周期唤醒；③ 分块断开，依次断传感器、无线模块、显示屏供电，看电流哪一步降下来；④ 查 GPIO，悬空输入、外部上拉常通、LED 限流电阻过小都是常见漏电点；⑤ 查 LDO/DC-DC 静态电流，可能几十 µA 比 MCU 休眠还大，要选低静态电流型号；⑥ 确认 MCU 真睡了，读低功耗模式寄存器或用 GPIO 打标看是否反复唤醒。</p><p>常见根因：调试接口没关、Flash/EEPROM 上拉、传感器未进休眠、看门狗或 RTOS tick 周期唤醒、电源指示灯常亮。</p>`,
        answer: `<p><b>排查顺序：</b></p>
<ol>
<li><b>确认测量点和方法</b>：电流表串在整板供电回路，量程合适；注意表的内阻和采样时间。</li>
<li><b>看波形</b>：用示波器加电流探头或采样电阻，看是否有周期性尖峰。如果有，说明有外设/中断周期性唤醒。</li>
<li><b>分块断开</b>：依次断开传感器、无线模块、显示屏供电，看电流哪一步降下来，定位耗电单元。</li>
<li><b>检查 GPIO</b>：悬空输入、外部上拉一直导通、LED 限流电阻过小，都是常见漏电点。</li>
<li><b>检查 LDO/DC-DC</b>：静态电流可能几十 μA，比 MCU 休眠还大；选低静态电流的型号。</li>
<li><b>确认 MCU 真的睡了</b>：读低功耗模式寄存器，或用 GPIO 打标看是否反复唤醒。</li>
</ol>
<p><b>常见根因：</b>调试接口没关、Flash/EEPROM 上拉、传感器未进入休眠、看门狗/RTOS tick 周期唤醒、电源指示灯常亮。</p>`,
        principle: `<p>功耗是各模块电流之和。休眠电流通常在微安级，任何一个未关闭的模块或漏电通路都可能让它翻倍。</p>
<p>周期性尖峰说明系统在反复唤醒，平均电流被拉高；这时要看唤醒源，而不是只测静态值。</p>`,
        fig: {
          type: "flow",
          title: "功耗异常的定位顺序",
          tag: "power debug",
          items: [
            { t: "确认测量", d: "串在总回路，量程正确" },
            { t: "看波形", d: "找周期性尖峰" },
            { t: "分块断电", d: "定位耗电模块" },
            { t: "查 GPIO/LDO", d: "漏电和静态电流" },
            { t: "确认睡眠", d: "是否反复唤醒" }
          ]
        },
        code: {
          lang: "c",
          title: "power_debug.c",
          src: `#include "stm32f4xx_hal.h"

/* 进入休眠前关闭调试接口和不需要的外设 */
void low_power_prepare(void)
{
    /* 1. 关闭调试模块（量产版本） */
    __HAL_RCC_DBGMCU_CLK_DISABLE();

    /* 2. 关闭未使用的 GPIO 时钟和外设 */
    __HAL_RCC_GPIOB_CLK_DISABLE();
    __HAL_RCC_ADC1_CLK_DISABLE();

    /* 3. 所有未使用引脚设为模拟输入，避免悬空翻转 */
    GPIO_InitTypeDef gpio = {0};
    gpio.Pin  = GPIO_PIN_All;
    gpio.Mode = GPIO_MODE_ANALOG;
    gpio.Pull = GPIO_NOPULL;
    HAL_GPIO_Init(GPIOB, &gpio);
}

/* 用 GPIO 打标确认是否真的进入休眠 */
void mark_sleep_state(int sleeping)
{
    HAL_GPIO_WritePin(MARK_PORT, MARK_PIN,
                      sleeping ? GPIO_PIN_SET : GPIO_PIN_RESET);
}`
        },
        codeNote: "把未使用引脚设为模拟输入能显著降低漏电，但不要影响正在使用的外设引脚。",
        apply: `<p>我遇到过一次休眠电流 180μA，最后发现是调试器连接时 DBGMCU 保持调试模块供电。断开调试器、关闭调试时钟后降到 8μA。</p>
<p>另一次是传感器 I2C 上拉电阻一直供电，传感器未进入休眠，断开传感器供电后电流立刻下降。</p>`,
        pitfalls: [
          "<b>只测平均电流。</b>看不到周期性唤醒。",
          "<b>忽略 LDO 静态电流。</b>几十 μA 很常见。",
          "<b>GPIO 悬空。</b>输入缓冲器翻转耗电。",
          "<b>调试接口常开。</b>调试模块本身耗电。"
        ],
        follow: [
          ["为什么未使用引脚要设为模拟输入？", "数字输入缓冲器在电平接近阈值时会来回翻转，产生漏电；模拟输入关闭缓冲器，漏电最小。"],
          ["如何测微安级电流？", "用高精度功耗分析仪，或串联大阻值采样电阻配合高分辨率 ADC；注意量程切换和积分时间。" ]
        ]
      },

      {
        id: "G-15",
        chapter: "tool",
        topic: "selftest",
        title: "生产测试怎么设计自检流程？如何避免漏检？",
        diff: "中级",
        freq: "中频",
        type: "工程实践题",
        point: "上电自检覆盖关键外设和存储，治具自动判定，记录测试数据并可追溯。",
        q: `<p>面试官：产线要测几百块板子，怎么保证每块都测到位、不靠人工判断？</p>`,
        exam: `<p>考察量产思维。能说出“自检项、治具、自动判定、记录追溯”，就很好。</p>`,
        core: `<p>自检项：存储 Flash/EEPROM 读写校验和 CRC；通信串口自环、I2C/SPI 读器件 ID；模拟 ADC 基准通道、内部温度传感器；IO GPIO 回环、LED/继电器动作；无线射频发射功率和接收灵敏度（需仪器）；电源电压电流是否在范围。</p><p>治具与自动化：治具提供标准负载和回环连接，上位机通过串口发测试命令，设备执行自检返回结果，上位机自动判 PASS/FAIL，不依赖人工看灯。记录追溯：每块板记录序列号、测试项结果、时间、操作员并上传 MES，便于质量追溯。</p><p>防漏检：测试项覆盖关键功能、失败项明确原因、定期用已知不良品验证治具能检出。</p>`,
        answer: `<p><b>自检项设计：</b></p>
<ul>
<li><b>存储</b>：Flash/EEPROM 读写校验、CRC；</li>
<li><b>通信</b>：串口自环、I2C/SPI 器件 ID 读取；</li>
<li><b>模拟</b>：ADC 基准通道、内部温度传感器；</li>
<li><b>IO</b>：GPIO 回环、LED/继电器动作；</li>
<li><b>无线</b>：射频发射功率、接收灵敏度（需要仪器）；</li>
<li><b>电源</b>：电压、电流是否在范围。</li>
</ul>
<p><b>治具与自动化：</b>治具提供标准负载和回环连接，上位机通过串口发送测试命令，设备执行自检并返回结果；上位机自动判定 PASS/FAIL，不依赖人工看灯。</p>
<p><b>记录追溯：</b>记录每块板的序列号、测试项结果、测试时间、操作员，上传 MES 系统，便于质量追溯。</p>
<p><b>避免漏检：</b>测试项覆盖关键功能；失败项要明确原因；定期用已知不良品验证治具能检出（防漏检）。</p>`,
        principle: `<p>量产测试的目标不是“证明功能正常”，而是“以可接受的成本筛出不良品”。测试项要覆盖主要失效模式，判定要客观、可重复。</p>
<p>治具和自动化减少人为误差，记录让问题可追溯，两者共同保证出货质量。</p>`,
        fig: {
          type: "flow",
          title: "产线自检流程",
          tag: "production test",
          items: [
            { t: "扫码", d: "绑定序列号" },
            { t: "上电自检", d: "存储、通信、IO、ADC" },
            { t: "治具测试", d: "射频、功耗、按键" },
            { t: "自动判定", d: "PASS / FAIL + 原因" },
            { t: "上传记录", d: "MES 追溯" }
          ]
        },
        code: {
          lang: "c",
          title: "selftest.c",
          src: `#include <stdint.h>

typedef enum {
    TEST_PASS = 0,
    TEST_FAIL_FLASH,
    TEST_FAIL_UART,
    TEST_FAIL_I2C,
    TEST_FAIL_ADC,
    TEST_FAIL_GPIO
} test_result_t;

test_result_t test_flash(void)
{
    uint32_t buf[16];
    for (int i = 0; i < 16; i++) buf[i] = 0xA5A50000u | i;

    if (flash_write(TEST_ADDR, buf, sizeof(buf)) != 0) return TEST_FAIL_FLASH;
    if (flash_verify(TEST_ADDR, buf, sizeof(buf)) != 0) return TEST_FAIL_FLASH;
    return TEST_PASS;
}

test_result_t test_i2c_devices(void)
{
    if (i2c_probe(0x3C) != 0) return TEST_FAIL_I2C;   /* OLED */
    if (i2c_probe(0x68) != 0) return TEST_FAIL_I2C;   /* RTC */
    return TEST_PASS;
}

/* 统一入口：返回第一个失败项，上位机据此判定 */
test_result_t factory_selftest(void)
{
    test_result_t r;
    if ((r = test_flash()) != TEST_PASS) return r;
    if ((r = test_i2c_devices()) != TEST_PASS) return r;
    return TEST_PASS;
}`
        },
        codeNote: "自检代码要独立于业务逻辑，避免业务配置错误导致误判；测试项可按型号裁剪。",
        apply: `<p>我做过的产品在产线用治具自动跑自检，每块板记录 20 多项数据，包括电流、射频功率、按键响应。后期分析不良率时，能直接定位到某个批次或某个器件。</p>
<p>定期用人为制造的不良品（如断开某个器件）验证治具能检出，防止“治具本身失效导致全 PASS”。</p>`,
        pitfalls: [
          "<b>只测通电亮灯。</b>大量隐性不良流出。",
          "<b>人工判断结果。</b>标准不一致，容易漏检。",
          "<b>不记录数据。</b>出问题无法追溯。",
          "<b>治具本身不校验。</b>治具坏了还全 PASS。"
        ],
        follow: [
          ["如何测试无线模块的发射功率？", "用综测仪或功率计，治具屏蔽箱内连接天线，设备发射固定功率，仪器读取并判定范围。"],
          ["自检应该放在启动流程里吗？", "量产自检由治具触发，不放在每次启动；可以保留一个简化版上电自检，检查关键存储和外设是否正常。" ]
        ]
      },

      {
        id: "G-16",
        chapter: "tool",
        topic: "semihost",
        title: "printf 怎么重定向到串口？semihosting 为什么慢？",
        diff: "中级",
        freq: "中频",
        type: "调试方法题",
        point: "重写 _write/fputc 把字符送到串口；semihosting 通过调试器陷入主机，速度慢且依赖调试器。",
        q: `<p>面试官：代码里用了 printf，但串口没有输出，怎么回事？semihosting 能不能用于量产？</p>`,
        exam: `<p>考察 C 库移植和调试手段。能说出“重定向 _write、semihosting 依赖调试器、量产要关掉”，就很好。</p>`,
        core: `<p>重定向：C 库最终调用底层字符输出函数（ARM GCC 是 <code>_write</code>，Keil 是 <code>fputc</code>），重写它把字符通过串口发出即可：GCC 实现 <code>int _write(int fd, char *buf, int len)</code> 调 <code>HAL_UART_Transmit</code>，Keil 实现 <code>int fputc(int ch, FILE *f)</code> 发单字符，注意包含对应头文件并确保 C 库支持。</p><p>semihosting 通过调试器把 I/O 请求转发到主机，不需要串口，原理是执行一条特殊指令（BKPT），调试器捕获后代替目标机完成 I/O。慢的原因是每次输出都要陷入调试器、主机处理再返回，开销是普通串口几十倍，而且必须连调试器，脱机程序会卡死或 HardFault。只用于开发阶段快速打印，量产必须关掉（链接去掉 <code>--specs=rdimon.specs</code> 或 <code>-lrdimon</code>），改用串口或 RTT。</p>`,
        answer: `<p><b>printf 重定向：</b>C 库最终会调用底层字符输出函数（ARM GCC 是 <code>_write</code>，Keil 是 <code>fputc</code>）。重写它，把字符通过串口发出即可：</p>
<ul>
<li>GCC：实现 <code>int _write(int fd, char *buf, int len)</code>，调用 <code>HAL_UART_Transmit</code>；</li>
<li>Keil：实现 <code>int fputc(int ch, FILE *f)</code>，发送单个字符；</li>
<li>需要包含对应的头文件，并确保 C 库支持。</li>
</ul>
<p><b>semihosting：</b>通过调试器把 I/O 请求转发到主机，不需要串口。原理是执行一条特殊指令（BKPT），调试器捕获后代替目标机完成 I/O。</p>
<p><b>为什么慢：</b>每次输出都要陷入调试器、主机处理、再返回，开销是普通串口的几十倍；而且<b>必须连接调试器</b>，脱离调试器程序会卡死或 HardFault。</p>
<p><b>使用建议：</b>semihosting 只用于开发阶段快速打印；量产固件必须关闭（链接时去掉 <code>--specs=rdimon.specs</code> 或 <code>-lrdimon</code>），改用串口或 RTT。</p>`,
        principle: `<p>C 标准库的 I/O 是分层的：printf 格式化后调用底层 write，底层 write 由具体平台实现。嵌入式没有操作系统，必须由开发者提供这个底层实现。</p>
<p>semihosting 把目标机的 I/O 请求“代理”给主机，依赖调试通道，所以只在调试时可用。</p>`,
        fig: {
          type: "layers",
          title: "printf 的输出路径",
          tag: "printf retarget",
          items: [
            { tag: "应用", t: "printf / sprintf", d: "格式化字符串" },
            { tag: "C 库", t: "vfprintf", d: "调用底层 write" },
            { tag: "重定向", t: "_write / fputc", d: "开发者实现" },
            { tag: "输出", t: "UART / RTT / semihosting", d: "实际发送" }
          ]
        },
        code: {
          lang: "c",
          title: "retarget.c",
          src: `#include <stdio.h>
#include "stm32f4xx_hal.h"

extern UART_HandleTypeDef huart2;

/* GCC newlib：重定向 _write */
int _write(int fd, char *ptr, int len)
{
    (void)fd;
    HAL_UART_Transmit(&huart2, (uint8_t *)ptr, (uint16_t)len, HAL_MAX_DELAY);
    return len;
}

/* Keil：重定向 fputc（按工具链选择其一） */
/*
int fputc(int ch, FILE *f)
{
    (void)f;
    uint8_t c = (uint8_t)ch;
    HAL_UART_Transmit(&huart2, &c, 1, HAL_MAX_DELAY);
    return ch;
}
*/

/* 建议：调试打印用宏控制，量产关闭 */
#ifdef ENABLE_LOG
#define LOG(...) printf(__VA_ARGS__)
#else
#define LOG(...) do { } while (0)
#endif`
        },
        codeNote: "HAL_UART_Transmit 是阻塞的，不要在中断里 printf；高频日志会严重拖慢系统。",
        apply: `<p>我调试时用 RTT（SEGGER Real-Time Transfer）代替串口 printf，速度快、不占串口、不需要额外引脚，量产时关闭。</p>
<p>如果必须用 printf，我会把它放在低优先级日志任务里，业务代码只写环形缓冲，避免阻塞。</p>`,
        pitfalls: [
          "<b>只重定向不使能串口。</b>字符发不出去。",
          "<b>在中断里 printf。</b>阻塞、不可重入。",
          "<b>量产保留 semihosting。</b>脱离调试器直接卡死。",
          "<b>printf 浮点。</b>需要额外的库支持，体积增大。"
        ],
        follow: [
          ["为什么 printf 会增加很多 Flash？", "格式化引擎和浮点支持会链接大量库代码；可以用精简版 printf 或只在调试版本启用。"],
          ["RTT 是什么？", "SEGGER 的实时传输技术，通过调试接口在目标机和主机之间传数据，不需要串口，速度快，适合高频日志。" ]
        ]
      },

      {
        id: "G-17",
        chapter: "tool",
        topic: "perf",
        title: "怎么测量一段代码的执行时间？GPIO 打点和 DWT 哪个更准？",
        diff: "中级",
        freq: "中频",
        type: "性能分析题",
        point: "DWT 周期计数器精度最高，GPIO 打点直观但受翻转和探头影响，示波器适合看整体时序。",
        q: `<p>面试官：想知道一个中断处理函数执行了多久，怎么测？</p>`,
        exam: `<p>考察性能测量手段。能说出“DWT 周期计数、GPIO 翻转 + 示波器、RTOS 运行统计”，就很好。</p>`,
        core: `<p>DWT 周期计数器最准：Cortex-M3/M4/M7 内置 DWT，在函数入口和出口读 <code>CYCCNT</code>，差值除以主频就是时间，精度到一个时钟周期，不需要外部仪器。</p><p>GPIO 翻转加示波器：入口拉高、出口拉低测脉宽，直观、能看到抖动和周期性，但 GPIO 翻转本身有开销、探头有电容负载，测量值略偏大。RTOS 运行统计能看到各任务占用比例，适合宏观分析不适合单函数精度。ETM/ETB 指令 trace 能精确还原执行流和周期，但需要硬件支持。</p>`,
        answer: `<p><b>方法一：DWT 周期计数器（最准）</b></p>
<ul>
<li>Cortex-M3/M4/M7 内置 DWT，可以读 CPU 周期数；</li>
<li>在函数入口和出口读取 CYCCNT，差值除以主频就是时间；</li>
<li>精度到一个时钟周期，不需要外部仪器。</li>
</ul>
<p><b>方法二：GPIO 翻转 + 示波器</b></p>
<ul>
<li>入口拉高、出口拉低，用示波器测脉宽；</li>
<li>直观，能看到抖动和周期性；</li>
<li>但 GPIO 翻转本身有开销，探头也有电容负载，测量值略偏大。</li>
</ul>
<p><b>方法三：RTOS 运行统计</b></p>
<ul>
<li>FreeRTOS 开启运行时间统计，能看到各任务占用比例；</li>
<li>适合宏观分析，不适合单函数精度。</li>
</ul>
<p><b>方法四：调试器 trace</b></p>
<ul>
<li>ETM/ETB 指令 trace 可以精确还原执行流和周期，但需要硬件支持。</li>
</ul>`,
        principle: `<p>测量本身会引入开销（GPIO 操作、计数器读取），所以要在被测代码之外做标记，或者接受少量误差。</p>
<p>DWT 计数的是 CPU 周期，不受中断和调度影响；示波器测的是实际时间，包含中断延迟和总线等待，两者视角不同。</p>`,
        fig: {
          type: "table",
          title: "执行时间测量方法对比",
          tag: "profiling",
          head: ["方法", "精度", "开销", "适用"],
          rows: [
            ["DWT 周期计数", "1 周期", "极低", "单函数、中断"],
            ["GPIO + 示波器", "较高", "低（但有负载）", "整体时序、抖动"],
            ["RTOS 统计", "毫秒级", "低", "任务占比"],
            ["指令 trace", "精确", "需硬件", "复杂时序分析"]
          ]
        },
        code: {
          lang: "c",
          title: "dwt_timing.c",
          src: `#include <stdint.h>

#define DWT_CTRL   (*(volatile uint32_t *)0xE0001000u)
#define DWT_CYCCNT (*(volatile uint32_t *)0xE0001004u)
#define DEMCR      (*(volatile uint32_t *)0xE000EDFCu)

void dwt_init(void)
{
    DEMCR |= (1u << 24);        /* TRCENA */
    DWT_CYCCNT = 0;
    DWT_CTRL |= 1u;             /* CYCCNTENA */
}

/* 测量函数执行周期数 */
uint32_t measure_cycles(void (*fn)(void))
{
    uint32_t start = DWT_CYCCNT;
    fn();
    return DWT_CYCCNT - start;
}

/* 换算成微秒（整数运算，避免浮点） */
uint32_t cycles_to_us(uint32_t cycles)
{
    return (uint32_t)((uint64_t)cycles * 1000000u / SystemCoreClock);
}`
        },
        codeNote: "CYCCNT 是 32 位，主频 168MHz 时约 25 秒回绕，测量长时间间隔要做溢出处理。",
        apply: `<p>优化中断服务程序时，我用 DWT 测优化前后的周期数，能精确到几十个周期，比示波器更容易对比。</p>
<p>看整体时序（中断延迟、任务切换）时用 GPIO 打点 + 示波器，能直观看到抖动和最长延迟。</p>`,
        pitfalls: [
          "<b>用软件延时估算。</b>编译优化后完全不准。",
          "<b>DWT 没使能。</b>CYCCNT 一直是 0。",
          "<b>长时间测量不回绕处理。</b>结果错误。",
          "<b>GPIO 打点影响被测代码。</b>测量值偏大。"
        ],
        follow: [
          ["如何测最坏情况执行时间（WCET）？", "构造最坏输入，多次测量取最大值；或用静态分析工具分析所有路径，结合硬件周期估算。"],
          ["中断延迟怎么测？", "用一个 GPIO 在中断入口翻转，另一个 GPIO 在事件发生时翻转，示波器测两者时间差；注意包含硬件入栈时间。" ]
        ]
      }
    ]
  });
})();
