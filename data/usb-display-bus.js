/* ============================================================
   18 USB、显示与外扩总线
   ============================================================ */
(function () {
  "use strict";

  EIK.register("usb-display-bus", {
    chapters: [
      {
        id: "usb",
        title: "USB 设备开发",
        topics: [
          { id: "enum", title: "枚举、端点与传输类型" },
          { id: "class", title: "CDC / HID / MSC" }
        ]
      },
      {
        id: "display",
        title: "显示与图形",
        topics: [
          { id: "lvgl", title: "LVGL 移植与刷新" },
          { id: "tearing", title: "撕裂与双缓冲" }
        ]
      },
      {
        id: "bus",
        title: "外扩总线与存储卡",
        topics: [
          { id: "fmc", title: "FSMC / FMC 时序" },
          { id: "sdio", title: "SDIO 与 FatFs" }
        ]
      },
      {
        id: "net",
        title: "以太网与协议栈",
        topics: [
          { id: "lwip", title: "LwIP 配置与 API" }
        ]
      }
    ],

    questions: [
      /* ---------------- UB-01 ---------------- */
      {
        id: "UB-01",
        chapter: "usb",
        topic: "enum",
        title: "USB 枚举过程是怎样的？端点、四种传输类型分别适合什么数据？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "考察设备接入、复位、地址分配、描述符读取的完整流程，以及控制/中断/批量/等时传输的语义差异。",
        q: `<p>面试官：一个 USB 设备插上电脑，<strong>从插入到能用，中间发生了什么？</strong>端点是什么？<strong>四种传输类型分别用在什么场合？</strong></p>`,
        exam: `<p>枚举是 USB 的“见面流程”，能按顺序说出复位、取设备描述符、分配地址、取配置描述符、设置配置，说明你看过协议而不是只会调库。四种传输类型则考察你对“带宽、延迟、可靠性”取舍的理解。</p>`,
        core: `<p>枚举（全速）：① 接入，设备在 D+ 上拉 1.5kΩ 到 3.3V，主机检测到电平变化（低速拉 D−）；② 复位，主机等电源稳定后把 D+/D− 同时拉低（SE0）至少 10ms，设备进入默认状态、地址 0；③ 取设备描述符前 8 字节，主要是拿 <code>bMaxPacketSize0</code> 知道 EP0 一次能收多少；④ 发 SET_ADDRESS 分配地址，此后用新地址通信；⑤ 取完整设备描述符 18 字节拿 VID、PID、设备类、配置数量；⑥ 取配置描述符，先读 9 字节再按 <code>wTotalLength</code> 读完整配置（含接口、端点、类描述符）；⑦ 取字符串描述符（可选）；⑧ SET_CONFIGURATION 选定配置，设备进入已配置状态、接口和端点正式工作；⑨ 类请求，如 HID 取报告描述符、CDC 设串口参数、MSC 的 SCSI 命令。</p><p>端点是设备上的数据缓冲，方向固定（IN 设备→主机，OUT 主机→设备），EP0 是双向控制端点，其余按需配置，每个端点有自己的传输类型、包大小和轮询间隔。四种传输：控制传输 EP0 专用、枚举和类请求、保证送达；中断传输小数据有延迟上限、主机固定间隔轮询，适合 HID；批量传输大数据不保证延迟、利用空闲带宽、出错重传，适合 U 盘和虚拟串口；等时传输固定速率保证带宽但不重传，适合音视频。</p>`,
        answer: `<p><b>枚举流程（全速设备）：</b></p>
<ol>
<li><b>接入</b>：设备在 D+ 上拉一个 1.5kΩ 电阻到 3.3V，主机检测到电平变化，知道有设备插入（低速设备拉的是 D−）。</li>
<li><b>复位</b>：主机等待电源稳定后，把 D+/D− 同时拉低（SE0）至少 10ms，设备进入默认状态，地址为 0。</li>
<li><b>取设备描述符（前 8 字节）</b>：主机先读 8 字节，主要是为了拿到 <code>bMaxPacketSize0</code>，知道 EP0 一次能收多少。</li>
<li><b>分配地址</b>：主机发 <code>SET_ADDRESS</code>，设备此后用新地址通信。</li>
<li><b>取完整设备描述符</b>：18 字节，拿到 VID、PID、设备类、配置数量等。</li>
<li><b>取配置描述符</b>：先读 9 字节，再按 <code>wTotalLength</code> 读完整配置（包含接口、端点、类描述符）。</li>
<li><b>取字符串描述符</b>（可选）：厂商、产品、序列号。</li>
<li><b>SET_CONFIGURATION</b>：主机选定一个配置，设备进入“已配置”状态，接口和端点正式工作。</li>
<li><b>类请求</b>：比如 HID 取报告描述符、CDC 设置串口参数、MSC 的 SCSI 命令。</li>
</ol>
<p><b>端点</b>是设备上的数据缓冲区，方向固定（IN 是设备→主机，OUT 是主机→设备），地址 0 的 EP0 是双向控制端点，其余端点按需配置。每个端点有自己的传输类型、包大小和轮询间隔。</p>
<p><b>四种传输类型：</b></p>
<ul>
<li><b>控制传输</b>：EP0 专用，枚举和类请求，保证送达（有握手和重传），带宽预留。</li>
<li><b>中断传输</b>：小数据、有延迟上限，主机按固定间隔轮询，适合 HID（键盘、鼠标）。</li>
<li><b>批量传输</b>：大数据、不保证延迟，利用空闲带宽，出错重传，适合 U 盘、虚拟串口。</li>
<li><b>等时传输</b>：固定速率、保证带宽，但<b>不重传</b>，丢了就丢了，适合音频、视频。</li>
</ul>`,
        principle: `<p>USB 是主从结构，所有传输由主机发起，设备不能主动发数据。主机每 1ms 发一个帧（全速），在帧内调度控制、中断、批量、等时传输，等时和中断有带宽预留，批量只能用剩余带宽。</p>
<p>枚举之所以要“先读 8 字节”，是因为主机此时还不知道设备的 EP0 包大小，只能按最小 8 字节读，读到 <code>bMaxPacketSize0</code> 后再用实际大小读完整描述符。这是协议里一个很典型的分步设计。</p>
<p>地址 0 是默认地址，同一时刻只能有一个设备使用；<code>SET_ADDRESS</code> 之后设备必须在新地址上响应，否则主机会认为枚举失败。</p>`,
        fig: {
          type: "table",
          title: "四种传输类型对比",
          tag: "compare",
          head: ["类型", "方向", "延迟", "可靠性", "典型用途"],
          rows: [
            ["控制", "双向（EP0）", "尽力而为", "有握手、重传", "枚举、类请求"],
            ["中断", "IN / OUT", "有上限（1~255ms）", "有重传", "HID、状态上报"],
            ["批量", "IN / OUT", "无保证", "有重传", "U 盘、CDC 数据"],
            ["等时", "IN / OUT", "固定周期", "不重传", "音频、视频"]
          ]
        },
        apply: `<p>调试枚举问题时，我会先用 USB 分析仪或 <code>lsusb -v</code> 看主机到底读到哪一步：如果连设备描述符都读不到，先查 D+ 上拉、时钟（USB 需要 48MHz 精确时钟）、供电；如果能读到描述符但 SET_CONFIGURATION 失败，多半是配置描述符长度或端点描述符填错。</p>
<p>还有一个常见坑：设备描述符里的 <code>bMaxPacketSize0</code> 必须和实际 EP0 缓冲区一致，填 64 但实际只分配 8 字节，枚举会在读配置时失败。</p>`,
        pitfalls: [
          "<b>D+ 上拉缺失或接错。</b>主机根本检测不到设备，插上没反应。",
          "<b>USB 时钟不准。</b>全速要求 48MHz ±0.25%，用内部 RC 往往过不了枚举。",
          "<b>描述符长度字段填错。</b><code>wTotalLength</code> 少了，主机会漏读接口/端点，设备“能识别但用不了”。",
          "<b>把批量传输当实时用。</b>批量不保证延迟，做音频/控制环路会抖。"
        ],
        follow: [
          [
            "全速和高速有什么区别？",
            "全速 12Mbps，高速 480Mbps。高速设备先在 D+ 上拉被识别为全速，再通过 chirp 握手切换到高速；需要外部 PHY 或内置高速 PHY，时钟和 PCB 要求更高。",
          ],
          [
            "EP0 的包大小为什么常见 8/16/32/64？",
            "控制端点的缓冲区大小，受硬件和协议限制，全速最大 64 字节。枚举第一步固定读 8 字节，所以设备至少要支持 8 字节。",
          ],
          [
            "什么是复合设备（composite）？",
            "一个设备里包含多个接口/功能（比如键盘+鼠标），共享一个地址，通过配置描述符里的多个接口描述符和接口关联描述符（IAD）描述。"
          ]
        ]
      },

      /* ---------------- UB-02 ---------------- */
      {
        id: "UB-02",
        chapter: "usb",
        topic: "class",
        title: "CDC、HID、MSC 三类设备有什么区别？做 USB 转串口要注意什么？",
        diff: "中级",
        freq: "高频",
        type: "对比辨析题",
        point: "考察三类 USB 类的端点结构、驱动依赖、吞吐与延迟特性，以及虚拟串口在缓冲区、流控、DTR 上的坑。",
        q: `<p>面试官：<strong>CDC、HID、MSC 这三种 USB 设备有什么区别？</strong>我要做一个 USB 转串口，选哪个类？<strong>实际做的时候要注意什么？</strong></p>`,
        exam: `<p>这题考的是“按需求选类”。要免驱、数据量小，选 HID；要虚拟串口、兼容串口工具，选 CDC；要大容量存储，选 MSC。能说出各自的端点和吞吐上限，就比只会“加个 USB 库”强。</p>`,
        core: `<p>CDC 是通信设备类，最常用 CDC-ACM，枚举出来就是虚拟串口，有两个接口：通信接口（控制/通知）和数据接口（批量 IN/OUT）；Win10 之后自带 usbser.sys 基本免驱，老系统要 INF。HID 是人机接口类，靠报告描述符描述数据格式，系统自带驱动、真正免驱，用中断端点，全速下最多 64 字节/包、间隔最小 1ms，吞吐约几十 KB/s，适合小数据低延迟控制。MSC 是大容量存储类，走批量传输、用 SCSI 命令访问扇区，枚举出来是磁盘，需要文件系统配合，吞吐高但延迟不保证。</p><p>USB 转串口选 CDC，上位机能直接用串口助手和 pyserial。注意：波特率是模拟的，CDC 会把波特率、数据位、停止位通过类请求发给设备，但设备可以完全忽略，USB 本身没有波特率概念；必须做环形缓冲和流控，串口侧来不及处理时用 SET_CONTROL_LINE_STATE 或自定义协议通知上位机暂停；DTR/RTS 很多板子用来做复位和 Boot 选择，类请求里要正确映射，否则烧录工具连不上；VID/PID 要固定、描述符要合法，Windows 会缓存驱动绑定；USB 转出来是 TTL 串口，接 RS232 还要电平转换。</p>`,
        answer: `<p><b>三类的定位：</b></p>
<ul>
<li><b>CDC（Communication Device Class）</b>：通信设备类，最常用的是 CDC-ACM（抽象控制模型），枚举出来就是一个虚拟串口。它有两个接口：一个通信接口（控制/通知），一个数据接口（批量 IN/OUT）。Windows 10 之后自带 <code>usbser.sys</code>，基本免驱；老系统需要 INF。</li>
<li><b>HID（Human Interface Device）</b>：人机接口类，靠报告描述符描述数据格式，系统自带驱动，真正免驱。用中断端点，全速下最多 64 字节/包、间隔最小 1ms，所以吞吐大约几十 KB/s，适合小数据、低延迟的控制。</li>
<li><b>MSC（Mass Storage Class）</b>：大容量存储类，走批量传输，用 SCSI 命令集访问扇区，枚举出来是一个磁盘。需要文件系统配合，吞吐高，但延迟不保证。</li>
</ul>
<p><b>USB 转串口选 CDC</b>，因为上位机可以直接用串口助手、Python 的 <code>pyserial</code>，兼容性最好。</p>
<p><b>做 CDC 要注意：</b></p>
<ol>
<li><b>波特率是“模拟”的。</b>CDC 会把波特率、数据位、停止位通过类请求发给设备，但设备可以完全忽略——USB 本身没有波特率的概念。很多实现只在协议层回显，实际传输速率由 USB 带宽决定。</li>
<li><b>缓冲区与流控。</b>USB 批量传输速度快，串口侧可能来不及处理。必须做环形缓冲，并在缓冲区将满时用 CDC 的 <code>SET_CONTROL_LINE_STATE</code> 或自定义协议通知上位机暂停（或者降低发送节奏）。</li>
<li><b>DTR/RTS。</b>很多开发板用 DTR 做复位、RTS 做 Boot 选择。CDC 类请求里可以拿到这两个信号，固件要正确映射，否则“烧录工具连不上”。</li>
<li><b>枚举稳定性。</b>VID/PID 要固定，描述符要合法；Windows 会缓存驱动绑定，改了 PID 可能识别成新设备。</li>
<li><b>电平。</b>USB 转出来的是 TTL 串口（3.3V 或 5V），要接 RS232 设备还得加电平转换芯片，别直接接。 </li>
</ol>
<p><b>怎么选：</b>免驱、小数据、控制命令 → HID；虚拟串口、兼容串口工具 → CDC；U 盘、文件交换 → MSC。有的产品会做成复合设备（CDC + HID），一个口同时提供串口和自定义控制通道。</p>`,
        principle: `<p>USB 类（Class）是协议层对设备功能的标准化：主机根据设备描述符里的 <code>bDeviceClass</code> 或接口描述符里的 <code>bInterfaceClass</code> 加载对应驱动。<code>0x02</code> 是 CDC，<code>0x03</code> 是 HID，<code>0x08</code> 是 MSC。</p>
<p>CDC-ACM 的数据通路是“批量端点 + 环形缓冲 + UART 外设”，USB 侧和 UART 侧速率不匹配时，缓冲区就是唯一的缓冲。HID 走中断端点，主机按固定间隔轮询，所以延迟可预测但吞吐受限。MSC 走批量端点，主机用 SCSI 的 READ/WRITE(10) 命令读写扇区。</p>`,
        fig: {
          type: "table",
          title: "CDC / HID / MSC 对比",
          tag: "compare",
          head: ["项目", "CDC（虚拟串口）", "HID", "MSC"],
          rows: [
            ["驱动", "Win10 免驱，老系统需 INF", "系统自带，免驱", "系统自带"],
            ["端点", "中断通知 + 批量 IN/OUT", "中断 IN/OUT", "批量 IN/OUT"],
            ["典型吞吐", "几百 KB/s ~ 1MB/s（全速）", "约 64KB/s（64B/ms）", "接近总线带宽"],
            ["延迟", "批量，无保证", "有上限（1ms 级）", "无保证"],
            ["上位机", "串口助手、pyserial", "需按报告描述符解析", "盘符/文件系统"],
            ["典型用途", "USB 转串口、调试口", "键盘、鼠标、自定义小数据", "U 盘、固件升级"]
          ]
        },
        code: {
          lang: "c",
          title: "cdc_bridge.c",
          src: `#define RX_RING_SIZE  1024

static uint8_t  s_ring[RX_RING_SIZE];
static volatile uint16_t s_head, s_tail;   /* 单生产者/单消费者 */

/* USB 收到数据（CDC 数据 OUT 端点回调） */
void cdc_data_rx(const uint8_t *buf, uint32_t len)
{
    for (uint32_t i = 0; i < len; i++) {
        uint16_t next = (uint16_t)((s_head + 1) % RX_RING_SIZE);
        if (next == s_tail) {
            /* 缓冲满：丢弃并计数，绝不能在这里阻塞 */
            g_overflow++;
            continue;
        }
        s_ring[s_head] = buf[i];
        s_head = next;
    }
}

/* 主循环把数据推给 UART，非阻塞 */
void cdc_bridge_poll(void)
{
    while (s_tail != s_head) {
        if (!uart_tx_ready()) break;        /* UART 忙就等下次 */
        uart_write_byte(s_ring[s_tail]);
        s_tail = (uint16_t)((s_tail + 1) % RX_RING_SIZE);
    }
}`
        },
        codeNote: `<b>关键点：</b>USB 回调里不能阻塞、不能等 UART。环形缓冲把“USB 的快”和“UART 的慢”解耦，满了就丢并计数，让上层能发现。用 <code>head/tail</code> 而不是读写计数，单生产者单消费者场景下不需要关中断。`,
        apply: `<p>实际做 CDC 时，我会把缓冲区开到 2~4KB，并且在 USB 端做“接收窗口”控制：当剩余空间小于 1/4 时，通过自定义命令或直接 NAK 让主机暂缓发送。Windows 的串口驱动有自己的缓冲和延迟定时器（默认 16ms），小包频繁发送时延迟会很明显，可以调驱动的高级设置。</p>
<p>如果产品要同时做调试口和业务口，可以用复合设备：CDC 给日志，HID 给控制命令。HID 免驱、延迟低，很适合做“配置工具”的通道。</p>`,
        pitfalls: [
          "<b>以为 CDC 的波特率真的生效。</b>它只是协议字段，实际速率由 USB 决定；上位机设 9600 不代表限速。",
          "<b>在 USB 回调里做耗时操作。</b>阻塞会导致端点 NAK、主机超时，严重时枚举都过不去。",
          "<b>不做流控。</b>USB 侧几百 KB/s 涌进来，UART 只有 115200，缓冲区一满就丢数据。",
          "<b>忘了 DTR/RTS。</b>烧录工具靠它复位/进 Boot，映射错了就“连不上板子”。"
        ],
        follow: [
          [
            "HID 能不能做大数据传输？",
            "可以，但受中断端点限制：全速 64B/ms，约 64KB/s。想更快可以用 HID 的报告 ID 分片，或者改用批量端点（自定义类，但需要驱动）。",
          ],
          [
            "CDC 和 CH340/CP2102 这类芯片有什么区别？",
            "CH340 是专用桥接芯片，MCU 侧是 UART，USB 侧由芯片处理；CDC 是 MCU 自己实现 USB 设备，省一颗芯片但占固件资源和 USB 认证。",
          ],
          [
            "为什么 Windows 有时要装 INF？",
            "老版本 Windows 没有内置 CDC 驱动，或者设备的 VID/PID 不在白名单里，需要 INF 指定 <code>usbser.sys</code>。Win10 之后大部分 CDC 设备可以自动识别。"
          ]
        ]
      },

      /* ---------------- UB-03 ---------------- */
      {
        id: "UB-03",
        chapter: "display",
        topic: "lvgl",
        title: "LVGL 移植分几步？刷新机制、脏矩形、双缓冲怎么配？",
        diff: "高级",
        freq: "高频",
        type: "驱动设计题",
        point: "考察显示驱动、tick、输入、内存四要素，flush 回调与 DMA 的配合，以及局部缓冲/双缓冲的取舍。",
        q: `<p>面试官：在一块 SPI 屏上移植 LVGL，<strong>要做哪几件事？</strong>它的刷新是怎么触发的？<strong>脏矩形和双缓冲怎么配？</strong></p>`,
        exam: `<p>移植本身不难，难在“刷得动、不撕裂、不卡”。能说清 <code>flush_cb</code> 什么时候调、<code>lv_display_flush_ready</code> 什么时候回、缓冲区开多大，说明你真的调过性能。</p>`,
        core: `<p>四件事：显示，创建 display 对象、设分辨率和颜色格式、注册 <code>flush_cb</code>；心跳，SysTick 里调 <code>lv_tick_inc(1)</code> 或注册 tick 回调；输入，注册 indev 的 <code>read_cb</code> 读触摸/按键；内存，配 <code>LV_MEM_SIZE</code> 或接自己的 malloc/free，对象、样式、动画都从这里分配。</p><p>刷新机制：界面变化时 LVGL 把失效区域标记为“脏”，在 <code>lv_timer_handler()</code> 里合并脏矩形、重绘这块到缓冲，再调 flush_cb 送到屏，是按需刷新 + 区域合并，不是每帧全屏重画。脏矩形由每个被改控件把自己的区域加进失效列表、LVGL 合并重叠区域，所以“只改一个数字”只刷那一小块。</p><p>缓冲区三种：单缓冲 + 局部，开屏幕的 1/10 按行分块刷，RAM 最省但刷新次数多；双缓冲 + 局部，一块 DMA 发送时另一块继续渲染，CPU 和 DMA 并行，最常用；全屏缓冲，320×240×2B 约 150KB，一次刷完，适合有外部 SRAM/SDRAM。关键点：用 DMA 时 flush_cb 启动后必须立刻返回，在 DMA 完成中断里再调 <code>lv_display_flush_ready</code>，死等会让双缓冲失去意义。</p>`,
        answer: `<p><b>移植四件事：</b></p>
<ol>
<li><b>显示</b>：创建 display 对象，设置分辨率、颜色格式，注册 <code>flush_cb</code>；在回调里把一块像素写到屏上。</li>
<li><b>心跳</b>：LVGL 靠 tick 驱动动画、超时和刷新周期。可以在 SysTick 里调 <code>lv_tick_inc(1)</code>，或者注册 tick 回调。</li>
<li><b>输入</b>：注册 indev 的 <code>read_cb</code>，把触摸/按键状态读进来。</li>
<li><b>内存</b>：配置 <code>LV_MEM_SIZE</code>，或接自己的 <code>malloc/free</code>。对象、样式、动画都从这里分配。</li>
</ol>
<p><b>刷新机制：</b>界面变化时，LVGL 把失效区域标记为“脏”，在主循环 <code>lv_timer_handler()</code> 里合并脏矩形，重绘这块区域到缓冲区，然后调用 <code>flush_cb</code> 把缓冲区送到屏。也就是说，它是<b>按需刷新 + 区域合并</b>，不是每帧全屏重画。</p>
<p><b>脏矩形：</b>每个被修改的控件会把自己的区域加入失效列表，LVGL 合并重叠区域，尽量减少传输量。所以“只改一个数字”时，实际只刷那一小块，SPI 带宽压力小很多。</p>
<p><b>缓冲区三种配法：</b></p>
<ul>
<li><b>单缓冲 + 局部</b>：缓冲区开屏幕的 1/10 左右，按行分块刷。RAM 最省，但刷新次数多。</li>
<li><b>双缓冲 + 局部</b>：两块局部缓冲，一块在 DMA 发送时，另一块可以继续渲染，CPU 和 DMA 并行。最常用。</li>
<li><b>全屏缓冲</b>：RAM 需求大（320×240×2B ≈ 150KB），但一次刷完，适合有外部 SRAM/SDRAM 的方案。</li>
</ul>
<p><b>flush 的关键：</b>如果用的是 DMA，<code>flush_cb</code> 里启动 DMA 后必须<b>立刻返回</b>，等 DMA 完成中断里再调 <code>lv_display_flush_ready(disp)</code>。如果在回调里死等 DMA 完成，双缓冲就失去意义，还会拖慢整个 GUI 线程。</p>`,
        principle: `<p>LVGL 的渲染是“对象树 + 失效区域”模型：控件属性变化 → 标记失效 → 定时器处理时合并区域 → 调绘制函数把像素写入 draw buffer → flush。它不做全屏重绘，所以脏矩形合并的质量直接决定性能。</p>
<p>颜色格式要和屏一致（RGB565/RGB888），不一致时 flush 里要做转换，这会吃掉 CPU。SPI 屏还要注意字节序，很多屏是高位在前，MCU 小端输出要交换。</p>
<p>LVGL v9 的 API 和 v8 有变化：v9 用 <code>lv_display_create</code> + <code>lv_display_set_buffers</code>，flush 回调签名是 <code>(lv_display_t *, const lv_area_t *, uint8_t *)</code>；v8 是 <code>lv_disp_draw_buf_init</code> + <code>lv_disp_drv_register</code>。移植前先确认版本，别照着旧教程写。</p>`,
        fig: {
          type: "flow",
          title: "LVGL 一次刷新的流程",
          tag: "flow",
          items: [
            { t: "控件属性变化", d: "标记失效区域" },
            { t: "lv_timer_handler", d: "合并脏矩形" },
            { t: "渲染到 draw buffer", d: "按颜色格式转换" },
            { t: "调用 flush_cb", d: "启动 SPI/DMA 传输" },
            { t: "DMA 完成中断", d: "lv_display_flush_ready" },
            { t: "下一块继续", d: "双缓冲可并行" }
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_port.c",
          src: `#define LCD_W  320
#define LCD_H  240
#define BUF_LINES  40                       /* 局部缓冲：40 行 */

static uint8_t s_buf1[LCD_W * BUF_LINES * 2];   /* RGB565 */
static uint8_t s_buf2[LCD_W * BUF_LINES * 2];
static lv_display_t *s_disp;

/* DMA 完成中断里调用，告诉 LVGL 这块缓冲可以复用了 */
void lcd_dma_done_cb(void)
{
    lv_display_flush_ready(s_disp);
}

static void lv_flush_cb(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map)
{
    /* 1. 设置屏的刷新窗口 */
    lcd_set_window(area->x1, area->y1, area->x2, area->y2);

    /* 2. 启动 DMA，立刻返回；完成后再 flush_ready */
    uint32_t px_cnt = (uint32_t)lv_area_get_width(area) * lv_area_get_height(area);
    lcd_start_dma(px_map, px_cnt * 2);
}

void lvgl_port_init(void)
{
    lv_init();

    s_disp = lv_display_create(LCD_W, LCD_H);
    lv_display_set_color_format(s_disp, LV_COLOR_FORMAT_RGB565);
    lv_display_set_flush_cb(s_disp, lv_flush_cb);
    lv_display_set_buffers(s_disp, s_buf1, s_buf2, sizeof(s_buf1),
                           LV_DISPLAY_RENDER_MODE_PARTIAL);

    lcd_init();
}`
        },
        codeNote: `<b>三个易错点：</b>缓冲区大小要按“像素数 × 每像素字节”算，RGB565 是 2 字节；<code>lv_display_set_buffers</code> 的 size 是<b>单块</b>大小，不是两块之和；<code>flush_ready</code> 必须在 DMA 真正完成后调，提前调会导致画面花屏（缓冲被改写）。`,
        apply: `<p>SPI 屏的瓶颈通常在总线：320×240×2B ≈ 150KB，SPI 40MHz 理论也就 5MB/s，全屏刷一次约 30ms。所以要用脏矩形 + 局部缓冲，避免全屏重绘；动画区域尽量小，背景不要频繁重画。</p>
<p>如果有外部 SRAM，可以开全屏双缓冲，配合 LTDC 或 RGB 接口屏，刷新率和 CPU 占用都会好很多。SPI 屏则更适合“局部更新 + 双缓冲并行”。</p>`,
        pitfalls: [
          "<b>flush 里死等 DMA。</b>双缓冲变成单缓冲，CPU 全耗在等待上，界面卡顿。",
          "<b>缓冲区按字节数算错。</b>RGB565 每像素 2 字节，少算一半会越界写。",
          "<b>提前调 flush_ready。</b>DMA 还在读缓冲，LVGL 已经往里写新内容，画面撕裂/花屏。",
          "<b>照 v8 教程写 v9 代码。</b><code>lv_disp_drv_t</code> 在 v9 已经换了，编译不过还是小事，跑起来刷新逻辑也不对。"
        ],
        follow: [
          [
            "脏矩形合并是谁做的？",
            "LVGL 内部维护失效区域列表，在刷新时合并重叠区域并裁剪到屏幕范围。用户不需要手动合并，但可以通过减少无效的样式变化来减少脏区。",
          ],
          [
            "LVGL 的内存不够会怎样？",
            "对象创建失败、界面缺控件，甚至直接死机。<code>LV_MEM_SIZE</code> 要按对象数量估算，开启 <code>LV_USE_MEM_MONITOR</code> 观察峰值。",
          ],
          [
            "SPI 屏怎么提高刷新率？",
            "提高 SPI 时钟（看屏的最高频率）、用 DMA、开双缓冲、减少全屏重绘、把背景图放到 Flash 并只刷变化区域；必要时换 RGB 并口或 MIPI 屏。"
          ]
        ]
      },

      /* ---------------- UB-04 ---------------- */
      {
        id: "UB-04",
        chapter: "display",
        topic: "tearing",
        title: "屏幕撕裂是什么原因？framebuffer 双缓冲怎么解决？",
        diff: "高级",
        freq: "中频",
        type: "原理分析题",
        point: "考察扫描输出与 CPU 写入的竞争、TE/VSYNC 同步、双缓冲交换时机，以及 LTDC 的影子寄存器。",
        q: `<p>面试官：界面上快速移动的方块，边缘总有一条“错位”的横线，<strong>这是什么原因？</strong>双缓冲为什么能解决？<strong>交换缓冲区应该在什么时刻做？</strong></p>`,
        exam: `<p>撕裂是“写”和“扫”不同步的经典问题。能说清 LCD 是一行行扫描输出的、CPU 在写另一块内存，以及交换必须等 vblank，就理解了显示时序。</p>`,
        core: `<p>成因：LCD 控制器逐行扫描把 framebuffer 送到屏上，一帧 16.7ms（60Hz）；如果 CPU 在控制器扫到一半时改了同一块 framebuffer，上半屏是旧内容、下半屏是新内容，中间就出现一条错位横线。</p><p>单缓冲必然撕裂：只有一块显存，CPU 写和控制器读并发，没有任何同步，只要写入发生在扫描期间就可能撕。双缓冲做法：准备两块 framebuffer，CPU 只写后台缓冲，控制器始终读前台缓冲，一帧画完在垂直消隐期（vblank）交换指针，控制器下一帧从头读新缓冲，任何一帧都是完整的。</p><p>交换时机很关键，必须在 vblank 或 TE 信号到来时交换：提前交换控制器可能已扫到一半照样撕，太晚会丢帧。LTDC 用影子寄存器实现，写 <code>LTDC-&gt;SRCR</code> 的 VBR 位，硬件在下一个 vblank 才让新地址寄存器生效，软件不用忙等。代价是显存翻倍，320×240×2B 两块约 300KB，内部 SRAM 放不下通常要外部 SRAM/SDRAM。</p>`,
        answer: `<p><b>撕裂（tearing）的成因：</b>LCD 控制器是<b>逐行扫描</b>把 framebuffer 送到屏上的，一帧 16.7ms（60Hz）。如果 CPU 在控制器扫描到一半时修改了同一块 framebuffer，屏幕上半部分显示的是旧内容、下半部分是新内容，中间就出现一条错位的横线。</p>
<p><b>单缓冲为什么必然撕裂：</b>只有一块显存，CPU 写和控制器读是并发的，没有任何同步机制，只要写入发生在扫描期间就可能撕。</p>
<p><b>双缓冲怎么解决：</b>准备两块 framebuffer，CPU 只写“后台缓冲”，控制器始终读“前台缓冲”。一帧画完后，在<b>垂直消隐期（vblank）</b>把前台/后台指针交换，控制器下一帧从头开始读新缓冲，这样任何一帧都是完整的。</p>
<p><b>交换时机很关键：</b>必须在 vblank 或 TE（Tearing Effect）信号到来时交换。提前交换，控制器可能已经扫到一半，照样撕；拖得太晚，会丢帧。LTDC 通过<b>影子寄存器</b>实现：写 <code>LTDC->SRCR</code> 的 <code>VBR</code> 位，硬件在下一个 vblank 才把新的地址寄存器生效，软件不用忙等。</p>
<p><b>代价：</b>显存翻倍。320×240×2B 两块约 300KB，内部 SRAM 放不下，通常要外部 SRAM/SDRAM。也可以用“局部双缓冲”或“TE + 单缓冲分区刷新”折中。</p>`,
        principle: `<p>LCD 的扫描是“像素时钟 + 行同步 + 场同步”：每行 HSYNC 后输出一行像素，每帧 VSYNC 后从头开始。vblank 是帧与帧之间的空档，这段时间控制器不读显存，是交换缓冲的安全窗口。</p>
<p>TE 信号是屏主动输出的“我正在消隐”指示，MCU 可以在 TE 中断里交换或开始写入，避免和扫描冲突。SPI 屏没有独立显存，撕裂表现为“写到一半被看到”，通常靠“先写窗口、再突发传输”减少可见时间，但无法完全消除。</p>
<p>还有一种是“画面不动但闪烁”，那不是撕裂，多半是刷新率与背光 PWM 频率打架，或者双缓冲没开、整屏反复重画。</p>`,
        fig: {
          type: "flow",
          title: "双缓冲的帧流程",
          tag: "flow",
          items: [
            { t: "CPU 绘制后台缓冲", d: "控制器读前台缓冲" },
            { t: "绘制完成", d: "置“待交换”标志" },
            { t: "等待 vblank / TE", d: "不能提前交换" },
            { t: "交换前台/后台指针", d: "LTDC 影子寄存器生效" },
            { t: "控制器从头扫描新帧", d: "画面完整无撕裂" }
          ]
        },
        code: {
          lang: "c",
          title: "ltdc_swap.c",
          src: `#define FB_WIDTH   480
#define FB_HEIGHT  272

static uint32_t s_fb[2][FB_WIDTH * FB_HEIGHT];   /* 双缓冲，RGB888 */
static volatile uint8_t s_front;                 /* 当前前台索引 */
static volatile uint8_t s_pending;               /* 有新帧待交换 */

/* 绘制完成：只置标志，不直接改寄存器 */
void lcd_submit_frame(void)
{
    s_pending = 1;
}

/* 在 LTDC 的行中断/场中断里调用（vblank 附近） */
void lcd_vblank_isr(void)
{
    if (!s_pending) return;

    s_front ^= 1u;
    s_pending = 0;

    /* 写影子寄存器，硬件在下一个 vblank 生效，避免撕裂 */
    LTDC_Layer1->CFBAR = (uint32_t)s_fb[s_front];
    LTDC->SRCR |= LTDC_SRCR_VBR;      /* vertical blanking reload */
}`
        },
        codeNote: `<b>为什么要用 <code>VBR</code> 而不是直接写 <code>CFBAR</code>：</b>直接写会在当前帧中途生效，照样撕；<code>VBR</code> 让硬件等到 vblank 再重载，软件不需要忙等，也不会阻塞中断太久。`,
        apply: `<p>实际项目里，如果 MCU 没有 LTDC（比如 SPI 屏），双缓冲的意义变成“DMA 发送和 CPU 渲染并行”，撕裂只能靠“整块传输 + 尽量短的可见窗口”缓解。有 TE 引脚的屏，可以把 TE 接到 EXTI，在 TE 中断里启动传输。</p>
<p>显存不够时，可以用“半屏双缓冲”或“脏矩形 + 单缓冲”，牺牲一点视觉一致性换 RAM。对 UI 静态页面多的产品，脏矩形刷新已经够用，不必上全屏双缓冲。</p>`,
        pitfalls: [
          "<b>在任意时刻交换指针。</b>控制器可能正扫到一半，交换后上半屏旧、下半屏新，撕得更明显。",
          "<b>双缓冲但只画一半。</b>后台缓冲没画完整就交换，会看到未初始化的区域。",
          "<b>以为开了双缓冲就不需要同步。</b>没有 vblank/TE 约束，仍然可能撕。",
          "<b>显存对齐/跨度设错。</b><code>CFBAR</code> 地址或 pitch 不对，画面错位，看起来像撕裂。"
        ],
        follow: [
          [
            "TE 信号和 VSYNC 是一回事吗？",
            "本质都是帧同步，TE 是屏输出给 MCU 的“消隐期”指示，VSYNC 是时序里的场同步信号。用 TE 可以让 MCU 知道什么时候安全写入。",
          ],
          [
            "三缓冲有什么用？",
            "双缓冲在“绘制慢于刷新”时会等缓冲，三缓冲让 CPU 总有空闲缓冲可写，减少丢帧和卡顿，代价是显存再多一块。",
          ],
          [
            "为什么 SPI 屏撕裂更难消除？",
            "SPI 屏没有独立显存，数据直接写进屏的 GRAM，写入过程本身就会被扫描看到；只能靠缩短传输时间、TE 同步或改用并口/RGB 屏。"
          ]
        ]
      },

      /* ---------------- UB-05 ---------------- */
      {
        id: "UB-05",
        chapter: "bus",
        topic: "fmc",
        title: "FSMC/FMC 挂外部 SRAM 或 8080 屏，时序参数怎么算？",
        diff: "高级",
        freq: "中频",
        type: "配置分析题",
        point: "考察地址/数据建立保持时间与 HCLK 周期的换算、SRAM 模式选择，以及 8080 屏 RS 接地址线的地址映射。",
        q: `<p>面试官：用 FMC 挂一颗 55ns 的 SRAM，HCLK 是 168MHz，<strong>ADDSET 和 DATAST 怎么算？</strong>如果换成 8080 并口屏，RS 接 A0，<strong>命令和数据的地址分别是多少？</strong></p>`,
        exam: `<p>这题考的是“把手册的纳秒换成控制器的时钟周期”。会算 <code>(ADDSET+1)+(DATAST+1)</code>，知道要留裕量，再能推出 RS 地址，就说明你独立配过 FMC。</p>`,
        core: `<p>先算 HCLK 周期：168MHz → 约 5.95ns。FMC 的 SRAM 模式（Mode 1）一个读周期是 <code>t_cycle = (ADDSET+1) + (DATAST+1)</code> 个 HCLK；要满足 SRAM 55ns 访问时间，55/5.95 ≈ 9.24 向上取 10 个周期（59.5ns），留裕量取 11~12。分配上地址建立一般 0~1 个周期、剩下给数据保持：<code>ADDSET=0、DATAST=8</code> 是 10 周期 59.5ns；<code>ADDSET=1、DATAST=8</code> 是 11 周期 65.5ns 更稳。写时序同理，注意 SRAM 的 t_WP 和 t_DV，有些器件读快写慢，读写要分别配（Extended Mode）。</p><p>8080 并口屏借用 FMC 的 SRAM 时序：CS → NE1（决定基地址 0x60000000）、RS/DC → A0、WR → NWE、RD → NOE、D0~D15 → FMC_D0~D15。因为 RS 接 A0、而 FMC 地址线按半字编址（16 位数据总线 A0 不对应字节偏移），所以命令地址是 0x60000000（A0=0）、数据地址是 0x60000002（A0=1 对应 bit1）。写命令 <code>*(volatile uint16_t *)0x60000000 = cmd;</code>，写数据 <code>*(volatile uint16_t *)0x60000002 = data;</code>，这两个地址必须按屏的实际接法推，不能照抄别人的板子。</p>`,
        answer: `<p><b>先算一个 HCLK 周期：</b>168MHz → <code>1/168MHz ≈ 5.95ns</code>。</p>
<p><b>SRAM 读时序：</b>FMC 的 SRAM 模式（Mode 1）一个读周期由“地址建立 + 数据保持”组成，实际周期数是：</p>
<p><code>t_cycle = (ADDSET + 1) + (DATAST + 1) 个 HCLK</code></p>
<p>要满足 SRAM 的 55ns 访问时间，先算需要多少个周期：<code>55 / 5.95 ≈ 9.24</code>，向上取整到 <b>10 个周期</b>（59.5ns），再留一点裕量可以取 11~12 个周期。</p>
<p>分配上，地址建立一般给 0~1 个周期，剩下给数据保持：</p>
<ul>
<li><code>ADDSET = 0</code>、<code>DATAST = 8</code> → (0+1)+(8+1)=10 周期 = 59.5ns；</li>
<li>如果 SRAM 地址建立要求较高，<code>ADDSET = 1</code>、<code>DATAST = 8</code> → 11 周期 = 65.5ns，更稳。</li>
</ul>
<p>写时序同理，但要注意 SRAM 的 <code>t_WP</code>（写脉冲宽度）和 <code>t_DV</code>（数据有效到写结束），有些器件读快写慢，读写要分别配（Extended Mode）。</p>
<p><b>8080 并口屏：</b>它借用 FMC 的 SRAM 时序，信号对应关系是：</p>
<ul>
<li><code>CS</code> → <code>NE1</code>（片选，决定基地址 <code>0x60000000</code>）；</li>
<li><code>RS/DC</code> → <code>A0</code>（命令/数据选择）；</li>
<li><code>WR</code> → <code>NWE</code>，<code>RD</code> → <code>NOE</code>；</li>
<li>数据线 <code>D0~D15</code> → <code>FMC_D0~D15</code>。</li>
</ul>
<p>因为 RS 接在 A0 上，而 FMC 的地址线是按“半字”编址的（16 位数据总线，A0 不对应字节偏移），所以：</p>
<ul>
<li><b>命令地址</b> = <code>0x60000000</code>（A0=0）；</li>
<li><b>数据地址</b> = <code>0x60000002</code>（A0=1，对应地址 bit1）。</li>
</ul>
<p>写命令：<code>*(volatile uint16_t *)0x60000000 = cmd;</code>；写数据：<code>*(volatile uint16_t *)0x60000002 = data;</code>。这两个地址必须按屏的实际接法推，不能照抄别人的板子。</p>`,
        principle: `<p>FMC 的本质是“用可编程的时钟计数产生总线时序”。ADDSET 控制地址有效到读写信号有效的间隔，DATAST 控制读写信号的有效宽度，HOLD 控制读写结束到地址变化的保持时间。每个参数的单位都是 HCLK 周期，所以换主频必须重算。</p>
<p>8080 接口的写周期由“RS 建立 → WR 低脉冲 → 数据保持”组成，屏的手册会给出最小脉宽（比如 50ns）。如果 FMC 的 DATAST 不够，写进去的数据可能不稳定，表现为花屏、偶发错位。</p>
<p>地址映射取决于数据总线宽度：16 位模式下，FMC 内部地址 A0 对应外部地址线的 A0，但 CPU 访问时按半字递增，地址 bit1 才对应 A0。所以“命令/数据”两个地址相差 2，不是 1。</p>`,
        fig: {
          type: "table",
          title: "FMC 时序参数与信号对应",
          tag: "配置",
          head: ["参数 / 信号", "作用", "8080 屏对应", "计算要点"],
          rows: [
            ["ADDSET", "地址建立时间", "RS 建立到 WR 有效", "按屏的 t_AS 算"],
            ["DATAST", "数据保持/脉宽", "WR 低电平宽度", "按 t_WP 算，取最大要求"],
            ["HOLD", "地址保持", "WR 上升后 RS 保持", "一般 0~1 周期"],
            ["NE1", "片选", "CS", "决定基地址"],
            ["A0", "地址线", "RS / DC", "命令 0x60000000，数据 +2"],
            ["NWE / NOE", "写 / 读选通", "WR / RD", "低有效"]
          ]
        },
        code: {
          lang: "c",
          title: "fmc_sram.c",
          src: `/* HCLK = 168MHz，t = 5.95ns；SRAM 55ns → 至少 10 个周期 */
static void fmc_sram_init(void)
{
    FMC_NORSRAM_TimingTypeDef t = {0};

    t.AddressSetupTime      = 1;      /* (1+1) */
    t.AddressHoldTime       = 0;
    t.DataSetupTime         = 8;      /* (8+1)，合计 11 周期 ≈ 65.5ns */
    t.BusTurnAroundDuration = 0;
    t.CLKDivision           = 0;
    t.DataLatency           = 0;

    hsram.Instance  = FMC_NORSRAM_DEVICE;
    hsram.Extended  = FMC_NORSRAM_EXTENDED_DEVICE;
    hsram.Init.NSBank             = FMC_NORSRAM_BANK1;
    hsram.Init.DataAddressMux     = FMC_DATA_ADDRESS_MUX_DISABLE;
    hsram.Init.MemoryType         = FMC_MEMORY_TYPE_SRAM;
    hsram.Init.MemoryDataWidth    = FMC_NORSRAM_MEM_BUS_WIDTH_16;
    hsram.Init.BurstAccessMode    = FMC_BURST_ACCESS_MODE_DISABLE;
    hsram.Init.WaitSignalPolarity = FMC_WAIT_SIGNAL_POLARITY_LOW;
    hsram.Init.WriteOperation     = FMC_WRITE_OPERATION_ENABLE;
    hsram.Init.ExtendedMode       = FMC_EXTENDED_MODE_DISABLE;
    hsram.Init.ReadWriteTimingStruct = &t;
    hsram.Init.WriteTimingStruct     = &t;

    HAL_SRAM_Init(&hsram, &t, &t);
}`
        },
        codeNote: `<b>注意：</b>如果器件读快写慢，要打开 <code>ExtendedMode</code>，给读和写分别配置时序；<code>HAL_SRAM_Init</code> 的第三参数是写时序，别两处传同一个结构体却以为会自动区分。`,
        apply: `<p>调试 FMC 时，先跑“地址线 walking 1”测试：往 SRAM 写特定图案、读回比对，确认地址线和数据线没有接错/短路。8080 屏则先读 ID（命令 0x04，读 0x04 参数），能读到正确 ID 说明时序和地址映射都对。</p>
<p>如果屏花屏但 ID 能读，多半是写脉宽不够或数据建立时间不足；如果完全无响应，先查 CS/RS 接的是哪个 bank、基地址对不对。用示波器看 WR 脉冲宽度是最直接的确认方式。</p>`,
        pitfalls: [
          "<b>用主频算周期却忘了 HCLK 分频。</b>FMC 时钟可能不等于内核时钟，参数全错。",
          "<b>ADDSET/DATAST 直接抄别人的值。</b>不同主频、不同器件，周期数完全不同。",
          "<b>命令/数据地址写成 +1。</b>16 位总线按半字编址，A0 对应 bit1，应该 +2。",
          "<b>读写共用一套时序。</b>写脉宽不够时，读正常、写花屏，很难查。"
        ],
        follow: [
          [
            "FMC 和 FSMC 有什么区别？",
            "FSMC 是较早的“灵活静态存储控制器”，主要支持 NOR/PSRAM/NAND；FMC 是升级版，增加了 SDRAM 控制器。STM32F1 是 FSMC，F4/F7/H7 是 FMC。",
          ],
          [
            "为什么 8080 屏不用 RGB 接口？",
            "8080 是“带控制器的屏”，MCU 只发命令和数据，屏内部有 GRAM，接线少、成本低；RGB 屏没有控制器，需要持续扫描，占用带宽和显存，但刷新率高。",
          ],
          [
            "外部 SRAM 需要初始化吗？",
            "不需要像 DRAM 那样刷新，但上电后内容是随机的，使用前要清零；如果做内存池，还要做一次读写测试确认总线正常。"
          ]
        ]
      },

      /* ---------------- UB-06 ---------------- */
      {
        id: "UB-06",
        chapter: "bus",
        topic: "sdio",
        title: "SDIO 读 SD 卡 + FatFs 的流程？热插拔怎么处理？",
        diff: "高级",
        freq: "中频",
        type: "驱动设计题",
        point: "考察 SD 卡初始化命令序列、块读写与 diskio 对接，以及插拔检测、去抖、卸载重挂的完整流程。",
        q: `<p>面试官：用 SDIO 接一张 SD 卡，跑 FatFs 存日志。<strong>从上电到能读写文件，要经过哪些步骤？</strong>卡拔了再插，<strong>软件怎么处理？</strong></p>`,
        exam: `<p>这题分两段：初始化命令序列考协议熟悉度，热插拔考工程完整性。能说出 CMD0/CMD8/ACMD41/CMD2/CMD3/CMD7 的顺序，以及“先卸载再重新初始化”，就说明你做过产品级存储。</p>`,
        core: `<p>初始化：上电给 SDIO 时钟至少 74 个周期让卡就绪；CMD0 复位到 idle；CMD8 查电压范围判断是否 2.0 以上（返回 0x1AA 表示支持）；ACMD41 带 HCS 位循环发直到卡退出 busy（可能几百毫秒到几秒）；CMD2 取 CID；CMD3 取 RCA，之后用这个地址通信；CMD9 取 CSD（容量、块大小、速度）；CMD7 选中卡；ACMD6 设 4 位总线宽、CMD16 设块长 512；之后用 CMD17/18 单块/多块读、CMD24/25 写。</p><p>对接 FatFs：实现 <code>disk_initialize</code>、<code>disk_status</code>、<code>disk_read</code>、<code>disk_write</code>、<code>disk_ioctl</code>（取扇区数/大小、同步），扇区固定 512 字节，多块读写用 CMD18/25 效率最高；然后 <code>f_mount</code> 挂载，失败就 <code>f_mkfs</code> 格式化。</p><p>热插拔：卡座 CD 引脚接 GPIO 中断（多是机械开关、插卡接地），中断只置标志，去抖 100~500ms 再在任务里处理；插入重新初始化 + f_mount，拔出先 <code>f_mount(NULL,...)</code> 卸载再 <code>HAL_SD_DeInit</code>，避免缓存指向已移除的卡；写操作返回错误也按“卡可能被拔”处理，卸载并标记不可用而不是反复重试。不要写卡过程中拔卡，可能损坏 FAT，产品上最好有“正在写入”指示或用日志式文件系统降低风险。</p>`,
        answer: `<p><b>初始化流程（SD 卡）：</b></p>
<ol>
<li>上电，给 SDIO 时钟至少 74 个周期，让卡进入就绪。</li>
<li><code>CMD0</code>（GO_IDLE_STATE）：复位到 idle 状态。</li>
<li><code>CMD8</code>：查询电压范围，判断是不是 2.0 以上的卡（返回 <code>0x1AA</code> 表示支持）。</li>
<li><code>ACMD41</code>：带 HCS 位发起初始化，循环发送直到卡退出 busy（可能需要几百毫秒到几秒）。</li>
<li><code>CMD2</code>：取 CID（卡标识）。</li>
<li><code>CMD3</code>：取 RCA（相对地址），之后用这个地址通信。</li>
<li><code>CMD9</code>：取 CSD（容量、块大小、速度参数）。</li>
<li><code>CMD7</code>：选中卡。</li>
<li><code>ACMD6</code>：设置 4 位总线宽度；<code>CMD16</code> 设置块长度 512 字节。</li>
<li>之后用 <code>CMD17/18</code>（单块/多块读）、<code>CMD24/25</code>（写）访问数据。</li>
</ol>
<p><b>和 FatFs 对接：</b>实现 <code>disk_initialize</code>、<code>disk_status</code>、<code>disk_read</code>、<code>disk_write</code>、<code>disk_ioctl</code>（取扇区数/扇区大小、同步）。扇区大小固定 512 字节，多块读写用 <code>CMD18/25</code> 效率最高。然后 <code>f_mount</code> 挂载，失败就 <code>f_mkfs</code> 格式化。</p>
<p><b>热插拔处理：</b></p>
<ul>
<li>用卡座的 <b>CD 引脚</b>接 GPIO 中断（很多卡座是机械开关，插卡接地）。</li>
<li>中断里只置标志，<b>去抖 100~500ms</b>，再在任务里处理。</li>
<li>插入：重新跑初始化 → <code>f_mount</code>。拔出：先 <code>f_mount(NULL, ...)</code> 卸载，再 <code>HAL_SD_DeInit</code>，避免文件系统缓存指向已移除的卡。</li>
<li>写操作返回错误时，也要按“卡可能被拔”处理：卸载、标记存储不可用、提示用户，而不是反复重试。</li>
</ul>
<p><b>注意：</b>不要在写卡过程中拔卡，可能损坏 FAT；产品上最好加“正在写入”指示灯，或者用文件系统的事务/日志方案降低风险。</p>`,
        principle: `<p>SD 卡有两种模式：SD 模式（SDIO 总线）和 SPI 模式。SDIO 模式用 CMD/ACMD 命令、4 位数据线，速度快；SPI 模式只用 CS/CLK/MOSI/MISO，慢但接线简单。</p>
<p>ACMD 是“应用命令”，必须先发 <code>CMD55</code> 告诉卡“下一条是 ACMD”，再发 <code>ACMD41/ACMD6</code>。漏掉 CMD55 是初始化卡住的常见原因。</p>
<p>卡的状态机从 idle → ready → identification → standby → transfer，每条命令只在特定状态有效。初始化失败时，先看卡停在哪个状态，再查命令顺序，比盲目重试有效。</p>`,
        fig: {
          type: "flow",
          title: "SD 卡初始化与挂载",
          tag: "flow",
          items: [
            { t: "上电 / 74 个时钟", d: "卡进入就绪" },
            { t: "CMD0 → CMD8", d: "复位、查电压" },
            { t: "ACMD41 循环", d: "等待初始化完成" },
            { t: "CMD2 → CMD3", d: "取 CID、分配 RCA" },
            { t: "CMD9 → CMD7", d: "取 CSD、选中卡" },
            { t: "ACMD6 / CMD16", d: "4 位总线、512B 块" },
            { t: "f_mount", d: "挂载文件系统" }
          ]
        },
        code: {
          lang: "c",
          title: "sd_fatfs.c",
          src: `FATFS g_fs;
static volatile uint8_t s_card_event;   /* 1=插入，2=拔出 */

/* CD 引脚中断：只置标志，去抖和初始化放任务里 */
void HAL_GPIO_EXTI_Callback(uint16_t pin)
{
    if (pin == CARD_DET_PIN) {
        s_card_event = gpio_card_present() ? 1 : 2;
    }
}

int storage_task(void)
{
    static uint8_t mounted;

    if (s_card_event) {
        uint8_t ev = s_card_event;
        s_card_event = 0;
        HAL_Delay(200);                          /* 去抖，等卡座稳定 */

        if (ev == 2 && mounted) {
            f_mount(NULL, "", 0);                /* 先卸载，避免缓存指向失效卡 */
            HAL_SD_DeInit(&hsd);
            mounted = 0;
        } else if (ev == 1 && !mounted) {
            if (sd_init() == 0) {
                if (f_mount(&g_fs, "", 1) == FR_OK) {
                    mounted = 1;
                } else {
                    f_mkfs("", NULL, NULL, 0);   /* 首次使用或格式损坏 */
                    mounted = (f_mount(&g_fs, "", 1) == FR_OK);
                }
            }
        }
    }

    if (mounted && f_write_failed()) {           /* 写失败：按拔卡处理 */
        f_mount(NULL, "", 0);
        HAL_SD_DeInit(&hsd);
        mounted = 0;
    }
    return mounted;
}`
        },
        codeNote: `<b>为什么先 <code>f_mount(NULL)</code>：</b>FatFs 内部有扇区缓存和文件对象，卡拔掉后这些缓存全部失效；不卸载直接重新挂载，可能把旧缓存写回新卡，造成文件系统损坏。`,
        apply: `<p>产品上，SD 卡写入要配合“安全弹出”逻辑：检测到拔卡意图（CD 变化）时，先停止写、<code>f_sync</code>、卸载，再允许断电。没有这个流程，用户随手拔卡就可能丢文件。</p>
<p>如果日志写入频繁，建议用“先写内存环形缓冲、批量落盘”的方式，减少对卡的随机写；同时限制单文件大小，避免 FAT 表频繁更新。</p>`,
        pitfalls: [
          "<b>漏发 CMD55 就发 ACMD41。</b>卡不认，初始化一直超时。",
          "<b>拔卡不卸载。</b>文件系统缓存指向已移除的卡，下次插入可能写坏新卡。",
          "<b>在中断里做初始化。</b>ACMD41 可能等几百毫秒，中断里死等会拖垮系统。",
          "<b>写失败就无限重试。</b>卡已经拔了，重试只会阻塞任务，应该降级并上报。"
        ],
        follow: [
          [
            "SDIO 4 位和 1 位差多少？",
            "理论上 4 倍带宽。初始化时先用 1 位，ACMD6 切到 4 位；如果 PCB 上 D1~D3 没接或干扰大，可以退回 1 位，速度降但更稳。",
          ],
          [
            "SDHC 和 SDSC 的地址单位一样吗？",
            "不一样。SDSC 按字节地址，SDHC/SDXC 按块地址（512B 为单位）。驱动要按 CSD 里的版本字段区分，否则读写偏移会错 512 倍。",
          ],
          [
            "SPI 模式什么时候用？",
            "引脚紧张、速度要求不高、或者 MCU 没有 SDIO 时用。它只需要 4 根线，但协议开销大、速率低，且不支持 4 位并行。"
          ]
        ]
      },

      /* ---------------- UB-07 ---------------- */
      {
        id: "UB-07",
        chapter: "net",
        topic: "lwip",
        title: "ETH + LwIP：内存池怎么配？socket API 和裸机协议栈有什么区别？",
        diff: "高级",
        freq: "中频",
        type: "配置分析题",
        point: "考察 LwIP 的内存模型（堆/pbuf 池/PCB）、TCP 窗口与缓冲的关系，以及 raw API 与 socket/netconn 的适用场景。",
        q: `<p>面试官：STM32 + 以太网 + LwIP，<strong>内存池怎么配才不丢包？</strong><code>NO_SYS</code> 开和不开有什么区别？<strong>socket API 和裸机回调该怎么选？</strong></p>`,
        exam: `<p>LwIP 调优的核心是“缓冲区要能装下一个往返的数据量”。能说出 <code>PBUF_POOL_SIZE</code>、<code>TCP_SND_BUF</code>、<code>TCP_WND</code> 三者的关系，并知道 raw API 不能阻塞，就算答到点上了。</p>`,
        core: `<p>几块内存：<code>MEM_SIZE</code> 是 LwIP 自己的堆，用于协议控制块、路由表和各种动态分配；<code>PBUF_POOL_SIZE</code> 是 pbuf 池个数、每个 <code>PBUF_POOL_BUFSIZE</code>，收包先从这里分配，池空就丢包；<code>MEMP_NUM_*</code> 是各类 PCB（TCP/UDP/ARP）数量上限；<code>TCP_SND_BUF</code>/<code>TCP_WND</code> 是发送缓冲和接收窗口，直接决定吞吐。</p><p>怎么配：先算带宽延迟积，100Mbps、RTT 1ms 一个往返约 12.5KB，TCP_WND 至少这个量级、TCP_SND_BUF 不低于窗口，否则发送端一直等 ACK 跑不满带宽；pbuf 池按“同时能缓存多少包”估，16~32 个是常见起点。</p><p><code>NO_SYS=1</code> 裸机没有 RTOS，在主循环轮询 <code>sys_check_timeouts</code>、用 raw API 回调，优点是零拷贝、开销小、不用线程同步，缺点是所有回调必须快速返回、不能阻塞，否则协议栈停摆。<code>NO_SYS=0</code> 带 OS 时 LwIP 跑 <code>tcpip_thread</code>，应用可用 netconn 或 socket API、写法接近 Linux、可以阻塞，代价是多一层线程通信和数据拷贝、RAM/CPU 开销更大，且只有 tcpip 线程能碰核心。资源紧、逻辑简单、实时性要求高用裸机 raw API；已有 RTOS、逻辑复杂、要移植 socket 代码用 socket/netconn，不要为了“看起来高级”在 64KB RAM 的片子上硬上 socket。</p>`,
        answer: `<p><b>先理解 LwIP 的几块内存：</b></p>
<ul>
<li><code>MEM_SIZE</code>：LwIP 自己的堆，用于协议控制块、路由表、各种动态分配。</li>
<li><code>PBUF_POOL_SIZE</code>：pbuf 池的个数，每个大小 <code>PBUF_POOL_BUFSIZE</code>。收包时先从这里分配，池空了就丢包。</li>
<li><code>MEMP_NUM_*</code>：各类 PCB（TCP/UDP/ARP）的数量上限。</li>
<li><code>TCP_SND_BUF</code> / <code>TCP_WND</code>：发送缓冲和接收窗口，直接决定吞吐。</li>
</ul>
<p><b>怎么配：</b>先算带宽延迟积。100Mbps、RTT 1ms，一个往返大约 12.5KB；<code>TCP_WND</code> 至少要是这个量级，<code>TCP_SND_BUF</code> 不低于窗口，否则发送端一直在等 ACK，跑不满带宽。pbuf 池按“同时能缓存的包数”估，16~32 个是常见起点。</p>
<p><b><code>NO_SYS=1</code>（裸机）：</b>没有 RTOS，LwIP 在主循环里轮询 <code>sys_check_timeouts</code>，用 <b>raw API</b>（回调函数）。优点是零拷贝、开销小、不需要线程同步；缺点是所有回调必须<b>快速返回，不能阻塞</b>，否则整个协议栈停摆。</p>
<p><b><code>NO_SYS=0</code>（带 OS）：</b>LwIP 跑一个 <code>tcpip_thread</code>，应用可以用 <b>netconn</b> 或 <b>socket API</b>，写法接近 Linux，可以阻塞。代价是多一层线程通信和数据拷贝，RAM/CPU 开销更大，还要注意线程安全（只有 tcpip 线程能碰核心）。</p>
<p><b>怎么选：</b>资源紧、逻辑简单、实时性要求高 → 裸机 raw API；已经有 RTOS、应用逻辑复杂、要移植现有 socket 代码 → socket/netconn。不要为了“看起来高级”在 64KB RAM 的片子上硬上 socket。</p>`,
        principle: `<p>TCP 的吞吐受“窗口 / RTT”限制：<code>吞吐 ≤ 窗口 / RTT</code>。窗口太小，即使链路空闲也跑不满。LwIP 的 <code>TCP_WND</code> 是接收窗口，<code>TCP_SND_BUF</code> 是发送缓冲，两者要匹配对端的能力。</p>
<p>pbuf 有 pool（固定大小、快）和 ram（按需分配、灵活）两种。收包用 pool 可以避免碎片，但池大小固定；发送大块数据用 ram/ref 链式 pbuf，避免拷贝。</p>
<p>在 Cortex-M7 上还要注意 D-Cache：ETH DMA 读写内存不经过 CPU 缓存，发送前要 <code>SCB_CleanDCache_by_Addr</code>，接收后要 <code>SCB_InvalidateDCache_by_Addr</code>，否则会出现“数据看起来没更新”或“发出去的包内容错”。</p>`,
        fig: {
          type: "table",
          title: "raw API 与 socket API 对比",
          tag: "compare",
          head: ["项目", "raw API（NO_SYS=1）", "socket / netconn（NO_SYS=0）"],
          rows: [
            ["运行环境", "裸机主循环", "RTOS + tcpip_thread"],
            ["编程模型", "回调，事件驱动", "阻塞式，顺序代码"],
            ["数据拷贝", "零拷贝（pbuf）", "通常有拷贝"],
            ["RAM 开销", "小", "较大（线程栈、缓冲）"],
            ["阻塞", "绝对禁止", "允许"],
            ["移植性", "LwIP 专用", "接近 POSIX，易移植"],
            ["适用", "资源紧、逻辑简单", "复杂应用、已有 socket 代码"]
          ]
        },
        code: {
          lang: "c",
          title: "lwipopts.h",
          src: `/* 100Mbps + 4~8KB 窗口的起点配置，按实际 RAM 调整 */
#define MEM_SIZE                (16 * 1024)
#define PBUF_POOL_SIZE          24
#define PBUF_POOL_BUFSIZE       1524
#define MEMP_NUM_PBUF           16
#define MEMP_NUM_TCP_PCB        8
#define MEMP_NUM_TCP_SEG        32

#define TCP_MSS                 1460
#define TCP_WND                 (8 * TCP_MSS)
#define TCP_SND_BUF             (8 * TCP_MSS)
#define TCP_SND_QUEUELEN        (4 * TCP_SND_BUF / TCP_MSS)

#define LWIP_NETCONN            0      /* 裸机：关掉 netconn/socket */
#define LWIP_SOCKET             0
#define NO_SYS                  1

#define LWIP_DHCP               1
#define LWIP_DNS                1
#define LWIP_ICMP               1
#define LWIP_UDP                1
#define LWIP_TCP                1`
        },
        codeNote: `<b>几个联动关系：</b><code>TCP_SND_QUEUELEN</code> 要能放下发送缓冲里的所有段，否则 <code>tcp_write</code> 会返回 <code>ERR_MEM</code>；<code>PBUF_POOL_BUFSIZE</code> 要大于最大帧（1514 + 余量），否则一个包要多个 pbuf，池消耗翻倍。`,
        apply: `<p>实际调优顺序：先用默认配置跑通 ping 和 TCP 回环，再用 <code>iperf</code> 测吞吐；如果吞吐上不去，先看窗口和 <code>TCP_SND_BUF</code>，再看 pbuf 是否频繁耗尽（开 <code>LWIP_STATS</code> 看 <code>MEMPERR</code>/<code>PBUFERR</code>）。</p>
<p>硬件上，ETH 的 DMA 描述符和缓冲区要放在非缓存区（MPU 配置为 Device/Non-cacheable），或者严格做 cache 维护；RMII 的 50MHz 时钟要由外部晶振或 PLL 提供，抖动太大会丢包。</p>`,
        pitfalls: [
          "<b>只加 <code>MEM_SIZE</code> 不加 <code>PBUF_POOL_SIZE</code>。</b>堆再大，收包池空了照样丢包。",
          "<b>窗口小于带宽延迟积。</b>链路空闲但吞吐上不去，误以为是 PHY 问题。",
          "<b>在 raw API 回调里做耗时操作。</b>整个协议栈被阻塞，表现为“网络突然卡死”。",
          "<b>忽略 D-Cache。</b>M7 上收发数据不一致，调试时看内存是对的，线上就是错的。"
        ],
        follow: [
          [
            "LwIP 的 <code>tcp_write</code> 返回 <code>ERR_MEM</code> 怎么办？",
            "说明发送缓冲或队列满了。要么等 <code>tcp_sent</code> 回调释放后再写，要么增大 <code>TCP_SND_BUF</code>/<code>TCP_SND_QUEUELEN</code>。不能原地重试死等。",
          ],
          [
            "裸机下怎么处理多连接？",
            "每个连接一个 <code>tcp_pcb</code>，用回调里的 <code>arg</code> 区分；主循环里轮询 <code>sys_check_timeouts</code>，回调只做状态机推进，不阻塞。",
          ],
          [
            "为什么 ping 通但 TCP 连不上？",
            "可能是端口没监听、防火墙、ARP 正常但 TCP 握手被丢（窗口/缓冲配置）、或者 <code>tcp_accept</code> 回调没注册。先抓包看 SYN 有没有回 SYN-ACK。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第三批：LVGL 工程化） ---------------- */
  EIK.extend("usb-display-bus", {
    chapters: [
      {
        id: "display",
        topics: [
          { id: "layout", title: "布局与样式" }
        ]
      }
    ],
    questions: [
      {
        id: "UB-08",
        chapter: "display",
        topic: "lvgl",
        title: "LVGL 项目里页面怎么组织？分辨率和刷新周期怎么定？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "多 screen 与容器切换的取舍、缓冲大小与分辨率的换算关系，以及帧率到底受什么限制。",
        q: `<p>面试官：你的 LVGL 项目有多少个页面？怎么组织的？分辨率、缓冲和刷新周期是怎么定的？</p>`,
        exam: `<p>考察是否有真实的 GUI 项目经验。能算清“缓冲要多少 RAM、帧率被什么卡住”，比报一堆数字更可信。</p>`,
        core: `<p>两种做法：多 screen + 切换动画，每个页面是独立 screen，用 <code>lv_screen_load_anim</code> 切换、自带转场，缺点是每个 screen 对象树独立占内存，页面多了 RAM 吃不消；单 screen + 容器显隐，一个 screen 里放多个容器，切换只改显隐，省内存、切换快、无动画开销，适合页面多但交互简单的设备。我的做法是主干用容器显隐，只有需要转场效果的少数页面用独立 screen；列表项不要每次创建删除，用 <code>lv_obj_clean</code> 复用容器，否则反复分配释放会产生碎片。</p><p>分辨率先由屏定、再由 RAM 反推缓冲：320×240 全屏 RGB565 要 150KB，800×480 要 750KB，后者多数 MCU 必须外扩 SRAM/SDRAM；局部缓冲只要屏的 1/10，320×240 约 15KB，是绝大多数方案的选择。</p><p>刷新周期不是帧率：<code>lv_timer_handler</code> 每 5~10ms 调一次是在处理定时器和检查脏区，真正画多少帧取决于 SPI 带宽；SPI 40MHz 刷 320×240×16bpp 整屏约 60ms，满打满算 15fps，所以必须靠局部刷新只传变化区域。静态为主、偶尔动画 20~30fps 够用，滑动列表、进度条才需要往 60fps 追。</p>`,
        answer: `<p><b>页面组织两种做法：</b></p>
<ul>
<li><b>多 screen + 切换动画</b>：每个页面是一个独立的 screen，用 <code>lv_screen_load_anim</code> 切换，自带转场效果。缺点是每个 screen 的对象树都独立占内存，页面多了 RAM 吃不消。</li>
<li><b>单 screen + 容器显隐</b>：一个 screen 内放多个容器，切换时只改显隐。省内存、切换快、无动画开销，适合页面多但交互简单的设备。</li>
</ul>
<p>我的做法是主干用容器显隐，只有需要转场效果的少数页面用独立 screen。另外列表项不要每次创建/删除，用 <code>lv_obj_clean</code> 复用容器，否则反复分配释放会产生碎片。</p>
<p><b>分辨率先由屏定，再由 RAM 反推缓冲：</b>320×240 全屏 RGB565 需要 150KB，800×480 需要 750KB，后者在多数 MCU 上必须外扩 SRAM/SDRAM。用局部缓冲只要屏的 1/10，320×240 大约 15KB，这是绝大多数方案的选择。</p>
<p><b>刷新周期不是帧率：</b><code>lv_timer_handler</code> 每 5~10ms 调一次是在“处理定时器、检查脏区”，真正画多少帧取决于 SPI 带宽。SPI 40MHz 刷 320×240×16bpp 整屏约 60ms，也就是满打满算 15fps——所以必须靠局部刷新，只有变化区域才传输。</p>
<p><b>帧率目标：</b>静态为主、偶尔动画的界面 20~30fps 完全够；滑动列表、进度条这类才需要往 60fps 追。</p>`,
        principle: `<p>LVGL 的性能瓶颈几乎总在“像素传输”这一环，而不是渲染计算。所以优化的顺序是：减小传输量（脏矩形、局部缓冲）→ 提高传输带宽（SPI 提速、DMA、并口/QSPI 屏）→ 最后才是优化控件结构。</p>
<p>缓冲大小与分辨率的关系是线性的：全屏缓冲 = 宽 × 高 × 每像素字节数。RGB565 是 2 字节，ARGB8888 是 4 字节——仅仅换色深就能让 RAM 需求翻倍，这是选型时必须先算的账。</p>`,
        fig: {
          type: "table",
          title: "常见分辨率的缓冲需求（RGB565）",
          tag: "lvgl-buf",
          head: ["分辨率", "全屏缓冲", "1/10 局部缓冲", "典型场景"],
          rows: [
            ["240×240", "113 KB", "11 KB", "圆形小屏、手表"],
            ["320×240", "150 KB", "15 KB", "2.8~3.5 寸常见屏"],
            ["480×272", "255 KB", "26 KB", "4.3 寸，需较大 SRAM"],
            ["800×480", "750 KB", "75 KB", "5~7 寸，通常外扩 SDRAM"]
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_pages.c",
          src: `/* 方式 A：独立 screen，切换带转场动画 */
static void goto_settings(void)
{
    /* v9 用 lv_screen_load_anim；v8 是 lv_scr_load_anim */
    lv_screen_load_anim(scr_settings, LV_SCREEN_LOAD_ANIM_MOVE_LEFT,
                        300, 0, false);
}

/* 方式 B：单 screen 内多容器，只切显隐，省内存也省时间 */
#define TAB_COUNT  3
static lv_obj_t *tabs[TAB_COUNT];

static void switch_tab(int idx)
{
    for (int i = 0; i < TAB_COUNT; i++) {
        if (i == idx) lv_obj_remove_flag(tabs[i], LV_OBJ_FLAG_HIDDEN);
        else         lv_obj_add_flag(tabs[i], LV_OBJ_FLAG_HIDDEN);
    }
}

/* 主循环：5ms 一次，兼顾响应和 CPU 占用 */
void gui_task(void *arg)
{
    for (;;) {
        lv_timer_handler();       /* 处理定时器、动画、刷新 */
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}`
        },
        codeNote: "lv_timer_handler 的调用周期不要太长：它同时负责动画推进和输入处理，间隔超过 20ms 时滑动会明显发涩。但也不能在死循环里不间断调用，会白占 CPU、拖慢其他任务。",
        apply: `<p>一个 4.3 寸 480×272 的设备，最初用独立 screen 做了 12 个页面，RAM 直接爆了。改成“1 个 screen + 3 个容器 + 内部再分组”后，对象数从 400 多降到 120，RAM 回到安全线内，切换还更快了。</p>
<p>帧率上踩过坑：一开始追求 30fps，把 SPI 拉到 80MHz，结果屏幕花屏（超出屏的时序能力）。退回 40MHz 并把局部缓冲从 1/10 屏降到 1/20 屏、只刷变化区域，实际观感反而更流畅。</p>`,
        pitfalls: [
          "<b>页面多就建多个 screen。</b>每个 screen 都占一份对象内存，十几个页面必然爆 RAM。",
          "<b>列表每次都创建再删除。</b>反复分配释放产生碎片，跑几小时后卡顿甚至分配失败。",
          "<b>照抄别人的缓冲配置。</b>分辨率、色深不同，RAM 需求差好几倍。",
          "<b>把刷新周期当帧率。</b>10ms 调一次不代表 100fps，实际受带宽限制可能只有 15fps。"
        ],
        follow: [
          ["色深用 RGB565 还是 ARGB8888？", "RGB565 每像素 2 字节，省一半 RAM 和带宽，颜色够用；需要半透明、抗锯齿效果好才上 ARGB8888，代价是 RAM 和带宽翻倍。"],
          ["怎么测实际帧率？", "在 flush_cb 里计数，每秒统计一次；或者用 LVGL 自带的性能计数器（开启 LV_USE_PERF_MONITOR）。比估算准确。"],
          ["SPI 屏和 RGB 并口屏怎么选？", "SPI 屏接线少、成本低，但带宽受限，适合中小尺寸；RGB 并口（LTDC/FMC）带宽高、能刷大屏，但引脚多、需要更大的显存，通常要外扩 SDRAM。"]
        ]
      },

      {
        id: "UB-09",
        chapter: "display",
        topic: "layout",
        title: "LVGL 的界面布局怎么排？flex、grid 和绝对定位怎么选？",
        diff: "中级",
        freq: "中频",
        type: "设计分析题",
        point: "三种布局方式的适用场景、尺寸用百分比而非像素，以及样式统一管理的做法。",
        q: `<p>面试官：LVGL 里控件位置你怎么定？为什么很多项目改个分辨率界面就全乱了？</p>`,
        exam: `<p>考察界面工程化的意识。能说出“别用绝对坐标、尺寸用百分比、样式抽公共”这三点，就说明踩过坑。</p>`,
        core: `<p>绝对定位 <code>lv_obj_set_pos</code> + <code>set_size</code> 写死像素坐标和大小，简单直接但换分辨率、换字体就全乱，只适合单一定制屏的简单界面；flex（<code>lv_obj_set_flex_flow</code> + <code>flex_align</code>）是一维排列，可按行或列、支持 gap 和 grow 分配剩余空间，适合工具栏、卡片列表、按钮组，最常用；grid（<code>lv_obj_set_grid_dsc_array</code> + <code>set_grid_cell</code>）是二维栅格，用 fr 或像素定义行列，适合仪表盘、设置页这类规整二维布局。还有轻量的 <code>lv_obj_align</code> 相对父对象对齐、<code>lv_obj_align_to</code> 相对兄弟对象对齐，适合界面上只有几个元素、不参与流式布局的场合。</p><p>两条原则：尺寸尽量用 <code>lv_pct(100)</code> 或 <code>LV_SIZE_CONTENT</code>，不要写死像素；padding 和 gap 统一放 style 里而不是每个控件单独设，否则改一次间距要改几十处。我的倾向是外层 flex 分行、每行内部再 flex，只有真正二维的仪表盘页面才用 grid，绝对坐标只在少数装饰元素上用。</p>`,
        answer: `<p><b>三种方式，按场景选：</b></p>
<ul>
<li><b>绝对定位</b>（<code>lv_obj_set_pos</code> + <code>set_size</code>）：写死像素坐标和大小。简单直接，但换分辨率、换字体就全乱，只适合单一定制屏的简单界面。</li>
<li><b>flex</b>（<code>lv_obj_set_flex_flow</code> + <code>flex_align</code>）：一维排列，可以按行或按列，支持 gap 和 grow 分配剩余空间。适合工具栏、卡片列表、按钮组，是最常用的一种。</li>
<li><b>grid</b>（<code>lv_obj_set_grid_dsc_array</code> + <code>set_grid_cell</code>）：二维栅格，用 fr 或像素定义行列。适合仪表盘、设置页这种规整的二维布局。</li>
</ul>
<p><b>还有一个轻量的</b>：<code>lv_obj_align</code> 相对父对象对齐（左上、居中、右下），<code>lv_obj_align_to</code> 相对兄弟对象对齐。适合界面上只有几个元素、不需要参与流式布局的场合。</p>
<p><b>两条原则：</b>尺寸尽量用 <code>lv_pct(100)</code> 或 <code>LV_SIZE_CONTENT</code>，不要写死像素；padding 和 gap 统一放在 style 里，而不是每个控件单独设一遍，否则改一次间距要改几十处。</p>
<p><b>我的倾向：</b>外层用 flex 分行，每行内部再用 flex；只有真正二维的仪表盘页面才用 grid；绝对坐标只在少数装饰性元素上用。</p>`,
        principle: `<p>flex 和 grid 都是把“位置计算”交给布局引擎：父容器负责在布局时算出子对象的位置和大小，子对象只需要声明自己的意图（占多少、怎么对齐）。这样分辨率变化时不用改代码。</p>
<p>代价是布局计算有开销：每次子对象增删或尺寸变化都会触发重新布局。所以在动画频繁刷新的界面上，不要每帧改布局属性，改内容而不是改结构。</p>`,
        fig: {
          type: "table",
          title: "三种布局方式对比",
          tag: "lvgl-layout",
          head: ["方式", "适合场景", "优点", "缺点"],
          rows: [
            ["绝对定位", "定制屏的简单界面", "直观、无计算开销", "换分辨率就乱"],
            ["flex", "列表、工具栏、卡片行", "自适应、代码简洁", "复杂嵌套时布局开销上升"],
            ["grid", "仪表盘、设置页", "二维规整、对齐精确", "配置略繁琐"],
            ["align / align_to", "少量元素定位", "轻量、不改结构", "元素多了难维护"]
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_flex.c",
          src: `/* 外层：纵向排列的两行；内层：横向排列的按钮 */
static void build_layout(lv_obj_t *parent)
{
    /* 外层容器铺满父对象，纵向 flex */
    lv_obj_set_size(parent, lv_pct(100), lv_pct(100));
    lv_obj_set_flex_flow(parent, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_style_pad_all(parent, 8, 0);
    lv_obj_set_style_pad_row(parent, 12, 0);      /* 行间距，统一在样式里 */

    /* 第一行：标题栏，高度固定，宽度撑满 */
    lv_obj_t *bar = lv_obj_create(parent);
    lv_obj_set_size(bar, lv_pct(100), 40);
    lv_obj_set_flex_flow(bar, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(bar, LV_FLEX_ALIGN_SPACE_BETWEEN,
                          LV_FLEX_ALIGN_CENTER, LV_FLEX_ALIGN_CENTER);

    lv_obj_t *title = lv_label_create(bar);
    lv_label_set_text(title, "Device");
    lv_obj_t *btn = lv_button_create(bar);
    lv_obj_set_size(btn, LV_SIZE_CONTENT, LV_SIZE_CONTENT);

    /* 第二行：内容区，grow 占满剩余高度 */
    lv_obj_t *body = lv_obj_create(parent);
    lv_obj_set_width(body, lv_pct(100));
    lv_obj_set_flex_grow(body, 1);                /* 自动吃掉剩余空间 */
    lv_obj_set_flex_flow(body, LV_FLEX_FLOW_COLUMN);
}`
        },
        codeNote: "lv_pct(100) 是相对父对象的宽度，比硬编码 320 可靠得多。lv_obj_set_flex_grow(body, 1) 让内容区自动占满剩余高度，这样标题栏改高度时内容区不用跟着改。",
        apply: `<p>接手过一个界面，所有控件都是绝对坐标，客户要求把 3.5 寸屏换成 4.3 寸，结果 40 多个控件位置全错，改了一整天。后来重构成 flex 布局，只改了根容器的尺寸，其余自动适配。</p>
<p>另一个收益是统一间距：把 pad 和 gap 都放进公共 style 后，UI 说要“行距再大一点”，改一个数字全站生效，不用逐个控件调。</p>`,
        pitfalls: [
          "<b>到处写绝对坐标。</b>换分辨率或换字体后界面全乱，维护成本极高。",
          "<b>尺寸写死像素。</b>应该用百分比或 LV_SIZE_CONTENT，让布局引擎算。",
          "<b>样式散落在每个控件上。</b>改一次间距要改几十处，还容易漏。",
          "<b>在动画里频繁改布局。</b>每次改动触发重排，CPU 占用飙升，动画卡顿。"
        ],
        follow: [
          ["flex 和 grid 能嵌套吗？", "能，而且很常见：外层 grid 分区域，每个区域内部用 flex 排内容。但嵌套层数不宜超过 3 层，否则布局开销和调试难度都上升。"],
          ["为什么控件设了尺寸还是不生效？", "检查父容器的布局方式和该控件的 grow/align 设置。在 flex 容器里，子对象的尺寸可能被布局引擎覆盖，需要设 LV_OBJ_FLAG_IGNORE_LAYOUT 或改用 flex_grow。"],
          ["LVGL 的 style 怎么复用？", "用 lv_style_init 定义一次，lv_obj_add_style 挂到多个对象上；改样式用 lv_style_set_xxx 后调用 lv_obj_report_style_change 刷新。这样一份样式可以管一整类控件。"]
        ]
      },

      {
        id: "UB-10",
        chapter: "display",
        topic: "lvgl",
        title: "LVGL 界面卡死、点不动，怎么定位原因？",
        diff: "高级",
        freq: "中频",
        type: "故障排查题",
        point: "把“GUI 卡”与“系统卡”分开、按调用链逐段排除，以及内存耗尽和线程安全这两类典型原因。",
        q: `<p>面试官：设备用着用着界面就不刷新了，按钮也点不动，但程序好像还在跑。你怎么查？</p>`,
        exam: `<p>考察排查思路的条理性。能先分清是“没调用刷新”还是“调用了但刷不出来”，再逐段收敛，就比乱猜强。</p>`,
        core: `<p>① 分清是 GUI 卡还是整个系统卡：GUI 任务里翻转 GPIO 或递增计数器，用示波器/日志看还在不在动。不动是系统级问题——死循环、死锁、中断风暴、HardFault 后卡在异常处理，按常规调试查；还在动就是 GUI 层问题。</p><p>② 看 <code>lv_timer_handler</code> 是否正常返回：在它前后打点计时，单次耗时很长说明内部有阻塞——flush_cb 里死等 DMA、驱动里阻塞式读触摸、某个回调里做耗时运算。</p><p>③ 看内存：调 <code>lv_mem_monitor</code> 打印 used_pct 和 frag_pct，used 接近 100% 说明内存耗尽，对象创建会静默失败，表现就是“界面部分不显示、点了没反应”，常见原因是页面反复创建不删除或 LV_MEM_SIZE 设太小。</p><p>④ 看线程安全：有没有在中断或另一个任务里直接调 LVGL API？LVGL 不是线程安全的，跨上下文必须用 <code>lv_async_call</code> 或加互斥锁，这类问题表现为偶发花屏、卡死，且和操作时序强相关。⑤ 看输入：触摸驱动出错会一直上报“按下”，事件队列被刷爆，界面看着像卡住，打印坐标和状态就能发现。</p>`,
        answer: `<p><b>第一步：分清是 GUI 卡还是整个系统卡。</b>在 GUI 任务里翻转一个 GPIO 或递增计数器，用示波器/日志看它还在不在动。</p>
<ul>
<li>不动 → 系统级问题：死循环、死锁、中断风暴、HardFault 后卡在异常处理。按常规调试手段查。</li>
<li>还在动 → GUI 层问题，继续往下。</li>
</ul>
<p><b>第二步：看 lv_timer_handler 是否正常返回。</b>在它前后打点计时，如果单次耗时很长，说明内部有阻塞：flush_cb 里死等 DMA、驱动里阻塞式读触摸、某个回调里做了耗时运算。</p>
<p><b>第三步：看内存。</b>调用 <code>lv_mem_monitor</code> 打印 used_pct 和 frag_pct。used 接近 100% 说明内存耗尽，对象创建会静默失败，表现就是“界面部分不显示、点了没反应”。常见原因是页面反复创建不删除，或者 LV_MEM_SIZE 设得太小。</p>
<p><b>第四步：看线程安全。</b>有没有在中断或另一个任务里直接调 LVGL API？LVGL 不是线程安全的，跨上下文必须用 <code>lv_async_call</code> 或加互斥锁。这类问题表现为偶发花屏、卡死，且和操作时序强相关。</p>
<p><b>第五步：看输入。</b>触摸驱动出错时会一直上报“按下”事件，事件队列被刷爆，界面看着像卡住。打印触摸坐标和按下状态就能发现。</p>`,
        principle: `<p>LVGL 是单线程事件驱动的：所有渲染和事件处理都在调用 lv_timer_handler 的那个上下文里完成。所以“界面卡”几乎总能归结为三类——这个函数没被调用、被调用但内部阻塞、或者它依赖的数据结构被破坏了（内存耗尽、跨线程写坏）。</p>
<p>flush_cb 的写法是最常见的坑：正确做法是启动 DMA 后立刻返回，等 DMA 传输完成中断里调 <code>lv_display_flush_ready</code>。如果在回调里 while 等 DMA 完成，双缓冲失去意义，而且一旦 DMA 出错就永久卡住。</p>`,
        fig: {
          type: "table",
          title: "界面卡死的常见原因",
          tag: "lvgl-hang",
          head: ["现象", "可能原因", "验证方法"],
          rows: [
            ["整个系统不响应", "死循环 / 死锁 / HardFault", "GUI 任务翻转 GPIO 看是否还在动"],
            ["界面静止但程序在跑", "lv_timer_handler 没被调用", "在该函数入口打点计数"],
            ["刷新一帧耗时很长", "flush_cb 死等 DMA", "测量单次 handler 耗时"],
            ["界面部分空白、点不动", "LV_MEM_SIZE 耗尽", "lv_mem_monitor 看 used_pct"],
            ["偶发花屏、随机卡死", "跨线程调用 LVGL", "检查中断/其他任务是否直接调 API"],
            ["一直触发点击", "触摸驱动异常上报", "打印触摸坐标与按下状态"]
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_health.c",
          src: `/* 周期性健康检查：内存、单次耗时、任务心跳 */
static uint32_t gui_beat;

void gui_task(void *arg)
{
    for (;;) {
        uint32_t t0 = micros();
        lv_timer_handler();
        uint32_t dt = micros() - t0;

        gui_beat++;

        if (dt > 20000u) {                 /* 单次超过 20ms 就要警惕 */
            log_warn("lv_timer_handler took %lu us", (unsigned long)dt);
        }

        static uint32_t last_check;
        if (millis() - last_check > 5000u) {
            last_check = millis();

            lv_mem_monitor_t mon;
            lv_mem_monitor(&mon);
            /* used_pct 长期接近 100 或 frag_pct 持续上升，说明有泄漏 */
            log_info("lvgl mem: used %u%%, frag %u%%",
                     mon.used_pct, mon.frag_pct);
        }

        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

/* 独立的监控任务：GUI 心跳停了就复位，避免界面永久卡死 */
void watchdog_task(void *arg)
{
    uint32_t seen = 0;

    for (;;) {
        if (gui_beat == seen) {
            log_error("gui hang, reset");
            NVIC_SystemReset();
        }
        seen = gui_beat;
        vTaskDelay(pdMS_TO_TICKS(3000));
    }
}`
        },
        codeNote: "监控任务的优先级要低于 GUI 任务，否则它自己抢占会导致误判。心跳判断的周期（这里 3s）要大于正常情况下的最大处理耗时，避免误复位。",
        apply: `<p>遇到过一次“跑几小时后界面点不动”：内存监控显示 frag_pct 从 5% 一路涨到 60%，最后 used 到顶。定位到是列表每刷新一次就 create 一批 item 却不删除。改成复用容器 + lv_obj_clean 后，跑 48 小时内存稳定。</p>
<p>另一次是“一滑动就卡”：flush_cb 里 while 等 DMA 完成标志，滑动时刷新频繁，CPU 全耗在等待上。改成启动 DMA 后立即返回、在完成中断里调 flush_ready，滑动立刻顺了。</p>`,
        pitfalls: [
          "<b>flush_cb 里死等传输完成。</b>双缓冲失效、CPU 空转，且 DMA 异常时永久卡死。",
          "<b>在中断里直接调 LVGL API。</b>不是线程安全的，会破坏内部链表，表现为随机花屏或卡死。",
          "<b>LV_MEM_SIZE 照抄示例。</b>页面一多就不够，且分配失败不报错，只表现为界面缺失。",
          "<b>没有超时监控。</b>界面卡死后只能靠用户断电，现场问题无法定位。"
        ],
        follow: [
          ["lv_timer_handler 应该多久调一次？", "5~10ms 比较合适。太长会让动画和触摸响应发涩，太短则白占 CPU。它内部有定时器调度，不是每次调用都重绘。"],
          ["怎么判断是内存碎片还是内存不足？", "看 lv_mem_monitor 的 frag_pct：used_pct 高但 frag 低说明是真不够（加大 LV_MEM_SIZE）；used 不高但 frag 持续上升说明是反复分配释放导致的碎片（改成复用对象）。"],
          ["LVGL 能在 RTOS 多任务里用吗？", "可以，但所有 API 必须在同一个任务里调用，或者用互斥锁保护。推荐做法是只让一个 GUI 任务调 LVGL，其他任务通过消息队列或 lv_async_call 把请求投递过去。"]
        ]
      }
    ]
  });
})();
