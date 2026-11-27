/* ============================================================
   registry.js — 14 个技术模块的元信息（顺序即站点展示顺序）
   新增模块：在此追加一条，并在 data/ 下新建对应题库文件
   ============================================================ */
(function () {
  "use strict";

  var MODULES = [
    {
      id: "c-language",
      num: "01",
      name: "C语言基础与进阶",
      en: "C Language Fundamentals",
      icon: "code",
      desc: "嵌入式开发的地基。从关键字语义、指针与内存模型，到编译链接与未定义行为，面试中出现频率最高。",
      tags: ["指针与数组", "const/static/volatile", "内存对齐", "编译链接"]
    },
    {
      id: "data-structure",
      num: "02",
      name: "数据结构与算法",
      en: "Data Structures & Algorithms",
      icon: "list",
      desc: "在 KB 级 RAM 与毫秒级实时约束下选择合适的数据结构，环形缓冲、循环队列与链表的工程取舍。",
      tags: ["链表", "循环队列", "环形缓冲区", "复杂度"]
    },
    {
      id: "computer-basic",
      num: "03",
      name: "计算机组成原理",
      en: "Computer Organization",
      icon: "cpu",
      desc: "CPU 如何取指执行、存储层次如何组织、中断与 DMA 如何搬运数据，是理解一切外设行为的前提。",
      tags: ["指令执行", "存储层次", "Cache", "中断与DMA"]
    },
    {
      id: "mcu-arm",
      num: "04",
      name: "MCU与ARM架构",
      en: "MCU & ARM Architecture",
      icon: "chip",
      desc: "Cortex-M 内核的寄存器、双堆栈、异常模型、NVIC 与启动流程，是从写代码走向懂芯片的分水岭。",
      tags: ["Cortex-M", "MSP/PSP", "NVIC", "启动流程"]
    },
    {
      id: "stm32-gd32",
      num: "05",
      name: "STM32/GD32单片机",
      en: "STM32 / GD32 MCU",
      icon: "chip",
      desc: "以 STM32 与 GD32 为主线，覆盖时钟树、GPIO、定时器、ADC/DMA、看门狗与固件库选型。",
      tags: ["时钟树", "GPIO模式", "定时器PWM", "ADC/DMA"]
    },
    {
      id: "peripheral-driver",
      num: "06",
      name: "嵌入式外设与驱动开发",
      en: "Peripherals & Drivers",
      icon: "layers",
      desc: "按键消抖、OLED 驱动、传感器采集、编码器测速，以及驱动层与应用层如何干净地分离。",
      tags: ["按键消抖", "OLED", "传感器采集", "驱动分层"]
    },
    {
      id: "communication",
      num: "07",
      name: "嵌入式通信技术",
      en: "Embedded Communication",
      icon: "wifi",
      desc: "UART/I2C/SPI/CAN 的时序与坑，蓝牙/Wi-Fi/MQTT 的选型，以及自定义协议帧与状态机解析。",
      tags: ["UART/I2C/SPI", "CAN", "MQTT", "协议解析"]
    },
    {
      id: "rtos-freertos",
      num: "08",
      name: "RTOS与FreeRTOS",
      en: "RTOS & FreeRTOS",
      icon: "clock",
      desc: "任务状态机、PendSV 上下文切换、优先级反转、信号量与队列，FreeRTOS 面试的核心战场。",
      tags: ["任务调度", "信号量/互斥锁", "优先级反转", "内存管理"]
    },
    {
      id: "embedded-linux",
      num: "09",
      name: "Linux嵌入式基础",
      en: "Embedded Linux",
      icon: "terminal",
      desc: "内核与用户空间、系统调用、字符设备驱动、设备树、交叉编译与 U-Boot 启动链路。",
      tags: ["系统调用", "字符设备", "设备树", "启动流程"]
    },
    {
      id: "software-architecture",
      num: "10",
      name: "嵌入式软件架构",
      en: "Software Architecture",
      icon: "grid",
      desc: "分层与解耦、状态机与事件驱动、接口抽象与可移植性，决定代码能不能活过三年。",
      tags: ["分层架构", "状态机", "模块解耦", "可移植性"]
    },
    {
      id: "memory-management",
      num: "11",
      name: "内存管理与底层原理",
      en: "Memory & Low-level",
      icon: "memory",
      desc: "内存布局、链接脚本、栈溢出、向量表重定位与 Cache 一致性，定位疑难问题的最后一公里。",
      tags: ["内存布局", "链接脚本", "栈溢出", "Cache一致性"]
    },
    {
      id: "debugging",
      num: "12",
      name: "调试与故障排查",
      en: "Debugging & Troubleshooting",
      icon: "bug",
      desc: "上电不跑、HardFault、串口乱码、I2C 卡死——把“玄学问题”拆成可验证的假设与步骤。",
      tags: ["HardFault", "跑飞复位", "通信异常", "调试工具"]
    },
    {
      id: "low-power",
      num: "13",
      name: "嵌入式低功耗设计",
      en: "Low Power Design",
      icon: "battery",
      desc: "从动态/静态功耗到睡眠、停止、待机模式，再到唤醒源设计与电池寿命估算。",
      tags: ["功耗构成", "低功耗模式", "唤醒机制", "功耗测量"]
    },
    {
      id: "project-practice",
      num: "14",
      name: "项目实战与综合面试",
      en: "Project Practice",
      icon: "target",
      desc: "架构设计、技术选型、OTA 与参数存储，以及如何把简历项目讲成面试官愿意追问的故事。",
      tags: ["架构设计", "OTA升级", "参数存储", "项目表达"]
    },
    {
      id: "hardware-circuit",
      num: "15",
      name: "硬件电路与板级设计",
      en: "Hardware & Board Design",
      icon: "cpu",
      desc: "上下拉与去耦、三极管/MOS 开关、电平转换、晶振与 ADC 前端，以及原理图识读和 ESD/EMC 防护。",
      tags: ["上下拉/开漏", "去耦", "电平转换", "ADC前端"]
    },
    {
      id: "motor-control",
      num: "16",
      name: "电机控制与 PID",
      en: "Motor Control & PID",
      icon: "target",
      desc: "位置式与增量式 PID、抗积分饱和、死区与互补 PWM、H 桥、编码器闭环与舵机控制。",
      tags: ["PID整定", "抗饱和", "死区", "H桥/编码器"]
    },
    {
      id: "storage-filesystem",
      num: "17",
      name: "Flash 存储与文件系统",
      en: "Storage & File Systems",
      icon: "memory",
      desc: "NOR/NAND 差异、擦写寿命与写放大、磨损均衡、EEPROM 模拟，以及 FatFs/LittleFS/SPIFFS 选型与分区。",
      tags: ["NOR/NAND", "磨损均衡", "LittleFS", "分区设计"]
    },
    {
      id: "usb-display-bus",
      num: "18",
      name: "USB、显示与外扩总线",
      en: "USB, Display & Buses",
      icon: "layers",
      desc: "USB 枚举与设备类、LVGL 移植与撕裂、FMC 时序计算、SDIO+FatFs，以及 LwIP 内存与 API 选型。",
      tags: ["USB枚举", "LVGL", "FMC时序", "LwIP"]
    },
    {
      id: "firmware-security",
      num: "19",
      name: "固件安全与防抄板",
      en: "Firmware Security",
      icon: "shield",
      desc: "固件签名与加密、密钥存放、读保护与 UID 绑定、Secure Boot 信任链、OTA 防回滚与 TrustZone/MPU。",
      tags: ["签名/加密", "读保护", "Secure Boot", "防回滚"]
    },
    {
      id: "linux-app",
      num: "20",
      name: "Linux 应用编程与调优",
      en: "Linux Application",
      icon: "terminal",
      desc: "socket 与 epoll、pthread 同步、fork 与守护进程、TCP 协议、常用诊断命令、库与 C 库、gdb/core 与虚拟内存。",
      tags: ["socket/epoll", "pthread", "TCP", "gdb/虚拟内存"]
    }
  ];

  MODULES.forEach(function (m) {
    EIK.meta(m);
  });
})();
