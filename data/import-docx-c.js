/* ============================================================
   import-docx-c.js
   从《面试题目.docx》C 语言、数据结构、计算机组成与软件架构部分
   导入的补充题（仅收录站内没有重复的）
   答案按工程实践重写
   ============================================================ */
(function () {
  "use strict";

  EIK.extend("c-language", {
    chapters: [
      {
        id: "stmt",
        title: "语句、表达式与作用域",
        topics: [
          { id: "loop", title: "循环与跳转" },
          { id: "scope", title: "作用域与链接属性" },
          { id: "expr", title: "表达式与逻辑运算" }
        ]
      }
    ],

    questions: [
      {
        id: "C-24",
        chapter: "runtime",
        topic: "string",
        title: "手写 strcpy：返回值、终止条件和重叠问题怎么处理？",
        diff: "初级",
        freq: "高频",
        type: "编程实现题",
        point: "指针遍历、const 入参、\\0 终止符、返回值约定，以及为什么工程里不直接用 strcpy。",
        q: `<p>面试官：实现一个 <code>strcpy</code> 函数。写完再说说，为什么实际项目里很少直接调用它？</p>`,
        core: `<p>strcpy 逐字节拷贝到 \0 并连终止符一起复制，返回目标首地址；调用方必须保证目标空间足够且源串以 \0 结尾。</p>`,
        answer: `<p><b>标准原型：</b><code>char *strcpy(char *dst, const char *src)</code>。两个细节先定下来：<code>src</code> 加 <code>const</code>，表示只读；返回值是 <code>dst</code>，不是拷贝后的长度，也不是 <code>src</code>。这样设计是为了支持链式调用，例如 <code>strcpy(a, strcpy(b, c))</code>，同时兼容标准库。</p>
<p><b>实现要点：</b>先保存 <code>dst</code> 的起始地址，然后逐字节拷贝，遇到 <code>src</code> 的 <code>'\\0'</code> 时把终止符也拷过去，最后返回起始地址。<code>'\\0'</code> 必须拷贝，否则目标串没有结尾，后续 <code>strlen</code> 会一直读到别的内存。</p>
<pre><code>char *my_strcpy(char *dst, const char *src)
{
    char *ret = dst;

    if (dst == NULL || src == NULL) {
        return NULL;              /* 标准库不检查，工程封装应检查 */
    }

    while ((*dst++ = *src++) != '\\0') {
        ;                         /* 先赋值，再判断刚拷进来的字符 */
    }

    return ret;
}</code></pre>
<p><b>边界条件：</b>调用方必须保证 <code>dst</code> 有足够空间；<code>src</code> 必须以 <code>'\\0'</code> 结尾；两个指针都不能为空。<code>strcpy</code> 本身不接收目标长度，所以它无法知道自己有没有越界——这正是它的根本问题。</p>
<p><b>重叠问题：</b>如果 <code>dst</code> 和 <code>src</code> 指向同一块内存且区间重叠，逐字节正序拷贝会先把后面还没读的数据覆盖掉，结果不可预期。C 标准明确规定 <code>strcpy</code> 的源和目标不能重叠；需要重叠拷贝时用 <code>memmove</code>。</p>
<p><b>工程里为什么不用：</b>它不检查长度，是缓冲区溢出的常客。已知长度的字符串用 <code>snprintf(dst, sizeof(dst), "%s", src)</code>，它保证不越界并以 <code>'\\0'</code> 结尾；也可以用 <code>strlcpy</code>（非标准，部分平台没有）或自己封装带长度检查的函数。<code>strncpy</code> 不是安全的替代品：源串长度大于等于 n 时它不会补 <code>'\\0'</code>。</p>`,
        follow: [
          [
            "strcpy 和 strncpy 有什么区别？",
            "<code>strcpy</code> 一直拷到 <code>'\\0'</code>，不限制长度；<code>strncpy</code> 最多拷 n 个字节，但源串更长时不会自动补终止符，后续按字符串使用会越界读。它原本是给固定长度字段用的，不适合当安全版 <code>strcpy</code>。"
          ],
          [
            "为什么 memcpy 通常比 strcpy 快？",
            "<code>strcpy</code> 每拷一个字节都要判断是不是 <code>'\\0'</code>，而且长度事先未知；<code>memcpy</code> 长度已知，可以按字、按向量批量搬，编译器还能内联成更高效的指令。但 <code>memcpy</code> 不会替你加终止符，字符串场景要自己补。"
          ],
          [
            "为什么返回值要返回 dst，而不是长度？",
            "历史约定是为了链式调用和与标准库保持一致。返回长度看似有用，但会改变函数签名，和标准库不兼容；需要长度时调用方自己用 <code>strlen</code> 或让封装函数通过出参返回。"
          ]
        ]
      },
      {
        id: "C-25",
        chapter: "pointer",
        topic: "ptr-basic",
        title: "用变量 a 写出 8 种 C 声明：从整型到函数指针数组",
        diff: "初级",
        freq: "高频",
        type: "概念辨析题",
        point: "后缀 [] 和 () 的优先级高于 *，从标识符出发按“右结合优先”读声明。",
        q: `<p>面试官：用变量 <code>a</code> 给出下面 8 个定义：一个整型数、一个指向整型数的指针、一个指向指针的指针（它指向的指针指向整型数）、一个有 10 个整型数的数组、一个有 10 个指针的数组（指针指向整型数）、一个指向有 10 个整型数数组的指针、一个指向函数的指针（函数有一个整型参数并返回整型数）、一个有 10 个指针的数组（指针指向这样的函数）。</p>`,
        core: `<p>读复杂声明从变量名出发、先右后左，[] 和 () 优先级高于 *；int *a[10] 是指针数组，int (*a)[10] 才是指向数组的指针。</p>`,
        answer: `<p><b>八个声明依次是：</b></p>
<ol>
<li>一个整型数：<code>int a;</code></li>
<li>一个指向整型数的指针：<code>int *a;</code></li>
<li>一个指向指针的指针，它指向的指针指向整型数：<code>int **a;</code></li>
<li>一个有 10 个整型数的数组：<code>int a[10];</code></li>
<li>一个有 10 个指针的数组，每个指针指向整型数：<code>int *a[10];</code></li>
<li>一个指向有 10 个整型数数组的指针：<code>int (*a)[10];</code></li>
<li>一个指向函数的指针，函数有一个整型参数并返回整型数：<code>int (*a)(int);</code></li>
<li>一个有 10 个指针的数组，每个指针指向这样的函数：<code>int (*a[10])(int);</code></li>
</ol>
<p><b>怎么读：</b>从标识符 <code>a</code> 出发，先看右边，再看左边。后缀 <code>[]</code> 和 <code>()</code> 的优先级高于 <code>*</code>，所以 <code>int *a[10]</code> 先结合成“a 是 10 个元素的数组”，再结合 <code>*</code> 得到“元素是指针”；而 <code>int (*a)[10]</code> 的括号强制 <code>*</code> 先结合，读作“a 是指针，指向 10 个 int 的数组”。</p>
<p><b>记忆方法：</b>“右结合优先，括号改顺序”。遇到复杂的声明，先找标识符，向右读 <code>[]</code> 或 <code>()</code>，再向左读 <code>*</code>，逐层套。实际工程里更推荐用 <code>typedef</code> 拆开，例如 <code>typedef int (*handler_t)(int);</code>，再写 <code>handler_t a[10];</code>，可读性会好很多。</p>`,
        follow: [
          [
            "int (*a[10])(int) 到底怎么读？",
            "<code>a</code> 先和 <code>[10]</code> 结合，是一个 10 元素数组；元素类型是 <code>int (*)(int)</code>，即“接受一个 int、返回 int 的函数指针”。所以它是函数指针数组，常用于命令表或状态机跳转表。"
          ],
          [
            "为什么推荐用 typedef 定义函数指针？",
            "函数指针的原始写法可读性差，容易漏括号；<code>typedef</code> 给类型起名字后，声明变量、做参数、做数组都更清晰，改函数签名时也只改一处。注意 <code>typedef</code> 定义的是类型，不是变量。"
          ],
          [
            "const 放在不同位置分别约束什么？",
            "<code>const int *p</code>：不能通过 p 改它指向的值；<code>int *const p</code>：p 本身不能改指向，但可以改指向的值；<code>const int *const p</code>：两者都不能改。读法是“const 修饰它右边最近的东西”，指针声明要从标识符往外读。"
          ]
        ]
      },
      {
        id: "C-26",
        chapter: "types",
        topic: "bit",
        title: "怎样统计一个字节里有多少位被置 1？",
        diff: "初级",
        freq: "中频",
        type: "编程实现题",
        point: "移位法、Kernighan 的 a &= a-1、查表法与编译器内建函数，以及 MCU 上的取舍。",
        q: `<p>面试官：给一个 <code>uint8_t a</code>，写代码统计它二进制里 1 的个数。能想出几种方法？各自的时间复杂度是多少？</p>`,
        core: `<p>逐位循环最直接，a &= a-1 每次消掉最低位的 1、循环次数等于 1 的个数；查表最快但要占 ROM，__builtin_popcount 在 Cortex-M 上不一定更快。</p>`,
        answer: `<p><b>方法一：逐位判断。</b>循环 8 次，每次取最低位累加，然后右移。实现最简单，但不管数据里有几个 1 都要循环固定位数。</p>
<pre><code>uint8_t popcount_loop(uint8_t a)
{
    uint8_t n = 0;

    while (a) {
        n += (uint8_t)(a &amp; 1u);
        a &gt;&gt;= 1;
    }
    return n;
}</code></pre>
<p><b>方法二：Kernighan 法。</b><code>a &amp;= a - 1</code> 每次消掉最低位的 1，循环次数等于 1 的个数。数据稀疏时更快，最坏仍是 8 次。</p>
<pre><code>uint8_t popcount_kernighan(uint8_t a)
{
    uint8_t n = 0;

    while (a) {
        a &amp;= (uint8_t)(a - 1u);
        n++;
    }
    return n;
}</code></pre>
<p><b>方法三：查表。</b>预先算好 256 字节的表，<code>table[a]</code> 直接得结果，O(1)，代价是 256 字节 ROM。MCU 上 ROM 通常比时间宽裕，追求确定性时很划算；也可以只做 16 字节的半字节表，查两次，省 ROM。</p>
<p><b>方法四：编译器内建函数。</b>GCC/Clang 提供 <code>__builtin_popcount</code>，x86 有 <code>POPCNT</code> 指令；Cortex-M 没有单周期人口计数指令，编译器通常会展开成位运算或调用库函数，具体要看反汇编，不能假设它一定更快。</p>
<p><b>注意：</b><code>uint8_t</code> 参与运算会发生整型提升，写掩码时建议带 <code>u</code>；如果统计 32 位数据，逐位循环就不划算了，可以用 SWAR 位并行算法或查表。面试时先说清楚“数据宽度”和“1 的密度”，再选方法。</p>`,
        follow: [
          [
            "为什么 a &= a - 1 能消掉最低位的 1？",
            "减 1 会把最低位的 1 变成 0，并把它右边的 0 全变成 1；再和原来的 a 做与运算，最低位的 1 及其右边都被清零，更高位不变。例如 0b1010 - 1 = 0b1001，相与得到 0b1000。"
          ],
          [
            "32 位数据怎么统计更快？",
            "可以用 SWAR：先两两分组算 2 位内的 1 个数，再合并到 4 位、8 位、16 位、32 位，全程无分支；也可以查 16 位表两次。具体选哪种要看 MCU 的 ROM、是否有缓存和指令集。"
          ],
          [
            "查表法的 256 字节表值得吗？",
            "看产品约束。ROM 紧张时用 16 字节半字节表；追求确定性和速度时 256 字节很划算。表要放在 <code>const</code> 区，别放 RAM；如果是多字节数据，查表次数会线性增加。"
          ]
        ]
      },
      {
        id: "C-27",
        chapter: "runtime",
        topic: "string",
        title: 'char *str = "hello\\n\\0\\n"，strlen 是多少？',
        diff: "初级",
        freq: "中频",
        type: "陷阱分析题",
        point: "字符串字面量的实际字节数、转义字符、strlen 遇 \\0 停止，以及 sizeof 的区别。",
        q: `<p>面试官：有定义 <code>char *str = "hello\\n\\0\\n";</code>，<code>strlen(str)</code> 的值是多少？如果改成 <code>char str[] = "hello\\n\\0\\n";</code>，<code>sizeof(str)</code> 又是多少？</p>`,
        core: `<p>“hello\n\0\n” 中 strlen 数到第一个 \0 得 6；改成 char str[] 后 sizeof 包含显式和隐式终止符，得 9。</p>`,
        answer: `<p><b>strlen 是 6。</b>这个字面量的字节依次是：<code>h</code>、<code>e</code>、<code>l</code>、<code>l</code>、<code>o</code>、<code>\\n</code>、<code>\\0</code>、<code>\\n</code>，最后编译器还会自动补一个 <code>\\0</code> 作为字符串结束符。所以整个字面量占 9 个字节；但 <code>strlen</code> 从首字符开始数，遇到第一个 <code>\\0</code> 就停，前面正好 6 个字符（<code>\\n</code> 是一个字符，占 1 字节）。</p>
<p><b>sizeof 是 9。</b>数组按字面量的实际字节数分配：6 个可见字符 + 中间显式的 <code>\\0</code> + 后面的 <code>\\n</code> + 末尾隐式 <code>\\0</code>，共 9 字节。注意 <code>sizeof</code> 是编译期算的，和字符串内容无关；<code>strlen</code> 是运行期数的，遇 <code>\\0</code> 停止。</p>
<p><b>常见错误：</b>把 <code>\\n</code> 当成两个字符（反斜杠和 n），得出 12 之类的答案；或者忘了显式的 <code>\\0</code> 会让 <code>strlen</code> 提前停止。转义字符在编译期就已经变成一个字符，源码里的两个字符不等于运行时的两个字节。</p>
<p><b>延伸：</b><code>printf("%s", str)</code> 会输出 <code>hello</code> 加一个换行，然后遇到 <code>\\0</code> 停止，后面的 <code>\\n</code> 不会再打印。如果要看完整 9 个字节，应该逐字节按十六进制打印，而不是用 <code>%s</code>。</p>`,
        follow: [
          [
            "strlen 和 sizeof 的本质区别是什么？",
            "<code>sizeof</code> 是运算符，编译期求值，得到对象或类型的字节数；<code>strlen</code> 是库函数，运行期遍历字符串，数到 <code>\\0</code> 为止。对数组 <code>char a[] = &quot;abc&quot;</code>，<code>sizeof(a)</code> 是 4，<code>strlen(a)</code> 是 3；对指针 <code>char *p</code>，<code>sizeof(p)</code> 是指针大小。"
          ],
          [
            "为什么字符串字面量最后会自动补一个 \\0？",
            "这是 C 标准的规定，为了让字符串能被 <code>strlen</code>、<code>printf</code> 等函数识别结尾。所以 <code>&quot;abc&quot;</code> 在内存里是 4 个字节，不是 3 个。拼接、拷贝、数组初始化时都要把这一字节算进去。"
          ],
          [
            "char *str 和 char str[] 在这里有什么区别？",
            "<code>char *str</code> 是指针，指向只读数据段里的字面量，不能修改；<code>char str[]</code> 是数组，在栈上分配 9 字节并把内容复制进去，可以修改。两者的 <code>sizeof</code> 也不同：前者是指针大小，后者是数组大小。"
          ]
        ]
      },
      {
        id: "C-28",
        chapter: "types",
        topic: "bit",
        title: "不借助第三个变量交换两个整数，有哪些写法？各有什么坑？",
        diff: "初级",
        freq: "中频",
        type: "编程实现题",
        point: "异或三次交换的可逆性、同一变量的退化、加减法的溢出，以及可读性取舍。",
        q: `<p>面试官：A = 3，B = 4，写一段代码交换它们的值，不能使用第三个变量。说说你实际写代码时会不会这么用。</p>`,
        core: `<p>异或交换是 a^=b; b^=a; a^=b;，但 a、b 是同一变量时会清零；工程上直接用临时变量，编译器优化后效率一样。</p>`,
        answer: `<p><b>写法一：异或。</b>利用 <code>x ^ x = 0</code> 和异或的可逆性，三次异或完成交换：</p>
<pre><code>a ^= b;    /* a = a ^ b */
b ^= a;    /* b = b ^ (a ^ b) = 原 a */
a ^= b;    /* a = (a ^ b) ^ 原 a = 原 b */</code></pre>
<p><b>写法二：加减法。</b>先保存和，再减回去：</p>
<pre><code>a = a + b;
b = a - b;
a = a - b;</code></pre>
<p><b>坑一：同一个变量。</b>如果 <code>a</code> 和 <code>b</code> 是同一个变量（比如传入同一个指针），异或第一步就把它清成 0，后面全是 0，原值丢失。加减法同样会出错。工程封装必须先判断地址是否相同。</p>
<p><b>坑二：有符号溢出。</b><code>a + b</code> 可能超出 <code>int</code> 范围，有符号溢出在 C 里是未定义行为，不只是“结果不对”。异或法没有算术溢出，但只能用于整数类型；浮点数不能做位运算，指针虽然可以转成整数，但可移植性不好。</p>
<p><b>坑三：可读性。</b>现代编译器对“用临时变量交换”会优化得很好，临时变量版本最清晰、最不容易出错。异或技巧适合面试展示位运算理解，不适合作为团队代码的默认写法；如果确实要用，封装成 <code>static inline</code> 函数并加注释。</p>`,
        follow: [
          [
            "为什么异或三次能交换，而不用临时变量？",
            "异或是可逆运算：<code>a ^ b ^ b = a</code>。三次异或相当于把两个值的异或结果分别和对方再异或一次，逐步还原出对方的值。整个过程只依赖这一个可逆性质，不需要额外存储。"
          ],
          [
            "如果 a 和 b 是同一个变量会怎样？",
            "异或法第一步 <code>a ^= a</code> 得 0，原值被覆盖；后面无论怎么算都是 0。加减法则是先得到 <code>2a</code>，再减回 <code>a</code>，看起来可能“碰巧”正确，但同样依赖别名假设，不能算安全。"
          ],
          [
            "浮点数能用异或交换吗？",
            "不能。C 的位运算只接受整数类型，浮点要先转成整数再转回来，这会涉及类型双关和严格别名规则，可移植性差；而且 +0.0 和 -0.0、NaN 的位模式还有特殊情况。浮点交换直接用临时变量。"
          ]
        ]
      },
      {
        id: "C-29",
        chapter: "runtime",
        topic: "mem",
        title: "strcpy 和 memcpy 有什么区别？分别适合什么场景？",
        diff: "初级",
        freq: "高频",
        type: "对比辨析题",
        point: "一个按 \\0 停止并拷贝终止符，一个按字节数拷贝；重叠都未定义，性能与用途不同。",
        q: `<p>面试官：<code>strcpy</code> 和 <code>memcpy</code> 有什么不同？如果让你在项目里选，什么时候用哪个？</p>`,
        core: `<p>strcpy 按 \0 停止、只能拷字符串；memcpy 按字节数拷贝、可拷任意内存块且不补 \0，两者都要求源和目标不重叠。</p>`,
        answer: `<p><b>停止条件不同。</b><code>strcpy(dst, src)</code> 按 <code>src</code> 里的 <code>'\\0'</code> 停止，并把终止符一起拷贝到 <code>dst</code>，所以拷完可以直接当字符串用；<code>memcpy(dst, src, n)</code> 按字节数 n 拷贝，完全不看内容，也不会自动补 <code>'\\0'</code>。</p>
<p><b>适用数据不同。</b><code>strcpy</code> 只能用于以 <code>'\\0'</code> 结尾的字符串；<code>memcpy</code> 适用于任意内存块，包括结构体、数组、缓冲区、二进制协议帧。拷贝字符串时如果用 <code>memcpy(dst, src, strlen(src))</code>，一定记得再补一个 <code>dst[len] = '\\0'</code>，否则后续按字符串使用会越界。</p>
<p><b>性能与实现不同。</b><code>strcpy</code> 每拷一个字节都要判断终止符，长度未知；<code>memcpy</code> 长度已知，可以按字长或 SIMD 批量拷贝，通常更快。很多编译器会把已知长度的 <code>memcpy</code> 内联展开。</p>
<p><b>重叠都不行。</b>两者都假定源和目标不重叠，重叠时行为未定义；需要重叠拷贝用 <code>memmove</code>。<code>strcpy</code> 还不检查目标长度，源串过长会直接越界，工程上应优先用 <code>snprintf</code> 或带长度检查的封装。</p>
<p><b>结构体拷贝的额外坑：</b><code>memcpy</code> 会连结构体里的填充字节一起拷，跨编译器/跨平台传输时字段布局可能不同；如果结构体里有指针成员，拷过去只是浅拷贝，两个结构体指向同一块内存。协议传输要逐字段序列化，不要直接 <code>memcpy</code> 结构体。</p>`,
        follow: [
          [
            "为什么 memcpy 不能自动处理字符串结尾？",
            "<code>memcpy</code> 的语义是“拷贝 n 个字节”，它不知道也不关心数据里有没有 <code>'\\0'</code>；如果它自己找 <code>'\\0'</code>，就不再是通用内存拷贝了。需要字符串语义时用 <code>strcpy</code>，或者拷贝后手动补终止符。"
          ],
          [
            "strcpy 和 memmove 能互换吗？",
            "不能。<code>strcpy</code> 按 <code>'\\0'</code> 停止并拷贝终止符，<code>memmove</code> 按字节数拷贝且支持重叠；两者解决的约束不同。字符串重叠拷贝可以用 <code>memmove</code>，但要自己传 <code>strlen(src) + 1</code>。"
          ],
          [
            "结构体直接用 memcpy 有什么风险？",
            "填充字节、端序、字段对齐、指针成员都会让拷贝结果不可移植。同一台机器上做浅拷贝通常没问题；跨平台、存 Flash、走网络时必须逐字段序列化，并明确字节序和长度。"
          ]
        ]
      },
      {
        id: "C-30",
        chapter: "pointer",
        topic: "ptr-basic",
        title: "如何把变量放到绝对地址 0x1000，或从 0x10010000 读一个 32 位值？",
        diff: "中级",
        freq: "中频",
        type: "工程应用题",
        point: "指针强制转换、volatile、定宽类型与对齐；地址合法性由链接脚本或 MPU 决定。",
        q: `<p>面试官：要求把绝对地址 <code>0x1000</code> 处的整型变量设置为 <code>0xAA55</code>；再从 <code>0x10010000</code> 地址取出一个无符号 32 位整数存到变量 <code>a</code>。代码怎么写？为什么这么写？</p>`,
        core: `<p>#define REG32(a) (*(volatile uint32_t *)(a))，volatile 防止访问被优化掉，uint32_t 保证访问宽度固定。</p>`,
        answer: `<p><b>核心写法：</b>把地址强制转换成对应宽度的指针，解引用赋值或读取。关键是加 <code>volatile</code>，并用定宽类型。</p>
<pre><code>#include &lt;stdint.h&gt;

#define REG16(addr) (*(volatile uint16_t *)(addr))
#define REG32(addr) (*(volatile uint32_t *)(addr))

void demo(void)
{
    REG16(0x1000u) = 0xAA55u;                 /* 写 16 位 */
    uint32_t a = REG32(0x10010000u);          /* 读 32 位 */
    (void)a;
}</code></pre>
<p><b>为什么加 volatile：</b>这个地址可能被硬件、DMA 或中断修改，编译器不能把它缓存到寄存器，也不能把“看起来没变化”的重复访问优化掉。访问外设寄存器时这一点是必须的；普通 RAM 变量则不需要。</p>
<p><b>为什么用 uint16_t/uint32_t：</b>C 的 <code>int</code> 宽度随平台变化，可能是 16 位也可能是 32 位。题目说“整型变量”但值 <code>0xAA55</code> 只占 16 位，写 <code>*(int *)0x1000</code> 在 32 位平台上会写 4 个字节，可能踩坏相邻地址。定宽类型能明确访问宽度。</p>
<p><b>对齐与合法性：</b><code>0x10010000</code> 是 4 字节对齐的，读 32 位没问题；非对齐访问在 Cortex-M0 上可能直接 HardFault，在 M3/M4 上可能变慢或被拆分。地址本身是否可访问，要看链接脚本、MPU/MMU 配置和芯片内存映射；在 PC 上访问 <code>0x1000</code> 会触发段错误，不能直接运行。</p>
<p><b>工程习惯：</b>外设寄存器一般用结构体映射加 CMSIS 的 <code>__IO</code>（本质也是 volatile），比散落的宏更清晰；确实要固定地址的变量，可以在链接脚本里单独划段，而不是硬编码地址。</p>`,
        follow: [
          [
            "为什么不能写 *(int *)0x1000 = 0xAA55？",
            "两个问题：<code>int</code> 宽度不确定，32 位平台上会写 4 字节而不是 2 字节；没有 <code>volatile</code>，编译器可能把写操作优化掉或合并。地址对齐和可访问性也要单独确认。"
          ],
          [
            "链接脚本怎么把变量放到固定地址？",
            "在链接脚本里新增一个段，指定 VMA/LMA，例如把 <code>.mycfg</code> 放到某个地址；C 代码里用 <code>__attribute__((section(&quot;.mycfg&quot;)))</code> 把变量放进去。这样地址由链接阶段保证，比硬编码安全，也方便换芯片时调整。"
          ],
          [
            "volatile 能保证这个读写是原子的吗？",
            "不能。volatile 只保证每次真实访问内存，不保证读-改-写是一个原子操作，也不阻止 CPU 乱序。多字节访问、位带操作、中断共享数据要另外用关中断、原子指令或内存屏障保护。"
          ]
        ]
      },
      {
        id: "C-31",
        chapter: "runtime",
        topic: "string",
        title: "只用指针把字符串原地翻转，边界怎么写才不出错？",
        diff: "初级",
        freq: "中频",
        type: "编程实现题",
        point: "双指针相向交换、空指针与空串处理、字符串字面量不可修改。",
        q: `<p>面试官：写一个函数，用指针把字符串原地倒序，例如 <code>"abcd"</code> 变成 <code>"dcba"</code>。要求不使用数组下标。</p>`,
        core: `<p>用左右两个指针相向交换，右指针先走到 \0 再回退一位；要先判空、空串直接返回，且字符串必须可写。</p>`,
        answer: `<p><b>思路：</b>两个指针，一个指向首字符，一个先走到最后一个字符，然后相向而行，交换字符，直到左指针不小于右指针。全程只用指针解引用和自增自减。</p>
<pre><code>void reverse_str(char *s)
{
    char *left = s;
    char *right = s;

    if (s == NULL) {
        return;
    }

    while (*right != '\\0') {
        right++;
    }

    if (right == left) {
        return;                    /* 空串 */
    }
    right--;                       /* 指向最后一个有效字符 */

    while (left &lt; right) {
        char t = *left;
        *left++ = *right;
        *right-- = t;
    }
}</code></pre>
<p><b>边界：</b>先判空指针；空串时 <code>right == left</code>，直接返回，避免 <code>right--</code> 越到字符串前面；循环条件是 <code>left &lt; right</code>，不能写成 <code>&lt;=</code>，否则中间字符会自己和自己交换，虽然结果不变，但多一次无意义操作，长度为偶数时还可能越界。</p>
<p><b>最容易被追问的坑：</b><code>char *s = "abcd"</code> 指向只读数据段，传进去修改会触发段错误或硬件异常。要翻转就必须用可写内存，例如 <code>char s[] = "abcd"</code>，或者由调用方提供缓冲区。函数签名可以加 <code>char *</code>，但文档要写清“必须可写”。</p>
<p><b>复杂度：</b>时间 O(n)，空间 O(1)，不需要额外数组。相比“从尾到头复制到新数组”，原地翻转更适合 RAM 紧张的 MCU。</p>`,
        follow: [
          [
            "为什么 char *s = \"abcd\" 不能翻转？",
            "字符串字面量存放在只读数据段（<code>.rodata</code>），指针指向的是只读内存；写它会触发访问异常。要可写就用字符数组 <code>char s[] = &quot;abcd&quot;</code>，它在栈上分配并复制内容。"
          ],
          [
            "递归实现翻转要注意什么？",
            "递归深度等于字符串长度，长字符串会吃栈，MCU 上几 KB 的栈很容易溢出；而且递归返回时要交换，仍需保存状态。工程上优先迭代双指针，递归只适合教学演示。"
          ],
          [
            "怎么把句子里的单词顺序翻转，但单词本身不翻转？",
            "分两步：先整体翻转整个字符串，再逐个单词翻转。例如 <code>&quot;hello world&quot;</code> 整体翻转成 <code>&quot;dlrow olleh&quot;</code>，再分别翻转两个单词得到 <code>&quot;world hello&quot;</code>。关键是识别空格边界。"
          ]
        ]
      },
      {
        id: "C-32",
        chapter: "stmt",
        topic: "scope",
        title: "局部变量可以和全局变量重名吗？会发生什么？",
        diff: "初级",
        freq: "中频",
        type: "概念辨析题",
        point: "内层声明遮蔽外层、链接属性与作用域的区别，以及 -Wshadow 的价值。",
        q: `<p>面试官：C 语言里局部变量能不能和全局变量重名？如果能，函数里访问到的到底是哪个？怎么在函数里访问被遮住的全局变量？</p>`,
        core: `<p>内层同名变量会遮蔽外层变量，但全局没有被删除；要显式访问全局可在内层块写 extern，建议开 -Wshadow 并用 g_/s_ 命名区分。</p>`,
        answer: `<p><b>可以重名，编译器不会报错。</b>C 语言允许内层作用域重新声明一个同名标识符，这叫“遮蔽”（shadowing）。在局部变量的作用域内，所有对这个名字的访问都指向局部变量；全局变量并没有被删除，只是被挡住了。</p>
<pre><code>int value = 10;                /* 全局 */

void demo(void)
{
    int value = 20;            /* 局部，遮蔽全局 */
    printf("%d\\n", value);     /* 输出 20 */
}</code></pre>
<p><b>怎么访问全局：</b>在函数内用一个内层块加 <code>extern</code> 声明，可以显式引用文件作用域的变量：</p>
<pre><code>void demo(void)
{
    int value = 20;

    {
        extern int value;      /* 引用全局的 value */
        printf("%d\\n", value); /* 输出 10 */
    }
}</code></pre>
<p><b>风险：</b>遮蔽本身不违法，但很容易造成“我以为改的是全局，其实改的是局部”的 bug，调试时看变量值会困惑。C++ 里还有类成员同名的情况，问题更隐蔽。建议开启编译器警告 <code>-Wshadow</code>，或者用命名规范区分：全局加 <code>g_</code> 前缀，静态文件变量加 <code>s_</code>，局部变量用普通命名。</p>
<p><b>和链接属性的区别：</b>局部变量没有链接属性，不会进入符号表给别的文件用；全局变量有外部链接，<code>static</code> 全局是内部链接。重名遮蔽是“作用域”层面的，链接冲突是“符号”层面的，不要把两者混为一谈。</p>`,
        follow: [
          [
            "同名时编译器按什么规则选择？",
            "按作用域从内到外查找：先在当前块找，再找外层块，最后找文件作用域。找到第一个匹配就停止，所以内层声明会遮蔽外层。名字查找发生在编译期，和运行时的值无关。"
          ],
          [
            "static 全局变量和普通全局变量重名会冲突吗？",
            "如果 <code>static</code> 全局只在某个 .c 文件内可见，另一个文件里的同名普通全局不会和它链接冲突，因为前者是内部链接；但在同一个文件里重复定义仍然会报错。跨文件重名要靠命名规范避免。"
          ],
          [
            "为什么建议开启 -Wshadow？",
            "它会在变量遮蔽时给出警告，包括局部遮蔽全局、内层块遮蔽外层、参数遮蔽成员等。这类问题往往不是语法错误，而是逻辑错误，编译期发现比调试期发现便宜得多。"
          ]
        ]
      },
      {
        id: "C-33",
        chapter: "stmt",
        topic: "loop",
        title: "do...while 和 while 有什么区别？C 里有 while...do 吗？",
        diff: "初级",
        freq: "中频",
        type: "概念辨析题",
        point: "先判断还是先执行、至少执行一次、末尾分号，以及 continue 的行为差异。",
        q: `<p>面试官：<code>do...while</code> 和 <code>while</code> 有什么区别？C 语言里有 <code>while...do</code> 这种写法吗？</p>`,
        core: `<p>while 先判断、可能一次都不执行；do...while 先执行后判断、至少执行一次，且 while 条件后必须有分号。</p>`,
        answer: `<p><b>先纠正一个说法：</b>C 语言只有 <code>while (条件) 语句</code> 和 <code>do 语句 while (条件);</code>，没有 <code>while...do</code>。题目里说的“while...do”通常就是指 <code>while</code> 循环。</p>
<p><b>核心区别：</b><code>while</code> 先判断条件，条件为假时一次都不执行；<code>do...while</code> 先执行循环体，再判断条件，所以至少执行一次。语法上 <code>do...while</code> 的 <code>while (条件)</code> 后面必须有分号。</p>
<pre><code>while (retry &lt; 3) {
    retry++;
    try_connect();
}

do {
    ret = read_sensor();
} while (ret == RETRY);   /* 至少读一次 */</code></pre>
<p><b>怎么选：</b>“可能一次都不做”用 <code>while</code>；“无论如何要先做一次，再决定要不要重试”用 <code>do...while</code>。典型场景是重试、菜单循环、参数校验：先读一次输入，再判断是否继续。</p>
<p><b>continue 的差异：</b>在 <code>while</code> 里，<code>continue</code> 直接跳到条件判断；在 <code>do...while</code> 里，<code>continue</code> 也是跳到条件判断，而不是跳过判断直接进入下一轮。两者都不会跳过条件，但 <code>do...while</code> 的条件在末尾，写代码时容易误以为 <code>continue</code> 会回到循环体开头。</p>
<p><b>宏里的经典用法：</b><code>do { ... } while (0)</code> 把多语句宏包成一条语句，能安全地放在 <code>if</code> 后面，不会因为分号或大括号出问题。这一点在宏定义题里也会问到。</p>`,
        follow: [
          [
            "为什么宏要用 do { } while (0) 包起来？",
            "它展开后仍然是一条语句，可以安全地写在 <code>if (c) MACRO(); else ...</code> 里；如果用 <code>{ }</code> 直接包，宏末尾的分号会让 <code>else</code> 悬空或编译报错。它还能保证宏里的 <code>break</code>/<code>continue</code> 语义可控。"
          ],
          [
            "do...while 里的 continue 会跳到哪？",
            "跳到末尾的条件判断，而不是循环体开头。也就是说，<code>continue</code> 之后会先判断 <code>while</code> 条件，条件为真才进入下一轮。写重试逻辑时要注意这一点，别把“跳过本次剩余步骤”误解成“重新执行”。"
          ],
          [
            "哪种循环最适合“至少执行一次”的初始化？",
            "<code>do...while</code>。例如先发一帧命令，再根据应答决定是否重发；先读一次传感器，再判断是否有效。用 <code>while</code> 需要在循环外先做一次同样的初始化，代码会重复。"
          ]
        ]
      },
      {
        id: "C-34",
        chapter: "keywords",
        topic: "macro",
        title: "用宏交换 16 位数据的高 8 位和低 8 位，怎么写才安全？",
        diff: "中级",
        freq: "中频",
        type: "编程实现题",
        point: "位掩码与移位、宏参数的括号与副作用，以及宏和内联函数的取舍。",
        q: `<p>面试官：用 C 语言宏定义写出交换功能，把 16 位数据的高 8 位与低 8 位互换。比如 <code>0x1234</code> 变成 <code>0x3412</code>。</p>`,
        core: `<p>先分别取高字节和低字节、移位后按位或，掩码和整体都要加括号；宏参数会求值两次，最好写成 static inline 函数。</p>`,
        answer: `<p><b>基本写法：</b>分别取出高 8 位和低 8 位，移位后拼起来。掩码和移位都要加括号，常量带 <code>u</code>，最后强制转回 16 位，避免整型提升后多出高位。</p>
<pre><code>#define SWAP16(x) ((uint16_t)((((uint16_t)(x) &amp; 0xFF00u) &gt;&gt; 8) | \
                             (((uint16_t)(x) &amp; 0x00FFu) &lt;&lt; 8)))</code></pre>
<p><b>为什么这么写：</b><code>(uint16_t)(x)</code> 先把输入截到 16 位，避免传入 32 位数据时高位干扰；<code>0xFF00u</code> 取高字节，右移 8 位变到低字节；<code>0x00FFu</code> 取低字节，左移 8 位变到高字节；按位或拼起来，最后转回 <code>uint16_t</code>。</p>
<p><b>宏的副作用：</b>宏参数 <code>x</code> 在展开后出现两次，如果写成 <code>SWAP16(i++)</code>，<code>i</code> 会自增两次，属于未定义行为；如果 <code>x</code> 是一个带函数调用的表达式，也会被求值两次。这是宏的通病，加括号只能解决优先级，解决不了重复求值。</p>
<p><b>更安全的写法：</b>用 <code>static inline</code> 函数，参数只求值一次，类型也明确：</p>
<pre><code>static inline uint16_t swap16(uint16_t v)
{
    return (uint16_t)(((v &amp; 0xFF00u) &gt;&gt; 8) | ((v &amp; 0x00FFu) &lt;&lt; 8));
}</code></pre>
<p><b>注意：</b>这是“数值的高低位交换”，不是“大小端转换”。大小端说的是多字节数据在内存里的存放顺序，交换字节序可以用同样的位操作，但概念不同；如果只是想让两种端序的平台读到同样的值，应该用 <code>htons/ntohs</code> 或明确的字节序转换函数。</p>`,
        follow: [
          [
            "宏参数为什么必须加括号？",
            "宏是文本替换，不遵守运算符优先级。例如 <code>#define DOUBLE(x) x * 2</code>，<code>DOUBLE(1 + 2)</code> 会展开成 <code>1 + 2 * 2 = 5</code>，不是 6。每个参数和整个表达式都要加括号才能避免这类错误。"
          ],
          [
            "SWAP16(i++) 会发生什么？",
            "宏展开后 <code>i</code> 出现两次，<code>i++</code> 被求值两次，<code>i</code> 自增两次；更糟的是两次求值之间没有序列点，属于未定义行为。解决办法是用内联函数，或者先把 <code>i</code> 的值存到临时变量再传给宏。"
          ],
          [
            "这个宏和大小端转换是一回事吗？",
            "不是。这个宏交换的是“一个 16 位数值内部的高低字节位”，结果是数值变了；大小端转换是“同一串字节在不同内存排列下的解释”，数值本身不变。一个是位操作，一个是内存布局约定。"
          ]
        ]
      },
      {
        id: "C-35",
        chapter: "runtime",
        topic: "string",
        title: "写一个函数，把整数转换成字符串（不依赖 sprintf）",
        diff: "中级",
        freq: "中频",
        type: "编程实现题",
        point: "取模/除法、负数与 INT_MIN 边界、缓冲区长度和返回长度。",
        q: `<p>面试官：写一个函数，把给定的整数转换成字符串，不能直接用 <code>sprintf</code>。要考虑负数、0 和缓冲区长度。</p>`,
        core: `<p>先按无符号数反复除 10 取余得到逆序数字，再倒序写回；INT_MIN 要按无符号处理，缓冲区至少 12 字节。</p>`,
        answer: `<p><b>思路：</b>取绝对值后反复除以 10，把余数存到临时数组里，得到的是逆序数字；最后把负号补上，再倒序写回输出缓冲区。关键是负数不能直接取反——<code>INT_MIN</code> 取反会溢出。</p>
<pre><code>int int_to_str(int v, char *buf, int size)
{
    char tmp[12];
    int i = 0, n = 0;
    unsigned int u;
    int neg = 0;

    if (buf == NULL || size &lt; 2) return -1;

    if (v &lt; 0) {
        neg = 1;
        u = (unsigned int)(-(v + 1)) + 1u;   /* 避免 INT_MIN 取反溢出 */
    } else {
        u = (unsigned int)v;
    }

    do {
        tmp[i++] = (char)('0' + u % 10u);
        u /= 10u;
    } while (u != 0u);

    if (neg) tmp[i++] = '-';
    if (i &gt;= size) return -1;                /* 缓冲区不够 */

    while (i &gt; 0) buf[n++] = tmp[--i];
    buf[n] = '\\0';
    return n;
}</code></pre>
<p><b>边界：</b>0 也要输出 <code>"0"</code>，所以用 <code>do...while</code> 保证至少写一位；负数先转成无符号再处理，避免 <code>-INT_MIN</code> 溢出；缓冲区至少要能放下符号、数字和终止符，<code>int</code> 最大 11 个字符（含负号），所以 <code>tmp[12]</code> 够用。</p>
<p><b>返回值：</b>返回实际写入的字符数（不含 <code>'\\0'</code>），失败返回 -1，方便调用方判断。不要返回指向栈上 <code>tmp</code> 的指针，那在函数返回后就失效了。</p>
<p><b>工程替代：</b>标准库的 <code>snprintf(buf, size, "%d", v)</code> 更通用，也能处理宽度、进制等格式；自己实现的优势是可控、无动态内存、代码量小，适合 bootloader 或资源极受限的场景。</p>`,
        follow: [
          [
            "为什么 INT_MIN 不能直接取反？",
            "32 位 <code>int</code> 的范围是 -2147483648 到 2147483647，<code>-INT_MIN</code> 等于 2147483648，超出 <code>int</code> 上限，属于有符号溢出（未定义行为）。先转成 <code>unsigned int</code> 再取反，或者用 <code>-(v + 1) + 1</code> 的技巧规避。"
          ],
          [
            "怎么把整数转成十六进制字符串？",
            "把除以 10 改成除以 16，余数 0~9 映射到 <code>'0'~'9'</code>，10~15 映射到 <code>'A'~'F'</code>；同样先存逆序再倒写。要注意前导零的处理和缓冲区长度。"
          ],
          [
            "为什么 itoa 不是标准函数？",
            "<code>itoa</code> 不是 C 标准库函数，不同编译器/平台的实现和签名可能不同，移植会出问题。标准做法是用 <code>snprintf</code>，或者自己封装一个固定签名的函数。"
          ]
        ]
      },
      {
        id: "C-36",
        chapter: "runtime",
        topic: "string",
        title: "把 \"0xfe\" 这样的十六进制字符串转成十进制数，怎么写？",
        diff: "中级",
        freq: "中频",
        type: "编程实现题",
        point: "逐字符解析、大小写、0x 前缀、溢出检查，以及 strtol 的正确用法。",
        q: `<p>面试官：写一个函数，接收由十六进制数字组成的字符串，把它转换成十进制整数返回。例如传入 <code>"0xfe"</code>，得到 254。可以用库函数。</p>`,
        core: `<p>优先用 strtol(s,&end,16)，它能处理 0x 前缀、用 errno 判溢出、用 end 判非法字符；手写则要逐字符转换并提前判溢出。</p>`,
        answer: `<p><b>最简方案：</b>用 <code>strtol</code>，指定进制 16，它自动处理 <code>0x</code> 前缀、大小写和正负号，还能通过 <code>endptr</code> 和 <code>errno</code> 判断非法字符与溢出。</p>
<pre><code>#include &lt;errno.h&gt;
#include &lt;stdlib.h&gt;

long hex_to_dec(const char *s, int *ok)
{
    char *end = NULL;
    long v;

    errno = 0;
    v = strtol(s, &amp;end, 16);

    if (errno == ERANGE || end == s || *end != '\\0') {
        *ok = 0;
        return 0;
    }
    *ok = 1;
    return v;
}</code></pre>
<p><b>手写方案：</b>跳过可选的 <code>0x/0X</b>，逐字符取一位十六进制值：<code>'0'~'9'</code> 减 <code>'0'</code>，<code>'a'~'f'</code> 减 <code>'a'</code> 加 10，<code>'A'~'F'</code> 减 <code>'A'</code> 加 10；每步先判断 <code>v &gt; (UINT32_MAX - d) / 16</code> 是否溢出，再 <code>v = v * 16 + d</code>。至少要有一位数字，否则返回错误。</p>
<pre><code>int hex_to_u32(const char *s, uint32_t *out)
{
    uint32_t v = 0;
    int digits = 0;

    if (s == NULL || out == NULL) return -1;
    if (s[0] == '0' &amp;&amp; (s[1] == 'x' || s[1] == 'X')) s += 2;

    while (*s) {
        int d;
        if (*s &gt;= '0' &amp;&amp; *s &lt;= '9')      d = *s - '0';
        else if (*s &gt;= 'a' &amp;&amp; *s &lt;= 'f') d = *s - 'a' + 10;
        else if (*s &gt;= 'A' &amp;&amp; *s &lt;= 'F') d = *s - 'A' + 10;
        else return -2;

        if (v &gt; (0xFFFFFFFFu - (uint32_t)d) / 16u) return -3;
        v = v * 16u + (uint32_t)d;
        digits++;
        s++;
    }
    if (!digits) return -4;

    *out = v;
    return 0;
}</code></pre>
<p><b>常见错误：</b>用 <code>atoi</code> 只能解析十进制，传 <code>"0xfe"</code> 会得到 0；不检查 <code>endptr</code>，把 <code>"12xyz"</code> 当成合法输入；不检查溢出，超长字符串会静默回绕；空字符串没有处理。</p>
<p><b>选型：</b>能用标准库就用 <code>strtol/strtoul</code>，边界处理成熟；bootloader 或不能依赖库的场景用手写版本，但要把错误码和溢出检查写全。</p>`,
        follow: [
          [
            "strtol 怎么判断溢出和非法输入？",
            "先把 <code>errno</code> 清零，调用后如果 <code>errno == ERANGE</code> 说明溢出；<code>endptr == s</code> 说明一个字符都没解析；<code>*endptr != '\\0'</code> 说明后面还有非法字符。三个条件要一起检查。"
          ],
          [
            "为什么 atoi 不适合解析十六进制？",
            "<code>atoi</code> 等价于 <code>strtol(s, NULL, 10)</code>，只按十进制解析。输入 <code>&quot;0xfe&quot;</code> 时它读到 <code>'0'</code> 后遇到 <code>'x'</code> 就停，返回 0。解析十六进制必须显式指定进制 16。"
          ],
          [
            "怎么支持 0b 二进制前缀？",
            "标准 <code>strtol</code> 的进制参数只支持 0、2~36，但 C 标准不保证识别 <code>0b</code> 前缀。要支持二进制就自己判断 <code>0b/0B</code>，然后按 base 2 逐位解析，同样做溢出检查。"
          ]
        ]
      },
      {
        id: "C-37",
        chapter: "stmt",
        topic: "expr",
        title: "while (a != 1) 里的 a != 1 等价于哪个表达式？",
        diff: "初级",
        freq: "中频",
        type: "概念辨析题",
        point: "整数域上 != 的等价变形、逻辑与/或的区别，以及无符号/浮点的边界。",
        q: `<p>面试官：语句 <code>while (a != 1);</code> 中的表达式 <code>a != 1</code> 等价于下面哪一个？</p>
<p>A. <code>a &lt; 1 || a &gt; 1</code>　　B. <code>a &lt; 1 &amp;&amp; a &gt; 1</code>　　C. <code>a == 0</code>　　D. <code>a == 1</code></p>`,
        core: `<p>a != 1 对整数等价于 a &lt; 1 || a > 1，写成 && 会恒假；浮点还要注意 NaN 与任何值比较都为假。</p>`,
        answer: `<p><b>答案是 A。</b>对整数 <code>a</code> 来说，“不等于 1”就是“小于 1 或者大于 1”。这两个条件只要满足一个就成立，所以用逻辑或 <code>||</code> 连接。</p>
<p><b>逐项分析：</b></p>
<ul>
<li>A 正确：<code>a &lt; 1 || a &gt; 1</code> 覆盖了除 1 以外的所有整数。</li>
<li>B 错误：<code>a &lt; 1 &amp;&amp; a &gt; 1</code> 要求同时小于 1 又大于 1，对任何有序数都恒为假。</li>
<li>C 错误：<code>a == 0</code> 只是“不等于 1”的一个子集，负数和大于 1 的数也被漏掉了。</li>
<li>D 错误：<code>a == 1</code> 正好是 <code>a != 1</code> 的反面。</li>
</ul>
<p><b>排版提示：</b>题目里的 <code>a &lt; 1lla &gt; 1</code> 中的“ll”通常是 <code>||</code> 的排版错误，不是合法的 C 运算符。答题时先确认这个符号，再选 A。</p>
<p><b>边界：</b>如果 <code>a</code> 是无符号整数，<code>a &lt; 1</code> 等价于 <code>a == 0</code>，A 仍然成立；如果 <code>a</code> 是浮点数，<code>a != 1</code> 与 <code>a &lt; 1 || a &gt; 1</code> 在 NaN 上有细微差别：NaN 与任何值比较都为假，但 <code>NaN != 1</code> 为真，此时 A 会漏掉 NaN。面试时能补一句“整数域成立，浮点要小心 NaN”会加分。</p>`,
        follow: [
          [
            "为什么不能写成 a < 1 && a > 1？",
            "<code>&amp;&amp;</code> 要求两个条件同时为真，而一个数不可能同时小于 1 和大于 1，所以整个表达式恒假。逻辑或 <code>||</code> 才是“满足任一即可”。这是逻辑运算题最常见的混淆点。"
          ],
          [
            "如果 a 是无符号数，a < 1 等价于什么？",
            "等价于 <code>a == 0</code>。无符号数没有负数，最小值就是 0，所以“小于 1”只剩 0。这也是循环里写 <code>while (i &lt;= n)</code> 时，如果 <code>i</code> 是无符号且 <code>n</code> 是最大值，可能死循环的原因。"
          ],
          [
            "!(a == 1) 和 a != 1 一定等价吗？",
            "对整数和普通浮点数，值上等价；但对 NaN，<code>a == 1</code> 为假，<code>!(a == 1)</code> 为真，<code>a != 1</code> 也为真，二者仍然一致。真正的坑是比较的副作用和浮点精度，而不是逻辑取反本身。"
          ]
        ]
      }
    ]
  });

  EIK.extend("data-structure", {
    chapters: [
      {
        id: "coding",
        title: "编程题演练",
        topics: [
          { id: "math", title: "数学与递推" },
          { id: "sort-impl", title: "排序实现" }
        ]
      }
    ],

    questions: [
      {
        id: "D-18",
        chapter: "coding",
        topic: "math",
        title: "5 只猴子分香蕉，每次分成 5 份多 1 根，原来最少多少根？",
        diff: "中级",
        freq: "中频",
        type: "算法题",
        point: "不变量 N+4 = 5^5、逐次验证，以及枚举/递推两种写法。",
        q: `<p>面试官：山崖上有 5 只猴子和一堆香蕉。第 1 只猴子把香蕉平均分成 5 份，多了一根，它把多的一根扔下山崖，拿走一份；第 2 只猴子把剩下的香蕉又平均分成 5 份，又多了一根，同样扔掉一根、拿走一份；第 3、4、5 只猴子都这样做。请问原来最少有多少根香蕉？</p>`,
        core: `<p>答案是 3121：每轮剩下 4/5(N-1)，等价于 N+4 每次乘 4/5，五轮后 N+4 必须是 5^5=3125 的倍数，最小 N 就是 3121。</p>`,
        answer: `<p><b>答案是 3121 根。</b>验证一遍：</p>
<ul>
<li>第 1 只：<code>(3121 - 1) / 5 = 624</code>，拿走 624，剩 <code>3121 - 1 - 624 = 2496</code>；</li>
<li>第 2 只：<code>(2496 - 1) / 5 = 499</code>，拿走 499，剩 1996；</li>
<li>第 3 只：<code>(1995) / 5 = 399</code>，拿走 399，剩 1596；</li>
<li>第 4 只：<code>(1595) / 5 = 319</code>，拿走 319，剩 1276；</li>
<li>第 5 只：<code>(1275) / 5 = 255</code>，拿走 255，剩 1020。</li>
</ul>
<p>每一步都满足“减去 1 后能被 5 整除”，最后还剩 1020 根。</p>
<p><b>推导技巧：</b>设当前有 <code>N</code> 根，操作后剩下 <code>N' = 4/5 (N - 1)</code>。把式子改写成 <code>N' + 4 = 4/5 (N + 4)</code>，这是一个不变量：每轮操作后“香蕉数 + 4”变成原来的 4/5。做 5 轮后 <code>N5 + 4 = (4/5)^5 (N + 4)</code>。要让每轮都是整数，<code>N + 4</code> 至少要是 <code>5^5 = 3125</code> 的倍数；取最小值 <code>N + 4 = 3125</code>，得到 <code>N = 3121</code>。</p>
<p><b>编程写法：</b>最直接的是从 1 开始枚举，对每个数模拟 5 轮，发现不满足就换下一个。3121 规模很小，枚举完全够用；如果扩展成 n 只猴子，直接套公式 <code>N = 5^n - 4</code>（这里 n=5），或者用递推避免枚举。</p>
<pre><code>int monkeys(int n)
{
    int x, i;

    for (x = 1; ; x++) {
        int t = x;
        for (i = 0; i &lt; n; i++) {
            if (t % 5 != 1) break;
            t = (t - 1) / 5 * 4;
        }
        if (i == n) return x;
    }
}</code></pre>
<p><b>常见错误：</b>只保证最后一次能分，忽略了前面每一步剩下的数量也要满足条件；或者把“拿走一份”误算成“拿走剩下的 1/5”，导致递推式写错。</p>`,
        follow: [
          [
            "为什么答案不是 2496？",
            "2496 能满足前 4 轮，但第 5 轮时 <code>(1020 - 1) / 5 = 1019 / 5</code> 不是整数，第 5 只猴子无法平均分。题目要求 5 只猴子都完成同样的操作，所以必须每轮都满足。"
          ],
          [
            "如果最后还剩 1020 根，这个结果合理吗？",
            "合理。第 5 只猴子拿走 255 根后剩下 1020 根，正好是 <code>4 × 255</code>，也就是它拿走一份后剩下的 4 份。题目只要求“原来最少”，没有要求最后分完，所以 1020 可以作为剩余。"
          ],
          [
            "n 只猴子的通解是什么？",
            "在每轮“多 1 根、拿走一份”的规则下，最小解是 <code>5^n - 4</code>；更一般的解是 <code>k × 5^n - 4</code>（k 为正整数）。可以用不变量 <code>N + 4</code> 每轮乘 <code>4/5</code> 推导，注意整数条件。"
          ]
        ]
      },
      {
        id: "D-19",
        chapter: "coding",
        topic: "sort-impl",
        title: "用冒泡排序把 50 33 72 28 28 10 99 升序排列，写出完整程序",
        diff: "初级",
        freq: "中频",
        type: "编程实现题",
        point: "相邻比较与交换、提前退出优化、稳定性，以及 MCU 上小数据量的算法选择。",
        q: `<p>面试官：用冒泡排序算法把整数序列 <code>50 33 72 28 28 10 99</code> 按升序排列，写出完整程序，并说明时间复杂度和稳定性。</p>`,
        core: `<p>冒泡每轮把最大值换到末尾、下一轮少比一个；结果 10 28 28 33 50 72 99，条件写 > 才能保持两个 28 的稳定顺序。</p>`,
        answer: `<p><b>思路：</b>每一轮从前往后比较相邻两个元素，前者大于后者就交换。一轮结束后，最大的元素会“冒”到末尾；下一轮少比较一个元素。重复 n-1 轮即可。</p>
<pre><code>#include &lt;stdio.h&gt;

void bubble_sort(int *a, int n)
{
    int i, j, swapped;

    for (i = 0; i &lt; n - 1; i++) {
        swapped = 0;
        for (j = 0; j &lt; n - 1 - i; j++) {
            if (a[j] &gt; a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
                swapped = 1;
            }
        }
        if (!swapped) break;      /* 本轮无交换，已经有序 */
    }
}

int main(void)
{
    int a[] = {50, 33, 72, 28, 28, 10, 99};
    int n = (int)(sizeof(a) / sizeof(a[0]));
    int i;

    bubble_sort(a, n);

    for (i = 0; i &lt; n; i++) {
        printf("%d ", a[i]);
    }
    printf("\\n");
    return 0;
}</code></pre>
<p><b>输出：</b><code>10 28 28 33 50 72 99</code>。</p>
<p><b>复杂度：</b>最坏和平均都是 O(n²)，最好情况（已经有序且带 <code>swapped</code> 优化）是 O(n)。空间 O(1)，只需要一个临时变量。</p>
<p><b>稳定性：</b>稳定。判断条件是 <code>a[j] &gt; a[j + 1]</code>，相等时不交换，所以两个 28 的先后顺序不会变。如果把条件写成 <code>&gt;=</code>，就变成不稳定排序。</p>
<p><b>MCU 上的取舍：</b>冒泡实现简单、无递归、原地排序，但交换次数多，数据量大时不如插入排序。小数据量（几十个元素）两者都能用；如果数据基本有序，插入排序通常更快。面试时能说出“这里的 28 重复，稳定性要求决定不能用 <code>&gt;=</code>”会显得理解到位。</p>`,
        follow: [
          [
            "冒泡排序为什么是稳定的？",
            "稳定排序要求相等元素的相对顺序不变。冒泡只在“前者严格大于后者”时交换，相等时不动，所以两个 28 的前后关系保持原样。改成大于等于就会把后面的 28 换到前面，稳定性被破坏。"
          ],
          [
            "最好和最坏时间复杂度分别是多少？",
            "带 <code>swapped</code> 优化时，已经有序的数组只需一轮比较，最好 O(n)；最坏是逆序，需要约 n(n-1)/2 次比较和交换，O(n²)。平均也是 O(n²)。"
          ],
          [
            "还能怎么优化冒泡？",
            "除了 <code>swapped</code> 标志，还可以记录本轮最后一次交换的位置，下一轮只比较到这个位置，因为后面的元素已经有序。数据近乎有序时，这种优化效果明显。"
          ]
        ]
      }
    ]
  });

  EIK.extend("computer-basic", {
    questions: [
      {
        id: "B-17",
        chapter: "storage",
        topic: "cache",
        title: "读寄存器、SRAM、Flash 哪个快？为什么程序跑在 Flash 里也能很快？",
        diff: "中级",
        freq: "高频",
        type: "原理分析题",
        point: "CPU 内部寄存器、SRAM、Flash 的访问路径与等待周期，预取/Cache 的作用，以及写 Flash 的代价。",
        q: `<p>面试官：读 CPU 寄存器、读 SRAM、读 Flash，哪个最快？既然 Flash 慢，为什么程序放在 Flash 里还能跑得很快？</p>`,
        core: `<p>速度是寄存器 > SRAM > Flash；Flash 读要插等待周期，但取指顺序性强，控制器有预取和 I-Cache，顺序执行时延迟被掩盖，跳转时才明显。</p>`,
        answer: `<p><b>速度排序：寄存器 &gt; SRAM &gt; Flash。</b>寄存器在 CPU 内部，通常 1 个周期就能读写，不经过总线；SRAM 要通过系统总线访问，常见 1~3 个周期，具体看主频和总线等待周期；Flash 属于非易失存储器，读访问通常要插入等待周期（wait state），主频越高插得越多，写和擦除更慢。</p>
<p><b>为什么程序在 Flash 里也快：</b>CPU 取指具有顺序性，Flash 控制器通常带预取缓冲（prefetch）和指令缓存（I-cache/ART 加速器）。顺序执行时，下一次取指大概率已经在缓冲区里，实际等效访问次数大幅减少；只有跳转、分支、查表等随机访问才会暴露 Flash 的延迟。STM32F1 在 72MHz 下要配 2 个等待周期，但有了预取，顺序代码仍能接近零等待。</p>
<p><b>写操作的差距更大：</b>SRAM 写是纳秒级；Flash 写之前要先擦除，擦除按扇区/块进行，通常几毫秒到几十毫秒，写入按字/页也要几十微秒，而且有擦写寿命限制（常见 1 万次左右）。所以参数存储不能频繁写 Flash，要做缓冲、磨损均衡或改用 EEPROM/FRAM。</p>
<p><b>几个容易忽略的点：</b>外设寄存器虽然叫“寄存器”，但它在总线上，可能有等待周期，不是 CPU 内部寄存器；DMA 不改变存储器速度，只是把搬运工作从 CPU 手里拿走；指令 Cache 未命中时，Flash 延迟会完整暴露，实时性要求高的中断服务函数最好放在 SRAM 或 TCM（如果芯片支持）。</p>
<p><b>工程结论：</b>频繁访问的变量放 SRAM，代码和常量放 Flash，外设寄存器用 volatile 指针访问；对时间敏感的中断/控制环，可以把关键函数放到 RAM 执行，或者用缓存/预取把不确定性压下去。</p>`,
        follow: [
          [
            "Flash 的等待周期是怎么定的？",
            "由主频和 Flash 的访问时间决定。例如 STM32F1 在 48MHz 以下 1 个等待周期、72MHz 需要 2 个；具体查芯片手册的 flash latency 表。配少了会取指错误，配多了会白白降低性能。"
          ],
          [
            "为什么中断向量表可以放到 SRAM？",
            "Cortex-M 支持通过 VTOR 寄存器重定位向量表。把向量表放到 SRAM 可以减少中断响应时的 Flash 等待，也方便 bootloader/APP 切换；但 SRAM 掉电丢失，启动时要重新拷贝并设置 VTOR。"
          ],
          [
            "DMA 能让 SRAM 访问变快吗？",
            "不能。DMA 只是让外设和内存之间直接搬运，不占用 CPU 指令周期，但内存本身的访问速度不变。如果 DMA 和 CPU 争用同一条总线，还可能互相拖慢，需要合理分配总线带宽。"
          ]
        ]
      }
    ]
  });

  EIK.extend("software-architecture", {
    questions: [
      {
        id: "X-17",
        chapter: "quality",
        topic: "port",
        title: "你理解的高质量 C 代码是什么样的？",
        diff: "中级",
        freq: "中频",
        type: "工程规范题",
        point: "正确性、可读性、可维护性、可测试性、资源可控与一致性，以及落地手段。",
        q: `<p>面试官：你理解的高质量 C 代码是什么样的？如果让你给一个刚入门的同事提三条最重要的建议，你会说什么？</p>`,
        core: `<p>代码质量先看正确性：无未定义行为、边界和错误路径都处理；再看可读性和模块边界；最后看资源可控、可测试，优化放在测量之后。</p>`,
        answer: `<p><b>第一是正确性。</b>没有未定义行为，边界检查完整，错误路径有处理。具体包括：数组下标和长度校验、空指针检查、整数溢出、对齐和端序、<code>volatile</code> 的使用、资源申请与释放配对。正确性不是“编译通过、跑一次没崩”，而是“在最坏输入和异常路径下也可预期”。</p>
<p><b>第二是可读性和可维护性。</b>命名能表达用途，函数短小、单一职责，模块边界清晰；驱动层不把硬件细节泄漏给应用层；接口用不透明指针或句柄，结构体不随意暴露；错误码统一，日志分级。代码是写给人看的，尤其在人员流动大的项目里，可读性直接决定维护成本。</p>
<p><b>第三是资源可控和可测试。</b>嵌入式没有无限的 RAM 和 Flash：尽量静态分配，栈大小按最坏调用深度估算，避免递归和大的局部数组；关键模块能在 PC 上做单元测试，硬件相关部分抽象成可替换的接口；能用静态分析（MISRA、<code>-Wall -Wextra</code>、Coverity）就用，把问题在编译期挡住。</p>
<p><b>三条建议：</b>一是“先想清楚数据和所有权，再写代码”，谁分配、谁释放、谁修改要明确；二是“让错误尽早暴露”，断言、参数检查、编译告警全开，不要靠运气；三是“保持一致性”，命名、缩进、错误处理风格统一，比追求某种“最优风格”更重要。</p>
<p><b>关于性能：</b>高质量不等于处处极致优化。先保证正确和清晰，再用测量定位热点，最后才优化。没有测量的优化往往只是把代码变难懂。</p>`,
        follow: [
          [
            "代码规范里最重要的一条是什么？",
            "一致性。规范本身可以商量，但团队内必须统一：命名、错误码、日志、缩进、注释风格。不一致的代码会让 review 和排查成本成倍增加。其次才是具体规则是否“先进”。"
          ],
          [
            "怎么把高质量落地，而不是停留在口号？",
            "三件事：编译告警当错误处理、代码评审 checklist、关键模块单元测试；再加静态分析和 CI。规范要短、可执行，评审要看真正容易出问题的地方（边界、资源、并发、错误路径），而不是纠结空格。"
          ],
          [
            "MISRA-C 一定要遵守吗？",
            "看产品领域和客户要求。汽车、医疗、工业安全相关项目通常要求 MISRA 或类似规范；消费类产品可以按风险裁剪。建议把规则分为“必须”“建议”“豁免”，豁免要记录理由，而不是一刀切。"
          ]
        ]
      }
    ]
  });
})();
