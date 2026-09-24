<div align="center">

# sdkvm

**简单、跨平台的多语言 SDK 版本管理器**

[![npm version](https://img.shields.io/npm/v/sdkvm)](https://www.npmjs.com/package/sdkvm)
[![CI](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml/badge.svg)](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/sdkvm)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.15-green)](./package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#系统要求)

像 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 一样管理 **Java JDK**、**Go 工具链** 与 **Flutter SDK**。

</div>

---

## 目录

- [简介](#简介)
- [从 easy-jvm 升级](#从-easy-jvm-升级)
- [系统要求](#系统要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [命令参考](#命令参考)
- [版本语法](#版本语法)
- [工作原理](#工作原理)
- [配置](#配置)
- [镜像加速（国内用户）](#镜像加速国内用户)
- [安全性](#安全性)
- [常见问题](#常见问题)
- [卸载](#卸载)
- [开发](#开发)
- [许可证](#许可证)

## 简介

`sdkvm` 是一个用 Node.js 编写的命令行工具，提供多种语言 SDK 的**安装、切换、卸载**能力：

- **Java**：内置 [Adoptium Temurin](https://adoptium.net/)、[Azul Zulu](https://www.azul.com/downloads/)、[Amazon Corretto](https://aws.amazon.com/corretto/) 三个主流发行版，支持 `lts` 语义（当前 LTS：8 / 11 / 17 / 21 / 25）
- **Go**：官方 [go.dev](https://go.dev/dl/) 源，全历史稳定版可装
- **Flutter**：官方发布清单（stable / beta 通道），macOS 双架构、Linux / Windows x64
- **多平台**：macOS（Apple Silicon / Intel）、Linux、Windows 10+
- **开箱即用**：仅依赖 Node.js 与系统自带的 tar / PowerShell，各 SDK 完全隔离，`JAVA_HOME` / `GOROOT` / `FLUTTER_ROOT` 并存互不干扰
- **秒级切换**：`use` 只更新一个符号链接（Windows 为 junction），不搬移文件、不改全局环境
- **官方源直连**：下载地址一律经官方 API 解析；Go 与 Flutter 的官方清单内联 SHA-256，**强制校验**，其余源尽力校验
- **镜像支持**：Temurin、Go、Flutter 均可配置国内镜像加速下载（校验和仍取自官方，镜像文件被交叉验证）
- **可扩展**：SDK 类型抽象（`src/sdk/`）之上新增语言只需实现一个厂商模块（见[开发](#开发)）

## 从 easy-jvm 升级

`sdkvm` 是 `easy-jvm` 的更名升级版（原工具只管理 JDK）。已装用户：

```sh
npm uninstall -g easy-jvm    # 先卸载旧包，避免残留的 jvm 命令重建空 ~/.jvm
npm install -g sdkvm
```

首次运行任意命令时，`~/.jvm/` 会**自动整体迁移**为 `~/.sdkvm/`：

- 迁移是一次**原子目录改名**（同卷 `rename`，无中间失败窗口），已装 JDK 原样保留，无需重装
- 随后自动改写：`current` 链接（更名为 `current-java`，绝对目标同步指向新路径）、Windows 注册表 `JAVA_HOME` 字面值、shell 配置文件中的旧 `# >>> jvm init >>>` 标记块
- 幂等：迁移过一次后再运行不会重复动作；`~/.sdkvm/` 已存在时不自动合并，仅提示手动处理
- 旧的 `JVM_HOME` / `JVM_MIRROR` / `JVM_QUIET` 环境变量**永久作为别名**继续识别

## 系统要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | >= 18.15 | 唯一运行时依赖（CLI 本身另需 commander / picocolors，随包安装） |
| 操作系统 | — | macOS（Apple Silicon / Intel）/ 主流 Linux 发行版 / Windows 10+ |
| 解压工具 | 系统自带 | macOS/Linux 用 `tar`；Windows 用系统自带 bsdtar，缺失时回退 PowerShell `Expand-Archive` |

> **平台差异须知**
>
> - Linux 解压 Flutter 归档（`.tar.xz`）需系统装有 `xz`（`xz-utils`）；主流发行版默认自带
> - Flutter 官方在 Linux / Windows 只发布 **x64** 归档；ARM Linux / ARM Windows 无法安装（macOS 两种架构均支持）
> - `flutter` 命令首次运行会做内部初始化（构建 cache），耗时较久属正常现象

## 安装

```sh
npm install -g sdkvm
```

安装完成后即可使用 `sdkvm` 命令。验证：

```console
$ sdkvm version
1.0.0
```

## 快速开始

```sh
# Java（裸命令 = java，与 easy-jvm 时代用法完全一致）
sdkvm install lts                 # 安装最新 LTS（当前为 Temurin 25）
sdkvm use 25                      # 切换到该版本
java -version                     # 验证生效（可能需要重开终端）

# Go（go 子命令组）
sdkvm go install 1.24             # 安装 Go 1.24 线最新补丁版
sdkvm go use 1.24                 # 切换（更新 GOROOT / PATH）
go version

# Flutter（flutter 子命令组）
sdkvm flutter install 3.47        # 安装 3.47 线最新补丁版（stable 通道）
sdkvm flutter use 3.47            # 切换（更新 FLUTTER_ROOT / PATH）
flutter --version

# 混合使用
sdkvm current                     # 同时显示 java / go / flutter 的当前版本
sdkvm java install 21 --vendor zulu
sdkvm java use zulu-21
sdkvm ls                          # 已装的 Java
sdkvm go ls                       # 已装的 Go
sdkvm flutter ls                  # 已装的 Flutter
sdkvm uninstall zulu-21
sdkvm go uninstall 1.24
```

## 命令参考

Java 用裸命令（`sdkvm install …`）或 `sdkvm java …` 子命令组，两者完全等价；Go / Flutter 用 `sdkvm go …` / `sdkvm flutter …`。

### 命令速查

| 命令 | 作用 |
|---|---|
| `sdkvm install <version>` | 安装 Java 版本（= `sdkvm java install`） |
| `sdkvm use <version>` | 切换当前 Java 版本 |
| `sdkvm ls` / `sdkvm ls -r` | 列出已装版本 / 可安装版本线 |
| `sdkvm current` | 显示全部 SDK 类型的当前版本 |
| `sdkvm uninstall <version>` | 卸载一个版本 |
| `sdkvm mirror show·set·unset` | 管理下载镜像 |
| `sdkvm java · go · flutter …` | 各 SDK 类型的完整命令组 |
| `sdkvm version` | 打印 CLI 版本号 |

各类型的版本语法速查：

```sh
sdkvm java    install lts | 21 | 21.0.5 | 21.0.5+11 | zulu-21
sdkvm go      install latest | 1.24 | 1.24.5 | golang-1.24
sdkvm flutter install latest | 3.47 | 3.47.5 | 3.49.0-0.1.pre | flutter-3.47
```

### `sdkvm install <version>`

解析 → 下载（实时进度、边下边算 sha256）→ 校验 → 解压到临时目录 → 原子落位：

```console
$ sdkvm install 21
sdkvm resolving Adoptium Temurin 21 for mac/aarch64 ...
sdkvm downloading https://github.com/adoptium/temurin21-binaries/releases/...
↓ Temurin 21.0.12.1  160.2MB / 200.4MB
sdkvm installed Temurin 21.0.12.1 → ~/.sdkvm/jdks/temurin-21.0.12.1
sdkvm switch to it: sdkvm use 21
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 指定发行版：`temurin`（默认）/ `zulu` / `corretto`；Go 只有 `golang`，Flutter 只有 `flutter` |
| `--force` | 已安装时移除重装（默认跳过已装版本） |

失败行为：校验不过 / 解压异常会自动清理半成品目录与缓存，不留脏状态；下载采用 60 秒**空闲超时**（60s 无数据才中止，大文件不会被总时长掐断）。

### `sdkvm use <version>`

切换当前版本：更新 `current` 链接与 `JAVA_HOME`（或 `GOROOT` / `FLUTTER_ROOT`）/ `PATH`。版本语法与 `install` 相同，在**已安装**范围内匹配：

```sh
sdkvm use 21                      # 切换到已安装的 21 最新补丁版
sdkvm use temurin-21.0.5+11       # 切换到精确版本
sdkvm go use 1.24.5               # Go 精确版本
sdkvm flutter use 3.47.5          # Flutter 精确版本
```

> macOS / Linux 下首次 `use` 会在 shell 配置文件中追加初始化代码块，**重开终端（或 `source ~/.zshrc`）后生效**；之后每次切换只动链接，新终端即时生效。IDE（IntelliJ / VS Code 等）需要重启才会读到新的环境变量。详见[切换机制](#切换机制)。

### `sdkvm ls` / `sdkvm list`

列出已安装的版本，`→` 标记当前版本：

```console
$ sdkvm go ls
→ golang-1.24.5
  golang-1.23.9
```

### `sdkvm ls -r` / `sdkvm ls --remote`

并行拉取该类型全部厂商的可安装版本线。每行名称带厂商前缀，**可直接复制给 `install`**（默认展示最近 12 条线，更老的版本可按精确名称安装）：

```console
$ sdkvm flutter ls -r

# Flutter (official)
  flutter-3.47  latest: flutter-3.47.5
  flutter-3.44  latest: flutter-3.44.9
  ...

# install with: sdkvm flutter install <name>
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 只列出指定厂商 |

### `sdkvm current`

显示全部 SDK 类型的当前版本及其环境变量路径（未安装的类型不显示）：

```console
$ sdkvm current
java: temurin-21.0.12.1
  JAVA_HOME → ~/.sdkvm/jdks/temurin-21.0.12.1
go: golang-1.24.5
  GOROOT → ~/.sdkvm/gos/golang-1.24.5
flutter: flutter-3.47.5
  FLUTTER_ROOT → ~/.sdkvm/flutters/flutter-3.47.5
```

### `sdkvm uninstall <version>`

卸载已安装的版本，语法与 `use` 相同。卸载当前版本时会自动清空对应 `current` 链接并提示另选版本；不影响其他已装版本。

### `sdkvm mirror <action> [vendor] [url]`

管理下载镜像，详见[镜像加速](#镜像加速国内用户)。Java / Go / Flutter 分别用 `sdkvm mirror …`、`sdkvm go mirror …`、`sdkvm flutter mirror …`：

| Action | 说明 |
|---|---|
| `show` | 查看当前镜像配置（含推荐值） |
| `set <vendor> <url>` | 设置镜像，写入配置文件 |
| `unset <vendor>` | 恢复官方源 |

### `sdkvm version`

打印 CLI 版本号（等同于 `sdkvm --version`）。

## 版本语法

`install` / `use` / `uninstall` 共用版本语法，按 SDK 类型区分：

| 语法 | Java 含义 | Go 含义 | Flutter 含义 | 示例 |
|---|---|---|---|---|
| `<major>` | 该大版本最新补丁版（`21`） | — | —（裸大版本拒绝，建议 `latest`） | `21` |
| `<major.minor>` | — | 该 minor 线最新补丁版 | 该 minor 线最新补丁版（stable 通道） | `1.24`、`3.47` |
| `lts` | 最新 LTS 大版本 | —（无 LTS） | —（无 LTS） | `lts` |
| `latest` | — | 全局最新稳定版 | stable 通道最新（不追 beta） | `latest` |
| `<full-version>` | 精确版本 / 前缀匹配 | 精确版本 | 精确版本，可带 prerelease 段装 beta | `21.0.5+11`、`1.24.5`、`3.49.0-0.1.pre` |
| `<vendor>-…` | 加厂商前缀限定发行版 | 同左 | 同左 | `zulu-21`、`golang-1.24`、`flutter-3.47` |

匹配规则：

- `21` 匹配该大版本下**已安装/可安装的最新补丁版**；`1.24`、`3.47` 同理匹配该线最新补丁版
- Java 的 `21.0.5` 做前缀匹配，可命中 `21.0.5+11`；Go / Flutter 的精确版本为全串匹配
- Flutter 的 `latest` / `3.47` 只在 **stable** 通道解析；装 beta 需给完整 prerelease 版本号（如 `3.49.0-0.1.pre`）
- Java 的 `lts` 当前指 8 / 11 / 17 / 21 / 25（与 Adoptium LTS 列表对齐）
- 不带厂商前缀时使用默认发行版（仅 Java 可配，见[配置文件](#配置文件)；Go / Flutter 各只有一个官方源）

## 工作原理

### 目录布局

所有数据位于 `~/.sdkvm/`（Windows 为 `%USERPROFILE%\.sdkvm`；可用 `SDKVM_HOME` 覆盖，旧名 `JVM_HOME` 仍识别）：

```
~/.sdkvm/
├── jdks/                    # Java：<vendor>-<version>，如 temurin-21.0.12.1
├── gos/                     # Go：golang-<version>，如 golang-1.24.5
├── flutters/                # Flutter：flutter-<version>，如 flutter-3.47.5
├── current-java             # 指向当前 JAVA_HOME 的链接（Windows 上为 junction）
├── current-go               # 指向当前 GOROOT 的链接
├── current-flutter          # 指向当前 FLUTTER_ROOT 的链接
├── config.json              # CLI 配置（见「配置」）
├── cache/                   # 下载中转（安装成功后自动清理，不做长期缓存）
└── tmp/                     # 解压临时目录（同样自动清理）
```

各版本的磁盘量级（解压后，供规划空间参考）：Java 每版本约 300 MB，Go 约 250 MB，Flutter 数 GB（压缩包本身 1–2.2 GB）。

### 切换机制

**macOS / Linux**

`current-java` / `current-go` / `current-flutter` 是指向当前版本目录的符号链接。首次 `use` 会在 shell 配置文件（zsh → `~/.zshrc`；bash → `~/.bash_profile` / `~/.bashrc`）追加一段带标记的初始化代码块，三种 SDK 各一块、互不干扰：

```sh
# >>> sdkvm java init >>>
export JAVA_HOME="$HOME/.sdkvm/current-java"
case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac
# <<< sdkvm java init <<<

# >>> sdkvm go init >>>
export GOROOT="$HOME/.sdkvm/current-go"
case ":$PATH:" in *":$GOROOT/bin:"*) ;; *) export PATH="$GOROOT/bin:$PATH";; esac
# <<< sdkvm go init <<<

# >>> sdkvm flutter init >>>
export FLUTTER_ROOT="$HOME/.sdkvm/current-flutter"
case ":$PATH:" in *":$FLUTTER_ROOT/bin:"*) ;; *) export PATH="$FLUTTER_ROOT/bin:$PATH";; esac
# <<< sdkvm flutter init <<<
```

环境变量指向**链接**而非具体版本目录，因此之后每次 `use` 只改链接指向，已开的终端在下一次 `source` rc 或新开终端时读到新值。

**Windows**

`%USERPROFILE%\.sdkvm\current-java` / `current-go` / `current-flutter` 为 junction；`use` 写入用户级 `JAVA_HOME` / `GOROOT` / `FLUTTER_ROOT`，并把 `%JAVA_HOME%\bin`、`%GOROOT%\bin`、`%FLUTTER_ROOT%\bin` 追加到用户 PATH。通过注册表 API 操作并原样保留 `REG_EXPAND_SZ` 类型与 `%VAR%` 引用，避免 `setx` 的 1024 字符截断问题。需要**重开终端**（或重启 IDE）生效。

### 数据迁移

首次运行时检测旧版 `~/.jvm/`：存在且 `~/.sdkvm/` 尚未创建时，执行一次原子目录改名，随后重写 `current` 链接（更名为 `current-java`，绝对目标同步改指新路径）、Windows 注册表 `JAVA_HOME` 字面值、shell 配置文件中的旧标记块。`~/.sdkvm/` 已存在时**不自动合并**，仅提示手动处理。详见[从 easy-jvm 升级](#从-easy-jvm-升级)。

## 配置

### 配置文件

`~/.sdkvm/config.json`：

```json
{
  "version": 1,
  "defaultVendor": "temurin",
  "mirror": {
    "temurin": "https://mirrors.nju.edu.cn/adoptium",
    "golang": "https://golang.google.cn/dl",
    "flutter": "https://mirror.nju.edu.cn/flutter/flutter_infra_release"
  }
}
```

| 字段 | 说明 | 默认值 |
|---|---|---|
| `version` | 配置 schema 版本 | `1` |
| `defaultVendor` | Java 不带厂商前缀时的默认发行版 | `"temurin"` |
| `mirror` | 各厂商的镜像 URL（键为全局唯一的厂商 id，跨 SDK 类型） | `{}`（官方源） |

配置文件损坏时自动备份为 `config.json.bak` 并回退默认值。

### 环境变量

| 变量 | 旧名别名 | 说明 |
|---|---|---|
| `SDKVM_HOME` | `JVM_HOME` | 覆盖数据根目录（默认 `~/.sdkvm`） |
| `SDKVM_MIRROR` | `JVM_MIRROR` | 临时指定下载镜像，**优先级高于配置文件**（不写入） |
| `SDKVM_QUIET` | `JVM_QUIET` | 设为非空时抑制 info/warn 日志输出 |

镜像解析优先级：`SDKVM_MIRROR` 环境变量 > `config.mirror[<vendor>]` > 官方源。

## 镜像加速（国内用户）

Temurin 默认从 GitHub 下载、Go 默认从 go.dev 下载、Flutter 默认从 storage.googleapis.com 下载，国内网络建议切换到镜像：

```sh
sdkvm mirror set temurin https://mirrors.nju.edu.cn/adoptium                              # Java
sdkvm go mirror set golang https://golang.google.cn/dl                                    # Go
sdkvm flutter mirror set flutter https://mirror.nju.edu.cn/flutter/flutter_infra_release # Flutter
```

也可以用环境变量临时指定（不写入配置）：

```sh
SDKVM_MIRROR=https://golang.google.cn/dl sdkvm go install 1.24
```

> 镜像仅替换 tarball 下载地址，版本元数据与校验和**始终走官方 API**——即使文件来自镜像，sha256 仍与官方清单核对。Go 镜像根 URL 兼容 `https://golang.google.cn/dl`（官方中国站）与 `https://mirrors.aliyun.com/golang`（文件名直接拼接）；Flutter 镜像为桶前缀替换（已验证 [NJU](https://mirror.nju.edu.cn/flutter/flutter_infra_release)；`storage.flutter-io.cn` 不含发布清单，勿用）；Zulu 与 Corretto 由官方 CDN 直接分发，暂不支持镜像。

## 安全性

- 下载地址通过**官方 API** 解析（Adoptium API / Azul Metadata API / Corretto 官方分发 / go.dev/dl JSON API / Flutter releases 清单），不做任何搜索页抓取
- tarball 做逐块流式 **SHA-256 校验**：Go 与 Flutter 的校验和内联于官方 API，**强制校验**；Java 各源尽力校验，校验源不可达时警告放行
- 解压前校验归档结构（单根目录、可执行文件存在），且只解压到全新空目录，防止路径穿越
- 安装全程持有文件锁（`~/.sdkvm/.lock`），避免并发安装互相踩踏

## 常见问题

**Q：`use` 之后 `java -version` 还是旧版本？**
rc 代码块只在**新终端**（或 `source ~/.zshrc`）时生效；IDE 需重启。可先 `sdkvm current` 确认链接已切换，再重开终端。Windows 同理：注册表已更新，但已开的终端读不到新值。

**Q：我用 fish / nushell，rc 探测不到怎么办？**
当前自动写入仅支持 zsh / bash。手工把[切换机制](#切换机制)中的代码块翻译到你的 shell 即可（fish 语法：`set -gx JAVA_HOME $HOME/.sdkvm/current-java; fish_add_path $JAVA_HOME/bin`）。

**Q：Flutter 下载太慢或中断？**
配置镜像（见上文 NJU 命令）。sdkvm 的下载超时是「60 秒无数据」而非总时长，稳定慢速不会中断；真中断直接重跑 `install`，无残留状态。

**Q：怎么安装 Flutter beta？**
给完整 prerelease 版本号：`sdkvm flutter install 3.49.0-0.1.pre`。`latest` 与版本线（`3.47`）只解析 stable 通道。

**Q：公司网络走代理，能用吗？**
当前版本未内置 HTTP 代理支持（Node fetch 不读 `HTTPS_PROXY`）。可用系统级透明代理，或关注后续版本。

**Q：装回 easy-jvm 会怎样？**
easy-jvm 使用独立的 `~/.jvm`，二者互不破坏，但版本各装各的。建议只用 sdkvm（`~/.jvm` 若再出现，检查是否残留旧全局包）。

**Q：sdkvm 自身怎么升级？**
`sdkvm` 由 npm 分发：`npm update -g sdkvm`。数据目录（`~/.sdkvm`）与 CLI 升级无关。

**Q：CI / 多用户环境想隔离数据？**
设 `SDKVM_HOME=/path/to/dir` 即可整体重定向（安装、链接、配置全部跟随）。

## 卸载

```sh
npm uninstall -g sdkvm
rm -rf ~/.sdkvm       # 删除 SDK 数据目录（会删掉所有已装版本，先确认）
```

并删除 shell 配置文件中 `>>> sdkvm java init >>>`、`>>> sdkvm go init >>>`、`>>> sdkvm flutter init >>>` 各自到 `<<< … <<<` 之间的标记块。

Windows 用户额外需要：在系统设置中删除 `JAVA_HOME` / `GOROOT` / `FLUTTER_ROOT`，并从用户 PATH 移除 `%JAVA_HOME%\bin`、`%GOROOT%\bin`、`%FLUTTER_ROOT%\bin`。

## 开发

```sh
git clone https://github.com/QInJ1995/sdkvm.git && cd sdkvm
npm install

npm test            # vitest 单元 + 集成测试
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/index.js（本地试用：node dist/index.js …）
```

项目结构：

```
src/
├── cli/       # 命令实现（install / use / ls / uninstall / mirror …）
├── core/      # 版本解析、安装注册表、配置、迁移、文件锁
├── sdk/       # SDK 类型描述（java / go / flutter：目录名、环境变量、版本语法）
├── vendor/    # 发行版适配（temurin / zulu / corretto / golang / flutter）+ 镜像改写
├── fs/        # 下载 / 校验 / 解压 / 归一化 / 链接
├── shell/     # rc 探测与写入、Windows 注册表环境变量
├── net/       # fetch 封装（重试、超时）、流式下载
└── ui/        # 日志、进度条
```

新增一种语言 SDK：在 `src/vendor/` 实现一个厂商模块（`listMajors` + `resolve` 两个方法），在 `src/sdk/` 加一个类型描述（安装目录名、current 链接名、环境变量、版本语法、二进制探测路径），注册进 `sdk/index.ts` 后即获得完整的 install / use / ls / uninstall / mirror 命令组——CLI、切换机制、rc / 注册表写入全部自动泛化。

## 许可证

[MIT](./LICENSE) © QINJIN
