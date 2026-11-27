/* ============================================================
   02 数据结构与算法
   ============================================================ */
(function () {
  "use strict";

  EIK.register("data-structure", {
    chapters: [
      {
        id: "linear",
        title: "线性结构",
        topics: [
          { id: "array-list", title: "数组与链表" },
          { id: "stack-queue", title: "栈与队列" }
        ]
      },
      {
        id: "buffer",
        title: "缓冲与查找",
        topics: [
          { id: "ring", title: "环形缓冲区" },
          { id: "hash", title: "哈希表" }
        ]
      },
      {
        id: "tree",
        title: "树与算法分析",
        topics: [
          { id: "binary-tree", title: "二叉树与遍历" },
          { id: "sort-search", title: "排序、查找与复杂度" }
        ]
      }
    ],

    questions: [
      {
        id: "D-01",
        chapter: "linear",
        topic: "array-list",
        title: "数组和链表有什么区别？在单片机上怎么选？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "内存布局、访问复杂度、插入删除代价，以及在 RAM 受限场景下的实际取舍。",
        q: `<p>面试官：<strong>数组和链表有什么区别？</strong>如果 RAM 只有 20KB，要做 200 条记录的缓存，你会用哪一种？为什么？</p>`,
        exam: `<p>考察对“数据结构服务于场景”的理解。只会背“数组查得快、链表插得快”不够，能说出链表节点额外指针开销、内存碎片、缓存不友好、以及“嵌入式里数组常常更优”才到位。</p>`,
        core: `<p>数组连续存储，按下标 O(1) 访问，插入删除 O(n)、长度固定；链表靠指针串联，已知位置插入删除 O(1)，查找 O(n)，每个节点多一到两个指针。</p><p>20KB RAM 存 200 条记录优先用静态数组 + 定长记录：无指针开销、编译期分配不碎片、顺序访问友好。只有频繁在中间插入删除，才考虑链表或数组加空闲位图。</p>`,
        answer: `<p>数组是一块连续内存，靠下标做随机访问，地址计算是 <code>base + i * size</code>，所以访问是 O(1)；但插入删除要搬移元素，是 O(n)，而且长度固定。</p>
<p>链表靠指针把分散的节点串起来，插入删除只改指针，是 O(1)（前提是已经拿到位置），但访问必须从头遍历，是 O(n)。每个节点还要额外存一个或两个指针。</p>
<p>在 20KB RAM 的板子上做 200 条记录，我会优先用<strong>静态数组 + 定长记录</strong>。原因是：数组没有指针开销，200 条记录省下的指针空间很可观；内存是编译期分配的，不会碎片化；顺序访问对 Cache 和预取友好；而且记录数量本来就有上限，数组完全够用。如果真的需要频繁在中间插入删除，我才会考虑链表，或者用数组 + 空闲位图的方式。</p>`,
        principle: `<p>链表的“插入 O(1)”有个前提：你已经持有插入位置的指针。如果按值查找位置，整体还是 O(n)。这一点在面试里经常被追问。</p>
<p>另一个常被忽略的成本是<strong>内存局部性</strong>。数组的 200 条记录在内存里连续存放，一次读取会把相邻数据带入 Cache 或预取缓冲；链表节点分散在堆上，每次跳转都可能是一次新的内存访问。在带 Cache 的 Cortex-M7/A 系列上，这个差异能达到数倍。</p>`,
        fig: {
          type: "table",
          title: "数组与链表的工程对比",
          tag: "compare",
          head: ["维度", "数组", "链表"],
          rows: [
            ["内存布局", "连续，编译期或运行期一次分配", "分散，节点逐个分配"],
            ["随机访问", "O(1)，地址计算", "O(n)，从头遍历"],
            ["插入 / 删除", "O(n)，需搬移元素", "O(1)，但需先找到位置"],
            ["额外开销", "几乎为零（可能有对齐填充）", "每节点 4/8 字节指针"],
            ["碎片风险", "无", "有，频繁增删时明显"],
            ["适用场景", "数量固定、频繁遍历", "数量变化大、频繁增删"]
          ]
        },
        code: {
          lang: "c",
          title: "record_store.c",
          src: `/* 场景：200 条定长记录，RAM 紧张 */
#define REC_MAX   200

typedef struct {
    uint32_t id;
    uint16_t value;
    uint8_t  valid;
} record_t;

static record_t s_records[REC_MAX];    /* 编译期分配，无碎片 */
static uint16_t s_count;               /* 当前有效记录数 */

/* 尾部追加：O(1)，最常用的操作 */
int record_add(const record_t *r)
{
    if (s_count >= REC_MAX) return -1;
    s_records[s_count++] = *r;
    return 0;
}

/* 按 id 查找：无序时 O(n)，记录少时完全可接受 */
record_t *record_find(uint32_t id)
{
    for (uint16_t i = 0; i < s_count; i++) {
        if (s_records[i].valid && s_records[i].id == id) {
            return &s_records[i];
        }
    }
    return NULL;
}

/* 删除：用尾元素填补空位，O(1)，代价是不再保持原有顺序 */
int record_remove(uint32_t id)
{
    for (uint16_t i = 0; i < s_count; i++) {
        if (s_records[i].id == id) {
            s_records[i] = s_records[--s_count];   /* 尾元素覆盖 */
            return 0;
        }
    }
    return -1;
}`
        },
        codeNote: `<b>取舍：</b>用“尾元素填补”代替顺序搬移，把删除从 O(n) 降到 O(1)，代价是记录顺序被打乱。如果业务需要保持顺序（比如按时间排序输出），就不能这么做。`,
        apply: `<p>嵌入式中数组还有两个变体很常用：<strong>静态数组 + 空闲链表</strong>（数组元素本身当作链表节点，兼顾连续内存和 O(1) 分配）、<strong>索引数组</strong>（存下标而不是指针，省一半空间且可整体 memcpy 保存到 Flash）。</p>
<p>只有在记录数量完全不可预测、且插入删除频繁时，链表才是正确选择；这时建议配合内存池，避免 malloc 带来的碎片。</p>`,
        pitfalls: [
          "<b>认为链表一定比数组“高级”。</b>在 RAM 紧张、遍历为主的场景，数组往往更快更省，链表反而增加开销和碎片风险。",
          "<b>忽略链表节点的指针开销。</b>存 1000 个 <code>uint16_t</code>，数组占 2KB，双向链表可能占 12KB，差距是数量级的。",
          "<b>用链表存小数据。</b>节点开销远大于数据本身，既浪费空间又破坏局部性，属于典型的过度设计。"
        ],
        follow: [
          [
            "如何用数组实现 O(1) 的任意位置删除？",
            "把“数组 + 空闲位图”结合：删除只清标志位，插入时复用空闲槽。代价是遍历时要跳过空洞，且需要一个空闲槽查找策略（如循环游标）。"
          ],
          [
            "什么是内存局部性？对性能影响有多大？",
            "指程序倾向访问刚访问过的地址附近的数据。连续数组能命中 Cache 行和预取，链表每次跳转都可能 miss。在 Cortex-M7 上，随机访问外部 SDRAM 的延迟可能是片内 SRAM 的十几倍。"
          ],
          [
            "跳表和哈希表在嵌入式里用得多吗？",
            "跳表需要多层指针，空间开销大，嵌入式很少用。哈希表在键值查找场景有用（如命令解析、配置项查找），但要注意桶数量和冲突处理，通常用固定桶 + 链地址法，全部静态分配。"
          ]
        ]
      },

      {
        id: "D-02",
        chapter: "linear",
        topic: "array-list",
        title: "如何反转一个单链表？如何找中间节点？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "三指针迭代反转、快慢指针找中点，考察指针操作的严谨性。",
        q: `<p>面试官：写一个函数<strong>反转单链表</strong>，要求原地进行、不额外分配内存。再写一个函数找到链表的<strong>中间节点</strong>，只遍历一次。</p>`,
        exam: `<p>这是指针基本功的试金石。面试官会看你是否处理了空链表和单节点、是否在改指针前保存了 next、是否会出现内存泄漏。快慢指针则考察你能否用“两个不同速度的指针”解决一类问题。</p>`,
        core: `<p>反转用三指针 <code>prev/curr/next</code>：每轮先存 <code>next = curr-&gt;next</code>，再让 <code>curr-&gt;next = prev</code>，然后整体前移，结束时 <code>prev</code> 就是新头。必须“先存后改”，否则链断。</p><p>找中间用快慢指针：慢走 1 步、快走 2 步，<code>fast</code> 或 <code>fast-&gt;next</code> 为空时 <code>slow</code> 在中间；偶数个节点会停在后半段第一个，这个口径要先和面试官确认。</p>`,
        answer: `<p>反转的核心是三个指针：prev 指向已反转部分的头，curr 指向当前节点，next 暂存下一个节点。每一轮先把 <code>next = curr-&gt;next</code> 存下来，再让 <code>curr-&gt;next = prev</code>，然后 prev 和 curr 各前进一步。循环结束时 prev 就是新的头。</p>
<p>关键点是<strong>必须先保存 next 再改 curr-&gt;next</strong>，否则链表就断了，后面的节点全部丢失。</p>
<p>找中间节点用快慢指针：slow 每次走一步，fast 每次走两步。当 fast 走到末尾或 fast-&gt;next 为空时，slow 正好在中间。节点数为偶数时，slow 停在后半段的第一个节点，这个细节要跟面试官确认。</p>`,
        principle: `<p>链表反转本质上是把每个节点的 next 指针方向掉转。因为单链表只能单向遍历，一旦修改了当前节点的 next，就失去了通往后续节点的路径，所以必须用额外变量暂存。三个指针的滚动就是“保存—反转—前进”的循环不变式。</p>
<p>快慢指针的正确性来自速度差：fast 的速度是 slow 的两倍，所以 fast 走完 n 步时 slow 走了 n/2 步。这个技巧还能用于判断链表是否有环（快慢指针相遇则有环）、找倒数第 k 个节点（先让 fast 走 k 步）。</p>`,
        code: {
          lang: "c",
          title: "list_reverse.c",
          src: `#include <stddef.h>

typedef struct node {
    int           data;
    struct node  *next;
} node_t;

/* 原地反转：时间 O(n)，空间 O(1) */
node_t *list_reverse(node_t *head)
{
    node_t *prev = NULL;
    node_t *curr = head;

    while (curr != NULL) {
        node_t *next = curr->next;   /* 1. 先保存后继，否则断链 */
        curr->next = prev;           /* 2. 反转当前节点的指向 */
        prev = curr;                 /* 3. prev 前移 */
        curr = next;                 /* 4. curr 前移 */
    }
    return prev;                     /* 原尾节点成为新头 */
}

/* 快慢指针找中点：只遍历一次 */
node_t *list_middle(node_t *head)
{
    node_t *slow = head;
    node_t *fast = head;

    /* fast 每次走两步，slow 走一步 */
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;    /* 偶数个节点时返回后半段的第一个 */
}

/* 附加：判断是否有环（Floyd 判圈算法） */
int list_has_cycle(node_t *head)
{
    node_t *slow = head, *fast = head;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return 1;   /* 相遇即有环 */
    }
    return 0;
}`
        },
        codeNote: `<b>边界：</b>空链表时 <code>head == NULL</code>，while 不执行，返回 NULL，正确；单节点时循环一次，<code>curr-&gt;next</code> 置 NULL，返回该节点，也正确。这两点面试时要主动说明。`,
        apply: `<p>工程里链表反转本身用得不多，但它背后的“指针滚动”模式很常用：比如把单向链表改造成栈（头插法）、把接收队列逆序处理、或者在遍历中安全删除节点（保存 next 再 free）。</p>
<p>快慢指针在协议解析里也有应用：比如在不定长帧中找帧尾、在日志缓冲区里定位第 N 条记录。</p>`,
        pitfalls: [
          "<b>先改 next 再保存。</b>一旦 <code>curr-&gt;next = prev</code> 执行，后续节点就找不到了，程序会丢掉半条链表。",
          "<b>忘记处理空链表。</b>直接解引用 <code>head-&gt;next</code> 会 HardFault。所有链表函数第一行都应该判空。",
          "<b>快慢指针循环条件写错。</b>只判断 <code>fast != NULL</code> 而没判断 <code>fast-&gt;next</code>，奇数节点时 fast 会停在尾节点，接着在 <code>fast-&gt;next-&gt;next</code> 处解引用空指针（偶数节点反而安全，fast 直接落到 NULL 退出）。"
        ],
        follow: [
          [
            "递归反转怎么写？有什么问题？",
            "递归到最后一个节点作为新头，回溯时让 <code>head-&gt;next-&gt;next = head</code>、<code>head-&gt;next = NULL</code>。问题是递归深度等于链表长度，长链表会耗尽任务栈，嵌入式里不推荐。"
          ],
          [
            "如何找倒数第 k 个节点？",
            "先让 fast 走 k 步，然后 fast 和 slow 同步前进，fast 到尾时 slow 就是倒数第 k 个。全程只遍历一次，注意 k 大于链表长度时要返回 NULL。"
          ],
          [
            "如何判断两个链表是否相交？",
            "先分别求长度，让长的先走长度差步，然后同步前进，第一个相同节点就是交点。也可以用“尾节点相同则有交点”先做快速判断。"
          ]
        ]
      },

      {
        id: "D-03",
        chapter: "linear",
        topic: "stack-queue",
        title: "栈和队列有什么区别？在中断和任务通信中怎么用？",
        diff: "初级",
        freq: "高频",
        type: "基础概念题",
        point: "LIFO 与 FIFO 的语义差异，以及它们在函数调用、中断缓冲、任务通信中的角色。",
        q: `<p>面试官：<strong>栈和队列有什么区别？</strong>举几个嵌入式里的实际例子。为什么串口接收通常用队列而不是栈？</p>`,
        exam: `<p>考察抽象数据类型与实际场景的对应关系。能说出“栈对应函数调用和回溯，队列对应顺序处理和解耦”，并且知道中断与任务之间必须用 FIFO 保证顺序，就说明理解到位了。</p>`,
        core: `<p>栈是 LIFO，只在同一端进出；队列是 FIFO，一端进、另一端出。</p><p>栈用于函数调用、中断嵌套现场、表达式求值和撤销操作；队列用于解耦生产者和消费者：串口中断把字节入队，任务出队处理。串口必须用队列，用栈会让字节倒序，协议直接解析错。</p>`,
        answer: `<p>栈是后进先出（LIFO），只在同一端插入和删除；队列是先进先出（FIFO），一端进、另一端出。</p>
<p>嵌入式中栈无处不在：函数调用时的返回地址和局部变量、中断嵌套时的现场保护、表达式求值和括号匹配、以及“撤销”类操作。Cortex-M 的栈还是“满递减”的，MSP 和 PSP 都是硬件栈指针。</p>
<p>队列主要用于解耦生产者和消费者：串口接收中断把字节放进队列，主循环或任务从队列取出处理；按键中断产生事件，任务按顺序消费。RTOS 的消息队列也是这个模型。</p>
<p>串口接收必须用队列，因为数据是<strong>有序字节流</strong>，顺序错了协议就解析错了。用栈会导致字节倒序，完全没法用。</p>`,
        principle: `<p>两者都可以用数组或链表实现。数组实现的栈只需要一个栈顶指针；数组实现的队列如果直接平移会浪费空间，所以要用<strong>循环队列</strong>，用两个下标和取模运算复用空间。</p>
<p>在中断与任务之间传递数据时，队列还隐含了“缓冲”的作用：中断来得快、任务处理得慢，队列把两者解耦，避免丢数据。但队列长度必须按最坏情况估算，否则仍会溢出。</p>`,
        fig: {
          type: "table",
          title: "栈与队列的对比",
          tag: "compare",
          head: ["维度", "栈 Stack", "队列 Queue"],
          rows: [
            ["访问顺序", "LIFO，后进先出", "FIFO，先进先出"],
            ["操作位置", "只在栈顶插入/删除", "队尾入、队头出"],
            ["典型实现", "数组 + 栈顶指针", "循环队列 / 链表"],
            ["嵌入式实例", "函数调用、中断嵌套、表达式求值", "串口接收、事件队列、消息队列"],
            ["常见问题", "栈溢出", "队列满、覆盖旧数据"]
          ]
        },
        code: {
          lang: "c",
          title: "stack_queue.c",
          src: `#define STACK_SIZE 64

/* 数组实现的栈：只需一个栈顶下标 */
typedef struct {
    uint8_t buf[STACK_SIZE];
    int     top;                 /* 指向下一个空位 */
} stack_t;

static inline int stack_push(stack_t *s, uint8_t v)
{
    if (s->top >= STACK_SIZE) return -1;   /* 栈满 */
    s->buf[s->top++] = v;
    return 0;
}

static inline int stack_pop(stack_t *s, uint8_t *v)
{
    if (s->top <= 0) return -1;            /* 栈空 */
    *v = s->buf[--s->top];
    return 0;
}

/* 循环队列：head 出队，tail 入队，用取模复用空间 */
#define QUEUE_SIZE 128
typedef struct {
    uint8_t buf[QUEUE_SIZE];
    volatile uint16_t head;
    volatile uint16_t tail;
} queue_t;

/* 单生产者（中断）单消费者（任务）场景：留一个空位区分满和空 */
static inline int queue_put(queue_t *q, uint8_t v)
{
    uint16_t next = (uint16_t)((q->tail + 1) % QUEUE_SIZE);
    if (next == q->head) return -1;        /* 队列满 */
    q->buf[q->tail] = v;
    q->tail = next;
    return 0;
}

static inline int queue_get(queue_t *q, uint8_t *v)
{
    if (q->head == q->tail) return -1;     /* 队列空 */
    *v = q->buf[q->head];
    q->head = (uint16_t)((q->head + 1) % QUEUE_SIZE);
    return 0;
}`
        },
        apply: `<p>实际项目里，串口接收中断只做“把字节塞进队列”，解析放到任务里；这样中断执行时间恒定在几十个周期，不会因为解析耗时导致丢包。队列长度按“最大突发数据量 ÷ 处理速度”估算，并留 30% 余量。</p>
<p>RTOS 的 <code>xQueueSendFromISR</code> 本质上就是这个模型，只是多了阻塞和唤醒机制。</p>`,
        pitfalls: [
          "<b>队列满时静默丢弃数据。</b>至少应该置一个溢出标志，否则上层永远不知道丢了包，现象是“偶尔解析错一条”。",
          "<b>在中断里用非原子的 head/tail 更新。</b>8 位机上 16 位变量的读写可能被打断，导致索引错乱。要么保证单生产者单消费者，要么进临界区。",
          "<b>把大结构体直接放进队列。</b>队列按值拷贝，一条 256 字节的消息会瞬间吃掉大半 RAM，应该传指针或索引。"
        ],
        follow: [
          [
            "如何区分循环队列的空和满？",
            "三种方法：留一个空位（head == tail 为空，tail+1 == head 为满）；额外维护 count 变量；使用镜像下标或位宽多一位的索引。留空位法最简单，但浪费一个元素空间。"
          ],
          [
            "栈溢出会怎样？如何预防？",
            "覆盖相邻内存，可能改写全局变量或返回地址导致跑飞。预防：估算最坏栈深、避免大局部数组、用栈填充法测量峰值、开启 RTOS 的栈溢出检测、必要时用 MPU 保护栈底。"
          ],
          [
            "优先队列在嵌入式里怎么实现？",
            "常用二叉堆（数组实现，插入删除 O(log n)），或者按优先级分多个 FIFO 队列，高优先级队列非空就先处理。后者实现简单、O(1)，在 RTOS 中就绪表就是这么做的。"
          ]
        ]
      },

      {
        id: "D-04",
        chapter: "buffer",
        topic: "ring",
        title: "环形缓冲区怎么实现？为什么串口接收都用它？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "读写指针、满/空判定、无锁单生产者单消费者模型，是通信缓冲的标准答案。",
        q: `<p>面试官：<strong>环形缓冲区（ring buffer）</strong>的原理是什么？怎么判断空和满？在串口收发里怎么用？如果中断和任务同时访问，需要加锁吗？</p>`,
        exam: `<p>这是嵌入式最高频的工程实现题之一。会写基本读写只是及格；能讲清“留一个空位区分满空”“单生产者单消费者可以无锁”“内存屏障与 volatile 的配合”，才是真正写过稳定通信代码的人。</p>`,
        core: `<p>固定数组加两个下标：写入放 <code>tail</code> 后加一取模，读出取 <code>head</code> 后加一取模。判空 <code>head==tail</code>，判满留一个空位 <code>(tail+1)%size==head</code>，也可用 <code>count</code>。</p><p>串口用它因为保序、容量固定、读写 O(1)、中断里耗时恒定。单生产者单消费者时写者只改 <code>tail</code>、读者只改 <code>head</code>，可以无锁，但变量要 <code>volatile</code>，必要时加编译屏障。</p>`,
        answer: `<p>环形缓冲区就是一块固定大小的数组加两个下标：head 指向读位置，tail 指向写位置。写入时把数据放在 tail，然后 tail 加一并取模；读出时从 head 取，head 加一取模。下标走到末尾自动回到 0，形成“环”。</p>
<p>判空是 <code>head == tail</code>；判满最常用的方法是<strong>留一个空位</strong>，即 <code>(tail + 1) % size == head</code>。也可以用额外的 count 变量，或者让下标多一位、用差值判断。</p>
<p>串口接收用它是因为：数据是字节流，必须保序；缓冲区大小固定，不需要动态分配；读写都是 O(1)，中断里执行时间恒定；而且天然支持“边收边处理”。</p>
<p>如果是<strong>单生产者单消费者</strong>（只有串口中断写、只有任务读），并且 head/tail 是自然对齐的单字，那么可以无锁：写者只改 tail，读者只改 head，互不干扰。但变量要加 volatile，必要时加编译屏障，防止编译器重排。</p>`,
        principle: `<p>环形缓冲区的关键设计是“用空间换判定简化”。如果不留空位，满和空都表现为 head == tail，无法区分，只能额外维护计数或状态标志。留一个空位后，两者天然可分，代价是浪费一个元素。</p>
<p>无锁的前提比想象中严格：只有一个写者、一个读者；读写指针的更新是原子的（单字对齐）；数据写入必须在更新 tail 之前完成（否则读者可能读到未写完的数据）。编译器可能重排这两步，所以需要 <code>__DMB()</code> 或 <code>atomic_signal_fence</code> 之类的屏障。</p>`,
        fig: {
          type: "flow",
          title: "串口中断 + 环形缓冲 + 任务解析",
          tag: "data flow",
          items: [
            { t: "字节到达", d: "RXNE 中断" },
            { t: "写入 ring", d: "tail++" },
            { t: "通知任务", d: "信号量/标志" },
            { t: "任务读出", d: "head++" },
            { t: "协议解析", d: "状态机" }
          ]
        },
        code: {
          lang: "c",
          title: "ringbuf.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define RB_SIZE 256                 /* 必须是 2 的幂，便于用掩码取模 */

typedef struct {
    uint8_t           buf[RB_SIZE];
    volatile uint16_t head;         /* 读下标，仅消费者修改 */
    volatile uint16_t tail;         /* 写下标，仅生产者修改 */
} ringbuf_t;

static inline bool rb_is_empty(const ringbuf_t *rb)
{
    return rb->head == rb->tail;
}

static inline bool rb_is_full(const ringbuf_t *rb)
{
    return (uint16_t)((rb->tail + 1) & (RB_SIZE - 1)) == rb->head;
}

/* 生产者：中断里调用，只改 tail */
static inline bool rb_put(ringbuf_t *rb, uint8_t byte)
{
    uint16_t next = (uint16_t)((rb->tail + 1) & (RB_SIZE - 1));
    if (next == rb->head) {
        return false;               /* 满：丢弃或置溢出标志 */
    }
    rb->buf[rb->tail] = byte;       /* 先写数据 */
    __DMB();                        /* 保证数据先于下标可见 */
    rb->tail = next;                /* 再更新下标 */
    return true;
}

/* 消费者：任务里调用，只改 head */
static inline bool rb_get(ringbuf_t *rb, uint8_t *byte)
{
    if (rb->head == rb->tail) return false;
    *byte = rb->buf[rb->head];
    __DMB();
    rb->head = (uint16_t)((rb->head + 1) & (RB_SIZE - 1));
    return true;
}

/* 批量读：减少循环开销，适合一次取一帧 */
uint16_t rb_read(ringbuf_t *rb, uint8_t *dst, uint16_t max)
{
    uint16_t n = 0;
    while (n < max && rb_get(rb, &dst[n])) n++;
    return n;
}`
        },
        codeNote: `<b>为什么用掩码而不是取模：</b>当 size 是 2 的幂时，<code>x &amp; (size-1)</code> 等价于 <code>x % size</code>，但不需要除法指令，在 Cortex-M0 这种没有硬件除法的内核上差别很明显。`,
        apply: `<p>工程上有几个细节值得注意：一是缓冲区大小取 2 的幂，方便掩码运算；二是把溢出次数记下来，作为通信质量的观测指标；三是接收和发送各用一个 ring，避免互相阻塞；四是 DMA 循环模式下可以直接用“DMA 当前剩余计数”反推写位置，省掉中断。</p>
<p>如果数据量大，还可以用双缓冲（ping-pong）：DMA 填满一半时切换，另一半交给处理，做到零拷贝。</p>`,
        pitfalls: [
          "<b>用取模却忘了处理负数或溢出。</b>下标是 <code>uint16_t</code> 时 <code>(head - 1) % size</code> 会下溢成巨大值。统一用无符号并配合掩码最安全。",
          "<b>先更新下标再写数据。</b>消费者可能立刻读到还没写入的旧数据，出现“偶发数据错位”。顺序必须是先数据后下标。",
          "<b>以为加了 volatile 就无锁安全。</b>volatile 只保证不缓存，多核或乱序执行时还需要内存屏障；多生产者场景必须加锁。"
        ],
        follow: [
          [
            "为什么缓冲区大小建议取 2 的幂？",
            "可以用位与代替取模，省掉除法指令；同时索引回绕的语义更清晰。代价是空间必须按 2 的幂取整，小容量时可能浪费一些 RAM。"
          ],
          [
            "多生产者或多消费者怎么办？",
            "单生产者单消费者才能无锁。多生产者需要用临界区保护 tail 更新，或用原子 CAS 抢位置；多消费者同理。也可以改用 RTOS 的队列，由内核保证互斥。"
          ],
          [
            "DMA 循环模式怎么和 ring buffer 配合？",
            "DMA 配置为循环模式，缓冲区大小等于 ring 容量。通过读取 DMA 的剩余传输计数（NDTR）反推当前写位置，与上次位置比较得到新数据区间，避免每个字节都进中断。"
          ]
        ]
      },

      {
        id: "D-05",
        chapter: "buffer",
        topic: "hash",
        title: "哈希表的原理是什么？在单片机上怎么实现？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "哈希函数、冲突处理、负载因子，以及固定桶 + 链地址法的静态实现。",
        q: `<p>面试官：<strong>哈希表的原理是什么？</strong>如何处理冲突？如果让你在只有 8KB RAM 的单片机上实现一个键值查找表，你会怎么设计？</p>`,
        exam: `<p>考察对“用空间换时间”的理解，以及在资源受限环境下做工程取舍的能力。能说出“桶数量取质数或 2 的幂”“链地址法比开放寻址更适合嵌入式”“避免动态分配”，说明你不是只会背概念。</p>`,
        core: `<p>哈希函数把键映射到桶下标，查找接近 O(1)；冲突用链地址法或开放寻址法处理。</p><p>8KB RAM 用固定桶数组 + 链地址法：桶数取 2 的幂（32 或 64），节点来自预分配静态池、不 <code>malloc</code>；哈希用移位异或或 FNV-1a，避免除法。桶 32、节点不超过 24 时平均链长小于 1。</p>`,
        answer: `<p>哈希表通过哈希函数把键映射到数组下标，从而把查找从 O(n) 降到接近 O(1)。理想情况下每个键落在不同的桶里，直接定位；实际会有冲突，需要冲突处理策略。</p>
<p>常见两种：<strong>链地址法</strong>是每个桶挂一个链表，冲突就挂上去；<strong>开放寻址法</strong>是冲突后按某种规则找下一个空桶，比如线性探测。</p>
<p>在 8KB RAM 的板子上，我会用固定桶数组 + 链地址法：桶数量取 2 的幂（比如 32 或 64），每个节点静态分配在一个预分配的节点池里，不用 malloc。哈希函数用简单的移位异或或 FNV-1a，避免除法。</p>
<p>关键是控制负载因子。桶数 32、节点数不超过 24，平均链长小于 1，查找基本一次命中。如果键是固定长度的字符串且数量很少，其实直接用线性查找 + 有序表可能更划算，要按实际数据量算。</p>`,
        principle: `<p>哈希表的时间复杂度取决于冲突程度。哈希函数分布均匀、负载因子低时接近 O(1)；最坏情况（所有键冲突）退化为 O(n)。所以桶数量要按预期元素数估算，通常让负载因子保持在 0.5~0.75。</p>
<p>桶数量取质数可以让哈希值分布更均匀（尤其是用取模时）；取 2 的幂则可以用位与代替取模，但要求哈希函数低位足够随机，否则容易聚集。</p>`,
        code: {
          lang: "c",
          title: "hash_table.c",
          src: `#include <string.h>
#include <stdint.h>

#define HASH_BUCKETS  32
#define HASH_MAX_KEYS 24

typedef struct kv_node {
    const char       *key;
    int               value;
    struct kv_node   *next;
} kv_node_t;

static kv_node_t s_pool[HASH_MAX_KEYS];   /* 静态节点池，无碎片 */
static uint8_t   s_pool_used[HASH_MAX_KEYS];
static kv_node_t *s_buckets[HASH_BUCKETS];

/* FNV-1a：实现简单，分布尚可，无除法 */
static uint32_t hash_str(const char *s)
{
    uint32_t h = 2166136261u;
    while (*s) {
        h ^= (uint8_t)*s++;
        h *= 16777619u;
    }
    return h;
}

static kv_node_t *node_alloc(void)
{
    for (int i = 0; i < HASH_MAX_KEYS; i++) {
        if (!s_pool_used[i]) { s_pool_used[i] = 1; return &s_pool[i]; }
    }
    return NULL;
}

int hash_put(const char *key, int value)
{
    uint32_t idx = hash_str(key) & (HASH_BUCKETS - 1);
    kv_node_t *p = s_buckets[idx];

    while (p) {                            /* 已存在则更新 */
        if (strcmp(p->key, key) == 0) { p->value = value; return 0; }
        p = p->next;
    }

    kv_node_t *n = node_alloc();
    if (!n) return -1;                     /* 池满 */
    n->key   = key;
    n->value = value;
    n->next  = s_buckets[idx];             /* 头插，O(1) */
    s_buckets[idx] = n;
    return 0;
}

int hash_get(const char *key, int *out)
{
    uint32_t idx = hash_str(key) & (HASH_BUCKETS - 1);
    for (kv_node_t *p = s_buckets[idx]; p; p = p->next) {
        if (strcmp(p->key, key) == 0) { *out = p->value; return 0; }
    }
    return -1;
}`
        },
        apply: `<p>嵌入式中哈希表最适合“配置项查找”“命令字符串分发”“协议字段映射”这类键集合固定、查询频繁的场景。如果键是连续的小整数（比如 0~15 的命令码），直接用数组下标查表更快，连哈希都省了。</p>
<p>如果键集合在编译期就确定，还可以用“完美哈希”或直接生成 switch，查找成本是 O(1) 且没有内存开销。</p>`,
        pitfalls: [
          "<b>桶数量和元素数量不匹配。</b>32 个桶放 200 个键，平均链长 6，查找退化成链表遍历，还不如有序数组二分。",
          "<b>用动态分配建表。</b>初始化时 malloc 一堆节点，运行中再增删，很容易碎片化。固定池 + 位图更稳。",
          "<b>哈希函数用字符串长度或首字符。</b>分布极不均匀，所有键挤在一两个桶里，性能崩塌。"
        ],
        follow: [
          [
            "开放寻址法和链地址法怎么选？",
            "链地址法实现简单、删除方便、负载因子可以超过 1，但需要额外指针；开放寻址法没有指针开销、缓存友好，但删除要用墓碑标记，负载因子高时性能急剧下降。嵌入式更常用链地址法。"
          ],
          [
            "哈希表能保证 O(1) 吗？",
            "平均情况接近 O(1)，最坏情况是 O(n)。如果对最坏延迟有要求（比如硬实时），要么限制元素数量并做最坏情况分析，要么改用确定性结构（如有序表 + 二分）。"
          ],
          [
            "如何设计一个适合嵌入式的哈希函数？",
            "优先选无除法、无浮点的算法（FNV-1a、DJB2、CRC 截断）；键是小整数时可以直接用乘法散列；避免依赖字符串长度分布。设计后用实际数据集统计桶的分布情况验证。"
          ]
        ]
      },

      {
        id: "D-06",
        chapter: "tree",
        topic: "binary-tree",
        title: "二叉树的三种遍历怎么写？非递归怎么实现？",
        diff: "中级",
        freq: "中频",
        type: "代码分析题",
        point: "前中后序的递归与非递归实现，以及用显式栈替代递归的原因。",
        q: `<p>面试官：写出二叉树的<strong>前序、中序、后序遍历</strong>。如果不能用递归，怎么实现？为什么嵌入式里要慎用递归？</p>`,
        exam: `<p>递归写法人人会背，非递归才见功底。更重要的是最后那个问题：嵌入式栈很小，递归深度不可控，这是真实的工程约束。能说出“用显式栈或 Morris 遍历”，说明你有资源意识。</p>`,
        core: `<p>前序根左右、中序左根右、后序左右根，递归只在访问根的位置不同。</p><p>非递归用显式栈：前序压栈后先右后左；中序一路压左孩子，弹出访问再转右子树；后序要记录上一个访问节点，或按“根右左”遍历后整体反转。嵌入式慎用递归，栈只有 1~4KB，树退化成链时深度等于节点数。</p>`,
        answer: `<p>前序是“根—左—右”，中序是“左—根—右”，后序是“左—右—根”。递归写法就是在相应位置访问根节点，代码几乎一样。</p>
<p>非递归用显式栈模拟函数调用：前序是压栈后先右后左；中序是一路压左孩子直到空，然后弹出访问、转向右子树；后序最麻烦，需要记录上一个访问的节点，或者用“根—右—左”再整体反转。</p>
<p>嵌入式里慎用递归的原因是栈空间固定且很小（通常 1~4KB），递归深度由数据决定，无法在编译期确定。一棵退化成链表的树，深度等于节点数，几百层就爆栈了。而且递归的函数调用开销也更大。</p>`,
        principle: `<p>递归的本质是编译器帮你维护一个调用栈，每次调用保存返回地址、参数和局部变量。非递归就是把这个隐式栈换成显式的数组栈，自己管理入栈出栈。</p>
<p>中序遍历的非递归写法有一个重要的应用：<strong>二叉搜索树的中序遍历是有序序列</strong>，所以“找第 k 小元素”“范围查询”都可以用中序迭代器实现，不需要一次性展开整棵树。</p>`,
        code: {
          lang: "c",
          title: "tree_traverse.c",
          src: `#include <stddef.h>

typedef struct tnode {
    int           val;
    struct tnode *left;
    struct tnode *right;
} tnode_t;

#define MAX_DEPTH 32

/* ---------- 递归版：简洁但有栈深风险 ---------- */
void preorder(tnode_t *root, void (*visit)(tnode_t *))
{
    if (!root) return;
    visit(root);
    preorder(root->left, visit);
    preorder(root->right, visit);
}

/* ---------- 非递归前序：根 → 左 → 右 ---------- */
void preorder_iter(tnode_t *root, void (*visit)(tnode_t *))
{
    tnode_t *stk[MAX_DEPTH];
    int top = 0;
    if (root) stk[top++] = root;

    while (top > 0) {
        tnode_t *n = stk[--top];
        visit(n);
        if (n->right) stk[top++] = n->right;   /* 先压右，后出栈 */
        if (n->left)  stk[top++] = n->left;
    }
}

/* ---------- 非递归中序：左 → 根 → 右 ---------- */
void inorder_iter(tnode_t *root, void (*visit)(tnode_t *))
{
    tnode_t *stk[MAX_DEPTH];
    int top = 0;
    tnode_t *cur = root;

    while (cur || top > 0) {
        while (cur) {                 /* 一路压左孩子 */
            stk[top++] = cur;
            cur = cur->left;
        }
        cur = stk[--top];             /* 弹出并访问 */
        visit(cur);
        cur = cur->right;             /* 转向右子树 */
    }
}

/* ---------- 非递归后序：记录上一个访问的节点 ---------- */
void postorder_iter(tnode_t *root, void (*visit)(tnode_t *))
{
    tnode_t *stk[MAX_DEPTH];
    int top = 0;
    tnode_t *cur = root, *last = NULL;

    while (cur || top > 0) {
        while (cur) { stk[top++] = cur; cur = cur->left; }

        tnode_t *peek = stk[top - 1];
        if (peek->right && peek->right != last) {
            cur = peek->right;        /* 右子树还没访问 */
        } else {
            visit(peek);              /* 左右都访问完，处理根 */
            last = stk[--top];
        }
    }
}`
        },
        codeNote: `<b>栈深上限：</b>示例用固定数组当栈，深度上限 32。工程上要么根据树高确定上限并断言，要么用动态栈（不推荐），要么改用 Morris 遍历（O(1) 空间，但会临时修改树结构）。`,
        apply: `<p>二叉树在嵌入式里最常见的落地是<strong>决策树/状态分类</strong>（如按键长短按判定、传感器故障分级）和<strong>表达式解析</strong>（计算器、规则引擎）。</p>
<p>如果只是存有序数据，用有序数组 + 二分往往比二叉搜索树更省内存、更快，因为不需要指针、局部性好。树结构的优势在于频繁插入删除。</p>`,
        pitfalls: [
          "<b>递归遍历大树。</b>深度不可控，几百个节点就可能爆栈，且崩溃位置随机、难以复现。",
          "<b>后序非递归忘记 last 指针。</b>会重复访问右子树，或者死循环，是手写非递归最容易出错的地方。",
          "<b>栈数组没有越界检查。</b>树退化成链时深度超限，直接踩坏相邻内存。"
        ],
        follow: [
          [
            "什么是 Morris 遍历？",
            "利用叶子节点的空 right 指针临时指向中序后继，从而在 O(1) 额外空间下完成遍历，遍历后恢复原结构。优点是省空间，缺点是会修改树、并发不安全、代码复杂。"
          ],
          [
            "如何求二叉树的高度？",
            "递归求左右子树高度的较大值加一。非递归可以用层序遍历，每处理一层高度加一。注意空树高度定义为 0 还是 -1 要与调用方约定一致。"
          ],
          [
            "二叉搜索树的查找复杂度是多少？",
            "平均 O(log n)，但最坏 O(n)（插入有序数据时退化成链表）。解决办法是平衡树（AVL、红黑树），代价是插入删除时的旋转开销。嵌入式里如果数据静态，直接用有序数组更划算。"
          ]
        ]
      },

      {
        id: "D-07",
        chapter: "tree",
        topic: "sort-search",
        title: "时间复杂度怎么分析？MCU 上如何选择排序算法？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "复杂度分析方法、常见排序的稳定性与开销，以及在 MCU 上的实际取舍。",
        q: `<p>面试官：<strong>时间复杂度</strong>是怎么分析的？常见排序算法的时间、空间复杂度和稳定性分别是什么？在单片机上给 100 个采样值排序，你会选哪个？</p>`,
        exam: `<p>考察基础算法素养和工程判断。能说出“100 个元素时插入排序往往比快排更快（常数因子小、无递归）”，说明你不是唯复杂度论，而是会考虑实际执行环境。</p>`,
        core: `<p>大 O 估基本操作随 n 的增长趋势：数循环嵌套层数、看每层执行次数，忽略常数和低阶项。</p><p>100 个采样值选插入排序：约 4950 次比较在 72MHz 上是微秒级，原地、无递归、对近有序数据接近 O(n)。数据到几千再考虑快排或堆排。</p>`,
        answer: `<p>时间复杂度是估算基本操作次数随规模 n 增长的趋势，用大 O 表示上界。分析方法是数循环嵌套层数、看每层执行的次数，忽略常数和低阶项。比如双重循环各 n 次就是 O(n²)，每次折半就是 O(log n)。</p>
<p>常见排序：冒泡、插入、选择都是 O(n²)；快速排序平均 O(n log n)、最坏 O(n²)；归并排序稳定 O(n log n) 但需要额外空间；堆排序 O(n log n) 且原地。稳定排序有插入、冒泡、归并。</p>
<p>给 100 个采样值排序，我会选<strong>插入排序</strong>。原因：数据量小，O(n²) 的最坏约 4950 次比较（n(n−1)/2）在 72MHz 的 MCU 上是微秒级；它原地排序不需要额外内存；没有递归不会爆栈；对近乎有序的数据（采样值通常变化平缓）接近 O(n)。如果数据量到几千，才考虑快排或堆排。</p>`,
        principle: `<p>复杂度的“常数因子”在嵌入式里权重很高。快排每次递归都要压栈、函数调用开销大，还有最坏情况退化风险；插入排序虽然理论复杂度差，但内层循环就是简单的比较和搬移，编译器还能很好地优化，实际跑起来往往更快。</p>
<p>另一个常被忽略的是<strong>数据规模的可预测性</strong>。MCU 上缓冲区大小通常是固定的几十到几百，复杂度差异被常数因子淹没，此时应该优先选代码简单、无动态分配、行为确定的算法。</p>`,
        fig: {
          type: "table",
          title: "常见排序算法对比",
          tag: "algorithm",
          head: ["算法", "平均", "最坏", "空间", "稳定", "适用场景"],
          rows: [
            ["插入排序", "O(n²)", "O(n²)", "O(1)", "是", "小规模、近乎有序"],
            ["冒泡排序", "O(n²)", "O(n²)", "O(1)", "是", "教学、极小规模"],
            ["选择排序", "O(n²)", "O(n²)", "O(1)", "否", "交换代价高的场景"],
            ["快速排序", "O(n log n)", "O(n²)", "O(log n)", "否", "较大规模、内存充足"],
            ["归并排序", "O(n log n)", "O(n log n)", "O(n)", "是", "需要稳定、可接受额外内存"],
            ["堆排序", "O(n log n)", "O(n log n)", "O(1)", "否", "有最坏延迟要求"]
          ]
        },
        code: {
          lang: "c",
          title: "sort_mcu.c",
          src: `#include <stdint.h>

/* 插入排序：小规模数据的最优解，原地、稳定、无递归 */
void insertion_sort(uint16_t *a, uint16_t n)
{
    for (uint16_t i = 1; i < n; i++) {
        uint16_t key = a[i];
        int16_t  j   = (int16_t)(i - 1);

        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];        /* 比 key 大的元素后移 */
            j--;
        }
        a[j + 1] = key;             /* 插入到正确位置 */
    }
}

/* 求中位数：不需要全排序，用“快速选择”平均 O(n) */
uint16_t quick_select(uint16_t *a, uint16_t n, uint16_t k)
{
    uint16_t lo = 0, hi = (uint16_t)(n - 1);

    while (lo < hi) {
        uint16_t pivot = a[(uint16_t)((lo + hi) / 2)];
        uint16_t i = lo, j = hi;

        while (i <= j) {
            while (a[i] < pivot) i++;
            while (a[j] > pivot) j--;
            if (i <= j) {
                uint16_t t = a[i]; a[i] = a[j]; a[j] = t;
                i++; if (j > 0) j--;
            }
        }
        if (k <= j) hi = j;
        else if (k >= i) lo = i;
        else break;
    }
    return a[k];
}`
        },
        codeNote: `<b>注意：</b><code>j</code> 用有符号类型并在 <code>j &gt;= 0</code> 时判断，是因为无符号变量减到 0 再减一会回绕成 65535，导致越界。这是 C 语言里非常经典的坑。`,
        apply: `<p>实际工程中，排序往往不是目的。求中位数做滤波，用快速选择（O(n)）比全排序更划算；求最大值最小值只需一次遍历；判断数据是否已排序可以提前退出。</p>
<p>如果采样值范围有限（比如 12 位 ADC 只有 4096 个可能值），用<strong>计数排序</strong>可以做到 O(n + k)，而且天然稳定，代码也简单。</p>`,
        pitfalls: [
          "<b>唯复杂度论。</b>n=20 时冒泡可能比快排快，因为快排的递归和函数调用开销占主导。",
          "<b>忽略递归的栈开销。</b>快排在有序数据上退化成 O(n²) 且递归深度 O(n)，小栈 MCU 上直接爆栈。",
          "<b>用无符号下标做递减循环。</b><code>for (uint8_t i = n-1; i &gt;= 0; i--)</code> 是死循环，必须用有符号类型或换写法。"
        ],
        follow: [
          [
            "快速排序最坏情况什么时候发生？如何避免？",
            "数据已经有序或逆序，且固定取第一个元素做基准时，每次划分极不均衡，退化为 O(n²)。避免方法：随机选基准、三数取中、或改用 introsort（快排 + 堆排兜底）。"
          ],
          [
            "什么是稳定性？为什么重要？",
            "相等元素的相对顺序在排序后保持不变。多关键字排序时很重要，比如先按时间排、再按优先级排，稳定排序能保留前一次的次序。"
          ],
          [
            "二分查找的边界怎么写不容易错？",
            "统一用左闭右开区间 <code>[lo, hi)</code>，循环条件 <code>lo &lt; hi</code>，中点 <code>mid = lo + (hi - lo) / 2</code>（避免溢出），比较后 <code>hi = mid</code> 或 <code>lo = mid + 1</code>。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("data-structure", {
    chapters: [
      {
        id: "linear",
        topics: [
          { id: "dlist", title: "双向链表" },
          { id: "list-cycle", title: "链表环与快慢指针" }
        ]
      },
      {
        id: "buffer",
        topics: [
          { id: "queue-full", title: "循环队列判空判满" },
          { id: "bitmap", title: "位图与资源管理" },
          { id: "hash-conflict", title: "哈希冲突处理" }
        ]
      },
      {
        id: "tree",
        topics: [
          { id: "heap", title: "堆与优先队列" },
          { id: "search", title: "二分查找与变体" }
        ]
      }
    ],
    questions: [
      {
        id: "D-08",
        chapter: "linear",
        topic: "dlist",
        title: "双向链表怎么实现？为什么内核链表要用哨兵节点？",
        diff: "中级",
        freq: "中频",
        type: "代码设计题",
        point: "双向链表删除需要前驱，哨兵节点消除头尾特判，嵌入式常用侵入式链表。",
        q: `<p>面试官：双向链表相比单链表有什么优势？删除一个节点时要注意什么？Linux 内核的 <code>list_head</code> 为什么设计成侵入式？</p>`,
        exam: `<p>考察链表实现细节和工程化设计。能说出“双向链表删除不需要遍历找前驱”“哨兵节点让空表和非空表操作统一”，说明写过可用的链表。</p>`,
        core: `<p>双向链表节点存 <code>prev/next</code>：已知节点时删除 O(1)，可双向遍历，前后插入 O(1)，代价是每节点多一个指针。删除要先判头尾，再改 <code>prev-&gt;next</code> 和 <code>next-&gt;prev</code>。</p><p>哨兵节点不存数据，空表时 <code>head-&gt;next==head</code>，插入删除都不用特判头尾。内核的侵入式链表把 <code>list_head</code> 嵌进业务结构体，不用单独分配节点，还能用 <code>container_of</code> 反推结构体地址。</p>`,
        answer: `<p><b>双向链表</b>每个节点保存 <code>prev</code> 和 <code>next</code> 两个指针，优势是：</p>
<ul>
<li>已知节点指针时，删除是 O(1)，不需要从头找前驱；</li>
<li>可以双向遍历，适合需要“向前查找”的场景（如 LRU 缓存）；</li>
<li>在节点前后插入都是 O(1)。</li>
</ul>
<p>代价是每个节点多一个指针，内存占用增加；指针维护也更易出错。</p>
<p><b>删除时的关键：</b>先判断节点是否为头/尾，再更新 <code>prev-&gt;next</code> 和 <code>next-&gt;prev</code>。如果不使用哨兵节点，头尾都要特判，代码分支多、容易漏。</p>
<p><b>哨兵节点（dummy head）</b>是一个不存数据的节点，<code>head-&gt;next</code> 指向第一个真实节点，<code>head-&gt;prev</code> 指向最后一个。这样空表时 <code>head-&gt;next == head</code>，插入删除都不需要判断“是不是第一个/最后一个”，代码大幅简化。</p>
<p><b>侵入式链表</b>（Linux <code>list_head</code>）把 <code>next/prev</code> 嵌入到业务结构体内部，而不是让节点包含数据指针。好处是：</p>
<ul>
<li>不需要为链表节点单独分配内存，减少一次分配和内存碎片；</li>
<li>一个结构体可以同时挂在多个链表上；</li>
<li>用 <code>container_of</code> 宏从成员地址反推结构体地址。</li>
</ul>`,
        principle: `<p>链表的本质是用指针表达元素之间的顺序关系，因此插入删除只改指针，不需要移动数据。代价是失去随机访问能力，查找必须遍历。</p>
<p>哨兵节点用“多用一个节点”换取“消除边界特判”，这是数据结构设计中常见的空间换简洁思路。环形哨兵还能让链表首尾相连，进一步统一操作。</p>`,
        fig: {
          type: "memmap",
          title: "带哨兵的双向循环链表",
          tag: "linked list",
          rows: [
            { name: "head", text: "哨兵节点：next → 第一个节点，prev → 最后一个节点", addr: "不存数据", cls: "a" },
            { name: "node A", text: "prev = head, next = node B", addr: "数据 A", cls: "b" },
            { name: "node B", text: "prev = node A, next = head", addr: "数据 B", cls: "c" },
            { name: "空表", text: "head.next = head, head.prev = head", addr: "统一处理", cls: "d" }
          ]
        },
        code: {
          lang: "c",
          title: "dlist.c",
          src: `#include <stddef.h>

typedef struct dnode {
    struct dnode *prev;
    struct dnode *next;
} dnode_t;

/* 初始化：哨兵自己指向自己，形成空环 */
static inline void dlist_init(dnode_t *head)
{
    head->prev = head;
    head->next = head;
}

/* 在 pos 之前插入 node，无需判断头尾 */
static inline void dlist_insert(dnode_t *pos, dnode_t *node)
{
    node->prev = pos->prev;
    node->next = pos;
    pos->prev->next = node;
    pos->prev = node;
}

/* 删除 node，O(1)，无需遍历 */
static inline void dlist_remove(dnode_t *node)
{
    node->prev->next = node->next;
    node->next->prev = node->prev;
    node->prev = node->next = node;
}

/* 判空：只剩哨兵自己 */
static inline int dlist_empty(const dnode_t *head)
{
    return head->next == head;
}`
        },
        codeNote: "侵入式链表还需要 container_of 宏从成员地址反推宿主结构体，本质是指针减法。",
        apply: `<p>做设备管理时，我用侵入式链表把每个设备结构体挂在“已注册设备”链表上，注册/注销都是 O(1)，也不需要额外的节点内存。</p>
<p>需要注意：删除节点后要把它的 prev/next 指向自己，否则野指针可能让后续误操作把整个链表接坏。这是调试链表问题时最常见的原因。</p>`,
        pitfalls: [
          "<b>删除后不更新相邻节点的指针。</b>链表断裂，遍历时跑飞。",
          "<b>没有哨兵时漏判头尾。</b>删除第一个或最后一个节点时崩溃。",
          "<b>在遍历中删除节点后继续用 node-&gt;next。</b>应该先保存 next 再删除。",
          "<b>侵入式链表忘了 container_of 的偏移计算。</b>拿到的地址不是结构体首地址。"
        ],
        follow: [
          ["单链表如何在 O(1) 时间内删除已知节点？", "把后继节点的数据复制到当前节点，然后删除后继。缺点是没法删除最后一个节点，也不适用于节点地址被外部持有的场景。"],
          ["LRU 缓存为什么用双向链表加哈希表？", "哈希表提供 O(1) 查找，双向链表提供 O(1) 的移动到头部和删除尾部，两者组合使 get/put 都是 O(1)。"]
        ]
      },

      {
        id: "D-09",
        chapter: "buffer",
        topic: "queue-full",
        title: "循环队列怎么判断空和满？有几种常见做法？",
        diff: "中级",
        freq: "高频",
        type: "代码设计题",
        point: "留一格、维护 count、镜像位三种方案，核心是区分 head == tail 的两种含义。",
        q: `<p>面试官：循环队列里 <code>head == tail</code> 既可能表示空，也可能表示满，怎么区分？各方案有什么代价？</p>`,
        exam: `<p>考察对环形结构的细节掌握。能说出三种方案并比较优劣，比只背“留一个空位”更完整。</p>`,
        core: `<p>三种做法：① 牺牲一个单元，空 <code>head==tail</code>、满 <code>(tail+1)%N==head</code>；② 额外 <code>count</code>，空 0、满 N；③ 读写序号只增不取模，用差值判空满，靠无符号回绕。</p><p>单生产者单消费者时生产者只改 <code>tail</code>、消费者只改 <code>head</code>，可以无锁。容量取 2 的幂，<code>%N</code> 可优化成 <code>&amp;(N-1)</code>。</p>`,
        answer: `<p>常见有三种做法：</p>
<ol>
<li><b>牺牲一个存储单元。</b>队列容量为 N，但最多存 N-1 个元素。空的条件是 <code>head == tail</code>，满的条件是 <code>(tail + 1) % N == head</code>。实现最简单，代价是浪费一个位置。</li>
<li><b>额外维护 count。</b>入队 count++，出队 count--。空是 <code>count == 0</code>，满是 <code>count == N</code>。容量不浪费，但多一个变量，且 count 的读写需要考虑并发原子性。</li>
<li><b>维护读写序号（不取模）。</b><code>head</code> 和 <code>tail</code> 一直递增，用 <code>tail - head</code> 表示元素个数，索引时再对 N 取模。空是两者相等，满是差值等于 N。缺点是序号会溢出，需要用无符号数的自然回绕特性。</li>
</ol>
<p>中断和主循环共享队列时，通常让<b>生产者只改 tail、消费者只改 head</b>，这样单生产者单消费者场景下不需要加锁。如果队列满，可以选择丢弃新数据、覆盖最旧数据或阻塞等待，取决于业务。</p>
<p>容量通常取 2 的幂，这样 <code>% N</code> 可以优化成 <code>&amp; (N-1)</code>，在 MCU 上能省下除法开销。</p>`,
        principle: `<p>循环队列用取模把线性数组“首尾相接”，从而复用已经出队的位置。判空判满的本质是要区分“读指针追上写指针”和“写指针绕一圈追上读指针”这两种状态，而它们的位置关系完全相同，所以必须引入额外信息。</p>
<p>单生产者单消费者之所以能免锁，是因为 head 只由消费者修改、tail 只由生产者修改，读写各自是原子的字操作；但内存序需要保证数据先写入再更新指针，必要时加编译屏障。</p>`,
        fig: {
          type: "bits",
          title: "留一格方案：容量 8，最多存 7 个",
          tag: "ring queue",
          cells: [
            { v: "data", n: "0" },
            { v: "data", n: "1" },
            { v: "data", n: "2" },
            { v: "空", n: "3" },
            { v: "空", n: "4" },
            { v: "空", n: "5" },
            { v: "空", n: "6" },
            { v: "空", n: "7" }
          ],
          note: "tail 指向下一个可写位置，head 指向下一个可读位置；tail+1 == head 表示满。"
        },
        code: {
          lang: "c",
          title: "ring_queue.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define Q_SIZE 64u                 /* 必须是 2 的幂 */
#define Q_MASK (Q_SIZE - 1u)

typedef struct {
    uint8_t  buf[Q_SIZE];
    volatile uint32_t head;        /* 只由消费者修改 */
    volatile uint32_t tail;        /* 只由生产者修改 */
} ringq_t;

static inline bool q_empty(const ringq_t *q)
{
    return q->head == q->tail;
}

static inline bool q_full(const ringq_t *q)
{
    return ((q->tail + 1u) & Q_MASK) == q->head;
}

static inline bool q_push(ringq_t *q, uint8_t v)
{
    uint32_t next = (q->tail + 1u) & Q_MASK;
    if (next == q->head) return false;   /* 满 */
    q->buf[q->tail] = v;
    q->tail = next;                      /* 先写数据再移动指针 */
    return true;
}

static inline bool q_pop(ringq_t *q, uint8_t *v)
{
    if (q->head == q->tail) return false; /* 空 */
    *v = q->buf[q->head];
    q->head = (q->head + 1u) & Q_MASK;
    return true;
}`
        },
        codeNote: "单生产者单消费者时，先写数据再更新指针的顺序不能颠倒，否则消费者可能读到未写入的槽位。",
        apply: `<p>串口接收我用“DMA + 空闲中断 + 环形缓冲”，中断里只把 DMA 收到的数据搬进队列，主循环负责解析。队列满时丢弃最旧数据并计数，方便定位波特率过高或解析太慢的问题。</p>
<p>容量不要设得刚好，留 2 倍余量。曾经因为队列只有 64 字节、突发帧长 80 字节，导致偶发丢包，查了很久。</p>`,
        pitfalls: [
          "<b>用 head == tail 同时表示空和满。</b>必然出问题。",
          "<b>容量不是 2 的幂还硬用位与。</b>索引越界。",
          "<b>先移动指针再写数据。</b>并发时消费者可能读到旧值。",
          "<b>多生产者不加保护。</b>tail 的读-改-写会竞争，丢数据。"
        ],
        follow: [
          ["队列满时应该丢新数据还是覆盖旧数据？", "看业务语义：控制命令不能丢，适合丢最旧；传感器采样可以丢新，保留时间序列的连续性。无论哪种都要计数并上报，便于发现容量不足。"],
          ["无锁队列在什么情况下会失效？", "多生产者或多消费者时，指针的读-改-写不是原子的，需要 CAS 或加锁；此外编译器和 CPU 的重排序需要内存屏障约束。"]
        ]
      },

      {
        id: "D-10",
        chapter: "linear",
        topic: "list-cycle",
        title: "如何判断链表有环？怎么找到环的入口节点？",
        diff: "高级",
        freq: "中频",
        type: "算法题",
        point: "快慢指针相遇证明有环，再让一个指针从头出发，与相遇点同速前进即为入口。",
        q: `<p>面试官：一个单链表可能存在环，如何用 O(1) 额外空间判断是否有环？如果有环，怎么找入口？请说明推导过程。</p>`,
        exam: `<p>考察算法思维和数学推导能力。能讲清“慢指针走 a+b、快指针走 a+b+kL”的等式，而不是背结论。</p>`,
        core: `<p>快慢指针：慢走 1 步、快走 2 步，有环就在环内相遇，<code>fast</code> 到 <code>NULL</code> 则无环。</p><p>找入口：头到入口 <code>a</code>、入口到相遇点 <code>b</code>、环长 <code>L</code>，<code>2(a+b)=a+b+kL</code> 得 <code>a=kL-b</code>。把一个指针放回头，与相遇点指针同速前进，再相遇处就是入口。时间 O(n)、空间 O(1)。</p>`,
        answer: `<p><b>判断有环：快慢指针。</b>慢指针每次走 1 步，快指针每次走 2 步。如果存在环，快指针一定会在环内追上慢指针；如果快指针走到 NULL，说明无环。时间复杂度 O(n)，空间 O(1)。</p>
<p><b>找入口：</b>设头到入口距离为 <code>a</code>，入口到相遇点距离为 <code>b</code>，环长为 <code>L</code>。相遇时：</p>
<ul>
<li>慢指针走了 <code>a + b</code>；</li>
<li>快指针走了 <code>a + b + kL</code>（多绕了 k 圈）；</li>
<li>快指针速度是慢的两倍，所以 <code>a + b + kL = 2(a + b)</code>，化简得 <code>a = kL - b</code>。</li>
</ul>
<p>这意味着：从<b>头节点</b>出发走 <code>a</code> 步，和从<b>相遇点</b>出发走 <code>kL - b</code> 步，会同时到达入口。所以让一个指针回到头节点，另一个留在相遇点，两者都每次走 1 步，再次相遇的位置就是环入口。</p>
<p>注意快指针一次走 2 步在环长为 1 或 2 时也能正确相遇，不会跳过——因为相对速度是 1，每次靠近一步。</p>`,
        principle: `<p>快慢指针的本质是利用“相对速度”在有限状态空间内必然相遇。只要环存在，两个指针都在环内循环，速度差为 1，必然在最多 L 步内重合。</p>
<p>找入口的推导利用了“路程差是环长的整数倍”这一性质，把环形问题转化成了线性距离关系。</p>`,
        fig: {
          type: "flow",
          title: "快慢指针找环入口",
          tag: "two pointers",
          items: [
            { t: "同时出发", d: "slow 走 1 步，fast 走 2 步" },
            { t: "判断相遇", d: "fast 为 NULL 则无环" },
            { t: "记录相遇点", d: "slow == fast 的位置" },
            { t: "一指针回头", d: "slow 回到 head" },
            { t: "同速前进", d: "各走 1 步，相遇即入口" }
          ]
        },
        code: {
          lang: "c",
          title: "list_cycle.c",
          src: `#include <stddef.h>

typedef struct node {
    int v;
    struct node *next;
} node_t;

/* 返回环入口，无环返回 NULL */
node_t *find_cycle_entry(node_t *head)
{
    node_t *slow = head;
    node_t *fast = head;

    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) break;
    }
    if (!fast || !fast->next) return NULL;   /* 无环 */

    slow = head;
    while (slow != fast) {
        slow = slow->next;
        fast = fast->next;
    }
    return slow;
}`
        },
        codeNote: "循环条件要同时判断 fast 和 fast->next，否则奇数个节点时 fast 停在尾节点，<code>fast->next->next</code> 会解引用空指针。",
        apply: `<p>这个思路在嵌入式里也有实际用途：检查链表是否被错误地接成环（比如节点重复插入导致自环），可以在调试版本里加一个周期性检测，避免遍历时死循环卡死看门狗。</p>
<p>更实用的做法是在链表结构里加一个计数器，插入时加、删除时减，遍历前先校验计数，能在 O(1) 时间发现不一致。</p>`,
        pitfalls: [
          "<b>只判断 fast 不判断 fast-&gt;next。</b>空指针解引用。",
          "<b>快指针一次走 3 步以上。</b>不保证能追上：每轮相对位移是 k−1，若环长与它不互素且初始错开，两指针会永远错过（例如环长 4、步长 3 时相对位移为 2，初始差为奇数就永远不相遇），所以标准实现都用两步。",
          "<b>找入口时两个指针速度不同。</b>必须同速才能保证在入口相遇。",
          "<b>忘记处理空链表。</b>head 为 NULL 时直接崩溃。"
        ],
        follow: [
          ["如何求环的长度？", "相遇后让一个指针继续走，再次回到相遇点所走的步数就是环长。"],
          ["如何判断两个链表是否相交？", "分别遍历到尾部，比较尾节点是否相同；相同则有交点。再让长链表先走长度差，然后同步前进，第一个相同节点就是交点。"]
        ]
      },

      {
        id: "D-11",
        chapter: "tree",
        topic: "binary-tree",
        title: "二叉树的层次遍历怎么写？如何按层输出？",
        diff: "中级",
        freq: "中频",
        type: "算法题",
        point: "用队列实现 BFS，按层输出时在每轮循环前记录当前队列长度。",
        q: `<p>面试官：如何按层从上到下、从左到右遍历二叉树？如果要每层单独输出一行，怎么改？</p>`,
        exam: `<p>考察 BFS 与队列的结合。关键技巧是“每层开始时记录队列长度”，这样能自然分层。</p>`,
        core: `<p>BFS 加队列：根入队，循环取出队首访问，并把左右孩子入队。</p><p>按层输出：每轮先记当前队列长度 <code>n</code>，只处理这 <code>n</code> 个，新入队的留到下一轮。MCU 上用固定数组队列，容量按最宽一层估算，时间 O(n)、空间 O(w)。</p>`,
        answer: `<p>层次遍历本质是广度优先搜索（BFS），用队列实现：</p>
<ol>
<li>根节点入队；</li>
<li>队列非空时，取出队首访问，并把它的左右子节点依次入队；</li>
<li>重复直到队列为空。</li>
</ol>
<p><b>按层输出</b>的关键是：在每一轮开始前记录当前队列的长度 <code>n</code>，这一轮只处理 <code>n</code> 个节点，处理完就是一层的结束。新入队的节点属于下一层，留到下一轮。</p>
<p>在 MCU 上要注意队列容量。完全二叉树的队列最大长度约等于最宽一层的节点数，可以用固定数组实现，避免动态分配。如果树很深但很窄，队列可以小；如果很宽，需要按最大宽度估算。</p>
<p>复杂度是 O(n) 时间、O(w) 空间，w 是树的最大宽度。</p>`,
        principle: `<p>BFS 依赖“先进先出”保证同层节点先于下一层被处理。队列中始终保存着“已发现但未访问”的节点，且顺序正好是按层排列的。</p>
<p>与 DFS 的递归实现相比，BFS 不需要函数调用栈，但需要显式队列；在栈空间紧张的 MCU 上，这反而更可控。</p>`,
        fig: {
          type: "layers",
          title: "层次遍历的队列变化",
          tag: "bfs",
          items: [
            { tag: "初始", t: "[A]", d: "根节点入队" },
            { tag: "第 1 层", t: "出 A，入 B、C → [B, C]", d: "队列长度 1" },
            { tag: "第 2 层", t: "出 B 入 D、E，出 C 入 F → [D, E, F]", d: "本轮处理 2 个" },
            { tag: "第 3 层", t: "依次出队，无子节点 → []", d: "遍历结束" }
          ]
        },
        code: {
          lang: "c",
          title: "level_order.c",
          src: `#include <stddef.h>

typedef struct tnode {
    int v;
    struct tnode *left;
    struct tnode *right;
} tnode_t;

#define QMAX 64   /* 每层的最大节点数（树的最大宽度），按实际情况设定 */

/* 按层遍历，每层回调一次；返回 0 成功，-1 表示某层超出 QMAX */
int level_order(tnode_t *root,
                void (*on_level)(tnode_t **nodes, int n, int depth))
{
    tnode_t *buf_a[QMAX], *buf_b[QMAX];   /* 当前层 / 下一层，双缓冲 */
    tnode_t **cur = buf_a, **nxt = buf_b;
    int n = 0, depth = 0;

    if (!root) return 0;
    cur[0] = root;
    n = 1;

    while (n > 0) {
        int nnext = 0, i;

        /* 1. 把当前层所有节点的子节点收集到下一层 */
        for (i = 0; i < n; i++) {
            if (cur[i]->left) {
                if (nnext >= QMAX) return -1;   /* 明确报错，不静默丢节点 */
                nxt[nnext++] = cur[i]->left;
            }
            if (cur[i]->right) {
                if (nnext >= QMAX) return -1;
                nxt[nnext++] = cur[i]->right;
            }
        }

        /* 2. 处理当前层（此时 cur 仍是连续数组，可直接传给回调） */
        if (on_level) on_level(cur, n, depth);
        depth++;

        /* 3. 交换缓冲，进入下一层 */
        {
            tnode_t **tmp = cur;
            cur = nxt;
            nxt = tmp;
        }
        n = nnext;
    }
    return 0;
}`
        },
        codeNote: "这里用“当前层 / 下一层”双缓冲代替普通队列：容量只需按<strong>树的最大宽度</strong>开，而不是节点总数；某层超宽时返回 -1 报错，不会像“满队列就跳过”那样悄悄丢节点。若宽度完全不可预估，再改用动态队列。",
        apply: `<p>层次遍历在嵌入式里可以用于按层级打印设备树、菜单树，或者做“逐层扩散”的搜索（如网格地图的最短路径）。</p>
<p>如果只需要遍历而不需要分层，可以省掉内层循环，直接一个 while 出队入队，代码更短。分层只在需要“按层处理”时才引入。</p>`,
        pitfalls: [
          "<b>按层输出时用队列长度动态判断。</b>边遍历边入队会让长度变化，必须提前记录。",
          "<b>队列容量按节点总数开。</b>浪费内存，按最大宽度开即可。",
          "<b>忘记判空。</b>空树直接访问 root-&gt;left 崩溃。",
          "<b>用递归实现 BFS。</b>层次关系会丢失，退化成 DFS。"
        ],
        follow: [
          ["如何求二叉树的最大深度？", "BFS 每处理完一层 depth 加一，最后返回 depth；DFS 则递归返回左右子树深度的较大值加一。"],
          ["如何判断一棵树是否是完全二叉树？", "BFS 遍历，遇到第一个空子节点后，后续所有节点都必须是叶子；否则不是完全二叉树。"]
        ]
      },

      {
        id: "D-12",
        chapter: "tree",
        topic: "heap",
        title: "堆是什么？如何用数组实现优先队列？",
        diff: "高级",
        freq: "中频",
        type: "数据结构题",
        point: "完全二叉树用数组存储，父子索引有固定关系，插入上浮、删除下沉，操作为 O(log n)。",
        q: `<p>面试官：RTOS 或事件驱动系统里经常要“取最早到期的定时器”，用什么数据结构？堆是怎么用数组实现的？</p>`,
        exam: `<p>考察对堆的理解和实际应用。能写出父子索引关系、上浮下沉逻辑，并说出它比有序链表/无序数组的优势。</p>`,
        core: `<p>堆是完全二叉树，只保证堆顶是最值、不保证整体有序；小顶堆父节点不大于子节点。</p><p>数组实现：父 <code>(i-1)/2</code>，左 <code>2i+1</code>，右 <code>2i+2</code>。插入放末尾后上浮，取顶把末尾移到根再下沉，都是 O(log n)。比无序数组每次扫描 O(n) 快，适合定时器和优先队列。</p>`,
        answer: `<p><b>堆</b>是一棵完全二叉树，满足堆序性质：小顶堆中每个节点的值都不大于其子节点（大顶堆相反）。它只保证堆顶是最值，不保证整体有序。</p>
<p><b>数组实现：</b>完全二叉树可以按层序存入数组，下标从 0 开始时：</p>
<ul>
<li>父节点索引：<code>(i - 1) / 2</code></li>
<li>左子节点：<code>2i + 1</code></li>
<li>右子节点：<code>2i + 2</code></li>
</ul>
<p>不需要存指针，节省内存，缓存友好。</p>
<p><b>插入：</b>放到数组末尾，然后不断与父节点比较，若违反堆序就交换（上浮），直到满足性质，O(log n)。</p>
<p><b>取堆顶：</b>取出 <code>a[0]</code>，把最后一个元素移到堆顶，然后与较小的子节点比较并交换（下沉），直到满足性质，O(log n)。</p>
<p>相比“无序数组每次扫描找最小”是 O(n)，堆的 O(log n) 在定时器数量多时优势明显；相比“有序链表插入 O(n)”，堆的插入更快。</p>`,
        principle: `<p>堆只维护“父节点与子节点”的偏序关系，不维护兄弟节点之间的顺序，因此可以用最少的比较维持最值可访问。这是“部分有序”换效率的典型设计。</p>
<p>定时器场景中，通常把“到期时间”作为键，堆顶就是最早到期的任务。RTOS 的软件定时器链表有时用有序链表，因为定时器数量少且插入频率低；数量大时才用堆。</p>`,
        fig: {
          type: "memmap",
          title: "小顶堆的数组表示",
          tag: "heap",
          rows: [
            { name: "a[0]", text: "最小值（堆顶）", addr: "根", cls: "a" },
            { name: "a[1] / a[2]", text: "左右子节点，均 ≥ a[0]", addr: "第 2 层", cls: "b" },
            { name: "a[3]..a[6]", text: "第 3 层", addr: "第 3 层", cls: "c" },
            { name: "关系", text: "parent=(i-1)/2, left=2i+1, right=2i+2", addr: "无需指针", cls: "d" }
          ]
        },
        code: {
          lang: "c",
          title: "min_heap.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define HEAP_MAX 32

typedef struct {
    uint32_t expire;      /* 到期时刻，越小越优先 */
    uint16_t id;
} timer_t;

typedef struct {
    timer_t a[HEAP_MAX];
    int n;
} heap_t;

static void swap(timer_t *x, timer_t *y)
{
    timer_t t = *x; *x = *y; *y = t;
}

/* 上浮：新元素放到末尾后向上调整 */
static void sift_up(heap_t *h, int i)
{
    while (i > 0) {
        int p = (i - 1) / 2;
        if (h->a[p].expire <= h->a[i].expire) break;
        swap(&h->a[p], &h->a[i]);
        i = p;
    }
}

/* 下沉：堆顶被替换后向下调整 */
static void sift_down(heap_t *h, int i)
{
    for (;;) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < h->n && h->a[l].expire < h->a[m].expire) m = l;
        if (r < h->n && h->a[r].expire < h->a[m].expire) m = r;
        if (m == i) break;
        swap(&h->a[i], &h->a[m]);
        i = m;
    }
}

bool heap_push(heap_t *h, timer_t t)
{
    if (h->n >= HEAP_MAX) return false;
    h->a[h->n] = t;
    sift_up(h, h->n++);
    return true;
}

bool heap_pop(heap_t *h, timer_t *out)
{
    if (h->n == 0) return false;
    *out = h->a[0];
    h->a[0] = h->a[--h->n];
    sift_down(h, 0);
    return true;
}`
        },
        codeNote: "删除任意元素需要先找到它的位置，堆本身不支持快速查找；工程上通常额外维护 id 到索引的映射。",
        apply: `<p>做多路定时任务时，我用小顶堆管理定时器，主循环每次取堆顶与当前 tick 比较，到期就执行并重新入堆。比遍历整个定时器数组效率高得多。</p>
<p>如果定时器会被取消，需要“惰性删除”：取消时只打标记，取到堆顶时发现已取消就丢弃，避免在堆中查找。</p>`,
        pitfalls: [
          "<b>下标从 1 开始却用 2i+1 公式。</b>父子关系错位。",
          "<b>下沉时只和一个子节点比较。</b>应该和较小的那个子节点交换。",
          "<b>以为堆是有序数组。</b>堆只能保证堆顶最值，其余无序。",
          "<b>删除任意元素时线性查找。</b>破坏 O(log n) 复杂度。"
        ],
        follow: [
          ["建堆为什么是 O(n) 而不是 O(n log n)？", "从最后一个非叶节点开始依次下沉，大部分节点靠近底层、下沉距离短，总代价收敛到 O(n)。逐个插入建堆才是 O(n log n)。"],
          ["堆排序为什么不稳定？", "取堆顶后把末尾元素换到堆顶再下沉，会打乱相等元素的相对顺序，且这个过程无法通过额外空间简单修复。"]
        ]
      },

      {
        id: "D-13",
        chapter: "tree",
        topic: "sort-search",
        title: "MCU 上该选哪种排序算法？快排一定比插入排序快吗？",
        diff: "中级",
        freq: "中频",
        type: "工程分析题",
        point: "小数组插入排序更快，快排有递归栈和最坏 O(n²)，嵌入式还要考虑栈空间和确定性。",
        q: `<p>面试官：要在单片机上对 20 个传感器采样值排序，你会用快排还是插入排序？为什么？</p>`,
        exam: `<p>考察是否理解复杂度的常数项和实际约束。能说出“小数组插入排序更快、快排递归占栈”就说明有工程经验。</p>`,
        core: `<p>20 个元素选插入排序：n 小、常数项小、无递归、原地、稳定；快排递归深度最坏 O(n)，栈只有几 KB 时危险，最坏 O(n²) 也不符合确定性要求。</p><p>经验阈值 n 小于 16~32 时插入排序常更快；数据量大用堆排序（无递归、最坏 O(n log n)）；范围小的 8 位 ADC 值可用计数排序；只求最值不必全排序。</p>`,
        answer: `<p>20 个元素我会选<b>插入排序</b>。原因：</p>
<ul>
<li>插入排序在 n 很小时常数项极小，没有递归调用和函数开销；</li>
<li>快排的递归深度最坏 O(n)，在栈只有几 KB 的 MCU 上有风险；</li>
<li>快排最坏情况 O(n²)，虽然随机数据下平均 O(n log n)，但嵌入式更看重确定性；</li>
<li>插入排序是稳定排序，多关键字排序时更方便。</li>
</ul>
<p>一般经验：n 小于 16~32 时，插入排序往往比快排快；n 大了之后快排的优势才体现出来。很多标准库的快排实现在子数组小于阈值时也会切换成插入排序。</p>
<p>如果数据量确实大，可以考虑：</p>
<ul>
<li>用<b>堆排序</b>，最坏也是 O(n log n)，且不需要递归；</li>
<li>用<b>计数排序</b>（数据范围小，如 8 位 ADC 值），O(n + k) 且无比较；</li>
<li>只求最值或中位数时，用选择算法而不是全排序。</li>
</ul>
<p>还要考虑数据存放位置：如果数据在 Flash 里，排序需要先复制到 RAM；如果数据量大，原地排序能省内存。</p>`,
        principle: `<p>时间复杂度描述的是增长趋势，不包含常数项。插入排序每次移动一个元素，指令少、局部性好；快排每次划分有较多比较和交换，还有递归的压栈开销。小 n 时前者胜出。</p>
<p>嵌入式还多两个约束：栈空间有限、执行时间要可预测。递归算法的最坏栈深度和运行时间都更难保证。</p>`,
        fig: {
          type: "table",
          title: "常见排序在 MCU 上的适用性",
          tag: "sorting",
          head: ["算法", "平均", "最坏", "额外空间", "适用场景"],
          rows: [
            ["插入排序", "O(n²)", "O(n²)", "O(1)", "n 小、基本有序"],
            ["快速排序", "O(n log n)", "O(n²)", "O(log n) 栈", "n 大、内存充足"],
            ["堆排序", "O(n log n)", "O(n log n)", "O(1)", "要求最坏可控"],
            ["归并排序", "O(n log n)", "O(n log n)", "O(n)", "需要稳定、可分配缓冲"],
            ["计数排序", "O(n+k)", "O(n+k)", "O(k)", "范围小的整数"]
          ]
        },
        code: {
          lang: "c",
          title: "insertion_sort.c",
          src: `#include <stdint.h>

/* 小数组排序：稳定、原地、无递归 */
void insertion_sort_u16(uint16_t *a, int n)
{
    for (int i = 1; i < n; i++) {
        uint16_t key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

/* 折半插入：减少比较次数，移动次数不变 */
void binary_insertion_sort(int *a, int n)
{
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int lo = 0, hi = i;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (a[mid] <= key) lo = mid + 1;
            else hi = mid;
        }
        for (int j = i; j > lo; j--) a[j] = a[j - 1];
        a[lo] = key;
    }
}`
        },
        codeNote: "折半插入只减少比较，不减少移动，元素移动成本高时收益有限。",
        apply: `<p>我做电池采样时，用“中值滤波 + 插入排序”处理 5 个点：排序后取中间值，能有效去掉脉冲干扰。5 个元素的插入排序比调用通用 qsort 快很多，也不占栈。</p>
<p>如果采样点固定且很少，甚至可以直接用几次比较写出排序网络，完全没有循环开销。</p>`,
        pitfalls: [
          "<b>盲目上快排。</b>小数组反而更慢，还占栈。",
          "<b>用 qsort 排小数组。</b>函数指针调用开销大，且需要额外的比较函数。",
          "<b>忽略最坏情况。</b>快排对已排序数组（取首元素为基准）退化成 O(n²)。",
          "<b>在中断里做排序。</b>执行时间不可控，影响实时性。"
        ],
        follow: [
          ["如何避免快排的最坏情况？", "随机选基准、三数取中，或者递归到小数组时切换插入排序；也可以改用内省排序（introsort），深度过大时转堆排序。"],
          ["中值滤波为什么用排序而不是求平均？", "平均值会被脉冲干扰拉偏，中值对离群点不敏感，能保留阶跃边沿，适合去除偶发尖峰。"]
        ]
      },

      {
        id: "D-14",
        chapter: "tree",
        topic: "search",
        title: "二分查找的边界怎么写才不容易错？lower_bound 和 upper_bound 有什么区别？",
        diff: "中级",
        freq: "高频",
        type: "算法题",
        point: "统一左闭右开区间，循环条件 lo < hi，中点防溢出，明确返回的是位置还是存在性。",
        q: `<p>面试官：手写一个二分查找。如果要找第一个大于等于目标的位置，怎么改？</p>`,
        exam: `<p>考察边界处理能力。二分查找写错的人非常多，能讲清区间定义和不变式，说明真的理解而不是背代码。</p>`,
        core: `<p>统一左闭右开 <code>[lo, hi)</code>：<code>lo=0, hi=n</code>，循环 <code>lo&lt;hi</code>，<code>mid=lo+(hi-lo)/2</code>；去右半区 <code>lo=mid+1</code>，去左半区 <code>hi=mid</code>。</p><p><code>lower_bound</code> 找第一个 <code>&gt;=target</code>，命中后仍收缩 <code>hi=mid</code>；<code>upper_bound</code> 找第一个 <code>&gt;target</code>，命中时 <code>lo=mid+1</code>；两者相减等于目标个数。前提是有序且能随机访问。</p>`,
        answer: `<p>我统一使用<b>左闭右开</b>区间 <code>[lo, hi)</code>，这样边界规则一致，不容易出错：</p>
<ul>
<li>初始 <code>lo = 0, hi = n</code>；</li>
<li>循环条件 <code>lo &lt; hi</code>；</li>
<li>中点 <code>mid = lo + (hi - lo) / 2</code>，避免 <code>lo + hi</code> 溢出；</li>
<li>命中时返回 <code>mid</code>；</li>
<li>目标在右半区：<code>lo = mid + 1</code>；</li>
<li>目标在左半区：<code>hi = mid</code>（因为 mid 已经排除，新区间右端不含 mid）。</li>
</ul>
<p><b>lower_bound</b>：返回第一个 <code>&gt;= target</code> 的位置。即使找到相等也不立即返回，而是继续收缩右边界 <code>hi = mid</code>。</p>
<p><b>upper_bound</b>：返回第一个 <code>&gt; target</code> 的位置。判断条件改成 <code>a[mid] &lt;= target</code> 时 <code>lo = mid + 1</code>。</p>
<p>两者相减就是等于 target 的元素个数。返回值等于 n 表示没找到（所有元素都小于目标）。</p>
<p>二分的前提是<b>数据有序</b>。如果是链表，无法随机访问，二分没有意义；如果数据频繁插入删除，维护有序的成本可能超过查找收益。</p>`,
        principle: `<p>二分查找每轮把搜索区间缩小一半，最多 log₂n 轮。正确性的关键是维持一个不变式：目标如果存在，一定在当前区间内。每次移动边界都必须保证不排除可能的目标。</p>
<p>左闭右开的好处是区间长度就是 <code>hi - lo</code>，空区间是 <code>lo == hi</code>，不需要处理“长度为 1 时 mid 是否越界”这类边界。</p>`,
        fig: {
          type: "flow",
          title: "lower_bound 的收缩过程",
          tag: "binary search",
          items: [
            { t: "区间 [lo, hi)", d: "初始 lo=0, hi=n" },
            { t: "取中点", d: "mid = lo + (hi-lo)/2" },
            { t: "a[mid] < target", d: "lo = mid + 1" },
            { t: "a[mid] >= target", d: "hi = mid（保留候选）" },
            { t: "lo == hi", d: "返回 lo，即第一个可行位置" }
          ]
        },
        code: {
          lang: "c",
          title: "binary_search.c",
          src: `#include <stddef.h>

/* 第一个 >= target 的位置，找不到返回 n */
int lower_bound(const int *a, int n, int target)
{
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < target) lo = mid + 1;
        else                 hi = mid;
    }
    return lo;
}

/* 第一个 > target 的位置 */
int upper_bound(const int *a, int n, int target)
{
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] <= target) lo = mid + 1;
        else                  hi = mid;
    }
    return lo;
}

/* 存在性判断：用 lower_bound 统一实现 */
int contains(const int *a, int n, int target)
{
    int p = lower_bound(a, n, target);
    return p < n && a[p] == target;
}`
        },
        codeNote: "所有变体都可以由 lower_bound/upper_bound 组合出来，比每次重写边界更可靠。",
        apply: `<p>查表时我常用二分：比如把校准点按电压排序，根据 ADC 值查找所在区间，再做线性插值。比逐点比较快，也不需要很大的表。</p>
<p>如果表是固定的，可以在编译期生成，甚至用查表加移位的近似方法，进一步省掉除法。</p>`,
        pitfalls: [
          "<b>用 (lo + hi) / 2。</b>大数组时溢出成负数，导致越界。",
          "<b>循环条件写 lo &lt;= hi 但 hi 初始为 n。</b>可能访问 a[n]。",
          "<b>找到相等就返回，却要的是第一个位置。</b>结果不是 lower_bound。",
          "<b>在无序数组上二分。</b>结果无意义。"
        ],
        follow: [
          ["二分查找的返回值为什么常用“插入位置”而不是布尔值？", "插入位置信息量更大，既能判断是否存在（比较 a[p] 与目标），又能直接用于有序插入，避免二次查找。"],
          ["如何在 100 万个数的有序数组里找中位数？", "直接取下标 n/2 的元素即可，O(1)；如果是两个有序数组求中位数，则用二分在较短数组上划分，O(log min(m,n))。"]
        ]
      },

      {
        id: "D-15",
        chapter: "buffer",
        topic: "bitmap",
        title: "位图怎么管理资源？如何快速找到第一个空闲位？",
        diff: "高级",
        freq: "中频",
        type: "工程算法题",
        point: "一位表示一个资源，用字操作批量判断，配合 CLZ/CTZ 指令快速定位空闲位。",
        q: `<p>面试官：系统有 64 个通道要分配和释放，怎么用最少的空间管理？如何快速找到第一个空闲通道？</p>`,
        exam: `<p>考察位运算的实际应用。能说出用 uint32_t 数组、按字判断、用 CLZ/CTZ 定位，说明对底层指令有了解。</p>`,
        core: `<p>一位表示一个资源：置位 <code>map[i/32] |= 1u&lt;&lt;(i%32)</code>，清位 <code>&amp;=~</code>，查询 <code>&gt;&gt;(i%32)&amp;1u</code>；64 个通道只要 8 字节。</p><p>找第一个空闲位：逐字扫描跳过全 1 的字，取反后求最低位 1——Cortex-M 用 <code>31-__CLZ(x&amp;-x)</code>，GCC 用 <code>__builtin_ctz</code>。资源更多可做两级位图。</p>`,
        answer: `<p><b>位图（bitmap）</b>用一位表示一个资源的状态，64 个通道只需要 8 字节（两个 uint32_t）。</p>
<p>基本操作：</p>
<ul>
<li>置位（占用）：<code>map[i / 32] |= (1u &lt;&lt; (i % 32))</code></li>
<li>清位（释放）：<code>map[i / 32] &amp;= ~(1u &lt;&lt; (i % 32))</code></li>
<li>查询：<code>(map[i / 32] &gt;&gt; (i % 32)) &amp; 1u</code></li>
</ul>
<p><b>快速找第一个空闲位：</b>逐字扫描，跳过值为 <code>0xFFFFFFFF</code> 的字，找到第一个不为全 1 的字后，取反得到空闲位掩码，再用 <b>CTZ</b>（Count Trailing Zeros）指令得到最低位的下标。</p>
<p>Cortex-M3/M4 有 <code>CLZ</code>（前导零计数），没有直接的 CTZ，可以用 <code>31 - CLZ(x &amp; -x)</code> 实现。GCC 也提供 <code>__builtin_ctz</code>，编译器会选合适的指令。</p>
<p>如果资源数量更多，可以做成两级位图：第一级每位表示一个 32 位字是否全满，先扫第一级，快速跳过整块满的区域。</p>`,
        principle: `<p>位图的本质是把“集合”映射到二进制位，利用 CPU 的字操作一次处理 32/64 个元素。相比数组或链表，空间占用小、遍历快、缓存友好。</p>
<p>CTZ/CLZ 是硬件指令，一条指令就能定位最低/最高有效位，比循环移位快一个数量级。</p>`,
        fig: {
          type: "bits",
          title: "64 通道位图（低 32 位）",
          tag: "bitmap",
          cells: [
            { v: "1", n: "ch0" },
            { v: "1", n: "ch1" },
            { v: "0", n: "ch2" },
            { v: "1", n: "ch3" },
            { v: "1", n: "ch4" },
            { v: "0", n: "ch5" },
            { v: "1", n: "ch6" },
            { v: "1", n: "ch7" }
          ],
          note: "取反后最低的 1 就是第一个空闲通道，用 CTZ 直接得到下标。"
        },
        code: {
          lang: "c",
          title: "bitmap.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define BM_WORDS 2u                 /* 64 位 */

typedef struct {
    uint32_t w[BM_WORDS];
} bitmap_t;

static inline void bm_set(bitmap_t *b, unsigned i)
{
    b->w[i >> 5] |= (1u << (i & 31u));
}

static inline void bm_clear(bitmap_t *b, unsigned i)
{
    b->w[i >> 5] &= ~(1u << (i & 31u));
}

static inline bool bm_test(const bitmap_t *b, unsigned i)
{
    return (b->w[i >> 5] >> (i & 31u)) & 1u;
}

/* 返回第一个空闲位，全满返回 -1 */
int bm_first_free(const bitmap_t *b)
{
    for (unsigned k = 0; k < BM_WORDS; k++) {
        uint32_t free_bits = ~b->w[k];
        if (free_bits) {
            return (int)(k * 32u + (unsigned)__builtin_ctz(free_bits));
        }
    }
    return -1;
}`
        },
        codeNote: "__builtin_ctz 的参数不能为 0，所以必须先判断 free_bits 非零。",
        apply: `<p>我用位图管理 DMA 通道、定时器通道和文件描述符，分配和释放都是 O(1)（找空闲是 O(字数)）。比链表少一次内存分配，也不会产生碎片。</p>
<p>释放时最好加断言检查该位是否已被占用，能及早发现重复释放。位图也适合做“哪些任务已就绪”的标记，配合 CLZ 实现优先级调度。</p>`,
        pitfalls: [
          "<b>对 0 调用 __builtin_ctz。</b>未定义行为，结果不可预期。",
          "<b>用 int 做位图字。</b>符号位参与移位可能出问题，应使用 uint32_t。",
          "<b>忘记同步保护。</b>多任务同时置位会丢失更新。",
          "<b>重复释放同一个位。</b>没有断言时很难发现，最终导致资源被重复分配。"
        ],
        follow: [
          ["位图和位域有什么区别？", "位图是显式的数组加位运算，布局完全可控；位域依赖编译器布局，不可移植。资源管理应该用位图。"],
          ["如何统计位图中 1 的个数？", "可以用查表法（每字节 256 项）、分治位运算（SWAR）或硬件 POPCNT 指令；Cortex-M 通常用查表或 SWAR。"]
        ]
      },

      {
        id: "D-16",
        chapter: "buffer",
        topic: "hash-conflict",
        title: "哈希冲突怎么处理？链地址法和开放寻址法各有什么优劣？",
        diff: "高级",
        freq: "中频",
        type: "数据结构题",
        point: "链地址法删除简单、负载因子可超过 1；开放寻址法缓存友好但删除需要墓碑标记。",
        q: `<p>面试官：哈希表如果两个 key 算出了同一个下标怎么办？嵌入式里没有 malloc，还能用链地址法吗？</p>`,
        exam: `<p>考察对哈希实现的完整理解，尤其是内存受限场景下的取舍。能说出“静态节点池 + 链地址法”或“开放寻址”就很好。</p>`,
        core: `<p>链地址法：每个桶挂链表，删除简单、负载因子可大于 1，但指针开销大、缓存不友好；嵌入式用静态节点池替代 <code>malloc</code>。</p><p>开放寻址法：冲突按探测序列找空槽，全在数组里、缓存友好，但负载因子要低于 0.7，删除要用墓碑标记，线性探测还会聚集。键固定、内存紧用开放寻址；删除频繁用链地址法。</p>`,
        answer: `<p>冲突处理主要有两类：</p>
<p><b>1. 链地址法（拉链）</b>：每个桶挂一个链表，冲突的元素追加到链表上。</p>
<ul>
<li>优点：删除简单，负载因子可以大于 1，冲突多时性能退化平缓；</li>
<li>缺点：需要额外的指针开销，节点内存分散，缓存不友好；</li>
<li>嵌入式改造：不用 malloc，而是预先分配一个静态节点池，用空闲链表管理。</li>
</ul>
<p><b>2. 开放寻址法</b>：冲突时按某种探测序列找下一个空槽（线性探测、二次探测、双重哈希）。</p>
<ul>
<li>优点：全部存在数组里，缓存友好，无指针开销；</li>
<li>缺点：负载因子必须小于 1（通常 0.7 以下），删除不能直接置空，要用“墓碑”标记，否则会截断探测链；</li>
<li>线性探测容易产生“聚集”，性能下降快。</li>
</ul>
<p>嵌入式里如果 key 数量固定、内存紧张，开放寻址更合适：一个数组就够了，没有动态分配。如果删除频繁、数量变化大，链地址法配合静态节点池更稳。</p>
<p>负载因子是核心指标：元素数 / 桶数。链地址法可以到 1 以上，开放寻址建议控制在 0.5~0.7。</p>`,
        principle: `<p>哈希表用哈希函数把 key 映射到有限的下标空间，冲突不可避免（鸽巢原理）。冲突处理策略决定了最坏情况下的性能和内存开销。</p>
<p>开放寻址的探测序列必须能覆盖整个表，否则可能“明明有空位却找不到”。表长取质数或 2 的幂配合特定探测方式，可以保证这一点。</p>`,
        fig: {
          type: "table",
          title: "两种冲突处理方式对比",
          tag: "hash",
          head: ["维度", "链地址法", "开放寻址法"],
          rows: [
            ["内存", "需要节点和指针", "只需一个数组"],
            ["负载因子", "可 > 1", "必须 < 1"],
            ["删除", "直接摘链", "需要墓碑标记"],
            ["缓存", "不友好", "友好"],
            ["最坏情况", "退化成链表 O(n)", "聚集时接近 O(n)"]
          ]
        },
        code: {
          lang: "c",
          title: "hash_open.c",
          src: `#include <stdint.h>
#include <string.h>

#define HASH_SIZE 64u          /* 2 的幂，便于取模优化 */
#define KEY_MAX   16

typedef enum { SLOT_EMPTY = 0, SLOT_USED, SLOT_TOMB } slot_state_t;

typedef struct {
    slot_state_t state;
    char         key[KEY_MAX];
    int          value;
} slot_t;

static uint32_t hash_str(const char *s)
{
    uint32_t h = 2166136261u;      /* FNV-1a */
    while (*s) {
        h ^= (uint8_t)*s++;
        h *= 16777619u;
    }
    return h;
}

/* 线性探测：找到则返回槽位，否则返回第一个可插入位置 */
static slot_t *find_slot(slot_t *tab, const char *key, int for_insert)
{
    uint32_t i = hash_str(key) & (HASH_SIZE - 1u);
    slot_t *first_tomb = 0;

    for (uint32_t n = 0; n < HASH_SIZE; n++) {
        slot_t *s = &tab[i];
        if (s->state == SLOT_EMPTY) {
            return for_insert ? (first_tomb ? first_tomb : s) : 0;
        }
        if (s->state == SLOT_TOMB) {
            if (!first_tomb) first_tomb = s;
        } else if (strcmp(s->key, key) == 0) {
            return s;
        }
        i = (i + 1u) & (HASH_SIZE - 1u);
    }
    return for_insert ? first_tomb : 0;
}`
        },
        codeNote: "墓碑的作用是保留探测链的连续性；插入时可以复用第一个墓碑，避免表被墓碑占满。",
        apply: `<p>做设备配置表时，key 是参数名（字符串），数量固定十几个，我用开放寻址加固定数组，完全不需要动态内存，掉电重启后从 Flash 加载即可。</p>
<p>哈希函数选 FNV-1a 或 CRC32，计算简单、分布均匀。不要用“所有字符相加”，冲突率太高。</p>`,
        pitfalls: [
          "<b>删除时直接置空。</b>探测链断裂，后面的元素永远找不到。",
          "<b>负载因子接近 1 还不扩容。</b>探测长度暴涨，性能急剧下降。",
          "<b>哈希函数分布差。</b>大量冲突，退化成线性查找。",
          "<b>用有符号数做哈希下标。</b>可能得到负索引。"
        ],
        follow: [
          ["为什么哈希表长度常取质数或 2 的幂？", "取 2 的幂可以用位与代替取模，但要求哈希函数低位分布均匀；取质数能让探测序列更均匀，减少聚集。两者要配合哈希函数选择。"],
          ["一致性哈希解决什么问题？", "在节点数量变化时，尽量少地重新映射 key，常用于分布式缓存；嵌入式单机场景一般用不到。"]
        ]
      },

      {
        id: "D-17",
        chapter: "tree",
        topic: "binary-tree",
        title: "递归为什么容易栈溢出？如何改成迭代？",
        diff: "高级",
        freq: "中频",
        type: "工程分析题",
        point: "每次递归都压栈帧，深度受栈大小限制；用显式栈把递归转成循环，把栈放到可控的内存区域。",
        q: `<p>面试官：递归遍历二叉树代码很简洁，但深层树会栈溢出。你会怎么改？显式栈和 Morris 遍历各适合什么场景？</p>`,
        exam: `<p>考察对递归本质的理解和工程取舍。能说清“递归栈在系统栈上、深度不可控”，并给出显式栈或 Morris 方案，就到位了。</p>`,
        core: `<p>每次递归都在栈上压返回地址、保存的寄存器和局部变量，深度最坏等于节点数 n；MCU 任务栈只有几 KB，几千节点就溢出。</p><p>改成显式栈：自己开数组压待处理节点，容量可控、能查越界。中序就是一路压左孩子，弹出访问再转右子树。内存极紧可用 Morris，借叶子空指针做线索，O(1) 空间但会临时改树。</p>`,
        answer: `<p><b>递归的代价：</b>每次调用都会在栈上压入返回地址、保存的寄存器和局部变量。树深为 h 时，递归深度就是 h，最坏情况（退化成链表）h = n。MCU 的任务栈通常只有几 KB，几千个节点就会溢出。</p>
<p><b>改成显式栈：</b>自己维护一个数组作为栈，把“待处理的节点”压进去。这样栈的大小由你决定，可以放在静态区或堆上，溢出时能检测（判断 top 是否越界），而不是悄悄踩坏内存。</p>
<p>以中序遍历为例：沿着左子树一路压栈，到底后弹出访问，再转向右子树。</p>
<p><b>Morris 遍历：</b>利用叶子节点的空右指针建立“线索”，临时指向中序后继，从而做到 O(1) 额外空间。代价是会临时修改树结构，且实现较绕，适合内存极度紧张、树不被并发访问的场景。</p>
<p><b>选择建议：</b></p>
<ul>
<li>树深可控、栈够用：递归最清晰；</li>
<li>深度不可控：显式栈，容量可检查；</li>
<li>内存极限、只读遍历：Morris；</li>
<li>需要按层处理：BFS 队列。</li>
</ul>`,
        principle: `<p>递归和迭代在计算能力上等价：递归利用系统调用栈保存状态，迭代用显式数据结构保存状态。区别在于栈的位置、大小可控性和溢出行为。</p>
<p>系统栈溢出通常不会立即报错，而是踩坏相邻内存，表现为变量莫名改变、HardFault 或跑飞，非常难查。显式栈可以在每次 push 前检查容量，把问题变成可处理的错误码。</p>`,
        fig: {
          type: "layers",
          title: "递归栈 vs 显式栈",
          tag: "recursion",
          items: [
            { tag: "递归", t: "系统栈自动增长", d: "深度受任务栈限制，溢出难发现" },
            { tag: "显式栈", t: "数组 + top 指针", d: "容量可控，push 前可检查" },
            { tag: "Morris", t: "利用空指针做线索", d: "O(1) 空间，但会临时改树" },
            { tag: "BFS", t: "队列按层处理", d: "空间取决于最大宽度" }
          ]
        },
        code: {
          lang: "c",
          title: "iter_inorder.c",
          src: `#include <stddef.h>
#include <stdbool.h>

typedef struct tnode {
    int v;
    struct tnode *left;
    struct tnode *right;
} tnode_t;

#define STACK_MAX 64

/* 显式栈中序遍历：返回 false 表示栈容量不足 */
bool inorder_iter(tnode_t *root, void (*visit)(tnode_t *))
{
    tnode_t *stk[STACK_MAX];
    int top = 0;
    tnode_t *cur = root;

    while (cur || top > 0) {
        while (cur) {
            if (top >= STACK_MAX) return false;  /* 可检测的失败 */
            stk[top++] = cur;
            cur = cur->left;
        }
        cur = stk[--top];
        visit(cur);
        cur = cur->right;
    }
    return true;
}`
        },
        codeNote: "显式栈容量要按树的最大深度估算；如果树动态变化，失败时返回错误码比静默溢出安全得多。",
        apply: `<p>我在解析嵌套的 JSON 或菜单配置时，用显式栈限制最大嵌套层数（比如 16 层），超过就返回错误。这样即使收到恶意或损坏的数据，也不会把栈打穿。</p>
<p>递归函数在中断里尤其危险：Cortex-M 上 ISR 用的是主栈 MSP，递归帧直接叠在主栈上，再叠加中断嵌套，很容易把 MSP 打穿（此时任务栈可能完好，排查时容易找错方向）。所以中断服务程序里一律避免递归。</p>`,
        pitfalls: [
          "<b>以为递归深度等于树高。</b>退化成链表的树深度等于节点数。",
          "<b>显式栈也开在栈上。</b>大数组本身就会导致栈溢出。",
          "<b>Morris 遍历时不恢复树结构。</b>遍历后树被破坏。",
          "<b>递归没有深度上限。</b>解析不可信输入时容易被构造数据打穿。"
        ],
        follow: [
          ["尾递归一定能被优化成循环吗？", "C 标准不保证，编译器（如 GCC 开 -O2）通常会做尾调用优化，但依赖优化等级和函数形式，嵌入式代码不应依赖它。"],
          ["如何检测递归深度？", "可以传一个 depth 参数并在入口检查上限；或者用编译器选项插入栈检查（-fstack-usage 生成每函数栈用量报告）。"]
        ]
      }
    ]
  });
})();
