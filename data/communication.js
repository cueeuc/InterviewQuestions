/* ============================================================
   07 嵌入式通信技术
   ============================================================ */
(function () {
  "use strict";

  EIK.register("communication", {
    chapters: [
      {
        id: "wired",
        title: "有线通信",
        topics: [
          { id: "uart", title: "UART / USART" },
          { id: "i2c", title: "I2C 总线" },
          { id: "spi", title: "SPI 总线" },
          { id: "can", title: "CAN / RS485" }
        ]
      },
      {
        id: "wireless",
        title: "无线与网络",
        topics: [
          { id: "ble", title: "蓝牙与 Wi-Fi" },
          { id: "net", title: "TCP/IP 与 MQTT" }
        ]
      },
      {
        id: "protocol",
        title: "通信协议设计",
        topics: [
          { id: "frame", title: "帧结构与校验" },
          { id: "parse", title: "粘包拆包与状态机" }
        ]
      }
    ],

    questions: [
      {
        id: "M-01",
        chapter: "wired",
        topic: "uart",
        title: "UART 的帧格式是怎样的？波特率误差多大就不能通信？",
        diff: "初级",
        freq: "高频",
        type: "基础概念题",
        point: "起始位/数据位/校验位/停止位、异步采样机制，以及波特率误差的容限。",
        q: `<p>面试官：<strong>UART 的一帧数据</strong>由哪些部分组成？它是怎么做到不需要时钟线也能正确采样的？波特率误差多大就会出错？</p>`,
        exam: `<p>考察异步通信的基本原理。能说清“起始位同步 + 中点采样”“16 倍过采样”“误差累积导致最后一个数据位采错”，就理解了为什么长帧对波特率精度要求更高。</p>`,
        core: `<p>一帧是 1 个起始位（低）、5~9 个数据位（常见 8 位、低位先发）、可选校验位、1~2 个停止位（高），空闲保持高电平。没有时钟线，靠起始位下降沿同步，接收方用 16 倍波特率过采样，在第 8/9/10 个采样点做多数表决。</p><p>一帧 10 位，误差累积到半个位时间最后一位就会采错；理论总误差要小于 5%，工程上控制在 2% 以内，长帧和高波特率要求更严。</p>`,
        answer: `<p>UART 一帧包括：1 个起始位（低电平）、5~9 个数据位（通常是 8 位，低位先发）、可选的校验位（奇/偶/无）、1~2 个停止位（高电平）。空闲时线路保持高电平。</p>
<p>它不需要时钟线，靠<strong>起始位的下降沿</strong>同步：接收方检测到下降沿后，延时半个位时间到起始位中点确认，然后每隔一个位时间采样一次，正好都落在每一位的中点，容错最大。</p>
<p>为了更精确，接收方通常用 16 倍波特率的时钟过采样，检测到下降沿后计数，在第 8、9、10 个采样点做多数表决，确认是真正的起始位而不是噪声。</p>
<p>误差方面，一帧 10 位（1 起始 + 8 数据 + 1 停止），如果收发双方波特率偏差累积到半个位时间，最后一位就会采错。理论上总误差要小于 5%，工程上建议控制在 2% 以内，长帧或高波特率要求更严。</p>`,
        principle: `<p>误差是<strong>累积</strong>的：起始位对齐后，每经过一位就多累积一点偏差，到第 10 位时偏差是单位偏差的 10 倍。所以帧越长、波特率越高，对时钟精度要求越高。</p>
<p>STM32 的波特率由 <code>USARTDIV = fCK / (16 × baud)</code> 计算，结果是小数，硬件用 BRR 寄存器的整数部分和小数部分近似，所以实际波特率会有舍入误差。用外部晶振（ppm 级）比内部 RC（±1%~2%）可靠得多。</p>`,
        fig: {
          type: "bits",
          title: "8N1 帧格式（无校验）",
          tag: "frame",
          cells: [
            { v: "0", n: "起始位" },
            { v: "D0", n: "数据位 0" },
            { v: "D1", n: "数据位 1" },
            { v: "…", n: "…" },
            { v: "D7", n: "数据位 7" },
            { v: "1", n: "停止位" }
          ],
          note: "数据位低位先发（LSB first），空闲时线路为高电平。"
        },
        code: {
          lang: "c",
          title: "uart_init.c",
          src: `#include "stm32f1xx_hal.h"

/* 115200-8-N-1，PCLK2 = 72MHz */
void uart1_init(uint32_t baud)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();

    /* PA9 = TX（复用推挽），PA10 = RX（浮空或上拉输入） */
    GPIO_InitTypeDef g = {0};
    g.Pin   = GPIO_PIN_9;
    g.Mode  = GPIO_MODE_AF_PP;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    g.Pin  = GPIO_PIN_10;
    g.Mode = GPIO_MODE_INPUT;
    g.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(GPIOA, &g);

    huart1.Instance          = USART1;
    huart1.Init.BaudRate     = baud;
    huart1.Init.WordLength   = UART_WORDLENGTH_8B;
    huart1.Init.StopBits     = UART_STOPBITS_1;
    huart1.Init.Parity       = UART_PARITY_NONE;
    huart1.Init.Mode         = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl    = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;
    HAL_UART_Init(&huart1);
}

/* 计算波特率误差：实际 BRR 是整数 + 小数，必然有舍入 */
int uart_baud_error_ppm(uint32_t pclk, uint32_t baud)
{
    uint32_t div  = (pclk + baud / 2) / baud;      /* USARTDIV × 16 取整 */
    uint32_t real = pclk / div;                    /* 实际波特率 */
    int32_t  err  = (int32_t)(real - baud) * 1000000 / (int32_t)baud;
    return (int)err;                               /* 单位 ppm */
}`
        },
        apply: `<p>实际调试串口时，“乱码”几乎总能归到四类原因：波特率不匹配（最常见）、时钟配置错误（以为 72MHz 实际 8MHz）、TX/RX 接反、共地没接。用示波器测一位的宽度就能快速算出实际波特率。</p>
<p>长距离或干扰环境下，TTL 电平的 UART 很容易受干扰，应该转成 RS485 差分传输，或者加光耦隔离。</p>`,
        pitfalls: [
          "<b>以为波特率可以随便设。</b>双方必须一致，且总误差要小于 5%（约 4.5% 就会在末位采错），工程上应控制在 2% 以内。",
          "<b>忽略时钟源精度。</b>用内部 RC 做 UART 时钟，温漂后波特率偏移，表现为“冬天能用夏天乱码”。",
          "<b>忘记共地。</b>只接 TX/RX 不接 GND，参考电平不同，收到的全是乱码。"
        ],
        follow: [
          [
            "为什么数据位是低位先发？",
            "这是历史沿革（早期电传打字机按此顺序），并成为标准。收发双方都遵守即可，不影响功能，但用示波器解码时要注意顺序。"
          ],
          [
            "校验位能纠错吗？",
            "只能检错不能纠错。奇偶校验能发现奇数个位错误，但偶数个位错误检测不到。可靠性要求高的场景要用 CRC 或重传机制。"
          ],
          [
            "UART 和 USART 有什么区别？",
            "UART 是通用异步收发，只支持异步；USART 是通用同步/异步收发，额外支持同步模式和时钟输出（如智能卡、LIN）。多数场合用异步模式，两者用法一样。"
          ]
        ]
      },

      {
        id: "M-02",
        chapter: "wired",
        topic: "uart",
        title: "串口如何接收不定长数据？IDLE 中断 + DMA 怎么做？",
        diff: "中级",
        freq: "高频",
        type: "工程应用题",
        point: "逐字节中断的缺陷、IDLE 空闲中断原理，以及 DMA 剩余计数反推长度。",
        q: `<p>面试官：串口要接收<strong>不定长数据帧</strong>，你怎么做？为什么不用“每收一个字节进一次中断”？IDLE 中断是什么原理？</p>`,
        exam: `<p>这是嵌入式通信的最高频工程题。能说清“逐字节中断开销大、容易丢数据”“IDLE 是总线空闲一个字节时间后触发”“用 DMA 剩余计数算长度”，基本就是标准答案；再补一句“半包和粘包还要靠协议解析”，就更完整。</p>`,
        core: `<p>思路是 DMA 在后台把数据搬进缓冲区，不逐字节进中断；总线空闲超过一个字节时间时 IDLE 标志置位并触发中断，此时读 DMA 的剩余计数 <code>NDTR</code>，用“缓冲区长度 - 剩余”就是这一帧的字节数。</p><p>IDLE 的本质是接收移位寄存器空了且线路保持高电平超过一帧时间，正好对应帧边界。处理完要重新配置 DMA 或清零计数，否则下一次接收会接着上次的位置。</p>`,
        answer: `<p>不定长数据的难点是“不知道什么时候收完”。有两种常见方案。</p>
<p>第一种是逐字节中断 + 超时：每个字节进一次中断存入缓冲区，同时启动一个定时器，超过 3~5 个字节时间没有新数据就认为一帧结束。缺点是中断频繁，高波特率下 CPU 开销大，容易丢字节。</p>
<p>第二种是 <strong>DMA + IDLE 中断</strong>：DMA 在后台把数据搬进缓冲区，CPU 完全不参与；当总线空闲超过一个字节时间时，USART 的 IDLE 标志置位并触发中断，此时读 DMA 的剩余传输计数（NDTR），用“总长度 - 剩余”就是这一帧的字节数。</p>
<p>IDLE 的本质是“接收移位寄存器空了且线路保持高电平超过一个帧时间”，它标志着一帧数据传输的自然结束，正好对应我们想要的“帧边界”。</p>
<p>处理完要把 DMA 重新配置（或清零计数），否则下一次接收会接着上次的位置。</p>`,
        principle: `<p>DMA 的 NDTR 寄存器记录“还剩多少个数据要传”，每传一个减一。缓冲区长度设为最大帧长，接收过程中 NDTR 不断减小，IDLE 触发时读它就能算出实际收到了多少。</p>
<p>IDLE 标志的清除有顺序要求：先读 SR 再读 DR，或者用 HAL 的宏。清除不当会导致中断反复触发或下一次收不到。</p>`,
        fig: {
          type: "flow",
          title: "DMA + IDLE 接收流程",
          tag: "sequence",
          items: [
            { t: "启动 DMA", d: "缓冲区 + 长度" },
            { t: "字节到达", d: "DMA 自动搬运" },
            { t: "总线空闲", d: "IDLE 置位" },
            { t: "算长度", d: "总长 - NDTR" },
            { t: "交给解析", d: "重启 DMA" }
          ]
        },
        code: {
          lang: "c",
          title: "uart_idle_dma.c",
          src: `#include "stm32f1xx_hal.h"

#define RX_BUF_SIZE 256

static uint8_t  s_rx_buf[RX_BUF_SIZE];
static uint16_t s_rx_len;
static volatile uint8_t s_frame_ready;

void uart_dma_idle_init(void)
{
    /* DMA1 通道 5 → USART1_RX，循环模式不适合不定长，用普通模式 */
    __HAL_RCC_DMA1_CLK_ENABLE();

    hdma_usart1_rx.Instance                 = DMA1_Channel5;
    hdma_usart1_rx.Init.Direction           = DMA_PERIPH_TO_MEMORY;
    hdma_usart1_rx.Init.PeriphInc           = DMA_PINC_DISABLE;
    hdma_usart1_rx.Init.MemInc              = DMA_MINC_ENABLE;
    hdma_usart1_rx.Init.PeriphDataAlignment = DMA_PDATAALIGN_BYTE;
    hdma_usart1_rx.Init.MemDataAlignment    = DMA_MDATAALIGN_BYTE;
    hdma_usart1_rx.Init.Mode                = DMA_NORMAL;
    hdma_usart1_rx.Init.Priority            = DMA_PRIORITY_HIGH;
    HAL_DMA_Init(&hdma_usart1_rx);
    __HAL_LINKDMA(&huart1, hdmarx, hdma_usart1_rx);

    /* 开启 IDLE 中断 */
    __HAL_UART_ENABLE_IT(&huart1, UART_IT_IDLE);

    HAL_UART_Receive_DMA(&huart1, s_rx_buf, RX_BUF_SIZE);
}

/* USART1 中断：只在 IDLE 时进来一次，而不是每字节一次 */
void USART1_IRQHandler(void)
{
    if (__HAL_UART_GET_FLAG(&huart1, UART_FLAG_IDLE)) {
        __HAL_UART_CLEAR_IDLEFLAG(&huart1);        /* 先清标志 */

        /* 剩余计数 → 已接收长度 */
        uint16_t remain = __HAL_DMA_GET_COUNTER(&hdma_usart1_rx);
        s_rx_len = (uint16_t)(RX_BUF_SIZE - remain);

        /* 先停 DMA，锁住本帧数据，等任务解析完再重启，避免被下一帧覆盖 */
        HAL_UART_DMAStop(&huart1);

        if (s_rx_len > 0) {
            s_frame_ready = 1;                     /* 交给任务处理 */
        }
    }
}

/* 任务里处理完整帧 */
void uart_task(void)
{
    if (!s_frame_ready) return;
    s_frame_ready = 0;

    Protocol_Parse(s_rx_buf, s_rx_len);            /* 可能包含半包/粘包 */

    /* 解析完再重启 DMA，准备下一帧 */
    HAL_UART_Receive_DMA(&huart1, s_rx_buf, RX_BUF_SIZE);
}`
        },
        apply: `<p>IDLE 只能标记“总线空闲”，不能保证一帧完整。如果两帧之间间隔太短，会被当成一帧（粘包）；如果一帧中间有停顿，会被拆成两帧（半包）。所以最终还是要靠协议层：帧头 + 长度 + 校验，用状态机解析。</p>
<p>缓冲区大小要按最大帧长设置，并且留出余量，否则超长帧会覆盖。可以加“接收溢出”检测：如果 NDTR 减到 0，说明缓冲区满了但还没等到 IDLE。</p>`,
        pitfalls: [
          "<b>IDLE 标志清除顺序错误。</b>某些系列要求先读 SR 再读 DR，用错方法会导致标志清不掉，中断反复触发。",
          "<b>忘记重启 DMA。</b>第一帧正常，之后再也收不到数据，因为 DMA 已经传完了。",
          "<b>把 IDLE 当成帧结束。</b>两帧连发时会被合并，必须靠协议层的长度字段和 CRC 判断真正的帧边界。"
        ],
        follow: [
          [
            "循环模式和普通模式怎么选？",
            "循环模式下 DMA 传满自动回到起点，适合连续数据流（ADC 采样）；不定长帧接收用普通模式，每帧结束后重启，避免旧数据残留。"
          ],
          [
            "如何检测接收溢出？",
            "检查 DMA 的 NDTR 是否减到 0，或者看 USART 的 ORE（溢出）标志。溢出说明缓冲区不够大或处理太慢，需要增大缓冲或提高处理优先级。"
          ],
          [
            "高波特率下还有什么方案？",
            "用 DMA 双缓冲（乒乓），一半填满时处理另一半，做到零拷贝；或者用串口空闲 + 定时器超时双重判断，兼顾实时性和完整性。"
          ]
        ]
      },

      {
        id: "M-03",
        chapter: "wired",
        topic: "i2c",
        title: "I2C 的时序是怎样的？通信失败常见原因有哪些？",
        diff: "中级",
        freq: "高频",
        type: "故障排查题",
        point: "起始/停止条件、应答机制、时钟拉伸，以及总线死锁的排查与恢复。",
        q: `<p>面试官：画一下 <strong>I2C 的时序</strong>。起始条件和停止条件怎么定义？如果 SDA 一直被拉低、总线“卡死”，你怎么恢复？</p>`,
        exam: `<p>I2C 是面试必问，也是实际最容易出问题的总线。能说清“SCL 高时 SDA 下降沿是起始”“从机通过拉低 SCL 做时钟拉伸”“总线卡死要发 9 个时钟”就非常扎实。</p>`,
        core: `<p>两根开漏线 SCL/SDA，外接上拉，空闲都是高。起始是 SCL 高时 SDA 由高变低；停止是 SCL 高时 SDA 由低变高。数据在 SCL 低电平期间改变、高电平期间稳定，接收方在高电平中间采样。每 8 位后第 9 个时钟拉低 SDA 为 ACK，主机读最后一个字节要回 NACK。</p><p>常见失败：地址错、上拉不当、总线电容过大、从机没接好、时序太快。卡死最常见是主机中途复位、从机一直拉低 SDA 等时钟；恢复是把 SCL 当 GPIO 手动发最多 9 个脉冲让从机释放 SDA，再发停止条件。</p>`,
        answer: `<p>I2C 只有两根线：SCL 时钟和 SDA 数据，都是开漏输出，需要外部上拉电阻。空闲时两根线都是高电平。</p>
<p>起始条件：SCL 为高时，SDA 由高变低。停止条件：SCL 为高时，SDA 由低变高。数据在 SCL 低电平期间改变，在 SCL 高电平期间保持稳定，接收方在高电平中间采样。</p>
<p>每传输 8 位数据后，接收方要在第 9 个时钟把 SDA 拉低表示应答（ACK），不拉低就是非应答（NACK）。主机读数据时，最后一个字节要回 NACK 告诉从机“不用再发了”。</p>
<p>总线卡死最常见的原因是：主机复位时从机正处在传输中，一直把 SDA 拉低等待时钟。恢复办法是主机把 SCL 当普通 GPIO，手动发送最多 9 个时钟脉冲，让从机把剩余位发完并释放 SDA，然后发一个停止条件。</p>`,
        principle: `<p>I2C 是“线与”总线：任何设备拉低都是低电平，只有全部释放才是高。这也是它必须用开漏的原因——如果用推挽，一个输出高一个输出低就会短路。</p>
<p>时钟拉伸（clock stretching）是从机的流控机制：从机来不及处理时把 SCL 拉低，主机检测到 SCL 没变高就等待。软件模拟 I2C 时如果没检查 SCL 是否真的变高，就会在从机忙时读错数据。</p>`,
        fig: {
          type: "table",
          title: "I2C 常见故障与排查",
          tag: "troubleshooting",
          head: ["现象", "可能原因", "排查方法"],
          rows: [
            ["完全无应答", "上拉缺失、地址错、器件没供电", "量上拉电压、扫地址、查电源"],
            ["偶发 NACK", "总线电容大、上拉太大、速率过高", "降速、减小上拉、看波形边沿"],
            ["SDA 一直低", "从机卡在传输中、总线死锁", "发 9 个时钟 + 停止条件"],
            ["读到的数据全 0xFF", "从机未响应、地址错位", "示波器看 ACK 位"],
            ["多设备冲突", "地址重复、上拉不足", "逐个断开、扫地址"]
          ]
        },
        code: {
          lang: "c",
          title: "i2c_recover.c",
          src: `/* I2C 总线死锁恢复：把 SCL/SDA 临时切成 GPIO，手动发时钟 */
void i2c_bus_recover(void)
{
    /* 1. 关闭 I2C 外设，释放引脚 */
    HAL_I2C_DeInit(&hi2c1);

    /* 2. 配置为开漏输出 */
    GPIO_InitTypeDef g = {0};
    g.Pin   = SCL_PIN | SDA_PIN;
    g.Mode  = GPIO_MODE_OUTPUT_OD;
    g.Pull  = GPIO_PULLUP;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(I2C_PORT, &g);

    HAL_GPIO_WritePin(I2C_PORT, SDA_PIN, GPIO_PIN_SET);

    /* 3. 发最多 9 个时钟，让从机把剩余数据位发完 */
    for (int i = 0; i < 9; i++) {
        HAL_GPIO_WritePin(I2C_PORT, SCL_PIN, GPIO_PIN_RESET);
        DelayUs(5);
        HAL_GPIO_WritePin(I2C_PORT, SCL_PIN, GPIO_PIN_SET);
        DelayUs(5);

        if (HAL_GPIO_ReadPin(I2C_PORT, SDA_PIN) == GPIO_PIN_SET) {
            break;                     /* SDA 已释放 */
        }
    }

    /* 4. 补一个停止条件：SCL 高时 SDA 由低变高 */
    HAL_GPIO_WritePin(I2C_PORT, SCL_PIN, GPIO_PIN_RESET);
    HAL_GPIO_WritePin(I2C_PORT, SDA_PIN, GPIO_PIN_RESET);
    DelayUs(5);
    HAL_GPIO_WritePin(I2C_PORT, SCL_PIN, GPIO_PIN_SET);
    DelayUs(5);
    HAL_GPIO_WritePin(I2C_PORT, SDA_PIN, GPIO_PIN_SET);
    DelayUs(5);

    /* 5. 重新初始化 I2C 外设 */
    MX_I2C1_Init();
}

/* 扫描总线上所有地址，用于确认从机是否在线 */
void i2c_scan(void)
{
    for (uint8_t addr = 0x08; addr < 0x78; addr++) {
        if (HAL_I2C_IsDeviceReady(&hi2c1, (uint16_t)(addr << 1), 2, 10) == HAL_OK) {
            printf("found device at 0x%02X\\n", addr);
        }
    }
}`
        },
        apply: `<p>硬件上，I2C 上拉一般取 4.7kΩ（100kHz）或 2.2kΩ（400kHz），总线电容不能超过 400pF。走线要短，远离 PWM 和电机线，否则干扰会导致偶发 NACK。</p>
<p>多主系统中还要处理仲裁：两个主机同时发数据时，谁先输出高电平谁就退出。这是硬件自动完成的，但要求两个主机都严格遵循时序。</p>`,
        pitfalls: [
          "<b>把 7 位地址左移一位当写地址。</b>HAL 库要求传 8 位格式（地址 &lt;&lt; 1），很多人直接传 7 位地址导致 NACK。",
          "<b>软件模拟 I2C 不检查时钟拉伸。</b>从机拉低 SCL 时主机继续发数据，数据就错了。",
          "<b>上拉电阻太大或太小。</b>太大上升沿慢，高速时读错；太小功耗高，且灌电流可能超过器件能力。"
        ],
        follow: [
          [
            "I2C 的速率有哪些档位？",
            "标准模式 100kHz、快速模式 400kHz、快速模式+ 1MHz、高速模式 3.4MHz。多数传感器支持 400kHz，EEPROM 常见 400kHz。"
          ],
          [
            "为什么 I2C 要 repeated start？",
            "读寄存器时需要先写寄存器地址再读数据，中间不能插入停止条件（否则从机会释放总线）。repeated start 在不释放总线的情况下重新开始一次传输。"
          ],
          [
            "I2C 和 SMBus 有什么区别？",
            "SMBus 基于 I2C，但增加了超时机制、固定的电压和速率范围、以及 PEC 校验。SMBus 设备通常兼容 I2C，但反过来不一定。"
          ]
        ]
      },

      {
        id: "M-04",
        chapter: "wired",
        topic: "i2c",
        title: "I2C 和 SPI 有什么区别？项目里怎么选？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "线数、速率、多设备寻址方式、可靠性与引脚成本。",
        q: `<p>面试官：<strong>I2C 和 SPI</strong> 有什么区别？各自适合什么场景？如果板上有 8 个传感器，你会怎么选？</p>`,
        exam: `<p>考察总线选型的工程判断。能说清“I2C 两线寻址、SPI 四线片选”“SPI 全双工高速、I2C 半双工低速”“设备多时 I2C 省引脚但地址可能冲突”，说明你做过系统级设计。</p>`,
        core: `<p>I2C 两根线、7 位地址、支持多主多从、半双工，速率一般 100k~400kHz，最高几 MHz；SPI 四根线（SCK/MOSI/MISO/CS），每个从机一根片选、没有地址、全双工，速率可到几十 MHz。</p><p>选择：引脚紧、设备多、速率不高（传感器、EEPROM）用 I2C；要高速（LCD、SD 卡、高速 ADC）或全双工用 SPI。8 个传感器优先 I2C，但要先确认地址不冲突；冲突或要高速就分组总线或改 SPI。</p>`,
        answer: `<p>I2C 用两根线（SCL、SDA），通过 7 位地址寻址，支持多主多从，所有设备并联在总线上。速率通常 100k~400kHz，最高几 MHz。它是半双工，同一时刻只能一个方向传输。</p>
<p>SPI 用四根线（SCK、MOSI、MISO、CS），每个从机需要独立的片选，没有地址概念。它是全双工，速率可以到几十 MHz，适合高速数据传输（屏幕、Flash、ADC）。</p>
<p>选型上看三点：如果引脚紧张、设备多、速率要求不高（传感器、EEPROM），用 I2C；如果要求高速（LCD、SD 卡、高速 ADC）或者需要全双工，用 SPI；如果设备多到片选不够，可以用 SPI + 译码器，或者 I2C + 多路复用器。</p>
<p>8 个传感器的话，优先 I2C：只需两根线，但要先确认地址不冲突（很多传感器可以通过地址引脚改地址）。如果地址冲突或需要高速采样，就分组用多个 I2C 总线，或者改用 SPI。</p>`,
        principle: `<p>I2C 的开销主要在协议层：每个字节后有 ACK 位，还有地址字节、起始/停止条件，实际有效带宽只有标称速率的 70% 左右。SPI 没有这些开销，数据可以连续流式传输。</p>
<p>SPI 的“片选”本质是用硬件线选设备，所以 N 个从机需要 N 根 CS（或者用 74HC138 译码）。I2C 用地址选设备，硬件成本低，但地址空间只有 112 个可用，且容易冲突。</p>`,
        fig: {
          type: "table",
          title: "I2C 与 SPI 对比",
          tag: "compare",
          head: ["维度", "I2C", "SPI"],
          rows: [
            ["线数", "2 根（SCL/SDA）", "4 根（SCK/MOSI/MISO/CS）"],
            ["寻址方式", "7 位地址", "片选线"],
            ["双工", "半双工", "全双工"],
            ["典型速率", "100k ~ 400kHz", "1M ~ 50MHz"],
            ["多设备成本", "低（并联）", "高（每设备一根 CS）"],
            ["可靠性", "有 ACK，可检测 NACK", "无应答，靠上层校验"],
            ["典型器件", "传感器、EEPROM、RTC", "Flash、LCD、SD、高速 ADC"]
          ]
        },
        apply: `<p>实际项目中常见组合：I2C 挂传感器和 EEPROM（低速、引脚少），SPI 挂屏幕和 Flash（高速），UART 做调试和模组通信，CAN 做多节点工业总线。</p>
<p>如果 I2C 设备地址冲突，可以用 TCA9548A 这类 I2C 多路复用器，把它当成“交换开关”，把总线分成 8 路，每路挂相同地址的器件。</p>`,
        pitfalls: [
          "<b>认为 SPI 一定比 I2C 好。</b>SPI 引脚多、没有应答机制、多设备布线复杂，低速小数据场景用 I2C 更合适。",
          "<b>忽略 I2C 地址冲突。</b>同型号传感器默认地址相同，挂两个就冲突，必须选支持改地址的型号或用多路复用。",
          "<b>SPI 片选忘记拉低。</b>从机不响应，读回全 0xFF 或全 0x00，这是最常见的 SPI 调试问题。"
        ],
        follow: [
          [
            "SPI 为什么没有应答机制？",
            "SPI 设计上是简单的移位寄存器环形连接，主机和从机同时移位，没有额外的握手线。可靠性靠上层协议（CRC、重读）保证。"
          ],
          [
            "I2C 最多能挂多少设备？",
            "7 位地址中保留了一些特殊地址，实际可用约 112 个。但受总线电容（400pF）限制，实际挂十几个就会因为边沿变慢而出错。"
          ],
          [
            "什么是 QSPI？",
            "Quad SPI，在传统 SPI 基础上增加数据线到 4 根（IO0~IO3），一个时钟周期传 4 位，速率提升 4 倍，常用于外部 Flash（XIP 执行代码）。"
          ]
        ]
      },

      {
        id: "M-05",
        chapter: "wired",
        topic: "spi",
        title: "SPI 的四种模式是怎么回事？CPOL 和 CPHA 怎么配？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "时钟极性与相位的组合、采样沿与移出沿，以及模式不匹配的现象。",
        q: `<p>面试官：<strong>SPI 的四种模式</strong>是怎么来的？CPOL 和 CPHA 分别控制什么？如果模式配错，现象是什么？怎么用示波器确认？</p>`,
        exam: `<p>这是 SPI 调试的核心。能说清“CPOL 决定空闲电平，CPHA 决定第一个还是第二个边沿采样”，并且知道“模式 0 和模式 3 最常用”，说明你实际对过时序图。</p>`,
        core: `<p><code>CPOL</code> 决定空闲时 SCK 高还是低，<code>CPHA</code> 决定第一个边沿还是第二个边沿采样。四种组合：模式 0（空闲低、第一沿采样）、模式 1（空闲低、第二沿）、模式 2（空闲高、第一沿）、模式 3（空闲高、第二沿）。</p><p>配错的表现是数据整体移一位，或全是 0xFF/0x00，因为采样点落在数据变化的时刻。用示波器看空闲电平定 CPOL、看数据在哪个边沿稳定定 CPHA；多数器件用模式 0 或 3，以数据手册时序图为准。</p>`,
        answer: `<p>SPI 有两条配置位：CPOL（时钟极性）决定空闲时 SCK 是高还是低；CPHA（时钟相位）决定在第一个边沿还是第二个边沿采样数据。</p>
<p>组合起来就是四种模式：模式 0（CPOL=0, CPHA=0）空闲低、第一个上升沿采样；模式 1（0,1）空闲低、第二个下降沿采样；模式 2（1,0）空闲高、第一个下降沿采样；模式 3（1,1）空闲高、第二个上升沿采样。</p>
<p>配错模式的现象是：读回的数据整体移位了一位，或者全是 0xFF/0x00。因为采样点落在了数据变化的时刻，采到的是不稳定的值。</p>
<p>用示波器确认的方法：看空闲时 SCK 的电平确定 CPOL，看数据在哪个边沿稳定确定 CPHA。多数器件用模式 0 或模式 3，具体看数据手册的时序图。</p>`,
        principle: `<p>SPI 是全双工移位寄存器：主机和从机各有一个 8 位移位寄存器，通过环形连接，每个时钟沿同时移出一位、移入一位。所以“采样沿”和“移出沿”是交替的，CPHA 决定第一个边沿是采样还是移出。</p>
<p>CPHA=0 时，第一个边沿采样，数据必须在第一个边沿之前就准备好（通常在片选拉低时就输出第一位）；CPHA=1 时，第一个边沿移出数据，第二个边沿采样，时序上更宽松一些。</p>`,
        fig: {
          type: "table",
          title: "SPI 四种模式",
          tag: "timing",
          head: ["模式", "CPOL", "CPHA", "空闲电平", "采样沿"],
          rows: [
            ["Mode 0", "0", "0", "低", "第一个上升沿"],
            ["Mode 1", "0", "1", "低", "第二个下降沿"],
            ["Mode 2", "1", "0", "高", "第一个下降沿"],
            ["Mode 3", "1", "1", "高", "第二个上升沿"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_config.c",
          src: `#include "stm32f1xx_hal.h"

/* 以 W25Q64 Flash 为例：支持模式 0 和模式 3 */
void spi1_init(void)
{
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_SPI1_CLK_ENABLE();

    /* PA5=SCK, PA6=MISO, PA7=MOSI 复用推挽；PA4=CS 普通推挽 */
    GPIO_InitTypeDef g = {0};
    g.Pin   = GPIO_PIN_5 | GPIO_PIN_6 | GPIO_PIN_7;
    g.Mode  = GPIO_MODE_AF_PP;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    g.Pin  = GPIO_PIN_4;
    g.Mode = GPIO_MODE_OUTPUT_PP;
    HAL_GPIO_Init(GPIOA, &g);
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);   /* CS 默认拉高 */

    hspi1.Instance               = SPI1;
    hspi1.Init.Mode              = SPI_MODE_MASTER;
    hspi1.Init.Direction         = SPI_DIRECTION_2LINES;
    hspi1.Init.DataSize          = SPI_DATASIZE_8BIT;
    hspi1.Init.CLKPolarity       = SPI_POLARITY_LOW;      /* CPOL = 0 */
    hspi1.Init.CLKPhase          = SPI_PHASE_1EDGE;       /* CPHA = 0，模式 0 */
    hspi1.Init.NSS               = SPI_NSS_SOFT;          /* 软件片选 */
    hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_8; /* 72/8 = 9MHz */
    hspi1.Init.FirstBit          = SPI_FIRSTBIT_MSB;
    HAL_SPI_Init(&hspi1);
}

/* 标准 SPI 读写：全双工，写一个字节同时读一个字节 */
uint8_t spi_transfer(uint8_t tx)
{
    uint8_t rx = 0;
    HAL_SPI_TransmitReceive(&hspi1, &tx, &rx, 1, 100);
    return rx;
}

/* W25Q64 读 ID：片选 → 命令 → 读 3 字节 → 释放片选 */
uint32_t w25q_read_id(void)
{
    uint8_t cmd = 0x9F;
    uint8_t id[3];

    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_RESET);
    spi_transfer(cmd);
    for (int i = 0; i < 3; i++) id[i] = spi_transfer(0xFF);
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);

    return ((uint32_t)id[0] << 16) | ((uint32_t)id[1] << 8) | id[2];
}`
        },
        apply: `<p>调试 SPI 的固定顺序：先确认片选是否拉低、时钟是否有波形，再看模式是否匹配，最后看速率是否超出从机能力。速率过高时，波形上升沿变缓，采样点落在过渡区，读回的数据会随机出错。</p>
<p>长线或高速时，SCK 和 MOSI 要走等长线，必要时串 22~33Ω 电阻抑制反射；多从机时每个 CS 单独走线，避免互相干扰。</p>`,
        pitfalls: [
          "<b>模式配错。</b>读回数据移位或全 FF，是最常见的 SPI 问题。先试模式 0 和模式 3，多数器件能用。",
          "<b>片选一直拉低。</b>多个从机同时被选中，MISO 上出现总线冲突，数据全乱。",
          "<b>时钟太快。</b>超过从机最大速率，或 PCB 走线质量差导致边沿退化，出现随机错误。"
        ],
        follow: [
          [
            "SPI 的 MSB first 和 LSB first 有什么区别？",
            "决定一个字节内先发最高位还是最低位。多数器件是 MSB first，少数（如某些 ADC、显示驱动）是 LSB first，配错会导致数据位序颠倒。"
          ],
          [
            "SPI 如何读数据？",
            "SPI 是全双工，主机发送任意字节（通常 0xFF 或 0x00）的同时，从机会把数据移回来。所以“读”本质上是“发一个 dummy 字节并接收”。"
          ],
          [
            "多从机怎么接？",
            "每个从机独立 CS，SCK/MOSI/MISO 共用；或者用 74HC138 译码 CS；菊花链方式（如某些 LED 驱动）则是前一级的 MISO 接下一级的 MOSI。"
          ]
        ]
      },

      {
        id: "M-06",
        chapter: "wired",
        topic: "can",
        title: "CAN 总线是怎么仲裁的？为什么它适合工业现场？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "差分信号、非破坏性仲裁、错误检测与重发，以及 CAN 帧的结构。",
        q: `<p>面试官：<strong>CAN 总线</strong>是多主总线，如果两个节点同时发送怎么办？仲裁是怎么做的？为什么说它是“非破坏性”的？</p>`,
        exam: `<p>考察对 CAN 物理层和协议层的理解。能说清“显性位 0 覆盖隐性位 1”“ID 越小优先级越高”“仲裁失败的节点自动转为接收，数据不丢失”，说明你真正理解 CAN 的优势。</p>`,
        core: `<p>CAN_H/CAN_L 差分，显性（逻辑 0）有压差、隐性（逻辑 1）无压差，总线是线与关系：只要一个节点发显性，总线就是显性。</p><p>仲裁发生在 ID 段：节点边发边监听，自己发隐性而总线是显性，说明有更高优先级节点在发，立刻退出转接收。ID 越小越早出现显性位、优先级越高；退出的节点不破坏当前帧、不丢数据，总线空闲后自动重发，叫非破坏性仲裁。再加上 CRC、位填充、应答和错误计数器，抗干扰能力强，适合工业和汽车。</p>`,
        answer: `<p>CAN 用两根差分线 CAN_H 和 CAN_L，显性电平（逻辑 0）是两线有压差，隐性电平（逻辑 1）是两线电压相同。总线是“线与”关系：只要有一个节点发显性，总线就是显性。</p>
<p>仲裁发生在帧起始后的 ID 字段。每个节点一边发 ID 一边监听总线：如果自己发的是隐性（1），而总线是显性（0），说明有更高优先级的节点在发，自己立刻退出仲裁，转为接收状态。</p>
<p>因为 ID 越小，越早出现显性位，所以<strong>ID 数值越小优先级越高</strong>。退出仲裁的节点不会破坏正在传输的帧，也不会丢失数据，等总线空闲后自动重发，这就是“非破坏性仲裁”。</p>
<p>除了仲裁，CAN 还有 CRC 校验、位填充、应答机制和错误计数器：任何一个节点检测到错误都会发错误帧，发送方自动重发，可靠性很高，非常适合电磁环境复杂的工业现场和汽车。</p>`,
        principle: `<p>CAN 帧的关键字段：帧起始（SOF）、仲裁段（11 位标准 ID 或 29 位扩展 ID + RTR）、控制段（DLC 数据长度）、数据段（0~8 字节）、CRC 段、应答段（ACK）、帧结束。标准帧和扩展帧通过 IDE 位区分。</p>
<p>位填充规则是每 5 个相同电平插入 1 个相反电平，保证总线有足够的跳变供接收方同步。接收方会自动去掉填充位，填充错误也是 CAN 的错误类型之一。</p>`,
        fig: {
          type: "flow",
          title: "CAN 仲裁过程",
          tag: "arbitration",
          items: [
            { t: "节点 A 发 ID", d: "0x123" },
            { t: "节点 B 发 ID", d: "0x456" },
            { t: "逐位比较", d: "显性覆盖隐性" },
            { t: "B 退出", d: "转接收" },
            { t: "A 继续", d: "无冲突完成" }
          ]
        },
        code: {
          lang: "c",
          title: "can_filter.c",
          src: `#include "stm32f1xx_hal.h"

/* 配置 CAN：500kbps，接收所有帧，中断方式（假设 PCLK1 = 36MHz） */
void can_init(void)
{
    hcan.Instance                  = CAN1;
    hcan.Init.Prescaler            = 4;         /* 36MHz / 4 = 9MHz，即 1TQ = 1/9 us */
    hcan.Init.Mode                 = CAN_MODE_NORMAL;
    hcan.Init.SyncJumpWidth        = CAN_SJW_1TQ;
    hcan.Init.TimeSeg1             = CAN_BS1_14TQ;   /* 位时间 = 1 + 14 + 3 = 18TQ */
    hcan.Init.TimeSeg2             = CAN_BS2_3TQ;    /* 9MHz / 18 = 500kbps，采样点 83.3% */
    hcan.Init.TimeTriggeredMode    = DISABLE;
    hcan.Init.AutoBusOff           = ENABLE;     /* 自动恢复总线 */
    hcan.Init.AutoWakeUp           = DISABLE;
    hcan.Init.AutoRetransmission   = ENABLE;     /* 出错自动重发 */
    hcan.Init.ReceiveFifoLocked    = DISABLE;
    hcan.Init.TransmitFifoPriority = DISABLE;
    HAL_CAN_Init(&hcan);

    /* 过滤器：接收所有标准帧到 FIFO0 */
    CAN_FilterTypeDef f = {0};
    f.FilterBank           = 0;
    f.FilterMode           = CAN_FILTERMODE_IDMASK;
    f.FilterScale          = CAN_FILTERSCALE_32BIT;
    f.FilterIdHigh         = 0x0000;
    f.FilterIdLow          = 0x0000;
    f.FilterMaskIdHigh     = 0x0000;
    f.FilterMaskIdLow      = 0x0000;             /* 掩码全 0 = 全部接收 */
    f.FilterFIFOAssignment = CAN_RX_FIFO0;
    f.FilterActivation     = ENABLE;
    HAL_CAN_ConfigFilter(&hcan, &f);

    HAL_CAN_Start(&hcan);
    HAL_CAN_ActivateNotification(&hcan, CAN_IT_RX_FIFO0_MSG_PENDING);
}

/* 接收回调：读取 ID、DLC 和数据 */
void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *h)
{
    CAN_RxHeaderTypeDef hdr;
    uint8_t data[8];

    if (HAL_CAN_GetRxMessage(h, CAN_RX_FIFO0, &hdr, data) != HAL_OK) return;

    if (hdr.IDE == CAN_ID_STD && hdr.StdId == 0x123) {
        /* 处理业务数据，注意 CAN 帧最多 8 字节 */
        OnCanFrame(hdr.StdId, data, hdr.DLC);
    }
}`
        },
        apply: `<p>CAN 的 8 字节限制意味着大块数据要拆包，通常用 ISO-TP（ISO 15765-2）协议做分段传输，或者自定义多帧协议。</p>
<p>硬件上要加 120Ω 终端电阻（总线两端各一个），支线长度尽量短（&lt;0.3m），否则信号反射会导致误码。共地也很重要，长距离时建议加隔离收发器。</p>`,
        pitfalls: [
          "<b>认为 ID 越大优先级越高。</b>CAN 是 ID 数值越小优先级越高，和很多总线相反。",
          "<b>终端电阻加错位置。</b>应该只在总线两端各加一个 120Ω，中间节点加了会导致阻抗不匹配。",
          "<b>波特率算错。</b>BS1/BS2/PSC 的组合必须让采样点落在 75%~87.5%，否则同步失败，总线频繁报错。"
        ],
        follow: [
          [
            "CAN 和 CAN FD 有什么区别？",
            "CAN FD 支持更高的数据速率（最高 8Mbps）和更长的数据段（最多 64 字节），并且数据段使用不同的位时序。仲裁段仍保持兼容，所以可以和经典 CAN 共存于同一总线。"
          ],
          [
            "CAN 的错误状态有哪些？",
            "错误主动（Error Active）、错误被动（Error Passive）、总线关闭（Bus Off）。错误计数器超过 127 进入被动，超过 255 进入 Bus Off，节点自动脱离总线，需要恢复流程。"
          ],
          [
            "为什么 CAN 的采样点很重要？",
            "采样点决定在位的哪个位置读取电平。所有节点必须尽量一致（通常 87.5%），否则长线传输时延会导致某些节点采错，出现随机错误帧。"
          ]
        ]
      },

      {
        id: "M-07",
        chapter: "wired",
        topic: "can",
        title: "RS485 和 RS232 有什么区别？方向控制怎么处理？",
        diff: "初级",
        freq: "中频",
        type: "对比辨析题",
        point: "单端与差分、传输距离与节点数、半双工方向切换时序。",
        q: `<p>面试官：<strong>RS485 和 RS232</strong> 有什么区别？为什么 485 能传 1200 米而 232 只能传十几米？用 485 时收发方向怎么切换？</p>`,
        exam: `<p>考察物理层基础和实际调试经验。能说清“差分抗共模干扰”“半双工需要 DE 控制”“切换后要等发送完成再释放”，说明你接过 485 总线。</p>`,
        core: `<p>RS232 单端、对地传输、±3~15V、点对点，通常 15 米内；RS485 是差分 A/B，接收只看压差，共模干扰被抵消，低速可传 1200 米，一条总线挂 32 个以上节点。</p><p>RS485 半双工，需要 DE/RE 方向控制：发送前拉高 DE 进发送，发完要等最后一个字节真正移出（<code>TC</code> 置位）再拉低，否则会截断最后一个字节；接收时 DE 拉低，总线高阻监听。典型是 UART 接 MAX485，用一个 GPIO 控 DE。</p>`,
        answer: `<p>RS232 是单端信号，用一根线对地传输，逻辑电平 ±3~15V，抗干扰能力差，传输距离通常 15 米以内，只能点对点。</p>
<p>RS485 是差分信号，用 A/B 两根线的电压差表示逻辑，接收端只关心差值，共模干扰会被抵消，所以能传 1200 米（低速时），并且支持多点总线，一条总线可以挂 32 个以上节点。</p>
<p>RS485 是半双工的，同一时刻只能一个方向传输，所以需要一个方向控制引脚（DE/RE）。发送前把 DE 拉高进入发送模式，发送完成后要等最后一个字节真正移出（TC 标志置位）再拉低，否则会截断最后一个字节。</p>
<p>典型电路是 MCU 的 UART 接 MAX485 这类收发器，用一个 GPIO 控制 DE，接收时 DE 拉低，总线处于高阻监听状态。</p>`,
        principle: `<p>差分传输的抗干扰原理是：干扰通常以共模形式叠加在两根线上，接收端做减法时共模分量被抵消，只留下差模信号。所以 485 对共模干扰的抑制能力远强于单端。</p>
<p>485 总线两端需要 120Ω 终端电阻匹配特性阻抗，减少反射；长距离或强干扰环境还要加 TVS、共模电感和隔离，防止地电位差损坏收发器。</p>`,
        fig: {
          type: "table",
          title: "RS232 与 RS485 对比",
          tag: "compare",
          head: ["维度", "RS232", "RS485"],
          rows: [
            ["信号方式", "单端对地", "差分（A/B）"],
            ["传输距离", "约 15m", "可达 1200m（低速）"],
            ["拓扑", "点对点", "多点总线"],
            ["双工", "全双工", "半双工"],
            ["节点数", "2", "32 ~ 256"],
            ["抗干扰", "弱", "强"]
          ]
        },
        code: {
          lang: "c",
          title: "rs485_send.c",
          src: `#include "stm32f1xx_hal.h"

#define RS485_DE_PORT  GPIOA
#define RS485_DE_PIN   GPIO_PIN_8

/* 发送一帧：切换方向 → 发送 → 等发送完成 → 切回接收 */
int rs485_send(const uint8_t *data, uint16_t len)
{
    /* 1. 进入发送模式 */
    HAL_GPIO_WritePin(RS485_DE_PORT, RS485_DE_PIN, GPIO_PIN_SET);

    /* 2. 发送数据（阻塞或 DMA 均可） */
    if (HAL_UART_Transmit(&huart2, (uint8_t *)data, len, 100) != HAL_OK) {
        HAL_GPIO_WritePin(RS485_DE_PORT, RS485_DE_PIN, GPIO_PIN_RESET);
        return -1;
    }

    /* 3. 关键：等最后一个字节真正移出移位寄存器
     *    只等 TXE 不够，TXE 只表示数据寄存器空
     */
    while (!__HAL_UART_GET_FLAG(&huart2, UART_FLAG_TC)) { }
    __HAL_UART_CLEAR_FLAG(&huart2, UART_FLAG_TC);

    /* 4. 切回接收模式，释放总线 */
    HAL_GPIO_WritePin(RS485_DE_PORT, RS485_DE_PIN, GPIO_PIN_RESET);
    return 0;
}

/* 用 DMA 发送时，在传输完成回调里切回接收 */
void HAL_UART_TxCpltCallback(UART_HandleTypeDef *h)
{
    if (h->Instance == USART2) {
        while (!__HAL_UART_GET_FLAG(h, UART_FLAG_TC)) { }
        HAL_GPIO_WritePin(RS485_DE_PORT, RS485_DE_PIN, GPIO_PIN_RESET);
    }
}`
        },
        apply: `<p>实际组网时，主机轮询、从机应答是最常见的模型。要定义好帧间隔（比如 3.5 个字符时间），从机在这个时间内没收到新数据就认为一帧结束，类似 Modbus RTU 的规则。</p>
<p>如果总线很长、节点很多，要加中继器；如果地电位差大，要用隔离型收发器（如 ADM2483）并单独供电，否则可能烧毁接口。</p>`,
        pitfalls: [
          "<b>只等 TXE 就切方向。</b>最后一个字节还在移位寄存器里，切到接收会把它截断，对方收到不完整帧。必须等 TC。",
          "<b>忘记加终端电阻。</b>长线反射导致误码，表现为距离一长就通信失败。",
          "<b>A/B 接反。</b>差分线接反后收到的是反相数据，全是乱码，但很多收发器有极性保护，现象不明显，容易忽略。"
        ],
        follow: [
          [
            "为什么 485 是半双工？",
            "因为它只有一对差分线，发送和接收共用同一对线，同一时刻只能一个方向传输。全双工需要两对线（如 RS422）。"
          ],
          [
            "Modbus RTU 的帧间隔是怎么定义的？",
            "以 3.5 个字符时间为帧间隔，小于这个时间认为帧未结束，大于则认为新帧开始。高波特率下固定用 1.75ms 左右。"
          ],
          [
            "如何提高 485 总线的可靠性？",
            "加终端电阻和偏置电阻（保证空闲时总线处于确定状态）、使用双绞屏蔽线、单点接地、加 TVS 和共模电感、降低波特率或缩短距离。"
          ]
        ]
      },

      {
        id: "M-08",
        chapter: "wireless",
        topic: "ble",
        title: "BLE 和经典蓝牙有什么区别？连接参数怎么影响功耗？",
        diff: "中级",
        freq: "中频",
        type: "对比辨析题",
        point: "协议栈差异、典型应用、连接间隔与从机延迟对功耗和延迟的影响。",
        q: `<p>面试官：<strong>BLE 和经典蓝牙</strong>有什么区别？为什么 BLE 更省电？连接间隔（Connection Interval）设大设小分别有什么影响？</p>`,
        exam: `<p>考察无线通信的工程理解。能说清“BLE 为低功耗设计，广播+短连接”“连接间隔决定唤醒频率”“从机延迟可以让从机跳过若干次连接事件”，说明你调过 BLE 产品。</p>`,
        core: `<p>经典蓝牙为连续音频设计，连接后保持链路，速率 1~3Mbps、功耗大，适合耳机音箱；BLE 为低功耗物联网设计，大部分时间睡眠，只在广播或连接事件短暂唤醒，速率 1~2Mbps、单包小，平均功耗可到微安级。</p><p>三个连接参数：连接间隔 7.5ms~4s、从机延迟、监督超时。间隔越小响应越快、功耗越高；从机延迟允许跳过 N 个连接事件，比如间隔 100ms、延迟 4，从机可 500ms 才醒一次，代价是主机下发最多延迟 500ms。</p>`,
        answer: `<p>经典蓝牙（BR/EDR）是为连续音频流设计的，连接建立后保持链路，速率高（1~3Mbps），功耗大，适合耳机、音箱。</p>
<p>BLE 是为低功耗物联网设计的，大部分时间处于睡眠，只在广播或连接事件时短暂唤醒。它速率较低（1~2Mbps），单包数据少，但平均功耗可以做到微安级，一颗纽扣电池能用几个月到几年。</p>
<p>连接参数主要有三个：连接间隔（7.5ms~4s）、从机延迟（slave latency）、监督超时。连接间隔越小，响应越快但功耗越高；从机延迟允许从机跳过 N 个连接事件不响应，进一步省电。</p>
<p>比如连接间隔 100ms、从机延迟 4，从机可以每 500ms 才醒一次，功耗大幅降低，但主机下发的数据最多延迟 500ms。所以要根据业务在“响应速度”和“续航”之间取舍。</p>`,
        principle: `<p>BLE 的省电来自“事件驱动 + 短时唤醒”：广播时只发几个包就睡；连接后每个连接事件里主从交换一次数据，交换完立刻睡。射频和 CPU 的占空比极低，平均电流自然就小。</p>
<p>BLE 的协议栈分 controller 和 host 两层，GAP 负责连接和广播，GATT 负责数据组织（service、characteristic）。所有数据都是通过读写 characteristic 完成的，这是和经典蓝牙“串口透传”最大的不同。</p>`,
        fig: {
          type: "table",
          title: "BLE 与经典蓝牙对比",
          tag: "compare",
          head: ["维度", "BLE", "经典蓝牙"],
          rows: [
            ["设计目标", "低功耗、短包", "高带宽、连续流"],
            ["典型速率", "1~2Mbps", "1~3Mbps"],
            ["功耗", "极低（uA 级平均）", "较高（mA 级）"],
            ["连接建立", "快（ms 级）", "慢（秒级）"],
            ["典型应用", "传感器、穿戴、信标", "耳机、音箱、车载"],
            ["数据模型", "GATT / Characteristic", "SPP、A2DP 等 profile"]
          ]
        },
        apply: `<p>做 BLE 传感器时，常用“广播 + 休眠”模式：每秒广播一次，把温湿度直接放在广播数据里，主机扫描即可获取，根本不需要建立连接，功耗最低。</p>
<p>需要双向通信时才建立连接，并根据业务调连接间隔：遥控器要求低延迟，用 7.5~15ms；环境监测可以 500ms~1s，配合从机延迟进一步省电。</p>`,
        pitfalls: [
          "<b>认为 BLE 传得远。</b>BLE 的链路预算和经典蓝牙差不多，室内穿墙能力有限，远距离要靠降低速率（LE Coded PHY）或加中继。",
          "<b>连接间隔设太小。</b>功耗飙升，纽扣电池几天就没电；设太大又会导致控制延迟明显。",
          "<b>忽略 MTU。</b>默认 MTU 23 字节，有效载荷只有 20 字节，传大块数据要分包，吞吐量远低于标称速率。"
        ],
        follow: [
          [
            "BLE 的广播包能带多少数据？",
            "传统广播最多 31 字节（含头部），扩展广播（BLE 5.0）可以到 255 字节以上。实际可用载荷要扣掉 Flags、设备名等字段。"
          ],
          [
            "什么是 GATT？",
            "Generic Attribute Profile，定义数据如何组织成 service 和 characteristic。每个 characteristic 有 UUID、值、以及描述符（如通知开关），主机通过读写这些特征来交互。"
          ],
          [
            "BLE 的配对和绑定是什么？",
            "配对是交换密钥建立加密链路的过程，绑定是把密钥保存下来，下次连接直接加密不用重新配对。涉及 MITM 保护、密钥分发方式等安全选项。"
          ]
        ]
      },

      {
        id: "M-09",
        chapter: "wireless",
        topic: "net",
        title: "TCP 和 UDP 有什么区别？MQTT 为什么基于 TCP？",
        diff: "中级",
        freq: "高频",
        type: "对比辨析题",
        point: "连接、可靠性、有序性、开销，以及物联网协议栈的分层选择。",
        q: `<p>面试官：<strong>TCP 和 UDP</strong> 有什么区别？MQTT 为什么跑在 TCP 上而不是 UDP？如果要做实时音频或视频，你会选哪个？</p>`,
        exam: `<p>考察网络基础与协议选型。能说清“TCP 面向连接、可靠、有序、有拥塞控制”“UDP 无连接、不可靠、开销小、延迟低”，并且理解 MQTT 的 QoS 是建立在 TCP 可靠传输之上的应用层机制。</p>`,
        core: `<p>TCP 面向连接，三次握手，靠序号、确认、重传保证可靠有序，还有流量和拥塞控制，代价是头部 20 字节起、建链慢、丢包会阻塞等待；UDP 无连接、不保证送达和顺序、不重传，头部 8 字节，开销小延迟低，适合音视频、DNS、游戏。</p><p>MQTT 基于 TCP，因为它需要可靠有序的字节流；QoS 1/2 是在 TCP 之上做应用层确认，保证至少一次或恰好一次，而不是重复实现底层重传。实时音视频多用 UDP，丢一帧能忍，延迟不能忍。</p>`,
        answer: `<p>TCP 是面向连接的，通信前要三次握手，传输中通过序号、确认、重传保证可靠和有序，还有流量控制和拥塞控制。代价是头部大（20 字节起）、建立连接慢、丢包时会阻塞等待重传。</p>
<p>UDP 是无连接的，不保证送达、不保证顺序、不做重传，头部只有 8 字节，开销小、延迟低。适合实时性优先、能容忍少量丢包的场景，比如音视频、DNS、游戏。</p>
<p>MQTT 基于 TCP，因为它需要一个可靠的、有序的字节流来承载消息。MQTT 自己的 QoS 1/2 是在 TCP 可靠传输之上做“应用层确认”，保证消息至少一次或恰好一次送达，而不是重复实现底层重传。</p>
<p>实时音视频通常用 UDP（或基于 UDP 的 QUIC/WebRTC），因为丢一帧可以忍受，但延迟不能忍；用 TCP 会因为重传导致卡顿累积。</p>`,
        principle: `<p>TCP 的可靠性来自序列号 + 确认 + 超时重传：接收方按序确认，发送方根据 ACK 滑动窗口继续发送，超时未确认就重传。拥塞控制则通过慢启动、拥塞避免、快重传、快恢复调节发送速率。</p>
<p>UDP 把可靠性交给应用层：需要可靠就用 QUIC（在 UDP 上实现可靠传输），需要实时就容忍丢包。这种“最小机制”的设计让 UDP 的延迟和开销都可控。</p>`,
        fig: {
          type: "table",
          title: "TCP 与 UDP 对比",
          tag: "compare",
          head: ["维度", "TCP", "UDP"],
          rows: [
            ["连接", "面向连接（三次握手）", "无连接"],
            ["可靠性", "确认 + 重传，保证送达", "不保证"],
            ["有序性", "保证顺序", "不保证"],
            ["头部开销", "20 字节起", "8 字节"],
            ["拥塞控制", "有", "无"],
            ["典型应用", "HTTP、MQTT、文件传输", "DNS、音视频、游戏"]
          ]
        },
        apply: `<p>嵌入式设备联网常见组合：MQTT over TCP 做数据上报（可靠、省流量），HTTP over TCP 做固件下载（配合断点续传），DNS over UDP 做域名解析，NTP over UDP 做时间同步。</p>
<p>NB-IoT、Cat-1 这类模组通常内置 TCP/IP 协议栈，MCU 只需要发 AT 命令或走 PPP，不需要自己实现协议栈。</p>`,
        pitfalls: [
          "<b>认为 UDP 一定比 TCP 快。</b>在丢包率低的网络里，TCP 的延迟和 UDP 差不多，但可靠性更好；只有在丢包或高延迟网络里 UDP 的优势才明显。",
          "<b>忽略 TCP 的粘包。</b>TCP 是字节流，没有消息边界，应用层必须自己定长度字段或分隔符。",
          "<b>MQTT QoS 2 当成“绝对可靠”。</b>它保证的是消息不重复，但依赖 TCP 连接，断线期间的消息仍需靠会话保持和离线消息机制。"
        ],
        follow: [
          [
            "TCP 的三次握手为什么不能是两次？",
            "两次无法确认客户端的接收能力，也无法防止历史重复连接请求造成服务端资源浪费。三次才能双方都确认“我能发、你能收”。"
          ],
          [
            "MQTT 的 QoS 0/1/2 分别是什么？",
            "QoS 0 最多一次（可能丢），QoS 1 至少一次（可能重复），QoS 2 恰好一次（四次握手，开销最大）。按业务重要性选择，不要一律用 QoS 2。"
          ],
          [
            "为什么 MQTT 适合物联网？",
            "长连接 + 发布订阅模型，头部开销小（最小 2 字节），支持遗嘱消息、心跳保活、离线消息，适合带宽受限、设备多的场景。"
          ]
        ]
      },

      {
        id: "M-10",
        chapter: "protocol",
        topic: "frame",
        title: "自定义通信协议帧应该怎么设计？",
        diff: "中级",
        freq: "高频",
        type: "综合设计题",
        point: "帧头、长度、命令字、载荷、校验、转义，以及可靠性与扩展性权衡。",
        q: `<p>面试官：让你设计一个串口通信协议，<strong>帧结构</strong>你会怎么定？为什么要有帧头和长度字段？校验用累加和还是 CRC？数据里出现帧头怎么办？</p>`,
        exam: `<p>这是最能体现工程经验的开放题。能说出“帧头用于同步、长度用于定界、CRC 用于检错、转义用于透明传输”，并且能权衡“固定帧 vs 变长帧”“二进制 vs 文本协议”，说明你设计过实际协议。</p>`,
        core: `<p>典型帧：帧头 2 字节（如 <code>0xAA 0x55</code>）+ 长度 1~2 字节（后续字节数）+ 命令字 + 可选序列号 + 载荷 + CRC16。</p><p>帧头用于同步，长度用于定界（不用靠超时判断），CRC 检错比累加和强。载荷可能含帧头字节时，用长度定界 + CRC 比转义更简单高效；扩展性上命令字留厂商自定义区间、长度支持变长、版本号可放帧头。</p>`,
        answer: `<p>我通常设计成：帧头（2 字节，比如 0xAA 0x55）+ 长度（1~2 字节，表示后续字节数）+ 命令字（1 字节）+ 序列号（可选）+ 载荷（0~N 字节）+ 校验（2 字节 CRC16）。</p>
<p>帧头的作用是<strong>同步</strong>：接收方在字节流里搜索帧头，找到一帧的起点。长度字段的作用是<strong>定界</strong>：知道后面还有多少字节，不用靠超时判断，效率和可靠性都更高。CRC 用于<strong>检错</strong>，比累加和强得多，能发现多位错误。</p>
<p>如果载荷里可能出现和帧头相同的字节，有两种处理：一是<strong>转义</strong>（比如把 0xAA 转成 0xAA 0x00），二是<strong>长度定界</strong>——只要长度字段可信，就不需要扫描帧头，天然支持任意数据。我更倾向长度定界 + CRC，实现简单且效率高。</p>
<p>扩展性上，命令字留出厂商自定义区间，长度字段支持变长载荷，版本号可以放在帧头里，方便协议升级。</p>`,
        principle: `<p>长度定界的前提是“长度字段本身可信”。如果长度字段被干扰，接收方可能一直等不到足够的数据，导致缓冲区被占满。所以要配合超时机制：超过一定时间没收到完整帧，就丢弃并重新同步。</p>
<p>CRC16 的选择上，Modbus 用 CRC-16/MODBUS（多项式 0xA001，反向），CCITT 用 0x1021。两者检错能力都不错，选一个团队统一的即可，关键是收发一致。</p>`,
        fig: {
          type: "bits",
          title: "推荐的帧结构",
          tag: "frame",
          cells: [
            { v: "AA", n: "帧头 1" },
            { v: "55", n: "帧头 2" },
            { v: "LEN", n: "长度" },
            { v: "CMD", n: "命令字" },
            { v: "SEQ", n: "序列号" },
            { v: "DATA", n: "载荷" },
            { v: "CRC", n: "校验 2B" }
          ],
          note: "LEN 表示 CMD 到 DATA 的字节数，接收方据此判断帧是否完整。"
        },
        code: {
          lang: "c",
          title: "protocol_frame.c",
          src: `#include <stdint.h>
#include <string.h>

#define FRAME_HEAD1   0xAA
#define FRAME_HEAD2   0x55
#define FRAME_MAX     128

typedef struct {
    uint8_t  cmd;
    uint8_t  seq;
    uint8_t  len;
    uint8_t  data[FRAME_MAX];
} frame_t;

/* CRC-16/MODBUS：多项式 0xA001（反向 0x8005） */
uint16_t crc16_modbus(const uint8_t *buf, uint16_t len)
{
    uint16_t crc = 0xFFFF;
    while (len--) {
        crc ^= *buf++;
        for (int i = 0; i < 8; i++) {
            if (crc & 1) crc = (uint16_t)((crc >> 1) ^ 0xA001);
            else         crc >>= 1;
        }
    }
    return crc;
}

/* 打包：返回总长度，失败返回 0 */
uint16_t frame_pack(uint8_t *out, uint8_t cmd, uint8_t seq,
                    const uint8_t *data, uint8_t len)
{
    if (len > FRAME_MAX) return 0;

    uint16_t i = 0;
    out[i++] = FRAME_HEAD1;
    out[i++] = FRAME_HEAD2;
    out[i++] = (uint8_t)(len + 2);      /* CMD + SEQ + DATA */
    out[i++] = cmd;
    out[i++] = seq;
    if (len) { memcpy(&out[i], data, len); i += len; }

    uint16_t crc = crc16_modbus(&out[2], (uint16_t)(i - 2));   /* 从 LEN 开始算 */
    out[i++] = (uint8_t)(crc & 0xFF);
    out[i++] = (uint8_t)(crc >> 8);     /* 低字节在前，与 Modbus 一致 */

    return i;
}

/* 解包：校验帧头和 CRC，成功返回 0 */
int frame_unpack(const uint8_t *buf, uint16_t total, frame_t *f)
{
    if (total < 6) return -1;
    if (buf[0] != FRAME_HEAD1 || buf[1] != FRAME_HEAD2) return -2;

    uint8_t len = buf[2];
    /* LEN 至少含 CMD+SEQ（2 字节），且不能超过接收缓冲区容量，防止 len-2 下溢 */
    if (len < 2 || len > FRAME_MAX + 2) return -3;
    if ((uint16_t)(len + 5) != total) return -3;   /* 2 字节帧头 + 1 字节 LEN + LEN 字节体 + 2 字节 CRC */

    uint16_t crc_calc = crc16_modbus(&buf[2], (uint16_t)(len + 1));
    uint16_t crc_recv = (uint16_t)(buf[total - 2] | (buf[total - 1] << 8));
    if (crc_calc != crc_recv) return -4;

    f->cmd = buf[3];
    f->seq = buf[4];
    f->len = (uint8_t)(len - 2);
    if (f->len) memcpy(f->data, &buf[5], f->len);
    return 0;
}`
        },
        apply: `<p>设计协议时还要考虑：应答机制（收到帧回 ACK，超时重发）、序号（用于去重和匹配请求响应）、心跳（检测链路存活）、以及错误码（让对端知道失败原因）。</p>
<p>如果带宽允许，文本协议（如 JSON、AT 命令）更易调试；如果带宽紧张或实时性要求高，二进制协议更合适。两者可以结合：二进制传输，但提供文本调试命令。</p>`,
        pitfalls: [
          "<b>只用帧头帧尾定界。</b>载荷里出现帧尾字节就会提前截断，必须转义或改用长度定界。",
          "<b>校验只算载荷不算头部。</b>长度字段被干扰时检测不出来，导致解析越界。应该从长度字段开始算到载荷结束。",
          "<b>没有超时机制。</b>收到半帧后一直等，缓冲区被占满，后续正常帧也进不来。"
        ],
        follow: [
          [
            "为什么推荐 CRC 而不是累加和？",
            "累加和对字节顺序不敏感，也无法发现某些多位错误（比如两个字节同时变化但和不变）。CRC 能检测绝大多数突发错误，检错能力强得多，代价只是几十条指令。"
          ],
          [
            "什么是透明传输？",
            "指协议不限制载荷内容，任意字节都能传输。实现方式有字节填充（转义）和长度定界两种。长度定界更高效，转义更适合没有长度字段的协议（如 PPP、SLIP）。"
          ],
          [
            "协议版本如何兼容？",
            "在帧头里留版本字段，或者用命令字的高位表示版本。新版本增加字段时放在末尾，旧设备按长度截断解析，实现向前兼容。"
          ]
        ]
      },

      {
        id: "M-11",
        chapter: "protocol",
        topic: "parse",
        title: "粘包和拆包怎么处理？状态机解析怎么写？",
        diff: "高级",
        freq: "进阶",
        type: "代码分析题",
        point: "字节流无边界问题、状态机逐字节解析、缓冲区管理与异常恢复。",
        q: `<p>面试官：串口收到的数据是<strong>字节流</strong>，一帧可能分几次到达，也可能几帧连在一起。你怎么用<strong>状态机</strong>解析？如果收到半帧就断了，怎么恢复？</p>`,
        exam: `<p>这是通信协议的落地难点。能写出“逐字节喂入状态机、只在完整帧时回调、校验失败重新同步”的代码，说明你写过真正稳定的解析器，而不是“假设一次收一帧”的理想代码。</p>`,
        core: `<p>核心是不假设一次收到一帧，把每个字节依次喂给状态机，状态机记住解析到哪一步，跨多次接收也能接上：等帧头 1 → 等帧头 2 → 读长度 → 读命令和载荷 → 读 CRC → 校验，CRC 通过才回调上层。</p><p>缓冲可以先用环形缓冲存字节流再解析（解耦更好），或状态机自带帧缓冲边收边填（更省内存）。半帧断掉靠超时恢复：超过一定时间没有新字节就复位到等帧头，丢掉已收部分，下一帧重新同步。</p>`,
        answer: `<p>核心思路是：不假设一次收到一帧，而是把收到的每个字节依次喂给状态机。状态机记住“当前解析到哪一步”，跨多次接收也能接上。</p>
<p>状态一般是：等帧头 1 → 等帧头 2 → 读长度 → 读命令和载荷 → 读 CRC → 校验。只有在 CRC 通过时才回调上层，否则丢弃并重新寻找帧头。</p>
<p>缓冲区管理有两种：一是把字节流先存进环形缓冲，解析器从缓冲里取；二是状态机自带一个帧缓冲区，边收边填。前者解耦更好，后者更省内存。</p>
<p>半帧断掉的恢复靠超时：如果超过一定时间没有新字节，就把状态机复位到“等帧头”，丢弃已收到的部分。这样即使丢了一个字节，也能在下一帧重新同步。</p>`,
        principle: `<p>状态机的本质是“用有限的状态记录解析进度”，不需要保存整个字节流，内存开销固定。相比“先收完再解析”，它能处理任意分片方式，也不会因为一次收到多帧而漏解析。</p>
<p>重新同步的策略很重要：如果只在帧头处同步，载荷里恰好出现帧头就会误判；配合长度字段和 CRC 校验，误判的帧会被 CRC 拒绝，然后从下一个字节继续找帧头，最终一定能同步上。</p>`,
        fig: {
          type: "flow",
          title: "解析状态机",
          tag: "state machine",
          items: [
            { t: "HEAD1", d: "找 0xAA" },
            { t: "HEAD2", d: "确认 0x55" },
            { t: "LEN", d: "读长度" },
            { t: "BODY", d: "收载荷" },
            { t: "CRC", d: "校验" },
            { t: "DISPATCH", d: "回调上层" }
          ]
        },
        code: {
          lang: "c",
          title: "parser_fsm.c",
          src: `#include <stdint.h>
#include <string.h>

#define HEAD1      0xAA
#define HEAD2      0x55
#define MAX_PAYLOAD 120

typedef enum {
    ST_HEAD1 = 0,
    ST_HEAD2,
    ST_LEN,
    ST_BODY,
    ST_CRC_L,
    ST_CRC_H
} parse_state_t;

typedef struct {
    parse_state_t state;
    uint8_t  len;
    uint8_t  idx;
    uint8_t  buf[MAX_PAYLOAD];
    uint16_t crc_recv;
} parser_t;

static parser_t s_parser;
static uint32_t s_last_rx_ms;       /* 最后一次收到字节的时刻 */
static uint8_t  s_rx_activity;      /* 自上次 tick 之后是否收到过字节 */

/* 逐字节喂入，任何时候都可以中断和续传 */
void parser_feed(uint8_t byte)
{
    parser_t *p = &s_parser;

    s_rx_activity = 1;              /* 标记“有数据进来”，时间戳由 parser_tick 刷新 */

    switch (p->state) {
    case ST_HEAD1:
        if (byte == HEAD1) p->state = ST_HEAD2;
        break;

    case ST_HEAD2:
        if (byte == HEAD2)      p->state = ST_LEN;
        else if (byte == HEAD1) p->state = ST_HEAD2;   /* 连续 AA AA 55 */
        else                    p->state = ST_HEAD1;
        break;

    case ST_LEN:
        if (byte == 0 || byte > MAX_PAYLOAD) {          /* 非法长度 */
            p->state = ST_HEAD1;
        } else {
            p->len = byte;
            p->idx = 0;
            p->state = ST_BODY;
        }
        break;

    case ST_BODY:
        p->buf[p->idx++] = byte;
        if (p->idx >= p->len) p->state = ST_CRC_L;
        break;

    case ST_CRC_L:
        p->crc_recv = byte;
        p->state = ST_CRC_H;
        break;

    case ST_CRC_H:
        p->crc_recv |= (uint16_t)(byte << 8);
        if (p->crc_recv == crc16_modbus(p->buf, p->len)) {
            Frame_OnReceived(p->buf, p->len);           /* 只在这里回调 */
        }
        p->state = ST_HEAD1;                            /* 无论成败都重新同步 */
        break;
    }
}

/* 超时复位：主循环或定时器里调用 */
void parser_tick(uint32_t now_ms)
{
    if (s_rx_activity) {            /* 刚收到字节，刷新“最后活动时刻” */
        s_rx_activity = 0;
        s_last_rx_ms  = now_ms;
        return;
    }
    if (now_ms - s_last_rx_ms > 100) {   /* 距最后一个字节超过 100ms，丢弃半帧 */
        s_parser.state = ST_HEAD1;
        s_parser.idx   = 0;
    }
}

/* 从环形缓冲批量喂入，效率更高 */
void parser_poll(void)
{
    uint8_t byte;
    while (RingBuf_Get(&s_rx_ring, &byte)) {
        parser_feed(byte);
    }
}`
        },
        apply: `<p>实际项目里，解析器应该和传输层解耦：串口、CAN、TCP 都只负责把字节喂进来，解析器不关心数据从哪来。这样同一套协议可以跑在不同链路上。</p>
<p>调试时可以把状态机的状态和已收字节数打印出来，出现“卡住”时能立刻看出停在哪一步，比盲猜高效得多。</p>`,
        pitfalls: [
          "<b>假设一次收到完整帧。</b>实际串口会分片，长帧尤其明显，必须用状态机或缓冲累积。",
          "<b>长度字段不校验。</b>被干扰成 255 时，缓冲区越界写入，直接踩坏内存。必须限制最大长度。",
          "<b>校验失败后不复位状态机。</b>会一直卡在等待后续字节，后续正常帧全部解析不出来。"
        ],
        follow: [
          [
            "为什么不用“查找帧尾”的方式定界？",
            "载荷里可能出现帧尾字节，导致提前截断；而且需要转义，增加带宽和复杂度。长度定界 + CRC 更可靠。",
            ],
          [
            "环形缓冲和状态机怎么配合？",
            "中断只负责把字节写入环形缓冲并置标志，任务里循环取出喂给状态机。这样中断执行时间恒定，解析耗时不阻塞接收。"
          ],
          [
            "如何支持多协议共存？",
            "用协议识别层先判断帧头特征（不同协议用不同帧头），再分发给对应的解析器。或者用统一的外层封装，内层用命令字区分。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("communication", {
    chapters: [
      {
        id: "wired",
        topics: [
          { id: "flow", title: "串口流控" },
          { id: "canfd", title: "CAN FD" },
          { id: "lin", title: "LIN 总线" },
          { id: "modbus", title: "Modbus 协议" }
        ]
      },
      {
        id: "wireless",
        topics: [
          { id: "gatt", title: "BLE GATT 与 ATT" },
          { id: "lora", title: "LoRa 与 NB-IoT" },
          { id: "eth", title: "以太网与 TCP" }
        ]
      }
    ],
    questions: [
      {
        id: "M-12",
        chapter: "wired",
        topic: "flow",
        title: "串口的硬件流控和软件流控有什么区别？什么时候必须用？",
        diff: "中级",
        freq: "中频",
        type: "协议分析题",
        point: "硬件流控用 RTS/CTS 独立信号线，软件流控用 XON/XOFF 字符，会占用数据通道。",
        q: `<p>面试官：串口高速传输大量数据时经常丢包，加流控能解决吗？RTS/CTS 和 XON/XOFF 怎么选？</p>`,
        exam: `<p>考察对串口流控机制的理解。能说出“接收方缓冲区快满时通知发送方暂停”，以及两种方式的优缺点，就很好。</p>`,
        core: `<p>串口是异步的，发送方不知道接收缓冲是否已满，速度超过处理速度就会溢出丢数据。</p><p>硬件流控 RTS/CTS：接收方缓冲将满时<strong>撤销 RTS</strong>（RTS 无效），发送方检测到 CTS 无效就暂停发送，缓冲腾出后再恢复 RTS。多用两根线、响应快、不占数据通道，适合高速大数据量和实时场景。软件流控 XON/XOFF：用 <code>0x13</code> 停、<code>0x11</code> 继续，只占 TX/RX，但控制字符混在数据里，二进制必须转义，响应也慢。二进制协议、高速传输用硬件流控；只有两根线、文本低速可用软件流控。</p>`,
        answer: `<p><b>为什么需要流控：</b>串口是异步的，发送方不知道接收方缓冲区是否已满。如果发送速度超过接收处理速度，就会溢出丢数据。</p>
<p><b>硬件流控（RTS/CTS）：</b></p>
<ul>
<li>接收方缓冲区将满时把 RTS 置为无效电平（通常拉高，具体按芯片定义的有效电平），发送方检测到 CTS 无效就暂停发送，缓冲腾出后再恢复；</li>
<li>需要额外的两根线（RTS、CTS），响应快，不占用数据通道；</li>
<li>适合高速、大数据量、实时性要求高的场景。</li>
</ul>
<p><b>软件流控（XON/XOFF）：</b></p>
<ul>
<li>接收方发送 XOFF（0x13）表示暂停，XON（0x11）表示继续；</li>
<li>只需要 TX/RX 两根线，但控制字符会混在数据流里，二进制数据必须转义，否则误判；</li>
<li>响应较慢（要等字符传完），适合文本传输和低速场景。</li>
</ul>
<p><b>选择建议：</b>二进制协议、高速传输用硬件流控；只有两根线、数据量小且是文本协议时用软件流控。很多模块（如蓝牙、4G）默认支持硬件流控，接线时不要漏掉。</p>`,
        principle: `<p>流控的本质是“背压”：接收方把“我处理不过来了”的信号反馈给发送方，让发送方降速或暂停。硬件流控用独立信号线传递这个信息，软件流控把它编码进数据流。</p>
<p>如果没有流控，只能靠应用层协议做重传，延迟和开销都更大。</p>`,
        fig: {
          type: "table",
          title: "两种流控方式对比",
          tag: "flow control",
          head: ["维度", "RTS/CTS", "XON/XOFF"],
          rows: [
            ["信号线", "额外 2 根", "仅 TX/RX"],
            ["响应速度", "快", "较慢"],
            ["二进制数据", "无影响", "需转义"],
            ["典型场景", "高速、模块通信", "文本、低速"]
          ]
        },
        code: {
          lang: "c",
          title: "uart_flow.c",
          src: `#include "stm32f4xx_hal.h"

/* 启用硬件流控：RTS/CTS 由 USART 外设自动管理 */
void uart_flow_init(void)
{
    huart1.Init.HwFlowCtl = UART_HWCONTROL_RTS_CTS;
    HAL_UART_Init(&huart1);

    /* 对应引脚也要配置为复用功能，查数据手册的 AF 表 */
}

/* 软件流控：XON/XOFF 由接收方发来，控制的是“本机的发送”，不是接收 */
#define XON  0x11
#define XOFF 0x13

static volatile int s_tx_paused;      /* 1 = 对方要求暂停发送 */

void uart_soft_flow_feed(uint8_t byte)
{
    if (byte == XOFF) { s_tx_paused = 1; return; }   /* 对方缓冲将满，暂停发送 */
    if (byte == XON)  { s_tx_paused = 0; return; }   /* 对方已恢复，继续发送 */

    /* 其余字节照常交给协议解析；接收方向不受流控影响，不能丢 */
}

/* 所有发送都走这里：暂停期间等待 XON（实际工程应加超时） */
void uart_soft_send_byte(uint8_t b)
{
    while (s_tx_paused) { /* 等待 XON */ }
    /* uart_putc(b); */
}`
        },
        codeNote: "软件流控下，协议设计要避免数据中出现 0x11/0x13，或用转义机制，否则会被误认为控制字符。",
        apply: `<p>做 4G 模组通信时，我默认开启硬件流控。模组在发送大量数据时如果 MCU 处理不及时，没有流控就会丢 AT 响应，很难排查。</p>
<p>只有两根线的场合，我会把协议设计成定长帧 + CRC，减少对软件流控的依赖，并在应用层做序号和重传。</p>`,
        pitfalls: [
          "<b>只接 TX/RX 却开了硬件流控。</b>发送方一直等 CTS，完全不发数据。",
          "<b>软件流控传二进制。</b>数据里的 0x11/0x13 被误判。",
          "<b>流控阈值设置不合理。</b>缓冲区快满才通知，已经来不及。",
          "<b>忽略模块默认流控配置。</b>接线正确但模块未启用。"
        ],
        follow: [
          ["RTS 和 CTS 的方向是怎样的？", "RTS 是设备输出、告诉对方“我可以接收”；CTS 是设备输入、表示“对方可以接收”。交叉连接：本机 RTS 接对方 CTS。"],
          ["没有流控时如何避免丢数据？", "加大接收缓冲区、提高处理优先级、降低波特率，或在协议层加序号、ACK 和重传。"]
        ]
      },

      {
        id: "M-13",
        chapter: "wired",
        topic: "i2c",
        title: "I2C 的时钟延展和多主仲裁是怎么工作的？",
        diff: "高级",
        freq: "中频",
        type: "协议分析题",
        point: "从机可拉低 SCL 延展时钟；多主同时发送时靠线与逐位仲裁，输家自动退出。",
        q: `<p>面试官：I2C 从机处理不过来时怎么办？两个主机同时发起传输会冲突吗？</p>`,
        exam: `<p>考察对 I2C 协议细节的掌握。能说出“时钟延展让从机控制节奏”“仲裁不丢数据”，就说明理解得比较深。</p>`,
        core: `<p>时钟延展：SCL 是开漏的，从机处理不过来时可以拉低 SCL，主机释放后发现仍为低就等待，直到从机释放；这样从机能暂停总线。不是所有主机都支持，部分硬件 I2C 或软件模拟不检查 SCL 实际电平，会通信失败。</p><p>多主仲裁：逐位“线与”，主机每发一位回读 SDA，自己发 1 却读到 0 就仲裁失败，立即停发、释放总线转为从机；获胜主机继续传输，数据不丢，帧也不被破坏。</p>`,
        answer: `<p><b>时钟延展（Clock Stretching）：</b>I2C 的 SCL 是开漏的，从机可以在需要更多时间处理数据时<b>拉低 SCL</b>，主机释放 SCL 后发现仍为低，就会等待，直到从机释放。这样从机可以“暂停”总线，而不需要主机支持变速。</p>
<p>注意：不是所有主机都支持时钟延展。部分硬件 I2C 外设或软件模拟实现可能不检查 SCL 实际电平，导致通信失败。使用前要确认主机能力。</p>
<p><b>多主仲裁：</b>I2C 支持多主，靠“线与”逐位仲裁：</p>
<ul>
<li>多个主机同时发送时，每个主机在发送每一位后回读 SDA；</li>
<li>如果自己发 1 而读到 0，说明另一个主机发了 0，自己仲裁失败，立即停止发送、释放总线，转为从机模式；</li>
<li>获胜的主机继续传输，数据不会丢失。</li>
</ul>
<p>仲裁保证总线上永远只有一个主机的数据有效，且不会破坏正在传输的帧。这也是 I2C 适合多主系统的原因。</p>`,
        principle: `<p>开漏加线与是 I2C 仲裁的物理基础：任何设备拉低都是低，只有全部释放才是高。主机通过“发送后回读”判断是否有人同时发送了不同的位。</p>
<p>时钟延展利用同一机制：从机拉低 SCL 就相当于“总线还没准备好”，主机必须等待。</p>`,
        fig: {
          type: "flow",
          title: "多主仲裁的逐位比较",
          tag: "i2c arbitration",
          items: [
            { t: "主机 A 发 1", d: "释放 SDA，期望高电平" },
            { t: "主机 B 发 0", d: "拉低 SDA" },
            { t: "总线为 0", d: "线与结果" },
            { t: "A 回读不符", d: "仲裁失败，退出" },
            { t: "B 继续", d: "数据不丢失" }
          ]
        },
        code: {
          lang: "c",
          title: "i2c_stretch.c",
          src: `#include "stm32f4xx_hal.h"

/* 软件模拟 I2C：释放 SCL 后必须等待从机释放（时钟延展） */
static void i2c_delay(void)
{
    for (volatile int i = 0; i < 20; i++) { }
}

void i2c_scl_high_wait(void)
{
    /* 释放 SCL（开漏输出高） */
    GPIOB->BSRR = GPIO_PIN_6;

    /* 等待 SCL 真正变高，超时保护 */
    uint32_t timeout = 10000;
    while (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_6) == GPIO_PIN_RESET) {
        if (--timeout == 0) {
            /* 总线异常，走恢复流程 */
            break;
        }
    }
}`
        },
        codeNote: "软件模拟 I2C 如果不检查 SCL 实际电平，从机延展时钟时主机会继续发时钟，导致数据错位。",
        apply: `<p>接 OLED 或传感器时，如果从机需要较长处理时间（如 EEPROM 写周期），要确认主机支持时钟延展，否则要留足延时或轮询 ACK。</p>
<p>多主场景在嵌入式里较少，但理解仲裁有助于分析总线冲突和 BUSY 卡死问题。</p>`,
        pitfalls: [
          "<b>主机不支持时钟延展。</b>从机拉低 SCL 时主机继续发，通信失败。",
          "<b>软件模拟不检查 SCL 电平。</b>同上。",
          "<b>仲裁失败后不释放总线。</b>影响获胜主机传输。",
          "<b>总线上拉不足。</b>上升沿慢，仲裁采样错误。"
        ],
        follow: [
          ["I2C 的 START 和 STOP 条件怎么定义？", "SCL 为高时，SDA 由高变低是 START；SDA 由低变高是 STOP。数据传输时 SDA 只能在 SCL 低电平期间变化。"],
          ["为什么 I2C 的地址只有 7 位？", "7 位地址共 128 个编码，加上读写位正好凑成 8 位，兼顾地址空间和协议开销。但要扣掉 0x00~0x07、0x78~0x7F 这 16 个保留/特殊用途地址（广播、CBUS、高速模式主机码、10 位地址前缀等），实际可用 112 个。另有 10 位地址扩展，但较少使用。"]
        ]
      },

      {
        id: "M-14",
        chapter: "wired",
        topic: "spi",
        title: "SPI 怎么连接多个从设备？片选和菊花链各有什么优劣？",
        diff: "中级",
        freq: "中频",
        type: "协议分析题",
        point: "独立片选占用多根 IO 但可并行；菊花链省 IO 但数据要串行穿过所有器件。",
        q: `<p>面试官：SPI 总线上要挂 4 个从设备，IO 不够怎么办？菊花链模式有什么限制？</p>`,
        exam: `<p>考察 SPI 拓扑设计。能说出“独立 CS、菊花链、以及菊花链要求器件支持 daisy-chain”，就很好。</p>`,
        core: `<p>独立片选：所有从机共享 SCK/MOSI/MISO，每个一根 CS，拉低哪个就和哪个通信；控制简单、互不影响，但 N 个设备需要 N 根 IO。</p><p>菊花链：前一个的 MISO 接后一个的 MOSI，数据像移位寄存器穿过所有器件；省 IO、适合多片级联（LED 驱动、ADC），但要求器件支持、一次要发所有器件的数据、一个故障影响整链、延迟随数量增加。设备多还可用 74HC138 译码扩 CS。注意 MISO 任一时刻只能有一个设备驱动。</p>`,
        answer: `<p><b>方式一：独立片选。</b>所有从设备共享 SCK、MOSI、MISO，每个设备一根独立的 CS。主机拉低哪个 CS，就与哪个设备通信。</p>
<ul>
<li>优点：控制简单，各设备独立，时序互不影响；</li>
<li>缺点：N 个设备需要 N 根 CS，IO 占用多。</li>
</ul>
<p><b>方式二：菊花链（Daisy Chain）。</b>所有设备的 CS 可以共用（或级联），前一个设备的 MISO 接后一个的 MOSI，数据像移位寄存器一样串行穿过所有设备。</p>
<ul>
<li>优点：节省 IO，适合多片级联（如 LED 驱动、ADC）；</li>
<li>缺点：必须所有器件支持菊花链；一次传输的数据要包含所有器件的字段；某个器件故障会影响整条链；延迟随器件数量增加。</li>
</ul>
<p><b>方式三：用 IO 扩展器或译码器。</b>用 74HC138 等译码器把 3 根 IO 扩展成 8 根 CS，适合设备多但不需要同时通信的场景。</p>
<p>选择时还要考虑 MISO 的驱动：多个从设备同时使能会冲突，必须保证任一时刻只有一个设备驱动 MISO（或使用三态缓冲）。</p>`,
        principle: `<p>SPI 没有地址机制，靠片选选择从设备。片选本质是“让哪个设备的移位寄存器接入总线”。</p>
<p>菊花链把所有设备的移位寄存器串成一条长链，主机发送 N 倍长度的数据，每个设备截取自己那段，因此需要统一的帧格式和时钟。</p>`,
        fig: {
          type: "table",
          title: "SPI 多从连接方式",
          tag: "spi topology",
          head: ["方式", "IO 占用", "优点", "限制"],
          rows: [
            ["独立片选", "N 根 CS", "简单、独立", "IO 多"],
            ["菊花链", "1 根 CS", "省 IO", "器件需支持"],
            ["译码器", "log2(N) 根", "折中", "不能同时通信"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_cs.c",
          src: `#include "stm32f4xx_hal.h"

/* 独立片选：用宏封装，避免每次手写 GPIO */
#define CS_LOW(port, pin)   HAL_GPIO_WritePin((port), (pin), GPIO_PIN_RESET)
#define CS_HIGH(port, pin)  HAL_GPIO_WritePin((port), (pin), GPIO_PIN_SET)

void spi_write_flash(uint8_t cmd, const uint8_t *buf, uint16_t len)
{
    CS_LOW(FLASH_CS_PORT, FLASH_CS_PIN);

    HAL_SPI_Transmit(&hspi1, &cmd, 1, 10);
    if (len) HAL_SPI_Transmit(&hspi1, (uint8_t *)buf, len, 100);

    CS_HIGH(FLASH_CS_PORT, FLASH_CS_PIN);
}

/* 菊花链：一次发送所有器件的数据，长度 = 器件数 × 每器件字节数 */
void chain_update(const uint8_t *frame, uint16_t total_len)
{
    CS_LOW(CHAIN_CS_PORT, CHAIN_CS_PIN);
    HAL_SPI_Transmit(&hspi1, (uint8_t *)frame, total_len, 100);
    CS_HIGH(CHAIN_CS_PORT, CHAIN_CS_PIN);
}`
        },
        codeNote: "片选建立到第一个时钟之间要留建立时间，最后一个时钟到片选释放要留保持时间，具体查器件手册。",
        apply: `<p>我做多路 ADC 采集时用独立片选，虽然 IO 多，但每个通道可以独立配置和读取，时序清晰。级联 LED 驱动则用菊花链，省下大量 IO。</p>
<p>片选线加上拉电阻，防止上电初始化前被干扰导致误选中。</p>`,
        pitfalls: [
          "<b>多个从设备同时使能。</b>MISO 冲突，数据错乱甚至损坏器件。",
          "<b>片选建立/保持时间不足。</b>第一个或最后一个字节出错。",
          "<b>菊花链帧长度算错。</b>数据错位到相邻器件。",
          "<b>CS 上电默认电平不对。</b>初始化前误动作。"
        ],
        follow: [
          ["SPI 的 MISO 需要上拉吗？", "通常不需要，但片选切换时 MISO 可能短暂浮空，敏感场合可以加弱上拉，避免误触发。"],
          ["SPI 能支持双向同时传输吗？", "可以，SPI 是全双工，发送和接收同时进行；很多场景只用单向，但时钟仍然会产生。" ]
        ]
      },

      {
        id: "M-15",
        chapter: "wired",
        topic: "canfd",
        title: "CAN FD 和经典 CAN 有什么区别？为什么它能提高速率？",
        diff: "高级",
        freq: "进阶",
        type: "协议分析题",
        point: "CAN FD 支持可变速率和更大数据场，仲裁段用低速保证兼容，数据段提速。",
        q: `<p>面试官：CAN FD 的“FD”是什么意思？为什么不能简单地把经典 CAN 的波特率调高？</p>`,
        exam: `<p>考察对 CAN 物理层和协议演进的理解。能说出“仲裁需要低速保证传播延迟、数据段可提速、CRC 增强”，就很好。</p>`,
        core: `<p>CAN FD 有两个改进：可变速率——仲裁段仍用 500kbps 保证可靠仲裁，数据段切到 2/5Mbps；数据场最大 64 字节（经典 CAN 是 8 字节），减少开销和帧数。</p><p>不能直接提高经典 CAN 速率，是因为仲裁要求各节点在同一时刻采到相同电平，速率越高传播延迟和振荡器容差占位时间的比例越大，长总线无法可靠仲裁；经典 CRC 也没为高速增强。FD 在帧内切速率，兼顾仲裁可靠与数据效率，并增强了 CRC。FD 节点和经典节点不能直接混在同一条总线通信。</p>`,
        answer: `<p><b>CAN FD（Flexible Data-rate）</b>有两个核心改进：</p>
<ul>
<li><b>可变数据速率</b>：仲裁段仍用较低的标称速率（如 500kbps），保证多节点仲裁时信号能可靠传播；数据段切换到高速率（如 2Mbps、5Mbps），提高有效带宽。</li>
<li><b>更大的数据场</b>：单帧最多 64 字节（经典 CAN 是 8 字节），减少协议开销和帧数量。</li>
</ul>
<p><b>为什么不能直接提高经典 CAN 的波特率：</b></p>
<ul>
<li>仲裁要求所有节点在同一时刻采样到相同电平，速率越高，传播延迟和振荡器容差占位时间的比例越大，长总线无法可靠仲裁；</li>
<li>经典 CAN 的 CRC 和帧格式没有为高速率做增强，误码率上升；</li>
<li>高速下总线拓扑、终端电阻、支线长度要求更严格。</li>
</ul>
<p>CAN FD 在帧内切换速率，兼顾了仲裁的可靠性和数据传输的效率。同时增强了 CRC（包括填充位计数），提高错误检测能力。</p>
<p><b>兼容性：</b>CAN FD 节点和经典 CAN 节点不能直接混在同一条总线上通信（FD 帧会被经典节点判为错误），需要网关或全部升级。</p>`,
        principle: `<p>CAN 的仲裁依赖“显性位覆盖隐性位”，要求信号在一位时间内传播到所有节点并被采样。位时间越短，允许的总线长度越短、对时钟精度要求越高。</p>
<p>CAN FD 把帧分成仲裁段和数据段，分别使用不同位速率，用“低速保证仲裁可靠、高速保证吞吐”的思路解决矛盾。</p>`,
        fig: {
          type: "table",
          title: "经典 CAN 与 CAN FD 对比",
          tag: "can fd",
          head: ["特性", "经典 CAN", "CAN FD"],
          rows: [
            ["最大数据", "8 字节", "64 字节"],
            ["速率", "固定（≤1Mbps）", "仲裁段低速、数据段高速"],
            ["CRC", "15/17 位", "17/21 位 + 填充计数"],
            ["兼容性", "—", "不能与经典节点同总线混跑"]
          ]
        },
        code: {
          lang: "c",
          title: "canfd_config.c",
          src: `#include "stm32g4xx_hal.h"

/* CAN FD 需要分别配置仲裁段和数据段的位时序（假设 FDCAN 内核时钟 80MHz） */
void canfd_init(FDCAN_HandleTypeDef *hfdcan)
{
    hfdcan->Init.FrameFormat = FDCAN_FRAME_FD_BRS;   /* 支持 FD 和速率切换 */
    hfdcan->Init.Mode        = FDCAN_MODE_NORMAL;
    hfdcan->Init.NominalPrescaler = 10;
    hfdcan->Init.NominalSyncJumpWidth = 1;
    hfdcan->Init.NominalTimeSeg1 = 13;
    hfdcan->Init.NominalTimeSeg2 = 2;
    /* 仲裁段：80MHz / 10 / (1+13+2) = 500kbps，采样点 87.5% */

    hfdcan->Init.DataPrescaler = 5;
    hfdcan->Init.DataSyncJumpWidth = 1;
    hfdcan->Init.DataTimeSeg1 = 5;
    hfdcan->Init.DataTimeSeg2 = 2;
    /* 数据段：80MHz / 5 / (1+5+2) = 2Mbps，采样点 75% */

    HAL_FDCAN_Init(hfdcan);
}`
        },
        codeNote: "数据段速率受收发器、总线长度和节点数限制，实际可用速率要留余量并通过误码测试验证。",
        apply: `<p>做电池管理系统时，采样数据量大，用 CAN FD 把 64 字节一帧传完，减少了帧数和总线负载。仲裁段仍用 500kbps，保证与整车网络兼容。</p>
<p>升级时要注意收发器是否支持 FD 速率，老收发器可能只能到 1Mbps，会成为瓶颈。</p>`,
        pitfalls: [
          "<b>以为 CAN FD 可以随便提速。</b>受收发器和总线物理限制。",
          "<b>和经典 CAN 节点混挂。</b>通信错误，总线异常。",
          "<b>只配数据段不配仲裁段。</b>无法正常仲裁。",
          "<b>忽略终端电阻。</b>高速下反射严重，误码率高。"
        ],
        follow: [
          ["CAN FD 的 BRS 位是什么？", "BRS（Bit Rate Switch）位指示从该位之后切换到数据段速率，帧结束前再切回仲裁速率。"],
          ["CAN FD 能走更长的总线吗？", "不能，高速数据段对总线长度要求更严格；长总线需要降低数据段速率或使用中继器。"]
        ]
      },

      {
        id: "M-16",
        chapter: "wired",
        topic: "lin",
        title: "LIN 总线是什么？为什么汽车上还需要它？",
        diff: "中级",
        freq: "进阶",
        type: "协议分析题",
        point: "LIN 是单线、低成本、主从结构的低速总线，用于车身非关键节点。",
        q: `<p>面试官：已经有 CAN 了，为什么车里还要用 LIN？它和 CAN 有什么分工？</p>`,
        exam: `<p>考察对车载网络分层的理解。能说出“成本、单线、主从、低速非关键”，就很好。</p>`,
        core: `<p>LIN 是低成本车载低速总线：单线加地、主从结构（一个主节点调度、从节点只响应）、最高 20kbps、基于 UART，普通串口外设就能实现。</p><p>汽车仍需要它，因为车门开关、后视镜、雨刷、座椅这类简单节点用 CAN 收发器和线束太浪费；LIN 单线、低成本收发器，把成本压到最低。分工是 CAN 连动力、底盘、电池等关键节点，LIN 作为 CAN 的子网挂在某个 CAN 节点下，通过网关交互。帧由主节点发同步间隔、同步字段和标识符，从节点按标识符回复或接收，带校验和。</p>`,
        answer: `<p><b>LIN（Local Interconnect Network）</b>是低成本的车载低速总线：</p>
<ul>
<li><b>单线</b>：一根信号线加地线，省线束成本；</li>
<li><b>主从结构</b>：一个主节点调度，从节点只响应，不需要仲裁；</li>
<li><b>速率低</b>：最高 20kbps，适合开关、车窗、雨刷、座椅等非关键控制；</li>
<li><b>基于 UART</b>：用普通串口外设就能实现，硬件成本低。</li>
</ul>
<p><b>为什么需要它：</b>CAN 收发器和线束成本较高，对于“车门开关、后视镜调节”这类简单节点，用 CAN 是浪费。LIN 用单线、低成本收发器（或直接 GPIO + 电阻）就能组网，把成本压到最低。</p>
<p><b>分工：</b>CAN 连接动力、底盘、电池等关键节点，要求实时性和可靠性；LIN 作为 CAN 的子网，挂在某个 CAN 节点下，负责车身低速外设。两者通过网关交互。</p>
<p><b>帧结构：</b>主节点发同步间隔 + 同步字段 + 标识符，从节点根据标识符回复数据或接收数据；有一校验和字段。</p>`,
        principle: `<p>LIN 用“时间触发”的主从调度代替 CAN 的“事件触发 + 仲裁”：主节点按调度表依次发起帧，从节点只在被寻址时响应，因此不需要复杂的仲裁逻辑，硬件可以做得非常简单。</p>
<p>单线传输靠电平相对于地的变化，速率低所以对阻抗和终端要求不严，线束成本低。</p>`,
        fig: {
          type: "table",
          title: "LIN 与 CAN 的定位",
          tag: "lin",
          head: ["维度", "LIN", "CAN"],
          rows: [
            ["线数", "单线", "双绞线（CANH/CANL）"],
            ["速率", "≤20 kbps", "≤1 Mbps（FD 更高）"],
            ["拓扑", "主从", "多主仲裁"],
            ["成本", "低", "较高"],
            ["典型用途", "车窗、雨刷、座椅", "动力、底盘、电池"]
          ]
        },
        code: {
          lang: "c",
          title: "lin_frame.c",
          src: `#include <stdint.h>

/* LIN 帧：同步间隔 + 同步字段 0x55 + PID + 数据 + 校验和 */
#define LIN_SYNC_BREAK  0x00
#define LIN_SYNC_FIELD  0x55

/* 计算 PID：ID 低 6 位 + 两个奇偶校验位 */
uint8_t lin_pid(uint8_t id)
{
    uint8_t id6 = id & 0x3Fu;
    uint8_t p0 = ((id6 >> 0) ^ (id6 >> 1) ^ (id6 >> 2) ^ (id6 >> 4)) & 1u;
    uint8_t p1 = ~(((id6 >> 1) ^ (id6 >> 3) ^ (id6 >> 4) ^ (id6 >> 5)) & 1u) & 1u;
    return (uint8_t)(id6 | (p0 << 6) | (p1 << 7));
}

/* 增强型校验和：包含 PID */
uint8_t lin_checksum(uint8_t pid, const uint8_t *data, uint8_t len)
{
    uint16_t sum = pid;
    for (uint8_t i = 0; i < len; i++) {
        sum += data[i];
        if (sum > 0xFF) sum -= 0xFF;
    }
    return (uint8_t)(~sum & 0xFF);
}`
        },
        codeNote: "LIN 的校验和分经典型和增强型，增强型包含 PID，新设计一般用增强型。",
        apply: `<p>做车窗控制时，主节点用 LIN 调度四个车门的从节点，每个从节点负责开关采集和电机驱动。线束只有一根信号线，比 CAN 方案省很多成本。</p>
<p>调试 LIN 需要专用的收发器或分析仪，普通串口只能看波形，无法正确解析断帧和同步字段。</p>`,
        pitfalls: [
          "<b>把 LIN 当 CAN 用。</b>速率和可靠性都不满足关键控制。",
          "<b>校验和类型选错。</b>通信一直校验失败。",
          "<b>主节点调度表冲突。</b>帧碰撞，数据错乱。",
          "<b>忽略总线终端。</b>长线束反射导致误码。"
        ],
        follow: [
          ["LIN 的主节点可以是多个吗？", "标准规定单主多从，同一时刻只能有一个主节点调度；多主会导致总线冲突。"],
          ["LIN 能传多长的数据？", "每帧最多 8 字节，和经典 CAN 相同；帧长度由标识符对应的配置决定。" ]
        ]
      },

      {
        id: "M-17",
        chapter: "wired",
        topic: "modbus",
        title: "Modbus RTU 的帧格式是怎样的？CRC 怎么算？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "地址 + 功能码 + 数据 + CRC16，帧间隔 3.5 字符区分帧边界，从站按地址响应。",
        q: `<p>面试官：让你用串口实现一个 Modbus RTU 从站，帧怎么组织？怎么判断一帧结束？</p>`,
        exam: `<p>考察工业协议的实际实现。能说出 3.5 字符间隔、CRC16 多项式、功能码和异常响应，就很好。</p>`,
        core: `<p>帧格式：从站地址 1B + 功能码 1B + 数据 N B + CRC16 2B（低字节在前）。地址 0 是广播，从站执行但不响应；1~247 是单播。功能码如 <code>0x03</code> 读保持寄存器、<code>0x06</code> 写单个寄存器、<code>0x10</code> 写多个。CRC16 多项式 <code>0xA001</code>，初值 0xFFFF。</p><p>RTU 靠静默间隔定界：帧内字符间隔不超过 1.5 个字符时间，帧间至少 3.5 个字符时间，9600bps 下约 4ms；实现用定时器，每收一个字节重置，超时就认为帧结束。从站出错时功能码最高位置 1，后面跟异常码。</p>`,
        answer: `<p><b>帧格式：</b></p>
<p><code>[从站地址 1B][功能码 1B][数据 N B][CRC16 2B（低字节在前）]</code></p>
<ul>
<li>地址 0 是广播，所有从站执行但不响应；1~247 是单播地址；</li>
<li>功能码如 0x03 读保持寄存器、0x06 写单个寄存器、0x10 写多个寄存器；</li>
<li>CRC16 多项式 0xA001（反向的 0x8005），初值 0xFFFF，低字节先发。</li>
</ul>
<p><b>帧边界：</b>RTU 用<b>静默间隔</b>判断帧结束——帧内字符间隔不超过 1.5 个字符时间，帧间至少 3.5 个字符时间。在 9600bps 下，3.5 字符约 4ms。</p>
<p>实现时通常用定时器：每收到一个字节重置计时，超过 3.5 字符时间就认为一帧结束。也有用固定长度 + CRC 校验辅助判断。</p>
<p><b>异常响应：</b>从站出错时，功能码最高位置 1（如 0x83），后面跟一个异常码（非法功能、非法地址、非法数据值等）。</p>`,
        principle: `<p>Modbus 是主从协议，从站不会主动发送，只有收到寻址自己的请求才响应。这避免了总线冲突，也让实现简单。</p>
<p>CRC16 能检测单比特、双比特和突发错误，配合静默间隔的帧同步，构成基本的可靠性保障。</p>`,
        fig: {
          type: "table",
          title: "Modbus RTU 常用功能码",
          tag: "modbus",
          head: ["功能码", "作用", "请求数据", "响应数据"],
          rows: [
            ["0x01", "读线圈", "起始地址 + 数量", "字节数 + 位数据"],
            ["0x03", "读保持寄存器", "起始地址 + 数量", "字节数 + 寄存器值"],
            ["0x06", "写单个寄存器", "地址 + 值", "回显请求"],
            ["0x10", "写多个寄存器", "地址 + 数量 + 值", "地址 + 数量"]
          ]
        },
        code: {
          lang: "c",
          title: "modbus_crc.c",
          src: `#include <stdint.h>

/* Modbus CRC16：多项式 0xA001，初值 0xFFFF */
uint16_t modbus_crc16(const uint8_t *buf, uint16_t len)
{
    uint16_t crc = 0xFFFFu;

    for (uint16_t i = 0; i < len; i++) {
        crc ^= buf[i];
        for (uint8_t bit = 0; bit < 8; bit++) {
            if (crc & 1u) {
                crc = (uint16_t)((crc >> 1) ^ 0xA001u);
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

/* 校验一帧：最后两字节为 CRC，低字节在前 */
int modbus_check(const uint8_t *frame, uint16_t len)
{
    if (len < 4) return -1;
    uint16_t calc = modbus_crc16(frame, (uint16_t)(len - 2));
    uint16_t recv = (uint16_t)(frame[len - 2] | (frame[len - 1] << 8));
    return calc == recv ? 0 : -1;
}`
        },
        codeNote: "CRC 表法比逐位计算快很多，MCU 上如果帧率高，可以用 256 项查表。",
        apply: `<p>我做过的电表采集网关，用一个定时器实现 3.5 字符超时，配合环形缓冲区组帧，能稳定处理多台从站轮询。</p>
<p>调试时先用 Modbus Poll 等工具验证从站响应，再排查 RS485 方向和终端电阻问题，能少走很多弯路。</p>`,
        pitfalls: [
          "<b>CRC 高低字节顺序错。</b>帧永远校验失败。",
          "<b>用固定长度判断帧结束。</b>不同功能码长度不同，容易错。",
          "<b>忽略 3.5 字符间隔。</b>粘包或断帧。",
          "<b>RS485 方向切换太慢。</b>最后几个字节发不出去。"
        ],
        follow: [
          ["Modbus TCP 和 RTU 有什么区别？", "TCP 去掉了 CRC 和地址，改用 MBAP 报文头（事务号、协议号、长度、单元号），跑在以太网上，帧边界由 TCP 保证。"],
          ["为什么 Modbus 寄存器地址从 0 开始但文档常写 40001？", "40001 是“保持寄存器区”的约定编号，实际报文里的地址是 0 基偏移，两者相差 1，实现时要确认文档用的是哪种。"]
        ]
      },

      {
        id: "M-18",
        chapter: "wireless",
        topic: "gatt",
        title: "BLE 的 GATT 是什么？服务和特征值怎么组织？",
        diff: "高级",
        freq: "中频",
        type: "协议分析题",
        point: "GATT 用服务、特征值、描述符组织数据，ATT 负责属性读写和通知。",
        q: `<p>面试官：BLE 通信时手机怎么知道设备有哪些数据？GATT 里的服务、特征值、UUID 是什么关系？</p>`,
        exam: `<p>考察对 BLE 应用层模型的理解。能说清“服务包含特征值、特征值有值和描述符、通过 UUID 识别”，就很好。</p>`,
        core: `<p>GATT 定义 BLE 数据怎么组织和交换：服务（一组相关功能，UUID 标识）→ 特征值（具体数据，含值、读/写/通知属性和描述符）→ 描述符（单位、格式、CCCD 等）。标准服务用 16 位短 UUID（电池 0x180F），自定义用 128 位。手机通过发现服务、发现特征值了解设备能力。</p><p>底层 ATT 负责读、写、通知、指示，GATT 在其上做层次组织。通知不需要确认、快但可能丢；指示需要客户端确认、可靠但慢。CCCD 是客户端订阅通知的开关。</p>`,
        answer: `<p><b>GATT（Generic Attribute Profile）</b>定义了 BLE 数据如何组织和交换，核心概念：</p>
<ul>
<li><b>服务（Service）</b>：一组相关功能的集合，如电池服务、心率服务。用 UUID 标识。</li>
<li><b>特征值（Characteristic）</b>：服务里的具体数据项，包含值、属性（读/写/通知）和描述符。</li>
<li><b>描述符（Descriptor）</b>：描述特征值的元数据，如单位、格式、客户端配置（CCCD，用于开关通知）。</li>
</ul>
<p><b>UUID：</b>标准服务用 16 位短 UUID（如 0x180F 电池服务），自定义服务用 128 位 UUID。手机通过发现服务、发现特征值来了解设备能力。</p>
<p><b>ATT（Attribute Protocol）</b>是底层协议，负责读、写、通知、指示等操作。GATT 建立在 ATT 之上，把属性组织成服务/特征值的层次。</p>
<p><b>通知（Notify）和指示（Indicate）：</b>服务器主动推送数据。通知不需要确认，速度快但可能丢；指示需要客户端确认，可靠但慢。</p>
<p><b>CCCD：</b>客户端写这个描述符来订阅通知，服务器才会推送。</p>`,
        principle: `<p>BLE 把数据抽象成“属性”，每个属性有句柄、类型（UUID）、值、权限。ATT 用句柄寻址，GATT 用 UUID 和层次关系让应用能发现和理解这些属性。</p>
<p>这种设计让不同厂商的设备可以用统一方式被手机发现和访问，不需要预先约定内存布局。</p>`,
        fig: {
          type: "layers",
          title: "GATT 的层次结构",
          tag: "ble gatt",
          items: [
            { tag: "服务", t: "电池服务 0x180F", d: "一组相关功能" },
            { tag: "特征值", t: "电量 0x2A19", d: "具体数据 + 读写/通知属性" },
            { tag: "描述符", t: "CCCD / 单位 / 格式", d: "元数据和订阅开关" },
            { tag: "ATT", t: "读 / 写 / 通知 / 指示", d: "底层属性操作" }
          ]
        },
        code: {
          lang: "c",
          title: "ble_gatt.c",
          src: `#include <stdint.h>
#include <string.h>

/* 简化的 GATT 特征值定义（实际使用协议栈 API） */
typedef struct {
    uint16_t uuid;
    uint8_t  value[20];
    uint8_t  len;
    uint16_t cccd;          /* 客户端配置：bit0 通知，bit1 指示 */
} gatt_char_t;

static gatt_char_t battery_level = {
    .uuid = 0x2A19,
    .len  = 1,
    .cccd = 0
};

/* 电量变化时推送通知 */
void battery_notify(uint8_t level)
{
    battery_level.value[0] = level;

    if (battery_level.cccd & 0x0001) {
        /* 调用协议栈的通知接口，实际 API 依厂商而定 */
        ble_gatt_server_notify(0x2A19, &level, 1);
    }
}`
        },
        codeNote: "通知频率受连接间隔限制，高频通知会显著增加功耗，需要在实时性和续航之间权衡。",
        apply: `<p>做 BLE 传感器时，我把配置参数做成可写特征值，实时数据做成通知特征值，手机订阅后按连接间隔推送。CCCD 没订阅时坚决不推，能省不少电。</p>
<p>自定义 UUID 用 128 位，避免与标准服务冲突；文档里写清每个特征值的格式和单位，方便 App 同事对接。</p>`,
        pitfalls: [
          "<b>不检查 CCCD 就发通知。</b>手机没订阅，数据白推，浪费功耗。",
          "<b>特征值长度超过 MTU。</b>需要分包或协商更大 MTU。",
          "<b>混淆通知和指示。</b>通知可能丢，关键数据要用指示。",
          "<b>UUID 冲突。</b>自定义服务用了标准 UUID，手机解析错误。"
        ],
        follow: [
          ["BLE 的 MTU 默认是多少？", "ATT 默认 MTU 23 字节，有效载荷 20 字节；可以协商到 247 字节甚至更大，减少分包开销。"],
          ["连接间隔对功耗有什么影响？", "间隔越长，唤醒次数越少，功耗越低，但数据延迟越大；需要在延迟和续航之间权衡，通常 100ms~1s。"]
        ]
      },

      {
        id: "M-19",
        chapter: "wireless",
        topic: "net",
        title: "MQTT 的 QoS 有哪几级？遗嘱消息和保留消息有什么用？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "QoS 0/1/2 对应最多一次、至少一次、恰好一次；遗嘱处理异常断线，保留消息提供最新状态。",
        q: `<p>面试官：设备上报数据用 MQTT，QoS 选几？设备突然掉线，服务器怎么知道？</p>`,
        exam: `<p>考察对 MQTT 可靠性机制的理解。能说清三级 QoS 的握手过程、遗嘱和保留消息的用途，就很好。</p>`,
        core: `<p>QoS 0 最多一次，发完不管、可能丢，开销最小，适合高频遥测；QoS 1 至少一次，等 PUBACK，没收到就重发、可能重复，控制指令常用，应用层要幂等；QoS 2 恰好一次，四次握手 PUBLISH→PUBREC→PUBREL→PUBCOMP，不重复但开销最大，适合计费和关键配置。</p><p>遗嘱消息在连接时注册，异常断开时 broker 自动发布，用来通知设备离线；保留消息让 broker 保存该主题最后一条，新订阅者一订阅就拿到当前状态。传感器周期数据用 QoS 0/1，控制指令用 QoS 1 并在应用层去重，状态主题设 retain。</p>`,
        answer: `<p><b>QoS 三级：</b></p>
<ul>
<li><b>QoS 0（最多一次）</b>：发出去就不管，可能丢，开销最小。适合高频、可容忍丢失的遥测数据。</li>
<li><b>QoS 1（至少一次）</b>：发布后等待 PUBACK，没收到就重发，可能重复。适合大多数控制指令，应用层需要做幂等。</li>
<li><b>QoS 2（恰好一次）</b>：四次握手（PUBLISH → PUBREC → PUBREL → PUBCOMP），保证不重复，开销最大。适合计费、关键配置。</li>
</ul>
<p><b>遗嘱消息（Will）</b>：客户端连接时预先注册一条消息，如果异常断开（网络中断、掉电）， broker 会自动发布这条消息。用于让服务器知道设备离线，触发告警。</p>
<p><b>保留消息（Retain）</b>：发布时设置 retain 标志，broker 会保存该主题的最后一条消息，新订阅者一订阅就能立即收到当前状态，不用等下一次发布。</p>
<p><b>实际选择：</b>传感器周期数据用 QoS 0 或 1；控制指令用 QoS 1 并在应用层去重；设备状态主题设置 retain，方便新上线的客户端获取最新状态。</p>`,
        principle: `<p>MQTT 是发布/订阅模型，客户端和 broker 之间通过 TCP 连接。QoS 在 TCP 之上提供应用层的可靠性语义，处理“连接断开重连后消息是否要重发”的问题。</p>
<p>遗嘱依赖 broker 检测连接异常（Keep Alive 超时或 TCP 断开），所以 Keep Alive 设置要合理，太长会导致离线发现慢。</p>`,
        fig: {
          type: "table",
          title: "MQTT QoS 对比",
          tag: "mqtt",
          head: ["QoS", "语义", "握手", "开销"],
          rows: [
            ["0", "最多一次", "无", "最低"],
            ["1", "至少一次", "PUBLISH / PUBACK", "中"],
            ["2", "恰好一次", "四次握手", "最高"]
          ]
        },
        code: {
          lang: "c",
          title: "mqtt_publish.c",
          src: `#include <stdint.h>

/* 伪代码：不同 QoS 的发布方式 */
int mqtt_report_temperature(float temp)
{
    char payload[32];
    int n = snprintf(payload, sizeof(payload), "%.2f", temp);

    /* 周期遥测：允许丢，QoS 0，不保留 */
    return mqtt_publish("dev/123/temp", payload, n, /*qos*/0, /*retain*/0);
}

int mqtt_report_status(int online)
{
    /* 设备状态：保留消息，新订阅者立即拿到最新值 */
    const char *s = online ? "online" : "offline";
    return mqtt_publish("dev/123/status", s, strlen(s), /*qos*/1, /*retain*/1);
}

/* 连接时注册遗嘱：异常断线由 broker 发布 */
void mqtt_connect_with_will(void)
{
    mqtt_will_t will = {
        .topic   = "dev/123/status",
        .payload = "offline",
        .qos     = 1,
        .retain  = 1
    };
    mqtt_connect("broker.example.com", 1883, &will);
}`
        },
        codeNote: "QoS 1 可能重复，服务端处理指令时要按消息 ID 或业务键做幂等，避免重复执行。",
        apply: `<p>我做共享设备时，状态主题用 retain + 遗嘱：设备上线发布 online，掉线由 broker 自动发 offline，App 能实时看到在线状态，不需要额外的心跳查询。</p>
<p>控制指令用 QoS 1，服务端带唯一指令 ID，设备执行后回报结果，重复收到同一 ID 就忽略。</p>`,
        pitfalls: [
          "<b>所有消息都用 QoS 2。</b>开销大，吞吐低。",
          "<b>QoS 1 不做幂等。</b>重发导致指令重复执行。",
          "<b>不设遗嘱。</b>设备掉线后服务器一直以为在线。",
          "<b>Keep Alive 太长。</b>离线发现延迟大。"
        ],
        follow: [
          ["MQTT 和 HTTP 有什么区别？", "MQTT 是长连接、发布订阅、头部开销小，适合设备与服务端双向通信；HTTP 是请求响应、短连接、头部大，适合偶尔查询。"],
          ["Clean Session 有什么用？", "设为 0 时 broker 会保存订阅和离线消息，重连后继续；设为 1 时每次连接都是全新会话，不保留状态。" ]
        ]
      },

      {
        id: "M-20",
        chapter: "wireless",
        topic: "lora",
        title: "LoRa 和 NB-IoT 有什么区别？各自适合什么场景？",
        diff: "中级",
        freq: "中频",
        type: "技术选型题",
        point: "LoRa 自组网、免授权、距离远但速率低；NB-IoT 运营商网络、覆盖好、需要 SIM 卡。",
        q: `<p>面试官：做远程抄表，选 LoRa 还是 NB-IoT？要考虑哪些因素？</p>`,
        exam: `<p>考察无线通信选型能力。能说出网络归属、功耗、覆盖、成本、实时性几个维度，就很好。</p>`,
        core: `<p>LoRa 是非授权频段（470/868MHz），要自建网关；扩频调制灵敏度高，视距可达几公里到十几公里；速率几百 bps 到几十 kbps，适合小包；无 SIM、无流量费，但网关要自己部署维护。NB-IoT 是运营商蜂窝网，要 SIM 和套餐，借基站覆盖广、室内地下也能通，速率更高、支持 IP，功耗低但建链释放有开销。</p><p>选型：广域分散、没有自建网关条件选 NB-IoT；园区厂区可控选 LoRa；再综合看流量费、实时性、数据量和供电。</p>`,
        answer: `<p><b>LoRa：</b></p>
<ul>
<li>非授权频段（如 470MHz、868MHz），需要自建网关；</li>
<li>扩频调制，灵敏度高，视距可达几公里到十几公里；</li>
<li>速率很低（几百 bps 到几十 kbps），适合小数据包；</li>
<li>无 SIM 卡、无流量费，但需要自己部署和维护网关。</li>
</ul>
<p><b>NB-IoT：</b></p>
<ul>
<li>运营商蜂窝网络，需要 SIM 卡和流量套餐；</li>
<li>覆盖广（借助基站），室内和地下也能通信；</li>
<li>速率比 LoRa 高，支持 IP 协议；</li>
<li>功耗低，但连接建立和释放有开销，不适合极高频上报。</li>
</ul>
<p><b>选型维度：</b></p>
<ul>
<li><b>覆盖</b>：分散在广域、无自建网关条件 → NB-IoT；园区/厂区可控 → LoRa；</li>
<li><b>成本</b>：LoRa 无流量费但网关贵；NB-IoT 有持续流量费；</li>
<li><b>实时性</b>：LoRa 自组网延迟可控；NB-IoT 受网络调度影响；</li>
<li><b>数据量</b>：小包低频两者都行，大包选 NB-IoT 或 4G；</li>
<li><b>供电</b>：两者都支持低功耗，但 NB-IoT 的寻呼周期影响待机电流。</li>
</ul>`,
        principle: `<p>LoRa 用扩频技术把窄带信号扩展到更宽带宽，换取更高的灵敏度和抗干扰能力，代价是速率低。它工作在非授权频段，所以必须自己组网。</p>
<p>NB-IoT 是蜂窝标准，复用运营商基站和核心网，终端只负责收发，网络侧负责移动性和连接管理。</p>`,
        fig: {
          type: "table",
          title: "LoRa 与 NB-IoT 对比",
          tag: "lpwan",
          head: ["维度", "LoRa", "NB-IoT"],
          rows: [
            ["网络", "自建网关", "运营商"],
            ["频段", "非授权", "授权蜂窝"],
            ["速率", "低", "中低"],
            ["覆盖", "视距远，依赖网关", "广，室内较好"],
            ["费用", "无流量费", "有 SIM 和流量费"]
          ]
        },
        apply: `<p>园区内的水电表用 LoRa，自建两个网关就能覆盖，没有持续流量费；分散在城市的设备用 NB-IoT，不依赖现场网络维护。</p>
<p>无论选哪种，都要做链路预算和现场信号测试，不能只看理论距离。</p>`,
        pitfalls: [
          "<b>只看距离不看环境。</b>城市遮挡下 LoRa 距离大幅缩短。",
          "<b>忽略流量费和 SIM 管理。</b>大规模部署时成本可观。",
          "<b>用 LoRa 传大文件。</b>速率太低，传输时间过长。",
          "<b>NB-IoT 频繁上报。</b>连接建立开销大，功耗上升。"
        ],
        follow: [
          ["LoRaWAN 是什么？", "基于 LoRa 物理层的 MAC 层协议，定义了入网、帧格式、自适应速率等，让不同厂商的设备和网关可以互通。"],
          ["NB-IoT 支持移动性吗？", "支持连接态移动，但不支持切换，跨小区时需要重建连接，不适合高速移动场景。" ]
        ]
      },

      {
        id: "M-21",
        chapter: "wireless",
        topic: "eth",
        title: "以太网的 MAC 和 PHY 是怎么分工的？TCP 三次握手为什么需要三次？",
        diff: "高级",
        freq: "中频",
        type: "协议分析题",
        point: "MAC 负责帧封装和 CRC，PHY 负责物理编码和收发；三次握手同步双方序号并确认双向可达。",
        q: `<p>面试官：嵌入式以太网接口里 MAC 和 PHY 分别做什么？为什么 TCP 建立连接要三次握手，两次不行吗？</p>`,
        exam: `<p>考察网络分层和协议设计。能说清 MAC/PHY 的分界（MII/RMII 接口），以及三次握手确认双方收发能力，就很好。</p>`,
        core: `<p>MAC 在数据链路层，负责帧封装解封装、地址过滤、CRC 校验、半双工 CSMA/CD，通常集成在 MCU 内；PHY 在物理层，负责编码（4B/5B、8B/10B）、串并转换、驱动差分、自协商，通常是外部芯片；两者用 MII（4 位并行）或 RMII（2 位 + 50MHz 参考时钟）连接。</p><p>三次握手：客户端 SYN(seq=x) → 服务器 SYN+ACK(seq=y, ack=x+1) → 客户端 ACK(ack=y+1)。两次不够，因为要确认双方收发能力都正常、同步双方初始序号、防止历史重复的 SYN 建立无效连接。</p>`,
        answer: `<p><b>MAC 和 PHY 的分工：</b></p>
<ul>
<li><b>MAC（Media Access Control）</b>：数据链路层，负责帧的封装/解封装、地址过滤、CRC 校验、CSMA/CD（半双工）；通常集成在 MCU 内部。</li>
<li><b>PHY（Physical Layer）</b>：物理层，负责编码（如 4B/5B、8B/10B）、串并转换、驱动差分信号、自协商；通常是外部芯片。</li>
<li>两者通过 <b>MII/RMII</b> 接口连接：MII 是 4 位并行，RMII 是 2 位，引脚更少但需要 50MHz 参考时钟。</li>
</ul>
<p><b>TCP 三次握手：</b></p>
<ol>
<li>客户端发 SYN，带初始序号 seq=x；</li>
<li>服务器回 SYN+ACK，seq=y，ack=x+1；</li>
<li>客户端回 ACK，ack=y+1。</li>
</ol>
<p><b>为什么不能两次：</b></p>
<ul>
<li>需要确认<b>双方的发送和接收能力都正常</b>：两次只能让服务器确认客户端能发、自己能收，但客户端还不知道服务器能不能发；</li>
<li>需要同步<b>双方的初始序号</b>，防止旧连接的重复报文被误认为新连接的数据；</li>
<li>防止历史重复的 SYN 导致服务器建立无效连接。</li>
</ul>`,
        principle: `<p>MAC 和 PHY 的分层让数字逻辑和模拟电路解耦：MAC 处理协议逻辑，PHY 处理电气和编码，换 PHY 芯片不影响上层协议。</p>
<p>TCP 是可靠传输协议，序号用于去重和排序。三次握手是建立双向序号同步的最小次数：双方各发一个初始序号，并各确认对方一次。</p>`,
        fig: {
          type: "layers",
          title: "以太网接口的分层",
          tag: "ethernet",
          items: [
            { tag: "应用", t: "TCP/IP 协议栈", d: "HTTP、MQTT 等" },
            { tag: "MAC", t: "帧封装、CRC、地址过滤", d: "通常在 MCU 内" },
            { tag: "MII/RMII", t: "并行数据 + 时钟", d: "MAC 与 PHY 的接口" },
            { tag: "PHY", t: "编码、驱动、自协商", d: "外部芯片，接变压器" }
          ]
        },
        code: {
          lang: "c",
          title: "eth_init.c",
          src: `#include "stm32f4xx_hal.h"

/* RMII 接口初始化：需要 50MHz 参考时钟 */
void eth_rmii_init(void)
{
    /* 1. 使能 ETH 和 GPIO 时钟 */
    __HAL_RCC_ETHMAC_CLK_ENABLE();
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();

    /* 2. 配置 RMII 引脚：REF_CLK、MDIO、MDC、CRS_DV、RXD0/1、TX_EN、TXD0/1 */
    /* 具体引脚查芯片数据手册的 ETH 复用表 */

    /* 3. 配置 MAC：速率、双工、CRC 校验 */
    heth.Init.MACAddr[0] = 0x02;   /* 本地管理地址 */
    heth.Init.MediaInterface = HAL_ETH_RMII_MODE;
    heth.Init.RxMode = ETH_RXPOLLING_MODE;
    heth.Init.ChecksumMode = ETH_CHECKSUM_BY_HARDWARE;
    HAL_ETH_Init(&heth);
}`
        },
        codeNote: "RMII 的 50MHz 时钟必须由外部晶振或 MCU 的 MCO 提供，时钟不稳会导致丢包和协商失败。",
        apply: `<p>做工业网关时，MAC 用 MCU 内置，PHY 用外部芯片，通过 RMII 连接。调试时先看 PHY 的自协商状态和链路指示灯，再排查 MAC 配置和协议栈。</p>
<p>TCP 握手失败常见原因是防火墙、NAT 或服务器 backlog 满，不一定是设备问题，抓包能快速定位。</p>`,
        pitfalls: [
          "<b>RMII 参考时钟不匹配。</b>链路不稳定或无法建立。",
          "<b>MAC 地址冲突。</b>网络中出现重复地址，通信异常。",
          "<b>忽略变压器和终端匹配。</b>信号完整性差，丢包。",
          "<b>以为两次握手就够。</b>无法确认双向能力和序号同步。"
        ],
        follow: [
          ["MII 和 RMII 怎么选？", "RMII 引脚少（约 9 根），适合 IO 紧张的 MCU，但需要 50MHz 时钟；MII 引脚多（约 16 根），时序裕量更大。"],
          ["TCP 四次挥手为什么是四次？", "TCP 是全双工，每个方向都要单独关闭：一方发 FIN，另一方 ACK；等对方数据发完再发 FIN，再 ACK，共四次。" ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第三批：总线故障处理与 SPI 实现细节） ---------------- */
  EIK.extend("communication", {
    chapters: [
      {
        id: "wireless",
        topics: [
          { id: "wifi", title: "Wi-Fi 模式与配网" }
        ]
      }
    ],
    questions: [
      {
        id: "M-22",
        chapter: "wired",
        topic: "i2c",
        title: "I2C 一般跑多快？传输中被中断打断会丢数据吗？丢了怎么恢复？",
        diff: "高级",
        freq: "中频",
        type: "故障排查题",
        point: "速率档位与总线电容限制、软硬 I2C 在中断下的行为差异，以及 NACK、仲裁丢失、SDA 卡死的恢复手段。",
        q: `<p>面试官：你项目里 I2C 跑多少速率？如果传输过程中被中断打断，会不会丢包？真丢了你怎么恢复？</p>`,
        exam: `<p>考察对 I2C 同步机制的理解深度。能区分“硬件外设被打断”和“软件模拟被打断”，并给出总线级恢复手段，就到位了。</p>`,
        core: `<p>速率档位：标准 100kbps、快速 400kbps、快速+ 1Mbps、高速 3.4Mbps。实际能跑多快受总线电容限制（规范小于 400pF），线长、设备多、上拉阻值大都会让上升沿变缓，只能降速或减小上拉。</p><p>会被打断吗：硬件 I2C 是状态机，字节之间有 SCL 低电平可以停顿，被中断不影响总线，只要不在传输中改配置、不关时钟就不丢数据；软件模拟靠延时翻转 GPIO，字节中间被打断会出现不均匀的 SCL 长间隔，从机可能判超时或采错位。</p><p>丢包恢复：从机 NACK 多半是地址错、从机忙或 EEPROM 写周期未完，延时后重试（写周期典型 5ms）；多主仲裁丢失硬件会自动重发；总线卡死则把 SCL 切成 GPIO 打最多 9 个时钟让从机释放 SDA，补一个 STOP 再复位外设。</p>`,
        answer: `<p><b>速率档位：</b>标准模式 100kbps、快速模式 400kbps、快速模式+ 1Mbps、高速模式 3.4Mbps。实际能跑多快不只看器件支持，还受总线电容限制（规范要求小于 400pF）：线长、挂的设备多、上拉阻值大，都会让上升沿变缓，这时只能降速或减小上拉。</p>
<p><b>会不会丢：分两种实现看。</b></p>
<ul>
<li><b>硬件 I2C</b>：本身就是状态机，每个字节之间有 SCL 低电平可停顿，CPU 被中断打断不影响总线，只要不在传输中改配置、不关 I2C 时钟，数据不会丢。</li>
<li><b>软件模拟 I2C</b>：靠延时翻转 GPIO，如果字节传输中间被中断打断，SCL 会出现不均匀的长间隔，部分从机会判超时，或者时序错位导致从机采错位，这才是真正会“丢”的场景。关键段要关中断，或干脆改用硬件外设。</li>
</ul>
<p><b>丢包的三类原因和恢复：</b></p>
<ul>
<li><b>从机回 NACK</b>：地址不对、从机忙、EEPROM 写周期未完成。处理是延时后重试（写周期典型 5ms），而不是立刻重发。</li>
<li><b>多主仲裁丢失</b>：硬件 I2C 会自动检测并重发，软件模拟要自己判断 SDA 实际电平与期望不符后退出重来。</li>
<li><b>总线卡死（SDA 一直被拉低）</b>：主机把 SCL 切成 GPIO 手动打最多 9 个时钟，让从机把剩余位发完并释放 SDA，再补一个 STOP，最后复位 I2C 外设。</li>
</ul>`,
        principle: `<p>I2C 是同步总线，数据由 SCL 同步，主机可以在任意字节边界拉低 SCL 无限期停顿（时钟延展），所以“被打断”在硬件实现下本质上是安全的。真正危险的是三件事：软件模拟时的时序精度、从机进入异常状态后持续拉低 SDA，以及没有超时机制导致的死等。</p>
<p>工程上必须给每次传输加超时。HAL 库的 I2C 传输有 timeout 参数，但很多项目直接用 HAL_MAX_DELAY，一旦总线异常就永久阻塞，表现出来就是“程序卡死在某一行”。</p>`,
        fig: {
          type: "table",
          title: "I2C 速率档位",
          tag: "i2c-speed",
          head: ["模式", "速率", "工程限制"],
          rows: [
            ["标准模式", "100 kbps", "兼容性最好，长走线也稳"],
            ["快速模式", "400 kbps", "最常用，多数传感器支持"],
            ["快速模式+", "1 Mbps", "需要较小上拉与较低总线电容"],
            ["高速模式", "3.4 Mbps", "需要额外电流源，主从都要支持"]
          ]
        },
        code: {
          lang: "c",
          title: "i2c_retry.c",
          src: `/* 带超时、分类重试和总线恢复的 I2C 写寄存器 */
int i2c_write_reg(uint8_t addr, uint8_t reg, uint8_t val)
{
    uint8_t buf[2] = { reg, val };

    for (int retry = 0; retry < 3; retry++) {
        /* 关键：给超时，不能用 HAL_MAX_DELAY */
        if (HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(addr << 1),
                                    buf, 2u, 5u) == HAL_OK) {
            return 0;
        }

        if (hi2c1.ErrorCode == HAL_I2C_ERROR_AF) {
            /* 从机 NACK：多半是 EEPROM 写周期没结束，等一会再试 */
            HAL_Delay(5);
            continue;
        }
        /* 其它错误（BUSY 卡死、仲裁丢失）：先把总线救回来 */
        i2c_bus_recover();
    }
    return -1;
}

/* SDA 被从机拉死：手动打 9 个时钟 + 补 STOP + 复位外设 */
void i2c_bus_recover(void)
{
    GPIO_InitTypeDef g = {0};

    __HAL_I2C_DISABLE(&hi2c1);

    g.Pin   = GPIO_PIN_6 | GPIO_PIN_7;   /* SCL / SDA */
    g.Mode  = GPIO_MODE_OUTPUT_OD;
    g.Pull  = GPIO_PULLUP;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOB, &g);

    for (int i = 0; i < 9; i++) {        /* 最多 9 个时钟释放 SDA */
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);
        HAL_Delay(1);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
        HAL_Delay(1);
    }

    /* 补一个 STOP：SCL 高电平期间 SDA 由低变高 */
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_RESET);
    HAL_Delay(1);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
    HAL_Delay(1);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);
    HAL_Delay(1);

    HAL_I2C_DeInit(&hi2c1);              /* 重新初始化状态机 */
    HAL_I2C_Init(&hi2c1);
}`
        },
        codeNote: "9 个时钟的来源：从机可能卡在发送一个字节的任意一位，最多 8 位数据加 1 位应答，所以 9 个时钟足够让它把整个字节吐完并释放 SDA。发完必须补 STOP，否则从机仍认为自己在传输中。",
        apply: `<p>我做过一个多传感器板，8 个 I2C 器件挂在同一条总线上，最初没加超时，某次上电时序不对导致某个传感器把 SDA 拉死，整机卡在初始化里。后来给所有 I2C 操作加了 5ms 超时 + 三级重试 + 总线恢复，问题再没复现。</p>
<p>另外速率不要一味求快：同样的 400kbps 配置，换成长排线后误码率明显上升，降到 100kbps 才稳定。手册里的 400pF 是硬约束，不是建议值。</p>`,
        pitfalls: [
          "<b>用 HAL_MAX_DELAY 做 I2C 超时。</b>总线一异常就永久阻塞，看门狗复位后仍会复现。",
          "<b>软件模拟 I2C 不关中断。</b>字节中间被打断会造成时序错位，低速器件上偶发、很难查。",
          "<b>NACK 立刻重发。</b>EEPROM 写周期内重发必然还是 NACK，应该延时后重试。",
          "<b>总线卡死只做软件重试。</b>不发出 9 个时钟，从机的移位寄存器不会释放 SDA，重试多少次都没用。"
        ],
        follow: [
          ["I2C 上拉电阻怎么选？", "按总线电容和上升时间算：t_r ≈ 0.8473 × R × C，400kbps 下 t_r 要小于 300ns。常见 2.2k~4.7k，总线电容大时取小值，但要注意器件的最小灌电流能力。"],
          ["时钟延展是什么？", "从机来不及处理时把 SCL 拉低不放，主机检测到 SCL 实际为低就等待。这要求主机支持延展，软件模拟时要读回 SCL 电平确认。"],
          ["为什么 I2C 传输中不能用 printf 调试？", "printf 走串口是阻塞的，几毫秒的阻塞会让某些从机判定超时，或者打乱时序。调试应该用 GPIO 打点 + 逻辑分析仪。"]
        ]
      },

      {
        id: "M-23",
        chapter: "wired",
        topic: "spi",
        title: "SPI 一次完整的传输过程是怎样的？为什么读数据也要先写一个字节？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "片选到时钟的完整时序、两个移位寄存器首尾相接的环形交换，以及“读必须伴随写”的本质原因。",
        q: `<p>面试官：从拉低片选到拉高片选，SPI 上到底发生了什么？为什么读寄存器也要先发一个字节出去？</p>`,
        exam: `<p>考察是否真正理解 SPI 是全双工交换而不是“读”或“写”。能讲清移位寄存器的环形结构，比背时序图更有说服力。</p>`,
        core: `<p>CS 拉低选中从机并留建立时间；主机和从机各有一个 8 位移位寄存器，通过 MOSI/MISO 首尾相接成环，每个 SCK 周期双方各移出一位、移入一位，8 个时钟后两个寄存器内容互换；多字节传输 CS 全程保持低；最后一个字节完全移出（<code>BSY</code> 清零）再拉高 CS，否则会截断。</p><p>读也要写，是因为 SPI 没有独立的读方向，时钟由主机产生，每个时钟双方必然同时收发一位；要读 N 个字节，主机必须也发 N 个哑字节（通常 0x00 或 0xFF）。多从机各一根 CS，同一时刻只有一根被拉低，其余 MISO 高阻，这也是 SPI 不需要地址的原因。</p>`,
        answer: `<p><b>完整过程：</b></p>
<ul>
<li><b>片选</b>：CS 拉低，从机被选中。CS 建立到第一个时钟之间要留建立时间 t_SU。</li>
<li><b>交换</b>：主机和从机各有一个 8 位移位寄存器，通过 MOSI 和 MISO 首尾相接成一个环。每个 SCK 周期，主机从最高位移出一位到 MOSI、同时从 MISO 移入一位；从机做对称动作。8 个时钟后，两个寄存器的内容刚好互换。</li>
<li><b>字节间</b>：多字节传输时 CS 全程保持低，不释放。</li>
<li><b>结束</b>：等最后一个字节完全移出（状态寄存器的 BSY 清零）再拉高 CS，否则最后一位会被截断。</li>
</ul>
<p><b>为什么读也要写：</b>因为 SPI 没有独立的读方向。时钟由主机产生，每来一个时钟双方必然同时收发一位。所以要读 N 个字节，主机必须也发 N 个字节，内容无所谓，通常发 0x00 或 0xFF，叫哑字节（dummy byte）。同理，写的时候 MISO 上收到的数据直接丢弃即可。</p>
<p><b>和多从机的关系：</b>每个从机一根独立 CS，同一时刻只有一根被拉低，其余从机的 MISO 处于高阻，不会打架。这就是 SPI 不需要地址的原因。</p>`,
        principle: `<p>SPI 的本质是“时钟驱动的移位寄存器交换”，不是内存映射式读写。理解这一点，就能解释几个常见现象：读 Flash 要先发命令字再发地址再发哑字节；全双工模式下收发必须等长；用 DMA 时收发两个通道要同时启动。</p>
<p>最高时钟频率不是由主控决定的，而是由从机的建立/保持时间决定：1/f_max ≈ t_su + t_h + 传播延迟。器件手册里的 f_SCK 上限就是按这个算出来的。</p>`,
        fig: {
          type: "table",
          title: "一次 SPI 传输的四个阶段",
          tag: "spi-flow",
          head: ["阶段", "总线动作", "注意点"],
          rows: [
            ["开始", "CS 拉低", "留出建立时间 t_SU 再打时钟"],
            ["交换", "8 个 SCK 周期", "MOSI 移出与 MISO 移入同时进行"],
            ["字节间", "CS 保持低", "多字节连续传输不释放片选"],
            ["结束", "CS 拉高", "等 BSY 清零，避免截断最后一位"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_transfer.c",
          src: `/* SPI 是全双工交换：发 len 字节的同时收 len 字节 */
void spi_transfer(const uint8_t *tx, uint8_t *rx, size_t len)
{
    CS_LOW();

    for (size_t i = 0; i < len; i++) {
        /* 只读时也要发哑字节，否则没有时钟、收不到数据 */
        uint8_t out = tx ? tx[i] : 0xFFu;

        while (!(SPI1->SR & SPI_SR_TXE)) { }      /* 等发送寄存器空 */
        *(volatile uint8_t *)&SPI1->DR = out;

        while (!(SPI1->SR & SPI_SR_RXNE)) { }     /* 等接收非空 */
        uint8_t in = *(volatile uint8_t *)&SPI1->DR;

        if (rx) rx[i] = in;
    }

    while (SPI1->SR & SPI_SR_BSY) { }             /* 等最后一位移完 */
    CS_HIGH();
}

/* 典型用法：读 Flash 的 JEDEC ID（命令 0x9F，后面跟 3 个哑字节） */
uint32_t flash_read_id(void)
{
    uint8_t tx[4] = { 0x9F, 0xFF, 0xFF, 0xFF };
    uint8_t rx[4] = { 0 };

    spi_transfer(tx, rx, 4u);
    return ((uint32_t)rx[1] << 16) | ((uint32_t)rx[2] << 8) | rx[3];
}`
        },
        codeNote: "STM32 的 DR 是 16 位寄存器，用 uint8_t 指针访问是常见写法，但要注意 F1 系列读 DR 会清 RXNE，必须读完立即取值。等 BSY 清零再拉高 CS 这一步很多人会漏，表现为末尾字节偶发错误。",
        apply: `<p>调 W25Q 系列 Flash 时最常见的坑就是漏了哑字节：只发命令不发 0xFF，MISO 上什么都不会来，读出来全是 0。另一个坑是 CS 拉高太早，最后一个字节的最高位被吃掉，读出的 ID 总是差一截。</p>
<p>用 DMA 时更要注意：SPI 是全双工，DMA 的发送和接收通道必须同时使能、长度一致。只开一个方向会卡在等待。</p>`,
        pitfalls: [
          "<b>以为 SPI 可以只读不写。</b>没有时钟就没有数据，读操作必须伴随哑字节。",
          "<b>每个字节都拉一次 CS。</b>多字节传输要整帧保持片选，频繁拉高会被从机当成多次独立命令。",
          "<b>BSY 没清零就拉高 CS。</b>最后一位被截断，表现为末字节随机错误。",
          "<b>把 SPI 当成有应答的总线。</b>它没有任何反馈，写成功与否只能靠读回或 CRC 判断。"
        ],
        follow: [
          ["SPI 的全双工在实际项目里怎么用？", "多数场景是单向的，全双工被浪费了。真正用满的场景是 ADC 连续采样、音频 Codec、双机互相通信这类需要同时收发的场合。"],
          ["QSPI 和普通 SPI 有什么区别？", "QSPI 用 4 根数据线并行传输，一个时钟周期传 4 位，带宽约是标准 SPI 的 4 倍；还支持内存映射模式（XIP），可以直接从外部 Flash 取指执行。"],
          ["为什么 SPI 的抗干扰能力比 I2C 强？", "SPI 是推挽输出、信号摆率高，且有独立片选做点对点连接；I2C 是开漏加上拉，上升沿缓，长距离容易受干扰。但 SPI 线多，不适合板间长距离。"]
        ]
      },

      {
        id: "M-24",
        chapter: "wired",
        topic: "spi",
        title: "用 GPIO 软件模拟 SPI 怎么写？最高能跑多快？",
        diff: "高级",
        freq: "中频",
        type: "驱动设计题",
        point: "CPOL/CPHA 在软件里的落地方式、全双工同时采样，以及速率上限和不可被打断的约束。",
        q: `<p>面试官：什么情况下你会用 GPIO 模拟 SPI？具体怎么写？能跑到多少速率？</p>`,
        exam: `<p>考察对 SPI 时序的掌握程度。能说出“先建立数据还是先打时钟由 CPHA 决定”，并知道速率瓶颈在哪，就算过关。</p>`,
        core: `<p>用在不凑手的场合：硬件 SPI 不够、引脚被占、需要非标准时序（3 线半双工、9 位数据、自定义命令）、调试阶段先跑通。</p><p>写法按 CPOL 定空闲电平、按 CPHA 定“先设数据还是先打时钟”。模式 0：SCK 空闲低，先在低电平期间把数据放到 MOSI，再拉高 SCK，从机在上升沿采样，主机同时采 MISO，再拉低准备下一位，MSB first 循环 8 次。</p><p>速度瓶颈是翻转开销：用 <code>HAL_GPIO_WritePin</code> 在 72MHz F1 上只有几百 kHz，直接写 BSRR、循环里不放函数调用可到几 MHz。一次字节传输内不能被中断打断，否则时钟间隔不均，部分从机会判超时。</p>`,
        answer: `<p><b>什么时候用：</b>硬件 SPI 外设不够用；引脚被其他功能占死、只能挑任意 GPIO；需要非标准时序（3 线半双工、9 位数据、自定义命令序列）；调试阶段先把功能跑通。</p>
<p><b>怎么写：</b>核心是按 CPOL 决定 SCK 的空闲电平，按 CPHA 决定“先设数据再打时钟”还是“先打时钟再采样”。以模式 0（CPOL=0、CPHA=0）为例：SCK 空闲为低；先在 SCK 低电平期间把数据放到 MOSI 上，然后 SCK 拉高，从机在这个上升沿采样 MOSI，主机同时采样 MISO，再拉低 SCK 准备下一位。按 MSB first 循环 8 次就是一个字节。</p>
<p><b>能跑多快：</b>瓶颈在翻转开销。用 HAL_GPIO_WritePin 这种带参数检查的函数，72MHz 的 F1 上大概只能到几百 kHz；直接写 BSRR 寄存器、循环里不放函数调用，可以到几 MHz。再往上就得用定时器或 SPI 外设了。</p>
<p><b>必须注意：</b>一次字节传输内不能被中断打断，否则时钟间隔不均匀，部分从机会判超时。整帧传输要放在临界区里，或者至少保证单个字节的原子性。</p>`,
        principle: `<p>软件模拟 SPI 的价值不是性能，而是灵活性：任意引脚、任意时序、任意位数。代价是把硬件的工作搬到 CPU 上，占用 CPU 时间且时序精度受中断影响。</p>
<p>如果只是引脚不够，优先考虑用 SPI 外设 + 外部模拟开关/译码器扩展片选，而不是退回软件模拟——硬件 SPI 配 DMA 几乎不占 CPU，速率还高一个数量级。</p>`,
        fig: {
          type: "table",
          title: "SPI 四种模式在软件里的实现差异",
          tag: "spi-mode",
          head: ["模式", "CPOL", "CPHA", "空闲电平 / 采样边沿"],
          rows: [
            ["0", "0", "0", "低 / 第一个（上升）边沿"],
            ["1", "0", "1", "低 / 第二个（下降）边沿"],
            ["2", "1", "0", "高 / 第一个（下降）边沿"],
            ["3", "1", "1", "高 / 第二个（上升）边沿"]
          ]
        },
        code: {
          lang: "c",
          title: "soft_spi.c",
          src: `/* 模式 0：SCK 空闲低，上升沿采样；MSB first */
static inline void sck_high(void) { GPIOA->BSRR = GPIO_BSRR_BS5; }
static inline void sck_low(void)  { GPIOA->BSRR = GPIO_BSRR_BR5; }
static inline void mosi_set(int b)
{
    if (b) GPIOA->BSRR = GPIO_BSRR_BS7;
    else   GPIOA->BSRR = GPIO_BSRR_BR7;
}
static inline int miso_read(void)
{
    return (GPIOA->IDR & GPIO_IDR_6) ? 1 : 0;   /* 模式 0 下高电平为 1 */
}

uint8_t soft_spi_xfer(uint8_t out)
{
    uint8_t in = 0;

    for (int i = 7; i >= 0; i--) {
        mosi_set((out >> i) & 1u);   /* CPHA=0：先建立数据 */
        __NOP();
        sck_high();                  /* 上升沿：双方同时采样 */
        __NOP();
        in = (uint8_t)((in << 1) | (miso_read() ? 1u : 0u));
        sck_low();                   /* 下降沿：准备下一位 */
    }
    return in;
}

/* 整帧传输期间关中断，保证时钟间隔均匀 */
void soft_spi_write(const uint8_t *buf, size_t len)
{
    uint32_t primask = __get_PRIMASK();
    uint8_t  inbuf[32];

    CS_LOW();
    __disable_irq();
    for (size_t i = 0; i < len && i < sizeof(inbuf); i++) {
        inbuf[i] = soft_spi_xfer(buf[i]);
    }
    __set_PRIMASK(primask);
    CS_HIGH();
}`
        },
        codeNote: "用 BSRR 而不是 HAL_GPIO_WritePin 是提速关键：BSRR 一次写就能置位或复位，不需要读改写，也不会被中断打成半截。关中断的范围要控制在单帧以内，太长会影响系统实时性。",
        apply: `<p>我做过一个项目，主控的 SPI 外设全被占满，只剩几个零散 GPIO 能引出，最后用软件模拟驱动了一颗 SPI 的 ADC。为了压住中断抖动，整帧 4 字节放在临界区里，实测速率 1.5MHz 左右，采样率完全够用。</p>
<p>反过来，如果是刷屏这种高带宽场景，千万别用软件模拟：SPI 40MHz 刷 320×240 的屏，软件模拟根本做不到，必须硬件 SPI + DMA。</p>`,
        pitfalls: [
          "<b>忘了 CPHA 的“先建数据还是先打时钟”。</b>模式 0 和模式 1 的差别就在这里，写反了读出来的数据整体错一位。",
          "<b>用 HAL_GPIO_WritePin 追求高速。</b>函数调用开销比预期大得多，实测只有几百 kHz。",
          "<b>整帧不关中断。</b>偶发错字节，且很难复现，是这类驱动最典型的坑。",
          "<b>忽略 MOSI/MISO 方向的切换。</b>三线半双工要中途切 GPIO 方向，切晚了会冲突。"
        ],
        follow: [
          ["软件模拟 I2C 和软件模拟 SPI 哪个更难？", "I2C 更难。它要处理起始/停止条件、应答位、时钟延展、总线仲裁，还要检测 SDA 实际电平；SPI 只要按时钟移位就行，没有握手。"],
          ["怎么验证软件模拟 SPI 的时序对不对？", "用逻辑分析仪抓 SCK 和 MOSI/MISO，量时钟频率、建立保持时间、每帧的字节数。比示波器直观，能直接看数据对不对。"],
          ["定时器能驱动 SPI 吗？", "可以，用定时器更新事件触发 GPIO 翻转或用定时器 + DMA 输出波形。速率能到几 MHz 且不受中断影响，但复杂度高，一般没必要。"]
        ]
      },

      {
        id: "M-25",
        chapter: "wired",
        topic: "spi",
        title: "SPI 没有应答机制，通信出错怎么发现和处理？",
        diff: "高级",
        freq: "中频",
        type: "可靠性设计题",
        point: "物理层无反馈带来的可靠性缺口，以及器件 ID、读回校验、CRC、超时重试这几层兜底。",
        q: `<p>面试官：SPI 连 ACK 都没有，你怎么知道从机真的收到并执行了？出错了怎么办？</p>`,
        exam: `<p>考察可靠通信的设计思路。能给出分层（协议层 CRC、应用层读回、系统层超时重试）的方案，比只说“加重试”更完整。</p>`,
        core: `<p>SPI 物理层没有任何反馈，字节是否被从机正确接收硬件保证不了，可靠性必须由协议层补。</p><p>四层手段：器件自检（读 ID/状态，读到 0x00 或 0xFF 基本是没接上或时序不对）；写配置后立刻读回比对；数据块传输（Flash、SD 卡、固件升级）用 CRC16/32；所有等状态位的循环都要有超时，失败重试 3 次，连续失败上报故障并降级，不能死等。常见错误来源：SCK 超从机上限、CPOL/CPHA 配错、CS 建立保持时间不足、MISO 悬空读到 0xFF、多主冲突、电源地弹导致位翻转。</p>`,
        answer: `<p><b>先说清事实：</b>SPI 物理层没有任何反馈，主机发出去的字节是否被从机正确接收，硬件保证不了。I2C 有 ACK，SPI 没有，所以可靠性必须由协议层补。</p>
<p><b>四层手段：</b></p>
<ul>
<li><b>器件自检</b>：上电和周期性读器件 ID/状态寄存器，读到 0x00 或 0xFF 基本说明没接上或时序不对。</li>
<li><b>读回校验</b>：写配置寄存器后立刻读回来比对。配置类操作频率低，这点开销完全值得。</li>
<li><b>CRC</b>：数据块传输（Flash、SD 卡、固件升级）用 CRC16/CRC32，多数器件本身就带硬件 CRC，一次读完校验即可。</li>
<li><b>超时与重试</b>：所有等待状态位的循环都要有超时，失败重试 3 次，连续失败就上报故障并降级，而不是死等。</li>
</ul>
<p><b>常见错误来源：</b>SCK 超过从机上限制、CPOL/CPHA 配错、CS 建立/保持时间不足、MISO 悬空读到 0xFF、多主场景总线冲突、电源或地弹导致位翻转。</p>`,
        principle: `<p>SPI 的高速率是拿可靠性换来的：没有地址、没有应答、没有流控。所以它适合“短距离、板内、点对点”的场景，一旦走长线或跨板，误码率会明显上升。</p>
<p>工程上的通用做法是把它当“不可靠信道”对待：应用层协议帧自带帧头、长度、CRC，配合序号和应答（应用层 ACK），把可靠性做在自己的协议里。这样即使物理层出错也能被检测并重传。</p>`,
        fig: {
          type: "table",
          title: "SPI 常见错误与检测手段",
          tag: "spi-err",
          head: ["错误类型", "典型表现", "检测手段"],
          rows: [
            ["从机未上电或未接", "MISO 恒高读到 0xFF", "读器件 ID"],
            ["模式或速率不匹配", "数据整体错位、全 0 或全 FF", "降速重试、读回比对"],
            ["CS 时序不足", "偶发单字节错误", "示波器量建立/保持时间"],
            ["数据被干扰", "随机位翻转", "CRC 校验 + 重传"],
            ["多主总线冲突", "读到其他主机的数据", "硬件互锁，改为点对点"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_frame_crc.c",
          src: `/* 应用层加帧头 + 长度 + CRC16，把不可靠的物理层包起来 */
#define FRAME_HEAD  0xA5u
#define MAX_PAYLOAD 32u

typedef struct {
    uint8_t head;
    uint8_t len;
    uint8_t seq;                 /* 序号，用于去重 */
    uint8_t payload[MAX_PAYLOAD];
    uint16_t crc;
} spi_frame_t;

static uint16_t crc16(const uint8_t *p, size_t n)
{
    uint16_t crc = 0xFFFFu;
    while (n--) {
        crc ^= (uint16_t)(*p++) << 8;
        for (int i = 0; i < 8; i++) {
            crc = (crc & 0x8000u) ? (uint16_t)((crc << 1) ^ 0x1021u)
                                  : (uint16_t)(crc << 1);
        }
    }
    return crc;
}

/* 发一帧：失败重试 3 次，回读确认 */
int spi_send_frame(uint8_t seq, const uint8_t *data, uint8_t len)
{
    spi_frame_t f = { .head = FRAME_HEAD, .len = len, .seq = seq };

    if (len > MAX_PAYLOAD) return -1;
    memcpy(f.payload, data, len);
    f.crc = crc16((const uint8_t *)&f, 3u + len);   /* 头+长度+序号+数据 */

    for (int retry = 0; retry < 3; retry++) {
        spi_transfer((const uint8_t *)&f, NULL, 3u + len + 2u);
        if (spi_wait_done(5u) == 0) {              /* 带超时地等从机完成 */
            return 0;
        }
    }
    return -2;                                     /* 上报故障，由上层降级 */
}`
        },
        codeNote: "CRC 覆盖范围要写清楚（这里含帧头、长度、序号和载荷），收发两端必须一致。重试不能无限，必须有个上限后上报，否则总线本身坏了会一直空转。",
        apply: `<p>给外部 SPI Flash 做固件升级时，我按 4KB 一个块写入，每块写完读回比对，全部写完再整体算一次 CRC32 与升级包里的值比对。这样即使中途某块出错也能定位到具体块号重写，不需要整片重来。</p>
<p>接 SPI 传感器时更简单：上电读 ID，读不到就报“传感器未连接”，比让上层拿到一堆 0 去参与运算要好得多——后者往往会算出离谱的数值，反而更难排查。</p>`,
        pitfalls: [
          "<b>只加重试不加超时。</b>从机没响应时会无限等待，表现为程序卡死而不是报错。",
          "<b>把 MISO 悬空的高电平当成有效数据。</b>没接器件时读到 0xFF，某些命令下看起来“像数据”。",
          "<b>CRC 只算载荷不算帧头。</b>长度字段被改坏时校验不出来，可能读到越界数据。",
          "<b>失败后不降级。</b>总线持续故障时应该关闭相关功能并上报，而不是反复重试拖垮系统。"
        ],
        follow: [
          ["CRC 和校验和有什么区别？", "校验和（累加和）实现简单但检错能力弱，无法发现字节顺序调换；CRC 基于多项式除法，对突发错误和位翻转的检出率高得多，通信场景应优先用 CRC。"],
          ["SPI Flash 的写保护怎么用？", "通过状态寄存器的 BP 位或独立的 WP 引脚，把部分或全部区域设为只读。存放固件和校准参数的区域应该写保护，防止跑飞时被误写。"],
          ["怎么判断是 SPI 时序问题还是器件问题？", "先降速到 100kHz 试，如果降速后正常就是时序/速率问题；降速仍异常，再查接线、供电、片选，最后换器件。"]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第四批：蓝牙协议栈与无线联网） ---------------- */
  EIK.extend("communication", {
    questions: [
      {
        id: "M-26",
        chapter: "wireless",
        topic: "ble",
        title: "BLE 的广播包里到底装了什么？31 字节怎么分配？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "广播信道与空口包结构、AdvData 里的 AD Structure 格式，以及 31 字节的典型分配方式。",
        q: `<p>面试官：BLE 设备广播的时候，空中到底飞了什么数据？31 字节里你是怎么安排的？</p>`,
        exam: `<p>考察是否真的写过广播数据。能说清 AD Structure 的“长度+类型+内容”格式，并给出实际分配，就算扎实。</p>`,
        core: `<p>广播在 37（2402）、38（2426）、39（2480）三个信道轮流发同样的包，扫描方也在三个信道轮流听，某个信道被 Wi-Fi 干扰还能在另外两个收到。空口包是前导码 1B + 接入地址 4B（广播固定 <code>0x8E89BED6</code>）+ PDU + CRC 3B；广播 PDU 是 2B 头 + 6B AdvA + 0~31B AdvData。</p><p>31 字节指 AdvData。它是若干 AD Structure：长度 1B + 类型 1B + 内容 N B，长度值等于“类型 + 内容”的总长。典型分配是 Flags 3B（类型 <code>0x01</code>、值 0x06）、设备名 <code>0x09</code>、剩下给厂商自定义 <code>0xFF</code> 或 Service Data <code>0x16</code>。名字太长会挤掉自定义数据，所以常用缩写，完整名字放扫描响应的另外 31 字节。</p>`,
        answer: `<p><b>广播发生在三个信道：</b>37（2402MHz）、38（2426MHz）、39（2480MHz），设备轮流在这三个信道发送同样的广播包，扫描方也是在三个信道轮流监听，这样即使某个信道被 Wi-Fi 干扰，也能在另外两个收到。</p>
<p><b>空口包结构：</b>前导码 1 字节（供接收方位同步）+ 接入地址 4 字节（广播固定 0x8E89BED6）+ PDU + CRC 3 字节。</p>
<p><b>广播 PDU 又分三部分：</b>2 字节头（PDU 类型、地址类型、6 位长度）+ 6 字节 AdvA（广播方地址）+ 0~31 字节 AdvData（广播数据）。所以“31 字节”指的是 AdvData 的上限。</p>
<p><b>AdvData 是若干 AD Structure 串起来的：</b>每个结构是「长度 1 字节 + 类型 1 字节 + 内容 N 字节」，长度字段的值等于“类型 + 内容”的总长（不含自己）。解析时从头逐段读，读到长度为 0 或超出范围就结束。</p>
<p><b>典型分配（31 字节）：</b>Flags 占 3 字节（长度 2 + 类型 0x01 + 值 0x06）；设备名 0x09 占 2 + 名字长度；剩下给厂商自定义数据 0xFF 或 Service Data 0x16。名字太长会挤掉自定义数据，所以很多产品只放名字缩写，完整名字放在扫描响应（Scan Response）里，那是另外 31 字节。</p>`,
        principle: `<p>BLE 4.x 的经典广播只有 31 字节，装不下太多信息。为了突破这个限制有两条路：一是用扫描响应（Scan Response）再加 31 字节，代价是要先被扫描方发 SCAN_REQ 才回；二是 BLE 5 的扩展广播（Extended Advertising），单包可到 254 字节，还支持链式多包。</p>
<p>广播内容越少，广播包越短，空口占用时间越短，功耗越低。所以产品设计上应该“广播只放必要信息（设备类型、状态、UUID），详细数据等连上后用 GATT 读”。</p>`,
        fig: {
          type: "table",
          title: "BLE 广播包字段",
          tag: "ble-adv",
          head: ["字段", "长度", "说明"],
          rows: [
            ["前导码", "1 字节", "接收方做位同步"],
            ["接入地址", "4 字节", "广播固定 0x8E89BED6"],
            ["PDU 头", "2 字节", "PDU 类型、地址类型、6 位长度"],
            ["AdvA", "6 字节", "广播方地址"],
            ["AdvData", "0~31 字节", "若干 AD Structure"],
            ["CRC", "3 字节", "链路层校验"]
          ]
        },
        code: {
          lang: "c",
          title: "adv_build.c",
          src: `/* 构造 31 字节广播数据：Flags + 设备名 + 厂商自定义数据 */
static uint8_t adv_data[31];
static uint8_t adv_len;

void adv_build(const char *name, const uint8_t *mfg, uint8_t mfg_len)
{
    uint8_t nlen = (uint8_t)strlen(name);

    if (nlen > 16) nlen = 16;          /* 名字要截断，给后面留空间 */
    adv_len = 0;

    /* AD 1：Flags = LE General Discoverable + BR/EDR not supported */
    adv_data[adv_len++] = 2;           /* 长度 = 类型 1 + 内容 1 */
    adv_data[adv_len++] = 0x01;        /* AD Type: Flags */
    adv_data[adv_len++] = 0x06;

    /* AD 2：完整设备名，AD Type 0x09 */
    adv_data[adv_len++] = (uint8_t)(nlen + 1);
    adv_data[adv_len++] = 0x09;
    memcpy(&adv_data[adv_len], name, nlen);
    adv_len += nlen;

    /* AD 3：厂商自定义数据，能放多少放多少 */
    uint8_t room = (uint8_t)(31u - adv_len - 2u);
    if (mfg_len > room) mfg_len = room;

    if (mfg_len > 0) {
        adv_data[adv_len++] = (uint8_t)(mfg_len + 1);
        adv_data[adv_len++] = 0xFF;    /* AD Type: Manufacturer Specific */
        memcpy(&adv_data[adv_len], mfg, mfg_len);
        adv_len += mfg_len;
    }
}`
        },
        codeNote: "长度字段是“类型 + 内容”的字节数，不含长度字段本身，这是最容易写错的地方——多算 1 会让手机解析出乱码段。总长必须严格不超过 31，否则协议栈会拒绝启动广播。",
        apply: `<p>做温湿度计的时候，我把“设备类型 + 当前温度整数部分”直接放进广播的厂商数据里，手机不连接就能在扫描列表里看到读数，体验比连上再读好很多。完整精度还是走 GATT 通知。</p>
<p>踩过的坑：一开始把 20 字节的设备名塞进广播，结果厂商数据被挤没了，手机端一直读不到自定义字段。后来名字改到扫描响应里，广播只留缩写，问题解决。</p>`,
        pitfalls: [
          "<b>长度字段多算 1 字节。</b>手机解析时会把下一段的长度当数据，整包乱掉。",
          "<b>超过 31 字节。</b>协议栈直接返回错误，广播起不来，但报错信息往往不直观。",
          "<b>以为 31 字节包含整个空口包。</b>31 只是 AdvData 的上限，头和地址是另外的。",
          "<b>把大量数据塞广播。</b>广播越长功耗越高，且所有附近的设备都要收，隐私和功耗都不划算。"
        ],
        follow: [
          ["扫描响应是什么？", "扫描方发 SCAN_REQ 后，广播方回 SCAN_RSP，可以再带 31 字节数据。通常用来放完整设备名或补充信息，不占用主动广播的空间。"],
          ["BLE 5 的扩展广播有什么好处？", "单包最多 254 字节，还能链式拼接；支持周期性广播和广播中的分段数据。代价是需要 BLE 5 的芯片和协议栈支持，且老设备收不到。"],
          ["广播地址有几种类型？", "公共地址（IEEE 分配，固定）和随机地址（又分静态、可解析私有、不可解析私有）。用随机地址能避免被长期跟踪，隐私性更好。"]
        ]
      },

      {
        id: "M-27",
        chapter: "wireless",
        topic: "ble",
        title: "BLE 链路层有哪几个状态？设备是怎么从广播进入连接的？",
        diff: "中级",
        freq: "中频",
        type: "协议分析题",
        point: "Standby、Advertising、Scanning、Initiating、Connection 五态及其转换条件，单射频带来的互斥约束。",
        q: `<p>面试官：BLE 设备在链路层有哪些工作状态？从开机广播到被手机连上，中间经历了什么？</p>`,
        exam: `<p>考察对 BLE 协议栈分层的理解。能把链路层状态和 GAP 角色对应起来，说明不是只会调 API。</p>`,
        core: `<p>五个状态：Standby 待机（射频关、最省电）、Advertising 广播（37/38/39 周期发）、Scanning 扫描（轮流监听并上报）、Initiating 发起连接（监听但不汇报，收到可连接广播直接回 <code>CONNECT_IND</code>）、Connection 连接（按连接间隔同步收发，分 Central/Peripheral）。</p><p>流程：上电 → Standby → 启动广播进 Advertising → 手机扫到后发 CONNECT_IND（手机在 Initiating）→ 设备进 Connection 作 Peripheral，手机进 Connection 作 Central → 任一方断开回 Standby。链路层只有一个射频，同一时刻只能一个状态；Scanning 和 Initiating 互斥，设备也不能既广播又扫描（除非协议栈做时分复用）。</p>`,
        answer: `<p><b>五个状态：</b></p>
<ul>
<li><b>Standby（待机）</b>：不收发任何数据，射频关闭，最省电。</li>
<li><b>Advertising（广播）</b>：在 37/38/39 三个信道周期性发送广播包，等待别人来连。</li>
<li><b>Scanning（扫描）</b>：在三个信道轮流监听广播包，把结果上报给主机。</li>
<li><b>Initiating（发起连接）</b>：也在监听，但收到可连接广播后不向上汇报，而是直接回一个 CONNECT_IND 建立连接。</li>
<li><b>Connection（连接）</b>：连接建立后进入，双方按连接间隔同步收发，分 Central（主机）和 Peripheral（从机）两种角色。</li>
</ul>
<p><b>转换过程：</b>设备上电 → Standby → 启动广播进入 Advertising → 手机扫描到它，发 CONNECT_IND（此时手机处于 Initiating 状态）→ 设备从 Advertising 转入 Connection（Peripheral 角色），手机从 Initiating 转入 Connection（Central 角色）→ 任意一方断开后回到 Standby。</p>
<p><b>关键约束：</b>链路层只有一个射频，同一时刻只能处于一个状态。Scanning 和 Initiating 是互斥的两种“接收者”状态；一个设备也不能既广播又扫描（除非协议栈做时分复用，比如同时做可发现 + 可连接）。</p>`,
        principle: `<p>链路层状态机是 BLE 功耗模型的根基：设备 99% 的时间待在 Standby，只在广播事件或连接事件时短暂开射频。广播间隔从 20ms 到 10.24s 可调，间隔越长越省电，但被发现越慢。</p>
<p>Initiating 和 Scanning 分开设计也很合理：扫描是要把结果给应用层看（比如列出附近设备），发起连接是要立刻连某一个目标，不需要上报。这也是为什么手机连设备时不需要先“扫描到列表里”再点，而是可以直接按地址/服务 UUID 发起。</p>`,
        fig: {
          type: "table",
          title: "链路层状态与转换",
          tag: "ble-ll",
          head: ["当前状态", "触发事件", "下一状态"],
          rows: [
            ["Standby", "启动广播", "Advertising"],
            ["Standby", "启动扫描", "Scanning"],
            ["Standby", "发起连接", "Initiating"],
            ["Advertising", "收到 CONNECT_IND", "Connection（从机）"],
            ["Initiating", "收到可连接广播并发 CONNECT_IND", "Connection（主机）"],
            ["Connection", "链路断开或主动终止", "Standby"]
          ]
        },
        apply: `<p>调试“设备明明在广播，手机却搜不到”时，先确认设备真的进了 Advertising 状态而不是卡在 Standby（很多协议栈启动广播失败不报错）。再看广播间隔：设成 2s 以上时，手机扫描窗口如果很短，可能几次都错过。</p>
<p>另一个常见现象是“连上后又断开，然后又出现在列表里”——说明连接建立失败或立刻断开，设备退回了 Advertising，这时候要去看断开原因码，而不是怀疑广播有问题。</p>`,
        pitfalls: [
          "<b>以为广播和扫描可以同时做。</b>单射频下是时分复用的，配置不当会互相抢时间。",
          "<b>广播间隔设太长。</b>省电了但被发现慢，首次配网体验很差，建议 100~300ms。",
          "<b>不处理连接失败。</b>连不上时设备会一直停在原地，应该回到 Advertising 重新等待。",
          "<b>把 GAP 角色和链路层状态混为一谈。</b>Peripheral/Central 是 GAP 角色，链路层状态是另一层概念。"
        ],
        follow: [
          ["广播间隔和连接间隔有什么区别？", "广播间隔是“没被连接时多久喊一次”，影响被发现的速度和待机功耗；连接间隔是“连上后多久通信一次”，影响数据延迟和连接态功耗。"],
          ["连接建立后还能再广播吗？", "可以，这叫“可连接的同时广播”，但会增加功耗。多数产品连上后就停止广播，避免被重复连接。"],
          ["什么是连接事件？", "每个连接间隔开始时，主从双方在约定信道同时开射频，主机先发包，从机必须回应，这一来一回叫一个连接事件。没有数据要发时可以提前结束以省电。"]
        ]
      },

      {
        id: "M-28",
        chapter: "wireless",
        topic: "wifi",
        title: "Wi-Fi 的 STA、AP、混合模式有什么区别？为什么配网时要用 AP+STA？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "三种工作模式的角色差异、AP+STA 共存时的信道约束，以及配网场景为什么选它。",
        q: `<p>面试官：Wi-Fi 模块的 STA 模式和 AP 模式分别是什么？你项目里用的是哪种？</p>`,
        exam: `<p>考察对 Wi-Fi 组网角色的理解。能说出 AP+STA 共存的信道限制，是加分项。</p>`,
        core: `<p>STA 是客户端，去连已有热点、拿 IP、访问外网，产品正常工作时最常用；AP 是自己当热点、跑 DHCP 给连进来的设备分 IP，典型用于首次配置；AP+STA 同时开两个接口，一边给手机连、一边连路由器，配网时用，配完直接切 STA 不用重启。</p><p>关键限制：ESP32/ESP8266 是单射频，AP 和 STA 必须同信道；STA 连的路由器在 6 信道，AP 也被迫切到 6，路由器自动跳信道时 AP 跟着跳，已连的手机会掉线。所以配网页面要短时使用，配完就关 AP。另有监听/混杂、Wi-Fi Direct、Mesh 等模式。</p>`,
        answer: `<p><b>STA（Station，站点模式）：</b>作为客户端去连已有的热点（路由器），从对方拿 IP，能访问外网。这是产品正常工作时最常用的模式。</p>
<p><b>AP（Access Point，热点模式）：</b>自己当热点，其他设备连它，自己跑 DHCP 服务器给连进来的设备分配 IP。典型用途是设备首次配置时开一个临时热点。</p>
<p><b>AP+STA（混合/共存模式）：</b>同时开两个接口，一边当热点给手机连，一边连路由器。配网时用它：手机连设备热点打开配置页面，设备同时保持与路由器的连接，配完直接切到 STA 工作，不用重启。</p>
<p><b>关键限制：</b>ESP32/ESP8266 这类单射频芯片，AP 和 STA 必须工作在同一个信道。如果 STA 连的路由器在 6 信道，AP 也会被迫切到 6 信道，而手机连上 AP 后可能与邻居的 Wi-Fi 冲突。更麻烦的是路由器会自动跳信道，一跳设备的 AP 也跟着跳，已连接的手机会掉线。所以配网页面要做成“短时使用”，配完就关 AP。</p>
<p><b>其他模式：</b>监听/混杂模式（抓包、SmartConfig 嗅探）、Wi-Fi Direct/P2P（设备直连不经过路由）、Mesh（多节点组网）。</p>`,
        principle: `<p>STA 和 AP 的差别本质是“谁控制 BSS”：AP 负责发 Beacon 帧宣告网络存在、管理接入、分配 IP；STA 被动扫描 Beacon 并请求关联。同一颗射频要同时扮演两种角色，只能靠时分复用，所以才有“必须同信道”的约束。</p>
<p>工程上更稳妥的配网方式是 AP 配网 + 明确的超时回退：按键触发后开 AP，5 分钟内没配成功就自动关闭并回到 STA 重试，避免设备长期开着热点耗电且存在被蹭网的风险。</p>`,
        fig: {
          type: "table",
          title: "Wi-Fi 三种工作模式对比",
          tag: "wifi-mode",
          head: ["模式", "角色", "典型用途", "限制"],
          rows: [
            ["STA", "客户端", "正常联网工作", "依赖路由器，无路由则不可用"],
            ["AP", "热点", "首次配网、局域网直连", "本身不能上网，需自己做 DHCP"],
            ["AP+STA", "双向", "配网时保持联网、边配边通", "单射频要求同信道，性能有折损"]
          ]
        },
        code: {
          lang: "c",
          title: "wifi_apsta.c",
          src: `/* ESP-IDF 风格：配网时开 AP+STA，配完关闭 AP 只留 STA */
static void wifi_start_apsta(void)
{
    wifi_config_t ap_cfg = { 0 };
    wifi_config_t sta_cfg = { 0 };

    /* AP 侧：设备自己的临时热点 */
    strncpy((char *)ap_cfg.ap.ssid, "EIK-SETUP-3F2A", sizeof(ap_cfg.ap.ssid));
    ap_cfg.ap.ssid_len       = strlen("EIK-SETUP-3F2A");
    ap_cfg.ap.channel        = 6;              /* 与 STA 最终信道对齐 */
    ap_cfg.ap.max_connection = 2;
    ap_cfg.ap.authmode       = WIFI_AUTH_WPA2_PSK;
    strncpy((char *)ap_cfg.ap.password, "12345678", sizeof(ap_cfg.ap.password));

    /* STA 侧：先不填，等配网页面把 SSID/密码写进来 */
    sta_cfg.sta.threshold.authmode = WIFI_AUTH_WPA2_PSK;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_cfg));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_cfg));
    ESP_ERROR_CHECK(esp_wifi_start());
}

/* 配网成功后：把凭据写入 NVS，关掉 AP，只用 STA 工作 */
void wifi_finish_provisioning(const char *ssid, const char *pass)
{
    wifi_config_t sta = { 0 };

    strncpy((char *)sta.sta.ssid, ssid, sizeof(sta.sta.ssid));
    strncpy((char *)sta.sta.password, pass, sizeof(sta.sta.password));

    esp_wifi_set_config(WIFI_IF_STA, &sta);
    esp_wifi_stop();
    esp_wifi_set_mode(WIFI_MODE_STA);          /* 关掉热点，降低功耗和攻击面 */
    esp_wifi_start();
    esp_wifi_connect();
}`
        },
        codeNote: "AP 的密码不能省：开着的开放热点等于给附近任何人一个入口。配网窗口必须限时（比如 5 分钟），成功后立刻切回 STA 模式。",
        apply: `<p>我们产品的配网流程是：长按按键 3 秒进入配网，设备开 AP+STA，手机连上后自动弹出配置页（Android 有 captive portal 检测，iOS 需要手动打开），提交 SSID 和密码后设备尝试连接，成功则关 AP 并上报云端，失败则留在配网模式并回显错误码。</p>
<p>踩过的坑：路由器开了“自动信道”，设备 AP 跟着跳信道，配网页面在手机上直接断开。后来把 AP 固定在 6 信道，并在 UI 上提示“配网期间请不要频繁操作路由器”，问题才稳定。</p>`,
        pitfalls: [
          "<b>AP 不设密码。</b>附近任何人可以连进来改配置，甚至拿到内网权限。",
          "<b>配网完成后不关 AP。</b>长期开着热点耗电，而且是个持续的攻击面。",
          "<b>忽略 AP/STA 同信道约束。</b>路由器跳信道时 AP 跟着跳，已连接设备掉线且很难排查。",
          "<b>配网无超时。</b>用户误触后设备一直开热点，电池设备几天就没电了。"
        ],
        follow: [
          ["SmartConfig 和 AP 配网怎么选？", "SmartConfig 不用切 Wi-Fi、体验更顺，但成功率受手机和路由器影响，iOS 限制多；AP 配网成功率高、可回显错误，缺点是要手动切 Wi-Fi。产品上常见做法是两种都支持，让用户选。"],
          ["设备的 IP 是怎么拿到的？", "STA 模式下通过 DHCP 从路由器获取；AP 模式下设备自己跑 DHCP 服务器，给连进来的手机分配 192.168.x.x 的地址。"],
          ["Wi-Fi 和 BLE 同时工作会互相干扰吗？", "都在 2.4GHz，会抢时间。ESP32 内部有共存机制做时分调度，但并发量大时彼此吞吐都会下降，设计上应避免两者同时高速传输。"]
        ]
      },

      {
        id: "M-29",
        chapter: "wireless",
        topic: "gatt",
        title: "BLE 的 GAP 和 GATT 分别管什么？两者边界在哪？",
        diff: "中级",
        freq: "高频",
        type: "概念辨析题",
        point: "GAP 负责“怎么被发现和连上”，GATT 负责“连上之后怎么读写数据”，以及各自的角色和典型配置项。",
        q: `<p>面试官：BLE 协议栈里 GAP 和 GATT 都在最上层，它们各自负责什么？为什么要有两个？</p>`,
        exam: `<p>考察协议栈分层是否清晰。能用一句话讲清“GAP 管连接、GATT 管数据”，并说出 GAP 的四种角色，就很到位。</p>`,
        core: `<p>一句话：GAP 管“怎么被发现、怎么连上”，GATT 管“连上之后怎么读写数据”。</p><p>GAP 负责广播与扫描参数、发起连接和连接参数协商、四种角色（Broadcaster/Observer/Peripheral/Central）、配对绑定加密流程。GATT 负责连接后的数据模型——服务、特征值、描述符怎么组织，读、写、通知、指示怎么发起；它建在 ATT 之上，ATT 才是在线路上传属性的协议。</p><p>开发时：调广播、扫描、连接参数、配对 → GAP API；定义服务表、处理读写回调、发通知 → GATT API。</p>`,
        answer: `<p><b>一句话区分：GAP 管“怎么被发现、怎么连上”，GATT 管“连上之后怎么读写数据”。</b></p>
<p><b>GAP（Generic Access Profile）负责：</b></p>
<ul>
<li>广播与扫描：广播参数（间隔、信道、广播数据）、扫描参数（窗口、间隔、主动/被动）。</li>
<li>发起连接：连接参数（连接间隔、从机延迟、监督超时）的协商。</li>
<li>角色定义：Broadcaster（只广播不发）、Observer（只扫描不连）、Peripheral（从机，可被连）、Central（主机，主动连别人）。</li>
<li>安全：配对、绑定、加密的流程归属 GAP 的安全管理部分。</li>
</ul>
<p><b>GATT（Generic Attribute Profile）负责：</b>连接建立之后的数据模型——服务、特征值、描述符怎么组织，读、写、通知、指示怎么发起。它建立在 ATT 协议之上，ATT 才是真正在线路上传属性的协议。</p>
<p><b>开发时的对应关系：</b>调广播参数、扫描参数、连接参数、配对方式 → 找 GAP 的 API；定义服务表、处理读写回调、发通知 → 找 GATT 的 API。</p>`,
        principle: `<p>这个分层是有历史原因的：GAP 处理的是“设备之间如何建立一条链路”，与具体业务无关；GATT 处理的是“链路上传什么数据”，是业务相关的。分开之后，同一套 GAP 可以配任意 GATT 服务，协议栈得以复用。</p>
<p>容易混淆的是“服务发现”这个动作：它虽然是 GATT 定义的流程（Discover All Primary Services 等），但前提是链路已经由 GAP 建好。所以“连上”是 GAP 的事，“连上后发现有什么服务”是 GATT 的事。</p>`,
        fig: {
          type: "table",
          title: "GAP 与 GATT 职责划分",
          tag: "ble-gap",
          head: ["维度", "GAP", "GATT"],
          rows: [
            ["核心职责", "发现、连接、安全", "数据组织与读写"],
            ["典型参数", "广播/扫描/连接参数", "服务、特征值、MTU"],
            ["角色", "Broadcaster/Observer/Peripheral/Central", "Server（提供数据）/Client（访问数据）"],
            ["对应动作", "广播、扫描、连接、配对", "发现服务、读、写、通知、指示"]
          ]
        },
        apply: `<p>做 BLE 产品时，GAP 层我一般只改三处：广播间隔（配网期 100ms、量产 500ms）、连接参数（间隔 30~50ms 兼顾延迟和功耗）、广播数据内容。GATT 层才是业务重点：一个写特征收命令，一个通知特征上报数据，再加一个电池服务凑齐标准服务。</p>
<p>排查问题时也按这个分层走：手机搜不到设备 → 查 GAP 广播；能连上但读不到数据 → 查 GATT 服务定义和 CCCD 是否使能。这样定位很快。</p>`,
        pitfalls: [
          "<b>把 GATT 的 Server/Client 和 GAP 的 Central/Peripheral 混为一谈。</b>两组角色是独立的：从机也可以是 GATT Server，主机是 GATT Client，但理论上可以反过来。",
          "<b>以为连上就能读数据。</b>没使能 CCCD 就不会收到通知，这是最常见的“收不到数据”原因。",
          "<b>用 GATT 的读写去做高频数据。</b>每次读写都是一次往返，应该用通知（Notify）。",
          "<b>把广播参数当成 GATT 配置。</b>广播是 GAP 层的事，改 GATT 不会影响被发现的速度。"
        ],
        follow: [
          ["GATT 的 Server 和 Client 是怎么分的？", "提供数据、定义服务表的一方是 Server（通常是设备）；访问数据、发读写请求的一方是 Client（通常是手机）。Notify 是 Server 主动推给 Client。"],
          ["为什么 iOS 上后台扫描必须指定服务 UUID？", "iOS 为了省电，后台扫描不允许“扫所有设备”，只允许按 Service UUID 过滤。所以设备广播里必须带上服务 UUID，否则后台扫不到。"],
          ["MTU 是谁决定的？", "双方各自有上限，连接后通过 MTU Exchange 取较小值。默认 23（有效载荷 20 字节），协商后常见 247 或 185，能显著减少分包开销。"]
        ]
      },

      {
        id: "M-30",
        chapter: "wireless",
        topic: "ble",
        title: "BLE 通信安全吗？配对、绑定、加密分别是什么关系？",
        diff: "高级",
        freq: "中频",
        type: "方案设计题",
        point: "配对与绑定的区别、三种配对方式的 MITM 保护强度，以及 Just Works 的真实风险。",
        q: `<p>面试官：BLE 传输的数据别人能截获吗？配对和绑定有什么区别？怎么防止中间人攻击？</p>`,
        exam: `<p>考察 BLE 安全模型。能说清“配对是生成密钥的过程，绑定是保存密钥”，并指出 Just Works 没有 MITM 保护，是关键得分点。</p>`,
        core: `<p>配对是双方生成并交换密钥、建立加密链路的过程；绑定是把密钥存起来，下次重连直接加密、不用再配对。配对是一次性动作，绑定是它的持久化结果。</p><p>三种方式安全性差别大：Just Works 双方不显示不输入，只能防被动窃听、不能防中间人，是多数默认；Passkey/数字比较有 MITM 保护，但需要屏幕或按键；OOB 通过 NFC/二维码传密钥，安全性最高。用哪种由 IO Capability 决定，没有屏幕按键就只能 Just Works。LE Legacy 的 TK 在 Just Works 下是 0，可被窃听破解；LE Secure Connections 用 ECDH P-256，即使 Just Works 也能防窃听，但仍不能防 MITM。工程上要在应用层再加绑定 token、HMAC 和 Flash 加密。</p>`,
        answer: `<p><b>配对（Pairing）</b>是双方生成并交换密钥、建立加密链路的过程；<b>绑定（Bonding）</b>是把生成的密钥存起来，下次重连直接加密，不用再配对。所以配对是一次性动作，绑定是它的持久化结果。</p>
<p><b>三种配对方式，安全性差别很大：</b></p>
<ul>
<li><b>Just Works</b>：双方都不显示不输入，直接交换密钥。只能防被动窃听，<b>不能防中间人</b>——攻击者可以分别与两端配对。这是绝大多数默认配置。</li>
<li><b>Passkey / 数字比较</b>：一端显示 6 位数字，另一端输入；或两端显示同样的数字让用户确认。有 MITM 保护，但需要屏幕或按键。</li>
<li><b>OOB（带外）</b>：通过 NFC、二维码等另一条通道传递密钥，安全性最高。</li>
</ul>
<p><b>用哪种由 IO Capability 决定：</b>设备是 NoInputNoOutput（没有屏幕按键），就只能落到 Just Works。</p>
<p><b>加密强度还取决于配对版本：</b>LE Legacy Pairing 用 TK + STK，TK 在 Just Works 下是 0，可被被动窃听破解；LE Secure Connections（BLE 4.2+）用 ECDH P-256，即使 Just Works 也能防窃听（但仍不能防 MITM）。</p>
<p><b>工程上的补强：</b>链路加密之外，应用层再加一层——设备端校验手机下发的绑定 token、关键指令带序号和 HMAC、绑定信息存 Flash 时加密。不要只依赖 BLE 链路加密。</p>`,
        principle: `<p>BLE 的安全设计是分层的：链路层加密解决“空中被窃听”，配对方式解决“对方是不是真的那个设备”，应用层认证解决“这个手机有没有权限”。三者缺一不可，但很多产品只做了第一层。</p>
<p>还有一个常被忽视的点：绑定信息（LTK/IRK）存在 Flash 里，如果 Flash 可读（没开读保护），攻击者读出密钥后可以离线解密抓到的空中数据。所以防抄板那一套（读保护、调试口禁用）和 BLE 安全是相互依赖的。</p>`,
        fig: {
          type: "table",
          title: "三种配对方式的安全性",
          tag: "ble-pair",
          head: ["方式", "用户交互", "防窃听", "防中间人"],
          rows: [
            ["Just Works", "无", "是（SC 下）", "否"],
            ["Passkey", "输入 6 位数字", "是", "是"],
            ["数字比较", "两端确认同一数字", "是", "是"],
            ["OOB", "NFC / 二维码", "是", "是"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_security.c",
          src: `/* 设备端设置安全参数：要求加密 + MITM 保护（需配合 Passkey 或 OOB） */
static void ble_setup_security(void)
{
    ble_gap_sec_params_t sec = { 0 };

    sec.bond            = 1;      /* 绑定：保存密钥，下次免配对 */
    sec.mitm            = 1;      /* 要求中间人保护 */
    sec.lesc            = 1;      /* 用 LE Secure Connections（ECDH） */
    sec.keypress        = 0;
    sec.io_caps         = BLE_GAP_IO_CAPS_DISPLAY_ONLY;  /* 有屏能显示 */
    sec.oob             = 0;
    sec.min_key_size    = 16;
    sec.max_key_size    = 16;

    sd_ble_gap_sec_params_reply(conn_handle, BLE_GAP_SEC_STATUS_SUCCESS,
                                &sec, &bond_keys);
}

/* 配对完成后判断：没达到 MITM 就拒绝提供服务 */
void on_authenticated(uint16_t conn, ble_gap_conn_sec_t *sec)
{
    if ((sec->sec_mode.sm < 1) || (sec->sec_mode.lv < 3)) {
        /* 只是 Just Works，没有 MITM 保护 */
        app_set_link_trusted(conn, 0);
        return;
    }
    app_set_link_trusted(conn, 1);
}`
        },
        codeNote: "很多协议栈在安全等级不满足时会自动断开或降级重配，行为不一致。稳妥做法是配对完成后主动检查 sec_mode 和加密等级，不达标就标记为不可信，只允许访问无敏感的服务。",
        apply: `<p>做过一款门锁类产品，最初用 Just Works 配对，安全评审时被否——攻击者可以在中间转发，虽然要近场但风险不可接受。后来加了按键，改成 Passkey：锁体显示 6 位数字（用数码管），手机输入确认，才算过关。</p>
<p>另一个细节是绑定表容量：协议栈默认只存 3~5 个绑定，用户换手机多次后会挤爆旧的绑定，表现为“以前配过现在连不上”。要么扩大绑定表，要么做绑定信息淘汰策略。</p>`,
        pitfalls: [
          "<b>以为加密了就是安全的。</b>Just Works 下链路加密了，但中间人可以各自与两端配对，照样能篡改指令。",
          "<b>设备无屏无按键却要求 MITM。</b>IO Capability 决定无法实现，协议栈会直接配对失败。",
          "<b>绑定信息不加密存储。</b>Flash 被读出后，空中抓的包可以离线解密。",
          "<b>只按 MAC 地址做白名单。</b>BLE 的 MAC 可以被伪造，白名单必须配合绑定密钥才有意义。"
        ],
        follow: [
          ["BLE 的隐私地址是什么？", "用可解析私有地址（RPA）周期性更换 MAC，防止被长期跟踪。密钥（IRK）在绑定阶段交换，认识的设备仍能解析出身份。"],
          ["配对失败最常见的原因是什么？", "两端 IO Capability 与 MITM 要求不匹配；或一端要求绑定但绑定表已满；或对端不支持 LE Secure Connections 却被强制要求。"],
          ["应用层还要做认证吗？", "要。链路加密只管空中，应用层要用 token/HMAC 校验“这台手机有没有操作权限”，尤其是开锁、配网这类敏感指令。"]
        ]
      },

      {
        id: "M-31",
        chapter: "wireless",
        topic: "ble",
        title: "BLE 连接老是断开、数据丢包，怎么系统性排查？",
        diff: "高级",
        freq: "中频",
        type: "故障排查题",
        point: "从射频、连接参数、数据分片到电源与固件的分层定位，以及断开原因码的正确读法。",
        q: `<p>面试官：设备连手机一会儿就断，或者数据经常丢，你会怎么查？</p>`,
        exam: `<p>考察排查的结构化程度。能先看断开原因码、再分层收敛，比盲目调参数强得多。</p>`,
        core: `<p>先看断开原因码：<code>0x08</code> 连接超时（射频弱、干扰、从机被长任务阻塞）；<code>0x13</code> 远端主动断（App 退后台、省电策略）；<code>0x3E</code> 建连失败（广播间隔和扫描窗口不匹配）；<code>0x16</code> 本地主动断（固件逻辑或看门狗）。</p><p>再分层查：射频看 RSSI 是否低于 -85dBm、2.4G Wi-Fi 的信道 1/6/11 干扰、天线匹配和遮挡；连接参数看监督超时是否大于 6 倍间隔、从机延迟是否过大；数据层看 MTU 是否协商（默认每包 20 字节）、Notify 是否发太快导致手机缓冲溢出；电源看发射瞬间电流导致电压跌落复位；固件查看门狗误复位、栈溢出、长任务阻塞协议栈。工具用 nRF Connect 看 RSSI，Sniffer 抓包定位断在哪一包。</p>`,
        answer: `<p><b>第一步永远是看断开原因码</b>，它直接指向方向：</p>
<ul>
<li><b>0x08 连接超时</b>：监督超时内没收到包，多半是射频弱、干扰、或从机被长任务阻塞。</li>
<li><b>0x13 远端主动断开</b>：手机侧主动断的，通常是 App 退到后台、用户操作、或系统省电策略。</li>
<li><b>0x3E 建连失败</b>：连接建立阶段就失败，查广播间隔与扫描窗口是否匹配。</li>
<li><b>0x16 本地主动断开</b>：设备自己断的，查固件逻辑和看门狗。</li>
</ul>
<p><b>然后按层排查：</b></p>
<ul>
<li><b>射频</b>：RSSI 低于 -85dBm 就要警惕；2.4G Wi-Fi（尤其信道 1/6/11）与 BLE 广播信道重叠，同频干扰明显；天线匹配、金属外壳、人手遮挡都会衰减。</li>
<li><b>连接参数</b>：监督超时不能太小（要大于 6 倍连接间隔），从机延迟太大会让主机误判掉线；连接间隔与手机省电策略冲突时会被拉长。</li>
<li><b>数据层</b>：MTU 没协商导致每包只能 20 字节，分包多、丢一包就断帧；Notify 发太快，手机缓冲溢出直接丢。</li>
<li><b>电源</b>：发射瞬间电流可达十几毫安，电池内阻大或 LDO 瞬态响应差会导致电压跌落复位，表现为“随机断开”。</li>
<li><b>固件</b>：看门狗误复位、堆栈溢出、长任务阻塞协议栈任务。</li>
</ul>
<p><b>工具：</b>手机端 nRF Connect 看 RSSI 和连接参数；空中抓包用 nRF Sniffer 或 Ellisys，能直接看到在哪一包断开；设备端加环形日志记断开原因码。</p>`,
        principle: `<p>BLE 的“断开”从来不是单一原因，而是一条链路上最弱的一环决定的。所以排查的顺序应该是“先定位在哪一层断的”，而不是挨个试参数——后者往往改好了这个又坏了那个。</p>
<p>连接超时的机制值得单独理解：从机必须在监督超时时间内至少回应一次，否则主机认为链路丢失。如果从机在连接事件时正好在跑一个长临界区或高优先级中断，就会错过回应，连续错过几次就断了。这也是“加了某个功能后开始随机断连”的典型原因。</p>`,
        fig: {
          type: "table",
          title: "常见现象与对应原因",
          tag: "ble-debug",
          head: ["现象", "优先怀疑", "验证方法"],
          rows: [
            ["距离稍远就断", "射频弱或天线匹配差", "看 RSSI 曲线，靠近是否恢复"],
            ["特定位置必断", "同频干扰或金属遮挡", "换位置、关掉附近 Wi-Fi 对比"],
            ["连上几秒就断", "连接参数不合法", "核对监督超时与连接间隔的倍数"],
            ["大量数据时丢包", "MTU 未协商或缓冲溢出", "看实际 MTU，降低发送速率"],
            ["随机复位后重连", "电源瞬态跌落", "示波器抓发射瞬间的电源电压"],
            ["手机锁屏后断开", "系统省电策略", "后台模式与保活配置"]
          ]
        },
        apply: `<p>遇到过一次“戴在手腕上就断，放桌上正常”的问题，RSSI 显示 -70dBm 左右并不算差。最后发现是天线下方走了电池排线，人手接触后改变了天线谐振，驻波变差。改板时把天线区域净空并远离金属，问题消失。</p>
<p>还有一次是“升级固件后开始随机断开”，查了两天射频，最后发现是新加的业务任务优先级设得太高，阻塞了协议栈任务，导致错过连接事件。把优先级调低并缩短临界区就恢复了。</p>`,
        pitfalls: [
          "<b>不看断开原因码就调参数。</b>方向错了，越调越乱。",
          "<b>把连接间隔设得很小求“快”。</b>功耗高、且更易与 Wi-Fi 抢时间导致丢包。",
          "<b>忽略电源瞬态。</b>发射瞬间的电压跌落会造成随机复位，表现非常像射频问题。",
          "<b>MTU 不协商就发长包。</b>超过 20 字节会被协议栈自动分包，应用层若按整包解析就会错帧。"
        ],
        follow: [
          ["怎么确认是干扰还是距离问题？", "固定距离、改变环境（关掉附近 Wi-Fi、换房间）对比。干扰问题通常表现为“特定位置必断”，距离问题则是“越远越差、靠近就好”。"],
          ["从机延迟（Slave Latency）设大有什么风险？", "从机可以跳过多个连接事件不应答，省电但响应变慢；设太大且主机侧监督超时不够时，容易被判为掉线。"],
          ["为什么手机后台更容易断？", "iOS/Android 对后台 BLE 有严格限制：扫描受限、连接参数被拉长、长时间无数据会被系统回收。需要申请后台模式或在协议层加心跳。"]
        ]
      },

      {
        id: "M-32",
        chapter: "wireless",
        topic: "gatt",
        title: "手机 App 和 BLE 设备通信，完整的链路是怎么搭起来的？",
        diff: "高级",
        freq: "高频",
        type: "架构设计题",
        point: "设备端 GATT 服务设计与手机端发现流程的完整对接，以及平台差异和自定义帧协议的必要性。",
        q: `<p>面试官：让你从零做一个手机 App 控制 BLE 设备，设备端和手机端分别要做什么？</p>`,
        exam: `<p>考察端到端的实操经验。能说清“写特征收命令、通知特征上报、CCCD 使能”这条主链路，就说明真做过。</p>`,
        core: `<p>设备端（Peripheral + GATT Server）：GAP 启动广播，广播数据带服务 UUID（iOS 后台扫描必需）；GATT 定义服务，至少一个可写特征值收命令、一个支持 Notify 的特征值上报，可加标准电池服务；写回调里解析执行，需要回数据时发 Notify。</p><p>手机端（Central + GATT Client）：按服务 UUID 过滤扫描 → 连接拿句柄 → 发现服务、特征值、描述符 → 对通知特征写 CCCD <code>0x0001</code> 使能通知 → 写命令特征下发、在通知回调收数据 → 断开后指数退避重连，重连必须重新使能 CCCD。</p><p>平台差异：iOS 后台扫描必须指定 Service UUID、MTU 自动协商、单次写入有限制；Android 要主动 <code>requestMtu(247)</code>、Android 12+ 要 BLUETOOTH_CONNECT 权限、部分机型写入超 20 字节要分段。还必须自己做帧协议（帧头 + 长度 + 序号 + CRC + 状态机），否则一定会在某个机型上解析错乱。</p>`,
        answer: `<p><b>设备端（Peripheral + GATT Server）：</b></p>
<ul>
<li>GAP：启动广播，广播数据里带上服务 UUID（iOS 后台扫描必需）。</li>
<li>GATT：定义服务表。一般至少两个特征值——一个可写（收手机命令），一个支持 Notify（上报数据给手机）；再加一个标准电池服务凑齐通用性。</li>
<li>写回调里解析命令、执行业务，需要回数据时调用 Notify。</li>
</ul>
<p><b>手机端（Central + GATT Client）流程：</b></p>
<ol>
<li>扫描（按服务 UUID 过滤，省电且准确）。</li>
<li>连接，拿到连接句柄。</li>
<li>发现服务、发现特征值、发现描述符。</li>
<li>对通知特征写 CCCD（0x0001 使能通知），否则永远收不到数据。</li>
<li>写命令特征下发指令；在通知回调里收数据。</li>
<li>断开回调里做重连（指数退避），重连后必须重新使能 CCCD。</li>
</ol>
<p><b>平台差异：</b>iOS 后台扫描必须指定 Service UUID、MTU 自动协商（常见 185）、单次写入有限制；Android 需要主动 requestMtu(247)、Android 12+ 要 BLUETOOTH_CONNECT 权限、部分机型写入超过 20 字节要分段。</p>
<p><b>必须自己做帧协议：</b>BLE 是字节流，一次 Notify 可能是半包也可能是多包拼在一起。要给数据加「帧头 + 长度 + 序号 + CRC」，用状态机收包，否则一定会在某个机型上出现解析错乱。</p>`,
        principle: `<p>BLE 的读写是“属性操作”，不是“流”。每次写都是一次 GATT 请求/响应往返，有开销；Notify 是单向推送，无确认（Indicate 才有确认）。所以高频数据用 Notify，可靠指令用 Indicate 或应用层 ACK。</p>
<p>默认 MTU 23 意味着 ATT 有效载荷只有 20 字节，一条 100 字节的指令会被拆成 5 包，任何一包丢了整帧就废了。所以协商 MTU 是提升吞吐的第一步，但仍然不能假设“一次回调就是一帧”。</p>`,
        fig: {
          type: "table",
          title: "设备端与手机端的分工",
          tag: "ble-e2e",
          head: ["阶段", "设备端", "手机端"],
          rows: [
            ["发现", "启动广播，带服务 UUID", "按 UUID 扫描"],
            ["连接", "接受连接，进入从机角色", "发起连接，协商连接参数"],
            ["发现服务", "维护 GATT 服务表", "发现服务/特征/描述符"],
            ["订阅", "等待写 CCCD", "写 CCCD 使能通知"],
            ["通信", "写回调收命令、Notify 上报", "写特征下发、通知回调收数据"]
          ]
        },
        code: {
          lang: "c",
          title: "gatt_service.c",
          src: `/* 设备端：一个命令特征（可写）+ 一个数据特征（通知） */
static const uint8_t UUID_SVC[16]  = { 0x01,0x02,0x03,0x04, 0x05,0x06, 0x07,0x08,
                                       0x09,0x0A, 0x0B,0x0C,0x0D,0x0E,0x0F,0x10 };
static const uint8_t UUID_CMD[16]  = { /* 可写特征 */ };
static const uint8_t UUID_DATA[16] = { /* 通知特征 */ };

static void on_cmd_write(uint16_t conn, const uint8_t *data, uint16_t len)
{
    /* 不要假设 len 就是完整一帧：可能半包，也可能多帧粘在一起 */
    frame_feed(data, len);

    frame_t f;
    while (frame_pop(&f) == 0) {          /* 状态机逐帧取出 */
        if (f.crc_ok == 0) continue;      /* 校验失败直接丢弃 */
        handle_command(f.cmd, f.payload, f.payload_len);
    }
}

/* 需要主动上报时：组帧后 Notify */
void report_status(uint8_t cmd, const uint8_t *payload, uint8_t len)
{
    uint8_t buf[64];
    uint16_t n = frame_build(buf, sizeof(buf), cmd, payload, len);

    if (n == 0) return;
    /* 发送失败通常是对端缓冲满，退避后重试而非死等 */
    if (ble_notify(UUID_DATA, buf, n) != 0) {
        app_queue_retry(buf, n);
    }
}`
        },
        codeNote: "写回调里绝不要直接做耗时业务（比如写 Flash、驱动电机），会让 ATT 响应超时。正确做法是入队后交给业务任务处理，回调尽快返回。",
        apply: `<p>做一个设备配置 App 时，最初没协商 MTU，读设备信息要 6 个包，iOS 上经常只收到 4 个就断了帧。加了 MTU 协商到 185 并把协议改成「长度 + 序号 + 分片重组」后，一次就能拿全。</p>
<p>另一个高频问题：Android 部分机型连续写超过 20 字节会失败且不报错。后来统一改成按 MTU 分片、每片之间留 20ms 间隔，才在各机型上稳定。</p>`,
        pitfalls: [
          "<b>不写 CCCD 就等通知。</b>这是“连上了但没数据”最常见的原因。",
          "<b>假设一次回调等于一帧。</b>MTU 变大后多帧粘在一起，解析必错。",
          "<b>在写回调里做耗时操作。</b>ATT 响应超时，手机会认为设备无响应并断开。",
          "<b>重连后忘记重新使能 CCCD。</b>重连成功但收不到数据，误判为设备问题。"
        ],
        follow: [
          ["Notify 和 Indicate 怎么选？", "Notify 无确认、快、可能丢；Indicate 需要客户端回确认、慢但可靠。状态上报用 Notify，关键配置写入用 Indicate 或应用层 ACK。"],
          ["怎么提高 BLE 吞吐？", "协商大 MTU、用 Notify 而不是读、缩短连接间隔、一次连发多包。实测在 iOS 上 20~50KB/s 是常见水平，和连接参数强相关。"],
          ["iOS 后台能一直保持连接吗？", "可以保持连接，但后台扫描受限、连接参数会被拉长，长时间无数据可能被系统回收。需要在 Info.plist 声明 bluetooth-central 后台模式。"]
        ]
      },

      {
        id: "M-33",
        chapter: "wireless",
        topic: "net",
        title: "MQTT 断线重连后，断线期间的消息怎么保证不丢？",
        diff: "高级",
        freq: "中频",
        type: "可靠性设计题",
        point: "持久会话与 Clean Session 的作用、本地缓存补发、指数退避重连，以及 broker 离线消息的容量上限。",
        q: `<p>面试官：设备用 MQTT 上报，网络断了几分钟又恢复，这几分钟的数据怎么办？怎么保证不丢不重？</p>`,
        exam: `<p>考察对 MQTT 会话机制的理解，以及“协议保证不了的部分要应用层兜底”这个意识。</p>`,
        core: `<p>协议层靠持久会话：MQTT 3.1.1 把 Clean Session 设为 0（MQTT 5 用 Session Expiry Interval）并固定 ClientID，broker 会保留订阅关系和 QoS 1/2 的离线消息，重连自动下发；Clean Session=1 则断线期间的消息直接丢。</p><p>但协议层不够：broker 离线队列有容量上限，超了丢最旧的；QoS 1 还会重复投递。所以关键数据要本地兜底：断线期间写本地环形队列（内存 + 关键数据落 Flash），重连后按序补发，每帧带自增序号让服务端去重判漏。重连用指数退避 + 随机抖动（1s、2s、4s…上限 60s），抖动是防止大量设备同时重连打垮 broker。Keep Alive 太长离线发现慢，太短在 NB-IoT 这类高延迟网络上会误判断线。</p>`,
        answer: `<p><b>协议层：靠持久会话。</b>MQTT 3.1.1 里把 Clean Session 设为 0（MQTT 5 用 Session Expiry Interval），并使用固定的 ClientID，broker 就会保留这个客户端的订阅关系和 QoS 1/2 的离线消息，重连后自动下发。如果 Clean Session=1，每次连接都是全新会话，断线期间的消息直接丢弃。</p>
<p><b>但协议层不够：</b>broker 的离线队列有容量上限（不同 broker 默认值不同，常见几百到几千条），超了就丢最旧的；QoS 1 还会导致重复投递。所以关键数据必须本地兜底。</p>
<p><b>本地兜底：</b>断线期间产生的数据先写本地环形队列（内存 + 关键数据落 Flash），重连成功后按序补发；每帧带一个自增序号，服务端按序号去重和判漏。</p>
<p><b>重连策略：</b>指数退避 + 随机抖动，比如 1s、2s、4s…上限 60s。抖动很重要——大量设备同时掉线后如果都按固定节奏重连，会把 broker 打垮（惊群）。</p>
<p><b>Keep Alive 与遗嘱配合：</b>Keep Alive 太长会导致离线发现慢，太短在 NB-IoT 这类高延迟网络上会频繁误判断线。</p>`,
        principle: `<p>MQTT 的可靠性是分层的：TCP 保证“连接内不丢不乱序”，QoS 保证“会话内的重传语义”，剩下的“跨断线、跨会话”的可靠性协议本身给不了，必须应用层做队列 + 序号 + 幂等。</p>
<p>理解了这一点，就不会指望“把 QoS 设成 2 就万无一失”：QoS 2 只在同一条会话内保证恰好一次，会话都断了、broker 队列也满了的时候，它无能为力。</p>`,
        fig: {
          type: "table",
          title: "三个层次的可靠性来源",
          tag: "mqtt-reliable",
          head: ["层次", "保证什么", "不管什么"],
          rows: [
            ["TCP", "连接内不丢、不乱序", "连接断开后的重发"],
            ["QoS 1/2", "会话内重传与去重", "会话外的消息、队列溢出"],
            ["应用层", "本地缓存、补发、幂等", "需要自己实现"]
          ]
        },
        code: {
          lang: "c",
          title: "mqtt_reconnect.c",
          src: `/* 指数退避 + 抖动，避免大量设备同时重连打垮 broker */
static uint32_t backoff_ms = 1000u;

static void on_disconnected(void)
{
    uint32_t jitter = rand_u32() % 500u;      /* 0~500ms 抖动 */
    uint32_t wait   = backoff_ms + jitter;

    if (backoff_ms < 60000u) backoff_ms <<= 1;  /* 上限 60s */
    schedule_reconnect(wait);
}

static void on_connected(void)
{
    backoff_ms = 1000u;                        /* 连上后重置 */
    mqtt_subscribe(TOPIC_CMD, 1);

    /* 关键：把断线期间缓存的数据按序补发 */
    cache_replay(resend_one);
}

/* QoS1 会重复，服务端按 seq 去重 */
static int resend_one(const record_t *r)
{
    char buf[64];
    int n = snprintf(buf, sizeof(buf), "{\\"seq\\":%lu,\\"v\\":%d}",
                     (unsigned long)r->seq, r->value);

    if (mqtt_publish(TOPIC_DATA, buf, n, /*qos*/1, /*retain*/0) != 0) {
        return -1;                             /* 失败保留在队列里等下次 */
    }
    cache_ack(r->seq);                         /* 确认后才出队 */
    return 0;
}`
        },
        codeNote: "出队时机很关键：必须在发布成功（或收到 PUBACK）之后才 ack，否则“发出去但没到 broker”的数据会永久丢失。缓存要有容量上限和溢出策略（丢最旧还是丢最新，取决于业务）。",
        apply: `<p>做过一款靠 4G 上报的采集设备，最初 Clean Session=1、没有本地缓存，运营商网络抖动一次就丢几分钟数据，客户投诉很多。改成 Clean Session=0 + 固定 ClientID + 本地 8KB 环形队列（约 500 条）后，短时断网完全无感。</p>
<p>还踩过一个坑：重连后一次性把 500 条全推上去，broker 限流直接断开。改成每批 10 条、批间隔 50ms 的匀速补发才稳定。</p>`,
        pitfalls: [
          "<b>Clean Session=1 却指望离线消息。</b>每次连接都是新会话，broker 不会保存任何东西。",
          "<b>ClientID 每次随机生成。</b>broker 认不出是同一个客户端，持久会话失效。",
          "<b>重连不加重试上限。</b>断网时疯狂重连，耗电且可能被 broker 拉黑。",
          "<b>补发不限速。</b>缓存几百条一次性推，容易触发限流或把带宽打满。"
        ],
        follow: [
          ["QoS 1 重复投递了怎么处理？", "应用层按消息序号或业务 ID 做幂等：服务端记录已处理的最大序号，收到旧序号直接丢弃并回 ACK。"],
          ["Keep Alive 设多少合适？", "Wi-Fi 场景 60s 左右；NB-IoT 这类高延迟网络要放宽到 120~300s，否则频繁误判断线。同时要小于 NAT 表项老化时间。"],
          ["遗嘱消息能替代断线检测吗？", "能覆盖“异常断开”的场景，但依赖 broker 的 Keep Alive 超时，发现延迟可能几十秒。要求秒级检测的产品还要靠心跳主题或服务端主动探测。"]
        ]
      },

      {
        id: "M-34",
        chapter: "wireless",
        topic: "wifi",
        title: "智能设备第一次联网，怎么把 Wi-Fi 密码交给它？几种配网方案怎么选？",
        diff: "高级",
        freq: "高频",
        type: "方案设计题",
        point: "SmartConfig、AP 配网、BLE 配网、二维码的体验与可靠性差异，以及配网状态机与安全窗口。",
        q: `<p>面试官：一个没有屏幕没有按键的 Wi-Fi 设备，怎么让用户把它连上家里的路由器？你选哪种方案，为什么？</p>`,
        exam: `<p>考察实际产品经验。能对比成功率、用户体验、成本，并给出“主方案 + 兜底方案”的组合，比只报一个技术名词强。</p>`,
        core: `<p>四种方案：SmartConfig 把 SSID/密码编码进 UDP 广播包长度序列，设备混杂模式嗅探，不用切 Wi-Fi，但成功率受手机、路由器、系统版本影响大；AP 配网让设备开热点 + DHCP + 网页，成功率高、能回显错误，但要手动切 Wi-Fi；BLE 配网体验和成功率最好、不用切网，但要加 BLE 成本和 App；二维码/声波适合有屏或摄像头的设备，凭据明文安全性一般。</p><p>选择：只有 Wi-Fi 且成本敏感 → AP 配网为主、SmartConfig 为辅；已有 BLE → BLE 配网；有屏有摄像头 → 二维码。工程上必须有配网状态机、配网窗口限时（如 5 分钟）、失败原因可回显、配完关 AP 并保存凭据到 NVS/Flash。</p>`,
        answer: `<p><b>四种主流方案：</b></p>
<ul>
<li><b>SmartConfig（一键配网）</b>：手机 App 把 SSID 和密码编码进 UDP 广播包的长度序列，设备在混杂模式下嗅探解析。优点是不用切换 Wi-Fi，体验顺；缺点是成功率受手机、路由器、iOS 版本影响大，失败时用户完全不知道卡在哪。</li>
<li><b>AP 配网（热点配网）</b>：设备开热点 + DHCP + 内置网页，手机连上后提交凭据。成功率高、能回显错误、能显示设备状态；缺点是要手动切 Wi-Fi，iOS 上还需手动打开页面。</li>
<li><b>BLE 配网</b>：手机通过 BLE 把凭据写给设备，再让设备去连 Wi-Fi。体验最好、成功率高、不需要切网；缺点是要加 BLE 成本，且需要 App。</li>
<li><b>二维码 / 声波</b>：把配网信息编码在二维码里让设备摄像头读，或用声波传输。适合有屏幕/camera 的设备，凭据明文在码里，安全性一般。</li>
</ul>
<p><b>怎么选：</b>成本敏感且只有 Wi-Fi → AP 配网为主、SmartConfig 为辅；已经有 BLE → BLE 配网；有屏有摄像头 → 二维码最省事。</p>
<p><b>工程上必须做的四件事：</b>配网状态机（未配网 → 配网中 → 连接中 → 已连接 → 失败回退）；配网窗口限时（5 分钟内没成功就关闭，省电 + 降风险）；失败原因可回显（密码错、找不到 AP、信号弱）；配网完成后关闭 AP 并保存凭据到 NVS/Flash。</p>`,
        principle: `<p>配网的本质是“让设备获得目标 AP 的 SSID 和密码”。所有方案都是在解决“怎么在设备没有输入界面的前提下把这两个字符串传进去”，区别只在于用哪条物理通道（UDP 广播、热点网页、BLE、光学、声波）。</p>
<p>因此评价方案的核心指标是三条：通道是否稳定可达、用户体验是否需要额外操作、凭据在传输中是否暴露。AP 配网在稳定性和可诊断性上最好，SmartConfig 在体验上最好但最不可控。</p>`,
        fig: {
          type: "table",
          title: "四种配网方案对比",
          tag: "provision",
          head: ["方案", "用户体验", "成功率", "成本与限制"],
          rows: [
            ["SmartConfig", "好，不用切网", "中，依赖机型", "零硬件成本，失败难诊断"],
            ["AP 配网", "中，要切 Wi-Fi", "高，可回显错误", "需实现 DHCP 与网页"],
            ["BLE 配网", "好，无需切网", "高", "增加 BLE 成本，需要 App"],
            ["二维码/声波", "好，扫一下", "高", "需摄像头，凭据明文"]
          ]
        },
        code: {
          lang: "c",
          title: "provision_fsm.c",
          src: `/* 配网状态机：带超时回退，避免设备长期停在配网模式 */
typedef enum {
    PROV_IDLE = 0,
    PROV_AP_ON,          /* 热点已开，等手机连入 */
    PROV_RECEIVED,       /* 收到凭据，正在连路由器 */
    PROV_CONNECTED,
    PROV_FAILED
} prov_state_t;

static prov_state_t st = PROV_IDLE;
static uint32_t    t_enter_ms;

void prov_tick(uint32_t now_ms)
{
    switch (st) {
    case PROV_AP_ON:
        if (now_ms - t_enter_ms > 5u * 60u * 1000u) {   /* 5 分钟超时 */
            prov_stop_ap();
            prov_enter(PROV_FAILED);
        }
        break;

    case PROV_RECEIVED:
        if (now_ms - t_enter_ms > 20u * 1000u) {        /* 连路由最多等 20s */
            prov_enter(PROV_FAILED);
        }
        break;

    default:
        break;
    }
}

/* 手机通过 AP 网页提交凭据后调用 */
int prov_submit(const char *ssid, const char *pass)
{
    if (!ssid || !pass || strlen(ssid) >= 32 || strlen(pass) >= 64) {
        return -1;                                     /* 参数非法，回显给页面 */
    }
    nvs_save_wifi(ssid, pass);                         /* 先持久化，掉电不丢 */
    prov_enter(PROV_RECEIVED);
    wifi_connect_sta(ssid, pass);
    return 0;
}`
        },
        codeNote: "凭据要先写 NVS/Flash 再尝试连接，否则连不上又掉电，用户还得重新配。超时时间要按产品定：电池设备短一些，插座类可以长一些。",
        apply: `<p>我们产品最终是“BLE 配网为主 + AP 配网兜底”：有 App 的用户走 BLE，几秒完成；没有 App 或 BLE 失败时，长按按键切到 AP 模式，用浏览器配。两条路都有明确的状态指示（蓝灯慢闪 = 待配网，快闪 = 连接中，常亮 = 成功）。</p>
<p>早期只做 SmartConfig，售后反馈里“配不上”占比最高，而且客服完全无法判断卡在哪一步。改成 AP 配网后，页面能直接提示“密码错误”或“未找到该 Wi-Fi”，投诉明显下降。</p>`,
        pitfalls: [
          "<b>只做一种配网方案。</b>特定机型或路由器下必然有一批用户配不上，必须有兜底。",
          "<b>配网窗口不限时。</b>设备长期开热点，电池撑不住，也给附近的人留了入口。",
          "<b>凭据只在内存里。</b>配网成功但没落 Flash，一断电就得重配。",
          "<b>失败不给原因。</b>用户只能反复重试，体验和售后成本都很差。"
        ],
        follow: [
          ["配网时 SSID 有中文或特殊字符怎么办？", "统一按 UTF-8 传输并原样写入，不要自己做转义；AP 配网页面用 URL 编码提交，服务端解码后再存。测试要覆盖中文 SSID 和带空格的密码。"],
          ["设备换了路由器怎么办？", "提供“恢复配网”的入口：长按按键若干秒清除 NVS 里的凭据并重启进入配网模式。这个入口必须有，否则设备变成砖。"],
          ["配网信息能被别人截获吗？", "SmartConfig 的凭据在空口是可见的，附近抓包的人能还原 SSID 和密码；AP 配网如果不开 WPA2 也一样。所以 AP 必须加密，且配网完成后立即关闭。"]
        ]
      }
    ]
  });
})();
