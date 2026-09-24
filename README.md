<div align="center">

# sdkvm

**简单、跨平台的多语言 SDK 版本管理器**

[![npm version](https://img.shields.io/npm/v/sdkvm)](https://www.npmjs.com/package/sdkvm)
[![license](https://img.shields.io/npm/l/sdkvm)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.15-green)](./package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#系统要求)

像 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 一样管理 **Java JDK** 与 **Go 工具链**。

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
- [卸载](#卸载)
- [开发](#开发)
- [许可证](#许可证)

## 简介

`sdkvm` 是一个用 Node.js 编写的命令行工具，提供多种语言 SDK 的**安装、切换、卸载**能力：

- **Java**：内置 [Adoptium Temurin](https://adoptium.net/)、[Azul Zulu](https://www.azul.com/downloads/)、[Amazon Corretto](https://aws.amazon.com/corretto/) 三个主流发行版
- **Go**：官方 [go.dev](https://go.dev/dl/) 源，全历史稳定版可装
- **多平台**：macOS（Apple Silicon / Intel）、Linux、Windows 10+
- **开箱即用**：无任何语言环境依赖，各 SDK 之间完全隔离，`JAVA_HOME` 与 `GOROOT` 并存互不干扰
- **秒级切换**：通过符号链接更新环境变量 / `PATH`，无需修改全局环境
- **官方源直连**：通过官方 API 解析下载地址，并尽可能做 SHA-256 校验（Go 源内联官方校验和，强制校验）
- **镜像支持**：Temurin 与 Go 均可配置国内镜像加速下载
- **可扩展**：SDK 类型抽象（`src/sdk/`）之上新增语言只需实现一个厂商模块

## 从 easy-jvm 升级

`sdkvm` 是 `easy-jvm` 的更名升级版（原工具只管理 JDK）。已装用户：

```sh
npm uninstall -g easy-jvm
npm install -g sdkvm
```

首次运行任意命令时，`~/.jvm/` 会**自动整体迁移**为 `~/.sdkvm/`（一次原子改名，已装 JDK 原样保留，`current` 链接与 shell 配置块自动改写），无需重装任何版本。旧的 `JVM_HOME` / `JVM_MIRROR` / `JVM_QUIET` 环境变量继续作为别名识别。

## 系统要求

| 依赖 | 版本 |
|---|---|
| Node.js | >= 18.15 |
| 操作系统 | macOS（Apple Silicon / Intel）/ 主流 Linux 发行版 / Windows 10+ |

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

# 混合使用
sdkvm current                     # 同时显示 java 与 go 的当前版本
sdkvm java install 21 --vendor zulu
sdkvm java use zulu-21
sdkvm ls                          # 已装的 Java
sdkvm go ls                       # 已装的 Go
sdkvm uninstall zulu-21
sdkvm go uninstall 1.24
```

## 命令参考

Java 用裸命令（`sdkvm install …`）或 `sdkvm java …` 子命令组，两者等价；Go 用 `sdkvm go …`。下表以 Java 为例：

### `sdkvm install <version>`

安装 SDK。

```console
$ sdkvm install 21
sdkvm resolving Adoptium Temurin 21 for mac/aarch64 ...
sdkvm downloading https://github.com/adoptium/temurin21-binaries/releases/...
↓ Temurin 21.0.12.1  ██████████████████████░░░░ 76.3%
sdkvm installed Temurin 21.0.12.1 → ~/.sdkvm/jdks/temurin-21.0.12.1
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 指定发行版：`temurin`（默认）/ `zulu` / `corretto`；Go 只有 `golang` |
| `--force` | 已安装时重新安装 |

已安装的版本会直接跳过；重复安装需加 `--force`。

### `sdkvm use <version>`

切换当前版本，更新 `current` 链接与 `JAVA_HOME`（或 `GOROOT`）/ `PATH`。版本语法与 `install` 相同，可精确到已安装的具体版本：

```sh
sdkvm use 21                      # 切换到已安装的 21 最新补丁版
sdkvm use temurin-21.0.5+11       # 切换到精确版本
sdkvm go use 1.24.5               # Go 精确版本
```

> macOS / Linux 下首次执行会在 shell 配置文件中追加初始化代码块，**重开终端（或 `source ~/.zshrc`）后生效**；之后每次切换即时生效。详见[切换机制](#切换机制)。

### `sdkvm ls` / `sdkvm list`

列出已安装的版本，`→` 标记当前版本：

```console
$ sdkvm go ls
→ golang-1.24.5
  golang-1.23.9
```

### `sdkvm ls -r` / `sdkvm ls --remote`

并行拉取全部厂商的可安装版本列表。每行名称带厂商前缀，**可直接复制给 `install`**：

```console
$ sdkvm go ls -r

# Go (official)
  golang-1.27  latest: golang-1.27.1
  golang-1.26  latest: golang-1.26.8
  ...

# install with: sdkvm go install <name>
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 只列出指定厂商 |

### `sdkvm current`

显示全部 SDK 类型的当前版本及其环境变量路径：

```console
$ sdkvm current
java: temurin-21.0.12.1
  JAVA_HOME → ~/.sdkvm/jdks/temurin-21.0.12.1
go: golang-1.24.5
  GOROOT → ~/.sdkvm/gos/golang-1.24.5
```

### `sdkvm uninstall <version>`

卸载已安装的版本，语法与 `use` 相同。卸载当前版本时会自动清空对应 `current` 链接。

### `sdkvm mirror <action> [vendor] [url]`

管理下载镜像，详见[镜像加速](#镜像加速国内用户)。Java 与 Go 分别用 `sdkvm mirror …` 与 `sdkvm go mirror …`。

| Action | 说明 |
|---|---|
| `show` | 查看当前镜像配置 |
| `set <vendor> <url>` | 设置镜像 |
| `unset <vendor>` | 恢复官方源 |

### `sdkvm version`

打印 CLI 版本号（等同于 `sdkvm --version`）。

## 版本语法

`install` / `use` / `uninstall` 共用版本语法，按 SDK 类型区分：

| 语法 | Java 含义 | Go 含义 | 示例 |
|---|---|---|---|
| `<major>` | 该大版本最新补丁版（`21`） | — | `21` |
| `<major.minor>` | — | 该 minor 线最新补丁版 | `1.24` |
| `lts` | 最新 LTS 大版本 | —（Go 无 LTS） | `lts` |
| `latest` | — | 全局最新稳定版 | `latest` |
| `<full-version>` | 精确版本 / 前缀匹配 | 精确版本 | `21.0.5+11`、`1.24.5` |
| `<vendor>-…` | 加厂商前缀限定发行版 | 同左 | `zulu-21`、`golang-1.24` |

匹配规则：

- `21` 匹配该大版本下**已安装/可安装的最新补丁版**；`1.24` 同理匹配该线最新补丁版
- `21.0.5` 做前缀匹配，可命中 `21.0.5+11`
- 不带厂商前缀时使用默认发行版（可通过配置修改，见[配置文件](#配置文件)）

## 工作原理

### 目录布局

所有数据位于 `~/.sdkvm/`（可用 `SDKVM_HOME` 环境变量覆盖，旧名 `JVM_HOME` 仍识别）：

```
~/.sdkvm/
├── jdks/                    # Java：<vendor>-<version>，如 temurin-21.0.12.1
├── gos/                     # Go：golang-<version>，如 golang-1.24.5
├── current-java             # 指向当前 JAVA_HOME 的链接（Windows 上为 junction）
├── current-go               # 指向当前 GOROOT 的链接
├── config.json              # CLI 配置
├── cache/                   # 下载缓存（安装完成后自动清理）
└── tmp/                     # 解压临时目录
```

### 切换机制

**macOS / Linux**

`current-java` / `current-go` 是指向当前版本目录的符号链接。首次 `use` 会在 shell 配置文件（zsh → `~/.zshrc`；bash → `~/.bash_profile` / `~/.bashrc`）追加一段带标记的初始化代码块，Java 与 Go 各一块：

```sh
# >>> sdkvm java init >>>
export JAVA_HOME="$HOME/.sdkvm/current-java"
case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac
# <<< sdkvm java init <<<

# >>> sdkvm go init >>>
export GOROOT="$HOME/.sdkvm/current-go"
case ":$PATH:" in *":$GOROOT/bin:"*) ;; *) export PATH="$GOROOT/bin:$PATH";; esac
# <<< sdkvm go init <<<
```

之后每次 `use` 只更新符号链接，新开终端（或 `source ~/.zshrc`）即生效。

**Windows**

`%USERPROFILE%\.sdkvm\current-java` / `current-go` 为 junction；`use` 写入用户级 `JAVA_HOME` / `GOROOT`，并把 `%JAVA_HOME%\bin`、`%GOROOT%\bin` 追加到用户 PATH。通过注册表操作并原样保留 `REG_EXPAND_SZ` 类型与 `%VAR%` 引用，避免 `setx` 的 1024 字符截断问题。需要**重开终端**生效。

### 数据迁移

首次运行时检测旧版 `~/.jvm/`：存在且 `~/.sdkvm/` 尚未创建时，执行一次原子目录改名，随后重写 `current` 链接（绝对目标同步改指新路径）、Windows 注册表 `JAVA_HOME` 字面值、shell 配置文件中的旧标记块。`~/.sdkvm/` 已存在时**不自动合并**，仅提示手动处理。

## 配置

### 配置文件

`~/.sdkvm/config.json`：

```json
{
  "version": 1,
  "defaultVendor": "temurin",
  "mirror": {
    "temurin": "https://mirrors.nju.edu.cn/adoptium",
    "golang": "https://golang.google.cn/dl"
  }
}
```

| 字段 | 说明 | 默认值 |
|---|---|---|
| `defaultVendor` | Java 不带厂商前缀时的默认发行版 | `"temurin"` |
| `mirror` | 各厂商的镜像 URL（跨 SDK 类型，键为厂商 id） | `{}`（官方源） |

### 环境变量

| 变量 | 旧名别名 | 说明 |
|---|---|---|
| `SDKVM_HOME` | `JVM_HOME` | 覆盖数据根目录（默认 `~/.sdkvm`） |
| `SDKVM_MIRROR` | `JVM_MIRROR` | 临时指定下载镜像（优先级高于配置文件） |
| `SDKVM_QUIET` | `JVM_QUIET` | 设为非空时抑制 info/warn 日志输出 |

## 镜像加速（国内用户）

Temurin 默认从 GitHub 下载、Go 默认从 go.dev 下载，国内网络建议切换到镜像：

```sh
sdkvm mirror set temurin https://mirrors.nju.edu.cn/adoptium     # Java
sdkvm go mirror set golang https://golang.google.cn/dl           # Go
```

也可以用环境变量临时指定（不写入配置）：

```sh
SDKVM_MIRROR=https://golang.google.cn/dl sdkvm go install 1.24
```

> 镜像仅替换 tarball 下载地址，版本元数据始终走官方 API。Go 镜像根 URL 兼容 `https://golang.google.cn/dl`（官方中国站）与 `https://mirrors.aliyun.com/golang`（文件名直接拼接）；Zulu 与 Corretto 由官方 CDN 直接分发，暂不支持镜像。

## 安全性

- 下载地址通过**官方 API** 解析（Adoptium API / Azul Metadata API / Corretto 官方分发 / go.dev/dl JSON API）
- tarball 尽力做 **SHA-256 校验**（Go 源校验和内联于 API，强制校验；其他源校验源不可达时警告放行）
- 解压前校验归档结构，且只解压到全新空目录，防止路径穿越

## 卸载

```sh
npm uninstall -g sdkvm
rm -rf ~/.sdkvm       # 删除 SDK 数据目录
```

并删除 shell 配置文件中 `>>> sdkvm java init >>>`、`>>> sdkvm go init >>>` 各自到 `<<< … <<<` 之间的标记块。

Windows 用户额外需要：在系统设置中删除 `JAVA_HOME` / `GOROOT`，并从用户 PATH 移除 `%JAVA_HOME%\bin`、`%GOROOT%\bin`。

## 开发

```sh
git clone https://github.com/QInJ1995/sdkvm.git && cd sdkvm
npm install

npm test            # vitest 单元 + 集成测试
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/index.js
```

新增一种语言 SDK：在 `src/vendor/` 实现一个厂商模块（`listMajors` + `resolve`），在 `src/sdk/` 加一个类型描述（目录名、环境变量、版本语法、二进制探测），注册后即获得完整的 install/use/ls/uninstall/mirror 命令组。

## 许可证

[MIT](./LICENSE) © QINJIN
