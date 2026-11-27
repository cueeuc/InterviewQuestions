/* ============================================================
   import-ble-extra.js
   从蓝牙相关问题导入的补充题（仅收录站内没有重复的）
   答案按 BLE 规范与工程实践重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("communication", {
    chapters: [
      {
        id: "wireless",
        topics: [
          { id: "ble-link", title: "BLE 广播与连接" },
          { id: "ble-perf", title: "BLE 吞吐、功耗与 OTA" }
        ]
      }
    ],

    questions: [
      {
        id: "M-46",
        chapter: "wireless",
        topic: "ble-link",
        title: "BLE 协议栈分哪几层？从射频到应用数据是怎么走的？",
        diff: "高级",
        freq: "高频",
        type: "协议分析题",
        point: "Controller 的 PHY/LL/HCI 与 Host 的 L2CAP/ATT/GATT/SM/GAP，以及一条特征值写入的完整路径。",
        q: `<p>面试官：BLE 协议栈主要由哪些层组成？每层负责什么？手机写一个特征值，数据在协议栈里是怎么一层层走下去的？</p>`,
        exam: `<p>考察是否理解 BLE 的分层，而不是只会调 API。能说清“Controller 管射频和连接，Host 管属性与安全”，就很好。</p>`,
        core: `<p>分 Controller 和 Host，中间是 HCI。Controller：PHY（2.4G GFSK、1M/2M/Coded）、LL（广播、扫描、连接事件、跳频、CRC、重传、加密起点、40 个信道）、HCI（命令/事件/数据，可走 UART/USB/SDIO 或片内总线）。Host：L2CAP（信道复用、分段重组）、ATT（属性句柄/UUID/值/权限、读写通知、MTU 协商）、GATT（Service/Characteristic/Descriptor 的组织与语义）、SM（配对绑定密钥）、GAP（角色、广播扫描、连接参数）。</p><p>一条“手机写特征值”的路径：App 调 GATT Write → ATT 封装 Write Request → L2CAP 加信道和长度 → HCI ACL → Controller 在下一个连接事件加密、加 CRC、经 PHY 发出；设备 Controller 校验解密后经 HCI 上传 → L2CAP 重组 → ATT 解析 → GATT 找到特征值调应用回调 → Write Response 沿反路径回手机。</p><p>分工：Controller 负责“怎么把包可靠发到对面”，Host 负责“这个包代表哪个属性、有没有权限、要不要加密”。换 Controller 通常只换 HCI 以下，Host 和应用可以复用。</p>`,
        answer: `<p>BLE 协议栈分两大块：<b>Controller（控制器）</b>和 <b>Host（主机）</b>，中间是 <b>HCI</b> 接口。</p>
<p><b>Controller：</b></p>
<ul>
<li><b>PHY（物理层）</b>：2.4GHz 射频，GFSK 调制，1M/2M/Coded PHY，负责把比特变成无线电波。</li>
<li><b>LL（Link Layer，链路层）</b>：广播、扫描、发起连接、连接事件、跳频、CRC、重传、加密的起点。它定义 40 个信道（3 个广播 + 37 个数据）和链路状态机。</li>
<li><b>HCI（Host Controller Interface）</b>：Host 和 Controller 之间的命令/事件/数据接口，可以是 UART、USB、SDIO 或同一芯片内部的总线。</li>
</ul>
<p><b>Host：</b></p>
<ul>
<li><b>L2CAP</b>：逻辑链路控制与适配，提供信道复用、分段/重组、面向连接的 Channel（CoC）。</li>
<li><b>ATT（Attribute Protocol）</b>：定义属性（句柄、类型 UUID、值、权限）和读写/通知/指示操作，以及 MTU 协商。</li>
<li><b>GATT（Generic Attribute Profile）</b>：在 ATT 之上组织 Service / Characteristic / Descriptor，定义发现、读、写、Notify、Indicate 的语义。</li>
<li><b>SM（Security Manager）</b>：配对、绑定、密钥分发、LE Secure Connections，负责加密和身份认证。</li>
<li><b>GAP（Generic Access Profile）</b>：角色（广播者/观察者/外设/中心）、广播与扫描、连接参数、可发现性。</li>
</ul>
<p><b>一条“手机写特征值”的路径：</b></p>
<ol>
<li>App 调用 GATT Write Request，指定属性句柄和值；</li>
<li>GATT → ATT 封装成 Write Request PDU；</li>
<li>ATT → L2CAP 加上信道标识和长度；</li>
<li>L2CAP → HCI ACL 数据包，经 HCI 传给 Controller；</li>
<li>LL 在下一个连接事件把数据放进 PDU，加密（如果已加密）、加 CRC、走 PHY 发出去；</li>
<li>设备端 Controller 收到后校验 CRC、解密，经 HCI 上传；</li>
<li>Host 的 L2CAP 重组，ATT 解析写请求，GATT 找到对应特征值，调用应用的写回调；</li>
<li>应用返回结果，ATT 生成 Write Response，沿相反路径回给手机。</li>
</ol>
<p><b>记住分工：</b>Controller 负责“怎么把包可靠地发到对面”，Host 负责“这个包代表哪个属性、有没有权限、要不要加密”。所以换 Controller（芯片）通常只换 HCI 以下，Host 和应用可以复用。</p>`,
        principle: `<p>BLE 的分层是为了把“射频/时序”和“数据语义/安全”解耦。Controller 的实时性要求高，通常跑在芯片固件里；Host 的逻辑复杂，可以跑在 MCU 上，也可以跑在 Linux/手机里。</p>
<p>HCI 是这条分界线的具体接口。理解 HCI 之后，抓 HCI 日志就能同时看到链路事件（连接、加密）和 ATT 操作（读、写、通知），排查问题非常高效。</p>`,
        fig: {
          type: "flow",
          title: "BLE 协议栈与数据路径",
          tag: "ble-stack",
          items: [
            { t: "Application", d: "业务与特征值回调" },
            { t: "GATT / ATT", d: "服务、特征值、读写通知" },
            { t: "L2CAP", d: "信道复用、分段重组" },
            { t: "HCI", d: "Host 与 Controller 的接口" },
            { t: "Link Layer", d: "广播、连接、跳频、CRC" },
            { t: "PHY 2.4GHz", d: "GFSK 调制，1M/2M PHY" }
          ]
        },
        code: {
          lang: "c",
          title: "ble_gatt_path.c",
          src: `/* 以 ESP-IDF/NimBLE 风格示意：注册一个可写特征值 */
static int gap_event_handler(struct ble_gap_event *event, void *arg);

/* 应用层的写回调：协议栈解析完 ATT 后才调到这里 */
static int chr_write_cb(uint16_t conn_handle,
                        uint16_t attr_handle,
                        struct ble_gatt_access_ctxt *ctxt,
                        void *arg)
{
    uint8_t buf[64];
    uint16_t len = 0;

    /* 把 ATT 的值拷贝出来；不要假设它一定以 '\\0' 结尾 */
    ble_hs_mbuf_to_flat(ctxt->om, buf, sizeof(buf), &len);

    app_handle_command(conn_handle, buf, len);   /* 业务处理 */
    return 0;                                    /* 0 = 成功，回 Write Response */
}

/* GATT 服务定义：服务 UUID、特征值 UUID、权限 */
static const struct ble_gatt_svc_def gatt_svcs[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = BLE_UUID16_DECLARE(0xFF00),        /* 自定义 16 位仅示意 */
        .characteristics = (struct ble_gatt_chr_def[]) {
            {
                .uuid = BLE_UUID16_DECLARE(0xFF01),
                .access_cb = chr_write_cb,
                .flags = BLE_GATT_CHR_F_WRITE | BLE_GATT_CHR_F_NOTIFY,
            },
            { 0 }
        },
    },
    { 0 }
};

void ble_app_init(void)
{
    ble_svc_gap_init();
    ble_svc_gatt_init();
    ble_gatts_count_cfg(gatt_svcs);
    ble_gatts_add_svcs(gatt_svcs);       /* 注册到 ATT/GATT */
    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER,
                      &adv_params, gap_event_handler, NULL);
}`
        },
        codeNote: "应用回调拿到的已经是“属性值”，不用自己解析 ATT/L2CAP。如果发现回调没触发，先查 CCCD 是否使能、特征值权限、连接是否加密，而不是怀疑协议栈。",
        apply: `<p>调 BLE 时我习惯先抓 HCI 日志：如果 CONNECT_IND 之后没有 ATT 请求，问题多半在手机 App 或服务发现；如果有 Write Request 但设备没回调，检查特征值权限和 CCCD；如果链路层一直重传，才是射频/干扰问题。分层看日志，比在应用层猜快得多。</p>
<p>做 OTA 时也是同理：先确认 MTU 协商到多少、每包实际载荷多大，再算理论吞吐。很多人把“BLE 慢”归咎于协议栈，其实是每包只发了 20 字节。</p>`,
        pitfalls: [
          "<b>把 GAP 和 GATT 混为一谈。</b>GAP 管广播/连接/角色，GATT 管服务和数据。",
          "<b>以为 GATT 直接跑在 L2CAP 上。</b>中间还有 ATT，MTU、句柄、权限都在 ATT 层。",
          "<b>应用回调里做耗时操作。</b>会阻塞 Host 事件循环，导致连接事件错过、吞吐下降。",
          "<b>把 HCI 日志当成空口抓包。</b>HCI 能看到命令和 ATT 数据，但看不到空口重传和射频质量。"
        ],
        follow: [
          ["L2CAP 和 ATT 的 MTU 是一回事吗？", "不是。L2CAP 有自己的 MTU（面向连接信道），ATT 有 ATT_MTU（默认 23，最大 517）。GATT 读写受 ATT_MTU 限制，大块数据由 ATT 层分段或应用层分包。"],
          ["HCI 一定是 UART 吗？", "不一定。可以是 UART、USB、SDIO、SPI，甚至同一芯片内部的共享内存。ESP32/Nordic 等单芯片方案通常不暴露 HCI，但协议栈内部仍有等价分层。"],
          ["BLE 的加密在哪一层做？", "链路层负责加密实际的空口数据，SM（Security Manager）负责配对、密钥生成和分发。加密建立后，LL 用 AES-CCM 加密每个 PDU。"],
          ["为什么 BLE 的 ATT MTU 默认只有 23？", "23 = 1 字节 opcode + 2 字节句柄 + 20 字节值，是早期为低功耗和简单实现定的最小可用值。BLE 4.2 之后可以协商到 247/517，但需要双方都支持。"]
        ]
      },

      {
        id: "M-47",
        chapter: "wireless",
        topic: "ble-link",
        title: "BLE 的主机、从机、广播者、观察者、发起者分别是什么？连接后角色怎么变？",
        diff: "中级",
        freq: "中频",
        type: "概念辨析题",
        point: "GAP 四种角色与链路层主从的区别，GATT client/server 的独立性，以及连接建立后的角色固定。",
        q: `<p>面试官：BLE 里经常说主机、从机、广播者、观察者、发起者，这些角色到底怎么区分？手机连上设备后，谁主谁从？</p>`,
        exam: `<p>考察角色模型是否清晰。能说清“GAP 角色”和“GATT 角色”是两套独立的概念，就不容易在项目里配错。</p>`,
        core: `<p>GAP 四种角色：Broadcaster 只广播不接受连接（Beacon）；Observer 只扫描不连接（网关收 Beacon）；Peripheral 发可连接广播、接受中心发起的连接，连上后通常是 slave；Central 扫描并发起连接，连上后是 master，负责连接事件时序、信道图和跳频。</p><p>“扫描者/发起者”是链路层的临时状态（scanning/initiating），连上进入 connection 才有 master/slave，BLE 没有经典蓝牙那种 role switch。连接参数由 master 决定，slave 可请求但最终 master 拍板。</p><p>GATT client/server 和 GAP 角色是两套概念：手机典型是 Central + GATT client，设备是 Peripheral + GATT server，但也可以反过来；角色由“谁发起 GATT 操作”决定。一个设备可以同时是 Central 和 Peripheral，也可以同时做 client 和 server。</p>`,
        answer: `<p><b>GAP（通用访问规范）定义了四种角色：</b></p>
<ul>
<li><b>Broadcaster（广播者）</b>：只发广播，不接受连接，例如 Beacon、iBeacon。</li>
<li><b>Observer（观察者）</b>：只扫描广播，不发起连接，例如网关收集 Beacon 数据。</li>
<li><b>Peripheral（外设）</b>：发可连接广播，接受中心设备发起的连接，连接后通常是链路层的 <b>slave（从机）</b>。传感器、手环、BLE 模块都是这个角色。</li>
<li><b>Central（中心）</b>：扫描广播、发起连接，连接后通常是 <b>master（主机）</b>，负责连接事件的时序、信道图和跳频。手机、网关通常是这个角色。</li>
</ul>
<p><b>“发起者/扫描者”是链路层的临时状态：</b>扫描是 scanning state，发起连接是 initiating state；连上之后进入 connection state，才有 master/slave 之分。所以“发起者”不是永久角色，只是建立连接的那一步。</p>
<p><b>连接后角色固定：</b>一次连接由 Central 发起，Central 就是 master，Peripheral 就是 slave，BLE 没有经典蓝牙那种 role switch。连接参数（间隔、延迟、超时、信道图）由 master 决定/更新，slave 可以请求但最终由 master 拍板。</p>
<p><b>关键：GATT client/server 和 GAP 角色是两套概念。</b></p>
<ul>
<li><b>GATT server</b>：拥有属性数据库，提供服务和特征值；<b>GATT client</b>：发起发现、读、写、订阅。</li>
<li>典型手机 = Central + GATT client；设备 = Peripheral + GATT server。</li>
<li>但也可以反过来：设备作为 Peripheral 去读手机上的特征值（设备是 GATT client），或者 Central 提供自己的服务（Central 是 GATT server）。角色由“谁发起 GATT 操作”决定，不由“谁连谁”决定。</li>
</ul>
<p><b>多角色：</b>一个设备可以同时是 Central 和 Peripheral（例如网关既连传感器，又被手机连），也可以同时做 GATT client 和 server。芯片/协议栈支持多连接时，这些角色可以并存。</p>`,
        principle: `<p>GAP 管“怎么发现、怎么连、连上后谁控制时序”；GATT 管“连上后怎么读写数据”。把两者分开，才能理解为什么一个 Peripheral 也能主动读手机的特征值——它只是 GATT client，不是 GAP central。</p>
<p>Master/slave 是链路层连接角色，决定了谁发连接事件、谁维护信道图。它和“谁功能更强”无关，只和“谁发起连接”有关。</p>`,
        fig: {
          type: "table",
          title: "BLE 角色对照",
          tag: "ble-roles",
          head: ["角色", "所在层", "职责", "典型设备"],
          rows: [
            ["Broadcaster", "GAP", "只广播，不接受连接", "Beacon"],
            ["Observer", "GAP", "只扫描，不连接", "采集网关"],
            ["Peripheral / Slave", "GAP / LL", "广播并接受连接，响应连接事件", "传感器、手环"],
            ["Central / Master", "GAP / LL", "扫描、发起连接、控制时序", "手机、网关"],
            ["GATT Server", "GATT", "提供属性数据库", "传感器设备"],
            ["GATT Client", "GATT", "发现、读写、订阅", "手机 App"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_roles.c",
          src: `/* 同一个设备既做 Peripheral 又被手机连，同时做 Central 连传感器 */
void ble_multi_role_init(void)
{
    /* 1. 作为 Peripheral：发可连接广播，等待手机连接 */
    ble_gap_adv_params_t adv = { 0 };
    adv.conn_mode = BLE_GAP_CONN_MODE_UND;
    adv.disc_mode = BLE_GAP_DISC_MODE_GEN;
    adv.itvl_min  = BLE_GAP_ADV_ITVL_MS(100);
    adv.itvl_max  = BLE_GAP_ADV_ITVL_MS(100);
    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER,
                      &adv, gap_event_handler, NULL);

    /* 2. 作为 Central：扫描并连接传感器 */
    ble_gap_disc_params_t scan = { 0 };
    scan.passive = 0;                 /* 主动扫描，拿 scan response */
    scan.itvl    = BLE_GAP_SCAN_ITVL_MS(100);
    scan.window  = BLE_GAP_SCAN_WIN_MS(50);
    ble_gap_disc(BLE_OWN_ADDR_PUBLIC, BLE_HS_FOREVER, &scan,
                 gap_event_handler, NULL);
}

/* 连接建立后：根据 role 判断自己在这条连接里是 master 还是 slave */
static int gap_event_handler(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            int master = event->connect.role == BLE_GAP_ROLE_MASTER;
            app_on_connected(event->connect.conn_handle, master);
        }
        break;

    case BLE_GAP_EVENT_DISCONNECT:
        app_on_disconnected(event->disconnect.conn.conn_handle);
        break;

    default:
        break;
    }
    return 0;
}`
        },
        codeNote: "多角色会显著增加 RAM 和射频调度压力。先确认协议栈支持的最大连接数，再设计业务，不要假设“能广播就能同时连很多个”。",
        apply: `<p>做智能家居网关时，设备同时做两件事：作为 Peripheral 被手机配网/控制，作为 Central 连接多个 BLE 传感器。最初把两套逻辑写在同一个回调里，连接句柄混用，导致手机下发命令发到了传感器。后来给每条连接建了上下文（role + 对端地址 + 业务类型），才理清。</p>
<p>另一个常见误解是“手机是主机，所以手机一定是 GATT server”。实际上手机通常是 GATT client，它主动读设备的数据；设备才是 GATT server。只有手机主动提供服务的场景（如手机作为数据源）才反过来。</p>`,
        pitfalls: [
          "<b>把 Central 等同于 GATT server。</b>两者是不同层的概念，可以任意组合。",
          "<b>以为 Peripheral 不能主动读数据。</b>它可以是 GATT client，主动发读请求。",
          "<b>以为连接后可以切换主从。</b>BLE 没有经典蓝牙的 role switch，连接角色由发起方决定。",
          "<b>多角色共用一个连接句柄表。</b>不同连接的上下文会串，数据发错设备。"
        ],
        follow: [
          ["手机能同时连多个 BLE 设备吗？", "可以。手机作为 Central 通常支持 7 个左右并发连接（不同手机/系统不同），每个连接独立维护参数和 GATT 状态。"],
          ["Peripheral 能主动断开连接吗？", "可以。Peripheral 可以发 LL_TERMINATE_IND 或调用协议栈的断开 API。断开后需要重新广播，等待下一次连接。"],
          ["GATT client 和 server 能同时存在于一条连接的两端吗？", "可以。GATT 是双向的，双方都可以有自己的属性数据库，也都可以发起发现/读写。谁先发起操作，谁就是这次操作的 client。"]
        ]
      },

      {
        id: "M-48",
        chapter: "wireless",
        topic: "gatt",
        title: "BLE 的 UUID 是什么？16 位和 128 位 UUID 有什么区别？",
        diff: "中级",
        freq: "中频",
        type: "协议细节题",
        point: "UUID 标识服务/特征值/描述符，SIG 16 位别名与自定义 128 位，句柄与 UUID 的区别。",
        q: `<p>面试官：BLE 里的 UUID 是干什么的？为什么有的服务是 0x180F，有的是很长一串？自定义服务该怎么选 UUID？</p>`,
        exam: `<p>考察 GATT 数据模型。能说清“UUID 表意、句柄寻址”“16 位是 SIG 别名、自定义用 128 位”，就很扎实。</p>`,
        core: `<p>UUID 是属性的“类型标识”，表示这个服务、特征值或描述符是什么，如 <code>0x180F</code> 电池服务、<code>0x2A19</code> 电量、<code>0x2902</code> CCCD。</p><p>16 位是 SIG 分配的短别名，完整形式 <code>0000xxxx-0000-1000-8000-00805F9B34FB</code>，只有 SIG 注册过的才能用，不能自己编一个 <code>0xFF01</code> 当标准；自定义服务和特征值必须用 128 位，可基于 UUID v4 生成。</p><p>UUID 是“是什么”，handle 是“在哪里”（16 位索引，读写实际操作它）。handle 由 server 注册时分配，不同固件版本可能变化，所以 client 必须先做服务发现、按 UUID 找到 handle 并缓存本次连接，不要硬编码。</p>`,
        answer: `<p><b>UUID 是属性的“类型标识”，用来表示这个服务/特征值/描述符是什么。</b>例如：</p>
<ul>
<li>0x1800：Generic Access（GAP 服务）</li>
<li>0x180A：Device Information（设备信息）</li>
<li>0x180F：Battery Service（电池服务）</li>
<li>0x2A19：Battery Level（电池电量特征值）</li>
<li>0x2902：Client Characteristic Configuration Descriptor（CCCD，开通知用）</li>
</ul>
<p><b>16 位 vs 128 位：</b></p>
<ul>
<li><b>16 位 UUID</b> 是 Bluetooth SIG 分配的“短别名”，完整形式是 <code>0000xxxx-0000-1000-8000-00805F9B34FB</code>。只有 SIG 注册过的服务/特征值才能用 16 位，不能自己随便编一个 0xFF01 就当成标准。</li>
<li><b>128 位 UUID</b> 是完整的全局唯一标识，自定义服务/特征值必须用 128 位。可以基于随机 UUID（UUID v4）生成，碰撞概率极低。</li>
<li><b>32 位 UUID</b> 也存在，形式是 <code>0000xxxx-0000-1000-8000-00805F9B34FB</code> 的扩展，但较少用。</li>
</ul>
<p><b>UUID 和句柄的区别：</b></p>
<ul>
<li><b>UUID</b> 是“是什么”，例如“电池电量”。</li>
<li><b>Handle</b> 是“在哪里”，是 ATT 属性的 16 位索引，例如 0x0016。读写操作实际用的是 handle，不是 UUID。</li>
<li>Handle 由 GATT server 在服务注册时分配，不同连接/不同固件版本可能变化。所以 client 必须先做服务发现，按 UUID 找到 handle，再缓存本次连接使用；<b>不要硬编码 handle</b>。</li>
</ul>
<p><b>自定义服务怎么选：</b>用 UUID v4 生成一个 128 位 UUID 作为服务，再为每个特征值生成独立的 128 位 UUID；写进文档，App 和固件共用。不要用未注册的 16 位 UUID，否则和标准服务冲突时行为不可预期。</p>`,
        principle: `<p>GATT 的数据模型是“服务 → 特征值 → 描述符”的树。UUID 给每个节点一个类型名，handle 给每个节点一个地址。发现服务的过程，就是把“UUID → handle”的映射建立起来。</p>
<p>16 位 UUID 节省空口和存储，但前提是 SIG 统一分配，保证全球唯一；自定义服务没有这种分配机构，只能用 128 位来保证唯一性。</p>`,
        fig: {
          type: "table",
          title: "常见 BLE UUID",
          tag: "ble-uuid",
          head: ["UUID", "名称", "作用"],
          rows: [
            ["0x1800", "Generic Access", "设备名、外观、连接参数"],
            ["0x1801", "Generic Attribute", "服务变更指示"],
            ["0x180A", "Device Information", "厂商、型号、固件版本"],
            ["0x180F", "Battery Service", "电池服务"],
            ["0x2A19", "Battery Level", "电量百分比"],
            ["0x2902", "CCCD", "开关 Notify / Indicate"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_uuid.c",
          src: `/* 自定义 128 位 UUID：用 uuidgen 或在线 UUID v4 生成后固定下来 */
/* 例如：6E400001-B5A3-F393-E0A9-E50E24DCCA9E（Nordic UART 风格） */

/* NimBLE 风格：从 128 位字符串构造 UUID */
static ble_uuid128_t s_svc_uuid = {
    .u.type = BLE_UUID_TYPE_128,
    /* 小端存储：实际字节序要和协议栈的 API 对齐 */
    .value = {
        0x9E, 0xCA, 0xDC, 0x24, 0x0E, 0xE5, 0xA9, 0xE0,
        0x93, 0xF3, 0xA3, 0xB5, 0x01, 0x00, 0x40, 0x6E
    }
};

/* 注册服务时用 UUID，不关心 handle；handle 由协议栈分配 */
static const struct ble_gatt_svc_def gatt_svcs[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = &s_svc_uuid.u,
        .characteristics = (struct ble_gatt_chr_def[]) {
            {
                /* 自定义特征值也用 128 位 UUID */
                .uuid = BLE_UUID128_DECLARE(
                    0x9E, 0xCA, 0xDC, 0x24, 0x0E, 0xE5, 0xA9, 0xE0,
                    0x93, 0xF3, 0xA3, 0xB5, 0x02, 0x00, 0x40, 0x6E),
                .access_cb = chr_access_cb,
                .flags = BLE_GATT_CHR_F_READ | BLE_GATT_CHR_F_NOTIFY,
            },
            { 0 }
        },
    },
    { 0 }
};

/* 连接后做服务发现：按 UUID 找 handle，再缓存 */
void on_service_discovered(uint16_t conn_handle, uint16_t val_handle)
{
    /* val_handle 只在本次连接有效；重连后要重新发现 */
    app_ctx[conn_handle].chr_handle = val_handle;
}`
        },
        codeNote: "128 位 UUID 的字节序在不同协议栈 API 里可能相反（大端字符串 vs 小端数组）。第一次接入时用 nRF Connect 看实际广播/服务列表，确认没有“镜像”或乱码。",
        apply: `<p>做自定义 BLE 设备时，最初图省事用了 0xFF01 这种 16 位 UUID，结果和某款手机的私有服务冲突，服务发现时多出一堆不认识的描述符。后来改用 128 位 UUID，问题消失。</p>
<p>另一个坑是硬编码 handle：调试时发现某个特征值在 0x0016，就直接写死。换了一版固件，服务顺序变了，handle 变成 0x0018，App 读写全错。正确做法是每次连接后按 UUID 发现并缓存 handle。</p>`,
        pitfalls: [
          "<b>自定义服务用 16 位 UUID。</b>未注册的短 UUID 可能和标准/厂商服务冲突。",
          "<b>把 handle 当成永久地址。</b>固件版本、连接、服务顺序变化都会改变 handle。",
          "<b>UUID 字节序写反。</b>服务能注册但手机发现不到，或显示成另一串 UUID。",
          "<b>忘记 CCCD。</b>特征值支持 Notify，但 client 没写 0x2902 使能，永远收不到通知。"
        ],
        follow: [
          ["16 位 UUID 和 128 位 UUID 在空口上有什么区别？", "16 位 UUID 只占 2 字节，128 位占 16 字节；广播/服务发现时 128 位会显著增加数据量。标准服务用 16 位是为了省空间。"],
          ["UUID 会重复吗？", "SIG 分配的 16 位 UUID 全球唯一；自定义 128 位 UUID 基于随机数，碰撞概率极低，但也不是数学上绝对为零。不要自己随意缩短成 16 位。"],
          ["CCCD 为什么是 0x2902？", "它是 Bluetooth SIG 定义的 Client Characteristic Configuration Descriptor，标准 UUID 就是 0x2902，用来控制该特征值的 Notify/Indicate 开关。写入 0x0001 开通知，0x0002 开指示。"]
        ]
      },

      {
        id: "M-49",
        chapter: "wireless",
        topic: "ble-link",
        title: "BLE 的广播和扫描过程是怎样的？广播包里能放多少数据？",
        diff: "高级",
        freq: "高频",
        type: "协议分析题",
        point: "37/38/39 三个广播信道、31 字节广播数据与 scan response、主动/被动扫描，以及连接请求的建立。",
        q: `<p>面试官：BLE 设备是怎么被手机发现的？广播包里到底能放多少数据？主动扫描和被动扫描有什么区别？</p>`,
        exam: `<p>考察对 BLE 发现流程的理解。能说清“3 个广播信道、31 字节、scan response 再加 31 字节、CONNECT_IND 建连”，就很好。</p>`,
        core: `<p>Peripheral 在 37/38/39（2402/2426/2480MHz）周期发广播 PDU，每个事件在三个信道各发一次，间隔 20ms~10.24s（单位 0.625ms）。类型有 <code>ADV_IND</code> 可连接可扫描、<code>ADV_NONCONN_IND</code> 只广播（Beacon）、<code>ADV_SCAN_IND</code>、<code>ADV_DIRECT_IND</code>，以及 BLE 5 的 <code>ADV_EXT_IND</code>。</p><p>传统广播的 AdvData 最多 31 字节，扫描响应再加 31，共 62；BLE 5 扩展广播可上千字节，但要手机支持。被动扫描只监听、省电；主动扫描发 <code>SCAN_REQ</code> 拿 <code>SCAN_RSP</code>，多 31 字节但更耗电。扫描占空比 = window/interval，越高发现越快、越耗电。</p><p>Central 扫到目标后发 <code>CONNECT_IND</code>，带接入地址、CRC init、连接间隔、从机延迟、监督超时、信道图、跳频增量和睡眠时钟精度，之后双方跳到数据信道按连接事件通信。三个广播信道分处频段低中高，尽量避开 Wi-Fi 的 1/6/11 主信道，并降低单信道被干扰导致发现失败的概率。</p>`,
        answer: `<p><b>广播：</b>Peripheral 在 <b>37、38、39</b> 三个广播信道（2402、2426、2480MHz）上周期性发送广播 PDU。每个广播事件会在三个信道上各发一次（或按配置），间隔称为 <b>Advertising Interval</b>，范围 20ms~10.24s，单位 0.625ms。广播类型主要有：</p>
<ul>
<li><b>ADV_IND</b>：可连接、可扫描，最常用。</li>
<li><b>ADV_NONCONN_IND</b>：只广播，不接受连接（Beacon）。</li>
<li><b>ADV_SCAN_IND</b>：可扫描但不接受连接。</li>
<li><b>ADV_DIRECT_IND</b>：定向广播，快速重连已知设备。</li>
<li><b>ADV_EXT_IND</b>：BLE 5 扩展广播，数据可超过 31 字节。</li>
</ul>
<p><b>广播包能放多少：</b>传统广播（Legacy Advertising）的 AdvData 最大 <b>31 字节</b>；如果设备支持 scan response，手机发 SCAN_REQ 后设备可以再回一个 <b>31 字节</b>的 SCAN_RSP，所以“设备名 + 服务 UUID”可以分两部分放，总共最多 62 字节。BLE 5 的扩展广播可以把更多数据放到 secondary channel，理论上千字节级，但需要手机支持。</p>
<p><b>扫描：</b></p>
<ul>
<li><b>被动扫描</b>：只监听广播包，不发任何东西。省电，但拿不到 scan response。</li>
<li><b>主动扫描</b>：收到可扫描广播后发 SCAN_REQ，设备回 SCAN_RSP。能多拿 31 字节，但会增加空口交互和功耗。</li>
<li>扫描参数由 <b>scan interval</b> 和 <b>scan window</b> 决定：每个 interval 内监听 window 时长，占空比 = window/interval。占空比越高，发现越快、越耗电。</li>
</ul>
<p><b>连接建立：</b>Central 扫描到目标后，发 <b>CONNECT_IND</b>，里面带 Access Address、CRC Init、连接间隔、slave latency、supervision timeout、信道图、跳频增量、睡眠时钟精度。之后双方跳到数据信道，按连接事件通信；广播阶段结束。</p>
<p><b>为什么是 3 个广播信道：</b>37/38/39 分别位于 2.4GHz 频段的低端、中心、高端，尽量避开 Wi-Fi 的 1/6/11 主信道；同时三个信道并行发送，降低某一个信道被干扰导致发现失败的概率。</p>`,
        principle: `<p>广播是“无连接”的：设备不知道谁在听，也不关心；扫描者只是被动/主动收集。只有 CONNECT_IND 之后才建立点对点的连接，才有连接句柄、加密、GATT 操作。</p>
<p>31 字节的限制来自传统广播 PDU 的结构：Header（2B）+ AdvA（6B）+ AdvData（最多 31B）+ CRC（3B），PDU 最多 39 字节；再加上前导码 1 字节和接入地址 4 字节，空口上最多 47 字节。扩展广播通过“主广播 + 链式 secondary 包”突破了这个限制。</p>`,
        fig: {
          type: "bits",
          title: "传统广播包的 31 字节数据区",
          tag: "ble-adv",
          cells: [
            { v: "Flags", n: "发现模式/BR-EDR 支持" },
            { v: "UUID", n: "服务 UUID（16/128 位）" },
            { v: "Name", n: "设备名（可截断）" },
            { v: "TX", n: "发射功率" },
            { v: "Mfg", n: "厂商自定义数据" },
            { v: "…", n: "剩余 AD 结构" }
          ],
          note: "每个 AD 结构 = 1 字节长度 + 1 字节类型 + 数据；总 AdvData 不超过 31 字节，scan response 可再放 31 字节。"
        },
        code: {
          lang: "c",
          title: "ble_adv.c",
          src: `/* 组装传统广播数据：flags + 16 位服务 UUID + 设备名 */
static uint8_t adv_data[31];
static uint8_t adv_len;

static void adv_add(uint8_t type, const uint8_t *data, uint8_t len)
{
    if (adv_len + len + 2 > sizeof(adv_data)) return;   /* 放不下就丢弃 */

    adv_data[adv_len++] = (uint8_t)(len + 1);           /* AD 长度 */
    adv_data[adv_len++] = type;                         /* AD 类型 */
    memcpy(&adv_data[adv_len], data, len);
    adv_len += len;
}

void ble_build_adv(void)
{
    adv_len = 0;

    /* Flags：LE General Discoverable + BR/EDR Not Supported */
    uint8_t flags = 0x06;
    adv_add(0x01, &flags, 1);

    /* 16 位服务 UUID：小端存放 */
    uint8_t uuid16[2] = { 0x0F, 0x18 };                  /* 0x180F 电池服务 */
    adv_add(0x03, uuid16, 2);

    /* 完整设备名 */
    const char *name = "EIK-Sensor";
    adv_add(0x09, (const uint8_t *)name, (uint8_t)strlen(name));

    ble_gap_adv_set_data(adv_data, adv_len);
}

/* 广播参数：100ms 间隔，可连接、通用可发现 */
void ble_start_adv(void)
{
    ble_gap_adv_params_t adv = { 0 };

    adv.conn_mode = BLE_GAP_CONN_MODE_UND;      /* 可连接 */
    adv.disc_mode = BLE_GAP_DISC_MODE_GEN;      /* 通用可发现 */
    adv.itvl_min  = BLE_GAP_ADV_ITVL_MS(100);
    adv.itvl_max  = BLE_GAP_ADV_ITVL_MS(100);

    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER,
                      &adv, gap_event_handler, NULL);
}`
        },
        codeNote: "设备名太长会把服务 UUID 挤掉；31 字节很紧张，优先放 Flags + 服务 UUID + 短名，其余信息放到 scan response 或连接后读取。",
        apply: `<p>做 BLE 温湿度计，最初把设备名、厂商名、序列号、服务 UUID 全塞进广播，结果超过 31 字节，协议栈静默截断，手机扫不到服务。后来只放 Flags + 服务 UUID + 短名，序列号放到 scan response，问题解决。</p>
<p>还遇到 iOS 后台扫描限制：App 在后台时只能按服务 UUID 过滤扫描，不能按设备名。所以广播里必须带服务 UUID，否则后台永远发现不了。这类平台限制要在协议设计初期就考虑。</p>`,
        pitfalls: [
          "<b>广播数据超过 31 字节。</b>协议栈可能截断或直接报错，表现为“设备能扫到但服务不对”。",
          "<b>把大块数据塞广播。</b>广播是无连接、不可靠的，大数据应该连接后走 GATT。",
          "<b>iOS 后台只按名称过滤。</b>后台扫描通常要求按服务 UUID 过滤，广播里必须带 UUID。",
          "<b>广播间隔太短。</b>发现快但功耗高；电池设备通常 500ms~1s。"
        ],
        follow: [
          ["广播间隔和发现速度是什么关系？", "间隔越短，手机越容易在扫描窗口内碰到广播，发现越快；但每次广播都要开射频，功耗越高。100ms 适合配网，500ms~1s 适合长期广播。"],
          ["scan response 什么时候用？", "主动扫描时，设备收到 SCAN_REQ 后回 SCAN_RSP。可以把设备名、厂商数据等非关键信息放这里，不占用主广播的 31 字节。"],
          ["扩展广播（Extended Advertising）有什么好处？", "BLE 5 可以把广播数据放到 secondary channel，突破 31 字节限制，支持更长的设备名/服务数据；但需要手机和协议栈都支持，兼容性不如传统广播。"]
        ]
      },

      {
        id: "M-50",
        chapter: "wireless",
        topic: "ble-perf",
        title: "BLE 设备低功耗设计的关键点有哪些？连接间隔、广播间隔怎么定？",
        diff: "高级",
        freq: "高频",
        type: "低功耗设计题",
        point: "平均电流 = 睡眠 + 射频占空比；广播/连接间隔、slave latency、MTU/DLE、通知方式与电池寿命估算。",
        q: `<p>面试官：BLE 设备怎么做到一颗纽扣电池用一年？广播间隔、连接间隔、slave latency 你一般怎么设？</p>`,
        exam: `<p>考察是否算过功耗账。能说清“占空比决定平均电流”“连接间隔和延迟的权衡”“大 MTU 减少包数”，就很好。</p>`,
        core: `<p>先算账：平均电流 ≈ 睡眠电流 + 射频事件电流 × 占空比 + MCU 唤醒处理电流；省电的核心不是把睡眠电流做到最低，而是减少射频开启的次数和时长。</p><p>广播间隔 20ms~10.24s：配网或首次连接 100ms 左右，长期 Beacon/传感器 500ms~1s，电池设备不要长期 20ms。连接间隔 7.5ms~4s：HID/实时控制 15~30ms，传感器周期上报 100~500ms，超低频 1~4s。从机延迟最多 499，interval 100ms + latency 4 可 500ms 醒一次；监督超时必须大于 (1+latency)×2×interval。</p><p>其他：MTU 协商到 247、DLE 开到 251，减少包数和事件；实时数据用 Notify 不用 Indicate；2M PHY 空口时间减半；多次测量打包一次上报；传感器不用时断电；MCU 在间隔之间进低功耗。寿命估算：CR2032 约 220mAh，10µA 约 2.5 年，100µA 约 3 个月，还要扣自放电和峰值电流影响。</p>`,
        answer: `<p><b>先算账：</b>BLE 的平均电流 ≈ 睡眠电流 + 每次射频事件的电流 × 占空比 + MCU 唤醒/处理电流。省电的核心不是“把睡眠电流做到最低”，而是<b>减少射频开启的次数和时长</b>。</p>
<p><b>广播间隔：</b>范围 20ms~10.24s。间隔越短，被发现越快，但每次三个信道都要发，功耗越高。</p>
<ul>
<li>配网/首次连接：100ms 左右，用户体验优先。</li>
<li>长期广播的 Beacon/传感器：500ms~1s，甚至更长。</li>
<li>电池设备不要用 20ms 长期广播，除非有外部供电。</li>
</ul>
<p><b>连接间隔（Connection Interval）：</b>7.5ms~4s，单位 1.25ms。它决定“多久有一次通信机会”，直接影响延迟和功耗。</p>
<ul>
<li>HID/音频/实时控制：15~30ms，延迟优先。</li>
<li>传感器周期上报：100~500ms，甚至 1s。</li>
<li>超低频：1~4s，但要注意 supervision timeout 和用户体验。</li>
</ul>
<p><b>Slave Latency：</b>允许从机跳过 N 个连接事件不响应，最多 499。比如 interval=100ms、latency=4，从机可以每 500ms 才醒一次，功耗大幅下降，但下行延迟变大。supervision timeout 必须大于 <code>(1 + latency) × 2 × interval</code>，否则会被误判断线。</p>
<p><b>其他关键点：</b></p>
<ul>
<li><b>MTU/DLE</b>：把 ATT MTU 协商到 247、LL PDU 开到 251，一包能带更多数据，减少包数和射频事件。</li>
<li><b>通知 vs 指示</b>：Notify 不需要逐包 ACK，Indicate 需要，实时数据用 Notify。</li>
<li><b>2M PHY</b>：空口时间减半，但峰值电流略高、距离略短；短距离高速场景更省总能量。</li>
<li><b>批量上报</b>：把多次测量打包成一包，减少连接事件；不要每秒发一个字节。</li>
<li><b>传感器/外设电源</b>：不用时断电，用 GPIO 控制；传感器本身可能比 BLE 更耗电。</li>
<li><b>睡眠</b>：MCU 在连接间隔之间进入低功耗模式，用 RTC/定时器唤醒；协议栈要支持 sleep clock accuracy。</li>
</ul>
<p><b>电池寿命估算：</b>CR2032 约 220mAh。平均 10µA → 22000h ≈ 2.5 年；平均 100µA → 2200h ≈ 3 个月。实际还要扣除电池自放电、温度、峰值电流导致的有效容量下降。</p>`,
        principle: `<p>BLE 的低功耗来自“占空比极低”：大部分时间射频和 MCU 都在睡，只在连接事件/广播事件短暂醒来。所以任何“让设备更频繁醒来”的设计都会直接吃掉电池寿命。</p>
<p>连接参数是双方协商的：从机可以发 Connection Parameter Update Request，但最终由主机决定。iOS/Android 对参数有各自的限制，设计时要按目标手机验证，不能只看理论值。</p>`,
        fig: {
          type: "table",
          title: "BLE 功耗相关参数",
          tag: "ble-power",
          head: ["参数", "范围", "调大后的影响"],
          rows: [
            ["广播间隔", "20ms~10.24s", "功耗下降，发现变慢"],
            ["连接间隔", "7.5ms~4s", "功耗下降，延迟变大"],
            ["Slave Latency", "0~499", "从机可跳过事件，下行延迟变大"],
            ["ATT MTU", "23~517", "每包数据更多，包数减少"],
            ["LL PDU (DLE)", "27~251B", "减少分片和空口开销"],
            ["Supervision Timeout", "10ms~32s（常用 100ms 起）", "断线发现变慢，但更抗抖动"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_power.c",
          src: `/* 从机发起连接参数更新：100ms 间隔，允许跳过 4 个事件 */
void ble_request_low_power(uint16_t conn_handle)
{
    ble_gap_upd_params_t p = { 0 };

    p.itvl_min            = BLE_GAP_CONN_ITVL_MS(100);
    p.itvl_max            = BLE_GAP_CONN_ITVL_MS(100);
    p.latency             = 4;          /* 最坏 500ms 才响应一次 */
    p.supervision_timeout = 600;        /* 6s，必须 > (1+4)*2*100ms = 1s */
    p.min_ce_len          = 0;
    p.max_ce_len          = 0;

    ble_gap_update_params(conn_handle, &p);
}

/* 数据发送：能合并就合并，减少连接事件 */
void ble_report_batched(const sample_t *s, int n)
{
    uint8_t buf[244];
    int len = 0;

    for (int i = 0; i < n && len + 6 <= sizeof(buf); i++) {
        buf[len++] = s[i].id;
        buf[len++] = (uint8_t)(s[i].value & 0xFF);
        buf[len++] = (uint8_t)(s[i].value >> 8);
        buf[len++] = (uint8_t)(s[i].ts & 0xFF);
        buf[len++] = (uint8_t)((s[i].ts >> 8) & 0xFF);
        buf[len++] = (uint8_t)((s[i].ts >> 16) & 0xFF);
    }

    /* 一包发完，QoS 由应用层序号/确认保证 */
    ble_gatts_notify(conn_handle, chr_handle, buf, len);
}`
        },
        codeNote: "slave latency 不是越大越好：它会让手机下发的控制指令延迟到下一个“必须响应”的连接事件。控制类设备通常 latency=0，纯上报设备才可以放宽。",
        apply: `<p>做过一款 BLE 温湿度计，最初连接间隔 30ms、每 2 秒发一包，CR2032 只能撑 3 个月。后来改成 interval=500ms、latency=4、把 5 次测量合并成一包，平均电流从 100µA 降到 15µA 左右，寿命拉到一年以上。</p>
<p>另一款带遥控功能的设备不能把 latency 设大，否则按键后要等半秒才响应。最后用的是 interval=15ms、latency=0，但只在连接时保持，空闲 30 秒后主动断开，需要时再广播重连。用“断开”换功耗，比“慢连接”更适合这种交互。</p>`,
        pitfalls: [
          "<b>只看睡眠电流，不看射频占空比。</b>广播/连接太频繁，睡眠做得再好也白搭。",
          "<b>slave latency 设太大。</b>下行控制延迟明显，用户觉得“按了没反应”。",
          "<b>supervision timeout 不满足公式。</b>连接会被误判断开，表现为随机掉线。",
          "<b>不合并数据。</b>每秒钟发几个字节，包数和功耗都浪费在头部上。"
        ],
        follow: [
          ["连接间隔 7.5ms 一定比 100ms 好吗？", "不一定。7.5ms 延迟最低但功耗最高；传感器类应用 100ms 甚至 1s 足够。要看业务对延迟的要求，而不是追求最小间隔。"],
          ["iOS 对连接参数有什么限制？", "iOS 对连接间隔、slave latency、超时有自己的接受范围（常见最小 15ms，部分场景 30ms），从机请求不满足时会被拒绝或调整。要以真机测试为准。"],
          ["广播间隔和连接间隔哪个更省电？", "连接建立后广播就停了，功耗由连接间隔决定；未连接时只有广播，功耗由广播间隔决定。两者不是同时存在的。"],
          ["2M PHY 一定更省电吗？", "空口时间减半，理论上更省；但 2M PHY 的接收灵敏度和距离略差，且峰值电流可能更高。短距离、大流量场景通常更划算，远距离要实测。"]
        ]
      },

      {
        id: "M-51",
        chapter: "wireless",
        topic: "ble-perf",
        title: "BLE 传输速度慢、延迟高，怎么优化？",
        diff: "高级",
        freq: "高频",
        type: "性能优化题",
        point: "吞吐 = 每连接事件包数 × 每包载荷 / 间隔；MTU、DLE、2M PHY、Notify 与连接参数的组合优化。",
        q: `<p>面试官：你的 BLE 设备传数据很慢，手机端一包只能收 20 字节。怎么把吞吐提上去？延迟又该怎么降？</p>`,
        exam: `<p>考察是否理解 BLE 吞吐的构成。能算清“默认 20 字节 × 每事件 1 包 / 30ms”有多低，并给出 MTU/DLE/PHY/Notify 的组合，就很好。</p>`,
        core: `<p>默认值有多低：MTU 23、实际载荷 20 字节，连接间隔 30ms、每事件 1 包，吞吐约 <code>20B/30ms ≈ 667B/s ≈ 5.3kbps</code>，这就是“BLE 慢”的来源。</p><p>公式：吞吐 = 每事件包数 × 每包有效载荷 / 连接间隔。四个变量都能动：MTU 从 23 提到 247/517 并开 DLE（PDU 251，单包约 244 字节）；每事件连续多发（很多手机 4~6 包）；间隔缩到 15ms；用 Notify 或 Write Without Response 免逐包 ACK；2M PHY 空口速率翻倍；应用层用二进制协议、合并小包。</p><p>1M PHY、MTU 247、每事件 4 包、15ms，理论约 65KB/s（520kbps），实际受手机、协议栈、干扰影响常见 100~700kbps。延迟 ≈ 间隔×(1+latency)+处理时间，实时控制用 15~30ms、latency=0，别用 Indicate。大文件、固件包有 Wi-Fi 就用 Wi-Fi。</p>`,
        answer: `<p><b>先算默认值有多低：</b>ATT MTU 默认 23，实际载荷 20 字节；连接间隔 30ms，每个连接事件通常只发 1 包。吞吐 ≈ 20B / 30ms ≈ <b>667 B/s ≈ 5.3 kbps</b>。这就是“BLE 很慢”的来源。</p>
<p><b>吞吐公式：</b><code>吞吐 = 每个连接事件的包数 × 每包有效载荷 / 连接间隔</code>。四个变量都能优化：</p>
<ol>
<li><b>提高每包载荷：</b>协商 ATT MTU（23 → 247/517），同时开启 LL DLE（Data Length Extension，PDU 251 字节）。这样一包能带 244 字节左右，而不是 20。</li>
<li><b>提高每事件包数：</b>连接事件内可以连续发多包（MD 位），受协议栈和手机能力限制。很多手机每个事件能发 4~6 包。</li>
<li><b>缩短连接间隔：</b>15ms 比 30ms 多一倍机会，但功耗上升；要结合业务。</li>
<li><b>用 Notify / Write Without Response：</b>不需要逐包 ACK，吞吐最高；Indicate / Write With Response 每包都要等确认，慢很多。</li>
<li><b>2M PHY：</b>空口速率翻倍，单包时间减半，适合大流量、短距离。</li>
<li><b>减少应用层开销：</b>二进制协议代替 JSON，合并小包，去掉重复字段；每包头部越短，有效载荷占比越高。</li>
</ol>
<p><b>实际能到多少：</b>1M PHY、MTU 247、每事件 4 包、15ms 间隔，理论约 <code>244×4/0.015 ≈ 65 KB/s ≈ 520 kbps</code>；2M PHY 可以更高。实际受手机、协议栈、干扰影响，常见 100~700 kbps。不要拿理论值当承诺。</p>
<p><b>延迟怎么降：</b>延迟 ≈ 连接间隔 × (1 + slave latency) + 处理时间。实时控制用 interval 15~30ms、latency=0；不要用 Indicate；手机侧避免排队；应用层不要做无谓的重试。</p>
<p><b>什么时候不该用 BLE 传：</b>大文件、固件包（几百 KB 以上）BLE 能传但很慢，有 Wi-Fi 就用 Wi-Fi；BLE 更适合小数据、低频控制。</p>`,
        principle: `<p>BLE 的吞吐不是由“空中速率”单独决定的，而是由“每个连接事件能搬多少有效数据”决定。连接事件有固定的开销（ preamble、access address、header、CRC、IFS），包越小，开销占比越高。</p>
<p>MTU 和 DLE 要同时开：只协商 ATT MTU 但 LL PDU 还是 27 字节，数据仍会被分片；只开 DLE 但 ATT MTU 还是 23，应用层仍然只能发 20 字节。两层要匹配。</p>`,
        fig: {
          type: "table",
          title: "BLE 吞吐优化手段",
          tag: "ble-throughput",
          head: ["手段", "默认", "优化后", "代价"],
          rows: [
            ["ATT MTU", "23（20B 载荷）", "247 / 517", "RAM、兼容性"],
            ["LL DLE", "27B PDU", "251B PDU", "协议栈支持"],
            ["PHY", "1M", "2M", "距离略短"],
            ["每事件包数", "1", "4~6", "手机/协议栈限制"],
            ["传输方式", "Indicate/Write Rsp", "Notify/Write Cmd", "可靠性靠应用层"],
            ["连接间隔", "30ms", "15ms", "功耗上升"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_fast.c",
          src: `/* 连接后：先协商 MTU，再请求 2M PHY，最后调整连接参数 */
static int gap_event_handler(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            uint16_t h = event->connect.conn_handle;

            /* 1. ATT MTU：手机和协议栈取较小值 */
            ble_att_set_preferred_mtu(247);
            ble_gattc_exchange_mtu(h, NULL, NULL);

            /* 2. 2M PHY（BLE 5） */
            ble_gap_set_prefered_phy(h,
                BLE_GAP_LE_PHY_2M_MASK, BLE_GAP_LE_PHY_2M_MASK, 0);

            /* 3. 连接参数：15ms，latency 0，实时优先 */
            ble_gap_upd_params_t p = { 0 };
            p.itvl_min = BLE_GAP_CONN_ITVL_MS(15);
            p.itvl_max = BLE_GAP_CONN_ITVL_MS(15);
            p.latency  = 0;
            p.supervision_timeout = 500;      /* 5s */
            ble_gap_update_params(h, &p);
        }
        break;

    default:
        break;
    }
    return 0;
}

/* 发送：Notify，不带逐包确认；关键数据在应用层加序号/确认 */
int ble_send_fast(uint16_t conn_handle, const uint8_t *data, uint16_t len)
{
    /* 实际长度受协商后的 MTU-3 限制，超出要应用层分包 */
    return ble_gatts_notify(conn_handle, chr_handle, data, len);
}`
        },
        codeNote: "MTU 协商是 client 发起、双方取较小值；手机不支持 247 时只能退回更小值。不要假设“设了 247 就一定生效”，连接后要读回实际 MTU。",
        apply: `<p>做 BLE 数据采集时，最初每包 20 字节、30ms 一包，传 10KB 数据要十几秒。后来协商 MTU 247、开 DLE、改 Notify、连接间隔 15ms，同样数据 1 秒多传完。功耗反而没有明显上升，因为总传输时间缩短了。</p>
<p>但换到另一款手机上，MTU 只能到 185，2M PHY 也不支持，吞吐直接减半。所以 BLE 性能优化必须按目标机型实测，不能只按芯片手册写参数。</p>`,
        pitfalls: [
          "<b>只改 MTU 不改 DLE。</b>链路层仍然分片，吞吐提升有限。",
          "<b>用 Indicate 传实时数据。</b>每包等确认，延迟和吞吐都很差。",
          "<b>假设 MTU 一定协商成功。</b>手机可能拒绝或给更小值，要读回实际值。",
          "<b>把理论吞吐写进产品规格。</b>实际受手机、干扰、协议栈影响，通常只有理论值的一半左右。"
        ],
        follow: [
          ["为什么默认只能发 20 字节？", "ATT MTU 默认 23，减去 1 字节 opcode 和 2 字节句柄，剩下 20 字节给值。想发更多必须协商 MTU。"],
          ["Notify 丢了怎么办？", "BLE 链路层有重传，连接期间一般不会丢；但断线期间的数据会丢。关键数据要在应用层加序号和确认，或者缓存后补发。"],
          ["2M PHY 会缩短距离吗？", "会。2M PHY 的接收灵敏度通常比 1M 低几个 dB，相同发射功率下距离略短。近距离大流量用 2M，远距离用 1M/Coded。"],
          ["连接间隔越小延迟越低吗？", "总体是，但还要看 slave latency、每个连接事件能发多少包、手机处理速度。interval 15ms + latency 0 通常已经能满足大多数实时控制。"]
        ]
      },

      {
        id: "M-52",
        chapter: "wireless",
        topic: "ble-link",
        title: "一台 BLE 设备能同时连接多个手机或传感器吗？多设备连接怎么实现？",
        diff: "高级",
        freq: "中频",
        type: "方案设计题",
        point: "BLE 星型拓扑、Central/Peripheral 多连接能力、协议栈连接数上限，以及连接句柄与上下文管理。",
        q: `<p>面试官：一个 BLE 网关要同时连 10 个传感器，还要被手机连接。硬件和协议栈上要注意什么？BLE 能像 Mesh 一样组网吗？</p>`,
        exam: `<p>考察多连接的实际限制。能说清“星型拓扑、连接数受 RAM/协议栈限制、每条连接独立参数”，并区分 BLE Mesh，就很好。</p>`,
        core: `<p>BLE 是星型拓扑，不是 Mesh。一个 Central 可以同时连多个 Peripheral；一个 Peripheral 能不能连多个 Central，取决于协议栈和硬件资源。每条连接是独立的点对点链路，有自己的连接句柄、参数、加密状态和 GATT 上下文。</p><p>限制：最大连接数由 Controller 和协议栈决定（ESP32 常见 3~7，Nordic S132 可到 20）；每条连接都要 TX/RX 缓冲、LL 上下文、GATT 状态和密钥，RAM 很紧；所有连接共享一套射频，事件不能重叠，连接越多、间隔越短越难调度。</p><p>实现：建立句柄到设备上下文的映射表，回调按句柄取上下文防串台；扫描用白名单或服务 UUID 过滤；每条连接独立做服务发现、MTU 协商和绑定；限制并发数，超了排队或拒绝；监控 RSSI 和丢包。多连接会显著抬高平均电流，电池设备要谨慎。大规模组网应选 BLE Mesh、Thread 或 Zigbee，而不是硬堆连接。</p>`,
        answer: `<p><b>BLE 是星型拓扑，不是 Mesh。</b>一个 Central 可以同时连多个 Peripheral；一个 Peripheral 能不能连多个 Central，取决于协议栈和硬件资源。每个连接都是独立的点对点链路，有自己的连接句柄、参数、加密状态和 GATT 上下文。</p>
<p><b>谁连谁：</b></p>
<ul>
<li><b>网关/手机作为 Central</b>：可以连多个传感器（Peripheral）。这是最常见的多设备方案。</li>
<li><b>设备作为 Peripheral</b>：通常只接受一个 Central 连接；支持多连接的协议栈可以同时被多个手机连，但要处理“哪个手机有控制权”。</li>
<li><b>设备同时做 Central + Peripheral</b>：可以既连传感器、又被手机连，但射频时间要分给多条连接，功耗和延迟都会上升。</li>
</ul>
<p><b>硬件/协议栈限制：</b></p>
<ul>
<li><b>最大连接数</b>：由 Controller 和协议栈配置决定。ESP32 常见 3~7 条（受配置和 RAM 限制），Nordic S132 可到 20 条，具体看型号和配置。</li>
<li><b>RAM</b>：每条连接都要 TX/RX 缓冲、LL 上下文、GATT 状态、加密密钥，连接越多 RAM 越紧张。</li>
<li><b>射频调度</b>：所有连接共享一套射频，连接事件不能重叠。连接越多、间隔越短，调度越困难，容易出现事件冲突和延迟。</li>
<li><b>连接参数</b>：每条连接可以独立设置 interval/latency/PHY，但总占空比不能超过射频能力。</li>
</ul>
<p><b>实现要点：</b></p>
<ol>
<li>建立<b>连接句柄 → 设备上下文</b>的映射表，所有回调都按句柄取上下文，避免数据串台。</li>
<li>扫描时用白名单/服务 UUID 过滤，只连目标设备；连接超时和失败要重试。</li>
<li>每条连接独立做服务发现、MTU 协商、加密/绑定；不要共用一套 GATT 缓存。</li>
<li>限制同时连接数，超过上限时排队或拒绝；给关键设备预留连接槽。</li>
<li>监控每条连接的 RSSI、丢包、延迟，弱信号设备及时断开重连。</li>
<li>功耗：多连接会显著增加平均电流，电池设备要谨慎；能轮询/分时连接就不要一直保持。</li>
</ol>
<p><b>和 BLE Mesh 的区别：</b>Mesh 是多跳、泛洪/路由的组网协议，节点之间可以互相转发；普通 BLE 多连接是“一个中心连多个外设”的星型，外设之间不通信。要做大规模组网，应该选 BLE Mesh、Thread 或 Zigbee，而不是硬堆 BLE 连接。</p>`,
        principle: `<p>BLE 的链路层是点对点的：每条连接有独立的 Access Address、信道图和连接事件。多连接的本质是“一个 Controller 在时间轴上调度多条点对点链路”，不是共享一条广播域。</p>
<p>连接数上限不是“协议规定”，而是芯片 RAM、协议栈实现和射频调度能力的综合结果。选型时要看官方支持的最大连接数和实际吞吐，不要只看“支持 BLE 5”。</p>`,
        fig: {
          type: "table",
          title: "多连接的能力与限制",
          tag: "ble-multi",
          head: ["角色", "能连多少", "主要限制"],
          rows: [
            ["Central 连多个 Peripheral", "协议栈上限（常见 3~20）", "RAM、射频调度、功耗"],
            ["Peripheral 被多个 Central 连", "取决于协议栈", "控制权、RAM、功耗"],
            ["同时 Central + Peripheral", "两边都占资源", "调度复杂、延迟上升"],
            ["BLE Mesh", "理论上千节点", "多跳、中继、功耗，不是点对点"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_multi_conn.c",
          src: `/* 每条连接一个上下文，按连接句柄索引 */
#define MAX_CONN  8

typedef struct {
    uint16_t handle;
    uint8_t  addr[6];
    uint8_t  used;
    uint16_t chr_handle;
    uint32_t last_rx_ms;
} conn_ctx_t;

static conn_ctx_t s_conn[MAX_CONN];

static conn_ctx_t *ctx_alloc(uint16_t handle, const uint8_t *addr)
{
    for (int i = 0; i < MAX_CONN; i++) {
        if (!s_conn[i].used) {
            memset(&s_conn[i], 0, sizeof(s_conn[i]));
            s_conn[i].handle = handle;
            memcpy(s_conn[i].addr, addr, 6);
            s_conn[i].used = 1;
            return &s_conn[i];
        }
    }
    return NULL;                        /* 超过上限，拒绝连接 */
}

static conn_ctx_t *ctx_find(uint16_t handle)
{
    for (int i = 0; i < MAX_CONN; i++) {
        if (s_conn[i].used && s_conn[i].handle == handle) {
            return &s_conn[i];
        }
    }
    return NULL;
}

static int gap_event_handler(struct ble_gap_event *event, void *arg)
{
    switch (event->type) {
    case BLE_GAP_EVENT_CONNECT:
        if (event->connect.status == 0) {
            conn_ctx_t *c = ctx_alloc(event->connect.conn_handle,
                                      event->connect.peer_addr);
            if (!c) {
                ble_gap_terminate(event->connect.conn_handle,
                                  BLE_ERR_CONN_LIMIT);
            }
        }
        break;

    case BLE_GAP_EVENT_DISCONNECT: {
        conn_ctx_t *c = ctx_find(event->disconnect.conn.conn_handle);
        if (c) c->used = 0;
        break;
    }

    case BLE_GAP_EVENT_NOTIFY_RX: {
        conn_ctx_t *c = ctx_find(event->notify_rx.conn_handle);
        if (c) {
            c->last_rx_ms = millis();
            app_on_data(c, event->notify_rx.om);
        }
        break;
    }

    default:
        break;
    }
    return 0;
}`
        },
        codeNote: "连接句柄会被复用：断开后同一条连接槽可能分配给新设备。上下文必须在 DISCONNECT 时清空，不能只按句柄查旧数据。",
        apply: `<p>做 BLE 网关时，最初用一个全局变量存“当前连接的传感器”，连第二台就覆盖了第一台。后来改成连接句柄索引的上下文数组，并在断开时清空，才稳定支持 7 台传感器。</p>
<p>还遇到“连到第 5 台就开始丢包”：连接间隔都是 30ms，7 条连接的连接事件在时间轴上打架。把传感器上报周期错开、连接间隔改成 100ms 并开 latency 后，调度才顺畅。多连接不是“能连上就行”，射频时间是硬约束。</p>`,
        pitfalls: [
          "<b>把所有连接的数据存在一个全局变量里。</b>多设备时互相覆盖。",
          "<b>忽略连接句柄复用。</b>断开后旧上下文没清，新连接读到旧数据。",
          "<b>连接数超过协议栈上限。</b>表现为连不上或随机断开，不一定是射频问题。",
          "<b>把 BLE 多连接当 Mesh 用。</b>外设之间不能直接通信，需要网关转发。"
        ],
        follow: [
          ["手机能同时连多少 BLE 设备？", "不同手机/系统不同，Android 常见 7 个左右，iOS 也有限制；实际可用数量受芯片、系统调度和 App 影响。超过上限会连接失败或频繁断开。"],
          ["多连接时如何降低功耗？", "增大连接间隔、使用 slave latency、错开各设备的连接事件、批量上报、弱信号设备及时断开。多连接的平均电流通常比单连接高一个量级。"],
          ["BLE Mesh 和普通多连接怎么选？", "设备之间需要互相通信、节点多、要覆盖大范围 → Mesh/Thread/Zigbee；只是网关连若干传感器、星型拓扑 → 普通 BLE 多连接更简单。"]
        ]
      },

      {
        id: "M-53",
        chapter: "wireless",
        topic: "ble-link",
        title: "BLE 使用哪个频段、哪些通道？为什么广播只占 3 个通道？",
        diff: "中级",
        freq: "中频",
        type: "协议细节题",
        point: "2.4GHz 的 40 个 2MHz 信道、37 个数据信道与 3 个广播信道，以及跳频/AFH 与 Wi-Fi 共存。",
        q: `<p>面试官：BLE 工作在什么频段？一共有多少通道？为什么广播只用 37、38、39 这三个？</p>`,
        exam: `<p>考察 BLE 射频基础。能说清“40 个 2MHz 信道、3 个广播信道位于频段边缘/中心、AFH 避开干扰”，就很好。</p>`,
        core: `<p>2.4GHz ISM，2402~2480MHz，信道间隔 2MHz，共 40 个：3 个广播信道 37（2402）、38（2426）、39（2480），37 个数据信道 0~36，连接后在数据信道跳频。</p><p>广播只用 3 个：降低发现成本，扫描者能快速轮询；37 在最低端、39 在最高端、38 在中心，尽量错开 Wi-Fi 的 1/6/11；三个信道分散在频段不同位置，一个被干扰另两个仍可能工作。</p><p>连接跳频按信道图和跳频增量 5~16 跳变，支持 AFH 根据误码把坏信道标为不可用，从而和 Wi-Fi、Zigbee 共存。Wi-Fi 20MHz 信道会覆盖多个 BLE 信道，比如信道 6 覆盖 38 附近和部分数据信道；AFH 能避开数据信道，但广播 37/38/39 改不了，广播阶段仍可能被干扰。BLE 4.x 用 CSA#1 计算下一信道，BLE 5 引入 CSA#2，分布更均匀、抗干扰更好，由双方协商。</p>`,
        answer: `<p><b>频段：</b>BLE 工作在 <b>2.4GHz ISM 频段</b>，频率范围 2402~2480MHz。信道间隔 <b>2MHz</b>，共 <b>40 个信道</b>。</p>
<p><b>通道划分：</b></p>
<ul>
<li><b>3 个广播信道</b>：37（2402MHz）、38（2426MHz）、39（2480MHz）。</li>
<li><b>37 个数据信道</b>：0~36，连接建立后在数据信道上跳频通信。</li>
</ul>
<p><b>为什么广播只用 3 个：</b></p>
<ol>
<li><b>降低发现成本</b>：广播设备不知道谁在听，必须在固定信道上反复发；只用 3 个信道可以让扫描者快速轮询，减少发现时间。</li>
<li><b>避开 Wi-Fi 主信道</b>：37 在频段最低端、39 在最高端、38 在中心，尽量错开 Wi-Fi 的 1/6/11（2412/2437/2462MHz）。虽然不能完全避免重叠，但比均匀分布更优。</li>
<li><b>抗干扰冗余</b>：三个信道分散在频段的不同位置，某一个被干扰，另外两个仍可能工作。</li>
</ol>
<p><b>连接后的跳频：</b>连接使用 37 个数据信道，按信道图和跳频增量（5~16）跳变。BLE 支持 <b>AFH（Adaptive Frequency Hopping）</b>：根据各信道的误码/干扰情况，把坏信道标记为不可用，只用好信道。这样能和 Wi-Fi、Zigbee 等共存。</p>
<p><b>和 Wi-Fi 的关系：</b>Wi-Fi 的 20MHz 信道会覆盖多个 BLE 信道。例如 Wi-Fi 信道 6（2437MHz）会覆盖 BLE 的 38 附近和数据信道的一部分。BLE 的 AFH 会避开这些信道，但广播信道 37/38/39 不能改，所以广播阶段仍可能被 Wi-Fi 干扰。工程上要尽量让 Wi-Fi 选空闲信道，或让 BLE 降低广播频率。</p>
<p><b>CSA#1 和 CSA#2：</b>BLE 4.x 用 CSA#1 计算下一个数据信道，BLE 5.0 引入 CSA#2，分布更均匀、抗干扰更好。具体用哪个由连接双方协商。</p>`,
        principle: `<p>2MHz 的信道间隔是 BLE 为了低功耗和简单实现做的取舍：比经典蓝牙的 1MHz 宽，跳频选择更多，抗窄带干扰更好；又不像 Wi-Fi 那样需要 20MHz，适合低速率、低功耗。</p>
<p>广播信道固定在 3 个，是为了让“无连接发现”有确定的 rendezvous 点；连接后才有信道图，可以动态避开干扰。这是“发现简单、通信灵活”的设计。</p>`,
        fig: {
          type: "table",
          title: "BLE 信道划分",
          tag: "ble-channels",
          head: ["类别", "数量", "频率", "用途"],
          rows: [
            ["广播信道 37", "1", "2402MHz", "广播/扫描/建连"],
            ["广播信道 38", "1", "2426MHz", "广播/扫描/建连"],
            ["广播信道 39", "1", "2480MHz", "广播/扫描/建连"],
            ["数据信道 0~36", "37", "2404~2478MHz", "连接后的跳频通信"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_channels.c",
          src: `/* 广播参数：三个广播信道由 Controller 自动轮发，应用不用选 */
void ble_adv_channels(void)
{
    ble_gap_adv_params_t adv = { 0 };

    adv.conn_mode = BLE_GAP_CONN_MODE_UND;
    adv.disc_mode = BLE_GAP_DISC_MODE_GEN;
    adv.itvl_min  = BLE_GAP_ADV_ITVL_MS(100);
    adv.itvl_max  = BLE_GAP_ADV_ITVL_MS(100);

    /* 没有“只发 37 信道”这种常规配置；
     * 三个广播信道由链路层按规范轮发。 */
    ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER,
                      &adv, gap_event_handler, NULL);
}

/* 连接后查看当前信道图（调试用） */
void ble_dump_channel_map(uint16_t conn_handle)
{
    uint8_t map[5] = { 0 };

    if (ble_gap_get_channel_map(conn_handle, map) == 0) {
        for (int ch = 0; ch < 37; ch++) {
            int used = (map[ch / 8] >> (ch % 8)) & 1;
            if (!used) {
                log_info("channel %d is marked bad", ch);
            }
        }
    }
}`
        },
        codeNote: "应用层通常不能指定广播信道，也不应该手动改信道图；AFH 由链路层根据质量自动维护。调试时最多读出来看，不要硬改。",
        apply: `<p>做过一款 BLE 设备放在 Wi-Fi 路由器旁边，广播距离明显变短。抓空口发现 38 信道（2426MHz）正好落在路由器信道 6 的范围内，广播丢包严重。后来把 Wi-Fi 换到 1 信道、BLE 广播间隔加长，发现成功率才恢复。</p>
<p>连接后的数据反而更稳，因为 AFH 会把被 Wi-Fi 占用的数据信道标记掉。这也说明：广播阶段比连接阶段更怕固定频段干扰，配网时尽量让设备远离路由器。</p>`,
        pitfalls: [
          "<b>以为 BLE 可以随便选广播信道。</b>广播固定 37/38/39，应用改不了。",
          "<b>以为 BLE 和 Wi-Fi 频率不同不会干扰。</b>2.4GHz 频段重叠，Wi-Fi 20MHz 会盖住多个 BLE 信道。",
          "<b>把 AFH 当万能。</b>它只能避开数据信道干扰，广播信道仍然暴露。",
          "<b>手动改信道图。</b>会破坏链路层的自适应逻辑，可能导致连接不稳。"
        ],
        follow: [
          ["BLE 为什么用 GFSK 调制？", "GFSK 实现简单、功耗低、抗幅度干扰好，适合低速率短包；代价是频谱效率不如 OFDM/QAM，所以 BLE 的速率上限不高。"],
          ["AFH 需要多久生效？", "需要积累各信道的质量样本，通常要一段时间；刚连上或环境突变时，效果有限。信道图更新由 master 决定。",],
          ["BLE 和 Wi-Fi 能同时用同一个天线吗？", "可以，但需要共存仲裁和时分切换；单天线方案要仔细设计射频开关和隔离，否则一方发射时另一方接收会被阻塞。"]
        ]
      },

      {
        id: "M-54",
        chapter: "wireless",
        topic: "ble-link",
        title: "BLE 的数据怎么编解码？调试蓝牙收发常见哪些坑？",
        diff: "高级",
        freq: "中频",
        type: "工程实践题",
        point: "特征值字节流的帧设计、端序/对齐/MTU 分包，以及 CCCD、写类型、UUID、缓存等常见调试坑。",
        q: `<p>面试官：手机和 BLE 设备之间传自定义数据，你会怎么定义格式？调试时遇到“发了但收不到”“收到的是乱码”怎么排查？</p>`,
        exam: `<p>考察实际 BLE 应用开发经验。能说清“特征值只是字节流、要自己定帧”“不要直接发结构体”“MTU 20 字节分包”，就很好。</p>`,
        core: `<p>GATT 特征值就是一串字节，没有类型、帧头、端序约定，怎么解释完全由应用层决定。推荐帧：版本 1B + 命令 1~2B + 序号 1~2B + 长度 1~2B + 载荷 + CRC16。</p><p>编解码：不要直接 <code>memcpy</code> 结构体（对齐填充、编译器差异、端序都会让手机端对不上），要逐字段序列化并明确字节序；统一大端或明确小端；浮点用 IEEE754 或定点（×100 存 int16）；字符串用 UTF-8 + 长度，不假设 <code>\0</code> 结尾；位标志用掩码并写文档，不要用 C 位域跨平台；按 MTU 分包，默认每包 20 字节，长数据按 offset/序号重组；Notify 断线会丢，关键数据加序号和 ACK 重传。</p><p>常见坑：没开 CCCD（没写 <code>0x2902</code> 永远收不到通知）；Write Request 和 Write Command 用错；UUID/handle 错或硬编码旧固件的 handle；MTU 没协商导致长包被截断；端序和结构体对齐对不上；iOS 缓存旧 GATT 结构，要重启蓝牙或换设备名；连接间隔太长看起来像丢包。工具用 nRF Connect/LightBlue，设备端打印 hex，有条件抓空口或 HCI 日志。</p>`,
        answer: `<p><b>先理解：GATT 特征值就是一串字节，没有类型、没有帧头、没有端序约定。</b>协议栈只负责把字节送到对面，怎么解释完全由应用层决定。</p>
<p><b>推荐的应用层帧：</b>版本（1B）+ 命令（1B/2B）+ 序号（1B/2B）+ 长度（1B/2B）+ 载荷 + CRC16。和串口/网络的帧设计思路一致，只是传输层换成了 GATT。</p>
<p><b>编解码要点：</b></p>
<ul>
<li><b>不要直接 memcpy 结构体。</b>C 结构体有对齐填充、编译器差异、端序差异，手机端（Java/Kotlin/Swift）解析会对不上。逐字段序列化，明确每个字段的字节序。</li>
<li><b>统一端序。</b>建议网络字节序（大端）或明确约定小端；多字节整数、浮点都要写清楚。浮点可以用 IEEE754 或定点（×100 存 int16）。</li>
<li><b>字符串</b>用 UTF-8 + 长度字段，不要假设以 <code>\\0</code> 结尾。</li>
<li><b>位标志</b>用一个字节的掩码，文档写清每一位的含义；不要用 C 位域跨平台传输。</li>
<li><b>MTU 分包：</b>默认 ATT MTU 23，一包最多 20 字节。长数据要按 offset 分片，接收端按序号/offset 重组；协商 MTU 后按实际值分包。</li>
<li><b>可靠性：</b>Notify 不保证应用层不丢（断线会丢），关键数据加序号 + ACK/重传；Indicate 有逐包确认但慢。</li>
</ul>
<p><b>常见调试坑：</b></p>
<ol>
<li><b>没开 CCCD</b>：特征值支持 Notify，但手机没写 0x2902，永远收不到通知。</li>
<li><b>写类型不对</b>：Write Request 需要响应，Write Command 不需要；特征值只支持一种时，另一种会失败。</li>
<li><b>UUID/句柄错</b>：服务发现后没缓存正确的 handle，或者硬编码了旧固件的 handle。</li>
<li><b>MTU 没协商</b>：以为能发 200 字节，实际每包只发 20 字节，长包被截断。</li>
<li><b>端序/结构体对齐</b>：设备发小端，手机按大端解析；或者结构体有 padding，长度对不上。</li>
<li><b>iOS GATT 缓存</b>：服务/特征值变更后，iOS 可能缓存旧结构，需要重启蓝牙或换设备名。</li>
<li><b>连接间隔太长</b>：一包要等几十毫秒，看起来像“丢包”，其实是慢。</li>
</ol>
<p><b>调试工具：</b>nRF Connect / LightBlue 看服务、读写、开通知；设备端打印原始 hex；有条件用 Ellisys/Frontline 抓空口，或者抓 HCI 日志。</p>`,
        principle: `<p>BLE 的分层把“传输”和“语义”分开：GATT 只保证字节按特征值送达，应用层要自己定义帧、端序、分包和可靠性。把它当成“无连接的串口”来设计，思路就顺了。</p>
<p>MTU 是 ATT 层的概念，不是 GATT 特征值的属性。同一条连接上所有特征值共享一个 ATT MTU；协商一次，全局有效。</p>`,
        fig: {
          type: "table",
          title: "BLE 应用层常见问题",
          tag: "ble-debug",
          head: ["现象", "常见原因", "排查"],
          rows: [
            ["收不到通知", "CCCD 未使能、权限不对", "用 nRF Connect 看 0x2902"],
            ["写入失败", "Write Rsp/Cmd 类型不匹配", "查特征值 flags"],
            ["数据被截断", "MTU 仍是 23", "读回实际 MTU"],
            ["解析乱码", "端序/结构体对齐不一致", "打印原始 hex 对照"],
            ["偶发丢包", "断线、连接间隔长、没重传", "加序号/ACK，看连接事件"],
            ["换固件后读写错", "硬编码 handle", "按 UUID 重新发现"]
          ]
        },
        code: {
          lang: "c",
          title: "ble_codec.c",
          src: `/* 应用层帧：ver(1) + cmd(1) + seq(1) + len(1) + payload + crc16(2) */
#define BLE_FRAME_MAX  244

typedef struct {
    uint8_t ver;
    uint8_t cmd;
    uint8_t seq;
    uint8_t len;
    uint8_t payload[BLE_FRAME_MAX - 6];
} ble_frame_t;

/* 逐字段序列化，明确小端；不要直接 memcpy 结构体 */
int ble_frame_encode(uint8_t *out, uint8_t cmd, uint8_t seq,
                     const uint8_t *data, uint8_t len)
{
    if (len > BLE_FRAME_MAX - 6) return -1;

    int i = 0;
    out[i++] = 0x01;                 /* ver */
    out[i++] = cmd;
    out[i++] = seq;
    out[i++] = len;
    memcpy(&out[i], data, len);
    i += len;

    uint16_t crc = crc16_ccitt(out, (uint16_t)i);
    out[i++] = (uint8_t)(crc & 0xFF);
    out[i++] = (uint8_t)(crc >> 8);
    return i;
}

/* 解码：先校验长度/CRC，再分发命令 */
int ble_frame_decode(const uint8_t *buf, int n, ble_frame_t *f)
{
    if (n < 6) return -1;
    if (buf[0] != 0x01) return -2;

    uint8_t len = buf[3];
    if (len > BLE_FRAME_MAX - 6 || n != len + 6) return -3;

    uint16_t crc_rx = (uint16_t)(buf[n - 2] | (buf[n - 1] << 8));
    if (crc16_ccitt(buf, (uint16_t)(n - 2)) != crc_rx) return -4;

    f->ver = buf[0];
    f->cmd = buf[1];
    f->seq = buf[2];
    f->len = len;
    memcpy(f->payload, &buf[4], len);
    return 0;
}

/* 长数据按 MTU 分片：每片带 offset，接收端重组 */
int ble_send_chunked(uint16_t conn, uint16_t mtu,
                     const uint8_t *data, uint16_t total)
{
    uint16_t chunk = (uint16_t)(mtu - 3);       /* ATT 头 3 字节 */
    uint16_t off = 0;

    while (off < total) {
        uint16_t n = (uint16_t)((total - off) < chunk ? (total - off) : chunk);
        uint8_t buf[3 + 244];

        buf[0] = 0x02;                           /* 分片命令 */
        buf[1] = (uint8_t)(off & 0xFF);
        buf[2] = (uint8_t)(off >> 8);
        memcpy(&buf[3], data + off, n);

        if (ble_gatts_notify(conn, chr_handle, buf, (uint16_t)(n + 3)) != 0) {
            return -1;
        }
        off = (uint16_t)(off + n);
    }
    return 0;
}`
        },
        codeNote: "分片大小要用“协商后的实际 MTU - 3”，不是固定 20，也不是固定 244。每次连接都要重新协商、重新读回。",
        apply: `<p>做 BLE 灯控时，手机发“设置颜色”命令，设备收到的 RGB 总是偏。查了半天发现手机按大端发，设备按小端解析。后来在协议文档里明确所有多字节字段用大端，并在代码里统一用 <code>be16()</code>/<code>be32()</code>，问题消失。</p>
<p>另一个项目是 OTA 传输：每包 20 字节，最后 10KB 一直校验失败。定位到“分片序号”只用了 1 字节，超过 255 片就回绕；改成 2 字节 offset 后正常。BLE 分包一定要考虑长度上限和回绕。</p>`,
        pitfalls: [
          "<b>直接发送 C 结构体。</b>padding、端序、编译器差异会让手机解析错位。",
          "<b>忘记开 CCCD。</b>设备 notify 了，但手机根本没订阅。",
          "<b>固定按 20 字节分包。</b>MTU 协商到 247 后仍然浪费；应按实际 MTU-3。",
          "<b>分片序号用 1 字节。</b>大文件超过 255 片就回绕，重组必错。",
          "<b>iOS 缓存旧 GATT。</b>服务改了但手机还按旧句柄访问，需要重启蓝牙/换设备名。"
        ],
        follow: [
          ["BLE 的 Notify 会丢数据吗？", "连接期间链路层有重传和 CRC，正常情况下不会因为空口噪声丢；但断线、缓冲区满、应用没及时处理会丢。关键数据要加序号和确认。"],
          ["特征值最大能发多少字节？", "受 ATT MTU 限制，单次 Notify/Write 的有效载荷是 MTU-3（1B opcode + 2B handle）。MTU 517 时最多 514 字节；超过要应用层分片。"],
          ["怎么抓 BLE 空口包？", "用 Ellisys、Frontline 等专用分析仪，或支持 BLE 嗅探的 Nordic Sniffer + Wireshark。普通手机只能看 GATT 层，抓不到链路层重传和加密内容。"]
        ]
      },

      {
        id: "M-55",
        chapter: "wireless",
        topic: "ble-perf",
        title: "BLE OTA 升级是怎么实现的？断线、断电怎么保证不刷坏？",
        diff: "高级",
        freq: "中频",
        type: "系统设计题",
        point: "Bootloader + OTA 服务 + 双 Bank/外置 Flash、分片校验、断点续传、签名验签与失败回滚。",
        q: `<p>面试官：你的 BLE 设备怎么做 OTA？升级到一半手机断开或者设备断电，会不会变砖？怎么保证新固件是可信的？</p>`,
        exam: `<p>考察系统设计能力。能说清“bootloader 负责验签和切换”“双 Bank/外置 Flash 保证可回滚”“分片 CRC + 断点续传”，就很好。</p>`,
        core: `<p>架构是 Bootloader + Application + OTA 服务。典型流程：手机发 START（镜像大小、版本、CRC/SHA256、分片大小）→ 设备检查空间和版本（防降级）、擦除目标区 → 分片传输并回 ACK → 全部收完校验 CRC/SHA256 和签名 → 写“升级标志 + 版本信息”（双份带序号）→ 重启 → Bootloader 验签校验、切换或搬运，失败回滚 → 新固件启动上报版本，手机确认后清标志。</p><p>防变砖：双 Bank A/B，新固件写备用 Bank、旧的不动，校验通过才切换；外置 Flash 方案先存外部再搬运，搬运要可恢复；单 Bank + Bootloader 下载模式最便宜也最危险，必须保证 Bootloader 不被擦除并有恢复通道；升级标志、长度、CRC、版本存两份带序号；记录已写 offset 支持断点续传；擦除搬运大块 Flash 时合理喂狗。</p><p>安全不能只做 CRC，CRC 防不了恶意固件，Bootloader 必须验数字签名（ECDSA/RSA），公钥烧在不可写区，版本单调递增防回滚，必要时加密镜像。BLE 默认 20 字节/包、30ms 间隔传 200KB 很慢，优化 MTU/DLE/2M PHY/Notify 后可到几十 KB/s。</p>`,
        answer: `<p><b>整体架构：</b>Bootloader + Application + OTA 服务（GATT 特征值）。Bootloader 负责“接收/校验/切换”，Application 负责“传输/进度/重启”。</p>
<p><b>典型流程：</b></p>
<ol>
<li>手机连接设备，发现 OTA 服务，发送 START：镜像大小、版本号、CRC/SHA256、分片大小。</li>
<li>设备检查空间和版本（防降级），擦除目标区域（外置 Flash 或备用 Bank）。</li>
<li>手机按 offset 发送数据分片（Write Without Response 或 Notify），设备写入并回 ACK（可按每 N 片或每片）。</li>
<li>全部收完后，设备校验整包 CRC/SHA256 和签名。</li>
<li>写入“升级标志 + 新版本信息”（双份/带序号，防掉电写坏），重启。</li>
<li>Bootloader 检查标志，验签/校验新固件，通过则切换/搬运，失败则回滚到旧固件。</li>
<li>启动新固件，上报版本；手机确认成功后清除标志。</li>
</ol>
<p><b>防变砖的关键：</b></p>
<ul>
<li><b>双 Bank（A/B）</b>：新固件写到备用 Bank，旧固件不动；校验通过才切换。失败直接继续跑旧固件。</li>
<li><b>外置 Flash 方案</b>：新固件先存外部 Flash，Bootloader 校验后再搬运到内部 Flash；搬运过程要可恢复。</li>
<li><b>单 Bank + Bootloader 下载模式</b>：成本最低但最危险，升级中断电可能两边都不完整；必须保证 Bootloader 本身不被擦除，并有恢复通道。</li>
<li><b>元数据双备份</b>：升级标志、镜像长度、CRC、版本号存两份，带序号/CRC；掉电时至少有一份有效。</li>
<li><b>断点续传</b>：设备记录已写入的 offset，重连后手机从 offset 继续，不用整包重传。</li>
<li><b>看门狗</b>：擦除/搬运大块 Flash 时喂狗要合理，不能因为升级导致复位循环。</li>
</ul>
<p><b>安全：</b>不能只做 CRC——CRC 只能防传输错误，防不了恶意固件。Bootloader 必须验证<b>数字签名</b>（ECDSA/RSA），公钥烧在不可写区域；版本号单调递增，防回滚；必要时加密镜像。</p>
<p><b>BLE 传输的现实：</b>默认 20 字节/包、30ms 间隔，传 200KB 要很久；优化 MTU/DLE/2M PHY/Notify 后能到几十 KB/s。升级时提醒用户保持手机屏幕常亮、靠近设备。</p>`,
        principle: `<p>OTA 的可靠性不取决于“传输有多快”，而取决于“失败后能不能恢复”。所以设计的核心是：旧固件始终可启动、新固件写入过程可中断、元数据写入原子化、启动前必须验签。</p>
<p>Bootloader 是信任链的根：它必须独立于 Application，升级时不能被覆盖；它验证新固件的签名，验证通过才跳转。没有验签的 OTA，等于给攻击者留了一个远程写固件的接口。</p>`,
        fig: {
          type: "flow",
          title: "BLE OTA 的完整流程",
          tag: "ble-ota",
          items: [
            { t: "START", d: "大小/版本/哈希/分片" },
            { t: "擦除目标区", d: "外置 Flash 或备用 Bank" },
            { t: "分片传输", d: "offset + 数据 + ACK" },
            { t: "整包校验", d: "CRC/SHA256 + 签名" },
            { t: "写升级标志", d: "双备份 + 序号" },
            { t: "重启进 Bootloader", d: "验签/切换/回滚" },
            { t: "新固件上报版本", d: "清除标志" }
          ]
        },
        code: {
          lang: "c",
          title: "ble_ota.c",
          src: `/* OTA 状态机：分片写入 + 断点记录 + 整包校验 */
typedef enum {
    OTA_IDLE = 0,
    OTA_RECEIVING,
    OTA_VERIFYING,
    OTA_READY,
    OTA_FAILED
} ota_state_t;

typedef struct {
    ota_state_t state;
    uint32_t total;
    uint32_t offset;          /* 已成功写入的字节数，用于续传 */
    uint32_t expect_crc;
    uint8_t  version[4];
} ota_ctx_t;

static ota_ctx_t s_ota;

int ota_start(uint32_t total, uint32_t crc, const uint8_t *ver)
{
    if (total == 0 || total > OTA_MAX_SIZE) return -1;
    if (ota_version_is_older(ver)) return -2;        /* 防回滚 */

    if (ota_prepare_slot(total) != 0) return -3;     /* 擦除/检查空间 */

    memset(&s_ota, 0, sizeof(s_ota));
    s_ota.state      = OTA_RECEIVING;
    s_ota.total      = total;
    s_ota.offset     = 0;
    s_ota.expect_crc = crc;
    memcpy(s_ota.version, ver, 4);

    ota_save_progress(&s_ota);                       /* 掉电可恢复 */
    return 0;
}

int ota_write(uint32_t offset, const uint8_t *data, uint16_t len)
{
    if (s_ota.state != OTA_RECEIVING) return -1;
    if (offset != s_ota.offset) return -2;           /* 只接受连续写入 */
    if (offset + len > s_ota.total) return -3;

    if (ota_write_slot(offset, data, len) != 0) return -4;

    s_ota.offset += len;
    ota_save_progress(&s_ota);
    return 0;
}

int ota_finish(void)
{
    s_ota.state = OTA_VERIFYING;

    uint32_t crc = ota_crc_slot(s_ota.total);
    if (crc != s_ota.expect_crc) {
        s_ota.state = OTA_FAILED;
        ota_abort_slot();
        return -1;
    }

    /* 关键：不仅 CRC，还要验签 */
    if (ota_verify_signature(s_ota.total) != 0) {
        s_ota.state = OTA_FAILED;
        ota_abort_slot();
        return -2;
    }

    s_ota.state = OTA_READY;
    ota_set_boot_flag(&s_ota);                       /* 双份写，带 CRC */
    return 0;
}

/* 重连后手机查询进度，从 offset 继续 */
uint32_t ota_resume_offset(void)
{
    return s_ota.state == OTA_RECEIVING ? s_ota.offset : 0;
}`
        },
        codeNote: "ota_save_progress 不能每包都写内部 Flash（擦写寿命和速度都不够），可以每 N KB 写一次外置 Flash/EEPROM，或者利用外置 Flash 的 offset 本身作为进度。",
        apply: `<p>做过一款 BLE 手环 OTA，最初没有双 Bank，升级中拔电直接变砖，只能返厂。后来改成“外部 SPI Flash 缓存 + Bootloader 校验后搬运”，并且元数据双备份，升级中断电最多回到旧版本，再也没砖过。</p>
<p>还踩过“只做 CRC 不做签名”的坑：CRC 能防止传输错误，但攻击者可以伪造一个 CRC 正确的恶意固件。加上 ECDSA 验签、版本号防回滚后，才算真正安全。</p>`,
        pitfalls: [
          "<b>单 Bank 直接覆盖运行中的固件。</b>升级中断电，新旧都不完整。",
          "<b>只校验 CRC，不验签。</b>防不了恶意固件，OTA 变成后门。",
          "<b>元数据只写一份。</b>写标志时掉电，标志损坏，设备不知道启动哪个。",
          "<b>不支持断点续传。</b>断线一次就要从头传，大镜像用户体验极差。",
          "<b>升级时不喂狗。</b>擦除大块 Flash 超过看门狗时间，复位循环。"
        ],
        follow: [
          ["双 Bank 和外置 Flash 方案怎么选？", "内部 Flash 够大、支持双 Bank → 双 Bank 最简单；内部 Flash 小 → 外置 Flash 缓存 + Bootloader 搬运；成本极紧 → 单 Bank + 恢复模式，但风险最高。"],
          ["OTA 镜像为什么要签名？", "CRC 只能发现传输错误，攻击者可以重新计算 CRC。签名用私钥生成、公钥验证，攻击者没有私钥就无法伪造合法固件。"],
          ["BLE OTA 一般能多快？", "默认 20 字节/包、30ms 间隔约 5kbps；优化 MTU/DLE/2M PHY/Notify 后可到几十 KB/s。200KB 镜像通常需要几十秒到几分钟，取决于手机和协议栈。"],
          ["升级失败怎么回滚？", "Bootloader 启动时检查升级标志和镜像校验结果；失败则清除标志、继续启动旧 Bank。关键是旧 Bank 在升级过程中不能被擦除。"]
        ]
      }
    ]
  });
})();