/* ============================================================
   01 C语言基础与进阶
   ============================================================ */
(function () {
  "use strict";

  EIK.register("c-language", {
    chapters: [
      {
        id: "keywords",
        title: "关键字与预处理",
        topics: [
          { id: "qualifier", title: "const / static / volatile / extern" },
          { id: "macro", title: "宏定义与预处理指令" }
        ]
      },
      {
        id: "pointer",
        title: "指针与内存",
        topics: [
          { id: "ptr-basic", title: "指针运算与数组" },
          { id: "ptr-func", title: "函数指针与回调" },
          { id: "mem-region", title: "内存分区、堆与栈" }
        ]
      },
      {
        id: "types",
        title: "类型与位操作",
        topics: [
          { id: "align", title: "数据类型与内存对齐" },
          { id: "endian", title: "大小端与类型转换" },
          { id: "bit", title: "位运算与寄存器操作" }
        ]
      },
      {
        id: "build",
        title: "编译、链接与陷阱",
        topics: [
          { id: "build-flow", title: "编译链接过程与内存布局" },
          { id: "ub", title: "常见陷阱与未定义行为" }
        ]
      }
    ],

    questions: [
      /* ---------------- C-01 ---------------- */
      {
        id: "C-01",
        chapter: "keywords",
        topic: "qualifier",
        title: "volatile 关键字有什么作用？哪些变量必须加？",
        diff: "初级",
        freq: "高频",
        type: "原理分析题",
        point: "考察编译器优化行为、volatile 的语义边界，以及中断/DMA/寄存器场景的正确用法。",
        q: `<p>面试官：<strong>volatile 关键字有什么作用？</strong>在项目里你会给哪些变量加 volatile？如果我说“加了 volatile 就线程安全了”，这句话对吗？</p>`,
        exam: `<p>这道题表面在问一个关键字，实际在确认三件事：你是否理解<strong>编译器优化</strong>会怎样改变程序语义；你是否清楚 volatile 的<strong>能力边界</strong>（不保证原子性、不保证执行顺序）；你有没有在真实项目里踩过“开了 -O2 程序就卡死”的坑。</p>
<p>面试官最想听到的不是背定义，而是“为什么需要它”和“它管不了什么”。</p>`,
        core: `<p><strong>volatile</strong> 告诉编译器：该变量可能在程序控制之外被改变，每次使用都要真实读内存、每次赋值都要真实写回，不能缓存到寄存器，也不能把访问优化掉。</p><p>必加三类：外设寄存器、中断与主循环共享的标志、DMA 直接写入的缓冲区。它<strong>不保证原子性</strong>，<code>g_cnt++</code> 这种读改写仍要关中断、用原子指令或加锁。</p>`,
        answer: `<p>volatile 的作用是告诉编译器：<strong>这个变量的值可能在程序控制之外被改变</strong>，因此每次使用都必须真正去内存里读，每次赋值都必须真正写回内存，不能把它缓存到寄存器里，也不能因为“看起来没被修改”就把这段代码优化掉。</p>
<p>我一般会给三类变量加 volatile：第一类是<strong>外设寄存器</strong>，比如 <code>*(volatile uint32_t *)0x40011004</code>，因为它的值由硬件改变；第二类是<strong>中断服务函数和主循环共享的标志位</strong>，比如串口接收完成标志；第三类是 <strong>DMA 直接写入的缓冲区</strong>，CPU 不能假设那块内存没变。</p>
<p>但要说清楚：volatile <strong>不保证原子性，也不保证线程安全</strong>。像 <code>g_cnt++</code> 这种读—改—写操作，加了 volatile 依然可能被中断打断而产生竞态，那要靠关中断、原子指令或者互斥锁来解决。</p>`,
        principle: `<p>编译器在优化时，会做三件对 volatile 敏感的事：</p>
<ul>
<li><strong>寄存器缓存</strong>：发现一个变量在循环里没被修改，就只从内存读一次，之后一直用寄存器里的副本；</li>
<li><strong>删除冗余访问</strong>：连续两次读同一个变量，认为结果相同，合并成一次；</li>
<li><strong>重排访问顺序</strong>：在不改变单线程可见结果的前提下调整指令顺序。</li>
</ul>
<p>加 volatile 之后，上述三种优化对它是被禁止的：每次访问都生成真实的 load/store 指令。注意它只约束<strong>编译器</strong>，不约束 CPU 的乱序执行和 Cache，所以多核之间仍需要内存屏障或原子操作。</p>`,
        fig: {
          type: "table",
          title: "典型场景下加与不加 volatile 的差异",
          tag: "compare",
          head: ["代码场景", "未加 volatile（-O2）", "加 volatile"],
          rows: [
            ["<code>while (!g_flag);</code>", "只读一次寄存器，可能永远死循环", "每轮重新读内存，能正确退出"],
            ["<code>while (REG-&gt;SR &amp; BUSY);</code>", "判断被提到循环外，等待失效", "每次访问真实外设寄存器"],
            ["<code>buf[i]</code>（DMA 写入）", "读到的是旧的寄存器缓存值", "每次都从 SRAM 重新读"],
            ["<code>g_cnt++</code>（中断共享）", "存在竞态，结果不可预期", "仍然存在竞态，需关中断"]
          ]
        },
        code: {
          lang: "c",
          title: "uart_poll.c",
          src: `volatile uint8_t g_rx_done = 0;      /* 中断里置位，主循环里查询 */
uint8_t g_rx_buf[64];

void USART1_IRQHandler(void)
{
    if (USART1->SR & USART_SR_RXNE) {
        g_rx_buf[0] = USART1->DR;     /* 读 DR 同时清 RXNE 标志 */
        g_rx_done = 1;                /* 通知主循环 */
    }
}

int main(void)
{
    Uart_Init();

    while (1) {
        if (g_rx_done) {              /* 若 g_rx_done 无 volatile，-O2 下可能被优化为死循环 */
            g_rx_done = 0;
            ProcessFrame(g_rx_buf, 1);
        }
    }
}`
        },
        codeNote: `<b>关键点：</b>编译器在 <code>while</code> 里看不到任何修改 <code>g_rx_done</code> 的语句，会把它的值缓存在寄存器中，循环条件恒为假——现象就是“仿真器看变量已经是 1，程序却卡在循环里”。这类问题在 -O0 调试时完全正常，一旦开优化就复现。`,
        apply: `<p>实际工程中，寄存器访问通常由厂商头文件保证：CMSIS 的 <code>__IO</code> 宏定义就是 <code>volatile</code>，所以 <code>USART1-&gt;DR</code> 天然是 volatile 访问。自己写寄存器映射或做内存映射 IO 时，一定要手动加。</p>
<p>另外两个常见用法：环形缓冲区里由中断更新的读写下标要加 volatile；bootloader 与 APP 共享的标志变量放在固定地址并加 volatile。但共享数据的<strong>一致性</strong>不能靠 volatile，要用临界区或双缓冲。</p>`,
        pitfalls: [
          "<b>以为 volatile 能保证原子性。</b>它只保证“每次都真实访问内存”，<code>i++</code> 依然是读、加、写三步，中断插在中间照样出错。",
          "<b>给局部变量乱加 volatile。</b>局部变量地址不会被外部持有，加了只会阻止优化、拖慢速度，没有任何正确性收益。",
          "<b>把 volatile 当内存屏障用。</b>它不阻止 CPU 乱序，也不保证多个 volatile 访问之间的顺序在硬件层面生效，C11 里应该用 <code>atomic</code> 或 <code>__DMB()</code>。"
        ],
        follow: [
          [
            "volatile 能保证线程安全吗？",
            "不能。线程安全需要保证复合操作的原子性和可见性顺序。volatile 只解决“每次都从内存读写”，解决不了 <code>g_cnt++</code> 的读改写竞态。RTOS 里共享数据要用互斥锁、临界区或原子操作。"
          ],
          [
            "为什么中断和主循环共享的变量要加 volatile？",
            "因为中断对编译器来说是“看不见的调用”。主循环里没有任何语句修改这个变量，编译器有理由认为它不变。加 volatile 后每次循环都会重新读内存，才能看到中断写入的新值。"
          ],
          [
            "const volatile 一起用是什么场景？",
            "典型是只读状态寄存器：程序不应该写它（const），但它的值会被硬件改变（volatile）。例如 <code>#define SR (*(const volatile uint32_t *)0x40000000)</code>。"
          ],
          [
            "volatile 和内存屏障的区别？",
            "volatile 是编译器层面的约束，禁止缓存和删除访问；内存屏障（DMB/DSB）是 CPU 层面的约束，保证屏障前后的访存对其他观察者有序。多核共享数据或 DMA + Cache 场景，两者都不能互相替代。"
          ]
        ]
      },

      /* ---------------- C-02 ---------------- */
      {
        id: "C-02",
        chapter: "keywords",
        topic: "qualifier",
        title: "static 关键字有哪些用途？在嵌入式里怎么用？",
        diff: "初级",
        freq: "高频",
        type: "基础概念题",
        point: "static 的三种语义：静态存储期、内部链接、以及模块私有化，是模块化设计的基础。",
        q: `<p>面试官：<strong>static 关键字有哪些用途？</strong>分别说说修饰局部变量、全局变量和函数时效果有什么不同。它在嵌入式项目里有什么实际价值？</p>`,
        exam: `<p>考察点在于“链接属性”这个概念。很多人只记得“static 让变量只初始化一次”，却说不清它改变的是<strong>存储期</strong>还是<strong>链接属性</strong>。能讲清楚“为什么驱动模块里的变量都要加 static”，说明你真的写过模块化代码。</p>`,
        core: `<p>三个位置三种语义：修饰局部变量——存储期从自动变静态，函数返回后值还在、只初始化一次；修饰全局变量和函数——链接属性从外部变内部，只在本 <code>.c</code> 可见，其他文件 <code>extern</code> 也链不到。</p><p>工程价值是模块私有化：驱动内部的状态变量和辅助函数都加 <code>static</code>，对外只暴露 <code>xxx_init</code>、<code>xxx_read</code>。</p>`,
        answer: `<p>static 有三个作用，分别对应三个位置。</p>
<p>第一，修饰<strong>局部变量</strong>：变量从栈上搬到静态存储区，生命周期变成整个程序运行期，函数退出后值还在，初始化只做一次。常用于保存状态，比如按键扫描的上一次电平。</p>
<p>第二，修饰<strong>全局变量</strong>：不改变存储位置，但把外部链接改成内部链接，其他 .c 文件即使写了 <code>extern</code> 也链接不到，避免命名冲突。</p>
<p>第三，修饰<strong>函数</strong>：同理，函数只在本文件可见，相当于 C 语言里的“私有方法”。</p>
<p>所以我在写驱动时，所有只在本文件用的变量和辅助函数都会加 static，对外只暴露 <code>xxx_init</code>、<code>xxx_read</code> 这几个接口，这样模块边界是清晰的。</p>`,
        principle: `<p>C 语言里一个标识符有两个独立属性：<strong>存储期</strong>（storage duration）和<strong>链接属性</strong>（linkage）。static 在不同位置修改的是不同属性：</p>
<ul>
<li>局部变量：修改<strong>存储期</strong>（自动 → 静态），未显式初始化的放在 <code>.bss</code>，显式初始化的放在 <code>.data</code>；</li>
<li>全局变量 / 函数：修改<strong>链接属性</strong>（外部 → 内部），存储位置不变。</li>
</ul>
<p>链接器处理多个目标文件时，外部链接的同名符号会报 “multiple definition”；内部链接的符号只在各自编译单元内解析，天然隔离。</p>`,
        fig: {
          type: "table",
          title: "static 的三种用法对照",
          tag: "compare",
          head: ["位置", "改变的属性", "生命周期", "可见范围"],
          rows: [
            ["函数内局部变量", "存储期：自动 → 静态", "整个程序", "仍只在本函数内"],
            ["文件作用域变量", "链接属性：外部 → 内部", "整个程序", "仅本 .c 文件"],
            ["函数", "链接属性：外部 → 内部", "—", "仅本 .c 文件"],
            ["头文件中的 static 变量", "每个包含者各有一份", "整个程序", "各自的编译单元"]
          ]
        },
        code: {
          lang: "c",
          title: "key_scan.c",
          src: `#include "key.h"

/* 只在本文件可见的模块私有状态，避免被其他文件 extern 后乱改 */
static uint8_t s_last_level = 1;
static uint8_t s_stable_cnt = 0;

/* 内部辅助函数：不对外暴露，链接属性为 internal */
static void key_report(uint8_t id)
{
    KeyEvent ev = { .id = id, .type = KEY_PRESS };
    Event_Post(&ev);
}

/* 对外接口：头文件里声明，其他模块可调用 */
void Key_Scan10ms(void)
{
    uint8_t level = GPIO_ReadInputDataBit(KEY_PORT, KEY_PIN);

    if (level != s_last_level) {          /* 电平变化，开始计数 */
        s_stable_cnt++;
        if (s_stable_cnt >= 2) {          /* 连续 2 次（20ms）一致才确认 */
            s_last_level = level;
            s_stable_cnt = 0;
            if (level == 0) key_report(KEY_ID_USER);
        }
    } else {
        s_stable_cnt = 0;
    }
}`
        },
        apply: `<p>嵌入式中 static 有三个高频用途：<strong>模块私有状态</strong>（驱动句柄、初始化标志）、<strong>查找表</strong>（<code>static const uint16_t sin_table[]</code> 放 Flash）、<strong>单例式设备实例</strong>（每个外设一个 static 结构体）。</p>
<p>还有一个隐性收益：加 static 的函数编译器可以做更激进的内联和跨过程优化，因为它确定没有外部调用者。</p>`,
        pitfalls: [
          "<b>在头文件里定义 static 变量。</b>每个包含该头文件的 .c 都会得到独立副本，看起来“共享”，实际各改各的，是极难发现的 bug。共享变量应在 .c 中定义、头文件中 extern 声明。",
          "<b>把 static 局部变量用在可重入函数里。</b>多任务或中断同时调用同一个函数时，static 状态会被互相覆盖。可重入函数必须只用栈上变量。",
          "<b>以为 static 变量在函数退出时清零。</b>它只初始化一次，之后一直保持上次的值，这正是它能“记住状态”的原因，也是忘记复位导致逻辑错乱的原因。"
        ],
        follow: [
          [
            "static 变量存放在哪个段？",
            "显式初始化为非零值的放在 <code>.data</code>（启动时从 Flash 拷贝到 RAM）；未初始化或初始化为 0 的放在 <code>.bss</code>（启动时清零，不占 Flash 空间）。所以大数组尽量不显式初始化。"
          ],
          [
            "static 函数和普通函数在调用上有区别吗？",
            "运行期没有区别，都是普通函数调用。区别在链接阶段：static 函数符号是 local 的，不参与全局符号解析；编译器还可能直接内联或删除未使用的 static 函数。"
          ],
          [
            "如何让一个变量只在本文件可见但又要跨函数共享？",
            "在文件作用域定义 <code>static</code> 变量，本文件所有函数都能访问，其他文件不可见。这是驱动模块保存上下文的标准做法。"
          ],
          [
            "C++ 里的 static 成员和 C 的 static 有什么不同？",
            "C++ 的 static 成员属于类而不属于对象，所有实例共享一份，需要在类外定义；static 成员函数没有 this 指针。语义上仍然是“静态存储 + 类作用域”，但作用域规则更复杂。"
          ]
        ]
      },

      /* ---------------- C-03 ---------------- */
      {
        id: "C-03",
        chapter: "keywords",
        topic: "qualifier",
        title: "const 修饰指针的四种写法分别是什么意思？",
        diff: "初级",
        freq: "高频",
        type: "代码分析题",
        point: "const 与指针结合时的四种语义，考察“谁不能变”的准确判断。",
        q: `<p>面试官：请分别说明下面四行声明的含义，并判断 ①~⑥ 这六条赋值哪些合法：</p>
<pre><code>int a = 1, b = 2;

const int *p1 = &amp;a;
int const *p2 = &amp;a;
int * const p3 = &amp;a;
const int * const p4 = &amp;a;

p1 = &amp;b;    /* ① */
*p1 = 5;    /* ② */
p3 = &amp;b;    /* ③ */
*p3 = 5;    /* ④ */
p4 = &amp;b;    /* ⑤ */
*p4 = 5;    /* ⑥ */</code></pre>`,
        exam: `<p>这是典型的“送分题也是送命题”。判断方法只有一个：<strong>const 修饰的是它左边的东西，如果左边没有东西，就修饰右边</strong>。能一口气说清四种组合，说明指针基础扎实；能补一句“嵌入式里 const 还能把数据放进 Flash”，说明有工程意识。</p>`,
        core: `<p>口诀：<code>const</code> 在 <code>*</code> 左边修饰指向的内容，在 <code>*</code> 右边修饰指针本身。</p><p><code>const int *p</code> 与 <code>int const *p</code> 等价，指的内容不能改、指向可改；<code>int * const p</code> 是常量指针，指向不能改、内容可改；<code>const int * const p</code> 两者都不能改。</p>`,
        answer: `<p>记忆口诀是“const 在 <code>*</code> 左边，修饰指向的内容；在 <code>*</code> 右边，修饰指针本身”。</p>
<p><code>const int *p1</code> 和 <code>int const *p2</code> 完全等价，都是<strong>指向常量的指针</strong>：不能通过 p 修改目标，但 p 本身可以改指向。</p>
<p><code>int * const p3</code> 是<strong>常量指针</strong>：p3 一旦初始化就不能再指向别处，但可以通过它修改目标的值。</p>
<p><code>const int * const p4</code> 两者都不能改。</p>
<p>所以合法的只有 ① <code>p1 = &amp;b</code>（改指向）和 ④ <code>*p3 = 5</code>（改内容）；非法的有 ② <code>*p1 = 5</code>、③ <code>p3 = &amp;b</code>、⑤ <code>p4 = &amp;b</code>、⑥ <code>*p4 = 5</code>。</p>`,
        principle: `<p>C 的声明语法是“从标识符出发，先右后左”阅读。<code>const int *p</code> 读作：p 是一个指针，指向 const int。const 修饰的是 <code>int</code>，不是 <code>p</code>。</p>
<p>const 的语义是<strong>编译期的只读承诺</strong>，不是运行期保护。用强制类型转换把 const 去掉再写，行为是未定义的；如果该对象真的位于 Flash（<code>.rodata</code>），写入会触发总线错误或 HardFault。</p>`,
        code: {
          lang: "c",
          title: "const_ptr.c",
          src: `int Uart_SendString(const char *str);   /* 前置声明 */

int a = 1, b = 2;

const int *p1 = &a;   /* 指向的内容只读 */
int * const p3 = &a;  /* 指针本身只读 */
const int * const p4 = &a;

void demo(void)
{
    p1 = &b;      /* OK：可以改指向 */
    /* *p1 = 10;  错误：不能改目标 */

    *p3 = 10;     /* OK：可以改目标 */
    /* p3 = &b;   错误：不能改指向 */

    /* *p4 = 10;  错误 */
    /* p4 = &b;   错误 */

    /* 常见的接口写法：只读入参 */
    static const char msg[] = "ok";
    Uart_SendString(msg);
}

/* 只读入参：告诉调用者“我不会改你的缓冲区”，也允许传入字符串常量 */
int Uart_SendString(const char *str)
{
    int n = 0;
    while (str && *str) {
        while (!(USART1->SR & USART_SR_TXE)) { }
        USART1->DR = (uint8_t)*str++;
        n++;
    }
    return n;
}`
        },
        codeNote: `<b>接口设计约定：</b>只读指针参数写 <code>const char *</code>；只写或输入输出参数直接写 <code>char *</code>，不再加 const。注意别写成 <code>char * const</code>——形参按值传递，这个 const 只约束函数内的指针副本，对调用方没有任何意义。这样调用者能放心传入 <code>"AT+RST"</code> 这种字符串常量，否则编译器会警告丢弃 const 限定符。`,
        apply: `<p>嵌入式中 const 还有两个实际价值：其一，<code>const</code> 修饰的全局数组会被链接到 <code>.rodata</code> 段，最终烧进 Flash，<strong>不占 SRAM</strong>——字体库、正弦表、协议常量表都应该加 const；其二，const 是接口契约，配合静态检查工具能在编译期抓出一批误写。</p>`,
        pitfalls: [
          "<b>把 const 当成运行期只读保护。</b>它只是编译期检查，强制转换后照样能写，写 Flash 上的对象会直接触发 HardFault。",
          "<b>函数参数该加 const 却没加。</b>导致无法传入字符串字面量，调用方被迫定义临时数组，既浪费栈又容易出错。",
          "<b>混淆 <code>const int *p</code> 与 <code>int * const p</code>。</b>面试时先说出“const 修饰谁”，再解释含义，比死记“常量指针/指针常量”更可靠。"
        ],
        follow: [
          [
            "const 变量真的不能被修改吗？",
            "语法上不允许直接赋值，但通过强制转换去掉 const 后写入，属于未定义行为。若对象在 RAM 中可能“看起来成功”，若在 Flash 中会触发总线错误。编译器还可能把 const 值直接内联成立即数，改内存也不影响读取结果。"
          ],
          [
            "const 和 #define 有什么区别？",
            "const 有类型、受作用域约束、可调试、可取地址；#define 是预处理文本替换，无类型检查，容易产生副作用。定义常量优先用 <code>const</code> 或 <code>enum</code>，宏只用于条件编译和需要字符串化的场景。"
          ],
          [
            "为什么驱动接口喜欢用 const 指针？",
            "一是语义清晰，表明函数不会修改数据；二是能接受只读存储区的数据；三是便于编译器优化，不必假设指针指向的内容会被外部改变。"
          ]
        ]
      },

      /* ---------------- C-04 ---------------- */
      {
        id: "C-04",
        chapter: "pointer",
        topic: "ptr-basic",
        title: "指针和数组有什么区别？为什么函数里 sizeof 拿不到数组长度？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "数组名与指针的本质差异、退化规则，以及函数传参时的长度丢失问题。",
        q: `<p>面试官：<strong>指针和数组有什么区别？</strong>下面这段代码输出什么？为什么？</p>
<pre><code>#include &lt;stdio.h&gt;

void func(int arr[10])
{
    printf("%zu\\n", sizeof(arr));
}

int main(void)
{
    int a[10];
    printf("%zu\\n", sizeof(a));
    func(a);
    return 0;
}</code></pre>`,
        exam: `<p>这题几乎每场嵌入式面试都会问。真正的考点不是“数组名是常量指针”这种半对半错的说法，而是<strong>数组类型</strong>与<strong>指针类型</strong>在 <code>sizeof</code>、取地址、赋值、传参退化上的差异。</p>`,
        core: `<p>数组是一块连续内存，类型是 <code>int[10]</code>；指针是保存地址的变量。数组名在 <code>sizeof</code> 里代表整个数组（40 字节），指针得到的是指针自身大小（32 位 4、64 位 8）。</p><p>数组名是地址常量，不能赋值、不能自增；指针可以。数组作形参会退化成 <code>int *</code>，方括号里的长度被忽略，所以函数里拿不到长度，必须另传长度或把数组与长度包进结构体。</p>`,
        answer: `<p><b>先给结论：</b>两行输出依次是 <code>40</code> 和 <code>4</code>（32 位平台）；64 位平台上第二行是 <code>8</code>。第一行的 40 来自数组 <code>a</code> 本身（10 × 4 字节），第二行的 4/8 来自退化成指针后的形参 <code>arr</code>。</p>
<p>原因是：数组是一块连续的内存，类型是 <code>int[10]</code>；指针是一个保存地址的变量，类型是 <code>int *</code>。它们不是一回事。</p>
<p>最直接的差别是 <code>sizeof</code>：数组名在 <code>sizeof</code> 里代表整个数组，得到 40；指针得到的是指针本身的大小，32 位平台是 4，64 位是 8。</p>
<p>第二个差别是赋值：数组名是地址常量，不能自增、不能被赋值；指针是变量，可以做 <code>p++</code>、可以改指向。</p>
<p>第三个差别在函数传参：数组作为参数会<strong>退化为指向首元素的指针</strong>，形参里的 <code>int arr[10]</code> 会被编译器改写成 <code>int *arr</code>，那个 10 完全被忽略。所以函数里 <code>sizeof(arr)</code> 得到的是 4 或 8，而不是 40。</p>
<p>所以工程上传递数组必须<strong>同时传长度</strong>，或者用结构体把数组和长度包在一起。</p>`,
        principle: `<p>C 标准规定：除了作为 <code>sizeof</code>、<code>&amp;</code> 和字符串字面量初始化的操作数之外，数组类型的表达式都会转换为指向首元素的指针，这叫<strong>数组退化</strong>（array-to-pointer decay）。</p>
<p>函数形参位置不存在真正的数组类型，<code>void f(int a[10])</code>、<code>void f(int a[])</code>、<code>void f(int *a)</code> 三者完全等价。这就是长度信息在函数边界丢失的根本原因。</p>
<p>另外 <code>&amp;arr</code> 的类型是 <code>int (*)[10]</code>，<code>&amp;arr + 1</code> 会跨过整个数组（40 字节），而 <code>arr + 1</code> 只跨 4 字节。这个差异常被用来判断面试者是否真懂指针运算。</p>`,
        fig: {
          type: "table",
          title: "数组与指针的关键差异",
          tag: "compare",
          head: ["操作", "int a[10]", "int *p"],
          rows: [
            ["<code>sizeof</code>", "40（整个数组）", "4 或 8（指针本身）"],
            ["<code>&amp;x + 1</code>", "跨过 40 字节，类型 <code>int(*)[10]</code>", "跨过 4 字节，类型 <code>int**</code>"],
            ["自增 <code>x++</code>", "非法，数组名不是左值", "合法，指向下一个元素"],
            ["赋值 <code>x = ...</code>", "非法", "合法"],
            ["作为函数实参", "退化为 <code>int *</code>", "值传递，拷贝地址"]
          ]
        },
        code: {
          lang: "c",
          title: "array_ptr.c",
          src: `/* 反例：长度丢失 */
void bad_clear(int buf[16])
{
    /* sizeof(buf) == 4（32 位），只能清 4 字节 */
    memset(buf, 0, sizeof(buf));
}

/* 正例 1：长度显式传入 */
void good_clear(int *buf, size_t len)
{
    memset(buf, 0, len * sizeof(buf[0]));
}

/* 正例 2：用宏在编译期算长度，仅对真正的数组有效 */
#define ARRAY_LEN(a) (sizeof(a) / sizeof((a)[0]))

/* 正例 3：结构体把数据和长度绑定，避免退化 */
typedef struct {
    uint8_t data[32];
    uint8_t len;
} frame_t;

void frame_clear(frame_t *f)
{
    memset(f->data, 0, sizeof(f->data));   /* 结构体成员仍是数组，sizeof 有效 */
    f->len = 0;
}`
        },
        codeNote: `<b>ARRAY_LEN 的边界：</b>这个宏对数组有效，对指针无效（指针相除得到的是无意义的值）。所以它只能用在数组还在作用域内的位置，不能用于函数形参。C++ 里可以用模板在编译期拒绝指针，C 语言只能靠约定和代码评审。`,
        apply: `<p>协议解析中经常需要“把缓冲区当数组用”。此时长度必须由协议字段给出，绝不能依赖 <code>sizeof</code>。另外一个常见坑是 <code>memset(buf, 0, sizeof(buf))</code> 写在被调函数里——如果 buf 是形参，只会清掉前 4 个字节，剩下的数据看起来“没清干净”，排查起来非常费时。</p>`,
        pitfalls: [
          "<b>说“数组名就是指针”。</b>数组名在多数表达式里会退化为指针，但它本身不是指针变量，没有独立的存储空间，也不能被修改。",
          "<b>在函数内用 sizeof 求形参数组长度。</b>结果永远是指针大小，这个 bug 在 32 位平台上刚好是 4，容易“碰巧”看起来正常。",
          "<b>用 <code>sizeof(str)</code> 求字符串长度。</b>那得到的是数组容量而不是内容长度，应该用 <code>strlen</code>。"
        ],
        follow: [
          [
            "<code>a[i]</code> 和 <code>*(a + i)</code> 完全等价吗？",
            "是的，C 标准定义 <code>a[i]</code> 等价于 <code>*(a + i)</code>，因此 <code>i[a]</code> 也合法。编译器对两者的代码生成完全一致，性能没有差别。"
          ],
          [
            "二维数组 <code>int a[3][4]</code> 的 <code>a</code>、<code>a[0]</code>、<code>&amp;a[0][0]</code> 有什么区别？",
            "值相同（都是首地址），但类型不同：<code>a</code> 是 <code>int(*)[4]</code>，<code>a[0]</code> 是 <code>int*</code>，<code>&amp;a[0][0]</code> 也是 <code>int*</code>。所以 <code>a + 1</code> 跨 16 字节，<code>a[0] + 1</code> 跨 4 字节。传参时形参必须写成 <code>int (*p)[4]</code> 才能正确寻址。"
          ],
          [
            "为什么数组名不能作为左值？",
            "数组名在表达式中被转换为指向首元素的指针，而这个指针是编译器生成的临时值，不是对象，没有可赋值的存储位置。它代表的是一块由编译器分配、位置固定的内存。"
          ]
        ]
      },

      /* ---------------- C-05 ---------------- */
      {
        id: "C-05",
        chapter: "types",
        topic: "align",
        title: "结构体内存对齐规则是什么？如何计算结构体大小？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "对齐三规则、填充字节的计算，以及 #pragma pack 的代价与适用场景。",
        q: `<p>面试官：<strong>结构体的大小是怎么算出来的？</strong>请说出对齐规则，并计算下面两个结构体在 32 位 ARM 上的大小：</p>
<pre><code>struct A { char a; int b; short c; };
struct B { int b; short c; char a; };</code></pre>`,
        exam: `<p>考点有三层：会不会算（规则）；知不知道为什么要对齐（硬件访问效率与总线限制）；能不能说出 <code>#pragma pack</code> 的风险（非对齐访问异常、性能下降）。能主动提到“协议解析应该用字节序安全的拷贝而不是强转结构体”，基本就是加分项。</p>`,
        core: `<p>三条规则：成员起始偏移必须是其对齐要求的整数倍；结构体总大小必须是最大对齐数的整数倍；嵌套结构体按内部最大成员对齐。</p><p>例：<code>{ int a; char b; char c; }</code> 偏移是 0/4/5，总长 6 补到 8。成员顺序不同大小会差几字节，RAM 紧张时把大成员放前面。</p>`,
        answer: `<p>规则有三条：</p>
<p>第一，每个成员的<strong>起始偏移</strong>必须是该成员大小（严格说是对齐要求）的整数倍，不满足就在前面填充字节。</p>
<p>第二，结构体的<strong>总大小</strong>必须是其中最大对齐数的整数倍，不够就在末尾补齐，这样数组里每个元素都能正确对齐。</p>
<p>第三，嵌套结构体时，内层结构体的对齐要求等于它内部最大成员的对齐要求。</p>
<p>按这三条算：<code>struct A</code> 中 a 在 0，b 要对齐到 4 所以偏移 4，占 4~7，c 在 8，总长 10，补齐到 4 的倍数得 <strong>12</strong>。<code>struct B</code> 中 b 在 0，c 在 4，a 在 6，总长 7，补齐到 <strong>8</strong>。</p>
<p>所以同样的成员，顺序不同大小就差 4 字节。在 RAM 只有几十 KB 的单片机上，把大成员放前面、小成员往后排，是很有意义的习惯。</p>`,
        principle: `<p>对齐的根本原因是<strong>总线访问粒度</strong>。32 位 ARM 的 AHB 总线一次读 4 字节，如果 <code>int</code> 落在地址 1，CPU 需要拆成两次访问再拼接，甚至直接触发 <code>UsageFault</code>（Cortex-M0 不支持非对齐访问，M3/M4 对部分指令支持）。</p>
<p>编译器插入的填充字节是“空洞”，不会初始化，也不会被 <code>memcpy</code> 之外的操作感知——这就是为什么用 <code>memcmp</code> 比较两个结构体可能失败：填充字节的值是随机的。</p>`,
        fig: {
          type: "table",
          title: "struct A 的字节布局（32 位 ARM）",
          tag: "layout",
          head: ["偏移", "0", "1-3", "4-7", "8-9", "10-11"],
          rows: [
            ["成员", "a", "<b>填充</b>", "b", "c", "<b>尾部填充</b>"],
            ["字节数", "1", "3", "4", "2", "2"]
          ]
        },
        code: {
          lang: "c",
          title: "align.c",
          src: `#include <stddef.h>
#include <stdio.h>

struct A { char a; int b; short c; };
struct B { int b; short c; char a; };

/* 紧凑排列：取消填充，用于协议/存储，但会失去对齐 */
#pragma pack(push, 1)
typedef struct {
    uint8_t  head;      /* 0 */
    uint16_t len;       /* 1  —— 非对齐 */
    uint32_t seq;       /* 3  —— 非对齐 */
    uint8_t  crc;
} frame_packed_t;
#pragma pack(pop)

int main(void)
{
    printf("A=%zu B=%zu packed=%zu\\n",
           sizeof(struct A), sizeof(struct B), sizeof(frame_packed_t));
    /* 32 位 ARM：A=12 B=8 packed=8 */

    /* offsetof 在编译期求偏移，可用于静态断言 */
    /* _Static_assert(offsetof(struct A, b) == 4, "b must be 4-byte aligned"); */
    return 0;
}`
        },
        codeNote: `<b>代价：</b><code>packed</code> 结构体的成员可能落在非对齐地址，Cortex-M0 访问会 HardFault，M3/M4 虽然支持但会拆成多次总线访问。所以协议帧最好用 <code>uint8_t buf[]</code> + 移位解析，而不是把接收缓冲区强转成 packed 结构体指针。`,
        apply: `<p>工程中的三个实践：</p>
<ul>
<li><strong>通信协议</strong>：用 <code>pack(1)</code> 或手工序列化，且解析时用 <code>buf[0] | buf[1]&lt;&lt;8</code> 的方式读取，天然规避端序和对齐问题；</li>
<li><strong>DMA 缓冲区</strong>：必须按 4 字节对齐，否则某些型号直接报传输错误；</li>
<li><strong>减小 RAM</strong>：把 <code>uint8_t</code> 标志位集中放置，或直接用位域/位带合并，能省下可观的填充空间。</li>
</ul>`,
        pitfalls: [
          "<b>用 memcmp 比较结构体。</b>填充字节内容不确定，即使成员全相等也可能返回不等。应逐成员比较。",
          "<b>把接收缓冲区强转成结构体指针。</b>除了对齐问题，还会踩到端序和编译器差异，换一个型号就跑不通。",
          "<b>以为 pack(1) 只有好处。</b>它会让所有成员访问变慢，在某些内核上直接异常，只在确实需要紧凑布局时使用，并加注释说明。"
        ],
        follow: [
          [
            "如何在不改变成员顺序的情况下减小结构体？",
            "用位域合并布尔标志，用 <code>uint8_t</code> 代替 <code>int</code> 表示小范围数值，或把相邻的小成员打包进一个整型再手动移位访问。也可以调整顺序让填充最少。"
          ],
          [
            "位域的对齐和布局是怎样的？",
            "位域的布局由编译器实现定义，不同编译器对分配方向（从低位还是高位开始）可能不同，跨平台通信时不能用位域直接映射协议。同一位域不能跨存储单元，放不下时会另起一个单元。"
          ],
          [
            "为什么 DMA 缓冲区要求对齐？",
            "DMA 控制器按字或半字搬运，起始地址不对齐会导致首尾字节错位；部分型号的 FIFO 还要求地址按 burst 长度对齐，否则传输被拆分成多次，效率下降甚至触发错误标志。"
          ],
          [
            "如何知道结构体成员的真实偏移？",
            "用 <code>offsetof(struct S, member)</code>，它在编译期求值，配合 <code>_Static_assert</code> 可以在编译阶段校验协议结构体布局是否符合预期。"
          ]
        ]
      },

      /* ---------------- C-06 ---------------- */
      {
        id: "C-06",
        chapter: "pointer",
        topic: "mem-region",
        title: "堆和栈有什么区别？嵌入式为什么尽量不用 malloc？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "分配方式、增长方向、生命周期、碎片与实时性，是理解 MCU 内存布局的入口。",
        q: `<p>面试官：<strong>堆和栈有什么区别？</strong>在你的项目里，什么情况下会用 malloc？为什么很多嵌入式规范禁止动态内存？</p>`,
        exam: `<p>考察对内存模型的整体认识，以及工程判断力。能说出“栈向下增长、满递减”“堆向上增长、由 malloc 管理”“栈溢出会踩到 .bss 或堆”这些具体细节，说明你调试过真实问题；能说出 MISRA C 和静态分配方案，说明你有规范意识。</p>`,
        core: `<p>栈由编译器管理，函数进出自动分配释放，存局部变量、参数、返回地址，速度快但只有几 KB，Cortex-M 上满递减。</p><p>堆由 <code>malloc/free</code> 手动管理，灵活但慢，会产生碎片，分配耗时不确定。嵌入式尽量不用：长期运行后可能分配失败、破坏实时性、堆大小链接时就固定。</p><p>替代方案：编译期确定的用静态数组，变长的用固定块内存池，分配释放 O(1) 且不碎片化。</p>`,
        answer: `<p>栈由编译器管理，函数调用时自动分配、返回时自动释放，存放局部变量、函数参数、返回地址和寄存器现场。它速度快，就是一条压栈指令，但空间很小，通常几 KB。在 Cortex-M 上栈是<strong>满递减</strong>的，从高地址往低地址长。</p>
<p>堆由程序员通过 malloc/free 手动管理，空间来自一段预留的 RAM 区，通常从低地址往高地址长。它灵活但慢，而且会产生<strong>内存碎片</strong>：反复分配释放不同大小的块之后，总空闲量够但找不到连续的大块，分配就会失败。</p>
<p>嵌入式里尽量不用 malloc 有三个原因：一是碎片导致长期运行后分配失败，这种故障往往在设备跑了几小时后才出现；二是分配耗时不确定，破坏实时性；三是堆大小在链接时就固定了，估计不足只能改代码重新烧写。</p>
<p>我的做法是：能在编译期确定的全用静态数组或内存池；确实需要动态的（比如协议帧长度可变）用固定块大小的内存池，分配和释放都是 O(1)，不会碎片化。</p>`,
        principle: `<p>典型 MCU 的 RAM 布局从低到高是：<code>.data</code>（已初始化全局）、<code>.bss</code>（未初始化全局）、堆（向上）、……空闲……、栈（向下）。两者相向增长，一旦相遇就是栈溢出或堆溢出，表现为莫名其妙的变量被改写。</p>
<p>栈的大小在启动文件或链接脚本里配置（<code>Stack_Size EQU 0x400</code>），启动时把 MSP 设置为栈顶。RTOS 下每个任务还有自己的栈，从堆里静态或动态划分。</p>`,
        fig: {
          type: "memmap",
          title: "STM32 典型 RAM 布局（向下为低地址）",
          tag: "memory map",
          rows: [
            { name: ".data", text: "已初始化全局/静态变量（启动时从 Flash 拷贝）", addr: "0x2000_0000 ↑", cls: "a" },
            { name: ".bss", text: "未初始化全局/静态变量（启动时清零）", addr: "", cls: "b" },
            { name: "heap", text: "malloc 区，向上增长 →", addr: "sbrk", cls: "c" },
            { name: "free", text: "空闲区（栈堆相向增长，相遇即溢出）", addr: "", cls: "e" },
            { name: "stack", text: "← 向下增长，MSP 初始指向栈顶", addr: "0x2000_5000", cls: "d" }
          ],
          note: "实际地址取决于芯片型号与链接脚本，图中数值仅示意。"
        },
        code: {
          lang: "c",
          title: "stack_overflow.c",
          src: `/* 反例：大数组放在栈上，直接吃掉 2KB 栈空间 */
void parse_frame(void)
{
    uint8_t buf[2048];        /* 栈只有 1KB 时，函数一进来就溢出 */
    Uart_Read(buf, sizeof(buf));
    /* ... */
}

/* 正例 1：改为静态缓冲区（只在本模块用） */
static uint8_t s_frame_buf[2048];

void parse_frame_fixed(void)
{
    Uart_Read(s_frame_buf, sizeof(s_frame_buf));
}

/* 正例 2：固定块内存池，分配/释放 O(1)，无碎片 */
#define POOL_BLOCK_SIZE   64
#define POOL_BLOCK_COUNT  8

static uint8_t  s_pool[POOL_BLOCK_COUNT][POOL_BLOCK_SIZE];
static uint8_t  s_used[POOL_BLOCK_COUNT];

void *pool_alloc(void)
{
    for (int i = 0; i < POOL_BLOCK_COUNT; i++) {
        if (!s_used[i]) { s_used[i] = 1; return s_pool[i]; }
    }
    return NULL;              /* 分配失败要显式处理，而不是崩溃 */
}

void pool_free(void *p)
{
    for (int i = 0; i < POOL_BLOCK_COUNT; i++) {
        if (p == s_pool[i]) { s_used[i] = 0; return; }
    }
}`
        },
        apply: `<p>判断标准很简单：<strong>生命周期是否可预测</strong>。可预测就用静态分配；不可预测但大小固定，用内存池；只有大小和生命周期都不可预测时才考虑 malloc，并且要在系统设计阶段就估算最坏情况下的峰值占用。</p>
<p>调试栈溢出最有效的手段是启动时把栈区填成 <code>0xA5</code>，运行一段时间后检查末尾还有多少未被改写，就能算出实际栈峰值（stack painting）。</p>`,
        pitfalls: [
          "<b>在中断里调用 malloc。</b>堆管理通常不可重入，且执行时间不确定，会破坏中断响应时间，甚至直接死锁。",
          "<b>大数组放栈上。</b>局部数组超过栈大小会静默覆盖相邻内存，现象是“某个无关全局变量莫名其妙变了”。",
          "<b>free 之后继续使用指针。</b>这块内存可能已被重新分配，写入会破坏别人的数据，属于最难定位的一类 bug。"
        ],
        follow: [
          [
            "栈溢出会有什么现象？如何检测？",
            "轻则局部变量被改写、函数返回地址被覆盖导致跑飞，重则直接 HardFault。检测方法：启动时填充魔数定期检查、在栈末尾放保护字（canary）、用 MPU 设置栈保护区，或使用 RTOS 提供的栈高水位接口。"
          ],
          [
            "malloc 和 calloc、realloc 的区别？",
            "<code>malloc</code> 只分配不初始化；<code>calloc</code> 分配并清零，适合数组；<code>realloc</code> 调整已分配块大小，可能搬迁到新地址并拷贝数据，返回值必须重新赋值，失败时返回 NULL 且原指针仍有效。"
          ],
          [
            "什么是内存碎片？如何避免？",
            "外部碎片是空闲块总量足够但没有足够大的连续块；内部碎片是分配块大于实际需求造成的浪费。避免方法：固定大小内存池、按 2 的幂分级分配、避免频繁申请释放、把动态分配集中到初始化阶段。"
          ]
        ]
      },

      /* ---------------- C-07 ---------------- */
      {
        id: "C-07",
        chapter: "pointer",
        topic: "mem-region",
        title: "野指针、空指针、悬空指针有什么区别？如何避免？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "三类指针错误的成因与防护手段，是代码健壮性的基本功。",
        q: `<p>面试官：<strong>野指针、空指针、悬空指针</strong>分别是什么？在你的代码里怎么避免？如果线上设备偶发 HardFault，怀疑是野指针，你会怎么定位？</p>`,
        exam: `<p>这题的关键不是定义，而是<strong>防护习惯</strong>和<strong>定位手段</strong>。能说出“定义即初始化、释放即置空、入参先判空、用 MPU 或填充法定位”，说明你写过需要长期稳定运行的代码。</p>`,
        core: `<p>野指针从未初始化，指向随机地址；空指针明确为 <code>NULL</code>，本身安全，危险的是不判空就解引用；悬空指针是所指对象已释放或失效——<code>free</code> 后没置空、指向已退栈的局部变量。</p><p>避免四条：定义即初始化、<code>free</code> 后立即置 <code>NULL</code>、入参与返回值使用前判空、不返回局部变量地址。</p>`,
        answer: `<p>三个概念的区别在“指针指向哪里”：</p>
<p><strong>野指针</strong>是从来没被初始化过的指针，它的值是一个随机地址，解引用等于随机写内存。</p>
<p><strong>空指针</strong>是明确赋值为 NULL 的指针，表示“不指向任何对象”。它本身是安全的，危险的是不判空就解引用。</p>
<p><strong>悬空指针</strong>是曾经有效、但所指对象已经释放或失效的指针，比如 free 之后没置空的指针，或者指向函数局部变量、函数返回后栈帧被回收的地址。</p>
<p>避免办法是四条：定义时就初始化，不确定就赋 NULL；free 之后立刻置 NULL；函数入参和返回值使用前都判空；不要返回局部变量的地址。</p>
<p>定位偶发 HardFault 时，我会先看 LR 和栈里的返回地址，确定出错函数，再检查该函数里所有指针的来源；同时可以在初始化时把整块空闲内存填成固定魔数，观察被破坏的区域反推是哪个指针越界。</p>`,
        principle: `<p>C 语言没有运行期的指针有效性检查。指针本质上只是一个整数，编译器无法知道它指向的内存是否合法。所以三类错误的共同点是：<strong>语法完全合法，行为未定义</strong>。</p>
<p>在 Cortex-M 上，访问未映射的地址会触发 <code>HardFault</code>（本质是总线错误），此时 <code>SCB-&gt;CFSR</code> 会给出具体原因（如 <code>PRECISERR</code> 表示数据访问错误），<code>BFAR</code> 给出出错地址。这是定位野指针最直接的硬件线索。至于非对齐访问，Cortex-M3/M4/M7 的普通 <code>LDR/STR</code> 由硬件透明处理，只有 M0/M0+ 或开了 UNALIGN_TRP 时才产生异常，且属于 UsageFault，不能和“未映射地址”混为一谈。</p>`,
        code: {
          lang: "c",
          title: "dangling.c",
          src: `#include <stdlib.h>
#include <string.h>

/* 错误 1：返回局部数组地址，函数返回后栈帧失效 */
char *bad_get_name(void)
{
    char name[16] = "sensor";
    return name;                 /* 悬空指针 */
}

/* 正确：由调用者提供缓冲区，生命周期清晰 */
void good_get_name(char *out, size_t len)
{
    if (!out || len == 0) return;    /* 防御 len == 0 时 len - 1 回绕 */
    strncpy(out, "sensor", len - 1);
    out[len - 1] = '\\0';
}

/* 错误 2：free 后继续使用 */
void bad_free(void)
{
    char *p = malloc(32);
    if (!p) return;
    free(p);
    /* p 现在是悬空指针，再写就是破坏堆管理结构 */
}

/* 正确：释放即置空，使用前判空 */
void good_free(void)
{
    char *p = malloc(32);
    if (!p) return;

    strcpy(p, "ok");
    free(p);
    p = NULL;

    if (p != NULL) {             /* 防御性判断 */
        strcpy(p, "again");
    }
}`
        },
        apply: `<p>三个工程习惯值得坚持：一是所有指针定义时初始化；二是所有对外接口的第一行都做参数校验，非法直接返回错误码而不是继续执行；三是关键模块的内存池在初始化时填充 <code>0xCD</code>，出问题时看内存快照就能判断是“未初始化使用”还是“越界写”。</p>
<p>如果芯片支持 MPU，可以把 NULL 附近的一段地址设为不可访问，这样空指针解引用会立刻 HardFault，而不是悄悄写坏数据——把隐性 bug 变成显性崩溃，是提升可维护性的重要手段。</p>`,
        pitfalls: [
          "<b>以为 free 会把指针置空。</b>free 只释放内存，形参是值传递，调用者的指针依然指向原地址。必须手动置 NULL。",
          "<b>只判断了指针非空就认为安全。</b>非空不代表有效，悬空指针和野指针都可能非空。判空只是最低成本的防护。",
          "<b>返回局部变量的地址。</b>函数返回后栈帧会被后续调用覆盖，这块内存随时可能变成别的数据，而且往往在“加了打印之后就好了”。"
        ],
        follow: [
          [
            "为什么加了 printf 之后 bug 就消失了？",
            "这是典型的内存相关未定义行为。printf 会改变栈布局和寄存器分配，把原本被覆盖的地址挪到了安全位置，所以现象消失但问题仍在。这类“海森堡 bug”基本可以断定是越界或悬空指针。"
          ],
          [
            "如何检测内存越界写？",
            "常用手段：在缓冲区前后放哨兵字节定期校验；用 MPU 把缓冲区边界设为保护页；用静态分析工具；或者在 PC 上用 AddressSanitizer 跑同一份逻辑代码。"
          ],
          [
            "空指针解引用一定会崩溃吗？",
            "不一定。地址 0 如果映射了合法内存（某些 MCU 的启动区就在 0 地址），读操作可能正常返回，写操作可能悄悄改掉向量表。所以不能依赖“崩了才是有 bug”。"
          ]
        ]
      },

      /* ---------------- C-08 ---------------- */
      {
        id: "C-08",
        chapter: "pointer",
        topic: "ptr-func",
        title: "函数指针怎么定义和使用？回调函数在驱动里怎么设计？",
        diff: "中级",
        freq: "中频",
        type: "代码分析题",
        point: "函数指针语法、typedef 简化、表驱动与回调注册，是解耦和状态机的核心工具。",
        q: `<p>面试官：请写出一个函数指针的定义，并用它实现<strong>命令解析表</strong>。如果让你设计一个串口接收回调，接口应该怎么定？</p>`,
        exam: `<p>函数指针是嵌入式 C 的分水岭。会写语法只是及格；能用它做表驱动、做驱动 ops 结构、做回调注册，并且知道回调里不能做耗时操作、要注意上下文（中断还是任务），才是面试官想听的。</p>`,
        core: `<p>定义形式是 <code>返回类型 (*名字)(参数表)</code>，工程上一律 <code>typedef</code>：<code>typedef int (*calc_fn)(int,int);</code>。</p><p>三个用途：回调（底层收到数据调上层注册的函数）、表驱动（命令表代替长 <code>if-else</code>）、ops 结构（同一套上层代码适配不同硬件）。</p><p>串口回调接口：<code>void (*on_frame)(const uint8_t *data, uint16_t len, void *ctx)</code>，带上下文指针避免全局变量；并约定回调在中断上下文执行，不能阻塞、不能睡眠。</p>`,
        answer: `<p>函数指针的定义是 <code>返回类型 (*指针名)(参数列表)</code>，比如 <code>int (*fp)(int, int)</code>。因为声明语法可读性差，工程上一律用 typedef：<code>typedef int (*calc_fn)(int, int);</code>，之后就可以像普通类型一样使用。</p>
<p>它最常见的三个用途：一是<strong>回调</strong>，底层驱动收到数据后调用上层注册的函数，实现方向反转的解耦；二是<strong>表驱动</strong>，把命令字符串和对应的处理函数放进数组，用查表替代一长串 if-else；三是<strong>虚函数表</strong>式的 ops 结构，让同一套上层代码适配不同硬件。</p>
<p>设计串口回调时，我会把接口定为 <code>void (*on_frame)(const uint8_t *data, uint16_t len, void *ctx)</code>，多带一个上下文指针，避免用全局变量传递实例。同时明确约定：回调在中断上下文执行，不能阻塞、不能调用可能睡眠的接口，重活要投递到任务里做。</p>`,
        principle: `<p>函数指针保存的是函数入口地址。在 Cortex-M 上，函数地址的最低位如果是 1，表示 Thumb 状态，编译器会自动处理 <code>BX</code> 跳转时的状态位，不需要手工干预。</p>
<p>表驱动相比 if-else 链的优势不只是“看起来优雅”：它的查找是 O(n) 的数组遍历但每次比较成本极低，而且新增命令只需加一行表项，不用改动控制流，降低了回归风险。配合 <code>const</code> 放到 Flash，还不占 RAM。</p>`,
        code: {
          lang: "c",
          title: "cmd_table.c",
          src: `#include <string.h>
#include <stdio.h>

/* 1. 用 typedef 定义回调类型，接口一目了然 */
typedef void (*cmd_handler_t)(const char *arg);
typedef void (*uart_rx_cb_t)(const uint8_t *data, uint16_t len, void *ctx);

/* 2. 具体处理函数 */
static void cmd_led(const char *arg)
{
    if (strcmp(arg, "on") == 0)       Led_On();
    else if (strcmp(arg, "off") == 0) Led_Off();
}

static void cmd_reset(const char *arg)
{
    (void)arg;
    NVIC_SystemReset();
}

/* 3. 命令表：字符串 → 函数，const 放 Flash */
typedef struct {
    const char   *name;
    cmd_handler_t handler;
    const char   *help;
} cmd_entry_t;

static const cmd_entry_t s_cmd_table[] = {
    { "led",   cmd_led,   "led on|off" },
    { "reset", cmd_reset, "reset mcu" },
};

/* 4. 查表分发，新增命令只加表项 */
void shell_exec(const char *line)
{
    char name[16] = {0};
    const char *arg = "";
    const char *sp = strchr(line, ' ');

    if (sp) {
        size_t n = (size_t)(sp - line);
        if (n >= sizeof(name)) n = sizeof(name) - 1;
        memcpy(name, line, n);
        arg = sp + 1;
    } else {
        strncpy(name, line, sizeof(name) - 1);
    }

    for (size_t i = 0; i < sizeof(s_cmd_table) / sizeof(s_cmd_table[0]); i++) {
        if (strcmp(name, s_cmd_table[i].name) == 0) {
            s_cmd_table[i].handler(arg);
            return;
        }
    }
    printf("unknown cmd: %s\\n", name);
}

/* 5. 带上下文的回调注册：避免全局变量 */
static uart_rx_cb_t s_rx_cb;
static void        *s_rx_ctx;

void Uart_RegisterRxCallback(uart_rx_cb_t cb, void *ctx)
{
    s_rx_cb  = cb;
    s_rx_ctx = ctx;
}

void USART1_IRQHandler(void)
{
    uint8_t byte = USART1->DR;
    if (s_rx_cb) {
        s_rx_cb(&byte, 1, s_rx_ctx);   /* 中断上下文：必须短小 */
    }
}`
        },
        codeNote: `<b>注意：</b>回调在中断里执行，函数内部不能调用 <code>printf</code>、不能 <code>malloc</code>、不能等待信号量。如果业务复杂，回调里只做“拷贝到环形缓冲区 + 置标志/发信号量”，真正的解析放到任务里。`,
        apply: `<p>驱动分层里，函数指针是实现“上层不依赖下层”的关键。比如 <code>sensor_ops_t</code> 里放 <code>init/read/sleep</code> 三个函数指针，应用层只依赖 ops 结构，换传感器型号只需要换一份 ops 实现，应用代码一行不改。</p>
<p>另一个高频场景是状态机：用 <code>state_fn table[]</code> 把状态和函数对应起来，比巨大的 switch 更好维护，也便于用工具生成。</p>`,
        pitfalls: [
          "<b>忘记 typedef 导致语法错误。</b><code>typedef void (*cb)(void)</code> 与 <code>void (*cb)(void)</code> 只差一个 typedef，前者是类型，后者是变量定义。",
          "<b>回调里做耗时操作。</b>如果回调在中断上下文，长耗时会导致其他中断被延迟、通信丢包。",
          "<b>不判空就调用函数指针。</b>未注册时直接跳转到 0 地址或随机地址，HardFault 且难以定位。调用前必须判空。"
        ],
        follow: [
          [
            "函数指针和指针函数有什么区别？",
            "函数指针是指向函数的指针变量，如 <code>int (*p)(int)</code>；指针函数是返回指针的函数，如 <code>int *f(int)</code>。区别在于 <code>*</code> 和函数名谁先结合。"
          ],
          [
            "中断向量表是怎么实现的？",
            "启动文件里定义一个函数指针数组，放在 <code>.isr_vector</code> 段并定位到 Flash 起始地址。硬件响应中断时，从 <code>0xE000ED04</code> 取异常号，再到向量表偏移处取出处理函数地址并跳转。"
          ],
          [
            "函数指针数组和 switch 相比有什么优劣？",
            "表驱动新增分支不改控制流、代码更紧凑、便于生成；但每次调用多一次间接跳转，且表本身占用 Flash。分支很少（2~3 个）时 switch 更直接，分支多且需要扩展时表驱动更好。"
          ]
        ]
      },

      /* ---------------- C-09 ---------------- */
      {
        id: "C-09",
        chapter: "types",
        topic: "bit",
        title: "如何用位运算操作寄存器？有哪些坑？",
        diff: "初级",
        freq: "高频",
        type: "工程应用题",
        point: "置位、清位、取反、读位的标准写法，以及读-改-写竞态与 1<<31 的未定义行为。",
        q: `<p>面试官：<strong>怎么把寄存器的第 3 位置 1、清 0、翻转？</strong>如果要同时操作多个位呢？写寄存器时要注意什么？</p>`,
        exam: `<p>这是嵌入式最基础的动手能力。除了语法，面试官会追问“读-改-写是否原子”“为什么用 BSRR”“1&lt;&lt;31 有什么问题”，这些才是真实项目里踩过的坑。</p>`,
        core: `<p>置位 <code>reg |= (1U&lt;&lt;n)</code>，清零 <code>reg &amp;= ~(1U&lt;&lt;n)</code>，翻转 <code>reg ^= (1U&lt;&lt;n)</code>，读位 <code>(reg&gt;&gt;n)&amp;1U</code>；多位先清后或：<code>reg = (reg &amp; ~MASK) | (val &lt;&lt; shift)</code>。</p><p>三个坑：常量带 <code>U</code>，<code>1&lt;&lt;31</code> 是有符号左移；读改写不是原子操作，中断也改同一寄存器要用 BSRR 或关中断；外设寄存器必须经 <code>volatile</code> 指针访问。</p>`,
        answer: `<p>标准写法是四个：置位用 <code>reg |= (1U &lt;&lt; n)</code>；清零用 <code>reg &amp;= ~(1U &lt;&lt; n)</code>；翻转用 <code>reg ^= (1U &lt;&lt; n)</code>；读某一位用 <code>(reg &gt;&gt; n) &amp; 1U</code>。</p>
<p>多位操作用掩码：先清掉目标位再或上新值，也就是 <code>reg = (reg &amp; ~MASK) | (val &lt;&lt; shift)</code>，这个模式叫 read-modify-write。</p>
<p>要注意三点：第一，常量一定要带 <code>U</code>，<code>1 &lt;&lt; 31</code> 是有符号左移，属于未定义行为；第二，读-改-写不是原子操作，如果中断里也在改同一个寄存器，会丢更新，这种情况要用硬件提供的原子置位寄存器（比如 STM32 的 BSRR）或者关中断；第三，外设寄存器必须通过 volatile 指针访问，否则编译器可能把多次写合并。</p>`,
        principle: `<p>为什么 <code>1 &lt;&lt; 31</code> 是未定义行为？在 32 位平台上 <code>1</code> 是 <code>int</code>，左移 31 位后符号位为 1，C 标准规定有符号数左移溢出是未定义行为。实际多数编译器会得到 <code>0x80000000</code>，但优化时可能产生意外结果。正确写法是 <code>1U &lt;&lt; 31</code> 或 <code>0x80000000UL</code>。</p>
<p>BSRR 之所以能解决竞态，是因为它是“只写”寄存器：写 1 到低 16 位置位，写 1 到高 16 位清零，硬件内部完成原子操作，不需要先读回当前值。这比 <code>GPIOA-&gt;ODR |= BIT</code> 安全得多。</p>`,
        code: {
          lang: "c",
          title: "reg_bits.c",
          src: `#include <stdint.h>

#define BIT(n)        (1UL << (n))
#define MASK(w, s)    (((1UL << (w)) - 1UL) << (s))

/* 基础操作 */
#define REG_SET(reg, n)      ((reg) |=  BIT(n))
#define REG_CLR(reg, n)      ((reg) &= ~BIT(n))
#define REG_TOG(reg, n)      ((reg) ^=  BIT(n))
#define REG_GET(reg, n)      (((reg) >> (n)) & 1UL)

/* 位段写入：先清后写，避免影响同寄存器其他位 */
static inline void reg_write_field(volatile uint32_t *reg,
                                   uint32_t width, uint32_t shift, uint32_t val)
{
    uint32_t m = MASK(width, shift);
    *reg = (*reg & ~m) | ((val << shift) & m);
}

/* 反例：|= 是读-改-写，不是原子操作；另外 (1 << 31) 会溢出有符号 int，应写 1UL */
void bad_set_pin13(void)
{
    GPIOA->ODR |= (1 << 13);          /* 中断同时改 ODR 时会丢更新 */
}

/* 正例：BSRR 写 1 置位，硬件原子完成，无需读回 */
void good_set_pin13(void)
{
    GPIOA->BSRR = (1UL << 13);        /* 低 16 位：置位 */
}

/* 正例：BRR（或 BSRR 高 16 位）写 1 清零，同样是原子的 */
void good_reset_pin13(void)
{
    GPIOA->BSRR = (1UL << (13 + 16)); /* 高 16 位：清零 */
}

/* 判断是否为 2 的幂：只有一个 1 */
static inline int is_power_of_two(uint32_t x)
{
    return x && !(x & (x - 1));
}

/* 统计二进制中 1 的个数（Brian Kernighan 算法） */
static inline int popcount(uint32_t x)
{
    int n = 0;
    while (x) { x &= (x - 1); n++; }
    return n;
}`
        },
        apply: `<p>配置外设时，位段写入是最容易出错的地方。典型 bug 是“改了一个位，结果另一个功能失灵”，原因是没先清掩码，或者用了 <code>|=</code> 而没考虑复位默认值。规范做法是：每个位段都用“读—清—写”三步，并封装成 inline 函数，避免手写时漏掉取反。</p>
<p>另一个实践是给寄存器位定义命名常量，不要直接写 <code>0x00000004</code>，可读性和可维护性差别巨大。</p>`,
        pitfalls: [
          "<b><code>1 &lt;&lt; 31</code> 不带 U。</b>有符号左移溢出属于未定义行为，开高优化时可能被优化掉。",
          "<b>用 <code>|=</code> 修改需要“清位”的字段。</b>旧值残留会导致配置错误，必须先 <code>&amp;= ~mask</code>。",
          "<b>忽略读-改-写的原子性。</b>主循环和中断同时改同一寄存器会丢更新，应使用 BSRR 或临界区保护。"
        ],
        follow: [
          [
            "如何在不引入临时变量的情况下交换两个数？",
            "<code>a ^= b; b ^= a; a ^= b;</code>。但要注意如果 a 和 b 是同一个变量（或同一地址），会被清零，所以工程上更推荐用临时变量，可读性更好且编译器优化后效率相同。"
          ],
          [
            "如何判断一个整数的某几位是否为特定值？",
            "先移位再用掩码比较：<code>((reg &gt;&gt; shift) &amp; MASK) == expect</code>。不要写成 <code>(reg &amp; MASK) == expect</code>，除非 expect 已经左移对齐。"
          ],
          [
            "位域和位运算操作寄存器哪个好？",
            "位域可读性好，但布局由编译器决定，跨平台和跨编译器不可移植，且某些内核上位域访问会被编译成非原子的读改写。操作硬件寄存器建议用位运算宏或厂商提供的结构体定义，并配合 BSRR 等原子寄存器。"
          ]
        ]
      },

      /* ---------------- C-10 ---------------- */
      {
        id: "C-10",
        chapter: "types",
        topic: "endian",
        title: "什么是大端和小端？如何用代码判断？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "字节序概念、判断方法，以及协议解析中为什么不能直接强转结构体。",
        q: `<p>面试官：<strong>什么是大端和小端？</strong>写一段代码判断当前机器是哪一种。如果两个设备端序不同，通信时怎么处理？</p>`,
        exam: `<p>端序是跨平台通信的必踩坑。会写判断代码只是入门，能说清“网络字节序是大端”“STM32 是小端”“协议里多字节字段要按约定序列化”，才算真正理解。</p>`,
        core: `<p>大端把高字节放低地址（人类阅读顺序），小端把低字节放低地址；<code>0x12345678</code> 在内存里分别是 <code>12 34 56 78</code> 和 <code>78 56 34 12</code>。</p><p>判断用 <code>union { uint16_t v; uint8_t b[2]; }</code> 赋 1，看 <code>b[0]</code> 是否为 1。协议必须规定字节序（通常用大端/网络序），收发用 <code>htons/htonl</code> 转换，别把接收缓冲直接强转成结构体。</p>`,
        answer: `<p>端序说的是<strong>多字节数据在内存中的存放顺序</strong>。大端把高字节放在低地址，也就是“人类阅读顺序”；小端把低字节放在低地址。</p>
<p>举例：<code>0x12345678</code> 存放在地址 0x1000，大端是 <code>12 34 56 78</code>，小端是 <code>78 56 34 12</code>。</p>
<p>判断方法最常用的是 union：定义一个 <code>uint16_t</code> 赋值为 1，看第一个字节是不是 1，是就是小端。也可以用指针强制转换，效果一样。</p>
<p>通信时的原则是：<strong>协议必须规定字节序</strong>，通常统一用大端（网络字节序）。发送前用 <code>htons/htonl</code> 或手工移位转成大端，接收后再转回本机序。绝对不要把接收缓冲区直接强转成结构体指针，那样既受端序影响，也受对齐影响。</p>`,
        principle: `<p>ARM Cortex-M 默认小端。少数型号在芯片设计阶段可以选择 BE8 大端，但端序在综合时就已经固定，软件无法在运行期切换——<code>AIRCR.ENDIANNESS</code> 是只读状态位，只能用来读取当前端序，不能写入。所以“ARM 一定是小端”并不严谨，但“软件可以把 ARM 改成大端”同样是错的。x86 是小端，PowerPC 和部分网络处理器是大端。</p>
<p>端序只影响<strong>多字节标量</strong>的内存布局，不影响数组顺序、不影响字符串、不影响结构体成员的排列顺序（但会影响每个多字节成员的内部字节序）。</p>`,
        fig: {
          type: "table",
          title: "0x12345678 在两种端序下的内存布局",
          tag: "endian",
          head: ["地址", "0x1000", "0x1001", "0x1002", "0x1003"],
          rows: [
            ["大端（Big-Endian）", "0x12", "0x34", "0x56", "0x78"],
            ["小端（Little-Endian）", "0x78", "0x56", "0x34", "0x12"]
          ]
        },
        code: {
          lang: "c",
          title: "endian.c",
          src: `#include <stdint.h>

/* 方法 1：union 共享内存，最直观 */
static inline int is_little_endian(void)
{
    union {
        uint16_t v;
        uint8_t  b[2];
    } u = { .v = 0x0001 };
    return u.b[0] == 0x01;
}

/* 方法 2：指针强转，效果等价（严格来说依赖对象表示） */
static inline int is_little_endian_ptr(void)
{
    uint16_t v = 0x0001;
    return *(uint8_t *)&v == 0x01;
}

/* 手工序列化：与端序无关，协议解析的标准做法 */
static inline void put_u32_be(uint8_t *buf, uint32_t v)
{
    buf[0] = (uint8_t)(v >> 24);
    buf[1] = (uint8_t)(v >> 16);
    buf[2] = (uint8_t)(v >> 8);
    buf[3] = (uint8_t)(v);
}

static inline uint32_t get_u32_be(const uint8_t *buf)
{
    return ((uint32_t)buf[0] << 24) | ((uint32_t)buf[1] << 16) |
           ((uint32_t)buf[2] << 8)  |  (uint32_t)buf[3];
}

/* 32 位字节序翻转，也可用 __REV 内建指令（Cortex-M3 以上） */
static inline uint32_t swap32(uint32_t v)
{
    return ((v & 0x000000FFU) << 24) | ((v & 0x0000FF00U) << 8) |
           ((v & 0x00FF0000U) >> 8)  | ((v & 0xFF000000U) >> 24);
}`
        },
        apply: `<p>做 Modbus、CAN 自定义协议、文件格式解析时，端序必须写进协议文档。我的习惯是：<strong>所有跨设备传输的多字节字段都用大端</strong>，在代码里统一用 <code>put_u16_be/get_u16_be</code> 这类函数，谁也不用记“这个字段是高字节在前还是低字节在前”。</p>
<p>如果是同一块板子内部共享内存（比如双核通信），则要显式约定，并且注意编译器不会帮你转换，需要用 <code>__REV</code> 或手工移位。</p>`,
        pitfalls: [
          "<b>把接收缓冲区强转成结构体。</b>端序 + 对齐 + 编译器差异三重风险，换平台必挂。",
          "<b>认为 ARM 一定是小端。</b>Cortex-M 支持配置为大端模式，代码里应该用运行期判断或编译期宏，而不是硬编码假设。",
          "<b>用位域映射协议字段。</b>位域的分配方向和端序都由实现定义，不同编译器结果不同，跨设备通信必然出问题。"
        ],
        follow: [
          [
            "htons/htonl 在单片机上能用吗？",
            "能用，但需要引入网络协议栈的头文件。裸机项目通常自己写 <code>put_u16_be</code> 之类的函数，避免为一个宏引入整个 lwIP 依赖。注意 <code>htons</code> 在小端机器上才会真正翻转，在大端机器上是空操作。"
          ],
          [
            "浮点数怎么传输？",
            "不要直接发送 float 的字节，应该先按 IEEE 754 转成 uint32 再按约定端序发送，接收端再转回。也可以用定点数（乘以 100 存成 int32），避免浮点表示差异和精度问题。"
          ],
          [
            "结构体里有 char 和 int，直接 memcpy 发送会有什么问题？",
            "填充字节的内容不确定，会把栈上的垃圾数据发出去（既浪费带宽也可能泄露信息）；不同编译器的对齐规则可能不同，接收端解析会错位。正确做法是逐字段序列化到字节缓冲区。"
          ]
        ]
      },

      /* ---------------- C-11 ---------------- */
      {
        id: "C-11",
        chapter: "keywords",
        topic: "macro",
        title: "宏定义有哪些常见陷阱？如何写出安全的宏？",
        diff: "中级",
        freq: "中频",
        type: "代码分析题",
        point: "参数求值、副作用、优先级、多语句宏，以及宏与 inline/const 的取舍。",
        q: `<p>面试官：下面这个宏有什么问题？怎么改？</p>
<pre><code>#define SQUARE(x) x * x
#define MAX(a, b) ((a) > (b) ? (a) : (b))</code></pre>
<p>再问：多语句宏为什么要用 <code>do { } while (0)</code> 包起来？</p>`,
        exam: `<p>考察对预处理“纯文本替换”本质的理解。能不能说出“宏没有类型检查、参数会被多次求值、副作用会翻倍”，以及“能用 inline 就别用宏”，是区分“会写”和“写得好”的关键。</p>`,
        core: `<p><code>SQUARE(1+2)</code> 展开成 <code>1+2*1+2</code> 得 5；参数出现两次，<code>SQUARE(i++)</code> 还会自增两次。</p><p>安全写法：参数和整体都加括号 <code>#define SQUARE(x) ((x)*(x))</code>，但这只解决优先级、解决不了副作用，优先用 <code>static inline</code> 函数；多语句宏必须用 <code>do { ... } while (0)</code> 包成一条语句。</p>`,
        answer: `<p><code>SQUARE(x)</code> 有两个问题：一是没加括号，<code>SQUARE(1+2)</code> 展开成 <code>1+2*1+2</code> 得 5；二是参数出现两次，<code>SQUARE(i++)</code> 会让 i 自增两次，属于未定义行为。</p>
<p>正确写法是 <code>#define SQUARE(x) ((x) * (x))</code>，但这仍然解决不了副作用问题，所以更好的做法是写成 <code>static inline</code> 函数。</p>
<p><code>MAX</code> 虽然加了括号，但 <code>MAX(i++, j++)</code> 依然会让其中一个自增两次——因为三元运算符只求值一个分支，但条件里比较时两个都求值了，被选中的那个又求值一次。</p>
<p>多语句宏必须用 <code>do { ... } while (0)</code> 包起来，原因是它展开后仍然是一条语句，可以安全地放在 <code>if</code> 后面而不加大括号；如果用 <code>{ }</code> 直接包，<code>if (c) MACRO(); else ...</code> 会因多余分号导致编译错误。</p>`,
        principle: `<p>预处理器在编译之前工作，它不理解类型、作用域和表达式结构，只做记号替换。这带来三个必然的坑：</p>
<ul>
<li><strong>优先级</strong>：替换后的表达式按新上下文重新结合，必须给每个参数和整体加括号；</li>
<li><strong>多次求值</strong>：参数在宏体里出现几次就被求值几次，带副作用的实参会重复执行；</li>
<li><strong>无类型检查</strong>：<code>MAX("a", 1)</code> 也能通过预处理，错误要到编译后期才暴露，报错信息还很难读。</li>
</ul>
<p>现代 C 的做法是：能内联就用 <code>static inline</code>（有类型检查、参数只求值一次、可调试），宏只保留给条件编译、字符串化、以及需要类型泛型的场景。</p>`,
        code: {
          lang: "c",
          title: "macro_safe.c",
          src: `#include <stdint.h>

/* 危险版本：无括号 + 参数重复求值 */
#define BAD_SQUARE(x)   x * x
#define BAD_MAX(a, b)   ((a) > (b) ? (a) : (b))

/* 改进版本：括号完整，但仍有副作用问题 */
#define SQUARE(x)       ((x) * (x))

/* 推荐版本：内联函数，参数只求值一次，有类型检查 */
static inline int32_t square(int32_t x) { return x * x; }

static inline int32_t max_i32(int32_t a, int32_t b) { return a > b ? a : b; }

/* 多语句宏：do-while(0) 保证是单条语句 */
#define UART_SEND_BYTE(b)                 \\
    do {                                  \\
        while (!(USART1->SR & (1U << 7))) \\
            ;                             \\
        USART1->DR = (uint8_t)(b);        \\
    } while (0)

void demo(void)
{
    int i = 3;
    int a = BAD_SQUARE(i + 1);   /* 展开为 i + 1 * i + 1 = 7，不是 16 */
    int b = square(i + 1);       /* 16，符合预期 */

    /* 多语句宏可以安全地放在 if 后面 */
    if (a > 0)
        UART_SEND_BYTE('A');
    else
        UART_SEND_BYTE('B');
}

/* 编译期断言：把错误提前到编译阶段 */
#define STATIC_ASSERT(cond, msg) typedef char static_assert_##msg[(cond) ? 1 : -1]
STATIC_ASSERT(sizeof(uint32_t) == 4, u32_must_be_4_bytes);`
        },
        apply: `<p>宏在嵌入式里仍有不可替代的位置：条件编译（<code>#ifdef DEBUG</code>）、寄存器位定义、日志开关、<code>STRINGIFY</code> 与 <code>CONCAT</code>、以及需要把参数当类型用的场景（如 <code>container_of</code>）。</p>
<p>写宏的三条硬规则：参数全部加括号、整体加括号、多语句用 <code>do-while(0)</code>。再加一条软规则：超过三行的逻辑就不要写成宏，改成内联函数。</p>`,
        pitfalls: [
          "<b>只给参数加括号，忘了整体加括号。</b><code>#define ADD(a,b) (a)+(b)</code> 在 <code>2 * ADD(1,2)</code> 中展开成 <code>2*(1)+(2)</code>，得到 4 而不是 6。",
          "<b>在宏里使用 <code>return</code> 或 <code>break</code>。</b>展开后会改变调用处的控制流，行为难以预测。",
          "<b>用宏定义常量却不加类型。</b>调试时看不到符号，也无法取地址。常量优先用 <code>const</code> 或 <code>enum</code>。"
        ],
        follow: [
          [
            "宏和 const 常量有什么区别？",
            "宏是文本替换，没有类型、没有作用域、不可调试、不占存储；const 是有类型的只读对象，受作用域约束、可调试、可取地址（放在 Flash 时不占 RAM）。定义数值常量优先用 const 或 enum。"
          ],
          [
            "<code>#include</code> 的尖括号和双引号有什么区别？",
            "双引号先在当前文件所在目录查找，再按系统路径查找；尖括号直接从系统/编译器指定的包含路径查找。项目内头文件用双引号，标准库和第三方库用尖括号。"
          ],
          [
            "头文件保护用 <code>#ifndef</code> 还是 <code>#pragma once</code>？",
            "<code>#ifndef</code> 是标准做法，可移植性最好；<code>#pragma once</code> 更简洁且编译更快，但属于编译器扩展。嵌入式项目普遍用 <code>#ifndef</code>，因为老编译器和某些 IDE 支持不完整。"
          ]
        ]
      },

      /* ---------------- C-12 ---------------- */
      {
        id: "C-12",
        chapter: "build",
        topic: "build-flow",
        title: "从 .c 到可执行文件经历了哪些阶段？各段分别放在哪里？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "预处理/编译/汇编/链接四阶段，以及 .text/.data/.bss/heap/stack 的归属。",
        q: `<p>面试官：一个 .c 文件<strong>变成可烧录的 bin 文件</strong>，中间经历了哪些步骤？全局变量、初始化为 0 的变量、字符串常量分别放在哪个段？为什么 .bss 不占 Flash 空间？</p>`,
        exam: `<p>这题把 C 语言、链接脚本、启动流程串起来了。能说清 .data 需要在启动时从 Flash 拷贝到 RAM、.bss 需要清零，就理解了启动文件里那段汇编在干什么，也就理解了“为什么未初始化的大数组不占 Flash”。</p>`,
        core: `<p>四个阶段：预处理（展开宏、包含头文件、条件编译）→ 编译（生成汇编）→ 汇编（生成 <code>.o</code>）→ 链接（按链接脚本合并成 elf，再 objcopy 成 bin/hex）。</p><p>归属：代码和常量在 <code>.text/.rodata</code>（Flash）；初始化的全局/静态变量在 <code>.data</code>，初值存 Flash、运行时拷到 RAM；未初始化或为 0 的在 <code>.bss</code>，只占 RAM 不占 Flash；堆和栈是 RAM 里划出的区域。</p>`,
        answer: `<p>四个阶段：<strong>预处理</strong>展开宏、包含头文件、处理条件编译；<strong>编译</strong>把 C 代码翻译成汇编；<strong>汇编</strong>把汇编翻译成目标文件 .o；<strong>链接</strong>把多个 .o 和库按链接脚本的地址布局合并成 elf，再用 objcopy 转成 bin/hex。</p>
<p>段的归属：代码和只读常量放在 <code>.text</code> 和 <code>.rodata</code>，都在 Flash；初始化为非零的全局/静态变量放 <code>.data</code>，它的<strong>初值</strong>存在 Flash，运行时需要拷贝到 RAM；未初始化或初始化为 0 的放 <code>.bss</code>，只记录“需要多大空间”，不存实际数据，所以不占 Flash。</p>
<p>堆和栈不存放在任何静态段里，它们是在 RAM 中划出的两块区域，堆由 malloc 管理，栈由 MSP/PSP 管理。</p>`,
        principle: `<p>链接脚本（.ld 或 .sct）决定每个段放在哪个地址。以 STM32 为例，Flash 从 0x08000000 开始，RAM 从 0x20000000 开始。链接器生成 elf 时，<code>.data</code> 段有一个 <code>LMA</code>（加载地址，在 Flash）和一个 <code>VMA</code>（运行地址，在 RAM），启动代码根据这两个地址做拷贝。</p>
<p>启动文件里的 <code>Reset_Handler</code> 通常做三件事：调用 <code>SystemInit</code> 配置时钟；把 <code>.data</code> 从 Flash 拷到 RAM；把 <code>.bss</code> 清零；然后跳转到 <code>main</code>。这也是为什么“未初始化的全局变量一定是 0”——不是语言魔法，是启动代码清出来的。</p>`,
        fig: {
          type: "flow",
          title: "从源码到可执行文件的四个阶段",
          tag: "toolchain",
          items: [
            { t: "预处理", d: "cpp / gcc -E" },
            { t: "编译", d: "gcc -S → .s" },
            { t: "汇编", d: "as → .o" },
            { t: "链接", d: "ld → .elf" },
            { t: "转换", d: "objcopy → .bin" }
          ]
        },
        code: {
          lang: "bash",
          title: "build.sh",
          src: `# 分步观察每个阶段的产物
arm-none-eabi-gcc -E main.c -o main.i        # 预处理：只剩宏展开后的 C
arm-none-eabi-gcc -S main.c -o main.s        # 编译：生成汇编
arm-none-eabi-gcc -c main.s -o main.o        # 汇编：生成目标文件
arm-none-eabi-gcc main.o startup.o -T link.ld -o app.elf   # 链接

# 查看段布局与大小
arm-none-eabi-size app.elf                   # text / data / bss
arm-none-eabi-objdump -h app.elf             # 各段地址与大小
arm-none-eabi-nm -S --size-sort app.elf      # 按大小排序的符号表

# 生成烧录文件
arm-none-eabi-objcopy -O binary app.elf app.bin
arm-none-eabi-objcopy -O ihex   app.elf app.hex`
        },
        apply: `<p>实际排查 Flash 不够用时，第一步就是看 map 文件：<code>arm-none-eabi-nm --size-sort</code> 能立刻找出占空间最大的符号。常见元凶是巨大的 const 查找表、重复包含的字符串、以及没开 <code>-ffunction-sections -Wl,--gc-sections</code> 导致未被调用的函数也被链接进来。</p>
<p>RAM 不够时看 .bss：把大缓冲区改成动态分配、把只读数据加 const 挪到 Flash、把 <code>uint8_t</code> 标志位合并，通常能省出几 KB。</p>`,
        pitfalls: [
          "<b>以为 .bss 占 Flash。</b>它只在运行时占 RAM，Flash 里只有“大小”这个信息。所以把大数组显式初始化为 0 反而会浪费 Flash。",
          "<b>以为全局变量默认是随机值。</b>C 标准保证静态存储期对象零初始化，这是启动代码的功劳；如果自己写的启动文件漏了清零，就会看到随机值。",
          "<b>改代码后没重新链接就烧录。</b>IDE 增量编译偶尔会漏掉头文件依赖，出现“改了没生效”，清理重建是最快的验证。"
        ],
        follow: [
          [
            "为什么函数里的 static 变量也放在 .data/.bss？",
            "因为它的存储期是整个程序运行期，不能放在栈上，必须由编译器分配固定地址，所以归入静态存储区。作用域仍然限于函数内，但生命周期与全局变量相同。"
          ],
          [
            "链接时出现 multiple definition 是什么原因？",
            "同一个外部链接符号在多个目标文件里都有定义。常见于在头文件里定义变量或函数（而非声明），或者两个 .c 定义了同名全局变量。解决方法是头文件只放 <code>extern</code> 声明，定义放且只放一个 .c。"
          ],
          [
            "什么是 LMA 和 VMA？",
            "LMA 是加载地址（程序烧在 Flash 里的位置），VMA 是运行地址（运行时变量所在的 RAM 地址）。对于 .data 段两者不同，启动代码需要按 LMA 读取、按 VMA 写入，完成初始化拷贝。"
          ]
        ]
      },

      /* ---------------- C-13 ---------------- */
      {
        id: "C-13",
        chapter: "build",
        topic: "ub",
        title: "C 语言里哪些写法属于未定义行为？为什么危险？",
        diff: "高级",
        freq: "进阶",
        type: "深度追问题",
        point: "未定义行为的本质是编译器可以做任何事，考察对优化与语言契约的理解。",
        q: `<p>面试官：<code>i = i++ + ++i;</code> 的结果是多少？为什么说它是<strong>未定义行为</strong>？还有哪些常见写法属于未定义行为？在嵌入式中会带来什么实际后果？</p>`,
        exam: `<p>这是区分“背过八股”和“理解语言模型”的题。核心是：UB 不是“结果不确定”，而是“编译器可以做任何事，包括把整段代码删掉”。能举出有符号溢出、越界、空指针解引用、未初始化读取这些真实会咬人的例子，说明你调试过优化引发的问题。</p>`,
        core: `<p><code>i = i++ + ++i;</code> 的结果没有意义：同一标量在同一个表达式里被修改多次，标准直接规定是未定义行为。</p><p>危险在于编译器可以假设 UB 不存在：删循环、把判断优化成恒真、生成陷阱指令。常见 UB 还有有符号溢出、数组越界、空指针解引用、<code>1&lt;&lt;31</code>、<code>free</code> 后使用、<code>memcpy</code> 源目标重叠。表现就是 -O0 正常、-O2 出错。</p>`,
        answer: `<p>这个表达式的结果是<strong>未定义的</strong>，不是“先算左边”或“先算右边”的问题。C 标准规定，如果一个标量对象在同一个表达式中被修改两次，或者被修改的同时又被读取（且读取的值不用于确定写入的值），行为就是未定义的。</p>
<p>关键在于：UB 不等于“结果随机但程序继续跑”。编译器可以假设 UB 不会发生，从而做出任意优化——包括把整个循环删掉、把判断优化成恒真、甚至生成陷阱指令。</p>
<p>常见的 UB 还有：有符号整数溢出（<code>INT_MAX + 1</code>）、数组越界访问、解引用空指针或野指针、读取未初始化的自动变量、<code>1 &lt;&lt; 31</code>、把越界指针用于算术、<code>free</code> 后继续使用、<code>memcpy</code> 源和目标重叠。</p>
<p>在嵌入式里最典型的后果是：<code>-O0</code> 调试一切正常，开 <code>-O2</code> 后逻辑错乱，因为编译器基于“不会溢出”的假设把边界检查优化掉了。所以工程上要用 <code>-Wall -Wextra</code>、静态分析工具，并对有符号运算做显式范围检查。</p>`,
        principle: `<p>C 标准把行为分为三类：<strong>定义行为</strong>（标准明确规定）、<strong>实现定义行为</strong>（编译器必须选一种并文档化，如 <code>char</code> 是否有符号）、<strong>未定义行为</strong>（标准不作任何要求）。</p>
<p>编译器优化建立在“程序不包含 UB”这个前提上。比如对 <code>if (x + 1 &lt; x)</code>，编译器可以判定这个条件恒假并删除分支——因为一旦溢出就是 UB，而 UB 不在考虑范围内。这就是为什么“依赖溢出来判断”的代码在优化后会失效。</p>
<p>无符号整数的溢出是<strong>定义良好</strong>的（按 2^n 取模），所以做校验和、哈希时应该用 <code>uint32_t</code> 而不是 <code>int</code>。</p>`,
        fig: {
          type: "table",
          title: "常见未定义行为与实际后果",
          tag: "pitfalls",
          head: ["写法", "问题", "实际后果"],
          rows: [
            ["<code>i = i++ + ++i</code>", "同一对象多次修改", "结果不可预期，不同编译器不同"],
            ["<code>int</code> 溢出", "有符号溢出是 UB", "-O2 下边界检查可能被删除"],
            ["<code>a[10]</code> 越界", "数组越界", "改写相邻变量或 HardFault"],
            ["<code>*(volatile int*)0 = 1</code>", "空指针解引用", "写入向量表区域，跑飞"],
            ["<code>char c; if (c)</code>", "读取未初始化变量", "值不确定，可能被优化掉"]
          ]
        },
        code: {
          lang: "c",
          title: "ub.c",
          src: `#include <limits.h>
#include <stdint.h>

/* UB 1：同一表达式内多次修改同一对象 */
void ub_demo1(void)
{
    int i = 0;
    /* i = i++ + ++i;  未定义，禁止这样写 */
}

/* UB 2：有符号溢出。编译器可假设不会溢出，从而删掉判断 */
int bad_abs(int x)
{
    if (x < 0) return -x;   /* x == INT_MIN 时 -x 溢出，UB */
    return x;
}

/* 正解：先处理边界，再用无符号运算 */
int safe_abs(int x)
{
    if (x == INT_MIN) return INT_MAX;   /* 饱和处理，业务上可接受 */
    return x < 0 ? -x : x;
}

/* 正解：校验和用无符号类型，溢出行为是定义良好的取模 */
uint16_t checksum(const uint8_t *buf, uint32_t len)
{
    uint16_t sum = 0;
    for (uint32_t i = 0; i < len; i++) {
        sum = (uint16_t)(sum + buf[i]);   /* 溢出按 2^16 取模，安全 */
    }
    return sum;
}

/* UB 3：读取未初始化的自动变量 */
int ub_demo3(void)
{
    int x;              /* 未初始化 */
    /* return x;        值不确定 */
    return 0;
}`
        },
        apply: `<p>工程上的三条防线：编译期开 <code>-Wall -Wextra -Wconversion</code>，把大部分隐式转换和可疑写法暴露出来；用静态分析（PC-lint、Coverity、clang-tidy）扫描 UB；关键模块在 PC 上用 UBSan 跑一遍单元测试，能抓到大量嵌入式上难以复现的问题。</p>
<p>另外，团队规范里应该明确禁止“依赖求值顺序”的写法，比如 <code>f(i++, i++)</code>、在同一个表达式里既读又写同一变量。这类代码即使当前编译器结果正确，换一个编译器版本就可能变。</p>`,
        pitfalls: [
          "<b>以为 UB 只是“结果不确定”。</b>编译器可以基于“不会发生 UB”做任意优化，包括删除整段代码，后果比随机值严重得多。",
          "<b>用有符号数做溢出判断。</b><code>if (a + b &lt; a)</code> 检测溢出本身就是 UB，应该用无符号类型或先做范围检查。",
          "<b>依赖 <code>i++</code> 的求值顺序。</b>函数实参的求值顺序在标准中未指定，跨编译器不可移植；倒是 <code>&amp;&amp;</code>、<code>||</code> 和逗号运算符相反，标准保证从左到右求值且中间有序列点，别把两种情况混为一谈。"
        ],
        follow: [
          [
            "无符号溢出为什么是安全的？",
            "C 标准明确规定无符号运算按 2^n 取模，结果始终有定义。所以哈希、校验和、计数器回绕都用无符号类型。但要注意它仍然可能不符合业务语义（比如计时回绕），需要配合差值比较。"
          ],
          [
            "如何检测整数溢出？",
            "在运算前做范围检查（如 <code>a &gt; INT_MAX - b</code>），或使用编译器内建函数 <code>__builtin_add_overflow</code>，或改用无符号类型并显式处理回绕。"
          ],
          [
            "volatile 能消除未定义行为吗？",
            "不能。volatile 只改变访问方式（禁止缓存、禁止删除），不改变语义合法性。越界访问 volatile 数组依然是 UB，只是编译器不会把它优化掉而已。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("c-language", {
    chapters: [
      {
        id: "types",
        topics: [
          { id: "composite", title: "结构体、联合体与枚举" },
          { id: "promote", title: "整型提升与类型转换" }
        ]
      },
      {
        id: "build",
        topics: [{ id: "call", title: "函数调用与栈帧" }]
      },
      {
        id: "runtime",
        title: "字符串与运行库",
        topics: [
          { id: "string", title: "字符串与字符数组" },
          { id: "mem", title: "内存函数" }
        ]
      }
    ],
    questions: [
      {
        id: "C-14",
        chapter: "keywords",
        topic: "qualifier",
        title: "extern 的作用是什么？为什么变量不能定义在头文件里？",
        diff: "中级",
        freq: "高频",
        type: "概念辨析题",
        point: "分清声明与定义，理解头文件被多个源文件包含后的重复定义问题。",
        q: `<p>面试官：我写了一个 <code>config.h</code>，里面写了 <code>int g_flag = 0;</code>，两个 .c 都 include 它，编译报 multiple definition。为什么？正确写法是什么？</p>`,
        exam: `<p>考察对编译链接模型的理解。能说清“声明不分配空间、定义分配空间”，以及头文件是被文本展开到每个 .c 里的，就算过关。</p>`,
        core: `<p><code>extern</code> 只是声明：告诉编译器名字和类型存在，不分配空间；定义才分配。同一变量可以声明多次、只能定义一次。</p><p>头文件会被展开到每个 <code>.c</code>，在里面写 <code>int g_flag = 0;</code> 等于多处定义，链接时报 multiple definition。正确做法：头文件写 <code>extern int g_flag;</code>，某一个 <code>.c</code> 里定义。函数默认外部链接，头文件写原型即可。</p>`,
        answer: `<p><b>声明</b>只是告诉编译器“这个名字存在、类型是什么”，不分配存储；<b>定义</b>才会真正分配空间。同一个变量可以声明很多次，但只能定义一次。</p>
<p>头文件的内容会被预处理原样展开到每个包含它的 .c 文件里。所以在头文件里写 <code>int g_flag = 0;</code>，等于在两个 .c 里各定义了一次同名全局变量，链接器发现两个强符号，直接报 multiple definition。</p>
<p>正确做法是：</p>
<ul>
<li>在头文件里只写 <code>extern int g_flag;</code>，这是声明；</li>
<li>在<b>一个</b> .c 文件里写 <code>int g_flag = 0;</code>，这是定义；</li>
<li>函数默认就是 extern，头文件里写原型即可，不需要加 extern。</li>
</ul>
<p>如果确实需要在头文件里定义（比如 <code>static const</code> 常量表），可以加 <code>static</code>，让每个编译单元各有一份副本，代价是占用多份空间。C99 起可以用 <code>static inline</code> 在头文件里定义函数，用法见后面 inline 那一题；嵌入式项目里更常用的是 <code>static const</code> 或宏。</p>`,
        principle: `<p>C 的编译模型是“分别编译、统一链接”。每个 .c 独立编译成 .o，符号表里记录已定义和未定义的符号，最后由链接器把未定义符号解析到某个 .o 的定义上。</p>
<p>如果两个 .o 都提供了同一个强符号，链接器无法判断用哪个，只能报错。GCC 10 之后默认 <code>-fno-common</code>，把以前“多个 tentative definition 合并”的行为也改成了报错，所以老代码升级工具链时经常突然编不过。</p>`,
        fig: {
          type: "table",
          title: "声明与定义的区别",
          tag: "linkage",
          head: ["写法", "性质", "分配空间", "出现位置"],
          rows: [
            ["extern int g;", "声明", "否", "头文件"],
            ["int g;", "定义（tentative）", "是", "仅一个 .c"],
            ["int g = 0;", "定义", "是", "仅一个 .c"],
            ["static int g;", "内部链接定义", "是（每个单元一份）", "仅本 .c"],
            ["void f(void);", "函数声明", "否", "头文件"]
          ]
        },
        apply: `<p>我习惯把模块对外的全局变量统一放在 <code>xxx.h</code> 里用 extern 声明，并在 <code>xxx.c</code> 顶部定义。为了减少全局变量，更好的做法是提供 <code>get/set</code> 接口，把状态藏在 .c 内部用 static 修饰。</p>
<p>还有一个细节：<code>extern int arr[];</code> 是合法的不完整类型声明，但 <code>extern int arr[10];</code> 和定义处的长度必须一致，否则 <code>sizeof</code> 在不同文件里会得到不同结果。</p>`,
        pitfalls: [
          "<b>在头文件里定义变量。</b>只要被两个 .c 包含就重复定义。",
          "<b>extern 后面带初始化。</b><code>extern int g = 0;</code> 是定义，不是声明。",
          "<b>用 static 修饰头文件里的变量。</b>每个包含它的 .c 各有一份，改了一个不影响另一个，逻辑容易出错。"
        ],
        follow: [
          ["static 全局变量和普通全局变量在符号表里有什么区别？", "static 全局变量是内部链接（local symbol），只在当前 .o 可见；普通全局变量是外部链接（global symbol），参与跨文件解析。"],
          ["C++ 里为什么要写 extern \"C\"？", "C++ 有名字修饰（name mangling），为了让 C++ 代码能调用 C 编译出的函数，需要用 extern \"C\" 禁止修饰，保证符号名一致。"]
        ]
      },

      {
        id: "C-15",
        chapter: "types",
        topic: "composite",
        title: "结构体、联合体、枚举有什么区别？union 在嵌入式里怎么用？",
        diff: "中级",
        freq: "高频",
        type: "概念辨析题",
        point: "struct 成员独立、union 成员共享、enum 是整型常量集合；union 常用于协议解析和类型双关。",
        q: `<p>面试官：说说 struct、union、enum 的区别。union 除了“省内存”还有什么实际用途？</p>`,
        exam: `<p>考察对复合类型内存布局的理解。很多人只知道 union 共享内存，说不出它在协议解析、寄存器访问、大小端检测中的用法。</p>`,
        core: `<p><code>struct</code> 成员各占空间、可同时有效，大小含对齐填充；<code>union</code> 成员共用一块内存，大小取最大成员，同一时刻只有一个有效；<code>enum</code> 是命名整型常量，本质是整数。</p><p><code>union</code> 常用于协议解析（字节与字段共用一块内存）、查看 float 位模式、判断端序、寄存器整体/位域双视图，但位域布局是实现定义的。</p>`,
        answer: `<p><b>struct</b>：每个成员有独立的存储空间，总大小是各成员大小之和再加上对齐填充。成员可以同时有效。</p>
<p><b>union</b>：所有成员共用同一块内存，大小等于最大成员的大小（并按最大对齐要求取整）。同一时刻只有一个成员是“有意义”的，写入一个成员会覆盖其它成员。</p>
<p><b>enum</b>：一组命名的整型常量。它本质上是整型，大小由编译器决定（通常是 int，可以用 <code>-fshort-enums</code> 改成最小类型）。枚举让状态机、错误码可读性更好，调试器也能显示符号名。</p>
<p>union 在嵌入式里的典型用途：</p>
<ul>
<li><b>协议解析</b>：把一帧字节和结构化字段放在同一个 union 里，收到的字节直接按字段读；</li>
<li><b>类型双关</b>：把 float 和 uint32_t 放进 union，查看浮点数的位模式；</li>
<li><b>检测大小端</b>：union 里放一个 uint16_t 和一个 uint8_t 数组，看低地址字节；</li>
<li><b>寄存器位段视图</b>：同一寄存器既按整体 32 位访问，又按位域访问（但要注意位域布局是实现定义的）。</li>
</ul>`,
        principle: `<p>union 的成员共享起始地址，所以对成员的读写本质上是对同一块内存的不同解释。C 标准允许通过 union 读取“最近写入的成员”之外的成员（称为 type punning），但结果依赖类型的表示方式，跨平台不一定可移植；C++ 中这种行为属于未定义行为，需要 <code>memcpy</code> 替代。</p>
<p>enum 的底层类型在 C 中是实现定义的，只要能把所有枚举值表示出来即可。所以不要把 enum 直接用于协议字段或 Flash 存储格式，除非明确固定了宽度。</p>`,
        fig: {
          type: "memmap",
          title: "struct 与 union 的内存布局对比",
          tag: "memory layout",
          rows: [
            { name: "struct", text: "a(4B) | b(1B) | padding(3B) | c(4B)", addr: "共 12 字节", cls: "a" },
            { name: "union", text: "最大成员占满整块，所有成员共用首地址", addr: "共 4 字节", cls: "b" },
            { name: "enum", text: "本质是整型常量，通常 4 字节", addr: "取决于实现", cls: "c" }
          ]
        },
        code: {
          lang: "c",
          title: "union_demo.c",
          src: `#include <stdint.h>

/* 1. 查看浮点数的位模式 */
typedef union {
    float    f;
    uint32_t u;
} float_bits_t;

/* 2. 检测大小端：低地址存放低字节则为小端 */
typedef union {
    uint16_t v;
    uint8_t  b[2];
} endian_probe_t;

int is_little_endian(void)
{
    endian_probe_t p;
    p.v = 0x0102;
    return p.b[0] == 0x02;
}

/* 3. 协议帧解析：字节流与字段共用内存 */
typedef union {
    uint8_t  raw[8];
    struct {
        uint8_t  head;
        uint8_t  cmd;
        uint16_t len;
        uint32_t payload;
    } field;
} frame_t;`
        },
        codeNote: "协议帧用 union 解析很方便，但字段对齐和字节序必须与协议一致，跨平台时建议显式逐字节组装。",
        apply: `<p>我在解析 Modbus 或自定义帧时，会用 union 做快速访问，但对外发送时一定走显式的字节组装函数，避免结构体填充和字节序带来的差异。</p>
<p>枚举我通常显式指定底层类型（C99 可用 <code>enum : uint8_t</code> 的编译器扩展，或直接 typedef uint8_t），并在协议和存储中使用固定宽度类型，不直接把 enum 写进二进制格式。</p>`,
        pitfalls: [
          "<b>写一个 union 成员、读另一个成员。</b>在 C 里依赖表示方式，在 C++ 里是未定义行为。",
          "<b>以为 union 能自动记录当前哪个成员有效。</b>需要额外的 tag 字段自己维护。",
          "<b>把 enum 直接当协议字段。</b>不同编译器宽度可能不同，跨平台解析出错。"
        ],
        follow: [
          ["union 的大小一定等于最大成员吗？", "还要考虑对齐：大小是最大成员大小按最大对齐要求向上取整。例如最大成员是 5 字节数组、另有 4 字节成员时，大小可能是 8。"],
          ["结构体里嵌套 union 有什么用？", "常见于“带类型标签的变体”：一个 tag 字段加一个 union，表示当前有效的是哪种数据，类似协议中的 TLV 结构。"]
        ]
      },

      {
        id: "C-16",
        chapter: "keywords",
        topic: "macro",
        title: "typedef 和 #define 有什么区别？定义函数指针类型该用哪个？",
        diff: "初级",
        freq: "高频",
        type: "概念辨析题",
        point: "typedef 是编译器处理的类型别名，有作用域和类型检查；define 是预处理文本替换。",
        q: `<p>面试官：<code>typedef</code> 和 <code>#define</code> 都能“起别名”，它们有什么本质区别？为什么定义函数指针类型推荐用 typedef？</p>`,
        exam: `<p>考察预处理与编译阶段的区别。能举出 <code>#define PTR char*</code> 导致 <code>PTR a, b;</code> 只有 a 是指针的例子，就说明理解到位了。</p>`,
        core: `<p><code>#define</code> 是预处理文本替换，不做类型检查；<code>typedef</code> 是编译器处理的类型别名，有作用域、参与类型检查。</p><p>典型差异：<code>#define PTR char*</code> 后 <code>PTR a,b;</code> 只有 <code>a</code> 是指针；<code>typedef char* PTR</code> 后两个都是。函数指针一律用 <code>typedef</code>，否则 <code>void (*signal(int, void (*)(int)))(int)</code> 这种声明没法读。</p>`,
        answer: `<p>两者处在完全不同的阶段：</p>
<ul>
<li><b>#define</b> 由预处理器做纯文本替换，发生在编译之前。它不知道类型，也不做语法检查，替换结果可能因为运算符优先级、逗号、分号而出错。</li>
<li><b>typedef</b> 由编译器处理，是真正的类型别名。它参与类型检查，遵循作用域规则（可以定义在文件、函数或代码块内；但不能写在结构体定义里），调试信息里也能看到。</li>
</ul>
<p>最典型的差异：<code>#define PTR char*</code> 之后写 <code>PTR a, b;</code>，展开成 <code>char* a, b;</code>，只有 a 是 <code>char*</code>，b 是 <code>char</code>。而 <code>typedef char* PTR;</code> 之后 <code>PTR a, b;</code> 两个都是指针。</p>
<p>函数指针尤其推荐 typedef，因为原始写法可读性极差：</p>
<p><code>void (*signal(int, void (*)(int)))(int);</code></p>
<p>用 typedef 拆开后一目了然：<code>typedef void (*sighandler_t)(int);</code>，再写 <code>sighandler_t signal(int, sighandler_t);</code>。</p>
<p>另外，<code>#define</code> 能做条件编译（<code>#ifdef</code>），typedef 不能；<code>#define</code> 可以定义常量表达式参与预处理判断，typedef 只用于类型。</p>`,
        principle: `<p>预处理器不理解 C 语法，它只按 token 做替换。所以宏参数如果没有加括号，运算符优先级就会出问题；宏展开多次还会导致副作用（如 <code>MAX(i++, j++)</code>）。</p>
<p>typedef 建立的是“类型名”，编译器在符号表里记录它，因此可以做类型兼容性检查，也能正确处理指针、数组、函数指针这些复杂声明。</p>`,
        fig: {
          type: "table",
          title: "typedef 与 #define 对比",
          tag: "preprocessor",
          head: ["维度", "typedef", " #define"],
          rows: [
            ["处理阶段", "编译期", "预处理期"],
            ["类型检查", "有", "无"],
            ["作用域", "遵循 C 作用域", "从定义处到文件末尾"],
            ["指针别名", "整体是指针类型", "文本替换，易出错"],
            ["条件编译", "不支持", "支持"],
            ["调试信息", "保留类型名", "已展开，看不到原名"]
          ]
        },
        code: {
          lang: "c",
          title: "typedef_fp.c",
          src: `/* 原始写法：一个返回函数指针、参数也是函数指针的函数 */
void (*signal(int sig, void (*handler)(int)))(int);

/* 用 typedef 拆解后 */
typedef void (*sighandler_t)(int);
sighandler_t signal(int sig, sighandler_t handler);

/* 驱动里的回调类型：统一接口，便于替换实现 */
typedef int (*read_fn_t)(void *ctx, uint8_t *buf, uint32_t len);
typedef struct {
    read_fn_t read;
    void     *ctx;
} io_ops_t;`
        },
        codeNote: "回调接口用 typedef 定义后，结构体里可以直接声明函数指针成员，调用处也更清晰。",
        apply: `<p>项目里我会用 typedef 定义所有回调类型和句柄类型（如 <code>typedef struct sensor_s *sensor_handle_t;</code>），这样上层不需要知道底层结构体细节，换实现时只改 typedef。</p>
<p>宏则只用于条件编译、常量、日志封装这类确实需要预处理能力的场景。带参数的宏一律给每个参数和整体加括号，能改成 <code>static inline</code> 的就改掉。</p>`,
        pitfalls: [
          "<b>用宏定义指针类型。</b><code>#define PTR char*</code> 在多变量声明时出错。",
          "<b>宏参数不加括号。</b><code>#define SQ(x) x*x</code> 遇到 <code>SQ(a+1)</code> 结果错误。",
          "<b>在头文件里 typedef 同名类型两次。</b>C11 起允许在同一作用域把 typedef 名重复定义为相同类型（C99 下属于约束违例），但定义成不同类型一定报错。"
        ],
        follow: [
          ["typedef 和 struct 标签有什么区别？", "<code>struct foo</code> 是标签，使用时必须写 struct；<code>typedef struct foo foo_t;</code> 之后可以直接用 foo_t。两者可以同名，互不冲突。"],
          ["为什么内核代码里常见 typedef 用得很少？", "Linux 内核风格偏好显式写出 struct 和指针，认为隐藏类型的 typedef 会降低可读性；只在函数指针和固定宽度整数上使用。"]
        ]
      },

      {
        id: "C-17",
        chapter: "pointer",
        topic: "ptr-basic",
        title: "指针运算的规则是什么？二级指针有什么用？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "指针加减以所指类型为单位，数组名退化为首元素指针，二级指针用于修改调用者的指针。",
        q: `<p>面试官：<code>int *p; p + 1</code> 地址偏移多少字节？数组名和指针到底哪里不一样？二级指针什么时候必须用？</p>`,
        exam: `<p>考察指针的底层模型。能说清“步长由类型决定”和“数组名不是指针，只是大多数表达式里会退化”，说明理解得比较深。</p>`,
        core: `<p>指针加减以所指类型的大小为单位：<code>int *p</code> 的 <code>p+1</code> 走 4 字节；两个指针相减得到元素个数，不是字节数。</p><p>数组名多数场合退化为首元素指针，但 <code>sizeof</code>、<code>&amp;arr</code>、字符串字面量初始化除外，且数组名不是左值。二级指针用来修改“指针本身”：函数内给指针分配内存、改链表头、传指针数组。</p>`,
        answer: `<p><b>指针运算以所指类型的大小为单位。</b><code>int *p</code> 的 <code>p + 1</code> 偏移 <code>sizeof(int)</code> 字节（通常是 4），<code>char *q</code> 的 <code>q + 1</code> 偏移 1 字节。指针相减得到的是<b>元素个数</b>，不是字节数。</p>
<p><b>数组名和指针的区别：</b></p>
<ul>
<li>数组名在大多数表达式里会退化为指向首元素的指针，但有三个例外：<code>sizeof(arr)</code> 得到整个数组大小、<code>&amp;arr</code> 得到数组指针、字符串字面量初始化数组时不退化。</li>
<li>数组名不是左值，不能被赋值；指针是变量，可以改变指向。</li>
<li><code>sizeof(arr)</code> 和 <code>sizeof(p)</code> 结果完全不同，这就是函数参数里拿不到数组长度的原因。</li>
</ul>
<p><b>二级指针</b>的本质是“指向指针的指针”，它让被调函数能够修改调用者的指针本身：</p>
<ul>
<li>在函数里为指针分配内存（<code>void alloc(char **out)</code>）；</li>
<li>修改链表头指针（<code>void insert(node_t **head, ...)</code>）；</li>
<li>传递指针数组（<code>char **argv</code>）。</li>
</ul>
<p>如果只是修改指针指向的内容，一级指针就够；只有需要修改“指针本身的值”时才用二级指针。</p>`,
        principle: `<p>指针的值是一个地址，指针的类型决定了编译器如何解释这个地址以及运算时的步长。所以 <code>void *</code> 不能直接做算术（标准不允许，GCC 按字节扩展），必须先转换成具体类型。</p>
<p>指针相减要求两个指针指向同一个数组（或数组末尾后一位），否则是未定义行为。跨对象指针相减在标准上没有定义，虽然大多数平台算出来是地址差。</p>`,
        fig: {
          type: "memmap",
          title: "int *p 的指针运算",
          tag: "pointer arithmetic",
          rows: [
            { name: "p", text: "0x20000000 → 值 100", addr: "偏移 0", cls: "a" },
            { name: "p + 1", text: "0x20000004 → 下一个 int", addr: "偏移 4 字节", cls: "b" },
            { name: "p + 2", text: "0x20000008", addr: "偏移 8 字节", cls: "c" },
            { name: "(char *)p + 1", text: "0x20000001 → 下一个字节", addr: "偏移 1 字节", cls: "d" }
          ]
        },
        code: {
          lang: "c",
          title: "double_pointer.c",
          src: `#include <stdlib.h>
#include <string.h>

/* 错误：只修改了局部指针，调用者的 p 仍是 NULL */
void alloc_bad(char *p, int n)
{
    p = (char *)malloc(n);
}

/* 正确：通过二级指针修改调用者的指针 */
int alloc_good(char **out, int n)
{
    char *p = (char *)malloc(n);
    if (!p) return -1;
    *out = p;
    return 0;
}

/* 链表头插：必须能修改 head 本身 */
typedef struct node { int v; struct node *next; } node_t;

void push_front(node_t **head, node_t *n)
{
    n->next = *head;
    *head = n;
}`
        },
        codeNote: "判断要不要用二级指针，只看一件事：函数是否需要改变调用者那个指针变量的值。",
        apply: `<p>写驱动时，初始化函数经常需要返回一个句柄，我会用 <code>int xxx_open(xxx_t **handle)</code> 的形式，返回错误码而不是指针，这样既能区分失败原因，也避免了用 NULL 表示多种错误。</p>
<p>另一个常见场景是字符串数组：<code>char *names[]</code> 作为参数会退化成 <code>char **</code>，函数里通过 <code>names[i]</code> 访问每个字符串。</p>`,
        pitfalls: [
          "<b>以为数组名就是指针。</b><code>sizeof</code> 结果不同，且数组名不能被赋值。",
          "<b>对不同类型的指针相减。</b>结果没有意义，编译器可能只给警告。",
          "<b>指针越界后再运算。</b>即使不解引用，越界指针运算本身也是未定义行为。",
          "<b>该用二级指针时用一级。</b>函数内分配的地址传不出去，造成内存泄漏或空指针解引用。"
        ],
        follow: [
          ["指针和整型能互相转换吗？", "可以强制转换，但结果依赖平台。嵌入式里常用这种方式访问固定地址的寄存器，必须用 <code>volatile</code> 修饰并确保地址对齐。"],
          ["函数指针和普通指针的运算有区别吗？", "函数指针不能做算术运算（标准未定义），只能比较相等或调用；对象指针才可以按元素步长移动。"]
        ]
      },

      {
        id: "C-18",
        chapter: "runtime",
        topic: "string",
        title: "字符串字面量和字符数组有什么区别？strcpy 为什么危险？",
        diff: "初级",
        freq: "高频",
        type: "陷阱分析题",
        point: "字面量在只读段不可修改，sizeof 与 strlen 语义不同，strcpy 不检查边界。",
        q: `<p>面试官：<code>char *s = "abc";</code> 和 <code>char a[] = "abc";</code> 有什么区别？为什么说 <code>strcpy</code> 不安全？</p>`,
        exam: `<p>考察字符串的内存模型和安全意识。能指出字面量位于只读段、修改会崩溃，以及 <code>strncpy</code> 不保证以 0 结尾，是比较完整的回答。</p>`,
        core: `<p><code>char *s="abc"</code> 的字符在只读段，<code>s</code> 只是指针，改 <code>s[0]</code> 会崩；<code>char a[]="abc"</code> 在栈上分配 4 字节并复制内容，可以修改。</p><p><code>sizeof(a)=4</code>、<code>strlen(a)=3</code>，而 <code>sizeof(s)</code> 只是指针大小。<code>strcpy</code> 不接收目标长度，源串过长直接越界，应改用 <code>snprintf</code> 或带长度检查的封装；<code>strncpy</code> 不保证补 <code>\0</code>。</p>`,
        answer: `<p><b>存储位置不同：</b><code>char *s = "abc"</code> 中，字符串字面量存放在只读数据段（.rodata），<code>s</code> 只是指向它的指针；<code>char a[] = "abc"</code> 则在栈上分配 4 个字节（含结尾的 <code>'\0'</code>），并把内容复制进去，可以随意修改。</p>
<p>所以 <code>s[0] = 'x'</code> 在多数平台会触发段错误，而 <code>a[0] = 'x'</code> 完全合法。</p>
<p><b>sizeof 与 strlen：</b><code>sizeof(a)</code> 是数组总大小（4），<code>strlen(a)</code> 是不含 <code>'\0'</code> 的长度（3）；<code>sizeof(s)</code> 是指针大小（4 或 8），不是字符串长度。这是最常见的错误之一。</p>
<p><b>strcpy 的问题：</b>它不接收目标缓冲区大小，源字符串比目标长时会直接越界写，造成栈溢出或踩坏相邻变量。应该用 <code>snprintf</code> 或带长度检查的封装：</p>
<ul>
<li><code>snprintf(dst, sizeof(dst), "%s", src)</code> 保证不越界且一定以 <code>'\0'</code> 结尾；</li>
<li><code>strncpy(dst, src, n)</code> 虽然限长，但当源串长度大于等于 n 时<b>不会补 <code>'\0'</code></b>，后续 strlen 会继续往后读；</li>
<li><code>strlcpy</code> 语义更安全，但不是标准 C 库函数，部分平台没有。</li>
</ul>`,
        principle: `<p>C 字符串是以 <code>'\0'</code> 结尾的字符序列，长度信息不随数据一起存储，所有字符串函数都靠扫描 <code>'\0'</code> 确定边界。一旦缺少结尾符，函数就会一直读到非法内存。</p>
<p>字面量放在只读段是操作系统/链接器保护机制的一部分，现代 MCU 上如果 Flash 直接映射为只读，写操作会触发总线错误（HardFault）。</p>`,
        fig: {
          type: "memmap",
          title: "两种写法在内存中的位置",
          tag: "string literal",
          rows: [
            { name: "char *s", text: "指针变量（栈/数据段）→ 指向只读段 \"abc\\0\"", addr: "4/8 字节", cls: "a" },
            { name: "char a[]", text: "a[0..3] = 'a','b','c','\\0'（栈上可写）", addr: "4 字节", cls: "b" },
            { name: "sizeof", text: "s 得到指针大小；a 得到 4", addr: "语义不同", cls: "c" }
          ]
        },
        code: {
          lang: "c",
          title: "safe_str.c",
          src: `#include <stdio.h>
#include <string.h>

/* 安全拷贝：始终以 0 结尾，返回实际拷贝长度 */
size_t str_copy(char *dst, size_t cap, const char *src)
{
    size_t n;
    if (cap == 0) return 0;
    n = strlen(src);
    if (n >= cap) n = cap - 1;
    memcpy(dst, src, n);
    dst[n] = '\\0';
    return n;
}

void demo(void)
{
    char buf[8];
    /* 不推荐：源串过长时越界 */
    /* strcpy(buf, "0123456789"); */

    /* 推荐：明确长度，保证截断后仍可安全使用 */
    snprintf(buf, sizeof(buf), "%s", "0123456789");
}`
        },
        codeNote: "snprintf 的返回值是“原本想写的长度”，不是实际写入长度，判断截断要用返回值与缓冲区大小比较。",
        apply: `<p>协议解析时我不用 <code>strcpy</code>，统一用 <code>memcpy</code> 加显式长度，因为协议字段可能包含 <code>'\0'</code>，用字符串函数会提前截断。</p>
<p>日志打印时用 <code>snprintf</code> 并检查返回值：如果返回值大于等于缓冲区大小，说明被截断，可以选择扩容或标记日志不完整。</p>`,
        pitfalls: [
          "<b>用 sizeof 求指针指向的字符串长度。</b>得到的是指针大小。",
          "<b>修改字符串字面量。</b>只读段写入会崩溃或 HardFault。",
          "<b>用 strncpy 后不手动补 0。</b>后续 strlen 越界读取。",
          "<b>strlen 放在循环条件里。</b>每次迭代都扫描一遍，复杂度变成 O(n²)。"
        ],
        follow: [
          ["为什么字符串常量可以赋给 char* 而不报警告？", "C 语言历史遗留，字面量类型是 char[]，但修改是未定义行为；C++ 中类型是 const char[]，赋值给 char* 会直接编译错误。"],
          ["中文字符串的长度怎么算？", "strlen 返回字节数，UTF-8 下一个汉字通常 3 字节；要按字符计数需要按 UTF-8 编码规则解析首字节判断长度。"]
        ]
      },

      {
        id: "C-19",
        chapter: "runtime",
        topic: "mem",
        title: "memcpy 和 memmove 有什么区别？如何自己实现 memmove？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "memcpy 不处理内存重叠，memmove 根据地址关系决定从前往后还是从后往前拷贝。",
        q: `<p>面试官：<code>memcpy</code> 和 <code>memmove</code> 有什么区别？如果源和目标缓冲区重叠，用 memcpy 会发生什么？请手写一个 memmove。</p>`,
        exam: `<p>考察对内存重叠的理解和基本编码能力。关键点是判断 <code>dst &lt; src</code> 还是 <code>dst &gt; src</code>，决定拷贝方向。</p>`,
        core: `<p><code>memcpy</code> 假定源和目标不重叠，可以按字批量拷；重叠时前面的写入会覆盖后面还没读的数据，结果不可预期。</p><p><code>memmove</code> 判方向：<code>dst &lt; src</code> 正序，<code>dst &gt; src &amp;&amp; dst &lt; src+n</code> 逆序，不重叠则随意。实现用 <code>unsigned char *</code> 逐字节最稳，两者都返回 <code>dst</code>。</p>`,
        answer: `<p><b>memcpy</b> 假定源和目标内存区域<b>不重叠</b>，实现可以按字（4/8 字节）批量拷贝以获得高性能；一旦重叠，前面的写入会覆盖后面还没读的数据，结果不可预期。</p>
<p><b>memmove</b> 明确支持重叠，做法是判断方向：</p>
<ul>
<li>如果 <code>dst &lt; src</code>，从低地址往高地址拷（正序）安全；</li>
<li>如果 <code>dst &gt; src</code> 且 <code>dst &lt; src + n</code>，必须从高地址往低地址拷（逆序），否则会覆盖源数据；</li>
<li>完全不重叠时，正序逆序都可以。</li>
</ul>
<p>实现时用 <code>unsigned char *</code> 逐字节拷贝最稳妥，因为标准保证字符类型没有对齐要求。若要做字拷贝优化，需要先处理头部和尾部的不对齐部分。</p>
<p>另一个常见区别是返回值：两者都返回 <code>dst</code>，方便链式调用。</p>`,
        principle: `<p>重叠拷贝的本质是“读写的先后顺序”问题。正序拷贝时，<code>dst[i]</code> 的写入可能覆盖尚未读取的 <code>src[i + (dst - src)]</code>。逆序拷贝则从尾部开始，保证被覆盖的位置已经读完。</p>
<p>memcpy 之所以不检查重叠，是因为检查本身有开销，而且编译器可能把它优化成内建指令（如 ARM 的 LDM/STM），逐字节检查会破坏优化。</p>`,
        fig: {
          type: "memmap",
          title: "重叠拷贝的方向选择",
          tag: "overlap",
          rows: [
            { name: "dst < src", text: "正序拷贝：先写低地址，不影响未读的源数据", addr: "安全", cls: "a" },
            { name: "dst > src", text: "逆序拷贝：从尾部开始，避免覆盖未读数据", addr: "必须逆序", cls: "b" },
            { name: "无重叠", text: "任意方向，可按字批量优化", addr: "最快", cls: "c" }
          ]
        },
        code: {
          lang: "c",
          title: "my_memmove.c",
          src: `#include <stddef.h>

void *my_memmove(void *dst, const void *src, size_t n)
{
    unsigned char       *d = (unsigned char *)dst;
    const unsigned char *s = (const unsigned char *)src;

    if (d == s || n == 0) return dst;

    if (d < s) {
        /* 正序：目标在源之前，先写低地址不会破坏未读数据 */
        while (n--) *d++ = *s++;
    } else {
        /* 逆序：目标在源之后，从尾部开始拷贝 */
        d += n;
        s += n;
        while (n--) *--d = *--s;
    }
    return dst;
}`
        },
        codeNote: "比较两个不相关对象的指针在标准上属于未定义行为，工程实现通常转成 uintptr_t 比较，或依赖具体平台保证。",
        apply: `<p>做环形缓冲区“取出并搬移剩余数据”时，经常出现源和目标重叠，我会统一用 <code>memmove</code>，避免自己判断方向出错。</p>
<p>还有一点：对 <code>volatile</code> 修饰的寄存器或 DMA 缓冲区不要用 <code>memcpy</code>，编译器可能把它优化成向量指令或直接删除“看起来无用”的读写。这类场景要自己写循环，并用 volatile 指针访问。</p>`,
        pitfalls: [
          "<b>重叠时用 memcpy。</b>结果依赖实现，换编译器或优化等级就出问题。",
          "<b>长度按元素个数传。</b>memcpy 的第三个参数是字节数，不是元素个数。",
          "<b>对 volatile 内存用 memcpy。</b>编译器优化会破坏访问语义。",
          "<b>忽略返回值。</b>虽然少见，但链式使用时需要返回 dst。"
        ],
        follow: [
          ["memcpy 为什么通常比逐字节循环快？", "实现会按机器字长批量搬运，并可能使用 SIMD 指令；编译器也常把已知长度的 memcpy 内联展开。"],
          ["memcmp 和 strcmp 有什么区别？", "memcmp 按字节比较指定长度，遇到 0 不停止；strcmp 比较到 '\\0' 为止，用于字符串。二进制数据必须用 memcmp。"]
        ]
      },

      {
        id: "C-20",
        chapter: "types",
        topic: "bit",
        title: "位域（bit-field）有什么陷阱？为什么寄存器操作不推荐用位域？",
        diff: "高级",
        freq: "中频",
        type: "陷阱分析题",
        point: "位域布局由实现定义，不能取地址，跨平台不可移植，volatile 位域读写非原子。",
        q: `<p>面试官：结构体里用 <code>unsigned int flag : 1;</code> 定义位域很方便，为什么很多公司规范禁止用它操作寄存器？</p>`,
        exam: `<p>考察对“实现定义行为”的敏感度。能说出位序、跨字节、不能取地址、并发读写这四个问题，说明真正踩过坑。</p>`,
        core: `<p>位域的分配方向、跨存储单元处理和填充都由实现定义，GCC 与 IAR、ARM 与 x86 可能布局不同；还不能取地址、<code>sizeof</code> 不可移植，读写是“读整字→改位→写回”，不是原子操作。</p><p>寄存器操作别用位域，用显式移位和掩码：<code>REG = (REG &amp; ~MASK) | ((val &lt;&lt; POS) &amp; MASK)</code>，再配合 <code>volatile</code> 和临界区保护。</p>`,
        answer: `<p>位域看起来很适合寄存器，但有几个硬伤：</p>
<ol>
<li><b>布局由实现定义。</b>标准没有规定位域从低位还是高位开始分配，也没规定跨存储单元时怎么处理。同一个结构体在 GCC 和 IAR 上、在 ARM 和 x86 上，内存布局可能不同。</li>
<li><b>不能取地址。</b>位域没有独立地址，不能用 <code>&amp;</code> 取地址，也不能传给需要指针的函数。</li>
<li><b>sizeof 不可移植。</b>底层类型、对齐方式、填充规则都依赖编译器，协议解析时直接按结构体读会错位。</li>
<li><b>读写不是原子的。</b>一个位域的赋值通常编译成“读整个字 → 改位 → 写回”，在多任务或中断并发下会丢失更新。加 <code>volatile</code> 也不能解决原子性问题。</li>
</ol>
<p>所以操作寄存器更推荐显式的移位和掩码宏：</p>
<p><code>REG = (REG &amp; ~MASK) | ((val &lt;&lt; POS) &amp; MASK);</code></p>
<p>这样每一位的位置都写在代码里，跨平台行为确定，也便于做读-改-写的原子保护。</p>
<p>如果确实要用位域（比如某些编译器扩展的寄存器定义），必须加编译期断言检查 <code>sizeof</code> 和关键位的位置，并锁定编译器版本。</p>`,
        principle: `<p>位域只是语法糖，编译器仍然要生成加载、掩码、移位、存储的指令。布局的自由度来自标准的“实现定义”，目的是让编译器针对不同架构选择最高效的排布。</p>
<p>对寄存器来说，位的物理位置是由芯片手册固定的，不能由编译器决定，所以用位域本质上是在赌编译器的实现细节。</p>`,
        fig: {
          type: "bits",
          title: "位域的位序依赖实现",
          tag: "implementation defined",
          cells: [
            { v: "bit7", n: "a:1" },
            { v: "bit6", n: "b:2" },
            { v: "bit5", n: "b:2" },
            { v: "bit4", n: "c:3" },
            { v: "bit3", n: "c:3" },
            { v: "bit2", n: "c:3" },
            { v: "bit1", n: "res" },
            { v: "bit0", n: "res" }
          ],
          note: "不同编译器可能从高位开始排，也可能在跨字节时插入填充，实际布局必须查编译器手册。"
        },
        code: {
          lang: "c",
          title: "reg_access.h",
          src: `/* 不推荐：布局依赖编译器 */
typedef struct {
    volatile unsigned int enable : 1;
    volatile unsigned int mode   : 2;
    volatile unsigned int irq    : 1;
} ctrl_bits_t;

/* 推荐：位置和掩码显式写出来 */
#define CTRL_EN_POS    0
#define CTRL_EN_MASK   (1u << CTRL_EN_POS)
#define CTRL_MODE_POS  1
#define CTRL_MODE_MASK (0x3u << CTRL_MODE_POS)

static inline void ctrl_set_mode(volatile uint32_t *reg, uint32_t mode)
{
    uint32_t v = *reg;
    v &= ~CTRL_MODE_MASK;
    v |= (mode << CTRL_MODE_POS) & CTRL_MODE_MASK;
    *reg = v;
}`
        },
        codeNote: "读-改-写之间如果可能被中断打断，需要用临界区保护，或使用硬件支持的位设置/清除寄存器。",
        apply: `<p>我在项目里用宏定义每个寄存器的位位置和掩码，配合 <code>static inline</code> 的 set/clear 函数，既保证可移植，也方便代码搜索。</p>
<p>协议解析时绝不用位域直接映射结构体，而是逐字节读取后移位组装。这样即使换编译器、换字节序，行为也完全确定。</p>`,
        pitfalls: [
          "<b>用位域直接映射协议帧。</b>换平台后字段错位，解析出垃圾数据。",
          "<b>对位域取地址。</b>编译直接报错。",
          "<b>多任务同时写同一位域结构。</b>读-改-写竞争导致丢位。",
          "<b>以为 volatile 位域是原子的。</b>volatile 只保证不被优化，不保证原子性。"
        ],
        follow: [
          ["如何强制位域从低位开始分配？", "标准没有提供方法，只能依赖编译器选项（如 GCC 的 <code>-mms-bitfields</code> 影响布局），因此跨平台代码不应依赖它。"],
          ["C++ 的 std::bitset 能替代位域吗？", "bitset 是库类型，布局同样不保证与硬件寄存器一致，适合逻辑位操作，不适合寄存器映射。"]
        ]
      },

      {
        id: "C-21",
        chapter: "build",
        topic: "call",
        title: "函数调用时栈上发生了什么？参数是怎么传递的？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "理解 AAPCS 传参规则、LR 保存返回地址、栈帧的建立与销毁，以及递归为什么会爆栈。",
        q: `<p>面试官：调用一个函数时，CPU 和栈具体做了哪些事？为什么递归太深会栈溢出？</p>`,
        exam: `<p>考察对运行时机制的理解，也是分析 HardFault 和栈溢出的基础。能说出 R0-R3 传参、LR 存返回地址、栈帧保存局部变量和寄存器，就足够扎实。</p>`,
        core: `<p>AAPCS：前 4 个整型/指针参数放 <code>R0-R3</code>，多的压栈；<code>BL</code> 把返回地址写进 <code>LR</code>；被调函数 <code>PUSH {r7, lr}</code> 建栈帧并给局部变量留空间；返回时结果放 <code>R0</code>，<code>POP {r7, pc}</code> 恢复。</p><p>递归 N 层就有 N 个栈帧。栈大小在启动文件/链接脚本里固定，超了会踩堆或 HardFault；RTOS 每个任务独立栈，按最坏调用深度留余量。</p>`,
        answer: `<p>以 Cortex-M 的 AAPCS 调用约定为例：</p>
<ol>
<li><b>传参</b>：前 4 个整型/指针参数放在 R0-R3，超出的参数压栈；浮点参数在带 FPU 时用 S0-S15。</li>
<li><b>保存返回地址</b>：<code>BL</code> 指令把下一条指令地址写入 LR（R14），然后跳转。</li>
<li><b>建立栈帧</b>：被调函数入口通常执行 <code>PUSH {r7, lr}</code>，保存帧指针和返回地址；再把栈指针下移，为局部变量分配空间。</li>
<li><b>执行函数体</b>：局部变量通过 SP 或 FP 的相对偏移访问；如果需要调用其它函数，会把 LR 再保存到栈上。</li>
<li><b>返回</b>：把返回值放入 R0（64 位用 R0-R1），执行 <code>POP {r7, pc}</code>，从栈中恢复 LR 到 PC，同时恢复 SP。</li>
</ol>
<p>每次调用都会在栈上留下一个栈帧，递归 N 层就有 N 个栈帧。栈大小是固定的（在启动文件或链接脚本里定义），超过就踩到堆或其它内存，表现为数据被破坏、HardFault 或莫名其妙跑飞。</p>
<p>所以递归深度必须可控，或者改成迭代加显式栈。RTOS 里每个任务有独立栈，栈大小要按最坏调用深度估算并留余量。</p>`,
        principle: `<p>栈帧保存了三类东西：返回地址、调用者保存的寄存器、局部变量。函数返回后栈帧失效，所以不能返回指向局部变量的指针——那块内存随时会被下一次调用覆盖。</p>
<p>编译器优化（如 <code>-O2</code>）可能省略帧指针、把局部变量放进寄存器、做尾调用优化，这会改变栈的实际布局，也是“加打印就正常、不加就出错”这类问题的来源之一。</p>`,
        fig: {
          type: "layers",
          title: "一次函数调用的栈帧",
          tag: "stack frame",
          items: [
            { tag: "高地址", t: "调用者的栈帧", d: "局部变量、保存的寄存器" },
            { tag: "参数", t: "第 5 个及以后的参数", d: "前 4 个用 R0-R3 传递" },
            { tag: "返回地址", t: "LR（调用者的下一条指令）", d: "PUSH {r7, lr} 保存" },
            { tag: "帧指针", t: "R7 / FP", d: "用于定位局部变量" },
            { tag: "低地址", t: "被调函数的局部变量", d: "SP 向下增长" }
          ],
          note: "Cortex-M 的栈是满递减栈：PUSH 时 SP 先减后存，POP 时先取后加。"
        },
        code: {
          lang: "c",
          title: "stack_frame.c",
          src: `/* 错误：返回局部数组的地址 */
char *bad(void)
{
    char buf[16];
    return buf;          /* buf 在函数返回后失效 */
}

/* 正确：由调用者提供缓冲区，或使用静态/堆内存 */
void good(char *out, int n)
{
    /* 填充 out，长度不超过 n */
}

/* 递归改迭代：用显式数组模拟栈，深度可控 */
int factorial_iter(int n)
{
    int r = 1;
    while (n > 1) r *= n--;
    return r;
}`
        },
        codeNote: "返回局部变量地址是典型悬空指针来源，编译器通常会给出 warning，但不会阻止编译。",
        apply: `<p>估算任务栈时，我会用调试器查看栈的高水位标记（FreeRTOS 的 <code>uxTaskGetStackHighWaterMark</code>），再留 30% 余量。中断嵌套也会消耗当前任务栈，必须一起算。</p>
<p>分析 HardFault 时，从栈帧里读出出错时的 PC 和 LR，再对照 map 文件定位函数，这是最常用的手段。</p>`,
        pitfalls: [
          "<b>返回局部变量地址。</b>函数返回后栈帧失效，指针悬空。",
          "<b>递归没有终止条件或深度过大。</b>直接栈溢出。",
          "<b>函数指针类型不匹配。</b>参数传递方式不同，栈会错位。",
          "<b>以为参数一定在栈上。</b>前几个参数走寄存器，调试时看不到栈上的值。"
        ],
        follow: [
          ["为什么 Cortex-M 中断入口要硬件自动压栈？", "为了保证中断处理程序不破坏被中断任务的上下文，硬件自动保存 R0-R3、R12、LR、PC、xPSR，返回时自动恢复，速度快且不需要软件判断。"],
          ["尾调用优化是什么？", "当函数最后一个动作是调用另一个函数且不需要保留当前栈帧时，编译器可以复用栈帧直接跳转，避免栈增长。递归写成尾递归形式可以避免爆栈。"]
        ]
      },

      {
        id: "C-22",
        chapter: "keywords",
        topic: "macro",
        title: "inline、static inline 和宏有什么区别？头文件里该怎么写？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "inline 是类型安全的函数，宏是文本替换；头文件里用 static inline 避免多重定义。",
        q: `<p>面试官：<code>inline</code> 函数和宏都能“减少调用开销”，它们有什么区别？为什么头文件里通常写 <code>static inline</code>？</p>`,
        exam: `<p>考察对编译模型和优化行为的理解。能说清 inline 只是建议、static inline 解决头文件多重定义问题，就抓住了要点。</p>`,
        core: `<p>宏是预处理文本替换：无类型检查、无作用域、参数可能重复求值；<code>inline</code> 是真函数，有类型检查、参数只求值一次，但内联只是建议。</p><p>头文件里写 <code>static inline</code>：每个编译单元各得一份内部链接副本，不会重复定义冲突，函数体可见仍可内联。C99 的裸 <code>inline</code> 还要另在一个 <code>.c</code> 里提供外部定义，容易踩坑。</p>`,
        answer: `<p><b>宏</b>是预处理阶段的文本替换：没有类型检查、没有作用域、参数可能被求值多次、调试时看不到函数名。优点是彻底没有调用开销，且可以处理类型泛型（如 <code>MIN/MAX</code>）。</p>
<p><b>inline 函数</b>是真正的函数：有类型检查、参数只求值一次、可以调试、遵循作用域规则。编译器可以选择内联展开，也可以不展开——<code>inline</code> 只是建议，不是命令。</p>
<p><b>为什么头文件里写 static inline：</b></p>
<ul>
<li>头文件会被多个 .c 包含，如果只写 <code>inline</code>，C99 下它只是“内联定义”，本身不产生外部定义，多个 .c 包含并调用时会报未定义引用；</li>
<li><code>static</code> 让每个编译单元各有一份内部链接的副本，不会冲突；</li>
<li>因为函数体在头文件里可见，编译器仍有机会内联，兼顾了性能和可移植性。</li>
</ul>
<p>C99 的 <code>inline</code> 语义比较特殊：<code>inline</code> 定义不产生外部符号，需要在一个 .c 里提供 <code>extern inline</code> 的定义。这套规则容易出错，所以嵌入式项目普遍用 <code>static inline</code>。</p>`,
        principle: `<p>内联的收益是省掉调用开销（压栈、跳转、返回），代价是代码体积增大。MCU 的 Flash 通常只有几十到几百 KB，过度内联会导致代码膨胀、i-cache 命中率下降，反而变慢。</p>
<p>编译器会综合函数大小、调用次数、优化等级决定是否内联。递归函数、包含可变参数、函数指针取地址的场景通常无法内联。</p>`,
        fig: {
          type: "table",
          title: "宏、inline、普通函数对比",
          tag: "inline",
          head: ["维度", "宏", "static inline", "普通函数"],
          rows: [
            ["类型检查", "无", "有", "有"],
            ["参数求值", "可能多次", "一次", "一次"],
            ["调试", "展开后难定位", "可单步", "可单步"],
            ["代码体积", "每次展开", "可能展开", "一份"],
            ["头文件可用", "可以", "可以", "需声明"]
          ]
        },
        code: {
          lang: "c",
          title: "inline_util.h",
          src: `#ifndef UTIL_H
#define UTIL_H

#include <stdint.h>

/* 头文件里的工具函数：static inline 避免多重定义 */
static inline uint32_t min_u32(uint32_t a, uint32_t b)
{
    return a < b ? a : b;
}

/* 需要类型泛型时仍可用宏，但每个参数和整体都要加括号 */
#define MAX(a, b) (((a) > (b)) ? (a) : (b))

/* 寄存器位操作：用 inline 保证类型安全 */
static inline void reg_set_bits(volatile uint32_t *reg, uint32_t mask)
{
    *reg |= mask;
}

#endif`
        },
        codeNote: "static inline 函数如果未被使用，多数编译器不会生成代码，不会浪费 Flash。",
        apply: `<p>我的原则是：能用 <code>static inline</code> 就不用宏。只有需要字符串化（<code>#x</code>）、拼接 token（<code>##</code>）、条件编译，或者需要真正泛型时才用宏。</p>
<p>中断服务程序里的小工具函数（如位操作、环形缓冲区索引计算）适合 static inline；复杂的业务函数不要强行内联，否则 Flash 占用会明显上升。</p>`,
        pitfalls: [
          "<b>头文件里只写 inline。</b>多个 .c 包含并调用后链接报未定义引用（C99 的内联定义不产生外部符号）；写 <code>static inline</code> 才能各编译单元自给自足。",
          "<b>以为 inline 一定生效。</b>编译器可以拒绝，尤其是开了 <code>-O0</code> 时。",
          "<b>把大函数写成 inline。</b>代码膨胀，Flash 不够用。",
          "<b>用宏替代有副作用的表达式。</b><code>MAX(i++, j++)</code> 会导致自增多次。"
        ],
        follow: [
          ["inline 函数能取地址吗？", "可以，编译器会为它生成一个非内联的副本，函数指针指向那个副本。"],
          ["C++ 的 inline 和 C 有什么不同？", "C++ 中 inline 函数默认有外部链接且允许多重定义（链接器合并），不需要 static；C 的规则更复杂，所以跨语言代码通常仍写 static inline。"]
        ]
      },

      {
        id: "C-23",
        chapter: "types",
        topic: "promote",
        title: "整型提升和隐式类型转换有哪些坑？-1 > 0u 为什么成立？",
        diff: "高级",
        freq: "高频",
        type: "陷阱分析题",
        point: "小于 int 的类型先提升为 int，有符号与无符号混合运算按无符号处理，负数变成极大值。",
        q: `<p>面试官：<code>if (-1 &gt; 0u)</code> 的结果是什么？为什么？无符号循环倒序为什么会死循环？</p>`,
        exam: `<p>考察对 C 类型转换规则的掌握。这类 bug 极其隐蔽，能讲清“usual arithmetic conversions”说明基本功扎实。</p>`,
        core: `<p><code>-1 &gt; 0u</code> 为真：混合运算时 <code>-1</code> 被转成 <code>unsigned int</code>，即 <code>UINT_MAX</code>。</p><p>同类坑：无符号倒序循环 <code>i&gt;=0</code> 死循环；<code>size_t</code> 下 <code>len-1&gt;=0</code> 恒真；<code>char</code> 是否有符号由实现决定；<code>uint8_t</code> 相加先提升为 <code>int</code>，200+100 得 300 而不是 44。</p><p>对策：比较前显式转成同一类型，长度用 <code>size_t</code> 并避免减到负数，开 <code>-Wsign-compare -Wconversion</code>。</p>`,
        answer: `<p><code>-1 &gt; 0u</code> 的结果是<b>真</b>。原因是两个操作数类型不同时，会先做“寻常算术转换”：如果无符号类型的等级不低于有符号类型，就把有符号操作数转换成无符号。<code>-1</code> 转成 <code>unsigned int</code> 后是 <code>UINT_MAX</code>，当然大于 0。</p>
<p>常见坑还有：</p>
<ul>
<li><b>无符号倒序循环</b>：<code>for (unsigned i = n - 1; i &gt;= 0; i--)</code> 永远成立，i 减到 0 后再减就回绕成最大值，死循环。应该用 <code>i-- &gt; 0</code> 或改用有符号类型。</li>
<li><b>sizeof 返回 size_t</b>：<code>if (len - 1 &gt;= 0)</code> 在 len 为 0 时，<code>len - 1</code> 变成极大值，条件成立。</li>
<li><b>char 的符号性</b>：<code>char</code> 是否有符号由实现决定，把 0xFF 当 -1 还是 255 取决于编译器。跨平台代码应使用 <code>uint8_t/int8_t</code>。</li>
<li><b>整型提升</b>：<code>uint8_t a = 200, b = 100; a + b</code> 会先提升为 <code>int</code>，结果是 300 而不是 44；只有赋回 uint8_t 时才截断。</li>
<li><b>移位</b>：对负数左移、或移位数大于等于类型宽度，都是未定义行为。</li>
</ul>
<p>规避方法：比较前显式转换到同一类型；涉及长度用 <code>size_t</code> 并避免减到负数；打开 <code>-Wsign-compare</code> 和 <code>-Wconversion</code> 让编译器帮你发现。</p>`,
        principle: `<p>C 的整数运算遵循“整型提升 + 寻常算术转换”两步：先把小于 int 的类型提升为 int（如果 int 能表示其所有值），再在二元运算中把两个操作数转换成共同的类型，优先级是 long double &gt; double &gt; float &gt; 无符号长整型 &gt; 有符号长整型 ……</p>
<p>关键在于：当有符号和无符号的等级相同时，结果是无符号的。这是 C 标准为了简化实现做的选择，但给开发者留下了大量陷阱。</p>`,
        fig: {
          type: "table",
          title: "典型整型转换陷阱",
          tag: "conversion",
          head: ["表达式", "结果", "原因"],
          rows: [
            ["-1 > 0u", "真", "-1 转成 UINT_MAX"],
            ["uint8_t 200 + 100", "300（int）", "先提升为 int"],
            ["size_t 0 - 1", "SIZE_MAX", "无符号回绕"],
            ["char 0xFF == -1", "依赖实现", "char 符号性未定义"],
            ["1u << 31", "0x80000000", "无符号左移合法"]
          ]
        },
        code: {
          lang: "c",
          title: "conversion_trap.c",
          src: `#include <stdint.h>
#include <stddef.h>

/* 错误：无符号倒序会死循环 */
void bad_loop(size_t n)
{
    for (size_t i = n - 1; i >= 0; i--) {
        /* i 永远 >= 0 */
    }
}

/* 正确：用“先判断再减”的形式 */
void good_loop(size_t n)
{
    for (size_t i = n; i-- > 0; ) {
        /* i 依次为 n-1 ... 0 */
    }
}

/* 正确：比较前统一类型 */
int is_negative(int32_t v)
{
    return v < 0;
}

/* 注意：混合比较时显式转换，避免隐式提升 */
int less_than(size_t a, int b)
{
    return b >= 0 && a < (size_t)b;
}`
        },
        codeNote: "打开 -Wsign-compare 能在编译期发现大部分有符号/无符号混用问题。",
        apply: `<p>我在代码规范里要求：长度、索引、地址一律用 <code>size_t</code> 或 <code>uint32_t</code>，有符号数只用于确实可能为负的物理量（温度、差值）。两者比较时先做范围检查再转换。</p>
<p>协议解析时特别小心：字段宽度是 1/2 字节，读出来后要先提升到 32 位再运算，避免中间结果溢出。</p>`,
        pitfalls: [
          "<b>无符号变量做倒序循环。</b>条件永远为真，直接死循环。",
          "<b>用 int 接收 strlen 的返回值。</b>超大字符串时溢出。",
          "<b>混用有符号和无符号比较。</b>负数被转成极大值。",
          "<b>对有符号负数移位。</b>属于未定义行为，不同编译器结果不同。"
        ],
        follow: [
          ["为什么很多规范禁止用 char 存数值？", "char 的符号性由实现决定，跨平台时 0xFF 可能被解释为 -1 或 255，导致比较和扩展出错。应使用 uint8_t/int8_t。"],
          ["强制类型转换能解决所有问题吗？", "不能。转换只是告诉编译器“我知道自己在做什么”，如果值本身超出目标类型范围，结果仍是实现定义的。必须先做范围检查。"]
        ]
      }
    ]
  });
})();
