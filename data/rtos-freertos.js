/* ============================================================
   08 RTOS 与 FreeRTOS
   ============================================================ */
(function () {
  "use strict";

  EIK.register("rtos-freertos", {
    chapters: [
      {
        id: "task",
        title: "任务与调度",
        topics: [
          { id: "bare", title: "裸机与 RTOS" },
          { id: "state", title: "任务状态与切换" },
          { id: "sched", title: "调度策略" }
        ]
      },
      {
        id: "sync",
        title: "同步与通信",
        topics: [
          { id: "sem", title: "信号量与互斥锁" },
          { id: "queue", title: "队列、事件组与通知" }
        ]
      },
      {
        id: "kernel",
        title: "内核机制与内存",
        topics: [
          { id: "critical", title: "临界区与中断" },
          { id: "heap", title: "任务栈与内存管理" }
        ]
      }
    ],

    questions: [
      {
        id: "R-01",
        chapter: "task",
        topic: "bare",
        title: "前后台系统和 RTOS 有什么区别？什么时候该上 RTOS？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "主循环 + 中断的局限、RTOS 的调度与同步能力，以及引入成本。",
        q: `<p>面试官：什么是<strong>前后台系统</strong>？它和 RTOS 有什么区别？你的项目为什么用（或不用）RTOS？</p>`,
        exam: `<p>考察架构选型能力，而不是“RTOS 一定更好”。能说清“前后台是非抢占的，长任务会拖慢响应”“RTOS 用优先级保证实时性，但增加 RAM 和复杂度”，并且能给出判断依据，才是成熟回答。</p>`,
        core: `<p>前后台是主循环加中断、没有调度器，实时性差；RTOS 用优先级抢占保证关键任务响应，任务多、实时性要求不同才值得上，简单系统裸机更省更可靠。</p>`,
        answer: `<p>前后台系统就是“主循环 + 中断”：中断（前台）处理紧急事件，置标志；主循环（后台）轮询标志，依次处理各任务。它没有调度器，任务之间是顺序执行的。</p>
<p>问题是实时性差：如果主循环里有一个任务耗时 50ms，其他任务都得等，中断虽然能抢占，但中断里不能做复杂处理。随着功能增加，主循环会变成一堆标志位和状态机，维护困难。</p>
<p>RTOS 引入任务和调度器，每个任务有独立栈和优先级，高优先级任务就绪时立刻抢占，保证关键任务的响应时间。它还提供信号量、队列等同步机制，让任务间的协作更清晰。</p>
<p>是否上 RTOS 看三点：任务数量多且实时性要求不同、需要复杂的同步、团队需要可维护的架构。如果只是几个传感器 + 一个串口，裸机状态机反而更简单、更省 RAM，也更可靠。</p>`,
        principle: `<p>前后台的“实时性”取决于最长任务执行时间，最坏情况是所有任务串行累加。RTOS 的实时性取决于最高优先级任务的就绪延迟，只要优先级分配合理，关键任务可以做到微秒级响应。</p>
<p>RTOS 的代价是：每个任务独立栈（几百字节到几 KB）、内核代码占用 Flash、调度和同步有额外开销、调试复杂度上升（死锁、优先级反转、栈溢出）。</p>`,
        fig: {
          type: "table",
          title: "前后台与 RTOS 对比",
          tag: "compare",
          head: ["维度", "前后台系统", "RTOS"],
          rows: [
            ["调度方式", "顺序执行 + 中断抢占", "优先级抢占 + 时间片"],
            ["实时性", "取决于最长任务", "取决于优先级设计"],
            ["RAM 开销", "一个栈", "每任务一个栈 + 内核对象"],
            ["同步机制", "标志位、全局变量", "信号量、队列、事件组"],
            ["复杂度", "低", "中高（需处理并发问题）"],
            ["适用规模", "少量简单任务", "多任务、复杂时序"]
          ]
        },
        apply: `<p>实际项目常见演进路径：原型阶段用裸机 + 状态机快速验证；功能增加后主循环变得臃肿，再迁移到 RTOS。迁移时把原来的每个“功能块”改成一个任务，用队列替代全局标志，结构会清晰很多。</p>
<p>有些场景适合“RTOS + 裸机中断”混合：硬实时部分放在高优先级中断里，业务逻辑放任务里，兼顾响应和可维护性。</p>`,
        pitfalls: [
          "<b>认为 RTOS 能解决所有实时性问题。</b>优先级分配不合理、临界区太长、中断太频繁，照样会丢 deadline。",
          "<b>小项目强行上 RTOS。</b>增加 RAM 开销和调试难度，收益却很小。",
          "<b>用 RTOS 却还在用全局变量通信。</b>没有利用队列和信号量，竞态问题依然存在。"
        ],
        follow: [
          [
            "RTOS 的实时性是怎么保证的？",
            "靠优先级抢占：高优先级任务一旦就绪，调度器在下一个调度点立刻切换过去。调度点包括中断返回、系统调用、时间片到期。"
          ],
          [
            "什么是硬实时和软实时？",
            "硬实时要求必须在截止时间内完成，超时就是失败（如电机控制、安全气囊）；软实时超时只是体验下降（如界面刷新、日志上传）。"
          ],
          [
            "RTOS 一定比裸机慢吗？",
            "单看任务切换有开销，但 RTOS 让关键任务的响应更确定。总体吞吐量可能略低，但实时性和可维护性更好。"
          ]
        ]
      },

      {
        id: "R-02",
        chapter: "task",
        topic: "state",
        title: "FreeRTOS 的任务有哪几种状态？切换是怎么发生的？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "运行/就绪/阻塞/挂起四态、就绪链表，以及 PendSV 上下文切换。",
        q: `<p>面试官：<strong>FreeRTOS 的任务状态</strong>有哪几种？一个任务调用 <code>vTaskDelay</code> 之后发生了什么？上下文切换的底层是怎么实现的？</p>`,
        exam: `<p>这是 FreeRTOS 的核心机制题。能说清“运行/就绪/阻塞/挂起”“延时任务从就绪链表移到延时链表”“PendSV 里保存 R4-R11 和 PSP”，说明你读过源码或移植层。</p>`,
        core: `<p>FreeRTOS 任务有运行、就绪、阻塞、挂起四种状态；延时和等事件进阻塞、到期自动回就绪，挂起只能显式恢复，切换由 PendSV 完成。</p>`,
        answer: `<p>FreeRTOS 的任务有四种状态：运行（Running，当前占用 CPU）、就绪（Ready，可以运行但还没轮到）、阻塞（Blocked，等待事件或延时到期）、挂起（Suspended，被显式挂起，不参与调度）。</p>
<p>调用 <code>vTaskDelay(100)</code> 后，任务从就绪链表移除，插入延时链表，状态变为阻塞；调度器立刻切换到下一个最高优先级的就绪任务。100ms 后 SysTick 中断检查延时链表，把到期任务移回就绪链表。</p>
<p>上下文切换的底层是 PendSV 异常：调度器把 PendSV 挂起，等所有中断处理完后执行。PendSV 里先保存当前任务的 R4-R11 到它的栈，把栈顶存入 TCB；再取出下一个任务的栈顶，恢复 R4-R11，更新 PSP，最后 <code>BX LR</code> 让硬件自动恢复剩下的寄存器。</p>`,
        principle: `<p>FreeRTOS 用多个链表管理任务：就绪链表按优先级分组（<code>pxReadyTasksLists[configMAX_PRIORITIES]</code>），延时链表按唤醒时间排序，挂起链表、终止链表各一个。调度就是“找最高优先级的非空就绪链表，取第一个任务”。</p>
<p>为了快速找到最高优先级，FreeRTOS 用了一个位图 <code>uxTopReadyPriority</code>，每个优先级占一位，用 <code>CLZ</code> 指令（前导零计数）一条指令就能找到最高位，比遍历快得多。</p>`,
        fig: {
          type: "flow",
          title: "任务状态迁移",
          tag: "state machine",
          items: [
            { t: "创建", d: "→ 就绪" },
            { t: "调度选中", d: "→ 运行" },
            { t: "延时/等事件", d: "→ 阻塞" },
            { t: "事件到达", d: "→ 就绪" },
            { t: "vTaskSuspend", d: "→ 挂起" }
          ]
        },
        code: {
          lang: "c",
          title: "task_demo.c",
          src: `#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"

static QueueHandle_t s_cmd_queue;

/* 生产者任务：周期采集，发送到队列 */
static void sensor_task(void *arg)
{
    TickType_t last = xTaskGetTickCount();

    for (;;) {
        sensor_data_t d;
        if (Sensor_Read(&d) == 0) {
            /* 队列满时最多等 10ms，超时就丢弃，不阻塞采集 */
            xQueueSend(s_cmd_queue, &d, pdMS_TO_TICKS(10));
        }
        /* 绝对延时：避免任务执行时间累积导致周期漂移 */
        vTaskDelayUntil(&last, pdMS_TO_TICKS(100));
    }
}

/* 消费者任务：阻塞等待数据，不占 CPU */
static void process_task(void *arg)
{
    sensor_data_t d;

    for (;;) {
        /* 阻塞等待，直到队列有数据或超时 */
        if (xQueueReceive(s_cmd_queue, &d, portMAX_DELAY) == pdTRUE) {
            Process(d);
        }
    }
}

void app_start(void)
{
    s_cmd_queue = xQueueCreate(8, sizeof(sensor_data_t));

    /* 栈深度单位是字（StackType_t），不是字节 */
    xTaskCreate(sensor_task,  "sensor",  256, NULL, 3, NULL);
    xTaskCreate(process_task, "process", 512, NULL, 2, NULL);

    vTaskStartScheduler();       /* 启动调度器，正常情况下不返回 */
}`
        },
        codeNote: `<b>栈单位：</b>FreeRTOS 的 <code>usStackDepth</code> 单位是 <code>StackType_t</code>（Cortex-M 上是 4 字节），写 256 表示 1KB。这是新手最容易搞错的地方。`,
        apply: `<p>实际项目中，任务划分要遵循“一个任务一个职责”：采集、处理、通信、显示各一个，用队列连接。不要让一个任务既采集又处理又显示，那样又退化成前后台了。</p>
<p>任务优先级按实时性要求分配，不要都设成一样；相同优先级才会走时间片轮转。</p>`,
        pitfalls: [
          "<b>把栈深度当字节数。</b>写 128 以为是 128 字节，实际是 512 字节，RAM 被吃掉却不自知。",
          "<b>用 vTaskDelay 做周期任务。</b>任务执行时间会累积，周期越来越长。应该用 <code>vTaskDelayUntil</code>。",
          "<b>在任务里死等标志位。</b>占用 CPU 不让出，低优先级任务永远得不到执行。应该用信号量或队列阻塞等待。"
        ],
        follow: [
          [
            "就绪链表是怎么组织的？",
            "每个优先级一个链表，任务就绪时挂到对应链表尾部。调度时从最高优先级的非空链表取第一个任务。相同优先级的任务按时间片轮转。"
          ],
          [
            "vTaskDelay 和 vTaskDelayUntil 有什么区别？",
            "<code>vTaskDelay</code> 是相对延时，从调用时刻算起；<code>vTaskDelayUntil</code> 是绝对延时，按固定周期唤醒，能消除任务执行时间波动带来的累积误差。"
          ],
          [
            "任务删除时要注意什么？",
            "删除前要释放它持有的资源（内存、信号量、互斥锁），否则会造成泄漏或死锁。删除自身用 <code>vTaskDelete(NULL)</code>，空闲任务负责回收内存。"
          ]
        ]
      },

      {
        id: "R-03",
        chapter: "task",
        topic: "sched",
        title: "抢占式调度和时间片轮转是怎么配合的？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "优先级抢占、同优先级时间片、调度点，以及 configUSE_PREEMPTION 的影响。",
        q: `<p>面试官：FreeRTOS 的<strong>调度策略</strong>是什么？抢占和时间片是怎么配合的？如果两个任务优先级相同会怎样？调度发生在哪些时刻？</p>`,
        exam: `<p>考察对调度器行为的准确理解。能说清“高优先级就绪立刻抢占”“同优先级按 tick 轮转”“调度点在中断返回和系统调用”，以及“关中断会延迟抢占”，说明你理解实时性的边界。</p>`,
        core: `<p>FreeRTOS 默认优先级抢占，高优先级就绪立刻抢占，同优先级可时间片轮转；调度点在 SysTick、主动让出、阻塞调用和中断退出。</p>`,
        answer: `<p>FreeRTOS 默认是<strong>基于优先级的抢占式调度</strong>：任何时刻，最高优先级的就绪任务运行。高优先级任务一旦就绪（比如信号量被释放、延时到期），会立刻抢占当前低优先级任务。</p>
<p>对于<strong>相同优先级</strong>的多个任务，如果开启了 <code>configUSE_TIME_SLICING</code>，则按时间片轮转：每个 SysTick 中断切换一次，轮流执行，保证公平。</p>
<p>调度点主要有四个：SysTick 中断（时间片到期）、任务主动让出（<code>taskYIELD</code>）、阻塞式 API 调用（队列、信号量、延时）、中断退出时如果有更高优先级任务就绪。</p>
<p>注意抢占不是“立即”的：如果当前在临界区（关了中断或屏蔽了优先级），要等临界区退出才能切换。所以临界区越长，实时性越差。</p>`,
        principle: `<p>调度的本质是“找最高优先级就绪任务”。FreeRTOS 维护一个位图，记录哪些优先级有就绪任务，用 <code>CLZ</code> 指令一条指令找到最高位，然后从对应链表取第一个任务。整个过程是 O(1)。</p>
<p>如果关闭 <code>configUSE_PREEMPTION</code>，就变成协作式调度：只有任务主动让出或阻塞时才切换，实时性大幅下降，一般只在特殊场景使用。</p>`,
        fig: {
          type: "table",
          title: "调度相关配置项",
          tag: "config",
          head: ["配置项", "作用", "建议"],
          rows: [
            ["configUSE_PREEMPTION", "是否抢占式调度", "1，实时系统必开"],
            ["configUSE_TIME_SLICING", "同优先级是否轮转", "1，保证公平"],
            ["configTICK_RATE_HZ", "系统节拍频率", "1000（1ms）"],
            ["configMAX_PRIORITIES", "优先级数量", "按需，太多浪费 RAM"],
            ["configIDLE_SHOULD_YIELD", "空闲任务是否让出", "1"]
          ]
        },
        apply: `<p>实际项目中，优先级分配要避免“饥饿”：如果高优先级任务一直就绪（比如死循环不让出），低优先级任务永远得不到执行。要确保高优先级任务会阻塞等待事件。</p>
<p>时间片只对同优先级有效，所以不要把实时性差别大的任务设成同一优先级，否则会互相拖慢。</p>`,
        pitfalls: [
          "<b>认为抢占是即时的。</b>临界区、中断屏蔽、调度器挂起都会延迟切换，实时性分析要把这些算进去。",
          "<b>高优先级任务不让出 CPU。</b>低优先级任务饿死，看门狗可能无法喂，系统反复复位。",
          "<b>优先级设得太多太细。</b>增加 RAM 开销（每个优先级一个链表），且难以维护，通常 5~8 个级别够用。"
        ],
        follow: [
          [
            "什么是调度器挂起？",
            "<code>vTaskSuspendAll()</code> 暂停调度器，任务不会被切换，但中断仍然响应。用于保护多任务共享的数据结构，比关中断影响小。要配对调用 <code>xTaskResumeAll()</code>。"
          ],
          [
            "中断里能直接切换任务吗？",
            "不能直接切换，但可以在中断里调用 <code>xxxFromISR</code> 接口，如果唤醒了更高优先级任务，设置 <code>xHigherPriorityTaskWoken</code>，退出时用 <code>portYIELD_FROM_ISR</code> 触发切换。"
          ],
          [
            "优先级数量越多越好吗？",
            "不是。每个优先级对应一个就绪链表，占用 RAM；优先级太细也难以分配和维护。一般按“硬实时/实时/业务/后台”分几档就够。"
          ]
        ]
      },

      {
        id: "R-04",
        chapter: "sync",
        topic: "sem",
        title: "信号量和互斥锁有什么区别？什么时候用哪个？",
        diff: "中级",
        freq: "高频",
        type: "对比辨析题",
        point: "二值信号量与互斥锁的语义差异、优先级继承、递归锁与使用场景。",
        q: `<p>面试官：<strong>二值信号量和互斥锁</strong>看起来都是 0/1，有什么区别？为什么互斥锁有优先级继承而信号量没有？递归互斥锁又是什么？</p>`,
        exam: `<p>这是 RTOS 面试的分水岭。能说清“信号量用于同步（通知），互斥锁用于保护共享资源（所有权）”“互斥锁有优先级继承，信号量没有”“递归锁解决同一任务重复获取”，说明你理解并发控制。</p>`,
        core: `<p>二值信号量用于事件同步、谁都可以释放；互斥锁有所有者、支持优先级继承，用于保护共享资源；递归锁允许同一任务重复获取同一把锁。</p>`,
        answer: `<p>二值信号量用于<strong>同步</strong>：一个任务释放、另一个任务获取，表示“某个事件发生了”。它没有所有者的概念，任何任务都可以释放。</p>
<p>互斥锁用于<strong>保护共享资源</strong>：谁获取谁释放，有明确的所有权。它能记录当前持有者，因此可以实现优先级继承——当高优先级任务等待锁时，临时提升持有者的优先级，避免优先级反转。</p>
<p>信号量没有所有权，所以无法做优先级继承；它只适合“通知”场景，不适合保护资源。</p>
<p>递归互斥锁允许同一个任务多次获取同一把锁，每获取一次计数加一，释放时计数减一，减到 0 才真正释放。用于一个任务里多层函数都要加锁的场景，避免自己把自己锁死。</p>`,
        principle: `<p>互斥锁的实现里保存了持有者的 TCB 指针和原始优先级。当高优先级任务尝试获取已被低优先级任务持有的锁时，内核把持有者的优先级临时提升到等待者中的最高优先级，让它尽快执行完并释放锁，这就是优先级继承。</p>
<p>释放锁时恢复原始优先级。这个过程只影响持有者，不影响其他任务，代价是每次获取释放都有额外的链表操作。</p>`,
        fig: {
          type: "table",
          title: "信号量 vs 互斥锁",
          tag: "compare",
          head: ["维度", "二值信号量", "互斥锁"],
          rows: [
            ["用途", "任务/中断同步", "保护共享资源"],
            ["所有权", "无", "有，谁取谁放"],
            ["优先级继承", "不支持", "支持"],
            ["中断中使用", "可以（FromISR）", "不可以"],
            ["递归获取", "不支持", "递归锁支持"],
            ["典型场景", "中断通知任务", "保护 I2C 总线、全局配置"]
          ]
        },
        code: {
          lang: "c",
          title: "mutex_demo.c",
          src: `#include "FreeRTOS.h"
#include "semphr.h"

static SemaphoreHandle_t s_i2c_mutex;

void bus_init(void)
{
    /* 创建互斥锁，不是二值信号量 */
    s_i2c_mutex = xSemaphoreCreateMutex();
}

/* 两个任务都要访问 I2C，必须加锁 */
int sensor_read_locked(uint8_t addr, uint8_t reg, uint8_t *val)
{
    /* 最多等 100ms，避免死等导致系统卡死 */
    if (xSemaphoreTake(s_i2c_mutex, pdMS_TO_TICKS(100)) != pdTRUE) {
        return -1;                       /* 获取失败，返回错误而不是阻塞 */
    }

    int ret = I2C_ReadReg(addr, reg, val);

    xSemaphoreGive(s_i2c_mutex);         /* 必须成对释放 */
    return ret;
}

/* 中断通知任务：用二值信号量，不用互斥锁 */
static SemaphoreHandle_t s_rx_sem;

/* 使用前必须先创建，否则句柄为 NULL，FromISR 里会命中断言 */
void rx_sem_init(void)
{
    s_rx_sem = xSemaphoreCreateBinary();
    configASSERT(s_rx_sem);
}

void USART1_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;

    /* 中断里只能调用 FromISR 版本 */
    xSemaphoreGiveFromISR(s_rx_sem, &woken);
    portYIELD_FROM_ISR(woken);           /* 如有更高优先级任务就绪则切换 */
}

void rx_task(void *arg)
{
    for (;;) {
        /* 阻塞等待中断通知，不消耗 CPU */
        if (xSemaphoreTake(s_rx_sem, portMAX_DELAY) == pdTRUE) {
            ProcessRxData();
        }
    }
}`
        },
        apply: `<p>判断标准很简单：如果是“等一个事件发生”，用信号量或任务通知；如果是“一段时间内只允许一个任务访问某资源”，用互斥锁。</p>
<p>保护共享资源时，临界区要尽量短：只包住真正的读写操作，不要把耗时计算也放进去，否则其他任务会被长时间阻塞。</p>`,
        pitfalls: [
          "<b>用二值信号量保护共享资源。</b>没有优先级继承，容易发生优先级反转；而且任何任务都能“释放”，逻辑上不严谨。",
          "<b>在中断里用互斥锁。</b>互斥锁有所有权和阻塞语义，中断里不能用，必须用 FromISR 的信号量或任务通知。",
          "<b>获取锁后提前 return 忘记释放。</b>锁永远不释放，其他任务全部卡死。要用统一的出口或 goto cleanup。"
        ],
        follow: [
          [
            "计数信号量用在哪？",
            "用于管理多个相同资源，比如 3 个缓冲区、5 个连接。每占用一个计数减一，释放加一，计数为 0 时获取者阻塞。"
          ],
          [
            "什么是优先级继承？",
            "高优先级任务等待低优先级任务持有的锁时，临时把持有者的优先级提升到与等待者相同，让它尽快执行完释放锁，减少高优先级任务被阻塞的时间。"
          ],
          [
            "互斥锁能递归获取吗？",
            "普通互斥锁不能，同一任务重复获取会死锁。要用递归互斥锁（<code>xSemaphoreCreateRecursiveMutex</code>），配合 <code>TakeRecursive</code>/<code>GiveRecursive</code> 成对使用。"
          ]
        ]
      },

      {
        id: "R-05",
        chapter: "sync",
        topic: "sem",
        title: "什么是优先级反转？怎么解决？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "三任务场景下的反转过程、优先级继承与优先级天花板。",
        q: `<p>面试官：解释一下<strong>优先级反转</strong>。它是怎么发生的？FreeRTOS 怎么解决？如果不用互斥锁，还有什么办法？</p>`,
        exam: `<p>这是 RTOS 最经典的深水题。能把“低优先级持锁 → 高优先级等待 → 中优先级抢占低优先级 → 高优先级被中优先级间接阻塞”这个过程讲清楚，并说明优先级继承的作用，基本就通过了。</p>`,
        core: `<p>优先级反转是低优先级持锁被中优先级抢占，高优先级只能等；解决办法是优先级继承，把持锁任务临时提到等待者的优先级。</p>`,
        answer: `<p>假设三个任务：高优先级 H、中优先级 M、低优先级 L。L 先获得了一把互斥锁，正在用共享资源；此时 H 就绪，需要同一把锁，于是阻塞等待 L 释放。</p>
<p>关键来了：M 就绪后，因为它的优先级高于 L，抢占了 L。L 没法继续执行，也就没法释放锁。结果 H 被 M 间接阻塞了——H 的优先级最高，却要等一个低优先级的 M 执行完。这就是优先级反转。</p>
<p>解决办法是<strong>优先级继承</strong>：当 H 等待 L 持有的锁时，内核把 L 的优先级临时提升到 H 的级别。这样 M 就无法抢占 L，L 能尽快执行完释放锁，H 也能尽快恢复。释放后 L 的优先级恢复原值。</p>
<p>FreeRTOS 的互斥锁默认支持优先级继承，二值信号量不支持。另一个方案是优先级天花板：把锁的优先级设为所有可能使用它的任务中的最高优先级，任务获取锁时就提升到该优先级。</p>`,
        principle: `<p>优先级反转的根源是“资源竞争 + 优先级调度”的组合。只要存在共享资源且允许抢占，就可能发生。反转的时间取决于中优先级任务的执行时间，可能是几毫秒，也可能是几百毫秒，对硬实时系统是致命的。</p>
<p>1997 年火星探路者号就遇到过这个问题：高优先级任务被反转阻塞，看门狗超时导致系统反复重启。后来通过启用优先级继承解决。</p>`,
        fig: {
          type: "flow",
          title: "优先级反转的发生过程",
          tag: "sequence",
          items: [
            { t: "L 获取锁", d: "进入临界区" },
            { t: "H 就绪", d: "等待同一把锁" },
            { t: "M 就绪", d: "抢占 L" },
            { t: "H 被阻塞", d: "等 M 执行完" },
            { t: "L 释放锁", d: "H 才能运行" }
          ]
        },
        apply: `<p>实际项目中，减少优先级反转的手段：尽量缩短持锁时间；不要在持锁期间调用可能阻塞的 API；把共享资源改成“消息传递”而不是“共享内存 + 锁”，从根上避免竞争。</p>
<p>如果必须用锁，优先用互斥锁而不是二值信号量，确保有优先级继承保护。</p>`,
        pitfalls: [
          "<b>用二值信号量保护资源。</b>没有优先级继承，反转时间可能很长，硬实时系统会丢 deadline。",
          "<b>持锁期间做耗时操作。</b>即使有优先级继承，H 也要等 L 把活干完，响应时间仍然很长。",
          "<b>嵌套获取多把锁。</b>可能造成死锁（两个任务互相等对方持有的锁），必须约定获取顺序。"
        ],
        follow: [
          [
            "优先级继承和优先级天花板有什么区别？",
            "继承是“被动”的，只在发生等待时临时提升；天花板是“主动”的，任务一获取锁就提升到预设的最高优先级。天花板能提前避免反转，但需要预先知道所有使用者。"
          ],
          [
            "死锁的四个必要条件是什么？",
            "互斥、持有并等待、不可剥夺、循环等待。破坏任意一个就能避免死锁，工程上最常用的是“统一加锁顺序”来破坏循环等待。"
          ],
          [
            "如何检测死锁？",
            "运行时看各任务阻塞在哪个对象上，画出等待图，有环就是死锁。也可以在调试时打印任务状态和持有的锁，人工分析。预防比检测更重要。"
          ]
        ]
      },

      {
        id: "R-06",
        chapter: "sync",
        topic: "queue",
        title: "消息队列、事件组、任务通知该怎么选？",
        diff: "中级",
        freq: "高频",
        type: "对比辨析题",
        point: "数据传递、多事件等待、轻量通知三种机制的能力与开销差异。",
        q: `<p>面试官：FreeRTOS 里<strong>队列、事件组、任务通知</strong>分别适合什么场景？任务通知为什么最快？它有什么限制？</p>`,
        exam: `<p>考察对内核对象的选型能力。能说清“队列传数据、事件组等多条件、通知最轻量但只能一对一”，并且知道“通知值只有 32 位、不能广播”，说明你读过文档也用过。</p>`,
        core: `<p>队列传数据、可缓冲多条；事件组等多个条件按位与或；任务通知最轻但只能一对一，且只有一个 32 位值。</p>`,
        answer: `<p>队列用于<strong>传递数据</strong>：发送方把数据拷贝进队列，接收方取出。它支持多对多、可以缓冲多条消息，是最常用的任务间通信方式。</p>
<p>事件组用于<strong>等待多个事件</strong>：一个任务可以等待“事件 A 和 B 都发生”或“A 或 B 任一发生”，适合多个条件都满足才继续的场景，比如“网络连接成功 + 配置加载完成”才启动业务。</p>
<p>任务通知是<strong>最轻量的同步机制</strong>：直接修改目标任务 TCB 里的一个 32 位通知值，不需要额外的内核对象，所以速度最快、RAM 开销最小。它支持计数、置位、覆盖等模式。</p>
<p>限制是：只能一对一（发送方指定接收任务），不能广播；通知值只有 32 位；如果接收任务还没处理上一次通知，新通知可能覆盖（取决于模式）。</p>`,
        principle: `<p>队列的每次发送都要拷贝数据到队列缓冲区，接收再拷贝出来，数据量大时有开销。任务通知不拷贝数据，只写一个 32 位值，所以快得多：FreeRTOS 官方基准里“通知解除阻塞”比<b>二值信号量</b>快约 45%，比队列也更快、还省掉一个队列对象——注意这个 45% 是相对二值信号量的，不是相对队列的。</p>
<p>事件组本质是一个 32 位变量，每个 bit 代表一个事件。等待时可以指定“等待哪些位”以及“是与还是或”，还可以在满足后自动清除。</p>`,
        fig: {
          type: "table",
          title: "三种通信机制对比",
          tag: "compare",
          head: ["机制", "传数据", "多对多", "开销", "典型场景"],
          rows: [
            ["消息队列", "支持（拷贝）", "支持", "中", "任务间传数据、中断传数据"],
            ["事件组", "不支持（只有位）", "支持", "中", "等待多个条件同时满足"],
            ["任务通知", "32 位值", "一对一", "最低", "中断通知任务、简单同步"],
            ["流缓冲区", "字节流", "一对一（单写单读）", "低", "串口数据流"]
          ]
        },
        code: {
          lang: "c",
          title: "notify_demo.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

static TaskHandle_t s_worker;

/* 中断里通知任务：比信号量更轻量 */
void DMA_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;

    /* 直接把通知值加一，不需要额外的信号量对象 */
    vTaskNotifyGiveFromISR(s_worker, &woken);
    portYIELD_FROM_ISR(woken);
}

/* 工作任务：阻塞等待通知 */
static void worker_task(void *arg)
{
    for (;;) {
        /* 等到至少一个通知，最多等 1 秒 */
        uint32_t n = ulTaskNotifyTake(pdTRUE, pdMS_TO_TICKS(1000));

        if (n > 0) {
            ProcessDmaBuffer(n);       /* 处理 n 次触发 */
        } else {
            Heartbeat();               /* 超时，做保活 */
        }
    }
}

/* 事件组：等待“网络就绪 + 配置加载完成”两个条件 */
static EventGroupHandle_t s_events;
#define BIT_NET_READY   (1u << 0)
#define BIT_CFG_LOADED  (1u << 1)

void app_task(void *arg)
{
    EventBits_t bits = xEventGroupWaitBits(
        s_events,
        BIT_NET_READY | BIT_CFG_LOADED,
        pdTRUE,          /* 满足后清除 */
        pdTRUE,          /* 要求全部满足 */
        portMAX_DELAY);

    if ((bits & (BIT_NET_READY | BIT_CFG_LOADED)) == (BIT_NET_READY | BIT_CFG_LOADED)) {
        StartBusiness();
    }
}`
        },
        apply: `<p>实际选型顺序：能用任务通知就用通知（最快最省）；需要传结构体数据用队列；需要等多个条件用事件组；需要字节流（串口、音频）用流缓冲区或环形缓冲。</p>
<p>中断到任务的单次通知，优先用任务通知而不是信号量，能省一个内核对象和几微秒的切换时间。</p>`,
        pitfalls: [
          "<b>用队列传大结构体。</b>每次拷贝几百字节，开销大且占 RAM，应该传指针（配合内存池管理生命周期）。",
          "<b>任务通知当广播用。</b>它只能通知一个任务，多个任务要分别通知，或者改用事件组。",
          "<b>事件组等待后忘记清位。</b>下次等待时条件还是满足的，逻辑会错乱。可以用 <code>xEventGroupClearBits</code> 或等待时自动清除。"
        ],
        follow: [
          [
            "队列发送失败怎么办？",
            "发送时可以指定阻塞时间，队列满则等待；超时返回失败，调用方要处理（丢弃、重试、置溢出标志），不能忽略返回值。",
            ],
          [
            "中断里能发送队列吗？",
            "可以，但必须用 <code>xQueueSendFromISR</code>，并检查 <code>xHigherPriorityTaskWoken</code>，退出中断时调用 <code>portYIELD_FROM_ISR</code> 触发切换。"
          ],
          [
            "流缓冲区和消息缓冲区有什么区别？",
            "流缓冲区传字节流，没有消息边界，适合串口；消息缓冲区带长度信息，保留消息边界，适合变长数据包。两者都是一写一读。"
          ]
        ]
      },

      {
        id: "R-07",
        chapter: "kernel",
        topic: "critical",
        title: "中断里为什么要用 FromISR 接口？临界区怎么保护？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "中断上下文的限制、FromISR 的延迟切换机制，以及临界区的实现层次。",
        q: `<p>面试官：为什么中断里不能调用 <code>xQueueSend</code>，必须用 <code>xQueueSendFromISR</code>？临界区有哪几种实现方式？各有什么影响？</p>`,
        exam: `<p>考察对中断上下文和内核保护机制的理解。能说清“ISR 不能阻塞”“FromISR 不做切换，只置标志，退出时统一切换”“临界区可以用关中断、BASEPRI、调度器挂起”，说明你写过中断与任务的协作代码。</p>`,
        core: `<p>ISR 不能阻塞，所以用 FromISR 版本立即返回，并用 xHigherPriorityTaskWoken 加 portYIELD_FROM_ISR 在中断退出时切换；临界区按关中断、挂起调度器、互斥锁三档选。</p>`,
        answer: `<p>普通 API 可能会阻塞（比如队列满时等待），而中断服务程序不能阻塞——它没有任务上下文，阻塞了谁来恢复它？所以内核提供了 FromISR 版本，语义是“立即返回，不等待”。</p>
<p>FromISR 版本不会直接切换任务，而是通过 <code>xHigherPriorityTaskWoken</code> 告诉调用者“有更高优先级任务被唤醒了”，调用者在中断退出前用 <code>portYIELD_FROM_ISR</code> 触发一次切换。这样切换发生在中断结束时，不会打断中断处理。</p>
<p>临界区有三种实现：<strong>关中断</strong>（<code>taskENTER_CRITICAL</code>，屏蔽一部分中断，最短最硬）；<strong>调度器挂起</strong>（<code>vTaskSuspendAll</code>，不关中断，只禁止任务切换，适合较长的保护）；<strong>互斥锁</strong>（适合可能阻塞的长时间保护）。</p>
<p>选择原则：保护几个变量的读写用关中断；保护较长的数据结构用调度器挂起；需要睡眠等待的用互斥锁。</p>`,
        principle: `<p><code>taskENTER_CRITICAL</code> 在 Cortex-M 上是通过设置 BASEPRI 实现的，只屏蔽优先级低于 <code>configMAX_SYSCALL_INTERRUPT_PRIORITY</code> 的中断，更高优先级的中断仍然能响应。这样既保护了内核数据结构，又不影响硬实时中断。</p>
<p>临界区可以嵌套，内核用计数管理嵌套层数，只有最外层退出时才真正恢复中断。</p>`,
        fig: {
          type: "layers",
          title: "临界区的三种层次",
          tag: "protection",
          items: [
            { tag: "IRQ", t: "关中断 taskENTER_CRITICAL", d: "最强，屏蔽大部分中断，几微秒内" },
            { tag: "SCHED", t: "挂起调度器 vTaskSuspendAll", d: "不关中断，只禁止任务切换" },
            { tag: "MUTEX", t: "互斥锁", d: "可阻塞，适合长时间保护" }
          ]
        },
        code: {
          lang: "c",
          title: "critical_demo.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

/* 1. 保护几个变量的原子读写：关中断，尽量短 */
static volatile uint32_t s_tick_count;
static volatile uint16_t s_overflow;

void counter_update(void)
{
    taskENTER_CRITICAL();
    s_tick_count++;
    if (s_tick_count == 0) s_overflow++;    /* 回绕计数 */
    taskEXIT_CRITICAL();
}

/* 2. 保护较长的数据结构：挂起调度器，不关中断 */
void config_update(const config_t *c)
{
    vTaskSuspendAll();                      /* 禁止任务切换 */
    memcpy(&g_config, c, sizeof(config_t));
    g_config_valid = 1;
    xTaskResumeAll();                       /* 恢复调度 */
}

/* 3. 中断里更新共享变量：用 FromISR 的临界区宏 */
void EXTI0_IRQHandler(void)
{
    UBaseType_t saved = taskENTER_CRITICAL_FROM_ISR();
    g_key_event_count++;
    taskEXIT_CRITICAL_FROM_ISR(saved);
}

/* 4. 中断发送队列：FromISR + 退出时切换 */
void USART1_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;
    uint8_t byte = USART1->DR;

    xQueueSendFromISR(s_rx_queue, &byte, &woken);
    portYIELD_FROM_ISR(woken);              /* 必要时在中断退出时切换 */
}

/* 5. 判断当前是否在中断上下文（调试断言用） */
void assert_not_in_isr(void)
{
    configASSERT(__get_IPSR() == 0);        /* IPSR 非 0 说明在中断里 */
}`
        },
        apply: `<p>临界区的经验值：关中断的临界区控制在几微秒内，超过 10 微秒就要考虑改用调度器挂起或重新设计。因为关中断会直接影响中断响应时间，对通信和电机控制影响很大。</p>
<p>RTOS 项目里，中断优先级高于 <code>configMAX_SYSCALL_INTERRUPT_PRIORITY</code> 的中断不受内核管理，也不能调用任何 FreeRTOS API，这类中断适合放最紧急的硬件处理。</p>`,
        pitfalls: [
          "<b>在中断里调用普通 API。</b>可能触发断言或直接死机，因为 ISR 没有任务上下文。",
          "<b>临界区太长。</b>中断被长时间屏蔽，通信丢包、脉冲计数丢失，实时性崩溃。",
          "<b>忘记 portYIELD_FROM_ISR。</b>高优先级任务要等到下一个 tick 才能运行，响应延迟最多一个节拍。"
        ],
        follow: [
          [
            "configMAX_SYSCALL_INTERRUPT_PRIORITY 是什么？",
            "允许调用 FreeRTOS API 的中断里优先级最高的那一个（Cortex-M 上数值最小的一端）。中断优先级数值 ≥ 该值（逻辑优先级不高于它）才能调用 API；数值更小、优先级更高的中断不受内核临界区影响，也不能调用 API，留给最紧急的硬件响应。"
          ],
          [
            "临界区和原子操作怎么选？",
            "单个变量的读改写可以用 LDREX/STREX 原子指令（Cortex-M3 以上），开销比关中断小；多个变量的一致性必须用临界区。"
          ],
          [
            "为什么中断里不能用 malloc？",
            "堆管理通常不是可重入的，中断打断 malloc 会破坏空闲链表；而且 malloc 执行时间不确定，会拉长中断响应。"
          ]
        ]
      },

      {
        id: "R-08",
        chapter: "kernel",
        topic: "heap",
        title: "任务栈应该开多大？栈溢出怎么发现？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "栈空间估算方法、高水位检测、溢出钩子与 MPU 保护。",
        q: `<p>面试官：创建任务时<strong>栈深度</strong>怎么确定？开小了会怎样？FreeRTOS 怎么检测栈溢出？你在项目里怎么调？</p>`,
        exam: `<p>考察实际调试经验。能说清“栈要容纳调用链 + 局部变量 + 中断现场 + 浮点上下文”“用 uxTaskGetStackHighWaterMark 看余量”“configCHECK_FOR_STACK_OVERFLOW 两种检查方式”，说明你被栈溢出坑过。</p>`,
        core: `<p>任务栈要放最深调用链、局部变量、寄存器现场和中断异常帧，Cortex-M 基本帧 8 字、开 FPU 共 26 字；用 configCHECK_FOR_STACK_OVERFLOW 加栈底魔数和栈高水位来调。</p>`,
        answer: `<p>栈要容纳：最深函数调用链的所有栈帧、局部变量（尤其是大数组）、函数调用的寄存器保存、以及中断嵌套时的现场（如果中断压在当前任务栈上）。开启 FPU 后，浮点上下文还要额外 18 个字（S0~S15 共 16 字 + FPSCR 1 字 + 1 字对齐填充，整帧 26 字）。</p>
<p>估算方法是先给一个较大的值（比如 1KB），运行最坏场景后看高水位。FreeRTOS 提供 <code>uxTaskGetStackHighWaterMark</code>，返回历史最小剩余量（单位是字），剩余 20% 以上比较安全。</p>
<p>栈溢出会踩坏相邻内存：可能是另一个任务的栈、TCB 或全局变量，现象是随机死机、数据错乱，极难定位。所以必须开检测：<code>configCHECK_FOR_STACK_OVERFLOW</code> 设为 2，在任务切换时检查栈末尾的魔数是否被改写，被改写就调用钩子函数。</p>`,
        principle: `<p>FreeRTOS 创建任务时会把整个栈填充成 <code>0xA5</code>。运行一段时间后，从栈底往上找第一个不是 0xA5 的位置，就知道栈用到多深。这就是高水位统计，开销小且不需要额外硬件。</p>
<p>方法 2 的溢出检查是在栈末尾保留 16 字节的魔数，切换时检查。它只能发现“已经溢出并改写了魔数”的情况，如果溢出后刚好又写了回去，就检测不到。更可靠的是 MPU 保护：把栈末尾一页设为不可访问，溢出立刻触发 MemManage 异常。</p>`,
        code: {
          lang: "c",
          title: "stack_check.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

/* 1. 创建任务后打印高水位，单位是字（4 字节） */
void report_stack_usage(void)
{
    TaskStatus_t status[8];
    UBaseType_t n = uxTaskGetSystemState(status, 8, NULL);

    for (UBaseType_t i = 0; i < n; i++) {
        /* 返回值是历史最小剩余字数，越小越危险 */
        UBaseType_t hw = uxTaskGetStackHighWaterMark(status[i].xHandle);
        printf("task %s: high water = %u words (%u bytes)\\n",
               status[i].pcTaskName, hw, hw * 4);
    }
}

/* 2. 栈溢出钩子：必须实现，否则检测到也无法处理 */
void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName)
{
    /* 不要在这里调用 RTOS API，系统状态已不可信 */
    printf("STACK OVERFLOW in task: %s\\n", pcTaskName);
    taskDISABLE_INTERRUPTS();
    for (;;) { }                 /* 停机，等待看门狗复位或调试器介入 */
}

/* 3. 避免大数组上栈：改为静态或内存池 */
void parse_frame_bad(void)
{
    uint8_t buf[1024];           /* 直接吃掉 1KB 栈，极易溢出 */
    Uart_Read(buf, sizeof(buf));
}

static uint8_t s_frame_buf[1024];   /* 静态分配，不占任务栈 */

void parse_frame_good(void)
{
    Uart_Read(s_frame_buf, sizeof(s_frame_buf));
}

/* 4. 递归函数要限制深度，栈深不可控 */
int factorial(int n)
{
    if (n <= 1) return 1;
    return n * factorial(n - 1);     /* n 很大时会耗尽栈 */
}`
        },
        apply: `<p>实际调试步骤：先给任务 512 字（2KB）的栈，跑遍所有功能（包括异常分支、日志打印、浮点运算），然后读高水位，把栈调整为“峰值 + 30% 余量”。</p>
<p>注意 <code>printf</code> 很吃栈（尤其是浮点格式化），带日志的任务栈要给足；发布版本关掉日志后可以适当减小，但不要卡到临界值。</p>`,
        pitfalls: [
          "<b>把栈深度当字节数。</b>写 128 以为是 128 字节，实际 512 字节，反过来写 1024 以为 1KB 实际 4KB，RAM 被吃光。",
          "<b>只在调试版开检测。</b>发布版关掉检测后，栈溢出变成随机死机，现场无法定位。建议保留检测，代价很小。",
          "<b>忽略中断栈。</b>如果中断使用独立的 MSP，要单独估算中断嵌套深度；如果用任务栈，任务栈要加上中断开销。"
        ],
        follow: [
          [
            "高水位多少算安全？",
            "剩余 20%~30% 比较稳妥。如果剩余不足 10%，一旦调用链变深或加日志就会溢出。高水位是历史最小值，不代表未来不会更深。"
          ],
          [
            "configCHECK_FOR_STACK_OVERFLOW 的两种方式有什么区别？",
            "方式 1 只检查栈指针是否越界，速度快但只能在切换时发现；方式 2 检查栈末尾魔数是否被改写，能发现已经发生的溢出，但需要多几个字节开销。"
          ],
          [
            "RTOS 的栈和裸机的栈有什么区别？",
            "裸机只有一个栈（MSP），所有函数共用；RTOS 每个任务有独立栈（PSP），切换时换栈。中断通常仍用 MSP，所以有两套栈要分别估算。"
          ]
        ]
      },

      {
        id: "R-09",
        chapter: "kernel",
        topic: "heap",
        title: "FreeRTOS 的五种内存管理方案有什么区别？",
        diff: "高级",
        freq: "进阶",
        type: "对比辨析题",
        point: "heap_1~5 的分配策略、碎片行为、线程安全与适用场景。",
        q: `<p>面试官：FreeRTOS 的 <strong>heap_1 到 heap_5</strong> 有什么区别？你的项目用哪一个？为什么很多高可靠项目禁止动态分配？</p>`,
        exam: `<p>考察对内存管理的深入理解。能说清“heap_1 只分配不释放、heap_4 带合并、heap_5 支持多块不连续内存”，并且能结合项目谈取舍，说明你不是只用默认配置。</p>`,
        core: `<p>heap_1 只分配不释放，heap_2 有碎片已淘汰，heap_3 封装 malloc，heap_4 会合并相邻空闲块最常用，heap_5 支持多块不连续内存；高可靠项目应静态创建避免碎片。</p>`,
        answer: `<p>heap_1 最简单，只分配不释放，适合所有对象在启动时创建、运行中不删除的系统。它没有碎片问题，代码最小，但一旦分配就无法回收。</p>
<p>heap_2 支持释放，用最佳适配算法，但不合并相邻空闲块，长期运行会产生碎片，已被 heap_4 取代。</p>
<p>heap_3 是对标准库 malloc/free 的封装，加了线程安全（挂起调度器），堆大小由链接器决定，适合需要用标准库内存函数的场景。</p>
<p>heap_4 用首次适配 + 相邻空闲块合并，能有效减少碎片，是最常用的方案。</p>
<p>heap_5 在 heap_4 基础上支持多块不连续的内存区域，适合有内部 SRAM + 外部 SDRAM 的芯片。</p>
<p>高可靠项目禁止动态分配的原因是：碎片导致长期运行后分配失败、分配时间不确定、失败后难以恢复。替代方案是启动时静态创建所有对象，或使用固定块内存池。</p>`,
        principle: `<p>heap_4 的空闲块用双向链表管理，每块头部有一个标记记录大小。分配时从链表头开始找第一个足够大的块（首次适配），如果块比需求大就拆分；释放时把块插回链表，并检查前后相邻块是否空闲，是则合并。</p>
<p>合并是 heap_4 相比 heap_2 的关键改进：没有合并，反复分配释放不同大小的块会留下大量无法使用的小空洞，最终分配失败。</p>`,
        fig: {
          type: "table",
          title: "五种 heap 方案对比",
          tag: "compare",
          head: ["方案", "释放", "碎片处理", "线程安全", "适用场景"],
          rows: [
            ["heap_1", "不支持", "无碎片", "不需要", "启动时创建全部对象"],
            ["heap_2", "支持", "不合并", "是", "已淘汰，不推荐"],
            ["heap_3", "支持", "依赖 libc", "是", "需要用标准 malloc"],
            ["heap_4", "支持", "合并相邻空闲块", "是", "通用，最常用"],
            ["heap_5", "支持", "同 heap_4", "是", "多块不连续内存"]
          ]
        },
        code: {
          lang: "c",
          title: "static_alloc.c",
          src: `#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"

/* 方案 A：静态创建，完全不用堆（推荐用于高可靠系统） */
static StaticTask_t s_task_tcb;
static StackType_t  s_task_stack[512];

static StaticQueue_t s_queue_cb;
static uint8_t       s_queue_buf[8 * sizeof(uint32_t)];

void app_init_static(void)
{
    TaskHandle_t task = xTaskCreateStatic(
        app_task, "app", 512, NULL, 3,
        s_task_stack, &s_task_tcb);

    QueueHandle_t q = xQueueCreateStatic(
        8, sizeof(uint32_t), s_queue_buf, &s_queue_cb);

    configASSERT(task && q);
}

/* 方案 B：用 heap_4，但只在初始化阶段分配，运行期不释放 */
void app_init_dynamic(void)
{
    /* 所有对象一次创建完，之后不再 malloc/free */
    xTaskCreate(app_task, "app", 512, NULL, 3, NULL);
}

/* 方案 C：固定块内存池，运行期可分配释放，无碎片 */
#define BLK_SIZE  64
#define BLK_NUM   16

static uint8_t s_pool[BLK_NUM][BLK_SIZE];
static uint32_t s_used_mask;

void *pool_alloc(void)
{
    for (int i = 0; i < BLK_NUM; i++) {
        if (!(s_used_mask & (1u << i))) {
            s_used_mask |= (1u << i);
            return s_pool[i];
        }
    }
    return NULL;
}

void pool_free(void *p)
{
    for (int i = 0; i < BLK_NUM; i++) {
        if (p == s_pool[i]) { s_used_mask &= ~(1u << i); return; }
    }
}`
        },
        apply: `<p>我的项目通常这样配置：开启 heap_4 但只在初始化阶段使用，运行期所有对象都是静态或内存池；同时开启 <code>configUSE_MALLOC_FAILED_HOOK</code>，分配失败时记录日志并进入安全状态，而不是直接崩溃。</p>
<p>如果芯片有多个 RAM 区域（比如 DTCM + AXI SRAM），用 heap_5 把两块都纳入管理，并在链接脚本里预留空间。</p>`,
        pitfalls: [
          "<b>用默认的 heap_1 却动态删除任务。</b>删除后内存无法回收，反复创建会耗尽堆，最终创建失败。",
          "<b>认为 heap_4 不会有碎片。</b>合并只能处理相邻空闲块，长期运行仍可能碎片化，只是比 heap_2 好很多。",
          "<b>堆大小估太小。</b>创建几个任务后就分配失败，现象是任务没启动、系统静默不工作。要预留 30% 余量。"
        ],
        follow: [
          [
            "如何知道堆用了多少？",
            "用 <code>xPortGetFreeHeapSize</code> 查剩余，用 <code>xPortGetMinimumEverFreeHeapSize</code> 查历史最小剩余，后者更能反映峰值占用。"
          ],
          [
            "静态创建有什么好处？",
            "内存完全可预测、无碎片、无分配失败风险，链接时就能确定 RAM 占用，适合安全关键和长期运行的系统。代价是对象数量固定，不够灵活。"
          ],
          [
            "内存分配失败怎么处理？",
            "实现 <code>vApplicationMallocFailedHook</code>，记录日志、进入降级模式或复位。绝不能忽略返回值继续使用空指针。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("rtos-freertos", {
    chapters: [
      {
        id: "task",
        topics: [
          { id: "create", title: "任务创建与参数" },
          { id: "timer", title: "软件定时器" }
        ]
      },
      {
        id: "sync",
        topics: [
          { id: "event", title: "事件标志组" },
          { id: "deadlock", title: "死锁" }
        ]
      },
      {
        id: "kernel",
        topics: [
          { id: "isr-prio", title: "中断优先级配置" },
          { id: "idle", title: "空闲任务与钩子" },
          { id: "stream", title: "流缓冲与消息缓冲" }
        ]
      }
    ],
    questions: [
      {
        id: "R-10",
        chapter: "task",
        topic: "create",
        title: "xTaskCreate 的参数分别是什么意思？栈大小怎么定？",
        diff: "中级",
        freq: "高频",
        type: "API 分析题",
        point: "任务函数、名称、栈深度（字）、参数、优先级、句柄；栈大小要按调用深度和局部变量估算。",
        q: `<p>面试官：<code>xTaskCreate</code> 的第三个参数是栈大小，单位是字节还是字？任务栈开多大合适？</p>`,
        exam: `<p>考察 FreeRTOS API 细节和栈估算能力。能指出“单位是 StackType_t（通常 4 字节）”，并说出高水位检测方法，就很好。</p>`,
        core: `<p>xTaskCreate 的栈深度单位是字不是字节，优先级 0 最低且要小于 configMAX_PRIORITIES，参数不能传局部变量地址；栈按最坏调用链加中断帧估算。</p>`,
        answer: `<p><b>参数含义：</b></p>
<ul>
<li><code>pxTaskCode</code>：任务函数指针，必须是 <code>void (*)(void *)</code> 形式，且不能返回（返回会导致未定义行为，通常末尾加 <code>vTaskDelete(NULL)</code>）；</li>
<li><code>pcName</code>：任务名，仅用于调试，长度受 <code>configMAX_TASK_NAME_LEN</code> 限制；</li>
<li><code>usStackDepth</code>：栈深度，单位是 <b>StackType_t</b>（32 位平台上通常是 4 字节），不是字节；</li>
<li><code>pvParameters</code>：传给任务的参数指针；</li>
<li><code>uxPriority</code>：优先级，数值越大优先级越高；</li>
<li><code>pxCreatedTask</code>：返回的任务句柄，用于后续操作。</li>
</ul>
<p><b>栈大小估算：</b></p>
<ul>
<li>统计任务调用链上所有函数的局部变量、返回地址、保存的寄存器；</li>
<li>加上一次中断入口的异常帧（8 个字；开了 FPU 再 +18 个字，整帧 26 字），它压在被打断的任务栈上；ISR 自身的局部变量和嵌套用的是 MSP，要单独按主栈估算；</li>
<li>用 <code>uxTaskGetStackHighWaterMark()</code> 查看历史最小剩余量，留 30% 余量；</li>
<li>浮点运算、printf、递归会显著增加栈需求。</li>
</ul>
<p>栈开太小会踩坏相邻内存，表现为随机死机；开太大浪费 RAM。建议先用较大值跑测试，再根据高水位收紧。</p>`,
        principle: `<p>FreeRTOS 为每个任务分配独立的栈空间，任务切换时保存/恢复上下文到自己的栈。栈的单位由 <code>StackType_t</code> 决定，在 32 位 MCU 上是 uint32_t。</p>
<p>在 Cortex-M 上，中断入口的 8 字异常帧（FPU 活跃时再加 18 字，整帧 26 字）压在被打断任务的 PSP 上，所以任务栈要预留这一份；而 ISR 自身的局部变量、ISR 嵌套用的都是 MSP，和任务栈是两回事，主栈要单独估算。</p>`,
        fig: {
          type: "table",
          title: "xTaskCreate 参数说明",
          tag: "freertos api",
          head: ["参数", "含义", "注意"],
          rows: [
            ["pxTaskCode", "任务函数", "不能返回"],
            ["pcName", "任务名", "仅调试用"],
            ["usStackDepth", "栈深度（字）", "不是字节数"],
            ["pvParameters", "参数指针", "生命周期要保证"],
            ["uxPriority", "优先级", "数值越大越高"],
            ["pxCreatedTask", "任务句柄", "可用于删除/通知"]
          ]
        },
        code: {
          lang: "c",
          title: "task_create.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

static void sensor_task(void *arg)
{
    const char *name = (const char *)arg;

    for (;;) {
        /* 业务处理 */
        (void)name;
        vTaskDelay(pdMS_TO_TICKS(100));
    }
    /* 不会执行到这里；若任务需要退出，用 vTaskDelete(NULL) */
}

void app_create_tasks(void)
{
    TaskHandle_t handle = NULL;

    /* 栈深度 256 字 = 1024 字节（32 位平台） */
    BaseType_t ok = xTaskCreate(sensor_task,
                                "sensor",
                                256,
                                (void *)"sensor",
                                tskIDLE_PRIORITY + 2,
                                &handle);
    configASSERT(ok == pdPASS);

    /* 运行时查看栈高水位 */
    UBaseType_t high = uxTaskGetStackHighWaterMark(handle);
    (void)high;
}`
        },
        codeNote: "栈深度单位容易搞错：传 256 表示 256 个 StackType_t，不是 256 字节。",
        apply: `<p>我通常先按经验给 512 字，跑完整业务流程后用高水位收紧到 1.5 倍实际峰值。带 printf 或浮点的任务会额外留 256 字。</p>
<p>中断里调用 RTOS API 时，中断栈也要算进主栈（MSP）大小，启动文件里的栈配置不能太小。</p>`,
        pitfalls: [
          "<b>把栈深度当字节数。</b>实际分配是 4 倍，浪费 RAM 或理解错误。",
          "<b>任务函数返回。</b>未定义行为，可能触发断言或跑飞。",
          "<b>参数指针指向局部变量。</b>函数返回后参数失效。",
          "<b>优先级设得过高。</b>低优先级任务饿死。"
        ],
        follow: [
          ["静态创建和动态创建有什么区别？", "xTaskCreateStatic 由用户提供栈和 TCB 内存，不依赖堆，适合禁止动态分配的安全关键系统。"],
          ["任务名有什么用？", "调试时在 IDE 的 RTOS 视图里显示，方便识别；不参与调度，长度受配置限制。" ]
        ]
      },

      {
        id: "R-11",
        chapter: "task",
        topic: "timer",
        title: "FreeRTOS 的软件定时器是怎么实现的？回调里为什么不能阻塞？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "定时器由守护任务统一管理，回调在守护任务上下文执行，阻塞会影响所有定时器。",
        q: `<p>面试官：软件定时器的回调函数里能不能调用 vTaskDelay？为什么？</p>`,
        exam: `<p>考察对软件定时器实现机制的理解。能说出“守护任务 + 命令队列 + 回调在守护任务里执行”，就很好。</p>`,
        core: `<p>FreeRTOS 软件定时器由守护任务统一管理，回调在守护任务上下文执行；回调里不能阻塞，否则所有定时器都会停摆。</p>`,
        answer: `<p><b>实现机制：</b></p>
<ul>
<li>FreeRTOS 创建一个<b>守护任务（Timer Service Task）</b>，优先级由 <code>configTIMER_TASK_PRIORITY</code> 配置；</li>
<li>应用调用 <code>xTimerStart</code> 等 API 时，实际是把命令放入守护任务的命令队列；</li>
<li>守护任务维护定时器链表，按到期时间排序，用系统 tick 判断哪个定时器到期；</li>
<li>到期后，守护任务调用对应的回调函数。</li>
</ul>
<p><b>为什么回调里不能阻塞：</b>回调运行在守护任务的上下文里，如果调用 <code>vTaskDelay</code> 或等待信号量，守护任务会被挂起，<b>所有软件定时器都无法处理</b>，包括其它已经到期的定时器。这会导致定时器大面积延迟甚至失效。</p>
<p><b>回调里应该做什么：</b>只做轻量操作，比如置标志、发送队列/通知、翻转 GPIO。耗时处理交给普通任务。</p>
<p><b>配置注意：</b><code>configTIMER_TASK_STACK_DEPTH</code> 要足够，因为回调的调用栈也算在守护任务上；<code>configTIMER_QUEUE_LENGTH</code> 太小会导致 API 调用失败。</p>`,
        principle: `<p>软件定时器不是硬件定时器，它依赖系统 tick 和守护任务调度，所以精度受 tick 周期和任务优先级影响，不适合微秒级精确定时。</p>
<p>把回调放在守护任务里，避免了在中断上下文执行用户代码，简化了并发模型，但也引入了“单点阻塞”的风险。</p>`,
        fig: {
          type: "flow",
          title: "软件定时器的执行路径",
          tag: "freertos timer",
          items: [
            { t: "应用调用 API", d: "xTimerStart / xTimerChangePeriod" },
            { t: "命令入队", d: "发送到守护任务队列" },
            { t: "守护任务处理", d: "更新定时器链表" },
            { t: "tick 到期", d: "检查并触发回调" },
            { t: "执行回调", d: "必须短小、不阻塞" }
          ]
        },
        code: {
          lang: "c",
          title: "soft_timer.c",
          src: `#include "FreeRTOS.h"
#include "timers.h"

static TimerHandle_t led_timer;
static TaskHandle_t  led_task_handle;   /* 创建 LED 任务时用 &led_task_handle 回填 */

/* 回调：只做轻量动作，不阻塞 */
static void led_timer_cb(TimerHandle_t t)
{
    /* 定时器回调运行在守护任务（timer service task）上下文，
     * 属于任务态，必须用普通版本 API，不能用 FromISR 版本 */
    xTaskNotifyGive(led_task_handle);
}

void timer_init(void)
{
    /* 周期 500ms，自动重载 */
    led_timer = xTimerCreate("led",
                             pdMS_TO_TICKS(500),
                             pdTRUE,
                             NULL,
                             led_timer_cb);
    configASSERT(led_timer);
    xTimerStart(led_timer, 0);
}`
        },
        codeNote: "软件定时器的回调<b>永远</b>在守护任务（timer service task）里执行，属于任务上下文，所以只能用 <code>xTaskNotifyGive</code>/<code>xQueueSend</code> 这类普通 API；调用 FromISR 版本会失败或触发断言。",
        apply: `<p>我用软件定时器做心跳、超时检测和周期采样触发，回调里只发通知或置标志。真正的数据处理放在任务里，避免阻塞守护任务。</p>
<p>对时间精度要求高的场合（如 PWM、编码器采样）用硬件定时器，软件定时器只做“软实时”的调度。</p>`,
        pitfalls: [
          "<b>回调里调用 vTaskDelay。</b>阻塞守护任务，所有定时器失效。",
          "<b>回调里做耗时计算。</b>其它定时器延迟。",
          "<b>守护任务优先级太低。</b>定时器到期后不能及时执行。",
          "<b>命令队列太小。</b>API 调用失败，定时器没启动。"
        ],
        follow: [
          ["单次定时器和周期定时器怎么切换？", "xTimerCreate 的 uxAutoReload 参数为 pdFALSE 是单次，pdTRUE 是周期；也可以用 xTimerChangePeriod 重新设置。"],
          ["软件定时器的精度有多高？", "受 tick 周期限制，误差在一个 tick 以内，加上守护任务调度延迟；不适合微秒级应用。" ]
        ]
      },

      {
        id: "R-12",
        chapter: "sync",
        topic: "event",
        title: "事件标志组和信号量有什么区别？什么时候用事件组？",
        diff: "中级",
        freq: "中频",
        type: "对比分析题",
        point: "事件组可以等待多个事件的组合（与/或），信号量只能表示单一资源或单一事件。",
        q: `<p>面试官：一个任务要等“网络连接成功”并且“传感器初始化完成”才继续，用信号量还是事件组？</p>`,
        exam: `<p>考察同步原语的选择。能说出“事件组支持多位组合、可以等待任意一位或全部位”，就很好。</p>`,
        core: `<p>用事件组：一个位表示网络连上、一个位表示传感器就绪，两位都置位再继续；事件组支持多条件与或等待，信号量只能表示单个事件。</p>`,
        answer: `<p><b>信号量</b>是一个计数器，表示“有多少个资源/事件”，只能表达单一维度。要等两个事件，就得用两个信号量并依次等待，逻辑分散且容易出错。</p>
<p><b>事件标志组</b>是一组二进制位，每个位代表一个事件。任务可以等待：</p>
<ul>
<li><b>任意一位</b>（OR）：只要有一个事件发生就继续；</li>
<li><b>全部位</b>（AND）：所有指定事件都发生才继续；</li>
<li>可以设置“等待后清除”或“保留”标志。</li>
</ul>
<p>所以“网络连接成功 + 传感器初始化完成”这种组合条件，用事件组最自然：两个任务分别置位，等待任务用 AND 等待。</p>
<p><b>注意事项：</b></p>
<ul>
<li>事件组用 32 位变量，最多 24 位可用（高 8 位保留）；</li>
<li>中断里置位要用 <code>xEventGroupSetBitsFromISR</code>，它通过守护任务完成，不能在中断里直接调用；</li>
<li>多个任务等待同一事件组时，要注意清除语义，避免一个任务清掉另一个任务需要的事件。</li>
</ul>`,
        principle: `<p>事件组用一个位图表示多个事件的状态，等待操作在阻塞时检查位图是否满足条件。相比多个信号量，它把“组合条件”的等待变成一次原子操作，避免了分步等待的竞态。</p>
<p>信号量更适合资源计数和简单的生产者-消费者同步。</p>`,
        fig: {
          type: "table",
          title: "信号量 vs 事件组",
          tag: "synchronization",
          head: ["维度", "信号量", "事件组"],
          rows: [
            ["表达能力", "单一计数", "多位事件组合"],
            ["等待条件", "一个信号量", "AND / OR 组合"],
            ["典型用途", "资源计数、互斥", "多事件汇合"],
            ["中断 API", "GiveFromISR", "SetBitsFromISR"]
          ]
        },
        code: {
          lang: "c",
          title: "event_group.c",
          src: `#include "FreeRTOS.h"
#include "event_groups.h"

#define BIT_NET_READY   (1u << 0)
#define BIT_SENSOR_READY (1u << 1)

static EventGroupHandle_t evt;

void net_task(void *arg)
{
    /* 网络初始化完成 */
    xEventGroupSetBits(evt, BIT_NET_READY);
    vTaskDelete(NULL);
}

void app_start(void)
{
    evt = xEventGroupCreate();
    configASSERT(evt);

    /* 等待两个事件都发生 */
    EventBits_t bits = xEventGroupWaitBits(evt,
                                           BIT_NET_READY | BIT_SENSOR_READY,
                                           pdTRUE,     /* 等待后清除 */
                                           pdTRUE,     /* 要求全部位 */
                                           portMAX_DELAY);
    (void)bits;

    /* 两个条件都满足，开始业务 */
}`
        },
        codeNote: "pdTRUE 清除标志适合“一次性汇合”；如果需要多个任务都看到同一事件，应设为 pdFALSE 并自行管理清除。",
        apply: `<p>我做设备启动流程时，用事件组汇合“传感器就绪、网络就绪、配置加载完成”三个条件，主任务一次等待，逻辑清晰。</p>
<p>如果是“任意一个告警发生就唤醒处理任务”，用 OR 等待更合适。</p>`,
        pitfalls: [
          "<b>用多个信号量拼组合条件。</b>分步等待有竞态，代码也复杂。",
          "<b>中断里直接调 SetBits。</b>必须用 FromISR 版本。",
          "<b>清除语义没想清楚。</b>一个任务清掉别的任务需要的事件。",
          "<b>位数超过 24 位。</b>高位保留，行为不符合预期。"
        ],
        follow: [
          ["事件组能替代消息队列吗？", "不能，事件组只传递“发生了没有”，不携带数据；需要传数据时用队列或通知。"],
          ["xEventGroupWaitBits 会消耗 CPU 吗？", "不会，等待时任务进入阻塞态，调度器切换到其它任务，不占用 CPU。" ]
        ]
      },

      {
        id: "R-13",
        chapter: "sync",
        topic: "deadlock",
        title: "RTOS 里死锁是怎么产生的？怎么避免？",
        diff: "高级",
        freq: "高频",
        type: "故障分析题",
        point: "互斥资源循环等待、持有并等待、不可抢占；按固定顺序加锁、超时、减少锁粒度。",
        q: `<p>面试官：两个任务互相等待对方持有的锁，系统卡死。怎么发现？怎么从设计上避免？</p>`,
        exam: `<p>考察并发编程的实战经验。能说出死锁四个必要条件、加锁顺序、超时机制，就很好。</p>`,
        core: `<p>死锁要同时满足互斥、持有并等待、不可抢占、循环等待；避免办法是固定加锁顺序、带超时获取、不嵌套锁、持锁时不做阻塞调用。</p>`,
        answer: `<p><b>死锁的四个必要条件：</b></p>
<ol>
<li>互斥：资源一次只能被一个任务持有；</li>
<li>持有并等待：持有锁的同时等待另一个锁；</li>
<li>不可抢占：锁不能被强制夺走；</li>
<li>循环等待：任务之间形成环形等待链。</li>
</ol>
<p>四个条件同时满足才会死锁，破坏任意一个即可避免。</p>
<p><b>常见场景：</b>任务 A 先拿锁 1 再拿锁 2，任务 B 先拿锁 2 再拿锁 1；或者中断/任务混用导致优先级反转加剧。</p>
<p><b>避免方法：</b></p>
<ul>
<li><b>固定加锁顺序</b>：所有任务按同一顺序获取多个锁，破坏循环等待；</li>
<li><b>使用超时</b>：<code>xSemaphoreTake(mutex, timeout)</code>，超时后释放已持有的锁并重试；</li>
<li><b>减少锁粒度</b>：缩小临界区，尽量不嵌套锁；</li>
<li><b>避免在持锁时调用可能阻塞的 API</b>；</li>
<li><b>用单一锁保护相关资源</b>，而不是多个细锁。</li>
</ul>
<p><b>发现方法：</b>用调试器的 RTOS 视图查看任务状态和持有关系；或者在超时时打印任务名和锁信息；开启 FreeRTOS 的运行时统计和栈高水位。</p>`,
        principle: `<p>死锁是并发系统资源分配的经典问题。FreeRTOS 的互斥量支持优先级继承，能缓解优先级反转，但不能防止死锁本身。</p>
<p>超时机制把“永久等待”变成“可恢复的失败”，是工程上最实用的兜底手段。</p>`,
        fig: {
          type: "flow",
          title: "循环等待形成死锁",
          tag: "deadlock",
          items: [
            { t: "任务 A 拿锁 1", d: "成功" },
            { t: "任务 B 拿锁 2", d: "成功" },
            { t: "A 请求锁 2", d: "被 B 持有，阻塞" },
            { t: "B 请求锁 1", d: "被 A 持有，阻塞" },
            { t: "循环等待", d: "两者永久阻塞" }
          ]
        },
        code: {
          lang: "c",
          title: "lock_order.c",
          src: `#include "FreeRTOS.h"
#include "semphr.h"

static SemaphoreHandle_t lock_a;
static SemaphoreHandle_t lock_b;

/* 错误：不同任务以不同顺序加锁，可能死锁 */
void task_bad_1(void)
{
    xSemaphoreTake(lock_a, portMAX_DELAY);
    xSemaphoreTake(lock_b, portMAX_DELAY);
    /* ... */
    xSemaphoreGive(lock_b);
    xSemaphoreGive(lock_a);
}

/* 正确：统一加锁顺序 + 超时兜底 */
int safe_update(void)
{
    if (xSemaphoreTake(lock_a, pdMS_TO_TICKS(100)) != pdTRUE) return -1;
    if (xSemaphoreTake(lock_b, pdMS_TO_TICKS(100)) != pdTRUE) {
        xSemaphoreGive(lock_a);       /* 失败时释放已持有的锁 */
        return -2;
    }

    /* 临界区尽量短 */

    xSemaphoreGive(lock_b);
    xSemaphoreGive(lock_a);
    return 0;
}`
        },
        codeNote: "超时后一定要释放已获取的锁，否则会把“死锁”变成“资源永久泄漏”。",
        apply: `<p>我在项目里约定：全局只有少数几把锁，并且规定固定的获取顺序（如先配置锁、再数据锁），代码评审时专门检查嵌套加锁。</p>
<p>调试死锁时，用调试器暂停看各任务的调用栈和等待对象，能快速找到环形关系。</p>`,
        pitfalls: [
          "<b>加锁顺序不一致。</b>最典型的死锁来源。",
          "<b>持锁时调用阻塞 API。</b>延长持锁时间，放大死锁概率。",
          "<b>超时后不释放已持有的锁。</b>资源泄漏。",
          "<b>用二值信号量当互斥量。</b>没有优先级继承，容易优先级反转。"
        ],
        follow: [
          ["优先级继承能解决死锁吗？", "不能，它只缓解优先级反转，让高优先级任务尽快拿到锁；死锁需要从加锁顺序和超时机制上解决。"],
          ["中断里能拿互斥量吗？", "不能，互斥量不能在中断上下文使用；中断与任务共享数据应该用临界区或二值信号量。" ]
        ]
      },

      {
        id: "R-14",
        chapter: "kernel",
        topic: "isr-prio",
        title: "configMAX_SYSCALL_INTERRUPT_PRIORITY 是什么？配错会怎样？",
        diff: "高级",
        freq: "高频",
        type: "配置分析题",
        point: "它划分“可调用 RTOS API 的中断”和“不可调用”的边界，配错会导致断言失败或内存破坏。",
        q: `<p>面试官：FreeRTOS 的中断优先级配置经常报断言，configMAX_SYSCALL_INTERRUPT_PRIORITY 到底怎么理解？</p>`,
        exam: `<p>考察对 FreeRTOS 临界区和中断优先级的理解。能说清“高于阈值的中断不能被 RTOS 屏蔽，因此不能调用 API”，就很好。</p>`,
        core: `<p>configMAX_SYSCALL_INTERRUPT_PRIORITY 是能调用 RTOS API 的中断优先级门槛，数值大于等于它的中断才能调 FromISR；配错会断言失败或破坏内核链表。</p>`,
        answer: `<p><b>作用：</b>FreeRTOS 在临界区里通过 BASEPRI 屏蔽中断，只能屏蔽优先级数值<b>大于等于</b> <code>configMAX_SYSCALL_INTERRUPT_PRIORITY</code> 的中断。优先级更高（数值更小）的中断不受 RTOS 控制，因此：</p>
<ul>
<li>优先级数值 ≥ 阈值的中断：<b>可以</b>调用 <code>xxxFromISR</code> API；</li>
<li>优先级数值 &lt; 阈值的中断：<b>不能</b>调用任何 RTOS API，因为它们可能在临界区内打断内核，破坏数据结构。</li>
</ul>
<p><b>配错的后果：</b></p>
<ul>
<li>高优先级中断调用了 FromISR API → 触发 <code>configASSERT</code>，或者在内核数据被修改到一半时插入，导致链表损坏、系统崩溃；</li>
<li>阈值设置不当 → 临界区屏蔽范围过大，影响高实时性中断；或屏蔽范围过小，内核被意外打断。</li>
</ul>
<p><b>配置建议：</b></p>
<ul>
<li>把需要调用 RTOS API 的中断统一放在阈值以下（数值更大）；</li>
<li>对实时性要求极高、且不调用 API 的中断（如电机 PWM）可以放在阈值以上；</li>
<li>注意 Cortex-M 的优先级数值越小越高，与“阈值”比较时容易搞反；</li>
<li>优先级分组要统一，避免实际生效位数与预期不符。</li>
</ul>`,
        principle: `<p>FreeRTOS 的临界区不是关所有中断，而是设置 BASEPRI，只屏蔽一部分。这样高优先级中断仍能响应，保证实时性；代价是这些中断不能碰内核数据。</p>
<p>FromISR API 内部会检查当前中断优先级是否在允许范围内，超出则断言失败，帮助开发者及早发现配置错误。</p>`,
        fig: {
          type: "layers",
          title: "中断优先级的分界线",
          tag: "freertos isr",
          items: [
            { tag: "高优先级", t: "数值 < 阈值", d: "不受 RTOS 屏蔽，禁止调用 API" },
            { tag: "分界", t: "configMAX_SYSCALL_INTERRUPT_PRIORITY", d: "临界区屏蔽的起点" },
            { tag: "低优先级", t: "数值 ≥ 阈值", d: "可调用 FromISR API" },
            { tag: "SysTick/PendSV", t: "最低优先级", d: "内核自身使用" }
          ]
        },
        code: {
          lang: "c",
          title: "FreeRTOSConfig.h",
          src: `/* 优先级数值越小越高，这里假设 4 位优先级 */
#define configPRIO_BITS                       4
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY      15
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY  5

/* 写入寄存器时需要左移到高 4 位 */
#define configKERNEL_INTERRUPT_PRIORITY \\
    (configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))

#define configMAX_SYSCALL_INTERRUPT_PRIORITY \\
    (configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))

/*
 * 可调用 FromISR API 的中断：优先级数值 >= 5（即 5~15）
 * 不可调用的中断：优先级数值 0~4
 */`
        },
        codeNote: "不同 Cortex-M 型号实现的优先级位数不同（M0 是 2 位，M3/M4 是 4 位），移植时要按实际调整。",
        apply: `<p>我的做法是：所有外设中断统一用 5~15 的优先级，只有电机 PWM 这种纯硬件中断用 0~4 且绝不调用 RTOS API。这样规则简单，不容易出错。</p>
<p>如果调试时看到 <code>configASSERT</code> 停在 FromISR 的优先级检查处，先查这个中断的优先级数值是不是小于阈值。</p>`,
        pitfalls: [
          "<b>高优先级中断调用 API。</b>内核数据损坏，随机崩溃。",
          "<b>把数值大小搞反。</b>以为 0 是最低优先级。",
          "<b>忘记左移。</b>写入的优先级与预期不符。",
          "<b>优先级分组不一致。</b>实际生效位数变化，阈值失效。"
        ],
        follow: [
          ["为什么 SysTick 和 PendSV 要设最低优先级？", "它们负责时基和上下文切换，必须让其它中断先完成，避免在中断中间切换任务导致栈混乱。"],
          ["临界区里能调用 vTaskDelay 吗？", "不能，临界区要求快速退出，调用阻塞 API 会触发断言或导致系统异常。" ]
        ]
      },

      {
        id: "R-15",
        chapter: "kernel",
        topic: "idle",
        title: "空闲任务有什么用？空闲钩子能做什么、不能做什么？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "空闲任务负责清理被删除任务的资源，钩子在空闲时运行，不能阻塞。",
        q: `<p>面试官：FreeRTOS 启动后为什么自动创建空闲任务？vApplicationIdleHook 里能调用 vTaskDelay 吗？</p>`,
        exam: `<p>考察对调度器内部机制的理解。能说出“回收删除任务的内存/栈”和“钩子不能阻塞”，就很好。</p>`,
        core: `<p>空闲任务保证系统总有任务可运行，并回收被删除任务的栈和 TCB；空闲钩子可进低功耗，但不能阻塞或做长时间操作。</p>`,
        answer: `<p><b>空闲任务的作用：</b></p>
<ul>
<li>保证系统任何时候至少有一个可运行任务，调度器不会找不到任务；</li>
<li>回收被 <code>vTaskDelete</code> 删除的任务的栈和 TCB 内存（被删除任务的内存由空闲任务释放）；</li>
<li>提供低优先级的“后台”执行机会。</li>
</ul>
<p>空闲任务优先级最低（0），只有其它任务都阻塞时才运行。</p>
<p><b>空闲钩子（vApplicationIdleHook）：</b>在空闲任务循环里被调用，适合做：</p>
<ul>
<li>进入低功耗模式（WFI）；</li>
<li>统计 CPU 使用率（配合运行时间统计）；</li>
<li>清理日志、做低优先级维护。</li>
</ul>
<p><b>不能做：</b></p>
<ul>
<li>调用会阻塞的 API（<code>vTaskDelay</code>、等待信号量），因为空闲任务被阻塞后，系统可能没有可运行任务；</li>
<li>执行长时间操作，会推迟空闲任务回收资源和低功耗；</li>
<li>调用 <code>taskENTER_CRITICAL</code> 长时间占用临界区。</li>
</ul>
<p>使用钩子需要在配置里设置 <code>configUSE_IDLE_HOOK = 1</code>。</p>`,
        principle: `<p>调度器需要一个“兜底任务”来保证 CPU 永远有事情做（或进入低功耗）。空闲任务就是这个兜底，同时承担资源回收的职责。</p>
<p>钩子是在空闲任务上下文执行的普通函数，所以受同样的限制：不能阻塞，不能长时间占用。</p>`,
        fig: {
          type: "flow",
          title: "空闲任务的职责",
          tag: "idle task",
          items: [
            { t: "调度兜底", d: "保证总有可运行任务" },
            { t: "资源回收", d: "释放已删除任务的栈和 TCB" },
            { t: "空闲钩子", d: "低功耗、统计、维护" },
            { t: "低功耗", d: "WFI 进入睡眠" }
          ]
        },
        code: {
          lang: "c",
          title: "idle_hook.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

/* 空闲钩子：进入低功耗，等待下一个中断 */
void vApplicationIdleHook(void)
{
    /* 不要在这里阻塞或做耗时操作 */
    __asm volatile ("wfi");
}

/* 栈溢出钩子：调试阶段非常有用 */
void vApplicationStackOverflowHook(TaskHandle_t task, char *name)
{
    (void)task;
    (void)name;
    taskDISABLE_INTERRUPTS();
    for (;;) {
        /* 停在这里，用调试器查看 name */
    }
}

/* 获取 CPU 使用率需要开启 configGENERATE_RUN_TIME_STATS */
void idle_stats(void)
{
    /* vTaskGetRunTimeStats(buffer) 输出各任务占用 */
}`
        },
        codeNote: "在空闲钩子里执行 WFI 前，要确认没有其它任务依赖空闲任务做资源回收；通常配合 Tickless 使用。",
        apply: `<p>低功耗产品里，我在空闲钩子里调用 WFI，让 CPU 在无事可做时进入睡眠。配合 Tickless，能把待机电流降到微安级。</p>
<p>调试阶段开启栈溢出钩子，一旦某个任务栈不够，会停在这里并保留任务名，比随机死机好查得多。</p>`,
        pitfalls: [
          "<b>空闲钩子里调用 vTaskDelay。</b>空闲任务被阻塞，系统可能无任务可调度。",
          "<b>钩子里做耗时操作。</b>资源回收延迟，低功耗失效。",
          "<b>忘记开启配置宏。</b>钩子函数根本不会被调用。",
          "<b>删除任务后不复位看门狗。</b>空闲任务回收时看门狗超时。"
        ],
        follow: [
          ["删除任务后内存什么时候释放？", "vTaskDelete 只是把任务从就绪链表移除，栈和 TCB 由空闲任务在下次运行时释放；如果删除的是空闲任务自己，需要特殊处理。"],
          ["如何统计 CPU 使用率？", "开启 configGENERATE_RUN_TIME_STATS，提供一个高精度计时器，用 vTaskGetRunTimeStats 输出各任务的运行时间占比。" ]
        ]
      },

      {
        id: "R-16",
        chapter: "kernel",
        topic: "heap",
        title: "heap_4 和 heap_1、heap_2 有什么区别？内存碎片怎么产生的？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "heap_1 只分配不释放，heap_2 支持释放但不合并，heap_4 支持合并相邻空闲块。",
        q: `<p>面试官：FreeRTOS 有五种内存管理方案，项目里该选哪个？为什么长期运行会出现分配失败？</p>`,
        exam: `<p>考察对堆管理算法的理解。能说出“heap_4 合并相邻空闲块、碎片仍然可能产生”，就很好。</p>`,
        core: `<p>heap_4 支持释放并合并相邻空闲块、最常用；频繁分配不同大小仍会产生碎片，应静态创建或改用固定块内存池。</p>`,
        answer: `<p><b>五种方案：</b></p>
<ul>
<li><b>heap_1</b>：只分配、不释放，实现最简单，适合任务和队列一次性创建后不再删除的系统。</li>
<li><b>heap_2</b>：支持释放，但<b>不合并</b>相邻空闲块，容易产生碎片，已不推荐。</li>
<li><b>heap_3</b>：封装标准库的 malloc/free，线程安全，但依赖链接器的堆配置，行为受 C 库影响。</li>
<li><b>heap_4</b>：支持释放，且会<b>合并相邻空闲块</b>，碎片较少，是最常用的方案。</li>
<li><b>heap_5</b>：在 heap_4 基础上支持多个不连续的内存区域，适合外部 SRAM 和内部 RAM 混合使用。</li>
</ul>
<p><b>碎片怎么产生：</b>频繁分配和释放不同大小的块，空闲内存被分割成许多不连续的小块。即使总空闲量足够，也找不到一块足够大的连续内存，分配失败。</p>
<p>heap_4 的合并只能处理<b>相邻</b>的空闲块；如果空闲块之间隔着已分配的块，仍然无法合并。</p>
<p><b>减少碎片的方法：</b></p>
<ul>
<li>避免频繁动态分配，改用静态创建或内存池；</li>
<li>分配大小尽量固定（固定块内存池）；</li>
<li>启动时一次性创建所有任务和队列；</li>
<li>用 heap_4 并监控剩余堆大小。</li>
</ul>`,
        principle: `<p>动态内存分配的核心问题是“如何管理空闲块”。首次适配、最佳适配等策略都会留下不同大小的空洞，长期运行后碎片不可避免。</p>
<p>heap_4 用空闲链表加相邻块合并，缓解但不能根除碎片；实时系统通常更倾向于静态分配或固定块池。</p>`,
        fig: {
          type: "table",
          title: "FreeRTOS 五种堆方案",
          tag: "heap",
          head: ["方案", "释放", "合并", "适用场景"],
          rows: [
            ["heap_1", "不支持", "—", "只创建不删除"],
            ["heap_2", "支持", "不合并", "已不推荐"],
            ["heap_3", "支持", "依赖 C 库", "需要标准 malloc"],
            ["heap_4", "支持", "合并相邻块", "通用推荐"],
            ["heap_5", "支持", "合并 + 多区域", "内外 RAM 混合"]
          ]
        },
        code: {
          lang: "c",
          title: "heap_monitor.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

void heap_report(void)
{
    /* 当前剩余堆字节数 */
    size_t free_bytes = xPortGetFreeHeapSize();

    /* 历史最小剩余量：判断最坏情况 */
    size_t min_bytes = xPortGetMinimumEverFreeHeapSize();

    /* 通过日志输出，或存入诊断结构体 */
    (void)free_bytes;
    (void)min_bytes;

    if (min_bytes < 512) {
        /* 余量过低，考虑增大堆或改静态分配 */
    }
}

/* 分配失败钩子：定位是哪个分配点失败 */
void vApplicationMallocFailedHook(void)
{
    taskDISABLE_INTERRUPTS();
    for (;;) {
        /* 停在这里，查看调用栈 */
    }
}`
        },
        codeNote: "configTOTAL_HEAP_SIZE 要按最坏情况估算，并留 30% 余量；开启 malloc 失败钩子能快速定位问题。",
        apply: `<p>我的项目默认用 heap_4，并在启动时一次性创建所有任务、队列和信号量，运行中几乎不再动态分配，从根上避免碎片。</p>
<p>如果确实需要运行中分配（如协议连接），用固定大小的内存池，按块分配，不依赖通用堆。</p>`,
        pitfalls: [
          "<b>运行中频繁 malloc/free。</b>碎片累积，最终分配失败。",
          "<b>堆开得太小。</b>创建任务时失败，系统起不来。",
          "<b>用 heap_2。</b>不合并空闲块，碎片严重。",
          "<b>不检查返回值。</b>分配失败后继续使用空指针。"
        ],
        follow: [
          ["静态创建能完全避免碎片吗？", "能，静态创建在编译期分配内存，运行中不涉及堆；代价是灵活性降低，任务数量固定。"],
          ["如何检测内存泄漏？", "记录每次分配/释放的调用点和大小，定期对比；或者监控 xPortGetFreeHeapSize 是否持续下降。" ]
        ]
      },

      {
        id: "R-17",
        chapter: "kernel",
        topic: "stream",
        title: "流缓冲区和消息缓冲区有什么区别？分别适合什么数据？",
        diff: "高级",
        freq: "进阶",
        type: "对比分析题",
        point: "流缓冲区按字节流读写、可变长度；消息缓冲区按消息块读写、保留边界。",
        q: `<p>面试官：串口收到的是字节流，CAN 收到的是定长帧，FreeRTOS 里分别该用什么缓冲？</p>`,
        exam: `<p>考察对 FreeRTOS 通信机制的选择。能说出“流缓冲区适合字节流、消息缓冲区适合带边界的数据块”，就很好。</p>`,
        core: `<p>流缓冲区按字节读写、不保留消息边界，适合串口连续流；消息缓冲区按条读写、保留长度边界，适合 CAN 帧和协议包；两者都只支持单读单写。</p>`,
        answer: `<p><b>流缓冲区（Stream Buffer）</b>：</p>
<ul>
<li>按<b>字节</b>读写，不保留消息边界；</li>
<li>支持可变长度读写，一次可以读任意字节数；</li>
<li>适合串口、管道这类连续字节流；</li>
<li>本质是优化的环形缓冲区，单生产者单消费者场景效率很高。</li>
</ul>
<p><b>消息缓冲区（Message Buffer）</b>：</p>
<ul>
<li>按<b>消息</b>读写，每条消息带长度前缀，保留边界；</li>
<li>一次写入一条完整消息，读取时要么读到完整消息，要么读不到；</li>
<li>适合 CAN 帧、协议包、命令这类有边界的数据；</li>
<li>消息长度可变，但总容量固定。</li>
</ul>
<p><b>选择建议：</b></p>
<ul>
<li>数据是连续字节流、由上层协议自己分帧 → 流缓冲区；</li>
<li>数据本身有明确边界、需要按条处理 → 消息缓冲区；</li>
<li>需要多生产者/多消费者 → 用队列（Queue），流/消息缓冲区只支持单读单写。</li>
</ul>`,
        principle: `<p>流缓冲区把数据看成连续的字节序列，读写指针独立移动，适合“生产者写多少、消费者读多少”的场景。</p>
<p>消息缓冲区在流缓冲区基础上增加了长度字段，写入时先写长度再写数据，读取时先读长度再读数据，从而保留消息边界。</p>`,
        fig: {
          type: "table",
          title: "流缓冲 vs 消息缓冲",
          tag: "freertos buffer",
          head: ["维度", "流缓冲区", "消息缓冲区"],
          rows: [
            ["数据单位", "字节", "消息（带长度）"],
            ["边界", "不保留", "保留"],
            ["读写方式", "任意长度", "整条消息"],
            ["典型用途", "串口字节流", "CAN 帧、命令包"],
            ["生产者/消费者", "单读单写", "单读单写"]
          ]
        },
        code: {
          lang: "c",
          title: "stream_buffer.c",
          src: `#include "FreeRTOS.h"
#include "stream_buffer.h"

static StreamBufferHandle_t uart_rx;
static StreamBufferHandle_t can_rx;

void buffers_init(void)
{
    /* 流缓冲区：256 字节，触发水位 1 字节 */
    uart_rx = xStreamBufferCreate(256, 1);
    configASSERT(uart_rx);

    /* 消息缓冲区：只按总容量创建，512 字节 */
    can_rx = xMessageBufferCreate(512);
    configASSERT(can_rx);
    /* 单条消息上限约为“总容量 − 长度字段”，本例约 508 字节；
     * 若要限制单条消息长度，需在应用层自行校验 */
}

/* 串口中断：写入收到的字节 */
void uart_isr_feed(const uint8_t *data, size_t len)
{
    BaseType_t higher = pdFALSE;
    xStreamBufferSendFromISR(uart_rx, data, len, &higher);
    portYIELD_FROM_ISR(higher);
}

/* 任务：读取字节流，交给协议解析 */
void uart_task(void *arg)
{
    uint8_t buf[64];
    for (;;) {
        size_t n = xStreamBufferReceive(uart_rx, buf, sizeof(buf), portMAX_DELAY);
        protocol_feed(buf, n);
    }
}`
        },
        codeNote: "消息缓冲区写入超过容量的消息会失败，发送前要检查长度；流缓冲区写入可能部分成功，要检查返回值。",
        apply: `<p>串口接收我用流缓冲区 + IDLE 中断，任务一次读一批字节交给协议状态机；CAN 接收用消息缓冲区，任务按帧处理，不会把两帧粘在一起。</p>
<p>如果多个任务都要读同一数据源，流缓冲区不适用，需要改用队列或每个任务各自订阅。</p>`,
        pitfalls: [
          "<b>用流缓冲区传有边界的数据。</b>读取时可能把两条消息粘在一起。",
          "<b>消息超过缓冲区容量。</b>写入失败，数据丢失。",
          "<b>多生产者写流缓冲区。</b>不支持，需要额外加锁。",
          "<b>忘记检查发送返回值。</b>缓冲区满时数据静默丢失。"
        ],
        follow: [
          ["流缓冲区和队列有什么区别？", "队列按固定大小的元素复制，支持多生产者多消费者；流缓冲区按字节读写，容量可变，只支持单读单写，效率更高。"],
          ["触发水位（trigger level）有什么用？", "设置后，只有缓冲区里的数据达到该水位才唤醒等待的任务，减少频繁唤醒，适合批量处理。" ]
        ]
      },

      {
        id: "R-18",
        chapter: "sync",
        topic: "queue",
        title: "任务通知为什么比队列快？它有什么限制？",
        diff: "高级",
        freq: "中频",
        type: "对比分析题",
        point: "任务通知直接操作目标任务的控制块，不经过队列结构，速度快、省内存，但只能一对一。",
        q: `<p>面试官：FreeRTOS 的任务通知（Task Notification）和队列比，优势在哪？什么情况下不能用？</p>`,
        exam: `<p>考察对内核实现细节的了解。能说出“无独立对象、直接写 TCB、只能一对一”，就很好。</p>`,
        core: `<p>任务通知直接改目标任务 TCB 里的通知值，最快最省 RAM，但只能一对一、只有一个值；需要广播或排队就用事件组、队列。</p>`,
        answer: `<p><b>任务通知的原理：</b>每个任务的控制块（TCB）里有一个 32 位通知值和一个通知状态。发送通知就是直接修改目标任务的这个字段，并唤醒它。</p>
<p><b>优势：</b></p>
<ul>
<li><b>快</b>：不需要创建队列对象，不涉及内存分配和链表操作；官方基准显示“通知解除阻塞”比二值信号量快约 45%，比队列同样更快；</li>
<li><b>省内存</b>：每个任务自带通知值，不额外占用堆；</li>
<li><b>灵活</b>：通知值可以当作计数、位标志或直接传一个 32 位值。</li>
</ul>
<p><b>限制：</b></p>
<ul>
<li><b>只能一对一</b>：通知是发给特定任务的，不能多个任务等待同一个通知；</li>
<li><b>不能缓冲多条</b>：通知值只有一个，多次发送会覆盖或累加（取决于操作），不能像队列那样排队；</li>
<li><b>不能广播</b>：需要一对多时要用事件组或队列；</li>
<li><b>发送方必须知道目标任务句柄</b>。</li>
</ul>
<p><b>典型用法：</b>中断通知任务处理数据、任务间简单的“事件发生”信号、二值信号量的轻量替代。</p>`,
        principle: `<p>队列是独立的内核对象，发送时要拷贝数据、操作链表、处理阻塞列表；任务通知直接写 TCB 字段，路径短得多，所以更快。</p>
<p>代价是表达能力受限：只有一个 32 位槽位，无法排队，也无法一对多。</p>`,
        fig: {
          type: "table",
          title: "任务通知 vs 队列",
          tag: "notification",
          head: ["维度", "任务通知", "队列"],
          rows: [
            ["速度", "快（比二值信号量约快 45%）", "较慢"],
            ["内存", "无额外对象", "需要队列结构"],
            ["通信关系", "一对一", "多对多"],
            ["缓冲", "单个值", "多个元素"],
            ["广播", "不支持", "不支持（需事件组）"]
          ]
        },
        code: {
          lang: "c",
          title: "task_notify.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

static TaskHandle_t worker;

/* 中断里通知任务：值累加 */
void sensor_isr(void)
{
    BaseType_t higher = pdFALSE;
    vTaskNotifyGiveFromISR(worker, &higher);
    portYIELD_FROM_ISR(higher);
}

/* 任务等待通知，超时返回 0 */
void worker_task(void *arg)
{
    for (;;) {
        uint32_t count = ulTaskNotifyTake(pdTRUE, pdMS_TO_TICKS(1000));
        if (count > 0) {
            /* 处理 count 次事件 */
        } else {
            /* 超时处理 */
        }
    }
}

/* 也可以传一个 32 位值（覆盖式） */
void send_value(uint32_t v)
{
    xTaskNotify(worker, v, eSetValueWithOverwrite);
}`
        },
        codeNote: "eSetValueWithOverwrite 会覆盖未处理的值，eSetValueWithoutOverwrite 在未处理时返回失败，按业务选择。",
        apply: `<p>串口、ADC 这类“中断通知任务处理”的场景，我优先用任务通知，省内存又快。需要传具体数据时，把数据放全局缓冲区，通知值只传索引或长度。</p>
<p>多个任务等待同一事件时，还是用事件组；需要排队保留每条消息时，用队列。</p>`,
        pitfalls: [
          "<b>用通知做多对一。</b>只有一个任务能收到，其它任务收不到。",
          "<b>以为通知能排队。</b>多次发送会覆盖或累加，不是队列。",
          "<b>覆盖模式丢数据。</b>任务还没处理，新值就覆盖了旧值。",
          "<b>中断里用非 FromISR 版本。</b>破坏内核状态。"
        ],
        follow: [
          ["通知值可以当二值信号量用吗？", "可以，ulTaskNotifyTake 的行为类似计数信号量，适合“事件发生”的同步，且更省资源。"],
          ["任务通知能用于任务和中断之间的双向通信吗？", "中断可以通知任务，但任务不能“通知中断”；中断到任务用通知，任务到中断通常用共享变量加中断使能。" ]
        ]
      },

      {
        id: "R-19",
        chapter: "task",
        topic: "sched",
        title: "vTaskStartScheduler 之后发生了什么？调度器是怎么启动的？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "创建空闲任务和定时器任务、初始化 SysTick、启动第一个任务，之后不再返回。",
        q: `<p>面试官：调用 <code>vTaskStartScheduler()</code> 后，程序为什么不会返回？第一个任务是怎么跑起来的？</p>`,
        exam: `<p>考察对调度器启动流程的理解。能说出“创建空闲任务、配置 SysTick、SVC 启动第一个任务”，就很好。</p>`,
        core: `<p>启动调度器先创建空闲任务、初始化 SysTick 和就绪链表，再通过 SVC 启动第一个任务，之后永不返回；堆不够或 SysTick 配错会启动失败或延时不走。</p>`,
        answer: `<p><b>启动流程：</b></p>
<ol>
<li>创建<b>空闲任务</b>（必须），如果启用了软件定时器，还会创建守护任务；</li>
<li>初始化系统 tick 定时器（通常是 SysTick），配置中断优先级为最低；</li>
<li>初始化调度器内部状态（就绪链表、当前任务指针等）；</li>
<li>通过 <b>SVC 异常</b>启动第一个任务：SVC 处理程序从就绪链表中取出最高优先级任务，恢复它的上下文（寄存器、栈指针），然后异常返回，CPU 就开始执行该任务；</li>
<li>调度器进入无限循环，永不返回。</li>
</ol>
<p><b>为什么不会返回：</b>调度器启动后，CPU 的控制权交给任务和中断，主函数所在的上下文不再被调度。如果所有任务都阻塞，空闲任务会运行，仍然不会回到 <code>vTaskStartScheduler</code> 之后。</p>
<p><b>常见问题：</b></p>
<ul>
<li>堆不够，创建空闲任务失败，调度器启动失败（会触发 malloc 失败钩子）；</li>
<li>第一个任务优先级最高，但一启动就阻塞，导致后续任务按优先级运行；</li>
<li>忘记在启动前创建任务，调度器启动后只有空闲任务；</li>
<li>SysTick 优先级配置错误，tick 不工作，延时永远不返回。</li>
</ul>`,
        principle: `<p>调度器启动需要一个“从主函数上下文切换到任务上下文”的机制，ARM 用 SVC 异常完成：SVC 处理程序运行在特权级，可以设置 PSP、恢复任务寄存器，然后异常返回到任务入口。</p>
<p>之后每次任务切换由 PendSV 完成，SysTick 提供时基，三者配合构成 RTOS 的运行基础。</p>`,
        fig: {
          type: "flow",
          title: "调度器启动流程",
          tag: "scheduler",
          items: [
            { t: "创建空闲任务", d: "必须，否则启动失败" },
            { t: "创建定时器任务", d: "如果启用了软件定时器" },
            { t: "初始化 SysTick", d: "配置 tick 周期和优先级" },
            { t: "SVC 启动", d: "恢复第一个任务上下文" },
            { t: "运行任务", d: "调度器不再返回" }
          ]
        },
        code: {
          lang: "c",
          title: "main.c",
          src: `#include "FreeRTOS.h"
#include "task.h"

int main(void)
{
    /* 1. 硬件初始化 */
    HAL_Init();
    SystemClock_Config();

    /* 2. 创建任务、队列、信号量（必须在启动调度器之前） */
    app_create_tasks();

    /* 3. 启动调度器：正常情况下不会返回 */
    vTaskStartScheduler();

    /* 4. 只有内存不足等异常才会走到这里 */
    for (;;) {
        /* 启动失败，点亮错误指示 */
    }
}`
        },
        codeNote: "vTaskStartScheduler 返回通常意味着堆不足，无法创建空闲任务；要检查 configTOTAL_HEAP_SIZE。",
        apply: `<p>我习惯在启动调度器前把所有任务和 IPC 对象创建完，运行中不再动态创建，避免堆碎片和启动失败。</p>
<p>如果调试时发现程序停在 <code>vTaskStartScheduler</code> 之后，先看堆大小和 malloc 失败钩子，而不是怀疑调度器本身。</p>`,
        pitfalls: [
          "<b>堆太小。</b>空闲任务创建失败，调度器直接返回。",
          "<b>启动前没创建任务。</b>只有空闲任务在跑。",
          "<b>SysTick 优先级配错。</b>tick 不递增，延时卡死。",
          "<b>在中断里调用 vTaskStartScheduler。</b>不允许，必须在任务上下文启动。"
        ],
        follow: [
          ["调度器启动前能调用 RTOS API 吗？", "可以创建任务和 IPC 对象，但不能调用会阻塞的 API（如 vTaskDelay），因为调度器还没运行。"],
          ["为什么第一个任务通过 SVC 启动而不是直接跳转？", "SVC 提供了从主函数上下文切换到任务上下文的统一入口，能正确设置 PSP、恢复寄存器并处理异常返回。" ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第三批：移植与裁剪） ---------------- */
  EIK.extend("rtos-freertos", {
    chapters: [
      {
        id: "kernel",
        topics: [
          { id: "port", title: "移植与裁剪" }
        ]
      }
    ],
    questions: [
      {
        id: "R-20",
        chapter: "kernel",
        topic: "port",
        title: "把 FreeRTOS 移植到一颗新 MCU 上要动哪些文件？代码怎么裁剪？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "内核核心文件与 port 层的分工、FreeRTOSConfig.h 的关键配置，以及按需裁剪掉的功能开关。",
        q: `<p>面试官：FreeRTOS 源码里有几十个文件，移植到一颗新芯片时哪些必须动、哪些不用管？工程里你怎么做裁剪？</p>`,
        exam: `<p>考察是否真的移植过而不是只会用现成工程。能说清“核心与硬件无关、只有 port 层要改”，并指出三个必须实现的异常，就很扎实。</p>`,
        core: `<p>FreeRTOS 移植只改 port.c/portmacro.h 和 FreeRTOSConfig.h，核心 tasks.c、queue.c 不动；port 层要实现 SVC、PendSV、SysTick 和临界区宏。</p>`,
        answer: `<p><b>先分三层看：</b></p>
<ul>
<li><b>与硬件无关的核心</b>：tasks.c（任务与调度）、list.c（链表）、queue.c（队列、信号量、互斥量的基础）、timers.c（软件定时器）、event_groups.c（事件组）、stream_buffer.c（流缓冲与消息缓冲）。这些一行都不用改。</li>
<li><b>与架构相关的 port 层</b>：port.c 和 portmacro.h。这是唯一需要针对芯片改的部分，Cortex-M 系列已经有现成的 port（GCC/ARMCC/IAR 各一份）。</li>
<li><b>配置文件</b>：FreeRTOSConfig.h，决定功能开关、时钟频率、堆大小。</li>
</ul>
<p><b>port 层必须实现的四件事：</b></p>
<ul>
<li><b>SVC 异常</b>：启动第一个任务，从主函数上下文切换到任务上下文。</li>
<li><b>PendSV 异常</b>：真正的上下文切换，汇编保存/恢复 R4-R11 和 PSP。</li>
<li><b>SysTick 中断</b>：提供系统时基，驱动延时和同优先级任务的时间片轮转。</li>
<li><b>栈初始化</b>：构造任务首次运行的假栈帧，让第一次 PendSV 能正确“返回”到任务入口。</li>
</ul>
<p><b>还要写两个宏：</b>临界区的进入/退出（Cortex-M 上用 BASEPRI 屏蔽低优先级中断，或 PRIMASK 全关）。</p>
<p><b>裁剪主要靠 FreeRTOSConfig.h 的开关：</b>configUSE_TIMERS 置 0 可以整份去掉 timers.c；configUSE_MUTEXES、configUSE_RECURSIVE_MUTEXES、configUSE_COUNTING_SEMAPHORES 按需关；configUSE_TRACE_FACILITY 关掉省下不少代码；INCLUDE_vTaskDelayUntil、INCLUDE_vTaskDelete 这类按需保留；configUSE_NEWLIB_REENTRANT 一般关掉。</p>`,
        principle: `<p>FreeRTOS 的架构设计就是为了“换核只换 port”。核心代码通过 portmacro.h 里定义的类型和宏与硬件交互（临界区、调度触发、栈类型），所以移植工作量基本集中在几十行的 port.c 上。</p>
<p>裁剪的收益不只是省 Flash：关掉不用的功能还能减少潜在的中断嵌套路径和竞态点。比如不用软件定时器就关掉，能省下定时器服务任务的栈（默认几百字节）。</p>
<p>移植验证要按顺序来：先一个任务闪灯 → 再加延时确认 SysTick 正常 → 加队列/信号量确认临界区正确 → 加中断里调 FromISR 确认优先级配置对 → 最后长时间跑压力测试。跳过前面的步骤直接上完整业务，出问题很难定位。</p>`,
        fig: {
          type: "table",
          title: "移植涉及的文件与作用",
          tag: "rtos-port",
          head: ["文件", "是否要改", "作用"],
          rows: [
            ["tasks.c / list.c / queue.c", "不改", "任务、链表、通信机制核心"],
            ["timers.c / event_groups.c", "按需保留", "软件定时器、事件组"],
            ["stream_buffer.c", "按需保留", "流缓冲与消息缓冲"],
            ["port.c / portmacro.h", "必须改", "上下文切换、临界区、栈初始化"],
            ["heap_1~heap_5.c", "选一个", "内存管理方案"],
            ["FreeRTOSConfig.h", "必须配", "时钟、优先级、堆大小、功能开关"]
          ]
        },
        code: {
          lang: "c",
          title: "FreeRTOSConfig.h",
          src: `#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

/* ---- 时基与调度 ---- */
#define configCPU_CLOCK_HZ                  (72000000UL)
#define configTICK_RATE_HZ                  (1000)      /* 1ms 一个 tick */
#define configUSE_PREEMPTION                1
#define configUSE_TIME_SLICING              1           /* 同优先级轮转 */
#define configMAX_PRIORITIES                (7)         /* 够用即可，越多 RAM 开销越大 */

/* ---- 内存与栈 ---- */
#define configMINIMAL_STACK_SIZE            (128)       /* 单位：字，不是字节 */
#define configTOTAL_HEAP_SIZE               (10 * 1024)
#define configCHECK_FOR_STACK_OVERFLOW      2           /* 量产也建议保留 */

/* ---- 中断优先级：这两个值配错会导致随机死机 ---- */
#define configPRIO_BITS                     4
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY      15
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY 5
#define configKERNEL_INTERRUPT_PRIORITY \\
    (configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))
#define configMAX_SYSCALL_INTERRUPT_PRIORITY \\
    (configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))

/* ---- 功能裁剪：不用就关，省 Flash 和 RAM ---- */
#define configUSE_TIMERS                    1
#define configUSE_MUTEXES                   1
#define configUSE_COUNTING_SEMAPHORES       0
#define configUSE_RECURSIVE_MUTEXES         0
#define configUSE_TASK_NOTIFICATIONS        1
#define configUSE_TRACE_FACILITY            0
#define configUSE_STATS_FORMATTING_FUNCTIONS 0
#define configUSE_IDLE_HOOK                 0
#define configUSE_TICK_HOOK                 0
#define configUSE_NEWLIB_REENTRANT          0

/* ---- 按需保留的 API ---- */
#define INCLUDE_vTaskDelayUntil             1
#define INCLUDE_vTaskDelete                 1
#define INCLUDE_xTaskGetSchedulerState      1
#define INCLUDE_uxTaskGetStackHighWaterMark 1

#define configASSERT(x)  do { if (!(x)) { taskDISABLE_INTERRUPTS(); for (;;) { } } } while (0)

#endif`
        },
        codeNote: "configKERNEL_INTERRUPT_PRIORITY 和 configMAX_SYSCALL_INTERRUPT_PRIORITY 必须按芯片实际的优先级位数换算（这里按 4 位、左移到高 4 位）。写错的表现是中断里调 FromISR 偶发死机，且极难复现。",
        apply: `<p>移植到一颗国产 M0+ 芯片时，官方的 Cortex-M0 port 直接能用，真正的工作量在两处：一是启动文件里要确认 PendSV 和 SVC 的向量指向正确的处理函数；二是 configMAX_SYSCALL_INTERRUPT_PRIORITY 要按 2 位优先级（M0+ 常见只有 4 级）重新算，照抄 M3 的 5 会直接失效。</p>
<p>裁剪上我们的做法是先用全功能配置跑通，再用 map 文件看各模块占用，把确实没用的开关一个个关掉，最后省了约 12KB Flash。但 configCHECK_FOR_STACK_OVERFLOW 和 configASSERT 一直保留，出问题时它们能省下的排查时间远超这点空间。</p>`,
        pitfalls: [
          "<b>直接抄别人工程的 FreeRTOSConfig.h。</b>时钟、优先级位数、堆大小都不一样，抄过来就是随机死机。",
          "<b>混淆栈大小的单位。</b>configMINIMAL_STACK_SIZE 和 xTaskCreate 的栈深度都是“字”，不是字节。",
          "<b>启动文件里没挂上 PendSV/SVC 向量。</b>编译能过，一启动调度器就进 HardFault。",
          "<b>为了省空间关掉断言和栈检查。</b>省几百字节，换来现场基本无法定位的问题。"
        ],
        follow: [
          ["为什么移植时先在 main 里点灯，而不是直接跑业务？", "点灯不依赖任何内核机制，能确认时钟、启动文件、链接脚本都对；先跑业务的话，一旦不工作无法区分是移植问题还是业务问题。"],
          ["CMSIS-RTOS 封装层要不要用？", "好处是换 RTOS 时上层代码不用改；坏处是多一层封装、有些 FreeRTOS 特性用不到，且增加几百字节开销。产品只用一个 RTOS 的话，直接用原生 API 更清爽。"],
          ["heap_1 到 heap_5 怎么选？", "heap_1 只能分配不能释放，最简单最安全，适合任务全在启动时创建的系统；heap_4 支持释放和相邻块合并，最常用；heap_5 支持多块不连续内存，适合有外部 SRAM 的方案。"]
        ]
      }
    ]
  });
})();
