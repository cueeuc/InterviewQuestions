/* ============================================================
   04 MCU 与 ARM 架构
   ============================================================ */
(function () {
  "use strict";

  EIK.register("mcu-arm", {
    chapters: [
      {
        id: "core",
        title: "架构与内核",
        topics: [
          { id: "mcu", title: "MCU / MPU / SoC" },
          { id: "reg", title: "Cortex-M 寄存器" }
        ]
      },
      {
        id: "exception",
        title: "异常与中断",
        topics: [
          { id: "stack", title: "双堆栈与特权级" },
          { id: "entry", title: "异常响应过程" },
          { id: "nvic", title: "NVIC 与优先级" }
        ]
      },
      {
        id: "boot",
        title: "启动与时钟",
        topics: [
          { id: "startup", title: "启动文件与复位流程" },
          { id: "clock", title: "时钟系统与 SysTick" }
        ]
      }
    ],

    questions: [
      {
        id: "A-01",
        chapter: "core",
        topic: "mcu",
        title: "MCU、MPU、SoC 有什么区别？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "集成度与是否跑操作系统的差异，以及选型时的判断依据。",
        q: `<p>面试官：<strong>MCU、MPU、SoC</strong> 分别是什么？有什么区别？你做项目时怎么选？</p>`,
        exam: `<p>考察对整个嵌入式硬件版图的认知。能说清“MCU 片上集成 Flash 和 RAM，通常跑裸机或 RTOS；MPU 只有处理器核，需要外挂 DDR，跑 Linux”，并且举出具体型号，说明你有实际视野。</p>`,
        core: `<p>MCU 把 CPU 核、Flash、SRAM、外设集成在一颗芯片里，上电就能跑、不用外部存储，适合实时控制；MPU 通常只有 CPU 核和 Cache，必须外挂 DDR 和 Flash，跑 Linux/Android；SoC 集成更广，还含 GPU、NPU、基带，一颗芯片就是一个完整系统。</p><p>选型：采集传感器、控电机用 MCU（成本低、功耗低、实时性好）；要图形界面、网络协议栈、文件系统就上 MPU 或 SoC。</p>`,
        answer: `<p>MCU 是微控制器，把 CPU 核、Flash、SRAM、各种外设（GPIO、UART、ADC、定时器）集成在一颗芯片里，上电就能跑，不需要外部存储。典型代表是 STM32F103、GD32、NXP 的 LPC 系列，通常跑裸机或 FreeRTOS。</p>
<p>MPU 是微处理器，通常只包含 CPU 核和少量缓存，需要外挂 DDR 内存和 Flash 才能工作，主频高、算力强，跑 Linux 或 Android。典型代表是 i.MX6、全志、瑞芯微的芯片。</p>
<p>SoC 是片上系统，集成的范围更广，除了 CPU 还可能包含 GPU、NPU、视频编解码、Wi-Fi/蓝牙基带等，一颗芯片就是一个完整系统。手机芯片、智能音箱主控都属于 SoC。</p>
<p>选型上看需求：如果只是采集几个传感器、控制电机，MCU 成本低、功耗低、实时性好、开发简单；如果需要跑图形界面、网络协议栈、文件系统，就得上 MPU 或 SoC。</p>`,
        principle: `<p>三者的边界并不绝对。高端的 Cortex-M7 MCU 主频能到 480MHz 甚至 1GHz，带 Cache 和外部存储接口，能力接近低端 MPU；而一些 MPU 内部也集成了 Flash 和 SRAM。真正的区别在于<strong>是否有 MMU</strong>——有 MMU 才能运行完整的 Linux（虚拟内存、进程隔离），只有 MPU（内存保护单元）的话只能跑 RTOS 或裸机。</p>
<p>注意这里的 MPU 有两个含义：一是“微处理器单元”（Microprocessor Unit），二是 Cortex-M 里的“内存保护单元”（Memory Protection Unit）。面试时要根据上下文区分，必要时主动澄清。</p>`,
        fig: {
          type: "table",
          title: "MCU / MPU / SoC 对比",
          tag: "compare",
          head: ["维度", "MCU", "MPU", "SoC"],
          rows: [
            ["集成度", "CPU + Flash + RAM + 外设", "CPU + 缓存，需外挂存储", "CPU + 多种加速器 + 基带"],
            ["典型主频", "24MHz ~ 480MHz", "500MHz ~ 2GHz", "1GHz 以上"],
            ["操作系统", "裸机 / RTOS", "Linux / Android", "Linux / Android / RTOS"],
            ["内存管理", "无 MMU，可能有 MPU", "有 MMU", "有 MMU"],
            ["开发难度", "低，工具链简单", "中高，需移植 BSP", "高，涉及多子系统"],
            ["典型场景", "电机控制、传感器节点", "工业 HMI、网关", "手机、智能音箱"]
          ]
        },
        apply: `<p>实际项目里常见的架构是“MCU + MPU”双芯片：MCU 负责硬实时控制（电机、采样），MPU 跑 Linux 做界面和联网，两者用串口或 SPI 通信。这样既保证实时性，又能提供丰富的上层功能。</p>
<p>如果成本敏感且功能不复杂，优先选 MCU；贸然上 Linux 会带来启动时间、功耗、BSP 维护等一系列成本。</p>`,
        pitfalls: [
          "<b>把 MPU 理解成“更高级的 MCU”。</b>关键差异是 MMU 和外部存储，不是主频。没有 MMU 就跑不了标准 Linux。",
          "<b>认为 SoC 一定比 MPU 强。</b>SoC 强调的是集成度，某些 SoC 的 CPU 核性能并不高，强在多媒体和 connectivity。",
          "<b>忽略实时性差异。</b>Linux 不是硬实时系统，中断延迟可能到毫秒级；硬实时控制必须放在 MCU 或 RTOS 上。"
        ],
        follow: [
          [
            "MMU 和 MPU 有什么区别？",
            "MMU 做虚拟地址到物理地址的映射，支持进程隔离和内存换页，是运行 Linux 的前提；MPU 只做访问权限和属性保护（可读/可写/可执行），不改变地址映射，用于 RTOS 保护关键内存区域。"
          ],
          [
            "为什么 MCU 上一般不跑 Linux？",
            "没有 MMU、RAM 太小（几十 KB 到几 MB）、Flash 直接 XIP 不需要文件系统，而且 Linux 的启动时间和功耗都不适合 MCU 场景。uClinux 可以在无 MMU 上跑，但限制很多。"
          ],
          [
            "Cortex-A 和 Cortex-M 有什么区别？",
            "A 系列面向应用处理器，有 MMU、多级流水、乱序执行，跑 Linux/Android；M 系列面向微控制器，低功耗、确定性中断、无 MMU，跑裸机或 RTOS；R 系列面向实时，介于两者之间。"
          ]
        ]
      },

      {
        id: "A-02",
        chapter: "core",
        topic: "reg",
        title: "Cortex-M 有哪些寄存器？xPSR 有什么用？",
        diff: "中级",
        freq: "高频",
        type: "基础概念题",
        point: "R0-R15 的分工、特殊寄存器，以及 xPSR 中条件标志和 IPSR 的作用。",
        q: `<p>面试官：Cortex-M 内核有哪些<strong>寄存器</strong>？R13、R14、R15 分别是什么？xPSR 里都存了什么？中断号从哪里读？</p>`,
        exam: `<p>考察你是否了解内核的资源模型。能说出“R13 是栈指针、R14 是链接寄存器、R15 是 PC”“xPSR 的 IPSR 字段存当前异常号”，说明你读过内核手册；再补一句“进入异常时硬件自动压栈这 8 个寄存器”，就更完整了。</p>`,
        core: `<p>16 个通用寄存器：R0-R12 是数据寄存器，R0-R3 传参和返回值、调用者保存，R4-R11 被调用者保存；R13 是 SP（物理上有 MSP/PSP，由 CONTROL 选择）；R14 是 LR，异常里存 <code>EXC_RETURN</code>；R15 是 PC。</p><p>特殊寄存器有 xPSR、PRIMASK/BASEPRI/FAULTMASK、CONTROL。xPSR 含 APSR 条件标志、EPSR 的 Thumb/IT 状态、IPSR 当前异常号，所以 <code>__get_IPSR()</code> 能判断当前在哪个中断里。</p>`,
        answer: `<p>Cortex-M 有 16 个通用寄存器 R0-R15。R0-R12 是通用数据寄存器，其中 R0-R3 在函数调用时用于传参和返回值，属于调用者保存；R4-R11 是被调用者保存，函数要用就得先压栈。</p>
<p>R13 是栈指针 SP，在 Cortex-M 上物理上有两个：MSP 主栈指针和 PSP 进程栈指针，具体用哪个由 CONTROL 寄存器决定。R14 是链接寄存器 LR，保存函数返回地址；在异常里它保存的是 EXC_RETURN 特殊值。R15 是程序计数器 PC。</p>
<p>特殊寄存器有三个：xPSR 程序状态寄存器、PRIMASK/BASEPRI/FAULTMASK 中断屏蔽寄存器、CONTROL 控制寄存器。</p>
<p>xPSR 分三部分：APSR 存条件标志（N/Z/C/V/Q）和 GE 位；EPSR 存 Thumb 状态位和 IT 指令状态；IPSR 存当前异常号。所以读 <code>__get_IPSR()</code> 就能知道当前在哪个中断里。</p>`,
        principle: `<p>APSR 的条件标志由比较指令更新，条件跳转指令根据它们决定是否跳转。这也是为什么在中断里修改标志位后返回，主程序的条件判断可能受影响——硬件压栈保存了 xPSR，返回时会恢复，所以正常情况下不会。</p>
<p>IPSR 的低 9 位是异常号：0 是线程模式，1 是复位，2 是 NMI，3 是 HardFault，11 是 SVC，14 是 PendSV，15 是 SysTick，16 以上是外部中断。调试时读 IPSR 能快速判断当前卡在哪个中断里。</p>`,
        fig: {
          type: "table",
          title: "常用内核寄存器",
          tag: "register",
          head: ["寄存器", "名称", "作用"],
          rows: [
            ["R0-R3", "参数/临时", "函数传参、返回值，调用者保存"],
            ["R4-R11", "变量", "局部变量，被调用者保存"],
            ["R12", "IP", "过程间调用临时寄存器"],
            ["R13", "SP", "栈指针，MSP 或 PSP"],
            ["R14", "LR", "返回地址 / EXC_RETURN"],
            ["R15", "PC", "程序计数器"],
            ["xPSR", "状态", "条件标志 + 异常号 + Thumb 位"],
            ["PRIMASK", "中断屏蔽", "置 1 关闭所有可屏蔽中断"],
            ["BASEPRI", "优先级屏蔽", "屏蔽不高于某优先级的中断"],
            ["CONTROL", "控制", "选择栈指针、特权级"]
          ]
        },
        apply: `<p>写 RTOS 或 bootloader 时经常直接操作这些寄存器：切换任务要改 PSP 和 CONTROL；关中断用 <code>__disable_irq()</code>（本质是设 PRIMASK）；判断是否在中断上下文用 <code>__get_IPSR()</code>，这在写“中断里不能阻塞”的断言时很有用。</p>
<p>调试 HardFault 时，从栈里取出压入的 PC 值，就能定位到出错的那条指令。</p>`,
        pitfalls: [
          "<b>认为只有一个 SP。</b>Cortex-M 物理上有 MSP 和 PSP 两个，当前用哪个由 CONTROL.SPSEL 决定。RTOS 里任务用 PSP、中断用 MSP。",
          "<b>在中断里读 IPSR 之前先关中断。</b>没必要，IPSR 是只读的，读它不会改变状态。",
          "<b>直接改 PC 实现跳转。</b>应该用函数指针调用或 <code>BX</code>，直接赋值 PC 会丢失 Thumb 状态位，导致 HardFault。"
        ],
        follow: [
          [
            "为什么函数返回地址存在 LR 里？嵌套调用怎么办？",
            "BL 指令把返回地址写入 LR，被调用函数如果还要调用别的函数，会先把 LR 压栈保存，返回前弹出。这就是“链接寄存器”名字的由来。"
          ],
          [
            "PRIMASK 和 BASEPRI 有什么区别？",
            "PRIMASK 置 1 屏蔽所有可屏蔽中断（NMI 和 HardFault 除外），简单粗暴；BASEPRI 只屏蔽优先级数值不低于设定值的中断，可以实现“只关一部分中断”，RTOS 的临界区通常用它。"
          ],
          [
            "如何判断当前是否在中断中？",
            "读 IPSR，非 0 就在异常处理中：<code>__get_IPSR() != 0</code>。也可以用 <code>SCB-&gt;ICSR</code> 的 VECTACTIVE 字段。"
          ]
        ]
      },

      {
        id: "A-03",
        chapter: "exception",
        topic: "stack",
        title: "MSP 和 PSP 有什么区别？为什么要设计双堆栈？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "双堆栈的隔离价值、CONTROL 寄存器切换，以及 RTOS 如何利用 PSP。",
        q: `<p>面试官：<strong>MSP 和 PSP</strong> 分别是什么？为什么 Cortex-M 要设计两个栈指针？FreeRTOS 是怎么用它们的？如果任务栈溢出会怎样？</p>`,
        exam: `<p>这是 RTOS 移植的核心知识点。能说清“中断用 MSP、任务用 PSP，实现栈隔离”“CONTROL 寄存器切换”“异常入口自动用 MSP”，说明你理解上下文切换的底层。</p>`,
        core: `<p>MSP 复位后默认使用、异常处理强制使用；PSP 给用户任务用。</p><p>双栈是为了隔离：ISR 用自己的栈，某个任务栈溢出不会立刻踩坏中断现场，系统还有机会记录错误或复位。FreeRTOS 启动调度器时初始化各任务栈，任务运行时 <code>CONTROL.SPSEL=1</code> 用 PSP，进异常硬件自动切 MSP；PendSV 里把当前 PSP 存进 TCB，再恢复下一个任务的 PSP。栈溢出常表现为随机死机，所以 RTOS 会在栈顶填魔数做检测。</p>`,
        answer: `<p>MSP 是主栈指针（Main Stack Pointer），复位后默认使用它，异常处理也强制使用它。PSP 是进程栈指针（Process Stack Pointer），通常给用户任务使用。</p>
<p>设计两个栈的目的是<strong>隔离</strong>：中断服务程序用独立的 MSP，即使某个任务的栈溢出，也不会立刻破坏中断的现场，系统还有机会记录错误或复位。如果没有隔离，任务栈溢出会直接踩坏中断栈，故障现象会非常混乱。</p>
<p>FreeRTOS 的做法是：启动调度器时把所有任务的栈都初始化好，每个任务的 TCB 里保存它的栈顶；任务运行时 CONTROL.SPSEL 置 1 使用 PSP，异常发生时硬件自动切到 MSP。上下文切换时，PendSV 里保存当前任务的 PSP 到 TCB，再从下一个任务的 TCB 恢复 PSP。</p>
<p>任务栈溢出时，通常会踩坏相邻的内存（可能是另一个任务的栈或全局变量），表现为随机死机或数据错乱。所以 RTOS 一般提供栈溢出检测：在栈顶填魔数，切换时检查是否被改写。</p>`,
        principle: `<p>栈指针的选择由 CONTROL 寄存器的 SPSEL 位决定，但只在<strong>线程模式</strong>下有效。一旦进入异常（处理模式），硬件强制使用 MSP 执行 Handler；同时把“返回后用哪个栈、要不要恢复 FP 现场”编码进 EXC_RETURN（bit2 选栈、bit4 选浮点帧），返回时据此恢复，而不是把整个 CONTROL 存起来。</p>
<p>这也是为什么中断服务函数里定义的局部变量都分配在 MSP 上：中断嵌套越深，MSP 消耗越大。所以 MSP 的大小要按“最深中断嵌套 + 中断里的局部变量”来估算，而不是按普通函数。</p>`,
        fig: {
          type: "flow",
          title: "任务与中断的栈切换",
          tag: "sequence",
          items: [
            { t: "任务运行", d: "PSP + 线程模式" },
            { t: "中断到来", d: "8 字异常帧压到 PSP" },
            { t: "切到 MSP", d: "Handler 模式用主栈" },
            { t: "ISR 执行", d: "局部变量在 MSP 上" },
            { t: "返回线程", d: "按 EXC_RETURN 恢复 PSP" }
          ]
        },
        code: {
          lang: "c",
          title: "stack_switch.c",
          src: `/* 读取当前使用的栈指针 */
static inline uint32_t get_msp(void)
{
    uint32_t v;
    __asm volatile ("MRS %0, msp" : "=r" (v));
    return v;
}

static inline uint32_t get_psp(void)
{
    uint32_t v;
    __asm volatile ("MRS %0, psp" : "=r" (v));
    return v;
}

/* 切换到使用 PSP（任务上下文），并保持特权级 */
static inline void use_psp(void)
{
    __asm volatile ("MRS r0, control \\n"
                    "ORR r0, r0, #2  \\n"   /* bit1: SPSEL = 1 */
                    "MSR control, r0 \\n"
                    "ISB             \\n"
                    ::: "r0");
}

/* 切回 MSP（异常处理或内核代码） */
static inline void use_msp(void)
{
    __asm volatile ("MRS r0, control \\n"
                    "BIC r0, r0, #2  \\n"
                    "MSR control, r0 \\n"
                    "ISB             \\n"
                    ::: "r0");
}

/* 栈溢出检测：启动时把栈区填成魔数，运行中检查栈底附近 */
#define STACK_FILL 0xA5A5A5A5u

void stack_paint(uint32_t *stack_low, uint32_t words)
{
    for (uint32_t i = 0; i < words; i++) {
        stack_low[i] = STACK_FILL;
    }
}

/* 返回已用字数（高水位）：栈底连续被写过的字数；剩余未用量 = words - 返回值 */
uint32_t stack_high_water(const uint32_t *stack_low, uint32_t words)
{
    uint32_t i = 0;
    while (i < words && stack_low[i] == STACK_FILL) i++;
    return words - i;
}`
        },
        apply: `<p>移植 RTOS 时，第一个任务启动的经典写法是：把任务的栈顶写入 PSP，然后切换到 PSP，再跳转到任务函数。FreeRTOS 的 <code>prvStartFirstTask</code> 就是一段汇编，做的事就是这几步。</p>
<p>调试栈溢出时，用“填充魔数 + 高水位统计”是最实用的手段：跑一段时间后看还剩多少未使用，就能判断栈大小是否合理，比拍脑袋估算靠谱得多。</p>`,
        pitfalls: [
          "<b>以为中断也用 PSP。</b>异常处理强制使用 MSP，这是硬件行为，改不了。",
          "<b>在中断里切换到 PSP。</b>CONTROL 的 SPSEL 只在线程模式生效，处理模式下写它无效或行为未定义。",
          "<b>任务栈按普通函数估算。</b>任务栈要容纳最深调用链 + 中断嵌套（如果中断压在当前任务栈上，某些移植方案是这样）+ 浮点现场，容易估小。"
        ],
        follow: [
          [
            "为什么异常返回后能继续执行被中断的代码？",
            "进入异常时硬件把 R0-R3、R12、LR、PC、xPSR 压栈，LR 写入 EXC_RETURN；返回时执行 BX LR，硬件识别 EXC_RETURN 后自动出栈恢复这些寄存器，PC 回到被中断的指令。"
          ],
          [
            "CONTROL 寄存器还有哪些位？",
            "bit0 是 nPRIV，置 1 表示线程模式使用非特权级；bit1 是 SPSEL，选择 MSP/PSP；bit2 是 FPCA，表示浮点上下文是否活跃。"
          ],
          [
            "RTOS 的任务栈一般开多大？",
            "取决于最深调用链和局部变量。经验值：简单任务 256~512 字节，带 printf 或协议解析的任务 1~2KB，浮点运算任务还要额外加。最终用高水位法实测调整。"
          ]
        ]
      },

      {
        id: "A-04",
        chapter: "exception",
        topic: "entry",
        title: "中断响应时硬件做了什么？EXC_RETURN 是什么？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "压栈顺序、向量取址、EXC_RETURN 编码与尾链，是理解 RTOS 切换的关键。",
        q: `<p>面试官：Cortex-M 响应中断时，<strong>硬件自动做了哪些事？</strong>压栈压了哪几个寄存器？EXC_RETURN 里存的是什么？为什么说它让 RTOS 的上下文切换变得很轻量？</p>`,
        exam: `<p>这是内核机制的深水区。能说清“8 个寄存器自动压栈”“LR 存 EXC_RETURN 编码返回行为”“PendSV 里手动保存 R4-R11”，基本可以判断你写过或读过 RTOS 移植层。</p>`,
        core: `<p>硬件压 8 个寄存器（R0-R3、R12、LR、PC、xPSR）到当前栈，从向量表取处理函数地址装入 PC，把 LR 设为 <code>EXC_RETURN</code>，更新 IPSR。</p><p><code>EXC_RETURN</code> 是高 24 位全 1 的特殊值：bit2 选返回后用 PSP 还是 MSP，bit3 表示返回线程还是处理模式，bit4 是帧类型——<strong>0 表示扩展帧，出栈时额外恢复 S0-S15、FPSCR 等浮点现场；1 表示基本帧，不恢复浮点</strong>；例如 <code>0xFFFFFFFD</code> 是基本帧、返回线程模式、用 PSP，带浮点现场时是 <code>0xFFFFFFED</code>。执行 <code>BX LR</code> 时硬件识别它自动出栈，所以 RTOS 在 PendSV 里只需手工保存/恢复 R4-R11，有 FPU 时再保存 S16-S31。</p>`,
        answer: `<p>硬件自动做四件事：第一，把 R0-R3、R12、LR、PC、xPSR 这 8 个寄存器压入当前栈（线程模式用 PSP，处理模式用 MSP）；第二，从向量表取出异常处理函数的地址装入 PC；第三，把 LR 设置为 EXC_RETURN 特殊值；第四，更新 IPSR 为当前异常号。</p>
<p>EXC_RETURN 是一个高 24 位全 1 的特殊值，低几位编码了返回信息：bit2 表示返回后用什么栈（1 用 PSP，0 用 MSP），bit3 表示返回后是线程模式还是处理模式，bit4 是帧类型：0 表示扩展帧，出栈时会额外恢复 S0-S15、FPSCR 等浮点现场；1 表示基本帧，不恢复浮点。比如 0xFFFFFFF9 是基本帧、返回线程模式、用 MSP；0xFFFFFFFD 是基本帧、返回线程模式、用 PSP；0xFFFFFFED 是扩展帧、返回线程模式、用 PSP。</p>
<p>返回时执行 <code>BX LR</code>，硬件识别到这个特殊值就自动出栈，恢复 8 个寄存器，回到被中断处。整个过程不需要软件写一行汇编。</p>
<p>正因为硬件包办了这些，RTOS 的上下文切换才轻量：PendSV 里只需要手动保存/恢复 R4-R11（调用者保存之外的寄存器），再加上切换 PSP，就完成了任务切换。</p>`,
        principle: `<p>压栈顺序是固定的：先压 xPSR、PC、LR、R12、R3、R2、R1、R0（地址从高到低），这样出栈后正好恢复。理解这个顺序对调试 HardFault 很重要——从栈帧里按固定偏移就能取出出错时的 PC。</p>
<p>如果使能了 FPU 且任务用过浮点，硬件还会额外压入 S0-S15 和 FPSCR（共 17 个字），此时 EXC_RETURN 的 bit4 为 0，表示需要恢复浮点现场。这也是为什么带浮点的任务栈要留更大空间。</p>`,
        fig: {
          type: "bits",
          title: "EXC_RETURN 的关键位",
          tag: "encoding",
          cells: [
            { v: "1", n: "31-5 全 1" },
            { v: "F", n: "bit4 FP" },
            { v: "1", n: "bit3 模式" },
            { v: "1", n: "bit2 栈" },
            { v: "1", n: "bit1 RES" },
            { v: "1", n: "bit0 RES" }
          ],
          note: "bit2 = 1 使用 PSP，bit3 = 1 返回线程模式，bit4 = 0 表示需要恢复浮点现场。"
        },
        code: {
          lang: "asm",
          title: "pendsv_handler.s",
          src: `; FreeRTOS 风格的 PendSV：完成任务上下文切换
PendSV_Handler:
    MRS     r0, psp             ; 取当前任务的栈指针
    CBZ     r0, no_task         ; 还没有任务时直接返回

    ; 手动保存 R4-R11（硬件只自动保存了 R0-R3/R12/LR/PC/xPSR）
    STMFD   r0!, {r4-r11}
    LDR     r1, =pxCurrentTCB
    LDR     r2, [r1]
    STR     r0, [r2]            ; 保存新的栈顶到当前 TCB

    ; 切换到下一个任务
    ; BL 会把返回地址写进 LR，覆盖掉 EXC_RETURN，所以先把它存到 MSP 上
    MOV     r3, lr
    PUSH    {r3}
    BL      vTaskSwitchContext
    POP     {r3}
    MOV     lr, r3

    LDR     r1, =pxCurrentTCB
    LDR     r2, [r1]
    LDR     r0, [r2]            ; 取出下一个任务的栈顶

    ; 恢复 R4-R11
    LDMFD   r0!, {r4-r11}
    MSR     psp, r0             ; 更新 PSP
    ORR     lr, lr, #0x04       ; 确保返回后使用 PSP（从任务抢占时本就是 0xFFFFFFFD）
    BX      lr                  ; 硬件自动出栈其余 8 个寄存器

no_task:
    BX      lr`
        },
        codeNote: `<b>核心：</b>硬件负责 8 个“调用者保存”寄存器，软件只补 R4-R11，所以一次任务切换只有几十条指令。这也是 Cortex-M 上 RTOS 切换开销通常在 1~2 微秒的原因。`,
        apply: `<p>调试 HardFault 时，可以从 MSP 指向的栈帧按固定偏移取出出错时的 PC、LR 和 xPSR，再结合 <code>CFSR</code> 判断是非法访问、非对齐访问还是未定义指令。很多 IDE 的 HardFault 分析插件就是做这件事。</p>
<p>写 bootloader 跳转 APP 时，需要伪造一个异常返回现场：把 APP 的栈顶写入 MSP，把复位向量写入 PC，然后执行一条 <code>BX</code> 或触发异常返回，本质上是复用了这套机制。</p>`,
        pitfalls: [
          "<b>以为硬件保存了所有寄存器。</b>只保存 8 个，R4-R11 必须由软件（RTOS 或编译器）保存。",
          "<b>手动修改 EXC_RETURN。</b>它是硬件写入的，软件改了会导致返回时栈错乱，直接 HardFault。",
          "<b>忽略浮点现场。</b>使能 FPU 后中断会多压 17 个字，栈空间和切换开销都要重新估算。"
        ],
        follow: [
          [
            "什么是尾链和迟到（late arrival）？",
            "尾链：一个 ISR 结束时若有挂起中断，不完整出栈再入栈，直接跳到下一个 ISR。迟到：中断响应过程中来了更高优先级中断，先执行高优先级的，再回来执行原来的，省去重复压栈。"
          ],
          [
            "PendSV 为什么适合做上下文切换？",
            "它可以被配置为最低优先级，确保不会打断其他中断；而且它是软件触发的异常，可以在中断里挂起、等所有中断处理完再执行，避免在中断中途切换任务。"
          ],
          [
            "SVC 异常有什么用？",
            "用于从非特权级发起系统调用，进入特权级执行内核服务（如创建任务、申请内存）。RTOS 和操作系统用它实现用户态到内核态的受控切换。"
          ]
        ]
      },

      {
        id: "A-05",
        chapter: "exception",
        topic: "nvic",
        title: "NVIC 的优先级怎么分组？抢占和子优先级有什么区别？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "优先级位宽、分组策略、抢占与子优先级的实际行为差异。",
        q: `<p>面试官：<strong>NVIC 的优先级</strong>是怎么定的？抢占优先级和子优先级有什么区别？如果两个中断同时到来会怎样？优先级数值越大越高还是越低？</p>`,
        exam: `<p>这是最容易配错的地方。能说清“Cortex-M 优先级数值越小越高”“高抢占优先级可以打断低抢占优先级”“子优先级只影响同时挂起时的排队顺序，不影响抢占”，说明你踩过坑。</p>`,
        core: `<p>优先级用寄存器高若干位表示，STM32 一般 4 位即 16 级，数值越小越高。</p><p>这 4 位分成抢占优先级和子优先级，分组由 <code>NVIC_SetPriorityGrouping</code> 决定（如 2 位抢占 + 2 位子优先级）。抢占级决定能否打断、形成嵌套；子优先级只在同时挂起时决定谁先跑，不能打断正在执行的 ISR。两者都相同再比硬件中断号，号小优先。</p>`,
        answer: `<p>Cortex-M 的优先级用寄存器里的若干位表示，STM32 一般实现 4 位，也就是 16 级。数值<strong>越小优先级越高</strong>，0 是最高。</p>
<p>这 4 位可以分成“抢占优先级”和“子优先级”两部分，分组方式由 <code>NVIC_SetPriorityGrouping</code> 决定。比如分组 2 表示 2 位抢占、2 位子优先级，那么抢占级有 4 档、子优先级有 4 档。</p>
<p>区别在于：<strong>抢占优先级决定能不能打断</strong>——高抢占优先级的中断可以打断正在执行的低抢占优先级中断，形成嵌套；<strong>子优先级只决定同时挂起时谁先执行</strong>，不能打断已经在执行的中断。</p>
<p>如果两个中断同时到来且抢占优先级相同，就比较子优先级，子优先级高的先执行；如果子优先级也相同，就比较硬件中断号，编号小的先执行。</p>`,
        principle: `<p>NVIC 内部对每个中断都有一个挂起位和一个活动位。仲裁时先比较抢占优先级，相同则比较子优先级，再相同则按中断号。这个比较是纯硬件完成的，不需要软件参与。</p>
<p>RTOS 通常会把所有优先级位都配置为抢占优先级（<code>NVIC_PRIORITYGROUP_4</code>，4 位全给抢占），因为 RTOS 需要严格的抢占语义；同时把数值比 <code>configMAX_SYSCALL_INTERRUPT_PRIORITY</code> 更小（即逻辑优先级更高）的那些优先级留给不受内核管理的中断，保证它们不被临界区屏蔽。</p>`,
        fig: {
          type: "table",
          title: "STM32 HAL 的 5 种优先级分组（NVIC_PRIORITYGROUP_n）",
          tag: "nvic",
          head: ["分组", "抢占位数", "子优先级位数", "抢占级数", "子优先级级数"],
          rows: [
            ["GROUP_0", "0", "4", "1", "16"],
            ["GROUP_1", "1", "3", "2", "8"],
            ["GROUP_2", "2", "2", "4", "4"],
            ["GROUP_3", "3", "1", "8", "2"],
            ["GROUP_4", "4", "0", "16", "1"]
          ]
        },
        code: {
          lang: "c",
          title: "nvic_priority.c",
          src: `/* 1. 设置优先级分组：2 位抢占 + 2 位子优先级 */
HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_2);

/* 2. 配置具体中断的优先级
 *    抢占优先级 1，子优先级 0
 *    注意：数值越小优先级越高
 */
HAL_NVIC_SetPriority(USART1_IRQn, 1, 0);
HAL_NVIC_EnableIRQ(USART1_IRQn);

/* 3. 串口中断里可以打断优先级更低的定时器中断，
 *    但反过来不行（定时器抢占优先级为 2）
 */
HAL_NVIC_SetPriority(TIM2_IRQn, 2, 0);
HAL_NVIC_EnableIRQ(TIM2_IRQn);

/* 4. 临界区：只屏蔽优先级不高于 5 的中断，
 *    保留更高优先级中断的实时响应
 */
static inline void enter_critical(void)
{
    __set_BASEPRI(5 << (8 - __NVIC_PRIO_BITS));
}

static inline void exit_critical(void)
{
    __set_BASEPRI(0);
}`
        },
        codeNote: `<b>BASEPRI 的写法：</b>值要左移到寄存器的高位对齐（Cortex-M 的优先级寄存器只用高几位）。用 CMSIS 的 <code>__set_BASEPRI</code> 时传的是已经对齐的值，直接用 NVIC 优先级数值需要移位。`,
        apply: `<p>实际项目中优先级分配要遵循“关键路径优先”原则：通信接收、电机换相等硬实时中断给最高抢占优先级；按键、LED 刷新给低优先级；调试串口给最低，避免影响业务。</p>
<p>一个常见错误是给所有中断都配成 0（最高），结果谁也打断不了谁，等于关掉了嵌套，实时性反而变差。</p>`,
        pitfalls: [
          "<b>以为数值越大优先级越高。</b>Cortex-M 是数值越小越高，和某些其他架构相反，移植代码时容易搞反。",
          "<b>只改抢占优先级忘了分组。</b>分组决定了哪几位是抢占位，分组不对，设置的优先级数值含义就变了。",
          "<b>在中断里调用 RTOS 的阻塞 API。</b>会导致断言失败或系统挂死，必须用 FromISR 版本。"
        ],
        follow: [
          [
            "为什么 RTOS 要求中断优先级不高于某个阈值？",
            "因为 RTOS 的临界区通过 BASEPRI 屏蔽一部分中断。如果某个中断优先级高于阈值却调用了 RTOS API，它可能在临界区里打断内核，破坏数据结构的一致性。所以这类中断不能调用任何内核 API。"
          ],
          [
            "两个中断抢占优先级相同，一个正在执行，另一个来了会怎样？",
            "不会抢占，后者挂起等待，等前者执行完再按子优先级和中断号顺序执行。这就是“子优先级不影响抢占”的含义。"
          ],
          [
            "中断优先级和任务优先级是一回事吗？",
            "不是。中断优先级由 NVIC 管理，任务优先级由 RTOS 调度器管理。中断总是优先于任何任务（除非被屏蔽），任务之间才按优先级调度。"
          ]
        ]
      },

      {
        id: "A-06",
        chapter: "boot",
        topic: "startup",
        title: "启动文件做了什么？复位后是怎么跑到 main 的？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "向量表、Reset_Handler、.data 拷贝、.bss 清零、SystemInit 与跳转 main。",
        q: `<p>面试官：芯片<strong>上电复位后</strong>，第一条指令从哪里取？启动文件里的 <code>Reset_Handler</code> 做了什么？为什么全局变量会被初始化为 0？</p>`,
        exam: `<p>这题把硬件复位、链接脚本、C 运行时初始化串起来了。能说清“从向量表取 MSP 和 PC”“拷贝 .data、清零 .bss”“调用 SystemInit 配时钟”，就理解了嵌入式程序的生命起点。</p>`,
        core: `<p>复位时硬件从地址 0 取初始 MSP，从地址 4 取 <code>Reset_Handler</code> 地址并跳过去，所以向量表头两项必须是栈顶和复位函数。</p><p><code>Reset_Handler</code> 做四件事：调 <code>SystemInit</code> 配时钟；把 <code>.data</code> 初值从 Flash 拷到 SRAM；把 <code>.bss</code> 清零；调 <code>__libc_init_array</code> 跑 C++ 全局构造，最后进 <code>main</code>。</p>`,
        answer: `<p>Cortex-M 复位时，硬件从地址 0 处取第一个字作为初始 MSP 值，从地址 4 处取第二个字作为复位向量（Reset_Handler 的地址），然后跳过去执行。所以向量表的头两项必须是栈顶地址和复位函数地址。</p>
<p><code>Reset_Handler</code> 通常做四件事：第一，调用 <code>SystemInit</code> 配置时钟和外部存储器；第二，把 <code>.data</code> 段的初值从 Flash 拷贝到 SRAM；第三，把 <code>.bss</code> 段清零；第四，调用 <code>__libc_init_array</code> 执行 C++ 全局构造函数，最后跳转到 <code>main</code>。</p>
<p>全局变量被初始化为 0 不是语言魔法，而是启动代码把 .bss 段整块清零的结果。同理，初始化为非零的全局变量能保持初值，是因为启动代码把 Flash 里的初值拷贝到了 SRAM。</p>`,
        principle: `<p>向量表本质上是一个函数指针数组，放在 Flash 起始地址（或通过 VTOR 重定位到别处）。前 16 项是内核异常，之后是外设中断。表项的顺序必须和芯片手册一致，写错了就会出现“中断进错函数”的诡异现象。</p>
<p>启动文件通常是汇编写的（startup_stm32f103.s），里面定义了向量表、默认的中断处理函数（都是死循环）、以及 Reset_Handler。用户只需要在 C 里实现同名函数，链接器就会用 C 函数覆盖弱定义的默认实现。</p>`,
        fig: {
          type: "flow",
          title: "从上电到 main 的路径",
          tag: "boot",
          items: [
            { t: "上电复位", d: "取 MSP/PC" },
            { t: "Reset_Handler", d: "启动文件" },
            { t: "SystemInit", d: "配置时钟" },
            { t: "拷贝 .data", d: "Flash → SRAM" },
            { t: "清零 .bss", d: "SRAM" },
            { t: "跳转 main", d: "C 世界" }
          ]
        },
        code: {
          lang: "asm",
          title: "startup_stm32.s",
          src: `; 向量表：第一项是栈顶，第二项是复位向量
                .section  .isr_vector,"a",%progbits
                .word     _estack              ; 栈顶地址（SRAM 末尾）
                .word     Reset_Handler        ; 复位
                .word     NMI_Handler
                .word     HardFault_Handler
                ; ... 其余异常与外设中断

                .text
Reset_Handler:
                LDR     r0, =_estack
                MSR     msp, r0                ; 保险起见重设栈顶

                BL      SystemInit             ; 配置时钟、向量表重定位

                ; 把 .data 段从 Flash（_sidata）拷贝到 SRAM（_sdata）
                LDR     r0, =_sdata
                LDR     r1, =_edata
                LDR     r2, =_sidata
copy_data:
                CMP     r0, r1
                BCS     zero_bss
                LDR     r3, [r2], #4
                STR     r3, [r0], #4
                B       copy_data

zero_bss:
                ; 把 .bss 段清零
                LDR     r0, =_sbss
                LDR     r1, =_ebss
                MOVS    r3, #0
clear_bss:
                CMP     r0, r1
                BCS     call_main
                STR     r3, [r0], #4
                B       clear_bss

call_main:
                BL      __libc_init_array      ; C++ 全局构造
                BL      main
                B       .                      ; main 不应返回`
        },
        apply: `<p>做 bootloader 时，APP 的启动文件需要改向量表偏移：在 <code>SystemInit</code> 里设置 <code>SCB-&gt;VTOR = APP_ADDR</code>，否则中断会跳到 bootloader 的向量表，表现为“APP 能跑但一进中断就死”。</p>
<p>排查“程序不启动”时，第一步就是确认向量表前两个字是否正确：用调试器看地址 0 的值是不是合理的栈顶（应该在 SRAM 范围内），地址 4 是不是落在 Flash 的代码区。</p>`,
        pitfalls: [
          "<b>以为 main 是程序的入口。</b>真正的入口是 Reset_Handler，main 只是它调用的一个普通函数。",
          "<b>忘记 .data 拷贝。</b>自己写的启动代码漏了这一步，所有带初值的全局变量都会是 0 或随机值。",
          "<b>向量表顺序写错。</b>中断号与表项不对应，会出现“串口中断进了定时器函数”这种诡异问题。"
        ],
        follow: [
          [
            "为什么栈顶地址要放在向量表第一项？",
            "因为复位时硬件没有栈可用，必须先知道栈在哪。硬件直接从地址 0 读取初始 MSP，所以这个值必须在最前面。"
          ],
          [
            "SystemInit 一般做什么？",
            "配置时钟源和 PLL、设置 Flash 等待周期、配置外部存储器控制器、重定位向量表。它由芯片厂商提供，通常在 system_xxx.c 里。"
          ],
          [
            "什么是弱符号（weak）？",
            "启动文件里把中断处理函数定义为 weak，如果用户没有实现，就用默认的死循环版本；用户实现了同名函数，链接器会用用户的强符号覆盖。这样不用改启动文件就能添加中断处理。"
          ]
        ]
      },

      {
        id: "A-07",
        chapter: "boot",
        topic: "clock",
        title: "SysTick 定时器如何为 RTOS 提供时基？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "SysTick 的结构、重装载值计算，以及它在任务调度与延时中的作用。",
        q: `<p>面试官：<strong>SysTick</strong> 是什么？为什么 RTOS 都用它做系统节拍？重装载值怎么算？如果 SysTick 中断被延迟了，系统时间会不准吗？</p>`,
        exam: `<p>考察对时基机制的理解。能说出“24 位递减计数器、内核私有、不占外设”“1ms 节拍如何算重装载值”“节拍丢失会导致时间漂移”，说明你理解 RTOS 的时间管理。</p>`,
        core: `<p>SysTick 是 Cortex-M 内核自带的 24 位递减计数器，不占厂商外设，做 RTOS 时基最方便。寄存器是 <code>CTRL</code>、<code>LOAD</code>、<code>VAL</code>，减到 0 自动重装并中断。</p><p><code>LOAD = 系统时钟 / 节拍频率 - 1</code>，72MHz、1ms 即 71999。被高优先级中断推迟不到一拍只产生抖动；关中断超过一整拍才会丢拍、系统时间变慢，所以别长时间关中断。</p>`,
        answer: `<p>SysTick 是 Cortex-M 内核自带的一个 24 位递减计数器，所有 Cortex-M 芯片都有，不占用厂商外设资源，所以移植 RTOS 时用它做时基最方便。</p>
<p>它有三个寄存器：CTRL 控制使能和中断、LOAD 存重装载值、VAL 是当前计数值。计数到 0 时自动重装载并产生中断（如果使能）。</p>
<p>重装载值的算法是：<code>LOAD = 系统时钟 / 节拍频率 - 1</code>。比如 72MHz、1ms 节拍，就是 72000000 / 1000 - 1 = 71999。</p>
<p>会不会不准，要看被延迟多久。SysTick 的计数器和挂起位独立于中断服务：如果只是被更高优先级中断推迟不到一个节拍周期，节拍处理会被推后，时间仍然准确，只产生抖动。只有关中断或屏蔽时间超过一个完整节拍周期时，挂起位会被后续计数覆盖，多个节拍只补一次中断，这才真正丢拍，系统时间变慢。所以根本办法是不要让高优先级中断或临界区长时间关中断。</p>`,
        principle: `<p>SysTick 的时钟源可以选内核时钟或外部参考时钟（HCLK/8）。选内核时钟时要注意，如果主频动态调整（低功耗场景），节拍频率也会变，需要重新配置 LOAD。</p>
<p>FreeRTOS 在 SysTick 中断里做两件事：递增系统节拍计数、检查是否有任务延时到期需要唤醒。如果当前任务的时间片用完，还会触发 PendSV 请求切换。</p>`,
        code: {
          lang: "c",
          title: "systick.c",
          src: `#include "stm32f4xx.h"

#define SYSTICK_FREQ_HZ  1000u          /* 1ms 节拍 */

/* 配置 SysTick 为 1ms 周期 */
void systick_init(void)
{
    uint32_t reload = SystemCoreClock / SYSTICK_FREQ_HZ - 1u;

    SysTick->LOAD = reload;             /* 重装载值 */
    SysTick->VAL  = 0;                  /* 清当前计数 */
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk   /* 使用内核时钟 */
                  | SysTick_CTRL_TICKINT_Msk     /* 使能中断 */
                  | SysTick_CTRL_ENABLE_Msk;     /* 启动 */
}

volatile uint32_t g_tick_ms;

void SysTick_Handler(void)
{
    g_tick_ms++;                        /* 系统时基 */
}

/* 基于节拍的延时：注意溢出回绕 */
void delay_ms(uint32_t ms)
{
    uint32_t start = g_tick_ms;
    while ((uint32_t)(g_tick_ms - start) < ms) {
        __WFI();                        /* 空闲时睡眠，降低功耗 */
    }
}

/* 获取系统运行时间，处理 32 位回绕 */
uint64_t uptime_ms(void)
{
    static uint32_t last = 0;
    static uint64_t high = 0;
    uint32_t now = g_tick_ms;

    if (now < last) high += 0x100000000ull;   /* 发生回绕 */
    last = now;
    return high + now;
}`
        },
        apply: `<p>裸机项目里用 SysTick 做延时比空循环准得多，而且可以在等待时调用 <code>__WFI()</code> 睡眠，显著降低功耗。但要注意：在中断里调用基于 SysTick 的延时会造成死锁，因为节拍中断进不来。</p>
<p>RTOS 项目里 SysTick 归内核所有，应用层不要再去改它的配置，否则会破坏调度。需要高精度延时时用 DWT 的周期计数器或硬件定时器。</p>`,
        pitfalls: [
          "<b>在中断里用 SysTick 延时。</b>节拍中断被自己阻塞，延时会死等，直接卡死。",
          "<b>忘记减 1。</b>重装载值是“计数值减一”，写大了会多计一个周期，写小了周期变短。",
          "<b>用 <code>g_tick_ms</code> 直接比较大小。</b>32 位计数约 49 天回绕一次，必须用差值比较 <code>(now - start) &lt; ms</code>，这样回绕也正确。"
        ],
        follow: [
          [
            "SysTick 和普通定时器有什么区别？",
            "SysTick 是内核私有外设，所有 Cortex-M 都有，移植性好；普通定时器属于芯片外设，功能更丰富（PWM、输入捕获、多通道），但不同芯片差异大。"
          ],
          [
            "RTOS 的 tickless 模式是什么？",
            "空闲时关闭 SysTick，让 MCU 进入低功耗模式，用 RTC 或低功耗定时器在下一个任务到期时唤醒。这样避免每 1ms 被唤醒一次，能大幅降低平均功耗。"
          ],
          [
            "为什么 RTOS 节拍一般是 1ms 或 10ms？",
            "节拍太快则中断开销大、CPU 利用率下降；太慢则时间精度差、延时粒度粗。1ms 是常见折中，硬实时场景可能用 100us 或改用硬件定时器。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("mcu-arm", {
    chapters: [
      {
        id: "core",
        topics: [
          { id: "family", title: "Cortex-M 系列差异" },
          { id: "privilege", title: "特权级与 MPU" },
          { id: "barrier", title: "内存屏障指令" }
        ]
      },
      {
        id: "exception",
        topics: [
          { id: "pendsv", title: "PendSV 与上下文切换" },
          { id: "svc", title: "SVC 系统调用" },
          { id: "fault", title: "Fault 异常分类" },
          { id: "tail", title: "尾链与中断延迟" }
        ]
      },
      {
        id: "boot",
        topics: [
          { id: "vtor", title: "向量表重定位" },
          { id: "thumb", title: "Thumb 指令集" }
        ]
      }
    ],
    questions: [
      {
        id: "A-08",
        chapter: "core",
        topic: "family",
        title: "Cortex-M0、M3、M4、M7 有什么区别？项目里怎么选？",
        diff: "中级",
        freq: "高频",
        type: "对比分析题",
        point: "从指令集、流水线、DSP/FPU、MPU、Cache 几个维度区分，按算力和成本选型。",
        q: `<p>面试官：Cortex-M 有 M0、M3、M4、M7 几个系列，它们差在哪？做电机控制该选哪个？</p>`,
        exam: `<p>考察对 ARM 产品线的熟悉度。能说出 M4 有 DSP 指令和可选 FPU、M7 有 Cache 和双发射，并结合场景选型，就很好。</p>`,
        core: `<p>M0/M0+ 是 ARMv6-M，指令少、无硬件除法、成本和功耗最低，适合简单控制和替代 8 位机；M3 是 ARMv7-M，有硬件除法、位带，性价比高；M4 在 M3 上加 DSP 指令和可选单精度 FPU，适合电机 FOC、音频；M7 是 6 级双发射超标量，带 Cache/TCM，性能最高。</p><p>选型：电机 FOC 用 M4F，简单节点用 M0+，通用工控 M3，带界面或高速 USB/以太网用 M7。同是 M4，带不带 FPU 差别很大。</p>`,
        answer: `<p>几个关键差异：</p>
<ul>
<li><b>Cortex-M0/M0+</b>：ARMv6-M，只有 56 条指令，M0 是 3 级流水线、M0+ 精简为 2 级，两者都没有硬件除法指令（除法由 <code>__aeabi_uidiv</code> 等软件库实现），MPU 为可选项（M0+ 支持 8 区 MPU），成本最低、功耗最低。适合简单控制和替代 8 位机。</li>
<li><b>Cortex-M3</b>：ARMv7-M，指令丰富，3 级流水线，有硬件除法、位带、MPU 可选，性价比高，适合通用控制。</li>
<li><b>Cortex-M4</b>：ARMv7E-M，在 M3 基础上增加 DSP 指令（SIMD、MAC）和可选单精度 FPU，适合电机控制、音频、传感器融合。</li>
<li><b>Cortex-M7</b>：ARMv7E-M，6 级双发射超标量流水线，带指令/数据 Cache、TCM，性能最高，适合图形、复杂算法、高速通信。</li>
<li><b>Cortex-M23/M33</b>：ARMv8-M，增加 TrustZone 安全扩展，适合需要安全隔离的物联网设备。</li>
</ul>
<p><b>选型建议：</b></p>
<ul>
<li>电机 FOC 控制：M4F（带 FPU 和 DSP 指令）是主流，M7 用于高性能多轴；</li>
<li>简单传感器节点：M0+，功耗和成本优先；</li>
<li>通用工控：M3 足够；</li>
<li>带界面或高速 USB/以太网：M7。</li>
</ul>
<p>注意 FPU 是可选配置，同是 M4，带 FPU 和不带的型号价格、性能差别很大。</p>`,
        principle: `<p>ARM 只定义架构规范，芯片厂商实现具体型号。架构版本决定了指令集、异常模型、可选组件（MPU/FPU/Cache），厂商再决定主频、Flash、外设和封装。</p>
<p>所以选型不能只看“M4”，还要看具体型号是否带 FPU、Cache 大小、外设资源。</p>`,
        fig: {
          type: "table",
          title: "Cortex-M 系列对比",
          tag: "cortex-m",
          head: ["系列", "架构", "流水线", "DSP/FPU", "典型场景"],
          rows: [
            ["M0 / M0+", "ARMv6-M", "3 级 / 2 级", "无", "低成本控制"],
            ["M3", "ARMv7-M", "3 级", "无", "通用工控"],
            ["M4", "ARMv7E-M", "3 级", "DSP + 可选 FPU", "电机、音频"],
            ["M7", "ARMv7E-M", "6 级双发射", "DSP + FPU + Cache", "高性能应用"],
            ["M33", "ARMv8-M", "3 级", "可选 FPU + TrustZone", "安全物联网"]
          ]
        },
        apply: `<p>我做无刷电机控制时选 M4F，因为 FOC 需要大量乘加和三角函数，FPU 能把控制周期从 50μs 降到 10μs 以内。如果只是做个定时开关，M0+ 完全够用，还省电。</p>
<p>选型时我会先估算最坏情况的计算量，再留 50% 余量，而不是“选个大的保险”。</p>`,
        pitfalls: [
          "<b>以为 M4 一定带 FPU。</b>FPU 是可选组件，要查具体型号。",
          "<b>用 M0 做浮点密集运算。</b>没有 FPU，软件浮点非常慢。",
          "<b>忽略 Cache 带来的复杂性。</b>M7 的 Cache 需要处理 DMA 一致性。",
          "<b>只看内核不看外设。</b>外设数量和类型往往才是选型关键。"
        ],
        follow: [
          ["M0+ 和 M0 有什么区别？", "M0+ 主要优化功耗和面积：2 级流水线、可选 8 区 MPU、单周期 I/O、TCM 以及唤醒中断控制器（WIC），能效更好。它同样没有硬件除法指令——可选硬件除法器是 ARMv8-M Baseline 的 M23 才提供的。"],
          ["TrustZone 在 MCU 上怎么用？", "把代码和数据划分为安全区和非安全区，非安全代码只能通过特定入口调用安全服务，适合存储密钥、做安全启动。"]
        ]
      },

      {
        id: "A-09",
        chapter: "core",
        topic: "privilege",
        title: "Cortex-M 的特权级和用户级有什么区别？MPU 能做什么？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "特权级可访问所有资源，用户级受限；MPU 按区域配置访问权限，防止越界破坏。",
        q: `<p>面试官：RTOS 里任务运行在什么级别？MPU 是怎么防止一个任务踩坏另一个任务的内存的？</p>`,
        exam: `<p>考察对保护机制的理解。能说出特权级切换、MPU 区域属性、以及 MPU 并不能替代 MMU，就很好。</p>`,
        core: `<p>特权级能访问所有寄存器、配置 NVIC/MPU/SCB、执行全部指令；用户级不能碰系统控制空间和中断配置，部分指令受限。复位后是特权级+线程模式，RTOS 让任务跑用户级、内核跑特权级。</p><p>MPU 把地址空间划成若干区域，配置起始地址、大小、读写执行权限和内存属性；越权触发 MemManage Fault，可终止该任务。MPU 只做区域级权限检查，没有地址翻译，区域数量也有限。</p>`,
        answer: `<p><b>两个特权级：</b></p>
<ul>
<li><b>特权级（Privileged）</b>：可以访问所有寄存器、配置 NVIC/MPU/SCB，执行所有指令。</li>
<li><b>用户级（Unprivileged）</b>：不能访问系统控制空间，不能修改中断配置，部分指令受限。</li>
</ul>
<p>复位后默认是特权级 + 线程模式。RTOS 通常让任务运行在用户级，内核运行在特权级（通过 SVC 或 PendSV 进入），这样任务出错不会直接破坏内核。</p>
<p><b>MPU（Memory Protection Unit）</b>把地址空间划分为若干区域，每个区域配置：</p>
<ul>
<li>起始地址和大小（通常是 2 的幂，且对齐）；</li>
<li>访问权限（可读/可写/可执行，特权/用户）；</li>
<li>内存属性（Normal、Device、Strongly-ordered，是否可 Cache、是否可缓冲）。</li>
</ul>
<p>访问越权时触发 MemManage Fault，RTOS 可以捕获并终止该任务，而不是让整个系统崩溃。</p>
<p><b>MPU 的局限：</b>它只做区域级的权限检查，没有地址翻译，不能像 MMU 那样实现虚拟内存和按页换入换出；区域数量有限（通常 8 或 16 个），配置需要仔细规划。</p>`,
        principle: `<p>特权级是 CPU 硬件强制的访问控制，切换只能通过异常入口（SVC、中断）或修改 CONTROL 寄存器。用户级代码无法自行提权，必须请求内核服务。</p>
<p>MPU 在总线访问阶段检查地址范围和权限，越权访问被阻止并产生异常，这是“故障隔离”的基础。</p>`,
        fig: {
          type: "layers",
          title: "特权级与 MPU 的保护层次",
          tag: "protection",
          items: [
            { tag: "用户任务", t: "Unprivileged 线程模式", d: "只能访问自己区域，越权触发 MemManage" },
            { tag: "系统调用", t: "SVC 异常", d: "进入特权级，由内核代劳" },
            { tag: "内核", t: "Privileged 线程/处理模式", d: "可配置 NVIC、MPU、外设" },
            { tag: "MPU", t: "区域权限检查", d: "地址范围 + 读写执行权限" }
          ]
        },
        code: {
          lang: "c",
          title: "mpu_config.c",
          src: `#include <stdint.h>

/* 简化示例：把一段 RAM 配置为仅用户可读写、不可执行 */
void mpu_config_region(uint32_t base, uint32_t size, uint32_t attr)
{
    /* 选择区域号，设置基址 */
    MPU->RNR  = 0;
    MPU->RBAR = base & MPU_RBAR_ADDR_Msk;

    /* 大小必须为 2 的幂，编码为 log2(size) - 1 */
    uint32_t sz = 0;
    while ((1u << (sz + 1)) < size) sz++;

    MPU->RASR = (1u << MPU_RASR_ENABLE_Pos) |
                (attr) |
                ((sz & 0x1Fu) << MPU_RASR_SIZE_Pos);

    /* 使能 MPU 和后台区域 */
    MPU->CTRL = MPU_CTRL_ENABLE_Msk | MPU_CTRL_PRIVDEFENA_Msk;
    __asm volatile ("dsb 0xF" ::: "memory");
    __asm volatile ("isb 0xF" ::: "memory");
}`
        },
        codeNote: "实际配置要处理区域重叠、优先级和对齐，建议使用厂商提供的 MPU 配置工具或 RTOS 的移植层。",
        apply: `<p>做安全相关的产品时，我会把密钥存储区配置为仅特权可读，任务即使有缓冲区溢出漏洞也读不到密钥。配合 TrustZone 效果更好。</p>
<p>调试 MPU 问题时，先看 MemManage Fault 的 MMFAR 寄存器，它记录了触发错误的地址，再对照区域配置就能定位。</p>`,
        pitfalls: [
          "<b>以为 MPU 能实现虚拟内存。</b>它没有地址翻译，只是权限检查。",
          "<b>区域大小不是 2 的幂。</b>配置无效或覆盖范围错误。",
          "<b>忘记使能 PRIVDEFENA。</b>特权级访问未覆盖区域也会被拒绝。",
          "<b>用户级任务直接访问外设。</b>触发 MemManage，需要走系统调用。"
        ],
        follow: [
          ["FreeRTOS 的 MPU 版本有什么限制？", "任务只能使用分配给它的栈和少量 API，内核对象访问需通过系统调用，性能和灵活性都有代价，但能隔离故障。"],
          ["MPU 和 MMU 的核心区别是什么？", "MMU 做虚拟地址到物理地址的翻译，支持分页和换入换出；MPU 只做物理地址的权限和属性检查，没有翻译。"]
        ]
      },

      {
        id: "A-10",
        chapter: "exception",
        topic: "pendsv",
        title: "PendSV 是什么？为什么 RTOS 的任务切换要用它？",
        diff: "高级",
        freq: "高频",
        type: "原理分析题",
        point: "PendSV 可挂起、优先级最低，用于在中断退出时安全地完成上下文切换，避免打断中断。",
        q: `<p>面试官：FreeRTOS 切换任务为什么不用 SVC 或 SysTick 直接切，而要用 PendSV？</p>`,
        exam: `<p>考察对异常机制和 RTOS 移植的理解。能说出“PendSV 优先级最低、可延迟到所有中断处理完再执行”，就抓住了核心。</p>`,
        core: `<p>PendSV 是可软件触发、可延迟执行的异常。SysTick 里只更新时基并挂起 PendSV；等所有中断处理完，PendSV 才执行，完成上下文保存与恢复。</p><p>不在 SysTick 里直接切，因为 SysTick 可能打断一个正在执行的 ISR，此时切任务会让该 ISR 在新任务上下文里继续跑；而且切换耗时长，会拉长中断延迟。PendSV 优先级设为最低，保证切换发生在安全时刻。SVC 是同步异常，用于任务主动请求内核服务。</p>`,
        answer: `<p><b>PendSV（可挂起系统调用）</b>是一个可以通过软件触发、也可以延迟执行的异常。它的典型用法是：</p>
<ol>
<li>SysTick 中断里只做时基更新，然后挂起 PendSV（写 ICSR 的 PENDSVSET 位）；</li>
<li>SysTick 退出后，如果有更高优先级的中断还在处理，PendSV 会等待；</li>
<li>所有中断处理完毕，PendSV 才执行，此时完成上下文保存和恢复。</li>
</ol>
<p><b>为什么不直接在 SysTick 里切换：</b></p>
<ul>
<li>SysTick 可能打断一个正在执行的中断，如果此时切换任务，被中断的中断处理程序会继续在“新任务”的上下文里运行，栈和状态全乱；</li>
<li>上下文切换需要保存所有寄存器，耗时较长，放在高优先级中断里会延长中断延迟；</li>
<li>PendSV 优先级设为最低，保证它在所有中断之后执行，切换发生在“安全的时刻”。</li>
</ul>
<p><b>为什么不用 SVC：</b>SVC 是同步异常，由任务主动调用，适合“任务请求内核服务”；而任务切换往往是被动的（时间片到、更高优先级任务就绪），用 PendSV 更合适。</p>`,
        principle: `<p>ARM 的异常有优先级，高优先级异常可以打断低优先级异常。PendSV 设为最低优先级后，只有当没有其它异常在处理时才会执行，因此上下文切换不会嵌套在中断中间。</p>
<p>PendSV 的“挂起”状态会保持到它真正执行，所以可以在中断里安全地“预约”一次切换。</p>`,
        fig: {
          type: "flow",
          title: "SysTick + PendSV 的切换时序",
          tag: "context switch",
          items: [
            { t: "SysTick 到期", d: "更新 tick，判断是否需要切换" },
            { t: "挂起 PendSV", d: "写 ICSR.PENDSVSET" },
            { t: "其它中断", d: "PendSV 优先级最低，继续等待" },
            { t: "PendSV 执行", d: "保存当前任务上下文" },
            { t: "恢复新任务", d: "加载新任务栈和寄存器" }
          ]
        },
        code: {
          lang: "c",
          title: "pendsv_trigger.c",
          src: `#include <stdint.h>

#define SCB_ICSR (*(volatile uint32_t *)0xE000ED04u)
#define ICSR_PENDSVSET (1u << 28)

/* 在中断或临界区里“预约”一次任务切换 */
static inline void port_yield(void)
{
    SCB_ICSR = ICSR_PENDSVSET;
    __asm volatile ("dsb 0xF" ::: "memory");
    __asm volatile ("isb 0xF" ::: "memory");
}

/* SysTick 处理：只更新时基并预约切换，不做实际切换 */
void SysTick_Handler(void)
{
    /* xTaskIncrementTick() 等 RTOS 内部逻辑 */
    port_yield();
}`
        },
        codeNote: "实际移植中 PendSV_Handler 是汇编写的，负责压栈、调用调度器、出栈，C 代码只负责触发。",
        apply: `<p>自己写裸机调度器时，我也会用 PendSV 做上下文切换：中断里只置标志，PendSV 里统一保存/恢复寄存器。这样中断延迟可控，切换逻辑集中在一处。</p>
<p>调试切换问题时，可以在 PendSV_Handler 入口翻转 GPIO，用示波器看切换频率和耗时。</p>`,
        pitfalls: [
          "<b>在 SysTick 里直接切换任务。</b>可能打断其它中断，导致栈错乱。",
          "<b>PendSV 优先级设得太高。</b>会抢占其它中断，失去延迟切换的意义。",
          "<b>忘记 DSB/ISB。</b>挂起位可能没生效。",
          "<b>在 PendSV 里调用不可重入函数。</b>上下文不完整，行为异常。"
        ],
        follow: [
          ["PendSV 和 SVC 都能进异常，怎么选？", "SVC 用于任务主动请求内核服务（同步），PendSV 用于延迟执行的任务切换（异步、可挂起）。"],
          ["上下文切换保存了哪些寄存器？", "硬件自动保存 R0-R3、R12、LR、PC、xPSR 这 8 个；FPU 活跃时再自动加压 S0-S15 与 FPSCR。软件只需补存 R4-R11（若代码用到 S16-S31，也要由移植层负责保存）。"]
        ]
      },

      {
        id: "A-11",
        chapter: "exception",
        topic: "svc",
        title: "SVC 指令怎么用？系统调用是怎么实现的？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "SVC 触发同步异常进入特权级，通过立即数或寄存器传递调用号，由内核分发处理。",
        q: `<p>面试官：用户级任务想调用内核服务，为什么不能直接函数调用？SVC 是怎么完成提权的？</p>`,
        exam: `<p>考察对异常和特权级切换的理解。能说出“SVC 立即数编码调用号、异常入口读栈帧取参数”，就很好。</p>`,
        core: `<p>用户任务不能直接访问内核数据和特权寄存器，要通过 <code>SVC #n</code> 请求内核代劳，<code>n</code> 是 8 位调用号。</p><p>流程：执行 SVC 进特权级并跳 <code>SVC_Handler</code>，硬件压栈；Handler 从栈帧取返回地址、回读指令拿到调用号；查表分发，参数用 R0-R3 或结构体指针传；返回值放 R0，异常返回恢复用户级。直接函数调用不会改特权级，也不保存完整异常现场；内核还要校验用户指针的合法性。</p>`,
        answer: `<p>用户级任务不能直接访问内核数据和特权寄存器，否则保护机制就失效了。它必须通过<b>系统调用</b>请求内核代劳，SVC 就是入口。</p>
<p><b>流程：</b></p>
<ol>
<li>任务执行 <code>SVC #n</code>，n 是调用号（8 位立即数，最多 255 个）。</li>
<li>CPU 进入特权级，跳转到 SVC_Handler，硬件自动压栈保存现场。</li>
<li>Handler 从栈帧中取出返回地址，回读 SVC 指令的立即数，得到调用号。</li>
<li>根据调用号查表分发到具体服务函数，参数通常通过寄存器或栈传递。</li>
<li>服务完成后，把返回值放入 R0，异常返回，恢复用户级。</li>
</ol>
<p><b>为什么不能直接函数调用：</b>直接调用不会改变特权级，用户代码仍然无法访问内核资源；而且函数调用不会保存完整的异常现场，无法安全返回。</p>
<p><b>参数传递：</b>ARM 的 SVC 立即数只有 8 位，参数放不下，通常约定用 R0-R3 传参，或者传一个指向参数结构体的指针。内核需要知道用户指针是否合法，避免用户传入内核地址进行越权访问。</p>`,
        principle: `<p>SVC 是同步异常：它在指令执行时立即触发，异常返回后继续执行下一条指令。异常入口自动切换到特权级（Handler 模式），这是硬件强制的提权路径。</p>
<p>调用号编码在指令里而不是寄存器里，可以防止用户篡改；但 8 位限制了调用数量，复杂系统会用寄存器传调用号。</p>`,
        fig: {
          type: "flow",
          title: "一次系统调用的完整路径",
          tag: "syscall",
          items: [
            { t: "用户任务", d: "准备参数，执行 SVC #n" },
            { t: "硬件压栈", d: "保存 R0-R3/R12/LR/PC/xPSR" },
            { t: "SVC_Handler", d: "读取调用号，切换到特权级" },
            { t: "分发服务", d: "查表调用内核函数" },
            { t: "异常返回", d: "R0 带回返回值，恢复用户级" }
          ]
        },
        code: {
          lang: "c",
          title: "svc_dispatch.c",
          src: `#include <stdint.h>

/* 从栈帧中取出 SVC 立即数（调用号） */
void SVC_Handler_Main(uint32_t *svc_args)
{
    /* svc_args[6] 是压栈的 PC，指向 SVC 指令之后 */
    uint8_t *pc = (uint8_t *)svc_args[6];
    uint8_t svc_num = pc[-2];      /* Thumb 的 SVC 是 16 位指令 */

    switch (svc_num) {
    case 0:
        svc_args[0] = svc_get_tick();      /* 返回值放 R0 */
        break;
    case 1:
        svc_args[0] = svc_send(svc_args[1], svc_args[2]);
        break;
    default:
        svc_args[0] = (uint32_t)-1;
        break;
    }
}`
        },
        codeNote: "不同编译器和 Thumb 编码下取立即数的偏移不同，实际移植要查指令编码或使用汇编桩函数。",
        apply: `<p>做带 MPU 保护的系统时，我把所有外设访问封装成 SVC 服务，任务只能通过调用号请求，无法直接操作寄存器。这样即使任务有漏洞，也限制在它的地址空间内。</p>
<p>普通裸机项目很少用 SVC，但理解它对分析 RTOS 移植和 HardFault 很有帮助。</p>`,
        pitfalls: [
          "<b>在 Handler 模式里再执行 SVC。</b>会触发 HardFault（SVC 不能在 Handler 模式使用）。",
          "<b>直接传用户指针给内核。</b>必须校验地址范围，防止越权。",
          "<b>调用号与实现不一致。</b>分发到错误服务，行为异常。",
          "<b>忘记返回值放 R0。</b>调用者拿到的是垃圾值。"
        ],
        follow: [
          ["SVC 和普通中断有什么区别？", "SVC 是同步异常，由指令主动触发，优先级可配置但通常不抢占；普通中断是异步的，由外设事件触发。"],
          ["为什么 SVC 不能嵌套？", "SVC 在 Handler 模式下执行会产生 HardFault，因为 SVC 异常不能在自身处理程序里再次触发（同优先级不可重入）。"]
        ]
      },

      {
        id: "A-12",
        chapter: "exception",
        topic: "fault",
        title: "HardFault、MemManage、BusFault、UsageFault 分别什么时候触发？",
        diff: "高级",
        freq: "高频",
        type: "原理分析题",
        point: "四类 Fault 对应访问权限、总线错误、指令使用错误；未使能时都升级为 HardFault。",
        q: `<p>面试官：Cortex-M 有几种 Fault？为什么有时候明明越界访问，却只进 HardFault，看不出具体原因？</p>`,
        exam: `<p>考察异常模型的细节，也是 HardFault 调试的基础。能说出“子 Fault 默认未使能，会升级为 HardFault”，说明真的查过。</p>`,
        core: `<p>HardFault 是所有未处理错误的兜底；MemManage 是 MPU 越权、访问未映射区或执行不可执行区；BusFault 是总线错误，如访问不存在的地址、外设错误响应；UsageFault 是除零（需使能）、未定义指令、非对齐访问、无效异常返回。</p><p>默认子 Fault 是关的，错误会升级成 HardFault；要使能 <code>SCB-&gt;SHCSR</code> 的 MEMFAULTENA/BUSFAULTENA/USGFAULTENA，再从 <code>CFSR/HFSR/MMFAR/BFAR</code> 和栈帧里的 PC/LR 定位。</p>`,
        answer: `<p>Cortex-M 有四类 Fault：</p>
<ul>
<li><b>HardFault</b>：所有未被其它 Fault 处理的错误最终都到这里，是最后的兜底。</li>
<li><b>MemManage Fault</b>：MPU 权限 violation、访问未映射区域、执行不可执行区域。</li>
<li><b>BusFault</b>：总线访问错误，如访问不存在的地址、外设返回错误响应、非对齐访问（部分实现）。</li>
<li><b>UsageFault</b>：指令使用错误，如除零（需使能）、未定义指令、非对齐访问、无效的异常返回。</li>
</ul>
<p><b>为什么只进 HardFault：</b>默认情况下，MemManage/BusFault/UsageFault 是<b>禁用</b>的，它们的错误会升级（escalate）为 HardFault。需要手动使能：</p>
<p><code>SCB-&gt;SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk | SCB_SHCSR_BUSFAULTENA_Msk | SCB_SHCSR_USGFAULTENA_Msk;</code></p>
<p>使能后，对应 Fault 会进入自己的 Handler，同时 CFSR 寄存器记录具体原因（MMFSR/BFSR/UFSR），HFSR 记录升级原因，MMFAR/BFAR 记录出错地址。</p>
<p><b>调试建议：</b>在启动时使能所有子 Fault，并在 Handler 里打印 CFSR/HFSR/MMFAR/BFAR 和栈帧中的 PC/LR，能快速定位问题。</p>`,
        principle: `<p>Fault 是硬件在检测到非法操作时产生的异常。分类的目的是让软件能区分“权限问题”“总线问题”“指令问题”，从而采取不同恢复策略。</p>
<p>升级机制保证了即使子 Fault 未使能，错误也不会被忽略，而是统一进入 HardFault，避免系统静默出错。</p>`,
        fig: {
          type: "table",
          title: "四类 Fault 的触发原因",
          tag: "fault",
          head: ["类型", "典型原因", "状态寄存器"],
          rows: [
            ["MemManage", "MPU 越权、访问未映射区", "CFSR.MMFSR / MMFAR"],
            ["BusFault", "访问不存在地址、外设错误响应", "CFSR.BFSR / BFAR"],
            ["UsageFault", "未定义指令、非对齐、除零", "CFSR.UFSR"],
            ["HardFault", "上述未使能时升级、向量表错误", "HFSR"]
          ]
        },
        code: {
          lang: "c",
          title: "fault_enable.c",
          src: `#include <stdint.h>

#define SCB_SHCSR (*(volatile uint32_t *)0xE000ED24u)
#define SCB_CFSR  (*(volatile uint32_t *)0xE000ED28u)
#define SCB_HFSR  (*(volatile uint32_t *)0xE000ED2Cu)
#define SCB_MMFAR (*(volatile uint32_t *)0xE000ED34u)
#define SCB_BFAR  (*(volatile uint32_t *)0xE000ED38u)

/* 启动时使能所有子 Fault，便于定位 */
void fault_init(void)
{
    SCB_SHCSR |= (1u << 16) |   /* MEMFAULTENA */
                 (1u << 17) |   /* BUSFAULTENA */
                 (1u << 18);    /* USGFAULTENA */
}

/* 在 Handler 里打印关键寄存器 */
void fault_dump(void)
{
    volatile uint32_t cfsr  = SCB_CFSR;
    volatile uint32_t hfsr  = SCB_HFSR;
    volatile uint32_t mmfar = SCB_MMFAR;
    volatile uint32_t bfar  = SCB_BFAR;
    (void)cfsr; (void)hfsr; (void)mmfar; (void)bfar;

    /* 通过串口或调试器输出这些值，再对照手册解析 */
}`
        },
        codeNote: "CFSR 是三个子寄存器的组合，读出来后要按位段拆分，不能当成一个整体值解释。",
        apply: `<p>我在每个项目启动时都调用 <code>fault_init()</code>，并在 HardFault 里保存 CFSR/HFSR/MMFAR/BFAR 到备份寄存器。现场出问题时，重启后读取这些值就能判断是越界、空指针还是非对齐访问。</p>
<p>曾经一个偶发 HardFault 是 UsageFault 的非对齐访问导致的，使能子 Fault 后一次就定位到了。</p>`,
        pitfalls: [
          "<b>不使能子 Fault。</b>所有错误都进 HardFault，丢失具体原因。",
          "<b>把 CFSR 当成单一错误码。</b>它是多个位段的组合，要分别解析。",
          "<b>忘记 MMFAR/BFAR 只在有效位为 1 时才可信。</b>否则读到的是旧值。",
          "<b>在 Fault Handler 里调用复杂函数。</b>可能再次触发 Fault，形成死循环。"
        ],
        follow: [
          ["除零一定会触发 UsageFault 吗？", "Cortex-M 默认除零返回 0，不触发异常；需要设置 CCR 的 DIV_0_TRP 位才会触发 UsageFault。"],
          ["HardFault 里如何区分是中断上下文还是线程上下文？", "看 EXC_RETURN 的 bit 3：为 1 表示被打断的是线程模式（任务或 main），为 0 表示是另一个 Handler。bit 2 只表示异常帧压在 MSP 还是 PSP 上，不能用来判模式——复位后线程模式本来就用 MSP，此时进 HardFault 仍是线程上下文。"]
        ]
      },

      {
        id: "A-13",
        chapter: "exception",
        topic: "tail",
        title: "什么是中断尾链？它如何降低中断延迟？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "尾链让连续中断省去出栈再入栈，迟到让高优先级中断提前得到服务。",
        q: `<p>面试官：中断处理完后如果立刻又来一个中断，CPU 会先恢复现场再重新压栈吗？尾链和迟到是什么意思？</p>`,
        exam: `<p>考察对中断响应细节的理解。能说清“尾链省去恢复再保存”“迟到是高优先级抢占压栈阶段”，说明读懂了异常模型。</p>`,
        core: `<p>尾链：一个异常返回时如果已有另一个异常挂起，CPU 不出栈再入栈，直接跳到新 Handler，省 6~12 个周期。</p><p>迟到：异常入栈阶段来了更高优先级的异常，压栈已经完成，直接取新向量，代价很小。两者都是硬件对连续异常的优化，降低中断延迟和抖动，对 PWM、编码器这类高频中断效果明显。注意两个中断之间若执行了线程代码就不算尾链。</p>`,
        answer: `<p><b>尾链（Tail-chaining）</b>：当一个异常处理完成、异常返回时，如果发现有另一个异常处于挂起状态，CPU 不会先出栈恢复再重新入栈，而是直接跳到新的异常处理程序，省去 8 个寄存器的出栈和入栈。这个优化通常能省 6~12 个周期。</p>
<p><b>迟到（Late-arriving）</b>：在异常入栈阶段（还没有开始执行 Handler），如果来了一个更高优先级的异常，CPU 会改为服务更高优先级的那个，而不是先执行低优先级的。因为压栈已经完成，直接取新的向量即可，代价很小。</p>
<p>两者都是硬件对“连续异常”的优化，目的是降低中断延迟和抖动。对高频率中断（如电机 PWM、编码器）影响明显。</p>
<p>注意：尾链只发生在异常返回时；如果两个中断之间有线程代码执行，就不算尾链。</p>`,
        principle: `<p>异常响应分为入栈、取向量、执行 Handler、出栈几个阶段。入栈和出栈是固定开销（8 个字），尾链通过“跳过出栈再入栈”把这部分开销省掉。</p>
<p>迟到利用的是“优先级在入栈阶段仍可比较”，让更高优先级的中断不必等低优先级处理完，减少高优先级任务的响应延迟。</p>`,
        fig: {
          type: "flow",
          title: "尾链与迟到的时序",
          tag: "exception",
          items: [
            { t: "中断 A 入栈", d: "保存 8 个寄存器" },
            { t: "执行 A 的 Handler", d: "处理事件" },
            { t: "返回时发现 B 挂起", d: "不出栈，直接取 B 向量" },
            { t: "执行 B 的 Handler", d: "省去一次出栈/入栈" },
            { t: "最终出栈", d: "回到线程模式" }
          ]
        },
        apply: `<p>做高频 PWM 中断时，我会把中断处理尽量缩短，让多个中断能形成尾链，减少上下文开销。如果 Handler 太长，尾链的收益就被抵消了。</p>
<p>用示波器测中断延迟时，注意区分“从事件到 Handler 第一条指令”和“从事件到处理完成”，尾链影响的是后者。</p>`,
        pitfalls: [
          "<b>以为尾链能省掉 Handler 执行时间。</b>它只省入栈出栈开销。",
          "<b>在 Handler 里做耗时操作。</b>尾链优势消失，还阻塞其它中断。",
          "<b>混淆迟到和抢占。</b>迟到发生在入栈阶段，抢占发生在 Handler 执行中。",
          "<b>忽略优先级配置。</b>优先级相同无法抢占，迟到也无意义。"
        ],
        follow: [
          ["中断嵌套的最大深度由什么决定？", "由优先级数量和栈空间决定。每嵌套一层都要压栈，栈不够就会溢出，所以中断优先级不宜分得太细。"],
          ["为什么中断 Handler 必须和向量表里的函数名一致？需要 __attribute__((interrupt)) 吗？", "Cortex-M 上普通 C 函数结尾的 <code>BX LR</code> 就是正确的异常返回——LR 里是硬件写入的 EXC_RETURN，所以 ARM 明确说可以直接用纯 C 函数当 ISR，interrupt 属性并非必需。真正必须做的是函数名与向量表项一致、覆盖启动文件里的 weak 默认实现；对外可见的 ISR 建议加 <code>__attribute__((used))</code>，避免被优化掉。"]
        ]
      },

      {
        id: "A-14",
        chapter: "boot",
        topic: "vtor",
        title: "Bootloader 跳转到 APP 时要做什么？为什么必须设置 MSP 和 VTOR？",
        diff: "高级",
        freq: "高频",
        type: "工程实践题",
        point: "关中断、设置 MSP 为 APP 栈顶、设置 VTOR 为 APP 向量表、跳转到复位向量。",
        q: `<p>面试官：写一个 Bootloader，跳转到 APP 的代码怎么写？漏掉哪一步会导致 APP 能跑但中断不正常？</p>`,
        exam: `<p>考察 IAP 的完整流程。能说出 MSP、VTOR、关中断、跳转地址这几个关键点，并解释各自作用，就很好。</p>`,
        core: `<p>跳转前先校验 APP 有效（栈顶在 RAM 范围、复位向量在 Flash 范围），然后关全局中断和外设中断、关 SysTick。</p><p>关键两步：从 APP 向量表第 0 项读出栈顶写入 MSP；把 VTOR 指向 APP 向量表。漏 MSP 会用 Bootloader 的栈，可能越界；漏 VTOR 表现为 APP 主循环正常、一进中断就跳到 Bootloader 的 Handler 或直接跑飞。最后从第 1 项取复位向量，转成函数指针调用。</p>`,
        answer: `<p>跳转前要确认 APP 区域有有效固件（检查栈顶是否在 RAM 范围、复位向量是否在 Flash 范围），然后按顺序：</p>
<ol>
<li><b>关闭全局中断</b>（<code>__disable_irq()</code>），关闭已使能的外设中断，避免跳转过程中被中断打断。</li>
<li><b>关闭 SysTick</b>，否则 APP 启动后时基可能异常。</li>
<li><b>设置 MSP</b>：从 APP 向量表第 0 项读出初始栈顶，写入 MSP。APP 有自己的栈空间，必须切换过去。</li>
<li><b>设置 VTOR</b>：指向 APP 的向量表基址。否则 APP 里的中断会跳到 Bootloader 的向量表。</li>
<li><b>跳转</b>：从向量表第 1 项取出复位向量，转换成函数指针调用。</li>
</ol>
<p><b>漏掉 MSP：</b>APP 使用的还是 Bootloader 的栈，可能越界或与 APP 的全局变量冲突。</p>
<p><b>漏掉 VTOR：</b>APP 能正常运行主循环，但一进中断就跳到 Bootloader 的 Handler，表现为中断不响应、跑飞或死机。这是最典型的症状。</p>
<p>跳转前还要注意：外设状态要复位（或由 APP 重新初始化）、时钟恢复默认、看门狗处理，避免 Bootloader 的配置影响 APP。</p>`,
        principle: `<p>复位时硬件自动从向量表加载 MSP 和 PC，但软件跳转不会触发这个机制，所以必须手动模拟：设置 MSP、设置 VTOR、跳到复位向量。</p>
<p>VTOR 是硬件查表的基址，APP 的中断号与 Bootloader 相同，但表项内容不同，必须让硬件查 APP 的表。</p>`,
        fig: {
          type: "flow",
          title: "Bootloader 跳转 APP 的步骤",
          tag: "iap",
          items: [
            { t: "校验 APP", d: "栈顶在 RAM、复位向量在 Flash" },
            { t: "关中断", d: "disable_irq + 关外设中断" },
            { t: "设 MSP", d: "取 APP 向量表第 0 项" },
            { t: "设 VTOR", d: "指向 APP 向量表基址" },
            { t: "跳转", d: "取第 1 项作为复位向量调用" }
          ]
        },
        code: {
          lang: "c",
          title: "jump_to_app.c",
          src: `#include <stdint.h>

typedef void (*app_entry_t)(void);

#define APP_BASE 0x08008000u

int jump_to_app(void)
{
    uint32_t sp = *(volatile uint32_t *)APP_BASE;
    uint32_t pc = *(volatile uint32_t *)(APP_BASE + 4u);

    /* 1. 简单合法性检查：栈顶应在 SRAM 范围，PC 应在 Flash 范围 */
    if ((sp & 0xFFF00000u) != 0x20000000u) return -1;
    if ((pc & 0xFF000000u) != 0x08000000u) return -1;

    /* 2. 关中断、关 SysTick */
    __asm volatile ("cpsid i" ::: "memory");
    SysTick->CTRL = 0;
    SysTick->LOAD = 0;
    SysTick->VAL  = 0;

    /* 3. 设置 MSP 和 VTOR */
    __set_MSP(sp);
    SCB->VTOR = APP_BASE;

    /* 4. 跳转到 APP 复位向量 */
    app_entry_t entry = (app_entry_t)pc;
    __asm volatile ("dsb 0xF" ::: "memory");
    __asm volatile ("isb 0xF" ::: "memory");
    entry();

    return 0;   /* 不会返回 */
}`
        },
        codeNote: "跳转后 APP 必须重新初始化时钟和外设，不能假设 Bootloader 的配置仍然有效。",
        apply: `<p>我在 Bootloader 里会先打印 APP 区域的校验结果，再跳转。如果 APP 校验失败就停留在 Bootloader，等待升级，避免跳进空白 Flash 后死机。</p>
<p>调试时如果 APP 主循环正常但串口中断不响应，第一反应就是检查 VTOR 有没有设置。</p>`,
        pitfalls: [
          "<b>只跳转不设 VTOR。</b>中断全部走 Bootloader 的表。",
          "<b>不设 MSP。</b>APP 使用 Bootloader 的栈，容易溢出。",
          "<b>跳转前不关中断。</b>中断可能在切换过程中触发，状态混乱。",
          "<b>APP 链接地址与跳转地址不一致。</b>代码跑飞。",
          "<b>跳转后不重新初始化外设。</b>串口、时钟状态不确定。"
        ],
        follow: [
          ["APP 的链接脚本要注意什么？", "Flash 起始地址要改成 APP 基址，向量表偏移要对应；RAM 可以共用，但栈顶要留足空间。"],
          ["如何让 APP 支持回滚？", "Bootloader 维护多个 APP 分区和状态标志，新固件启动后未确认则切回旧分区，具体设计见 OTA 相关题目。"]
        ]
      },

      {
        id: "A-15",
        chapter: "boot",
        topic: "thumb",
        title: "Thumb 指令集有什么特点？为什么函数指针最低位是 1？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "Thumb 是 16 位压缩编码，地址最低位用作状态位区分 ARM/Thumb，所以函数指针常带 1。",
        q: `<p>面试官：反汇编里经常看到函数地址是奇数（如 0x08000121），为什么？Cortex-M 只支持 Thumb 吗？</p>`,
        exam: `<p>考察指令集细节。能说出“最低位是 Thumb 状态位、跳转时硬件忽略最低位”，说明看过底层代码。</p>`,
        core: `<p>Thumb 是 16 位压缩编码，代码密度比经典 32 位 ARM 小约 30%；Thumb-2 混合 16/32 位，兼顾密度和性能。Cortex-M 只支持 Thumb/Thumb-2。</p><p>地址最低位表示指令集状态：0 是 ARM、1 是 Thumb。函数指针存的是“地址+状态位”，所以 Thumb 函数指针看起来是奇数；<code>BX/BLX</code> 读最低位切换状态并把实际地址最低位清零。手动清掉这一位可能进错状态，直接 HardFault。</p>`,
        answer: `<p><b>Thumb 指令集</b>是 ARM 的 16 位压缩编码，目的是提高代码密度。经典 ARM 指令固定 32 位，Thumb 用 16 位表示常用操作，代码体积能减少约 30%。</p>
<p><b>Thumb-2</b> 在 Thumb 基础上混合 16 位和 32 位编码，兼顾密度和性能。Cortex-M 只支持 Thumb/Thumb-2，不支持经典 32 位 ARM 指令集。</p>
<p><b>为什么地址是奇数：</b>ARM 用地址最低位表示指令集状态：</p>
<ul>
<li>最低位为 0：ARM 状态（32 位指令）；</li>
<li>最低位为 1：Thumb 状态（16/32 位指令）。</li>
</ul>
<p>函数指针保存的是“地址 + 状态位”，所以 Thumb 函数的指针值看起来是奇数。执行 <code>BX</code> 或 <code>BLX</code> 跳转时，硬件会读取最低位切换状态，并把实际地址的最低位清零（因为指令至少 2 字节对齐）。</p>
<p>这就是为什么在 Cortex-M 上给函数指针赋值、做向量表跳转时，地址常常带 1；如果手动把最低位清掉，跳转后可能进入错误的指令状态，直接 HardFault。</p>`,
        principle: `<p>指令地址天然对齐（Thumb 至少 2 字节），最低位永远是 0，因此可以“借用”这一位表示状态，不浪费额外寄存器。这是 ARM 的经典设计。</p>
<p>编译器在取函数地址时会自动加 1（设置 Thumb 位），链接器在生成向量表时也会写入带 1 的地址。</p>`,
        fig: {
          type: "bits",
          title: "函数地址的最低位编码状态",
          tag: "thumb",
          cells: [
            { v: "0x0800", n: "地址高位" },
            { v: "0x01", n: "地址中位" },
            { v: "0x20", n: "对齐地址" },
            { v: "1", n: "Thumb 位" }
          ],
          note: "实际跳转地址 = 指针值 & ~1；最低位只用于选择指令集状态。"
        },
        code: {
          lang: "c",
          title: "thumb_ptr.c",
          src: `#include <stdint.h>

typedef void (*fn_t)(void);

/* 编译器会自动设置最低位 */
void target(void) { }

fn_t get_handler(void)
{
    return target;          /* 值的最低位通常为 1 */
}

/* 手动从向量表取地址时，不要清掉最低位 */
void jump_from_vector(uint32_t *vector)
{
    fn_t fn = (fn_t)vector[1];   /* 保留 Thumb 位 */
    fn();
}

/* 如果确实需要“纯地址”，用 & ~1u，但跳转时仍应使用带状态位的值 */
uint32_t pure_addr(fn_t fn)
{
    return ((uint32_t)fn) & ~1u;
}`
        },
        codeNote: "在 Cortex-M 上手动构造函数指针时，务必保留最低位的 1，否则 BX 会尝试切换到 ARM 状态而触发 Fault。",
        apply: `<p>写 Bootloader 跳转时，我直接从向量表取第 1 项作为函数指针，不做任何位运算，这样 Thumb 位自然保留。</p>
<p>做函数指针表（命令分发）时，也直接用函数名赋值，不要手动转成整数再转回来，避免丢失状态位。</p>`,
        pitfalls: [
          "<b>手动把函数地址最低位清零。</b>跳转后进入错误状态，HardFault。",
          "<b>以为 Cortex-M 支持 ARM 指令。</b>只支持 Thumb/Thumb-2。",
          "<b>用地址做哈希或比较时忽略最低位。</b>同一函数的指针可能因状态位不同而不相等。",
          "<b>把函数指针存进 16 位变量。</b>地址被截断。"
        ],
        follow: [
          ["Thumb 指令一定是 16 位吗？", "不一定。Thumb-2 混合 16 位和 32 位编码，32 位指令用于复杂操作，取指时根据前缀判断长度。"],
          ["为什么 Cortex-M 不支持 ARM 状态？", "为了简化流水线和译码逻辑，降低芯片面积和功耗；Thumb-2 已经能覆盖绝大多数场景，性能损失很小。"]
        ]
      },

      {
        id: "A-16",
        chapter: "core",
        topic: "barrier",
        title: "DMB、DSB、ISB 在驱动开发中怎么用？能举一个实际例子吗？",
        diff: "高级",
        freq: "进阶",
        type: "工程应用题",
        point: "DSB 等完成、DMB 保顺序、ISB 清流水线；驱动里常见于 DMA、时钟切换、向量表修改。",
        q: `<p>面试官：你实际在什么代码里用过屏障指令？不加会出什么问题？</p>`,
        exam: `<p>考察工程经验。能结合 DMA 启动、时钟切换、Flash 编程、向量表重定位举出具体例子，比背定义更有说服力。</p>`,
        core: `<p>实战场景：① 启动 DMA——填完缓冲区先 <code>DSB()</code> 再写启动寄存器，带 Cache 还要先 clean；② 切时钟——写完 PLL 配置 <code>DSB()</code> 再轮询就绪，切换后加 <code>ISB()</code>；③ 改 VTOR——<code>DSB()+ISB()</code>；④ Flash 编程——写控制寄存器后 <code>DSB()</code> 再等 BSY；⑤ 多核共享——写数据后 <code>DMB()</code> 再置标志。</p><p>漏掉往往“偶尔”出错，改优化等级或负载变化才复现，很难查。</p>`,
        answer: `<p>几个我实际用过的场景：</p>
<p><b>1. 启动 DMA：</b>填充缓冲区后，必须 <code>DSB()</code> 确保数据真正写入内存，再写 DMA 启动寄存器。否则 DMA 可能读到旧数据。带 Cache 的芯片还要先 clean。</p>
<p><b>2. 切换系统时钟：</b>写 RCC 寄存器切换 PLL 后，要等 <code>DSB()</code> 让写操作完成，再轮询就绪标志；切换完成后加 <code>ISB()</code>，保证后续指令按新时钟取指。</p>
<p><b>3. 修改向量表：</b>更新 VTOR 后，<code>DSB()</code> + <code>ISB()</code> 保证后续异常使用新表。</p>
<p><b>4. Flash 编程：</b>写 Flash 控制寄存器后，需要 <code>DSB()</code> 等待写完成再轮询 BSY 位；某些芯片还要求编程期间不从 Flash 取指。</p>
<p><b>5. 多核通信：</b>写共享内存后加 <code>DMB()</code>，再置标志位，保证对方看到标志时数据已经可见。</p>
<p><b>不加会怎样：</b>表现为“偶尔”出错——大多数时候正常，负载变化或优化等级改变后偶发失败，非常难查。这类问题往往在实验室复现不了，量产才暴露。</p>`,
        principle: `<p>屏障解决的是“顺序”和“完成”两个问题：DMB 保证顺序，DSB 保证完成，ISB 保证取指新鲜。它们作用于流水线、写缓冲和 Cache，是软件与硬件之间的契约。</p>
<p>编译器屏障（<code>asm volatile("" ::: "memory")</code>）解决的是编译器重排，硬件屏障解决的是 CPU 重排，两者不能互相替代。</p>`,
        fig: {
          type: "table",
          title: "驱动中的屏障使用场景",
          tag: "barrier usage",
          head: ["场景", "屏障", "原因"],
          rows: [
            ["启动 DMA", "DSB", "确保缓冲区数据已写入"],
            ["切换时钟", "DSB + ISB", "等写完成，刷新取指"],
            ["修改 VTOR", "DSB + ISB", "异常表基址生效"],
            ["多核共享内存", "DMB", "保证数据先于标志可见"],
            ["Flash 编程", "DSB", "等待控制寄存器写入"]
          ]
        },
        code: {
          lang: "c",
          title: "clock_switch.c",
          src: `#include <stdint.h>

#define DSB() __asm volatile ("dsb 0xF" ::: "memory")
#define ISB() __asm volatile ("isb 0xF" ::: "memory")

extern volatile uint32_t RCC_CFGR;
extern volatile uint32_t RCC_CR;

int switch_to_pll(void)
{
    /* 1. 配置 PLL 并启动 */
    RCC_CR |= (1u << 24);          /* PLLON */

    /* 2. 等待 PLL 就绪：状态位由硬件更新，必须 volatile 防止轮询被优化成只读一次 */
    uint32_t timeout = 100000u;
    while (!(RCC_CR & (1u << 25))) {
        if (--timeout == 0) return -1;
    }

    /* 3. 切换系统时钟源 */
    RCC_CFGR = (RCC_CFGR & ~0x3u) | 0x2u;   /* PLL 作为 SYSCLK */

    /* 4. 保证写操作完成，再检查切换状态 */
    DSB();
    while (((RCC_CFGR >> 2) & 0x3u) != 0x2u) { }

    /* 5. 刷新流水线，后续指令按新时钟执行 */
    ISB();
    return 0;
}`
        },
        codeNote: "时钟切换后 Flash 等待周期也要同步调整，否则高频下取指会出错。",
        apply: `<p>我把这些屏障封装成宏，在驱动初始化函数里显式调用，并在注释里写清“为什么需要”。代码评审时，凡是“写配置后立刻启动硬件”的地方都要检查有没有 DSB。</p>
<p>调试这类问题时，可以临时去掉屏障看是否能复现，但绝不能因为“去掉也能跑”就删掉——那只是运气好。</p>`,
        pitfalls: [
          "<b>以为 volatile 能替代屏障。</b>volatile 不保证多变量顺序。",
          "<b>只在 Debug 版本加屏障。</b>Release 优化后问题才暴露。",
          "<b>用 DMB 代替 DSB 启动 DMA。</b>DMB 不等待写入完成。",
          "<b>屏障加在错误的位置。</b>必须在“写数据”和“触发”之间。"
        ],
        follow: [
          ["编译器屏障和硬件屏障能互相替代吗？", "不能。编译器屏障只约束编译器，CPU 仍可能乱序；硬件屏障只约束 CPU，编译器仍可能重排。两者通常一起用。"],
          ["Cortex-M0 支持 DSB/DMB 吗？", "支持，ARMv6-M 也定义了 DSB/DMB/ISB，只是实现可能更简单，语义仍然有效。"]
        ]
      },

      {
        id: "A-17",
        chapter: "core",
        topic: "mcu",
        title: "CMSIS 是什么？为什么用它而不是直接操作寄存器？",
        diff: "初级",
        freq: "中频",
        type: "概念辨析题",
        point: "CMSIS 是 ARM 定义的内核访问标准层，统一寄存器定义、启动流程和 RTOS 接口。",
        q: `<p>面试官：代码里常见的 <code>__NVIC_SetPriority</code>、<code>SysTick_Config</code> 是哪来的？CMSIS 解决了什么问题？</p>`,
        exam: `<p>考察对生态标准的了解。能说出“内核寄存器定义、启动文件、DSP 库、RTOS 接口”几个组成部分，就足够。</p>`,
        core: `<p>CMSIS 是 ARM 定的标准接口，让不同厂商的 Cortex-M 在软件层保持一致：Core 提供内核寄存器、NVIC/SCB/SysTick 访问和启动模板，另有 DSP、RTOS、Driver、Pack。</p><p>用它是因为可移植（换同内核芯片不用改）、可读（<code>NVIC_EnableIRQ(USART1_IRQn)</code> 比直接写地址清楚）、封装了屏障和位操作细节。局限是只覆盖内核，外设寄存器仍由厂商头文件/HAL 定义。</p>`,
        answer: `<p><b>CMSIS（Cortex Microcontroller Software Interface Standard）</b>是 ARM 定义的一套标准接口，让不同厂商的 Cortex-M 芯片在软件层面保持一致。</p>
<p>主要包含：</p>
<ul>
<li><b>CMSIS-Core</b>：内核寄存器定义（NVIC、SCB、SysTick）、访问函数、启动文件模板、系统初始化。</li>
<li><b>CMSIS-DSP</b>：优化的 DSP 函数库（FFT、滤波、矩阵），针对 Cortex-M 的 SIMD/MAC 指令优化。</li>
<li><b>CMSIS-RTOS</b>：RTOS 的通用 API 封装，便于切换不同 RTOS。</li>
<li><b>CMSIS-Driver</b>：外设驱动的通用接口（部分厂商支持）。</li>
<li><b>CMSIS-Pack</b>：器件支持包，包含启动文件、链接脚本、外设寄存器定义。</li>
</ul>
<p><b>为什么用 CMSIS：</b></p>
<ul>
<li>可移植：换同内核的芯片，内核相关代码不用改；</li>
<li>可读性：<code>NVIC_EnableIRQ(USART1_IRQn)</code> 比直接写 <code>*(volatile uint32_t*)0xE000E100 |= ...</code> 清晰得多；</li>
<li>正确性：封装了内存屏障、位操作等细节，减少出错；</li>
<li>生态：调试器、RTOS、中间件都基于 CMSIS 提供支持。</li>
</ul>
<p><b>局限：</b>CMSIS 只覆盖内核，外设寄存器定义由厂商提供（如 STM32 的 HAL/LL 或器件头文件），不同厂商风格不同。</p>`,
        principle: `<p>CMSIS 是一层薄封装，大部分函数是 <code>static inline</code> 或宏，编译后和直接操作寄存器效率相同，没有运行时开销。</p>
<p>它把“内核寄存器的地址和位定义”标准化，避免每个厂商各写一套，降低软件复用成本。</p>`,
        fig: {
          type: "layers",
          title: "CMSIS 在软件栈中的位置",
          tag: "cmsis",
          items: [
            { tag: "应用", t: "业务代码", d: "不直接接触内核寄存器" },
            { tag: "中间件", t: "RTOS / DSP / 协议栈", d: "通过 CMSIS-RTOS/DSP 接口" },
            { tag: "CMSIS", t: "Core / DSP / RTOS / Driver", d: "标准化内核访问" },
            { tag: "芯片", t: "厂商头文件 + 外设库", d: "定义具体外设寄存器" }
          ]
        },
        code: {
          lang: "c",
          title: "cmsis_usage.c",
          src: `#include "stm32f4xx.h"

void nvic_demo(void)
{
    /* CMSIS 风格：可读、可移植 */
    NVIC_SetPriority(USART1_IRQn, 5);
    NVIC_EnableIRQ(USART1_IRQn);

    /* 等价的直接寄存器操作，可读性差且易错 */
    /* NVIC->IP[USART1_IRQn] = 5 << 4; */
    /* NVIC->ISER[USART1_IRQn >> 5] = 1u << (USART1_IRQn & 0x1F); */
}

void systick_demo(void)
{
    /* 配置 1ms 时基，返回 0 表示成功 */
    if (SysTick_Config(SystemCoreClock / 1000u) != 0) {
        /* 重装载值超出 24 位范围 */
    }
}`
        },
        codeNote: "CMSIS 的 NVIC 优先级函数会自动处理优先级分组的移位，直接写寄存器容易漏掉移位。",
        apply: `<p>我优先用 CMSIS 函数配置内核外设（NVIC、SysTick、SCB），用厂商 LL 库或寄存器宏配置芯片外设。这样内核部分可移植，外设部分性能可控。</p>
<p>看别人的代码时，如果出现大量裸地址操作内核寄存器，通常是没引入 CMSIS 或从老项目抄来的，维护成本会比较高。</p>`,
        pitfalls: [
          "<b>以为 CMSIS 包含外设驱动。</b>它只标准化内核，外设由厂商定义。",
          "<b>混用不同版本的 CMSIS。</b>头文件冲突，编译报重复定义。",
          "<b>直接改 CMSIS 头文件。</b>升级时被覆盖，应该在自己的配置里覆盖宏。",
          "<b>忽略优先级分组的移位。</b>直接写 IP 寄存器时优先级可能不符合预期。"
        ],
        follow: [
          ["CMSIS-RTOS v1 和 v2 有什么区别？", "v2 重新设计了 API，支持更多对象类型和动态配置，更接近原生 RTOS 能力；v1 较简单，逐渐被替代。"],
          ["CMSIS-DSP 在 M0 上能用吗？", "可以，但 M0 没有 DSP 指令，只能走通用实现，性能不如 M4；库会自动选择对应内核的优化版本。"]
        ]
      }
    ]
  });
})();
