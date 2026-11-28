/* ============================================================
   03 计算机组成原理
   ============================================================ */
(function () {
  "use strict";

  EIK.register("computer-basic", {
    chapters: [
      {
        id: "cpu",
        title: "CPU 与指令",
        topics: [
          { id: "arch", title: "冯诺依曼与哈佛结构" },
          { id: "pipeline", title: "指令执行与流水线" }
        ]
      },
      {
        id: "storage",
        title: "存储与总线",
        topics: [
          { id: "cache", title: "存储层次与 Cache" },
          { id: "bus", title: "总线与地址空间" }
        ]
      },
      {
        id: "io",
        title: "中断与 DMA",
        topics: [
          { id: "interrupt", title: "中断与异常" },
          { id: "dma", title: "DMA 数据传输" }
        ]
      }
    ],

    questions: [
      {
        id: "B-01",
        chapter: "cpu",
        topic: "arch",
        title: "冯诺依曼结构和哈佛结构有什么区别？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "程序与数据是否共用存储空间和总线，以及这对带宽、取指和执行的影响。",
        q: `<p>面试官：<strong>冯诺依曼结构和哈佛结构</strong>有什么区别？STM32 属于哪一种？为什么它又被叫作“改进型哈佛结构”？</p>`,
        exam: `<p>这题看似简单，但能讲清“统一编址 vs 独立总线”“为什么取指和取数不能同时进行”“Cortex-M 的实际实现”才算过关。很多人只会说“一个共用、一个分开”，却答不出工程意义。</p>`,
        core: `<p>冯诺依曼程序和数据共用同一存储与总线，哈佛结构指令和数据分开、可同时取指和读数据；Cortex-M 总线分开但统一编址，所以叫改进型哈佛。</p>`,
        answer: `<p>冯诺依曼结构的核心是<strong>程序和数据共用同一块存储空间、同一组总线</strong>。CPU 取指令和读数据都要走这条总线，所以同一时刻只能做一件事，这就是“冯诺依曼瓶颈”。</p>
<p>哈佛结构把程序存储和数据存储分开，各自有独立的总线和地址空间，CPU 可以在一个周期内同时取指令和读数据，带宽更高，适合 DSP 这类数据吞吐大的场景。</p>
<p>STM32 用的是 Cortex-M 内核，它采用了<strong>改进型哈佛结构</strong>：指令总线（I-Code）和数据总线（D-Code）分开，可以并行访问；但从程序员视角看，Flash 和 SRAM 又统一编址在同一片 4GB 地址空间里，可以像访问内存一样访问外设寄存器。所以它既有哈佛的并行带宽，又保留了冯诺依曼的统一编址便利。</p>`,
        principle: `<p>严格意义上的哈佛结构要求指令和数据有完全独立的地址空间，程序不能把自己当数据读。这在通用计算里不方便（比如加载器要把代码当数据写入），所以现代 MCU 普遍采用“分离总线 + 统一地址空间”的折中方案。</p>
<p>Cortex-M3/M4 有三条总线：I-Code 和 D-Code 都指向 Code 区（0x0000_0000~0x1FFF_FFFF，通常是 Flash），I-Code 负责取指，D-Code 负责对 Flash 的数据访问（例如读常量表）；SRAM（0x2000_0000 起）和外设（0x4000_0000 起）则挂在 System 总线上。三条通路可以同时活动，所以“取指”和“读 Flash 里的常量”不会互相阻塞，但最终都要经过总线矩阵仲裁，同时访问同一块 SRAM 时仍会排队。</p>`,
        fig: {
          type: "table",
          title: "两种结构的对比",
          tag: "compare",
          head: ["维度", "冯诺依曼", "哈佛"],
          rows: [
            ["存储空间", "程序与数据共用", "程序与数据分离"],
            ["总线", "一套地址/数据总线", "指令总线 + 数据总线"],
            ["取指与取数", "不能同时进行", "可并行"],
            ["典型代表", "x86、ARM7TDMI", "8051、DSP、AVR、Cortex-M（改进型）"],
            ["优势", "结构简单、统一编址灵活", "带宽高、实时性好"],
            ["劣势", "存在总线瓶颈", "地址空间割裂、成本略高"]
          ]
        },
        apply: `<p>理解这一点对写代码有实际意义：把频繁访问的常量表放到 Flash（<code>const</code>）时，CPU 通过 D-Code 读取它，而变量在 SRAM 中走 System 总线，两条通路不冲突；但 Flash 本身的速度跟不上主频，等待周期没配对时读常量同样会变慢，表现为“代码跑得比预期慢”。</p>
<p>另一个实践是：把中断服务函数和热点循环放到 SRAM 里执行（通过链接脚本指定段），避开 Flash 等待周期，在高频中断场景能明显降低延迟抖动。</p>`,
        pitfalls: [
          "<b>说“哈佛结构就是有两个存储器”。</b>关键不在物理上有几块存储，而在是否有独立的访问通路和地址空间。",
          "<b>认为 Cortex-M 是纯哈佛。</b>它是改进型哈佛：总线分离但地址空间统一，程序可以读写任意地址。",
          "<b>忽略 Flash 等待周期。</b>即使总线分离，Flash 本身的速度跟不上 CPU 主频，需要插入 wait state，这才是实际性能瓶颈。"
        ],
        follow: [
          [
            "什么是冯诺依曼瓶颈？",
            "CPU 与存储器之间的总线带宽有限，取指令和读写数据争用同一通路，导致 CPU 大部分时间在等数据，无法充分发挥运算能力。缓解手段是 Cache、多级流水和分离总线。"
          ],
          [
            "为什么 DSP 更偏爱哈佛结构？",
            "DSP 的典型运算是“取两个操作数 + 存一个结果”，需要高数据带宽。哈佛结构允许同时取指令和取操作数，配合双端口 RAM，可以一个周期完成乘加，正好匹配 FIR/FFT 的运算模式。"
          ],
          [
            "统一编址和独立编址有什么区别？",
            "统一编址是把外设寄存器映射到内存地址空间，用普通访存指令访问（如 STM32 的寄存器）；独立编址需要专门的 IO 指令和 IO 地址空间（如 x86 的 in/out）。统一编址编程简单，但占用地址空间。"
          ]
        ]
      },

      {
        id: "B-02",
        chapter: "cpu",
        topic: "pipeline",
        title: "一条指令是怎么执行的？流水线会带来什么问题？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "取指-译码-执行-访存-写回的阶段划分，以及流水线冒险与分支预测。",
        q: `<p>面试官：CPU 执行一条指令要经过哪些阶段？<strong>流水线</strong>为什么能提高性能？它会带来什么问题？中断发生时流水线怎么处理？</p>`,
        exam: `<p>考察对 CPU 工作流程的整体理解，也是理解“中断延迟”“分支开销”“为什么循环展开能优化”的基础。能说出“流水线冒险”和“流水线冲刷”就很到位了。</p>`,
        core: `<p>五级流水是取指、译码、执行、访存、写回重叠执行；结构冒险靠加资源，数据冒险靠旁路或停顿，控制冒险靠分支预测，预测失败要冲刷流水线。中断到来时已完成指令写回、后续指令被冲刷，硬件压栈后跳到中断服务函数。</p>`,
        answer: `<p>经典五级流水是：取指（IF）、译码（ID）、执行（EX）、访存（MEM）、写回（WB）。取指从 PC 指向的地址读指令；译码解析操作码和操作数；执行做运算或地址计算；访存读写数据；写回把结果写进寄存器。</p>
<p>流水线的思想是让不同指令的不同阶段重叠执行。理想情况下每个周期都能完成一条指令，吞吐量提高约 5 倍，但单条指令的延迟并没有变短。</p>
<p>问题主要有三类<strong>冒险</strong>：结构冒险是硬件资源冲突（比如同时要访问同一块存储器）；数据冒险是后一条指令要用前一条还没写回的结果；控制冒险是遇到跳转，不知道下一条该取哪里。解决办法分别是增加资源、旁路/停顿、分支预测。</p>
<p>中断到来时，CPU 要等当前指令执行完，然后<strong>冲刷流水线</strong>，丢弃已经取入但还没执行的指令，保存现场后跳转到中断服务程序。所以中断响应有若干周期的延迟，这也是“中断延迟”的一部分。</p>`,
        principle: `<p>流水线提高的是吞吐率而不是单条延迟。假设五级流水、每级 1 个周期，执行 100 条指令：不用流水线要 500 周期，用流水线约 104 周期。但如果每条指令之间都有数据依赖需要停顿，实际加速比会远低于 5。</p>
<p>Cortex-M3/M4 是三级流水（取指、译码、执行），M7 是六级超标量流水。级数越多，主频越容易做高，但分支预测失败的惩罚也越大。</p>`,
        fig: {
          type: "flow",
          title: "五级流水线的阶段划分",
          tag: "pipeline",
          items: [
            { t: "IF 取指", d: "PC → 指令" },
            { t: "ID 译码", d: "解析操作码" },
            { t: "EX 执行", d: "ALU 运算" },
            { t: "MEM 访存", d: "load / store" },
            { t: "WB 写回", d: "写寄存器" }
          ]
        },
        apply: `<p>这些知识能直接指导优化：把循环里频繁使用的变量放进寄存器（减少 load/store）；避免在热点循环里写复杂的条件分支（分支预测失败要冲刷流水线）；把相关运算拆开让编译器有机会调度（指令级并行）。</p>
<p>反过来，如果中断服务函数第一条指令就依赖刚被中断的主程序写的数据，也可能因为流水线未完成而需要额外等待，这在极致的实时性分析里要考虑。</p>`,
        pitfalls: [
          "<b>认为流水线让单条指令更快。</b>它提高的是吞吐量，单条指令的总延迟反而因为流水寄存器而略微增加。",
          "<b>忽略数据冒险的停顿。</b>连续的“写后读”依赖会导致流水线气泡，编译器会通过指令重排来填补。",
          "<b>认为中断是“立刻”响应的。</b>要等当前指令完成、流水线排空，再压栈跳转，通常有十几个周期的延迟。"
        ],
        follow: [
          [
            "什么是旁路（forwarding）？",
            "把前一条指令在 EX 阶段算出的结果直接送给后一条指令的 EX 输入，而不等它写回寄存器，从而避免停顿。只有当结果还没算出来（如 load 指令）时才必须停顿。"
          ],
          [
            "分支预测失败为什么要冲刷流水线？",
            "CPU 已经按预测方向取入了后续指令，一旦发现预测错误，这些指令都是无效的，必须丢弃并重新从正确地址取指，浪费的周期数约等于流水线深度。"
          ],
          [
            "Cortex-M 的流水线是几级？",
            "Cortex-M0、M3、M4 都是三级（取指、译码、执行），M0+ 精简为两级；M7 是六级超标量且带分支预测。级数越多主频越高，但中断延迟和分支惩罚也越大。"
          ]
        ]
      },

      {
        id: "B-03",
        chapter: "storage",
        topic: "cache",
        title: "SRAM、DRAM、Flash、EEPROM 有什么区别？怎么选？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "易失性、读写速度、擦写寿命、容量成本，以及 MCU 内部的存储组织。",
        q: `<p>面试官：<strong>SRAM、DRAM、Flash、EEPROM</strong> 有什么区别？STM32 的 512KB Flash 和 128KB SRAM 分别用来放什么？为什么不能把程序直接放在 SRAM 里跑？</p>`,
        exam: `<p>考察对存储介质的物理特性与工程约束的理解。能说出“Flash 按扇区擦除、有寿命限制、写前必须擦”“SRAM 贵但快、不需要刷新”，就说明你真的关心过数据手册。</p>`,
        core: `<p>SRAM 快但面积大、DRAM 密度高但要刷新，两者都易失；Flash 按扇区擦写存代码，EEPROM 可按字节擦写存参数。STM32 的 Flash 放代码和常量，SRAM 放栈、堆和全局变量，程序不能直接在 SRAM 跑，因为掉电丢失且容量小、成本高。</p>`,
        answer: `<p>按易失性分两类：SRAM 和 DRAM 断电丢失，属于易失性存储；Flash 和 EEPROM 断电保留，属于非易失性存储。</p>
<p>SRAM 用六个晶体管存一位，速度快、不需要刷新，但面积大、成本高，通常只有几十到几百 KB，用作 MCU 的片内 RAM。DRAM 用一个电容加一个晶体管，密度高、便宜，但需要周期性刷新，速度比 SRAM 慢，常见于外部内存条。</p>
<p>Flash 按扇区擦除、按字编程，擦写次数有限（通常 1 万到 10 万次），容量大、成本低，用来存程序和数据。EEPROM 可以按字节擦写、寿命更长（百万次），但容量小、速度慢，适合存少量参数。</p>
<p>STM32 的 512KB Flash 放代码和常量，128KB SRAM 放运行时变量、栈和堆。程序不能直接在 SRAM 里“运行”是因为 SRAM 掉电就没了，每次上电都要重新加载；但可以把代码<strong>拷贝到 SRAM 里执行</strong>，这是为了避开 Flash 等待周期，提高速度。</p>`,
        principle: `<p>Flash 的物理特性决定了它的操作方式：编程只能把 1 写成 0，要把 0 变回 1 必须整块擦除。所以“改一个字节”实际上要“读出整扇区 → 修改 → 擦除扇区 → 写回”，这也是为什么 Flash 上的参数存储要做磨损均衡和掉电保护。</p>
<p>NOR Flash 支持随机访问，可以直接执行代码（XIP）；NAND Flash 按页读写、有坏块，需要 ECC 和坏块管理，通常用于大容量数据存储。</p>`,
        fig: {
          type: "table",
          title: "常见存储介质对比",
          tag: "compare",
          head: ["类型", "易失性", "读写单位", "速度", "擦写寿命", "典型用途"],
          rows: [
            ["SRAM", "易失", "字节", "最快（ns 级）", "无限", "片内 RAM、Cache"],
            ["DRAM", "易失（需刷新）", "字节", "较快", "无限", "外部内存"],
            ["NOR Flash", "非易失", "扇区擦 / 字编程", "读快写慢", "1 万 ~ 10 万次", "程序存储、XIP"],
            ["NAND Flash", "非易失", "页读写 / 块擦", "读较快写慢", "千 ~ 万次", "大容量数据"],
            ["EEPROM", "非易失", "字节", "慢（ms 级）", "100 万次", "小参数、校准数据"]
          ]
        },
        apply: `<p>做参数存储时，如果数据量小且改动不频繁，可以用片内 Flash 模拟 EEPROM（两个扇区交替写，配合版本号和 CRC）；如果改动频繁（比如每秒记一次），必须用外部 EEPROM 或 FRAM，否则按 1 万次擦写寿命算，3 小时左右就会把 Flash 写坏。</p>
<p>另外要注意：Flash 擦写期间 CPU 从同一块 Flash 取指会被阻塞，中断响应会变慢。所以擦写操作要么放到空闲时做，要么把中断向量和关键代码搬到 SRAM。</p>`,
        pitfalls: [
          "<b>以为 Flash 可以像 RAM 一样随意改写。</b>写之前必须擦除整个扇区，而且擦除期间不能从该扇区取指。",
          "<b>忽略擦写寿命。</b>每秒写一次、寿命 1 万次的扇区，不到 3 小时就写坏了。必须做磨损均衡或换介质。",
          "<b>把大数组定义在片内 RAM 却以为是“零成本”。</b>128KB SRAM 要同时容纳 .data、.bss、堆、栈，很容易不够，编译报 region overflow 才发现。"
        ],
        follow: [
          [
            "为什么 SRAM 比 DRAM 贵？",
            "SRAM 每位需要 6 个晶体管，DRAM 只需 1 个晶体管加 1 个电容，密度差 4~6 倍。相同容量下 SRAM 占用的芯片面积大得多，成本自然高。"
          ],
          [
            "什么是 XIP？",
            "Execute In Place，指 CPU 直接从 Flash 取指执行，不需要先把代码拷到 RAM。NOR Flash 支持随机访问所以可以 XIP；NAND 不支持，必须先加载到 RAM。"
          ],
          [
            "Flash 的 wait state 是什么？",
            "Flash 的读取速度跟不上 CPU 主频时，需要插入等待周期。比如 72MHz 下 Flash 需要 2 个等待周期，配置在 FLASH_ACR 的 LATENCY 位。配少了会读错数据，配多了会降低性能。"
          ]
        ]
      },

      {
        id: "B-04",
        chapter: "storage",
        topic: "cache",
        title: "Cache 的工作原理是什么？多核或 DMA 下为什么会有数据不一致？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "局部性原理、映射方式、写策略，以及 DMA 与 Cache 的一致性问题。",
        q: `<p>面试官：<strong>Cache 为什么有效？</strong>直接映射、组相联、全相联有什么区别？如果 DMA 把数据写进了内存，CPU 读到的却是旧值，这是为什么？怎么解决？</p>`,
        exam: `<p>这是区分“用过带 Cache 的芯片”和“只写过小 MCU”的题。Cortex-M7/A 系列才有 Cache，一旦涉及 DMA 或双核，一致性问题就是必踩的坑。能说出 clean/invalidate 的语义和顺序，说明你处理过真实故障。</p>`,
        core: `<p>Cache 靠时间局部性和空间局部性缓存内存行；直接映射冲突多、组相联折中、全相联最灵活。DMA 绕过 Cache 直接写内存，所以接收前要 invalidate、发送前要 clean，否则 CPU 读到旧值。</p>`,
        answer: `<p>Cache 有效的根本原因是程序的<strong>局部性原理</strong>：时间局部性指刚访问过的数据很可能马上再被访问（比如循环变量），空间局部性指访问一个地址后，附近的地址也很可能被访问（比如数组遍历）。Cache 把内存按行（通常 32 或 64 字节）搬到片上，后续访问直接命中，避免慢速内存的延迟。</p>
<p>三种映射方式：直接映射是每个内存块只能放到唯一一个 Cache 行，硬件简单但冲突多；全相联是任意块可放任意行，灵活但比较器多、成本高；组相联是折中，每组内全相联、组间直接映射，实际 CPU 大多用 2~8 路组相联。</p>
<p>DMA 直接写内存，<strong>不经过 CPU 的 Cache</strong>。如果 CPU 之前读过这块内存，Cache 里存的是旧值，DMA 更新了内存但 Cache 没变，CPU 再读就命中旧数据。解决办法是在 DMA 传输前后做 Cache 维护：接收前 invalidate（让 Cache 行失效，强制从内存重新读），发送前 clean（把 Cache 里的脏数据写回内存）。</p>`,
        principle: `<p>写策略有两种：写直达（write-through）是每次写都同时写 Cache 和内存，简单但总线流量大；写回（write-back）是只写 Cache 并置脏位，等该行被替换时才写回内存，效率高但一致性复杂。</p>
<p>Cortex-M7 的 D-Cache 是写回的，所以 DMA 场景必须手动维护。M7 提供了 <code>SCB_CleanDCache_by_Addr</code>、<code>SCB_InvalidateDCache_by_Addr</code> 等函数，参数要求地址按 Cache 行对齐、长度按行取整，否则会误伤相邻数据。</p>`,
        fig: {
          type: "flow",
          title: "DMA + Cache 的正确顺序",
          tag: "sequence",
          items: [
            { t: "准备缓冲", d: "地址对齐" },
            { t: "Clean D-Cache", d: "发送前写回" },
            { t: "启动 DMA", d: "外设 ↔ 内存" },
            { t: "等待完成", d: "中断/轮询" },
            { t: "Invalidate", d: "接收后失效" }
          ]
        },
        code: {
          lang: "c",
          title: "cache_dma.c",
          src: `#include "stm32h7xx.h"

#define BUF_LEN 512
/* 必须按 Cache 行（32 字节）对齐，否则 clean/invalidate 会波及邻居 */
__attribute__((aligned(32))) static uint8_t s_dma_buf[BUF_LEN];

/* 发送：CPU 填好数据 → 写回 Cache → 再启动 DMA */
void uart_dma_send(const uint8_t *data, uint16_t len)
{
    memcpy(s_dma_buf, data, len);

    /* 把 D-Cache 里的脏数据写回 SRAM，DMA 才能读到新值 */
    SCB_CleanDCache_by_Addr((uint32_t *)s_dma_buf, BUF_LEN);

    HAL_UART_Transmit_DMA(&huart1, s_dma_buf, len);
}

/* 接收：先失效 Cache → 再启动 DMA → 传输完成后 CPU 读到的才是新数据 */
void uart_dma_recv_start(void)
{
    SCB_InvalidateDCache_by_Addr((uint32_t *)s_dma_buf, BUF_LEN);
    HAL_UART_Receive_DMA(&huart1, s_dma_buf, BUF_LEN);
}

/* DMA 完成回调：再次失效，确保后续读取拿到 DMA 写入的内容 */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    SCB_InvalidateDCache_by_Addr((uint32_t *)s_dma_buf, BUF_LEN);
    /* 此时读 s_dma_buf 才是 DMA 写进来的数据 */
}`
        },
        codeNote: `<b>顺序不能反：</b>接收场景如果先启动 DMA 再 invalidate，可能把 DMA 刚写入的数据又丢掉（因为 invalidate 会丢弃 Cache 行内容，若此时该行是脏的还会丢失 CPU 未写回的数据）。正确顺序是“先失效，再启动”。`,
        apply: `<p>除了 DMA，双核场景也要注意：Cortex-M7 + M4 双核共享内存时，两个核各有 Cache，必须用硬件信号量或共享内存的 non-cacheable 区域来通信。</p>
<p>最简单的规避方式是把 DMA 缓冲区放在<strong>非 Cache 区域</strong>（MPU 配置为 Device 或 Strongly-ordered 内存），这样完全不用维护 Cache，代价是 CPU 访问变慢。数据量大时通常还是选择手动维护。</p>`,
        pitfalls: [
          "<b>只 clean 不 invalidate。</b>发送方向 clean 就够，接收方向必须 invalidate，否则 CPU 读到的是 Cache 里的旧数据。",
          "<b>缓冲区没按 Cache 行对齐。</b>clean/invalidate 以行为单位，未对齐会波及相邻变量，出现“改一个变量，另一个变量被清零”的诡异现象。",
          "<b>在 DMA 传输过程中 invalidate。</b>可能丢掉已经到达的数据，表现为随机丢包。必须等传输完成再操作。"
        ],
        follow: [
          [
            "Cache 行大小是多少？为什么要对齐？",
            "Cortex-M7 的 D-Cache 行是 32 字节。维护操作以整行为单位，如果缓冲区起始地址不在行边界，操作会连带影响同一行内的其他数据，造成数据损坏。"
          ],
          [
            "什么是 Cache 抖动（thrashing）？",
            "多个频繁访问的数据映射到同一 Cache 组，互相把对方挤出，导致命中率极低。解决办法是调整数据结构布局或填充字节，避免热点数据地址高位相同。"
          ],
          [
            "写直达和写回怎么选？",
            "写直达简单、一致性好，适合 DMA 频繁的场景；写回效率高、总线流量小，适合 CPU 密集计算。多数高性能 MCU 用写回 + 手动维护，简单 MCU 干脆没有 Cache。"
          ]
        ]
      },

      {
        id: "B-05",
        chapter: "io",
        topic: "interrupt",
        title: "一次中断从硬件到软件经历了什么？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "中断请求、优先级仲裁、现场保护、向量跳转、返回的完整链路。",
        q: `<p>面试官：外设产生中断后，<strong>CPU 到底做了什么？</strong>请从硬件信号讲到中断服务函数被执行，再到返回。中断嵌套是怎么实现的？</p>`,
        exam: `<p>这是理解 RTOS、调试 HardFault、分析中断延迟的基础。能把“压栈、取向量、更新 IPSR、LR 存 EXC_RETURN”说清楚，说明你读过内核手册，而不是只会调用 HAL 的 NVIC 配置函数。</p>`,
        core: `<p>中断到来后硬件自动压 R0-R3、R12、LR、PC、xPSR，从向量表取入口地址并更新 IPSR，返回时 BX LR 自动出栈；嵌套靠 NVIC 优先级，高优先级中断可以打断低优先级中断。</p>`,
        answer: `<p>以 Cortex-M 为例，流程大致是：外设置位中断标志并向 NVIC 发请求；NVIC 根据使能位和优先级判断是否响应当前中断；如果响应，CPU 完成当前指令后进入异常处理。</p>
<p>硬件自动做几件事：把 8 个寄存器（R0-R3、R12、LR、PC、xPSR）压入当前栈；从向量表取出对应异常的处理函数地址；更新 IPSR 为异常号；把 LR 设成特殊的 EXC_RETURN 值，记录返回时用哪个栈、什么模式。</p>
<p>然后跳转到中断服务函数执行。函数返回时执行 <code>BX LR</code>，硬件识别到 EXC_RETURN 的特殊值，自动出栈恢复现场，回到被中断的指令继续执行。</p>
<p>中断嵌套靠优先级：高优先级中断可以打断低优先级的中断服务函数。Cortex-M 用硬件压栈，嵌套时不需要软件保存现场，这也是它中断响应快的原因之一。</p>`,
        principle: `<p>压栈的 8 个寄存器是 AAPCS 规定的“调用者保存”寄存器，硬件压栈保证了中断服务函数可以像普通 C 函数一样编写，编译器不需要特殊处理。浮点单元如果启用，还可能额外压栈 S0-S15 和 FPSCR（取决于 EXC_RETURN 的 bit4）。</p>
<p>向量表默认在地址 0（或 Flash 起始），可以通过 <code>SCB-&gt;VTOR</code> 重定位到其他地址，bootloader 跳转 APP 时就要改这个寄存器。表里每项 4 字节，存的是处理函数的入口地址。</p>`,
        fig: {
          type: "flow",
          title: "Cortex-M 中断响应流程",
          tag: "sequence",
          items: [
            { t: "外设置标志", d: "EXTI / USART" },
            { t: "NVIC 仲裁", d: "比较优先级" },
            { t: "硬件压栈", d: "8 个寄存器" },
            { t: "取向量", d: "VTOR + 4×n" },
            { t: "执行 ISR", d: "C 函数" },
            { t: "BX LR 返回", d: "自动出栈" }
          ]
        },
        apply: `<p>理解流程对优化中断延迟很有用：中断延迟 = 当前指令执行完的时间 + 压栈时间 + 取向量时间。压栈要访问 SRAM，如果栈放在慢速外部 RAM，延迟会明显变大；把向量表放在 SRAM 或 TCM 也能减少取向量时间。</p>
<p>调试时如果发现中断进不去，排查顺序是：外设中断使能位 → NVIC 使能位 → 优先级配置 → 全局中断是否关闭 → 向量表是否被重定位。按这个顺序能覆盖 90% 的问题。</p>`,
        pitfalls: [
          "<b>以为中断是“立即”发生的。</b>必须等当前指令执行完，多周期指令（如除法、浮点）会拉长响应时间。",
          "<b>在 ISR 里做耗时操作。</b>会阻塞同优先级和低优先级中断，导致通信丢包、定时抖动。",
          "<b>忘记清除中断标志。</b>退出 ISR 后中断会立刻再次进入，表现为“卡在中断里出不来”。"
        ],
        follow: [
          [
            "EXC_RETURN 是什么？",
            "中断返回时 LR 里的特殊值（如 0xFFFFFFF9），硬件识别后知道要恢复哪个栈（MSP/PSP）、返回到线程模式还是处理模式、是否恢复浮点现场。它由硬件写入，软件不应修改。"
          ],
          [
            "什么是尾链（tail-chaining）？",
            "一个中断处理完，如果还有挂起的同优先级或更高优先级中断，CPU 不做出栈再入栈的完整过程，直接跳到下一个 ISR，省去十几个周期的开销。"
          ],
          [
            "中断和异常有什么区别？",
            "异常是更宽的概念，包括复位、NMI、HardFault、SVC、PendSV 和外部中断。中断通常指外设触发的外部异常。在 Cortex-M 里它们共用一套异常处理机制和向量表。"
          ]
        ]
      },

      {
        id: "B-06",
        chapter: "io",
        topic: "dma",
        title: "DMA 的工作原理是什么？配置时要注意什么？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "DMA 如何绕过 CPU 搬运数据、通道与请求映射、传输模式与对齐要求。",
        q: `<p>面试官：<strong>DMA 的工作原理是什么？</strong>它为什么能提高效率？配置 DMA 时要注意哪些点？DMA 传输完成后怎么通知 CPU？</p>`,
        exam: `<p>DMA 是嵌入式高频考点。能说清“DMA 是总线主设备，直接读写内存，不占 CPU 指令周期”“传输完成/半完成中断”“地址自增与数据宽度对齐”，就说明你真正配置过。</p>`,
        core: `<p>DMA 是独立搬运控制器，CPU 只配源/目的地址、长度、宽度和触发源，搬运期间不占 CPU；搬完置完成标志并产生中断，适合串口、ADC、SPI 这类连续数据流。</p>`,
        answer: `<p>DMA 是 Direct Memory Access 的缩写，它是一个独立的硬件控制器，可以在外设和内存之间、或内存和内存之间直接搬运数据，不需要 CPU 逐字节参与。</p>
<p>工作流程是：CPU 配置源地址、目的地址、传输长度、数据宽度、触发源，然后启动；外设产生 DMA 请求后，DMA 控制器向总线申请占用，拿到总线后完成一次搬运，地址按配置自增或固定，计数减一；计数到 0 时置完成标志并产生中断。</p>
<p>它提高效率的原因是：搬运过程中 CPU 可以继续执行指令，只在总线被占用时可能有短暂停顿。对于串口、ADC、SPI 这类连续数据流，DMA 能把 CPU 从“每字节进一次中断”中解放出来。</p>
<p>配置时要注意：源和目的的数据宽度要匹配（8/16/32 位），地址是否自增要正确（外设寄存器通常固定，内存通常自增），传输方向和模式（单次/循环），以及优先级和中断使能。</p>`,
        principle: `<p>DMA 是总线主设备（master），和 CPU 一样能发起总线访问。当两者同时访问同一块内存时，由总线仲裁器决定谁先谁后，所以 DMA 传输会占用总线带宽，CPU 的访存可能被插入等待周期。</p>
<p>循环模式（circular）下，传输完成后地址和计数自动重装，适合连续采样的 ADC 和串口接收；普通模式下传输完成后需要重新配置。双缓冲模式（double buffer）可以在处理一半数据的同时填充另一半，实现零拷贝。</p>`,
        fig: {
          type: "flow",
          title: "DMA 传输的控制流",
          tag: "sequence",
          items: [
            { t: "CPU 配置", d: "地址/长度/宽度" },
            { t: "外设请求", d: "ADC / UART" },
            { t: "总线仲裁", d: "DMA 获得总线" },
            { t: "搬运一次", d: "地址自增" },
            { t: "计数归零", d: "置完成标志" },
            { t: "中断通知", d: "CPU 处理" }
          ]
        },
        code: {
          lang: "c",
          title: "dma_adc.c",
          src: `#include "stm32f4xx_hal.h"

#define ADC_CH_NUM   4
#define SAMPLE_DEPTH 64

/* DMA 目标缓冲区：ADC 多通道循环采样，DMA 循环搬运 */
static volatile uint16_t s_adc_dma[ADC_CH_NUM * SAMPLE_DEPTH];

void adc_dma_init(void)
{
    /* 1. 配置 DMA：外设地址固定，内存地址自增，半字宽度 */
    hdma_adc1.Instance                 = DMA2_Stream0;
    hdma_adc1.Init.Channel             = DMA_CHANNEL_0;
    hdma_adc1.Init.Direction           = DMA_PERIPH_TO_MEMORY;
    hdma_adc1.Init.PeriphInc           = DMA_PINC_DISABLE;   /* 外设地址不自增 */
    hdma_adc1.Init.MemInc              = DMA_MINC_ENABLE;    /* 内存地址自增 */
    hdma_adc1.Init.PeriphDataAlignment = DMA_PDATAALIGN_HALFWORD;
    hdma_adc1.Init.MemDataAlignment    = DMA_MDATAALIGN_HALFWORD;
    hdma_adc1.Init.Mode                = DMA_CIRCULAR;       /* 循环模式 */
    hdma_adc1.Init.Priority            = DMA_PRIORITY_HIGH;
    HAL_DMA_Init(&hdma_adc1);

    __HAL_LINKDMA(&hadc1, DMA_Handle, hdma_adc1);

    /* 2. ADC 配置为扫描 + 连续转换 + DMA 请求 */
    hadc1.Init.ScanConvMode = ENABLE;
    hadc1.Init.ContinuousConvMode = ENABLE;
    hadc1.Init.DMAContinuousRequests = ENABLE;
    hadc1.Init.NbrOfConversion = ADC_CH_NUM;
    HAL_ADC_Init(&hadc1);

    /* 3. 启动：一次调用，之后由硬件自动循环填充 */
    HAL_ADC_Start_DMA(&hadc1, (uint32_t *)s_adc_dma, ADC_CH_NUM * SAMPLE_DEPTH);
}

/* 半传输中断：前半缓冲已满，可以处理，同时 DMA 继续填后半 */
void HAL_ADC_ConvHalfCpltCallback(ADC_HandleTypeDef *hadc)
{
    ProcessSamples(&s_adc_dma[0], ADC_CH_NUM * (SAMPLE_DEPTH / 2));
}`
        },
        apply: `<p>串口接收用 DMA + IDLE 中断是标准做法：DMA 在后台把字节搬进缓冲区，总线空闲时触发 IDLE 中断，此时读 DMA 剩余计数就能知道这一帧收了多少字节，不需要每字节进中断。</p>
<p>ADC 多通道扫描必须配 DMA，否则数据寄存器会被下一个通道覆盖。配置时注意“扫描模式 + 连续转换 + DMA 循环”，三者缺一不可。</p>`,
        pitfalls: [
          "<b>源和目的数据宽度不一致。</b>8 位外设配成半字传输会读到错位数据，或者每次只搬一半。必须严格匹配。",
          "<b>外设地址错误地开启自增。</b>外设数据寄存器地址是固定的，自增会访问到未定义地址，传输直接出错。",
          "<b>DMA 缓冲区被编译器优化或放在栈上。</b>函数返回后栈帧失效，DMA 还在往里写，数据就乱了。缓冲区必须是静态或全局的，并加 volatile。"
        ],
        follow: [
          [
            "DMA 和中断相比有什么优势？",
            "中断方式下每个字节都要 CPU 进中断、保存现场、搬运、返回，开销几十个周期；DMA 由硬件搬运，CPU 只在传输完成时处理一次，适合大批量和连续数据流。"
          ],
          [
            "DMA 会占用 CPU 的总线吗？",
            "会。DMA 是总线主设备，搬运时占用总线周期，CPU 同时访存可能被插入等待。数据量大时会看到 CPU 性能下降，这叫 DMA 总线争用。"
          ],
          [
            "如何判断 DMA 传输是否完成？",
            "查传输完成标志（TCIF）、使能传输完成中断、或者读剩余传输计数（NDTR）判断。注意标志清除顺序，某些型号要求先读状态寄存器再清标志。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("computer-basic", {
    chapters: [
      {
        id: "numbers",
        title: "数据表示",
        topics: [
          { id: "int", title: "补码与整数溢出" },
          { id: "float", title: "IEEE 754 浮点数" }
        ]
      },
      {
        id: "cpu",
        topics: [
          { id: "isa", title: "RISC 与 CISC" },
          { id: "memory-model", title: "内存模型与屏障" }
        ]
      },
      {
        id: "storage",
        topics: [
          { id: "bus-hierarchy", title: "总线与存储映射" },
          { id: "bitband", title: "位带操作" },
          { id: "cache-map", title: "Cache 映射方式" }
        ]
      },
      {
        id: "io",
        topics: [{ id: "vector", title: "中断向量表" }]
      }
    ],
    questions: [
      {
        id: "B-07",
        chapter: "numbers",
        topic: "int",
        title: "补码是怎么表示的？为什么用补码而不是原码？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "补码让减法变成加法、消除 +0/-0，范围是 -2^(n-1) 到 2^(n-1)-1。",
        q: `<p>面试官：8 位有符号数为什么范围是 -128 到 127，而不是 -127 到 127？补码相比原码好在哪里？</p>`,
        exam: `<p>考察计算机数据表示的基本功。能说清“取反加一”“减法统一为加法”“只有一个 0”，说明理解到位。</p>`,
        core: `<p>补码把减法变成加法，8 位能表示 -128~127，负数比正数多一个，所以下限是 -128；无符号溢出按 2^n 回绕，有符号溢出在 C 里是未定义行为。</p>`,
        answer: `<p><b>补码的定义：</b>正数的补码与原码相同；负数的补码是其绝对值的二进制按位取反再加一。例如 -1 的 8 位补码是 <code>1111 1111</code>。</p>
<p><b>为什么范围不对称：</b>8 位一共 256 个编码。补码把 <code>0000 0000</code> 到 <code>0111 1111</code> 分配给 0 到 127，把 <code>1000 0000</code> 到 <code>1111 1111</code> 分配给 -128 到 -1。负数比正数多一个，因为 0 只占一个编码，剩下的 <code>1000 0000</code> 被定义为 -128。</p>
<p><b>补码的优势：</b></p>
<ul>
<li><b>减法变加法</b>：<code>a - b</code> 可以直接算 <code>a + (~b + 1)</code>，硬件只需要加法器，不需要单独的减法电路；</li>
<li><b>消除负零</b>：原码有 <code>+0</code> 和 <code>-0</code> 两个编码，补码只有一个 0，逻辑判断更简单；</li>
<li><b>溢出检测统一</b>：同号相加结果变号即溢出，可以用最高位和次高位的进位异或判断。</li>
</ul>
<p><b>溢出：</b>有符号溢出是未定义行为（C 标准），无符号溢出按 2^n 回绕，是良定义的。嵌入式里做累加、计时要注意位宽，必要时用 64 位或饱和运算。</p>`,
        principle: `<p>补码本质是模 2^n 的同余表示：-x 被表示为 2^n - x。这样在模 2^n 的意义下，加法和减法完全统一，溢出位自然丢弃。</p>
<p>符号扩展（如 8 位扩展到 32 位）只需要复制符号位，因为补码的高位全 1 表示负数，这与数值大小一致。</p>`,
        fig: {
          type: "table",
          title: "8 位编码对照",
          tag: "two's complement",
          head: ["十进制", "补码", "无符号解释"],
          rows: [
            ["127", "0111 1111", "127"],
            ["1", "0000 0001", "1"],
            ["0", "0000 0000", "0"],
            ["-1", "1111 1111", "255"],
            ["-128", "1000 0000", "128"]
          ]
        },
        code: {
          lang: "c",
          title: "overflow_check.c",
          src: `#include <stdint.h>
#include <limits.h>

/* 有符号加法溢出检测：同号相加结果异号则溢出 */
int add_overflow(int a, int b, int *out)
{
    if ((b > 0 && a > INT_MAX - b) ||
        (b < 0 && a < INT_MIN - b)) {
        return -1;                 /* 溢出 */
    }
    *out = a + b;
    return 0;
}

/* 无符号回绕是良定义的，但业务上通常也要检查 */
int uadd_overflow(uint32_t a, uint32_t b, uint32_t *out)
{
    if (a > UINT32_MAX - b) return -1;
    *out = a + b;
    return 0;
}

/* 饱和加法：常用于音频、控制量 */
int16_t sat_add(int16_t a, int16_t b)
{
    int32_t s = (int32_t)a + b;
    if (s > INT16_MAX) return INT16_MAX;
    if (s < INT16_MIN) return INT16_MIN;
    return (int16_t)s;
}`
        },
        codeNote: "C 的有符号溢出是未定义行为，编译器可能假设它不会发生并做激进优化，所以必须显式检查。",
        apply: `<p>做累计流量、运行时间这类计数器时，我会用无符号类型并显式处理回绕：<code>if (now - last &gt;= timeout)</code> 这种写法在无符号回绕下仍然正确，是嵌入式计时的标准技巧。</p>
<p>控制量计算（如 PID 输出）用饱和运算，避免溢出后符号翻转导致执行器反向动作。</p>`,
        pitfalls: [
          "<b>以为有符号溢出会回绕。</b>这是未定义行为，优化后可能完全不是预期结果。",
          "<b>用 int 存毫秒计时。</b>2^31 ms 只有约 24.9 天就溢出（用 uint32_t 才约 49.7 天），长期运行设备必出问题。",
          "<b>符号扩展写成零扩展。</b>负数变大，计算结果完全错误。",
          "<b>比较有符号和无符号数。</b>负数被转成极大值。"
        ],
        follow: [
          ["为什么 -128 取负还是 -128？", "8 位补码中 -128 是 1000 0000，取反加一后仍是 1000 0000，发生了溢出。所以对最小负数取绝对值是未定义行为。"],
          ["如何判断两个数相加是否溢出，用一条指令？", "Cortex-M 的 ADDS 会更新 APSR 的 V 标志（有符号溢出）和 C 标志（无符号进位），汇编里可以直接读标志位判断。"]
        ]
      },

      {
        id: "B-08",
        chapter: "numbers",
        topic: "float",
        title: "浮点数在内存里怎么存？为什么 0.1 + 0.2 不等于 0.3？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "IEEE 754 用符号位、阶码、尾数表示，十进制小数多为无限循环二进制，只能近似存储。",
        q: `<p>面试官：float 和 double 在内存里怎么表示？为什么 <code>0.1f + 0.2f != 0.3f</code>？嵌入式里比较浮点数要注意什么？</p>`,
        exam: `<p>考察数据表示和数值稳定性意识。能说出“尾数有限、十进制小数无法精确表示、比较要用误差范围”，就足够。</p>`,
        core: `<p>单精度是 1 位符号、8 位阶码、23 位尾数，双精度是 1+11+52 位；0.1 和 0.2 都只能存近似值，相加凑不出精确的 0.3，判等要用 fabs(a-b)&lt;eps。</p>`,
        answer: `<p><b>IEEE 754 单精度（float，32 位）</b>由三部分组成：</p>
<ul>
<li>1 位符号位 S；</li>
<li>8 位阶码 E，偏移量 127；</li>
<li>23 位尾数 M，隐含最高位的 1。</li>
</ul>
<p>数值为 <code>(-1)^S × 1.M × 2^(E-127)</code>。双精度是 1 + 11 + 52 位，偏移量 1023。</p>
<p><b>0.1 + 0.2 的问题：</b>0.1 和 0.2 在二进制下都是无限循环小数（类似十进制里的 1/3），23 位尾数只能存近似值。相加后的结果与 0.3 的近似值不相等，所以直接 <code>==</code> 比较会失败。</p>
<p><b>正确比较方式：</b>用绝对误差或相对误差：</p>
<p><code>fabs(a - b) &lt; 1e-6</code></p>
<p>对于数量级差异大的值，用相对误差更合适：<code>fabs(a - b) &lt;= eps * fmax(fabs(a), fabs(b))</code>。</p>
<p><b>嵌入式注意点：</b></p>
<ul>
<li>很多 Cortex-M4F 只有单精度 FPU，double 运算会走软件库，慢几十倍；</li>
<li>浮点运算不满足结合律，累加顺序不同结果不同；</li>
<li>涉及金额、计量时用定点数（放大成整数）更可靠；</li>
<li>打印浮点需要链接相应的库，且格式支持可能被裁剪。</li>
</ul>`,
        principle: `<p>浮点数是“科学计数法的二进制版本”，用固定的位数表示有效数字和指数，因此能覆盖很大的范围，但精度有限。相邻两个可表示数之间的间隔称为 ULP，数值越大间隔越大。</p>
<p>这导致浮点数的加法不满足结合律：<code>(a + b) + c</code> 可能不等于 <code>a + (b + c)</code>，因为每次相加都可能发生舍入。</p>`,
        fig: {
          type: "bits",
          title: "IEEE 754 单精度格式（32 位）",
          tag: "float",
          cells: [
            { v: "S", n: "符号 1 位" },
            { v: "E7", n: "阶码" },
            { v: "E6", n: "阶码" },
            { v: "E5", n: "阶码" },
            { v: "E4", n: "阶码" },
            { v: "E3", n: "阶码" },
            { v: "E2", n: "阶码" },
            { v: "E1", n: "阶码 8 位" }
          ],
          note: "实际布局为 1 位符号 + 8 位阶码 + 23 位尾数；阶码全 0 表示非规格化数，全 1 表示无穷或 NaN。"
        },
        code: {
          lang: "c",
          title: "float_cmp.c",
          src: `#include <math.h>
#include <stdbool.h>

/* 绝对误差比较：适合数值范围已知且较小的情况 */
bool nearly_equal(float a, float b, float eps)
{
    return fabsf(a - b) <= eps;
}

/* 相对误差比较：适合数量级跨度大的情况 */
bool relatively_equal(float a, float b, float eps)
{
    float diff = fabsf(a - b);
    float norm = fmaxf(fabsf(a), fabsf(b));
    if (norm < 1e-12f) return diff < eps;   /* 接近 0 时退化为绝对误差 */
    return diff / norm <= eps;
}

/* 定点数替代：以 0.001 为单位存整数，避免浮点误差 */
int32_t temp_milli_from_celsius(float c)
{
    return (int32_t)(c * 1000.0f + (c >= 0 ? 0.5f : -0.5f));
}`
        },
        codeNote: "fabsf/fmaxf 是单精度版本，比 double 版本更适合只有单精度 FPU 的 MCU。",
        apply: `<p>传感器数据处理我优先用定点数：温度用 0.01℃ 为单位存 int16，电压用 mV 存 int32。这样滤波、累加都没有精度损失，传输也紧凑。</p>
<p>只有在需要开方、三角函数、浮点滤波系数时才用 float，并且尽量用单精度，避免 double 拖慢实时性。</p>`,
        pitfalls: [
          "<b>用 == 比较浮点数。</b>几乎永远不相等。",
          "<b>用 float 累加大量数据。</b>误差累积，结果明显偏离。",
          "<b>在 MCU 上大量用 double。</b>没有双精度 FPU 时性能极差。",
          "<b>忽略 NaN 的比较特性。</b>NaN 与任何值（包括自己）比较都为假。"
        ],
        follow: [
          ["float 能精确表示哪些小数？", "只有分母是 2 的幂的分数（如 0.5、0.25、0.125）能精确表示；0.1、0.2、0.3 都无法精确表示。"],
          ["为什么浮点数有 +0 和 -0？", "符号位独立于数值，0 可以有正负两种编码。它们在比较时相等，但 1/+0 得到 +inf，1/-0 得到 -inf。"]
        ]
      },

      {
        id: "B-09",
        chapter: "cpu",
        topic: "isa",
        title: "RISC 和 CISC 有什么区别？ARM 属于哪一类？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "RISC 指令简单定长、负载存储架构；CISC 指令复杂变长、可直接操作内存。",
        q: `<p>面试官：RISC 和 CISC 的本质区别是什么？为什么嵌入式大多用 RISC？</p>`,
        exam: `<p>考察体系结构基础。不要只背“精简/复杂”，要说到定长指令、load-store 架构、流水线友好这些实际差异。</p>`,
        core: `<p>RISC 指令少、定长、只有 load/store 访存、寄存器多，容易流水线；CISC 指令多、长度可变、可直接操作内存。嵌入式用 RISC 是因为面积小、功耗低、时序确定，ARM 就属于 RISC。</p>`,
        answer: `<p><b>RISC（精简指令集）</b>的特点：</p>
<ul>
<li>指令数量少、格式固定（ARM Thumb 是 16/32 位混合，但编码规则统一）；</li>
<li>采用 load-store 架构：只有加载/存储指令访问内存，运算只在寄存器之间进行；</li>
<li>指令周期短，容易做流水线；</li>
<li>寄存器数量多，编译器负责调度。</li>
</ul>
<p><b>CISC（复杂指令集）</b>的特点：</p>
<ul>
<li>指令多、长度可变，一条指令可以完成复杂操作（如字符串拷贝、内存到内存运算）；</li>
<li>寻址方式丰富，指令可以直接操作内存；</li>
<li>硬件译码复杂，但代码密度可能更高。</li>
</ul>
<p><b>ARM 属于 RISC</b>（严格说是 RISC 思想 + 一些复杂扩展）。Cortex-M 使用 Thumb/Thumb-2 指令集，混合 16 位和 32 位编码，兼顾代码密度和性能。</p>
<p><b>为什么嵌入式偏好 RISC：</b></p>
<ul>
<li>流水线简单，主频和能效更容易做高；</li>
<li>指令定长，取指和译码逻辑简单，芯片面积小、功耗低；</li>
<li>编译器优化目标明确，代码行为可预测；</li>
<li>生态成熟，工具链和调试支持完善。</li>
</ul>
<p>不过现在 RISC 和 CISC 的界限已经模糊：x86 内部把复杂指令译码成微操作，ARM 也增加了 SIMD、DSP 等复杂指令。</p>`,
        principle: `<p>RISC 的核心思想是把复杂度从硬件转移到编译器：硬件只提供简单、快速、规整的指令，由编译器组合出复杂操作。这样硬件可以跑更高主频、更容易流水线化。</p>
<p>CISC 把复杂度放在硬件译码器里，好处是代码密度高、指令功能强，但译码和流水线控制更复杂。</p>`,
        fig: {
          type: "table",
          title: "RISC 与 CISC 对比",
          tag: "isa",
          head: ["维度", "RISC", "CISC"],
          rows: [
            ["指令长度", "定长或少量格式", "变长"],
            ["内存访问", "仅 load/store", "指令可直接操作内存"],
            ["指令数量", "少", "多"],
            ["流水线", "容易", "较复杂"],
            ["代码密度", "一般（Thumb 较好）", "较高"],
            ["典型代表", "ARM、RISC-V", "x86"]
          ]
        },
        code: {
          lang: "asm",
          title: "arm_add.s",
          src: `@ RISC 风格：先加载到寄存器，再运算，再存回
@ Cortex-M 的加法不会直接操作内存

    LDR     r0, [r1]        @ r0 = *r1
    LDR     r2, [r3]        @ r2 = *r3
    ADD     r0, r0, r2      @ r0 = r0 + r2
    STR     r0, [r1]        @ *r1 = r0

@ CISC 可能提供一条 “内存加内存” 的指令
@ 而 RISC 必须拆成多条 load-store 指令`
        },
        codeNote: "load-store 架构是指令集设计的核心区别，也是理解汇编代码为什么这么写的基础。",
        apply: `<p>看反汇编时，RISC 的指令模式很规整：加载、运算、存储分离。这让我在优化热点代码时能清楚看到内存访问次数，减少不必要的 load/store 往往比换算法更有效。</p>
<p>选型时如果追求极致低功耗和实时性，RISC 内核通常更合适；如果需要跑复杂协议栈或图形界面，CISC 的高代码密度可能更省 Flash。</p>`,
        pitfalls: [
          "<b>以为 RISC 指令一定少。</b>ARMv7-M 有上百条指令，Thumb-2 也相当丰富。",
          "<b>以为 CISC 一定慢。</b>现代 x86 通过微操作和乱序执行性能很强。",
          "<b>混淆架构和实现。</b>ARM 是架构规范，Cortex-M4 是具体实现。"
        ],
        follow: [
          ["Thumb 和 ARM 指令集有什么区别？", "ARM 指令是 32 位定长，功能完整；Thumb 是 16 位压缩编码，代码密度高但部分功能受限；Thumb-2 混合 16/32 位，兼顾两者。Cortex-M 只支持 Thumb/Thumb-2。"],
          ["RISC-V 和 ARM 有什么不同？", "RISC-V 是开放指令集规范，任何人都可以实现，没有授权费；ARM 是商业授权模式。两者都是 RISC 思想，但编码和生态不同。"]
        ]
      },

      {
        id: "B-10",
        chapter: "cpu",
        topic: "pipeline",
        title: "流水线有哪些冒险？分支预测失败会怎样？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "结构冒险、数据冒险、控制冒险；流水线越深，冲刷代价越大。",
        q: `<p>面试官：五级流水线取指、译码、执行、访存、写回，如果下一条指令依赖上一条的结果，会发生什么？硬件怎么处理？</p>`,
        exam: `<p>考察对流水线机制的深入理解。能说出数据冒险的三种解决方式（暂停、前递、乱序），以及分支预测失败的冲刷代价，就比较完整。</p>`,
        core: `<p>下一条指令要用上一条的结果就产生数据冒险；硬件优先用旁路转发，实在等不到就插入停顿，编译器也会调度指令拉开依赖。</p>`,
        answer: `<p>流水线把一条指令拆成多个阶段，不同指令在不同阶段并行，从而提高吞吐。但它带来三类冒险：</p>
<ol>
<li><b>结构冒险</b>：两条指令同时争用同一个硬件资源（如只有一个存储器，取指和访存冲突）。解决方法是分开指令/数据缓存（哈佛结构）或增加端口。</li>
<li><b>数据冒险</b>：后一条指令需要前一条指令还没写回的结果。解决办法：
<ul>
<li>暂停（stall）流水线，插入气泡；</li>
<li>前递/旁路（forwarding），把执行阶段的结果直接送给需要的指令；</li>
<li>编译器调度，插入无关指令填补空隙。</li>
</ul>
</li>
<li><b>控制冒险</b>：遇到分支指令时，下一条该取哪条指令还不确定。解决办法是分支预测：预测跳转方向，提前取指；预测失败就要冲刷流水线，丢弃已取的指令，造成几个周期的损失。</li>
</ol>
<p><b>流水线越深，代价越大。</b>假设五级流水线预测失败，要丢弃 4 条已进入流水线的指令，损失约 4 个周期；十几级的深度流水线损失更大。这就是为什么高频 CPU 需要复杂的分支预测器。</p>
<p>MCU 的 Cortex-M0/M3 流水线只有 3 级，M7 是 6 级超标量，分支代价和性能差异明显。</p>`,
        principle: `<p>流水线的收益来自“让不同阶段同时工作”，理想情况下每个周期完成一条指令。但指令之间存在依赖，破坏了理想的并行性，硬件必须检测并处理这些依赖。</p>
<p>前递之所以可行，是因为结果在执行阶段就已经算出来了，不必等到写回。但 load 指令的数据要到访存阶段结束才可用，所以 load 后立即使用通常仍需要暂停一个周期（load-use hazard）。</p>`,
        fig: {
          type: "flow",
          title: "五级流水线与数据冒险",
          tag: "pipeline",
          items: [
            { t: "IF 取指", d: "从 Flash/缓存取指令" },
            { t: "ID 译码", d: "解析操作码、读寄存器" },
            { t: "EX 执行", d: "ALU 运算、计算地址" },
            { t: "MEM 访存", d: "load/store 访问数据" },
            { t: "WB 写回", d: "结果写回寄存器" }
          ],
          note: "load 指令的结果到 MEM 结束才可用，紧接着使用会触发 load-use 冒险，需要暂停一个周期。"
        },
        apply: `<p>写高频中断服务程序时，我会尽量让代码顺序对流水线友好：把不相关的计算穿插在 load 之后，减少依赖停顿。当然在 MCU 上收益有限，更重要的是减少分支和内存访问。</p>
<p>循环展开可以减少分支判断次数，但也增大代码体积；在 Flash 等待周期较多的芯片上，展开后顺序取指反而更高效。</p>`,
        pitfalls: [
          "<b>以为流水线越深越快。</b>深度增加会放大分支失败和依赖停顿的代价。",
          "<b>忽略 Flash 等待周期。</b>MCU 取指可能需要插入等待，流水线优势被削弱。",
          "<b>在中断里写复杂分支。</b>预测失败和流水线冲刷增加中断延迟。"
        ],
        follow: [
          ["什么是超标量？", "一个周期内可以发射多条指令，需要多个执行单元和更复杂的调度逻辑，Cortex-M7 就是双发射超标量。"],
          ["分支预测有哪些常见策略？", "静态预测（如向后跳转预测为 taken）、动态预测（基于历史记录，如两位饱和计数器、TAGE），以及返回地址栈预测函数返回。"]
        ]
      },

      {
        id: "B-11",
        chapter: "storage",
        topic: "bus-hierarchy",
        title: "AHB、APB、AXI 总线有什么区别？为什么外设要挂在不同的总线上？",
        diff: "高级",
        freq: "中频",
        type: "架构分析题",
        point: "AHB 高速、APB 低速低功耗、AXI 支持乱序和多 Outstanding，分层是为了匹配带宽与功耗。",
        q: `<p>面试官：STM32 的时钟树上经常看到 AHB、APB1、APB2，它们是什么？为什么不把所有外设挂在同一条总线上？</p>`,
        exam: `<p>考察对片上总线架构的理解。能说出“高速设备用 AHB、低速外设用 APB、分频降低功耗”，并知道跨总线访问有桥接开销，就很好。</p>`,
        core: `<p>AHB 挂 CPU、DMA、SRAM 这类高速设备，APB1/APB2 挂 UART、I2C、GPIO 等低速外设，AXI 用于更高带宽；分层是为了让快慢设备各按各的频率跑，也方便独立开关时钟省功耗。</p>`,
        answer: `<p>它们是 ARM 的片上总线标准，按性能和复杂度分层：</p>
<ul>
<li><b>AHB（Advanced High-performance Bus）</b>：高速总线，支持突发传输、流水线，通常连接 CPU、DMA、SRAM、Flash 控制器等高速设备。</li>
<li><b>APB（Advanced Peripheral Bus）</b>：低速、低功耗总线，协议简单（无流水线、无突发），连接 UART、I2C、GPIO、定时器等外设。</li>
<li><b>AXI（Advanced eXtensible Interface）</b>：更高性能，支持读写通道分离、乱序传输、多个 outstanding 事务，常见于 Cortex-A 和高端 MCU（如 STM32H7）。</li>
</ul>
<p><b>为什么要分层：</b></p>
<ul>
<li><b>性能匹配</b>：CPU 和 DMA 需要高带宽，外设寄存器访问频率低，没必要都跑高速；</li>
<li><b>功耗</b>：APB 可以分频到较低频率，降低动态功耗；</li>
<li><b>面积和复杂度</b>：简单外设用简单协议，减少逻辑门数；</li>
<li><b>隔离</b>：不同总线可以独立门控时钟，关闭不用的外设不影响其它模块。</li>
</ul>
<p><b>代价：</b>跨总线访问需要桥接（bridge），会有额外延迟。所以高频数据搬运（如 ADC + DMA）尽量让 DMA 和外设在同一条总线上，减少跨桥开销。</p>
<p>另外，APB 通常分 APB1/APB2，频率上限不同，配置外设时要查清它挂在哪条总线上，否则算出的波特率、定时周期会错。</p>`,
        principle: `<p>总线是多个主设备共享的通信通道，需要仲裁决定谁先使用。分层总线把不同带宽需求的设备分组，用桥接器连接，既保证高速设备的带宽，又避免低速设备拖慢整体。</p>
<p>AXI 的读写通道分离和乱序能力，让多个主设备可以更充分地并行，适合高带宽场景；AHB/APB 更简单，适合资源受限的 MCU。</p>`,
        fig: {
          type: "layers",
          title: "典型 MCU 总线层次",
          tag: "bus matrix",
          items: [
            { tag: "内核", t: "Cortex-M 内核 + NVIC", d: "通过 I-Bus/D-Bus 访问" },
            { tag: "AHB", t: "高速矩阵：Flash、SRAM、DMA", d: "支持突发，高带宽" },
            { tag: "桥", t: "AHB → APB 桥", d: "跨总线有额外延迟" },
            { tag: "APB", t: "UART、I2C、GPIO、定时器", d: "低速、可独立分频" }
          ]
        },
        apply: `<p>配置串口波特率时，我会先确认它挂在 APB1 还是 APB2，再查对应的时钟频率。曾经因为用错总线频率，波特率偏差 10%，通信时好时坏。</p>
<p>做 DMA 搬运时，尽量让源、目的和外设在同一总线矩阵内，避免频繁跨桥；同时注意总线仲裁，DMA 长时间占用会影响 CPU 取指。</p>`,
        pitfalls: [
          "<b>把所有外设当成同一时钟。</b>APB1 和 APB2 频率上限不同。",
          "<b>忽略跨总线延迟。</b>高频采样 + 跨桥搬运可能成为瓶颈。",
          "<b>DMA 占满总线。</b>CPU 取指被阻塞，表现为程序变慢。",
          "<b>混淆 AHB 和 AXI。</b>两者协议和性能差异很大。"
        ],
        follow: [
          ["什么是总线矩阵（bus matrix）？", "多个主设备和多个从设备之间的交叉开关，允许不同主设备同时访问不同从设备，减少阻塞；相比单总线仲裁，并行度更高。"],
          ["为什么外设寄存器访问通常不需要 Cache？", "外设寄存器有副作用，读写顺序和次数都有语义，Cache 会合并或重排访问。所以外设区通常配置为 Device 或 Strongly-ordered 内存属性。"]
        ]
      },

      {
        id: "B-12",
        chapter: "storage",
        topic: "bitband",
        title: "位带（bit-band）是什么？为什么它能实现原子位操作？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "位带把每个位映射成一个 32 位字，读写该字即读写对应位，硬件保证原子性。",
        q: `<p>面试官：Cortex-M3/M4 的位带区域有什么用？“读-改-写”寄存器为什么可能出问题，位带怎么解决？</p>`,
        exam: `<p>考察对原子操作和内存映射的理解。能说清位带别名地址的计算公式，以及它为什么避免了读-改-写竞争，就很好。</p>`,
        core: `<p>位带把一位映射到别名区的一个 32 位字，公式是 alias = base + byte_offset×32 + bit×4；写这个字就是一次原子位操作，避免读改写被打断丢更新，M0/M0+ 不支持位带。</p>`,
        answer: `<p><b>位带</b>把一块内存区域的每一位，映射到另一块“别名区”的一个 32 位字。访问别名区的那个字，等价于访问原始位的值（0 或 1）。</p>
<p>Cortex-M3/M4 有两个位带区：</p>
<ul>
<li>SRAM 位带区：<code>0x20000000</code> 起 1MB，别名区 <code>0x22000000</code> 起 32MB；</li>
<li>外设位带区：<code>0x40000000</code> 起 1MB，别名区 <code>0x42000000</code> 起 32MB。</li>
</ul>
<p>别名地址公式：</p>
<p><code>alias = base_alias + (byte_offset × 32) + (bit_number × 4)</code></p>
<p><b>为什么能原子操作：</b>普通的 <code>REG |= (1 &lt;&lt; n)</code> 编译成“读整个寄存器 → 改一位 → 写回”，如果中间被中断打断，而中断也修改了同一个寄存器的其它位，写回时就会覆盖中断的修改。位带把这一位映射成一个独立的字，写这个字就是一次单字存储，硬件直接更新对应位，不需要读-改-写，因此是原子的。</p>
<p><b>局限：</b>Cortex-M0/M0+ 不支持位带；位带区大小有限；不是所有外设都落在位带区；位带操作只保证单次访问原子，不保证多个位之间的一致性。</p>`,
        principle: `<p>位带的本质是地址译码：访问别名区时，总线硬件把地址转换成“原始地址 + 位号”，读操作提取该位并扩展到 32 位，写操作根据最低位更新原始位。整个过程在硬件内完成，对 CPU 来说只是一次普通的字访问。</p>
<p>这利用了 ARM 的单字访问原子性：对齐的 32 位读写不会被中断拆开。</p>`,
        fig: {
          type: "memmap",
          title: "位带地址映射",
          tag: "bit-band",
          rows: [
            { name: "外设位带区", text: "0x40000000 ~ 0x400FFFFF（1MB）", addr: "原始位", cls: "a" },
            { name: "别名区", text: "0x42000000 ~ 0x43FFFFFF（32MB）", addr: "每位一个字", cls: "b" },
            { name: "计算", text: "alias = 0x42000000 + offset*32 + bit*4", addr: "公式", cls: "c" },
            { name: "访问", text: "写别名字 = 原子置位/清位", addr: "单字操作", cls: "d" }
          ]
        },
        code: {
          lang: "c",
          title: "bitband.h",
          src: `#include <stdint.h>

#define BITBAND_PERIPH_BASE  0x40000000u
#define BITBAND_PERIPH_ALIAS 0x42000000u
#define BITBAND_SRAM_BASE    0x20000000u
#define BITBAND_SRAM_ALIAS   0x22000000u

/* 把“地址 + 位号”转换成别名区地址 */
#define BITBAND_ADDR(addr, bit) \\
    (((addr) & 0xF0000000u) + 0x02000000u + \\
     (((addr) & 0x000FFFFFu) << 5) + ((bit) << 2))

#define BITBAND_PTR(addr, bit) \\
    ((volatile uint32_t *)BITBAND_ADDR((uint32_t)(addr), (bit)))

/* 原子置位/清位/读取 */
static inline void bb_set(volatile uint32_t *reg, uint8_t bit)
{
    *BITBAND_PTR(reg, bit) = 1u;
}

static inline void bb_clear(volatile uint32_t *reg, uint8_t bit)
{
    *BITBAND_PTR(reg, bit) = 0u;
}

static inline uint32_t bb_get(volatile uint32_t *reg, uint8_t bit)
{
    return *BITBAND_PTR(reg, bit);
}`
        },
        codeNote: "位带别名地址必须 4 字节对齐，且原始地址必须落在位带区内，否则映射无效。",
        apply: `<p>在中断和主循环都会修改同一个状态寄存器时，我用位带做置位/清位，避免临界区。比如 LED 状态、标志位、GPIO 输出，都可以用位带原子操作。</p>
<p>但要注意：位带只保证“单个位”的原子性。如果需要同时更新多个位（比如配置一个字段），仍然要用临界区或硬件提供的原子寄存器。</p>`,
        pitfalls: [
          "<b>在 M0 上使用位带。</b>Cortex-M0/M0+ 不支持，访问别名区无效。",
          "<b>地址超出位带区。</b>映射公式仍会算出地址，但不对应目标位。",
          "<b>以为位带能保证多个位一致。</b>每次只能原子操作一位。",
          "<b>用位带访问非对齐地址。</b>行为未定义。"
        ],
        follow: [
          ["没有位带时如何实现原子位操作？", "用关中断保护读-改-写，或使用芯片提供的位设置/清除寄存器（如 GPIOx->BSRR），后者本身就是硬件原子操作。"],
          ["位带和 BSRR 有什么区别？", "BSRR 是 GPIO 专用的原子置位/复位寄存器，只能操作 GPIO；位带是通用的地址映射机制，可作用于 SRAM 和外设的任意位，但仅部分 Cortex-M 支持。"]
        ]
      },

      {
        id: "B-13",
        chapter: "cpu",
        topic: "memory-model",
        title: "什么是内存屏障？DMB、DSB、ISB 分别用在什么场景？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "编译器和 CPU 都可能重排访存，屏障用于约束顺序；DSB 等完成、DMB 等顺序、ISB 清流水线。",
        q: `<p>面试官：配置 DMA 时，先写缓冲区再启动 DMA，为什么有时 DMA 读到的还是旧数据？要加什么指令？</p>`,
        exam: `<p>考察对内存序的理解，是驱动开发和多核编程的关键。能区分 DMB/DSB/ISB 的语义，并说出编译器屏障与硬件屏障的区别，就很好。</p>`,
        core: `<p>DMA 不经过 CPU，编译器或乱序执行可能让写缓冲区的数据还没落到内存就启动了 DMA；启动前加 DSB 等写入真正完成，必要时再加 DMB 保证顺序。</p>`,
        answer: `<p>原因是<b>访存可能被重排</b>：编译器为了优化可能调整写入顺序，CPU 也可能把写操作放进写缓冲、延后真正到达内存。于是“启动 DMA”的寄存器写可能先于“填充缓冲区”的写完成，DMA 读到的就是旧数据。</p>
<p>ARM 提供三条屏障指令：</p>
<ul>
<li><b>DMB（Data Memory Barrier）</b>：保证屏障之前的所有访存操作，在屏障之后的访存操作之前被观察到。它不等待操作完成，只保证顺序。适合“写数据 → 写标志”这类顺序约束。</li>
<li><b>DSB（Data Synchronization Barrier）</b>：等待屏障之前的所有访存操作真正完成，才继续执行。适合“写配置 → 触发硬件”的场景，比如写 DMA 配置后启动、写 Flash 控制寄存器后等待。</li>
<li><b>ISB（Instruction Synchronization Barrier）</b>：清空流水线，保证之后取到的指令是屏障之前写入的（如修改了代码或向量表之后）。</li>
</ul>
<p>除了硬件屏障，还需要<b>编译器屏障</b>：<code>__asm volatile ("" ::: "memory")</code>，告诉编译器不要跨越此处重排内存访问。<code>volatile</code> 只能防止变量被优化掉，不能阻止编译器重排不同 volatile 变量之间的顺序。</p>
<p>DMA 场景的典型顺序是：填充缓冲区 → <code>DSB()</code> → 写 DMA 启动寄存器。如果缓冲区在带 Cache 的芯片上，还要先做 Cache 清理（clean），否则数据可能还在 Cache 里没写回内存。</p>`,
        principle: `<p>现代 CPU 为了性能允许访存乱序和写缓冲，这在单线程看来没有影响（因为会保证程序顺序的可见性），但在 DMA、多核、外设看来就可能观察到不同的顺序。</p>
<p>屏障的作用是建立“happens-before”关系：屏障之前的操作对其它观察者可见之后，屏障之后的操作才能被观察到。</p>`,
        fig: {
          type: "table",
          title: "三种屏障的语义与场景",
          tag: "barrier",
          head: ["指令", "语义", "典型场景"],
          rows: [
            ["DMB", "保证访存顺序，不等待完成", "写数据后写标志位"],
            ["DSB", "等待之前访存全部完成", "写配置后启动 DMA"],
            ["ISB", "清流水线，重新取指", "修改向量表、自修改代码"],
            ["编译器屏障", "阻止编译器重排", "volatile 变量之间的顺序"]
          ]
        },
        code: {
          lang: "c",
          title: "dma_start.c",
          src: `#include <stdint.h>

#define DSB()  __asm volatile ("dsb 0xF" ::: "memory")
#define DMB()  __asm volatile ("dmb 0xF" ::: "memory")
#define ISB()  __asm volatile ("isb 0xF" ::: "memory")

extern volatile uint32_t DMA_CR;
extern volatile uint32_t DMA_SRC;
extern volatile uint32_t DMA_LEN;

void dma_start(const void *src, uint32_t len)
{
    /* 1. 确保缓冲区数据已经写入内存 */
    DSB();

    /* 2. 如果带 D-Cache，需要先 clean 对应区域 */
    /* SCB_CleanDCache_by_Addr((uint32_t *)src, len); */

    /* 3. 配置 DMA */
    DMA_SRC = (uint32_t)src;
    DMA_LEN = len;

    /* 4. 保证配置写完再启动 */
    DSB();
    DMA_CR  = 1u;
}`
        },
        codeNote: "Cortex-M 的 __DSB()/__DMB() 内建函数由 CMSIS 提供，参数 0xF 表示全系统范围。",
        apply: `<p>我在“双缓冲 + DMA”结构里，切换缓冲区前一定加 DSB，并配合 Cache 维护操作。没有 Cache 的 M3/M4 上，DSB 主要防止写缓冲导致的顺序问题。</p>
<p>RTOS 的临界区和信号量实现内部已经包含屏障，业务代码不需要重复加；但自己写的无锁队列必须显式处理内存序。</p>`,
        pitfalls: [
          "<b>只用 volatile 就以为够了。</b>volatile 不保证多变量之间的顺序。",
          "<b>用 DMB 代替 DSB。</b>DMB 不等待完成，硬件可能还没看到数据。",
          "<b>忘记 Cache 维护。</b>带 Cache 的芯片上，数据还在 Cache 里。",
          "<b>在中断和主循环共享缓冲区时不做同步。</b>顺序和可见性都无法保证。"
        ],
        follow: [
          ["DMB 和 DSB 的性能差异大吗？", "DSB 要等待操作真正完成，通常更慢；DMB 只保证顺序，开销较小。能用 DMB 的地方不要用 DSB。"],
          ["C++ 的 atomic 和内存序有什么关系？", "std::atomic 的 memory_order 会在底层生成相应的屏障或原子指令，relaxed 无序、acquire/release 建立同步、seq_cst 最强。" ]
        ]
      },

      {
        id: "B-14",
        chapter: "cpu",
        topic: "arch",
        title: "时钟周期、机器周期、指令周期有什么区别？主频越高一定越快吗？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "时钟周期是最小时间单位，机器周期是完成一个基本操作的时间，指令周期是指令从取指到完成的时间。",
        q: `<p>面试官：主频 168MHz 的 MCU 一定比 72MHz 的快吗？一条指令要几个时钟周期？</p>`,
        exam: `<p>考察对时序的基本理解。能说出 CPI、流水线、Flash 等待周期、总线位宽都会影响实际性能，就说明不只看主频。</p>`,
        core: `<p>不一定，主频只决定时钟周期，实际性能还看 CPI、Flash 等待周期、总线和编译优化；一条指令的周期数取决于指令类型、流水线和存储器等待。</p>`,
        answer: `<p><b>三个概念：</b></p>
<ul>
<li><b>时钟周期</b>：时钟频率的倒数，是最小时间单位。168MHz 对应约 5.95ns。</li>
<li><b>机器周期</b>：完成一个基本总线操作所需的时间，经典 8051 里 1 个机器周期等于 12 个时钟周期；ARM 里这个概念弱化，通常直接说总线周期。</li>
<li><b>指令周期</b>：一条指令从取指到执行完成所需的时间，可能包含多个时钟周期。Cortex-M3/M4 上多数 ALU 指令 1 个周期，<code>LDR/STR</code> 约 2 个周期，硬件除法 <code>SDIV/UDIV</code> 为 2~12 个周期；遇上 Flash 等待周期还要再加。</li>
</ul>
<p><b>主频不等于性能：</b></p>
<ul>
<li><b>CPI（每指令周期数）</b>不同：Cortex-M7 双发射、6 级流水线，CPI 可以小于 1；M0 是 3 级流水线，很多指令要多个周期。</li>
<li><b>Flash 等待周期</b>：主频越高，Flash 越跟不上，需要插入 wait state；如果不开 Cache/预取，实际性能会被拖慢。</li>
<li><b>总线位宽和仲裁</b>：DMA 占用总线时 CPU 取指变慢。</li>
<li><b>指令集和编译优化</b>：同样的 C 代码，生成的指令数和访存次数不同。</li>
<li><b>外设瓶颈</b>：CPU 再快，等 ADC 转换、等串口发送的时间不会变。</li>
</ul>
<p>所以评估性能要看实际 benchmark（如 CoreMark）和具体任务的耗时，而不是只比主频。</p>`,
        principle: `<p>执行时间 = 指令数 × CPI × 时钟周期。主频只影响最后一项，指令数和 CPI 由架构、编译器和代码质量决定。</p>
<p>提高主频往往需要提高电压、增加等待周期，功耗上升很快（动态功耗与频率成正比、与电压平方成正比），所以高频不一定能效更好。</p>`,
        fig: {
          type: "table",
          title: "影响实际性能的因素",
          tag: "performance",
          head: ["因素", "影响", "说明"],
          rows: [
            ["主频", "时钟周期", "最直观，但不是全部"],
            ["CPI", "每指令周期数", "流水线、双发射影响大"],
            ["Flash 等待", "取指停顿", "高频时需要预取/Cache"],
            ["总线仲裁", "访存延迟", "DMA 会抢占带宽"],
            ["编译优化", "指令数", "-O2 与 -O0 差异明显"]
          ]
        },
        apply: `<p>做性能评估时，我用 GPIO 翻转 + 示波器测实际耗时，或者用 DWT 周期计数器，而不是凭主频估算。曾经有个算法在 168MHz 的 M4 上比 72MHz 的 M3 还慢，原因是浮点库版本和 Flash 等待配置不同。</p>
<p>优化顺序是：先减少算法复杂度，再减少内存访问，最后才考虑主频和编译选项。</p>`,
        pitfalls: [
          "<b>只看主频比较性能。</b>架构、CPI、等待周期都会影响结果。",
          "<b>忽略 Flash 等待周期。</b>高频下不开 Cache 可能更慢。",
          "<b>把机器周期当成固定 12 个时钟。</b>那是经典 8051 的概念，ARM 不适用。",
          "<b>用软件延时循环做精确计时。</b>编译优化后循环次数会变。"
        ],
        follow: [
          ["什么是 CoreMark？", "一个标准化的嵌入式处理器基准测试，综合了链表、矩阵、状态机等操作，比主频更能反映实际性能。"],
          ["为什么提高主频要同时提高电压？", "晶体管开关速度与电压相关，电压太低无法在更短时间内完成翻转；但电压提高会让动态功耗按平方增长。"]
        ]
      },

      {
        id: "B-15",
        chapter: "io",
        topic: "vector",
        title: "中断向量表是什么？中断发生时 CPU 怎么找到处理函数？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "向量表是地址数组，异常号作为索引，硬件从中取出入口地址跳转；VTOR 可重定位。",
        q: `<p>面试官：中断向量表放在哪里？中断发生时硬件是怎么跳到对应函数的？修改向量表要注意什么？</p>`,
        exam: `<p>考察启动和异常机制。能说出“向量表是函数指针数组、异常号是索引、VTOR 指定基址”，并知道重定位要按对齐要求，就很好。</p>`,
        core: `<p>向量表默认放 Flash 起始处，第 0 项是初始 MSP、第 1 项是复位向量，之后是各异常和外设中断；VTOR 存表基址，改表后要 DSB 加 ISB 才生效。</p>`,
        answer: `<p><b>向量表</b>是一个存放在内存中的地址数组，每个表项对应一个异常/中断的入口地址。Cortex-M 的向量表开头两个特殊表项是：</p>
<ul>
<li>第 0 项：初始栈顶值（MSP 初值）；</li>
<li>第 1 项：复位向量（Reset_Handler 地址）。</li>
</ul>
<p>之后依次是 NMI、HardFault、MemManage、BusFault、UsageFault、SVC、PendSV、SysTick，再往后是各外设中断。</p>
<p><b>中断响应过程：</b>CPU 取到异常号 n，从 <code>VTOR + 4×n</code> 处读取入口地址，压栈保存现场，然后跳转执行。整个过程由硬件完成，不需要软件查表。</p>
<p><b>VTOR（Vector Table Offset Register）</b>指定向量表基址。默认指向 Flash 起始地址；Bootloader + APP 架构中，APP 需要把 VTOR 设置为自己的向量表地址，否则中断会跳到 Bootloader 的表项。</p>
<p><b>注意事项：</b></p>
<ul>
<li>VTOR 的低 7 位（或更多，取决于实现）必须为 0，即向量表要按 128 字节或更大对齐；</li>
<li>修改 VTOR 后需要 <code>DSB</code> + <code>ISB</code>，保证后续取指使用新表；</li>
<li>向量表通常放在 Flash，但也可以复制到 RAM 以支持动态修改（如 IAP）；</li>
<li>表项数量要与启动文件、链接脚本一致，缺项会导致中断跳到默认死循环。</li>
</ul>`,
        principle: `<p>向量表把“异常号 → 处理函数地址”的映射固化在内存里，硬件只需一次查表加跳转，比软件逐个比较异常号快得多。这是中断能低延迟响应的关键。</p>
<p>向量表本质是函数指针数组，所以它的类型是 <code>void (* const)(void)</code>，放在只读段，防止运行时被意外修改。</p>`,
        fig: {
          type: "memmap",
          title: "Cortex-M 向量表布局",
          tag: "vector table",
          rows: [
            { name: "0x0000", text: "初始 MSP 值", addr: "表项 0", cls: "a" },
            { name: "0x0004", text: "Reset_Handler", addr: "表项 1", cls: "b" },
            { name: "0x0008", text: "NMI_Handler", addr: "表项 2", cls: "c" },
            { name: "0x000C", text: "HardFault_Handler", addr: "表项 3", cls: "d" },
            { name: "…", text: "SVC / PendSV / SysTick / 外设中断", addr: "后续表项", cls: "e" }
          ]
        },
        code: {
          lang: "c",
          title: "vtor_relocate.c",
          src: `#include <stdint.h>

#define SCB_VTOR (*(volatile uint32_t *)0xE000ED08u)

/* APP 启动时把向量表重定位到自己的区域 */
void relocate_vector_table(uint32_t app_base)
{
    /* 1. 确认地址对齐（Cortex-M 要求至少 128 字节对齐） */
    if (app_base & 0x7Fu) {
        /* 处理错误 */
        return;
    }

    /* 2. 设置 VTOR */
    SCB_VTOR = app_base;

    /* 3. 保证后续取指使用新的向量表 */
    __asm volatile ("dsb 0xF" ::: "memory");
    __asm volatile ("isb 0xF" ::: "memory");
}`
        },
        codeNote: "不同 Cortex-M 版本对 VTOR 对齐要求不同，M0+ 是 32 字节，M3/M4 是 128 字节，移植时要查手册。",
        apply: `<p>做 Bootloader + APP 升级时，APP 启动第一件事就是重定位 VTOR，并设置 MSP。忘记这一步的典型现象是：APP 能跑，但一进中断就跳回 Bootloader 或死机。</p>
<p>调试时可以在启动后打印 VTOR 的值，确认它指向 APP 的向量表，而不是 0x08000000。</p>`,
        pitfalls: [
          "<b>APP 不重定位 VTOR。</b>中断跳到 Bootloader 的向量表。",
          "<b>VTOR 地址未对齐。</b>写入被忽略或行为未定义。",
          "<b>修改 VTOR 后不加 ISB。</b>流水线里可能还是旧表项。",
          "<b>向量表项数量与启动文件不一致。</b>中断号错位，跳到错误函数。"
        ],
        follow: [
          ["中断向量和中断号有什么区别？", "中断号是外设中断在向量表中的序号（如 EXTI0 是 6），向量是表中存放的入口地址；NVIC 使能时用的是中断号。"],
          ["为什么复位后先取 MSP 再取 Reset_Handler？", "因为复位后还没有栈，必须先建立栈指针才能调用 C 函数；硬件自动从向量表第 0 项加载 MSP，第 1 项加载 PC。"]
        ]
      },

      {
        id: "B-16",
        chapter: "storage",
        topic: "cache-map",
        title: "Cache 有哪几种映射方式？为什么会有冲突缺失？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "直接映射、全相联、组相联；直接映射实现简单但冲突多，组相联是折中。",
        q: `<p>面试官：Cache 的直接映射、全相联、组相联有什么区别？为什么两个地址会争用同一个 Cache 行？</p>`,
        exam: `<p>考察存储层次结构。能说清“索引位决定位置、标记位判断是否命中”，以及冲突缺失与容量缺失的区别，就很好。</p>`,
        core: `<p>直接映射一个主存块只能进一个固定行、冲突多；全相联可进任意行、冲突少但比较器贵；组相联折中。两个地址映射到同一行就会互相踢出，形成冲突缺失。</p>`,
        answer: `<p>Cache 按“主存块放到哪个 Cache 行”分为三种：</p>
<ul>
<li><b>直接映射</b>：每个主存块只能放到唯一一个 Cache 行，行号 = 块号 % 行数。实现最简单、查找最快，但两个块映射到同一行时会互相驱逐，产生<b>冲突缺失</b>。</li>
<li><b>全相联</b>：任何主存块可以放到任何 Cache 行。冲突最少，但需要比较所有行的标记，硬件成本高，通常只用于小容量 Cache（如 TLB）。</li>
<li><b>组相联</b>：折中方案。Cache 分成若干组，每组有 N 行（N 路），主存块映射到固定组，但可以放在组内任意一路。常见 2 路、4 路、8 路。</li>
</ul>
<p><b>地址划分：</b>主存地址 = 标记（tag）+ 组索引（index）+ 块内偏移（offset）。用 index 找到组，再用 tag 与组内各行的标记比较，命中则按 offset 取数据。</p>
<p><b>三种缺失：</b></p>
<ul>
<li><b>强制性缺失（compulsory miss）</b>：第一次访问，必然缺失；</li>
<li><b>容量缺失</b>：工作集大于 Cache 容量；</li>
<li><b>冲突缺失</b>：工作集不大，但多个块争用同一组。</li>
</ul>
<p>增加相联度可以减少冲突缺失，但会增加比较延迟和功耗。</p>`,
        principle: `<p>Cache 利用程序的空间局部性（访问相邻地址）和时间局部性（重复访问同一地址）。映射方式决定了“局部性能否被保留”，相联度越高，越不容易被无关数据挤出。</p>
<p>直接映射的冲突来自“多个块共享一个行”，这是哈希冲突在硬件里的体现；组相联相当于给每组增加了几个“桶”。</p>`,
        fig: {
          type: "table",
          title: "三种映射方式对比",
          tag: "cache",
          head: ["方式", "放置位置", "查找成本", "冲突"],
          rows: [
            ["直接映射", "唯一行", "最低", "高"],
            ["全相联", "任意行", "最高", "最低"],
            ["组相联", "组内任意路", "中等", "中等"]
          ]
        },
        apply: `<p>写 DMA 缓冲时，如果缓冲区大小正好是 Cache 大小的整数倍，容易出现两个缓冲争用同一组，导致频繁缺失。把缓冲区错开一点（加 padding）往往能改善性能。</p>
<p>更实际的是保证 Cache 一致性：DMA 写内存后要 invalidate 对应 Cache 行，DMA 读内存前要 clean，否则 CPU 可能读到旧数据。</p>`,
        pitfalls: [
          "<b>把冲突缺失当成容量不足。</b>加大 Cache 不一定能解决，调整数据布局更有效。",
          "<b>忽略 Cache 行大小。</b>相邻变量可能共享一行，产生伪共享。",
          "<b>DMA 与 Cache 同时访问同一区域不做维护。</b>数据不一致。",
          "<b>以为 Cache 越大越快。</b>相联度和命中率同样重要。"
        ],
        follow: [
          ["什么是伪共享（false sharing）？", "两个 CPU 核分别修改同一 Cache 行里的不同变量，导致该行在核间反复失效，性能下降。解决方法是把变量按 Cache 行对齐填充。"],
          ["Cache 行一般多大？", "常见 32 或 64 字节。Cortex-M7 的 D-Cache 行是 32 字节，操作时要按行对齐做 clean/invalidate。"]
        ]
      }
    ]
  });
})();
