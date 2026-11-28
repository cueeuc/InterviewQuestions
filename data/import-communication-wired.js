/* ============================================================
   import-communication-wired.js
   从 IIC 专题、SPI 专题导入的补充题（仅收录站内没有重复的）
   答案按工程实践重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("communication", {
    questions: [
      {
        id: "M-35",
        chapter: "wired",
        topic: "i2c",
        title: "一条 I2C 总线上挂了多个同型号传感器，地址都一样，怎么解决？",
        diff: "中级",
        freq: "中频",
        type: "方案设计题",
        point: "地址冲突是物理层问题；地址引脚、I2C MUX、独立总线与分时供电的取舍。",
        q: `<p>面试官：一条 I2C 总线上要接 4 个同型号的温湿度传感器，7 位地址都是 <code>0x44</code>，怎么办？</p>`,
        exam: `<p>考察硬件设计经验。能先指出“地址冲突软件改不了”，再给出地址引脚、MUX、分总线三种方案并比较代价，就到位了。</p>`,
        core: `<p>I2C 地址由器件固定，两个同地址器件不能挂同一条总线；可用 ADDR 引脚错开、TCA9548A 多路复用器、拆总线或分时供电。</p>`,
        answer: `<p><b>先说结论：</b>I2C 从机地址由器件内部固定，部分型号再由 ADDR 引脚决定。主机不能像 TCP 端口那样“给谁分配一个地址”，所以两个同地址器件同时挂在一条总线上，一定会同时应答——开漏线与之后读回的数据是两个器件输出的叠加，必然出错。<b>这是硬件层问题，软件解决不了。</b></p>
<p><b>方案一：用地址引脚错开（首选）</b></p>
<ul>
<li>很多传感器有 ADDR / A0 / A1 / SDO 引脚，接 GND 或 VCC 可以得到 2~4 个不同地址。例如 SHT3x 的 ADDR 接低是 0x44、接高是 0x45；BMP280 的 SDO 接低是 0x76、接高是 0x77。</li>
<li>先查数据手册的地址表，不要凭经验猜。有些器件的 ADDR 引脚是三态（接 SCL/SDA 也能选地址），可以做出更多组合。</li>
<li>代价最低，只需要改 PCB 上的一个电阻或跳线。</li>
</ul>
<p><b>方案二：I2C 多路复用器（地址数量不够时）</b></p>
<ul>
<li>典型器件 TCA9548A：1 个上游端口、8 个下游通道，自身占一个地址（0x70~0x77 可配）。每个通道是一条独立总线，可以各挂一个 0x44，互不冲突。</li>
<li>访问流程：先向 MUX 写一个字节选择通道（bit0~bit7 对应 CH0~CH7），再按原地址访问该通道上的器件。</li>
<li>注意 MUX 有导通电阻（约几十欧）、通道电容，速率和上拉要重新核算；上电默认所有通道断开，初始化时要先选通道；切换通道后给传感器留一点稳定时间。</li>
</ul>
<p><b>方案三：拆成多条独立总线</b></p>
<ul>
<li>MCU 有多组 I2C 就分别挂；没有就考虑软件模拟多组，或者用 MUX。</li>
<li>也可以用 GPIO 控制传感器的 EN/VDD，分时上电：未上电的器件不会应答。但要注意漏电流、上电时间和传感器初始化时间，且不是所有器件都适合频繁断电。</li>
</ul>
<p><b>方案四：换型号 / 换封装 / 换接口</b>：选带地址引脚的版本，或者直接用 SPI 版本的传感器。</p>
<p><b>不推荐：</b>把两个同地址器件直接并联；靠“地址扫描”区分（扫描只能看到“有应答”，分不清是谁）；用软件改地址（除非器件明确支持且能掉电保存）。</p>`,
        principle: `<p>I2C 的寻址发生在协议层，冲突发生在物理层。总线上所有器件都能看到地址字节，地址匹配的器件都会在 ACK 位拉低 SDA。两个器件同时拉低不会短路（开漏），但后续数据位会变成“线与”的结果，主机读到的既不是 A 的数据也不是 B 的数据。</p>
<p>MUX 的本质是“分时切换总线”，不是“地址转换”。它把一条总线切成多条，每条的总线电容、上拉、速率都可以独立计算，所以能彻底解决同地址问题，代价是增加一个器件、几根走线和通道切换开销。</p>`,
        fig: {
          type: "table",
          title: "同地址冲突的四类解法",
          tag: "i2c-address",
          head: ["方案", "做法", "优点", "限制"],
          rows: [
            ["地址引脚", "ADDR / A0 / A1 接不同电平", "零成本、最可靠", "地址数量有限（通常 2~4 个）"],
            ["I2C MUX", "TCA9548A 等一分为八", "可挂大量同地址器件", "增加成本、电容和切换开销"],
            ["多条总线", "多组 I2C 或软件模拟", "互不干扰", "占用引脚和外设资源"],
            ["分时供电", "GPIO 控制 EN / VDD", "省地址", "上电时序复杂，可能漏电"]
          ]
        },
        code: {
          lang: "c",
          title: "tca9548a.c",
          src: `#define TCA9548A_ADDR  0x70

/* 选择 MUX 通道：bit0~bit7 对应 CH0~CH7 */
int tca_select(uint8_t ch)
{
    if (ch > 7) return -1;

    uint8_t mask = (uint8_t)(1u << ch);

    return HAL_I2C_Master_Transmit(&hi2c1,
                                   (uint16_t)(TCA9548A_ADDR << 1),
                                   &mask, 1, 5) == HAL_OK ? 0 : -2;
}

/* 每个通道上都可以有一个同地址的 SHT30 */
int read_sht30_on_ch(uint8_t ch, float *t, float *h)
{
    if (tca_select(ch) != 0) return -1;
    HAL_Delay(1);                       /* 等通道稳定 */

    uint8_t cmd[2] = { 0x24, 0x00 };    /* 单次测量，高重复性 */
    if (HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(0x44 << 1),
                                cmd, 2, 5) != HAL_OK) {
        return -2;
    }

    HAL_Delay(20);

    uint8_t raw[6];
    if (HAL_I2C_Master_Receive(&hi2c1, (uint16_t)(0x44 << 1),
                               raw, 6, 5) != HAL_OK) {
        return -3;
    }

    /* 真实项目必须校验 raw[2] / raw[5] 两个 CRC8 */
    *t = -45.0f + 175.0f * (float)((raw[0] << 8) | raw[1]) / 65535.0f;
    *h = 100.0f * (float)((raw[3] << 8) | raw[4]) / 65535.0f;
    return 0;
}`
        },
        codeNote: "选通道后加 1ms 延时是保守做法：TCA9548A 本身切换很快，但下游传感器的总线电容和上拉需要稳定，某些器件还会在总线状态变化后复位通信状态。",
        apply: `<p>做过一块 8 路环境采集板，8 个 SHT30 全部是 0x44。最初想用地址引脚，但这款封装没有 ADDR，最后用两片 TCA9548A 级联（各自地址 0x70、0x71），每片 4 路，共 8 路。软件上封装了“通道号 → 设备”的映射，业务层只按通道读，完全不用关心 MUX。</p>
<p>踩过的坑：MUX 上电默认全断，初始化时忘了先选通道，扫描整条总线只能看到 MUX 自己；另外通道切换后立刻读，个别传感器第一次会 NACK，加 1ms 延时后稳定。</p>`,
        pitfalls: [
          "<b>把同地址器件直接并联。</b>两个从机会同时 ACK、同时驱动数据，读回值与谁都不一致。",
          "<b>以为软件能改从机地址。</b>除非器件手册明确支持，否则地址是硬件决定的。",
          "<b>用地址扫描判断有几个器件。</b>同地址的多个器件扫描只会看到一个 ACK。",
          "<b>MUX 切换后不等稳定。</b>通道刚导通就访问，首字节偶发 NACK。"
        ],
        follow: [
          ["MUX 切换后为什么要延时？", "TCA9548A 的通道导通时间很短（纳秒级），但下游总线的电容、上拉和从机的总线状态需要时间稳定；某些从机在总线断开/重连后会复位通信状态。工程上留 100µs~1ms 最稳妥。"],
          ["地址扫描能发现同地址的两个器件吗？", "不能。扫描只判断该地址有没有 ACK，两个同地址器件都会 ACK，主机无法分辨是谁。要确认数量，只能逐个断电/逐路选通后扫描。"],
          ["TCA9548A 能级联吗？最多多少路？", "可以。每片有 8 个可选地址（0x70~0x77），8 片 × 8 通道 = 64 路下游总线。但级联后总电容、切换延时会累积，速率通常要降，布线也更复杂。"]
        ]
      },

      {
        id: "M-36",
        chapter: "wired",
        topic: "i2c",
        title: "I2C 协议本身有 CRC 校验或重传机制吗？数据完整性怎么保证？",
        diff: "高级",
        freq: "中频",
        type: "协议分析题",
        point: "ACK 不等于数据正确；I2C 无 CRC、无自动重传，完整性要靠器件层、协议层和系统层共同补。",
        q: `<p>面试官：I2C 每个字节都有 ACK，这是不是就说明数据不会错？协议本身有 CRC 或重传吗？如果要求高可靠，你怎么做？</p>`,
        exam: `<p>考察对 ACK 语义的理解。很多人把 ACK 当成“数据校验通过”，其实它只表示接收方在第 9 个时钟拉低了 SDA。能说清这一点并给出分层方案，就很扎实。</p>`,
        core: `<p>I2C 没有 CRC 和自动重传，只有 ACK/NACK 和超时；数据完整性要靠器件 CRC、写后读回或协议层 CRC16，死锁时发 9 个时钟恢复。</p>`,
        answer: `<p><b>I2C 本身没有 CRC，也没有自动重传。</b>它提供的可靠性机制只有四个：</p>
<ul>
<li><b>ACK/NACK</b>：每 8 位数据后，接收方在第 9 个时钟把 SDA 拉低表示“收到了”。它确认的是“这个字节被接收方拿走了”，不是“字节内容一定正确”。如果干扰发生在数据位采样之前，接收方可能收到错误值但仍然回 ACK。</li>
<li><b>时钟拉伸</b>：从机忙时拉低 SCL，让主机等待，避免数据被覆盖。</li>
<li><b>总线仲裁</b>：多主时保证只有一个主机在发，避免冲突。</li>
<li><b>总线锁死恢复</b>：主机发 9 个时钟让从机释放 SDA，再补 STOP。这是恢复手段，不是协议自动完成的。</li>
</ul>
<p><b>ACK 不能替代 CRC：</b>ACK 是逐字节的流控信号，没有覆盖整帧的完整性；位翻转如果落在数据位且被从机采错，从机照样会 ACK。真正的数据错误只能靠额外的校验发现。</p>
<p><b>分层保证完整性：</b></p>
<ol>
<li><b>器件层</b>：写配置寄存器后立刻读回比对；关键器件读状态寄存器；EEPROM/Flash 用器件自带的 CRC/ECC；传感器数据本身可能带 CRC（如 SHT3x 每 2 字节数据后跟 1 字节 CRC8）。</li>
<li><b>协议层</b>：自定义帧加帧头、长度、序号、CRC16/CRC32；CRC 覆盖地址、读写位、命令和数据，收发两端算法一致。ACK 只用于流控，不作为完整性依据。</li>
<li><b>传输层</b>：所有等待加超时；NACK 分类处理（器件忙就延时重试，总线死锁就发 9 个时钟恢复）；连续失败上报故障，不能无限重试。</li>
<li><b>系统层</b>：关键参数双备份 + 版本号 + 掉电检测；错误计数写日志；必要时整机复位或降级。</li>
</ol>
<p><b>如果器件支持 SMBus PEC</b>，可以启用 PEC：在每帧末尾附加 1 字节 CRC-8（多项式 0x07，初值 0），覆盖地址、读写位和所有数据字节。注意 PEC 是 SMBus 的可选特性，不是所有 I2C 器件都支持，开之前先看手册。</p>`,
        principle: `<p>I2C 的设计目标是“板内、短距离、低成本”，不是“高可靠”。它把完整性交给上层，这和 SPI 的思路类似：物理层只负责搬位，可靠性由协议自己补。</p>
<p>CRC 和 ACK 的职责完全不同：ACK 回答“你还在吗、这个字节收下了吗”，CRC 回答“这一整帧的内容对不对”。前者是逐字节的握手，后者是整帧的数学校验，不能互相替代。</p>`,
        fig: {
          type: "table",
          title: "I2C 各机制能发现什么",
          tag: "i2c-integrity",
          head: ["机制", "能发现", "发现不了"],
          rows: [
            ["ACK / NACK", "从机不存在、忙、地址错", "数据位被干扰但被错误采样"],
            ["时钟拉伸", "从机来不及处理", "总线干扰、位翻转"],
            ["仲裁", "多主同时发送", "单主的数据错误"],
            ["应用层 CRC", "整帧任意位错误（概率极高）", "收发双方算法/字节序不一致"],
            ["超时与重试", "无响应、死锁", "偶发错误但每次都“成功”返回"]
          ]
        },
        code: {
          lang: "c",
          title: "i2c_integrity.c",
          src: `/* 写配置后读回比对：比单纯看 HAL_OK 可靠得多 */
int i2c_write_reg_verified(uint8_t addr, uint8_t reg, uint8_t val)
{
    if (HAL_I2C_Mem_Write(&hi2c1, (uint16_t)(addr << 1),
                          reg, I2C_MEMADD_SIZE_8BIT,
                          &val, 1, 5) != HAL_OK) {
        return -1;
    }

    uint8_t back = 0;
    if (HAL_I2C_Mem_Read(&hi2c1, (uint16_t)(addr << 1),
                         reg, I2C_MEMADD_SIZE_8BIT,
                         &back, 1, 5) != HAL_OK) {
        return -2;
    }

    return (back == val) ? 0 : -3;      /* -3 表示写进去了但内容不对 */
}

/* SMBus PEC：CRC-8，多项式 0x07，初值 0，覆盖地址+读写位+数据 */
uint8_t smbus_pec(const uint8_t *data, uint8_t len)
{
    uint8_t crc = 0x00;

    for (uint8_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (uint8_t b = 0; b < 8; b++) {
            crc = (crc & 0x80u) ? (uint8_t)((crc << 1) ^ 0x07u)
                                : (uint8_t)(crc << 1);
        }
    }
    return crc;
}

/* 一次带 PEC 的寄存器读：地址(写) + 寄存器 + 地址(读) + 数据 + PEC */
int i2c_read_with_pec(uint8_t addr, uint8_t reg, uint8_t *out)
{
    uint8_t buf[4];
    uint8_t pec_src[4];

    if (HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(addr << 1),
                                &reg, 1, 5) != HAL_OK) {
        return -1;
    }

    if (HAL_I2C_Master_Receive(&hi2c1, (uint16_t)((addr << 1) | 1),
                               buf, 4, 5) != HAL_OK) {   /* 2 数据 + 1 PEC + 余量 */
        return -2;
    }

    pec_src[0] = (uint8_t)(addr << 1);       /* 写地址 */
    pec_src[1] = reg;
    pec_src[2] = (uint8_t)((addr << 1) | 1); /* 读地址 */
    pec_src[3] = buf[0];

    if (smbus_pec(pec_src, 4) != buf[2] || smbus_pec(pec_src, 5) != buf[2]) {
        /* 实际实现要严格按器件的 PEC 覆盖范围算，这里只示意 */
        return -3;
    }

    *out = buf[0];
    return 0;
}`
        },
        codeNote: "PEC 的覆盖范围必须严格按器件手册：有的从“地址+写”开始，有的包含重复起始后的地址。上面的示例为了展示思路做了简化，真实项目不能照抄。",
        apply: `<p>做过一款用 I2C EEPROM 存校准参数的设备，早期只判断 <code>HAL_OK</code>，结果现场偶发参数变成 0xFF。后来改成“写后读回 + 整块 CRC32 + 双备份”，并且在初始化时校验 CRC，坏了自动切备份。这类问题在实验室很难复现，但量产环境电源波动一大就会出现。</p>
<p>传感器侧也一样：SHT3x 本身每个字后面带 CRC8，我一开始嫌麻烦没校验，后来发现偶尔湿度会跳到 100%。加上 CRC 校验并丢弃坏帧后，数据就干净了。</p>`,
        pitfalls: [
          "<b>把 ACK 当 CRC。</b>ACK 只表示字节被收下，不保证内容正确。",
          "<b>只判断 HAL_OK。</b>HAL 返回成功只说明时序走完了，不说明从机真的写对了。",
          "<b>CRC 覆盖范围收发不一致。</b>发送端算地址+数据，接收端只算数据，必然一直报错。",
          "<b>出错后无限重试。</b>总线本身坏了会一直空转，必须限制次数并上报。"
        ],
        follow: [
          ["SMBus PEC 用的是什么 CRC？", "CRC-8，多项式 x^8 + x^2 + x + 1（0x07），初值 0，不反射，最后不异或。覆盖范围从地址字节开始，具体到哪些字节要看器件的 SMBus 规范。"],
          ["CRC 和校验和（Checksum）哪个好？", "CRC 的检错能力强得多，尤其是多位错误和突发错误；校验和实现简单但容易漏检。嵌入式里能用 CRC16/CRC32 就别用累加和。"],
          ["为什么 I2C 读最后一个字节要回 NACK？", "NACK 是告诉从机“不要再发了，我要结束本次读取”。如果最后一个字节也回 ACK，从机会继续输出下一个字节，主机再发 STOP 时可能破坏从机状态。"]
        ]
      },

      {
        id: "M-37",
        chapter: "wired",
        topic: "spi",
        title: "SPI 的 MSB first 和 LSB first 有什么区别？配错会怎样？",
        diff: "中级",
        freq: "中频",
        type: "协议细节题",
        point: "比特序决定一个数据帧里先发哪一位；配错会让每个字节按位反转，而不是随机乱码。",
        q: `<p>面试官：SPI 的比特序（MSB first / LSB first）是什么意思？如果主从配反了，现象是什么？</p>`,
        exam: `<p>考察是否真正调过 SPI 时序。能说出“0x01 会变成 0x80”这种可验证的现象，比泛泛而谈“通信失败”更有说服力。</p>`,
        core: `<p>SPI 的 MSB/LSB 配反会让数据整体位反转，0x01 读成 0x80、0x0F 读成 0xF0；用逻辑分析仪看第一个边沿发的是 D7 还是 D0。</p>`,
        answer: `<p><b>SPI 没有统一的“字节”概念，只有位流。</b>比特序决定一个数据帧里先发哪一位：</p>
<ul>
<li><b>MSB first（大端位序）</b>：先发最高位 D7，再 D6……最后 D0。绝大多数 SPI 器件（Flash、LCD、传感器）用这个。</li>
<li><b>LSB first（小端位序）</b>：先发最低位 D0，再 D1……最后 D7。少数 DAC、显示驱动、音频器件会用。</li>
</ul>
<p><b>配反的现象很典型：每个字节按位反转</b>，例如：</p>
<ul>
<li>0x01（0000 0001）→ 0x80（1000 0000）</li>
<li>0x0F（0000 1111）→ 0xF0（1111 0000）</li>
<li>0xAA（1010 1010）→ 0x55（0101 0101）</li>
</ul>
<p>所以读 Flash 的 JEDEC ID 会读不到正确值，屏幕会花屏或整体偏移，传感器寄存器地址会全错。它通常不是“随机乱码”，而是有规律的位反转——这一点可以用来快速判断是不是比特序配错。</p>
<p><b>怎么配：</b>STM32 的 <code>SPI_CR1</code> 里有 <code>LSBFIRST</code> 位；HAL 里是 <code>hspi.Init.FirstBit = SPI_FIRSTBIT_MSB / SPI_FIRSTBIT_LSB</code>。数据宽度由 <code>DS[3:0]</code> 决定（8 位、16 位等），16 位模式下比特序作用于整个 16 位帧，不是每个字节单独算。</p>
<p><b>验证方法：</b>如果从机支持回环，发 0x01 应读回 0x80（说明反了）；或者读器件 ID，和手册对照。用逻辑分析仪抓 MOSI，看第一个时钟沿上的位是 D7 还是 D0，最直接。</p>
<p><b>注意：</b>CPOL/CPHA 和比特序是两回事。CPOL/CPHA 决定“在哪个边沿采样”，比特序决定“先发哪一位”。两者都错会叠加，现象更难判断，调试时一次只改一个变量。</p>`,
        principle: `<p>SPI 的发送寄存器是一个移位寄存器：每个时钟把一端的一位移出，另一端移入。MSB first 是从寄存器的最高位端移出，LSB first 是从最低位端移出。8 个时钟后，接收方得到的字节正好是发送字节的位反转（如果双方顺序相反）。</p>
<p>因为 SPI 没有帧头、没有地址、没有 ACK，位序错了也不会有任何报错，只会安静地传出错误数据。这也是 SPI 调试必须看波形、读 ID 的原因。</p>`,
        fig: {
          type: "table",
          title: "比特序配反后的典型值",
          tag: "spi-bitorder",
          head: ["发送值", "MSB first 收到", "LSB first 收到"],
          rows: [
            ["0x01", "0x01", "0x80"],
            ["0x80", "0x80", "0x01"],
            ["0x0F", "0x0F", "0xF0"],
            ["0xAA", "0xAA", "0x55"],
            ["0x9F（Flash ID 命令）", "0x9F", "0xF9"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_bitorder.c",
          src: `/* 直接操作寄存器切换比特序：适合调试时快速验证 */
static void spi_set_bit_order(SPI_TypeDef *spi, int msb_first)
{
    if (msb_first) {
        spi->CR1 &= ~SPI_CR1_LSBFIRST;
    } else {
        spi->CR1 |= SPI_CR1_LSBFIRST;
    }
    /* 修改 CR1 前要先关闭 SPE，避免传输中改配置 */
}

/* HAL 方式：初始化时配置，运行中不要改 */
void spi_init_bit_order(SPI_HandleTypeDef *hspi, uint32_t order)
{
    hspi->Init.FirstBit = order;      /* SPI_FIRSTBIT_MSB / SPI_FIRSTBIT_LSB */
    hspi->Init.DataSize = SPI_DATASIZE_8BIT;
    HAL_SPI_Init(hspi);
}

/* 自检：发 0x01 读回，判断是否位反转（需要从机支持回环） */
int spi_bitorder_selftest(void)
{
    uint8_t tx = 0x01, rx = 0;
    HAL_SPI_TransmitReceive(&hspi1, &tx, &rx, 1, 10);

    if (rx == 0x01) return 0;         /* 正确 */
    if (rx == 0x80) return -1;        /* 比特序反了 */
    return -2;                        /* 其它问题：模式、接线、CS */
}`
        },
        codeNote: "运行中切换比特序必须先关闭 SPI（SPE=0），否则行为未定义。多数项目在初始化时固定，不需要动态改。",
        apply: `<p>调一块 ST7789 屏时遇到“颜色整体偏、坐标错位”，一开始怀疑是 RGB565 字节序，换了几种颜色格式都不对。后来用逻辑分析仪抓 MOSI，发现命令 0x2A 发出去变成了 0x54——典型的位反转，最后发现是初始化结构体里 FirstBit 被复制成了 LSB。改成 MSB 后一次点亮。</p>
<p>还有一次是接某款 DAC，手册写的是 LSB first，但它的“16 位数据”是分两个 8 位帧发的，每个字节内部又是 MSB first。这种要按“帧”而不是“字节”理解比特序，必须看时序图，不能只看一句话描述。</p>`,
        pitfalls: [
          "<b>把 CPOL/CPHA 和比特序混为一谈。</b>一个管采样边沿，一个管位顺序，改错方向会越调越乱。",
          "<b>16 位模式按字节理解比特序。</b>DS=16 时，比特序作用于整个 16 位帧。",
          "<b>只看代码不看波形。</b>比特序配错时逻辑分析仪一眼就能看出来，比反复改代码快。",
          "<b>运行中动态改 FirstBit。</b>SPI 使能时修改配置行为不确定，必须先关 SPE。"
        ],
        follow: [
          ["SPI 的 16 位模式和两个 8 位传输有什么区别？", "16 位模式是一次 CS 内连续移出 16 位，bit order 作用于整个 16 位字；两个 8 位传输是两次独立的 8 位帧，中间可以插入其它操作。有些器件要求 16 位一次发完，不能拆。"],
          ["为什么多数器件用 MSB first？", "历史习惯和协议兼容：SPI 起源于 Motorola 的移位寄存器接口，MSB first 与大多数芯片的串行协议、CRC 计算顺序一致。LSB first 多见于音频 DAC 和部分显示驱动。"],
          ["比特序配反会不会损坏器件？", "一般不会，只会收到错误数据。但如果错误数据恰好是器件的“写使能/擦除”命令，可能误操作。调试时先别接存储器，或者先只读 ID。"]
        ]
      },

      {
        id: "M-38",
        chapter: "wired",
        topic: "spi",
        title: "SPI 的轮询、中断、DMA 三种收发方式怎么选？大数据量怎么传？",
        diff: "高级",
        freq: "高频",
        type: "方案设计题",
        point: "按数据量、实时性和 CPU 占用选择；DMA 要处理全双工、CS 保持、缓存一致性和完成时机。",
        q: `<p>面试官：SPI 读 Flash、刷 LCD、读传感器，你会分别用轮询、中断还是 DMA？为什么？大数据量传输时要注意什么？</p>`,
        exam: `<p>考察实际驱动经验。能说清“命令用轮询、数据用 DMA”“全双工要开两个通道”“CS 必须等 BSY 清零再拉高”，就说明真的写过。</p>`,
        core: `<p>SPI 小数据量用轮询、中等用中断、大块用 DMA；全双工要同时收发，CS 要等 BSY 清零再拉高，带 Cache 的芯片要注意 clean/invalidate。</p>`,
        answer: `<p><b>三种方式的分工：</b></p>
<ul>
<li><b>轮询</b>：发一个字节，死等 TXE/RXNE 标志。代码最简单，适合初始化、短命令、低频寄存器读写。缺点是 CPU 全程忙等，数据量一大就拖垮实时性。</li>
<li><b>中断</b>：每字节或每半帧进一次中断，在 ISR 里搬数据。适合中等数据量、速率不高的场景（传感器、EEPROM）。缺点是中断频繁，上下文切换开销可能比数据本身还大。</li>
<li><b>DMA</b>：CPU 只配置源地址、目标地址和长度，剩下的由 DMA 搬。适合大块数据（LCD 刷屏、Flash 读写、ADC 连续采样、SD 卡）。CPU 占用最低，但配置复杂，且要处理完成时机和缓存一致性。</li>
</ul>
<p><b>大数据量的关键点：</b></p>
<ol>
<li><b>SPI 是全双工：</b>TX 和 RX 必须同时开、长度一致。只读时主机也要发哑字节（0xFF/0x00）来产生时钟，所以通常要同时启动 TX DMA 和 RX DMA；或者用 HAL 的 Receive_DMA，让它内部处理哑字节（不同 HAL 版本行为不同，要实测）。</li>
<li><b>CS 要在整帧期间保持低：</b>DMA 启动后不能在“发送完成中断”里立刻拉高 CS，因为此时最后一位可能还在移位（BSY 仍为 1）。要等 BSY 清零，或者在 HAL 的 TxCplt 回调里先查 BSY 再拉高。</li>
<li><b>缓冲区不能放在栈上：</b>DMA 是异步的，函数返回后栈帧可能被覆盖。用静态数组或堆上分配的、生命周期覆盖整个传输的缓冲区。</li>
<li><b>Cache 一致性：</b>Cortex-M7 等带 D-Cache 的芯片要分方向处理：DMA 从外设写内存（接收）时，启动前对缓冲区 clean+invalidate，完成后、CPU 读之前再 invalidate；DMA 从内存读外设（发送）时，启动前对缓冲区 clean，保证 DMA 看到的是 CPU 刚写入的最新数据。也可以把 DMA 缓冲区放到非缓存区域。</li>
<li><b>对齐和长度：</b>很多 DMA 要求源/目标地址按 2/4 字节对齐，长度是数据宽度的整数倍。不对齐会触发 BusFault 或传输错位。</li>
<li><b>完成通知：</b>用 DMA 完成中断 + 信号量/任务通知唤醒任务，不要在中断里做耗时处理。</li>
</ol>
<p><b>混合策略（最常用）：</b>命令、地址、短参数用轮询或中断；像素/数据段用 DMA。例如刷 LCD：先轮询发“设置窗口”命令，然后保持 CS 低，启动 DMA 发一大块像素，DMA 完成后拉高 CS。</p>`,
        principle: `<p>SPI 的速率上限由从机和 PCB 决定，不由 MCU 决定。DMA 不会提高总线速率，它只是把 CPU 从“搬字节”里解放出来，让 CPU 在传输期间做别的事。所以 DMA 的收益在“并发”，不在“更快”。</p>
<p>全双工是 SPI 的硬件结构决定的：发送移位寄存器和接收移位寄存器共用时钟，每来一个时钟必然同时收发一位。理解这一点，就能明白为什么“只读”也必须写哑字节、为什么 TX/RX DMA 要成对配置。</p>`,
        fig: {
          type: "table",
          title: "三种收发方式对比",
          tag: "spi-io",
          head: ["方式", "适合数据量", "CPU 占用", "典型场景"],
          rows: [
            ["轮询", "几字节~几十字节", "高（忙等）", "初始化、读 ID、短命令"],
            ["中断", "几十字节~几 KB", "中", "传感器、EEPROM、中速通信"],
            ["DMA", "几 KB~几 MB", "低", "LCD 刷屏、Flash、ADC、SD 卡"],
            ["混合", "任意", "低", "命令轮询 + 数据 DMA"]
          ]
        },
        code: {
          lang: "c",
          title: "spi_dma.c",
          src: `/* LCD 刷一块像素：命令用轮询，数据用 DMA，CS 全程保持低 */
int lcd_write_pixels(const uint8_t *buf, uint32_t len)
{
    lcd_set_window(0, 0, LCD_W - 1, LCD_H - 1);   /* 内部用轮询发命令 */

    CS_LOW();

    if (HAL_SPI_Transmit_DMA(&hspi1, (uint8_t *)buf, len) != HAL_OK) {
        CS_HIGH();
        return -1;
    }
    return 0;   /* 在 HAL_SPI_TxCpltCallback 里等 BSY 清零后拉高 CS */
}

/* DMA 发送完成回调：注意不能立刻拉 CS，要等最后一位移完 */
void HAL_SPI_TxCpltCallback(SPI_HandleTypeDef *hspi)
{
    if (hspi->Instance != SPI1) return;

    while (__HAL_SPI_GET_FLAG(hspi, SPI_FLAG_BSY)) { }  /* 等最后一位 */
    CS_HIGH();

    /* 通知任务：传输完成 */
    BaseType_t woken = pdFALSE;
    vTaskNotifyGiveFromISR(lcd_task_handle, &woken);
    portYIELD_FROM_ISR(woken);
}

/* 只读场景：TX/RX 两个 DMA 同时开，TX 发哑字节产生时钟 */
int spi_read_dma(uint8_t *dst, uint32_t len)
{
    static uint8_t dummy[256];           /* 不能用栈上缓冲区 */
    if (len > sizeof(dummy)) return -1;

    memset(dummy, 0xFF, len);
    CS_LOW();

    if (HAL_SPI_TransmitReceive_DMA(&hspi1, dummy, dst, len) != HAL_OK) {
        CS_HIGH();
        return -2;
    }
    return 0;
}`
        },
        codeNote: "HAL 的 TxCplt 回调触发时，数据通常已经写入 DR，但最后一位可能还在移位。必须查 BSY 或加足够延时再拉 CS，否则末字节会被截断。",
        apply: `<p>做 320×240 SPI 屏时，最初用轮询刷整屏，一帧要 60ms 以上，LVGL 动画只有几帧。改成“设窗口轮询 + 像素 DMA”后，CPU 在传输期间可以继续渲染下一块，帧率翻了一倍多。后来又把局部缓冲从全屏改成 1/10 屏，进一步降低了单次传输时间。</p>
<p>还踩过 CS 的坑：在 HAL_SPI_TxCpltCallback 里直接拉高 CS，屏幕右下角偶尔出现一条杂色。查波形发现最后一位还没移完，加了 BSY 等待后消失。这个现象很容易被误判成“屏幕时序问题”。</p>`,
        pitfalls: [
          "<b>只开 RX DMA 不开 TX。</b>主机不发数据就没有时钟，从机不会返回任何字节。",
          "<b>在发送完成回调里立刻拉高 CS。</b>最后一位被截断，表现为末字节偶发错误。",
          "<b>DMA 缓冲区放在栈上。</b>函数返回后栈被覆盖，DMA 还在搬，数据随机出错。",
          "<b>忽略 Cache 一致性。</b>M7 上 DMA 写完内存，CPU 读到的还是旧缓存，数据“看起来没更新”。"
        ],
        follow: [
          ["SPI 只用 TX DMA 会怎样？", "如果只写不读，可以只用 TX DMA；但如果要读从机数据，必须同时提供时钟并接收，通常要 TX/RX 两个通道，或者用支持内部哑字节的接收 API。"],
          ["CS 什么时候可以拉高？", "要等最后一个字节完全移出，即 BSY 标志清零。多字节帧中途不能拉高，否则从机会把一次命令拆成多次。帧间可以拉高，但要注意从机的最小 CS 高电平时间。"],
          ["DMA 和 Cache 怎么配合？", "DMA 写内存（外设→内存）后，CPU 读之前要 invalidate 对应缓存行；DMA 读内存（内存→外设）前，CPU 写完要 clean。也可以把缓冲区放到 MPU 配置的非缓存区域，省去维护操作。"]
        ]
      }
    ]
  });
})();