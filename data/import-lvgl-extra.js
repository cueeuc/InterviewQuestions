/* ============================================================
   import-lvgl-extra.js
   从 LVGL 相关面试问题导入的补充题（仅收录站内没有重复的）
   答案按 LVGL v8/v9 的实际移植方式重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("usb-display-bus", {
    chapters: [
      {
        id: "display",
        topics: [
          { id: "lvgl-input", title: "触摸与按键输入" },
          { id: "lvgl-perf", title: "刷新性能与调优" }
        ]
      }
    ],

    questions: [
      {
        id: "UB-11",
        chapter: "display",
        topic: "lvgl",
        title: "LVGL 的整体架构是怎样的？lv_init 之后要接哪些东西？",
        diff: "中级",
        freq: "高频",
        type: "框架理解题",
        point: "应用层/核心/移植层的分工，display、indev、tick 三件套，以及 lv_timer_handler 的主循环。",
        q: `<p>面试官：LVGL 移植到一块新屏上，除了 lv_init 还要做什么？显示、触摸、时钟分别怎么接进去？</p>`,
        exam: `<p>考察是否真正移植过 LVGL，而不是只改过现成工程。能说清“显示驱动、输入驱动、tick、主循环”四件事，就很好。</p>`,
        core: `<p>LVGL 分应用层、核心层和移植层；移植要做 tick、display flush_cb、input read_cb，并在主循环或 GUI 任务里周期调 lv_timer_handler。</p>`,
        answer: `<p><b>LVGL 分三层：</b></p>
<ul>
<li><b>应用层</b>：创建 screen/obj、设置样式、绑定事件、写业务逻辑。</li>
<li><b>核心层</b>：对象树、样式、布局、动画、渲染、定时器、输入处理。它不直接碰硬件。</li>
<li><b>移植层（port）</b>：显示驱动、输入驱动、tick 时基、内存/日志/文件系统等可选接口。你需要实现的就是这一层。</li>
</ul>
<p><b>lv_init 之后要做四件事：</b></p>
<ol>
<li><b>Tick 时基</b>：LVGL 用毫秒时基驱动动画、定时器、长按判断。v8 用 <code>lv_tick_inc(1)</code> 在 SysTick/定时器里累加；v9 可以用 <code>lv_tick_set_cb()</code> 直接注册一个返回毫秒的函数。时基不准，动画和滚动都会怪。</li>
<li><b>显示驱动</b>：准备一块（单缓冲）或两块（双缓冲）绘制缓冲区，注册 <code>flush_cb</code>。LVGL 渲染完一块区域后调用 flush_cb，你把像素搬到屏幕；搬完调用 <code>lv_disp_flush_ready()</code> 告诉它“可以复用缓冲区了”。</li>
<li><b>输入驱动</b>：触摸/按键/编码器注册为 <code>lv_indev</code>，提供 <code>read_cb</code>，LVGL 周期性调用它读取坐标和按下状态。</li>
<li><b>主循环</b>：在任务/主循环里周期性调用 <code>lv_timer_handler()</code>，它处理输入、动画、定时器、重绘。调用间隔决定响应速度，通常 5~30ms 一次。</li>
</ol>
<p><b>v8 和 v9 的接口差异：</b></p>
<ul>
<li>v8：<code>lv_disp_drv_t</code> / <code>lv_disp_draw_buf_t</code> / <code>lv_indev_drv_t</code>；flush_cb 参数是 <code>lv_disp_drv_t*</code> + area + color_p。</li>
<li>v9：<code>lv_display_t</code> / <code>lv_draw_buf_t</code> / <code>lv_indev_t</code>；flush_cb 参数变为 <code>lv_display_t*</code> + area + color_p；tick 用回调注册。</li>
</ul>
<p><b>主循环放哪里：</b>裸机放在 <code>while(1)</code> 里，RTOS 里单独建一个 GUI 任务，优先级不要太高，栈要够（渲染和控件递归很吃栈）。所有 LVGL 调用必须在同一个任务/上下文里，跨任务要加互斥锁。</p>`,
        principle: `<p>LVGL 的核心假设是“单线程、周期性调用”：它不创建线程，也不直接操作硬件。移植层把“屏幕、触摸、时间”抽象成回调，核心只负责“画什么、什么时候画”。</p>
<p>flush_cb 是异步刷新的关键：CPU 渲染下一块的同时，DMA/SPI 可以搬运上一块。调用 flush_ready 的时机决定能否真正并行，早了会撕裂，晚了会掉帧。</p>`,
        fig: {
          type: "flow",
          title: "LVGL 的运行闭环",
          tag: "lvgl-arch",
          items: [
            { t: "lv_timer_handler", d: "主循环周期性调用" },
            { t: "输入扫描", d: "read_cb 读触摸/按键" },
            { t: "事件/动画", d: "更新对象状态" },
            { t: "渲染脏区域", d: "画到 draw buffer" },
            { t: "flush_cb", d: "SPI/DMA 搬到屏幕" },
            { t: "flush_ready", d: "缓冲区可复用" }
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_port.c",
          src: `/* 以 LVGL v8 为例；v9 的 display/indev 类型名不同，思路一致 */
static lv_disp_draw_buf_t s_draw_buf;
static lv_color_t s_buf1[LCD_W * 40];       /* 局部缓冲：40 行 */
static lv_disp_drv_t s_disp_drv;
static lv_indev_drv_t s_indev_drv;

/* 屏幕刷新完成回调：由 SPI/DMA 传输完成中断调用 */
static void lcd_flush_done(void)
{
    lv_disp_flush_ready(&s_disp_drv);
}

/* LVGL 渲染完一块区域后调用：把像素搬到屏幕 */
static void disp_flush_cb(lv_disp_drv_t *drv,
                          const lv_area_t *area,
                          lv_color_t *color_p)
{
    lcd_set_window(area->x1, area->y1, area->x2, area->y2);

    /* 异步 DMA：传完在中断里调 lcd_flush_done() */
    lcd_start_dma((const uint8_t *)color_p,
                  lv_area_get_width(area) * lv_area_get_height(area) * 2);
}

/* 触摸读取：返回坐标和按下状态 */
static void touch_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data)
{
    int16_t x, y;
    bool pressed = touch_get_xy(&x, &y);

    data->point.x = x;
    data->point.y = y;
    data->state = pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

/* 1ms SysTick 回调：只做 tick 累加，不要在这里跑 LVGL */
static void systick_1ms_cb(void)
{
    lv_tick_inc(1);
}

void lvgl_port_init(void)
{
    lv_init();

    /* 1. tick：注册 1ms 回调 */
    systick_register_cb(systick_1ms_cb);

    /* 2. 显示 */
    lv_disp_draw_buf_init(&s_draw_buf, s_buf1, NULL, LCD_W * 40);
    lv_disp_drv_init(&s_disp_drv);
    s_disp_drv.hor_res  = LCD_W;
    s_disp_drv.ver_res  = LCD_H;
    s_disp_drv.flush_cb = disp_flush_cb;
    s_disp_drv.draw_buf = &s_draw_buf;
    lv_disp_drv_register(&s_disp_drv);

    /* 3. 输入 */
    lv_indev_drv_init(&s_indev_drv);
    s_indev_drv.type    = LV_INDEV_TYPE_POINTER;
    s_indev_drv.read_cb = touch_read_cb;
    lv_indev_drv_register(&s_indev_drv);

    /* 4. 主循环里周期性调用 lv_timer_handler() */
}`
        },
        codeNote: "上面是 v8 写法；v9 中 draw_buf 要先用 lv_draw_buf_init 创建，flush_cb 的第一个参数是 lv_display_t*。移植前先确认工程用的 LVGL 版本，别混用 API。",
        apply: `<p>第一次移植 LVGL 时只接了显示，忘了 tick，结果按钮能显示但动画不动、长按没反应。补上 1ms tick 后一切正常。后来又忘了在 DMA 传输完成后调 <code>lv_disp_flush_ready</code>，画面只刷新第一块就停住——LVGL 一直在等缓冲区“还回来”。</p>
<p>还遇到主循环调用 <code>lv_timer_handler</code> 太慢（500ms 一次），触摸要按很久才有反应。改成 10ms 一次后流畅，但 CPU 占用上去了，最后用 RTOS 任务 + 适当延时平衡。</p>`,
        pitfalls: [
          "<b>忘记 tick。</b>动画、定时器、长按全部失效。",
          "<b>flush_cb 里同步阻塞。</b>SPI 搬完整屏才返回，帧率极低；应该用 DMA + flush_ready。",
          "<b>忘记 flush_ready。</b>LVGL 以为屏幕一直在忙，停止刷新。",
          "<b>draw buffer 是局部变量。</b>函数返回后 LVGL 还在用，画面错乱/死机。",
          "<b>多任务同时调用 LVGL。</b>对象树没有锁，随机崩溃；必须单任务或加互斥锁。",
          "<b>v8/v9 API 混用。</b>编译报错还是小事，类型强转后运行崩溃更麻烦。"
        ],
        follow: [
          ["LVGL 需要多大的 RAM？", "取决于分辨率、颜色深度、缓冲区和控件数量。局部缓冲可以只有几十行；全屏 320×240、16 位色单缓冲就要 150KB。对象、样式、字体还额外占 RAM。"],
          ["flush_cb 一定要用 DMA 吗？", "不一定。小屏、低帧率可以直接阻塞写 SPI；但想流畅，DMA + 双缓冲基本是标配。DMA 还能让 CPU 在传输时渲染下一块。"],
          ["LVGL 的主循环应该多快调用一次？", "通常 5~30ms。太快浪费 CPU，太慢触摸和动画卡顿。可以用 lv_timer_handler 的返回值决定下次等待时间。"],
          ["LVGL 支持多显示器吗？", "支持。v8 可以注册多个 disp，v9 用 lv_display_t 管理；每个 display 有自己的缓冲和 flush_cb，输入设备可以绑定到指定 display。"]
        ]
      },

      {
        id: "UB-12",
        chapter: "display",
        topic: "lvgl-input",
        title: "LVGL 怎么接入触摸屏？read_cb 怎么写？坐标不准怎么校准？",
        diff: "中级",
        freq: "高频",
        type: "驱动接入题",
        point: "POINTER 类型、read_cb 的坐标/状态语义、坐标变换与校准、滤波和非阻塞读取。",
        q: `<p>面试官：触摸屏接到 LVGL，read_cb 里要填什么？为什么点按钮总是偏？中断引脚怎么用？</p>`,
        exam: `<p>考察触摸接入的细节。能说清“坐标 + 按下状态”“校准/旋转/镜像”“不要在 read_cb 里阻塞”，就很好。</p>`,
        core: `<p>触摸 read_cb 要填坐标和 PRESSED/RELEASED 状态；坐标要按分辨率线性映射，旋转要 swap/镜像，电阻屏还要两点校准并存 Flash。</p>`,
        answer: `<p><b>注册输入设备：</b>触摸屏是 <code>LV_INDEV_TYPE_POINTER</code>，注册后 LVGL 周期性调用 <code>read_cb</code>。</p>
<p><b>read_cb 要填两样东西：</b></p>
<ul>
<li><code>data->point.x</code>、<code>data->point.y</code>：当前触摸点，屏幕坐标系。</li>
<li><code>data->state</code>：<code>LV_INDEV_STATE_PRESSED</code> 或 <code>LV_INDEV_STATE_RELEASED</code>。</li>
</ul>
<p><b>read_cb 没有返回值</b>（v8/v9 都是 void）：一次调用给出一帧最新状态即可，LVGL 会周期性再调用。不要试图用返回值告诉它“还有数据”。</p>
<p><b>常见错误：只更新坐标，不更新状态。</b>松开时如果还报 PRESSED，按钮会一直处于按下；如果坐标没更新但状态是 RELEASED，LVGL 可能把“抬起”定位到旧坐标。</p>
<p><b>坐标不准的原因：</b></p>
<ol>
<li><b>触摸和显示分辨率不一致</b>：触摸 IC 报的是自己的原始坐标（如 0~4095），要线性映射到 LCD 的 0~319/0~239。</li>
<li><b>旋转/镜像</b>：屏幕旋转 90°/180° 后，x/y 要交换或取反。驱动里通常有 swap_xy/mirror_x/mirror_y 配置。</li>
<li><b>校准偏差</b>：电阻屏需要两点/三点校准，得到 x 方向 offset/scale、y 方向 offset/scale；电容屏一般出厂校准较好，但仍可能有边缘偏差。</li>
<li><b>触摸面板与显示面板有物理偏移</b>：装配公差导致边缘偏差，需要加固定 offset 或分区校准。</li>
</ol>
<p><b>校准方法：</b>在屏幕四角/中心显示校准点，记录触摸原始坐标，拟合 <code>x_lcd = a*x_raw + b</code>、<code>y_lcd = c*y_raw + d</code>；更严格用仿射变换处理旋转和缩放。校准参数存 Flash，开机加载。</p>
<p><b>滤波与去抖：</b>触摸 IC 偶尔报跳变点，可以做中值/均值滤波，或者对连续 N 次偏差过大的点丢弃。但不要过度滤波，否则跟手性变差。</p>
<p><b>中断引脚：</b>触摸 IC 通常有 INT 引脚，有触摸时拉低/拉高。可以用 EXTI 唤醒 GUI 任务，减少轮询；但 <code>read_cb</code> 仍然要能读到坐标和状态，不要在 ISR 里直接调 LVGL。</p>
<p><b>非阻塞：</b>read_cb 里读 I2C 不能死等。如果触摸 IC 没响应，直接返回 RELEASED，不要让整个 GUI 卡住。</p>`,
        principle: `<p>LVGL 的输入模型是“采样”：它不关心触摸 IC 是 I2C、SPI 还是电阻屏 ADC，只要求 read_cb 在每次调用时给出“当前按没按、按在哪”。所以驱动要做的是“把硬件状态翻译成屏幕坐标”。</p>
<p>坐标变换是“原始坐标 → 屏幕坐标”的映射；旋转、镜像、校准都是这个映射的一部分。把它放在驱动层，应用层就只需要关心屏幕坐标。</p>`,
        fig: {
          type: "table",
          title: "触摸常见问题与处理",
          tag: "lvgl-touch",
          head: ["现象", "原因", "处理"],
          rows: [
            ["点击位置整体偏移", "分辨率映射/offset 不对", "线性映射 + 校准"],
            ["旋转后方向错", "x/y 未交换或未镜像", "swap/mirror 配置"],
            ["松手后按钮仍按下", "state 没更新为 RELEASED", "每次 read 都设置状态"],
            ["边缘点不准", "装配公差/非线性", "分区校准/仿射变换"],
            ["触摸卡顿", "read_cb 阻塞等 I2C", "超时返回 RELEASED"],
            ["偶发跳点", "触摸 IC 噪声", "中值滤波/丢异常点"]
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_touch.c",
          src: `/* 原始触摸坐标 → 屏幕坐标：先 swap/mirror，再线性映射 */
typedef struct {
    uint16_t raw_max_x;
    uint16_t raw_max_y;
    int16_t  offset_x;
    int16_t  offset_y;
    bool     swap_xy;
    bool     mirror_x;
    bool     mirror_y;
} touch_cal_t;

static touch_cal_t s_cal = {
    .raw_max_x = 4095,
    .raw_max_y = 4095,
    .offset_x  = 0,
    .offset_y  = 0,
    .swap_xy   = false,
    .mirror_x  = false,
    .mirror_y  = false,
};

static void touch_map(int16_t *x, int16_t *y)
{
    int32_t tx = *x;
    int32_t ty = *y;

    if (s_cal.swap_xy) {
        int32_t t = tx; tx = ty; ty = t;
    }
    if (s_cal.mirror_x) tx = s_cal.raw_max_x - tx;
    if (s_cal.mirror_y) ty = s_cal.raw_max_y - ty;

    /* 映射到 LCD 分辨率；注意整数运算的舍入 */
    tx = tx * (LCD_W - 1) / s_cal.raw_max_x + s_cal.offset_x;
    ty = ty * (LCD_H - 1) / s_cal.raw_max_y + s_cal.offset_y;

    /* 边界保护，防止越界导致 LVGL 异常 */
    if (tx < 0) tx = 0;
    if (tx >= LCD_W) tx = LCD_W - 1;
    if (ty < 0) ty = 0;
    if (ty >= LCD_H) ty = LCD_H - 1;

    *x = (int16_t)tx;
    *y = (int16_t)ty;
}

static void touch_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data)
{
    int16_t x = 0, y = 0;
    bool pressed = false;

    /* 非阻塞读取：失败就当没触摸 */
    if (touch_i2c_read_xy(&x, &y) == 0) {
        pressed = touch_i2c_is_pressed();
    }

    if (pressed) {
        touch_map(&x, &y);
        data->point.x = x;
        data->point.y = y;
        data->state = LV_INDEV_STATE_PRESSED;
    } else {
        /* 保持最后坐标，状态必须是 RELEASED */
        data->point.x = s_last_x;
        data->point.y = s_last_y;
        data->state = LV_INDEV_STATE_RELEASED;
    }

    /* read_cb 是 void：给完这一帧状态就返回，LVGL 下次再调用 */
    return;
}

void touch_indev_init(void)
{
    static lv_indev_drv_t drv;

    lv_indev_drv_init(&drv);
    drv.type    = LV_INDEV_TYPE_POINTER;
    drv.read_cb = touch_read_cb;
    lv_indev_drv_register(&drv);
}`
        },
        codeNote: "read_cb 在 v8/v9 都是 void，不能用返回值表示“还有数据”；每次调用给一帧最新坐标和状态即可。不要在回调里死等 I2C，也不要直接操作 LVGL 对象。",
        apply: `<p>做过一块 480×320 的屏，触摸 IC 是 0~4095 原始坐标，最初直接把它当屏幕坐标用，点左上角能响应，点右下角完全没反应。加上线性映射和边界保护后正常。</p>
<p>还遇到屏幕旋转 90° 后触摸方向反了：显示旋转了，触摸没 swap x/y。在驱动里加 swap_xy 后解决。电容屏边缘点偏 5~10 像素，最后用四点校准 + 固定 offset 修正，按钮点击才稳定。</p>`,
        pitfalls: [
          "<b>只更新坐标不更新状态。</b>松手后按钮一直按下，或者抬起位置错。",
          "<b>原始坐标不映射。</b>触摸 IC 的分辨率和 LCD 不一致，只有一部分区域能点。",
          "<b>旋转后忘 swap/mirror。</b>显示方向对，触摸方向反。",
          "<b>read_cb 里死等 I2C。</b>触摸 IC 忙时整个 GUI 卡住。",
          "<b>在中断里直接调 LVGL。</b>对象树没有保护，随机崩溃；ISR 只做标志/通知。"
        ],
        follow: [
          ["电阻屏和电容屏在 LVGL 里接法一样吗？", "都是 POINTER，read_cb 一样填坐标和状态。区别在驱动：电阻屏需要 ADC 采样和校准，电容屏通过 I2C 读寄存器，通常出厂校准更好。"],
          ["触摸坐标需要滤波吗？", "可以加轻量滤波（中值/均值/一阶低通），但会增加延迟。按钮类应用可以滤，绘图/滑动类应用要谨慎，保真度优先。"],
          ["LVGL 支持多点触控吗？", "v8/v9 支持多点输入设备（LV_INDEV_TYPE_POINTER + 多个 point），但很多驱动只报单点。要做缩放/旋转手势，需要触摸 IC 和驱动都支持多点。"],
          ["触摸 INT 引脚怎么用最合适？", "INT 触发 EXTI，ISR 里只发通知/置标志，唤醒 GUI 任务去读坐标；不要在 ISR 里做 I2C 读或 LVGL 调用。"]
        ]
      },

      {
        id: "UB-13",
        chapter: "display",
        topic: "lvgl-input",
        title: "LVGL 里怎么让实体按键和屏幕上的按钮联动？",
        diff: "中级",
        freq: "中频",
        type: "交互设计题",
        point: "group + focus + KEYPAD/ENCODER 输入，LV_KEY_* 映射，以及 ISR 与 LVGL 的边界。",
        q: `<p>面试官：产品没有触摸屏，只有几个实体按键，怎么用 LVGL 做菜单导航和按钮确认？</p>`,
        exam: `<p>考察 LVGL 的 group/焦点机制。能说清“按键是输入设备、按钮要加入 group、焦点决定谁响应”，就很好。</p>`,
        core: `<p>按键和编码器要建 group、加控件、注册 KEYPAD/ENCODER 输入设备并关联；焦点切换用 NEXT/PREV，ENTER 触发点击，页面切换后要重设焦点。</p>`,
        answer: `<p><b>核心三件套：group、focus、input device。</b></p>
<ol>
<li><b>创建 group</b>：<code>lv_group_t *g = lv_group_create();</code>，把需要键盘/编码器操作的控件（按钮、滑块、下拉框）用 <code>lv_group_add_obj(g, btn)</code> 加进去。</li>
<li><b>绑定输入设备</b>：实体按键注册为 <code>LV_INDEV_TYPE_KEYPAD</code>；旋转编码器注册为 <code>LV_INDEV_TYPE_ENCODER</code>。用 <code>lv_indev_set_group(indev, g)</code> 把设备和 group 关联。</li>
<li><b>焦点</b>：group 里同一时刻只有一个对象获得焦点，LVGL 会给它加焦点样式。按键的 NEXT/PREV 切换焦点，ENTER 触发当前对象的点击事件。</li>
</ol>
<p><b>read_cb 怎么填：</b></p>
<ul>
<li><b>KEYPAD</b>：<code>data->key</code> 填 <code>LV_KEY_NEXT</code>、<code>LV_KEY_PREV</code>、<code>LV_KEY_ENTER</code>、<code>LV_KEY_ESC</code>、<code>LV_KEY_UP/DOWN/LEFT/RIGHT</code>；<code>data->state</code> 填 PRESSED/RELEASED。没有按键时返回 RELEASED，key 可以保持 0。</li>
<li><b>ENCODER</b>：<code>data->enc_diff</code> 填本次旋转的格数（正/负），按下时 state=PRESSED，<code>data->key = LV_KEY_ENTER</code>。LVGL 会用 enc_diff 移动焦点或调整数值。</li>
</ul>
<p><b>两种事件写法：</b></p>
<ul>
<li><b>组焦点 + 默认行为</b>：按钮加入 group 后，ENTER 会自动触发 <code>LV_EVENT_CLICKED</code>，你只需要给按钮绑 <code>LV_EVENT_CLICKED</code> 回调。</li>
<li><b>自定义按键</b>：给控件绑 <code>LV_EVENT_KEY</code>，在回调里判断 <code>lv_event_get_key(e)</code>，处理 LEFT/RIGHT 等。</li>
</ul>
<p><b>ISR 里不能直接调 LVGL：</b>按键扫描可以在定时器/中断里做，但只置标志或发队列；真正的 <code>lv_indev_read</code> / <code>lv_timer_handler</code> 必须在 GUI 任务里。否则对象树被并发访问，随机崩溃。</p>
<p><b>焦点管理：</b>页面切换后要 <code>lv_group_focus_obj()</code> 到默认按钮；隐藏/删除对象前先从 group 移除；弹窗要单独 group 或临时切换，避免焦点跑到背景控件上。</p>`,
        principle: `<p>LVGL 把“输入设备”和“可聚焦对象”解耦：设备只产生 KEY/ENCODER 事件，group 负责“谁当前有焦点”，控件负责“收到 ENTER 后做什么”。这样同一套按键可以适配不同页面，不需要为每个按钮写扫描逻辑。</p>
<p>焦点是 group 级的，不是全局的；多个页面/弹窗可以用不同 group，切换 group 就切换了按键的作用域。</p>`,
        fig: {
          type: "flow",
          title: "实体按键的操作链路",
          tag: "lvgl-key",
          items: [
            { t: "按键扫描", d: "GPIO/矩阵/编码器" },
            { t: "read_cb", d: "填 key / enc_diff / state" },
            { t: "group", d: "NEXT/PREV 移动焦点" },
            { t: "焦点控件", d: "高亮当前按钮" },
            { t: "ENTER", d: "触发 CLICKED / KEY 事件" },
            { t: "业务回调", d: "切页/确认/返回" }
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_keypad.c",
          src: `/* 5 个实体按键：上/下/确认/返回/菜单 */
typedef enum {
    KEY_UP = 0,
    KEY_DOWN,
    KEY_OK,
    KEY_BACK,
    KEY_MENU,
    KEY_NUM
} key_id_t;

static lv_group_t *s_group;
static volatile key_id_t s_last_key;
static volatile bool s_key_pressed;

/* 按键扫描（定时器或 EXTI 里）：只置标志，不碰 LVGL */
void key_scan_tick(void)
{
    key_id_t k = key_hw_scan();
    if (k != KEY_NUM) {
        s_last_key = k;
        s_key_pressed = true;
    }
}

/* LVGL 输入回调：在 GUI 任务上下文执行 */
static void keypad_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data)
{
    if (s_key_pressed) {
        s_key_pressed = false;

        switch (s_last_key) {
        case KEY_UP:   data->key = LV_KEY_PREV;  break;
        case KEY_DOWN: data->key = LV_KEY_NEXT;  break;
        case KEY_OK:   data->key = LV_KEY_ENTER; break;
        case KEY_BACK: data->key = LV_KEY_ESC;   break;
        case KEY_MENU: data->key = LV_KEY_HOME;  break;
        default:       data->key = 0;            break;
        }
        data->state = LV_INDEV_STATE_PRESSED;
    } else {
        data->state = LV_INDEV_STATE_RELEASED;
        data->key = 0;
    }
}

/* 按钮点击：ENTER 会自动触发 CLICKED */
static void btn_clicked_cb(lv_event_t *e)
{
    lv_obj_t *btn = lv_event_get_target(e);
    app_on_button(btn);
}

void menu_init(void)
{
    s_group = lv_group_create();

    lv_obj_t *scr = lv_scr_act();
    lv_obj_t *btn1 = lv_btn_create(scr);
    lv_obj_t *btn2 = lv_btn_create(scr);

    lv_obj_add_event_cb(btn1, btn_clicked_cb, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(btn2, btn_clicked_cb, LV_EVENT_CLICKED, NULL);

    lv_group_add_obj(s_group, btn1);
    lv_group_add_obj(s_group, btn2);
    lv_group_focus_obj(btn1);              /* 默认焦点 */

    static lv_indev_drv_t indev;
    lv_indev_drv_init(&indev);
    indev.type    = LV_INDEV_TYPE_KEYPAD;
    indev.read_cb = keypad_read_cb;

    lv_indev_t *indev_obj = lv_indev_drv_register(&indev);
    lv_indev_set_group(indev_obj, s_group);
}`
        },
        codeNote: "如果按键是“按下有效、松开也有效”，read_cb 要正确返回 PRESSED/RELEASED 两帧，否则 LVGL 可能把一次按键识别成多次，或者长按不触发。",
        apply: `<p>做过一款无触摸的工业控制器，只有 4 个按键。最初每个页面自己扫描按键、自己判断“当前选中哪个按钮”，代码重复且焦点经常错乱。改用 LVGL group 后，页面只负责把按钮加进 group，NEXT/PREV/ENTER 全由 LVGL 处理。</p>
<p>踩过的坑：在 EXTI 中断里直接调用 <code>lv_group_focus_next</code>，偶尔死机。后来中断只置 <code>s_key_pressed</code>，GUI 任务里的 read_cb 消费，稳定了。另一个坑是弹窗出现后焦点还在背景按钮上，按 ENTER 触发了背景操作；解决方法是弹窗用自己的 group，显示时切换。</p>`,
        pitfalls: [
          "<b>控件没加入 group。</b>按键完全没反应，焦点也看不到。",
          "<b>在 ISR 里调 LVGL。</b>对象树并发访问，随机崩溃。",
          "<b>read_cb 的 key 不清零。</b>松手后 LVGL 仍认为有键按下，重复触发。",
          "<b>弹窗不切换 group。</b>焦点跑到背景，按 ENTER 触发错误操作。",
          "<b>删除对象前没从 group 移除。</b>焦点指向已释放对象，死机。",
          "<b>把编码器当 KEYPAD 用。</b>enc_diff 没填，旋转无效果。"
        ],
        follow: [
          ["ENCODER 和 KEYPAD 有什么区别？", "KEYPAD 用离散的 NEXT/PREV/ENTER 移动焦点；ENCODER 用 enc_diff 表示旋转格数，更适合列表/数值调节。ENCODER 通常还带一个按下键（ENTER）。"],
          ["怎么让按钮显示焦点高亮？", "LVGL 默认会给聚焦对象加 focus 样式；也可以自己给 LV_STATE_FOCUSED 写样式，例如描边、反色、放大。注意样式要加在具体控件上。"],
          ["能同时接触摸和按键吗？", "可以。注册两个 indev，各自绑定 group；触摸用 POINTER，按键用 KEYPAD/ENCODER，互不冲突。"],
          ["group 和页面怎么对应？", "常见做法是一个页面一个 group，切页时切换 indev 的 group；弹窗再建临时 group。这样按键作用域清晰，不会误触背景。"]
        ]
      },

      {
        id: "UB-14",
        chapter: "display",
        topic: "lvgl-perf",
        title: "LVGL 界面卡顿、帧率低，怎么判断是渲染慢还是刷屏慢？",
        diff: "高级",
        freq: "中频",
        type: "性能优化题",
        point: "用 CPU 占用和 flush 时间区分渲染瓶颈与传输瓶颈，再分别优化缓冲、DMA、SPI 和绘制复杂度。",
        q: `<p>面试官：LVGL 界面滑动很卡，你怎么定位是 MCU 画得慢，还是屏幕刷得慢？分别怎么优化？</p>`,
        exam: `<p>考察性能分析思路。能说清“低 CPU 低 FPS 是传输瓶颈，高 CPU 低 FPS 是渲染瓶颈”，并给出对应手段，就很好。</p>`,
        core: `<p>先分清渲染慢还是刷屏慢：flush 前后打点、看 CPU 占用；传输瓶颈升 SPI、上 DMA 双缓冲、局部刷新，渲染瓶颈去阴影/透明、复用对象、预解码图片。</p>`,
        answer: `<p><b>先分清两个阶段：</b></p>
<ol>
<li><b>渲染（render）</b>：LVGL 在 draw buffer 里画矩形、文字、图片，消耗 CPU。</li>
<li><b>刷屏（flush）</b>：把 draw buffer 通过 SPI/并口/DMA 搬到屏幕，消耗总线时间和 CPU（如果是阻塞传输）。</li>
</ol>
<p><b>判断方法：</b></p>
<ul>
<li>在 flush_cb 前后打点/计时，统计每次刷新耗时和每秒刷新面积。</li>
<li>看 CPU 占用：<b>CPU 很低但 FPS 也低</b> → 大量时间在等传输/等 VSYNC，是<b>传输瓶颈</b>；<b>CPU 很高但 FPS 低</b> → 渲染本身慢。</li>
<li>用 LVGL 自带的 perf/monitor 或 GPIO 打点，分别测“渲染一帧”和“flush 一帧”的时间。</li>
</ul>
<p><b>传输瓶颈怎么优化：</b></p>
<ul>
<li><b>提高 SPI 时钟</b>：在屏幕和走线允许的范围内提到 40/80MHz；先确认屏幕控制器支持的最高频率。</li>
<li><b>DMA + 双缓冲</b>：CPU 渲染下一块的同时，DMA 搬上一块；flush_cb 里启动 DMA 后立刻返回，传输完成再 flush_ready。</li>
<li><b>局部刷新</b>：只刷脏矩形，不要每帧全屏；LVGL 默认就是脏矩形，但如果你频繁整屏 invalidate，就退化成全屏刷新。</li>
<li><b>减少颜色深度/像素格式转换</b>：RGB565 比 ARGB8888 少一半数据；避免每帧做格式转换。</li>
<li><b>并口/FMC/8080 屏</b>：比 SPI 带宽高得多，大屏优先考虑。</li>
</ul>
<p><b>渲染瓶颈怎么优化：</b></p>
<ul>
<li>去掉透明、阴影、渐变、圆角抗锯齿等昂贵效果，或减少面积。</li>
<li>图片预解码/存为 LVGL 原生格式，避免运行期解码 JPEG/PNG。</li>
<li>减少对象数量，复用对象，避免频繁创建/删除。</li>
<li>文字用内置字体/预渲染，少用大字号、少做动态格式化。</li>
<li>把复杂背景做成一张图片，比用几十个对象拼出来便宜。</li>
<li>降低刷新频率/分辨率，或只刷新变化区域。</li>
</ul>
<p><b>现实预期：</b>STM32F103 + SPI 屏 + LVGL，做到 10~20 FPS 已经不错；F4/H7 带 DMA/并口可以到 30~60 FPS。不要拿 PC 上的模拟器帧率要求 MCU。</p>`,
        principle: `<p>帧率由“渲染时间 + 传输时间 + 等待时间”共同决定。优化前必须知道哪一段占大头，否则很容易“优化了渲染，但瓶颈在 SPI”。</p>
<p>双缓冲的意义不是“画得更快”，而是“让渲染和传输重叠”。如果 flush 仍然阻塞等待 DMA，双缓冲的收益有限；必须配合异步 flush + flush_ready。</p>`,
        fig: {
          type: "table",
          title: "卡顿定位与优化",
          tag: "lvgl-perf",
          head: ["现象", "瓶颈", "优先优化"],
          rows: [
            ["CPU 低、FPS 低", "SPI/总线传输", "DMA、双缓冲、提高时钟"],
            ["CPU 高、FPS 低", "渲染", "去特效、预解码、减对象"],
            ["触摸跟手差", "主循环间隔/输入延迟", "提高 lv_timer_handler 频率"],
            ["局部刷新也慢", "flush 阻塞/面积大", "异步 DMA、脏矩形"],
            ["内存不够频繁重启", "draw buffer/对象太多", "局部缓冲、复用对象"]
          ]
        },
        code: {
          lang: "c",
          title: "lvgl_perf.c",
          src: `/* 统计渲染与 flush 时间，判断瓶颈 */
static uint32_t s_flush_us;
static uint32_t s_flush_count;
static uint32_t s_render_us;
static uint32_t s_frame_count;

static void disp_flush_cb(lv_disp_drv_t *drv,
                          const lv_area_t *area,
                          lv_color_t *color_p)
{
    uint32_t t0 = micros();

    lcd_set_window(area->x1, area->y1, area->x2, area->y2);
    lcd_start_dma((const uint8_t *)color_p,
                  lv_area_get_width(area) * lv_area_get_height(area) * 2);

    /* 注意：这里只统计“启动传输”的时间；
     * 真正的传输时间在 DMA 完成中断里累加。 */
    s_flush_us += micros() - t0;
    s_flush_count++;
}

/* DMA 传输完成中断 */
void lcd_dma_done_isr(void)
{
    s_flush_us += dma_elapsed_us();     /* 传输实际耗时 */
    lv_disp_flush_ready(&s_disp_drv);
}

/* 主循环里粗略统计：两次 flush 之间就是渲染时间 */
void lvgl_loop(void)
{
    uint32_t t0 = micros();
    lv_timer_handler();
    s_render_us += micros() - t0;
    s_frame_count++;

    if (s_frame_count >= 100) {
        uint32_t avg_render = s_render_us / s_frame_count;
        uint32_t avg_flush  = s_flush_count ? s_flush_us / s_flush_count : 0;

        log_info("render=%luus flush=%luus", avg_render, avg_flush);
        s_render_us = s_flush_us = 0;
        s_frame_count = s_flush_count = 0;
    }
}

/* 可选：只让变化区域重绘，避免整屏 invalidate */
void refresh_value_label(lv_obj_t *label, int value)
{
    lv_label_set_text_fmt(label, "%d", value);
    /* lv_label_set_text 会自动 invalidate 自身区域；
     * 不要额外调用 lv_obj_invalidate(lv_scr_act())。 */
}`
        },
        codeNote: "micros() 的精度和开销要确认；高频打点本身会影响性能。先粗测定位瓶颈，再细测具体函数。",
        apply: `<p>做过一块 320×240 SPI 屏，滑动列表只有 5 FPS。测下来 CPU 占用不高，flush 一次要 20ms，明显是 SPI 传输瓶颈。把 SPI 从 10MHz 提到 40MHz、加 DMA 双缓冲后，帧率到 20 FPS 左右。</p>
<p>另一块屏 CPU 占用 90%，FPS 还是低。定位到背景用了大量半透明圆角和阴影，每帧都在做 alpha 混合。把背景换成一张预渲染图片、去掉阴影后，CPU 降到 40%，帧率翻倍。优化一定要先测，不要凭感觉改。</p>`,
        pitfalls: [
          "<b>只优化渲染，不看传输。</b>SPI 10MHz 刷 320×240 全屏要 150ms，画得再快也没用。",
          "<b>双缓冲但 flush 仍同步等待。</b>没有重叠，收益有限。",
          "<b>每帧整屏 invalidate。</b>脏矩形优化失效，退化成全屏刷新。",
          "<b>大量透明/阴影/渐变。</b>alpha 混合是 MCU 上最贵的操作之一。",
          "<b>运行期解码 JPEG/PNG。</b>解码比刷屏还慢，应预解码成 LVGL 格式。"
        ],
        follow: [
          ["LVGL 的 draw buffer 越大越好吗？", "不是。缓冲越大，单次刷新面积越大、传输时间越长，但刷新次数少；局部缓冲更省 RAM，也能早开始传输。通常 1/10 屏到 1/4 屏是折中。"],
          ["单缓冲和双缓冲怎么选？", "单缓冲省 RAM，但渲染和传输不能重叠；双缓冲可以让 DMA 搬一块时 CPU 画另一块，帧率更高，代价是 RAM 翻倍。"],
          ["为什么用了 DMA 还是卡？", "可能 flush_cb 里仍在等 DMA 完成，或者每帧都在做格式转换/整屏刷新；也可能是 SPI 时钟太低、DMA 通道优先级不够。要分段测时间。"],
          ["LVGL 在 F103 上能跑多少帧？", "SPI 屏、320×240、RGB565、局部缓冲，通常 5~15 FPS；优化得好（DMA、局部刷新、少特效）可到 20 FPS 左右。要更高帧率换 F4/H7 或并口屏。"]
        ]
      }
    ]
  });
})();