/* ============================================================
   import-wifi-extra.js
   从 wifi 相关问题、SPI 专题中的 MQTT 题导入的补充题
   仅收录站内没有重复的；答案按工程实践重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("communication", {
    chapters: [
      {
        id: "wireless",
        topics: [
          { id: "wifi", title: "Wi-Fi 模式与配网" },
          { id: "net", title: "TCP/IP 与 MQTT" }
        ]
      }
    ],

    questions: [
      {
        id: "M-39",
        chapter: "wireless",
        topic: "net",
        title: "MQTT 的发布/订阅模型是怎样的？它和 HTTP 轮询有什么本质区别？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "Broker 解耦发布者与订阅者、长连接双向通信、主题路由，与 HTTP 请求响应/轮询的差异。",
        q: `<p>面试官：讲一下 MQTT 的通信模型。设备上报数据为什么常用 MQTT，而不是直接 HTTP 轮询？两者本质区别在哪？</p>`,
        exam: `<p>考察对物联网通信选型的理解。能说清“Broker 解耦、长连接、主题路由、双向推送”，而不是只背“MQTT 轻量”，就很好。</p>`,
        core: `<p>MQTT 是发布/订阅，中间有 Broker：设备把消息发到某个 Topic，不关心谁在听；Broker 按订阅关系转发，支持 <code>+</code> 匹配一层、<code>#</code> 匹配多层。发布者和订阅者在空间、时间、数量上都解耦。</p><p>HTTP 是请求/响应，客户端主动请求、服务器返回，一个请求对一个响应，服务器不能主动推（除非长轮询、SSE、WebSocket）。设备要拿指令只能轮询：间隔短浪费流量和电，间隔长指令延迟大。</p><p>本质区别：MQTT 一条长连接、双向、固定头最小 2 字节、按 Topic 由 Broker 路由、有 QoS/遗嘱/保留；HTTP 默认短连接、单向、每个请求带几百字节头部、按 URL 路由、只有 TCP 可靠性。设备遥测、远程控制、多端订阅用 MQTT；一次性查询、文件上传下载、REST 接口用 HTTP；浏览器实时用 WebSocket。</p>`,
        answer: `<p><b>MQTT 是发布/订阅模型，中间有一个 Broker：</b></p>
<ul>
<li>设备作为 <b>Publisher</b> 把消息发到某个 <b>Topic</b>，例如 <code>dev/123/temp</code>；</li>
<li>它不关心谁在听，也不直接连订阅者；</li>
<li>Broker 负责把消息转发给所有订阅了匹配主题的 <b>Subscriber</b>；</li>
<li>订阅支持通配符：<code>+</code> 匹配一层，<code>#</code> 匹配多层，例如 <code>dev/+/temp</code>、<code>dev/123/#</code>。</li>
</ul>
<p>发布者和订阅者在<b>空间上解耦</b>（互相不知道地址）、<b>时间上解耦</b>（不必同时在线，配合持久会话/保留消息）、<b>数量上解耦</b>（一个发布者可以对应多个订阅者，反之亦然）。</p>
<p><b>HTTP 是请求/响应模型：</b>客户端主动发请求，服务器返回响应，一个请求对应一个响应。服务器<b>不能主动推</b>（除非用长轮询、SSE、WebSocket 这些扩展）。设备要拿指令，只能周期性轮询，带来两个问题：轮询间隔短则浪费流量和电，间隔长则指令延迟大。</p>
<p><b>本质区别：</b></p>
<ul>
<li><b>连接：</b>MQTT 通常是一条长期保持的 TCP 连接；HTTP 默认短连接（Keep-Alive 也只是复用，不是推送通道）。</li>
<li><b>方向：</b>MQTT 双向，设备和服务端都能主动发；HTTP 单向，只有客户端主动请求。</li>
<li><b>开销：</b>MQTT 固定头最小 2 字节；HTTP 每个请求带方法、URL、一堆头部，动辄几百字节。</li>
<li><b>路由：</b>MQTT 按 Topic 由 Broker 分发；HTTP 按 URL 打到具体服务。</li>
<li><b>可靠性语义：</b>MQTT 有 QoS 0/1/2、遗嘱、保留消息；HTTP 只靠 TCP，业务层要自己做重试。</li>
</ul>
<p><b>怎么选：</b>设备遥测、远程控制、多端订阅 → MQTT；一次性查询、文件上传下载、REST 接口 → HTTP；浏览器实时 → WebSocket。不要为了“轻量”把所有场景都套 MQTT，大文件用 HTTP 反而更简单。</p>`,
        principle: `<p>MQTT 的“轻”来自三件事：二进制固定头很小、长连接避免反复握手、发布/订阅让 Broker 做扇出。它把“谁发给谁”从应用代码里抽出来，变成 Topic 路由，所以新增一个订阅者不需要改发布者。</p>
<p>HTTP 的“重”也不是缺点：它是无状态的请求响应，容易做缓存、负载均衡、鉴权、CDN。选型要看通信模式，而不是只看包头大小。</p>`,
        fig: {
          type: "table",
          title: "MQTT 与 HTTP 的对比",
          tag: "mqtt-http",
          head: ["维度", "MQTT", "HTTP"],
          rows: [
            ["模型", "发布/订阅，经 Broker", "请求/响应，点对点"],
            ["连接", "长连接（TCP）", "短连接或 Keep-Alive 复用"],
            ["方向", "双向，服务端可主动下发", "客户端主动请求"],
            ["头部开销", "最小 2 字节", "几百字节起"],
            ["路由", "Topic + 通配符", "URL + 方法"],
            ["典型场景", "遥测、控制、多端订阅", "REST、文件、一次性查询"]
          ]
        },
        code: {
          lang: "c",
          title: "mqtt_pubsub.c",
          src: `/* 设备侧：订阅命令主题，发布遥测主题（伪代码） */
#define TOPIC_CMD   "dev/123/cmd"
#define TOPIC_DATA  "dev/123/data"

static void on_mqtt_message(const char *topic, const uint8_t *payload, int len)
{
    if (strcmp(topic, TOPIC_CMD) != 0) return;

    /* 命令帧由应用层协议解析，不要在这里做耗时操作 */
    app_post_command(payload, len);
}

void app_mqtt_start(void)
{
    mqtt_connect("broker.example.com", 8883, /*tls*/1);

    /* QoS 1：至少一次，命令不能丢；重复由应用层按 seq 去重 */
    mqtt_subscribe(TOPIC_CMD, 1);

    /* 遥测：QoS 0 或 1，按业务容忍度选 */
    mqtt_publish(TOPIC_DATA, "{\\"temp\\":25.3}", 14, 1, 0);
}

/* 服务端订阅 dev/+/data 就能收到所有设备的数据 */
/* 服务端发布 dev/123/cmd 就能控制指定设备 */`
        },
        codeNote: "Topic 设计要预留层级：产品/设备/方向/业务。不要把设备 ID 拼在 payload 里，否则 Broker 无法按主题做权限和路由。",
        apply: `<p>做过一款共享设备，早期用 HTTP 轮询拿控制指令，2 秒一次。用户点“开锁”平均要等 1 秒多，流量也大。改成 MQTT 长连接后，指令延迟降到几百毫秒，还能做服务端主动推送和批量订阅。</p>
<p>但也不是所有数据都走 MQTT：设备日志文件、升级包这种大块数据，我们仍然用 HTTPS 上传，MQTT 只发一个“文件就绪”的通知。把两种协议用在各自擅长的场景，系统反而更简单。</p>`,
        pitfalls: [
          "<b>把 MQTT 当成“更快的 HTTP”。</b>它的优势是长连接和发布/订阅，不是绝对速度快。",
          "<b>Topic 设计没有层级。</b>所有设备发同一个 Topic，Broker 无法做权限和过滤。",
          "<b>服务端主动下发依赖轮询。</b>用了 MQTT 却还在设备端定时发“有没有指令”，等于没用上发布/订阅。",
          "<b>大文件走 MQTT。</b>分片、重传、内存开销都很难处理，不如 HTTPS。"
        ],
        follow: [
          ["MQTT 的 Topic 通配符怎么用？", "<code>+</code> 匹配一层，<code>#</code> 匹配剩余所有层，且 <code>#</code> 只能放在末尾。例如 <code>home/+/temp</code>、<code>home/room1/#</code>。发布时不能用通配符，只有订阅能用。"],
          ["MQTT 为什么基于 TCP，不用 UDP？", "MQTT 需要可靠、有序的字节流来承载 QoS 握手、会话状态和主题订阅；UDP 不保证到达和顺序，要在应用层重造 TCP 的机制。对极低功耗/极短报文，才有 MQTT-SN over UDP 这类变种。"],
          ["一个设备需要保持几条 MQTT 连接？", "通常一条。所有发布和订阅复用同一条 TCP 连接，Broker 按 Topic 路由。多条连接会浪费内存、增加重连和会话管理复杂度。"]
        ]
      },

      {
        id: "M-40",
        chapter: "wireless",
        topic: "net",
        title: "MQTT 的心跳（Keep Alive）是什么？多久发一次合适？",
        diff: "中级",
        freq: "高频",
        type: "协议细节题",
        point: "PINGREQ/PINGRESP、1.5 倍超时、NAT 超时与功耗的权衡，以及它和应用层心跳的区别。",
        q: `<p>面试官：MQTT 连接上的“心跳包”是什么？你项目里多久发一次？它和 TCP 的 Keep-Alive 有什么区别？</p>`,
        exam: `<p>考察实际联网经验。能说出“1.5 倍 Keep Alive 超时”“要小于 NAT 老化时间”“心跳不等于业务心跳”，就说明调过线上连接。</p>`,
        core: `<p>Keep Alive 是 CONNECT 里带的秒数：客户端在该时间内没发过任何控制报文就必须发 <code>PINGREQ</code>，Broker 回 <code>PINGRESP</code>；Broker 在 1.5 倍 Keep Alive 内没收到任何报文就认为连接已死，关闭连接并发布遗嘱。</p><p>它解决 TCP 半开连接：拔网线、掉电、NAT 表项老化时双方收不到 FIN/RST，连接“假在线”，应用层 PING 能在一个可控时间内发现。</p><p>常见 30~120 秒：局域网/Wi-Fi 可用 60 秒，蜂窝可放宽到 120~300 秒省电省流量；必须小于链路 NAT/防火墙的老化时间（很多家用路由器 2~5 分钟）。电池设备要权衡心跳耗电和离线发现速度。TCP Keep-Alive 是内核级的、默认常是 2 小时且常被关，不能指望它维持 MQTT 在线；版本、电量这类业务状态应另走应用层上报。</p>`,
        answer: `<p><b>MQTT 的 Keep Alive 是客户端在 CONNECT 报文里带的一个时间间隔（秒）。</b>规则是：如果客户端在 <code>Keep Alive</code> 时间内没有向 Broker 发送任何其它控制报文（PUBLISH、SUBSCRIBE 等），就必须发一个 <code>PINGREQ</code>；Broker 回 <code>PINGRESP</code>。如果 Broker 在 <b>1.5 倍 Keep Alive</b> 内没有收到客户端的任何报文，就认为连接已死，关闭连接并发布遗嘱消息。</p>
<p><b>它解决什么问题：</b>TCP 连接在物理断开（拔网线、设备掉电、NAT 表项老化）时，双方可能都收不到 FIN/RST，连接会“假在线”。Keep Alive 用应用层的 PING 探测，能在一个可控的时间内发现半开连接。</p>
<p><b>多久发一次：</b></p>
<ul>
<li>常见 30~120 秒。局域网/稳定 Wi-Fi 可以用 60 秒；蜂窝网络（4G/NB-IoT）可以放宽到 120~300 秒，省电和省流量。</li>
<li>必须小于链路上 NAT/防火墙的老化时间。很多家用路由器 NAT 的 UDP/TCP 映射是 2~5 分钟，如果 Keep Alive 设成 300 秒，可能在两次心跳之间就被 NAT 删了表项，表现为“连接看着还在，实际发不出去”。保守做法是 30~60 秒。</li>
<li>电池设备要权衡：心跳越频繁越耗电；但太长会导致离线发现慢、指令下发失败后重连慢。</li>
</ul>
<p><b>和 TCP Keep-Alive 的区别：</b>TCP Keep-Alive 是内核级的探活，默认通常是 2 小时，且很多嵌入式 TCP 栈默认关闭；MQTT Keep Alive 是应用层协议的一部分，Broker 和客户端都参与，能触发遗嘱和会话清理。不能指望 TCP Keep-Alive 来维持 MQTT 在线。</p>
<p><b>和业务心跳的区别：</b>MQTT Keep Alive 只维持连接，不携带业务状态。如果业务需要“设备活着、版本、信号强度、电量”这些信息，应该另外定义应用层心跳/状态上报，不要把它和 PINGREQ 混在一起。</p>`,
        principle: `<p>Keep Alive 的 1.5 倍是协议给的宽限：允许一个心跳周期内网络抖动、丢一个 PINGREQ，Broker 再等半个周期才判定断开。所以实际离线发现时间是 <code>1.5 × Keep Alive</code>，再加上客户端的重连退避。</p>
<p>它只能发现“连接不可用”，不能发现“Broker 进程卡死但 TCP 还通”。后者需要业务层请求/响应超时来兜底。</p>`,
        fig: {
          type: "table",
          title: "Keep Alive 取值参考",
          tag: "mqtt-keepalive",
          head: ["场景", "建议值", "原因"],
          rows: [
            ["局域网 / 稳定 Wi-Fi", "30~60s", "离线发现快，功耗可接受"],
            ["家用 Wi-Fi + 云端", "60s", "小于常见 NAT 老化时间"],
            ["4G / NB-IoT 电池设备", "120~300s", "省电、省流量，容忍较长离线发现"],
            ["实时控制类", "15~30s", "指令延迟敏感，需要快速发现断线"]
          ]
        },
        code: {
          lang: "c",
          title: "mqtt_keepalive.c",
          src: `/* ESP-IDF 风格：Keep Alive 60s，同时注册遗嘱消息 */
static void mqtt_start(void)
{
    esp_mqtt_client_config_t cfg = { 0 };

    cfg.broker.address.uri = "mqtts://broker.example.com:8883";
    cfg.credentials.client_id = "dev-123";
    cfg.credentials.username  = "dev-123";
    cfg.credentials.authentication.password = "******";

    cfg.session.keepalive = 60;          /* 秒；0 表示关闭 */
    cfg.session.last_will.topic = "dev/123/status";
    cfg.session.last_will.msg   = "offline";
    cfg.session.last_will.msg_len = 7;
    cfg.session.last_will.qos   = 1;
    cfg.session.last_will.retain = 1;

    esp_mqtt_client_handle_t c = esp_mqtt_client_init(&cfg);
    esp_mqtt_client_start(c);
}

/* 业务层心跳：和 MQTT Keep Alive 分开，携带设备状态 */
void app_heartbeat_task(void *arg)
{
    for (;;) {
        char buf[128];
        int n = snprintf(buf, sizeof(buf),
                         "{\\"ver\\":\\"%s\\",\\"rssi\\":%d,\\"bat\\":%d}",
                         FW_VERSION, wifi_get_rssi(), battery_percent());
        mqtt_publish("dev/123/heartbeat", buf, n, 0, 0);
        vTaskDelay(pdMS_TO_TICKS(5 * 60 * 1000));   /* 5 分钟一次业务心跳 */
    }
}`
        },
        codeNote: "Keep Alive 设为 0 会关闭心跳，只适合链路非常可靠且能接受长时间假在线的场景。量产设备不建议关闭。",
        apply: `<p>做过一款 4G 设备，最初 Keep Alive 设 300 秒，现场经常出现“平台显示在线，但下发指令没反应”。抓包发现运营商 NAT 大约 2 分钟就回收了映射，设备还以为连接在。改成 60 秒后问题消失，流量增加很少。</p>
<p>另一个坑是重连风暴：断网恢复后，几百台设备同时重连。后来加了指数退避 + 0~500ms 随机抖动，Broker 才扛住。</p>`,
        pitfalls: [
          "<b>Keep Alive 设得比 NAT 老化时间还长。</b>连接假在线，指令发不出去。",
          "<b>把所有保活都交给 TCP Keep-Alive。</b>默认 2 小时，嵌入式栈还可能没开。",
          "<b>用 MQTT PING 代替业务心跳。</b>PING 只说明连接通，不携带业务状态。",
          "<b>断线后立即无限重连。</b>没有退避和抖动，容易打垮 Broker。"
        ],
        follow: [
          ["为什么 Broker 要等 1.5 倍 Keep Alive？", "给网络抖动和单个 PING 丢失留余量，避免误判断线。代价是最长离线发现时间变成 1.5 倍。"],
          ["Keep Alive 设 0 会怎样？", "协议上关闭心跳，Broker 不会因为超时断开。连接是否存活完全依赖 TCP。除非链路非常可靠，否则不推荐。"],
          ["MQTT 5 的 Keep Alive 有什么变化？", "基本机制不变，仍由客户端在 CONNECT 里协商，Broker 用 1.5 倍超时；MQTT 5 增加了 Server Keep Alive，Broker 可以覆盖客户端建议值。"]
        ]
      },

      {
        id: "M-41",
        chapter: "wireless",
        topic: "wifi",
        title: "Wi-Fi 在空口上发送的数据帧长什么样？各字段分别有什么用？",
        diff: "高级",
        freq: "中频",
        type: "协议分析题",
        point: "802.11 MAC 帧的 Frame Control、三个地址、序列号、Frame Body 与 FCS，以及数据帧如何承载 IP。",
        q: `<p>面试官：Wi-Fi 发出去的数据包，在空口上的格式是什么样的？帧头里都有哪些字段？设备连上路由器后，数据是怎么装进 802.11 帧里的？</p>`,
        exam: `<p>考察是否理解 Wi-Fi 不是“无线网线”那么简单。能画出 802.11 MAC 头、说清三个地址的含义，就很加分。</p>`,
        core: `<p>802.11 MAC 帧：Frame Control 2B（协议版本、类型管理/控制/数据、子类型、ToDS/FromDS、重传、省电等）、Duration/ID 2B（虚拟载波监听占用时长）、Address1/2/3 各 6B、Sequence Control 2B、可选 QoS Control 2B、可选 HT Control 4B、Frame Body（管理帧放 IE，数据帧放 LLC/SNAP + 上层 IP 包）、FCS 4B（CRC-32，校验失败直接丢）。</p><p>基础设施模式下三个地址：STA→AP（ToDS=1）时 Address1 是 AP 的 BSSID（接收者）、Address2 是 STA（发送者）、Address3 是最终目的；AP→STA（FromDS=1）时 Address1 是目的 STA、Address2 是 AP 的 BSSID、Address3 是源地址。WDS/4 地址模式才用 Address4，家用网络用不到。</p><p>数据封装：TCP/UDP 包加 IP 头后放进 Frame Body，前面 8 字节 LLC/SNAP 标识 IPv4/IPv6；AP 在无线帧和以太网帧之间转换。管理帧（Beacon、Probe、Auth、Assoc）负责发现接入，控制帧（RTS/CTS/ACK/Block Ack）负责信道协调。</p>`,
        answer: `<p>Wi-Fi 的链路层帧叫 <b>802.11 MAC 帧</b>，结构如下（括号内为字节数）：</p>
<ul>
<li><b>Frame Control（2）</b>：协议版本（2 位）、类型（2 位：管理/控制/数据）、子类型（4 位，Beacon、Probe、Data 等）、ToDS/FromDS、More Fragments、Retry、Power Management、More Data、Protected Frame、Order。</li>
<li><b>Duration/ID（2）</b>：用于虚拟载波监听，告诉其它设备“这段信道还要占用多久”。</li>
<li><b>Address 1 / 2 / 3（各 6）</b>：接收地址、发送地址、以及 BSSID/目的地址；WDS 等场景还会多一个 Address 4。</li>
<li><b>Sequence Control（2）</b>：分片号和序列号，用于重组和丢弃重复帧。</li>
<li><b>QoS Control（2，可选）</b>：802.11e/WMM 的优先级、队列等信息。</li>
<li><b>HT Control（4，可选）</b>：802.11n/ac 的链路自适应控制。</li>
<li><b>Frame Body（可变）</b>：管理帧放固定字段和 IE（SSID、支持的速率、RSN、HT/VHT 能力等）；数据帧放 LLC/SNAP 头 + 上层 IP 包。</li>
<li><b>FCS（4）</b>：CRC-32，覆盖整个帧，接收方校验失败直接丢弃。</li>
</ul>
<p><b>三个地址怎么理解（基础设施模式）：</b></p>
<ul>
<li>STA → AP（ToDS=1）：Address1 = AP 的 BSSID（接收者），Address2 = STA 自己（发送者），Address3 = 最终目的地址（可能是另一台主机）。</li>
<li>AP → STA（FromDS=1）：Address1 = 目的 STA，Address2 = AP 的 BSSID（发送者），Address3 = 源地址。</li>
<li>WDS/4 地址模式才会用到 Address4，普通家用网络用不到。</li>
</ul>
<p><b>数据是怎么装进去的：</b>你的 TCP/UDP 包先加 IP 头，再被封装进 802.11 数据帧的 Frame Body（前面有 8 字节 LLC/SNAP 头，用来标识“后面是 IPv4/IPv6”）。AP 在无线侧和有线侧之间做转换：无线帧 ↔ 以太网帧，所以上层看到的就是普通以太网包。</p>
<p><b>帧的类型：</b>管理帧（Beacon、Probe Request/Response、Authentication、Association）负责发现和接入；控制帧（RTS/CTS/ACK/Block Ack）负责信道协调；数据帧才承载业务数据。抓包时看到的 Beacon 就是 AP 每隔约 100ms 广播一次的管理帧。</p>`,
        principle: `<p>Wi-Fi 的 MAC 层不是“把以太网帧原样发出去”，而是有自己的头、地址、序列号和重传机制。AP 相当于一个二层桥，把无线帧转成以太网帧，所以设备连上 Wi-Fi 后，上层仍然可以只用 IP/MAC 编程。</p>
<p>FCS 只保证“这一帧在空口上没坏”，坏了由 MAC 层重传（Retry 位置 1）；它不保证端到端可靠，TCP 仍然要做自己的校验和重传。</p>`,
        fig: {
          type: "table",
          title: "802.11 MAC 帧的主要字段",
          tag: "80211-frame",
          head: ["字段", "长度", "作用"],
          rows: [
            ["Frame Control", "2B", "类型、子类型、ToDS/FromDS、Retry 等"],
            ["Duration/ID", "2B", "虚拟载波监听，预约信道时间"],
            ["Address 1/2/3", "各 6B", "接收者、发送者、BSSID/目的/源"],
            ["Sequence Control", "2B", "分片号 + 序列号，去重与重组"],
            ["QoS Control", "2B（可选）", "WMM 优先级与队列"],
            ["Frame Body", "可变", "管理 IE 或 LLC/SNAP + IP 数据"],
            ["FCS", "4B", "CRC-32 校验"]
          ]
        },
        code: {
          lang: "c",
          title: "wifi_frame_notes.c",
          src: `/* 用 Wireshark 观察 802.11 帧时常用的显示过滤（不是 C 代码） */
/*
 * 只看管理帧：      wlan.fc.type == 0
 * 只看数据帧：      wlan.fc.type == 2
 * 只看某个 AP：     wlan.bssid == aa:bb:cc:dd:ee:ff
 * 看 ToDS/FromDS：  wlan.fc.tods == 1 && wlan.fc.fromds == 0
 * 看重传帧：        wlan.fc.retry == 1
 * 看 FCS 错误：     wlan.fcs_bad == 1
 *
 * 普通网卡通常会把 802.11 头转换成以太网头，
 * 要抓原始 802.11 帧需要支持 monitor 模式的网卡。
 */

/* 设备侧只关心：连上 AP 后就是普通 socket 编程 */
int tcp_connect_example(void)
{
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port   = htons(1883),
    };
    inet_pton(AF_INET, "192.168.1.100", &addr.sin_addr);

    return connect(fd, (struct sockaddr *)&addr, sizeof(addr));
}`
        },
        codeNote: "应用层通常看不到 802.11 头，网卡驱动/协议栈已经把它剥离。调 Wi-Fi 连接问题才需要抓空口帧，普通 MQTT/HTTP 问题看 IP/TCP 层就够了。",
        apply: `<p>排查“设备连上 Wi-Fi 但发不出数据”时，用支持 monitor 模式的网卡抓空口，看 Association 是否成功、AP 有没有回 ACK、Retry 位是不是很高。有一次发现大量重传，最后定位到天线附近有金属遮挡，信号强度够但误码率高。</p>
<p>还有一次是客户把设备接到企业级 AP 的 5GHz 频段，设备只支持 2.4GHz，扫描列表里根本看不到 SSID。这种问题看 802.11 的 Beacon/Probe 就一目了然，比在应用层猜要快。</p>`,
        pitfalls: [
          "<b>以为 Wi-Fi 帧就是以太网帧。</b>802.11 有自己的 MAC 头、三个地址和 FCS，AP 负责转换。",
          "<b>把 Address1 当成目的地址。</b>在 ToDS 模式下 Address1 是 AP 的 BSSID，目的地址在 Address3。",
          "<b>把 FCS 当端到端校验。</b>它只保证单跳空口没坏，TCP 仍要自己做校验。",
          "<b>抓包时没开 monitor 模式。</b>普通网卡抓不到原始 802.11 头，只能看到转换后的以太网帧。"
        ],
        follow: [
          ["为什么 802.11 帧需要三个地址？", "因为无线帧要经过 AP 转发：接收者、发送者、最终目的/源可能分别是三个不同的设备。三个地址让 AP 能在不改动上层 IP 包的情况下完成二层转发。"],
          ["Beacon 帧是干什么的？", "AP 周期性广播的管理帧，携带 SSID、支持的速率、加密方式、信道等信息，让周围的 STA 能发现它。间隔通常 100ms，也是 Wi-Fi 功耗和发现速度的权衡点。"],
          ["FCS 校验失败会怎样？", "接收方直接丢弃该帧，不会向上层报告。如果开启了重传，发送方没收到 ACK 会重发；重传次数超限才向上层表现为丢包。"]
        ]
      },

      {
        id: "M-42",
        chapter: "wireless",
        topic: "wifi",
        title: "Wi-Fi 的信道 1/6/11 是怎么回事？2.4GHz 和 5GHz 怎么选？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "2.4GHz 信道重叠与 1/6/11 非重叠组合、5GHz 的频谱优势，以及频段/版本/穿墙/干扰的取舍。",
        q: `<p>面试官：Wi-Fi 为什么总说信道 1、6、11？2.4GHz 和 5GHz 有什么区别？你的产品用哪个频段，为什么？</p>`,
        exam: `<p>考察无线基础知识。能说清“20MHz 带宽、5MHz 间隔导致重叠”“5GHz 信道多但穿墙差”，并联系到产品选型，就很好。</p>`,
        core: `<p>2.4GHz 约 2400~2483.5MHz，13 个信道名义 20MHz 但间隔只有 5MHz，相邻严重重叠；真正互不干扰的是 1/6/11（2412/2437/2462MHz，间隔 25MHz），也有 2/7/12、3/8/13 的组合。</p><p>5GHz 频谱宽、20MHz 信道可完全不重叠，信道多干扰少，支持 80/160MHz 绑定速率更高，但穿墙绕射差、覆盖半径小，部分信道是 DFS 雷达频段，检测到雷达要切信道可能短暂断网。</p><p>选择：IoT/低功耗设备绝大多数 Wi-Fi SoC 只支持 2.4GHz，成本低、穿墙好；视频和高吞吐优先 5GHz；BLE 共存时能上 5GHz 就上；2.4GHz 不要开 40MHz 绑定，总共才 80MHz，占掉大半频段干扰反而更重。</p>`,
        answer: `<p><b>2.4GHz 频段：</b>频率范围约 2400~2483.5MHz，通常划分 13 个信道（部分地区 14 个），每个信道<b>名义带宽 20MHz</b>，但信道间隔只有 <b>5MHz</b>，所以相邻信道严重重叠。真正互不干扰的组合是 <b>1、6、11</b>（中心频率 2412、2437、2462MHz），三者间隔 25MHz，刚好容纳 20MHz 带宽。也有 2/7/12、3/8/13 的组合，但在国内常用 1/6/11。</p>
<p><b>5GHz 频段：</b>频谱宽得多，20MHz 信道可以做到互不重叠，常见 36~48、52~64、100~144、149~165。信道多、干扰少，支持 80MHz/160MHz 绑定，速率更高。代价是频率高、波长短，穿墙和绕射能力差，覆盖半径小；部分信道是 DFS（雷达频段），AP 检测到雷达信号必须切换信道，可能造成短暂断网。</p>
<p><b>怎么选：</b></p>
<ul>
<li><b>IoT/低功耗设备</b>：绝大多数 Wi-Fi SoC（ESP32、ESP8266 等）只支持 2.4GHz，成本低、穿墙好、覆盖远，是默认选择。</li>
<li><b>视频/高吞吐</b>：优先 5GHz，信道多、干扰少、速率高；双频 AP 可以开 band steering 引导设备上 5G。</li>
<li><b>BLE 共存</b>：2.4GHz Wi-Fi 的 1/6/11 与 BLE 广播信道有重叠，能上 5GHz 就上 5GHz；不能的话尽量选空闲信道并开启 BLE AFH。</li>
<li><b>2.4GHz 的 40MHz 绑定</b>：不建议。2.4GHz 总共才 80MHz 左右，40MHz 会占掉大半频段，干扰和重传反而更严重。</li>
</ul>
<p><b>Wi-Fi 版本和频段：</b>802.11b/g/n/ax 支持 2.4GHz；802.11a/n/ac/ax 支持 5GHz；Wi-Fi 6E 扩展到 6GHz。不是“版本越高频段越高”，n/ac/ax 都可以双频，具体看芯片和认证。</p>`,
        principle: `<p>信道重叠的本质是频域带宽大于信道间隔。20MHz 的信号能量不会在边界一刀切，而是有旁瓣泄漏，所以相邻信道会互相干扰。1/6/11 的选择就是让三个 20MHz 信道尽量不重叠。</p>
<p>5GHz 的优势来自“频谱资源多”，不是“物理定律更好”。它的路径损耗和穿透损耗都更大，所以覆盖和穿墙是硬伤；2.4GHz 的优势是波长长、绕射好，但频谱拥挤、干扰源多（微波炉、蓝牙、Zigbee、邻居 Wi-Fi）。</p>`,
        fig: {
          type: "table",
          title: "2.4GHz 与 5GHz 对比",
          tag: "wifi-band",
          head: ["维度", "2.4GHz", "5GHz"],
          rows: [
            ["可用信道", "1~13，非重叠仅 1/6/11", "信道多，20MHz 可完全不重叠"],
            ["覆盖/穿墙", "好", "较差"],
            ["干扰", "多（蓝牙、微波炉、邻居）", "少，但有 DFS 雷达"],
            ["最大速率", "较低", "较高，支持 80/160MHz"],
            ["IoT 适用性", "最常用，芯片便宜", "较少，成本/功耗更高"]
          ]
        },
        code: {
          lang: "c",
          title: "wifi_channel.c",
          src: `/* ESP-IDF：显式设置 AP 信道，避免自动跳到拥挤信道 */
void ap_start_on_channel(uint8_t ch)
{
    wifi_config_t cfg = { 0 };

    /* 只允许 1/6/11，避免重叠 */
    if (ch != 1 && ch != 6 && ch != 11) {
        ch = 6;
    }

    cfg.ap.channel        = ch;
    cfg.ap.max_connection = 4;
    cfg.ap.authmode       = WIFI_AUTH_WPA2_PSK;
    strncpy((char *)cfg.ap.ssid, "EIK-DEVICE", sizeof(cfg.ap.ssid));
    strncpy((char *)cfg.ap.password, "12345678", sizeof(cfg.ap.password));

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &cfg));
    ESP_ERROR_CHECK(esp_wifi_start());
}

/* STA 侧扫描时按 RSSI 排序，优先选 1/6/11 中较空闲的 */
int pick_best_channel(const wifi_ap_record_t *list, int n)
{
    int best = 6, best_rssi = -127;

    for (int i = 0; i < n; i++) {
        int ch = list[i].primary;
        if (ch != 1 && ch != 6 && ch != 11) continue;

        if (list[i].rssi > best_rssi) {
            best_rssi = list[i].rssi;
            best = ch;
        }
    }
    return best;
}`
        },
        codeNote: "实际选信道不能只看 RSSI，还要看该信道的 AP 数量、信道占用率（CCA busy）和干扰。RSSI 强不代表信道空闲。",
        apply: `<p>做过一款 Wi-Fi 插座，最初 AP 配网时信道设成自动。到了用户家里，设备热点经常和路由器撞在同一信道，配网页面加载很慢。后来固定用 6 信道，并在配网前扫描一次，选 1/6/11 中 AP 最少的一个，成功率明显提升。</p>
<p>另一个项目用 5GHz 做视频传输，实验室里很流畅，到了客户现场穿两堵墙就断。最后改成 2.4GHz 做控制、5GHz 做视频的双频方案，控制链路始终在线。</p>`,
        pitfalls: [
          "<b>以为 2.4GHz 的 13 个信道都能同时用。</b>相邻信道重叠，实际只能取 1/6/11。",
          "<b>2.4GHz 开 40MHz。</b>占用太宽，干扰和重传增加，吞吐不一定提升。",
          "<b>只看 RSSI 选信道。</b>信号强但拥挤的信道，实际吞吐可能更差。",
          "<b>忽略 5GHz 的 DFS。</b>雷达信道被检测到后 AP 会强制换信道，连接会短暂中断。"
        ],
        follow: [
          ["为什么是 1/6/11，而不是 1/5/9？", "20MHz 带宽需要约 25MHz 的间隔才能基本不重叠，1/6/11 的中心频率相差 25MHz，是最经典的组合。1/5/9 间隔只有 20MHz，边缘仍会重叠。"],
          ["5GHz 为什么穿墙差？", "频率越高，波长越短，遇到墙体、金属、水时的衰减越大；同时 5GHz 的天线尺寸小、发射功率受法规限制。覆盖更多靠增加 AP 密度，而不是加大功率。"],
          ["Wi-Fi 6 对 IoT 有什么意义？", "OFDMA、TWT（目标唤醒时间）能降低多设备场景的争用和功耗，对高密度 IoT 部署有帮助；但成本、功耗和芯片支持仍是选型因素。"]
        ]
      },

      {
        id: "M-43",
        chapter: "wireless",
        topic: "wifi",
        title: "Wi-Fi 和 BLE 都用 2.4GHz，同时工作时怎么避免互相干扰？",
        diff: "高级",
        freq: "中频",
        type: "方案设计题",
        point: "单射频时分共存、共存仲裁、BLE AFH、Wi-Fi 重传，以及天线隔离和参数取舍。",
        q: `<p>面试官：用 ESP32 同时跑 Wi-Fi 和 BLE，两者都在 2.4GHz，会不会互相干扰？你是怎么优化共存问题的？</p>`,
        exam: `<p>考察无线共存的实际经验。能说清“单射频时分复用、共存仲裁、AFH、天线隔离”，而不是笼统说“错开频率”，就到位了。</p>`,
        core: `<p>会干扰且无法完全避免：两者都在 2.4GHz ISM，BLE 的 40 个 2MHz 信道和 Wi-Fi 的 20MHz 信道在频谱上重叠。单射频 SoC 只有一套 2.4G 收发链路，只能分时共用；双射频/Combo 芯片需要共存仲裁和滤波。</p><p>芯片层做的事：TDM 共存仲裁按优先级分时间片（Beacon、ACK 通常优先，BLE 连接事件会被推迟）；BLE AFH 把被 Wi-Fi 占用或干扰重的信道标为坏信道，跳频时避开；Wi-Fi MAC 有 ACK 重传；Combo 芯片用 request/grant 硬件信号协调，软件可配 Wi-Fi 优先、BLE 优先或平衡。</p><p>工程优化：Wi-Fi 尽量上 5GHz；2.4G 选 1/6/11 中较空闲的信道（BLE 广播固定在 37/38/39 改不了）；降低 BLE 占空比（加大连接间隔、用 slave latency、降低广播频率、批量发送）；降低 Wi-Fi 空口占用；天线拉开距离、正交极化、隔离度做到 15dB 以上。注意“调 FSK 参数优化共存”不是通用方案，FSK/GFSK 是 BLE 调制方式，改它解决不了同频段时分争用。</p>`,
        answer: `<p><b>会干扰，而且无法完全避免。</b>Wi-Fi 和 BLE 都在 2.4GHz ISM 频段，BLE 的 40 个信道（2MHz 间隔）和 Wi-Fi 的 20MHz 信道在频谱上重叠。单射频 SoC（如 ESP32）只有一套 2.4GHz 收发链路，Wi-Fi 和 BLE 只能<b>分时共用</b>；双射频/Combo 芯片则需要共存仲裁和滤波。</p>
<p><b>芯片/协议层做了什么：</b></p>
<ul>
<li><b>时分共存（TDM）</b>：共存仲裁器根据优先级把射频时间片分给 Wi-Fi 或 BLE。Wi-Fi 的 Beacon、ACK 通常优先，BLE 的连接事件会被推迟。</li>
<li><b>BLE AFH（自适应跳频）</b>：连接状态下，BLE 会维护信道图，把被 Wi-Fi 占用或干扰严重的信道标记为坏信道，跳频时避开。</li>
<li><b>Wi-Fi 重传</b>：Wi-Fi MAC 层有 ACK/重传，冲突后会自动重发，但会增加延迟和空口占用。</li>
<li><b>共存接口</b>：Combo 芯片用硬件信号（request/grant、priority）协调，软件层可以配置偏好（Wi-Fi 优先 / BLE 优先 / 平衡）。</li>
</ul>
<p><b>工程上的优化手段：</b></p>
<ol>
<li><b>Wi-Fi 尽量上 5GHz</b>：如果设备支持双频，Wi-Fi 走 5GHz 就从根本上避开了 BLE。ESP32 只支持 2.4GHz，这条用不上，但选型时可以优先双频方案。</li>
<li><b>Wi-Fi 选 1/6/11 中较空闲的信道</b>：BLE 广播固定在 37/38/39（2402/2426/2480MHz），无法改；但 Wi-Fi 选一个相对干净的 20MHz 信道，可以减少重叠。</li>
<li><b>降低 BLE 占空比</b>：增大连接间隔（如 30ms → 100ms）、使用 slave latency、降低广播频率、批量发送数据，减少射频争用。</li>
<li><b>降低 Wi-Fi 空口占用</b>：关闭不必要的扫描、限制大流量上传、开启 Wi-Fi 省电模式、避免在 BLE 音频/OTA 时跑大流量。</li>
<li><b>天线隔离</b>：BLE 和 Wi-Fi 天线尽量拉开距离（>λ/4），正交极化，必要时加屏蔽/滤波；天线隔离度做到 15dB 以上，干扰会明显下降。</li>
<li><b>软件优先级</b>：对时延敏感的 BLE 事件（音频、HID）给更高共存优先级；对吞吐敏感的 Wi-Fi 传输避开 BLE 连接事件。</li>
</ol>
<p><b>纠正一个常见说法：</b>“调 FSK 参数优化共存”不是通用方案。FSK/GFSK 是 BLE 的调制方式，改调制参数解决不了同频段时分争用；真正起作用的是共存仲裁、AFH、占空比和天线隔离。</p>`,
        principle: `<p>共存问题的本质是“共享介质”。Wi-Fi 和 BLE 的物理层不兼容（带宽、调制、帧结构都不同），无法像 Wi-Fi 与 Wi-Fi 那样用 CSMA/CA 协商，只能靠芯片内部的时分仲裁和频率避让。</p>
<p>单射频方案的天花板是“射频时间只有一份”：Wi-Fi 吞吐和 BLE 实时性此消彼长。要同时保证两者，硬件上必须双射频/双天线，软件上必须做优先级和流量整形。</p>`,
        fig: {
          type: "table",
          title: "共存优化手段与代价",
          tag: "coex",
          head: ["手段", "效果", "代价"],
          rows: [
            ["Wi-Fi 走 5GHz", "根本避开 2.4G 争用", "芯片成本、覆盖变差"],
            ["Wi-Fi 选空闲信道", "减少重叠", "需要现场扫描"],
            ["增大 BLE 连接间隔", "BLE 占空比下降", "延迟变大"],
            ["降低 Wi-Fi 流量", "减少空口占用", "业务吞吐受限"],
            ["天线隔离/屏蔽", "干扰显著下降", "结构空间、成本"],
            ["共存优先级配置", "关键业务更稳", "另一方性能下降"]
          ]
        },
        code: {
          lang: "c",
          title: "esp32_coex.c",
          src: `/* ESP-IDF：配置 Wi-Fi/BLE 共存偏好（具体 API 随版本略有差异） */
#include "esp_coexist.h"

void coex_init(void)
{
    /* 平衡模式：Wi-Fi 和 BLE 各让一步 */
    esp_coex_preference_set(ESP_COEX_PREFER_BALANCE);

    /* 或者：BLE 优先，适合音频/HID；Wi-Fi 吞吐会下降 */
    /* esp_coex_preference_set(ESP_COEX_PREFER_BT); */

    /* 或者：Wi-Fi 优先，适合大流量上传；BLE 延迟会变大 */
    /* esp_coex_preference_set(ESP_COEX_PREFER_WIFI); */
}

/* 降低 BLE 占空比：连接间隔 100ms，slave latency 2 */
void ble_update_params(uint16_t conn_handle)
{
    esp_ble_conn_update_params_t p = { 0 };

    p.min_int  = 0x50;      /* 80 × 1.25ms = 100ms */
    p.max_int  = 0x50;
    p.latency  = 2;         /* 允许从机跳过 2 个连接事件 */
    p.timeout  = 500;       /* 5s，必须大于 (1+latency)*2*interval */

    esp_ble_gap_update_conn_params(&p);
}

/* 降低广播频率：从 100ms 调到 500ms，减少射频争用 */
void ble_slow_advertising(void)
{
    esp_ble_adv_params_t adv = { 0 };
    adv.adv_int_min = 0x320;    /* 800 × 0.625ms = 500ms */
    adv.adv_int_max = 0x320;
    adv.adv_type    = ADV_TYPE_IND;
    esp_ble_gap_start_advertising(&adv);
}`
        },
        codeNote: "共存偏好没有“全都要”的选项：BLE 优先会让 Wi-Fi 吞吐下降，Wi-Fi 优先会让 BLE 延迟变大。要按产品的关键指标选，并用实际业务压测。",
        apply: `<p>做过一款带 BLE 配网和 Wi-Fi 上传的设备，两者同时工作时 BLE 经常断。抓日志发现 Wi-Fi 在上传大文件，射频时间几乎全被占。后来做了三件事：BLE 连接间隔从 30ms 调到 100ms、Wi-Fi 上传改成分批限速、共存偏好设为平衡。BLE 不再断，上传时间只多了 10%。</p>
<p>还有一款产品用了外置天线，BLE 和 Wi-Fi 天线离得太近，隔离度不够，即使软件调优效果也有限。后来把两根天线正交摆放并拉开 2cm，问题才真正解决。</p>`,
        pitfalls: [
          "<b>以为“频率不同”就不会干扰。</b>2.4GHz 频段就这么宽，BLE 和 Wi-Fi 信道大量重叠。",
          "<b>只调软件不改天线。</b>隔离度不够时，软件怎么调都救不回来。",
          "<b>BLE 连接间隔设得太短。</b>射频争用加剧，Wi-Fi 吞吐和 BLE 稳定性一起下降。",
          "<b>把 FSK 调制参数当共存方案。</b>调制方式不解决同频段时分争用。"
        ],
        follow: [
          ["BLE 的 AFH 是怎么避开 Wi-Fi 的？", "连接状态下 BLE 会评估 37 个数据信道的质量，把误码率高/被占用的信道标记为 bad，跳频时只用 good 信道。它需要足够多的信道质量样本，所以刚连上时效果有限。"],
          ["ESP32 的 Wi-Fi 和 BLE 能真正同时收发吗？", "不能。单射频是分时复用，同一时刻只有 Wi-Fi 或 BLE 在收发。所谓“同时”是快速切换，宏观上都能工作，但实时性和吞吐会互相影响。"],
          ["怎么评估共存做得好不好？", "同时跑 Wi-Fi 吞吐测试（iperf）和 BLE 连接/通知压力测试，记录 BLE 断连率、延迟抖动、Wi-Fi 吞吐下降幅度，再调整参数。只看单项指标没有意义。"]
        ]
      },

      {
        id: "M-44",
        chapter: "wireless",
        topic: "net",
        title: "设备接入云平台（MQTT）要准备哪些参数？ProductKey、DeviceName、DeviceSecret 怎么用？",
        diff: "高级",
        freq: "高频",
        type: "工程实践题",
        point: "Broker 地址、三元组身份、ClientID/Username/Password 的生成、TLS、Topic 权限与设备创建/激活流程。",
        q: `<p>面试官：你项目里设备连的是什么服务器？怎么连的？云平台给的 ProductKey、DeviceName、DeviceSecret 分别是什么，怎么变成 MQTT 的连接参数？</p>`,
        exam: `<p>考察是否真的做过云平台接入，而不是只会本地 Broker。能说清三元组、动态签名、TLS 和 Topic 权限，就很好。</p>`,
        core: `<p>两层要分开：MQTT 只需要 Broker、端口、ClientID、Username、Password；三元组是用来生成这些参数的。ProductKey 是产品标识，DeviceName 是产品内设备唯一名，DeviceSecret 是每台设备唯一的密钥、出厂烧录不能泄露。</p><p>连接参数：Broker 如 <code>xxx.iot-as-mqtt.cn-shanghai.aliyuncs.com</code>，1883 明文、8883 TLS（量产必须 TLS）；ClientID 常由 DeviceName + securemode + signmethod + timestamp 组成且全局唯一，重复会把前一个踢下线；Username 常见 <code>DeviceName&amp;ProductKey</code>；Password 用 DeviceSecret 对规定字段做 HMAC-SHA256/MD5 签名。</p><p>流程：建产品（品类、直连/网关、JSON/透传）→ 加设备拿三元组 → 定义物模型和 Topic → 写入设备 → 对时、TLS、CONNECT、订阅、上报。DeviceSecret 放 OTP 或安全芯片，一机一密，校验服务器证书。</p>`,
        answer: `<p><b>先分清两层：</b>MQTT 连接本身只需要 Broker 地址、端口、ClientID、Username、Password；云平台的“三元组”是用来<b>生成</b>这些参数的，不是直接填进去的。</p>
<p><b>三元组：</b></p>
<ul>
<li><b>ProductKey</b>：产品唯一的标识，代表“哪一类设备/哪套物模型”。</li>
<li><b>DeviceName</b>：产品内设备唯一名，通常就是设备 ID。</li>
<li><b>DeviceSecret</b>：每台设备唯一的密钥，出厂烧录，绝不能泄露。云平台用它来校验设备身份。</li>
</ul>
<p><b>连接参数怎么来（以常见的阿里云/OneNET 风格为例）：</b></p>
<ul>
<li><b>Broker</b>：<code>xxx.iot-as-mqtt.cn-shanghai.aliyuncs.com</code>，端口 1883（明文）或 8883（TLS）。量产必须用 TLS。</li>
<li><b>ClientID</b>：通常由 DeviceName + 安全模式 + 签名算法 + 时间戳拼成，例如 <code>deviceName|securemode=2,signmethod=hmacsha256,timestamp=...</code>。必须全局唯一，同一 ClientID 重复上线会把前一个踢掉。</li>
<li><b>Username</b>：常见格式 <code>DeviceName&amp;ProductKey</code>。</li>
<li><b>Password</b>：用 DeviceSecret 对一串规范化参数做 HMAC-SHA256/MD5，得到签名。参数通常包括 ClientID、DeviceName、ProductKey、Timestamp，具体顺序和拼接方式看平台文档，不能自己猜。</li>
</ul>
<p><b>设备创建流程（云平台控制台）：</b></p>
<ol>
<li>创建产品：选品类、节点类型（直连/网关）、数据格式（JSON/透传）、认证方式（密钥/证书）。</li>
<li>在产品下添加设备：填 DeviceName，平台生成 DeviceSecret。</li>
<li>定义物模型/Topic：属性、事件、服务；确认设备有权发布/订阅哪些 Topic。</li>
<li>把三元组和 Broker 地址写入设备（产线工具/安全芯片/OTA 配置）。</li>
<li>设备上电：联网 → NTP 对时 → TLS 握手 → MQTT CONNECT（带签名）→ 订阅下行 Topic → 上报属性 → 平台显示在线。</li>
</ol>
<p><b>常见 Topic 形态：</b><code>/sys/{ProductKey}/{DeviceName}/thing/event/property/post</code> 上报属性；<code>/sys/{ProductKey}/{DeviceName}/thing/service/property/set</code> 接收下行。不同平台前缀不同，但都是“产品/设备/方向/业务”的层级。</p>
<p><b>安全要点：</b>DeviceSecret 不能硬编码在普通 Flash 里裸奔，尽量放安全芯片/OTP/加密分区；量产一机一密；支持密钥轮换；TLS 要校验服务器证书和域名；不要用同一个 ClientID 跑两台设备。</p>`,
        principle: `<p>云平台把“设备身份”抽象成三元组，再用动态签名代替静态密码。这样即使抓包，也拿不到 DeviceSecret（签名不可逆），而且签名带时间戳，过期就失效，能防重放。</p>
<p>ClientID 的唯一性不只是“标识”，很多平台用它维持会话和路由下行消息。两台设备用同一个 ClientID，会互相踢下线，表现为“随机掉线”。</p>`,
        fig: {
          type: "table",
          title: "三元组到 MQTT 参数的映射",
          tag: "iot-triple",
          head: ["云平台字段", "作用", "去向"],
          rows: [
            ["ProductKey", "产品标识", "Username / Topic 路径"],
            ["DeviceName", "设备唯一名", "ClientID / Username / Topic"],
            ["DeviceSecret", "设备密钥", "参与 HMAC，生成 Password"],
            ["Broker 地址", "接入点", "MQTT host + port"],
            ["签名时间戳", "防重放", "ClientID / 签名参数"]
          ]
        },
        code: {
          lang: "c",
          title: "iot_connect.c",
          src: `/* 伪代码：三元组 -> MQTT 连接参数（具体拼接以平台文档为准） */
typedef struct {
    const char *product_key;
    const char *device_name;
    const char *device_secret;
    const char *broker;
    uint16_t    port;
} iot_identity_t;

int iot_build_mqtt_auth(const iot_identity_t *id,
                        char *client_id, size_t cid_len,
                        char *username, size_t user_len,
                        char *password, size_t pass_len)
{
    uint64_t ts = time(NULL);

    /* 1. ClientID：设备名 + 安全模式 + 签名算法 + 时间戳 */
    snprintf(client_id, cid_len,
             "%s|securemode=2,signmethod=hmacsha256,timestamp=%llu|",
             id->device_name, (unsigned long long)ts);

    /* 2. Username：设备名 & 产品Key */
    snprintf(username, user_len, "%s&%s",
             id->device_name, id->product_key);

    /* 3. 待签名串：按平台规定拼接，顺序不能错 */
    char sign_src[256];
    snprintf(sign_src, sizeof(sign_src),
             "clientId%sdeviceName%sproductKey%stimestamp%llu",
             client_id, id->device_name, id->product_key,
             (unsigned long long)ts);

    /* 4. HMAC-SHA256(DeviceSecret, sign_src) -> 十六进制 Password */
    uint8_t mac[32];
    hmac_sha256((const uint8_t *)id->device_secret,
                strlen(id->device_secret),
                (const uint8_t *)sign_src, strlen(sign_src),
                mac);

    for (int i = 0; i < 32; i++) {
        snprintf(password + i * 2, pass_len - i * 2, "%02x", mac[i]);
    }
    return 0;
}

/* 连接时必须校验服务器证书；量产不要关 TLS */
int iot_mqtt_connect(const iot_identity_t *id)
{
    char cid[128], user[128], pass[80];

    iot_build_mqtt_auth(id, cid, sizeof(cid),
                        user, sizeof(user), pass, sizeof(pass));

    return mqtt_connect_tls(id->broker, id->port, cid, user, pass,
                            ca_cert_pem, /*verify*/1);
}`
        },
        codeNote: "不同平台的签名串顺序、大小写、时间戳单位都可能不同，必须以官方文档为准。签名失败时先核对“待签名串”原文，再查 DeviceSecret 和系统时间。",
        apply: `<p>接入阿里云物联网平台时，设备端最常见的问题是时间不对：TLS 证书校验失败、签名 timestamp 过期。后来在联网后先 NTP 对时，再建 MQTT 连接，问题就没了。产品上还保留了“时间偏差过大就报错并重试”的保护。</p>
<p>另一个坑是 ClientID 重复：工厂烧录时把同一套三元组写进了多台设备，平台上互相踢下线，表现为“设备随机离线”。后来产线改成从平台批量申请、一机一密，并用二维码绑定，才彻底解决。</p>`,
        pitfalls: [
          "<b>把 DeviceSecret 当 MQTT 密码直接填。</b>密码是签名结果，不是密钥本身。",
          "<b>签名串顺序凭感觉写。</b>平台校验必然失败，必须严格按文档拼接。",
          "<b>不做 NTP 对时。</b>证书校验和签名时间戳都会失败。",
          "<b>多台设备共用一个 ClientID。</b>互相踢下线，表现为随机掉线。",
          "<b>关闭 TLS 证书校验。</b>等于把 DeviceSecret 和业务数据暴露在链路上。"
        ],
        follow: [
          ["ProductKey 和 DeviceName 能改吗？", "ProductKey 在创建产品后一般不可改；DeviceName 在同一产品内必须唯一，通常也不改。要“换设备”就新建一个设备，而不是改名字。"],
          ["DeviceSecret 泄露了怎么办？", "立即在平台禁用/删除该设备，重新生成设备或轮换密钥，并通过 OTA 更新；同时排查泄露渠道（固件、日志、产线工装）。一机一密能把影响限制在单台设备。"],
          ["MQTT 的 1883 和 8883 端口有什么区别？", "1883 是明文 MQTT，8883 是 MQTT over TLS。量产必须用 8883 并校验服务器证书，否则账号密码和设备数据都能被中间人看到。"]
        ]
      },

      {
        id: "M-45",
        chapter: "wireless",
        topic: "wifi",
        title: "Wi-Fi 设备休眠后怎么唤醒？Modem sleep、Light sleep、Deep sleep 有什么区别？",
        diff: "高级",
        freq: "中频",
        type: "低功耗设计题",
        point: "三种睡眠的功耗/连接保持/唤醒延迟差异，DTIM 与 Wake-on-WLAN，以及唤醒后的重连成本。",
        q: `<p>面试官：Wi-Fi 设备怎么做到低功耗？休眠以后靠什么唤醒？Modem sleep、Light sleep、Deep sleep 分别牺牲了什么？</p>`,
        exam: `<p>考察实际低功耗产品经验。能说清“保连接”和“省电”的矛盾、DTIM 的作用、深睡后要重连，就很好。</p>`,
        core: `<p>Modem sleep：CPU 正常跑，Wi-Fi 射频在 Beacon 之间关闭、按 DTIM 醒来收广播，连接和 IP 都保持，唤醒延迟最低，电流几 mA 到几十 mA，适合一直在线、偶尔收发。</p><p>Light sleep：CPU、外设、射频大部分时钟关闭，但 RAM 和 Wi-Fi 连接状态保留，ESP32 可在 DTIM 前自动醒来收 Beacon 再睡，电流几百 µA、唤醒毫秒级，适合电池供电但要保持在线、数据不频繁的设备。</p><p>Deep sleep：除 RTC/ULP 外几乎全断电，RAM 不保留（可选 RTC 内存），Wi-Fi 断开、IP 丢失，电流几 µA；唤醒相当于复位，要重新初始化、联网、重连 MQTT/TLS，适合几十分钟上报一次的传感器。唤醒源有 RTC 定时器、GPIO 中断、UART/触摸/ULP；普通 MQTT 下行不能可靠唤醒深睡设备。深睡最省，但每次唤醒都要重新联网和 TLS 握手，周期太短反而不划算，要按“上报周期 × 单次唤醒成本”算总账。</p>`,
        answer: `<p><b>三种睡眠，核心区别是“断电断到什么程度”：</b></p>
<ul>
<li><b>Modem sleep（射频休眠）</b>：CPU 正常运行，Wi-Fi 射频在 Beacon 之间关闭，按 DTIM 周期醒来收一次广播。连接和 IP 都保持，唤醒延迟最低。电流通常在几 mA 到几十 mA，适合“一直在线、偶尔收发”的设备。</li>
<li><b>Light sleep（浅睡）</b>：CPU、外设、射频大部分时钟关闭，但 RAM 和 Wi-Fi 连接状态保留。ESP32 的 auto light sleep 可以在 DTIM 前自动醒来收 Beacon，再睡回去；连接可以维持。电流可降到几百 µA 量级，唤醒延迟毫秒级。适合电池供电、需要保持在线但数据不频繁的设备。</li>
<li><b>Deep sleep（深睡）</b>：除了 RTC/ULP 外几乎全断电，RAM 内容不保留（可选 RTC 内存），Wi-Fi 断开、IP 丢失。电流可到几 µA。唤醒相当于一次复位，需要重新初始化、联网、重连 MQTT/TLS。适合“几十分钟上报一次”的传感器。</li>
</ul>
<p><b>唤醒源：</b></p>
<ul>
<li><b>RTC 定时器</b>：最常见，按周期醒来采集/上报。</li>
<li><b>GPIO 中断</b>：按键、人体感应、门磁等外部事件。</li>
<li><b>UART / 触摸 / ULP 协处理器</b>：按芯片支持选。</li>
<li><b>网络唤醒（Wake-on-WLAN）</b>：部分 Wi-Fi 芯片支持在睡眠中匹配特定包（如 magic packet）后唤醒，但不是所有 MCU 方案都支持；普通 MQTT 下行不能可靠唤醒深睡设备。</li>
</ul>
<p><b>关键权衡：</b>深睡最省电，但每次唤醒都要重新联网 + TLS 握手 + MQTT 连接，耗时几秒、耗电也集中；如果每 10 秒醒一次，深睡反而不划算。浅睡保持连接，但平均电流高一个数量级。要按“上报周期 × 单次唤醒成本”算总账，而不是只看睡眠电流。</p>
<p><b>保持连接的前提：</b>AP 的 DTIM 周期、Beacon 间隔要和设备的 listen interval 匹配；DTIM 越大越省电，但下行包延迟越大。有些 AP 会断开长时间没有数据的 STA，需要应用层保活。</p>`,
        principle: `<p>Wi-Fi 的功耗大头是射频收发和保持连接的 Beacon 监听。Modem sleep 只关射频，Light sleep 关 CPU 和大部分外设但保留连接上下文，Deep sleep 连上下文都不要了，所以省电程度和恢复成本依次上升。</p>
<p>“能唤醒”不等于“能保持连接”：深睡醒来是一个新的网络会话，MQTT 的 Clean Session、TLS 会话复用、DHCP 租期都会影响重连速度。设计时要预留重连时间和失败重试。</p>`,
        fig: {
          type: "table",
          title: "三种睡眠模式对比",
          tag: "wifi-sleep",
          head: ["模式", "连接保持", "典型电流", "唤醒延迟", "适用场景"],
          rows: [
            ["Modem sleep", "是", "mA~几十 mA", "最低", "常在线、偶尔收发"],
            ["Light sleep", "通常可保持", "几百 µA", "毫秒级", "电池设备、低频上报"],
            ["Deep sleep", "否", "µA 级", "秒级（含重连）", "超低频采集、事件唤醒"]
          ]
        },
        code: {
          lang: "c",
          title: "esp32_sleep.c",
          src: `/* 浅睡：保持 Wi-Fi 连接，定时或 GPIO 唤醒 */
void enter_light_sleep(gpio_num_t wake_pin)
{
    /* 配置 GPIO 唤醒（低电平触发） */
    esp_sleep_enable_ext0_wakeup(wake_pin, 0);

    /* 同时设置 60s 定时唤醒，防止永远睡死 */
    esp_sleep_enable_timer_wakeup(60ULL * 1000ULL * 1000ULL);

    /* 进入浅睡；醒来后从这句话之后继续执行 */
    esp_light_sleep_start();

    /* 醒来后判断唤醒原因 */
    esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
    if (cause == ESP_SLEEP_WAKEUP_GPIO) {
        app_on_button();
    } else {
        app_on_timer();
    }
}

/* 深睡：醒来相当于复位，需要重新联网 */
void enter_deep_sleep(uint64_t seconds)
{
    esp_sleep_enable_timer_wakeup(seconds * 1000ULL * 1000ULL);
    esp_deep_sleep_start();          /* 不会返回 */
}

/* 深睡唤醒后的启动流程 */
void app_main(void)
{
    esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();

    if (cause == ESP_SLEEP_WAKEUP_TIMER) {
        /* 快速路径：采集 -> 联网 -> 上报 -> 再睡 */
        sensor_read_and_cache();
    }

    wifi_connect_saved();
    mqtt_connect_and_report();
    enter_deep_sleep(30 * 60);       /* 30 分钟后再醒 */
}`
        },
        codeNote: "深睡前要保存必要状态到 RTC 内存/NVS，并确保 MQTT 消息已经发出（或落盘待补发）。否则“省电”会变成“丢数据”。",
        apply: `<p>做过一款电池供电的门磁：平时 deep sleep，GPIO 中断唤醒上报“开/关”，然后继续睡。两节 AA 电池撑了一年多。代价是每次上报要重新联网，延迟 3~5 秒，但门磁业务可以接受。</p>
<p>另一款需要实时接收云端指令的设备，用的是 light sleep + DTIM 监听，平均电流几百 µA，指令延迟 1 秒内。如果换成 deep sleep，指令根本收不到，所以“最省电”不等于“最适合”。</p>`,
        pitfalls: [
          "<b>只看睡眠电流，不算唤醒成本。</b>频繁深睡 + 重连，总功耗可能比浅睡还高。",
          "<b>深睡后指望 MQTT 下行能唤醒。</b>连接已断，Broker 的消息到不了设备。",
          "<b>不保存状态。</b>醒来后设备 ID、序号、未发送数据全丢。",
          "<b>没有失败重试。</b>醒来联网失败就直接睡，数据永远补不上。"
        ],
        follow: [
          ["DTIM 是什么？怎么影响功耗？", "AP 在 Beacon 中携带 DTIM 计数，每隔 N 个 Beacon 有一个 DTIM。处于省电模式的 STA 只需在 DTIM 时醒来检查是否有广播/组播，N 越大越省电，但下行延迟越大。"],
          ["深睡和复位有什么区别？", "深睡会关闭大部分电源域，唤醒后从复位向量重新启动，RAM 内容丢失；区别是唤醒原因可查、RTC 内存和部分外设状态可保留。本质上就是一次受控复位。"],
          ["Wi-Fi 设备能用 Wake-on-WLAN 吗？", "部分芯片支持在低功耗状态下匹配 magic packet 或特定模式后唤醒，但需要 AP/芯片支持，且通常只能唤醒到浅睡级别。普通 MQTT 消息不能可靠唤醒深睡设备。"]
        ]
      }
    ]
  });
})();