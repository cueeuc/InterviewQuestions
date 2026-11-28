/* ============================================================
   06 嵌入式外设与驱动开发
   ============================================================ */
(function () {
  "use strict";

  EIK.register("peripheral-driver", {
    chapters: [
      {
        id: "input",
        title: "GPIO 与输入设备",
        topics: [{ id: "key", title: "按键扫描与消抖" }]
      },
      {
        id: "hmi",
        title: "显示与人机交互",
        topics: [
          { id: "oled", title: "OLED / LCD 驱动" },
          { id: "seg", title: "数码管动态扫描" }
        ]
      },
      {
        id: "sensor",
        title: "传感器与执行器",
        topics: [
          { id: "adc", title: "ADC 采集与滤波" },
          { id: "ultra", title: "超声波测距" },
          { id: "motor", title: "编码器与电机" }
        ]
      },
      {
        id: "arch",
        title: "驱动架构",
        topics: [{ id: "layer", title: "分层设计与接口" }]
      }
    ],

    questions: [
      {
        id: "P-01",
        chapter: "input",
        topic: "key",
        title: "按键如何消抖？状态机怎么写才能支持长按和双击？",
        diff: "初级",
        freq: "高频",
        type: "代码分析题",
        point: "机械抖动原理、软件消抖策略，以及可扩展的按键状态机设计。",
        q: `<p>面试官：<strong>按键为什么要消抖？</strong>你会怎么写消抖代码？如果要支持单击、长按、双击，代码结构应该怎么设计？</p>`,
        exam: `<p>这题从最简单的延时消抖问起，逐步深入到状态机设计。能说出“延时消抖阻塞 CPU，不适合多任务”“状态机 + 定时扫描可以同时处理多个按键和多种事件”，说明你写过可维护的输入模块。</p>`,
        core: `<p>按键抖动 5~20ms，延时消抖会阻塞 CPU，工程上用 10ms 定时扫描加状态机；单击、长按、双击靠记录按下时长和释放次数在状态机里判定。</p>`,
        answer: `<p>机械按键在按下和松开的瞬间，触点会弹跳，产生 5~20ms 的多个高低电平跳变。如果直接读电平，一次按下会被识别成好几次。</p>
<p>最简单的消抖是“检测到变化后延时 10~20ms 再读一次”，但 <code>delay</code> 会阻塞 CPU，在 RTOS 或需要响应其他事件时不可接受。</p>
<p>工程上的做法是<strong>定时扫描 + 状态机</strong>：每 10ms 调用一次扫描函数，记录每个按键的当前电平和稳定计数。电平连续几次一致才认为状态真的改变。这样不阻塞，还能同时处理多个按键。</p>
<p>要支持长按和双击，就在状态机里加状态：按下后启动计时，超过 1 秒进入长按；松开后在 300ms 内再次按下算双击。状态机的好处是逻辑清晰、易于扩展，不会写成一堆嵌套 if。</p>`,
        principle: `<p>状态机的本质是把“时间 + 事件”映射到“状态迁移”。按键的物理过程是：释放 → 抖动 → 按下 → 保持 → 抖动 → 释放。每个状态只关心“当前电平”和“已经持续多久”，不需要记住历史。</p>
<p>扫描周期决定了响应速度和消抖效果：10ms 扫描、连续 2 次一致，相当于 20ms 消抖，能覆盖绝大多数按键；扫描太快会把抖动当成多次按下，太慢则响应迟钝。</p>`,
        fig: {
          type: "flow",
          title: "按键状态机",
          tag: "state machine",
          items: [
            { t: "IDLE", d: "等待按下" },
            { t: "DEBOUNCE", d: "计数确认" },
            { t: "PRESSED", d: "计时/长按" },
            { t: "RELEASE", d: "等待松开" },
            { t: "CLICK", d: "等待双击" }
          ]
        },
        code: {
          lang: "c",
          title: "key_fsm.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define KEY_NUM        4
#define DEBOUNCE_CNT   2        /* 连续 2 次（20ms）一致才确认 */
#define LONG_PRESS_MS  1000
#define DOUBLE_GAP_MS  300

typedef enum {
    KS_IDLE = 0,
    KS_PRESSED,
    KS_LONG,
    KS_WAIT_DOUBLE,
    KS_SECOND                    /* 双击的第二次按下，等松开再上报 */
} key_state_t;

typedef struct {
    uint8_t      pin_level;      /* 当前电平，0 表示按下 */
    uint8_t      stable_cnt;
    key_state_t  state;
    uint16_t     timer_ms;
} key_t;

static key_t s_keys[KEY_NUM];

/* 每 10ms 调用一次，非阻塞 */
void Key_Scan10ms(void)
{
    for (uint8_t i = 0; i < KEY_NUM; i++) {
        key_t *k = &s_keys[i];
        uint8_t level = Key_ReadLevel(i);        /* 0 = 按下 */

        /* 1. 消抖：电平连续一致才更新 */
        if (level != k->pin_level) {
            if (++k->stable_cnt < DEBOUNCE_CNT) continue;
            k->pin_level = level;
            k->stable_cnt = 0;
        } else {
            k->stable_cnt = 0;
        }

        /* 2. 状态迁移 */
        switch (k->state) {
        case KS_IDLE:
            if (k->pin_level == 0) {             /* 确认按下 */
                k->state = KS_PRESSED;
                k->timer_ms = 0;
            }
            break;

        case KS_PRESSED:
            k->timer_ms += 10;
            if (k->pin_level == 1) {             /* 松开：可能是单击，也可能是双击前半段 */
                k->state = KS_WAIT_DOUBLE;
                k->timer_ms = 0;                 /* 先不上报，等超时再确认单击 */
            } else if (k->timer_ms >= LONG_PRESS_MS) {
                k->state = KS_LONG;
                Key_Emit(i, KEY_LONG_START);
            }
            break;

        case KS_LONG:
            if (k->pin_level == 1) {
                k->state = KS_IDLE;
                Key_Emit(i, KEY_LONG_END);
            }
            break;

        case KS_WAIT_DOUBLE:
            k->timer_ms += 10;
            if (k->pin_level == 0) {             /* 间隔内又按下：双击，等第二次松开 */
                k->state = KS_SECOND;
                k->timer_ms = 0;
            } else if (k->timer_ms >= DOUBLE_GAP_MS) {
                k->state = KS_IDLE;
                Key_Emit(i, KEY_CLICK);          /* 超时确认：只是单击 */
            }
            break;

        case KS_SECOND:
            if (k->pin_level == 1) {
                k->state = KS_IDLE;
                Key_Emit(i, KEY_DOUBLE);         /* 双击只在第二次松开时上报一次 */
            }
            break;
        }
    }
}`
        },
        apply: `<p>多按键场景下，用定时器每 10ms 调一次扫描比每个按键配一根 EXTI 更省资源，也更容易做组合键和长按。扫描函数放在主循环或低优先级任务里，执行时间固定且很短。</p>
<p>如果按键接在模拟输入上，还可以用 ADC 读不同电阻分压值，一根引脚识别多个按键，这在成本敏感的产品里很常见。</p>`,
        pitfalls: [
          "<b>用 delay 消抖。</b>阻塞 CPU，多任务下会拖慢其他任务，响应也变差。",
          "<b>消抖次数太多。</b>连续 10 次一致需要 100ms，按键反应明显迟钝，用户会觉得“不灵敏”。",
          "<b>没有区分“按下沿”和“保持”。</b>长按期间反复触发事件，导致菜单一直滚动。"
        ],
        follow: [
          [
            "硬件消抖怎么做？",
            "按键两端并 100nF 电容，或加 RC 低通 + 施密特触发器（如 74HC14）。硬件消抖减少软件负担，但会增加成本和板面积，通常软件消抖就够了。"
          ],
          [
            "如何实现组合键？",
            "在扫描函数里检查多个按键同时处于按下状态，并记录按下的时间差（要求在 50ms 内先后按下才算组合）。注意与单键事件互斥，避免同时触发。"
          ],
          [
            "按键事件如何传递给应用层？",
            "用一个事件队列，扫描函数只负责产生事件（按键号 + 事件类型），应用任务从队列取。这样输入模块和业务逻辑解耦，也便于做按键映射配置。"
          ]
        ]
      },

      {
        id: "P-02",
        chapter: "hmi",
        topic: "oled",
        title: "OLED 的 I2C 驱动怎么写？显存怎么组织？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "SSD1306 的页寻址结构、显存缓冲与刷新策略，以及驱动分层。",
        q: `<p>面试官：给你一块 0.96 寸的 <strong>SSD1306 OLED</strong>，用 I2C 驱动，你会怎么设计？显存怎么组织？为什么要有缓冲区，能不能直接写屏？</p>`,
        exam: `<p>考察外设驱动的完整设计能力：从通信协议、控制器命令、显存结构到上层绘图 API。能说清“页寻址每页 8 行像素”“1KB 显存”“整屏刷新与局部刷新的取舍”，说明你写过不止点灯级别的驱动。</p>`,
        core: `<p>SSD1306 显存 128×8=1024 字节、按 8 页组织；驱动在 RAM 维护显存镜像、绘图只改内存，最后整页刷新，避免直接写屏撕裂。</p>`,
        answer: `<p>SSD1306 是 128×64 的单色 OLED 控制器，I2C 地址通常是 0x3C 或 0x3D。它的显存按“页”组织：64 行分成 8 页，每页 8 行像素，每列一个字节，字节的每一位对应一行的亮灭。所以整屏显存是 128 × 8 = 1024 字节。</p>
<p>驱动分三层：最底层是 I2C 读写字节；中间层是写命令、写数据、设置页地址和列地址；上层是绘图 API（画点、画线、显示字符），操作的是本地显存缓冲区。</p>
<p>必须有缓冲区。因为 I2C 写一个字节要几十微秒，整屏 1KB 要几十毫秒，如果每次画点都直接写屏，刷新会严重撕裂，而且画一个字符要写很多次。正确做法是在 RAM 里维护一份 1KB 的显存镜像，所有绘图操作改内存，最后统一刷新到屏幕。</p>
<p>刷新也可以优化：记录脏区域，只刷新变化的部分；或者用页刷新，每次只发一页 128 字节。</p>`,
        principle: `<p>页寻址模式下，写入一个字节会填充某一页的 8 个垂直像素，写完后列地址自动加一。所以画一个 8×16 的汉字，需要分别写两页（上半部分和下半部分），每页 8 个字节。</p>
<p>1KB 的显存在 STM32F103C8 这种只有 20KB RAM 的芯片上占 5%，可以接受。但如果用 128×64 的 LCD 并支持灰度，显存会大得多，这时就要考虑外部显存或局部刷新。</p>`,
        fig: {
          type: "memmap",
          title: "SSD1306 显存结构（128×64）",
          tag: "framebuffer",
          rows: [
            { name: "PAGE0", text: "第 0~7 行像素，128 字节", addr: "0x00", cls: "a" },
            { name: "PAGE1", text: "第 8~15 行像素，128 字节", addr: "0x80", cls: "b" },
            { name: "…", text: "共 8 页", addr: "", cls: "c" },
            { name: "PAGE7", text: "第 56~63 行像素，128 字节", addr: "0x380", cls: "d" }
          ],
          note: "每个字节的 bit0~bit7 对应页内从上到下的 8 个像素，1 表示点亮。"
        },
        code: {
          lang: "c",
          title: "oled_ssd1306.c",
          src: `#include <string.h>
#include <stdint.h>

#define OLED_W   128
#define OLED_H   64
#define OLED_PAGES (OLED_H / 8)

static uint8_t s_gram[OLED_PAGES][OLED_W];   /* 1KB 显存镜像 */

/* 底层：I2C 写命令 / 写数据，0x00 是命令前缀，0x40 是数据前缀 */
static void oled_cmd(uint8_t c)
{
    I2C_WriteReg(OLED_ADDR, 0x00, c);
}

static void oled_data(const uint8_t *buf, uint16_t len)
{
    I2C_WriteBlock(OLED_ADDR, 0x40, buf, len);
}

void OLED_Init(void)
{
    static const uint8_t init_seq[] = {
        0xAE,             /* 关显示 */
        0xD5, 0x80,       /* 时钟分频 */
        0xA8, 0x3F,       /* 复用率 1/64 */
        0xD3, 0x00,       /* 显示偏移 */
        0x40,             /* 起始行 0 */
        0x8D, 0x14,       /* 开电荷泵 */
        0x20, 0x02,       /* 页寻址模式 */
        0xA1, 0xC8,       /* 段重映射、COM 扫描方向 */
        0xDA, 0x12,       /* COM 引脚配置 */
        0x81, 0xCF,       /* 对比度 */
        0xD9, 0xF1,       /* 预充电周期 */
        0xDB, 0x40,       /* VCOMH */
        0xA4, 0xA6,       /* 显示跟随 RAM、正常显示 */
        0xAF              /* 开显示 */
    };
    for (uint16_t i = 0; i < sizeof(init_seq); i++) {
        oled_cmd(init_seq[i]);
    }
    OLED_Clear();
    OLED_Refresh();
}

/* 绘图：只改内存，不碰总线 */
void OLED_DrawPixel(uint8_t x, uint8_t y, uint8_t on)
{
    if (x >= OLED_W || y >= OLED_H) return;

    uint8_t page = y >> 3;
    uint8_t mask = (uint8_t)(1u << (y & 7));

    if (on) s_gram[page][x] |= mask;
    else    s_gram[page][x] &= (uint8_t)~mask;
}

/* 刷新：整屏 1KB，I2C 400kHz 下约 25ms */
void OLED_Refresh(void)
{
    for (uint8_t page = 0; page < OLED_PAGES; page++) {
        oled_cmd((uint8_t)(0xB0 + page));   /* 设置页地址 */
        oled_cmd(0x00);                     /* 列低 4 位 */
        oled_cmd(0x10);                     /* 列高 4 位 */
        oled_data(s_gram[page], OLED_W);
    }
}

/* 只刷新一页，用于局部更新（如时间显示） */
void OLED_RefreshPage(uint8_t page)
{
    if (page >= OLED_PAGES) return;
    oled_cmd((uint8_t)(0xB0 + page));
    oled_cmd(0x00);
    oled_cmd(0x10);
    oled_data(s_gram[page], OLED_W);
}`
        },
        apply: `<p>实际项目里，字符显示通常用字模数组（8×16 或 16×16），按列取模，画字符时把字模的每一位映射到显存的对应位置。中文字库会占不少 Flash，常用字可以只取需要的部分。</p>
<p>如果刷新频率高（比如显示波形），要算带宽：128×64 单色、I2C 400kHz，整屏约 25ms，最多 40fps；改用 SPI 可以到几百 fps。所以波形显示一般用 SPI 屏。</p>`,
        pitfalls: [
          "<b>没有显存缓冲区，直接写屏。</b>刷新慢且会撕裂，画一个字符要发几十次 I2C 传输。",
          "<b>初始化序列漏了电荷泵。</b>屏幕全黑或对比度极低，这是最常见的“屏幕不亮”原因。",
          "<b>坐标计算没处理页边界。</b>y=7 和 y=8 属于不同页，跨页字符要分别写两页，否则显示错位。"
        ],
        follow: [
          [
            "I2C 和 SPI 驱动 OLED 有什么区别？",
            "I2C 只需两根线，接线简单但速度慢（400kHz 约 25ms 整屏）；SPI 需要四根线，速度快十倍以上，适合动画和波形。引脚紧张选 I2C，性能优先选 SPI。"
          ],
          [
            "如何显示中文？",
            "需要字模数据，通常用取模软件生成 16×16 点阵，每个汉字 32 字节。把常用字做成索引表，按 GBK 码或自定义 ID 查找。注意字模的取模方向要和驱动一致。",
            ],
          [
            "屏幕闪烁怎么解决？",
            "不要在中断里刷新，也不要在每次绘图后整屏刷新。用双缓冲或脏区域标记，在定时器里以固定帧率刷新；刷新期间关显示（0xAE/0xAF）也能减少撕裂。"
          ]
        ]
      },

      {
        id: "P-03",
        chapter: "hmi",
        topic: "seg",
        title: "数码管动态扫描的原理是什么？如何避免闪烁和重影？",
        diff: "初级",
        freq: "中频",
        type: "原理分析题",
        point: "视觉暂留、位选与段选、扫描频率，以及消隐与亮度控制。",
        q: `<p>面试官：<strong>数码管动态扫描</strong>是怎么实现的？为什么扫描频率太低会闪、太高会变暗？重影是怎么产生的，怎么解决？</p>`,
        exam: `<p>考察对“人眼视觉暂留 + 分时复用”的理解。能说清“位选轮流导通、段选送对应数据”“扫描频率 50Hz 以上不闪”“切换前先消隐避免重影”，说明你实际驱动过。</p>`,
        core: `<p>数码管动态扫描靠视觉暂留，各位轮流点亮一两毫秒，整屏刷新约 100Hz；换位前先消隐段选，避免上一位残影。</p>`,
        answer: `<p>动态扫描利用人眼视觉暂留：多个数码管共用同一组段选线，通过位选线轮流点亮。每次只点亮一位，送出该位的段码，保持一两毫秒，然后关掉换下一位。只要轮换够快，人眼看到的就是同时显示。</p>
<p>扫描频率太低（低于 50Hz）会看到明显闪烁；频率太高，每位点亮时间太短，亮度下降，而且单片机开销增大。通常整屏刷新率取 100Hz 左右，也就是 4 位数码管每位 2.5ms。</p>
<p>重影是因为切换位选时，上一位的段码还没消失，下一位就点亮了，导致相邻位显示相同的笔画。解决办法是<strong>先消隐</strong>：切换位选前把段选全部关掉，送完新数据再开位选。</p>`,
        principle: `<p>数码管分共阴和共阳：共阴是 8 个 LED 的阴极连在一起接低电平，段选送高电平点亮；共阳相反。位选线控制公共端，段选线控制 8 个笔画（含小数点）。</p>
<p>亮度控制有两种：一是改变每位点亮的时间占比（PWM 调光），二是改变段选限流电阻。前者灵活但会增加软件复杂度，后者简单但需要改硬件。</p>`,
        fig: {
          type: "flow",
          title: "动态扫描的一个循环",
          tag: "scan",
          items: [
            { t: "消隐", d: "段选全关" },
            { t: "送段码", d: "第 n 位数据" },
            { t: "开位选", d: "点亮第 n 位" },
            { t: "延时", d: "2~3ms" },
            { t: "下一位", d: "n = n+1" }
          ]
        },
        code: {
          lang: "c",
          title: "seg_scan.c",
          src: `#include <stdint.h>

#define SEG_NUM 4

/* 共阴段码：0~9，bit0=a ... bit6=g，bit7=dp */
static const uint8_t s_seg_code[10] = {
    0x3F, 0x06, 0x5B, 0x4F, 0x66,
    0x6D, 0x7D, 0x07, 0x7F, 0x6F
};

static uint8_t s_display[SEG_NUM];    /* 每位数码管要显示的数值 */
static uint8_t s_pos;

/* 每 2ms 调用一次，由定时器中断驱动 */
void Seg_Scan2ms(void)
{
    /* 1. 先消隐：关掉所有段，避免重影 */
    SEG_PORT = 0x00;
    DIG_PORT |= 0x0F;                 /* 位选全部关闭（共阴高电平关） */

    /* 2. 送当前位的段码 */
    SEG_PORT = s_seg_code[s_display[s_pos]];

    /* 3. 打开当前位选 */
    DIG_PORT &= (uint8_t)~(1u << s_pos);

    /* 4. 轮换到下一位 */
    s_pos = (uint8_t)((s_pos + 1) % SEG_NUM);
}

/* 亮度调节：把每个显示时隙再切成若干份做软件 PWM。
 * 本函数必须比 Seg_Scan2ms 调用得更快：每 100us 一次，
 * 25 步凑成 2.5ms 的时隙，4 位一帧 10ms（100Hz），亮度 0~25 级 */
#define PWM_STEPS   25

void Seg_Scan100us_Dim(uint8_t duty)   /* duty: 0 ~ PWM_STEPS */
{
    static uint8_t step;               /* 时隙内的 PWM 步 */

    /* 1. 消隐 */
    SEG_PORT = 0x00;
    DIG_PORT |= 0x0F;

    /* 2. 本步点亮（duty 越大，一个时隙里点亮的步数越多） */
    if (step < duty) {
        SEG_PORT = s_seg_code[s_display[s_pos]];
        DIG_PORT &= (uint8_t)~(1u << s_pos);
    }

    /* 3. 25 步 = 2.5ms 时隙结束：换下一位，4 位扫完一帧 10ms（100Hz） */
    if (++step >= PWM_STEPS) {
        step = 0;
        s_pos = (uint8_t)((s_pos + 1) % SEG_NUM);
    }
}`
        },
        apply: `<p>实际电路里，段选通常串 220Ω~1kΩ 限流电阻，位选用三极管或 MOS 驱动（因为要同时给 8 段供电，电流可能上百 mA）。共阴数码管的位选是灌电流，要用 NPN 或 N-MOS。</p>
<p>如果单片机引脚不够，可以用 74HC595 移位寄存器扩展，三根线驱动多位数码管；或者用 TM1650 这类专用驱动芯片，自带扫描和键盘扫描。</p>`,
        pitfalls: [
          "<b>切换前不消隐。</b>上一位的段码残留在总线上，出现重影，尤其是数字 8 最明显。",
          "<b>扫描放在主循环里用 delay 控制。</b>主循环有其他任务时会变慢，导致闪烁。应该用定时器中断固定周期扫描。",
          "<b>位选驱动能力不足。</b>多位同时点亮时电流过大，亮度不均甚至烧引脚，必须加三极管。"
        ],
        follow: [
          [
            "为什么动态扫描能省 IO？",
            "N 位数码管静态显示需要 N×8 根线，动态扫描只需 8 根段选 + N 根位选。4 位时从 32 根降到 12 根，引脚紧张时优势明显。"
          ],
          [
            "扫描频率多少合适？",
            "整屏刷新率 100Hz 以上人眼就感觉不到闪烁，4 位即每位 2.5ms。太低会闪，太高亮度不足且 CPU 开销大。"
          ],
          [
            "如何显示小数点和负号？",
            "小数点是段码的 bit7，直接或上 0x80；负号用 g 段（0x40）。注意数码管排列顺序与位选顺序的对应关系，接反了会显示成镜像。"
          ]
        ]
      },

      {
        id: "P-04",
        chapter: "sensor",
        topic: "adc",
        title: "ADC 采样值抖动很大，怎么做滤波？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "滑动平均、中值滤波、一阶低通的取舍，以及采样与滤波的配合。",
        q: `<p>面试官：采集回来的 <strong>ADC 值跳动很大</strong>，你会怎么处理？滑动平均和中值滤波有什么区别？一阶低通滤波的系数怎么定？</p>`,
        exam: `<p>考察数字信号处理的工程直觉。能说清“中值滤波去脉冲噪声、平均滤波去随机噪声、低通滤波有相位延迟”，并且知道“先分析噪声来源再选算法”，说明你不是盲目套公式。</p>`,
        core: `<p>随机噪声用滑动平均，偶发尖峰用中值滤波；一般先中值去尖峰再滑动平均，最后按需一阶低通，组合越多延迟越大。</p>`,
        answer: `<p>先要区分噪声类型。如果是随机的白噪声，用<strong>滑动平均</strong>最有效，N 次平均能把噪声降低到 1/√N。如果是偶发的尖峰干扰（比如电机启停、继电器动作），用<strong>中值滤波</strong>更好，它能把孤立的异常值直接剔除。</p>
<p>滑动平均实现简单，用一个环形缓冲区保存最近 N 个值，求和除以 N。缺点是占用 N 个样本的存储，且对突变响应慢（有 N-1 个样本的延迟）。</p>
<p>中值滤波要把 N 个值排序取中间，计算量大，通常 N 取 3 或 5，用冒泡或插入排序就够了。</p>
<p>一阶低通滤波是 <code>y = y + a(x - y)</code>，a 越小越平滑但响应越慢。a 的取值由截止频率和采样周期决定：<code>a = 2π·fc·T / (1 + 2π·fc·T)</code>，工程上常直接试凑，取 0.1~0.3。</p>
<p>我一般会组合使用：先中值去掉尖峰，再滑动平均平滑，最后按需加低通。但组合越多延迟越大，控制环路里要谨慎。</p>`,
        principle: `<p>滑动平均本质上是一个 FIR 低通滤波器，系数全为 1/N，频域上是 sinc 函数，能有效抑制高频噪声，但旁瓣较大。中值滤波是非线性的，对椒盐噪声特别有效，且能保留阶跃边缘。</p>
<p>一阶低通是 IIR 滤波器，只需要一个状态变量，计算量极小，但有相位延迟，且对突变响应呈指数逼近。在电机电流环、温度控制里很常用。</p>`,
        fig: {
          type: "table",
          title: "三种滤波方法对比",
          tag: "compare",
          head: ["方法", "适用噪声", "计算量", "延迟", "存储"],
          rows: [
            ["滑动平均", "随机白噪声", "低（可用累加优化）", "N-1 个样本", "N 个样本"],
            ["中值滤波", "脉冲/尖峰噪声", "中（需排序）", "N/2 个样本", "N 个样本"],
            ["一阶低通", "高频噪声", "极低", "取决于 a", "1 个状态"],
            ["卡尔曼滤波", "带模型的高斯噪声", "高", "小", "多个状态"]
          ]
        },
        code: {
          lang: "c",
          title: "adc_filter.c",
          src: `#include <stdint.h>

/* ---------- 滑动平均：用累加和避免每次求和 ---------- */
#define MA_N 8
typedef struct {
    uint16_t buf[MA_N];
    uint32_t sum;
    uint8_t  idx;
    uint8_t  cnt;
} ma_t;

uint16_t ma_filter(ma_t *f, uint16_t x)
{
    if (f->cnt < MA_N) {
        f->sum += x;
        f->buf[f->idx] = x;
        f->cnt++;
    } else {
        f->sum -= f->buf[f->idx];      /* 减去最旧的 */
        f->sum += x;
        f->buf[f->idx] = x;
    }
    f->idx = (uint8_t)((f->idx + 1) % MA_N);
    return (uint16_t)(f->sum / f->cnt);
}

/* ---------- 中值滤波：N=5，插入排序 ---------- */
#define MED_N 5
uint16_t median_filter(uint16_t *buf, uint16_t x)
{
    for (int i = MED_N - 1; i > 0; i--) buf[i] = buf[i - 1];
    buf[0] = x;

    uint16_t tmp[MED_N];
    for (int i = 0; i < MED_N; i++) tmp[i] = buf[i];

    for (int i = 1; i < MED_N; i++) {          /* 插入排序 */
        uint16_t key = tmp[i];
        int j = i - 1;
        while (j >= 0 && tmp[j] > key) { tmp[j + 1] = tmp[j]; j--; }
        tmp[j + 1] = key;
    }
    return tmp[MED_N / 2];
}

/* ---------- 一阶低通：定点实现，避免浮点 ---------- */
/* y = y + (x - y) * a，a 用 Q8 定点表示（如 0.2 → 51/256） */
uint16_t lpf_filter(uint16_t x, uint8_t a_q8)
{
    static int32_t y;
    if (y == 0) y = x;                          /* 首次直接赋值 */
    y += (((int32_t)x - y) * a_q8) >> 8;
    return (uint16_t)y;
}`
        },
        codeNote: `<b>定点技巧：</b>把系数放大 256 倍存成整数，乘完再右移 8 位，避免在 Cortex-M0 这种没有 FPU 的芯片上跑浮点。注意中间结果用 <code>int32_t</code> 防止溢出。`,
        apply: `<p>温度、压力这类慢变量可以重度滤波（N=16 甚至更多）；电流、位置这类控制量要保证响应速度，滤波不能太重，否则相位延迟会导致振荡。</p>
<p>如果噪声来自电源或地线，先解决硬件问题（加去耦电容、分开模拟地、缩短走线），软件滤波只是补救。</p>`,
        pitfalls: [
          "<b>盲目加大平均次数。</b>N 越大越平滑，但响应越慢，控制环里会造成超调和振荡。",
          "<b>用浮点实现滤波。</b>没有 FPU 的 MCU 上每次浮点运算几十个周期，采样率高时 CPU 会被吃满。",
          "<b>忽略数据类型溢出。</b>累加和用 <code>uint16_t</code> 存 8 个 4095 的值会溢出，必须用 <code>uint32_t</code>。"
        ],
        follow: [
          [
            "滑动平均怎么优化计算量？",
            "用累加和：每次减去最旧值、加上最新值，避免每次遍历求和。N 取 2 的幂时除法可以用移位，进一步减少开销。"
          ],
          [
            "什么是卡尔曼滤波？嵌入式里用得多吗？",
            "一种基于状态空间模型的最优估计，能融合多源数据并抑制噪声。计算量较大，通常用于姿态解算（IMU）、电池 SOC 估计。简单场景用互补滤波或低通就够了。"
          ],
          [
            "滤波会引入延迟，怎么补偿？",
            "在控制环里用“预测 + 滤波”，或根据滤波器的群延迟做相位超前补偿。也可以提高采样率来减小延迟占比。"
          ]
        ]
      },

      {
        id: "P-05",
        chapter: "sensor",
        topic: "ultra",
        title: "超声波测距的时序是怎样的？误差从哪来？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "触发脉冲、回波宽度、声速温度补偿，以及多次测量与滤波。",
        q: `<p>面试官：HC-SR04 这类<strong>超声波模块</strong>怎么驱动？测距原理是什么？测量结果不稳定，可能有哪些原因？</p>`,
        exam: `<p>考察时序控制与误差分析能力。能说清“10us 触发脉冲、回波高电平宽度对应往返时间、距离 = 时间 × 声速 / 2”，以及“温度影响声速、盲区、多径反射”，说明你调过实际传感器。</p>`,
        core: `<p>HC-SR04 给 Trig 10µs 高电平，测 Echo 高电平时间，距离=时间×声速/2；读数不稳多因余震、目标角度、供电噪声和温漂，取多次中值并做温度补偿。</p>`,
        answer: `<p>HC-SR04 有四个引脚：VCC、GND、Trig、Echo。工作时先给 Trig 一个至少 10 微秒的高电平脉冲，模块内部发出 8 个 40kHz 的超声波脉冲，然后把 Echo 拉高；收到回波后 Echo 拉低。Echo 高电平的持续时间就是声波往返的时间。</p>
<p>距离 = 时间 × 声速 / 2。声速在 20°C 时约 343m/s，即 0.0343cm/μs，所以常用公式是 <code>距离(cm) = 高电平时间(μs) / 58</code>。</p>
<p>误差来源主要有：声速随温度变化（每升高 1°C 约增加 0.6m/s，误差约 0.17%）；被测物体表面角度和材质影响反射强度；模块有最小盲区（通常 2cm）；多次反射导致收到错误的回波。</p>
<p>提高稳定性的办法：测多次取中值、加温度补偿、避开软性材质、保证测量间隔大于 60ms 避免残余回波干扰。</p>`,
        principle: `<p>40kHz 的超声波波长约 8.5mm，遇到尺寸大于波长的障碍物反射较强，小物体或斜面反射弱，容易测不到。声波扩散角约 15°，所以测量的是锥形区域内最近物体的距离，不是“正前方那一点”。</p>
<p>Echo 高电平的测量最好用输入捕获，精度可以达到微秒级；用 <code>while</code> 轮询电平会受中断影响，误差可能几十微秒，对应厘米级误差。</p>`,
        fig: {
          type: "flow",
          title: "一次测距的时序",
          tag: "timing",
          items: [
            { t: "Trig 10us", d: "启动测量" },
            { t: "发 8 个脉冲", d: "40kHz" },
            { t: "Echo 拉高", d: "开始计时" },
            { t: "收到回波", d: "Echo 拉低" },
            { t: "计算距离", d: "t × 343 / 2" }
          ]
        },
        code: {
          lang: "c",
          title: "ultrasonic.c",
          src: `#include "stm32f1xx_hal.h"

#define TRIG_PIN   GPIO_PIN_0
#define TRIG_PORT  GPIOA
#define ECHO_PIN   GPIO_PIN_1

/* 用输入捕获测量 Echo 高电平宽度，单位微秒 */
static volatile uint32_t s_rise_tick;
static volatile uint32_t s_pulse_us;
static volatile uint8_t  s_done;

void Ultrasonic_Init(void)
{
    /* Trig 推挽输出，Echo 配成捕获输入 */
    GPIO_InitTypeDef g = {0};
    g.Pin = TRIG_PIN; g.Mode = GPIO_MODE_OUTPUT_PP; g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(TRIG_PORT, &g);

    g.Pin = ECHO_PIN; g.Mode = GPIO_MODE_IT_RISING_FALLING; g.Pull = GPIO_PULLDOWN;
    HAL_GPIO_Init(TRIG_PORT, &g);

    HAL_NVIC_SetPriority(EXTI1_IRQn, 2, 0);
    HAL_NVIC_EnableIRQ(EXTI1_IRQn);
}

/* 双边沿中断：上升沿记开始，下降沿算宽度 */
void EXTI1_IRQHandler(void)
{
    uint32_t now = TIM_GetCounterUs();      /* 1MHz 自由计数 */

    if (HAL_GPIO_ReadPin(TRIG_PORT, ECHO_PIN) == GPIO_PIN_SET) {
        s_rise_tick = now;
    } else {
        s_pulse_us = now - s_rise_tick;     /* 无符号相减，自动处理回绕 */
        s_done = 1;
    }
    __HAL_GPIO_EXTI_CLEAR_IT(ECHO_PIN);
}

/* 发起一次测量：必须间隔 60ms 以上 */
uint16_t Ultrasonic_MeasureCm(void)
{
    s_done = 0;

    HAL_GPIO_WritePin(TRIG_PORT, TRIG_PIN, GPIO_PIN_SET);
    DelayUs(12);                            /* 至少 10us */
    HAL_GPIO_WritePin(TRIG_PORT, TRIG_PIN, GPIO_PIN_RESET);

    uint32_t start = HAL_GetTick();
    while (!s_done && (HAL_GetTick() - start) < 50) { }   /* 超时保护 */

    if (!s_done || s_pulse_us == 0) return 0xFFFF;        /* 测量失败 */

    /* 温度补偿：声速 = 331.4 + 0.607 × T(°C) */
    float temp = GetTemperatureC();
    float speed_cm_per_us = (331.4f + 0.607f * temp) / 10000.0f;

    return (uint16_t)(s_pulse_us * speed_cm_per_us / 2.0f);
}`
        },
        apply: `<p>机器人避障通常装多个超声波，要注意它们之间会互相干扰。解决办法是分时轮流触发，或者用编码调制区分。测量周期也要留够，否则上一次的回波还没消失，下一次就开始了。</p>
<p>如果只需要“有没有障碍物”，可以只判断回波是否在阈值时间内到达，不需要精确距离，响应更快。</p>`,
        pitfalls: [
          "<b>触发脉冲太短。</b>小于 10us 模块可能不响应，表现为“一直测不到”。",
          "<b>用轮询测宽度。</b>受中断和调度影响，误差大，应该用输入捕获。",
          "<b>测量间隔太短。</b>残余回波被当成新回波，测出的距离偏小且跳变。"
        ],
        follow: [
          [
            "超声波和红外测距怎么选？",
            "超声波不受光线和物体颜色影响，能测透明物体，但刷新慢、有盲区、易受风和温度影响；红外测距快、精度高，但受光照和表面反射率影响大，量程短。"
          ],
          [
            "如何提高测距精度？",
            "温度补偿声速、多次测量取中值、用输入捕获提高时间分辨率、保证模块与被测面垂直、避开软性吸音材料。"
          ],
          [
            "盲区是怎么产生的？",
            "发射和接收共用换能器，发射后需要一段时间才能切换到接收状态，这段时间内的回波无法被检测，形成最小可测距离（通常 2~4cm）。"
          ]
        ]
      },

      {
        id: "P-06",
        chapter: "sensor",
        topic: "motor",
        title: "编码器怎么测速？M 法和 T 法有什么区别？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "正交解码、四倍频、测频与测周法的适用区间，以及低速测量难点。",
        q: `<p>面试官：增量式<strong>编码器</strong>怎么测转速？M 法和 T 法有什么区别？低速时测不准怎么办？</p>`,
        exam: `<p>考察电机控制的基础。能说清“A/B 两相正交、四倍频提高分辨率”“M 法数脉冲适合高速、T 法测周期适合低速”“低速可以用 M/T 法结合”，说明你做过闭环控制。</p>`,
        core: `<p>增量编码器数 A/B 脉冲，四倍频提高分辨率；高速用 M 法测固定时间脉冲数，低速用 T 法测脉冲间隔，中速用 M/T 法。</p>`,
        answer: `<p>增量式编码器输出 A、B 两路正交信号，相位差 90 度。通过判断哪一路先跳变可以知道方向，通过数脉冲个数可以知道转过的角度。对 A、B 的上升沿和下降沿都计数就是四倍频，分辨率提高 4 倍。</p>
<p>M 法（测频法）是在固定时间内数脉冲个数，速度 = 脉冲数 / (时间 × 每转脉冲数)。时间窗口固定，高速时脉冲多、相对误差小；低速时脉冲少，误差大。</p>
<p>T 法（测周法）是测量两个脉冲之间的时间，速度 = 1 / (时间 × 每转脉冲数)。低速时时间长、测量精度高；高速时时间太短，误差大。</p>
<p>所以低速用 T 法、高速用 M 法，中间用 M/T 法：同时测量固定时间内的脉冲数和第一个脉冲到最后一个脉冲的时间，兼顾两者。</p>`,
        principle: `<p>四倍频的误差来源是“半个脉冲”的量化误差。M 法在时间窗口结束时可能刚好切在一个脉冲中间，最多差 1 个脉冲，所以脉冲总数越少相对误差越大。T 法的时间测量误差来自定时器分辨率，通常是一个计数周期。</p>
<p>STM32 的定时器有编码器模式，硬件自动完成正交解码和计数，不需要软件判断方向，也不占 CPU。配置 <code>TIM_ENCODERMODE_TI12</code> 即可四倍频计数。</p>`,
        fig: {
          type: "table",
          title: "M 法与 T 法对比",
          tag: "compare",
          head: ["维度", "M 法（测频）", "T 法（测周）"],
          rows: [
            ["测量对象", "固定时间内的脉冲数", "两个脉冲间的时间"],
            ["适合转速", "高速", "低速"],
            ["低速误差", "大（脉冲太少）", "小"],
            ["高速误差", "小", "大（时间太短）"],
            ["实现方式", "定时器计数 + 定时窗口", "输入捕获测周期"]
          ]
        },
        code: {
          lang: "c",
          title: "encoder.c",
          src: `#include "stm32f1xx_hal.h"

/* TIM3 编码器模式：PA6/PA7 接 A/B 相，硬件四倍频 */
TIM_HandleTypeDef htim3;

void Encoder_Init(void)
{
    __HAL_RCC_TIM3_CLK_ENABLE();
    __HAL_RCC_GPIOA_CLK_ENABLE();

    /* PA6/PA7 复用为 TIM3_CH1/CH2，上拉避免悬空 */
    GPIO_InitTypeDef g = {0};
    g.Pin       = GPIO_PIN_6 | GPIO_PIN_7;
    g.Mode      = GPIO_MODE_AF_PP;
    g.Pull      = GPIO_PULLUP;
    g.Speed     = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    TIM_Encoder_InitTypeDef enc = {0};
    enc.EncoderMode  = TIM_ENCODERMODE_TI12;   /* A/B 双相，四倍频 */
    enc.IC1Polarity  = TIM_ICPOLARITY_RISING;
    enc.IC1Selection = TIM_ICSELECTION_DIRECTTI;
    enc.IC1Prescaler = TIM_ICPSC_DIV1;
    enc.IC1Filter    = 6;                      /* 滤波，抑制抖动 */
    enc.IC2Polarity  = TIM_ICPOLARITY_RISING;
    enc.IC2Selection = TIM_ICSELECTION_DIRECTTI;
    enc.IC2Prescaler = TIM_ICPSC_DIV1;
    enc.IC2Filter    = 6;

    htim3.Instance = TIM3;
    htim3.Init.Period = 0xFFFF;                /* 满量程，靠差值计算 */
    htim3.Init.CounterMode = TIM_COUNTERMODE_UP;
    HAL_TIM_Encoder_Init(&htim3, &enc);
    HAL_TIM_Encoder_Start(&htim3, TIM_CHANNEL_ALL);
}

/* 每 10ms 调用：M 法测速 */
#define ENCODER_PPR   1000        /* 编码器线数 × 4（四倍频后） */
#define SAMPLE_MS     10

int32_t Encoder_GetSpeedRpm(void)
{
    static int16_t last_cnt;
    int16_t now = (int16_t)__HAL_TIM_GET_COUNTER(&htim3);

    /* 有符号差值，自动处理计数回绕和反转 */
    int16_t delta = (int16_t)(now - last_cnt);
    last_cnt = now;

    /* rpm = 脉冲数 / 每转脉冲数 / 时间(min) */
    return (int32_t)delta * 60000 / (ENCODER_PPR * SAMPLE_MS);
}

/* 低速时改用 T 法：用输入捕获测相邻脉冲间隔 */
volatile uint32_t g_last_cap;
volatile uint32_t g_period_ticks;

void TIM2_IRQHandler(void)      /* 1MHz 计数，捕获 A 相上升沿 */
{
    if (__HAL_TIM_GET_FLAG(&htim2, TIM_FLAG_CC1)) {
        uint32_t cap = HAL_TIM_ReadCapturedValue(&htim2, TIM_CHANNEL_1);
        g_period_ticks = cap - g_last_cap;     /* 一个脉冲的周期 */
        g_last_cap = cap;
        __HAL_TIM_CLEAR_FLAG(&htim2, TIM_FLAG_CC1);
    }
}`
        },
        apply: `<p>电机控制里，速度环通常 1kHz 采样，位置环 100~200Hz。编码器分辨率越高，低速控制越平滑，但成本也越高。可以用“编码器 + 霍尔”组合，或者用无感 FOC 的观测器估算。</p>
<p>接线时要注意 A/B 相不要接反，否则方向相反；长线要加屏蔽和滤波，否则电机干扰会导致计数错误，表现为“位置偶尔跳变”。</p>`,
        pitfalls: [
          "<b>用无符号变量存计数差值。</b>反转时会下溢成巨大值，速度突然爆表。必须转成有符号再相减。",
          "<b>低速只用 M 法。</b>10ms 内可能只有几个脉冲，量化误差导致速度剧烈跳动，闭环会抖。",
          "<b>忽略编码器线数与四倍频的关系。</b>算转速时用错脉冲数，速度差 4 倍。"
        ],
        follow: [
          [
            "什么是正交解码？为什么要四倍频？",
            "A/B 两相相位差 90 度，通过两路的电平组合可以判断方向和位置。对两相的上下沿都计数，每转的计数是单相的 4 倍，分辨率提高 4 倍。"
          ],
          [
            "绝对式编码器和增量式有什么区别？",
            "增量式输出相对脉冲，断电后位置丢失，需要回零；绝对式每个位置有唯一编码（如 SSI、BiSS、多摩川），上电即知位置，但成本高、接口复杂。"
          ],
          [
            "如何用编码器做位置闭环？",
            "累计脉冲数得到位置，与目标位置比较得到误差，用 PID 计算输出给电流环。注意累计值要用 32 位并处理溢出，长时间运行要考虑多圈计数。"
          ]
        ]
      },

      {
        id: "P-07",
        chapter: "arch",
        topic: "layer",
        title: "驱动层和应用层怎么分离？接口应该怎么设计？",
        diff: "中级",
        freq: "高频",
        type: "综合设计题",
        point: "分层职责、ops 结构体、不透明指针，以及换硬件不改应用的落地方法。",
        q: `<p>面试官：你的项目里<strong>驱动层和应用层</strong>是怎么划分的？如果换一款同类型的传感器，应用层代码需要改吗？请描述一下你的接口设计。</p>`,
        exam: `<p>这是考察工程能力的核心题。能说出“应用只依赖抽象接口，具体实现通过 ops 结构注入”“用不透明指针隐藏内部细节”“换器件只改驱动实现和初始化”，说明你写过可复用的代码。</p>`,
        core: `<p>驱动层用 ops 结构体暴露 init/read/write 等函数指针，应用只依赖接口；换传感器只新增驱动并换注册实例，应用代码不改。</p>`,
        answer: `<p>分层的原则是<strong>依赖方向单向</strong>：应用层依赖接口，不依赖具体硬件；驱动层实现接口，不知道应用的存在。</p>
<p>我通常定义一个 ops 结构体，里面放 init、read、write、ioctl 这类函数指针，应用层拿到的是这个结构体的指针。具体是哪个传感器，由初始化时注册的实例决定。</p>
<p>数据结构上用不透明指针：头文件里只声明 <code>typedef struct sensor sensor_t;</code>，具体成员定义在 .c 里。应用层只能通过接口操作，看不到内部字段，也就不会依赖实现细节。</p>
<p>这样换传感器时，只需要新写一个驱动文件，实现同样的 ops，然后在初始化处换一个注册调用，应用层代码一行不改。</p>`,
        principle: `<p>这种设计本质上是 C 语言里的“面向接口编程”，对应设计模式中的策略模式和依赖倒置。ops 结构体相当于虚函数表，不透明指针相当于 this 指针。</p>
<p>代价是多了一层间接调用（几十个周期）和一点内存（ops 结构 + 实例结构）。对于传感器读取这种毫秒级操作，开销完全可以忽略；但对于微秒级的中断路径，就要谨慎使用。</p>`,
        fig: {
          type: "layers",
          title: "驱动分层与依赖方向",
          tag: "architecture",
          items: [
            { tag: "APP", t: "应用层", d: "业务逻辑，只依赖 sensor_ops_t" },
            { tag: "SVC", t: "服务层", d: "数据滤波、单位换算、事件分发" },
            { tag: "DRV", t: "驱动层", d: "实现 ops：init / read / ioctl" },
            { tag: "BSP", t: "硬件抽象", d: "I2C 读写、GPIO、延时" }
          ]
        },
        code: {
          lang: "c",
          title: "sensor_ops.c",
          src: `/* ---------- sensor.h：应用层只看到这些 ---------- */
typedef struct sensor sensor_t;          /* 不透明指针，隐藏实现 */

typedef struct {
    int  (*init)(sensor_t *s);
    int  (*read)(sensor_t *s, float *value);
    int  (*sleep)(sensor_t *s);
    void (*destroy)(sensor_t *s);
} sensor_ops_t;

sensor_t *sensor_create(const sensor_ops_t *ops, void *bus);
int       sensor_read(sensor_t *s, float *value);
void      sensor_destroy(sensor_t *s);

/* ---------- sensor.c：通用逻辑 ---------- */
struct sensor {
    const sensor_ops_t *ops;
    void               *bus;
    float               last_value;
};

sensor_t *sensor_create(const sensor_ops_t *ops, void *bus)
{
    static sensor_t pool[4];             /* 静态池，不用 malloc */
    static uint8_t  used[4];

    for (int i = 0; i < 4; i++) {
        if (!used[i]) {
            used[i] = 1;
            pool[i].ops = ops;
            pool[i].bus = bus;
            if (ops->init(&pool[i]) != 0) { used[i] = 0; return NULL; }
            return &pool[i];
        }
    }
    return NULL;
}

int sensor_read(sensor_t *s, float *value)
{
    if (!s || !s->ops->read) return -1;
    return s->ops->read(s, value);
}

/* ---------- bme280.c：具体实现，只关心自己的寄存器 ---------- */
static int bme280_init(sensor_t *s)   { return bme280_hw_init(s->bus); }
static int bme280_read(sensor_t *s, float *v) { return bme280_read_temp(s->bus, v); }

const sensor_ops_t bme280_ops = {
    .init = bme280_init,
    .read = bme280_read,
    .sleep = NULL,
    .destroy = NULL
};

/* ---------- app.c：应用层完全不知道用的是哪个传感器 ---------- */
void app_init(void)
{
    sensor_t *temp = sensor_create(&bme280_ops, &i2c1_bus);
    float t;
    if (temp && sensor_read(temp, &t) == 0) {
        Display_Temperature(t);
    }
}`
        },
        apply: `<p>实际项目里，这一层抽象还能带来测试便利：在 PC 上编译时注入一个“假驱动”，返回预设数据，就能脱离硬件跑单元测试，大幅提升代码质量。</p>
<p>如果器件种类很多，可以把 ops 和实例做成注册表，用字符串或 ID 查找，配合配置文件实现“不重新编译就换型号”。</p>`,
        pitfalls: [
          "<b>在头文件里暴露结构体成员。</b>应用层直接访问字段，等于把实现细节焊死，换器件就要改应用代码。",
          "<b>ops 里塞太多器件特有功能。</b>接口应该只保留共性操作，特有功能通过 ioctl + 命令码扩展。",
          "<b>为了分层而分层。</b>一个只有两行的 LED 驱动没必要搞 ops 结构，过度抽象会增加阅读成本。"
        ],
        follow: [
          [
            "不透明指针有什么好处？",
            "隐藏实现细节、强制通过接口访问、可以在不改变头文件的情况下修改内部结构（二进制兼容），也避免应用层误改驱动内部状态。"
          ],
          [
            "ioctl 一般怎么设计？",
            "用命令码 + 可变参数（或 void* 参数）实现器件特有功能，如校准、设置量程、读原始值。命令码用宏定义，驱动内部 switch 分发。"
          ],
          [
            "分层会不会影响性能？",
            "会引入一次间接调用和少量内存开销，通常在几十个周期量级。对毫秒级业务无影响；对微秒级中断路径，可以绕过抽象直接调用底层实现。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("peripheral-driver", {
    chapters: [
      {
        id: "input",
        topics: [
          { id: "matrix", title: "矩阵键盘" },
          { id: "encoder", title: "旋转编码器" },
          { id: "touch", title: "触摸按键" }
        ]
      },
      {
        id: "hmi",
        topics: [
          { id: "lcd", title: "SPI 液晶屏" },
          { id: "buzzer", title: "蜂鸣器" }
        ]
      },
      {
        id: "sensor",
        topics: [
          { id: "relay", title: "继电器与功率驱动" },
          { id: "step", title: "步进电机" },
          { id: "onewire", title: "单总线器件" },
          { id: "calib", title: "传感器校准" }
        ]
      },
      {
        id: "arch",
        topics: [{ id: "isr", title: "中断与主循环分工" }]
      }
    ],
    questions: [
      {
        id: "P-08",
        chapter: "input",
        topic: "matrix",
        title: "矩阵键盘怎么扫描？如何做到不丢键、不串键？",
        diff: "中级",
        freq: "中频",
        type: "驱动设计题",
        point: "行扫描列读取，配合消抖、状态机和“新按下”事件，避免长按重复触发。",
        q: `<p>面试官：4×4 矩阵键盘怎么用 8 个 IO 读出 16 个键？扫描时要注意什么？</p>`,
        exam: `<p>考察 GPIO 扫描和按键状态机。能说出扫描方向、消抖、以及“只在按下沿产生一次事件”，就说明写过可用的键盘驱动。</p>`,
        core: `<p>4×4 键盘逐行输出低电平、读列线判断按键；扫描 5~10ms，连续两次一致才确认，只在按下沿出键值，多键同按要用二极管防鬼键。</p>`,
        answer: `<p><b>硬件连接：</b>4 根行线、4 根列线，每个交叉点一个按键。按键按下时对应的行和列导通。</p>
<p><b>扫描方法：</b></p>
<ol>
<li>所有行输出高电平，列配置为下拉输入（或反之）；</li>
<li>依次让一行输出低电平，其它行高电平；</li>
<li>读取 4 根列线，哪一列为低，就说明该行该列的按键被按下；</li>
<li>遍历 4 行，得到整个键盘状态。</li>
</ol>
<p><b>关键处理：</b></p>
<ul>
<li><b>消抖</b>：机械按键有 5~20ms 抖动，连续两次扫描结果一致才确认；</li>
<li><b>状态机</b>：区分“按下”“保持”“释放”，只在“按下沿”产生一次键值事件，长按可以另外产生重复事件；</li>
<li><b>防串键</b>：多个键同时按下时，可能出现“鬼键”（ghosting），需要二极管隔离或限制同时按键数量；</li>
<li><b>扫描周期</b>：5~10ms 一次，太快浪费 CPU，太慢会漏掉快速按键。</li>
</ul>
<p>如果 IO 紧张，可以用 ADC 做电阻分压键盘，一个引脚读多个键，但无法支持组合键。</p>`,
        principle: `<p>矩阵键盘利用“行列为低”的导通关系，用 N+M 个 IO 扫描 N×M 个键。扫描本质是分时给每行施加不同电平，再读列线判断哪一列导通。</p>
<p>鬼键产生的原因是多个按键形成回路，让未按下的交叉点也呈现导通；二极管可以阻断反向回路。</p>`,
        fig: {
          type: "table",
          title: "矩阵键盘扫描过程（4×4）",
          tag: "keypad",
          head: ["步骤", "行输出", "读取", "判断"],
          rows: [
            ["1", "Row0 = 0，其余 1", "Col0~3", "哪列为 0 即该键按下"],
            ["2", "Row1 = 0，其余 1", "Col0~3", "扫描第二行"],
            ["3", "Row2 = 0", "Col0~3", "扫描第三行"],
            ["4", "Row3 = 0", "Col0~3", "扫描第四行"]
          ]
        },
        code: {
          lang: "c",
          title: "keypad.c",
          src: `#include <stdint.h>

#define ROWS 4
#define COLS 4

/* 行输出、列输入的底层操作由 BSP 提供 */
static void row_drive(int r);
static uint8_t col_read(void);

/* 扫描一次，返回键码 0~15，无键返回 0xFF */
uint8_t keypad_scan_once(void)
{
    for (int r = 0; r < ROWS; r++) {
        row_drive(r);
        uint8_t cols = col_read();
        for (int c = 0; c < COLS; c++) {
            if ((cols & (1u << c)) == 0) {
                return (uint8_t)(r * COLS + c);
            }
        }
    }
    return 0xFF;
}

/* 带消抖的扫描：连续两次一致才确认 */
uint8_t keypad_scan_debounced(void)
{
    static uint8_t last = 0xFF;
    static uint8_t stable = 0xFF;
    uint8_t now = keypad_scan_once();

    if (now == last) {
        stable = now;
    }
    last = now;
    return stable;
}`
        },
        codeNote: "实际驱动要把“扫描”和“按键事件”分开：扫描只更新状态，事件层负责按下沿、长按和释放。",
        apply: `<p>我做过的面板用 4×4 键盘加一个编码器，扫描放在 5ms 定时任务里，事件层输出“键值 + 事件类型”，业务层只处理事件，不关心扫描细节。</p>
<p>如果按键数量少，直接一个 IO 一个键更简单可靠，不必为了省 IO 增加扫描复杂度。</p>`,
        pitfalls: [
          "<b>不消抖。</b>一次按键产生多个事件。",
          "<b>长按重复触发。</b>没有区分按下沿和保持状态。",
          "<b>忽略鬼键。</b>组合键时读到不存在的键。",
          "<b>扫描太慢。</b>快速点击被漏掉。"
        ],
        follow: [
          ["如何支持组合键？", "每个键加二极管防止鬼键，或改用独立 IO / 专用键盘芯片；软件上维护按键位图，判断多个键同时按下的组合。"],
          ["矩阵键盘能低功耗吗？", "可以，所有行设为低电平、列设为中断唤醒，有键按下时产生中断再启动扫描；扫描完立即回到低功耗。"]
        ]
      },

      {
        id: "P-09",
        chapter: "input",
        topic: "encoder",
        title: "EC11 旋转编码器怎么解码？为什么会出现跳步和反向？",
        diff: "中级",
        freq: "中频",
        type: "驱动设计题",
        point: "正交解码看状态转移，用状态表或查表法，配合消抖和方向校验。",
        q: `<p>面试官：EC11 编码器接两个 GPIO，怎么判断正反转？为什么快速旋转时方向会错乱？</p>`,
        exam: `<p>考察正交信号处理和状态机设计。能说出“状态表判断合法转移、抖动会导致非法跳变”，就很好。</p>`,
        core: `<p>编码器解码用 A/B 四状态查表，只有合法相邻跳变才加减计数；快速旋转会丢状态，所以中断里要同时读两相并做状态表解码。</p>`,
        answer: `<p><b>正交信号：</b>EC11 的 A、B 两相相差 90°。正转时 A 领先 B，反转时 B 领先 A。每个周期有 4 个稳定状态：</p>
<p><code>00 → 01 → 11 → 10 → 00</code>（正转）</p>
<p><code>00 → 10 → 11 → 01 → 00</code>（反转）</p>
<p><b>解码方法：</b>把上一次的 A/B 状态和当前状态组合成 4 位索引，查表得到“+1 / -1 / 0”。只有合法的相邻状态转移才计数，非法跳变（如 00 → 11）视为抖动，不计数。</p>
<p><b>为什么快速旋转会错乱：</b></p>
<ul>
<li>中断响应不及时，一次中断里状态已经跳过多步，简单“读 A 相电平”会判断错方向；</li>
<li>机械触点抖动产生非法状态；</li>
<li>用轮询且周期太长，漏掉中间状态。</li>
</ul>
<p>解决办法是用完整的状态表解码，并且在中断里读取 A/B 两相，而不是只读一相。硬件上可以加 RC 滤波。</p>`,
        principle: `<p>正交编码的每个状态转移只改变一位，所以合法转移的汉明距离为 1。抖动或漏采样会产生汉明距离为 2 的跳变，可以直接判定为无效。</p>
<p>状态表把“上一状态 + 当前状态”映射到计数增量，是处理正交信号最可靠的方式。</p>`,
        fig: {
          type: "table",
          title: "正交解码状态表（节选）",
          tag: "quadrature",
          head: ["上一状态", "当前状态", "增量", "说明"],
          rows: [
            ["00", "01", "+1", "正转一步"],
            ["01", "11", "+1", "正转一步"],
            ["00", "10", "-1", "反转一步"],
            ["10", "11", "-1", "反转一步"],
            ["00", "11", "0", "非法跳变，忽略"]
          ]
        },
        code: {
          lang: "c",
          title: "ec11.c",
          src: `#include <stdint.h>

/* 状态表：索引 = (last << 2) | now，值 = 增量
 * 状态编码 0=00, 1=01, 2=10, 3=11；正转 00→01→11→10→00 */
static const int8_t QDEC_TABLE[16] = {
     0, +1, -1,  0,
    -1,  0,  0, +1,
    +1,  0,  0, -1,
     0, -1, +1,  0
};

static uint8_t last_state = 0;
static int32_t position = 0;

/* 在 A/B 任一边沿中断里调用 */
void ec11_update(uint8_t a, uint8_t b)
{
    uint8_t now = (uint8_t)((a << 1) | b);
    uint8_t idx = (uint8_t)((last_state << 2) | now);

    position += QDEC_TABLE[idx];
    last_state = now;
}

int32_t ec11_position(void)
{
    return position;
}`
        },
        codeNote: "状态表把非法跳变映射为 0，天然具备一定的抗抖动能力；仍建议硬件加 RC 滤波。",
        apply: `<p>我做旋钮菜单时，编码器中断里只更新位置，主循环按固定周期读取位置差，转换成“上/下”事件并做加速（转得快时步进更大）。这样手感好，也不会因为中断频繁而卡顿。</p>
<p>如果编码器带按键，按键和旋转要分开处理，避免按下时旋转产生误触发。</p>`,
        pitfalls: [
          "<b>只读一相判断方向。</b>快速旋转时方向错乱。",
          "<b>不做状态校验。</b>抖动被当成有效脉冲，位置漂移。",
          "<b>在中断里做耗时处理。</b>丢失边沿。",
          "<b>忘记初始状态。</b>第一次读数产生错误增量。"
        ],
        follow: [
          ["EC11 的“格”和“脉冲”是什么关系？", "EC11 通常是 20 个脉冲一圈，每个脉冲包含一个完整正交周期；有的编码器每格产生 4 个边沿，需要除以 4 才是“格”数。"],
          ["如何用定时器的编码器模式接 EC11？", "把 A/B 接到定时器 CH1/CH2，配置为编码器模式，硬件自动计数，比 GPIO 中断更可靠，适合高速旋转。"]
        ]
      },

      {
        id: "P-10",
        chapter: "hmi",
        topic: "buzzer",
        title: "有源蜂鸣器和无源蜂鸣器有什么区别？怎么驱动？",
        diff: "初级",
        freq: "中频",
        type: "硬件驱动题",
        point: "有源自带振荡、给电就响；无源需要外部方波，靠频率控制音调。",
        q: `<p>面试官：蜂鸣器接上电不响，或者声音很小，可能是什么原因？有源和无源怎么区分？</p>`,
        exam: `<p>考察基础器件认知和驱动电路。能说出“无源需要 PWM、有源只需电平”，以及三极管驱动和续流二极管，就很好。</p>`,
        core: `<p>有源蜂鸣器给直流就响、频率固定；无源要外部方波，频率定音调；电流大要用三极管驱动，感性负载加续流二极管。</p>`,
        answer: `<p><b>有源蜂鸣器</b>内部有振荡电路，只要给额定直流电压就发声，频率固定。驱动简单，GPIO 加三极管即可。</p>
<p><b>无源蜂鸣器</b>本质是电磁或压电发声器件，需要外部提供方波信号，<b>频率决定音调</b>，占空比影响音量和音色。通常用定时器 PWM 驱动。</p>
<p><b>区分方法：</b>看背面有没有振荡电路（有源的通常有封装好的驱动电路），或者直接加直流电压测试——响的是有源，不响的是无源。</p>
<p><b>驱动电路：</b></p>
<ul>
<li>蜂鸣器电流通常几十 mA，超过 GPIO 驱动能力，必须用三极管或 MOS 管；</li>
<li>感性负载（电磁式）要并联续流二极管，防止关断时反向电动势击穿三极管；</li>
<li>压电式是容性负载，可以串联小电阻限流；</li>
<li>基极要加限流电阻，避免驱动电流过大。</li>
</ul>
<p><b>声音小的原因：</b>驱动电压不足、占空比太低、频率偏离谐振点、三极管没有饱和导通。</p>`,
        principle: `<p>无源蜂鸣器的发声效率在谐振频率附近最高，所以驱动频率要接近它的标称频率（如 2.7kHz）。偏离谐振点，即使电压足够，声音也会明显变小。</p>
<p>PWM 占空比影响平均功率，50% 时能量最大；但某些蜂鸣器在特定占空比下音色更好，需要实测。</p>`,
        fig: {
          type: "table",
          title: "有源与无源蜂鸣器对比",
          tag: "buzzer",
          head: ["类型", "驱动信号", "音调控制", "典型电路"],
          rows: [
            ["有源", "直流电平", "固定", "GPIO + 三极管"],
            ["无源", "方波/PWM", "频率可调", "定时器 PWM + 三极管"],
            ["压电式", "方波", "频率可调", "需考虑容性负载"],
            ["电磁式", "方波", "频率可调", "必须加续流二极管"]
          ]
        },
        code: {
          lang: "c",
          title: "buzzer.c",
          src: `#include "stm32f4xx_hal.h"

/* 无源蜂鸣器：用 TIM4 CH1 输出 PWM */
void buzzer_tone(uint32_t freq_hz)
{
    if (freq_hz == 0) {
        HAL_TIM_PWM_Stop(&htim4, TIM_CHANNEL_1);
        return;
    }

    /* 假设定时器时钟 84MHz，预分频 84 → 1MHz 计数 */
    uint32_t period = 1000000u / freq_hz;
    __HAL_TIM_SET_AUTORELOAD(&htim4, period - 1u);
    __HAL_TIM_SET_COMPARE(&htim4, TIM_CHANNEL_1, period / 2u);  /* 50% 占空比 */

    HAL_TIM_PWM_Start(&htim4, TIM_CHANNEL_1);
}

/* 简单提示音序列：不阻塞主循环，用状态机播放 */
void buzzer_beep(uint16_t ms)
{
    buzzer_tone(2700);
    /* 由定时任务在 ms 后调用 buzzer_tone(0) */
    (void)ms;
}`
        },
        codeNote: "改变频率时要先停止 PWM 或等待当前周期结束，避免产生不完整的波形。",
        apply: `<p>我做报警器时用无源蜂鸣器，通过改变频率做出“滴滴—长鸣”的区分：短促高频表示按键，低频长鸣表示故障。比单一音调信息量更大。</p>
<p>音量不能只靠占空比调，实际测试发现某些蜂鸣器在 30% 占空比时反而更响，要按具体型号调。</p>`,
        pitfalls: [
          "<b>无源蜂鸣器直接给直流。</b>不响，还可能发热。",
          "<b>GPIO 直接驱动。</b>电流不足，声音小或损坏 IO。",
          "<b>感性负载不加续流二极管。</b>关断时击穿三极管。",
          "<b>频率偏离谐振点。</b>声音明显偏小。"
        ],
        follow: [
          ["如何用蜂鸣器播放音乐？", "把音符映射到频率表，用定时器按节拍切换频率和时长；播放逻辑放在状态机或定时任务里，不要阻塞主循环。"],
          ["压电蜂鸣器为什么需要更高的驱动电压？", "压电片是容性负载，需要足够的电压摆幅才能产生明显形变，低压驱动时声音很小，常需要升压电路。"]
        ]
      },

      {
        id: "P-11",
        chapter: "hmi",
        topic: "lcd",
        title: "SPI 液晶屏（如 ST7789）怎么驱动？刷屏慢怎么优化？",
        diff: "高级",
        freq: "中频",
        type: "驱动设计题",
        point: "命令/数据切换、窗口设置、DMA 批量传输；优化靠局部刷新和 DMA。",
        q: `<p>面试官：240×240 的 SPI 屏，全屏刷新要多久？怎么把刷屏速度提上来？</p>`,
        exam: `<p>考察对显示驱动和总线带宽的理解。能算出数据量、指出 SPI 频率和 DMA 是关键，并提到局部刷新，就很好。</p>`,
        core: `<p>240×240 RGB565 一屏 115200 字节，SPI 40MHz 理论约 23ms、实际加上命令开销会慢很多；刷新用 CASET/RASET 设窗口再 DMA 批量发送。</p>`,
        answer: `<p><b>数据量估算：</b>240×240×2 字节（RGB565）= 115200 字节。SPI 在 40MHz 下，理论上每秒 5MB，全屏约 23ms；但加上命令开销、软件逐字节发送，实际可能上百毫秒。</p>
<p><b>驱动要点：</b></p>
<ul>
<li><b>命令/数据切换</b>：DC 引脚区分命令和数据，CS 片选，RES 复位；</li>
<li><b>初始化序列</b>：按厂商提供的初始化表逐条写命令；</li>
<li><b>设置窗口</b>：写 CASET/RASET 指定刷新区域，再写 RAMWR 开始传像素；</li>
<li><b>批量传输</b>：用 DMA 发送像素数据，避免 CPU 逐字节等待。</li>
</ul>
<p><b>优化手段：</b></p>
<ul>
<li>提高 SPI 时钟（注意屏幕支持的上限和走线质量）；</li>
<li>用 DMA + 双缓冲，CPU 准备下一帧时 DMA 发送当前帧；</li>
<li>局部刷新：只更新变化的区域，而不是全屏；</li>
<li>减少颜色深度或使用调色板；</li>
<li>避免频繁设置窗口，合并连续区域的写入。</li>
</ul>`,
        principle: `<p>SPI 是串行总线，带宽 = 时钟频率 / 8（字节）。屏幕分辨率越高、颜色越深，数据量越大，带宽很快成为瓶颈。</p>
<p>DMA 把数据搬运从 CPU 手里接管，CPU 可以去准备下一块数据，形成流水线，显著提高有效刷新率。</p>`,
        fig: {
          type: "table",
          title: "240×240 RGB565 全屏数据量",
          tag: "lcd bandwidth",
          head: ["SPI 时钟", "理论字节率", "全屏耗时（理论）"],
          rows: [
            ["10 MHz", "1.25 MB/s", "约 92 ms"],
            ["20 MHz", "2.5 MB/s", "约 46 ms"],
            ["40 MHz", "5 MB/s", "约 23 ms"],
            ["80 MHz", "10 MB/s", "约 12 ms"]
          ],
          note: "实际耗时还要加上命令、窗口设置和软件开销，通常比理论值高 30% 以上。"
        },
        code: {
          lang: "c",
          title: "st7789.c",
          src: `#include "stm32f4xx_hal.h"

#define LCD_W 240
#define LCD_H 240

/* 等上一条 DMA 发完再改 DC，否则参数会被屏幕当成命令解析 */
static void lcd_wait_idle(void)
{
    while (hspi1.State != HAL_SPI_STATE_READY) { }   /* 工程里可用 TxCplt 回调或信号量代替忙等 */
}

static void lcd_cmd(uint8_t cmd)
{
    lcd_wait_idle();
    HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_RESET);
    HAL_SPI_Transmit(&hspi1, &cmd, 1, 10);
}

/* 少量参数用阻塞发送，保证调用返回时已发完；大批像素才用 DMA */
static void lcd_param(const uint8_t *buf, uint32_t len)
{
    lcd_wait_idle();
    HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_SET);
    HAL_SPI_Transmit(&hspi1, (uint8_t *)buf, len, 10);
}

static void lcd_data(const uint8_t *buf, uint32_t len)
{
    lcd_wait_idle();
    HAL_GPIO_WritePin(LCD_DC_PORT, LCD_DC_PIN, GPIO_PIN_SET);
    HAL_SPI_Transmit_DMA(&hspi1, (uint8_t *)buf, len);   /* DMA 批量发送 */
}

/* 设置刷新窗口 */
void lcd_set_window(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1)
{
    uint8_t buf[4];

    lcd_cmd(0x2A);                 /* CASET */
    buf[0] = x0 >> 8; buf[1] = x0 & 0xFF;
    buf[2] = x1 >> 8; buf[3] = x1 & 0xFF;
    lcd_param(buf, 4);

    lcd_cmd(0x2B);                 /* RASET */
    buf[0] = y0 >> 8; buf[1] = y0 & 0xFF;
    buf[2] = y1 >> 8; buf[3] = y1 & 0xFF;
    lcd_param(buf, 4);

    lcd_cmd(0x2C);                 /* RAMWR */
}`
        },
        codeNote: "DMA 发送期间不能修改缓冲区，否则屏幕会显示撕裂的画面；需要双缓冲或等待传输完成。",
        apply: `<p>我做仪表界面时，把界面分成“静态背景”和“动态数值”两层：背景只刷一次，数值区域用局部刷新，每秒只更新几十个像素，CPU 占用很低。</p>
<p>如果要做动画，用双缓冲 + DMA，配合 30fps 的定时刷新，避免撕裂。</p>`,
        pitfalls: [
          "<b>逐字节软件发送。</b>CPU 占用高，刷新慢。",
          "<b>DMA 发送时改缓冲区。</b>画面撕裂。",
          "<b>忘记设置窗口。</b>像素写到错误位置。",
          "<b>SPI 时钟超过屏幕规格。</b>花屏或通信失败。"
        ],
        follow: [
          ["为什么屏幕需要 CS 片选？", "SPI 总线可以挂多个从设备，CS 用来选中当前通信的屏幕；如果总线上只有一个设备，可以常拉低节省一个 IO。"],
          ["RGB565 和 RGB888 怎么选？", "RGB565 每像素 2 字节，带宽和内存占用小，适合 MCU；RGB888 色彩更丰富但数据量增加 50%，对 SPI 带宽压力大。"]
        ]
      },

      {
        id: "P-12",
        chapter: "sensor",
        topic: "relay",
        title: "继电器和 MOS 管怎么驱动？为什么必须加续流二极管？",
        diff: "中级",
        freq: "中频",
        type: "硬件驱动题",
        point: "感性负载关断产生反向电动势，续流二极管提供泄放回路，保护驱动管。",
        q: `<p>面试官：用 GPIO 控制继电器，为什么加了三极管还是会烧？电路上要注意什么？</p>`,
        exam: `<p>考察功率驱动和硬件保护意识。能说出续流二极管、基极电阻、达林顿/光耦隔离，就说明实际做过硬件。</p>`,
        core: `<p>继电器线圈是感性负载，关断反峰会击穿三极管，必须反并联续流二极管；接反了导通时会短路，方向不能错。</p>`,
        answer: `<p><b>继电器线圈是感性负载。</b>导通时电流建立磁场，关断瞬间磁场崩溃，产生很高的反向电动势（可能上百伏），足以击穿三极管。</p>
<p><b>必须加续流二极管</b>：反向并联在线圈两端，关断时给电流提供泄放回路，把电压钳位在 0.7V 左右。注意二极管方向：正常导通时反偏，关断时正偏。</p>
<p><b>完整驱动电路：</b></p>
<ul>
<li>GPIO → 基极电阻 → 三极管（或 MOS 管栅极）；</li>
<li>三极管集电极接继电器线圈，发射极接地；</li>
<li>线圈两端反并联续流二极管（如 1N4148/1N4007）；</li>
<li>需要隔离时用光耦，避免继电器干扰窜入 MCU；</li>
<li>继电器触点侧加 RC 吸收或压敏电阻，抑制触点火花。</li>
</ul>
<p><b>为什么还会烧：</b>三极管电流余量不足、没有续流二极管、基极电阻太小导致过流、继电器线圈电压与电源不匹配、触点侧负载超过额定值。</p>`,
        principle: `<p>电感中的电流不能突变。关断瞬间，电感为了维持电流，会产生反向电压 <code>V = L·di/dt</code>，di/dt 很大时电压极高。续流二极管让电流通过它继续流动，把能量消耗在二极管和线圈电阻上。</p>
<p>MOS 管是电压驱动，栅极电容需要充放电，开关速度受驱动电阻影响；栅极要加下拉电阻，防止悬空误导通。</p>`,
        fig: {
          type: "flow",
          title: "继电器驱动与保护",
          tag: "relay driver",
          items: [
            { t: "GPIO", d: "输出高/低电平" },
            { t: "基极电阻", d: "限制基极电流" },
            { t: "三极管/MOS", d: "放大电流驱动线圈" },
            { t: "续流二极管", d: "关断时泄放反向电动势" },
            { t: "继电器触点", d: "控制负载，加 RC 吸收" }
          ]
        },
        code: {
          lang: "c",
          title: "relay.c",
          src: `#include "stm32f4xx_hal.h"

#define RELAY_PIN GPIO_PIN_0
#define RELAY_PORT GPIOB

/* 继电器吸合/释放，注意上电默认状态 */
void relay_set(int on)
{
    /* 低电平有效还是高电平有效，取决于驱动电路 */
    HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN,
                      on ? GPIO_PIN_SET : GPIO_PIN_RESET);
}

/* 上电初始化：先确保继电器断开，避免误动作 */
void relay_init(void)
{
    GPIO_InitTypeDef gpio = {0};

    HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN, GPIO_PIN_RESET);
    gpio.Pin   = RELAY_PIN;
    gpio.Mode  = GPIO_MODE_OUTPUT_PP;
    gpio.Pull  = GPIO_PULLDOWN;
    gpio.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(RELAY_PORT, &gpio);
}`
        },
        codeNote: "上电时 GPIO 默认是浮空输入，可能在初始化前被干扰导致继电器误吸合，硬件上应加下拉电阻。",
        apply: `<p>做加热控制时，我在继电器线圈两端加了续流二极管，触点侧加 RC 吸收，并在软件上做“最小切换间隔”，避免频繁开关缩短继电器寿命。</p>
<p>强电和弱电要分区布线，继电器下方不走信号线，必要时用光耦隔离，否则触点打火会干扰 MCU 导致复位。</p>`,
        pitfalls: [
          "<b>不加续流二极管。</b>三极管被反向电动势击穿。",
          "<b>二极管方向接反。</b>导通时短路，烧电源。",
          "<b>GPIO 直接驱动线圈。</b>电流不足，烧 IO。",
          "<b>上电默认状态不对。</b>设备启动瞬间继电器误动作。"
        ],
        follow: [
          ["MOS 管栅极为什么要加下拉电阻？", "防止 GPIO 浮空时栅极积累电荷导致误导通，尤其是在上电初始化和 MCU 复位期间。"],
          ["固态继电器和机械继电器怎么选？", "固态继电器无触点、寿命长、无火花，但导通压降和漏电流较大；机械继电器成本低、隔离好，但有触点磨损和动作噪声。"]
        ]
      },

      {
        id: "P-13",
        chapter: "sensor",
        topic: "step",
        title: "步进电机怎么驱动？细分和加减速为什么重要？",
        diff: "高级",
        freq: "中频",
        type: "驱动设计题",
        point: "相序驱动、细分提高平滑度、加减速避免失步；驱动器负责电流环。",
        q: `<p>面试官：42 步进电机用驱动器控制，MCU 只需要给脉冲和方向吗？启动时丢步是什么原因？</p>`,
        exam: `<p>考察运动控制基础。能说出“脉冲频率决定速度、加减速曲线避免失步、细分改善低速平稳性”，就很好。</p>`,
        core: `<p>步进驱动器收脉冲和方向，频率定速度、脉冲数定位置；细分让转动更平滑但不提高绝对精度，必须加减速否则高速启动会失步。</p>`,
        answer: `<p><b>基本控制：</b>步进驱动器通常接收“脉冲 + 方向”信号，每个脉冲走一个细分步。MCU 用定时器 PWM 或脉冲输出产生脉冲，频率决定速度，脉冲总数决定位置。</p>
<p><b>细分：</b>驱动器把整步分成多个微步（如 1/16、1/32），电流按正弦规律变化，使转动更平滑、低速振动更小、分辨率更高。但细分不增加绝对精度，负载能力也会随细分略有下降。</p>
<p><b>为什么需要加减速：</b>步进电机的输出转矩随转速上升而下降。如果直接给高频脉冲启动，电机跟不上，就会<b>失步</b>（丢步），位置全错。必须按“加速 → 匀速 → 减速”的曲线运行，保证任何时刻的脉冲频率都在电机能跟上的范围内。</p>
<p><b>常见加减速曲线：</b></p>
<ul>
<li>梯形：加速、匀速、减速，实现简单；</li>
<li>S 形：加速度渐变，冲击更小，适合高动态场合。</li>
</ul>
<p><b>丢步的其他原因：</b>电流设置不足、电源电压不够、负载过大、共振区、脉冲频率突变。</p>`,
        principle: `<p>步进电机按固定角度步进，没有闭环反馈，所以“发多少脉冲就走多少步”的前提是电机不失步。一旦失步，系统不知道实际位置，必须回零。</p>
<p>转矩与电流和转速有关：高速时反电动势增大，电流建立变慢，转矩下降。加减速曲线就是为了在转矩足够的范围内逐步提速。</p>`,
        fig: {
          type: "flow",
          title: "步进电机的运动控制",
          tag: "stepper",
          items: [
            { t: "目标位置", d: "上位机给出距离" },
            { t: "加减速规划", d: "生成频率曲线" },
            { t: "脉冲输出", d: "定时器按频率翻转" },
            { t: "驱动器", d: "细分、电流环、功率放大" },
            { t: "电机", d: "按步距角转动" }
          ]
        },
        code: {
          lang: "c",
          title: "stepper.c",
          src: `#include "stm32f4xx_hal.h"

/* 用定时器更新中断产生脉冲：每次中断翻转 STEP，
 * 两次翻转才凑成一个完整脉冲，也就是走一步 */
static uint32_t half_edges = 0;          /* 还剩多少次翻转 */
static uint32_t half_period_us = 500;    /* 半个脉冲的周期 */

void stepper_start(uint32_t steps, uint32_t period_us)
{
    half_edges     = steps * 2u;         /* 一步 = 一个完整脉冲 = 两次翻转 */
    half_period_us = period_us / 2u;

    /* 从低电平起步，第一次翻转就是上升沿 */
    HAL_GPIO_WritePin(STEP_PORT, STEP_PIN, GPIO_PIN_RESET);
    __HAL_TIM_SET_AUTORELOAD(&htim3, half_period_us - 1u);
    HAL_TIM_Base_Start_IT(&htim3);
}

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Instance != TIM3) return;

    if (half_edges == 0) {
        HAL_TIM_Base_Stop_IT(&htim3);
        return;
    }

    HAL_GPIO_TogglePin(STEP_PORT, STEP_PIN);
    half_edges--;

    /* 只演示加速段：剩余翻转数多时逐步缩短半周期（下限 100us，对应 5kHz）。
     * 真正的梯形曲线还要按总步数规划“加速 / 匀速 / 减速”三段，否则会高速撞停。 */
    if (half_edges > 400 && half_period_us > 100) {
        half_period_us -= 3;
        __HAL_TIM_SET_AUTORELOAD(&htim3, half_period_us - 1u);
    }
}`
        },
        codeNote: "实际工程要用完整的加减速表或算法，避免在中断里做浮点运算；高速时建议用 PWM + DMA 生成脉冲序列。",
        apply: `<p>我做过的点胶机用步进电机，启动频率设得很低，按 S 曲线加速到目标速度。调试时先空载测试最高不失步频率，再按 70% 留余量。</p>
<p>回零用限位开关 + 低速逼近，避免高速撞限位导致丢步或机械损伤。</p>`,
        pitfalls: [
          "<b>直接高频启动。</b>电机失步，位置错误。",
          "<b>细分当成精度提升。</b>细分改善平滑度，不改变绝对精度。",
          "<b>电流设置过小。</b>转矩不足，负载稍大就丢步。",
          "<b>忽略共振区。</b>特定速度下振动明显，可通过细分或避开该速度段改善。"
        ],
        follow: [
          ["步进电机和伺服电机有什么区别？", "步进是开环、成本低、低速转矩大，但高速转矩下降且可能失步；伺服是闭环、有编码器反馈、动态性能好，但成本高。"],
          ["如何检测步进电机丢步？", "加编码器做闭环校验，或使用带失步检测的驱动器；也可以在回零时对比脉冲数与限位触发位置。"]
        ]
      },

      {
        id: "P-14",
        chapter: "sensor",
        topic: "onewire",
        title: "单总线（1-Wire）器件的时序怎么实现？为什么对延时这么敏感？",
        diff: "高级",
        freq: "中频",
        type: "驱动设计题",
        point: "单根线双向通信，靠主机拉低时长区分 0/1，时序在微秒级，必须关中断或精确延时。",
        q: `<p>面试官：DHT11 或 DS18B20 只有一根数据线，怎么区分 0 和 1？为什么在 RTOS 里读经常失败？</p>`,
        exam: `<p>考察对严格时序协议的理解。能说出“靠高电平持续时间区分位、微秒级窗口、中断会破坏时序”，就很好。</p>`,
        core: `<p>DS18B20 单总线靠时隙通信，主机拉低 1µs 以上发起、15µs 内采样，0 和 1 靠低电平持续时间区分；RTOS 里要关中断或放高优先级任务避免时序被打断。</p>`,
        answer: `<p><b>单总线原理：</b>数据线是开漏结构，主机和从机都可以拉低，靠上拉电阻恢复高电平。</p>
<p><b>DS18B20 的位定义：</b></p>
<ul>
<li>主机拉低至少 1μs 发起时隙；</li>
<li>释放总线后，<b>主机</b>要在 15μs 内采样（这段时间由从机决定是否拉低总线）；</li>
<li>如果从机要发 0，会把总线拉低约 60μs；</li>
<li>如果发 1，只拉低约 15μs 后释放。</li>
</ul>
<p>主机通过采样时刻的电平判断是 0 还是 1。整个时隙约 60~120μs。</p>
<p><b>DHT11</b> 类似，用高电平持续时间区分 0（约 26~28μs）和 1（约 70μs）。</p>
<p><b>为什么在 RTOS 里容易失败：</b>时序窗口只有几微秒，任务切换或中断会打断延时，导致采样点偏移，读到错误数据。解决办法：</p>
<ul>
<li>读期间关闭中断（或至少关闭会长时间执行的中断）；</li>
<li>用硬件定时器 + 输入捕获测量脉宽，而不是软件延时；</li>
<li>把整个读周期放在高优先级任务或临界区里；</li>
<li>降低系统中断频率，避免频繁打断。</li>
</ul>`,
        principle: `<p>单总线用“时间长度”编码信息，而不是电平高低，所以对时序精度要求很高。软件延时的准确性依赖 CPU 主频和编译优化，容易受中断影响。</p>
<p>开漏结构实现了“线与”：任何一方拉低都是低，只有双方都释放才为高，这样单根线可以双向通信。</p>`,
        fig: {
          type: "table",
          title: "DS18B20 的位时序",
          tag: "1-wire",
          head: ["位值", "低电平时间", "高电平时间", "总时隙"],
          rows: [
            ["0", "约 60 μs", "约 10 μs", "60~120 μs"],
            ["1", "约 15 μs", "约 45 μs", "60~120 μs"],
            ["复位脉冲", "≥480 μs", "等待从机应答", "约 960 μs"]
          ]
        },
        code: {
          lang: "c",
          title: "ds18b20.c",
          src: `#include "stm32f4xx_hal.h"

#define DQ_HIGH()  HAL_GPIO_WritePin(DQ_PORT, DQ_PIN, GPIO_PIN_SET)
#define DQ_LOW()   HAL_GPIO_WritePin(DQ_PORT, DQ_PIN, GPIO_PIN_RESET)
#define DQ_READ()  HAL_GPIO_ReadPin(DQ_PORT, DQ_PIN)

/* 微秒级延时，需按主频校准 */
static void delay_us(uint32_t us)
{
    uint32_t start = DWT->CYCCNT;
    uint32_t ticks = us * (SystemCoreClock / 1000000u);
    while ((DWT->CYCCNT - start) < ticks) { }
}

/* 读一位：拉低 2μs 后释放，15μs 时采样 */
uint8_t ds18b20_read_bit(void)
{
    uint8_t bit;
    __disable_irq();          /* 关键：保证时序不被打断 */

    DQ_LOW();
    delay_us(2);
    DQ_HIGH();
    delay_us(12);
    bit = DQ_READ() ? 1u : 0u;
    delay_us(50);

    __enable_irq();
    return bit;
}

/* 写一位：写 0 拉低 60μs，写 1 拉低 2μs 后释放 */
void ds18b20_write_bit(uint8_t bit)
{
    __disable_irq();
    DQ_LOW();
    if (bit) {
        delay_us(2);
        DQ_HIGH();
        delay_us(60);
    } else {
        delay_us(60);
        DQ_HIGH();
        delay_us(2);
    }
    __enable_irq();
}`
        },
        codeNote: "关闭中断的时间要尽量短，逐个位开关中断；更好的方式是用定时器输入捕获测量脉宽，避免长时间关中断。",
        apply: `<p>我在 RTOS 项目里读 DS18B20，会把读操作放在最高优先级任务，并在读期间关闭中断。虽然会短暂影响实时性，但每次只有几毫秒，可以接受。</p>
<p>更稳的方案是用定时器输入捕获：从机拉低时记录时间戳，上升沿时算出脉宽，完全由硬件测量，不依赖软件延时。</p>`,
        pitfalls: [
          "<b>用普通延时函数。</b>编译优化后延时不准。",
          "<b>读期间不关中断。</b>时序被打断，数据错误。",
          "<b>上拉电阻过大。</b>上升沿变慢，时序超差。",
          "<b>总线挂太多器件。</b>电容增大，波形变差。"
        ],
        follow: [
          ["单总线能挂多个器件吗？", "可以，每个器件有唯一 64 位 ROM 地址，主机先发“搜索 ROM”枚举，再按地址寻址；挂太多会影响总线电容和时序。"],
          ["为什么 DHT11 的采样周期不能太短？", "DHT11 内部需要时间完成测量，两次读取间隔至少 1~2 秒，太频繁会返回错误或旧数据。"]
        ]
      },

      {
        id: "P-15",
        chapter: "input",
        topic: "touch",
        title: "电容触摸按键的原理是什么？为什么受环境影响大？",
        diff: "高级",
        freq: "进阶",
        type: "原理分析题",
        point: "检测电容变化，手指靠近增加对地电容；需要基线跟踪和阈值自适应。",
        q: `<p>面试官：触摸按键没有机械结构，怎么检测手指？为什么潮湿或戴手套时容易误触发？</p>`,
        exam: `<p>考察模拟检测和抗干扰设计。能说出“自电容/互电容、基线跟踪、阈值自适应”，就很好。</p>`,
        core: `<p>触摸检测的是手指靠近引起的对地电容变化，再转成频率、电压或充电时间；温湿度和接地会改变基线，需要基线跟踪和自适应阈值。</p>`,
        answer: `<p><b>原理：</b>触摸电极对地有一个基础电容（几 pF 到几十 pF）。手指靠近时，人体相当于一个接地的导体，增加了电极的对地电容。检测电路把这个电容变化转换成频率、电压或充电时间的变化，超过阈值就判定为触摸。</p>
<p><b>两种方式：</b></p>
<ul>
<li><b>自电容</b>：每个电极独立检测对地电容，简单，但多点触摸时会有“鬼键”；</li>
<li><b>互电容</b>：检测行列交叉点的耦合电容，支持多点，常用于触摸屏。</li>
</ul>
<p><b>为什么受环境影响：</b></p>
<ul>
<li><b>温湿度</b>：水汽改变介质常数和表面漏电，基线漂移；</li>
<li><b>手套</b>：绝缘层变厚，电容变化量变小，可能低于阈值；</li>
<li><b>电源噪声</b>：开关电源、电机干扰耦合到电极；</li>
<li><b>接地</b>：设备接地不良时，人体没有参考地，变化量不稳定。</li>
</ul>
<p><b>应对方法：</b>基线跟踪（缓慢更新无触摸时的基准值）、自适应阈值、软件滤波、驱动屏蔽层、增加接地面积、远离干扰源。</p>`,
        principle: `<p>电容触摸检测的是“电容变化量”，而不是绝对电容。所以系统必须持续估计当前基线，并把“当前值 - 基线”与阈值比较。基线会随温湿度和老化缓慢漂移，需要动态更新。</p>
<p>手指带来的电容变化通常只有几 pF，而环境漂移可能更大，所以信噪比是设计的关键。</p>`,
        fig: {
          type: "flow",
          title: "电容触摸的检测流程",
          tag: "touch",
          items: [
            { t: "采样", d: "测量电极电容/充电时间" },
            { t: "滤波", d: "去除工频和随机噪声" },
            { t: "基线跟踪", d: "缓慢更新无触摸基准" },
            { t: "阈值判断", d: "差值超过阈值判定触摸" },
            { t: "消抖确认", d: "连续多次一致才输出事件" }
          ]
        },
        code: {
          lang: "c",
          title: "touch.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define TOUCH_THRESHOLD  120      /* 需要按实际调试 */
#define BASELINE_STEP    2

static uint16_t baseline = 0;
static bool     pressed  = false;

/* 输入为已滤波的原始采样值 */
bool touch_update(uint16_t raw)
{
    /* 1. 初始化基线 */
    if (baseline == 0) {
        baseline = raw;
        return false;
    }

    /* 2. 未按下时缓慢跟踪基线，抵抗温湿度漂移 */
    if (!pressed) {
        if (raw > baseline) baseline += BASELINE_STEP;
        else if (raw < baseline) baseline -= BASELINE_STEP;
    }

    /* 3. 差值判断 */
    int32_t diff = (int32_t)raw - (int32_t)baseline;
    if (!pressed && diff > TOUCH_THRESHOLD) {
        pressed = true;
        return true;          /* 按下沿事件 */
    }
    if (pressed && diff < TOUCH_THRESHOLD / 2) {
        pressed = false;      /* 释放，带回差 */
    }
    return false;
}`
        },
        codeNote: "基线跟踪速度要远慢于触摸响应速度，否则会把长按当成环境漂移而“自动释放”。",
        apply: `<p>我做过的触摸面板，电极下方铺了接地铜箔做屏蔽，电源加 LC 滤波，软件上做了 8 次采样中值滤波 + 基线跟踪，潮湿环境下也能稳定工作。</p>
<p>调试时用串口输出原始值和基线，观察不同环境下的差值范围，再定阈值，比拍脑袋设一个数可靠得多。</p>`,
        pitfalls: [
          "<b>阈值固定不变。</b>环境变化后误触发或失灵。",
          "<b>基线跟踪太快。</b>长按被当成漂移，提前释放。",
          "<b>电极附近有干扰源。</b>采样噪声大，误触发。",
          "<b>没有回差。</b>临界值附近反复触发。"
        ],
        follow: [
          ["为什么触摸按键要做防水？", "水膜会把电极连到地或相邻电极，改变电容并造成漏电，导致误触发；防水设计包括驱动屏蔽、防水算法和结构隔离。"],
          ["自电容和互电容哪个抗干扰更好？", "互电容检测局部耦合，抗环境干扰更好，但电路更复杂；自电容简单，适合单点按键。"]
        ]
      },

      {
        id: "P-16",
        chapter: "sensor",
        topic: "calib",
        title: "传感器校准怎么做？两点校准和多项式拟合有什么区别？",
        diff: "中级",
        freq: "中频",
        type: "工程实践题",
        point: "两点校准修正增益和偏移，多点拟合处理非线性；校准数据要存储并版本化。",
        q: `<p>面试官：ADC 读到的值和实际物理量对不上，怎么校准？为什么有的传感器要标定很多点？</p>`,
        exam: `<p>考察数据处理和工程化思维。能说出偏移/增益校准、线性拟合、非线性查表，以及校准数据存储，就很好。</p>`,
        core: `<p>线性传感器用两点校准求 k、b，非线性用多点拟合或查表插值；标准器具精度要高一个数量级，校准数据存 Flash 并做 CRC。</p>`,
        answer: `<p><b>两点校准</b>假设传感器是线性的：<code>y = kx + b</code>。用两个已知标准点（如 0℃ 冰水、100℃ 沸水）测出原始值，解出 k 和 b。适合线性度好的传感器，实现简单。</p>
<p><b>多点校准/多项式拟合</b>用于非线性传感器：测多个标准点，用最小二乘法拟合二次或三次曲线，或者直接做查表 + 分段线性插值。精度更高，但需要更多标定工作和存储空间。</p>
<p><b>校准要注意：</b></p>
<ul>
<li>标准器具的精度要高于产品要求（通常高一个数量级）；</li>
<li>校准点要覆盖实际使用范围，不要只在一个点附近；</li>
<li>记录校准日期、温度、标准值，便于追溯；</li>
<li>校准数据存在 Flash，并做 CRC 校验，防止损坏；</li>
<li>出厂校准和用户现场校准要分开，避免误覆盖。</li>
</ul>
<p><b>查表 + 插值</b>在 MCU 上很实用：把校准点存成数组，运行时二分查找所在区间，做线性插值，既准确又不需浮点运算。</p>`,
        principle: `<p>传感器的输出通常存在零点偏移、增益误差和非线性。校准就是用标准输入反推这些误差参数，运行时再反向修正。</p>
<p>两点只能确定直线，无法描述弯曲；非线性传感器必须多点采样，才能把误差控制在范围内。</p>`,
        fig: {
          type: "table",
          title: "校准方法对比",
          tag: "calibration",
          head: ["方法", "适用", "存储", "精度"],
          rows: [
            ["单点校准", "只有零点偏移", "1 个偏移量", "低"],
            ["两点校准", "线性传感器", "k、b", "中"],
            ["多点拟合", "非线性传感器", "系数或查表", "高"],
            ["查表插值", "任意曲线", "校准点数组", "取决于点数"]
          ]
        },
        code: {
          lang: "c",
          title: "calib.c",
          src: `#include <stdint.h>

typedef struct {
    int32_t raw;      /* ADC 原始值 */
    int32_t value;    /* 标准物理量，单位 0.01 */
} cal_point_t;

/* 校准表必须按 raw 升序排列 */
static const cal_point_t cal_table[] = {
    {  400, -2000 },
    { 1200,     0 },
    { 2048,  2500 },
    { 3000,  6000 },
    { 3800,  8500 }
};

#define CAL_N (sizeof(cal_table) / sizeof(cal_table[0]))

/* 分段线性插值：返回物理量（单位 0.01） */
int32_t calib_convert(int32_t raw)
{
    if (raw <= cal_table[0].raw) return cal_table[0].value;
    if (raw >= cal_table[CAL_N - 1].raw) return cal_table[CAL_N - 1].value;

    for (unsigned i = 1; i < CAL_N; i++) {
        if (raw <= cal_table[i].raw) {
            int32_t x0 = cal_table[i - 1].raw, y0 = cal_table[i - 1].value;
            int32_t x1 = cal_table[i].raw,     y1 = cal_table[i].value;
            return y0 + (raw - x0) * (y1 - y0) / (x1 - x0);
        }
    }
    return 0;
}`
        },
        codeNote: "整数插值要注意乘法溢出，必要时用 int64_t 或先做移位；除法的舍入方向也要统一。",
        apply: `<p>我做压力传感器时用 5 点校准，存成查表数组，运行时插值。相比二次拟合，查表更直观，也容易在产线上用治具自动写入。</p>
<p>校准数据单独放一个 Flash 扇区，带版本号和 CRC；升级固件时不清除，保证校准不丢。</p>`,
        pitfalls: [
          "<b>只做单点校准。</b>增益误差没修正，大量程处偏差大。",
          "<b>校准点不覆盖使用范围。</b>外推区域误差不可控。",
          "<b>整数插值溢出。</b>中间结果超出 32 位。",
          "<b>校准数据没有校验。</b>Flash 损坏后输出错误值。"
        ],
        follow: [
          ["如何判断传感器是否需要多点校准？", "看数据手册的线性度指标；如果非线性误差超过产品精度要求，就必须多点校准或做多项式补偿。"],
          ["温度漂移怎么补偿？", "在不同温度下做校准，建立温度-偏移曲线，运行时用当前温度查表补偿；或者选用带内部温度补偿的传感器。"]
        ]
      },

      {
        id: "P-17",
        chapter: "arch",
        topic: "isr",
        title: "驱动里中断和主循环怎么分工？为什么中断里不能做太多事？",
        diff: "中级",
        freq: "高频",
        type: "架构设计题",
        point: "中断只做“取数据、置标志、清中断”，耗时处理放主循环或任务，保证实时性。",
        q: `<p>面试官：串口中断里直接解析协议、控制电机行不行？中断服务程序应该多长？</p>`,
        exam: `<p>考察实时系统设计习惯。能说出“中断尽量短、用标志/队列解耦、耗时操作放主循环”，并结合优先级和抖动解释，就很好。</p>`,
        core: `<p>ISR 只做读数据、清标志、入队或置事件，耗时处理留给主循环或任务，长度一般控制在几十微秒；在 ISR 里阻塞、等锁或动态分配会死锁。</p>`,
        answer: `<p><b>中断服务程序的原则：短、快、不阻塞。</b>典型只做三件事：</p>
<ol>
<li>读取硬件数据（清中断标志前先读，避免丢数据）；</li>
<li>把数据放入缓冲区/队列；</li>
<li>置位事件标志，通知主循环或任务。</li>
</ol>
<p><b>为什么不能做太多：</b></p>
<ul>
<li>中断执行期间，同优先级和低优先级中断被阻塞，实时性下降；</li>
<li>耗时操作增加中断延迟和抖动，影响控制周期；</li>
<li>在中断里调用可能阻塞的函数（如等待锁、动态分配）会导致死锁或崩溃；</li>
<li>中断嵌套过深会耗尽栈空间。</li>
</ul>
<p><b>分工示例（串口）：</b>中断里把字节存入环形缓冲区并置“收到数据”标志；主循环检测标志后解析协议、执行命令。解析再慢也不影响后续字节接收（只要缓冲区够大）。</p>
<p><b>RTOS 里：</b>中断用 FromISR 接口发送队列/信号量，任务负责处理。注意中断优先级要低于 configMAX_SYSCALL_INTERRUPT_PRIORITY 才能调用 API。</p>`,
        principle: `<p>中断是抢占式的，执行时间直接影响系统的响应延迟。把工作推迟到主循环，相当于把“硬实时”部分压缩到最小，把“软实时”部分放到可调度的地方。</p>
<p>环形缓冲区和队列是中断与主循环之间的解耦层，只要生产速度不超过消费能力，就不会丢数据。</p>`,
        fig: {
          type: "flow",
          title: "中断与主循环的分工",
          tag: "isr design",
          items: [
            { t: "硬件事件", d: "串口收到字节 / GPIO 边沿" },
            { t: "ISR", d: "读数据、入队、置标志" },
            { t: "返回", d: "尽快退出，恢复其它中断" },
            { t: "主循环", d: "检测标志，解析/处理" },
            { t: "业务动作", d: "控制、通信、存储" }
          ]
        },
        code: {
          lang: "c",
          title: "uart_isr.c",
          src: `#include <stdint.h>
#include <stdbool.h>

#define RX_BUF_SIZE 128

static volatile uint8_t  rx_buf[RX_BUF_SIZE];
static volatile uint32_t rx_head = 0;
static volatile uint32_t rx_tail = 0;
static volatile bool     rx_event = false;

/* 中断：只搬数据，不做解析 */
void USART1_IRQHandler(void)
{
    if (USART1->SR & USART_SR_RXNE) {
        uint8_t byte = (uint8_t)USART1->DR;      /* 读 DR 自动清标志 */
        uint32_t next = (rx_head + 1u) % RX_BUF_SIZE;
        if (next != rx_tail) {
            rx_buf[rx_head] = byte;
            rx_head = next;
        }
        rx_event = true;
    }
}

/* 主循环：解析协议、执行命令 */
void app_poll(void)
{
    if (!rx_event) return;
    rx_event = false;

    while (rx_tail != rx_head) {
        uint8_t byte = rx_buf[rx_tail];
        rx_tail = (rx_tail + 1u) % RX_BUF_SIZE;
        protocol_feed(byte);       /* 状态机解析 */
    }
}`
        },
        codeNote: "rx_event 这类单字节标志在单核上是原子的；如果涉及多字节结构，需要临界区保护。",
        apply: `<p>我做电机控制时，PWM 中断只做“读编码器、更新电流环、输出占空比”，通信和参数整定全部放主循环。这样控制周期稳定在 10μs 级别，不受通信影响。</p>
<p>如果主循环处理不过来，先看缓冲区是否够大、解析是否太慢，而不是简单把逻辑塞回中断。</p>`,
        pitfalls: [
          "<b>中断里解析协议。</b>耗时长，丢后续字节。",
          "<b>中断里调用 printf。</b>阻塞且不可重入，可能死锁。",
          "<b>中断里动态分配内存。</b>堆操作非重入，破坏堆结构。",
          "<b>忘记清中断标志。</b>中断反复触发，系统卡死。"
        ],
        follow: [
          ["中断里能不能调用 HAL_Delay？", "不能，HAL_Delay 依赖 SysTick 中断，在更高优先级中断里调用会永远等不到，直接卡死。"],
          ["如何判断中断是否太长？", "用 GPIO 翻转 + 示波器测量 ISR 执行时间，或统计中断占用 CPU 的百分比；一般建议控制在几微秒到几十微秒。"]
        ]
      }
    ]
  });
})();
