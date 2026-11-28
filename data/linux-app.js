/* ============================================================
   20 Linux 应用编程与系统调优
   ============================================================ */
(function () {
  "use strict";

  EIK.register("linux-app", {
    chapters: [
      {
        id: "io",
        title: "套接字与 I/O 模型",
        topics: [
          { id: "socket", title: "TCP server 与阻塞模型" },
          { id: "multiplex", title: "select / poll / epoll" }
        ]
      },
      {
        id: "proc",
        title: "进程与线程",
        topics: [
          { id: "pthread", title: "线程、互斥锁与条件变量" },
          { id: "fork-daemon", title: "fork、守护进程与信号" }
        ]
      },
      {
        id: "net",
        title: "TCP 协议",
        topics: [
          { id: "tcp", title: "握手、挥手与流量控制" }
        ]
      },
      {
        id: "tool",
        title: "工具链与调试",
        topics: [
          { id: "cmd", title: "常用诊断命令" },
          { id: "libs", title: "静态库、动态库与 C 库" },
          { id: "debug", title: "gdb、strace 与 core dump" }
        ]
      },
      {
        id: "mem",
        title: "内存管理",
        topics: [
          { id: "vm", title: "虚拟内存与缺页" }
        ]
      }
    ],

    questions: [
      /* ---------------- LA-01 ---------------- */
      {
        id: "LA-01",
        chapter: "io",
        topic: "socket",
        title: "TCP server 的完整流程是怎样的？阻塞和非阻塞差在哪？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "考察 socket/bind/listen/accept/read/write/close 的调用顺序、backlog 与 SO_REUSEADDR，以及非阻塞下的 EAGAIN 和半包处理。",
        q: `<p>面试官：写一个 TCP server，<strong>从创建到收发数据的完整调用顺序是什么？</strong>阻塞和非阻塞的区别在哪？<strong>非阻塞下 read 返回 0 和 -1 分别代表什么？</strong></p>`,
        exam: `<p>这题是 Linux 应用岗的入门必问。能说清 listen 的 backlog、accept 返回新 fd、非阻塞要处理 EAGAIN 和半包，说明你写过真实的服务端，而不是只跑过 demo。</p>`,
        core: `<p>TCP 服务端 socket→bind→listen→accept→read/write；accept 返回新 fd，read 返回 0 是对端关闭，返回 -1 且 errno=EAGAIN 表示暂时没数据，其他 errno 才是错误。</p>`,
        answer: `<p><b>完整流程：</b></p>
<ol>
<li><code>socket(AF_INET, SOCK_STREAM, 0)</code> 创建监听套接字；</li>
<li><code>setsockopt(SO_REUSEADDR)</code>，避免重启时“Address already in use”；</li>
<li><code>bind()</code> 绑定地址和端口；</li>
<li><code>listen(fd, backlog)</code> 把主动套接字变成被动，内核开始维护连接队列；</li>
<li><code>accept()</code> 取出一个已完成连接的<b>新 fd</b>，监听 fd 继续 accept；</li>
<li>在新 fd 上 <code>read/write</code>（或 <code>recv/send</code>）；</li>
<li>对端关闭或出错时 <code>close(fd)</code>，监听 fd 最后再关。</li>
</ol>
<p><b>阻塞与非阻塞：</b>阻塞模式下，<code>accept</code> 没有新连接就睡、<code>read</code> 没有数据就睡，一个线程只能服务一个连接；非阻塞模式（<code>fcntl(O_NONBLOCK)</code>）下，没数据立刻返回 <code>-1</code> 并置 <code>errno = EAGAIN/EWOULDBLOCK</code>，程序要继续做别的事，等下次可读再读。</p>
<p><b>read 的返回值：</b></p>
<ul>
<li><code>&gt; 0</code>：读到的字节数，可能小于请求长度（半包），要循环读；</li>
<li><code>0</code>：对端<b>有序关闭</b>（发了 FIN），应该读完剩余数据后 close；</li>
<li><code>-1</code>：出错。非阻塞下 <code>EAGAIN</code> 表示“现在没数据，等会儿再来”；<code>EINTR</code> 表示被信号打断，可以重试；其他错误要关闭连接。</li>
</ul>
<p><b>写也不能假设一次写完。</b><code>write</code> 返回实际写入的字节数，可能小于请求值（发送缓冲满），要循环写剩余部分。还要忽略 <code>SIGPIPE</code>，否则对端关闭后写入会让进程直接退出。</p>`,
        principle: `<p><code>listen</code> 的 backlog 是“已完成三次握手、等待 accept”的队列长度上限（以及未完成握手队列），不是连接总数。队列满了以后，新连接可能被丢弃或收到 RST，表现为“高并发时偶发连不上”。</p>
<p>accept 返回的新 fd 和监听 fd 是两个独立对象：监听 fd 只负责接收连接，新 fd 才是这条连接的数据通道。新 fd 默认继承非阻塞属性吗？不继承——Linux 上 accept 出来的 fd 不带 O_NONBLOCK，要单独设置，或者用 <code>accept4(..., SOCK_NONBLOCK)</code>。</p>
<p>TCP 是字节流，没有消息边界。一次 read 可能读到半个包、一个半包或多个包，应用层必须自己定界（长度字段、分隔符或固定长度）。</p>`,
        fig: {
          type: "table",
          title: "阻塞与非阻塞的返回值处理",
          tag: "compare",
          head: ["调用", "阻塞模式", "非阻塞模式", "处理方式"],
          rows: [
            ["accept", "无连接则睡眠", "返回 -1 / EAGAIN", "稍后重试"],
            ["read", "无数据则睡眠", "返回 -1 / EAGAIN", "等可读事件再读"],
            ["read 返回 0", "对端关闭", "对端关闭", "读完剩余后 close"],
            ["write", "缓冲满则睡眠", "可能只写一部分 / EAGAIN", "循环写或注册可写事件"],
            ["connect", "等待握手完成", "返回 -1 / EINPROGRESS", "等可写事件查 SO_ERROR"]
          ]
        },
        code: {
          lang: "c",
          title: "tcp_server.c",
          src: `#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <signal.h>
#include <string.h>

static int set_nonblock(int fd)
{
    int fl = fcntl(fd, F_GETFL, 0);
    if (fl < 0) return -1;
    return fcntl(fd, F_SETFL, fl | O_NONBLOCK);
}

int main(void)
{
    signal(SIGPIPE, SIG_IGN);                 /* 对端关闭后写入不杀进程 */

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    int on = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &on, sizeof(on));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port        = htons(9000);

    if (bind(srv, (struct sockaddr *)&addr, sizeof(addr)) < 0) return 1;
    if (listen(srv, 128) < 0) return 1;
    set_nonblock(srv);

    for (;;) {
        struct sockaddr_in peer;
        socklen_t len = sizeof(peer);

        int c = accept(srv, (struct sockaddr *)&peer, &len);
        if (c < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                usleep(1000);                 /* 简化：实际应交给 epoll */
                continue;
            }
            if (errno == EINTR) continue;
            break;
        }
        set_nonblock(c);

        /* 这里只是演示：真实服务端应把 c 注册到 epoll，而不是阻塞处理 */
        char buf[4096];
        for (;;) {
            ssize_t n = read(c, buf, sizeof(buf));
            if (n > 0) {
                ssize_t off = 0;
                while (off < n) {
                    ssize_t w = write(c, buf + off, (size_t)(n - off));
                    if (w > 0) { off += w; continue; }
                    if (w < 0 && errno == EINTR) continue;
                    break;
                }
            } else if (n == 0) {
                break;                         /* 对端关闭 */
            } else {
                if (errno == EAGAIN || errno == EWOULDBLOCK) { usleep(1000); continue; }
                if (errno == EINTR) continue;
                break;
            }
        }
        close(c);
    }
    close(srv);
    return 0;
}`
        },
        codeNote: `<b>这段代码只用于说明调用顺序，不能直接上生产：</b>它 accept 之后就地循环处理，一个慢连接会堵住其他连接。真实服务端要把 fd 注册进 epoll，用事件驱动；<code>write</code> 也要处理“只写一部分”的情况，剩余数据挂到发送缓冲，等 EPOLLOUT 再写。`,
        apply: `<p>工程上还会加：<code>TCP_NODELAY</code>（小包低延迟场景关 Nagle）、<code>SO_KEEPALIVE</code> 或用应用层心跳、连接空闲超时、最大连接数限制、accept 后设置 <code>SO_RCVBUF/SO_SNDBUF</code>。</p>
<p>端口复用要分清：<code>SO_REUSEADDR</code> 解决 TIME_WAIT 导致的绑定失败；<code>SO_REUSEPORT</code> 允许多个进程/线程绑同一端口做负载均衡。两者语义不同，别混用。</p>`,
        pitfalls: [
          "<b>把 read 返回 0 当成“暂时没数据”。</b>0 是对端关闭，继续读会一直返回 0，连接泄漏。",
          "<b>假设一次 read 就是一个完整消息。</b>TCP 是字节流，必须自己定界。",
          "<b>不处理 write 的部分写。</b>发送缓冲满时只写了一半，剩下的数据丢了，协议错位。",
          "<b>不忽略 SIGPIPE。</b>对端关闭后写入，进程被信号杀死，服务直接挂。"
        ],
        follow: [
          [
            "listen 的 backlog 设多大合适？",
            "它影响等待 accept 的队列长度，不是并发上限。高并发短连接可以设大一些（几百），但最终受 <code>somaxconn</code> 限制；accept 太慢时，队列满了会丢连接。",
          ],
          [
            "accept4 比 accept 好在哪？",
            "可以一次性带上 <code>SOCK_NONBLOCK</code> 和 <code>SOCK_CLOEXEC</code>，避免“accept 后再 fcntl”的两次系统调用和竞态。",
          ],
          [
            "怎么检测连接已经断了？",
            "读返回 0、写返回 EPIPE/ECONNRESET、或心跳超时。TCP 本身没有“连接断开”的即时通知，闲置连接要靠 keepalive 或应用层心跳。"
          ]
        ]
      },

      /* ---------------- LA-02 ---------------- */
      {
        id: "LA-02",
        chapter: "io",
        topic: "multiplex",
        title: "select、poll、epoll 有什么区别？epoll 为什么高效？",
        diff: "高级",
        freq: "高频",
        type: "对比辨析题",
        point: "考察三者的数据结构、复杂度、fd 数量限制、触发模式，以及 epoll 在内核中的就绪队列机制。",
        q: `<p>面试官：<strong>select、poll、epoll 有什么区别？</strong>epoll 为什么高效？<strong>水平触发和边缘触发怎么选？</strong></p>`,
        exam: `<p>这题几乎必问。能说出 select 的 1024 限制和 O(n) 扫描、epoll 的就绪链表和回调机制、ET 必须读到 EAGAIN，就说明你理解的是机制而不是背结论。</p>`,
        core: `<p>select 用位图、有 1024 限制，poll 用数组但仍线性扫描；epoll 把注册和等待分开、只返回就绪 fd，适合高并发；ET 要读到 EAGAIN，LT 更稳。</p>`,
        answer: `<p><b>select：</b>用 <code>fd_set</code> 位图表示关心的 fd，每次调用把整个集合<b>从用户态拷贝到内核</b>，内核对所有 fd 做线性扫描，返回后再扫描一遍找哪个就绪。fd 数量受 <code>FD_SETSIZE</code> 限制（通常 1024），且每次调用都要重新设置集合。</p>
<p><b>poll：</b>用 <code>pollfd</code> 数组代替位图，没有 1024 限制，但仍然是“整组拷贝 + 线性扫描”，fd 多了性能照样下降。</p>
<p><b>epoll：</b>把“注册”和“等待”分开。<code>epoll_ctl</code> 把 fd 注册进内核的红黑树，只拷贝一次；内核在每个 fd 的就绪回调里把它挂到<b>就绪链表</b>；<code>epoll_wait</code> 只返回就绪链表里的 fd，复杂度与“就绪数量”相关，而不是“注册总数”。所以上万连接、少量活跃时优势明显。</p>
<p><b>触发模式：</b></p>
<ul>
<li><b>水平触发（LT，默认）</b>：只要缓冲区还有数据，每次 <code>epoll_wait</code> 都会通知。写起来简单，不容易漏读。</li>
<li><b>边缘触发（ET）</b>：状态变化时只通知一次。必须<b>循环读到 EAGAIN</b>，否则剩余数据不会再触发通知，连接就“卡住”了。ET 减少系统调用次数，但代码更容易写错。</li>
</ul>
<p><b>怎么选：</b>连接数少、逻辑简单用 select/poll；高并发用 epoll；追求性能且能保证“读干净”用 ET，否则用 LT 更稳。注意 epoll 不能用于普通文件（总是就绪），也不适合“ fd 频繁增删”的场景。</p>`,
        principle: `<p>epoll 高效的根本是“<b>事件驱动 + 只返回就绪项</b>”：内核在网卡收包、协议栈把数据放进 socket 接收队列时，通过回调把对应的 epoll item 加入就绪链表，<code>epoll_wait</code> 只需要检查链表是否为空，而不需要遍历所有注册的 fd。</p>
<p>select/poll 的问题是“每次调用都要重新告诉内核我关心哪些 fd”，内核没有持久状态；epoll 把这份状态留在内核里，所以注册一次即可。</p>
<p>ET 的语义是“只在可读状态从无到有时通知”。如果一次没读完，缓冲区仍然可读，但状态没有再次“变化”，所以不会再通知。这就是必须循环读到 EAGAIN 的原因。</p>`,
        fig: {
          type: "table",
          title: "select / poll / epoll 对比",
          tag: "compare",
          head: ["项目", "select", "poll", "epoll"],
          rows: [
            ["fd 上限", "FD_SETSIZE（通常 1024）", "无硬限制", "受系统 fd 上限约束"],
            ["数据结构", "位图", "pollfd 数组", "红黑树 + 就绪链表"],
            ["每次调用拷贝", "整个集合", "整个数组", "仅注册时一次"],
            ["复杂度", "O(n) 扫描", "O(n) 扫描", "O(就绪数)"],
            ["触发模式", "仅 LT", "仅 LT", "LT / ET"],
            ["适用场景", "少量连接、跨平台", "中量连接", "高并发、少量活跃"]
          ]
        },
        code: {
          lang: "c",
          title: "select_loop.c",
          src: `#include <sys/select.h>
#include <sys/socket.h>
#include <unistd.h>
#include <string.h>

/* select 的典型写法：每次都要重建集合、扫描全部 fd */
int select_loop(int listen_fd, int *clients, int max_clients)
{
    for (;;) {
        fd_set rfds;
        FD_ZERO(&rfds);
        FD_SET(listen_fd, &rfds);

        int maxfd = listen_fd;
        for (int i = 0; i < max_clients; i++) {
            if (clients[i] < 0) continue;
            FD_SET(clients[i], &rfds);
            if (clients[i] > maxfd) maxfd = clients[i];
        }

        int n = select(maxfd + 1, &rfds, NULL, NULL, NULL);
        if (n < 0) continue;                  /* EINTR 等，简化处理 */

        if (FD_ISSET(listen_fd, &rfds)) {
            int c = accept(listen_fd, NULL, NULL);
            if (c >= 0) {
                for (int i = 0; i < max_clients; i++) {
                    if (clients[i] < 0) { clients[i] = c; break; }
                }
            }
        }

        for (int i = 0; i < max_clients; i++) {
            if (clients[i] < 0) continue;
            if (!FD_ISSET(clients[i], &rfds)) continue;

            char buf[1024];
            ssize_t r = read(clients[i], buf, sizeof(buf));
            if (r > 0) {
                (void)write(clients[i], buf, (size_t)r);   /* 演示用 */
            } else {
                close(clients[i]);
                clients[i] = -1;
            }
        }
    }
}`
        },
        codeNote: `<b>注意这段代码的两个“低效点”：</b>每轮循环都要 <code>FD_ZERO/FD_SET</code> 重建集合，并且要遍历所有客户端找就绪项——这正是 select 在 fd 多时变慢的原因。换成 epoll 后，注册只做一次，<code>epoll_wait</code> 直接返回就绪的 fd。`,
        apply: `<p>高并发服务端通常用“epoll + 非阻塞 + 线程池”：主线程负责 accept 和 I/O 事件，把就绪连接分发给工作线程；或者多进程各自 <code>SO_REUSEPORT</code> 监听同一端口。ET 模式下一定要把读缓冲读空，写缓冲写不出去时注册 EPOLLOUT。</p>
<p>还要注意“惊群”：多个线程/进程等同一个 listen fd，新连接到来时全部被唤醒，只有一个能 accept。可以用 <code>EPOLLEXCLUSIVE</code> 或让一个线程专门 accept。</p>`,
        pitfalls: [
          "<b>ET 模式没读到 EAGAIN。</b>只读了一次就等下次通知，剩余数据永远留在缓冲区，连接假死。",
          "<b>select 的 fd 超过 1024。</b>FD_SET 越界，行为未定义，可能直接崩溃。",
          "<b>每次循环不重建 fd_set。</b>select 会修改集合，下次用之前必须重新设置。",
          "<b>epoll 监听普通文件。</b>普通文件总是“就绪”，epoll_wait 会立刻返回，CPU 空转。"
        ],
        follow: [
          [
            "epoll 的 LT 和 ET 能混用吗？",
            "可以，不同 fd 可以配不同模式。但同一个 fd 频繁切换容易出错，建议按连接类型统一策略：长连接用 ET，短连接/逻辑复杂用 LT。",
          ],
          [
            "水平触发会丢事件吗？",
            "不会，只要还有数据就会一直通知。代价是可能重复通知、系统调用次数多，但逻辑最简单。",
          ],
          [
            "epoll 一定比 select 快吗？",
            "连接少、都很活跃时，epoll 的优势不明显，甚至因为系统调用多了略慢；它的优势在“连接多、活跃少”的场景。"
          ]
        ]
      },

      /* ---------------- LA-03 ---------------- */
      {
        id: "LA-03",
        chapter: "proc",
        topic: "pthread",
        title: "pthread 多线程怎么写？互斥锁和条件变量怎么配合？",
        diff: "中级",
        freq: "高频",
        type: "代码分析题",
        point: "考察线程创建/回收、互斥锁保护共享数据、条件变量的谓词循环与丢失唤醒，以及 signal/broadcast 的区别。",
        q: `<p>面试官：用 pthread 写一个生产者—消费者。<strong>互斥锁和条件变量分别解决什么问题？</strong>为什么 <code>pthread_cond_wait</code> 要放在 <code>while</code> 里？</p>`,
        exam: `<p>这题考的是并发基本功。能说清“互斥锁保护数据、条件变量负责等待/通知、wait 会原子释放锁并在返回时重新加锁”，以及“while 防虚假唤醒”，就说明你写过正确的并发代码。</p>`,
        core: `<p>互斥锁保护共享数据，条件变量解决等待通知；wait 必须放在 while 里重新检查条件，因为它有虚假唤醒，signal 唤醒一个、broadcast 唤醒全部。</p>`,
        answer: `<p><b>互斥锁</b>解决“多个线程同时改同一份数据”的竞态；<b>条件变量</b>解决“没数据时不要空转，等有数据再干活”的等待/通知。</p>
<p><b>标准用法：</b></p>
<ol>
<li>消费者加锁；</li>
<li><code>while (count == 0) pthread_cond_wait(&not_empty, &mutex);</code></li>
<li>取数据、改计数；</li>
<li><code>pthread_cond_signal(&not_full);</code></li>
<li>解锁。</li>
</ol>
<p><b>为什么 wait 要放在 while 里：</b>两个原因。一是<b>虚假唤醒</b>：条件变量可能在没有 signal 的情况下返回；二是<b>被唤醒后条件可能又被别的线程改掉</b>（多个消费者竞争一个数据）。所以醒来后必须重新检查谓词，不满足就继续等。</p>
<p><b>wait 的内部动作：</b>它原子地做三件事——释放互斥锁、把线程挂到条件变量的等待队列、睡眠。被唤醒时重新获取锁再返回。这个“释放锁 + 睡眠”是原子的，否则会出现在“检查条件”和“进入等待”之间丢通知的窗口。</p>
<p><b>signal 与 broadcast：</b><code>signal</code> 只唤醒一个等待者，适合“每次只产生一个资源”；<code>broadcast</code> 唤醒全部，适合“状态变化影响所有线程”（比如退出标志）。用错会导致该醒的没醒（丢唤醒）或惊群。</p>`,
        principle: `<p>条件变量本身不保存“通知”，如果没有线程在等，signal 会丢失。所以“先检查条件、再等待”必须在锁的保护下进行，否则会出现：消费者检查到 count==0，准备 wait；生产者此时放入数据并 signal；消费者才真正进入 wait——通知已经丢了，消费者永远睡下去。</p>
<p>这就是“谓词 + 锁 + while”的组合为什么是标准模板：检查和等待在同一个临界区内完成，生产者修改条件也在锁内，两者不会交错。</p>
<p>线程回收也不能忘：joinable 线程结束后资源不会自动释放，必须 <code>pthread_join</code>，否则产生类似僵尸的资源泄漏；不需要等待的线程要设 <code>PTHREAD_CREATE_DETACHED</code>。</p>`,
        fig: {
          type: "table",
          title: "互斥锁与条件变量的分工",
          tag: "compare",
          head: ["机制", "解决什么", "典型 API", "常见错误"],
          rows: [
            ["互斥锁", "共享数据的互斥访问", "lock / unlock", "忘记解锁、锁粒度太大"],
            ["条件变量", "等待某个条件成立", "wait / signal / broadcast", "wait 不放 while、丢唤醒"],
            ["自旋锁", "极短临界区、不可睡眠", "spin_lock", "持锁睡眠、长期占用 CPU"],
            ["读写锁", "读多写少", "rdlock / wrlock", "写饥饿、升级死锁"],
            ["信号量", "计数型资源", "sem_wait / sem_post", "计数与资源不匹配"]
          ]
        },
        code: {
          lang: "c",
          title: "bounded_buffer.c",
          src: `#include <pthread.h>

#define BUF_N 8

static int buf[BUF_N];
static int head, tail, count;
static pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  not_full  = PTHREAD_COND_INITIALIZER;
static pthread_cond_t  not_empty = PTHREAD_COND_INITIALIZER;

void put(int v)
{
    pthread_mutex_lock(&mtx);
    while (count == BUF_N) {                  /* 必须 while，防虚假唤醒 */
        pthread_cond_wait(&not_full, &mtx);
    }
    buf[tail] = v;
    tail = (tail + 1) % BUF_N;
    count++;
    pthread_cond_signal(&not_empty);
    pthread_mutex_unlock(&mtx);
}

int get(void)
{
    pthread_mutex_lock(&mtx);
    while (count == 0) {
        pthread_cond_wait(&not_empty, &mtx);
    }
    int v = buf[head];
    head = (head + 1) % BUF_N;
    count--;
    pthread_cond_signal(&not_full);
    pthread_mutex_unlock(&mtx);
    return v;
}`
        },
        codeNote: `<b>三个细节：</b><code>wait</code> 的第二个参数必须是同一把锁；<code>signal</code> 放在解锁前或解锁后都可以（放锁内更直观），但不要在两把不同的锁之间乱用；<code>count</code> 的读写全部在锁内，不能有“读的时候不加锁、写的时候加锁”的混合。`,
        apply: `<p>实际项目里，条件变量常用来做“任务队列”：工作线程 wait，生产者 put 后 signal。如果队列满/空是常态，可以配合超时 <code>pthread_cond_timedwait</code>，避免退出时永远等不到通知。</p>
<p>退出流程要设计好：设一个 <code>g_stop</code> 标志，broadcast 唤醒所有线程，线程醒来后先检查 <code>g_stop</code> 再决定是否继续；主线程 join 所有线程后再销毁锁和条件变量。</p>`,
        pitfalls: [
          "<b>wait 写成 if。</b>虚假唤醒或多消费者竞争时，条件已不成立却继续执行，读到脏数据。",
          "<b>signal 在锁外、条件已变。</b>可能丢掉通知，等待线程永远不醒。",
          "<b>忘记 join 或 detach。</b>线程资源不释放，长期运行后创建线程失败。",
          "<b>持锁做耗时操作。</b>其他线程全部阻塞，吞吐骤降，还可能死锁。"
        ],
        follow: [
          [
            "条件变量和信号量怎么选？",
            "条件变量适合“等某个状态成立”，必须配合互斥锁；信号量适合“计数型资源”，可以独立使用。生产者—消费者两者都能实现，条件变量更灵活。",
          ],
          [
            "什么是死锁？怎么避免？",
            "两个线程各持一把锁、互相等对方的锁。避免方法：固定加锁顺序、用 trylock 超时、减少锁嵌套、临界区尽量短。",
          ],
          [
            "多线程读写同一变量，加 volatile 够吗？",
            "不够。volatile 只保证每次都访问内存，不保证原子性和顺序；要用互斥锁、原子操作或条件变量。"
          ]
        ]
      },

      /* ---------------- LA-04 ---------------- */
      {
        id: "LA-04",
        chapter: "proc",
        topic: "fork-daemon",
        title: "fork 之后发生了什么？守护进程怎么写？信号处理要注意什么？",
        diff: "高级",
        freq: "高频",
        type: "代码分析题",
        point: "考察 fork 的返回值与写时复制、僵尸/孤儿进程、daemon 的双 fork 步骤，以及 async-signal-safe 约束。",
        q: `<p>面试官：<strong>fork 之后父子进程发生了什么？</strong>守护进程怎么创建？<strong>信号处理函数里为什么不能随便调 printf？</strong></p>`,
        exam: `<p>这题覆盖进程模型的三块：fork 的语义、daemon 的标准步骤、信号的异步安全。能说出“双 fork + setsid + 重定向 fd”和“信号处理里只能调 async-signal-safe 函数”，就很完整。</p>`,
        core: `<p>fork 返回两次，父进程得子 PID、子进程得 0，子进程用写时复制共享内存；守护进程要 fork、setsid、再 fork、重定向标准 IO。信号处理函数里不能随便 printf，因为它不是异步信号安全的、可能死锁，要用 write 或设标志。</p>`,
        answer: `<p><b>fork 的语义：</b>调用一次，返回两次。父进程拿到子进程 PID（<code>&gt;0</code>），子进程拿到 <code>0</code>，失败返回 <code>-1</code>。子进程获得父进程地址空间的<b>副本</b>，但 Linux 用写时复制（COW）：只读共享物理页，任一进程写入时才复制，所以 fork 很快、内存也不会立刻翻倍。</p>
<p>子进程继承父进程的 fd、信号处理方式、环境变量；但<b>不继承</b>父进程的线程（多线程程序 fork 后只有调用线程存活）、锁状态、定时器。</p>
<p><b>僵尸与孤儿：</b>子进程先退出、父进程没 <code>wait</code>，子进程变成僵尸（Z），占着 PID 和退出状态；父进程先退出，子进程被 init/systemd 收养，成为孤儿。所以父进程必须 <code>waitpid</code>，或者用 <code>SIGCHLD</code> 处理。</p>
<p><b>守护进程的标准步骤：</b></p>
<ol>
<li><code>fork()</code>，父进程退出，子进程脱离终端控制；</li>
<li><code>setsid()</code> 创建新会话，成为会话首进程，脱离控制终端；</li>
<li>再 <code>fork()</code> 一次，确保不是会话首进程，永远无法重新获得控制终端；</li>
<li><code>chdir("/")</code>，避免占用可卸载的目录；</li>
<li><code>umask(0)</code>，按需设置文件权限；</li>
<li>把 stdin/stdout/stderr 重定向到 <code>/dev/null</code>，关闭继承的 fd。</li>
</ol>
<p><b>信号处理的约束：</b>信号处理函数是异步执行的，可能打断主流程正在执行的任何代码（包括 malloc、printf 内部的锁）。所以在处理函数里只能调用 <b>async-signal-safe</b> 的函数，比如 <code>write</code>、<code>_exit</code>、<code>signal</code>；<code>printf</code>、<code>malloc</code>、<code>free</code> 都不安全，可能死锁或崩溃。</p>
<p><b>推荐做法：</b>处理函数只置一个 <code>volatile sig_atomic_t</code> 标志，或者往 pipe/eventfd 写一个字节，主循环发现后再做真正的处理（self-pipe trick）。</p>`,
        principle: `<p>COW 让 fork 的开销与内存大小解耦：父子共享只读页，写时触发缺页，内核复制一页。所以“fork 大进程”并不像想象中那么慢，但频繁写会导致大量页复制。</p>
<p>setsid 之后进程成为新会话的首进程，没有控制终端；第二次 fork 是为了防止它以后通过打开终端设备重新获得控制终端（会话首进程有这个特权）。</p>
<p>信号是“软件中断”，内核在从内核态返回用户态时调用处理函数。此时进程的栈和库状态可能是任意中间态，所以只有可重入、不依赖全局状态的函数才安全。</p>`,
        fig: {
          type: "flow",
          title: "守护进程的创建步骤",
          tag: "flow",
          items: [
            { t: "fork，父进程退出", d: "子进程继续" },
            { t: "setsid", d: "新会话，脱离控制终端" },
            { t: "再 fork，父进程退出", d: "确保不是会话首进程" },
            { t: "chdir(\"/\") + umask(0)", d: "不占目录、权限可控" },
            { t: "重定向 0/1/2 到 /dev/null", d: "关闭继承的 fd" },
            { t: "进入主循环", d: "用信号/pipe 做退出通知" }
          ]
        },
        code: {
          lang: "c",
          title: "daemon.c",
          src: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <sys/stat.h>

static volatile sig_atomic_t g_stop;

static void on_term(int sig)
{
    (void)sig;
    g_stop = 1;                       /* 只置标志，不做复杂操作 */
}

static int daemonize(void)
{
    pid_t pid = fork();
    if (pid < 0) return -1;
    if (pid > 0) _exit(0);            /* 父进程退出 */

    if (setsid() < 0) return -1;

    pid = fork();                     /* 第二次 fork，脱离会话首进程 */
    if (pid < 0) return -1;
    if (pid > 0) _exit(0);

    umask(0);
    if (chdir("/") < 0) return -1;

    int fd = open("/dev/null", O_RDWR);
    if (fd < 0) return -1;
    dup2(fd, STDIN_FILENO);
    dup2(fd, STDOUT_FILENO);
    dup2(fd, STDERR_FILENO);
    if (fd > STDERR_FILENO) close(fd);

    return 0;
}

int main(void)
{
    if (daemonize() < 0) return 1;

    struct sigaction sa;
    sa.sa_handler = on_term;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;                  /* 不用 SA_RESTART，让 pause 被打断 */
    sigaction(SIGTERM, &sa, NULL);
    sigaction(SIGINT,  &sa, NULL);

    while (!g_stop) {
        pause();                      /* 等信号；被唤醒后检查标志 */
    }

    /* 这里做清理：落盘、关 fd、释放资源 */
    return 0;
}`
        },
        codeNote: `<b>为什么用 <code>_exit</code> 而不是 <code>exit</code>：</b>父进程 fork 后立刻退出，如果调 <code>exit</code> 会刷新 stdio 缓冲、执行 atexit 回调，可能把父进程缓冲的数据重复写一遍。<code>_exit</code> 直接进内核退出，干净。`,
        apply: `<p>生产环境的守护进程通常不自己写 daemonize，而是交给 systemd：写一个 unit 文件，<code>Type=simple</code>，<code>Restart=always</code>，日志走 journald。这样崩溃重启、日志收集、权限控制都由系统管，比自己 fork 可靠。</p>
<p>如果必须自己写，注意：退出时要处理 SIGTERM（优雅停止）、SIGHUP（重载配置）、SIGCHLD（回收子进程）；日志不要写 stdout，写文件或 syslog。</p>`,
        pitfalls: [
          "<b>fork 后子进程用 exit 而不是 _exit。</b>stdio 缓冲被重复刷新，日志出现双份。",
          "<b>只 fork 一次就 setsid。</b>仍是会话首进程，以后可能重新获得控制终端。",
          "<b>在信号处理里 printf/malloc。</b>这些函数内部有锁，可能死锁或崩溃。",
          "<b>不处理 SIGCHLD。</b>子进程退出后变僵尸，PID 被耗尽。"
        ],
        follow: [
          [
            "fork 和 vfork 有什么区别？",
            "vfork 让子进程共享父进程地址空间，父进程阻塞直到子进程 exec 或退出，开销更小但限制多；现代 Linux 的 fork 有 COW，vfork 的优势不明显，一般不推荐。",
          ],
          [
            "多线程程序 fork 有什么坑？",
            "fork 后子进程只有调用 fork 的那个线程存活，但其他线程持有的锁可能是“锁定”状态，子进程再去拿就死锁。所以多线程程序 fork 后应立刻 exec。",
          ],
          [
            "SA_RESTART 有什么用？",
            "让被信号打断的系统调用自动重启，而不是返回 EINTR。对 read/accept 这类调用很方便，但会让“用信号唤醒阻塞调用”的技巧失效。"
          ]
        ]
      },

      /* ---------------- LA-05 ---------------- */
      {
        id: "LA-05",
        chapter: "tool",
        topic: "cmd",
        title: "top、free、df、dmesg、ps、netstat 各自看什么？异常怎么判断？",
        diff: "初级",
        freq: "高频",
        type: "工程方法题",
        point: "考察常用诊断命令的关键字段、常见异常指标，以及“先看什么、再看什么”的排查顺序。",
        q: `<p>面试官：线上设备变卡，你登上机器，<strong>会依次看哪些命令？</strong>每个命令重点看什么？<strong>怎么判断是内存、磁盘还是网络的问题？</strong></p>`,
        exam: `<p>这题考的是实战手感。能说出 <code>free</code> 要看 available 而不是 free、<code>df -i</code> 看 inode、<code>top</code> 看 load 和 %CPU、<code>ss</code> 看 TIME_WAIT，就说明你真的排查过线上问题。</p>`,
        core: `<p>排查顺序是负载、内存、磁盘、进程、网络：top 看 load 和 CPU，free 看 available，df/df -i 看空间和 inode，ps 看 D/Z 状态，dmesg 看内核报错。</p>`,
        answer: `<p>我会按“整体 → 内存 → 磁盘 → 进程 → 网络”的顺序看：</p>
<p><b>1. top / uptime</b>：先看 load average（1/5/15 分钟）和 CPU 使用分布。<code>us</code> 高是用户态忙，<code>sy</code> 高是内核/系统调用多，<code>wa</code> 高是等 I/O，<code>si/hi</code> 是软/硬中断。<code>load</code> 高但 CPU 不高，通常是大量进程在等 I/O 或 D 状态。</p>
<p><b>2. free -h</b>：重点看 <code>available</code>，不是 <code>free</code>。Linux 会把空闲内存用作 cache/buffer，<code>free</code> 很小是正常的；<code>available</code> 才是“还能给新进程用多少”。如果 available 很低且 swap 大量使用，才是真的内存紧张。</p>
<p><b>3. df -h / df -i</b>：<code>df -h</code> 看空间，<code>df -i</code> 看 inode。磁盘满了会写失败，inode 满了会出现“还有空间但创建不了文件”。</p>
<p><b>4. ps aux / ps -ef</b>：看进程状态和资源占用。重点看 <code>STAT</code>：<code>R</code> 运行、<code>S</code> 可中断睡眠、<code>D</code> 不可中断（通常在等 I/O，杀不掉）、<code>Z</code> 僵尸。大量 D 状态说明存储或驱动有问题。</p>
<p><b>5. dmesg -T</b>：看内核日志。OOM killer、磁盘 I/O 错误、网卡丢包、USB 断开、驱动报错都在这里。<code>dmesg -w</code> 可以实时跟踪。</p>
<p><b>6. netstat -tunlp / ss -s</b>：看连接状态和监听端口。大量 <code>TIME_WAIT</code> 是短连接多；大量 <code>CLOSE_WAIT</code> 是应用没 close；<code>Recv-Q/Send-Q</code> 持续不为 0 说明应用处理不过来或网络拥塞。</p>`,
        principle: `<p>Linux 的“内存”是动态的：page cache 占用大部分空闲内存，需要时会被回收，所以 <code>free</code> 小不等于内存不足。<code>available</code> 估算的是“不触发 swap 的前提下可分配的量”，更接近真实可用。</p>
<p>load average 统计的是“运行队列 + 不可中断睡眠”的进程数平均值，所以它包含等 I/O 的进程，不只是 CPU 负载。单核 load 1.0 表示刚好跑满，多核要除以核数看。</p>
<p>TCP 状态反映了连接的生命周期：<code>CLOSE_WAIT</code> 是“对端关了、本端还没 close”，数量持续增长就是应用层漏了 close；<code>TIME_WAIT</code> 是主动关闭方的正常状态，太多说明短连接频繁。</p>`,
        fig: {
          type: "table",
          title: "常用诊断命令看什么",
          tag: "速查",
          head: ["命令", "关键字段", "异常信号", "下一步"],
          rows: [
            ["top", "load、us/sy/wa、%CPU", "load 高但 CPU 低；wa 高", "查 D 状态进程、iostat"],
            ["free -h", "available、swap used", "available 很低、swap 频繁", "查内存大户、OOM 日志"],
            ["df -h / -i", "Use%、IUse%", "空间或 inode 接近 100%", "清理日志、找大文件"],
            ["ps aux", "STAT、%MEM、RSS", "大量 D/Z 状态", "查 I/O、父进程 wait"],
            ["dmesg -T", "OOM、I/O error、link down", "内核报错、设备掉线", "查驱动、硬件"],
            ["ss -s / netstat", "TIME_WAIT、CLOSE_WAIT、Recv-Q", "CLOSE_WAIT 增长、队列堆积", "查应用 close、处理能力"]
          ]
        },
        apply: `<p>一个真实的排查链：设备卡顿 → <code>top</code> 看到 <code>wa</code> 很高 → <code>ps</code> 发现几个 D 状态进程 → <code>dmesg</code> 有 “I/O error, dev mmcblk0” → 判断是 SD 卡/Flash 读写异常 → 换卡或查文件系统。整个过程不需要改代码，先定位层次。</p>
<p>容器环境要注意：<code>free</code> 看到的是宿主机内存，<code>top</code> 的 CPU 也受 cgroup 限制；要看 cgroup 的 <code>memory.current</code>、<code>cpu.stat</code> 才准确。</p>`,
        pitfalls: [
          "<b>看 free 小就以为内存不足。</b>cache 占用的内存是可回收的，应该看 available。",
          "<b>只看 df -h 不看 inode。</b>小文件很多时 inode 先满，空间还有但写不了。",
          "<b>把 load 高等同于 CPU 忙。</b>等 I/O 的进程也算 load，要看 wa 和 D 状态。",
          "<b>看到 CLOSE_WAIT 就去调内核参数。</b>这是应用没 close，调参数没用。"
        ],
        follow: [
          [
            "TIME_WAIT 太多怎么办？",
            "先确认是不是短连接太多，能复用就复用（连接池、keep-alive）。确实需要大量短连接时，可以开 <code>tcp_tw_reuse</code>（仅对主动发起方有效），但不建议缩短 2MSL。",
          ],
          [
            "怎么找占用 CPU/内存最高的进程？",
            "<code>top</code> 里按 <code>P</code> 按 CPU 排序、<code>M</code> 按内存排序；或者 <code>ps aux --sort=-%cpu | head</code>、<code>ps aux --sort=-%mem | head</code>。",
          ],
          [
            "dmesg 被刷掉了怎么办？",
            "内核环形缓冲区有限，可以调大 <code>log_buf_len</code>，或者用 <code>journalctl -k</code>、rsyslog 把日志持久化。嵌入式还可以用 pstore/ramoops 保存崩溃前的日志。"
          ]
        ]
      },

      /* ---------------- LA-06 ---------------- */
      {
        id: "LA-06",
        chapter: "tool",
        topic: "libs",
        title: "静态库和动态库有什么区别？glibc 和 musl 怎么选？",
        diff: "中级",
        freq: "高频",
        type: "对比辨析题",
        point: "考察链接方式、部署依赖、体积与内存占用，以及两种 C 库在特性、许可证、ABI 上的差异。",
        q: `<p>面试官：<strong>静态库和动态库有什么区别？</strong>发布程序时怎么选？<strong>glibc 和 musl 又该怎么选？</strong></p>`,
        exam: `<p>这题考的是“部署现实”：静态链接省依赖但体积大、升级要重编；动态链接省内存但怕库不匹配。能说出 musl 静态友好、glibc 功能全，就说明你做过交叉编译和产品发布。</p>`,
        core: `<p>静态库把代码拷进可执行文件、部署简单但体积大；动态库运行时加载、可共享和独立升级但依赖环境；musl 轻量适合静态链接，glibc 功能全但不能混用。</p>`,
        answer: `<p><b>静态库（.a）：</b>编译时把用到的目标代码<b>复制进可执行文件</b>。优点是没有运行时依赖、部署简单、启动略快；缺点是体积大、多个程序重复占用内存、库有 bug 要重新链接所有程序。链接顺序有讲究：依赖方写在被依赖方前面，否则符号找不到。</p>
<p><b>动态库（.so）：</b>编译时只记录符号引用，运行时由动态链接器加载。优点是多个进程共享同一份代码页、库可以独立升级；缺点是部署要带库或保证系统有、版本不匹配会报 <code>error while loading shared libraries</code>、启动要做符号重定位。</p>
<p><b>怎么选：</b>嵌入式产品、追求“拷过去就能跑”，用静态链接；系统里有多个程序共用同一库、需要独立升级，用动态链接。交叉编译时要注意 <code>--sysroot</code> 和库的路径，别把宿主机的库链进去。</p>
<p><b>glibc 与 musl：</b></p>
<ul>
<li><b>glibc</b>：功能最全，NSS（名字服务）、locale、iconv、完整 POSIX 支持，兼容性好；体积大，静态链接后可能上 MB，动态链接依赖多；许可证是 LGPL。</li>
<li><b>musl</b>：轻量、代码清晰、静态链接友好（静态 hello world 几十 KB），MIT 许可证，适合嵌入式和容器；但功能裁剪（NSS 简化、locale 支持弱）、某些边界行为与 glibc 不同（DNS 解析、malloc 实现、<code>strerror</code> 文案）。</li>
</ul>
<p><b>注意：</b>不要混用。用 musl 编译的目标文件不能和 glibc 的库链接，ABI 不兼容；预编译的第三方 <code>.so</code> 通常是针对 glibc 的，换 musl 要重新编译。</p>`,
        principle: `<p>静态链接在链接期解析所有符号，生成一个自包含的 ELF；动态链接在加载期由 <code>ld-linux.so</code> 解析，使用 PLT/GOT 做延迟绑定（懒绑定），第一次调用时才解析符号地址。</p>
<p>动态库的版本管理靠 soname：<code>libfoo.so.1</code> 是运行时名字，<code>libfoo.so</code> 是开发时的链接名。升级保持 ABI 兼容时只改小版本，soname 不变，程序不用重编。</p>
<p>musl 的 malloc 比 glibc 简单，碎片行为和多线程性能不同；它的 DNS 解析是同步的、不支持 NSS，所以依赖 LDAP/系统用户库的程序可能跑不起来。</p>`,
        fig: {
          type: "table",
          title: "静态库、动态库与两种 C 库",
          tag: "compare",
          head: ["项目", "静态库 .a", "动态库 .so", "glibc", "musl"],
          rows: [
            ["链接时机", "编译期复制", "运行时加载", "—", "—"],
            ["部署依赖", "无", "需要库文件", "依赖多", "可静态"],
            ["体积", "大", "小", "大", "小"],
            ["内存共享", "不共享", "共享代码页", "—", "—"],
            ["升级", "需重新链接", "替换库即可", "—", "—"],
            ["功能完整度", "—", "—", "最全", "精简"],
            ["许可证", "—", "—", "LGPL", "MIT"],
            ["典型场景", "嵌入式发布", "系统程序", "桌面/服务器", "嵌入式/容器"]
          ]
        },
        code: {
          lang: "bash",
          title: "build.sh",
          src: `# 静态库
gcc -c foo.c -o foo.o
ar rcs libfoo.a foo.o
gcc main.c -L. -lfoo -o app_static          # -lfoo 必须在 main.c 之后

# 动态库（必须 -fPIC）
gcc -fPIC -shared foo.c -o libfoo.so
gcc main.c -L. -lfoo -Wl,-rpath,'$ORIGIN' -o app_shared

# 查看依赖与符号
ldd app_shared
nm -D libfoo.so | grep foo
readelf -d app_shared | grep -E 'NEEDED|RPATH|RUNPATH'

# 完全静态链接（musl 更合适）
musl-gcc -static main.c -o app_static_musl
file app_static_musl                       # 应显示 statically linked`
        },
        codeNote: `<b>两个细节：</b><code>-lfoo</code> 的位置必须在源文件/目标文件之后，链接器从左到右解析，顺序错了会报 undefined reference；<code>-Wl,-rpath,'$ORIGIN'</code> 让程序在自身目录找库，适合免安装部署，比设置 <code>LD_LIBRARY_PATH</code> 更可控。`,
        apply: `<p>嵌入式发布常用“静态链接 + strip”：<code>gcc -static -Os</code> 后 <code>strip</code> 掉符号，体积能小很多；如果 glibc 静态链接太大，换 musl 工具链，通常能小一个数量级。</p>
<p>动态库部署要确认三件事：库在不在、soname 对不对、ABI 兼不兼容。用 <code>ldd</code> 看依赖，用 <code>objdump -T</code> 看导出的符号版本，别等到运行时才发现 <code>GLIBC_2.34 not found</code>。</p>`,
        pitfalls: [
          "<b>链接顺序写反。</b><code>-lfoo main.c</code> 会报未定义符号，因为链接器扫到库时还不知道需要什么。",
          "<b>动态库没加 -fPIC。</b>在部分架构上加载失败或运行崩溃。",
          "<b>把宿主机 glibc 的库拷到目标板。</b>ABI 不匹配，程序起不来。",
          "<b>musl 和 glibc 的目标文件混链。</b>符号和结构体布局不同，运行期出错，且很难查。"
        ],
        follow: [
          [
            "为什么动态库能省内存？",
            "多个进程映射同一份 <code>.so</code> 的代码段，物理内存只存一份（只读共享）；每个进程只保留自己的数据段。静态链接则是每个程序各带一份。",
          ],
          [
            "什么是 ABI 兼容？",
            "函数调用约定、结构体布局、符号版本不变，已编译的程序不用重编就能用新库。加函数通常兼容，改结构体/删函数就不兼容。",
          ],
          [
            "strip 会影响调试吗？",
            "会。strip 删掉符号表和调试信息，gdb 看不到函数名和行号。发布版可以 strip，但要保留一份未 strip 的二进制用于解析 core。"
          ]
        ]
      },

      /* ---------------- LA-07 ---------------- */
      {
        id: "LA-07",
        chapter: "net",
        topic: "tcp",
        title: "TCP 三次握手、四次挥手、TIME_WAIT、滑动窗口是怎么回事？",
        diff: "中级",
        freq: "高频",
        type: "协议分析题",
        point: "考察握手/挥手的报文与状态、TIME_WAIT 的两个作用、窗口与拥塞控制的区别，以及常见异常状态。",
        q: `<p>面试官：<strong>为什么握手是三次、挥手是四次？</strong>TIME_WAIT 为什么要等 2MSL？<strong>滑动窗口解决什么问题？</strong></p>`,
        exam: `<p>这题是网络基础的分水岭。能说清“三次是为了双方都确认收发能力”“四次是因为半关闭”“TIME_WAIT 是为了最后一个 ACK 能重传、并让旧报文消散”，就答到本质了。</p>`,
        core: `<p>TCP 三次握手确认双方收发能力并同步序号，四次挥手因为全双工要分别关闭；TIME_WAIT 等 2MSL 是为了重发最后的 ACK 并让旧报文消散。滑动窗口做流量控制，允许未确认数据在途，提高吞吐。</p>`,
        answer: `<p><b>三次握手：</b></p>
<ol>
<li>客户端发 <code>SYN</code>（带初始序号 seq=x），进入 <code>SYN_SENT</code>；</li>
<li>服务端回 <code>SYN+ACK</code>（seq=y，ack=x+1），进入 <code>SYN_RCVD</code>；</li>
<li>客户端回 <code>ACK</code>（ack=y+1），双方进入 <code>ESTABLISHED</code>。</li>
</ol>
<p>三次的目的是<b>双方都确认自己和对方的收发能力正常</b>，并同步初始序号。两次不够：服务端无法确认客户端能收到自己的包；四次多余：第二步的 SYN 和 ACK 可以合并。</p>
<p><b>四次挥手：</b>TCP 是全双工，两个方向要分别关闭。</p>
<ol>
<li>主动方发 <code>FIN</code>，进入 <code>FIN_WAIT_1</code>；</li>
<li>被动方回 <code>ACK</code>，进入 <code>CLOSE_WAIT</code>，主动方进入 <code>FIN_WAIT_2</code>；</li>
<li>被动方处理完剩余数据，发 <code>FIN</code>，进入 <code>LAST_ACK</code>；</li>
<li>主动方回 <code>ACK</code>，进入 <code>TIME_WAIT</code>，等 2MSL 后关闭。</li>
</ol>
<p>之所以是四次，是因为被动方收到 FIN 后可能还有数据要发，ACK 和 FIN 不能合并（半关闭状态）。</p>
<p><b>TIME_WAIT 的两个作用：</b>一是主动方最后一个 ACK 可能丢失，被动方会重传 FIN，主动方需要还在这个状态才能再回 ACK；二是让本次连接的旧报文在网络中消散，避免它们被下一个复用相同四元组的连接误收。2MSL 就是“一个来回”的最大生存时间。</p>
<p><b>滑动窗口：</b>接收方通过窗口字段告诉发送方“我还能收多少字节”，发送方据此控制未确认数据的量，实现<b>流量控制</b>；配合拥塞窗口（cwnd）做<b>拥塞控制</b>。窗口为 0 时发送方停止发送，并定期发窗口探测，防止死锁。</p>`,
        principle: `<p>序号和确认号是 TCP 可靠性的基础：每个字节都有序号，接收方用累积 ACK 告诉发送方“这个序号之前都收到了”。超时或收到三个重复 ACK 会触发重传。</p>
<p>窗口缩放选项（window scaling）把 16 位窗口字段左移最多 14 位，最大窗口到 1GB，否则在高带宽延迟积链路上吞吐会被 64KB 限制。</p>
<p>Nagle 算法会把小包合并发送，减少网络开销，但会增加延迟；对延迟敏感的应用用 <code>TCP_NODELAY</code> 关闭。延迟 ACK 则是接收方等一会儿再确认，两者叠加可能导致“糊涂窗口”或额外延迟。</p>`,
        fig: {
          type: "flow",
          title: "三次握手与四次挥手",
          tag: "flow",
          items: [
            { t: "SYN →", d: "客户端请求，进入 SYN_SENT" },
            { t: "← SYN+ACK", d: "服务端确认并同步序号" },
            { t: "ACK →", d: "双方 ESTABLISHED" },
            { t: "FIN → / ← ACK", d: "主动方关闭，被动方 CLOSE_WAIT" },
            { t: "← FIN / ACK →", d: "被动方关闭，主动方 TIME_WAIT" },
            { t: "等待 2MSL", d: "确保最后 ACK 送达、旧报文消散" }
          ]
        },
        apply: `<p>排查连接问题时看状态：大量 <code>SYN_RCVD</code> 可能是 SYN Flood 或服务端 accept 队列满；大量 <code>CLOSE_WAIT</code> 是应用收到 FIN 后没 close；大量 <code>TIME_WAIT</code> 是短连接多，优先改连接复用。</p>
<p>嵌入式设备做 TCP 客户端时，要注意断网重连：不能只靠 <code>send</code> 返回值判断，最好加应用层心跳和超时；<code>SO_KEEPALIVE</code> 的默认周期太长（2 小时），不适合快速检测。</p>`,
        pitfalls: [
          "<b>以为 TIME_WAIT 是 bug。</b>它是主动关闭方的正常状态，强行缩短 2MSL 可能让旧报文污染新连接。",
          "<b>把 CLOSE_WAIT 当成内核问题。</b>它是应用没 close，调内核参数无效。",
          "<b>窗口开得很大但接收缓冲很小。</b>窗口是“还能收多少”，缓冲不够时窗口会降为 0，吞吐反而更差。",
          "<b>关闭 Nagle 却不处理小包。</b>大量小包会增加网络开销和延迟抖动。"
        ],
        follow: [
          [
            "SYN Flood 怎么防？",
            "SYN Cookie：服务端不立即分配资源，把状态编码进序列号，收到 ACK 再建连接；配合限速、防火墙、连接队列调优。",
          ],
          [
            "为什么第四次挥手后主动方不直接关闭？",
            "因为最后一个 ACK 可能丢，被动方会重传 FIN；主动方若已关闭，会回 RST，导致被动方异常。TIME_WAIT 让主动方能继续处理重传。",
          ],
          [
            "滑动窗口和拥塞窗口有什么区别？",
            "滑动窗口是接收方通告的“我能收多少”，解决接收端处理能力；拥塞窗口是发送方根据网络状况估算的“网络能承受多少”，解决网络拥塞。实际发送量取两者较小值。"
          ]
        ]
      },

      /* ---------------- LA-08 ---------------- */
      {
        id: "LA-08",
        chapter: "tool",
        topic: "debug",
        title: "gdb、strace、core dump、oops/panic 分别怎么用？",
        diff: "高级",
        freq: "中频",
        type: "调试方法题",
        point: "考察崩溃现场保存与离线分析、系统调用跟踪、内核 oops 的符号解析，以及“先取证再修”的排查流程。",
        q: `<p>面试官：程序在客户现场崩了，只留下一个 core 文件。<strong>你怎么定位？</strong>如果是内核 oops 呢？<strong>strace 又能帮上什么忙？</strong></p>`,
        exam: `<p>这题考的是“没有现场也能查”。能说清 core 要配合未 strip 的二进制和符号、strace 看系统调用返回值、oops 用 addr2line 解析调用栈，就说明你独立处理过线上崩溃。</p>`,
        core: `<p>core dump 用 gdb 看 bt、frame、info locals；strace 看系统调用和 errno；内核 oops 用 addr2line 对照 vmlinux，先保存现场再离线分析。</p>`,
        answer: `<p><b>1. core dump：</b>程序收到 SIGSEGV/SIGABRT 时，内核把进程的地址空间、寄存器、调用栈写成 core 文件。前提是 <code>ulimit -c unlimited</code> 且 core pattern 可写。</p>
<p>分析：<code>gdb ./app core</code>，先 <code>bt</code> 看调用栈，<code>frame N</code> 切到崩溃帧，<code>info locals</code>、<code>info registers</code>、<code>x/16x $sp</code> 看现场。关键是<b>二进制必须带符号</b>（未 strip，或保留单独的 debug 文件），否则只能看到地址。</p>
<p><b>2. gdb 常用：</b><code>run</code>、<code>break file:line</code>、<code>watch var</code>（变量被改时停）、<code>attach pid</code>（附加到运行进程）、<code>info threads</code>、<code>thread apply all bt</code>（多线程全栈）。</p>
<p><b>3. strace：</b>跟踪系统调用和信号。<code>strace -f -tt -T -e trace=openat,read,write ./app</code> 能看到“哪个调用失败、返回什么 errno、耗时多少”。程序卡住时，<code>strace -p pid</code> 看它停在哪个系统调用上，非常有效。</p>
<p><b>4. oops / panic：</b>内核崩溃时打印 oops，包含 RIP（出错指令）、Call Trace（调用栈）、寄存器。用 <code>addr2line -e vmlinux -f -i 0xffffffff... </code> 把地址转成函数和行号；或者 <code>objdump -d vmlinux</code> 反汇编对照。panic 是 oops 的严重版本，系统直接停。</p>
<p><b>排查顺序：</b>先保存现场（core、dmesg、日志），再离线分析；不要在客户现场反复重启把证据冲掉。嵌入式可以用 pstore/ramoops 把崩溃日志存到 Flash，重启后取。</p>`,
        principle: `<p>core 文件本质是 ELF core 格式，记录每个内存段的映射和内容。gdb 通过二进制的符号表把地址映射回函数名/行号，所以“二进制和 core 必须匹配”——版本不一致会得到错误的栈。</p>
<p>strace 通过 ptrace 附加到进程，拦截系统调用入口和返回，所以它能显示参数和返回值，但看不到用户态函数的内部逻辑；用户态可以用 ltrace（库调用）或 gdb 断点。</p>
<p>oops 的 Call Trace 是内核栈回溯，依赖帧指针或 ORC 展开信息；如果内核编译时裁掉了调试信息，只能靠 <code>kallsyms</code> 和 <code>addr2line</code> 近似定位。</p>`,
        fig: {
          type: "table",
          title: "四类工具的分工",
          tag: "compare",
          head: ["工具", "看什么", "前提", "典型场景"],
          rows: [
            ["gdb + core", "用户态崩溃栈、变量、寄存器", "core + 带符号二进制", "段错误、断言失败"],
            ["gdb attach", "运行中进程的线程和栈", "ptrace 权限", "卡死、死锁"],
            ["strace", "系统调用、errno、耗时", "ptrace 权限", "打不开文件、连接失败、卡在 I/O"],
            ["dmesg / oops", "内核崩溃、驱动报错", "内核日志未丢", "驱动空指针、硬件异常"],
            ["addr2line", "地址 → 函数/行号", "vmlinux 带符号", "解析 oops 栈"]
          ]
        },
        code: {
          lang: "bash",
          title: "debug.sh",
          src: `# 1. 开启 core（当前 shell 生效）
ulimit -c unlimited
cat /proc/sys/kernel/core_pattern        # 确认 core 写到哪里

# 2. 用 core 分析（二进制要和 core 同版本）
gdb ./app ./core
(gdb) bt
(gdb) frame 2
(gdb) info locals
(gdb) info registers
(gdb) x/16x $sp

# 3. 附加到运行中的进程，看所有线程栈
gdb -p $(pidof app)
(gdb) thread apply all bt

# 4. 跟踪系统调用（-f 跟子进程，-T 显示耗时）
strace -f -tt -T -e trace=openat,read,write,connect ./app

# 5. 解析内核 oops 地址
addr2line -e vmlinux -f -i 0xffffffff81234567
dmesg -T | tail -80`
        },
        codeNote: `<b>最容易踩的坑：</b>线上二进制被 strip 过，gdb 只能给出 <code>??</code>。做法是编译时保留一份带 <code>-g</code> 的二进制，按 build id 归档，出问题时用同版本文件分析 core；或者用 <code>eu-strip --strip-debug</code> 分离出 debug 文件。`,
        apply: `<p>嵌入式产品的做法：编译时加 <code>-g</code> 但不 strip 发布包，或者发布 strip 版、归档 debug 版；core 存到可写分区或通过网络回传；内核开 <code>CONFIG_PSTORE_RAM</code>，把 oops 存到 RAM/Flash，重启后 <code>/sys/fs/pstore</code> 读取。</p>
<p>如果 core 太大，可以只保留栈和关键段（<code>coredump_filter</code>），或者用 <code>systemd-coredump</code> 自动压缩归档。</p>`,
        pitfalls: [
          "<b>用 strip 过的二进制分析 core。</b>没有符号，只能看到地址，定位不了行号。",
          "<b>core 和二进制版本不匹配。</b>栈回溯完全错乱，比没有还糟。",
          "<b>strace 看用户态逻辑。</b>它只能看系统调用，业务分支要用 gdb 断点或日志。",
          "<b>崩溃后直接重启。</b>dmesg/core 被冲掉，现场没了，问题无法复现。"
        ],
        follow: [
          [
            "程序卡死但没崩，怎么查？",
            "先 <code>gdb -p</code> 看线程栈，判断是死锁、等 I/O 还是死循环；再 <code>strace -p</code> 看停在哪个系统调用；也可以 <code>perf top</code> 看热点。",
          ],
          [
            "oops 和 panic 有什么区别？",
            "oops 是内核检测到严重错误，杀死当前进程/线程，系统可能继续运行；panic 是错误严重到无法继续，系统停机（或按 <code>panic=</code> 重启）。",
          ],
          [
            "没有 core 怎么办？",
            "看应用日志、dmesg（段错误的地址和进程名）、以及是否有信号处理函数记录现场；提前加 <code>backtrace()</code>/<code>libunwind</code> 在崩溃时打印栈，是低成本的兜底。"
          ]
        ]
      },

      /* ---------------- LA-09 ---------------- */
      {
        id: "LA-09",
        chapter: "mem",
        topic: "vm",
        title: "虚拟内存、页表、TLB、缺页中断分别是什么？",
        diff: "高级",
        freq: "高频",
        type: "原理分析题",
        point: "考察地址转换流程、多级页表、TLB 缓存、缺页的三种类型，以及 COW 与按需分页。",
        q: `<p>面试官：进程访问一个地址，<strong>从虚拟地址到物理地址经历了什么？</strong>页表、TLB、缺页中断分别在哪一步？<strong>fork 之后为什么内存没有立刻翻倍？</strong></p>`,
        exam: `<p>这题考的是内存管理的整条链路。能说清“MMU 查 TLB → 查页表 → 缺页异常 → 内核分配/映射 → 重试指令”，以及 COW 的机制，就说明你理解虚拟内存不是“把硬盘当内存”这么简单。</p>`,
        core: `<p>MMU 先查 TLB，未命中再逐级查页表；缺页分 minor（页在内存只缺映射）、major（要从磁盘读）和非法访问（发 SIGSEGV），fork 的 COW 写时才复制。</p>`,
        answer: `<p><b>地址转换流程：</b></p>
<ol>
<li>CPU 发出虚拟地址，MMU 先查 <b>TLB</b>（页表缓存）。命中就直接得到物理页框号，拼接偏移，访问内存。</li>
<li>TLB 未命中，MMU 按页表基址逐级查<b>页表</b>（x86-64 是 4 级：PGD→PUD→PMD→PTE；ARMv7 通常 2 级；ARMv8 4 级），找到页表项。</li>
<li>页表项存在但页面不在内存（或权限不符），触发<b>缺页异常</b>，进入内核。</li>
<li>内核处理：分配物理页、从磁盘/交换区读入、建立映射、更新页表，然后返回用户态<b>重新执行</b>那条指令。</li>
</ol>
<p><b>TLB：</b>页表在内存里，每次访问都查表太慢，TLB 缓存最近的“虚拟页→物理页”映射。进程切换时要刷新或打标签（ASID/PCID），否则会用到别的进程的映射。修改映射后要做 TLB shootdown，保证其他核看到新值。</p>
<p><b>缺页的三种类型：</b></p>
<ul>
<li><b>Minor（次缺页）</b>：页面已在内存（page cache 或 COW），只是还没建立当前进程的映射，内核只需改页表，很快。</li>
<li><b>Major（主缺页）</b>：页面不在内存，需要读磁盘/Flash，慢，可能是毫秒级。</li>
<li><b>Invalid（非法访问）</b>：地址不属于进程的合法映射，或权限不符，内核发 SIGSEGV，进程崩溃。</li>
</ul>
<p><b>fork 与 COW：</b>fork 后父子进程共享同一份物理页，页表都标记为只读。任一进程写入时触发缺页，内核复制这一页、改成可写，各自持有副本。所以 fork 很快，内存只在“写”的时候才真正复制。</p>`,
        principle: `<p>虚拟内存给每个进程独立的地址空间，带来三个好处：隔离（一个进程不能随便读写另一个）、简化链接（程序都以为自己从固定地址开始）、按需分配（可以申请比物理内存更大的地址空间）。</p>
<p>页表是“多级树”，高位索引逐级缩小范围，最后一级页表项指向物理页。多级设计让未使用的地址区间不必分配页表，节省内存。</p>
<p>按需分页（demand paging）让 <code>malloc</code> 只分配虚拟地址，第一次访问才真正给物理页；这也是为什么“申请成功”不代表“真有内存”，OOM 可能发生在访问时。</p>`,
        fig: {
          type: "memmap",
          title: "32 位 Linux 的地址空间划分（3G/1G）",
          tag: "memmap",
          rows: [
            { name: "内核空间", text: "内核代码、页表、驱动、vmalloc", addr: "0xFFFF FFFF", cls: "a" },
            { name: "用户栈", text: "向下增长，局部变量", addr: "0xBFFF FFFF", cls: "b" },
            { name: "mmap 区", text: "共享库、文件映射、匿名映射", addr: "0x4000 0000", cls: "c" },
            { name: "堆", text: "malloc 向上增长", addr: "0x0804 8000", cls: "d" },
            { name: "BSS / Data", text: "全局变量、静态变量", addr: "0x0804 9000", cls: "b" },
            { name: "代码段", text: "只读、可执行", addr: "0x0804 8000", cls: "a" }
          ]
        },
        apply: `<p>嵌入式 Linux 上，内存问题常见三类：一是 <code>malloc</code> 成功但访问时 OOM，因为 overcommit；二是 mmap 寄存器后没设 <code>O_SYNC</code>/非缓存，读写顺序和预期不符；三是频繁 mmap/munmap 导致 TLB 刷新和页表开销，应该用内存池。</p>
<p>看内存指标时，RSS 是实际占用的物理页，VSZ 是虚拟地址空间大小；VSZ 很大不一定有问题，RSS 持续增长才要怀疑泄漏。</p>`,
        pitfalls: [
          "<b>以为 malloc 成功就有内存。</b>按需分页 + overcommit，真正分配可能发生在访问时，OOM 也在那时。",
          "<b>把虚拟地址当物理地址用。</b>驱动里必须用 <code>virt_to_phys</code>/<code>ioremap</code>，不能直接拿用户指针访问硬件。",
          "<b>修改映射不刷 TLB。</b>CPU 可能继续用旧映射，出现“改了页表但不生效”。",
          "<b>fork 后以为内存翻倍。</b>COW 只复制被写过的页，读多写少时开销很小。"
        ],
        follow: [
          [
            "TLB 命中率怎么影响性能？",
            "每次 TLB 未命中都要查页表（可能多次内存访问），称为 page walk。大页（2MB/1GB）能显著减少 TLB 项和 page walk 次数，数据库、虚拟化常用。",
          ],
          [
            "什么是 OOM killer？",
            "内存不足时内核选择一个“分数最高”的进程杀掉，释放内存。分数综合 RSS、swap、运行时间等。嵌入式可以调 <code>oom_score_adj</code> 保护关键进程。",
          ],
          [
            "mmap 和 read/write 有什么区别？",
            "mmap 把文件映射到地址空间，访问像内存，适合大文件和随机访问；read/write 是拷贝，适合顺序小量数据。mmap 要注意缺页和写回时机。"
          ]
        ]
      }
    ]
  });
})();
