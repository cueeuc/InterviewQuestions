/* ============================================================
   import-rtos-extra.js
   从 RTOS 相关题目导入的补充题（仅收录站内没有重复的）
   答案按 FreeRTOS 实际实现重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("rtos-freertos", {
    chapters: [
      {
        id: "kernel",
        topics: [
          { id: "tcb", title: "TCB 与上下文切换" }
        ]
      },
      {
        id: "sync",
        topics: [
          { id: "queue-impl", title: "队列内部实现" }
        ]
      }
    ],

    questions: [
      {
        id: "R-21",
        chapter: "task",
        topic: "create",
        title: "FreeRTOS 的任务怎么创建和删除？动态和静态创建有什么区别？",
        diff: "中级",
        freq: "高频",
        type: "API 与机制题",
        point: "xTaskCreate / xTaskCreateStatic 的内存来源、vTaskDelete 的回收时机，以及删除任务时的资源风险。",
        q: `<p>面试官：FreeRTOS 里创建一个任务要传哪些参数？xTaskCreate 和 xTaskCreateStatic 有什么区别？任务删除后栈和 TCB 是谁回收的？</p>`,
        exam: `<p>考察任务生命周期。能说清“动态从 heap 分配、静态由用户提供内存、删除后空闲任务回收”，以及“删任务不等于释放它持有的资源”，就很好。</p>`,
        core: `<p>xTaskCreate 的栈深度单位是字，任务函数不能返回，参数不能传局部变量地址；静态创建不依赖堆，删除后动态内存要等空闲任务回收。</p>`,
        answer: `<p><b>创建任务的核心参数：</b></p>
<ul>
<li><b>pxTaskCode</b>：任务函数，原型 <code>void task(void *pvParameters)</code>，<b>不能返回</b>；返回会触发 <code>prvTaskExitError</code>，通常进入断言/死循环。</li>
<li><b>pcName</b>：任务名，仅调试用，长度受 <code>configMAX_TASK_NAME_LEN</code> 限制。</li>
<li><b>usStackDepth</b>：栈大小，单位是 <b>StackType_t 字</b>（Cortex-M 是 4 字节），不是字节。传 128 表示 512 字节。</li>
<li><b>pvParameters</b>：传给任务的参数指针。注意生命周期：不能传一个函数返回后就失效的局部变量地址。</li>
<li><b>uxPriority</b>：优先级，0 最低；必须小于 <code>configMAX_PRIORITIES</code>。</li>
<li><b>pxCreatedTask</b>：返回任务句柄，可用于删除、改优先级、通知；不需要可传 NULL。</li>
</ul>
<p><b>动态 vs 静态：</b></p>
<ul>
<li><b>xTaskCreate</b>：TCB 和栈都从 FreeRTOS heap 分配（heap_1~heap_5），返回 <code>pdPASS</code> 表示成功。方便，但运行期有分配失败风险，heap 也可能碎片化。</li>
<li><b>xTaskCreateStatic</b>：调用者提供 <code>StaticTask_t</code> 和栈数组，不依赖 heap。适合安全关键、禁止动态分配、或 RAM 紧张需要精确布局的项目。需要 <code>configSUPPORT_STATIC_ALLOCATION = 1</code>。</li>
</ul>
<p><b>删除：</b><code>vTaskDelete(handle)</code> 删除指定任务；<code>vTaskDelete(NULL)</code> 删除自己。</p>
<ul>
<li>任务被删除后，它不再参与调度；但它的 TCB 和栈<b>不一定立刻释放</b>。如果是动态创建，由<b>空闲任务</b>在之后的空闲时间里调用 <code>prvDeleteTCB</code> 回收；静态创建的内存本来就不归 FreeRTOS 管，不会释放。</li>
<li>删除自己后，当前任务不会再运行，所以 <code>vTaskDelete(NULL)</code> 之后的代码不要指望执行；必要的清理要在删除前做完。</li>
<li>如果删除了一个<b>正持有互斥锁/队列/内存</b>的任务，这些资源不会自动释放，其他任务可能永久阻塞。删除前必须由业务保证资源已归还，或设计成“通知任务自己退出”，而不是从外部强杀。</li>
</ul>
<p><b>更安全的退出方式：</b>给任务发一个“退出命令”，任务在主循环里收到后自己释放资源、<code>vTaskDelete(NULL)</code>。外部强杀只适合确定没有共享资源的简单任务。</p>`,
        principle: `<p>FreeRTOS 的任务删除是“标记 + 延迟回收”：删除时把任务从就绪/阻塞/事件链表摘除，如果是自己删除自己，还要让出 CPU；真正的内存回收交给空闲任务，因为删除动作可能发生在中断或临界区，不能立刻做复杂释放。</p>
<p>这也解释了为什么“删除任务后立刻创建同优先级任务”可能失败：旧 TCB 还没被空闲任务回收，heap 里暂时没有空间。</p>`,
        fig: {
          type: "table",
          title: "动态创建 vs 静态创建",
          tag: "rtos-task-create",
          head: ["对比项", "xTaskCreate", "xTaskCreateStatic"],
          rows: [
            ["TCB 来源", "FreeRTOS heap", "用户提供 StaticTask_t"],
            ["栈来源", "FreeRTOS heap", "用户提供数组"],
            ["失败风险", "heap 不足/碎片", "编译期确定，无运行期失败"],
            ["回收", "空闲任务释放", "不释放（用户管理）"],
            ["适用场景", "通用、快速开发", "安全关键、禁动态分配"]
          ]
        },
        code: {
          lang: "c",
          title: "task_create_delete.c",
          src: `#define TASK_STACK_WORDS  256          /* 256 字 = 1KB（Cortex-M） */

static TaskHandle_t s_worker;

static void worker_task(void *arg)
{
    const char *name = (const char *)arg;

    for (;;) {
        /* 正常业务：等待通知/队列，不要忙等 */
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

        if (g_worker_should_exit) {
            /* 先释放自己持有的资源，再退出 */
            app_release_resources();
            vTaskDelete(NULL);              /* 删除自己，后面的代码不会执行 */
        }

        app_do_work(name);
    }
}

int worker_start(const char *name)
{
    BaseType_t ret;

    ret = xTaskCreate(worker_task,
                      "worker",
                      TASK_STACK_WORDS,
                      (void *)name,             /* 生命周期必须覆盖任务运行期 */
                      tskIDLE_PRIORITY + 2,
                      &s_worker);
    if (ret != pdPASS) {
        return -1;                              /* 栈/heap 不足 */
    }
    return 0;
}

void worker_stop(void)
{
    if (!s_worker) return;

    /* 推荐：让任务自己退出，确保资源释放 */
    g_worker_should_exit = 1;
    xTaskNotifyGive(s_worker);

    /* 不推荐：vTaskDelete(s_worker); 直接强杀 */
    s_worker = NULL;
}`
        },
        codeNote: "栈大小以“字”为单位，不是字节。Cortex-M 上 128 字只有 512 字节，带 printf/浮点的任务很容易溢出。",
        apply: `<p>做过一个协议解析任务，外部命令一来就 <code>vTaskDelete</code> 强杀再重建。结果偶尔整个系统卡死：被杀的任务正持有队列锁，其他任务永久阻塞。后来改成“发退出通知，任务自己清理后删除”，问题消失。</p>
<p>另一个坑是栈单位：在 STM32 上按字节思维写了 <code>512</code>，以为是 512 字节，实际是 2KB；反过来写 <code>128</code> 以为是 128 字节够用，实际只有 512 字节，一调 sprintf 就栈溢出。现在都在宏名里写明 <code>_WORDS</code>。</p>`,
        pitfalls: [
          "<b>栈大小按字节传。</b>FreeRTOS 的单位是 StackType_t 字，Cortex-M 是 4 字节。",
          "<b>任务函数返回。</b>会走到 prvTaskExitError，通常是断言或死循环。",
          "<b>强杀持有资源的任务。</b>互斥锁、内存、队列不会自动释放。",
          "<b>vTaskDelete(NULL) 后还访问局部变量。</b>任务栈可能已被回收。",
          "<b>删除后继续用旧句柄。</b>句柄可能被新任务复用，操作到错误对象。"
        ],
        follow: [
          ["为什么删除任务后要由空闲任务回收？", "删除可能发生在临界区或中断上下文，不能立刻做复杂的内存释放；空闲任务优先级最低，在系统没事可做时统一回收，保证实时性。"],
          ["静态创建的任务删除后会释放内存吗？", "不会。内存是用户提供的，FreeRTOS 只把任务从调度器摘除，不负责释放；用户需要自己决定何时复用那块内存。"],
          ["vTaskDelete(NULL) 和 return 有什么区别？", "vTaskDelete(NULL) 是显式删除自己，由内核回收；return 是任务函数返回，会触发 configASSERT 或 prvTaskExitError，属于错误用法。"],
          ["任务句柄能跨任务使用吗？", "可以，句柄本质是指向 TCB 的指针；但必须保证 TCB 还有效。任务被删除后句柄失效，不能再用。"]
        ]
      },

      {
        id: "R-22",
        chapter: "kernel",
        topic: "tcb",
        title: "FreeRTOS 的 TCB 里有什么？任务第一次运行时的上下文是怎么构造的？",
        diff: "高级",
        freq: "中频",
        type: "内核原理题",
        point: "TCB 的关键字段、Cortex-M 的异常栈帧，以及任务首次运行时伪造的 xPSR/PC/LR/R0/EXC_RETURN。",
        q: `<p>面试官：FreeRTOS 创建一个任务时，明明任务还没运行过，为什么一切换过去就能从函数开头执行？它的“现场”是谁造的？</p>`,
        exam: `<p>考察对上下文切换的理解。能说清“初始化栈帧 + PendSV 恢复寄存器 + EXC_RETURN”，就说明不是只会调 API。</p>`,
        core: `<p>TCB 存栈顶、状态链表节点、优先级、栈起始和通知值；首次运行由 pxPortInitialiseStack 伪造异常帧，xPSR 的 Thumb 位必须为 1，PC 指向任务入口。</p>`,
        answer: `<p><b>TCB（Task Control Block）是任务的身份证，关键字段包括：</b></p>
<ul>
<li><b>pxTopOfStack</b>：当前栈顶，保存着任务被切换出去时的寄存器现场；上下文切换时从这里恢复。</li>
<li><b>xStateListItem / xEventListItem</b>：就绪/阻塞/挂起链表节点，以及等待事件（队列、通知、时间）的节点。</li>
<li><b>uxPriority / uxBasePriority</b>：当前优先级和基础优先级，互斥锁的优先级继承会临时改当前优先级。</li>
<li><b>pxStack</b>：栈的起始地址，用于栈溢出检测。</li>
<li><b>pcTaskName</b>：任务名，调试用。</li>
<li><b>pvParameters</b>：创建时传入的参数。</li>
<li><b>uxCriticalNesting</b>：临界区嵌套计数（部分移植）。</li>
<li><b>ulNotifiedValue / ucNotifyState</b>：任务通知的值和状态。</li>
</ul>
<p><b>第一次运行的“现场”是伪造的：</b>创建任务时，<code>pxPortInitialiseStack()</code> 在任务栈顶手工摆好一个异常栈帧，让 PendSV 第一次恢复时“看起来像刚从异常返回”：</p>
<ul>
<li><b>xPSR = 0x01000000</b>：bit24 是 Thumb 位，Cortex-M 必须为 1，否则一跳转就 HardFault。</li>
<li><b>PC = 任务入口函数</b>：恢复后从任务函数第一条指令开始执行。</li>
<li><b>LR = prvTaskExitError</b>：任务函数如果 return，就会跳到这里，触发断言/死循环。</li>
<li><b>R0 = pvParameters</b>：任务函数的第一个参数（AAPCS：R0 传第一个参数）。</li>
<li><b>R1~R3、R12 = 0</b>：未定义，清零便于调试。</li>
<li><b>EXC_RETURN 不是压进栈的 8 个寄存器之一</b>，而是异常返回时 LR 的值。首次切到任务时，PendSV 的返回路径使用 <b>0xFFFFFFFD</b>：返回 Thread 模式、使用 PSP、不带 FPU 扩展帧。如果开启 FPU 且任务使用了浮点，会使用 <b>0xFFFFFFED</b>，并额外保存 S0~S15、FPSCR。</li>
</ul>
<p><b>切换过程：</b>SysTick/PendSV 触发 → 硬件自动压栈 R0~R3、R12、LR、PC、xPSR（使用 PSP）→ PendSV 里再保存 R4~R11 → 把当前 pxTopOfStack 存回 TCB → 选下一个任务 → 从它的 pxTopOfStack 恢复 R4~R11 → 硬件从栈里恢复 R0~R3、R12、LR、PC、xPSR → 任务开始跑。</p>
<p><b>为什么用 PendSV：</b>PendSV 可以被配置为最低优先级，确保上下文切换不会打断高优先级中断；它由硬件在异常返回时统一处理，比在中断里手工保存所有寄存器简单可靠。</p>`,
        principle: `<p>Cortex-M 的异常机制规定：异常发生时硬件自动压栈 8 个寄存器（R0~R3、R12、LR、PC、xPSR），异常返回时自动恢复。RTOS 利用这一点，把“任务切换”伪装成一次异常返回：只要栈里摆好这 8 个值，就能跳到任意函数。</p>
<p>因此任务首次运行的栈帧不是“保存”出来的，而是“构造”出来的；xPSR 的 Thumb 位、EXC_RETURN 的模式位错一个，就会 HardFault。</p>`,
        fig: {
          type: "bits",
          title: "Cortex-M 任务初始栈帧（简化）",
          tag: "rtos-initial-frame",
          cells: [
            { v: "xPSR", n: "0x01000000，Thumb 位" },
            { v: "PC", n: "任务入口" },
            { v: "LR", n: "prvTaskExitError" },
            { v: "R12", n: "0" },
            { v: "R3~R1", n: "0" },
            { v: "R0", n: "pvParameters" },
            { v: "R11~R4", n: "PendSV 保存区" }
          ],
          note: "栈从高地址向低地址增长；pxTopOfStack 指向最低地址的保存槽。EXC_RETURN 由异常返回时的 LR 提供，不在这 8 个栈帧槽里。"
        },
        code: {
          lang: "c",
          title: "port_initial_stack.c",
          src: `/* Cortex-M3/M4 移植层的简化版：构造任务第一次运行的栈帧 */
StackType_t *pxPortInitialiseStack(StackType_t *pxTopOfStack,
                                   TaskFunction_t pxCode,
                                   void *pvParameters)
{
    /* 硬件异常栈帧：从高到低依次摆放 */
    *(--pxTopOfStack) = (StackType_t)0x01000000;   /* xPSR：Thumb 位必须为 1 */
    *(--pxTopOfStack) = (StackType_t)pxCode;       /* PC：任务入口 */
    *(--pxTopOfStack) = (StackType_t)prvTaskExitError; /* LR：return 的落点 */
    *(--pxTopOfStack) = (StackType_t)0;            /* R12 */
    *(--pxTopOfStack) = (StackType_t)0;            /* R3 */
    *(--pxTopOfStack) = (StackType_t)0;            /* R2 */
    *(--pxTopOfStack) = (StackType_t)0;            /* R1 */
    *(--pxTopOfStack) = (StackType_t)pvParameters; /* R0：第一个参数 */

    /* 软件保存区：R4~R11，首次运行给 0 即可 */
    for (int i = 0; i < 8; i++) {
        *(--pxTopOfStack) = (StackType_t)0;
    }

    /* 如果开启 FPU，还要保存 S0~S15、FPSCR，并让 EXC_RETURN=0xFFFFFFED */
    return pxTopOfStack;
}

/* 任务函数返回时的落点：不应发生 */
static void prvTaskExitError(void)
{
    configASSERT(0);
    for (;;) {
        /* 停在这里，等待调试器/看门狗 */
    }
}`
        },
        codeNote: "不同 Cortex-M 移植的栈帧顺序和是否保存 FPU 不一样，上面是原理示意。实际项目不要自己改 port.c，除非你非常清楚 AAPCS 和异常帧布局。",
        apply: `<p>排查过一次“任务一创建就 HardFault”：团队自己改移植层，构造 xPSR 时写成了 0，Thumb 位为 0，异常返回直接 UsageFault。改成 0x01000000 后正常。</p>
<p>还遇到 FPU 任务偶发数据错乱：移植层没保存 S0~S15，浮点运算的任务切换后寄存器被别的任务覆盖。开启 <code>configUSE_TASK_FPU_SUPPORT</code> 并确认 EXC_RETURN 是 0xFFFFFFED 后解决。上下文切换的坑，基本都能在栈帧里找到答案。</p>`,
        pitfalls: [
          "<b>xPSR 的 Thumb 位没置 1。</b>异常返回直接 HardFault。",
          "<b>EXC_RETURN 写错。</b>返回到 Handler 模式或用错栈指针，系统立刻崩。",
          "<b>FPU 上下文没保存。</b>浮点任务切换后结果错乱，且很难复现。",
          "<b>栈顶没按 8 字节对齐。</b>AAPCS 要求 8 字节对齐，否则浮点/LDRD 可能 fault。",
          "<b>以为 TCB 里存了所有寄存器。</b>寄存器在任务栈里，TCB 只存栈顶指针。"
        ],
        follow: [
          ["为什么任务函数不能 return？", "return 会把 LR 的值当返回地址，而初始 LR 被设成 prvTaskExitError；它通常触发断言或死循环。任务应该是一个无限循环。"],
          ["PendSV 为什么设为最低优先级？", "保证上下文切换不会打断任何高优先级中断；中断可以正常嵌套，等所有中断处理完再切换任务，降低延迟。"],
          ["R0 为什么能传参数？", "ARM AAPCS 规定函数调用的第一个参数放在 R0。伪造栈帧时把 pvParameters 放进 R0，异常返回后任务函数就“收到”了参数。"],
          ["FPU 的懒加载（lazy stacking）是什么？", "Cortex-M4F 在异常入口只在需要时保存 FPU 寄存器，减少中断延迟；RTOS 要正确处理 EXC_RETURN 的 bit4，否则 FPU 上下文会丢。"]
        ]
      },

      {
        id: "R-23",
        chapter: "sync",
        topic: "queue-impl",
        title: "FreeRTOS 的消息队列内部是怎么实现的？为什么它能阻塞任务？",
        diff: "高级",
        freq: "中频",
        type: "内核原理题",
        point: "环形缓冲区 + 等待发送/接收链表 + 拷贝语义，以及 FromISR 版本为什么不能阻塞。",
        q: `<p>面试官：FreeRTOS 的队列不是简单的数组吧？任务往满队列里发数据会怎样？多个任务等同一个队列，醒来顺序怎么定？</p>`,
        exam: `<p>考察队列的内部结构。能说清“环形缓冲 + 两条等待链表 + 拷贝入队”，以及“唤醒最高优先级、同优先级按等待时间”，就很好。</p>`,
        core: `<p>FreeRTOS 队列是环形缓冲区加两个等待链表，发送满时阻塞、接收空时阻塞，唤醒最高优先级等待任务；队列拷贝数据本身，大对象应传指针。</p>`,
        answer: `<p><b>队列的核心结构：</b></p>
<ul>
<li><b>存储区</b>：一块连续内存，<code>uxLength</code> 个槽，每槽 <code>uxItemSize</code> 字节。</li>
<li><b>环形指针</b>：<code>pcHead</code>、<code>pcTail</code>、<code>pcWriteTo</code>、<code>pcReadFrom</code>。写入到 <code>pcWriteTo</code>，读取从 <code>pcReadFrom</code>，到尾部回绕到头部。</li>
<li><b>uxMessagesWaiting</b>：当前消息数，用于判空/判满。</li>
<li><b>xTasksWaitingToSend</b>：等待发送（队列满时阻塞）的任务链表。</li>
<li><b>xTasksWaitingToReceive</b>：等待接收（队列空时阻塞）的任务链表。</li>
<li><b>uxQueueType / xMutexHolder / uxRecursiveCallCount</b>：区分队列、互斥锁、递归锁；互斥锁记录持有者，用于优先级继承。</li>
</ul>
<p><b>发送（xQueueSend）：</b></p>
<ol>
<li>进临界区（挂起调度器/关中断），检查 <code>uxMessagesWaiting < uxLength</code>。</li>
<li>有空位：把数据<b>拷贝</b>到 <code>pcWriteTo</code>，移动写指针，消息数 +1。</li>
<li>如果有任务在等接收：把等待队列里优先级最高的任务从阻塞链表移到就绪链表，触发切换。</li>
<li>队列满：如果阻塞时间不为 0，把当前任务挂到 <code>xTasksWaitingToSend</code>，设置超时，主动让出 CPU；超时后返回 <code>errQUEUE_FULL</code>。</li>
</ol>
<p><b>接收（xQueueReceive）：</b>队列非空就拷贝数据、移动读指针、消息数 -1，并检查是否有任务在等发送（有空位了，唤醒它）；队列空就挂到 <code>xTasksWaitingToReceive</code>，阻塞等待或超时。</p>
<p><b>唤醒顺序：</b>优先唤醒<b>优先级最高</b>的等待任务；同优先级时，通常唤醒等待时间最久的（FIFO）。这也是为什么“多个任务等同一个队列”时，不能假设先等的先拿到——高优先级任务会插队。</p>
<p><b>为什么是拷贝，不是传指针：</b>队列拷贝的是数据本身（<code>uxItemSize</code> 字节）。发送方的局部变量出作用域后，队列里的数据仍然有效。代价是大对象拷贝开销大；要传大块数据，应该传指针，但指针指向的缓冲区生命周期由应用自己保证。</p>
<p><b>FromISR 版本：</b><code>xQueueSendFromISR</code> 不能在中断里阻塞，所以队列满时直接返回失败；如果唤醒了一个更高优先级任务，通过 <code>pxHigherPriorityTaskWoken</code> 告诉中断退出时是否要切换。</p>
<p><b>互斥锁也是队列：</b>FreeRTOS 的 mutex 本质是一个长度为 1、itemSize 为 0 的特殊队列，用 <code>xMutexHolder</code> 记录持有者，实现优先级继承和递归计数。</p>`,
        principle: `<p>队列是“数据 + 两条等待链表 + 临界区”的组合。临界区保证多任务/中断并发下指针和计数的一致性；等待链表把“暂时不满足条件”的任务挂起，而不是忙等，从而让 CPU 去跑别的任务。</p>
<p>拷贝语义让队列成为“值传递”的安全通道；代价是每发一条消息都要 memcpy。小消息（几个字节到几十字节）非常合适，大块数据应该用指针或流缓冲区。</p>`,
        fig: {
          type: "flow",
          title: "xQueueSend 的内部路径",
          tag: "rtos-queue",
          items: [
            { t: "进入临界区", d: "挂起调度器/关中断" },
            { t: "队列有空位？", d: "有 → 拷贝数据、移动写指针" },
            { t: "唤醒等待接收者", d: "选最高优先级任务就绪" },
            { t: "队列满？", d: "无空位 → 挂到等待发送链表" },
            { t: "阻塞/超时", d: "让出 CPU，超时返回失败" }
          ]
        },
        code: {
          lang: "c",
          title: "queue_usage.c",
          src: `/* 队列存“值”，不存指针：每条消息 8 字节 */
typedef struct {
    uint8_t  cmd;
    uint8_t  len;
    uint16_t seq;
    uint32_t value;
} msg_t;

static QueueHandle_t s_queue;

void comm_init(void)
{
    /* 长度 16，每条 8 字节，共 128 字节 + 队列控制块 */
    s_queue = xQueueCreate(16, sizeof(msg_t));
    configASSERT(s_queue != NULL);
}

/* 任务上下文：可以阻塞等待 */
int comm_send(const msg_t *m, TickType_t timeout)
{
    return xQueueSend(s_queue, m, timeout) == pdPASS ? 0 : -1;
}

/* 中断上下文：不能阻塞，必须用 FromISR */
void USART1_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;
    msg_t m = { .cmd = 0x01, .len = 0, .seq = 0, .value = 0 };

    /* 队列满时直接失败，不能等 */
    xQueueSendFromISR(s_queue, &m, &woken);

    portYIELD_FROM_ISR(woken);       /* 唤醒了更高优先级任务才切换 */
}

/* 接收任务：阻塞等待，醒来处理 */
static void comm_task(void *arg)
{
    msg_t m;

    for (;;) {
        if (xQueueReceive(s_queue, &m, portMAX_DELAY) == pdPASS) {
            app_handle(&m);
        }
    }
}`
        },
        codeNote: "队列里存的是 msg_t 的拷贝。发送方把 &m 传给 xQueueSend 后，函数返回就可以复用 m，不影响队列里的数据；但如果队列存的是指针，指针指向的缓冲区就不能随便复用。",
        apply: `<p>做过一个串口命令队列，任务 A 发、任务 B 收，图省事在队列里存了 <code>char *</code>。结果 B 解析时字符串已经被 A 的下一次接收覆盖，命令随机错乱。后来改成队列存固定长度的结构体，问题消失。</p>
<p>还遇到“中断里调用 xQueueSend 偶尔卡死”：在 ISR 里用了带阻塞的版本，队列满时试图阻塞，直接触发断言。改成 <code>xQueueSendFromISR</code> 并检查返回值后正常。中断里永远不能等。</p>`,
        pitfalls: [
          "<b>队列里存指针，缓冲区被复用。</b>接收方读到的是新数据或野指针。",
          "<b>ISR 里用非 FromISR 版本。</b>可能阻塞/触发断言，系统卡死。",
          "<b>阻塞时间用 portMAX_DELAY 却在中途需要退出。</b>任务无法响应停止命令，只能强杀。",
          "<b>大对象直接入队。</b>每次 memcpy 很大，实时性变差；应传指针或改用流缓冲区。",
          "<b>假设先等先得。</b>高优先级任务会插队，同优先级才近似 FIFO。"
        ],
        follow: [
          ["队列和流缓冲区有什么区别？", "队列按“条”存固定长度消息，适合命令/结构体；流缓冲区按“字节流”存，适合串口/音频等不定长数据，没有消息边界。"],
          ["为什么互斥锁要用队列实现？", "队列天然有阻塞/唤醒、等待链表和临界区保护；互斥锁在此基础上增加持有者记录、优先级继承和递归计数，复用内核机制，代码更简洁。"],
          ["队列满时不想丢数据怎么办？", "发送方阻塞等待（任务上下文），或加大队列、提高消费者优先级、用覆盖策略并计数丢弃。ISR 里不能阻塞，只能在设计上保证队列足够大或做溢出统计。"],
          ["xQueueSend 会触发任务切换吗？", "如果唤醒了更高优先级任务，会；否则只是把数据放进队列，当前任务继续跑。实际切换点由调度器在临界区退出时决定。"]
        ]
      },

      {
        id: "R-24",
        chapter: "sync",
        topic: "deadlock",
        title: "递归互斥锁能解决两把不同锁造成的死锁吗？同一任务重复获取同一把锁怎么办？",
        diff: "高级",
        freq: "中频",
        type: "同步机制辨析题",
        point: "递归锁只解决同一任务重复获取同一把锁；两把不同锁的 ABBA 死锁要靠锁顺序、超时、单锁或消息传递。",
        q: `<p>面试官：任务里先拿锁 A 再拿锁 B，另一个任务先拿 B 再拿 A，死锁了。有人说换成递归互斥锁就行，对吗？</p>`,
        exam: `<p>考察对死锁四个必要条件的理解，以及递归锁的适用边界。能明确说“递归锁不解决两把不同锁”，就说明真懂。</p>`,
        core: `<p>递归锁只解决同一任务重复获取同一把锁，解决不了两把锁的 ABBA 死锁；死锁要靠固定加锁顺序、超时和避免嵌套。</p>`,
        answer: `<p><b>不对。递归互斥锁解决的是“同一个任务重复获取同一把锁”，不是“两把不同锁的交叉等待”。</b></p>
<p><b>递归锁的语义：</b>同一个任务可以多次 <code>xSemaphoreTakeRecursive</code> 同一把锁，内部计数 +1；每取一次就要 <code>xSemaphoreGiveRecursive</code> 一次，计数归零才真正释放。它允许重入，但不会改变“锁 A 和锁 B 的获取顺序”。</p>
<p><b>ABBA 死锁：</b>任务 1 持有 A 等 B，任务 2 持有 B 等 A，双方都不释放，永久等待。这和“是不是递归锁”无关——两把锁依然是两个独立资源，交叉等待的条件没变。</p>
<p><b>正确做法：</b></p>
<ol>
<li><b>固定锁顺序</b>：全系统约定“先 A 后 B”，任何任务都不允许反序。最简单、最有效。</li>
<li><b>带超时获取</b>：拿 B 失败就释放 A、退避重试；能打破死锁，但会增加复杂度和抖动。</li>
<li><b>合并成一把粗锁</b>：如果 A、B 总是一起用，干脆一把锁保护整个临界资源，减少锁的数量。</li>
<li><b>缩小临界区/消息传递</b>：不共享就无锁；把资源交给一个专职任务，其他任务发消息，由它串行处理。</li>
<li><b>优先级继承/优先级天花板</b>：解决优先级反转，不是解决 ABBA 死锁，别混为一谈。</li>
</ol>
<p><b>同一任务重复获取同一把锁：</b>用递归互斥锁，或者重构代码避免重入（例如把公共逻辑拆成“已持锁”的内部函数，外层统一加锁）。递归锁方便，但取/放次数必须严格配对，否则锁永远不释放。</p>
<p><b>什么时候不该用递归锁：</b>中断里不能用（互斥锁不能在 ISR 里取）；跨任务不能“替别人释放”；递归层数太深说明设计有问题，应该重新划分临界区。</p>`,
        principle: `<p>死锁的四个必要条件：互斥、占有并等待、不可抢占、循环等待。递归锁只改变了“同一任务对同一资源的再次请求”，没有破坏“循环等待”，所以对 ABBA 无效。</p>
<p>破坏循环等待最直接的办法就是全局锁顺序；破坏“占有并等待”可以用一次性申请所有锁或超时回退；破坏“不可抢占”在 RTOS 里通常不现实。</p>`,
        fig: {
          type: "table",
          title: "递归锁 vs 两把不同锁",
          tag: "rtos-recursive",
          head: ["场景", "递归锁有用吗", "正确做法"],
          rows: [
            ["同一任务重复取同一把锁", "有用", "递归锁，取/放配对"],
            ["任务 1 先 A 后 B，任务 2 先 B 后 A", "无用", "固定锁顺序 / 超时回退"],
            ["中断里要保护共享数据", "不能用", "临界区/关中断/原子操作"],
            ["跨任务释放锁", "不允许", "重新设计所有权"]
          ]
        },
        code: {
          lang: "c",
          title: "recursive_mutex.c",
          src: `/* 场景 1：同一任务重复获取同一把锁 —— 递归锁 */
static SemaphoreHandle_t s_rec_mutex;

void rec_mutex_init(void)
{
    s_rec_mutex = xSemaphoreCreateRecursiveMutex();
    configASSERT(s_rec_mutex != NULL);
}

void outer_func(void)
{
    xSemaphoreTakeRecursive(s_rec_mutex, portMAX_DELAY);
    inner_func();                       /* 内部还会再取一次 */
    xSemaphoreGiveRecursive(s_rec_mutex);
}

void inner_func(void)
{
    xSemaphoreTakeRecursive(s_rec_mutex, portMAX_DELAY);
    /* 访问共享资源 */
    xSemaphoreGiveRecursive(s_rec_mutex);
}

/* 场景 2：两把不同锁 —— 递归锁没用，必须固定顺序 */
static SemaphoreHandle_t s_lock_a;
static SemaphoreHandle_t s_lock_b;

/* 全系统约定：先 A 后 B。所有任务都必须遵守 */
void task1_work(void)
{
    xSemaphoreTake(s_lock_a, portMAX_DELAY);
    xSemaphoreTake(s_lock_b, portMAX_DELAY);

    /* 临界区 */

    xSemaphoreGive(s_lock_b);
    xSemaphoreGive(s_lock_a);
}

void task2_work(void)
{
    /* 错误写法：先 B 后 A，和 task1 形成 ABBA 死锁 */
    /* xSemaphoreTake(s_lock_b, ...); xSemaphoreTake(s_lock_a, ...); */

    /* 正确写法：同样先 A 后 B */
    xSemaphoreTake(s_lock_a, portMAX_DELAY);
    xSemaphoreTake(s_lock_b, portMAX_DELAY);

    /* 临界区 */

    xSemaphoreGive(s_lock_b);
    xSemaphoreGive(s_lock_a);
}`
        },
        codeNote: "递归锁只对“同一任务、同一把锁”有效。两把不同锁的交叉等待，换任何锁类型都救不了，只能靠设计消除循环等待。",
        apply: `<p>项目里两个模块各自提供 <code>set_param()</code>，内部都会加自己的锁；A 模块回调 B、B 模块回调 A，运行时偶发死锁。有人提议“都换成递归锁”，我不同意——这是两把不同锁的 ABBA，递归锁不解决。最后把参数访问收敛到一个参数管理任务，其他模块发消息，锁自然消失。</p>
<p>另一个场景是同一任务里公共函数被内外层都调用，确实需要递归锁。但后来发现取/放次数在异常分支里没配对，锁永远不释放；最后改成“内部函数假定已持锁，外层统一加锁”，不再依赖递归。</p>`,
        pitfalls: [
          "<b>以为递归锁能解决所有死锁。</b>它只解决同一任务重复获取同一把锁。",
          "<b>递归锁取/放次数不配对。</b>计数不归零，锁永远不释放。",
          "<b>在中断里使用互斥锁/递归锁。</b>互斥锁带阻塞和优先级继承，ISR 里不能用。",
          "<b>锁顺序只在文档里约定，代码不检查。</b>新同事一反序就死锁；要靠封装/代码评审保证。",
          "<b>持锁调用未知的回调。</b>回调里可能再取锁，形成隐藏的交叉依赖。"
        ],
        follow: [
          ["递归锁和普通互斥锁在 FreeRTOS 里有什么区别？", "普通互斥锁同一任务重复获取会失败/死锁；递归锁内部有递归计数，允许同一任务多次获取，但必须同样次数释放。两者都支持优先级继承。"],
          ["互斥锁能被非持有者释放吗？", "FreeRTOS 的互斥锁要求由持有者释放，非持有者释放会触发断言；二值信号量没有持有者概念，可以由其他任务/中断给出。"],
          ["带超时的锁获取能完全避免死锁吗？", "不能完全避免，但能打破“永久等待”：超时后释放已持有的锁、退避重试，系统可以恢复。代价是逻辑更复杂、可能发生活锁。"],
          ["如何排查死锁？", "看每个任务卡在哪个锁、谁持有它；用调试器查看 TCB 和互斥锁的持有者；或者加锁顺序检查、运行时记录锁获取栈。"]
        ]
      }
    ]
  });
})();