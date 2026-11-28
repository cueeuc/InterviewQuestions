/* ============================================================
   05 STM32 / GD32 单片机
   ============================================================ */
(function () {
  "use strict";

  EIK.register("stm32-gd32", {
    chapters: [
      {
        id: "chip",
        title: "芯片与时钟",
        topics: [
          { id: "diff", title: "STM32 与 GD32 差异" },
          { id: "clock", title: "时钟树与 RCC" }
        ]
      },
      {
        id: "gpio",
        title: "GPIO 与中断",
        topics: [
          { id: "mode", title: "GPIO 工作模式" },
          { id: "exti", title: "EXTI 外部中断" }
        ]
      },
      {
        id: "timer",
        title: "定时器与 ADC",
        topics: [
          { id: "pwm", title: "定时器与 PWM" },
          { id: "capture", title: "输入捕获" },
          { id: "adc", title: "ADC 与 DMA" }
        ]
      },
      {
        id: "reliability",
        title: "可靠性与开发方式",
        topics: [
          { id: "wdg", title: "看门狗" },
          { id: "lib", title: "固件库与寄存器开发" }
        ]
      }
    ],

    questions: [
      {
        id: "S-01",
        chapter: "chip",
        topic: "diff",
        title: "STM32 和 GD32 有什么区别？移植要注意什么？",
        diff: "中级",
        freq: "中频",
        type: "对比辨析题",
        point: "内核版本、主频与 Flash 等待周期、外设差异，以及代码移植的坑。",
        q: `<p>面试官：<strong>STM32 和 GD32</strong> 有什么区别？如果把一个 STM32F103 的工程移植到 GD32，需要注意哪些地方？</p>`,
        exam: `<p>考察你是否真的做过国产替代。只会说“引脚兼容、便宜”不够，能说出“主频更高、Flash 零等待、指令时序不同导致延时函数要改、ADC 和 USB 有差异”，才是踩过坑的人。</p>`,
        core: `<p>GD32F103 和 STM32F103 都是 Cortex-M3、引脚基本兼容，但 GD32 主频更高、Flash 零等待、ADC 和 USB/CAN 时序有差异；移植要重算延时并回归通信和采样。</p>`,
        answer: `<p>两者都是 Cortex-M3 内核、引脚和寄存器基本兼容，很多场合可以直接替换，但有几个实质差异。</p>
<p>第一是<strong>主频</strong>：STM32F103 最高 72MHz，GD32F103 可以到 108MHz，所以同样的代码在 GD32 上跑得更快，依赖空循环的延时函数会变短，需要重新校准。</p>
<p>第二是<strong>Flash 访问</strong>：GD32 的 Flash 是零等待，不需要配 wait state；STM32 在 72MHz 下需要 2 个等待周期。如果照搬 STM32 的时钟配置代码，GD32 可能跑得更慢，需要按它的手册重新配。</p>
<p>第三是<strong>外设细节</strong>：ADC 的采样时间、转换速度、内部参考电压有差异；USB 和 CAN 的时序参数也可能不同；部分寄存器的复位值不一样。移植时要逐项对照数据手册，重点回归通信和模拟采样部分。</p>
<p>另外，GD32 的供电范围、功耗特性和 STM32 也有区别，低功耗项目要重新测。</p>`,
        principle: `<p>“兼容”通常指引脚定义、外设寄存器地址和位定义基本一致，所以用标准库或 HAL 的代码能编译通过。但芯片内部的 Flash 工艺、总线时序、模拟电路并不相同，这些差异不会体现在寄存器定义里，只会在实际运行时暴露。</p>
<p>典型的隐性差异是<strong>指令执行速度</strong>。GD32 在某些指令上更快，导致 <code>for</code> 循环延时缩短；如果代码里用空循环做微秒级延时（比如软件 I2C、单总线时序），通信就会失败，现象是“读不到传感器”。</p>`,
        fig: {
          type: "table",
          title: "STM32F103 与 GD32F103 的主要差异",
          tag: "compare",
          head: ["项目", "STM32F103", "GD32F103"],
          rows: [
            ["内核", "Cortex-M3", "Cortex-M3"],
            ["最高主频", "72MHz", "108MHz"],
            ["Flash 等待周期", "72MHz 需 2 个", "零等待"],
            ["ADC 最高采样", "1MSPS", "约 1MSPS（时序不同）"],
            ["供电范围", "2.0~3.6V", "2.6~3.6V"],
            ["代码兼容性", "—", "寄存器基本兼容，时序需校准"]
          ]
        },
        apply: `<p>移植的实际步骤：先用 STM32 的工程在 GD32 上跑通点灯和串口，确认时钟配置正确；再逐项测试 ADC、I2C、SPI、CAN 等外设；最后校准所有软件延时和超时时间。</p>
<p>建议把与芯片相关的部分（时钟初始化、延时、Flash 操作）抽成独立文件，用宏区分平台，这样两边都能维护，而不是复制一份代码各自改。</p>`,
        pitfalls: [
          "<b>直接照搬时钟配置。</b>GD32 的 PLL 和 Flash 等待配置不同，照搬可能超频失败或跑不到标称主频。",
          "<b>忽略软件延时。</b>软件 I2C、单总线对时序敏感，主频变快后必须重新校准，否则通信失败。",
          "<b>认为可以 100% 替换。</b>ADC 精度、USB 稳定性、低功耗电流都可能有差异，量产前必须完整回归。"
        ],
        follow: [
          [
            "为什么 Flash 需要等待周期？",
            "Flash 的读取速度跟不上 CPU 主频。72MHz 下 STM32 的 Flash 需要插入等待周期，CPU 取指时若数据未就绪就停顿。配置在 FLASH_ACR 的 LATENCY 位，配少了会读错指令。"
          ],
          [
            "国产替代还要注意什么？",
            "供货稳定性、工具链支持（调试器、烧录算法）、温度等级、ESD 指标、长期可靠性数据，以及是否有配套的 HAL/标准库和参考设计。"
          ],
          [
            "如何验证移植后的时序是否正确？",
            "用逻辑分析仪抓 I2C/SPI 波形，对照从机手册检查建立/保持时间；用示波器测 PWM 频率和占空比；用高精度计时器验证延时误差。"
          ]
        ]
      },

      {
        id: "S-02",
        chapter: "chip",
        topic: "clock",
        title: "STM32 的时钟树怎么配？HSE、PLL、AHB、APB 是什么关系？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "时钟源选择、PLL 倍频、总线分频与外设时钟使能，是外设不工作的头号原因。",
        q: `<p>面试官：画一下 STM32 的<strong>时钟树</strong>。HSE、HSI、PLL、SYSCLK、HCLK、PCLK1、PCLK2 分别是什么？为什么我的串口波特率总是不对？</p>`,
        exam: `<p>时钟是嵌入式最容易出错也最基础的部分。能说清“外部晶振 → PLL 倍频 → SYSCLK → AHB 分频 → APB 分频”“F1 的 APB1 最高 36MHz、APB2 最高 72MHz（F4 则是 42MHz / 84MHz）”“外设时钟要单独使能”，说明你独立配置过底层。</p>`,
        core: `<p>时钟链是 HSE/HSI→PLL→SYSCLK→AHB 分频得 HCLK→APB1/APB2 分频；F103 常用 8MHz 乘 9 得 72MHz，APB1 最高 36MHz。波特率不对多半是实际 PCLK 算错，APB 分频不为 1 时定时器时钟还要再乘 2。</p>`,
        answer: `<p>时钟树的主干是：时钟源（HSI 内部 8MHz、HSE 外部晶振）经过 PLL 倍频得到 SYSCLK，SYSCLK 经 AHB 分频得到 HCLK（内核、内存、DMA 用），HCLK 再经 APB1/APB2 分频得到外设时钟。</p>
<p>以 STM32F103 为例：HSE 8MHz 不分频进 PLL，倍频 9 倍得到 72MHz 作为 SYSCLK；AHB 不分频，HCLK = 72MHz；APB1 分频 2 得到 36MHz（上限就是 36MHz），APB2 不分频得到 72MHz。</p>
<p>APB1 上挂的是低速外设（USART2/3、I2C、TIM2-7），APB2 挂高速外设（GPIO、USART1、SPI1、ADC、TIM1）。所以配置外设前必须先使能对应总线的时钟，<code>__HAL_RCC_USART1_CLK_ENABLE()</code> 这类宏就是在做这件事。</p>
<p>串口波特率不对，最常见的原因就是<strong>实际时钟和代码里假设的不一致</strong>：比如以为跑 72MHz，实际 HSE 起振失败退回了 HSI 8MHz，波特率就会差 9 倍，表现为乱码。</p>`,
        principle: `<p>PLL 的倍频公式是 <code>fVCO = fIn × PLLMUL</code>，不同系列的 PLL 结构不同（F4 有 M/N/P/Q 四个参数）。配置时要保证 VCO 频率落在手册规定的范围内，否则 PLL 锁定失败，系统会自动退回 HSI。</p>
<p>HSE 起振需要时间，代码里要等 <code>RCC_CR_HSERDY</code> 置位并加超时判断；晶振的负载电容、PCB 布局都会影响起振，这是硬件调试的常见问题。</p>`,
        fig: {
          type: "flow",
          title: "STM32F103 时钟树主干（72MHz）",
          tag: "clock tree",
          items: [
            { t: "HSE 8MHz", d: "外部晶振" },
            { t: "PLL ×9", d: "→ 72MHz" },
            { t: "SYSCLK", d: "系统时钟" },
            { t: "AHB /1", d: "HCLK 72MHz" },
            { t: "APB1 /2", d: "36MHz" },
            { t: "APB2 /1", d: "72MHz" }
          ]
        },
        code: {
          lang: "c",
          title: "clock_init.c",
          src: `#include "stm32f1xx_hal.h"

/* 使用 HAL 配置 72MHz：HSE 8MHz × 9 */
void SystemClock_Config(void)
{
    RCC_OscInitTypeDef osc = {0};
    RCC_ClkInitTypeDef clk = {0};

    /* 1. 打开 HSE 并配置 PLL */
    osc.OscillatorType = RCC_OSCILLATORTYPE_HSE;
    osc.HSEState       = RCC_HSE_ON;
    osc.HSEPredivValue = RCC_HSE_PREDIV_DIV1;
    osc.PLL.PLLState   = RCC_PLL_ON;
    osc.PLL.PLLSource  = RCC_PLLSOURCE_HSE;
    osc.PLL.PLLMUL     = RCC_PLL_MUL9;          /* 8MHz × 9 = 72MHz */

    if (HAL_RCC_OscConfig(&osc) != HAL_OK) {
        Error_Handler();                        /* HSE 起振失败：检查晶振 */
    }

    /* 2. 配置总线分频与 Flash 等待周期 */
    clk.ClockType      = RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_SYSCLK
                       | RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;
    clk.SYSCLKSource   = RCC_SYSCLKSOURCE_PLLCLK;
    clk.AHBCLKDivider  = RCC_SYSCLK_DIV1;       /* HCLK  = 72MHz */
    clk.APB1CLKDivider = RCC_HCLK_DIV2;         /* PCLK1 = 36MHz（上限） */
    clk.APB2CLKDivider = RCC_HCLK_DIV1;         /* PCLK2 = 72MHz */

    if (HAL_RCC_ClockConfig(&clk, FLASH_LATENCY_2) != HAL_OK) {
        Error_Handler();
    }
}

/* 外设时钟必须单独使能，否则寄存器写了也没反应 */
void uart1_clock_enable(void)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();       /* PA9/PA10 */
    __HAL_RCC_USART1_CLK_ENABLE();      /* USART1 在 APB2 */
    __HAL_RCC_AFIO_CLK_ENABLE();        /* F1 系列复用功能需要 AFIO */
}`
        },
        apply: `<p>排查“外设不工作”的固定顺序：先确认该外设的总线时钟是否使能，再确认引脚是否配置为复用模式，最后确认外设本身的使能位。三者缺一，寄存器写了也毫无反应。</p>
<p>低功耗场景要反过来做：不用的外设时钟全部关掉，能显著降低动态功耗；进入低功耗前把 PLL 关掉、切回 HSI，唤醒后再重新配置。</p>`,
        pitfalls: [
          "<b>忘了使能 GPIO 或外设时钟。</b>这是“配置了但没反应”的第一大原因，寄存器读回来全是复位值。",
          "<b>APB1 超频。</b>F1 系列 APB1 上限 36MHz，配成 72MHz 会导致定时器、串口工作异常甚至锁死。",
          "<b>改了主频没改 Flash 等待周期。</b>取指出错，程序跑飞或 HardFault，且现象随机。"
        ],
        follow: [
          [
            "为什么 APB1 上的定时器时钟可能是 APB1 的两倍？",
            "当 APB 预分频不为 1 时，定时器时钟会自动乘以 2。比如 APB1 分频 2 得到 36MHz，但 TIM2 的计数时钟是 72MHz。计算 PWM 频率时必须用这个实际时钟。"
          ],
          [
            "HSI 和 HSE 怎么选？",
            "HSI 是内部 RC，无需外部器件、启动快，但精度差（±1%~2%），不适合串口和 USB；HSE 是外部晶振，精度高（ppm 级），适合通信和 RTC。成本敏感且对精度要求低的场合可以用 HSI。"
          ],
          [
            "如何验证实际主频？",
            "用 MCO 引脚输出 SYSCLK，接示波器或频率计测量；或者用 SysTick 计时 1 秒翻转 GPIO，看示波器上的周期。"
          ]
        ]
      },

      {
        id: "S-03",
        chapter: "gpio",
        topic: "mode",
        title: "GPIO 有几种工作模式？推挽和开漏有什么区别？",
        diff: "初级",
        freq: "高频",
        type: "基础概念题",
        point: "输入输出八种模式、推挽与开漏的驱动能力，以及上下拉的选择依据。",
        q: `<p>面试官：STM32 的 <strong>GPIO 有哪几种模式？</strong>推挽输出和开漏输出有什么区别？什么时候必须用开漏？上拉和下拉电阻什么时候加？</p>`,
        exam: `<p>这是最基础也最容易含糊的题。能说清“开漏只能拉低、需要外部上拉”“开漏可以做线与和电平转换”“输入浮空在悬空时电平不确定”，说明你真的理解电路，而不是背模式名字。</p>`,
        core: `<p>GPIO 有输入浮空/上拉/下拉/模拟，输出推挽/开漏，以及复用推挽/开漏；推挽能主动输出高低电平，开漏只能拉低、高电平靠外部上拉。多设备共享总线、电平不匹配或线与逻辑时必须用开漏，按键输入要加上下拉确定空闲电平。</p>`,
        answer: `<p>STM32 的 GPIO 有 8 种模式：输入浮空、输入上拉、输入下拉、模拟输入；输出推挽、输出开漏、复用推挽、复用开漏。</p>
<p>推挽输出内部有上下两个 MOS 管，能主动输出高电平和低电平，驱动能力强，适合直接驱动 LED、蜂鸣器。开漏输出只有下拉管，只能主动拉低，高电平靠外部上拉电阻，所以高电平的驱动能力很弱。</p>
<p>开漏的典型用途有三个：一是<strong>线与</strong>，多个开漏输出接在同一根线上，任何一个拉低都是低，I2C 的 SDA/SCL 就是这样；二是<strong>电平转换</strong>，上拉到 5V 就能输出 5V 电平，而芯片本身只耐 3.3V；三是驱动共阳数码管或需要较大电流的负载。</p>
<p>输入浮空在外部悬空时电平不确定，会因干扰乱跳，所以按键这类场景要用上拉或下拉给一个确定状态。模拟输入则要关闭数字部分，否则会影响 ADC 精度。</p>`,
        principle: `<p>推挽输出的高低电平由内部 MOS 直接决定，输出阻抗低（几十欧），可以快速充放电；开漏输出的高电平由外部上拉电阻和负载电容决定，上升沿是 RC 充电曲线，阻值越大上升越慢，所以 I2C 的上拉不能太大。</p>
<p>复用模式是把 GPIO 的控制权交给外设（USART、SPI 等），此时 GPIO 的输入输出方向和数据由外设决定。如果忘了配复用，外设信号出不来，引脚还是普通 GPIO。</p>`,
        fig: {
          type: "table",
          title: "GPIO 八种模式与典型用途",
          tag: "compare",
          head: ["模式", "方向", "特点", "典型用途"],
          rows: [
            ["输入浮空", "输入", "高阻，电平不确定", "外部已有上下拉的信号"],
            ["输入上拉", "输入", "内部上拉，默认高", "按键到地、低有效信号"],
            ["输入下拉", "输入", "内部下拉，默认低", "按键到 VCC、高有效信号"],
            ["模拟输入", "输入", "关闭数字通路", "ADC 采集、低功耗"],
            ["推挽输出", "输出", "可输出高低，驱动强", "LED、蜂鸣器、普通控制"],
            ["开漏输出", "输出", "只能拉低，需外部上拉", "I2C、线与、电平转换"],
            ["复用推挽", "输出", "由外设控制，驱动强", "SPI、USART TX、PWM"],
            ["复用开漏", "输出", "由外设控制，需上拉", "I2C 硬件外设"]
          ]
        },
        code: {
          lang: "c",
          title: "gpio_config.c",
          src: `#include "stm32f1xx_hal.h"

/* 推挽输出：驱动 LED */
void led_init(void)
{
    GPIO_InitTypeDef g = {0};
    __HAL_RCC_GPIOB_CLK_ENABLE();

    g.Pin   = GPIO_PIN_0;
    g.Mode  = GPIO_MODE_OUTPUT_PP;     /* 推挽输出 */
    g.Pull  = GPIO_NOPULL;
    g.Speed = GPIO_SPEED_FREQ_LOW;     /* 低速即可，减少 EMI */
    HAL_GPIO_Init(GPIOB, &g);
}

/* 输入上拉：按键接 GND，按下为低 */
void key_init(void)
{
    GPIO_InitTypeDef g = {0};
    __HAL_RCC_GPIOA_CLK_ENABLE();

    g.Pin  = GPIO_PIN_0;
    g.Mode = GPIO_MODE_INPUT;
    g.Pull = GPIO_PULLUP;              /* 默认高，按下变低 */
    HAL_GPIO_Init(GPIOA, &g);
}

/* 开漏输出：软件 I2C 的 SDA，需要外部上拉 */
void i2c_pin_init(void)
{
    GPIO_InitTypeDef g = {0};
    __HAL_RCC_GPIOB_CLK_ENABLE();

    g.Pin   = GPIO_PIN_6 | GPIO_PIN_7;
    g.Mode  = GPIO_MODE_OUTPUT_OD;     /* 开漏输出 */
    g.Pull  = GPIO_NOPULL;             /* 上拉在外部 */
    g.Speed = GPIO_SPEED_FREQ_HIGH;    /* I2C 需要较快边沿 */
    HAL_GPIO_Init(GPIOB, &g);
}

/* 模拟输入：ADC 采集，必须关掉数字部分 */
void adc_pin_init(void)
{
    GPIO_InitTypeDef g = {0};
    __HAL_RCC_GPIOA_CLK_ENABLE();

    g.Pin  = GPIO_PIN_1;
    g.Mode = GPIO_MODE_ANALOG;
    HAL_GPIO_Init(GPIOA, &g);
}`
        },
        apply: `<p>实际布线时，I2C 的上拉电阻通常取 4.7kΩ（100kHz）或 2.2kΩ（400kHz），总线电容大时还要减小；如果多个器件并联，注意总线的等效电容不能超过 400pF。</p>
<p>驱动继电器、电机这类感性负载时，GPIO 不能直接驱动，必须加三极管或 MOS 管，并加续流二极管，否则反向电动势会击穿引脚。</p>`,
        pitfalls: [
          "<b>把开漏当推挽用。</b>开漏输出高电平时是高阻，接 LED 会不亮或很暗，必须加上拉。",
          "<b>输入浮空却不加外部上下拉。</b>悬空引脚电平随机，读到的值乱跳，还会增加功耗。",
          "<b>忘记配置复用功能。</b>串口/SPI 的引脚还是普通 GPIO，外设信号根本出不来。"
        ],
        follow: [
          [
            "为什么 I2C 必须用开漏？",
            "I2C 是多主多从的总线，需要“线与”仲裁：任何设备拉低总线都是低电平，只有全部释放才是高。推挽输出会直接对拉，造成大电流损坏器件。"
          ],
          [
            "GPIO 的翻转速度怎么选？",
            "速度越高，边沿越陡，EMI 和功耗越大。LED、按键用低速即可；SPI、I2C、PWM 需要中高速；只有高速信号才用最高档。"
          ],
          [
            "如何用 GPIO 读取 5V 信号？",
            "不能直接接，多数 STM32 引脚不耐 5V。可以用电阻分压、电平转换芯片，或者选择标注 FT（5V 容忍）的引脚并配置为开漏/输入。"
          ]
        ]
      },

      {
        id: "S-04",
        chapter: "gpio",
        topic: "exti",
        title: "EXTI 外部中断怎么配置？为什么会出现反复触发？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "EXTI 与 NVIC 的配置链路、边沿触发选择，以及抖动和标志未清的常见问题。",
        q: `<p>面试官：<strong>EXTI 外部中断</strong>的配置流程是什么？为什么按键中断会<strong>反复触发</strong>？EXTI 线和 GPIO 引脚是什么关系？</p>`,
        exam: `<p>考察外设配置的完整链路和故障排查能力。“反复触发”是经典问题，原因可能是抖动、标志未清、电平触发配置错误。能给出软件消抖和标志清除的正确做法就很好。</p>`,
        core: `<p>外部中断要开 GPIO 和 AFIO 时钟、把引脚映射到 EXTI 线、配触发边沿和 NVIC，中断里清标志；同一条 EXTI 线只能选一个端口，PA0 和 PB0 不能同时用。反复触发多是中断里没清挂起位或按键抖动。</p>`,
        answer: `<p>配置流程是：使能 GPIO 时钟并配置为输入 → 使能 AFIO 时钟并把 GPIO 映射到对应的 EXTI 线 → 配置 EXTI 的触发边沿和屏蔽位 → 配置 NVIC 的优先级并使能 → 在中断函数里处理并清除标志。</p>
<p>EXTI 线和 GPIO 的关系是：每条 EXTI 线可以连接到<strong>同编号</strong>的 GPIO，比如 EXTI0 可以接 PA0、PB0 或 PC0，但同一时刻只能选一个。这就是为什么 PA0 和 PB0 不能同时做外部中断。</p>
<p>反复触发通常有三个原因：一是机械按键抖动，一次按下产生多个边沿，需要在软件里消抖或加 RC 滤波；二是中断标志没清，退出后立刻再次进入；三是配置成了<strong>双边沿触发</strong>，按下和松开各来一次，看起来像触发了两次。注意 STM32 的 EXTI 对 GPIO 只有上升沿、下降沿、双边沿三种触发方式，没有“电平触发”这个选项。</p>`,
        principle: `<p>EXTI 的挂起寄存器（PR）记录哪个线触发了中断。进入 ISR 后必须写 1 清除对应位，否则中断会一直挂起。有些系列要求先读 PR 再写，或者用 <code>__HAL_GPIO_EXTI_CLEAR_IT</code> 宏，具体看手册。</p>
<p>机械按键的抖动时间通常是 5~20ms，硬件上可以用 100nF 电容加 10kΩ 电阻做低通滤波，软件上可以在中断里关闭该线的中断、启动一个 20ms 定时器，定时到了再重新使能并读取电平。</p>`,
        fig: {
          type: "flow",
          title: "EXTI 配置链路",
          tag: "sequence",
          items: [
            { t: "GPIO 输入", d: "上拉/下拉" },
            { t: "AFIO 映射", d: "EXTI 线选择" },
            { t: "EXTI 边沿", d: "上升/下降/双边" },
            { t: "NVIC 使能", d: "优先级" },
            { t: "ISR 处理", d: "清标志" }
          ]
        },
        code: {
          lang: "c",
          title: "exti_key.c",
          src: `#include "stm32f1xx_hal.h"

/* 按键接 PA0，下降沿触发 */
void key_exti_init(void)
{
    GPIO_InitTypeDef g = {0};

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_AFIO_CLK_ENABLE();            /* F1 需要 AFIO 做线映射 */

    g.Pin  = GPIO_PIN_0;
    g.Mode = GPIO_MODE_IT_FALLING;          /* 下降沿触发中断 */
    g.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(GPIOA, &g);

    /* 优先级：低于通信，高于显示刷新 */
    HAL_NVIC_SetPriority(EXTI0_IRQn, 3, 0);
    HAL_NVIC_EnableIRQ(EXTI0_IRQn);
}

/* 中断里只做最小动作：关中断 + 打时间戳，消抖交给任务 */
volatile uint32_t g_key_tick;
volatile uint8_t  g_key_pending;

void EXTI0_IRQHandler(void)
{
    if (__HAL_GPIO_EXTI_GET_IT(GPIO_PIN_0) != RESET) {
        __HAL_GPIO_EXTI_CLEAR_IT(GPIO_PIN_0);   /* 必须清，否则反复进入 */
        g_key_tick = HAL_GetTick();
        g_key_pending = 1;
    }
}

/* 任务里做 20ms 消抖确认 */
void key_task(void)
{
    static uint32_t last = 0;

    if (!g_key_pending) return;

    if ((HAL_GetTick() - g_key_tick) >= 20) {    /* 稳定 20ms */
        if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == GPIO_PIN_RESET) {
            if ((g_key_tick - last) > 200) {     /* 防止重复触发 */
                last = g_key_tick;
                Key_OnPressed();
            }
        }
        g_key_pending = 0;
    }
}`
        },
        apply: `<p>实际项目里，外部中断适合处理“事件”，不适合做“业务”。ISR 里只记录时间戳、置标志或发信号量，消抖、长按短按判定、业务逻辑都放到任务里，这样中断执行时间可控，也不会因为业务阻塞影响其他中断。</p>
<p>如果按键很多，可以用定时器每 10ms 轮询扫描，比每个按键一根 EXTI 线更省资源，也更容易做组合键。</p>`,
        pitfalls: [
          "<b>不清中断标志。</b>退出 ISR 后立刻再次进入，表现为“卡在中断里”，主循环完全不执行。",
          "<b>两个 GPIO 同时映射到同一条 EXTI 线。</b>后配置的会覆盖前一个，另一个引脚的边沿收不到。",
          "<b>在 ISR 里做长延时消抖。</b>阻塞其他中断，通信会丢包，PWM 会抖动。"
        ],
        follow: [
          [
            "为什么 PA0 和 PB0 不能同时做外部中断？",
            "因为它们共用 EXTI0 这一条线，AFIO 的映射寄存器只能选择其中一个端口。要同时用两个引脚的中断，必须选不同编号的引脚（如 PA0 和 PB1）。"
          ],
          [
            "电平触发和边沿触发的区别？",
            "边沿触发只在电平跳变时产生一次事件；电平触发在电平保持期间持续产生事件，适合“必须处理完才允许退出”的场景，但容易造成中断风暴。需要说明的是，STM32 的 EXTI 对 GPIO 只支持上升沿/下降沿/双边沿，没有电平触发；电平型中断更多见于部分外设内部（如串口错误标志）或其它芯片。"
          ],
          [
            "如何用 EXTI 唤醒低功耗？",
            "把 EXTI 配置为中断模式并使能，进入 STOP 模式后引脚上的指定边沿会唤醒 MCU。注意唤醒后时钟会切回 HSI，需要重新配置系统时钟和外设。"
          ]
        ]
      },

      {
        id: "S-05",
        chapter: "timer",
        topic: "pwm",
        title: "定时器怎么输出 PWM？频率和占空比怎么算？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "PSC/ARR/CCR 的作用、PWM 频率与占空比公式，以及互补输出与死区。",
        q: `<p>面试官：定时器输出 <strong>PWM</strong> 的原理是什么？PSC、ARR、CCR 分别控制什么？如果要输出 1kHz、占空比 30% 的 PWM，72MHz 时钟怎么配？</p>`,
        exam: `<p>考察定时器的工作机制和实际计算能力。能推导出 <code>f = fCK / ((ARR+1)(PSC+1))</code> 并给出具体参数，还能提到“占空比精度受 ARR 限制”“电机控制要加死区”，就很完整。</p>`,
        core: `<p>PWM 频率 = 定时器时钟/((ARR+1)(PSC+1))，占空比 = CCR/(ARR+1)；72MHz 要 1kHz 可取 PSC=71、ARR=999，30% 占空比就是 CCR=300。</p>`,
        answer: `<p>定时器内部有一个计数器 CNT，在时钟驱动下递增或递减。PSC 是预分频器，把定时器时钟分频后驱动 CNT；ARR 是自动重装载值，CNT 计到 ARR 就归零并产生更新事件，所以 ARR 决定<strong>周期</strong>；CCR 是比较值，CNT 小于 CCR 时输出一种电平、大于时输出另一种，所以 CCR 决定<strong>占空比</strong>。</p>
<p>公式是：PWM 频率 = 定时器时钟 / ((ARR + 1) × (PSC + 1))，占空比 = CCR / (ARR + 1)。</p>
<p>要 1kHz、72MHz：先定 PSC = 71，得到 1MHz 计数时钟；再定 ARR = 999，得到 1kHz。占空比 30% 就是 CCR = 300。</p>
<p>注意定时器时钟不一定是系统时钟。APB 预分频不为 1 时，定时器时钟是 APB 时钟的 2 倍，算错了频率就会差一倍。</p>`,
        principle: `<p>PWM 模式 1 是“CNT &lt; CCR 时输出有效电平”，模式 2 相反。有效电平的高低由输出极性位决定，所以“占空比”指的是有效电平占整个周期的比例，不是高电平的比例，配置极性时要对应清楚。</p>
<p>ARR 决定了占空比的分辨率：ARR = 999 时只能调 1000 档，最小步进 0.1%；要提高精度就得增大 ARR，但频率会降低，这是一对矛盾。</p>`,
        fig: {
          type: "table",
          title: "PWM 参数计算示例（72MHz）",
          tag: "calc",
          head: ["目标", "PSC", "ARR", "CCR", "实际结果"],
          rows: [
            ["1kHz / 30%", "71", "999", "300", "1.000kHz / 30.0%"],
            ["20kHz / 50%", "35", "99", "50", "20.0kHz / 50.0%"],
            ["50Hz / 7.5%（舵机）", "71", "19999", "1500", "50.0Hz / 7.5%"],
            ["100kHz / 25%", "0", "719", "180", "100.0kHz / 25.0%"]
          ]
        },
        code: {
          lang: "c",
          title: "pwm_init.c",
          src: `#include "stm32f1xx_hal.h"

TIM_HandleTypeDef htim2;

/* TIM2_CH1 输出 PWM：PA0 复用推挽 */
void pwm_init(uint32_t freq_hz, uint8_t duty_percent)
{
    /* 1. 计算 PSC 和 ARR：先固定 PSC，让 ARR 尽量大以提高分辨率 */
    uint32_t tim_clk = 72000000u;             /* TIM2 在 APB1，分频不为 1 时 ×2 */
    uint32_t psc = 71;                        /* 72MHz / 72 = 1MHz */
    uint32_t arr = tim_clk / ((psc + 1) * freq_hz) - 1;
    uint32_t ccr = (arr + 1) * duty_percent / 100;

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_TIM2_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Pin       = GPIO_PIN_0;
    g.Mode      = GPIO_MODE_AF_PP;            /* 复用推挽 */
    g.Speed     = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    htim2.Instance               = TIM2;
    htim2.Init.Prescaler         = psc;
    htim2.Init.Period            = arr;       /* ARR */
    htim2.Init.CounterMode       = TIM_COUNTERMODE_UP;
    htim2.Init.ClockDivision     = TIM_CLOCKDIVISION_DIV1;
    htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_ENABLE;
    HAL_TIM_PWM_Init(&htim2);

    TIM_OC_InitTypeDef oc = {0};
    oc.OCMode     = TIM_OCMODE_PWM1;          /* CNT < CCR 时输出有效电平 */
    oc.Pulse      = ccr;                      /* 占空比 */
    oc.OCPolarity = TIM_OCPOLARITY_HIGH;
    HAL_TIM_PWM_ConfigChannel(&htim2, &oc, TIM_CHANNEL_1);
    HAL_TIM_PWM_Start(&htim2, TIM_CHANNEL_1);
}

/* 运行中动态改占空比：只改 CCR，不用重启定时器 */
void pwm_set_duty(uint8_t percent)
{
    uint32_t arr = __HAL_TIM_GET_AUTORELOAD(&htim2);
    __HAL_TIM_SET_COMPARE(&htim2, TIM_CHANNEL_1, (arr + 1) * percent / 100);
}`
        },
        apply: `<p>电机控制要用互补 PWM + 死区，防止上下桥臂同时导通造成短路。STM32 的高级定时器（TIM1/TIM8）支持死区插入，配置 <code>BDTR</code> 寄存器的 DTG 位即可，死区时间通常取几百纳秒。</p>
<p>LED 调光要注意人眼特性：线性调占空比时亮度变化不均匀，做呼吸灯通常用查表或伽马校正。</p>`,
        pitfalls: [
          "<b>忘记使能定时器时钟或复用引脚。</b>波形出不来，示波器上是一条直线。",
          "<b>算错定时器时钟。</b>APB1 分频后定时器时钟是 APB 的 2 倍，直接用 PCLK1 算会得到一半频率。",
          "<b>ARR 太小导致分辨率不足。</b>要 1% 精度至少需要 ARR ≥ 99，否则调不出想要的占空比。"
        ],
        follow: [
          [
            "如何产生两路相位差 90 度的 PWM？",
            "同一个定时器的各通道共用一个 CNT，改 CCR 只能改占空比、改不出相位，所以单定时器做不到 90° 相位差。正确做法是用两个定时器做主从同步：让主定时器的更新事件触发从定时器，从定时器的 CNT 预置为 1/4 周期（或延迟 ARR/4 再启动），两路 ARR、CCR 保持一致，就得到固定 90° 相位差。"
          ],
          [
            "什么是死区时间？为什么需要？",
            "上下桥臂切换时，关断有延迟，如果同时导通会形成直通短路。死区是在关断一个管子后延迟一段时间再开通另一个，保证两者不同时导通。"
          ],
          [
            "PWM 频率怎么选？",
            "LED 调光要高于 200Hz 避免闪烁；电机驱动通常 10~20kHz（高于人耳可听范围）；舵机是 50Hz；开关电源可能上百 kHz。要兼顾噪声、损耗和分辨率。"
          ]
        ]
      },

      {
        id: "S-06",
        chapter: "timer",
        topic: "capture",
        title: "输入捕获怎么测频率和占空比？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "捕获边沿、读取 CCR、PWM 输入模式，以及溢出处理与精度分析。",
        q: `<p>面试官：用定时器的<strong>输入捕获</strong>测量一个方波的频率和占空比，思路是什么？如果信号频率很低，计数器溢出了怎么办？</p>`,
        exam: `<p>考察对定时器高级功能的掌握。能说出“两次上升沿的时间差是周期”“上升沿到下降沿是高电平时间”“PWM 输入模式可以硬件自动完成”，以及“溢出要累加”，说明你实际测过信号。</p>`,
        core: `<p>测频率用两次上升沿捕获，CCR 差值就是一个周期；测占空比要三次捕获，或用 PWM 输入模式让硬件分别记录周期和高电平时间。频率低到计数器溢出时，用捕获溢出次数扩展计数或加大预分频。</p>`,
        answer: `<p>测频率的思路是：配置通道为上升沿捕获，第一次捕获记录 CCR 值，第二次捕获再记录一次，两次之差就是一个周期对应的计数值，乘以计数时钟周期就是周期，取倒数就是频率。</p>
<p>测占空比需要三次捕获：上升沿 → 下降沿 → 下一个上升沿。第一段是高电平时间，第二段是低电平时间，占空比 = 高电平时间 / 总周期。</p>
<p>STM32 的定时器有 <strong>PWM 输入模式</strong>（PWM Input），用两个通道分别捕获上升沿和下降沿，硬件自动把周期存到一个 CCR、高电平时间存到另一个 CCR，软件只需要读寄存器，效率最高。</p>
<p>频率很低时，一个周期可能超过计数器的最大计数值（16 位 65535），这时会在捕获之间发生溢出。处理方法是在更新中断里累加溢出次数，计算时把 <code>溢出次数 × 65536</code> 加进去。</p>`,
        principle: `<p>捕获的精度取决于计数时钟频率和信号频率的比值。72MHz 计数、测 1kHz 信号，一个周期 72000 个计数，分辨率很高；测 1MHz 信号只有 72 个计数，误差就大了。所以高频信号应该先分频或改用“测周法 vs 测频法”的取舍。</p>
<p>测频法是在固定闸门时间内数脉冲个数，适合高频；测周法是测一个周期的时间，适合低频。工程上常按频率范围自动切换。</p>`,
        code: {
          lang: "c",
          title: "pwm_input.c",
          src: `#include "stm32f1xx_hal.h"

/* PWM 输入模式：IC1 直连 TI1(PA6) 捕上升沿，IC2 经间接通道同样连到 TI1 捕下降沿；PA7 不参与 */
TIM_HandleTypeDef htim3;
volatile uint32_t g_period;      /* 一个周期的计数值 */
volatile uint32_t g_high;        /* 高电平计数值 */

void pwm_input_init(void)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_TIM3_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Pin  = GPIO_PIN_6;              /* 只用 TI1(PA6) */
    g.Mode = GPIO_MODE_INPUT;
    g.Pull = GPIO_PULLDOWN;
    HAL_GPIO_Init(GPIOA, &g);

    htim3.Instance           = TIM3;
    htim3.Init.Prescaler     = 71;        /* 1MHz 计数时钟 */
    htim3.Init.Period        = 0xFFFF;    /* 满量程；周期超过 65535 计数时要加大预分频 */
    htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;
    HAL_TIM_IC_Init(&htim3);

    /* 通道 1：上升沿，直接模式（TI1） */
    TIM_IC_InitTypeDef ic = {0};
    ic.ICPolarity  = TIM_ICPOLARITY_RISING;
    ic.ICSelection = TIM_ICSELECTION_DIRECTTI;
    ic.ICPrescaler = TIM_ICPSC_DIV1;
    ic.ICFilter    = 0x0F;                /* 滤波，抑制毛刺 */
    HAL_TIM_IC_ConfigChannel(&htim3, &ic, TIM_CHANNEL_1);

    /* 通道 2：下降沿，间接模式 */
    ic.ICPolarity  = TIM_ICPOLARITY_FALLING;
    ic.ICSelection = TIM_ICSELECTION_INDIRECTTI;
    HAL_TIM_IC_ConfigChannel(&htim3, &ic, TIM_CHANNEL_2);

    /* 从模式复位：每次上升沿把 CNT 清零，读 CCR 即得周期 */
    TIM_SlaveConfigTypeDef slave = {0};
    slave.SlaveMode = TIM_SLAVEMODE_RESET;
    slave.InputTrigger = TIM_TS_TI1FP1;
    HAL_TIM_SlaveConfigSynchro(&htim3, &slave);

    HAL_TIM_IC_Start_IT(&htim3, TIM_CHANNEL_1);
    HAL_TIM_IC_Start(&htim3, TIM_CHANNEL_2);
}

/* 捕获回调：CCR1 = 周期，CCR2 = 高电平时间 */
void HAL_TIM_IC_CaptureCallback(TIM_HandleTypeDef *htim)
{
    if (htim->Channel == HAL_TIM_ACTIVE_CHANNEL_1) {
        g_period = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_1) + 1;
        g_high   = HAL_TIM_ReadCapturedValue(htim, TIM_CHANNEL_2) + 1;
    }
}

/* 频率 = 计数时钟 / 周期；占空比 = 高电平 / 周期 */
uint32_t get_freq_hz(void)
{
    if (g_period == 0) return 0;
    return 1000000u / g_period;           /* 1MHz 计数时钟 */
}

uint8_t get_duty_percent(void)
{
    if (g_period == 0) return 0;
    return (uint8_t)(g_high * 100u / g_period);
}`
        },
        apply: `<p>测转速、测超声波回波宽度、解码红外遥控、读流量计脉冲，都是输入捕获的典型场景。红外 NEC 协议就是靠捕获高低电平宽度来区分 0 和 1。</p>
<p>如果信号有毛刺，要配置输入滤波器（ICFilter），它是基于采样点的数字滤波，能有效抑制几十纳秒的干扰，比外部 RC 更灵活。</p>`,
        pitfalls: [
          "<b>忽略计数器溢出。</b>低频信号测出来周期变成一个很小的值，频率大得离谱。必须处理溢出。",
          "<b>在“两次捕获求差”的写法里再多加 1。</b>两次捕获值之差就是经过的计数个数（1MHz 计数下捕获到 100 和 1100，相差 1000，正好 1ms），再加 1 反而引入固定偏差。只有 PWM 输入模式那种“边沿复位 CNT、直接读 CCR1”的写法，才按手册公式取 CCR1+1。",
          "<b>第一次捕获的值没丢弃。</b>上电后第一次捕获的差值没有意义，应该丢弃前两次结果。"
        ],
        follow: [
          [
            "测频法和测周法怎么选？",
            "测频法（固定时间数脉冲）适合高频，误差随频率升高而减小；测周法（测一个周期的时间）适合低频，误差随频率降低而减小。工程上按信号频率范围选择，或两者结合。"
          ],
          [
            "如何提高测量精度？",
            "提高计数时钟频率、增大捕获范围、多次测量取平均、用输入滤波抑制噪声、或者用定时器的从模式复位让硬件自动清零 CNT。"
          ],
          [
            "输入捕获和外部中断测频率有什么区别？",
            "输入捕获由硬件记录时间戳，精度是计数周期级，且不占 CPU；外部中断每次都要进 ISR，高频时中断开销大，时间精度也受中断延迟影响。"
          ]
        ]
      },

      {
        id: "S-07",
        chapter: "timer",
        topic: "adc",
        title: "ADC 的采样时间怎么定？多通道采集为什么要用 DMA？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "采样保持、转换时间计算、扫描模式与 DMA 配合，以及精度影响因素。",
        q: `<p>面试官：<strong>ADC 的采样时间</strong>是什么？怎么算一次转换需要多久？采集 4 个通道时为什么必须用 DMA？如果采样值跳动很大，可能是什么原因？</p>`,
        exam: `<p>考察模拟采集的工程细节。能说清“采样时间要匹配信号源内阻”“总转换时间 = 采样 + 转换”“扫描模式下不用 DMA 会丢通道”，以及“参考电压、地线、滤波”对精度的影响，说明你调过真实电路。</p>`,
        core: `<p>F1 的 12 位转换固定 12.5 个 ADC 时钟，加采样时间才是总时间；14MHz、采样 55.5 周期约 4.86µs；多通道必须用 DMA，否则 DR 会被覆盖。</p>`,
        answer: `<p>ADC 转换分两个阶段：采样阶段是内部采样电容对输入信号充电，时间由采样时间寄存器配置；转换阶段是逐次逼近比较，12 位分辨率需要固定若干个 ADC 时钟。</p>
<p>总转换时间 = 采样时间 + 转换时间。比如 STM32F1 的 12 位转换需要 12.5 个 ADC 时钟，如果 ADC 时钟 14MHz、采样时间 55.5 个周期，总时间就是 68 个周期，约 4.86 微秒，对应约 206kSPS。</p>
<p>采样时间要足够长，让采样电容充到目标精度。信号源内阻越大，需要的采样时间越长。如果内阻高又用最短采样时间，读数会明显偏低。</p>
<p>多通道扫描时，ADC 只有一个数据寄存器，转换完一个通道如果不及时读走，下一个通道的结果会覆盖它。所以必须用 DMA 自动搬运，或者每个通道转换完立刻进中断读取（开销大且容易丢）。</p>
<p>采样值跳动大，常见原因是参考电压不稳、模拟地和数字地没有分开、信号源内阻太高、采样时间太短、或者电源纹波大。</p>`,
        principle: `<p>逐次逼近型 ADC 的原理是“二分查找”：先用最高位比较，根据结果决定保留还是清除，依次往下，N 位需要 N 个比较周期。所以分辨率越高，转换越慢。</p>
<p>采样保持电路的核心是一个采样开关加一个电容。开关闭合时电容跟随输入电压，断开时保持住供比较。电容充电是指数曲线，要达到 12 位 1LSB 的精度需要约 8.3 个时间常数（e<sup>-8.3</sup> ≈ 1/4096），要求 0.5LSB 则约需 9 个；时间常数等于源内阻乘以采样电容。</p>`,
        fig: {
          type: "flow",
          title: "ADC 转换的两个阶段",
          tag: "timing",
          items: [
            { t: "触发启动", d: "软件/定时器" },
            { t: "采样保持", d: "电容充电" },
            { t: "逐次逼近", d: "12 个时钟" },
            { t: "结果写入", d: "DR 寄存器" },
            { t: "DMA 搬运", d: "多通道" }
          ]
        },
        code: {
          lang: "c",
          title: "adc_scan.c",
          src: `#include "stm32f1xx_hal.h"

#define CH_NUM 4

static volatile uint16_t s_adc_buf[CH_NUM];

void adc_multi_init(void)
{
    /* 1. 4 个模拟输入引脚 */
    GPIO_InitTypeDef g = {0};
    __HAL_RCC_GPIOA_CLK_ENABLE();
    g.Pin  = GPIO_PIN_0 | GPIO_PIN_1 | GPIO_PIN_2 | GPIO_PIN_3;
    g.Mode = GPIO_MODE_ANALOG;
    HAL_GPIO_Init(GPIOA, &g);

    /* 2. ADC 时钟：PCLK2/6 = 12MHz，不能超过 14MHz */
    __HAL_RCC_ADC1_CLK_ENABLE();
    RCC_PeriphCLKInitTypeDef pclk = {0};
    pclk.PeriphClockSelection = RCC_PERIPHCLK_ADC;
    pclk.AdcClockSelection    = RCC_ADCPCLK2_DIV6;
    HAL_RCCEx_PeriphCLKConfig(&pclk);

    /* 3. 扫描 + 连续转换 + DMA */
    hadc1.Instance                   = ADC1;
    hadc1.Init.ScanConvMode          = ENABLE;
    hadc1.Init.ContinuousConvMode    = ENABLE;
    hadc1.Init.DiscontinuousConvMode = DISABLE;
    hadc1.Init.ExternalTrigConv      = ADC_SOFTWARE_START;
    hadc1.Init.DataAlign             = ADC_DATAALIGN_RIGHT;
    hadc1.Init.NbrOfConversion       = CH_NUM;
    /* F1 的 ADC_InitTypeDef 没有 DMAContinuousRequests 字段（那是 F4/F2 的），
     * 连续搬运靠 HAL_ADC_Start_DMA + DMA 循环模式实现 */
    HAL_ADC_Init(&hadc1);

    /* 4. 每个通道的采样时间：高内阻信号给更长时间 */
    ADC_ChannelConfTypeDef ch = {0};
    for (uint32_t i = 0; i < CH_NUM; i++) {
        ch.Channel      = ADC_CHANNEL_0 + i;
        ch.Rank         = i + 1;
        ch.SamplingTime = ADC_SAMPLETIME_55CYCLES_5;
        HAL_ADC_ConfigChannel(&hadc1, &ch);
    }

    HAL_ADC_Start_DMA(&hadc1, (uint32_t *)s_adc_buf, CH_NUM);
}

/* 电压换算：12 位、参考 3.3V */
float adc_to_voltage(uint16_t raw)
{
    return raw * 3.3f / 4095.0f;
}`
        },
        apply: `<p>实际布板时，模拟信号要走短线、远离高频信号（SPI、PWM），ADC 输入端加 RC 低通（比如 1kΩ + 100nF）抑制高频干扰；参考电压引脚要加 100nF 和 10uF 电容，否则读数会随负载跳动。</p>
<p>如果需要更高精度，可以用外部基准源（如 REF3033）代替 VDDA，并做多点校准消除偏移和增益误差。</p>`,
        pitfalls: [
          "<b>采样时间配得太短。</b>采样电容没充满，读数偏低，且随信号源内阻变化，表现为“不同通道偏差不一样”。",
          "<b>ADC 时钟超频。</b>超过手册上限（通常 14MHz）会导致转换结果不可靠，甚至完全错误。",
          "<b>多通道不用 DMA。</b>数据寄存器被覆盖，读到的全是最后一个通道的值。"
        ],
        follow: [
          [
            "ADC 的分辨率和精度是一回事吗？",
            "不是。分辨率是能区分的最小电压变化（12 位 / 3.3V 约 0.8mV），精度是读数与真实值的接近程度，受参考电压、线性度、噪声、温漂影响。分辨率高不代表精度高。"
          ],
          [
            "如何提高 ADC 的有效位数？",
            "过采样 + 平均：采样 4^n 次求和再右移 n 位，可以增加 n 位有效分辨率，代价是采样率降低。也可以加硬件滤波、稳定参考电压、优化 PCB 布局。"
          ],
          [
            "为什么 ADC 采样时 CPU 不能进入某些低功耗模式？",
            "ADC 需要时钟和模拟电路供电，进入 STOP 或 STANDBY 会关闭 ADC，转换中止。低功耗采集通常用定时器触发 + DMA，采完立刻进低功耗。"
          ]
        ]
      },

      {
        id: "S-08",
        chapter: "reliability",
        topic: "wdg",
        title: "独立看门狗和窗口看门狗有什么区别？",
        diff: "中级",
        freq: "中频",
        type: "对比辨析题",
        point: "时钟源、喂狗窗口、复位行为，以及在可靠性设计中的配合方式。",
        q: `<p>面试官：<strong>IWDG 和 WWDG</strong> 有什么区别？为什么有了独立看门狗还要窗口看门狗？喂狗应该放在哪里？</p>`,
        exam: `<p>考察可靠性设计意识。能说清“IWDG 用独立 LSI，主时钟挂了也能复位”“WWDG 有喂狗窗口，喂早了也复位”“喂狗要放在主循环或关键任务，不能在中断里无脑喂”，说明你考虑过真实故障模式。</p>`,
        core: `<p>IWDG 用独立 LSI、只要超时就复位，适合防彻底卡死；WWDG 用 APB1 时钟、必须在窗口内喂，喂早喂晚都复位，适合发现时序异常。喂狗放最低优先级任务或主循环，不要放在中断里。</p>`,
        answer: `<p>IWDG 是独立看门狗，时钟来自内部的 LSI（约 40kHz），与主时钟完全独立。即使 PLL 失锁、系统时钟挂掉，它照样计数，超时后复位芯片。它的喂狗是“只要在超时前喂就行”，没有时间窗口限制。</p>
<p>WWDG 是窗口看门狗，时钟来自 APB1，必须在规定的窗口内喂狗：喂早了（计数器还很大）会复位，喂晚了（计数器低于 0x40）也会复位。这样可以检测“程序跑飞后乱喂狗”或“某个任务执行过快/过慢”的异常。</p>
<p>两者定位不同：IWDG 防的是系统彻底卡死，WWDG 防的是时序异常。高可靠性项目通常两个都开，IWDG 做最后兜底，WWDG 监控关键任务的执行节奏。</p>
<p>喂狗的位置很关键：应该放在主循环里，并且要确认所有关键任务都正常执行过（比如用任务标志位做“与”判断），不能放在定时器中断里无脑喂，否则主循环死了中断还在喂，看门狗就形同虚设。</p>`,
        principle: `<p>IWDG 的计数器是 12 位递减，超时时间 = (4 × 2^PR) × RLR / LSI 频率。PR 是预分频，RLR 是重装载值。LSI 的频率精度很差（±50%），所以超时时间只能粗略估算，不能用来做精确计时。</p>
<p>WWDG 是 7 位递减计数器，从 0x7F 往下数，必须在计数器降到 0x40 之前、且低于窗口值时喂狗。窗口值配置在 CFR 寄存器里，喂早了会触发复位。</p>`,
        fig: {
          type: "table",
          title: "IWDG 与 WWDG 对比",
          tag: "compare",
          head: ["维度", "IWDG 独立看门狗", "WWDG 窗口看门狗"],
          rows: [
            ["时钟源", "LSI（独立，约 40kHz）", "PCLK1"],
            ["计数器", "12 位递减", "7 位递减"],
            ["喂狗限制", "超时前任意时刻", "必须在窗口内"],
            ["能否检测喂早", "不能", "能，喂早直接复位"],
            ["主时钟故障", "仍能工作", "失效"],
            ["典型用途", "系统级兜底", "任务节奏监控"]
          ]
        },
        code: {
          lang: "c",
          title: "watchdog.c",
          src: `#include "stm32f1xx_hal.h"

IWDG_HandleTypeDef hiwdg;
WWDG_HandleTypeDef hwwdg;

/* IWDG：LSI 40kHz，预分频 64，重装 625 → 约 1s 超时 */
void iwdg_init(void)
{
    hiwdg.Instance       = IWDG;
    hiwdg.Init.Prescaler = IWDG_PRESCALER_64;
    hiwdg.Init.Reload    = 625;
    HAL_IWDG_Init(&hiwdg);
}

/* 喂狗：必须确认关键任务都跑过，而不是无脑喂 */
static volatile uint32_t s_task_flags;

#define TASK_SENSOR  (1u << 0)
#define TASK_COMM    (1u << 1)
#define TASK_DISPLAY (1u << 2)
#define TASK_ALL     (TASK_SENSOR | TASK_COMM | TASK_DISPLAY)

void app_main_loop(void)
{
    for (;;) {
        if (sensor_task()) s_task_flags |= TASK_SENSOR;
        if (comm_task())   s_task_flags |= TASK_COMM;
        if (display_task()) s_task_flags |= TASK_DISPLAY;

        /* 只有全部任务都正常执行过才喂狗 */
        if ((s_task_flags & TASK_ALL) == TASK_ALL) {
            s_task_flags = 0;
            HAL_IWDG_Refresh(&hiwdg);
        }
    }
}

/* 调试时冻结看门狗，避免断点停下就复位 */
void dbg_freeze_watchdog(void)
{
    __HAL_DBGMCU_FREEZE_IWDG();
    __HAL_DBGMCU_FREEZE_WWDG();
}`
        },
        apply: `<p>量产设备必须开看门狗，并且要在出厂测试里验证“真的会复位”：故意制造死循环，观察是否能自动恢复。很多项目看门狗配置了但从未生效，因为喂狗放错了位置。</p>
<p>另外，复位后要记录复位原因（读 RCC_CSR 的 IWDGRSTF 等标志），上报到日志或云端，才能知道现场设备是否在反复重启。</p>`,
        pitfalls: [
          "<b>在中断里喂狗。</b>主循环死了中断还在跑，看门狗永远不会复位，等于没开。",
          "<b>超时时间设得太短。</b>正常的长耗时操作（Flash 擦除、通信重传）会被误判为死机，频繁重启。",
          "<b>调试时没冻结看门狗。</b>断点一停就复位，根本没法调试。"
        ],
        follow: [
          [
            "看门狗复位后如何知道原因？",
            "读 RCC 的 CSR 寄存器，检查 IWDGRSTF、WWDGRSTF、PORRSTF、PINRSTF 等标志，判断是看门狗、上电还是外部复位，然后写 RMVF 清除标志。"
          ],
          [
            "为什么 IWDG 的超时时间不准？",
            "LSI 是内部 RC 振荡器，频率随温度和电压变化，精度可能只有 ±50%。所以 IWDG 只适合做“秒级兜底”，不能当精确计时用。需要精确计时用 LSE 或外部 RTC。"
          ],
          [
            "多任务系统里怎么喂狗最合理？",
            "每个关键任务执行完置自己的标志位，一个低优先级任务检查所有标志都置位后才喂狗并清标志。这样任何一个任务卡死都会导致停止喂狗，触发复位。"
          ]
        ]
      },

      {
        id: "S-09",
        chapter: "reliability",
        topic: "lib",
        title: "HAL 库、标准库、寄存器开发该怎么选？",
        diff: "初级",
        freq: "中频",
        type: "对比辨析题",
        point: "三种开发方式的抽象层次、代码体积、可移植性与调试难度。",
        q: `<p>面试官：你平时用 <strong>HAL 库、标准库还是直接写寄存器</strong>？各有什么优缺点？如果项目对 Flash 空间和实时性要求很高，你会怎么选？</p>`,
        exam: `<p>考察工程判断力，而不是站队。能说清“HAL 可移植但臃肿、标准库轻量但停止维护、寄存器最直接但可读性差”，并且能按项目约束做选择，才是成熟工程师。</p>`,
        core: `<p>HAL 抽象高、移植方便但代码大、效率低；标准库轻量直接，但 ST 已停更；寄存器版最快最小，但可读性和移植性差。Flash 紧、实时性高就直接用寄存器或 LL 库。</p>`,
        answer: `<p>HAL 库是 ST 现在主推的库，抽象层次高，提供统一的 <code>HAL_xxx_Init</code>、<code>HAL_xxx_Transmit</code> 接口，跨系列移植方便，配合 CubeMX 能快速生成工程。缺点是代码体积大、调用层次深、执行效率低，中断处理里套了多层回调。</p>
<p>标准库（SPL）是老一代库，直接封装寄存器，代码轻量、执行效率高、逻辑清晰，很多老工程师偏爱。缺点是 ST 已经停止维护，新系列（G0/G4/H7）不再提供。</p>
<p>直接写寄存器最直接，代码最小、执行最快，能精确控制每一位。缺点是可读性差、移植性差、容易漏掉时序要求（比如使能顺序、延时）。</p>
<p>如果 Flash 只有 32KB、中断响应要求微秒级，我会用标准库或寄存器；如果是新项目、需要快速迭代、Flash 充裕，用 HAL + CubeMX 更划算。</p>`,
        principle: `<p>三者的本质区别是<strong>抽象层次</strong>。寄存器是硬件接口，标准库是寄存器的函数封装，HAL 是带状态机和回调的更高层封装。抽象越高，开发越快，但代码体积和不确定性越大。</p>
<p>HAL 的典型开销来自：大量的参数检查、状态机判断、回调分发、以及为了兼容所有系列而引入的冗余代码。一个 <code>HAL_UART_Transmit</code> 调用链可能有几十层。</p>`,
        fig: {
          type: "layers",
          title: "三种开发方式的抽象层次",
          tag: "abstraction",
          items: [
            { tag: "APP", t: "应用代码", d: "业务逻辑，与库无关" },
            { tag: "HAL", t: "HAL 库 / 标准库", d: "函数封装，跨系列可移植" },
            { tag: "REG", t: "寄存器", d: "直接读写地址，零抽象开销" },
            { tag: "HW", t: "硅片", d: "外设电路" }
          ]
        },
        apply: `<p>实际项目里常常混用：初始化用 CubeMX 生成 HAL 代码保证正确性，热点路径（中断服务、PWM 更新、通信收发）直接操作寄存器或调用 LL 库（Low Layer，ST 提供的轻量封装）来降低开销。</p>
<p>ST 的 LL 库是一个不错的折中：接口接近寄存器、有基本的类型检查、代码量小，适合对性能敏感又不想完全手写寄存器的场景。</p>`,
        pitfalls: [
          "<b>认为 HAL 一定更好。</b>在资源紧张或实时性要求高的场景，HAL 的开销可能无法接受。",
          "<b>直接抄寄存器代码但不看手册。</b>漏掉使能顺序、延时要求，出现“偶尔能跑”的随机故障。",
          "<b>混用 HAL 和标准库。</b>两者对时钟、中断的管理方式不同，容易互相覆盖配置，产生难查的问题。"
        ],
        follow: [
          [
            "HAL 库的中断回调机制是怎样的？",
            "HAL 在中断入口调用 <code>HAL_xxx_IRQHandler</code>，它处理标志后调用弱定义的 <code>HAL_xxx_Callback</code>。用户重写回调函数即可，不需要改中断向量。好处是解耦，代价是多一层函数调用。"
          ],
          [
            "如何减小 HAL 生成的代码体积？",
            "只使能用到的外设模块；开启 <code>-ffunction-sections -fdata-sections</code> 并链接 <code>--gc-sections</code>；用 LL 库替代部分 HAL；关闭不用的断言和调试输出。"
          ],
          [
            "寄存器开发如何保证可读性？",
            "用有名字的宏代替魔法数字，封装成 inline 函数，加注释说明每一位的含义和时序要求，并保留数据手册的页码引用。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("stm32-gd32", {
    chapters: [
      {
        id: "chip",
        topics: [
          { id: "dma", title: "DMA 通道与请求映射" },
          { id: "flash", title: "Flash 编程与选项字节" },
          { id: "css", title: "时钟安全系统" },
          { id: "reset", title: "复位源与 BOR" }
        ]
      },
      {
        id: "gpio",
        topics: [{ id: "remap", title: "复用功能与重映射" }]
      },
      {
        id: "timer",
        topics: [{ id: "encoder", title: "编码器接口与主从模式" }]
      },
      {
        id: "reliability",
        topics: [
          { id: "i2c-lock", title: "硬件 I2C 死锁恢复" },
          { id: "iap", title: "IAP 应用内编程" },
          { id: "nvic", title: "NVIC 优先级实战" }
        ]
      }
    ],
    questions: [
      {
        id: "S-10",
        chapter: "chip",
        topic: "dma",
        title: "STM32 的 DMA 通道和请求映射是怎么回事？循环模式怎么用？",
        diff: "中级",
        freq: "高频",
        type: "配置分析题",
        point: "每个外设请求固定映射到特定通道，不能随意选；循环模式适合连续采样，普通模式适合单次传输。",
        q: `<p>面试官：串口接收想用 DMA，但 DMA1 通道 4 已经被用了，能换到通道 2 吗？循环模式和普通模式有什么区别？</p>`,
        exam: `<p>考察对 DMA 硬件结构的理解。能说出“请求映射是硬件固定的、不能任意换通道”，以及循环模式会自动重装计数器，就很好。</p>`,
        core: `<p>DMA 请求映射是芯片固定的，F1 的 USART1_RX 只能是 DMA1 通道 5；通道被占用可换外设实例或用带 DMAMUX 的型号；循环模式适合连续采样和接收。</p>`,
        answer: `<p><b>请求映射是固定的。</b>每个外设的 DMA 请求在芯片设计时就连接到特定的 DMA 控制器和通道，查参考手册的 DMA 请求映射表可以确认。例如 STM32F1 上 USART1_RX 固定是 DMA1 通道 5，不能改到通道 2。如果通道被占用，只能：</p>
<ul>
<li>换一个外设实例（如用 USART2 而不是 USART1）；</li>
<li>改用中断方式；</li>
<li>换用带 DMAMUX 的型号（如 STM32G0/H7），可以把请求路由到任意通道。</li>
</ul>
<p><b>普通模式</b>：传输完设定的数量后停止，需要软件重新配置才能再次传输。适合单次大块搬运，比如发送一帧数据。</p>
<p><b>循环模式</b>：计数器减到 0 后自动重装，持续搬运。适合连续采样（ADC + DMA）和串口持续接收。使用循环模式时，软件要通过“半传输/传输完成”中断来处理数据，否则会被覆盖。</p>
<p><b>其他关键配置：</b>数据宽度（字节/半字/字）必须与外设和内存匹配；地址自增要按方向设置；优先级决定多通道竞争时的仲裁。</p>`,
        principle: `<p>DMA 控制器有多个通道，每个通道有独立的配置寄存器和请求线。请求线由外设产生，硬件连线固定，所以“哪个外设用哪个通道”是芯片决定的，不是软件可编程的。</p>
<p>循环模式通过自动重装传输计数器实现连续搬运，不需要 CPU 干预，但软件必须跟上消费速度。</p>`,
        fig: {
          type: "table",
          title: "普通模式与循环模式对比",
          tag: "dma",
          head: ["模式", "传输结束", "适用场景", "注意事项"],
          rows: [
            ["普通", "停止，需重配", "单次发送/接收", "传输完成中断里重启"],
            ["循环", "自动重装", "ADC 连续采样、串口接收", "防止缓冲区被覆盖"],
            ["双缓冲", "切换目标缓冲区", "高速连续数据", "需要两个缓冲区"]
          ]
        },
        code: {
          lang: "c",
          title: "dma_adc.c",
          src: `#include "stm32f4xx_hal.h"

ADC_HandleTypeDef  hadc1;
DMA_HandleTypeDef  hdma_adc1;
uint16_t adc_buf[2][128];      /* 双缓冲 */

void adc_dma_init(void)
{
    /* DMA2 Stream0 Channel0 对应 ADC1，具体映射查手册 */
    hdma_adc1.Instance                 = DMA2_Stream0;
    hdma_adc1.Init.Channel             = DMA_CHANNEL_0;
    hdma_adc1.Init.Direction           = DMA_PERIPH_TO_MEMORY;
    hdma_adc1.Init.PeriphInc           = DMA_PINC_DISABLE;
    hdma_adc1.Init.MemInc              = DMA_MINC_ENABLE;
    hdma_adc1.Init.PeriphDataAlignment = DMA_PDATAALIGN_HALFWORD;
    hdma_adc1.Init.MemDataAlignment    = DMA_MDATAALIGN_HALFWORD;
    hdma_adc1.Init.Mode                = DMA_CIRCULAR;   /* 循环模式 */
    HAL_DMA_Init(&hdma_adc1);
    __HAL_LINKDMA(&hadc1, DMA_Handle, hdma_adc1);
}`
        },
        codeNote: "循环模式下要确保软件处理速度跟得上采样率，否则半传输/完成中断里读到的数据可能已被覆盖。",
        apply: `<p>做多通道 ADC 采样时，我用循环 DMA + 半传输/完成双中断：前半满时处理前一半，后半满时处理后一半，这样 CPU 有完整的一个缓冲区时间来处理，不会丢数据。</p>
<p>串口接收用“DMA 循环 + IDLE 中断”：IDLE 时读取 DMA 当前剩余计数，算出收到多少字节，再重置计数，能高效处理不定长帧。</p>`,
        pitfalls: [
          "<b>以为 DMA 通道可以随便选。</b>映射是硬件固定的。",
          "<b>数据宽度不匹配。</b>半字配置成字节，数据错位。",
          "<b>循环模式不处理中断。</b>缓冲区被覆盖，数据丢失。",
          "<b>忘记使能 DMA 时钟和中断。</b>配置看起来对，但完全不工作。"
        ],
        follow: [
          ["DMA 传输完成中断和半传输中断有什么用？", "半传输在缓冲区一半填满时触发，传输完成在全部填满时触发；配合双缓冲可以实现“处理一半、接收一半”的流水线。"],
          ["DMA 和 CPU 同时访问同一块内存会怎样？", "总线仲裁会串行化访问，可能降低性能；同时写同一区域会产生数据竞争，必须由软件保证不同时访问。"]
        ]
      },

      {
        id: "S-11",
        chapter: "chip",
        topic: "flash",
        title: "STM32 的 Flash 怎么读写？选项字节是什么？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "Flash 按页/扇区擦除、按字编程，写前必须擦除；选项字节配置读保护、启动地址和看门狗。",
        q: `<p>面试官：想把参数存到 STM32 的内部 Flash，代码怎么写？为什么有时候写完读出来不对？选项字节又是什么？</p>`,
        exam: `<p>考察对 Flash 物理特性的掌握。能说出“先擦后写、按扇区擦除、编程期间不能从同一 Bank 取指”，就说明实际做过。</p>`,
        core: `<p>Flash 必须先擦后写，擦除按扇区、编程按字或半字；编程期间不能从同一 Bank 取指，关键代码要搬到 RAM；选项字节配错可能导致连不上调试器。</p>`,
        answer: `<p><b>基本流程：</b>解锁 Flash → 擦除目标扇区 → 按字/半字编程 → 等待完成 → 上锁。</p>
<p><b>关键约束：</b></p>
<ul>
<li><b>先擦后写</b>：Flash 只能把 1 写成 0，要写新数据必须先擦除（擦除后全为 1）。</li>
<li><b>擦除粒度是扇区/页</b>：STM32F1 按页（1~2KB），F4 按扇区（16~128KB），擦除会清掉整个扇区，所以参数区要单独划分。</li>
<li><b>编程粒度是字/半字</b>：通常按 32 位或 16 位写入，不能逐字节写。</li>
<li><b>编程期间不能从同一 Flash Bank 取指</b>：部分型号会阻塞总线，导致程序停顿甚至 HardFault；解决办法是把关键代码搬到 RAM 执行，或使用双 Bank 型号。</li>
<li><b>写前检查地址范围</b>：误擦代码区会导致程序丢失。</li>
</ul>
<p><b>选项字节（Option Bytes）</b>是 Flash 中的一块特殊配置区，包含：</p>
<ul>
<li>读保护（RDP）等级；</li>
<li>写保护（WRP）区域；</li>
<li>启动地址（BOOT_ADD）；</li>
<li>独立看门狗硬件使能、复位后保持；</li>
<li>BOR 复位阈值。</li>
</ul>
<p>修改选项字节会触发系统复位，且配置错误可能导致芯片无法连接调试器，操作前要确认恢复方法。</p>`,
        principle: `<p>Flash 存储单元是浮栅晶体管，编程（写 0）通过注入电荷实现，擦除（写 1）需要按块加高压。因此擦除粒度远大于编程粒度，且擦除次数有限（典型 1 万次）。</p>
<p>擦除和编程都是异步操作，必须轮询 BSY 位或使用中断，不能假设立即完成。</p>`,
        fig: {
          type: "table",
          title: "Flash 操作的粒度与限制",
          tag: "flash",
          head: ["操作", "粒度", "说明"],
          rows: [
            ["擦除", "页 / 扇区", "整块变 0xFF"],
            ["编程", "字 / 半字", "只能 1→0"],
            ["读取", "字节/字", "随机访问"],
            ["寿命", "约 1 万次", "频繁写需磨损均衡"]
          ]
        },
        code: {
          lang: "c",
          title: "flash_write.c",
          src: `#include "stm32f4xx_hal.h"

#define PARAM_ADDR  0x08040000u
#define PARAM_SECTOR FLASH_SECTOR_6

int flash_save(const uint32_t *data, uint32_t words)
{
    FLASH_EraseInitTypeDef erase = {0};
    uint32_t sector_error = 0;

    HAL_FLASH_Unlock();

    /* 1. 擦除整个扇区 */
    erase.TypeErase    = FLASH_TYPEERASE_SECTORS;
    erase.Sector       = PARAM_SECTOR;
    erase.NbSectors    = 1;
    erase.VoltageRange = FLASH_VOLTAGE_RANGE_3;
    if (HAL_FLASHEx_Erase(&erase, &sector_error) != HAL_OK) {
        HAL_FLASH_Lock();
        return -1;
    }

    /* 2. 按字编程 */
    for (uint32_t i = 0; i < words; i++) {
        if (HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD,
                              PARAM_ADDR + i * 4u,
                              data[i]) != HAL_OK) {
            HAL_FLASH_Lock();
            return -2;
        }
    }

    HAL_FLASH_Lock();
    return 0;
}`
        },
        codeNote: "擦除前要确认目标扇区没有被代码或其它数据占用；量产固件最好把参数区固定在链接脚本之外。",
        apply: `<p>参数存储我会做双备份加序号，避免擦除时掉电导致数据全丢。写入频率高的数据先缓存在 RAM，定时或变化超过阈值再落盘。</p>
<p>量产时通过选项字节开启读保护，防止固件被读出；但要注意开启后调试器无法再连接，需要先解除保护（会全片擦除）。</p>`,
        pitfalls: [
          "<b>不擦除直接写。</b>只能把 1 写成 0，旧数据无法覆盖。",
          "<b>擦除粒度和预期不符。</b>F4 的扇区很大，一擦就清掉几十 KB。",
          "<b>编程期间从 Flash 取指。</b>总线阻塞或 HardFault。",
          "<b>误改选项字节。</b>可能导致芯片锁死，需要特殊方式恢复。"
        ],
        follow: [
          ["为什么 Flash 写之前要解锁？", "防止程序跑飞时误擦写代码区；解锁需要向特定寄存器写密钥序列，降低误操作概率。"],
          ["双 Bank Flash 有什么好处？", "可以在 Bank1 运行代码的同时擦写 Bank2，实现真正的后台升级，不会阻塞 CPU 取指。"]
        ]
      },

      {
        id: "S-12",
        chapter: "chip",
        topic: "css",
        title: "时钟安全系统（CSS）是什么？外部晶振失效会怎样？",
        diff: "高级",
        freq: "进阶",
        type: "可靠性设计题",
        point: "CSS 监测 HSE，失效时自动切回 HSI 并产生 NMI，避免系统停摆。",
        q: `<p>面试官：产品在现场运行，外部晶振突然坏了，MCU 会怎样？怎么保证系统还能安全工作？</p>`,
        exam: `<p>考察对可靠性的考虑。能说出 CSS 自动切换、NMI 处理、以及“切回内部时钟后波特率会变”这个连锁影响，就很好。</p>`,
        core: `<p>HSE 失效时 PLL 失锁、CPU 可能停摆，开 CSS 后硬件自动切到 HSI 并产生 NMI；NMI 里要关 USB/CAN、重配串口和定时器，因为主频变了。</p>`,
        answer: `<p>如果 HSE 失效而系统时钟仍配置为 PLL（由 HSE 驱动），PLL 会失锁，系统时钟停摆，CPU 停止运行——表现为设备“死机”，看门狗可能都来不及喂。</p>
<p><b>CSS（Clock Security System）</b>就是为此设计的：</p>
<ol>
<li>使能 CSS 后，硬件持续监测 HSE 是否起振；</li>
<li>检测到失效时，硬件<b>自动切换</b>系统时钟到 HSI（内部 16MHz），保证 CPU 继续运行；</li>
<li>同时关闭 HSE 和 PLL，并产生 <b>NMI</b> 中断；</li>
<li>在 NMI 处理程序里，软件可以把系统降级到安全模式：关闭依赖精确时钟的外设（如 USB、CAN）、重新配置串口波特率、记录故障日志、点亮告警。</li>
</ol>
<p><b>连锁影响：</b>切到 HSI 后主频变了，所有基于系统时钟计算的时序都会变——串口波特率、定时器周期、ADC 采样时间、PWM 频率。如果软件不重新配置，通信会乱码、控制周期会漂移。</p>
<p>所以 NMI 处理里必须重新初始化时钟相关的外设，或者至少把系统切到一个已知的安全状态。</p>`,
        principle: `<p>CSS 是硬件级的时钟监测，不依赖软件轮询，响应速度快（几个时钟周期），能在 PLL 完全失锁前完成切换。</p>
<p>NMI 是不可屏蔽中断，优先级高于所有可屏蔽中断，保证故障处理一定被执行。</p>`,
        fig: {
          type: "flow",
          title: "HSE 失效后的处理流程",
          tag: "css",
          items: [
            { t: "HSE 失效", d: "晶振停振或频率异常" },
            { t: "CSS 检测", d: "硬件监测到时钟丢失" },
            { t: "自动切换", d: "系统时钟切到 HSI" },
            { t: "产生 NMI", d: "进入不可屏蔽中断" },
            { t: "安全降级", d: "重配外设、记录日志、告警" }
          ]
        },
        code: {
          lang: "c",
          title: "css_nmi.c",
          src: `#include "stm32f4xx_hal.h"

void css_enable(void)
{
    /* 使能时钟安全系统 */
    RCC->CR |= RCC_CR_CSSON;
}

/* NMI 处理：HSE 失效或其它不可屏蔽故障 */
void NMI_Handler(void)
{
    if (RCC->CIR & RCC_CIR_CSSF) {
        /* 1. 清除 CSS 标志：CSSF 在 RCC_CIR 的 bit7，向同寄存器的 CSSC(bit23) 写 1 清除 */
        RCC->CIR |= RCC_CIR_CSSC;

        /* 2. 系统时钟已被硬件切到 HSI，重配外设 */
        SystemCoreClockUpdate();

        /* 3. 关闭依赖精确时钟的外设 */
        /* USB / CAN / 高精度定时器 */

        /* 4. 记录故障，进入安全模式 */
        fault_log_write(FAULT_HSE_FAIL);
        enter_safe_mode();
    }
}`
        },
        codeNote: "NMI 里不要做耗时操作，记录标志并置位一个全局状态，让主循环处理降级逻辑。",
        apply: `<p>做工业产品时我会默认开启 CSS，并在 NMI 里把设备切到“安全模式”：关闭通信、保持基本采集、点亮故障灯。这样即使晶振坏了，设备也不会完全失联，维护人员能看到告警。</p>
<p>还要注意：切到 HSI 后精度下降（内部 RC 通常 ±1%~±2%），如果产品依赖精确计时，需要在安全模式里改用 RTC 或外部独立时钟。</p>`,
        pitfalls: [
          "<b>不开启 CSS。</b>HSE 失效直接死机。",
          "<b>NMI 里不重配外设。</b>时钟变了但波特率没变，通信全乱。",
          "<b>忘记清 CSSF 标志。</b>NMI 反复触发。",
          "<b>依赖 HSI 精度做长时间计时。</b>内部 RC 漂移大。"
        ],
        follow: [
          ["CSS 能监测 HSI 吗？", "不能，CSS 只监测 HSE。HSI 是内部时钟，通常作为 HSE 失效后的备份。"],
          ["如何测试 CSS 是否生效？", "在运行时短接或断开晶振引脚，观察系统是否切换到 HSI 并进入 NMI；也可以在调试器里手动清除 HSEON 位模拟失效。"]
        ]
      },

      {
        id: "S-13",
        chapter: "chip",
        topic: "reset",
        title: "STM32 有哪些复位源？怎么判断上次是什么原因复位？",
        diff: "中级",
        freq: "中频",
        type: "工程实践题",
        point: "上电、掉电（BOR）、外部 NRST、看门狗、软件复位；通过 RCC_CSR 标志判断并手动清除。",
        q: `<p>面试官：设备偶尔重启，怎么知道是看门狗、掉电还是程序主动复位？</p>`,
        exam: `<p>考察复位机制和现场排查能力。能说出复位标志寄存器、标志需要手动清除、以及备份寄存器保存额外信息，就很好。</p>`,
        core: `<p>复位源有上电/掉电、NRST、IWDG、WWDG、软件复位和 Standby 唤醒；读 RCC->CSR 对应标志判断，标志读后写 1 清除，上电复位会清掉其它标志。</p>`,
        answer: `<p>STM32 的复位源主要有：</p>
<ul>
<li><b>上电复位（POR/PDR）</b>：电源上升时触发；</li>
<li><b>掉电复位（BOR）</b>：电源低于阈值时触发，防止低压下误操作；</li>
<li><b>外部复位（NRST）</b>：复位引脚被拉低；</li>
<li><b>独立看门狗（IWDG）</b>：没喂狗；</li>
<li><b>窗口看门狗（WWDG）</b>：喂狗过早或过晚；</li>
<li><b>软件复位（NVIC_SystemReset）</b>：程序主动重启；</li>
<li><b>低功耗模式唤醒复位</b>：从 Standby 唤醒等同于复位。</li>
</ul>
<p><b>判断方法：</b>读 <code>RCC-&gt;CSR</code> 的复位标志位（PINRSTF、PORRSTF、SFTRSTF、IWDGRSTF、WWDGRSTF、LPWRRSTF）。注意：</p>
<ul>
<li>标志是<b>累积</b>的，可能同时有多位置位，要结合优先级判断；</li>
<li>读完后必须<b>手动清除</b>（写 1 清零），否则下次无法区分；</li>
<li>上电复位会清掉所有标志，所以看到 POR 置位时，其它标志可能已经被清空。</li>
</ul>
<p><b>更可靠的做法：</b>在复位前把原因写入备份寄存器（BKP），重启后读取。比如软件复位前写一个魔数，就能区分“主动重启”和“看门狗复位”。</p>`,
        principle: `<p>复位会把内核和大部分外设寄存器恢复成默认值，但<strong>不会擦除 SRAM</strong>——系统复位（NRST、看门狗、软件复位）之后 SRAM 内容原样保留，这也是很多 bootloader 用固定 RAM 地址传参的原因。上电冷启动时 SRAM 内容不确定（刚上电，未初始化）；只有进过 Standby 再唤醒，SRAM 才会丢失。复位标志和备份域寄存器由独立电源域保持，所以能跨复位保存信息。</p>
<p>BOR 的作用是保证 MCU 在电压不足时不执行代码，避免 Flash 读写出错、外设误动作。</p>`,
        fig: {
          type: "table",
          title: "常见复位源与标志",
          tag: "reset",
          head: ["复位源", "标志位", "典型原因"],
          rows: [
            ["上电/掉电", "PORRSTF", "电源波动、电池耗尽"],
            ["BOR", "BORRSTF", "电压低于阈值"],
            ["外部引脚", "PINRSTF", "NRST 被拉低、干扰"],
            ["独立看门狗", "IWDGRSTF", "程序卡死未喂狗"],
            ["软件复位", "SFTRSTF", "升级、异常恢复"],
            ["低功耗唤醒", "LPWRRSTF", "Standby 唤醒"]
          ]
        },
        code: {
          lang: "c",
          title: "reset_reason.c",
          src: `#include "stm32f4xx_hal.h"

typedef enum {
    RST_UNKNOWN = 0,
    RST_POWER_ON,
    RST_BOR,
    RST_PIN,
    RST_IWDG,
    RST_WWDG,
    RST_SOFTWARE,
    RST_LOW_POWER
} reset_reason_t;

reset_reason_t reset_reason_get(void)
{
    uint32_t csr = RCC->CSR;
    reset_reason_t r = RST_UNKNOWN;

    if (csr & RCC_CSR_PORRSTF)      r = RST_POWER_ON;
    else if (csr & RCC_CSR_BORRSTF) r = RST_BOR;
    else if (csr & RCC_CSR_IWDGRSTF)r = RST_IWDG;
    else if (csr & RCC_CSR_WWDGRSTF)r = RST_WWDG;
    else if (csr & RCC_CSR_SFTRSTF) r = RST_SOFTWARE;
    else if (csr & RCC_CSR_PINRSTF) r = RST_PIN;
    else if (csr & RCC_CSR_LPWRRSTF)r = RST_LOW_POWER;

    /* 清除所有复位标志，供下次判断 */
    RCC->CSR |= RCC_CSR_RMVF;
    return r;
}`
        },
        codeNote: "判断顺序要考虑优先级：上电复位会连带其它标志，通常先判断 POR，再判断具体来源。",
        apply: `<p>我在启动时读取复位原因并写入日志，现场设备重启后可以通过云端看到“最近一次复位原因”的统计。如果 IWDG 复位占比高，说明有任务卡死或喂狗逻辑有问题。</p>
<p>对于掉电复位，我会结合 BOR 阈值和电源电路分析：电池供电设备在射频发射瞬间电压跌落，很容易触发 BOR，需要加大电容或调整发射策略。</p>`,
        pitfalls: [
          "<b>不清理复位标志。</b>下次判断时旧标志还在，误判。",
          "<b>只看一个标志。</b>多个标志可能同时置位，要按优先级判断。",
          "<b>把 Standby 唤醒当成普通复位。</b>SRAM 已丢失，需要恢复状态。",
          "<b>忽略 BOR 阈值配置。</b>低压下运行，Flash 可能出错。"
        ],
        follow: [
          ["软件复位和看门狗复位有什么区别？", "软件复位是程序主动调用，通常在升级或不可恢复错误时使用；看门狗复位是硬件在超时后强制复位，说明程序已经失控。"],
          ["备份寄存器能保存多少数据？", "通常有若干个 32 位寄存器（如 20 个），由 VBAT 域供电，主电源掉电后仍能保持，适合保存复位原因、升级标志等少量关键信息。"]
        ]
      },

      {
        id: "S-14",
        chapter: "gpio",
        topic: "remap",
        title: "GPIO 的复用功能是什么？重映射和 AF 编号怎么配？",
        diff: "中级",
        freq: "中频",
        type: "配置分析题",
        point: "引脚默认是 GPIO，需配置为复用模式并选择 AF 编号；重映射把外设信号搬到备用引脚。",
        q: `<p>面试官：为什么配置了串口外设，TX 引脚还是没有波形？复用功能和重映射是怎么回事？</p>`,
        exam: `<p>考察 GPIO 配置的完整性。能说出“时钟、模式、AF 编号、重映射”四件事，说明实际调过外设。</p>`,
        core: `<p>引脚做外设功能要同时开 GPIO 和外设时钟、配成复用模式、选对 AF 编号；F1 还要开 AFIO 并配置重映射，漏一项就没有波形。</p>`,
        answer: `<p>STM32 的引脚大多是复用的：同一个物理引脚可以作普通 GPIO，也可以作 USART、SPI、TIM 等外设的信号线。要使用外设功能，必须：</p>
<ol>
<li><b>使能 GPIO 时钟和外设时钟</b>（两个都要，漏一个就没反应）；</li>
<li><b>把引脚配置为复用模式</b>（<code>GPIO_MODE_AF_PP</code> 或 <code>GPIO_MODE_AF_OD</code>），而不是输入/输出模式；</li>
<li><b>选择正确的 AF 编号</b>：F4/H7 等型号通过 <code>GPIOx-&gt;AFR[0/1]</code> 为每个引脚选择复用功能，编号查数据手册的“Alternate function mapping”表；</li>
<li><b>处理重映射</b>：F1 系列通过 AFIO 的重映射寄存器把外设信号搬到备用引脚；F4 之后用 AF 编号选择，不再叫重映射。</li>
</ol>
<p><b>常见错误：</b></p>
<ul>
<li>只配了外设，没配 GPIO 复用 → 引脚还是普通 IO，没有波形；</li>
<li>AF 编号选错 → 信号接到错误的外设；</li>
<li>忘了使能 GPIO 时钟 → 寄存器写入无效；</li>
<li>开漏/推挽选错 → 输出电平不对，或无法驱动；</li>
<li>F1 上忘了开 AFIO 时钟 → 重映射配置不生效。</li>
</ul>
<p>调试时可以先测量引脚是否有电平变化，再看外设寄存器是否使能，最后核对 AF 编号。</p>`,
        principle: `<p>复用功能由芯片内部的信号选择器实现：每个引脚有一组可选输入源，AFR 寄存器选择其中一个连接到引脚。配置错误时，引脚和外设之间没有连接，外设工作但信号出不来。</p>
<p>重映射是为了让 PCB 布线更灵活：外设的默认引脚可能被其它功能占用，通过重映射可以换到备用引脚。</p>`,
        fig: {
          type: "layers",
          title: "一个引脚上的信号选择",
          tag: "gpio af",
          items: [
            { tag: "外设", t: "USART1_TX / SPI1_SCK / TIM2_CH1", d: "多个外设竞争同一引脚" },
            { tag: "选择器", t: "AFR 寄存器选择 AF 编号", d: "决定哪个信号接到引脚" },
            { tag: "模式", t: "复用推挽 / 复用开漏", d: "决定驱动方式" },
            { tag: "引脚", t: "PA9 等物理引脚", d: "最终输出到外部" }
          ]
        },
        code: {
          lang: "c",
          title: "uart_gpio.c",
          src: `#include "stm32f4xx_hal.h"

void uart1_gpio_init(void)
{
    GPIO_InitTypeDef gpio = {0};

    /* 1. 使能 GPIO 和 USART 时钟 */
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();

    /* 2. PA9 = TX, PA10 = RX，复用为 AF7 */
    gpio.Pin       = GPIO_PIN_9 | GPIO_PIN_10;
    gpio.Mode      = GPIO_MODE_AF_PP;
    gpio.Pull      = GPIO_PULLUP;
    gpio.Speed     = GPIO_SPEED_FREQ_VERY_HIGH;
    gpio.Alternate = GPIO_AF7_USART1;
    HAL_GPIO_Init(GPIOA, &gpio);
}`
        },
        codeNote: "AF 编号不是外设编号，USART1 在 F4 上是 AF7，具体值必须查数据手册的复用功能表。",
        apply: `<p>画原理图时我会先查复用表，确认外设默认引脚和可选重映射引脚，避免选了不支持该功能的引脚。PCB 打样后再改就麻烦了。</p>
<p>调试时如果外设寄存器显示发送完成但引脚无波形，第一反应是检查 GPIO 模式和 AF 编号，而不是怀疑外设本身。</p>`,
        pitfalls: [
          "<b>只配外设不配 GPIO。</b>引脚没有连接到外设。",
          "<b>AF 编号凭感觉填。</b>必须查表，不同型号不同。",
          "<b>忘记开 GPIO 时钟。</b>寄存器写入无效。",
          "<b>F1 上忘记开 AFIO 时钟。</b>重映射不生效。",
          "<b>复用开漏没加上拉。</b>输出高电平时浮空。"
        ],
        follow: [
          ["推挽和开漏在复用模式下怎么选？", "需要主动输出高低电平（如 SPI SCK、UART TX）用推挽；需要线与或电平转换（如 I2C）用开漏并加上拉。"],
          ["为什么有些引脚默认是调试口？", "SWD/JTAG 引脚复位后默认是调试功能，用作普通 IO 需要先关闭调试功能或重映射，否则会影响下载调试。"]
        ]
      },

      {
        id: "S-15",
        chapter: "timer",
        topic: "adc",
        title: "ADC 的规则组和注入组有什么区别？什么时候用注入组？",
        diff: "高级",
        freq: "中频",
        type: "配置分析题",
        point: "规则组按顺序转换、结果存 DR；注入组可打断规则组、有独立数据寄存器，适合紧急采样。",
        q: `<p>面试官：STM32 的 ADC 有规则组和注入组，为什么要有两套？电机控制里怎么用？</p>`,
        exam: `<p>考察对 ADC 结构的深入理解。能说出“注入组可抢占规则组、有 4 个独立结果寄存器”，并结合电流采样说明用途，就很好。</p>`,
        core: `<p>规则组最多 16 通道、共用一个 DR，多通道要 DMA；注入组最多 4 通道、有独立 JDR 且能打断规则组，适合 PWM 同步采关键电流。</p>`,
        answer: `<p><b>规则组（Regular）</b>：</p>
<ul>
<li>最多 16 个通道，按序列顺序转换；</li>
<li>所有通道共用一个数据寄存器 DR，多通道时必须用 DMA 搬运，否则会被覆盖；</li>
<li>由软件、定时器或外部事件触发。</li>
</ul>
<p><b>注入组（Injected）</b>：</p>
<ul>
<li>最多 4 个通道，有 4 个独立的数据寄存器（JDR1~JDR4），不需要 DMA；</li>
<li>可以<b>打断</b>正在进行的规则组转换，优先执行，完成后恢复规则组；</li>
<li>常用于需要紧急、同步采样的场景。</li>
</ul>
<p><b>电机控制中的典型用法：</b>用定时器触发规则组，配合 DMA 连续采集三相电流和母线电压；同时用注入组在 PWM 中心对齐时刻采样，保证采样点与开关状态同步。注入组可以抢占，确保关键采样不被错过。</p>
<p>另外，ADC 的采样时间要结合信号源内阻计算：采样时间太短，采样电容充不满，读数偏低。高阻信号源需要更长的采样时间。</p>`,
        principle: `<p>ADC 内部只有一个逐次逼近转换器（或少量），多个通道只能分时复用。规则组是“排队”，注入组是“插队”。</p>
<p>注入组的独立寄存器省去了 DMA，降低了延迟，适合对时序要求严格的场合。</p>`,
        fig: {
          type: "table",
          title: "规则组与注入组对比",
          tag: "adc",
          head: ["特性", "规则组", "注入组"],
          rows: [
            ["通道数", "最多 16", "最多 4"],
            ["数据寄存器", "共用 DR", "独立 JDR1~4"],
            ["是否可抢占", "否", "可打断规则组"],
            ["典型用途", "多通道轮询采集", "紧急/同步采样"]
          ]
        },
        code: {
          lang: "c",
          title: "adc_injected.c",
          src: `#include "stm32f4xx_hal.h"

/* 保存句柄，供中断服务程序使用，避免 ISR 里写死 hadc1 */
static ADC_HandleTypeDef *s_adc;

/* 配置注入组：4 个通道，由定时器 TRGO 触发 */
void adc_injected_config(ADC_HandleTypeDef *hadc)
{
    ADC_InjectionConfTypeDef inj = {0};

    s_adc = hadc;

    inj.InjectedNbrOfConversion   = 4;
    inj.InjectedSamplingTime      = ADC_SAMPLETIME_15CYCLES;
    inj.ExternalTrigInjecConv     = ADC_EXTERNALTRIGINJECCONV_T1_TRGO;
    inj.ExternalTrigInjecConvEdge = ADC_EXTERNALTRIGINJECCONVEDGE_RISING;

    inj.InjectedChannel      = ADC_CHANNEL_1;
    inj.InjectedRank         = 1;
    inj.InjectedOffset       = 0;
    HAL_ADCEx_InjectedConfigChannel(hadc, &inj);

    /* 其余通道类似，Rank 依次 2/3/4 */

    /* 使能注入组转换完成中断 */
    __HAL_ADC_ENABLE_IT(hadc, ADC_IT_JEOC);
}

/* 注入组完成中断：读取 4 个独立结果 */
void ADC_IRQHandler(void)
{
    if (__HAL_ADC_GET_FLAG(s_adc, ADC_FLAG_JEOC)) {
        uint16_t i1 = HAL_ADCEx_InjectedGetValue(s_adc, ADC_INJECTED_RANK_1);
        uint16_t i2 = HAL_ADCEx_InjectedGetValue(s_adc, ADC_INJECTED_RANK_2);
        (void)i1; (void)i2;
    }
}`
        },
        codeNote: "注入组的转换结果必须及时读取，虽然不会互相覆盖，但下一次注入转换会更新寄存器。",
        apply: `<p>做 FOC 电流采样时，我用定时器的 TRGO 触发 ADC 注入组，在 PWM 中心点采样，避开开关噪声。注入组的独立寄存器让中断里能一次读完全部电流值，不需要 DMA 同步。</p>
<p>规则组则用来采集温度、母线电压这类慢变量，用 DMA 循环搬运，两者互不干扰。</p>`,
        pitfalls: [
          "<b>规则组多通道不用 DMA。</b>DR 被覆盖，只剩最后一个通道的值。",
          "<b>注入组当成规则组用。</b>通道数受限，且会打断规则组。",
          "<b>采样时间太短。</b>高阻信号源采样不足，读数偏低。",
          "<b>忘记校准 ADC。</b>零点偏移，小信号误差大。"
        ],
        follow: [
          ["ADC 的采样时间怎么计算？", "采样时间 = 采样周期数 / ADC 时钟。要保证采样电容充电到足够精度，通常要求采样时间大于信号源内阻与采样电容时间常数的若干倍。"],
          ["如何提高 ADC 精度？", "使用外部基准、增加采样时间、做多次平均、远离数字信号布线、校准零点；必要时用过采样和抖动提高有效位数。"]
        ]
      },

      {
        id: "S-16",
        chapter: "reliability",
        topic: "i2c-lock",
        title: "STM32 硬件 I2C 卡死（BUSY 一直为 1）怎么恢复？",
        diff: "高级",
        freq: "高频",
        type: "故障排查题",
        point: "从机拉低 SDA 导致总线死锁，通过手动时钟脉冲或复位 I2C 外设恢复。",
        q: `<p>面试官：I2C 通信跑着跑着就卡住了，BUSY 位一直是 1，重启 MCU 才好。怎么在不重启的情况下恢复？</p>`,
        exam: `<p>考察对 I2C 电气特性和硬件状态机的理解。能说出“从机在传输中被复位，拉低 SDA 不放”这个根因，以及 9 个时钟脉冲的恢复方法，就很好。</p>`,
        core: `<p>I2C 从机卡住会一直拉低 SDA，主机复位后 BUSY 清不掉；把 SCL 切成 GPIO 手动发最多 9 个时钟，再发 STOP，最后重新初始化 I2C。</p>`,
        answer: `<p><b>根因：</b>I2C 是开漏总线，从机在发送数据时会把 SDA 拉低。如果主机在传输中途复位（看门狗、掉电、软件重启），从机可能还停留在“等待时钟”的状态，继续拉低 SDA。此时主机重新初始化 I2C，检测到 SDA 为低，认为总线忙，BUSY 一直不清，形成死锁。</p>
<p><b>恢复方法：</b></p>
<ol>
<li>把 I2C 引脚切换为普通 GPIO 开漏输出；</li>
<li>手动发送最多 9 个 SCL 时钟脉冲，让从机把剩余的数据位发完，释放 SDA；</li>
<li>发送 STOP 条件（SCL 高时 SDA 由低变高）；</li>
<li>切换回 I2C 复用功能，重新初始化外设。</li>
</ol>
<p>9 个脉冲是因为一个字节 8 位加 1 个 ACK 位，最多 9 个时钟就能让从机完成当前字节。</p>
<p><b>预防措施：</b></p>
<ul>
<li>加入超时机制，不要死等 BUSY；</li>
<li>检测到异常时执行恢复流程；</li>
<li>主机复位时同时复位 I2C 从机（如果有复位引脚）；</li>
<li>上拉电阻要合适，总线电容不要过大。</li>
</ul>`,
        principle: `<p>I2C 总线状态由主从双方共同决定：SDA 和 SCL 都是“线与”，任何一方拉低都是低电平。从机不知道主机已经复位，只会按照自己的状态机继续等待时钟，因此必须由主机主动补时钟让它退出。</p>
<p>硬件 I2C 外设的 BUSY 位反映的是总线状态，不是外设自身状态，所以软件复位外设不一定能清除。</p>`,
        fig: {
          type: "flow",
          title: "I2C 死锁恢复流程",
          tag: "i2c recovery",
          items: [
            { t: "检测 BUSY 超时", d: "不要死等，设置超时" },
            { t: "切 GPIO", d: "SCL/SDA 配为开漏输出" },
            { t: "补 9 个时钟", d: "让从机发完当前字节" },
            { t: "发 STOP", d: "SCL 高时 SDA 上升" },
            { t: "切回复用", d: "重新初始化 I2C" }
          ]
        },
        code: {
          lang: "c",
          title: "i2c_recover.c",
          src: `#include "stm32f4xx_hal.h"

/* 在 BUSY 超时后调用：用 GPIO 模拟时钟恢复总线 */
void i2c_bus_recover(I2C_HandleTypeDef *hi2c)
{
    GPIO_InitTypeDef gpio = {0};

    /* 1. 关闭 I2C，引脚切为普通开漏输出 */
    HAL_I2C_DeInit(hi2c);

    gpio.Pin   = GPIO_PIN_6 | GPIO_PIN_7;   /* SCL / SDA */
    gpio.Mode  = GPIO_MODE_OUTPUT_OD;
    gpio.Pull  = GPIO_PULLUP;
    gpio.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOB, &gpio);

    /* 2. 确保 SDA 释放后，补最多 9 个时钟 */
    for (int i = 0; i < 9; i++) {
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);
        HAL_Delay(1);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
        HAL_Delay(1);
        if (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_7) == GPIO_PIN_SET) break;
    }

    /* 3. 生成 STOP：SCL 高时 SDA 由低变高 */
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_RESET);
    HAL_Delay(1);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
    HAL_Delay(1);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);
    HAL_Delay(1);

    /* 4. 恢复 I2C 配置 */
    MX_I2C1_Init();
}`
        },
        codeNote: "恢复函数要放在通信失败的超时分支里，而不是每次初始化都调用，避免影响正常启动时序。",
        apply: `<p>我在 I2C 读写封装里加了超时和恢复：连续 N 次失败或 BUSY 超过 10ms，就执行一次总线恢复并重试。现场设备因此很少需要断电重启。</p>
<p>另一个经验：I2C 从机（如 OLED、传感器）在主机复位时可能处于半传输状态，恢复后最好重新初始化从机，而不是直接继续读。</p>`,
        pitfalls: [
          "<b>死等 BUSY 位。</b>总线死锁时程序卡死，看门狗复位后再次死锁。",
          "<b>只复位 I2C 外设。</b>从机仍拉着 SDA，BUSY 不会清。",
          "<b>恢复时忘记发 STOP。</b>从机可能仍处于忙状态。",
          "<b>上拉电阻过大。</b>上升沿变慢，高速下通信失败。"
        ],
        follow: [
          ["为什么 I2C 需要上拉电阻？", "I2C 是开漏输出，只能主动拉低，无法主动输出高电平，必须靠上拉电阻把总线拉高。"],
          ["软件模拟 I2C 相比硬件 I2C 有什么优势？", "时序完全可控，容易加超时和恢复，不会因为外设状态机卡死；缺点是占用 CPU，速率较低。"]
        ]
      },

      {
        id: "S-17",
        chapter: "reliability",
        topic: "iap",
        title: "IAP 和 ICP 有什么区别？应用内编程怎么实现？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "ICP 用调试器烧录，IAP 由程序自身通过通信接口更新固件，需要 Bootloader 和分区。",
        q: `<p>面试官：产品出厂后要升级固件，除了返厂用烧录器，还能怎么做？IAP 的原理是什么？</p>`,
        exam: `<p>考察对固件更新链路的理解。能区分 ICP/ISP/IAP，并说出 Bootloader 分区、跳转、校验，就很好。</p>`,
      core: `<p>ICP 用调试器烧，ISP 用芯片自带 Bootloader 经 UART/CAN/USB 烧，IAP 是用户程序自己收固件写 Flash；IAP 要分 Bootloader、APP、参数区并做校验回滚。</p>`,
      answer: `<p><b>三种编程方式：</b></p>
<ul>
<li><b>ICP（In-Circuit Programming）</b>：用 SWD/JTAG 调试器直接烧录，需要拆机或预留调试口，适合生产和研发。</li>
<li><b>ISP（In-System Programming）</b>：通过芯片内置的 Bootloader（如 STM32 的系统存储器）用 UART/CAN/USB 烧录，需要设置 BOOT 引脚进入 ISP 模式。</li>
<li><b>IAP（In-Application Programming）</b>：用户程序自己接收新固件并写入 Flash，不需要调试器，也不需要改 BOOT 引脚，是产品远程升级的基础。</li>
</ul>
<p><b>IAP 的实现：</b></p>
<ol>
<li>Flash 划分为 Bootloader 区、APP 区（可能还有备份区）、参数区；</li>
<li>Bootloader 启动后检查升级标志，决定跳转 APP 还是进入升级模式；</li>
<li>APP 通过串口/无线接收固件，校验后写入 APP 区或备份区；</li>
<li>写完后置升级标志、复位，Bootloader 校验新固件并跳转。</li>
</ol>
<p><b>关键点：</b>写入前必须擦除；写入过程中不能从同一 Flash 取指（部分型号）；要有完整性校验（CRC/签名）；要有回滚机制，避免升级失败变砖。</p>`,
        principle: `<p>IAP 的本质是把“烧录器做的事”交给运行中的程序：程序自己调用 Flash 编程接口，把新固件写到指定区域。因为 Flash 可以读写，CPU 也能执行编程算法，所以不需要外部工具。</p>
<p>Bootloader 是只读的“最后防线”，它不会被普通升级覆盖，保证设备总能进入升级或恢复流程。</p>`,
        fig: {
          type: "layers",
          title: "IAP 的 Flash 分区",
          tag: "iap",
          items: [
            { tag: "Bootloader", t: "启动、校验、跳转", d: "不参与普通升级，最后防线" },
            { tag: "APP", t: "当前运行固件", d: "可被新固件覆盖" },
            { tag: "备份区", t: "新固件暂存", d: "校验通过后再切换" },
            { tag: "参数区", t: "升级标志、版本、CRC", d: "掉电安全存储" }
          ]
        },
        code: {
          lang: "c",
          title: "iap_write.c",
          src: `#include "stm32f4xx_hal.h"

#define APP_ADDR   0x08008000u
#define APP_SECTOR FLASH_SECTOR_2

/* 接收一块数据并写入指定偏移 */
int iap_write_chunk(uint32_t offset, const uint8_t *buf, uint32_t len)
{
    /* 1. 地址必须按编程粒度对齐 */
    if ((offset & 0x3u) || (len & 0x3u)) return -1;

    HAL_FLASH_Unlock();

    for (uint32_t i = 0; i < len; i += 4u) {
        uint32_t word = *(const uint32_t *)(buf + i);
        if (HAL_FLASH_Program(FLASH_TYPEPROGRAM_WORD,
                              APP_ADDR + offset + i,
                              word) != HAL_OK) {
            HAL_FLASH_Lock();
            return -2;
        }
    }

    HAL_FLASH_Lock();
    return 0;
}

/* 升级完成后校验并置标志，由 Bootloader 决定是否跳转 */
int iap_finish(uint32_t app_size, uint32_t crc_expected)
{
    uint32_t crc = crc32_flash(APP_ADDR, app_size);
    if (crc != crc_expected) return -3;
    flag_set(FLAG_APP_VALID);
    NVIC_SystemReset();
    return 0;
}`
        },
        codeNote: "写入过程中如果掉电，必须能通过标志和 CRC 判断固件不完整，避免 Bootloader 跳转到半成品。",
        apply: `<p>我做过的产品用 4G 模组下载固件，APP 负责接收和写备份区，写完校验通过才置标志。Bootloader 启动时检查标志和 CRC，失败就留在 Bootloader 等待重传。</p>
<p>升级期间会关闭看门狗或延长超时，避免写 Flash 时间过长导致复位；同时记录升级进度，断点续传时从上次位置继续。</p>`,
        pitfalls: [
          "<b>没有 Bootloader 保护。</b>APP 升级失败后设备变砖。",
          "<b>不校验就跳转。</b>半成品固件运行，行为不可预期。",
          "<b>写入地址与链接地址不一致。</b>APP 跑飞。",
          "<b>升级时看门狗复位。</b>写入中断，固件损坏。"
        ],
        follow: [
          ["IAP 升级时中断还能响应吗？", "可以，但中断向量表仍指向旧 APP；升级逻辑通常放在 Bootloader 或独立的升级模式中，避免与业务中断冲突。"],
          ["如何实现断点续传？", "把固件分块，每块写入后记录已完成块号到参数区；重连后从下一个未完成块继续，最后统一校验整包。"]
        ]
      },

      {
        id: "S-18",
        chapter: "reliability",
        topic: "nvic",
        title: "NVIC 优先级怎么配置才不出问题？抢占优先级和子优先级有什么区别？",
        diff: "高级",
        freq: "高频",
        type: "配置分析题",
        point: "优先级数值越小越高；抢占优先级决定能否嵌套，子优先级只在同时挂起时决定顺序。",
        q: `<p>面试官：两个中断同时到来，谁先执行？为什么我配了不同的子优先级，却还是不能嵌套？</p>`,
        exam: `<p>考察 NVIC 优先级模型的细节。能说清“抢占决定嵌套、子优先级不嵌套”，以及优先级分组的影响，就很好。</p>`,
        core: `<p>Cortex-M 优先级数值越小越高，通常只实现高 4 位；抢占优先级决定能否嵌套，子优先级只在同抢占级同时挂起时排序，FreeRTOS 的 FromISR 中断不能高于 configMAX_SYSCALL_INTERRUPT_PRIORITY。</p>`,
        answer: `<p><b>基本规则：</b>优先级数值<b>越小</b>，优先级越高。Cortex-M 的优先级寄存器通常只实现高几位（如 4 位），低几位读回为 0。</p>
<p><b>抢占优先级 vs 子优先级：</b></p>
<ul>
<li><b>抢占优先级</b>决定能否打断正在执行的中断。高抢占优先级的中断可以嵌套进低抢占优先级的中断。</li>
<li><b>子优先级</b>只在<b>多个同抢占优先级的中断同时挂起</b>时决定谁先执行；它们之间<b>不能互相嵌套</b>。</li>
</ul>
<p>所以“配了不同子优先级却不能嵌套”是正常的——子优先级本来就不支持嵌套。</p>
<p><b>优先级分组：</b>通过 SCB-&gt;AIRCR 的 PRIGROUP 位，把有限的优先级位分配给抢占和子优先级。例如 4 位优先级、分组 2 表示 2 位抢占 + 2 位子优先级，抢占级别只有 4 档。</p>
<p><b>常见坑：</b></p>
<ul>
<li>分组设错，以为有 16 级抢占，实际只有 4 级；</li>
<li>FreeRTOS 要求所有调用 FromISR API 的中断优先级数值 ≥ configMAX_SYSCALL_INTERRUPT_PRIORITY，配错会导致断言失败或系统崩溃；</li>
<li>中断里调用耗时函数，阻塞低优先级中断；</li>
<li>优先级全设成一样，无法嵌套，实时性变差。</li>
</ul>`,
        principle: `<p>NVIC 在中断到来时比较抢占优先级：更高（数值更小）则抢占当前中断，否则挂起等待。子优先级只在同抢占级别内排序，不参与抢占判断。</p>
<p>优先级分组是为了在有限的位数里平衡“嵌套层数”和“同级别排序能力”，需要根据系统需求选择。</p>`,
        fig: {
          type: "table",
          title: "4 位优先级的常见分组",
          tag: "nvic",
          head: ["分组", "抢占位数", "子优先级位数", "抢占级数"],
          rows: [
            ["0", "0", "4", "1（不可嵌套）"],
            ["2", "2", "2", "4"],
            ["3", "3", "1", "8"],
            ["4", "4", "0", "16"]
          ]
        },
        code: {
          lang: "c",
          title: "nvic_config.c",
          src: `#include "stm32f4xx_hal.h"

void nvic_config(void)
{
    /* 1. 设置优先级分组：4 位全部用于抢占，共 16 级 */
    HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_4);

    /* 2. 数值越小优先级越高 */
    HAL_NVIC_SetPriority(USART1_IRQn, 5, 0);
    HAL_NVIC_EnableIRQ(USART1_IRQn);

    HAL_NVIC_SetPriority(TIM2_IRQn, 3, 0);   /* 比串口高，可抢占 */
    HAL_NVIC_EnableIRQ(TIM2_IRQn);

    /* 3. FreeRTOS 场景：确保 ISR 优先级不低于阈值 */
    /* HAL_NVIC_SetPriority(EXTI0_IRQn, configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY, 0); */
}`
        },
        codeNote: "修改优先级分组会影响所有中断的解释方式，通常在系统初始化时设置一次，运行中不要改。",
        apply: `<p>我的优先级规划原则：故障类（Fault、看门狗）最高；通信和实时控制次之；人机交互、日志最低。同一优先级内用子优先级排序，避免无谓嵌套。</p>
<p>用 FreeRTOS 时，我会把所有会调用 RTOS API 的中断优先级统一设在阈值以下（数值更大），不调用 API 的紧急中断可以设得更高，但绝不能调用 API。</p>`,
        pitfalls: [
          "<b>以为子优先级能嵌套。</b>子优先级只排序，不抢占。",
          "<b>优先级分组设置不一致。</b>不同模块各自设置，行为混乱。",
          "<b>FreeRTOS 中断优先级配错。</b>触发断言或内存破坏。",
          "<b>中断优先级全相同。</b>无法嵌套，高实时任务被拖慢。"
        ],
        follow: [
          ["为什么 Cortex-M 的优先级数值越小越高？", "这是 ARM 的设计约定，复位后所有优先级为 0（最高），便于系统启动；与某些其它架构相反，容易记错。"],
          ["中断里能调用 FreeRTOS 的普通 API 吗？", "不能，必须用 FromISR 版本；普通版本会进入临界区并可能阻塞，在中断上下文里行为未定义。"]
        ]
      },

      {
        id: "S-19",
        chapter: "timer",
        topic: "encoder",
        title: "定时器的编码器接口怎么用？主从模式能做什么？",
        diff: "高级",
        freq: "中频",
        type: "配置分析题",
        point: "编码器接口用两路正交信号自动计数，主从模式让定时器之间联动触发。",
        q: `<p>面试官：电机上的增量式编码器怎么接 MCU？一定要用外部中断吗？定时器的主从模式又是什么？</p>`,
        exam: `<p>考察定时器高级功能。能说出“编码器模式硬件解码正交信号、4 倍频”，以及主从模式用于同步触发，就很好。</p>`,
        core: `<p>编码器模式用 CH1/CH2 接 A/B 相，硬件自动加减计数和判方向，不占 CPU；主从模式用一个定时器事件触发另一个定时器、ADC 或 DAC，时序由硬件保证。</p>`,
        answer: `<p><b>编码器接口模式：</b>定时器的 CH1 和 CH2 接编码器的 A、B 两相，硬件根据两相的相位关系自动加/减计数，不需要 CPU 干预。相比外部中断，优点是：</p>
<ul>
<li>不占用 CPU，高速旋转也不丢脉冲；</li>
<li>硬件自动判断方向；</li>
<li>可以配置为 2 倍频或 4 倍频（在 A、B 的上升沿和下降沿都计数）。</li>
</ul>
<p>读取 <code>TIMx-&gt;CNT</code> 就是位置，定期采样做差分就是速度。注意计数器会溢出/下溢，计算速度时要处理回绕。</p>
<p><b>主从模式（Master/Slave）：</b>一个定时器（主）的事件可以触发另一个定时器（从）的动作，常见组合：</p>
<ul>
<li>主定时器更新事件触发从定时器启动 → 多个定时器同步；</li>
<li>主定时器触发 ADC 转换 → 在 PWM 固定相位采样电流；</li>
<li>主定时器触发 DAC、DMA → 精确时序波形。</li>
</ul>
<p>这样多个外设的时序由硬件保证，不受软件延迟和中断抖动影响。</p>`,
        principle: `<p>正交编码器的 A、B 两相相差 90°，硬件通过比较两相电平的先后判断方向，并在边沿计数。四倍频利用 A、B 的上升沿和下降沿，把分辨率提高 4 倍。</p>
<p>主从模式通过内部触发线（ITR）连接定时器，主定时器的更新、比较匹配等事件可以直接启动、停止或复位从定时器，形成硬件同步链。</p>`,
        fig: {
          type: "table",
          title: "编码器模式的计数倍频",
          tag: "encoder",
          head: ["模式", "计数边沿", "分辨率", "适用"],
          rows: [
            ["2 倍频", "只对一相（如 A 相）的双边沿计数", "中等", "一般测速"],
            ["4 倍频", "A、B 两相的双边沿都计数", "最高", "高精度定位"]
          ]
        },
        code: {
          lang: "c",
          title: "encoder_init.c",
          src: `#include "stm32f4xx_hal.h"

TIM_HandleTypeDef htim3;
TIM_Encoder_InitTypeDef enc = {0};

void encoder_init(void)
{
    /* 1. 时钟与引脚：CH1 = PA6, CH2 = PA7，复用为 TIM3 */
    __HAL_RCC_TIM3_CLK_ENABLE();
    __HAL_RCC_GPIOA_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Pin       = GPIO_PIN_6 | GPIO_PIN_7;
    g.Mode      = GPIO_MODE_AF_PP;
    g.Pull      = GPIO_PULLUP;
    g.Speed     = GPIO_SPEED_FREQ_HIGH;
    g.Alternate = GPIO_AF2_TIM3;
    HAL_GPIO_Init(GPIOA, &g);

    /* 2. 时基与编码器接口 */
    htim3.Instance           = TIM3;
    htim3.Init.Prescaler     = 0;
    htim3.Init.CounterMode   = TIM_COUNTERMODE_UP;
    htim3.Init.Period        = 0xFFFF;
    htim3.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;

    enc.EncoderMode  = TIM_ENCODERMODE_TI12;   /* 4 倍频 */
    enc.IC1Polarity  = TIM_ICPOLARITY_RISING;
    enc.IC1Selection = TIM_ICSELECTION_DIRECTTI;
    enc.IC1Prescaler = TIM_ICPSC_DIV1;
    enc.IC1Filter    = 6;                       /* 滤波，抗抖动 */

    enc.IC2Polarity  = TIM_ICPOLARITY_RISING;
    enc.IC2Selection = TIM_ICSELECTION_DIRECTTI;
    enc.IC2Prescaler = TIM_ICPSC_DIV1;
    enc.IC2Filter    = 6;

    HAL_TIM_Encoder_Init(&htim3, &enc);
    HAL_TIM_Encoder_Start(&htim3, TIM_CHANNEL_ALL);
}

/* 读取位置，注意计数器是 16 位，会回绕 */
int32_t encoder_position(void)
{
    return (int16_t)TIM3->CNT;
}`
        },
        codeNote: "输入滤波器要按编码器最高频率和噪声情况调整，滤波太强会丢失高速脉冲。",
        apply: `<p>做云台电机控制时，我用 TIM3 的编码器模式读位置，TIM2 产生 PWM，主从触发保证采样与 PWM 同步。位置环在 1kHz 中断里计算，速度用位置差分加低通滤波。</p>
<p>长距离传输的编码器信号建议用差分（RS422）或加 RC 滤波，否则电机干扰会导致计数错误。</p>`,
        pitfalls: [
          "<b>用外部中断读编码器。</b>高速时丢脉冲，CPU 占用高。",
          "<b>忘记处理计数器回绕。</b>位置从 65535 跳到 0，速度计算出尖峰。",
          "<b>滤波配置过强。</b>高速脉冲被滤掉，计数偏少。",
          "<b>主从触发配置错误。</b>定时器不同步，采样点漂移。"
        ],
        follow: [
          ["增量式编码器和绝对式编码器有什么区别？", "增量式输出相对脉冲，断电后位置丢失，需要回零；绝对式每个位置有唯一编码，断电后仍能读出绝对位置。"],
          ["如何用编码器计算速度？", "固定周期采样位置差，除以周期得到速度；低速时脉冲少、量化误差大，可用测周法（测两个脉冲之间的时间）提高精度。"]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第三批：最小系统） ---------------- */
  EIK.extend("stm32-gd32", {
    chapters: [
      {
        id: "chip",
        topics: [
          { id: "minimal", title: "最小系统与外围" }
        ]
      }
    ],
    questions: [
      {
        id: "S-20",
        chapter: "chip",
        topic: "minimal",
        title: "只给一颗 STM32，要让它跑起来最少需要接哪些外围？",
        diff: "初级",
        freq: "高频",
        type: "工程设计题",
        point: "电源去耦、复位、时钟、启动配置、调试口这五组必需外围，以及每一组的取值依据。",
        q: `<p>面试官：拿到一颗空片 STM32，PCB 上除了芯片最少还要放什么它才能正常跑？</p>`,
        exam: `<p>考察是否真的画过板子。能按“电源—复位—时钟—启动—调试”五组说全，并讲出取值理由，就很扎实。</p>`,
        core: `<p>最小系统要有每路 VDD 的 100nF 去耦、VDDA 磁珠加电容、NRST 10k 上拉加 100nF、HSE 晶振和负载电容、BOOT0 下拉、SWD 引出；未用 GPIO 不要悬空。</p>`,
        answer: `<p><b>五组必需外围：</b></p>
<ul>
<li><b>电源与去耦</b>：每个 VDD 引脚就近放一个 100nF，整板再放 1~2 个 10µF 储能。VDDA 单独用磁珠或小电感从 VDD 隔离，配 100nF + 1µF。F4/H7 这类带内核稳压的型号，VCAP 引脚还要各接 2.2µF 到地。这几颗电容不是可选项，缺了会表现为随机死机、ADC 抖动、复位异常。</li>
<li><b>复位</b>：NRST 通过 10k 上拉到 VDD，并联 100nF 到地做滤波；需要手动复位就再加一个按键对地。NRST 内部有弱上拉，但外部 10k 更稳，也便于加电容。</li>
<li><b>时钟</b>：HSE 8MHz 晶振 + 两颗负载电容（按晶振的 CL 算，常见 10~22pF），1M 反馈电阻多数型号已内置。只有要用 RTC 才需要 32.768kHz 的 LSE。也可以不用外部晶振，直接吃内部的 HSI，省两个器件但精度差（±1% 以上），串口高波特率和 RTC 会受影响。</li>
<li><b>启动配置</b>：BOOT0 通过 10k 下拉到地（从主 Flash 启动）。如果要做串口下载或 IAP，要留出把它拉高的手段（跳线帽或按键）。</li>
<li><b>调试口</b>：SWDIO 和 SWCLK 引到排针，共地。SWDIO 内部有上拉，但走线长或干扰大时外部再并 10k 更保险。SWO 可选，用于 printf 输出。</li>
</ul>
<p><b>还有两条容易漏：</b>未使用的 GPIO 不要悬空，配成内部上下拉或输出固定电平，悬空输入会因漏电和噪声抬高功耗；VDDA 不能晚于 VDD 上电，否则可能出现上电复位异常。</p>`,
        principle: `<p>“最小系统”的定义是：让芯片能稳定上电、有时钟、能启动、能被调试的最小器件集合。它不包括任何应用外设，所以判断标准很清晰——去掉某个器件后芯片还能不能可靠运行。去耦电容和晶振负载电容就是典型的“去掉也能跑，但会偶发故障”，因此最容易被新手省掉。</p>
<p>去耦电容的作用是给瞬态电流提供本地储能、缩短回流路径。容值小（100nF）响应快但储能少，容值大（10µF）储能多但等效电感大、高频响应差，所以是搭配使用而不是替代。这也是为什么“每个电源脚一个 100nF”不能用一个 10µF 顶替。</p>`,
        fig: {
          type: "table",
          title: "最小系统外围清单",
          tag: "stm32-min",
          head: ["类别", "器件", "典型取值", "缺失后果"],
          rows: [
            ["电源去耦", "陶瓷电容", "每脚 100nF + 全局 10µF", "随机死机、ADC 抖动"],
            ["模拟电源", "磁珠 + 电容", "100nF + 1µF", "ADC 精度差、参考不稳"],
            ["复位", "电阻 + 电容", "10k 上拉 + 100nF", "上电不复位或误复位"],
            ["主时钟", "晶振 + 2 电容", "8MHz + 10~22pF", "起振慢或不振，退回 HSI"],
            ["启动配置", "下拉电阻", "BOOT0 10k 到地", "从错误区域启动，不运行"],
            ["调试口", "排针", "SWDIO / SWCLK / GND", "无法下载和调试"]
          ]
        },
        apply: `<p>做过一块小批量板子，样机阶段一切正常，量产后有 3% 的板子偶发死机。查了两周，最后发现是 VDDA 的去耦电容被贴片厂贴错成了 100pF（少了一个数量级），ADC 参考电压在采样瞬间跌落，触发了内部异常。这类问题在实验室几乎复现不出来。</p>
<p>另一个经验：调试口一定要引出来，哪怕是最终产品。我们有一批板子为了省空间只留了测试点，产线返修时只能飞线，效率极低。</p>`,
        pitfalls: [
          "<b>用一个 10µF 替代所有 100nF。</b>高频响应差，瞬态电流供不上，去耦等于没做。",
          "<b>省掉晶振负载电容或取值随手填。</b>起振裕度不足，低温或批次差异下不起振。",
          "<b>BOOT0 悬空。</b>上电时电平不确定，可能进不了主 Flash 启动，表现为“程序没跑”。",
          "<b>VDDA 直接从 VDD 拉一根线。</b>数字噪声串进模拟部分，ADC 有效位数明显下降。"
        ],
        follow: [
          ["不用外部晶振行不行？", "行，用内部 HSI。代价是精度差（出厂 ±1%，全温区更差），串口高波特率可能误码，RTC 走时不准。成本敏感且对时基要求不高的场合可以省。"],
          ["SWD 和 JTAG 有什么区别？", "SWD 只要两根线（SWDIO、SWCLK），速率够用、占用引脚少，是现在的主流；JTAG 要四到五根线，支持边界扫描，多用于产线测试和复杂调试。"],
          ["为什么复位脚要并一个电容？", "滤掉短促的干扰毛刺，避免误复位；同时给上电过程一个确定的复位保持时间。容值不能太大，否则复位释放太慢，调试器可能连不上。"]
        ]
      }
    ]
  });
})();
