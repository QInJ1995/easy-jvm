<div align="center">

# sdkvm

**简单、跨平台的多语言 SDK 版本管理器**

[![npm version](https://img.shields.io/npm/v/sdkvm)](https://www.npmjs.com/package/sdkvm)
[![CI](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml/badge.svg)](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/sdkvm)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.15-green)](./package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#系统要求)

中文 | [English](./README.en.md)

管理 **Java JDK**、**Go 工具链**、**Flutter SDK** 与 **Node.js 运行时**。

</div>

## 目录

- [简介](#简介)
- [系统要求](#系统要求)
- [安装](#安装)
- [升级](#升级)
- [快速开始](#快速开始)
- [命令参考](#命令参考)
- [版本语法](#版本语法)
- [工作原理](#工作原理)
- [配置](#配置)
- [镜像加速](#镜像加速)
- [安全性](#安全性)
- [常见问题](#常见问题)
- [卸载](#卸载)
- [开发](#开发)
- [许可证](#许可证)

## 简介

`sdkvm` 用 Node.js 编写，负责多种语言 SDK 的安装、切换和卸载。

| SDK | 来源 | 说明 |
|---|---|---|
| Java | [Temurin](https://adoptium.net/)、[Zulu](https://www.azul.com/downloads/)、[Corretto](https://aws.amazon.com/corretto/) | `lts` 当前为 8 / 11 / 17 / 21 / 25 |
| Go | [go.dev](https://go.dev/dl/) | 全历史稳定版 |
| Flutter | 官方发布清单 | stable / beta；macOS 双架构，Linux / Windows 仅 x64 |
| Node.js | [nodejs.org/dist](https://nodejs.org/dist) | `lts`（当前 24 Krypton）/ `latest` / 按 major 线；npm 随版本切换 |

行为约定：

- 各 SDK 目录隔离，`JAVA_HOME`、`GOROOT`、`FLUTTER_ROOT`、`NODE_HOME` 互不覆盖。
- `use` 只改一个符号链接（Windows 为 junction），不搬移已安装的文件。
- 下载地址由官方 API 解析。Go、Flutter、Node.js 强制校验 SHA-256；Java 各源尽力校验。
- Temurin、Go、Flutter、Node.js 可配置镜像。校验和仍取自官方清单。
- 新增语言只需实现一个厂商模块，见[开发](#开发)。

## 系统要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | >= 18.15 | npm 安装需要本机 Node。脚本安装自带隔离运行时，不要求预先安装 |
| 操作系统 | — | macOS（Apple Silicon / Intel）、主流 Linux、Windows 10+ |
| 解压工具 | 系统自带 | macOS / Linux 用 `tar`；Windows 用 bsdtar，缺失时回退 PowerShell `Expand-Archive` |

平台限制：

- Linux 解压 Flutter（`.tar.xz`）需要 `xz`（`xz-utils`）。主流发行版默认自带。
- Flutter 官方在 Linux / Windows 只发布 x64 归档。ARM Linux 与 ARM Windows 无法安装。macOS 两种架构都支持。
- `flutter` 首次运行会构建内部 cache，耗时较久属于正常现象。

## 安装

### npm、pnpm、yarn、bun

本机需要 Node.js >= 18.15。四条命令都从 npm registry 安装：

```sh
npm install -g sdkvm
pnpm add -g sdkvm
yarn global add sdkvm
bun add -g sdkvm
```

装好后 CLI 使用 `PATH` 上的 `node`。若之后切到 18.15 以前的 Node，CLI 会无法启动，切回较新版本即可。

### 安装脚本

不要求本机已经安装 Node.js。需要仓库已有带 `sdkvm.tgz` 与 `SHA256SUMS` 的 GitHub Release（打 `v*` tag 后由 CI 上传）。

macOS / Linux：

```sh
curl -fsSL https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.sh | sh
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.ps1 | iex
```

脚本会：

1. 下载 Node.js 22.20.0 到 `~/.sdkvm/runtime`。它只启动 CLI，`sdkvm node use` 不会改到它。
2. 从 GitHub Release 下载 `sdkvm.tgz`，校验 SHA-256 后解压到 `~/.sdkvm/cli`。
3. 写入 `~/.local/bin/sdkvm`（Windows 为 `%USERPROFILE%\.local\bin\sdkvm.cmd`）。目录不在 `PATH` 中时，脚本会打印需要追加的那一行。

数据根与 CLI 一致：`SDKVM_HOME` 可覆盖，默认 `~/.sdkvm`。runtime 与 CLI 都落在该根下。国内可换下载前缀：

```sh
SDKVM_NODE_DIST=https://npmmirror.com/mirrors/node \
SDKVM_RELEASE_BASE=https://github.com/QInJ1995/sdkvm/releases \
  sh install.sh
```

验证：

```console
$ sdkvm version
1.0.0
```

## 升级

| 安装方式 | 命令 | 影响范围 |
|---|---|---|
| npm | `npm update -g sdkvm` | 只更新 CLI。pnpm / yarn / bun 用各自的全局更新命令 |
| 脚本 | `sdkvm upgrade` | 只替换 `~/.sdkvm/cli`。runtime 与已安装的 SDK 保持不变 |

数据目录 `~/.sdkvm` 与 CLI 升级无关。脚本安装也可以重新执行安装脚本。

## 快速开始

```sh
# Java（裸命令与 sdkvm java 等价）
sdkvm install lts
sdkvm use 25
java -version

# Go
sdkvm go install 1.24
sdkvm go use 1.24
go version

# Flutter（stable 通道）
sdkvm flutter install 3.47
sdkvm flutter use 3.47
flutter --version

# Node.js（npm 随该版本一起切换）
sdkvm node install lts
sdkvm node use 24
node --version

# 查看与卸载
sdkvm current
sdkvm java install 21 --vendor zulu
sdkvm java use zulu-21
sdkvm ls
sdkvm go ls
sdkvm flutter ls
sdkvm node ls
sdkvm uninstall zulu-21
sdkvm go uninstall 1.24
```

首次 `use` 之后需要重开终端，或在 macOS / Linux 上 `source` 对应的 rc 文件。

## 命令参考

Java 使用裸命令（`sdkvm install`）或 `sdkvm java`，两者等价。Go、Flutter、Node.js 分别使用 `sdkvm go`、`sdkvm flutter`、`sdkvm node`。

### 命令速查

| 命令 | 作用 |
|---|---|
| `sdkvm install <version>` | 安装 Java（等于 `sdkvm java install`） |
| `sdkvm use <version>` | 切换当前 Java |
| `sdkvm ls` / `sdkvm ls -r` | 列出已安装版本 / 可安装版本线 |
| `sdkvm current` | 显示全部 SDK 的当前版本 |
| `sdkvm uninstall <version>` | 卸载一个版本 |
| `sdkvm mirror show\|set\|unset` | 管理下载镜像 |
| `sdkvm java\|go\|flutter\|node …` | 各 SDK 的完整命令组 |
| `sdkvm version` | 打印 CLI 版本（同 `sdkvm --version`） |
| `sdkvm upgrade` | 升级 CLI。见[升级](#升级) |

版本写法：

```sh
sdkvm java    install lts | 21 | 21.0.5 | 21.0.5+11 | zulu-21
sdkvm go      install latest | 1.24 | 1.24.5 | golang-1.24
sdkvm flutter install latest | 3.47 | 3.47.5 | 3.49.0-0.1.pre | flutter-3.47
sdkvm node    install lts | latest | 22 | 22.20.0 | nodejs-22.20.0
```

### `sdkvm install <version>`

流程：解析、下载（边下边计算 SHA-256）、校验、解压到临时目录、原子落位。

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
| `--vendor <id>` | Java：`temurin`（默认）/ `zulu` / `corretto`。Go 为 `golang`，Flutter 为 `flutter`，Node.js 为 `nodejs` |
| `--force` | 已安装时删除并重装。默认跳过已安装版本 |

校验失败或解压异常时，半成品目录和缓存会被清掉。下载超时是 60 秒无数据，不是总时长上限。

### `sdkvm use <version>`

在已安装版本中匹配，并更新对应的 `current-*` 链接与 `JAVA_HOME` / `GOROOT` / `FLUTTER_ROOT` / `NODE_HOME` / `PATH`。

```sh
sdkvm use 21
sdkvm use temurin-21.0.5+11
sdkvm go use 1.24.5
sdkvm flutter use 3.47.5
sdkvm node use 22.20.0
```

macOS / Linux 上，首次 `use` 会向 shell 配置追加初始化块，重开终端或 `source ~/.zshrc` 后生效。之后的切换只改链接。IDE 需要重启才会读到新的环境变量。详见[切换机制](#切换机制)。

### `sdkvm ls`

列出已安装版本，`→` 表示当前版本。

```console
$ sdkvm go ls
→ golang-1.24.5
  golang-1.23.9
```

`sdkvm ls -r`（`--remote`）并行拉取该类型全部厂商的可安装版本线。行首名称可以直接交给 `install`。默认显示最近 12 条线，更老的版本按精确名称安装。

```console
$ sdkvm flutter ls -r

# Flutter (official)
  flutter-3.47  latest: flutter-3.47.5
  flutter-3.44  latest: flutter-3.44.9

# install with: sdkvm flutter install <name>
```

`--vendor <id>` 只列出一个厂商。

### `sdkvm current`

未安装的类型不显示。

```console
$ sdkvm current
java: temurin-21.0.12.1
  JAVA_HOME → ~/.sdkvm/jdks/temurin-21.0.12.1
go: golang-1.24.5
  GOROOT → ~/.sdkvm/gos/golang-1.24.5
flutter: flutter-3.47.5
  FLUTTER_ROOT → ~/.sdkvm/flutters/flutter-3.47.5
node: nodejs-22.20.0
  NODE_HOME → ~/.sdkvm/nodes/nodejs-22.20.0
```

### `sdkvm uninstall <version>`

语法与 `use` 相同。卸载当前版本时会清掉对应的 `current-*` 链接，并提示另选版本。其他已安装版本保留。

### `sdkvm mirror`

Java 用 `sdkvm mirror`，其余用 `sdkvm go mirror`、`sdkvm flutter mirror`、`sdkvm node mirror`。详见[镜像加速](#镜像加速)。

| 动作 | 说明 |
|---|---|
| `show` | 查看当前镜像（含推荐值） |
| `set <vendor> <url>` | 写入配置文件 |
| `unset <vendor>` | 恢复官方源 |

## 版本语法

`install`、`use`、`uninstall` 共用下表。未列出的组合会被拒绝并给出改写提示。

| 语法 | Java | Go | Flutter | Node.js | 示例 |
|---|---|---|---|---|---|
| `<major>` | 该大版本最新补丁 | — | — | 该 major 最新 | `21`、`22` |
| `<major.minor>` | — | 该 minor 线最新补丁 | stable 通道该 minor 线最新补丁 | — | `1.24`、`3.47` |
| `lts` | 最新 LTS 大版本 | — | — | 最新 LTS 线（当前 24 Krypton） | `lts` |
| `latest` | — | 最新稳定版 | stable 最新，不含 beta | 最新 Current | `latest` |
| `<full-version>` | 精确版本或前缀 | 精确版本 | 精确版本，可含 prerelease | 精确版本 | `21.0.5+11`、`1.24.5`、`3.49.0-0.1.pre`、`22.20.0` |
| `<vendor>-…` | 限定发行版 | 同左 | 同左 | 同左 | `zulu-21`、`golang-1.24`、`nodejs-22.20.0` |

匹配规则：

- `21`、`1.24`、`3.47`、`22` 匹配该线已安装或可安装的最新补丁。
- Java 的 `21.0.5` 做前缀匹配，可以命中 `21.0.5+11`。Go、Flutter、Node.js 的精确版本按全串匹配。
- Flutter 的 `latest` 与 `3.47` 只解析 stable。安装 beta 需要完整 prerelease，例如 `3.49.0-0.1.pre`。
- Java 的 `lts` 与 Adoptium 列表对齐，当前为 8 / 11 / 17 / 21 / 25。Node.js 的 `lts` 取官方 `index.json` 里最新带 LTS 代号的条目。
- Node.js 不接受 `22.20` 这种两段式，应写成 `22` 或 `22.20.0`。
- 省略厂商前缀时使用默认发行版。只有 Java 可以配置默认厂商，见[配置文件](#配置文件)。

## 工作原理

### 目录布局

数据根目录是 `~/.sdkvm`（Windows 为 `%USERPROFILE%\.sdkvm`）。`SDKVM_HOME` 可覆盖。

```
~/.sdkvm/
├── jdks/            # Java：temurin-21.0.12.1
├── gos/             # Go：golang-1.24.5
├── flutters/        # Flutter：flutter-3.47.5
├── nodes/           # Node.js：nodejs-22.20.0
├── current-java     # JAVA_HOME 链接（Windows 为 junction）
├── current-go
├── current-flutter
├── current-node
├── runtime/         # 脚本安装的 CLI 运行时，与 current-node 隔离
├── cli/             # 脚本安装的 CLI 包
├── config.json
├── cache/           # 下载中转，安装成功后删除
└── tmp/             # 解压临时目录，同样会删除
```

解压后的大致体积：Java 约 300 MB，Go 约 250 MB，Node.js 约 100 MB（含捆绑 npm），Flutter 数 GB（压缩包约 1–2.2 GB）。

### 切换机制

macOS / Linux 上，`current-*` 是指向当前版本目录的符号链接。首次 `use` 会向 shell 配置追加带标记的块：zsh 写入 `~/.zshrc`，bash 写入 `~/.bash_profile` 或 `~/.bashrc`。四种 SDK 各一块。

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

# >>> sdkvm node init >>>
export NODE_HOME="$HOME/.sdkvm/current-node"
case ":$PATH:" in *":$NODE_HOME/bin:"*) ;; *) export PATH="$NODE_HOME/bin:$PATH";; esac
# <<< sdkvm node init <<<
```

环境变量指向链接。之后的 `use` 只改链接，新终端会读到新值。

Windows 上，四个 `current-*` 都是 junction。`use` 把用户级环境变量写成 `REG_EXPAND_SZ`，保留 `%VAR%` 引用，避免 `setx` 的 1024 字符截断。PATH 追加 `%JAVA_HOME%\bin`、`%GOROOT%\bin`、`%FLUTTER_ROOT%\bin`。Node.js 的 Windows 归档没有 `bin/`，PATH 项是 `%NODE_HOME%` 本身。需要重开终端或重启 IDE。

## 配置

### 配置文件

路径：`~/.sdkvm/config.json`。文件损坏时会备份为 `config.json.bak` 并回退默认值。

```json
{
  "version": 1,
  "defaultVendor": "temurin",
  "mirror": {
    "temurin": "https://mirrors.nju.edu.cn/adoptium",
    "golang": "https://golang.google.cn/dl",
    "flutter": "https://mirror.nju.edu.cn/flutter/flutter_infra_release",
    "nodejs": "https://mirror.nju.edu.cn/nodejs-release"
  }
}
```

| 字段 | 说明 | 默认值 |
|---|---|---|
| `version` | schema 版本 | `1` |
| `defaultVendor` | Java 省略厂商前缀时的发行版 | `"temurin"` |
| `mirror` | 厂商 id 到镜像根 URL。id 在全部 SDK 中唯一 | `{}` |

### 环境变量

| 变量 | 说明 |
|---|---|
| `SDKVM_HOME` | 数据根目录，默认 `~/.sdkvm` |
| `SDKVM_MIRROR` | 临时镜像，优先级高于配置文件，不写入配置 |
| `SDKVM_QUIET` | 非空时抑制 info 与 warn |
| `SDKVM_NODE_DIST` | 安装脚本使用的 Node 发行根 URL |
| `SDKVM_RELEASE_BASE` | 安装脚本与 `sdkvm upgrade` 使用的 GitHub Release 根 URL |
| `SDKVM_RUNTIME_NODE` | 安装脚本内置的 Node 版本，默认 `22.20.0` |

镜像优先级：`SDKVM_MIRROR` > `config.mirror[<vendor>]` > 官方源。

## 镜像加速

Temurin 默认从 GitHub 下载，Go 默认从 go.dev，Flutter 默认从 `storage.googleapis.com`。

```sh
sdkvm mirror set temurin https://mirrors.nju.edu.cn/adoptium
sdkvm go mirror set golang https://golang.google.cn/dl
sdkvm flutter mirror set flutter https://mirror.nju.edu.cn/flutter/flutter_infra_release
sdkvm node mirror set nodejs https://mirror.nju.edu.cn/nodejs-release
```

临时指定、不写入配置：

```sh
SDKVM_MIRROR=https://golang.google.cn/dl sdkvm go install 1.24
```

镜像只替换归档下载地址。版本元数据和校验和始终走官方 API。

| 厂商 | 镜像写法 | 说明 |
|---|---|---|
| Go | `https://golang.google.cn/dl` 或 `https://mirrors.aliyun.com/golang` | 文件名直接拼在根 URL 后 |
| Flutter | 桶前缀替换 | 已验证 [NJU](https://mirror.nju.edu.cn/flutter/flutter_infra_release)。`storage.flutter-io.cn` 没有发布清单，不要使用 |
| Node.js | 前缀替换 | 已验证 [NJU](https://mirror.nju.edu.cn/nodejs-release)。TUNA 的 nodejs-release 缺少归档，不要使用 |
| Zulu、Corretto | — | 官方 CDN 直发，暂不支持镜像 |

## 安全性

- 下载地址来自官方 API：Adoptium、Azul Metadata、Corretto、go.dev/dl、Flutter releases、nodejs.org/dist `index.json`。不抓取搜索页。
- 归档按块计算 SHA-256。Go、Flutter、Node.js（官方 `SHASUMS256.txt`）校验失败即中止。Java 校验源不可达时警告并继续。
- 解压后检查单根目录和可执行文件，并且只解压到新的空目录。
- 安装与 `sdkvm upgrade` 持有 `~/.sdkvm/.lock`，避免并发写互相覆盖。

## 常见问题

### `use` 之后命令还是旧版本

rc 块在新终端或 `source ~/.zshrc` 之后生效。IDE 需要重启。先用 `sdkvm current` 确认链接已经切换。Windows 上注册表已更新，已打开的终端读不到新值。

### fish 或 nushell

自动写入只支持 zsh 和 bash。把[切换机制](#切换机制)里的块改写成对应语法。fish 示例：

```fish
set -gx JAVA_HOME $HOME/.sdkvm/current-java
fish_add_path $JAVA_HOME/bin
```

### Flutter 下载慢或中断

先配置镜像。超时条件是 60 秒没有数据，稳定的慢速不会中断。中断后直接重跑 `install`，不会留下半成品。

### 安装 Flutter beta

使用完整 prerelease，例如 `sdkvm flutter install 3.49.0-0.1.pre`。`latest` 和 `3.47` 只解析 stable。

### CLI 会不会被自己管理的 Node 影响

脚本安装用 `~/.sdkvm/runtime` 启动 CLI，`sdkvm node use` 不影响它。npm 全局安装跟随 `PATH` 上的 `node`；切到 18.15 以前时 CLI 可能无法启动，`sdkvm node use 22` 可以恢复。

### 代理

当前不读取 `HTTPS_PROXY`。可以使用系统级透明代理。

### 从旧版 `~/.jvm` 迁过来

本工具不再自动迁移。若仍有 `~/.jvm` 数据，可手工：

```sh
mv ~/.jvm ~/.sdkvm
```

然后删掉 shell 里旧的 `# >>> jvm init >>>` 块，再执行一次 `sdkvm use <version>` 写入新的 rc / 环境变量。Windows 同理：确认数据在 `%USERPROFILE%\.sdkvm` 后重跑 `use`。

### CI 或多用户隔离

设置 `SDKVM_HOME=/path/to/dir`。安装、链接和配置都跟随该目录。

## 卸载

npm 安装：

```sh
npm uninstall -g sdkvm
```

pnpm、yarn、bun 使用各自的全局卸载命令。

脚本安装只删除 shim 和 CLI 运行时，已安装的 SDK 还在：

```sh
rm -f ~/.local/bin/sdkvm
rm -rf ~/.sdkvm/cli ~/.sdkvm/runtime
```

Windows 对应删除 `%USERPROFILE%\.local\bin\sdkvm.cmd`，以及 `%USERPROFILE%\.sdkvm\cli` 与 `%USERPROFILE%\.sdkvm\runtime`。

确认不再需要已安装的 JDK、Go、Flutter、Node.js 之后，再删除数据目录：

```sh
rm -rf ~/.sdkvm
```

同时删除 shell 配置里 `>>> sdkvm java init >>>`、`>>> sdkvm go init >>>`、`>>> sdkvm flutter init >>>`、`>>> sdkvm node init >>>` 到对应 `<<< … <<<` 之间的块。

Windows 还需要在系统设置中删除 `JAVA_HOME`、`GOROOT`、`FLUTTER_ROOT`、`NODE_HOME`，并从用户 PATH 移除 `%JAVA_HOME%\bin`、`%GOROOT%\bin`、`%FLUTTER_ROOT%\bin`、`%NODE_HOME%`。

## 开发

```sh
git clone https://github.com/QInJ1995/sdkvm.git && cd sdkvm
npm install
npm test
npm run typecheck
npm run build
```

`npm run build` 用 tsup 生成 `dist/index.js`。本地试用：`node dist/index.js`。

```
src/
├── cli/       # install / use / ls / uninstall / mirror / upgrade
├── core/      # 版本解析、注册表、配置、文件锁
├── sdk/       # java / go / flutter / node 的目录、环境变量、版本语法
├── vendor/    # temurin / zulu / corretto / golang / flutter / nodejs 与镜像改写
├── fs/        # 解压、目录归一化、链接
├── shell/     # rc 写入、Windows 注册表
├── net/       # fetch、流式下载、校验
└── ui/        # 日志与进度
```

新增一种语言：在 `src/vendor/` 实现 `listMajors` 与 `resolve`，在 `src/sdk/` 增加类型描述（安装目录、current 链接、环境变量、版本语法、二进制路径），并注册到 `sdk/index.ts`。install / use / ls / uninstall / mirror，以及 rc 与注册表写入会跟着生效。

## 许可证

[MIT](./LICENSE) © QINJIN
