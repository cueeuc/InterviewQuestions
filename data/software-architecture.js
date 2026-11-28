/* ============================================================
   10 嵌入式软件架构与工程设计
   ============================================================ */
(function () {
  "use strict";

  EIK.register("software-architecture", {
    chapters: [
      {
        id: "layer",
        title: "分层与模块",
        topics: [
          { id: "layers", title: "分层架构与 BSP/HAL" },
          { id: "interface", title: "接口设计与模块解耦" }
        ]
      },
      {
        id: "design",
        title: "设计方法",
        topics: [
          { id: "fsm", title: "状态机设计" },
          { id: "event", title: "事件驱动架构" }
        ]
      },
      {
        id: "quality",
        title: "工程质量",
        topics: [
          { id: "protect", title: "数据共享与资源保护" },
          { id: "port", title: "可移植性与代码规范" }
        ]
      }
    ],

    questions: [
      {
        id: "X-01",
        chapter: "layer",
        topic: "layers",
        title: "嵌入式软件该怎么分层？BSP 和 HAL 有什么区别？",
        diff: "中级",
        freq: "高频",
        type: "综合设计题",
        point: "分层职责、依赖方向、BSP 与 HAL 的边界，以及分层的实际收益。",
        q: `<p>面试官：你的项目是<strong>怎么分层</strong>的？驱动层、服务层、应用层各自负责什么？BSP 和 HAL 有什么区别？为什么要这样分？</p>`,
        exam: `<p>这是考察架构思维的核心题。能说清“依赖单向、上层不关心硬件细节”“BSP 是板级适配、HAL 是芯片级抽象”“分层是为了换硬件不改业务”，并且能举出自己项目的例子，就很扎实。</p>`,
        core: `<p>分层是应用、服务、驱动、HAL/BSP，依赖只能从上到下；HAL 屏蔽同系列芯片差异，BSP 描述具体板子的引脚和器件，换板只改 BSP。</p>`,
        answer: `<p>我一般分四层：应用层、服务层、驱动层、硬件抽象层。</p>
<p>应用层只写业务逻辑，比如“温度超过阈值就报警”，不关心温度是从 I2C 还是 ADC 来的。服务层提供可复用的能力，比如滤波、协议解析、事件分发、参数存储。驱动层实现具体器件或外设的操作，比如 OLED 的页地址命令、传感器的寄存器读写。硬件抽象层（HAL/BSP）封装 MCU 的寄存器操作，提供 GPIO_Set、I2C_Transfer 这类接口。</p>
<p>BSP 和 HAL 的区别在于粒度：HAL 是芯片级的，屏蔽同一系列 MCU 的差异（比如 STM32F1 和 F4 的寄存器差异）；BSP 是板级的，描述这块板子上具体怎么接线、晶振多少、外设挂在哪个引脚。换一块板子，通常只改 BSP，HAL 和上层不动。</p>
<p>分层的关键是<strong>依赖单向</strong>：上层依赖下层的接口，下层不知道上层的存在。这样才能做到换硬件只改底层。</p>`,
        principle: `<p>分层的收益是可替换性和可测试性：驱动层可以在 PC 上用桩函数替代，应用逻辑可以脱离硬件跑单元测试；换传感器只需要新写一个驱动实现同一套接口。</p>
<p>代价是调用层次变深，有间接跳转开销，代码量也更大。所以对微秒级的中断路径，常常允许“跨层直接操作寄存器”，但要在代码里注释清楚原因，避免后来者误以为是设计失误。</p>`,
        fig: {
          type: "layers",
          title: "典型的四层架构",
          tag: "architecture",
          items: [
            { tag: "APP", t: "应用层", d: "业务逻辑：控制策略、状态流转、人机交互" },
            { tag: "SVC", t: "服务层", d: "滤波、协议、存储、事件总线、日志" },
            { tag: "DRV", t: "驱动层", d: "OLED、传感器、电机等具体器件" },
            { tag: "BSP", t: "HAL / BSP", d: "GPIO、I2C、SPI、时钟、中断" }
          ]
        },
        code: {
          lang: "c",
          title: "layered_app.c",
          src: `/* ---------- 第 4 层：HAL / BSP，封装 MCU 外设（这里直接借 ST 的 HAL 库） ---------- */
int bsp_i2c_write(uint8_t addr, const uint8_t *buf, uint16_t len)
{
    return HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(addr << 1),
                                   (uint8_t *)buf, len, 100);
}

int bsp_i2c_read(uint8_t addr, uint8_t *buf, uint16_t len)
{
    return HAL_I2C_Master_Receive(&hi2c1, (uint16_t)(addr << 1), buf, len, 100);
}

/* ---------- 第 3 层：驱动，只关心器件协议 ---------- */
int sht30_read(float *temp, float *humi)
{
    uint8_t cmd[2] = { 0x2C, 0x06 };        /* 高重复性测量命令 */
    uint8_t raw[6] = { 0 };

    if (bsp_i2c_write(SHT30_ADDR, cmd, 2) != 0) return -1;
    HAL_Delay(20);
    if (bsp_i2c_read(SHT30_ADDR, raw, 6) != 0) return -2;

    /* 器件手册的换算公式，属于驱动层的知识 */
    *temp = -45.0f + 175.0f * ((raw[0] << 8) | raw[1]) / 65535.0f;
    *humi = 100.0f * ((raw[3] << 8) | raw[4]) / 65535.0f;
    return 0;
}

/* ---------- 第 2 层：服务，提供通用能力 ---------- */
float temp_filtered(void)
{
    static ma_t f;
    float t, h;
    int16_t t10;                            /* 有符号，负温度不会回绕 */

    if (sht30_read(&t, &h) != 0) return NAN;   /* 读失败要往上抛，不能假装成功 */
    t10 = (int16_t)(t * 10.0f);
    return (float)ma_filter_i16(&f, t10) / 10.0f;
}

/* ---------- 第 1 层：应用，只有业务 ---------- */
void app_loop(void)
{
    float t = temp_filtered();

    if (t > ALARM_THRESHOLD) {
        Buzzer_On();                        /* 业务决策，不关心硬件细节 */
        Event_Post(EVT_TEMP_HIGH);
    }
}`
        },
        apply: `<p>实际项目里，我会把每层的头文件放在不同目录（<code>app/</code>、<code>service/</code>、<code>driver/</code>、<code>bsp/</code>），并在编译时检查“上层不能 include 下层的私有头文件”，用规则约束依赖方向，而不是靠自觉。</p>
<p>如果团队规模小、项目简单，三层甚至两层就够了。分层是为了控制复杂度，不是为了画图好看。</p>`,
        pitfalls: [
          "<b>应用层直接操作寄存器。</b>换芯片时业务代码全部要改，分层形同虚设。",
          "<b>驱动层包含业务逻辑。</b>比如在传感器驱动里判断“温度过高要报警”，导致驱动无法复用。",
          "<b>层数过多。</b>每层都只是转发调用，增加阅读成本和栈开销，收益却很小。"
        ],
        follow: [
          [
            "BSP 一般包含哪些内容？",
            "时钟初始化、引脚复用配置、外设句柄定义、板级外设（LED、按键、电源控制）的初始化，以及板子特有的时序延时。它描述“这块板子怎么工作”。"
          ],
          [
            "如何验证分层是否合理？",
            "试着换一个同类型的传感器或换一款 MCU，看需要改哪些文件。如果只改驱动或 BSP，说明分层有效；如果应用层也要改，说明依赖泄漏了。"
          ],
          [
            "分层会影响实时性吗？",
            "会增加函数调用和间接跳转开销，通常在几十个周期。对毫秒级任务无影响；对微秒级中断，可以把关键路径内联或直接操作寄存器。"
          ]
        ]
      },

      {
        id: "X-02",
        chapter: "design",
        topic: "fsm",
        title: "状态机怎么写才可维护？switch、表驱动、函数指针怎么选？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "状态机的三种实现方式、状态表设计，以及事件与状态分离的思想。",
        q: `<p>面试官：项目里的<strong>状态机</strong>你是怎么写的？switch-case、状态表、函数指针各有什么优缺点？状态多了怎么避免代码膨胀？</p>`,
        exam: `<p>考察结构化设计能力。能说清“switch 直观但状态多了难维护”“表驱动易扩展、便于工具生成”“函数指针把状态行为封装起来”，并且能说出“事件驱动 + 状态表”的组合，说明你写过可扩展的协议或业务流程。</p>`,
        core: `<p>状态机可用 switch-case、表驱动或函数指针；状态和事件多时用状态表加动作函数，外部只投事件，状态机内部决定转移。</p>`,
        answer: `<p>最简单的是 switch-case：外层 switch 状态，内层 switch 事件。直观、调试方便，但状态和事件一多，嵌套层级深、代码长，加一个状态要改好几处。</p>
<p>表驱动是把“状态 × 事件 → 动作 + 新状态”做成二维表，查表执行。优点是结构清晰、易于用工具生成、加状态只加一行；缺点是有查表开销，动作复杂时表里放不下。</p>
<p>函数指针是每个状态一个处理函数，函数内部根据事件做动作并返回下一个状态。它把状态的行为封装起来，代码分散但每个状态独立，适合状态多、行为复杂的场景。</p>
<p>实际项目我通常用“状态表 + 动作函数”的组合：表里存状态转移和动作函数指针，既清晰又灵活。关键是<strong>把事件和状态分离</strong>：外部只投递事件，状态机内部决定怎么响应。</p>`,
        principle: `<p>状态机的本质是“有限状态 + 转移规则”。它的价值在于把复杂的时间相关逻辑（比如“必须先连接才能发送”“重试三次后进入故障态”）显式表达出来，而不是散落在一堆 if-else 和标志位里。</p>
<p>设计时要先画状态图：有哪些状态、哪些事件、每个事件在某个状态下触发什么动作、跳到哪个状态。图画清楚了，代码只是翻译。</p>`,
        fig: {
          type: "table",
          title: "三种实现方式对比",
          tag: "compare",
          head: ["方式", "可读性", "扩展性", "开销", "适用场景"],
          rows: [
            ["switch-case", "高（状态少时）", "差", "最低", "3~5 个状态的简单流程"],
            ["状态表", "中", "好", "低（数组索引）", "状态和事件都较多"],
            ["函数指针", "中（分散）", "好", "一次间接调用", "状态行为复杂、差异大"],
            ["状态表 + 动作函数", "高", "很好", "低", "推荐，兼顾清晰与扩展"]
          ]
        },
        code: {
          lang: "c",
          title: "fsm_table.c",
          src: `#include <stdint.h>

/* 状态与事件枚举，顺序即表的索引 */
typedef enum { ST_IDLE, ST_CONNECTING, ST_ONLINE, ST_ERROR, ST_MAX } state_t;
typedef enum { EV_START, EV_CONNECTED, EV_TIMEOUT, EV_RESET, EV_MAX } event_t;

typedef struct fsm fsm_t;
typedef void (*action_t)(fsm_t *f);

typedef struct {
    state_t  next;      /* 下一个状态 */
    action_t action;    /* 要执行的动作，可为 NULL */
} transition_t;

struct fsm {
    state_t  state;
    uint8_t  retry;
    uint32_t timer;
};

static void do_connect(fsm_t *f)  { Net_Connect(); f->timer = 0; f->retry++; }
static void do_online(fsm_t *f)   { f->retry = 0; Led_Set(GREEN); }
static void do_error(fsm_t *f)    { Led_Set(RED); Log_Error(f->retry); }
static void do_reset(fsm_t *f)    { Net_Close(); f->retry = 0; f->state = ST_IDLE; }

/* 状态转移表：行是状态，列是事件 */
static const transition_t s_table[ST_MAX][EV_MAX] = {
    /* ST_IDLE */      { {ST_CONNECTING, do_connect}, {ST_IDLE, NULL}, {ST_IDLE, NULL}, {ST_IDLE, NULL} },
    /* ST_CONNECTING */{ {ST_CONNECTING, NULL}, {ST_ONLINE, do_online}, {ST_ERROR, do_error}, {ST_IDLE, do_reset} },
    /* ST_ONLINE */    { {ST_ONLINE, NULL}, {ST_ONLINE, NULL}, {ST_ERROR, do_error}, {ST_IDLE, do_reset} },
    /* ST_ERROR */     { {ST_CONNECTING, do_connect}, {ST_ERROR, NULL}, {ST_ERROR, NULL}, {ST_IDLE, do_reset} },
};

/* 投递事件：查表、执行动作、更新状态 */
void fsm_dispatch(fsm_t *f, event_t ev)
{
    if (ev >= EV_MAX || f->state >= ST_MAX) return;

    const transition_t *t = &s_table[f->state][ev];
    if (t->action) t->action(f);      /* 先执行动作，再更新状态 */
    if (t->next != f->state) {
        f->state = t->next;
    }
}

/* 定时驱动：超时事件 */
void fsm_tick(fsm_t *f, uint32_t elapsed_ms)
{
    f->timer += elapsed_ms;
    if (f->state == ST_CONNECTING && f->timer > 5000) {
        fsm_dispatch(f, EV_TIMEOUT);
    }
}`
        },
        codeNote: `<b>顺序很重要：</b>先执行动作再更新状态，还是反过来，取决于动作里是否需要读旧状态。约定清楚并写进注释，否则后来者很容易改错。`,
        apply: `<p>协议解析、按键处理、设备连接管理、充电流程、电机启停序列，都是状态机的典型场景。写之前先画状态图，能避免 80% 的逻辑漏洞。</p>
<p>状态机还可以和超时机制结合：每个状态记录进入时间，超时自动迁移到错误态，避免“卡在某个状态永远出不来”。</p>`,
        pitfalls: [
          "<b>状态里混入业务数据。</b>状态机只该管“当前处于什么阶段”，业务数据放独立结构体，否则状态爆炸。",
          "<b>事件处理不完整。</b>某个状态下收到未定义的事件没有处理，程序行为不确定。表里应该显式写出“忽略”。",
          "<b>没有超时机制。</b>等待应答的状态可能永远等下去，系统卡死。"
        ],
        follow: [
          [
            "层次状态机（HSM）是什么？",
            "状态可以嵌套，子状态继承父状态的公共处理。适合复杂系统（如 UML 状态图），能减少重复转移。实现比平面状态机复杂，简单项目不建议用。"
          ],
          [
            "状态机怎么和 RTOS 配合？",
            "通常一个任务跑一个状态机，事件通过队列投递，任务阻塞在队列上，收到事件后 dispatch。这样状态机不需要轮询，响应及时且不占 CPU。"
          ],
          [
            "如何测试状态机？",
            "遍历所有“状态 × 事件”组合，验证转移和动作；再构造时序场景（超时、乱序事件、重复事件），检查是否进入非法状态。表驱动的状态机很容易写自动化测试。"
          ]
        ]
      },

      {
        id: "X-03",
        chapter: "design",
        topic: "event",
        title: "事件驱动架构怎么设计？和轮询相比有什么优势？",
        diff: "中级",
        freq: "中频",
        type: "综合设计题",
        point: "事件定义、发布订阅、事件队列与分发，以及解耦收益。",
        q: `<p>面试官：什么是<strong>事件驱动</strong>架构？在你的项目里怎么落地？它和轮询相比有什么优缺点？事件多了会不会乱？</p>`,
        exam: `<p>考察架构抽象能力。能说清“事件是发生的事实、发布者不知道订阅者”“用队列解耦生产消费”“事件要有明确的生命周期和优先级”，说明你设计过模块间通信，而不是到处直接调用。</p>`,
        core: `<p>发布订阅是发布者发事件、订阅者按兴趣处理，彼此不直接依赖；落地是事件队列加分发循环，能解耦模块但调试时要靠日志追踪。</p>`,
        answer: `<p>事件驱动的核心是“谁发生了什么就发一个事件，谁关心就订阅”，发布者和订阅者互不知道对方存在。比如按键模块只负责发“按键按下”事件，菜单模块、背光模块各自订阅处理。</p>
<p>落地方式通常是一个事件队列 + 一个分发循环：中断或任务把事件投递到队列，事件任务从队列取出，按类型分发给注册的处理函数。</p>
<p>相比轮询，事件驱动的优势是按需处理、响应及时、CPU 占用低；模块之间通过事件解耦，加一个新功能只需订阅事件，不用改原有代码。缺点是事件流不直观，调试时不容易看出“谁触发了谁”，事件太多还可能导致队列溢出。</p>
<p>为了避免混乱，我会给事件定义清晰的分类和优先级，关键事件走高优先级队列，日志类事件可以丢弃；同时限制单个事件的处理时间，耗时操作再投递新事件。</p>`,
        principle: `<p>事件驱动本质上是“控制反转”：不是主循环去问每个模块“你有没有事”，而是模块主动报告。它把“什么时候做”从调用方转移到了事件产生方，降低了模块间的时序耦合。</p>
<p>事件队列是有界的，必须有溢出策略：丢弃最旧、丢弃最新、或者按优先级丢弃。没有策略的队列在压力下会静默丢事件，表现为“偶尔少响应一次”。</p>`,
        fig: {
          type: "flow",
          title: "事件的产生与分发",
          tag: "event bus",
          items: [
            { t: "中断/任务", d: "产生事件" },
            { t: "事件队列", d: "缓冲与排序" },
            { t: "分发器", d: "按类型查找" },
            { t: "订阅者 A", d: "业务处理" },
            { t: "订阅者 B", d: "独立处理" }
          ]
        },
        code: {
          lang: "c",
          title: "event_bus.c",
          src: `#include <stdint.h>
#include <string.h>

#define EVT_QUEUE_SIZE 32
#define EVT_MAX_HANDLER 8

typedef enum {
    EVT_KEY_PRESS = 0,
    EVT_TEMP_HIGH,
    EVT_UART_FRAME,
    EVT_TIMER_TICK,
    EVT_MAX
} event_type_t;

typedef struct {
    event_type_t type;
    uint32_t     param;
} event_t;

typedef void (*evt_handler_t)(const event_t *e);

static event_t       s_queue[EVT_QUEUE_SIZE];
static volatile uint8_t s_head, s_tail;
static evt_handler_t s_handlers[EVT_MAX][EVT_MAX_HANDLER];
static uint8_t       s_handler_cnt[EVT_MAX];

/* 订阅：同一事件可以有多个处理者 */
int Event_Subscribe(event_type_t type, evt_handler_t h)
{
    if (type >= EVT_MAX || s_handler_cnt[type] >= EVT_MAX_HANDLER) return -1;
    s_handlers[type][s_handler_cnt[type]++] = h;
    return 0;
}

/* 发布：可在中断里调用，只入队不处理 */
int Event_Post(event_type_t type, uint32_t param)
{
    uint8_t next = (uint8_t)((s_tail + 1) % EVT_QUEUE_SIZE);
    if (next == s_head) return -1;          /* 队列满：调用方决定丢弃策略 */

    s_queue[s_tail].type  = type;
    s_queue[s_tail].param = param;
    s_tail = next;
    return 0;
}

/* 分发：在事件任务里循环调用，处理时间要短 */
void Event_Process(void)
{
    while (s_head != s_tail) {
        event_t e = s_queue[s_head];
        s_head = (uint8_t)((s_head + 1) % EVT_QUEUE_SIZE);

        for (uint8_t i = 0; i < s_handler_cnt[e.type]; i++) {
            if (s_handlers[e.type][i]) {
                s_handlers[e.type][i](&e);
            }
        }
    }
}

/* 应用初始化：各模块自己订阅，互不依赖 */
void app_init(void)
{
    Event_Subscribe(EVT_KEY_PRESS, Menu_OnKey);
    Event_Subscribe(EVT_KEY_PRESS, Backlight_OnKey);   /* 同一事件两个订阅者 */
    Event_Subscribe(EVT_TEMP_HIGH, Fan_OnTempHigh);
}`
        },
        apply: `<p>实际项目里，事件驱动特别适合“输入 → 业务 → 输出”分离的系统：按键、传感器、通信都是事件源，显示、执行器、日志是订阅者。加一个“上报云端”功能，只需订阅相关事件，不用改任何现有模块。</p>
<p>事件命名要表达“发生了什么”，而不是“要做什么”。<code>EVT_KEY_PRESS</code> 是事件，<code>CMD_SHOW_MENU</code> 是命令，两者不要混在一起。</p>`,
        pitfalls: [
          "<b>在事件处理里做耗时操作。</b>阻塞分发循环，后续事件全部延迟，队列很快溢出。",
          "<b>事件没有溢出策略。</b>压力大时静默丢事件，表现为“偶尔不响应”，极难复现。",
          "<b>事件和命令混用。</b>语义混乱，订阅者不知道该“响应”还是“执行”，架构会越用越乱。"
        ],
        follow: [
          [
            "事件和消息队列有什么区别？",
            "消息队列是传输机制，事件是语义概念。可以用队列传事件，也可以用回调、信号量传。事件通常更轻量（类型 + 少量参数），消息可以是任意数据结构。"
          ],
          [
            "如何避免事件风暴？",
            "对高频事件做合并（比如 100ms 内的多次按键只处理一次）、限制事件产生速率、给事件分优先级并丢弃低优先级事件。"
          ],
          [
            "事件驱动怎么调试？",
            "在分发器里打日志（事件类型、时间戳、订阅者），或者用 GPIO 翻转配合逻辑分析仪观察事件时序。关键是能还原“谁在什么时候发了什么”。"
          ]
        ]
      },

      {
        id: "X-04",
        chapter: "layer",
        topic: "interface",
        title: "模块之间怎么解耦？不透明指针和回调怎么用？",
        diff: "中级",
        freq: "中频",
        type: "代码分析题",
        point: "头文件暴露最小信息、不透明指针隐藏实现、回调反转依赖方向。",
        q: `<p>面试官：两个模块互相调用，怎么<strong>解耦</strong>？什么是<strong>不透明指针</strong>？回调函数如何反转依赖方向？</p>`,
        exam: `<p>考察 C 语言的工程化能力。能说清“头文件只放必要声明、结构体定义放 .c、通过函数指针注册回调”，并且能举出“底层不 include 上层头文件”的例子，说明你写过可复用的模块。</p>`,
        core: `<p>头文件只暴露必要声明，结构体成员和内部函数放 .c，调用者只能通过不透明指针操作；回调让底层注册上层函数，把依赖方向反过来。</p>`,
        answer: `<p>解耦的第一原则是<strong>最小暴露</strong>：头文件里只放调用者必须知道的声明，结构体成员、内部函数、私有宏都放在 .c 里。这样调用者无法依赖内部细节，实现可以自由修改。</p>
<p>不透明指针就是这一原则的体现：头文件里只写 <code>typedef struct sensor sensor_t;</code>，不定义成员；调用者只能拿到指针，通过接口函数操作。它相当于 C 语言的“私有成员”。</p>
<p>回调解决的是<strong>反向依赖</strong>：底层模块需要通知上层，但不应该 include 上层的头文件。做法是底层提供一个注册接口，上层把自己的函数指针传进来，底层在合适的时机调用。依赖方向从“底层依赖上层”变成“上层依赖底层的接口”。</p>`,
        principle: `<p>模块解耦的本质是控制“编译期依赖”。如果 A 的头文件 include 了 B 的头文件，那么 B 的任何改动都会导致 A 重新编译，甚至编译失败。减少头文件依赖，就减少了变更的传播范围。</p>
<p>不透明指针还有一个好处是二进制兼容：只要接口不变，结构体内部怎么改都不影响调用者，动态库升级不需要重新编译上层。</p>`,
        fig: {
          type: "layers",
          title: "依赖反转前后的对比",
          tag: "dependency",
          items: [
            { tag: "BEFORE", t: "底层 → 上层（直接调用）", d: "底层 include 上层头文件，无法复用" },
            { tag: "AFTER", t: "上层 → 底层（注册回调）", d: "底层只依赖回调类型，可独立复用" }
          ]
        },
        code: {
          lang: "c",
          title: "opaque_ptr.c",
          src: `/* ---------- sensor.h：调用者只能看到这些 ---------- */
#ifndef SENSOR_H
#define SENSOR_H

typedef struct sensor sensor_t;          /* 不透明：成员不可见 */

/* 回调类型：数据就绪时通知上层 */
typedef void (*sensor_cb_t)(float value, void *ctx);

sensor_t *sensor_open(const char *name);
int       sensor_start(sensor_t *s, sensor_cb_t cb, void *ctx);
void      sensor_close(sensor_t *s);

#endif

/* ---------- sensor.c：实现细节全部私有 ---------- */
#include "sensor.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

struct sensor {                          /* 只有本文件知道长什么样 */
    char        name[16];
    sensor_cb_t cb;
    void       *ctx;
    uint8_t     running;
};

sensor_t *sensor_open(const char *name)
{
    sensor_t *s = calloc(1, sizeof(*s));
    if (!s) return NULL;
    strncpy(s->name, name, sizeof(s->name) - 1);
    return s;
}

int sensor_start(sensor_t *s, sensor_cb_t cb, void *ctx)
{
    if (!s || !cb) return -1;
    s->cb = cb;
    s->ctx = ctx;
    s->running = 1;
    return 0;
}

/* 内部中断里调用回调，底层完全不认识上层 */
static void on_sample_isr(sensor_t *s, float v)
{
    if (s->running && s->cb) {
        s->cb(v, s->ctx);                /* 依赖反转的关键一行 */
    }
}

void sensor_close(sensor_t *s)
{
    free(s);
}`
        },
        apply: `<p>实际项目里，这种模式可以用在：传感器驱动通知业务层、通信模块通知协议层、定时器通知各个需要周期的模块。注册回调时多带一个 <code>ctx</code> 指针，可以传实例或上下文，避免用全局变量。</p>
<p>注意回调的上下文：如果回调在中断里执行，上层不能做耗时操作，最好只投递事件或信号量。</p>`,
        pitfalls: [
          "<b>头文件里定义结构体成员。</b>调用者直接访问字段，实现细节被焊死，改内部结构就要改所有调用方。",
          "<b>回调里做阻塞操作。</b>如果回调在中断上下文，会拖垮整个中断响应。",
          "<b>回调指针不判空。</b>未注册时直接调用，跳到非法地址，HardFault 且难定位。"
        ],
        follow: [
          [
            "不透明指针怎么分配内存？",
            "在 <code>open</code> 里分配（malloc 或静态池），返回指针；调用者不关心大小，也不应该自己 <code>sizeof</code>。配套提供 <code>close</code> 释放。"
          ],
          [
            "如何减少头文件依赖？",
            "用前向声明代替 include（<code>struct foo;</code>），只在需要完整类型的地方 include；把实现相关的头文件移到 .c；用 pimpl 式的指针成员。"
          ],
          [
            "C 语言能实现面向对象吗？",
            "可以。用结构体存数据、函数指针存方法、不透明指针实现封装、ops 表实现多态。Linux 内核就是大规模用 C 实现面向对象设计的例子。"
          ]
        ]
      },

      {
        id: "X-05",
        chapter: "quality",
        topic: "protect",
        title: "多任务共享数据怎么保护？临界区、原子操作、无锁怎么选？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "竞态的本质、保护手段的粒度与开销，以及无锁设计的适用条件。",
        q: `<p>面试官：两个任务都要读写同一个<strong>全局结构体</strong>，你怎么保证数据一致？关中断、互斥锁、原子操作、双缓冲分别适合什么场景？</p>`,
        exam: `<p>考察并发编程的实战能力。能说清“竞态来自读改写不是原子”“关中断最硬但影响实时性”“双缓冲可以做到读者无锁”，说明你处理过真实的并发问题。</p>`,
        core: `<p>竞态来自多任务同时读改写；短操作关中断或用原子指令，长操作加互斥锁，读多写少可用双缓冲，但双缓冲切换瞬间仍可能读到新旧混合。</p>`,
        answer: `<p>首先要明确竞态发生在哪里：如果只是单个对齐变量的读写，在 32 位 MCU 上通常是原子的；但 <code>i++</code> 是读—改—写三步，中间被打断就会丢更新；如果是结构体的多个字段，必须整体保护，否则读者可能看到“改了一半”的状态。</p>
<p>保护手段按开销从低到高：</p>
<p><strong>原子操作</strong>：Cortex-M3 以上支持 LDREX/STREX，或者用 <code>__atomic</code> 内建函数，适合单个计数器、标志位。</p>
<p><strong>关中断/临界区</strong>：最简单可靠，适合几微秒内能完成的短操作，但会延迟中断响应。</p>
<p><strong>互斥锁</strong>：适合可能较长的操作，支持阻塞和优先级继承，但有获取失败和死锁风险。</p>
<p><strong>双缓冲/消息传递</strong>：写入方先更新备用缓冲区，完成后原子切换索引，读取方只读当前索引对应的那一块，因此不会读到“写了一半”的字段，读者也无需加锁。但两块缓冲并不等于绝对一致——如果写者在读者拷贝期间又切回同一块，仍可能拿到新旧混合的值；要严格保证一致，需要 3 块以上缓冲加序号校验（读完比对序号，变了就重读）。适合数据量大、读多写少的场景。</p>`,
        principle: `<p>无锁的前提是“单生产者单消费者 + 原子指针切换 + 内存屏障”。写入方先填好备用缓冲区，再用一条原子指令切换指针；读取方读指针，拿到的要么是旧缓冲要么是新缓冲，都是完整的。旧缓冲要等读者用完才能复用，通常用引用计数或双缓冲交替。</p>
<p>内存屏障不能省：编译器或 CPU 可能把“填数据”和“切指针”重排，导致读者看到指针已切换但数据还没写完。ARM 上用 <code>__DMB()</code> 保证顺序。</p>`,
        fig: {
          type: "table",
          title: "保护手段对比",
          tag: "compare",
          head: ["手段", "开销", "适用数据量", "风险"],
          rows: [
            ["原子操作", "极低", "单个变量", "只保证单步原子"],
            ["关中断", "低（几 us）", "少量变量", "影响中断响应"],
            ["互斥锁", "中", "任意", "死锁、优先级反转"],
            ["双缓冲", "低（读者无锁）", "大块数据", "需要内存翻倍"],
            ["消息队列", "中（拷贝）", "中等数据", "队列满需处理"]
          ]
        },
        code: {
          lang: "c",
          title: "share_data.c",
          src: `#include <stdint.h>

/* ---------- 方案 1：单变量用原子操作 ---------- */
static volatile uint32_t s_counter;

void counter_inc(void)
{
    /* Cortex-M3+ 编译为 LDREX/STREX，无需关中断 */
    __atomic_add_fetch(&s_counter, 1, __ATOMIC_SEQ_CST);
}

/* ---------- 方案 2：结构体用临界区 ---------- */
typedef struct {
    int16_t  temperature;
    uint16_t humidity;
    uint32_t timestamp;
} env_data_t;

static env_data_t s_env;

void env_update(int16_t t, uint16_t h, uint32_t ts)
{
    /* 三个字段必须一起更新，读者不能看到中间状态。
     * 先存 PRIMASK、退出时再恢复：从 ISR 或外层临界区里调用也不会提前开中断 */
    uint32_t pm = __get_PRIMASK();
    __disable_irq();
    s_env.temperature = t;
    s_env.humidity    = h;
    s_env.timestamp   = ts;
    __set_PRIMASK(pm);
}

/* ---------- 方案 3：双缓冲，读者不加锁（写周期远长于读拷贝时间时才安全） ---------- */
static env_data_t s_buf[2];
static volatile uint8_t s_active;        /* 当前可读的缓冲区索引 */

void env_update_double(int16_t t, uint16_t h, uint32_t ts)
{
    uint8_t next = (uint8_t)(s_active ^ 1);   /* 写另一块 */

    s_buf[next].temperature = t;
    s_buf[next].humidity    = h;
    s_buf[next].timestamp   = ts;

    __DMB();                                  /* 保证数据先于索引可见 */
    s_active = next;                          /* 一条字节写入，原子切换 */
}

env_data_t env_get_snapshot(void)
{
    uint8_t idx = s_active;                   /* 读一次索引，之后只操作这一块 */
    return s_buf[idx];
    /* 注意：这里只保证“不会读到半个字段”，并不保证跨两轮更新的一致性。
     * 若写者在拷贝期间又切回同一块缓冲区，仍可能读到撕裂的混合值；
     * 严格的无锁读需要 3 块以上缓冲 + 序号校验（读后比对序号，变了就重读）。 */
}`
        },
        apply: `<p>选择原则：能用“消息传递”就不用“共享内存”，从根上消除竞态；必须共享时，优先缩小临界区，只保护真正的读写，不要把计算也放进去。</p>
<p>调试竞态问题的技巧：在临界区入口翻转一个 GPIO，用逻辑分析仪看它和中断的时间关系，能直观看出是否被打断。</p>`,
        pitfalls: [
          "<b>只保护写不保护读。</b>读者可能读到写了一半的结构体，字段之间不自洽。读写都要在同一个保护机制下。",
          "<b>临界区里调用可能阻塞的函数。</b>关中断期间调用 HAL_Delay 或 printf，系统直接卡死。",
          "<b>以为 volatile 能解决竞态。</b>它只防止编译器优化，不保证原子性和顺序，多任务下依然会丢更新。"
        ],
        follow: [
          [
            "什么是 ABA 问题？",
            "无锁编程中，变量从 A 变成 B 又变回 A，CAS 操作无法察觉中间变化，可能导致逻辑错误。解决方法是加版本号或使用更宽的原子类型。"
          ],
          [
            "关中断和关调度器有什么区别？",
            "关中断屏蔽中断，影响所有中断响应；挂起调度器只禁止任务切换，中断仍然响应。后者对实时性影响小，但不能保护与中断共享的数据。"
          ],
          [
            "如何发现数据竞态？",
            "静态分析工具（如 ThreadSanitizer，虽然主要用于 PC）、代码评审时逐个检查共享变量、压力测试下观察异常。嵌入式上还可以在临界区加断言，检测是否被重入。"
          ]
        ]
      },

      {
        id: "X-06",
        chapter: "quality",
        topic: "port",
        title: "如何写出可移植的嵌入式代码？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "抽象层、条件编译、数据类型与字节序，以及可移植性的成本边界。",
        q: `<p>面试官：同一套业务代码要跑在 STM32、GD32 和 Linux 上，你会怎么设计？<strong>可移植性</strong>要付出什么代价？哪些地方不该追求可移植？</p>`,
        exam: `<p>考察工程权衡能力。能说清“抽象硬件接口、统一数据类型、隔离编译器差异、用构建系统切换平台”，并且知道“不是所有代码都值得可移植”，说明你有分寸感。</p>`,
        core: `<p>可移植性靠把 GPIO、延时、存储等硬件操作封装成统一接口，用 stdint.h 定长类型，编译器差异放 compiler.h；启动文件和时钟配置不必强行抽象。</p>`,
        answer: `<p>核心思路是<strong>把不可移植的部分集中隔离</strong>：硬件相关的操作（GPIO、延时、中断、存储）封装成一组接口，每个平台提供一份实现；业务代码只调用接口，不直接碰寄存器。</p>
<p>数据类型上，用 <code>stdint.h</code> 的定长类型（<code>uint8_t</code>、<code>int32_t</code>），不用 <code>int</code>、<code>long</code> 这种宽度随平台变化的类型；涉及跨设备传输时显式处理字节序。</p>
<p>编译器差异用宏隔离：<code>__packed</code>、<code>__weak</code>、<code>__attribute__</code> 这些在不同编译器上写法不同，统一在 <code>compiler.h</code> 里定义。平台差异用条件编译或构建系统切换实现文件，而不是在业务代码里到处 <code>#ifdef</code>。</p>
<p>代价是多一层抽象、多一点代码量、调试时多跳一层。所以不是所有代码都值得可移植：启动文件、时钟配置、中断向量这些天然与芯片绑定，强行抽象反而增加复杂度。</p>`,
        principle: `<p>可移植性的本质是“依赖倒置”：业务代码依赖抽象接口，具体平台实现接口。接口设计要足够稳定，否则每次换平台都要改接口，移植成本反而更高。</p>
<p>条件编译的滥用是可移植性的反面：如果业务代码里到处是 <code>#ifdef STM32</code>，说明抽象没做好，换平台时依然要改业务代码。</p>`,
        fig: {
          type: "layers",
          title: "可移植代码的分层",
          tag: "portability",
          items: [
            { tag: "PORT", t: "业务代码", d: "只依赖 hal.h 定义的接口" },
            { tag: "IF", t: "抽象接口 hal.h", d: "gpio_write / delay_ms / flash_read" },
            { tag: "IMPL", t: "平台实现", d: "stm32_hal.c / linux_hal.c" },
            { tag: "HW", t: "硬件", d: "寄存器、系统调用" }
          ]
        },
        code: {
          lang: "c",
          title: "portable_hal.c",
          src: `/* ---------- hal.h：唯一被业务代码包含的头文件 ---------- */
#ifndef HAL_H
#define HAL_H

#include <stdint.h>

/* 统一的数据类型和接口，不暴露任何平台细节 */
typedef enum { HAL_OK = 0, HAL_ERR = -1 } hal_status_t;

hal_status_t hal_gpio_write(uint8_t pin, uint8_t level);
hal_status_t hal_gpio_read(uint8_t pin, uint8_t *level);
void         hal_delay_ms(uint32_t ms);
uint32_t     hal_get_tick(void);

#endif

/* ---------- 编译器差异集中在这里 ---------- */
#ifndef COMPILER_H
#define COMPILER_H

#if defined(__GNUC__)
  #define PACKED        __attribute__((packed))
  #define WEAK          __attribute__((weak))
  #define INLINE        static inline
  #define SECTION(x)    __attribute__((section(x)))
#elif defined(__CC_ARM)
  #define PACKED        __packed
  #define WEAK          __weak
  #define INLINE        static __inline
  #define SECTION(x)    __attribute__((section(x)))
#else
  #define PACKED
  #define WEAK
  #define INLINE        static inline
  #define SECTION(x)
#endif

#endif

/* ---------- 业务代码：完全不知道底层是什么平台 ---------- */
#include "hal.h"

void led_blink(uint8_t pin, uint32_t period_ms)
{
    hal_gpio_write(pin, 1);
    hal_delay_ms(period_ms);
    hal_gpio_write(pin, 0);
    hal_delay_ms(period_ms);
}`
        },
        apply: `<p>工程上用构建系统切换实现：Makefile 里根据 <code>PLATFORM=stm32</code> 或 <code>PLATFORM=linux</code> 选择不同的源文件目录，业务代码的编译选项完全一样。</p>
<p>如果只是同一颗芯片的不同板子，用 BSP 隔离即可；如果跨芯片系列，抽象层要更厚一些；如果跨到 Linux，还要考虑系统调用、文件 IO、线程模型的差异，抽象层要重新设计。</p>`,
        pitfalls: [
          "<b>在业务代码里写 <code>#ifdef STM32</code>。</b>看似可移植，实际每换一个平台都要改业务代码，抽象失败。",
          "<b>用 <code>int</code> 存协议字段。</b>在 16 位平台上只有 2 字节，跨平台数据就错了。协议字段必须用定长类型。",
          "<b>过度抽象。</b>把每个寄存器操作都包一层函数，代码量翻倍、性能下降，收益却很小。"
        ],
        follow: [
          [
            "如何保证不同平台的延时一致？",
            "用硬件定时器或系统节拍实现 <code>hal_delay_ms</code>，不要用空循环。空循环的耗时随主频和编译器优化变化，跨平台必然不准。"
          ],
          [
            "字节序问题怎么处理？",
            "协议层统一用大端，收发时用 <code>put_u16_be</code>/<code>get_u16_be</code> 手工序列化，不依赖平台字节序。这样代码在大小端平台上都能正确工作。"
          ],
          [
            "可移植性和性能冲突时怎么选？",
            "热点路径可以绕过抽象层直接操作硬件，但要在注释里说明原因，并把这部分代码集中管理，方便移植时重点检查。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("software-architecture", {
    chapters: [
      {
        id: "design",
        topics: [
          { id: "bus", title: "消息总线与发布订阅" },
          { id: "error", title: "错误码设计" }
        ]
      },
      {
        id: "quality",
        topics: [
          { id: "log", title: "日志系统" },
          { id: "test", title: "单元测试" },
          { id: "static", title: "静态分析" },
          { id: "config", title: "配置管理" },
          { id: "api", title: "API 版本兼容" },
          { id: "recover", title: "自恢复架构" }
        ]
      }
    ],
    questions: [
      {
        id: "X-07",
        chapter: "design",
        topic: "bus",
        title: "消息总线/发布订阅模式在嵌入式里怎么实现？有什么代价？",
        diff: "高级",
        freq: "中频",
        type: "架构设计题",
        point: "用主题+订阅表解耦模块，发布者不关心谁消费；代价是间接性、内存和调试复杂度。",
        q: `<p>面试官：多个模块要互相通知状态变化，直接互相调用太乱，消息总线怎么设计？</p>`,
        exam: `<p>考察解耦设计能力。能说出“主题、订阅表、异步投递”，并指出它带来的调试和内存代价，就很好。</p>`,
        core: `<p>事件总线是 topic 加处理函数注册表，发布时查表回调；好处是发布者和订阅者解耦，代价是间接、占 RAM、调试难，模块卸载要反注册。</p>`,
        answer: `<p><b>基本结构：</b></p>
<ul>
<li><b>主题（Topic）</b>：用枚举或字符串标识事件类型；</li>
<li><b>订阅表</b>：用一张扁平表记录 <code>(topic, handler)</code> 对，模块启动时注册；发布时线性扫描整张表，把事件投给 topic 匹配的回调。订阅数不多时这种 O(n) 扫描最简单，也比“每个主题一条链表”更省 RAM。主题多了再改成按主题分桶或哈希索引；</li>
<li><b>发布</b>：模块产生事件时调用 <code>bus_publish(topic, data, len)</code>，总线遍历订阅者并投递；</li>
<li><b>投递方式</b>：可以同步回调（简单，但发布者被订阅者阻塞），也可以放入队列异步处理（解耦更彻底）。</li>
</ul>
<p><b>好处：</b>发布者不需要知道谁关心，新增订阅者不用改发布代码；模块之间只依赖总线接口，不互相包含头文件。</p>
<p><b>代价：</b></p>
<ul>
<li><b>间接性</b>：看代码不容易追踪“谁会处理这个事件”，调试需要日志辅助；</li>
<li><b>内存</b>：订阅表、事件队列占用 RAM；</li>
<li><b>时序</b>：异步投递会引入延迟，事件顺序需要保证；</li>
<li><b>生命周期</b>：模块卸载时必须反注册，否则回调指向已释放的内存。</li>
</ul>
<p><b>适用场景：</b>模块较多、交互关系复杂、需要动态增减订阅者的系统。简单项目直接调用更清晰，不要为了“架构感”引入总线。</p>`,
        principle: `<p>发布订阅把“谁通知谁”的硬编码关系变成运行时的注册关系，降低了模块间的编译期依赖。这是观察者模式在系统层的应用。</p>
<p>同步回调实现简单但耦合执行时间；异步队列解耦彻底但需要处理队列满、事件丢失和顺序问题。</p>`,
        fig: {
          type: "layers",
          title: "消息总线的结构",
          tag: "event bus",
          items: [
            { tag: "发布者", t: "传感器 / 通信 / 按键", d: "只调用 bus_publish" },
            { tag: "总线", t: "主题表 + 订阅者列表", d: "分发事件，不关心业务" },
            { tag: "订阅者", t: "显示 / 存储 / 云同步", d: "注册回调，处理关心的事件" },
            { tag: "队列", t: "异步投递（可选）", d: "解耦执行时间" }
          ]
        },
        code: {
          lang: "c",
          title: "event_bus.c",
          src: `#include <stdint.h>
#include <string.h>

#define BUS_MAX_TOPICS   16
#define BUS_MAX_SUBS     8

typedef void (*bus_handler_t)(uint32_t topic, const void *data, uint16_t len);

typedef struct {
    uint32_t      topic;
    bus_handler_t handler;
} subscription_t;

static subscription_t subs[BUS_MAX_SUBS];
static uint8_t sub_count;

int bus_subscribe(uint32_t topic, bus_handler_t h)
{
    if (sub_count >= BUS_MAX_SUBS) return -1;
    subs[sub_count].topic = topic;
    subs[sub_count].handler = h;
    sub_count++;
    return 0;
}

void bus_publish(uint32_t topic, const void *data, uint16_t len)
{
    for (uint8_t i = 0; i < sub_count; i++) {
        if (subs[i].topic == topic) {
            subs[i].handler(topic, data, len);
        }
    }
}`
        },
        codeNote: "同步回调里不要做耗时操作，否则会阻塞发布者；耗时处理应转投队列或置标志。",
        apply: `<p>我做多模块设备时，用总线传递“网络状态变化”“传感器就绪”“故障告警”这类事件，显示、日志、云同步各自订阅，互不依赖。</p>
<p>为了可调试，我给每个主题加了名字表，发布时可以按需打印主题名和订阅者数量。</p>`,
        pitfalls: [
          "<b>同步回调里做耗时操作。</b>发布者被拖慢。",
          "<b>订阅者释放后不反注册。</b>回调野指针。",
          "<b>事件队列太小。</b>高峰期丢事件。",
          "<b>滥用总线。</b>简单调用关系被搞得难以追踪。"
        ],
        follow: [
          ["同步总线和异步总线怎么选？", "同步实现简单、时序确定，但耦合执行时间；异步解耦彻底，但要处理队列、顺序和丢失，适合跨任务/跨中断场景。"],
          ["如何避免事件丢失？", "增大队列、提高消费者优先级、对关键事件做确认和重传，或改用共享状态加标志位。" ]
        ]
      },

      {
        id: "X-08",
        chapter: "design",
        topic: "error",
        title: "嵌入式错误码怎么设计？返回值和全局错误码哪个好？",
        diff: "中级",
        freq: "中频",
        type: "接口设计题",
        point: "用统一错误码枚举、函数返回错误码、输出参数传结果；避免用全局 errno 和魔法数字。",
        q: `<p>面试官：驱动函数失败时怎么告诉调用者原因？直接返回 -1 行不行？</p>`,
        exam: `<p>考察接口设计习惯。能说出“错误码枚举、分层错误码、返回值与输出参数分离”，就很好。</p>`,
        core: `<p>返回 -1 说不清失败原因，应定义统一错误码并用输出参数带回结果；谁分配谁释放，失败路径统一 goto cleanup，每个调用都检查返回值。</p>`,
        answer: `<p><b>返回 -1 的问题：</b>调用者只知道失败，不知道是参数错误、超时、忙还是硬件故障，无法做针对性处理，日志里也看不出原因。</p>
<p><b>推荐做法：</b></p>
<ul>
<li>定义统一的错误码枚举：<code>OK / EINVAL / ETIMEDOUT / EBUSY / EIO / ENOMEM</code>；</li>
<li>函数返回错误码，结果通过输出参数（指针）带回；</li>
<li>错误码分层：底层驱动错误码 + 模块错误码，避免冲突；</li>
<li>提供 <code>err_to_str()</code> 把错误码转成字符串，方便日志；</li>
<li>关键路径记录错误发生的文件、行号、参数。</li>
</ul>
<p><b>不要用全局 errno：</b>多任务环境下全局变量会被覆盖，且容易被忽略；显式返回值更清晰。</p>
<p><b>错误处理原则：</b>谁分配谁释放、失败路径统一 goto cleanup、每个可能失败的调用都检查返回值。嵌入式没有异常机制，错误码是唯一的传播手段。</p>`,
        principle: `<p>错误码是函数契约的一部分，调用者需要根据错误类型决定重试、降级还是上报。粒度太粗（-1）会丢失信息，粒度太细（每个函数一个码）会增加维护成本。</p>
<p>输出参数 + 返回值的模式把“是否成功”和“结果数据”分开，避免用特殊值（如 -1、NULL）表示错误导致的歧义。</p>`,
        fig: {
          type: "table",
          title: "常见错误码设计",
          tag: "error code",
          head: ["错误码", "含义", "调用者动作"],
          rows: [
            ["OK", "成功", "继续"],
            ["EINVAL", "参数非法", "修正参数，不重试"],
            ["ETIMEDOUT", "超时", "可重试"],
            ["EBUSY", "资源忙", "等待后重试"],
            ["EIO", "硬件/IO 错误", "上报、降级"],
            ["ENOMEM", "内存不足", "释放资源后重试"]
          ]
        },
        code: {
          lang: "c",
          title: "error_code.c",
          src: `#include <stdint.h>

typedef enum {
    ERR_OK = 0,
    ERR_INVAL = -1,
    ERR_TIMEOUT = -2,
    ERR_BUSY = -3,
    ERR_IO = -4,
    ERR_NOMEM = -5,
    ERR_NOT_SUPPORT = -6
} err_t;

/* 返回值表示成功/失败，结果通过输出参数带回 */
err_t sensor_read(int id, int32_t *value)
{
    if (!value || id < 0) return ERR_INVAL;

    if (!sensor_is_ready(id)) return ERR_BUSY;

    if (!sensor_read_raw(id, value)) return ERR_IO;

    return ERR_OK;
}

const char *err_to_str(err_t e)
{
    switch (e) {
    case ERR_OK:          return "ok";
    case ERR_INVAL:       return "invalid argument";
    case ERR_TIMEOUT:     return "timeout";
    case ERR_BUSY:        return "busy";
    case ERR_IO:          return "io error";
    case ERR_NOMEM:       return "out of memory";
    case ERR_NOT_SUPPORT: return "not supported";
    default:              return "unknown";
    }
}`
        },
        codeNote: "错误码用负数还是正数要统一，避免与正常返回值混淆；枚举值一旦发布就不要改，保持兼容。",
        apply: `<p>我在项目里定义一套全局错误码，驱动层返回底层错误，服务层转换成业务错误，日志统一打印 <code>err_to_str()</code>，现场问题一眼能看出是超时还是参数错。</p>
<p>对可恢复错误（超时、忙）做有限重试，对不可恢复错误（参数非法、不支持）直接上报，不浪费 time。</p>`,
        pitfalls: [
          "<b>只返回 -1。</b>丢失错误原因，无法针对性处理。",
          "<b>用全局 errno。</b>多任务下被覆盖。",
          "<b>忽略返回值。</b>错误被静默吞掉，问题延迟暴露。",
          "<b>错误码随意增减。</b>与上位机/云端协议不兼容。"
        ],
        follow: [
          ["错误码和日志怎么配合？", "在错误发生点记录上下文（参数、状态、文件行号），向上返回简化错误码；日志负责详细，错误码负责决策。"],
          ["对外协议里的错误码要注意什么？", "一旦发布就不能随意改含义，新增错误码要向前兼容；文档要写清每个码的处理建议。" ]
        ]
      },

      {
        id: "X-09",
        chapter: "quality",
        topic: "log",
        title: "嵌入式日志系统怎么设计？分级、异步和存储要注意什么？",
        diff: "中级",
        freq: "高频",
        type: "工程实践题",
        point: "分级过滤、异步输出、环形缓冲、掉电保护；日志不能阻塞实时任务。",
        q: `<p>面试官：产品现场出问题，日志能帮大忙。日志系统怎么设计才既好用又不影响实时性？</p>`,
        exam: `<p>考察工程化思维。能说出“分级、异步、缓冲、限流、持久化”，并结合实时性约束，就很好。</p>`,
        core: `<p>日志分级并在生产环境只留 WARN 以上；业务线程格式化后入环形缓冲，后台任务负责输出，va_list 必须在生产者侧用完，缓冲满丢低级别日志。</p>`,
        answer: `<p><b>分级：</b>ERROR / WARN / INFO / DEBUG / TRACE，编译期和运行期都能过滤。量产固件默认只输出 WARN 以上，调试时再打开。</p>
<p><b>异步：</b>日志输出不能阻塞业务。做法是业务线程把日志<b>格式化成定长记录</b>放进环形缓冲区，后台任务只负责把字节发到串口/Flash/网络。注意可变参数的格式化必须发生在生产者一侧——<code>va_list</code> 在函数返回后就失效了，不能“先入队、后台再 vsnprintf”。缓冲区满时可以选择丢弃低级别日志或覆盖最旧日志。</p>
<p><b>格式化：</b>用轻量实现，避免 printf 的浮点和长字符串开销；时间戳用 tick 或 RTC，保证能还原事件顺序。</p>
<p><b>存储：</b></p>
<ul>
<li>串口输出：简单，但量产设备通常没有串口；</li>
<li>Flash 环形日志：掉电保存，容量有限，需要磨损均衡；</li>
<li>RAM 缓冲 + 异常时转存：正常时不写 Flash，崩溃时把最后一段日志保存下来。</li>
</ul>
<p><b>限流：</b>高频日志会拖慢系统，同一错误短时间内只记录一次，或做速率限制。</p>
<p><b>安全：</b>日志里不要打印密钥、密码等敏感信息。</p>`,
        principle: `<p>日志系统的核心矛盾是“信息量”和“开销”。异步和分级把开销控制在可接受范围，环形缓冲保证突发日志不会阻塞生产者。</p>
<p>掉电保存需要在关键点主动 flush，或者用非易失存储器；普通 RAM 日志在复位后就丢失了。</p>`,
        fig: {
          type: "layers",
          title: "日志系统的分层",
          tag: "logging",
          items: [
            { tag: "接口", t: "LOG_ERROR / LOG_INFO 宏", d: "编译期过滤、文件行号" },
            { tag: "缓冲", t: "环形队列", d: "生产者不阻塞" },
            { tag: "后台", t: "输出任务", d: "串口 / Flash / 网络" },
            { tag: "持久化", t: "Flash 环形日志", d: "掉电保存、磨损均衡" }
          ]
        },
        code: {
          lang: "c",
          title: "log.c",
          src: `#include <stdint.h>
#include <stdarg.h>

typedef enum {
    LOG_ERROR = 0,
    LOG_WARN,
    LOG_INFO,
    LOG_DEBUG
} log_level_t;

static log_level_t g_level = LOG_WARN;

/* 生产者：格式化成定长记录后入队，不做慢速输出、不阻塞 */
void log_write(log_level_t lv, const char *tag, const char *fmt, ...)
{
    if (lv > g_level) return;

    /* 1. 从环形缓冲分配一块定长记录（固定大小，避免动态分配） */
    /* 2. vsnprintf 把文本写进这块记录——格式化必须在这里完成，
     *    va_list 在函数返回后失效，留到后台任务再格式化是错的 */
    /* 3. 更新写指针，唤醒日志任务；后台只负责把记录输出到串口/Flash */
    (void)tag;
    (void)fmt;
}

#define LOG_E(tag, ...) log_write(LOG_ERROR, tag, __VA_ARGS__)
#define LOG_W(tag, ...) log_write(LOG_WARN,  tag, __VA_ARGS__)
#define LOG_I(tag, ...) log_write(LOG_INFO,  tag, __VA_ARGS__)

/* 后台任务：从队列取出并输出 */
void log_task(void *arg)
{
    for (;;) {
        /* 等待队列非空，取出条目，输出到串口或 Flash */
    }
}`
        },
        codeNote: "vsnprintf 有开销，但必须放在生产者侧完成——va_list 出了函数就失效，后台任务拿不到参数；后台只负责把已格式化的定长记录发出去。",
        apply: `<p>我做量产设备时，日志默认只记 WARN 以上，写入 Flash 环形区；设备重启后可以导出最近几千条日志，定位现场问题非常有效。</p>
<p>调试阶段通过串口命令临时打开 DEBUG，问题复现后再关掉，避免长期高频日志磨损 Flash。</p>`,
        pitfalls: [
          "<b>在中断里 printf。</b>阻塞、不可重入，可能死锁。",
          "<b>日志无限制输出。</b>拖慢系统，磨损 Flash。",
          "<b>缓冲区满直接丢弃。</b>关键错误日志丢失。",
          "<b>日志含敏感信息。</b>泄露密钥或用户数据。"
        ],
        follow: [
          ["Flash 日志怎么做磨损均衡？", "按扇区轮换写入，写满后擦除最旧的扇区；记录写指针和序号，读取时按序号排序。"],
          ["如何在崩溃时保存最后一段日志？", "日志常驻 RAM 环形缓冲，HardFault 处理里把缓冲区写入保留 Flash 区，重启后导出。" ]
        ]
      },

      {
        id: "X-10",
        chapter: "quality",
        topic: "test",
        title: "嵌入式代码怎么单元测试？没有硬件怎么跑？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "分层设计让业务逻辑脱离硬件，在 PC 上用 mock 替换驱动，用 Unity/CppUTest 跑测试。",
        q: `<p>面试官：嵌入式代码离不开硬件，怎么在 CI 里做自动化测试？</p>`,
        exam: `<p>考察测试意识和架构能力。能说出“硬件抽象 + mock + PC 编译”，就很好。</p>`,
        core: `<p>业务层不直接调 HAL，PC 上把驱动换成 mock 就能测纯逻辑；用 Unity/CMock 写断言、CI 每次提交跑，重点测协议解析、状态机和边界。</p>`,
        answer: `<p><b>前提是分层：</b>业务逻辑不能直接调用 HAL 或寄存器，要通过驱动接口。这样在 PC 上可以把驱动替换成 mock，测试纯逻辑。</p>
<p><b>做法：</b></p>
<ul>
<li>把服务层/业务层代码编译成 PC 可执行文件（用 GCC，不依赖 ARM 工具链）；</li>
<li>用函数指针、弱符号或链接替换，把硬件相关函数换成 mock；</li>
<li>用 Unity、CMock、CppUTest 等轻量框架写断言；</li>
<li>CI 里每次提交自动编译并运行测试；</li>
<li>硬件相关部分用 HIL（硬件在环）测试，或用仿真器。</li>
</ul>
<p><b>测试重点：</b>协议解析、状态机、错误处理、边界条件、环形缓冲区、CRC 等纯逻辑。这些最容易出 bug，也最容易测。</p>
<p><b>收益：</b>改代码后快速回归，不依赖硬件和人为操作；bug 在提交前发现，成本最低。</p>`,
        principle: `<p>可测试性是架构质量的体现：依赖越少、耦合越低，越容易隔离测试。如果代码到处直接操作寄存器，说明分层没做好。</p>
<p>mock 的本质是用可控的假实现替换真实依赖，让测试能构造各种边界和异常场景，而不需要真实硬件。</p>`,
        fig: {
          type: "layers",
          title: "在 PC 上测试嵌入式逻辑",
          tag: "unit test",
          items: [
            { tag: "测试用例", t: "Unity / CppUTest", d: "断言、用例组织" },
            { tag: "业务逻辑", t: "协议、状态机、算法", d: "不依赖硬件" },
            { tag: "接口层", t: "函数指针 / 弱符号", d: "可替换为 mock" },
            { tag: "mock", t: "模拟驱动返回值", d: "构造异常和边界" }
          ]
        },
        code: {
          lang: "c",
          title: "test_ringbuf.c",
          src: `#include "unity.h"
#include "ringbuf.h"

static ringbuf_t rb;
static uint8_t buf[8];

void setUp(void)
{
    ringbuf_init(&rb, buf, sizeof(buf));
}

void tearDown(void) {}

void test_push_pop_fifo(void)
{
    uint8_t v;

    TEST_ASSERT_TRUE(ringbuf_push(&rb, 1));
    TEST_ASSERT_TRUE(ringbuf_push(&rb, 2));

    TEST_ASSERT_TRUE(ringbuf_pop(&rb, &v));
    TEST_ASSERT_EQUAL_UINT8(1, v);

    TEST_ASSERT_TRUE(ringbuf_pop(&rb, &v));
    TEST_ASSERT_EQUAL_UINT8(2, v);

    TEST_ASSERT_FALSE(ringbuf_pop(&rb, &v));
}

void test_full_and_empty(void)
{
    for (int i = 0; i < 7; i++) {
        TEST_ASSERT_TRUE(ringbuf_push(&rb, (uint8_t)i));
    }
    TEST_ASSERT_FALSE(ringbuf_push(&rb, 99));   /* 留一格，满 */
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_push_pop_fifo);
    RUN_TEST(test_full_and_empty);
    return UNITY_END();
}`
        },
        codeNote: "测试用例要覆盖空、满、回绕、单元素等边界，这些地方最容易出错。",
        apply: `<p>我把协议解析、CRC、环形缓冲、状态机都做成不依赖硬件的模块，在 CI 里跑几百个用例，改代码后几分钟就能回归。</p>
<p>驱动层用 HIL 测试：PC 通过串口/USB 控制真实板子，自动执行用例并比对结果，覆盖硬件交互。</p>`,
        pitfalls: [
          "<b>业务逻辑直接调 HAL。</b>无法在 PC 上编译测试。",
          "<b>只测正常路径。</b>边界和错误路径才是 bug 集中地。",
          "<b>测试依赖硬件状态。</b>无法在 CI 里稳定运行。",
          "<b>没有断言，只打印。</b>需要人工看输出，无法自动化。"
        ],
        follow: [
          ["mock 和 stub 有什么区别？", "stub 提供固定的假返回值，mock 还会记录调用并验证交互；单元测试里常统称为 test double。"],
          ["HIL 测试值得做吗？", "对硬件交互复杂、量产风险高的产品值得；它能在真实硬件上自动回归，但搭建成本较高。" ]
        ]
      },

      {
        id: "X-11",
        chapter: "quality",
        topic: "static",
        title: "静态分析能发现什么问题？MISRA-C 要不要遵守？",
        diff: "中级",
        freq: "中频",
        type: "工程规范题",
        point: "静态分析查未初始化、越界、空指针、未使用变量；MISRA 限制危险语法，适合安全关键领域。",
        q: `<p>面试官：团队代码质量参差不齐，怎么用工具提前发现问题？MISRA 是不是必须？</p>`,
        exam: `<p>考察质量意识和工具使用经验。能说出常见检查项、误报处理、MISRA 的适用边界，就很好。</p>`,
        core: `<p>静态分析能查未初始化变量、数组越界、空指针、类型转换和资源泄漏；MISRA-C 约束危险用法，安全关键项目要遵守并记录偏差，普通项目选高价值规则。</p>`,
        answer: `<p><b>静态分析能发现：</b></p>
<ul>
<li>未初始化变量、未使用变量/函数；</li>
<li>数组越界、缓冲区溢出（部分）；</li>
<li>空指针解引用、野指针；</li>
<li>隐式类型转换、有符号/无符号混用；</li>
<li>不可达代码、死循环；</li>
<li>资源泄漏（打开未关闭）。</li>
</ul>
<p><b>常用工具：</b>编译器警告（<code>-Wall -Wextra -Werror</code>）、Cppcheck、PC-lint、Coverity、Clang Static Analyzer。CI 里集成，提交即检查。</p>
<p><b>MISRA-C：</b>针对 C 语言的危险用法制定规则，如禁止动态内存、限制指针运算、要求显式类型转换、禁止递归等。汽车、医疗、工业安全领域常要求遵守。</p>
<p><b>要不要遵守：</b></p>
<ul>
<li>安全关键、需要认证 → 建议遵守，并做偏差记录；</li>
<li>普通消费类产品 → 不必全量遵守，但可以借鉴其中高价值的规则；</li>
<li>关键是“理解规则背后的风险”，而不是机械地压制告警。</li>
</ul>`,
        principle: `<p>静态分析在不运行代码的情况下，通过语法树、数据流、控制流分析推断潜在错误。它不能证明程序正确，但能低成本发现大量常见缺陷。</p>
<p>MISRA 的规则来自对大量实际缺陷的总结，本质是“限制 C 语言中容易出错的特性和写法”，用规范换取可预测性。</p>`,
        fig: {
          type: "table",
          title: "静态分析常见检查项",
          tag: "static analysis",
          head: ["类别", "示例", "风险"],
          rows: [
            ["初始化", "使用未初始化变量", "随机值，行为不定"],
            ["边界", "数组下标越界", "内存破坏"],
            ["指针", "解引用空指针", "HardFault"],
            ["类型", "有符号/无符号混用", "逻辑错误"],
            ["资源", "打开未关闭", "句柄泄漏"]
          ]
        },
        code: {
          lang: "c",
          title: "static_check.c",
          src: `#include <stdint.h>
#include <string.h>

/* 真正的缺陷：strcpy 不检查长度，src 超过 15 字节就会写越界，后面的 strlen 还会继续越界读 */
int bad_copy(const char *src)
{
    char buf[16];
    strcpy(buf, src);       /* 未检查长度，可能溢出 */
    return (int)strlen(buf);
}

/* 改进：显式初始化、限制长度、检查参数 */
int good_copy(const char *src, char *out, size_t cap)
{
    if (!src || !out || cap == 0) return -1;

    size_t n = strlen(src);
    if (n >= cap) n = cap - 1;

    memcpy(out, src, n);
    out[n] = '\\0';
    return (int)n;
}`
        },
        codeNote: "编译器警告是最便宜的静态分析，先把 -Wall -Wextra 清零，再引入更重的工具。",
        apply: `<p>我在 CI 里强制 <code>-Wall -Wextra -Werror</code>，并跑 Cppcheck；新代码不允许新增告警，存量代码逐步清理。</p>
<p>MISRA 我们只启用高价值规则（如禁止隐式转换、要求检查返回值），并对每条偏差写明理由，避免为了过检而写畸形代码。</p>`,
        pitfalls: [
          "<b>只看告警数量不处理。</b>告警堆积，团队逐渐无视。",
          "<b>盲目压制告警。</b>掩盖真实问题。",
          "<b>机械遵守 MISRA。</b>代码可读性下降，收益有限。",
          "<b>只在发布前跑一次。</b>应该每次提交都跑。"
        ],
        follow: [
          ["静态分析能替代测试吗？", "不能，它只能发现部分模式化缺陷，无法验证业务逻辑和运行时行为；两者互补。"],
          ["如何处理误报？", "记录偏差并说明理由，定期评审；如果误报太多，调整规则集，而不是全部忽略。" ]
        ]
      },

      {
        id: "X-12",
        chapter: "quality",
        topic: "config",
        title: "设备的配置参数怎么管理？默认值、用户配置和出厂配置怎么区分？",
        diff: "中级",
        freq: "中频",
        type: "工程设计题",
        point: "分层配置（默认/出厂/用户/临时）、版本号、校验、迁移和恢复默认。",
        q: `<p>面试官：产品有很多参数（阈值、通信地址、校准值），升级后还要兼容旧配置，怎么设计？</p>`,
        exam: `<p>考察配置管理的完整性。能说出“分层、版本、校验、迁移、恢复默认”，就很好。</p>`,
        core: `<p>配置分默认、出厂、用户和临时四层；每条带版本和 CRC、双备份存储，升级后做幂等迁移，恢复默认要保留出厂校准值。</p>`,
        answer: `<p><b>分层设计：</b></p>
<ul>
<li><b>默认配置</b>：编译进固件，作为兜底；</li>
<li><b>出厂配置</b>：产线写入，包含设备地址、校准值，升级不应覆盖；</li>
<li><b>用户配置</b>：现场修改，可恢复默认；</li>
<li><b>临时配置</b>：RAM 中，掉电丢失，用于调试。</li>
</ul>
<p><b>存储：</b>每条配置带版本号和 CRC；读取时校验，失败则回退到默认值并记录告警。写入采用双备份，防止掉电损坏。</p>
<p><b>版本迁移：</b>固件升级后配置结构可能变化，需要迁移函数：读旧版本 → 转换 → 写新版本。迁移要幂等，失败时保留旧数据。</p>
<p><b>恢复默认：</b>提供命令或按键组合，清除用户配置但保留出厂校准值。</p>
<p><b>访问控制：</b>关键参数（如校准、通信地址）加权限，避免误改。</p>`,
        principle: `<p>配置是“固件行为的外部输入”，必须和代码一样对待：有版本、有校验、有迁移、有回滚。否则升级或掉电就会导致设备行为异常。</p>
<p>分层是为了区分“谁负责”：出厂参数由产线负责，用户参数由现场负责，默认值由固件负责，互不覆盖。</p>`,
        fig: {
          type: "layers",
          title: "配置的分层",
          tag: "configuration",
          items: [
            { tag: "默认", t: "编译进固件", d: "最后兜底，不可修改" },
            { tag: "出厂", t: "产线写入", d: "校准、地址，升级保留" },
            { tag: "用户", t: "现场修改", d: "可恢复默认" },
            { tag: "临时", t: "RAM", d: "调试用，掉电丢失" }
          ]
        },
        code: {
          lang: "c",
          title: "config.c",
          src: `#include <stdint.h>
#include <string.h>

#define CONFIG_VERSION 3

typedef struct {
    uint16_t version;
    uint16_t size;
    int32_t  threshold;
    uint8_t  addr;
    uint8_t  reserved[3];
    uint32_t crc;              /* 放在末尾：校验范围就是它前面的全部字节 */
} config_t;

static const config_t default_cfg = {
    .version = CONFIG_VERSION,
    .size = sizeof(config_t),
    .threshold = 100,
    .addr = 1
};

/* 读取配置：校验失败则回退默认值 */
int config_load(config_t *out)
{
    config_t tmp;

    if (storage_read(&tmp, sizeof(tmp)) != 0) {
        *out = default_cfg;
        return -1;
    }
    if (tmp.version != CONFIG_VERSION ||
        tmp.size != sizeof(config_t) ||
        tmp.crc != crc32(&tmp, sizeof(tmp) - sizeof(tmp.crc))) {
        *out = default_cfg;
        return -2;
    }
    *out = tmp;
    return 0;
}`
        },
        codeNote: "结构体直接存 Flash 要注意对齐和填充，跨编译器/版本可能不一致，最好显式序列化。",
        apply: `<p>我做过的设备把出厂校准和用户参数分开存储，升级固件只动用户区，校准值始终保留；恢复出厂设置也只清用户区。</p>
<p>配置结构变化时写迁移函数，并在升级流程里先备份旧配置，迁移失败可以回滚。</p>`,
        pitfalls: [
          "<b>升级覆盖出厂校准。</b>设备精度丢失，需要返厂。",
          "<b>配置无版本号。</b>结构变化后解析错位。",
          "<b>无 CRC 校验。</b>Flash 损坏后使用垃圾值。",
          "<b>恢复默认清掉所有数据。</b>包括不该清的校准值。"
        ],
        follow: [
          ["配置存 Flash 还是 EEPROM？", "Flash 容量大、成本低，但擦写寿命有限；EEPROM/FRAM 适合频繁修改的小配置。按修改频率选择。"],
          ["如何支持配置导入导出？", "定义带版本和校验的序列化格式（如 TLV 或 JSON），通过串口/蓝牙传输，导入前先校验再原子替换。" ]
        ]
      },

      {
        id: "X-13",
        chapter: "quality",
        topic: "api",
        title: "模块 API 怎么保持向后兼容？结构体加字段会破坏兼容吗？",
        diff: "高级",
        freq: "进阶",
        type: "接口设计题",
        point: "用不透明指针、版本号、保留字段和大小字段；避免暴露结构体布局和改变函数签名。",
        q: `<p>面试官：驱动库被多个项目使用，升级时怎么保证老项目不用改代码？</p>`,
        exam: `<p>考察接口稳定性设计。能说出“不透明指针、保留字段、版本协商”，就很好。</p>`,
        core: `<p>已发布接口只能新增不能改语义；用不透明指针和带 size 的结构体避免暴露布局，新增 foo_init_ex 而不是改旧函数，枚举新值放末尾。</p>`,
        answer: `<p><b>兼容性原则：</b>已发布的接口不能删、不能改语义、不能改参数顺序；只能新增。</p>
<p><b>具体做法：</b></p>
<ul>
<li><b>不透明指针</b>：头文件只声明 <code>typedef struct foo_s foo_t;</code>，结构体定义藏在 .c 里，调用者无法依赖布局，加字段不影响 ABI；</li>
<li><b>带大小字段的结构体</b>：初始化时传入 <code>sizeof(struct)</code>，库根据大小判断版本，缺失字段用默认值；</li>
<li><b>保留字段</b>：结构体末尾留 <code>reserved[]</code>，未来扩展时使用；</li>
<li><b>版本号</b>：接口带版本，库内部做兼容分支；</li>
<li><b>新增函数而不是改旧函数</b>：如 <code>foo_init_ex()</code>，旧函数内部调用新函数。</li>
</ul>
<p><b>结构体加字段的影响：</b>如果结构体由调用者分配并传给库，加字段会改变 <code>sizeof</code>，老代码分配的大小不够，库写入新字段就会越界。用不透明指针或大小字段可以避免。</p>
<p><b>ABI 兼容：</b>函数签名、调用约定、枚举值都不能变；枚举新增值要放在末尾，避免改变已有值。</p>`,
        principle: `<p>兼容性问题的根源是“调用者和库各自编译”，双方对结构体布局、函数签名的理解必须一致。一旦一方改变，二进制接口就对不上。</p>
<p>不透明指针把布局隐藏在库内部，调用者只持有指针，库可以自由扩展结构体，这是 C 语言实现稳定 ABI 的常用手段。</p>`,
        fig: {
          type: "table",
          title: "兼容与不兼容的修改",
          tag: "api compatibility",
          head: ["修改", "是否兼容", "原因"],
          rows: [
            ["新增函数", "兼容", "不影响已有调用"],
            ["结构体末尾加字段", "可能不兼容", "调用者分配大小不变"],
            ["改函数参数顺序", "不兼容", "调用约定改变"],
            ["删除/重命名函数", "不兼容", "链接失败"],
            ["枚举中间插值", "不兼容", "已有值含义改变"]
          ]
        },
        code: {
          lang: "c",
          title: "api_compat.h",
          src: `#ifndef SENSOR_API_H
#define SENSOR_API_H

#include <stdint.h>

/* 不透明句柄：调用者看不到内部布局 */
typedef struct sensor_s sensor_t;

/* 带大小字段的配置结构，便于扩展 */
typedef struct {
    uint32_t size;          /* 必须填 sizeof(sensor_cfg_t) */
    uint32_t sample_rate;
    uint8_t  reserved[16];  /* 预留扩展 */
} sensor_cfg_t;

/* 旧接口保持不变 */
int sensor_open(sensor_t **out, const sensor_cfg_t *cfg);

/* 新功能用新函数，不修改旧签名 */
int sensor_open_ex(sensor_t **out, const sensor_cfg_t *cfg, uint32_t flags);

#endif`
        },
        codeNote: "reserved 字段要初始化为 0，库在未来使用时要判断是否为 0，避免把垃圾值当配置。",
        apply: `<p>我做公共驱动库时，所有句柄都是不透明指针，配置结构带 size 字段。后来加滤波参数时，老项目不用改代码，库根据 size 判断是否使用新字段。</p>
<p>发布前用老版本的测试工程编译一遍，确认没有破坏兼容性。</p>`,
        pitfalls: [
          "<b>在结构体中间加字段。</b>后续字段偏移全变，ABI 破坏。",
          "<b>改枚举已有值。</b>老代码语义改变。",
          "<b>暴露内部结构体。</b>调用者依赖布局，无法演进。",
          "<b>不测试老版本兼容。</b>发布后才发现链接失败。"
        ],
        follow: [
          ["C 语言怎么实现类似“私有成员”？", "头文件只前置声明结构体，定义放在 .c 里；调用者只能通过指针和接口函数访问。"],
          ["语义化版本号怎么用？", "主版本号变化表示不兼容，次版本号表示新增功能，修订号表示修复；库的 soname 通常只跟主版本。" ]
        ]
      },

      {
        id: "X-14",
        chapter: "layer",
        topic: "layers",
        title: "模块初始化顺序怎么管理？为什么会出现“初始化依赖”问题？",
        diff: "高级",
        freq: "中频",
        type: "架构设计题",
        point: "显式初始化表、分级初始化、依赖声明；避免隐式依赖全局构造和调用顺序。",
        q: `<p>面试官：系统里有几十个模块，A 依赖 B 的初始化结果，怎么保证启动顺序正确？</p>`,
        exam: `<p>考察系统集成能力。能说出“显式初始化表 + 分级 + 返回值检查”，以及避免循环依赖，就很好。</p>`,
        core: `<p>模块初始化有依赖，顺序错会访问未初始化资源；用显式初始化表按 LEVEL_EARLY→DRIVER→SERVICE→APP 调用，失败即停并可回滚。</p>`,
        answer: `<p><b>问题来源：</b>模块初始化有依赖关系（时钟 → 驱动 → 服务 → 应用），如果顺序错了，会访问未初始化的资源，表现为随机死机或外设不工作。</p>
<p><b>解决方案：</b></p>
<ul>
<li><b>显式初始化表</b>：定义一个函数指针数组，按顺序调用，每个函数返回错误码，失败则停止并记录；</li>
<li><b>分级初始化</b>：LEVEL_EARLY（时钟、GPIO）→ LEVEL_DRIVER → LEVEL_SERVICE → LEVEL_APP，每级全部成功后再进入下一级；</li>
<li><b>依赖声明</b>：模块声明自己依赖哪些模块，启动器做拓扑排序并检测循环依赖；</li>
<li><b>延迟初始化</b>：首次使用时初始化（lazy init），减少启动时间，但要注意并发。</li>
</ul>
<p><b>避免的做法：</b>依赖 C 语言全局变量的构造顺序（C 没有保证）、在构造函数里做复杂初始化、隐式依赖“某个模块先跑”。</p>
<p><b>错误处理：</b>初始化失败要能回滚已初始化的模块，或者进入安全模式并给出明确错误码。</p>`,
        principle: `<p>初始化本质是建立系统的不变式：时钟必须先用，外设才能配置；驱动就绪，服务才能注册。顺序错误会破坏这些前提。</p>
<p>显式表把顺序从“隐含在代码位置”变成“数据”，便于审查、测试和调整；分级则把依赖关系结构化。</p>`,
        fig: {
          type: "flow",
          title: "分级初始化流程",
          tag: "init order",
          items: [
            { t: "EARLY", d: "时钟、电源、GPIO" },
            { t: "DRIVER", d: "串口、I2C、SPI、定时器" },
            { t: "SERVICE", d: "协议栈、存储、日志" },
            { t: "APP", d: "业务任务、状态机" },
            { t: "失败处理", d: "回滚或进入安全模式" }
          ]
        },
        code: {
          lang: "c",
          title: "init_table.c",
          src: `#include <stdint.h>

typedef int (*init_fn_t)(void);

typedef struct {
    const char *name;
    init_fn_t   fn;
    uint8_t     level;
} init_entry_t;

/* 按 level 升序排列，同 level 内按依赖顺序 */
static const init_entry_t init_table[] = {
    { "clock",   clock_init,   0 },
    { "gpio",    gpio_init,    0 },
    { "uart",    uart_init,    1 },
    { "i2c",     i2c_init,     1 },
    { "storage", storage_init, 2 },
    { "app",     app_init,     3 },
};

int system_init(void)
{
    uint8_t level = 0;

    for (unsigned i = 0; i < sizeof(init_table) / sizeof(init_table[0]); i++) {
        if (init_table[i].level < level) {
            return -100;                    /* 级别倒退，说明表项顺序写错了 */
        }
        level = init_table[i].level;

        if (init_table[i].fn() != 0) {
            /* 记录失败模块名，进入安全模式 */
            return -(int)i - 1;
        }
    }
    return 0;
}`
        },
        codeNote: "初始化表放在只读段；表项要按 level 单调不减排列，system_init 里顺便做一次校验（数组顺序编译器管不了，只能运行期查）。每个 init 函数要幂等，便于重试。",
        apply: `<p>我在项目里用初始化表替代散落在 main 里的调用，启动失败时能直接报出是哪个模块、第几级失败，现场排查快很多。</p>
<p>模块之间尽量避免循环依赖；如果确实需要，用事件或回调在运行期解耦，而不是在初始化阶段互相调用。</p>`,
        pitfalls: [
          "<b>依赖全局构造顺序。</b>C 不保证跨文件顺序。",
          "<b>初始化失败继续执行。</b>后续模块访问未初始化资源。",
          "<b>循环依赖。</b>无论怎么排序都有问题。",
          "<b>初始化函数不幂等。</b>重试时重复申请资源。"
        ],
        follow: [
          ["Linux 内核的 initcall 是怎么分级的？", "用不同段（.initcall0.init ~ .initcall7.init）存放函数指针，启动时按段顺序调用，实现分级初始化。"],
          ["延迟初始化有什么风险？", "首次调用时可能并发，需要加锁；初始化失败后的状态处理更复杂，实时性也可能受影响。" ]
        ]
      },

      {
        id: "X-15",
        chapter: "quality",
        topic: "recover",
        title: "看门狗怎么设计才能真正提高可靠性？喂狗策略有哪些坑？",
        diff: "高级",
        freq: "高频",
        type: "可靠性设计题",
        point: "看门狗要能发现“任务卡死但主循环还在跑”，用多任务签到、窗口看门狗和复位原因分析。",
        q: `<p>面试官：加了看门狗，设备还是会死机，为什么？喂狗应该放在哪里？</p>`,
        exam: `<p>考察对看门狗本质的理解。能说出“喂狗不能放在定时器中断里”“要检查所有关键任务”，就很好。</p>`,
        core: `<p>看门狗不能只在定时器中断里喂，否则主循环卡死也会被喂；要让各关键任务签到、最低优先级任务统一喂，并区分复位原因。</p>`,
        answer: `<p><b>常见错误：</b></p>
<ul>
<li><b>在定时器中断里喂狗。</b>主循环卡死、任务挂掉，中断仍然定时喂狗，看门狗完全失效；</li>
<li><b>只在主循环喂狗。</b>某个任务阻塞但主循环还在转，发现不了；</li>
<li><b>喂狗周期太短或太长。</b>太短容易误复位，太长故障发现慢；</li>
<li><b>初始化阶段没处理。</b>启动时间长于看门狗超时，反复复位。</li>
</ul>
<p><b>正确做法：</b></p>
<ul>
<li><b>多任务签到</b>：每个关键任务定期置自己的标志，喂狗任务检查所有标志都置位后才喂狗，然后清标志；</li>
<li><b>喂狗放在最低优先级任务</b>，确保高优先级任务没有饿死它；</li>
<li><b>窗口看门狗</b>：不仅要求“不能太晚”，还要求“不能太早”，能发现程序跑飞后快速乱喂；</li>
<li><b>记录复位原因</b>：区分看门狗复位和正常复位，统计故障率；</li>
<li><b>复位后进入安全模式</b>：记录故障、限制功能、上报云端。</li>
</ul>
<p>看门狗只能处理“程序完全失控”，不能替代异常处理和资源监控。对内存泄漏、任务缓慢退化，需要额外的监控。</p>`,
        principle: `<p>看门狗是一个独立计数器，程序必须在超时前“喂”它，否则硬件复位。它的价值在于：即使软件完全跑飞，硬件也能把系统拉回来。</p>
<p>但看门狗不知道“程序是否真的健康”，只知道“有没有按时喂”。所以喂狗逻辑必须能代表系统整体健康，否则就是自欺欺人。</p>`,
        fig: {
          type: "flow",
          title: "多任务签到的喂狗机制",
          tag: "watchdog",
          items: [
            { t: "任务 A 置位", d: "完成一轮循环" },
            { t: "任务 B 置位", d: "通信正常" },
            { t: "任务 C 置位", d: "采样正常" },
            { t: "喂狗任务检查", d: "所有位都置位才喂" },
            { t: "清标志", d: "进入下一轮" }
          ]
        },
        code: {
          lang: "c",
          title: "watchdog.c",
          src: `#include <stdint.h>

#define TASK_A_BIT (1u << 0)
#define TASK_B_BIT (1u << 1)
#define TASK_C_BIT (1u << 2)
#define ALL_BITS   (TASK_A_BIT | TASK_B_BIT | TASK_C_BIT)

static volatile uint32_t alive_flags;

void task_a_report(void) { alive_flags |= TASK_A_BIT; }
void task_b_report(void) { alive_flags |= TASK_B_BIT; }
void task_c_report(void) { alive_flags |= TASK_C_BIT; }

/* 最低优先级任务：检查所有关键任务都活着才喂狗 */
void watchdog_task(void *arg)
{
    for (;;) {
        if ((alive_flags & ALL_BITS) == ALL_BITS) {
            alive_flags = 0;
            wdt_feed();
        } else {
            /* 有任务没签到，不喂狗，等待复位 */
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}`
        },
        codeNote: "alive_flags 的读-改-写在多任务下需要原子操作或临界区，否则可能丢标志。",
        apply: `<p>我做工业设备时，喂狗任务检查通信、采集、控制三个任务的签到，任一任务卡死超过 1 秒就停止喂狗，让系统复位并记录故障任务。</p>
<p>复位后读取复位原因和备份寄存器里的故障码，上报云端，形成可追踪的可靠性数据。</p>`,
        pitfalls: [
          "<b>中断里喂狗。</b>主循环死了也发现不了。",
          "<b>无条件喂狗。</b>看门狗形同虚设。",
          "<b>超时太短。</b>正常的长操作被误判为故障。",
          "<b>复位后不记录原因。</b>无法分析故障。"
        ],
        follow: [
          ["窗口看门狗和独立看门狗有什么区别？", "独立看门狗用独立时钟，只检查“不要太晚”；窗口看门狗还检查“不要太早”，能发现程序跑飞后乱喂。"],
          ["看门狗能防止所有死机吗？", "不能，它只能处理程序失控；硬件故障、电源问题、外设挂死需要额外的监控和复位电路。" ]
        ]
      },

      {
        id: "X-16",
        chapter: "layer",
        topic: "interface",
        title: "驱动和应用之间用环形缓冲区解耦，容量和溢出怎么处理？",
        diff: "中级",
        freq: "中频",
        type: "架构设计题",
        point: "按最坏突发量定容量，溢出策略要明确（丢新/丢旧/阻塞），并计数上报。",
        q: `<p>面试官：串口驱动和应用之间用环形缓冲，缓冲区开多大？满了怎么办？</p>`,
        exam: `<p>考察解耦设计和容量规划。能说出“按最坏情况估算、溢出策略、监控计数”，就很好。</p>`,
        core: `<p>缓冲容量按最坏突发数据量加最长阻塞时间乘速率估算；溢出时按业务选择丢新、丢旧或反压，必须统计溢出次数，单生产者单消费者可无锁。</p>`,
        answer: `<p><b>容量估算：</b>按“最坏情况下的突发数据量 + 应用最长阻塞时间 × 数据速率”计算。例如波特率 115200（约 11.5KB/s），应用可能阻塞 20ms，则需要至少 230 字节，再留 2 倍余量。</p>
<p><b>溢出策略：</b></p>
<ul>
<li><b>丢新数据</b>：保留已有数据，丢弃最新；适合“旧数据更重要”的场景；</li>
<li><b>丢旧数据</b>：覆盖最旧数据；适合“只要最新状态”的场景；</li>
<li><b>阻塞生产者</b>：中断里不能阻塞，所以只适用于任务上下文；</li>
<li><b>反压</b>：通过流控让发送方暂停（如串口 RTS/CTS）。</li>
</ul>
<p><b>必须计数：</b>溢出次数要统计并上报，否则数据丢了也不知道。现场出现溢出，说明容量不足或消费太慢。</p>
<p><b>线程安全：</b>单生产者单消费者可以无锁（各自只改一个指针），多生产者需要加锁或原子操作。内存序要保证“先写数据再更新指针”。</p>`,
        principle: `<p>环形缓冲区是生产者和消费者之间的弹性缓冲，吸收短时速率不匹配。它的容量决定了系统能容忍多大的突发和多大的调度延迟。</p>
<p>溢出是容量不足的必然结果，关键不是“永不溢出”，而是“溢出时可预测、可观测、可恢复”。</p>`,
        fig: {
          type: "table",
          title: "溢出策略对比",
          tag: "buffer overflow",
          head: ["策略", "保留", "适用", "风险"],
          rows: [
            ["丢新", "旧数据", "命令、日志", "新事件丢失"],
            ["丢旧", "最新状态", "传感器最新值", "历史丢失"],
            ["阻塞", "全部", "任务上下文", "死锁/延迟"],
            ["流控", "全部", "支持流控的链路", "需要硬件支持"]
          ]
        },
        code: {
          lang: "c",
          title: "ringbuf_overflow.c",
          src: `#include <stdint.h>
#include <stdbool.h>

typedef struct {
    uint8_t *buf;
    uint32_t size;
    volatile uint32_t head;   /* 生产者修改 */
    volatile uint32_t tail;   /* 消费者修改 */
    volatile uint32_t overflow;
} rb_t;

/* 生产者：满时丢新数据并计数 */
bool rb_push(rb_t *rb, uint8_t v)
{
    uint32_t next = (rb->head + 1u) % rb->size;
    if (next == rb->tail) {
        rb->overflow++;
        return false;
    }
    rb->buf[rb->head] = v;
    rb->head = next;
    return true;
}

/* 消费者：取数据 */
bool rb_pop(rb_t *rb, uint8_t *v)
{
    if (rb->tail == rb->head) return false;
    *v = rb->buf[rb->tail];
    rb->tail = (rb->tail + 1u) % rb->size;
    return true;
}`
        },
        codeNote: "head/tail 用 volatile 只保证不被优化，不保证原子性；多生产者场景要加锁或使用原子操作。",
        apply: `<p>我做串口协议时，缓冲区按“最大帧长 × 2 + 应用最坏延迟对应的数据量”来定，并在诊断页面显示溢出计数，方便现场判断是否需要加大缓冲。</p>
<p>如果溢出频繁，先优化消费速度（减少解析耗时、提高任务优先级），再考虑加大容量。</p>`,
        pitfalls: [
          "<b>容量按平均速率估算。</b>突发时溢出。",
          "<b>溢出静默丢弃。</b>数据丢了不知道。",
          "<b>多生产者不加锁。</b>指针竞争，数据错乱。",
          "<b>先移动指针再写数据。</b>消费者可能读到未写入的槽位。"
        ],
        follow: [
          ["缓冲区越大越好吗？", "不是，占用 RAM、增加缓存不命中；应按最坏情况估算并留合理余量，配合溢出监控调整。"],
          ["如何实现无锁环形缓冲？", "单生产者单消费者下，生产者和消费者各自只修改一个指针，配合内存屏障保证顺序；多生产者需要 CAS 或加锁。" ]
        ]
      }
    ]
  });
})();
