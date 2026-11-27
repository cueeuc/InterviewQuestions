/* ============================================================
   09 Linux 嵌入式基础
   ============================================================ */
(function () {
  "use strict";

  EIK.register("embedded-linux", {
    chapters: [
      {
        id: "basic",
        title: "系统基础",
        topics: [
          { id: "space", title: "内核空间与系统调用" },
          { id: "process", title: "进程、线程与 IPC" }
        ]
      },
      {
        id: "driver",
        title: "驱动开发",
        topics: [
          { id: "chardev", title: "字符设备驱动" },
          { id: "dts", title: "设备树与总线模型" }
        ]
      },
      {
        id: "build",
        title: "构建与启动",
        topics: [
          { id: "cross", title: "交叉编译与构建系统" },
          { id: "boot", title: "启动流程" }
        ]
      }
    ],

    questions: [
      {
        id: "L-01",
        chapter: "basic",
        topic: "space",
        title: "内核空间和用户空间是怎么隔离的？系统调用过程是怎样的？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "地址空间划分、特权级切换、系统调用入口与参数传递。",
        q: `<p>面试官：Linux 为什么要把<strong>内核空间和用户空间</strong>分开？用户程序调用 <code>read()</code> 时，到底发生了什么？驱动为什么要用 <code>copy_to_user</code> 而不能直接 memcpy？</p>`,
        exam: `<p>考察对操作系统保护机制的理解。能说清“特权级切换、地址空间隔离、系统调用是唯一入口、用户指针不可信”，说明你理解内核编程的边界，而不是只会写应用层代码。</p>`,
        core: `<p>Linux 把虚拟地址空间分两部分：32 位 ARM 上通常用户 3GB、内核 1GB，64 位是各自独立的大空间。目的是保护：用户程序只能访问自己的地址空间，不能直接读写内核数据或硬件寄存器，一个进程崩溃也不会拖垮系统。CPU 通过特权级实现（ARM 的 EL0/EL1），用户态执行特权指令或访问内核地址会触发异常。</p><p>调用 <code>read()</code> 时，C 库把系统调用号放进寄存器，执行 <code>SVC</code>（或 <code>syscall</code>）触发异常，CPU 切到内核态、跳到系统调用入口，按调用号查表找到 <code>sys_read</code>，再由 VFS 调到具体驱动的 read。</p><p>驱动里不能直接 <code>memcpy</code> 用户指针，因为用户给的地址可能非法、没映射、甚至是内核地址（恶意程序），必须用 <code>copy_to_user/copy_from_user</code>，它们会做地址合法性检查，失败返回未拷贝的字节数。</p>`,
        answer: `<p>Linux 把虚拟地址空间分成两部分：32 位 ARM 上通常是用户空间 3GB（0x00000000~0xBFFFFFFF）、内核空间 1GB（0xC0000000 以上）；64 位则是各自独立的巨大空间。</p>
<p>分开的目的是<strong>保护</strong>：用户程序只能访问自己的地址空间，不能直接读写内核数据或硬件寄存器；一个进程崩溃也不会拖垮整个系统。CPU 通过特权级（ARM 的 EL0/EL1）实现：用户态是非特权级，执行特权指令或访问内核地址会触发异常。</p>
<p>用户程序调用 <code>read()</code> 时，C 库把系统调用号放进寄存器，执行 <code>SVC</code>（或 <code>syscall</code>）指令触发异常，CPU 切换到内核态，跳转到系统调用入口，根据调用号查表找到 <code>sys_read</code>，再由 VFS 调用到具体驱动的 <code>read</code> 函数。</p>
<p>驱动里不能直接 memcpy 用户指针，因为用户传进来的地址可能非法、可能没映射、甚至可能是内核地址（恶意程序）。必须用 <code>copy_to_user</code>/<code>copy_from_user</code>，它们会做地址合法性检查，失败返回未拷贝的字节数。</p>`,
        principle: `<p>系统调用的开销主要来自特权级切换和地址空间切换（如果开启 KPTI 等缓解措施）。一次系统调用通常几百纳秒到几微秒，所以高性能场景会用 <code>io_uring</code>、批量接口或 mmap 减少调用次数。</p>
<p>参数传递遵循体系结构的 ABI：ARM 用 r0~r6 传参数，r7 存系统调用号；x86-64 用 rdi、rsi、rdx、r10、r8、r9，rax 存调用号。返回值放在 r0/rax。</p>`,
        fig: {
          type: "flow",
          title: "一次 read() 的调用链",
          tag: "syscall",
          items: [
            { t: "应用调用 read", d: "libc 封装" },
            { t: "SVC 指令", d: "陷入内核" },
            { t: "查系统调用表", d: "sys_read" },
            { t: "VFS → 驱动", d: "file_operations" },
            { t: "copy_to_user", d: "安全拷贝" },
            { t: "返回用户态", d: "恢复现场" }
          ]
        },
        code: {
          lang: "c",
          title: "chardev_read.c",
          src: `#include <linux/fs.h>
#include <linux/uaccess.h>

static char g_buf[256] = "hello from kernel\\n";
static int  g_len = 18;

static ssize_t demo_read(struct file *filp, char __user *ubuf,
                         size_t count, loff_t *ppos)
{
    int ret;

    if (*ppos >= g_len) return 0;              /* 已读完 */

    if (count > (size_t)(g_len - *ppos)) {
        count = (size_t)(g_len - *ppos);       /* 不超过剩余数据 */
    }

    /* 关键：不能直接 memcpy 到用户指针，必须用 copy_to_user */
    ret = copy_to_user(ubuf, g_buf + *ppos, count);
    if (ret) {
        return -EFAULT;                        /* 用户地址非法 */
    }

    *ppos += count;
    return (ssize_t)count;
}

static const struct file_operations demo_fops = {
    .owner = THIS_MODULE,
    .read  = demo_read,
};`
        },
        apply: `<p>写驱动时的三条铁律：用户指针一律用 copy_*_user；不要在持有自旋锁时睡眠（copy_to_user 可能睡眠）；返回值用负的 errno（如 <code>-EFAULT</code>、<code>-EINVAL</code>），不要返回 -1。</p>
<p>调试用户态程序崩溃时，<code>strace</code> 能看到所有系统调用及返回值，是定位“文件打不开”“权限不足”最快的工具。</p>`,
        pitfalls: [
          "<b>直接解引用用户指针。</b>用户可能传内核地址或未映射地址，轻则 oops，重则被利用提权。",
          "<b>忘记检查 copy_*_user 的返回值。</b>拷贝失败时仍按成功处理，用户读到的是垃圾数据。",
          "<b>在原子上下文调用可能睡眠的函数。</b>内核会打印 “scheduling while atomic”，系统可能死锁。"
        ],
        follow: [
          [
            "为什么内核空间要映射到每个进程？",
            "因为进入内核态后要能访问内核代码和数据，而每次系统调用都切换页表代价太高。所以内核空间在所有进程的页表中都映射同一份，靠特权级保护不被用户态访问。"
          ],
          [
            "mmap 为什么比 read 快？",
            "mmap 把文件或设备内存直接映射到用户空间，读写不需要系统调用和数据拷贝，只有缺页时陷入内核。适合大块数据和频繁访问。"
          ],
          [
            "什么是 ioctl？",
            "一种通用的设备控制接口，用命令码传递设备特有的操作（设置参数、读寄存器等）。命令码用 <code>_IO/_IOR/_IOW</code> 宏定义，包含方向、类型、序号和大小。"
          ]
        ]
      },

      {
        id: "L-02",
        chapter: "basic",
        topic: "process",
        title: "进程和线程有什么区别？进程间通信有哪些方式？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "资源隔离与共享、上下文切换开销，以及 IPC 的适用场景。",
        q: `<p>面试官：<strong>进程和线程</strong>有什么区别？Linux 里创建线程用哪个系统调用？进程间通信有哪些方式，各自适合什么场景？</p>`,
        exam: `<p>考察操作系统基础。能说清“进程有独立地址空间，线程共享地址空间”“线程切换开销小但需要自己同步”“Linux 用 clone 实现，线程本质是共享资源的进程”，说明理解得比较深。</p>`,
        core: `<p>进程是资源分配的基本单位，有独立虚拟地址空间、文件描述符表、信号处理等；线程是调度的基本单位，同一进程内的线程共享地址空间和文件描述符，但各有独立栈和寄存器。</p><p>因为共享地址空间，线程间通信只需读写同一块内存、速度快，但必须自己做同步（互斥锁、条件变量），否则有竞态；进程隔离好、一个崩溃不影响另一个，但通信要内核介入、开销大。Linux 没有单独的“创建线程”系统调用，<code>pthread_create</code> 底层是 <code>clone()</code>，通过参数决定共享哪些资源，所以 Linux 线程本质是“共享资源的进程”。</p><p>IPC 主要有：管道（父子进程、单向）、消息队列（带边界、可多对多）、共享内存（最快、需自己同步）、信号量（同步）、信号（异步通知）、Socket（可跨主机）。</p>`,
        answer: `<p>进程是资源分配的基本单位，有独立的虚拟地址空间、文件描述符表、信号处理等；线程是调度的基本单位，同一进程内的线程共享地址空间和文件描述符，但各有独立的栈和寄存器。</p>
<p>因为共享地址空间，线程间通信只需读写同一块内存，速度快，但必须自己做同步（互斥锁、条件变量），否则会有竞态。进程间隔离好，一个崩溃不影响另一个，但通信需要内核介入，开销大。</p>
<p>Linux 没有单独的“创建线程”系统调用，<code>pthread_create</code> 底层是 <code>clone()</code>，通过参数决定共享哪些资源（地址空间、文件描述符、信号处理等）。所以 Linux 的线程本质上是“共享资源的进程”。</p>
<p>IPC 主要有：管道（父子进程、单向）、消息队列（带边界、可多对多）、共享内存（最快，需自己同步）、信号量（同步）、信号（异步通知）、Socket（可跨主机）。</p>`,
        principle: `<p>线程切换只需要保存寄存器、切换栈，不需要切换页表（同一地址空间），所以比进程切换快得多。但线程共享地址空间也意味着一个线程的野指针可能破坏其他线程的数据，隔离性差。</p>
<p>共享内存是最快的 IPC，因为数据不需要在内核和用户之间拷贝，但需要配合信号量或互斥锁来同步读写顺序，否则会读到半更新数据。</p>`,
        fig: {
          type: "table",
          title: "常见 IPC 方式对比",
          tag: "compare",
          head: ["方式", "方向", "跨主机", "速度", "典型场景"],
          rows: [
            ["管道 / FIFO", "单向", "否", "中", "父子进程、shell 管道"],
            ["消息队列", "双向", "否", "中", "带边界的消息传递"],
            ["共享内存", "双向", "否", "最快", "大数据量、高频交互"],
            ["信号量", "同步", "否", "快", "保护共享资源"],
            ["信号", "异步通知", "否", "快", "事件通知、超时"],
            ["Socket", "双向", "是", "中", "网络、跨进程通用"]
          ]
        },
        code: {
          lang: "c",
          title: "ipc_demo.c",
          src: `#include <pthread.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/mman.h>

/* 1. 线程：共享地址空间，需要自己加锁 */
static pthread_mutex_t s_lock = PTHREAD_MUTEX_INITIALIZER;
static int s_counter;

static void *worker(void *arg)
{
    for (int i = 0; i < 100000; i++) {
        pthread_mutex_lock(&s_lock);
        s_counter++;                 /* 不加锁会丢更新 */
        pthread_mutex_unlock(&s_lock);
    }
    return NULL;
}

void thread_demo(void)
{
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d\\n", s_counter);
}

/* 2. 共享内存：最快的 IPC，但要自己同步 */
typedef struct {
    pthread_mutex_t lock;            /* 需要设置为 PTHREAD_PROCESS_SHARED */
    int             value;
} shared_t;

shared_t *shm_create(void)
{
    shared_t *p = mmap(NULL, sizeof(shared_t),
                       PROT_READ | PROT_WRITE,
                       MAP_SHARED | MAP_ANONYMOUS, -1, 0);

    pthread_mutexattr_t attr;
    pthread_mutexattr_init(&attr);
    pthread_mutexattr_setpshared(&attr, PTHREAD_PROCESS_SHARED);
    pthread_mutex_init(&p->lock, &attr);
    pthread_mutexattr_destroy(&attr);

    return p;
}`
        },
        apply: `<p>实际项目里，需要高可靠隔离的用多进程（一个模块崩溃不影响整体，可被守护进程重启）；需要频繁共享数据的用多线程。</p>
<p>嵌入式 Linux 上常见的架构是：主进程负责业务，看门狗进程监控它，采集/通信各起一个线程，用消息队列或共享内存交换数据。</p>`,
        pitfalls: [
          "<b>以为线程一定比进程快。</b>创建和切换快，但共享数据需要同步，锁竞争严重时反而更慢。",
          "<b>多线程里用全局变量不加锁。</b>数据竞态，现象是“偶尔算错”，极难复现。",
          "<b>共享内存里的锁没设 PTHREAD_PROCESS_SHARED。</b>跨进程时锁不生效，同步失效。"
        ],
        follow: [
          [
            "什么是僵尸进程和孤儿进程？",
            "子进程退出但父进程没调用 wait 回收，残留的进程描述符叫僵尸进程；父进程先退出，子进程被 init/systemd 收养，叫孤儿进程。"
          ],
          [
            "fork 之后子进程会复制父进程的内存吗？",
            "采用写时复制（COW）：父子共享物理页，只有一方写入时才复制。所以 fork 很快，但如果子进程大量写内存，开销会上升。"
          ],
          [
            "线程同步有哪些手段？",
            "互斥锁、读写锁、条件变量、自旋锁、信号量、原子操作。选择依据是临界区长短和读写比例：读多写少用读写锁，极短临界区用自旋锁或原子操作。"
          ]
        ]
      },

      {
        id: "L-03",
        chapter: "driver",
        topic: "chardev",
        title: "字符设备驱动的框架是怎样的？",
        diff: "中级",
        freq: "高频",
        type: "综合设计题",
        point: "设备号、file_operations、cdev 注册、open/read/write 的实现与用户态交互。",
        q: `<p>面试官：写一个<strong>字符设备驱动</strong>需要哪几步？<code>file_operations</code> 里的函数什么时候被调用？设备节点是怎么创建的？</p>`,
        exam: `<p>考察 Linux 驱动的基本功。能说清“申请设备号 → 初始化 cdev → 注册 → 创建类/设备节点”“用户 open 对应驱动的 open”“主次设备号的作用”，说明你写过实际驱动。</p>`,
        core: `<p>步骤：申请设备号（<code>alloc_chrdev_region</code> 动态或 <code>register_chrdev_region</code> 静态）；初始化并注册 <code>cdev</code>、绑定 <code>file_operations</code>；创建设备类和节点（<code>class_create</code> + <code>device_create</code>），让 udev/mdev 自动在 <code>/dev</code> 下生成节点；模块退出时反向释放。</p><p>用户 open <code>/dev/xxx</code> 时，VFS 按设备节点的主设备号找到 cdev，调用驱动的 open；read/write 对应 read/write；close 对应 release。</p><p>主设备号标识驱动，次设备号标识同一驱动下的不同设备实例，比如两个串口可共用一个主设备号、用次设备号区分。</p>`,
        answer: `<p>基本步骤是：申请设备号（<code>alloc_chrdev_region</code> 动态或 <code>register_chrdev_region</code> 静态）；初始化并注册 <code>cdev</code>，绑定 <code>file_operations</code>；创建设备类和设备节点（<code>class_create</code> + <code>device_create</code>），这样 udev/mdev 会自动在 <code>/dev</code> 下生成节点；最后在模块退出时反向释放。</p>
<p>用户态 <code>open("/dev/xxx")</code> 时，VFS 根据设备节点的主设备号找到对应的 cdev，调用驱动的 <code>open</code>；<code>read</code>/<code>write</code> 分别对应 <code>read</code>/<code>write</code>；<code>close</code> 对应 <code>release</code>。</p>
<p>主设备号标识驱动，次设备号标识同一驱动下的不同设备实例。比如两个串口可以共用一个主设备号，用次设备号区分。</p>`,
        principle: `<p>VFS 是内核中的抽象层，把<strong>字符设备和块设备</strong>统一到 <code>file_operations</code> 上，设备节点、open/read/write 都走这套接口；<b>网络设备不经过 VFS</b>，它没有设备节点，由网络子系统通过 socket 接口和 <code>net_device_ops</code> 单独管理。</p>
<p>现代内核更推荐用 misc 设备（主设备号固定为 10）简化小型驱动的注册，或者用 platform 驱动 + 设备树匹配，把资源和驱动分离。</p>`,
        fig: {
          type: "flow",
          title: "字符设备驱动的注册与调用",
          tag: "driver",
          items: [
            { t: "申请设备号", d: "alloc_chrdev_region" },
            { t: "初始化 cdev", d: "cdev_init" },
            { t: "注册 cdev", d: "cdev_add" },
            { t: "创建设备节点", d: "class_create" },
            { t: "用户 open", d: "→ fops->open" },
            { t: "read/write", d: "→ fops->read" }
          ]
        },
        code: {
          lang: "c",
          title: "demo_chrdev.c",
          src: `#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>

#define DEV_NAME "demo"

static dev_t         g_devno;
static struct cdev   g_cdev;
static struct class *g_class;
static struct device *g_device;

static ssize_t demo_read(struct file *f, char __user *buf, size_t len, loff_t *off)
{
    const char *msg = "demo driver\\n";
    size_t n = strlen(msg);

    if (*off >= n) return 0;
    if (len > n - *off) len = n - *off;

    if (copy_to_user(buf, msg + *off, len)) return -EFAULT;

    *off += len;
    return (ssize_t)len;
}

static ssize_t demo_write(struct file *f, const char __user *buf, size_t len, loff_t *off)
{
    char kbuf[64];

    if (len >= sizeof(kbuf)) return -EINVAL;
    if (copy_from_user(kbuf, buf, len)) return -EFAULT;

    kbuf[len] = '\\0';
    pr_info("demo: received %zu bytes: %s\\n", len, kbuf);
    return (ssize_t)len;
}

static int demo_open(struct inode *inode, struct file *f)
{
    pr_info("demo: opened\\n");
    return 0;
}

static int demo_release(struct inode *inode, struct file *f)
{
    return 0;
}

static const struct file_operations demo_fops = {
    .owner   = THIS_MODULE,
    .open    = demo_open,
    .release = demo_release,
    .read    = demo_read,
    .write   = demo_write,
};

static int __init demo_init(void)
{
    int ret;

    /* 1. 动态申请设备号 */
    ret = alloc_chrdev_region(&g_devno, 0, 1, DEV_NAME);
    if (ret) return ret;

    /* 2. 初始化并注册 cdev */
    cdev_init(&g_cdev, &demo_fops);
    g_cdev.owner = THIS_MODULE;
    ret = cdev_add(&g_cdev, g_devno, 1);
    if (ret) goto err_cdev;

    /* 3. 创建设备节点 /dev/demo */
    g_class = class_create(THIS_MODULE, DEV_NAME);
    if (IS_ERR(g_class)) { ret = PTR_ERR(g_class); goto err_class; }

    g_device = device_create(g_class, NULL, g_devno, NULL, DEV_NAME);
    if (IS_ERR(g_device)) { ret = PTR_ERR(g_device); goto err_device; }

    pr_info("demo: major=%d minor=%d\\n", MAJOR(g_devno), MINOR(g_devno));
    return 0;

err_device:
    class_destroy(g_class);
err_class:
    cdev_del(&g_cdev);
err_cdev:
    unregister_chrdev_region(g_devno, 1);
    return ret;
}

static void __exit demo_exit(void)
{
    device_destroy(g_class, g_devno);
    class_destroy(g_class);
    cdev_del(&g_cdev);
    unregister_chrdev_region(g_devno, 1);
}

module_init(demo_init);
module_exit(demo_exit);
MODULE_LICENSE("GPL");`
        },
        apply: `<p>实际调试流程：<code>insmod demo.ko</code> → <code>dmesg</code> 看主设备号 → <code>ls -l /dev/demo</code> 确认节点 → <code>echo hello &gt; /dev/demo</code> 测试写入 → <code>cat /dev/demo</code> 测试读取。</p>
<p>如果是接在 I2C/SPI 上的设备，驱动应该注册成对应的总线驱动，用设备树描述硬件资源，而不是硬编码寄存器地址。</p>`,
        pitfalls: [
          "<b>忘记设置 <code>.owner = THIS_MODULE</code>。</b>模块在使用中被卸载，内核直接 oops。",
          "<b>错误处理路径不完整。</b>注册到一半失败时没释放已申请的资源，反复加载会耗尽设备号。",
          "<b>直接解引用用户指针。</b>必须用 copy_to_user/copy_from_user，否则可能被恶意地址攻击。"
        ],
        follow: [
          [
            "主设备号和次设备号有什么区别？",
            "主设备号对应驱动，内核用它找到 file_operations；次设备号对应具体设备实例，驱动内部用它区分是哪个设备。一个驱动可以管理多个次设备号。"
          ],
          [
            "misc 设备有什么好处？",
            "主设备号固定为 10，不需要动态申请，注册接口简单（<code>misc_register</code>），适合只有一个实例的小驱动，如 GPIO、看门狗、LED。"
          ],
          [
            "驱动的 probe 函数什么时候被调用？",
            "总线匹配成功时调用。比如 platform 总线在设备树节点与 driver 的 compatible 匹配后调用 probe，驱动在这里申请资源、初始化硬件、注册字符设备。"
          ]
        ]
      },

      {
        id: "L-04",
        chapter: "driver",
        topic: "dts",
        title: "设备树解决了什么问题？驱动怎么和它匹配？",
        diff: "中级",
        freq: "中频",
        type: "原理分析题",
        point: "硬件描述与代码分离、compatible 匹配、资源获取 API。",
        q: `<p>面试官：为什么要有<strong>设备树</strong>？它解决了什么问题？驱动怎么从设备树里拿到寄存器地址和中断号？</p>`,
        exam: `<p>考察对 Linux 驱动模型的现代理解。能说清“以前板级文件把硬件信息写死在 C 代码里，换板子要改内核”“设备树用数据描述硬件，驱动通过 compatible 匹配”，说明你跟上主流做法。</p>`,
        core: `<p>设备树之前 ARM Linux 用板级文件描述硬件：哪个 I2C 挂了什么、寄存器地址、用哪个中断，全写在 C 代码里，换板子就要改内核重编译，内核里堆了大量板级代码。设备树把硬件描述抽成独立文本 <code>.dts</code>，编译成 <code>.dtb</code> 由 bootloader 传给内核；内核解析后创建对应 device，再和 driver 匹配，同一份内核可支持多块板子，只换 dtb。</p><p>匹配靠 <code>compatible</code>：节点写 <code>compatible = "vendor,device"</code>，驱动的 <code>of_match_table</code> 列出支持的字符串，一致就调 probe。probe 里用 <code>of_iomap</code> 或 <code>platform_get_resource</code> 拿寄存器、<code>platform_get_irq</code> 拿中断、<code>of_property_read_u32</code> 读自定义属性。</p><p>要区分挂载位置：节点直接挂在 SoC 下、用 reg 描述寄存器窗口，是 platform 设备走 <code>platform_driver</code>；挂在 <code>&amp;i2c1</code> 这类总线节点下、reg 是从机地址，内核生成 <code>i2c_client</code>，驱动必须写成 <code>i2c_driver</code>，用 <code>i2c_transfer</code>/regmap 访问、中断取 <code>client-&gt;irq</code>。</p>`,
        answer: `<p>在设备树之前，ARM Linux 用“板级文件”（board file）描述硬件：哪个 I2C 上挂了什么设备、寄存器地址是多少、用哪个中断，全部写在 C 代码里。每换一块板子就要改内核、重新编译，内核里堆积了大量板级代码。</p>
<p>设备树把硬件描述抽成独立的文本文件（.dts），编译成二进制（.dtb）后由 bootloader 传给内核。内核启动时解析设备树，创建对应的 device，再和 driver 匹配。这样同一份内核可以支持多块板子，只换 dtb 即可。</p>
<p>匹配靠 <code>compatible</code> 属性：设备树节点里写 <code>compatible = "vendor,device"</code>，驱动的 <code>of_match_table</code> 里列出支持的字符串，两者一致就调用 probe。</p>
<p>驱动在 probe 里用 <code>of_iomap</code> 或 <code>platform_get_resource</code> 拿寄存器地址，用 <code>platform_get_irq</code> 拿中断号，用 <code>of_property_read_u32</code> 读自定义属性。</p>
<p>要注意区分节点的挂载位置：如果节点直接挂在 SoC 节点下、用 <code>reg</code> 描述寄存器窗口，那是 platform 设备，走 <code>platform_driver</code>；如果节点挂在 <code>&amp;i2c1</code> 这类总线节点下，<code>reg</code> 表示的是从机地址，内核会生成 <code>i2c_client</code>，驱动必须写成 <code>i2c_driver</code>，用 <code>i2c_transfer</code>/regmap 访问，中断取 <code>client-&gt;irq</code>。下面两个代码块分别给出设备树片段和对应的 I2C 驱动。</p>`,
        principle: `<p>设备树是一种描述硬件拓扑的层次化数据结构，根节点下挂 SoC、总线、外设。每个节点有 <code>compatible</code>、<code>reg</code>（地址和长度）、<code>interrupts</code>（中断号和触发方式）、<code>clocks</code>、<code>status</code> 等标准属性。</p>
<p><code>status = "okay"</code> 或 <code>"disabled"</code> 控制节点是否生效，方便同一份 dts 适配不同配置的板子（比如是否焊接了某个外设）。</p>`,
        fig: {
          type: "table",
          title: "设备树常用属性",
          tag: "dts",
          head: ["属性", "含义", "示例"],
          rows: [
            ["compatible", "驱动匹配字符串", "<code>vendor,sensor</code>"],
            ["reg", "寄存器地址与长度", "<code>&lt;0x40012000 0x400&gt;</code>"],
            ["interrupts", "中断号与触发方式", "<code>&lt;0 35 4&gt;</code>"],
            ["clocks", "时钟源 phandle", "<code>&lt;&amp;clk 1&gt;</code>"],
            ["status", "是否启用", "<code>okay</code>"],
            ["pinctrl-0", "引脚复用配置", "<code>&lt;&amp;i2c1_pins&gt;</code>"]
          ]
        },
        code: {
          lang: "text",
          title: "board.dts",
          src: `/* 设备树片段：I2C1 上挂一颗传感器 */
&i2c1 {
    status = "okay";
    clock-frequency = <400000>;

    sensor@48 {
        compatible = "acme,acme1234";
        reg = <0x48>;
        interrupt-parent = <&gpio1>;
        interrupts = <5 IRQ_TYPE_EDGE_FALLING>;
        vdd-supply = <&vcc3v3>;
        acme,sample-rate = <100>;
        status = "okay";
    };
};`
        },
        code2: {
          lang: "c",
          title: "acme_driver.c",
          src: `#include <linux/i2c.h>
#include <linux/of.h>
#include <linux/module.h>

static const struct of_device_id acme_of_match[] = {
    { .compatible = "acme,acme1234" },
    { }                                  /* 必须以空项结尾 */
};
MODULE_DEVICE_TABLE(of, acme_of_match);

/* 挂在 &i2c1 下的节点会生成 i2c_client，必须用 i2c_driver 匹配 */
static int acme_probe(struct i2c_client *client)
{
    s32 id;
    u32 rate = 100;

    /* I2C 从机没有可 ioremap 的寄存器窗口，直接用 client 收发 */
    id = i2c_smbus_read_byte_data(client, 0x00);   /* 读芯片 ID */
    if (id < 0) return id;

    /* 中断号已由 I2C 核心从 interrupts 属性解析到 client->irq */
    if (client->irq <= 0) return -EINVAL;

    /* 读自定义属性 acme,sample-rate */
    of_property_read_u32(client->dev.of_node, "acme,sample-rate", &rate);

    return 0;
}

static struct i2c_driver acme_driver = {
    .driver = {
        .name           = "acme1234",
        .of_match_table = acme_of_match,
    },
    .probe = acme_probe,
};
module_i2c_driver(acme_driver);
MODULE_LICENSE("GPL");`
        },
        apply: `<p>probe 里用 <code>devm_ioremap_resource</code>、<code>platform_get_irq</code>、<code>devm_regulator_get</code> 拿资源，用 <code>devm_</code> 前缀的接口可以自动释放，减少错误处理代码。</p>`,
        pitfalls: [
          "<b>compatible 字符串写错。</b>驱动不 probe，设备没反应，<code>dmesg</code> 里也看不到错误，只是“什么都没发生”。",
          "<b>忘记设置 status = okay。</b>节点默认可能是 disabled，驱动永远不会匹配。",
          "<b>在驱动里硬编码寄存器地址。</b>换板子就要改驱动，失去了设备树的意义。"
        ],
        follow: [
          [
            "dtb 是怎么传给内核的？",
            "U-Boot 把 dtb 加载到内存，启动内核时通过 r2 寄存器（32 位 ARM）或 x0（ARM64）传递地址，内核解析后展开成 device_node 树。"
          ],
          [
            "pinctrl 是做什么的？",
            "统一管理引脚复用和电气配置。设备树里通过 pinctrl-0 引用一组引脚配置，驱动 probe 前内核自动应用，避免在每个驱动里写寄存器。"
          ],
          [
            "如何调试设备树问题？",
            "看 <code>/proc/device-tree</code> 确认内核解析到的节点；用 <code>dmesg | grep -i probe</code> 看匹配情况；用 <code>dtc</code> 反编译 dtb 检查语法。"
          ]
        ]
      },

      {
        id: "L-05",
        chapter: "build",
        topic: "cross",
        title: "什么是交叉编译？Makefile 和 CMake 怎么组织嵌入式工程？",
        diff: "初级",
        freq: "中频",
        type: "工程应用题",
        point: "交叉工具链、sysroot、构建系统的分层组织与增量编译。",
        q: `<p>面试官：什么是<strong>交叉编译</strong>？为什么嵌入式 Linux 要交叉编译？一个多目录的 C 工程，Makefile 应该怎么组织？CMake 又解决了什么问题？</p>`,
        exam: `<p>考察工程构建能力。能说清“在 x86 上编译 ARM 程序，需要交叉工具链和 sysroot”“Makefile 用变量和模式规则复用”“CMake 生成构建文件，跨平台更好管理依赖”，说明你能独立搭建工程。</p>`,
        core: `<p>交叉编译是在一种平台生成另一种平台的可执行文件，比如 x86 PC 上用 <code>arm-linux-gnueabihf-gcc</code> 编出 ARM 板子上跑的程序，原因是目标板资源有限跑不动编译器和工具链。需要三样：交叉工具链（编译器、链接器、binutils）、目标平台的库和头文件（sysroot）、正确的编译选项（<code>--sysroot</code>、<code>-march</code>、<code>-mfpu</code>）。</p><p>Makefile 组织：顶层定义工具链前缀、编译选项、目标，用 SUBDIRS 递归进子目录；子目录只管自己的源文件和依赖；公共规则放 <code>.mk</code> 里 include；用模式规则 <code>%.o: %.c</code> 避免重复写命令，用 <code>-MMD -MP</code> 自动生成头文件依赖。</p><p>CMake 解决手写 Makefile 难维护、跨平台麻烦的问题：用 <code>CMakeLists.txt</code> 描述目标、源文件、依赖和安装规则，生成 Makefile 或 Ninja；自带工具链文件机制，交叉编译只需指定 <code>toolchain.cmake</code>。</p>`,
        answer: `<p>交叉编译是在一种平台上生成另一种平台的可执行文件。比如在 x86 的 PC 上用 <code>arm-linux-gnueabihf-gcc</code> 编译出能在 ARM 板子上运行的程序。原因是目标板资源有限，跑不动编译器和整个工具链。</p>
<p>交叉编译需要三样东西：交叉工具链（编译器、链接器、binutils）、目标平台的库和头文件（sysroot）、以及正确的编译选项（<code>--sysroot</code>、<code>-march</code>、<code>-mfpu</code>）。</p>
<p>Makefile 的组织方式是：顶层 Makefile 定义工具链前缀、编译选项、目标，用 <code>SUBDIRS</code> 递归进入子目录；子目录 Makefile 只关心自己的源文件和依赖；公共规则放在 <code>.mk</code> 文件里 include。用模式规则 <code>%.o: %.c</code> 避免重复写编译命令，用 <code>-MMD -MP</code> 自动生成头文件依赖。</p>
<p>CMake 解决的是“手写 Makefile 难以维护、跨平台麻烦”的问题：用 CMakeLists.txt 描述目标、源文件、依赖和安装规则，由 CMake 生成 Makefile 或 Ninja 文件。它自带工具链文件机制，交叉编译只需指定 <code>toolchain.cmake</code>。</p>`,
        principle: `<p>sysroot 是一份目标平台的根文件系统镜像，包含 <code>/usr/include</code>、<code>/usr/lib</code> 等。编译器通过 <code>--sysroot</code> 找到目标平台的头文件和库，避免误用主机的 glibc。</p>
<p>增量编译依赖时间戳和依赖文件。头文件改动如果没被记录到依赖里，就会出现“改了头文件但没重新编译”，这是 Makefile 最常见的坑，<code>-MMD</code> 能自动解决。</p>`,
        fig: {
          type: "layers",
          title: "交叉编译环境的组成",
          tag: "toolchain",
          items: [
            { tag: "APP", t: "应用源码", d: "与平台无关的 C/C++ 代码" },
            { tag: "CC", t: "交叉工具链", d: "arm-linux-gnueabihf-gcc" },
            { tag: "SYS", t: "sysroot", d: "目标平台的库和头文件" },
            { tag: "TGT", t: "目标板", d: "ARM CPU + Linux" }
          ]
        },
        code: {
          lang: "makefile",
          title: "Makefile",
          src: `# 顶层 Makefile：统一工具链与编译选项
CROSS_COMPILE ?= arm-linux-gnueabihf-
SYSROOT       ?= /opt/sysroot          # 目标平台的库和头文件根目录
CC      := $(CROSS_COMPILE)gcc
AR      := $(CROSS_COMPILE)ar

CFLAGS  := -Wall -Wextra -O2 -g \\
           -MMD -MP \\
           -I./include \\
           --sysroot=$(SYSROOT)
LDFLAGS := --sysroot=$(SYSROOT) -L./lib -lpthread

TARGET  := app
SRCS    := $(wildcard src/*.c)
OBJS    := $(SRCS:.c=.o)
DEPS    := $(OBJS:.o=.d)

$(TARGET): $(OBJS)
	$(CC) $^ -o $@ $(LDFLAGS)

# 模式规则：所有 .c 用同一套规则编译
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# 自动生成的头文件依赖
-include $(DEPS)

clean:
	rm -f $(OBJS) $(DEPS) $(TARGET)

install: $(TARGET)
	scp $(TARGET) root@192.168.1.100:/opt/app/

.PHONY: clean install`
        },
        codeNote: `<b>注意：</b>Makefile 的命令行必须以 Tab 开头，不是空格。这是新手最常犯的错误，报错是 “missing separator”。`,
        code2: {
          lang: "cmake",
          title: "toolchain.cmake",
          src: `# 交叉编译工具链文件：切换平台只改这个文件
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER   arm-linux-gnueabihf-gcc)
set(CMAKE_CXX_COMPILER arm-linux-gnueabihf-g++)

# 目标平台的库和头文件根目录
set(CMAKE_SYSROOT /opt/sysroot)

# 程序在主机找，库和头文件只在 sysroot 找
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

# 常用选项
set(CMAKE_C_FLAGS "\${CMAKE_C_FLAGS} -Os -Wall -Wextra")`
        },
        apply: `<p>配置时用 <code>cmake -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake ..</code>，切换平台只改工具链文件，CMakeLists.txt 一行不动。CMakeLists 里只描述“编译哪些源文件、链接哪些库、安装到哪里”，与具体平台无关。</p>
<p>工程规模变大后，建议把公共编译选项、依赖查找、安装规则抽成 <code>.cmake</code> 模块，用 <code>include()</code> 复用，避免每个子目录重复配置。</p>`,
        pitfalls: [
          "<b>Makefile 用空格缩进。</b>直接报 missing separator，而且错误信息不明显。",
          "<b>没有头文件依赖。</b>改了 .h 不重新编译，运行的是旧逻辑，排查半天以为是代码问题。",
          "<b>链接了主机的库。</b>编译通过但运行时报 “version GLIBC_2.29 not found”，因为用了主机的 glibc。必须指定 sysroot。"
        ],
        follow: [
          [
            "静态链接和动态链接怎么选？",
            "静态链接把库打进可执行文件，部署简单、无依赖，但体积大；动态链接体积小、可共享库，但需要目标板上有对应版本的 .so。嵌入式调试阶段常用静态链接减少环境问题。"
          ],
          [
            "如何减小可执行文件体积？",
            "用 <code>-Os</code> 优化尺寸、<code>-ffunction-sections -fdata-sections</code> 配合 <code>--gc-sections</code> 去掉未用代码、strip 调试符号、用 musl 替代 glibc。"
          ],
          [
            "什么是 Buildroot 和 Yocto？",
            "两者都是构建嵌入式 Linux 系统的框架，能自动下载、配置、编译工具链、内核、根文件系统。Buildroot 简单直接，Yocto 更灵活但学习曲线陡。"
          ]
        ]
      },

      {
        id: "L-06",
        chapter: "build",
        topic: "boot",
        title: "嵌入式 Linux 从加电到应用启动经历了哪些阶段？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "BootROM → SPL → U-Boot → 内核 → 根文件系统 → init 的完整链路。",
        q: `<p>面试官：一块 ARM Linux 板子<strong>上电后</strong>，到应用程序跑起来，中间经历了哪些阶段？U-Boot 做了什么事？根文件系统是必须的吗？</p>`,
        exam: `<p>考察对整个系统启动链路的理解。能说清“BootROM 加载 SPL，SPL 初始化 DDR 后加载 U-Boot，U-Boot 加载内核和 dtb，内核挂载根文件系统并启动 init”，说明你做过系统集成。</p>`,
        core: `<p>典型链路：BootROM 是芯片内固化代码，按启动引脚（SD 卡、eMMC、SPI Flash）加载第一级引导，只认有限格式且容量很小；SPL 因为 ROM 加载不了完整 U-Boot（DDR 还没初始化），先加载精简 SPL，它初始化 DDR、时钟、串口，再把完整 U-Boot 搬进 DDR；U-Boot 初始化更多外设（网口、存储、显示），提供命令行，把内核镜像和 dtb 加载到内存、设置 bootargs 后跳转；内核解压、初始化内存管理、调度、驱动，解析设备树、挂载根文件系统，最后启动第一个用户态进程 init（systemd 或 busybox init）；init 按配置起服务，最终运行应用。根文件系统是必须的，否则内核找不到 init 会 panic。</p>`,
        answer: `<p>典型链路是：</p>
<p><strong>BootROM</strong>：芯片内部的固化代码，根据启动引脚（SD 卡、eMMC、SPI Flash）加载第一级引导程序。它只认识有限的格式，且容量很小。</p>
<p><strong>SPL</strong>（二级程序加载器）：因为 BootROM 加载不了完整 U-Boot（DDR 还没初始化），先加载一个精简版 SPL，它初始化 DDR、时钟、串口，然后把完整 U-Boot 搬到 DDR 运行。</p>
<p><strong>U-Boot</strong>：初始化更多外设（网口、存储、显示），提供命令行，最后把内核镜像和 dtb 加载到内存，设置启动参数（bootargs），跳转内核。</p>
<p><strong>内核</strong>：解压、初始化内存管理、调度、驱动，解析设备树，挂载根文件系统，最后启动第一个用户态进程 <code>init</code>（systemd 或 busybox init）。</p>
<p><strong>init</strong>：按配置启动各种服务，最终运行应用程序。根文件系统是必须的，否则内核找不到 init，会 panic。</p>`,
        principle: `<p>为什么需要 SPL？因为 DDR 初始化代码需要在 DDR 可用之前运行，而这段代码必须放在片内 SRAM（容量只有几十 KB）。SPL 就是这段“在极小空间里完成关键初始化”的代码。</p>
<p>内核和 U-Boot 之间通过“启动参数”（bootargs）传递信息，比如根文件系统位置（<code>root=/dev/mmcblk0p2</code>）、控制台（<code>console=ttyS0,115200</code>）、内存大小。参数不对，最常见的现象是“内核启动到一半 panic，找不到 rootfs”。</p>`,
        fig: {
          type: "flow",
          title: "ARM Linux 启动链路",
          tag: "boot",
          items: [
            { t: "BootROM", d: "片内固化" },
            { t: "SPL", d: "初始化 DDR" },
            { t: "U-Boot", d: "加载内核+dtb" },
            { t: "Kernel", d: "驱动初始化" },
            { t: "Rootfs", d: "挂载根文件系统" },
            { t: "init", d: "启动应用" }
          ]
        },
        code: {
          lang: "bash",
          title: "uboot_cmd.sh",
          src: `# U-Boot 常用命令：从 eMMC 启动 Linux
setenv bootargs 'console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait rw'

# 把内核和设备树加载到内存
fatload mmc 0:1 0x80800000 zImage
fatload mmc 0:1 0x83000000 imx6ull.dtb

# 跳转内核：r0=0, r1=机器号(设备树启动为0xFFFFFFFF), r2=dtb地址
bootz 0x80800000 - 0x83000000

# 保存环境变量到存储
saveenv

# 网络启动（调试时常用）
setenv serverip 192.168.1.10
setenv ipaddr 192.168.1.100
tftp 0x80800000 zImage
tftp 0x83000000 imx6ull.dtb
bootz 0x80800000 - 0x83000000`
        },
        apply: `<p>实际调试启动问题时，按阶段定位：串口完全没有输出 → BootROM/SPL 阶段（检查启动介质、DDR 初始化）；有 U-Boot 输出但卡住 → 环境变量或存储读取；内核启动一半 panic → bootargs、rootfs、驱动。</p>
<p>量产时通常把 U-Boot、内核、dtb、rootfs 打包成一个镜像，通过 USB 或 SD 卡一键烧录，避免手工分区出错。</p>`,
        pitfalls: [
          "<b>bootargs 里 root 写错。</b>内核找不到根文件系统，panic 并打印 “No filesystem could mount root”。",
          "<b>dtb 和内核版本不匹配。</b>驱动 probe 失败或直接启动异常，现象是“大部分功能正常，某个外设没反应”。",
          "<b>根文件系统缺少 /init 或 /sbin/init。</b>内核挂载成功后仍然 panic，提示 “No init found”。"
        ],
        follow: [
          [
            "U-Boot 的作用是什么？",
            "初始化硬件、提供命令行和脚本、从多种介质加载内核和设备树、传递启动参数、支持网络下载和烧录。它是内核启动前的“引导加载器”。"
          ],
          [
            "什么是 initramfs？",
            "一个打包进内核或单独加载的内存文件系统，在内核挂载真正的根文件系统之前提供临时的根环境，用于加载存储驱动、解密根分区等。"
          ],
          [
            "内核启动后第一个进程是什么？",
            "PID 1，通常是 systemd 或 busybox 的 init。它负责挂载文件系统、启动服务、回收孤儿进程，是所有用户态进程的祖先。"
          ]
        ]
      }
    ]
  });

  /* ---------------- 补充题目（第二批） ---------------- */
  EIK.extend("embedded-linux", {
    chapters: [
      {
        id: "basic",
        topics: [
          { id: "sync", title: "内核同步机制" },
          { id: "mmap", title: "mmap 与用户态映射" }
        ]
      },
      {
        id: "driver",
        topics: [
          { id: "module", title: "内核模块" },
          { id: "platform", title: "platform 驱动模型" },
          { id: "ioctl", title: "ioctl 接口" },
          { id: "irq", title: "中断下半部" },
          { id: "sysfs", title: "sysfs 与 procfs" }
        ]
      },
      {
        id: "build",
        topics: [
          { id: "uboot", title: "U-Boot 启动" },
          { id: "rootfs", title: "根文件系统" },
          { id: "buildroot", title: "Buildroot 与 Yocto" }
        ]
      }
    ],
    questions: [
      {
        id: "L-07",
        chapter: "driver",
        topic: "module",
        title: "Linux 内核模块怎么写？insmod 和 modprobe 有什么区别？",
        diff: "中级",
        freq: "高频",
        type: "驱动开发题",
        point: "模块入口/出口、MODULE_LICENSE、加载依赖；modprobe 会处理依赖和配置文件。",
        q: `<p>面试官：写一个最简单的内核模块，需要哪些要素？为什么必须声明许可证？</p>`,
        exam: `<p>考察驱动开发基础。能写出 init/exit、知道 insmod 与 modprobe 的差异、理解内核与用户空间的区别，就很好。</p>`,
        core: `<p>最小模块：包含 <code>linux/module.h</code> 和 <code>linux/kernel.h</code>；初始化函数 <code>static int __init xxx_init(void)</code> 返回 0 表示成功；退出函数 <code>static void __exit xxx_exit(void)</code>；<code>module_init/module_exit</code>；<code>MODULE_LICENSE("GPL")</code>，否则内核标记为污染（tainted），部分 API 不可用。</p><p><code>insmod</code> 直接加载指定 .ko、不处理依赖、参数手动传；<code>modprobe</code> 从 <code>/lib/modules/$(uname -r)/</code> 查找、自动加载依赖、读 <code>modules.dep</code> 和配置。</p><p>和用户程序的区别：跑在内核空间、没有 libc、不能用 printf 要用 printk；不能直接访问用户指针，要用 <code>copy_from_user/copy_to_user</code>；崩溃会导致整个内核 panic，必须小心内存和并发；不支持浮点，保存恢复浮点上下文代价太高。</p>`,
        answer: `<p><b>最小模块：</b></p>
<ul>
<li><code>#include &lt;linux/module.h&gt;</code> 和 <code>linux/kernel.h</code>；</li>
<li>初始化函数 <code>static int __init xxx_init(void)</code>，返回 0 表示成功；</li>
<li>退出函数 <code>static void __exit xxx_exit(void)</code>；</li>
<li><code>module_init(xxx_init);</code> 和 <code>module_exit(xxx_exit);</code>；</li>
<li><code>MODULE_LICENSE("GPL");</code>，否则内核会标记为污染（tainted），部分 API 不可用。</li>
</ul>
<p><b>insmod vs modprobe：</b></p>
<ul>
<li><code>insmod</code>：直接加载指定的 .ko 文件，不处理依赖，参数要手动传；</li>
<li><code>modprobe</code>：从 <code>/lib/modules/$(uname -r)/</code> 查找模块，自动加载依赖，读取 <code>modules.dep</code> 和配置文件。</li>
</ul>
<p><b>内核模块与用户程序的区别：</b></p>
<ul>
<li>运行在内核空间，没有 libc，不能用 printf（要用 printk）；</li>
<li>不能访问用户空间指针而不做检查（要用 copy_from_user/copy_to_user）；</li>
<li>崩溃会导致整个内核 panic，必须非常小心内存和并发；</li>
<li>没有浮点支持（保存/恢复浮点上下文代价高）。</li>
</ul>`,
        principle: `<p>模块是可以在运行时插入内核的二进制代码，和内核共享地址空间。内核通过 vermagic 校验模块与内核版本、配置是否匹配，不匹配会拒绝加载。</p>
<p>GPL 许可证影响模块能否使用 EXPORT_SYMBOL_GPL 导出的符号，也影响内核是否被标记为污染。</p>`,
        fig: {
          type: "table",
          title: "insmod 与 modprobe 对比",
          tag: "kernel module",
          head: ["命令", "依赖处理", "路径", "典型用途"],
          rows: [
            ["insmod", "不处理", "指定文件", "调试单个模块"],
            ["modprobe", "自动加载", "模块目录", "正常使用"],
            ["rmmod", "不处理", "模块名", "卸载"],
            ["lsmod", "—", "—", "查看已加载模块"]
          ]
        },
        code: {
          lang: "c",
          title: "hello_module.c",
          src: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

static int __init hello_init(void)
{
    printk(KERN_INFO "hello: module loaded\\n");
    return 0;                 /* 非 0 表示加载失败 */
}

static void __exit hello_exit(void)
{
    printk(KERN_INFO "hello: module unloaded\\n");
}

module_init(hello_init);
module_exit(hello_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("example");
MODULE_DESCRIPTION("minimal kernel module");`
        },
        codeNote: "printk 的日志级别用 KERN_INFO 等宏，实际输出受 console_loglevel 和 dmesg 配置影响。",
        apply: `<p>调试驱动时我先写最小模块验证编译和加载，再逐步加字符设备、中断、DMA。这样能把环境问题和代码问题分开。</p>
<p>模块参数用 <code>module_param()</code> 定义，加载时通过 <code>insmod xxx.ko param=1</code> 传入，方便现场调整而不重新编译。</p>`,
        pitfalls: [
          "<b>不声明 LICENSE。</b>内核被标记污染，部分符号不可用。",
          "<b>模块里用 printf。</b>内核没有 libc，链接失败或崩溃。",
          "<b>直接解引用用户指针。</b>可能访问非法地址，导致 oops。",
          "<b>init 返回非 0 但没清理资源。</b>内存泄漏。"
        ],
        follow: [
          ["模块编译为什么要指定内核源码路径？", "模块需要内核头文件和配置，Makefile 通过 -C 指向内核源码目录，使用内核的编译规则生成 .ko。"],
          ["什么是 vermagic？", "模块里记录的版本魔术字符串，包含内核版本、SMP、预empt 等配置；与当前内核不匹配时拒绝加载。" ]
        ]
      },

      {
        id: "L-08",
        chapter: "driver",
        topic: "platform",
        title: "platform 总线和设备树是怎么匹配的？probe 什么时候被调用？",
        diff: "高级",
        freq: "高频",
        type: "驱动模型题",
        point: "设备树节点与 of_match_table 的 compatible 匹配，匹配成功后调用 probe。",
        q: `<p>面试官：设备树里写了一个节点，驱动怎么知道该由它来处理？probe 函数的调用时机是什么？</p>`,
        exam: `<p>考察 Linux 驱动模型。能说出“compatible 匹配、platform_driver 注册、probe 拿到资源”，就很好。</p>`,
        core: `<p>匹配：设备树解析后每个节点生成一个 <code>platform_device</code> 带 <code>compatible</code>；驱动注册 <code>platform_driver</code>，<code>of_match_table</code> 列出支持的字符串；总线比较两者，匹配成功调用 probe，probe 里用 <code>platform_get_resource</code>、<code>devm_ioremap_resource</code>、<code>platform_get_irq</code> 拿寄存器、中断、时钟。</p><p>调用时机：设备或驱动任一方注册时总线都会尝试匹配，所以 probe 可能在驱动注册时立即执行，也可能在设备后来出现时执行。probe 里获取资源、初始化硬件、注册字符设备/输入设备/网络设备、申请中断。</p><p>失败时要返回错误码并按相反顺序释放已申请的东西——内核不会因为 probe 失败就调 remove，它只通过 devres 回收 <code>devm_</code> 系列申请的资源，非 devm 的（<code>request_irq</code>、<code>cdev_add</code>）必须手工释放。常见问题：compatible 写错不匹配、资源获取失败没返回错误、多个驱动匹配同一节点。</p>`,
        answer: `<p><b>匹配过程：</b></p>
<ol>
<li>设备树解析后，每个节点生成一个 <code>platform_device</code>，带有 <code>compatible</code> 属性；</li>
<li>驱动用 <code>platform_driver</code> 注册，其中的 <code>of_match_table</code> 列出支持的 compatible 字符串；</li>
<li>总线把设备的 compatible 与驱动的匹配表比较，匹配成功则调用驱动的 <code>probe</code> 函数；</li>
<li>probe 里通过 <code>platform_get_resource</code>、<code>devm_ioremap_resource</code>、<code>platform_get_irq</code> 等获取寄存器、中断、时钟等资源。</li>
</ol>
<p><b>probe 的调用时机：</b>设备或驱动任一方注册时，总线都会尝试匹配；匹配成功就调用 probe。所以 probe 可能在驱动注册时立即执行，也可能在设备后来出现时执行。</p>
<p><b>probe 里要做的：</b>获取资源、初始化硬件、注册字符设备/输入设备/网络设备等、申请中断。失败时要返回错误码并<b>自己按相反顺序释放已经申请的东西</b>——注意内核<b>不会</b>因为 probe 失败就调用 remove，它只会通过 devres 回收 <code>devm_</code> 系列接口申请的资源，非 devm 资源（如 <code>request_irq</code>、<code>cdev_add</code>）必须手工释放。</p>
<p><b>常见问题：</b>compatible 写错导致不匹配；probe 里资源获取失败但没返回错误；多个驱动匹配同一节点。</p>`,
        principle: `<p>Linux 驱动模型是“总线-设备-驱动”三方模型：总线负责匹配，设备描述硬件资源，驱动实现操作。设备树把硬件描述从代码里分离出来，同一份内核可以支持不同板子。</p>
<p>compatible 是匹配的钥匙，格式通常是“厂商,型号”，可以有多个备选，按顺序匹配。</p>`,
        fig: {
          type: "flow",
          title: "platform 驱动的匹配流程",
          tag: "platform bus",
          items: [
            { t: "解析设备树", d: "生成 platform_device" },
            { t: "注册驱动", d: "platform_driver_register" },
            { t: "总线匹配", d: "比较 compatible" },
            { t: "调用 probe", d: "获取资源、初始化硬件" },
            { t: "注册设备节点", d: "/dev 下出现设备" }
          ]
        },
        code: {
          lang: "c",
          title: "my_platform.c",
          src: `#include <linux/module.h>
#include <linux/platform_device.h>
#include <linux/of.h>
#include <linux/io.h>

static int my_probe(struct platform_device *pdev)
{
    struct resource *res;
    void __iomem *base;
    int irq;

    /* 1. 获取寄存器资源并映射 */
    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    base = devm_ioremap_resource(&pdev->dev, res);
    if (IS_ERR(base)) return PTR_ERR(base);

    /* 2. 获取中断号 */
    irq = platform_get_irq(pdev, 0);
    if (irq < 0) return irq;

    /* 3. 初始化硬件、注册设备 */
    dev_info(&pdev->dev, "probe: base=%p irq=%d\\n", base, irq);
    return 0;
}

static int my_remove(struct platform_device *pdev)
{
    /* devm_ 分配的资源会自动释放 */
    return 0;
}

static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,my-device" },
    { }
};
MODULE_DEVICE_TABLE(of, my_of_match);

static struct platform_driver my_driver = {
    .probe  = my_probe,
    .remove = my_remove,
    .driver = {
        .name = "my-device",
        .of_match_table = my_of_match,
    },
};
module_platform_driver(my_driver);

MODULE_LICENSE("GPL");`
        },
        codeNote: "devm_ 系列接口绑定到设备生命周期，remove 时自动释放，能显著减少错误路径的资源泄漏。",
        apply: `<p>我做传感器驱动时，把寄存器地址、中断号、时钟都写进设备树，驱动只负责按 compatible 匹配和申请资源。换板子只改 dts，驱动不用动。</p>
<p>调试 probe 不执行时，先看 <code>/sys/bus/platform/devices/</code> 和 <code>dmesg</code>，确认设备是否生成、compatible 是否拼错。</p>`,
        pitfalls: [
          "<b>compatible 拼写错误。</b>驱动永远不 probe。",
          "<b>probe 失败不返回错误码。</b>内核认为初始化成功，后续访问空指针。",
          "<b>用 ioremap 不用 devm_ioremap。</b>错误路径忘记 iounmap，内存泄漏。",
          "<b>直接访问物理地址。</b>没有映射，触发 oops。"
        ],
        follow: [
          ["设备树和 platform_device 是什么关系？", "设备树节点在启动时被解析成 platform_device，资源从 reg、interrupts 等属性提取；老式板级代码则手动注册 platform_device。"],
          ["probe 可能被调用多次吗？", "可能，设备热插拔或驱动重新绑定时会再次 probe；驱动要保证可重复初始化，并在 remove 里彻底清理。" ]
        ]
      },

      {
        id: "L-09",
        chapter: "driver",
        topic: "ioctl",
        title: "ioctl 怎么用？为什么不能用 read/write 传控制命令？",
        diff: "高级",
        freq: "中频",
        type: "接口设计题",
        point: "ioctl 用于非数据流的控制操作，命令号用 _IO/_IOR/_IOW 宏编码方向和大小。",
        q: `<p>面试官：字符设备要设置波特率、清空缓冲区，这些操作用 read/write 怎么传？还是用 ioctl？</p>`,
        exam: `<p>考察驱动接口设计。能说出“read/write 传数据流、ioctl 传控制命令”，以及命令号的编码规则，就很好。</p>`,
        core: `<p>read/write 的语义是数据传输：读设备产生的数据、写数据到设备；控制命令（设参数、启停、清缓冲）不是数据流，混进去会让协议复杂难扩展。ioctl 专门做设备控制：用户调 <code>ioctl(fd, cmd, arg)</code>，驱动在 <code>unlocked_ioctl</code> 里按 cmd 分发。</p><p>命令号用 <code>_IO</code>、<code>_IOR</code>、<code>_IOW</code>、<code>_IOWR</code> 生成，包含方向、类型（magic，通常一个字符避免冲突）、序号、参数大小，内核能检查参数大小减少错误，如 <code>#define MY_SET_BAUD _IOW('M', 1, int)</code>。</p><p>注意：用户指针必须 <code>copy_from_user/copy_to_user</code>；命令号要唯一；不要用 ioctl 传大量数据，大数据走 read/write 或 mmap；复杂参数用结构体并保留版本/大小字段便于扩展。</p>`,
        answer: `<p><b>read/write 的语义是数据传输</b>：读设备产生的数据、写数据到设备。控制命令（设置参数、启动/停止、清空缓冲）不是数据流，混在 read/write 里会让协议复杂、难以扩展。</p>
<p><b>ioctl</b> 专门用于设备控制：用户态调用 <code>ioctl(fd, cmd, arg)</code>，驱动在 <code>unlocked_ioctl</code> 里根据 cmd 分发。</p>
<p><b>命令号编码：</b>用 <code>_IO</code>、<code>_IOR</code>、<code>_IOW</code>、<code>_IOWR</code> 宏生成，包含：</p>
<ul>
<li>方向（读/写/双向）；</li>
<li>类型（magic，通常是一个字符，避免与其它驱动冲突）；</li>
<li>序号；</li>
<li>参数大小。</li>
</ul>
<p>这样内核可以检查参数大小，减少错误。示例：<code>#define MY_SET_BAUD _IOW('M', 1, int)</code>。</p>
<p><b>注意事项：</b></p>
<ul>
<li>用户指针必须用 <code>copy_from_user</code>/<code>copy_to_user</code>；</li>
<li>命令号要唯一，避免不同驱动冲突；</li>
<li>不要用 ioctl 传大量数据，大数据用 read/write 或 mmap；</li>
<li>复杂参数用结构体，并在结构体里保留版本/大小字段，便于扩展。</li>
</ul>`,
        principle: `<p>ioctl 是字符设备的标准控制通道，内核不解释命令内容，只负责把命令和参数传给驱动。命令号编码让内核能做一些基本校验，也方便工具解析。</p>
<p>read/write 适合流式数据，ioctl 适合离散的控制动作，两者分工让接口清晰。</p>`,
        fig: {
          type: "table",
          title: "read/write 与 ioctl 的分工",
          tag: "ioctl",
          head: ["操作", "语义", "典型用途"],
          rows: [
            ["read", "从设备取数据", "读传感器、收网络包"],
            ["write", "向设备送数据", "发串口数据、写屏幕"],
            ["ioctl", "控制设备", "设置参数、启停、清缓冲"],
            ["mmap", "映射设备内存", "帧缓冲、大块共享内存"]
          ]
        },
        code: {
          lang: "c",
          title: "my_ioctl.c",
          src: `#include <linux/ioctl.h>
#include <linux/uaccess.h>

#define MY_IOC_MAGIC  'M'
#define MY_SET_BAUD   _IOW(MY_IOC_MAGIC, 1, int)
#define MY_GET_STATUS _IOR(MY_IOC_MAGIC, 2, int)
#define MY_CLEAR_BUF  _IO(MY_IOC_MAGIC, 3)

static long my_ioctl(struct file *filp, unsigned int cmd, unsigned long arg)
{
    int val;

    switch (cmd) {
    case MY_SET_BAUD:
        if (copy_from_user(&val, (void __user *)arg, sizeof(val)))
            return -EFAULT;
        /* 设置波特率 */
        return 0;

    case MY_GET_STATUS:
        val = 1;
        if (copy_to_user((void __user *)arg, &val, sizeof(val)))
            return -EFAULT;
        return 0;

    case MY_CLEAR_BUF:
        /* 清空缓冲区 */
        return 0;

    default:
        return -ENOTTY;
    }
}

static const struct file_operations my_fops = {
    .owner          = THIS_MODULE,
    .unlocked_ioctl = my_ioctl,
};`
        },
        codeNote: "新驱动用 unlocked_ioctl（不带 BKL），内部自行加锁；老接口 ioctl 已逐渐废弃。",
        apply: `<p>我做串口驱动时，把波特率、数据位、停止位打包成结构体，用一个 ioctl 设置，避免多次调用产生中间状态。</p>
<p>命令号统一在一个头文件里定义，用户态和内核态共用，防止两边写不一致。</p>`,
        pitfalls: [
          "<b>直接解引用用户指针。</b>必须 copy_from/to_user。",
          "<b>命令号冲突。</b>不同驱动用同一个 magic 和序号。",
          "<b>用 ioctl 传大块数据。</b>效率低，应该用 read/write 或 mmap。",
          "<b>不检查参数大小。</b>结构体版本不一致时越界。"
        ],
        follow: [
          ["ioctl 和 sysfs 属性怎么选？", "ioctl 适合命令式操作和二进制参数；sysfs 适合简单的配置项，能用 echo/cat 操作，便于脚本使用。"],
          ["为什么 ioctl 命令要用宏生成？", "宏把方向、类型、序号、大小编码成 32 位命令号，内核和工具可以解析，减少手写错误和冲突。" ]
        ]
      },

      {
        id: "L-10",
        chapter: "driver",
        topic: "irq",
        title: "中断下半部是什么？tasklet、工作队列、线程化中断怎么选？",
        diff: "高级",
        freq: "高频",
        type: "内核机制题",
        point: "上半部快速响应、下半部处理耗时；tasklet 在软中断上下文、工作队列在进程上下文可睡眠。",
        q: `<p>面试官：中断处理程序里为什么不能做太多事？下半部有哪几种实现？</p>`,
        exam: `<p>考察内核对中断的处理策略。能说出“上半部关中断、下半部可延迟”，以及 tasklet 与工作队列的上下文差异，就很好。</p>`,
        core: `<p>上半部 hardirq 在中断到来后立即执行，此时本地中断被关闭或部分关闭，必须非常快，只做读状态、清中断、存必要数据、调度下半部；下半部延迟执行耗时处理，此时中断已重新打开。</p><p>softirq 是内核静态定义的软中断，优先级高、跑在中断上下文、不能睡眠，一般由内核子系统使用，驱动很少直接注册；tasklet 基于 softirq、动态注册、软中断上下文、不能睡眠，同一 tasklet 不会并发执行，适合短小延迟处理；工作队列跑在进程上下文、可以睡眠，适合需要 I/O、内存分配、互斥锁的耗时操作；线程化中断把整个处理线程化，上半部只做最小唤醒，其余在线程里执行、可以睡眠，实时性更好，PREEMPT_RT 常用。</p><p>选择：能在上半部快速做完就做完；需要少量延迟且不睡眠用 tasklet；需要睡眠或耗时就工作队列；实时性要求高用线程化中断。</p>`,
        answer: `<p><b>上半部（hardirq）</b>：中断到来后立即执行，此时本地中断被关闭（或部分关闭），必须非常快。只做：读取状态、清中断、保存必要数据、调度下半部。</p>
<p><b>下半部</b>：延迟执行耗时处理，此时中断已重新打开，可以处理更多中断。</p>
<p><b>常见实现：</b></p>
<ul>
<li><b>softirq</b>：内核静态定义的软中断，优先级高，运行在中断上下文，不能睡眠；一般由内核子系统使用，驱动很少直接注册。</li>
<li><b>tasklet</b>：基于 softirq，动态注册，运行在软中断上下文，不能睡眠，同一 tasklet 不会并发执行；适合短小的延迟处理。</li>
<li><b>工作队列（workqueue）</b>：运行在进程上下文，<b>可以睡眠</b>，适合需要 I/O、内存分配、互斥锁的耗时操作。</li>
<li><b>线程化中断（threaded IRQ）</b>：把整个中断处理线程化，上半部只做最小唤醒，其余在线程里执行，可以睡眠，实时性更好（PREEMPT_RT 常用）。</li>
</ul>
<p><b>选择建议：</b>能在上半部快速完成的就做完；需要少量延迟且不睡眠用 tasklet；需要睡眠或耗时用工作队列；对实时性要求高用线程化中断。</p>`,
        principle: `<p>中断上下文没有进程上下文，不能睡眠（不能调用可能阻塞的函数），否则会破坏调度器。所以耗时操作必须推迟到可以睡眠的上下文。</p>
<p>下半部的本质是把“必须立即做”和“可以稍后做”分开，缩短关中断时间，提高系统响应能力。</p>`,
        fig: {
          type: "table",
          title: "下半部机制对比",
          tag: "bottom half",
          head: ["机制", "上下文", "能否睡眠", "适用"],
          rows: [
            ["softirq", "中断上下文", "否", "内核子系统"],
            ["tasklet", "软中断上下文", "否", "短小延迟处理"],
            ["workqueue", "进程上下文", "是", "耗时、可能阻塞"],
            ["线程化中断", "内核线程", "是", "实时性要求高"]
          ]
        },
        code: {
          lang: "c",
          title: "irq_work.c",
          src: `#include <linux/interrupt.h>
#include <linux/workqueue.h>
#include <linux/io.h>

#define IRQ_NUM     42              /* 实际应从 platform_get_irq() 或设备树获得 */
#define REG_STATUS  0x00
#define IRQ_PENDING BIT(0)

struct my_dev {
    void __iomem *base;
};

static struct work_struct my_work;
static struct my_dev my_dev;        /* IRQF_SHARED 要求 dev_id 非空且唯一，用它做标识 */

static void my_work_handler(struct work_struct *w)
{
    /* 进程上下文，可以睡眠、可以加锁、可以分配内存 */
    msleep(10);
    pr_info("workqueue: handle slow part\\n");
}

static irqreturn_t my_isr(int irq, void *dev_id)
{
    struct my_dev *d = dev_id;

    /* 共享中断：必须读本设备的状态寄存器判断中断源，不是自己的就返回 IRQ_NONE。
     * 注意 dev_id 就是注册时传入的那个指针，拿它和自己比较恒为真，判断不了来源。 */
    if (!(readl(d->base + REG_STATUS) & IRQ_PENDING)) return IRQ_NONE;

    writel(IRQ_PENDING, d->base + REG_STATUS);   /* 清中断 */
    schedule_work(&my_work);                     /* 上半部只做最快的事 */
    return IRQ_HANDLED;
}

static int __init my_init(void)
{
    INIT_WORK(&my_work, my_work_handler);

    /* 共享中断的 dev_id 传 NULL 会直接被内核拒绝（-EINVAL） */
    return request_irq(IRQ_NUM, my_isr, IRQF_SHARED, "my", &my_dev);
}`
        },
        codeNote: "request_irq 的 flags 决定是否共享、是否触发线程化；共享中断必须能判断中断是否来自本设备。",
        apply: `<p>我做网卡/串口驱动时，上半部只读状态和清中断，把协议处理和缓冲区拷贝放到 NAPI 或工作队列，避免长时间关中断导致丢包。</p>
<p>调试中断问题时，用 <code>/proc/interrupts</code> 看中断计数，用 ftrace 看上下半部耗时。</p>`,
        pitfalls: [
          "<b>上半部做耗时操作。</b>关中断时间过长，系统响应变差。",
          "<b>在 tasklet 里睡眠。</b>内核 oops。",
          "<b>共享中断不判断来源。</b>误处理其它设备的中断。",
          "<b>忘记清中断标志。</b>中断反复触发，系统卡死。"
        ],
        follow: [
          ["tasklet 为什么不能睡眠？", "它运行在软中断上下文，没有关联的进程，调度器无法切换，睡眠会导致内核异常。"],
          ["线程化中断有什么好处？", "中断处理运行在内核线程，可以睡眠、可以被调度，配合优先级能改善实时性，也便于调试。" ]
        ]
      },

      {
        id: "L-11",
        chapter: "basic",
        topic: "sync",
        title: "自旋锁和信号量有什么区别？中断里为什么只能用自旋锁？",
        diff: "高级",
        freq: "高频",
        type: "内核机制题",
        point: "自旋锁忙等、不能睡眠、适合短临界区；信号量可睡眠、适合可能阻塞的场景。",
        q: `<p>面试官：驱动里保护共享数据，什么时候用 spinlock，什么时候用 mutex？中断上下文能用哪个？</p>`,
        exam: `<p>考察内核对并发控制的理解。能说出“中断上下文不能睡眠，所以不能用 mutex”，以及 spin_lock_irqsave 的用途，就很好。</p>`,
        core: `<p>自旋锁获取不到时忙等、不睡眠，临界区必须很短、不能调可能睡眠的函数，可用于中断上下文；单核上退化为关抢占，但仍要正确使用。信号量/互斥量获取不到时睡眠、让出 CPU，适合临界区较长或可能阻塞的场景，不能用于中断上下文，因为中断里不能睡眠；mutex 有优先级继承，semaphore 没有。</p><p>中断和进程共享数据：进程上下文加锁时要关中断，否则中断处理程序可能在同一 CPU 上打断临界区导致死锁，用 <code>spin_lock_irqsave(&amp;lock, flags)</code> 保存并关本地中断，解锁时恢复。</p><p>原则：临界区短、可能在中断里访问用 spinlock；可能睡眠、临界区长用 mutex；只读共享用 RCU。</p>`,
        answer: `<p><b>自旋锁（spinlock）：</b></p>
<ul>
<li>获取不到时<b>忙等</b>，不睡眠；</li>
<li>临界区必须很短，不能调用可能睡眠的函数；</li>
<li>可用于中断上下文；</li>
<li>单核上自旋锁退化为关抢占，但仍需正确使用。</li>
</ul>
<p><b>信号量/互斥量（semaphore/mutex）：</b></p>
<ul>
<li>获取不到时<b>睡眠</b>，让出 CPU；</li>
<li>适合临界区较长或可能阻塞的场景；</li>
<li><b>不能用于中断上下文</b>，因为中断里不能睡眠；</li>
<li>mutex 有优先级继承，semaphore 没有。</li>
</ul>
<p><b>中断与进程共享数据：</b>进程上下文加锁时要关中断，否则中断处理程序可能在同一 CPU 上打断临界区，导致死锁。用 <code>spin_lock_irqsave(&amp;lock, flags)</code> 保存并关闭本地中断，解锁时恢复。</p>
<p><b>选择原则：</b>临界区短、可能在中断里访问 → spinlock；可能睡眠、临界区长 → mutex；只读共享 → RCU。</p>`,
        principle: `<p>自旋锁的本质是一个原子变量加内存屏障，保证同一时刻只有一个 CPU 进入临界区。忙等期间 CPU 不能做别的事，所以临界区必须短。</p>
<p>信号量用等待队列实现，获取不到时把当前任务挂起，调度器切换到其它任务，CPU 利用率更高，但有调度开销。</p>`,
        fig: {
          type: "table",
          title: "spinlock 与 mutex 对比",
          tag: "kernel locking",
          head: ["维度", "spinlock", "mutex"],
          rows: [
            ["获取失败", "忙等", "睡眠"],
            ["中断上下文", "可用", "不可用"],
            ["临界区", "必须很短", "可以较长"],
            ["优先级继承", "无", "有"],
            ["典型场景", "中断共享数据", "进程间共享资源"]
          ]
        },
        code: {
          lang: "c",
          title: "spinlock_demo.c",
          src: `#include <linux/spinlock.h>
#include <linux/interrupt.h>

static DEFINE_SPINLOCK(my_lock);
static int shared_data;

/* 进程上下文：关中断 + 自旋锁，防止被中断打断 */
void process_update(int v)
{
    unsigned long flags;
    spin_lock_irqsave(&my_lock, flags);
    shared_data = v;
    spin_unlock_irqrestore(&my_lock, flags);
}

/* 中断上下文：只需要自旋锁（中断已经关闭） */
irqreturn_t my_isr(int irq, void *dev)
{
    spin_lock(&my_lock);
    shared_data++;
    spin_unlock(&my_lock);
    return IRQ_HANDLED;
}`
        },
        codeNote: "spin_lock_irqsave 保存的是本地 CPU 的中断状态；多核场景下自旋锁本身保证跨核互斥。",
        apply: `<p>我做 DMA 缓冲管理时，中断和进程都会修改链表，用 spin_lock_irqsave 保护，临界区只做指针操作，绝不调用可能睡眠的函数。</p>
<p>如果临界区需要拷贝大量数据或等待硬件，改用 mutex 并把操作放到工作队列。</p>`,
        pitfalls: [
          "<b>中断里用 mutex。</b>可能睡眠，内核崩溃。",
          "<b>spinlock 临界区调用 kmalloc(GFP_KERNEL)。</b>可能睡眠。",
          "<b>进程上下文只用 spin_lock 不关中断。</b>同一 CPU 上中断打断后死锁。",
          "<b>忘记解锁。</b>后续访问永久卡死。"
        ],
        follow: [
          ["spin_lock_irqsave 和 spin_lock_bh 有什么区别？", "irqsave 关闭本地中断并保存状态；bh 只关闭软中断（下半部），适合进程与软中断共享数据的场景。"],
          ["RCU 适合什么场景？", "读多写少、对读性能要求高的场景，读侧几乎无开销，写侧需要等待宽限期，适合链表、路由表等。" ]
        ]
      },

      {
        id: "L-12",
        chapter: "driver",
        topic: "sysfs",
        title: "sysfs 和 procfs 有什么区别？驱动怎么暴露参数给用户态？",
        diff: "高级",
        freq: "中频",
        type: "内核接口题",
        point: "sysfs 结构化展示设备/驱动/总线，procfs 偏进程和内核状态；属性用 show/store 实现。",
        q: `<p>面试官：想在 /sys 下暴露一个可读写的驱动参数，怎么实现？为什么不用 procfs？</p>`,
        exam: `<p>考察内核与用户态接口设计。能说出“sysfs 一个属性一个文件、show/store 回调、设备模型绑定”，就很好。</p>`,
        core: `<p>sysfs 是内核设备模型的结构化视图，按总线/设备/驱动/类组织，每个文件对应一个属性、通常只表达一个值，适合暴露设备配置和状态；procfs 早期用于进程信息，后来被驱动滥用存各种状态，结构松散、不适合结构化设备信息，新驱动优先用 sysfs。</p><p>实现：定义 <code>DEVICE_ATTR_RW(name)</code> 或 <code>DEVICE_ATTR_RO</code> 生成 show/store 回调；show 把值格式化到缓冲（注意 PAGE_SIZE 限制）返回写入长度；store 解析用户输入、范围检查、返回消耗字节数；用 <code>device_create_file</code> 或属性组注册到设备。</p><p>注意：show/store 跑在进程上下文（由读写文件的进程触发），可以睡眠、可以加锁，但不宜长时间阻塞，否则调用它的进程（常是 udev 或启动脚本）会被卡住；写入要严格校验避免非法值弄坏硬件；一个属性一个值，复杂配置用 ioctl 或 configfs。</p>`,
        answer: `<p><b>sysfs</b> 是内核设备模型的结构化视图，按“总线/设备/驱动/类”组织，每个文件对应一个属性，通常一个文件只表达一个值。适合暴露设备配置、状态。</p>
<p><b>procfs</b> 早期用于进程信息，后来也被驱动滥用存放各种状态；它的结构松散，不适合结构化设备信息。新驱动应优先用 sysfs。</p>
<p><b>实现方式：</b></p>
<ul>
<li>定义 <code>DEVICE_ATTR_RW(name)</code> 或 <code>DEVICE_ATTR_RO</code>，生成 show/store 回调；</li>
<li>show 函数把值格式化到缓冲区（注意 PAGE_SIZE 限制），返回写入长度；</li>
<li>store 函数解析用户输入，做范围检查，返回消耗的字节数；</li>
<li>用 <code>device_create_file</code> 或属性组注册到设备。</li>
</ul>
<p><b>注意事项：</b></p>
<ul>
<li>show/store 运行在<b>进程上下文</b>（由读写文件的进程触发），可以睡眠，也可以加锁；但不宜做长时间阻塞的操作，否则调用它的进程（常常是 udev 或启动脚本）会被卡住；</li>
<li>写入要严格校验，避免非法值导致硬件异常；</li>
<li>一个属性一个值，不要塞复杂结构；复杂配置用 ioctl 或 configfs。</li>
</ul>`,
        principle: `<p>sysfs 把内核对象模型映射成文件系统，用户通过读写文件与内核交互，不需要专门的工具。这种“文件即接口”的设计让脚本和标准工具都能操作设备。</p>
<p>属性的 show/store 是回调，内核在读写文件时调用，所以驱动不需要自己实现文件操作。</p>`,
        fig: {
          type: "table",
          title: "sysfs 与 procfs 对比",
          tag: "sysfs",
          head: ["维度", "sysfs", "procfs"],
          rows: [
            ["组织方式", "总线/设备/驱动/类", "进程 + 杂项"],
            ["用途", "设备模型、属性", "进程信息、内核状态"],
            ["文件粒度", "一属性一文件", "较自由"],
            ["推荐程度", "新驱动首选", "仅进程/调试"]
          ]
        },
        code: {
          lang: "c",
          title: "sysfs_attr.c",
          src: `#include <linux/device.h>
#include <linux/sysfs.h>

static int threshold = 100;

static ssize_t threshold_show(struct device *dev,
                              struct device_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\\n", threshold);
}

static ssize_t threshold_store(struct device *dev,
                               struct device_attribute *attr,
                               const char *buf, size_t count)
{
    int val;
    if (kstrtoint(buf, 10, &val)) return -EINVAL;
    if (val < 0 || val > 1000) return -ERANGE;

    threshold = val;
    return count;
}

static DEVICE_ATTR_RW(threshold);

static struct attribute *my_attrs[] = {
    &dev_attr_threshold.attr,
    NULL,
};
ATTRIBUTE_GROUPS(my);

/* 在 probe 里：device_add_groups(&pdev->dev, my_groups); */`
        },
        codeNote: "sysfs_emit 会自动处理缓冲区边界，比 sprintf 安全，新代码应优先使用。",
        apply: `<p>我把传感器的采样率、量程做成 sysfs 属性，产线用脚本就能配置，不需要专门的上位机工具。</p>
<p>复杂配置（如多组滤波参数）我用 configfs 或 ioctl，避免 sysfs 里出现难以解析的长字符串。</p>`,
        pitfalls: [
          "<b>show 里用 sprintf 越界。</b>缓冲区只有 PAGE_SIZE。",
          "<b>store 不校验范围。</b>非法值导致硬件异常。",
          "<b>属性里做耗时操作。</b>读写文件的进程被阻塞。",
          "<b>用 procfs 放设备信息。</b>结构混乱，不推荐。"
        ],
        follow: [
          ["sysfs 属性文件和设备节点有什么区别？", "sysfs 文件用于配置和状态查询，不传输数据流；设备节点（/dev）用于 read/write/ioctl 数据交互。"],
          ["configfs 适合什么？", "适合动态创建内核对象（如 USB gadget、target），用户通过 mkdir 和写属性来配置，比 sysfs 更灵活。" ]
        ]
      },

      {
        id: "L-13",
        chapter: "build",
        topic: "uboot",
        title: "U-Boot 的启动流程是怎样的？环境变量和 bootcmd 怎么用？",
        diff: "高级",
        freq: "中频",
        type: "系统启动题",
        point: "SPL/TPL 初始化 DRAM，主 U-Boot 加载内核和设备树，bootcmd 决定启动方式。",
        q: `<p>面试官：板子上电后 U-Boot 做了什么？为什么有的平台有 SPL，有的没有？</p>`,
        exam: `<p>考察嵌入式 Linux 启动链。能说出“ROM → SPL → U-Boot → kernel → rootfs”，以及 SPL 的作用，就很好。</p>`,
        core: `<p>启动链：片内 ROM 按启动引脚从 SD/eMMC/NAND/SPI Flash 读第一阶段引导；SPL 在片内 SRAM 运行，初始化 DRAM、时钟、串口，把主 U-Boot 加载到 DRAM；U-Boot 初始化外设、网络、存储，读环境变量执行 bootcmd，把 kernel image 和 dtb 加载到内存、设 bootargs 后跳转；内核解压、初始化、挂根文件系统、启动 init。</p><p>需要 SPL 是因为片内 SRAM 很小（几十到几百 KB），放不下完整 U-Boot、也无法直接初始化 DRAM，SPL 的任务就是“把 DRAM 初始化好、把大程序搬过去”；有些 SoC 的 ROM 能直接加载完整 U-Boot 就不需要 SPL。环境变量存在 Flash 的 env 分区，bootcmd 是自动启动执行的命令序列，bootargs 传给内核（根文件系统位置、控制台），用 <code>printenv</code>、<code>setenv</code>、<code>saveenv</code> 操作。</p>`,
        answer: `<p><b>典型启动链：</b></p>
<ol>
<li><b>片内 ROM</b>：根据启动引脚从 SD/eMMC/NAND/SPI Flash 读取第一阶段引导程序；</li>
<li><b>SPL（Secondary Program Loader）</b>：在片内 SRAM 运行，初始化 DRAM、时钟、串口，然后把主 U-Boot 加载到 DRAM；</li>
<li><b>U-Boot</b>：完整功能，初始化外设、网络、存储，读取环境变量，执行 bootcmd；</li>
<li><b>加载内核</b>：把 kernel image 和设备树加载到内存，设置启动参数，跳转；</li>
<li><b>内核启动</b>：解压、初始化、挂载根文件系统、启动 init。</li>
</ol>
<p><b>为什么需要 SPL：</b>片内 SRAM 很小（几十到几百 KB），放不下完整 U-Boot，也无法直接初始化 DRAM。SPL 的任务就是“把 DRAM 初始化好，把大程序搬过去”。有些 SoC 的 ROM 能直接加载完整 U-Boot，就不需要 SPL。</p>
<p><b>环境变量：</b>存在 Flash 的 env 分区，<code>bootcmd</code> 是自动启动时执行的命令序列，<code>bootargs</code> 传给内核（如根文件系统位置、控制台）。可以用 <code>printenv</code>、<code>setenv</code>、<code>saveenv</code> 操作。</p>`,
        principle: `<p>启动链的每一级都受上一级的资源限制：ROM 只能读小体积、SRAM 容量有限、DRAM 需要初始化后才能用。所以引导程序分层，逐步“解锁”更大的资源。</p>
<p>设备树把硬件描述传给内核，U-Boot 可以把自身使用的设备树修改后传给内核（如调整内存大小、启动参数）。</p>`,
        fig: {
          type: "flow",
          title: "嵌入式 Linux 启动链",
          tag: "boot chain",
          items: [
            { t: "片内 ROM", d: "按启动引脚读取 SPL" },
            { t: "SPL", d: "初始化 DRAM，加载 U-Boot" },
            { t: "U-Boot", d: "初始化外设，执行 bootcmd" },
            { t: "加载内核", d: "kernel + dtb 搬到内存" },
            { t: "内核启动", d: "挂载 rootfs，启动 init" }
          ]
        },
        code: {
          lang: "sh",
          title: "uboot_env.txt",
          src: `# 典型的环境变量配置
setenv bootargs 'console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootwait'
setenv loadaddr 0x80800000
setenv fdtaddr  0x83000000

# 从 eMMC 加载内核和设备树
setenv bootcmd 'mmc dev 0; fatload mmc 0:1 \${loadaddr} zImage; fatload mmc 0:1 \${fdtaddr} board.dtb; bootz \${loadaddr} - \${fdtaddr}'

saveenv
boot`
        },
        codeNote: "bootargs 里的 root= 必须与实际根文件系统分区一致，否则内核会 panic（找不到 init）。",
        apply: `<p>调试启动失败时，我先看串口有没有 SPL/U-Boot 输出：完全没有输出说明 SPL 或 DDR 初始化有问题；有 U-Boot 但卡在加载内核，检查 bootcmd 路径和文件系统格式。</p>
<p>量产时把环境变量固化到默认配置里，避免每块板子手动设置。</p>`,
        pitfalls: [
          "<b>bootargs 根分区写错。</b>内核 panic，找不到 init。",
          "<b>设备树与内核不匹配。</b>外设初始化失败或无法启动。",
          "<b>环境变量保存在 RAM。</b>重启后丢失。",
          "<b>SPL 与 U-Boot 版本不匹配。</b>加载失败或跑飞。"
        ],
        follow: [
          ["U-Boot 的设备树和内核的设备树是同一份吗？", "可以是同一份，U-Boot 会在启动前修改（如 memory reserve、bootargs），也可以使用单独的 U-Boot dts。"],
          ["如何进入 U-Boot 命令行？", "启动时按任意键（取决于配置的 bootdelay 和 stdin），或者设置环境变量让 bootcmd 不自动执行。" ]
        ]
      },

      {
        id: "L-14",
        chapter: "build",
        topic: "rootfs",
        title: "根文件系统里有什么？BusyBox 和 init 是什么关系？",
        diff: "中级",
        freq: "中频",
        type: "系统基础题",
        point: "根文件系统包含 init、库、设备节点、配置；BusyBox 提供精简的命令集，init 是第一个进程。",
        q: `<p>面试官：内核启动后为什么要挂载根文件系统？没有它会怎样？</p>`,
        exam: `<p>考察 Linux 系统组成。能说出“init 进程、/dev、/etc、库文件”，以及内核 panic 的原因，就很好。</p>`,
        core: `<p>根文件系统是内核启动后挂载的第一个文件系统，包含：init 程序（内核最后一步执行 <code>/sbin/init</code> 或 <code>init=</code> 指定的，是用户空间第一个进程 PID 1，负责起服务和管理进程）；基本命令和工具（ls、sh、mount，嵌入式常用 BusyBox 的精简版）；库文件（动态链接需要 libc、libm）；设备节点（<code>/dev</code> 下，现代多用 devtmpfs 自动生成）；<code>/etc</code> 下的配置和启动脚本；<code>/proc</code>、<code>/sys</code>、<code>/tmp</code> 等挂载点。没有根文件系统内核找不到 init 会 panic（No init found 或 Unable to mount root fs）。</p><p>BusyBox 把几百个常用命令编成一个可执行文件，通过符号链接和 <code>argv[0]</code> 判断当前调用哪个命令，极大节省空间，通常也提供 init（<code>/sbin/init</code> 链到 busybox）。</p>`,
        answer: `<p><b>根文件系统（rootfs）</b>是内核启动后挂载的第一个文件系统，包含：</p>
<ul>
<li><b>init 程序</b>：内核启动的最后一步是执行 <code>/sbin/init</code>（或通过 <code>init=</code> 指定），它是用户空间的第一个进程（PID 1），负责启动服务、管理进程；</li>
<li><b>基本命令和工具</b>：ls、sh、mount 等，嵌入式常用 BusyBox 提供精简版；</li>
<li><b>库文件</b>：动态链接的程序需要 libc、libm 等；</li>
<li><b>设备节点</b>：/dev 下的设备文件，现代系统多用 devtmpfs 自动生成；</li>
<li><b>配置</b>：/etc 下的网络、启动脚本；</li>
<li><b>挂载点</b>：/proc、/sys、/tmp 等。</li>
</ul>
<p><b>没有根文件系统：</b>内核找不到 init，会 panic（<code>No init found</code> 或 <code>Unable to mount root fs</code>），系统无法进入用户空间。</p>
<p><b>BusyBox：</b>把几百个常用命令编译成一个可执行文件，通过符号链接和 argv[0] 判断当前调用的是哪个命令，极大节省空间。它通常也提供 init（/sbin/init 链接到 busybox）。</p>`,
        principle: `<p>内核只负责硬件和系统调用，用户空间的程序、配置、服务都在根文件系统里。内核启动后必须挂载 rootfs 并执行 init，才能形成完整的系统。</p>
<p>BusyBox 的“多合一”设计利用 argv[0] 分发，避免为每个命令维护独立二进制，适合 Flash 容量有限的嵌入式设备。</p>`,
        fig: {
          type: "layers",
          title: "根文件系统的主要目录",
          tag: "rootfs",
          items: [
            { tag: "/bin", t: "基本命令（busybox 链接）", d: "sh、ls、cp 等" },
            { tag: "/sbin", t: "系统管理命令、init", d: "启动时使用" },
            { tag: "/etc", t: "配置文件与启动脚本", d: "网络、服务、inittab" },
            { tag: "/lib", t: "动态库和内核模块", d: "libc、.ko" },
            { tag: "/dev", t: "设备节点", d: "devtmpfs 自动生成" }
          ]
        },
        code: {
          lang: "sh",
          title: "inittab",
          src: `# BusyBox init 的配置示例
::sysinit:/etc/init.d/rcS
::respawn:/sbin/getty -L ttyS0 115200 vt100
::shutdown:/bin/umount -a -r
::restart:/sbin/init`
        },
        codeNote: "rcS 里通常挂载 /proc、/sys，配置网络，启动应用；注意脚本要有可执行权限。",
        apply: `<p>我做产品时用 BusyBox + 自定义 rcS，开机脚本负责挂载、配置网络、启动主程序，并在主程序退出时重启它（respawn）。</p>
<p>调试启动问题时，先确认 rootfs 分区和 bootargs 的 root= 一致，再看 init 脚本是否有语法错误。</p>`,
        pitfalls: [
          "<b>rootfs 缺少 init。</b>内核 panic。",
          "<b>动态库缺失。</b>程序报 “not found”，其实是找不到解释器或库。",
          "<b>脚本没有执行权限。</b>init 无法启动服务。",
          "<b>root= 分区写错。</b>挂载失败，panic。"
        ],
        follow: [
          ["initramfs 和 rootfs 有什么区别？", "initramfs 是打包进内核的早期文件系统，用于挂载真正的 rootfs 或做恢复；rootfs 是最终的根文件系统。"],
          ["只读根文件系统有什么好处？", "防止意外修改、提高可靠性，适合量产设备；需要写的目录（/tmp、/var）单独挂载为 tmpfs 或可写分区。" ]
        ]
      },

      {
        id: "L-15",
        chapter: "build",
        topic: "buildroot",
        title: "Buildroot 和 Yocto 有什么区别？项目里怎么选？",
        diff: "中级",
        freq: "中频",
        type: "工具选型题",
        point: "Buildroot 简单直接、适合中小项目；Yocto 灵活可扩展、适合复杂产品和长期维护。",
        q: `<p>面试官：要做一套嵌入式 Linux 系统，用 Buildroot 还是 Yocto？</p>`,
        exam: `<p>考察构建系统的实际经验。能说出“学习曲线、可定制性、包管理、维护成本”，就很好。</p>`,
        core: `<p>Buildroot 基于 Makefile，配置简单、学习曲线平缓，能生成完整 rootfs、工具链、内核、U-Boot；没有包管理器，升级要重新构建镜像；适合中小项目、产品形态固定、团队小。Yocto 基于 BitBake 和 recipe，用 layer 分层组织、定制能力强；支持包管理（rpm/deb/ipk）可增量升级；生态大，芯片厂商和社区有大量 layer；学习曲线陡、构建时间长，适合复杂产品、长期维护、多硬件平台。</p><p>选择：产品单一、快速上市、团队小用 Buildroot；要长期维护、多型号、复杂依赖、增量升级用 Yocto。无论选哪个都要把配置和自定义层纳入版本管理，保证可复现构建。</p>`,
        answer: `<p><b>Buildroot：</b></p>
<ul>
<li>基于 Makefile 的构建系统，配置简单，学习曲线平缓；</li>
<li>生成完整的 rootfs、工具链、内核、U-Boot；</li>
<li>没有包管理器，升级需要重新构建镜像；</li>
<li>适合中小项目、产品形态固定、团队规模小。</li>
</ul>
<p><b>Yocto：</b></p>
<ul>
<li>基于 BitBake 和 recipe，层次化（layer）组织，定制能力强；</li>
<li>支持包管理（rpm/deb/ipk），可以增量升级；</li>
<li>生态大，芯片厂商和社区提供大量 layer；</li>
<li>学习曲线陡，构建时间长，适合复杂产品、长期维护、多硬件平台。</li>
</ul>
<p><b>选择建议：</b></p>
<ul>
<li>产品单一、快速上市、团队小 → Buildroot；</li>
<li>需要长期维护、多型号、复杂依赖、增量升级 → Yocto；</li>
<li>无论选哪个，都要把配置和自定义层纳入版本管理，保证可复现构建。</li>
</ul>`,
        principle: `<p>两者本质都是“从源码构建完整系统”，区别在于抽象层次：Buildroot 用简单的包描述和全局配置，Yocto 用 recipe、layer、任务依赖描述构建过程，灵活但复杂。</p>
<p>可复现构建是共同目标：固定版本、固定配置、固定工具链，才能保证每次产出的镜像一致。</p>`,
        fig: {
          type: "table",
          title: "Buildroot 与 Yocto 对比",
          tag: "build system",
          head: ["维度", "Buildroot", "Yocto"],
          rows: [
            ["学习曲线", "平缓", "陡峭"],
            ["配置方式", "menuconfig", "layer + recipe"],
            ["包管理", "无", "支持"],
            ["构建时间", "较短", "较长"],
            ["适用", "中小项目", "复杂产品"]
          ]
        },
        apply: `<p>我做过的网关产品用 Buildroot，两周就能出第一版镜像；另一个多型号项目用 Yocto，因为有多个硬件变体和长期升级需求。</p>
<p>无论哪种，我都会把 defconfig、layer、补丁单独建仓库，并在 CI 里定时构建，尽早发现依赖问题。</p>`,
        pitfalls: [
          "<b>用 Buildroot 做复杂产品。</b>后期定制和维护成本高。",
          "<b>Yocto 不锁版本。</b>构建结果不可复现。",
          "<b>修改第三方包直接改源码。</b>升级时被覆盖，应该用补丁。",
          "<b>不管理配置文件。</b>换人后无法重建系统。"
        ],
        follow: [
          ["Buildroot 能增量升级吗？", "本身不提供包管理，通常整镜像升级（A/B 分区）；需要增量升级可以集成 opkg 或自建升级机制。"],
          ["Yocto 的 layer 是什么？", "一组 recipe、配置和类的集合，按优先级叠加，用于分离 BSP、发行版、应用等不同来源的定制。" ]
        ]
      },

      {
        id: "L-16",
        chapter: "basic",
        topic: "mmap",
        title: "mmap 是怎么把设备内存映射到用户态的？驱动要做什么？",
        diff: "高级",
        freq: "中频",
        type: "内核接口题",
        point: "驱动实现 mmap 回调，用 remap_pfn_range 把物理页映射到用户地址空间。",
        q: `<p>面试官：用户态想直接访问 FPGA 或 LCD 的寄存器，除了 read/write 还有什么办法？mmap 怎么实现？</p>`,
        exam: `<p>考察内存映射机制。能说出“驱动 mmap 回调 + remap_pfn_range、用户得到虚拟地址”，以及 cache 一致性问题，就很好。</p>`,
        core: `<p>mmap 把设备的一段物理内存映射到用户进程虚拟地址空间，用户态可直接读写，避免每次 read/write 的数据拷贝和系统调用开销，适合帧缓冲、FPGA 寄存器、大块共享缓冲。</p><p>驱动在 <code>file_operations</code> 里实现 mmap 回调，用 <code>remap_pfn_range</code> 把物理页帧号映射到用户 VMA，设置正确的 <code>vm_page_prot</code>（是否可缓存、可写），检查映射长度和偏移防越界。用户 <code>mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_SHARED, fd, offset)</code> 拿到虚拟地址后像普通内存一样访问。</p><p>注意：设备内存通常要设 non-cached（<code>pgprot_noncached</code>），否则 CPU 缓存会导致读写不生效；映射区域要页对齐；多进程共享用 <code>MAP_SHARED</code>；访问越界可能触发 SIGBUS 或破坏硬件。</p>`,
        answer: `<p><b>mmap 的作用：</b>把设备的一段物理内存映射到用户进程的虚拟地址空间，用户态可以直接读写，避免每次 read/write 的数据拷贝和系统调用开销。适合帧缓冲、FPGA 寄存器、大块共享缓冲区。</p>
<p><b>驱动实现：</b></p>
<ul>
<li>在 <code>file_operations</code> 里实现 <code>mmap</code> 回调；</li>
<li>用 <code>remap_pfn_range</code> 把物理页帧号映射到用户 VMA；</li>
<li>设置正确的 <code>vm_page_prot</code>（是否可缓存、是否可写）；</li>
<li>检查映射长度和偏移，防止越界访问。</li>
</ul>
<p><b>用户态：</b><code>mmap(NULL, len, PROT_READ|PROT_WRITE, MAP_SHARED, fd, offset)</code>，返回虚拟地址，之后像普通内存一样访问。</p>
<p><b>注意事项：</b></p>
<ul>
<li>设备内存通常要设为 non-cached（<code>pgprot_noncached</code>），否则 CPU 缓存会导致读写不生效；</li>
<li>映射区域的对齐要求（页对齐）；</li>
<li>多进程共享时用 MAP_SHARED；</li>
<li>访问越界可能触发 SIGBUS 或破坏硬件。</li>
</ul>`,
        principle: `<p>Linux 用虚拟内存管理，用户进程看到的地址是虚拟地址，必须经过页表映射才能访问物理内存。mmap 就是在进程页表里建立“虚拟地址 → 设备物理页”的映射。</p>
<p>remap_pfn_range 直接操作页表，把物理页帧映射到用户 VMA，不经过内核缓冲区，所以效率高。</p>`,
        fig: {
          type: "flow",
          title: "mmap 的映射过程",
          tag: "mmap",
          items: [
            { t: "用户调用 mmap", d: "传入 fd、长度、偏移" },
            { t: "内核找到驱动", d: "调用 file_operations.mmap" },
            { t: "建立页表", d: "remap_pfn_range 映射物理页" },
            { t: "返回虚拟地址", d: "用户直接读写" },
            { t: "munmap", d: "解除映射" }
          ]
        },
        code: {
          lang: "c",
          title: "my_mmap.c",
          src: `#include <linux/mm.h>
#include <linux/io.h>

#define MY_PHYS_BASE 0x40000000UL
#define MY_SIZE      0x1000UL

static int my_mmap(struct file *filp, struct vm_area_struct *vma)
{
    unsigned long size   = vma->vm_end - vma->vm_start;
    unsigned long offset = vma->vm_pgoff << PAGE_SHIFT;

    /* 偏移 + 长度都必须落在设备窗口内，否则会映射到不属于本设备的物理地址 */
    if (offset + size > MY_SIZE) return -EINVAL;

    /* 设备寄存器必须非缓存 */
    vma->vm_page_prot = pgprot_noncached(vma->vm_page_prot);

    if (remap_pfn_range(vma,
                        vma->vm_start,
                        (MY_PHYS_BASE + offset) >> PAGE_SHIFT,
                        size,
                        vma->vm_page_prot)) {
        return -EAGAIN;
    }
    return 0;
}

static const struct file_operations my_fops = {
    .owner = THIS_MODULE,
    .mmap  = my_mmap,
};`
        },
        codeNote: "映射设备寄存器一定要 noncached，否则 CPU 可能读到缓存里的旧值，写操作也可能被合并或延迟。",
        apply: `<p>我做图像采集时，把摄像头缓冲区 mmap 到用户态，应用直接读取帧数据，避免每帧一次拷贝，CPU 占用明显下降。</p>
<p>FPGA 寄存器也用 mmap 映射，用户态按偏移访问，比 ioctl 逐条读写快得多；但要确保偏移和权限检查正确。</p>`,
        pitfalls: [
          "<b>设备内存用可缓存映射。</b>读写不生效或数据不一致。",
          "<b>不检查映射长度。</b>用户可映射超出设备范围的内存。",
          "<b>偏移未按页对齐。</b>mmap 调用失败。",
          "<b>多进程用 MAP_PRIVATE。</b>修改不共享，行为不符合预期。"
        ],
        follow: [
          ["mmap 和 read/write 的性能差异有多大？", "mmap 省去用户态和内核态之间的数据拷贝，适合大块、频繁访问；小数据或一次性读写用 read/write 更简单。"],
          ["DMA 缓冲用 mmap 要注意什么？", "要保证 cache 一致性：DMA 写内存后 CPU 可能读到旧缓存，需要 invalidate；或者使用 non-cached 内存。" ]
        ]
      }
    ]
  });
})();
