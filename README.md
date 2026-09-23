<div align="center">

# easy-jvm

**简单、跨平台的 JDK 版本管理器**

[![npm version](https://img.shields.io/npm/v/easy-jvm)](https://www.npmjs.com/package/easy-jvm)
[![license](https://img.shields.io/npm/l/easy-jvm)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.15-green)](./package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#系统要求)

像 [nvm](https://github.com/nvm-sh/nvm) 管理 Node.js 一样管理 Java JDK。

</div>

---

## 目录

- [简介](#简介)
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

`easy-jvm` 是一个用 Node.js 编写的命令行工具，提供 OpenJDK 发行版的**安装、切换、卸载**能力：

- **多发行版**：内置 [Adoptium Temurin](https://adoptium.net/)、[Azul Zulu](https://www.azul.com/downloads/)、[Amazon Corretto](https://aws.amazon.com/corretto/) 三个主流发行版
- **多平台**：macOS（Apple Silicon / Intel）、Linux、Windows 10+
- **开箱即用**：无 Java 环境依赖，安装的 JDK 之间完全隔离
- **秒级切换**：通过符号链接更新 `JAVA_HOME` / `PATH`，无需修改全局环境
- **官方源直连**：通过各厂商官方 API 解析下载地址，并尽可能做 SHA-256 校验
- **镜像支持**：可为 Temurin 配置国内镜像加速下载

## 系统要求

| 依赖 | 版本 |
|---|---|
| Node.js | >= 18.15 |
| 操作系统 | macOS（Apple Silicon / Intel）/ 主流 Linux 发行版 / Windows 10+ |

## 安装

```sh
npm install -g easy-jvm
```

安装完成后即可使用 `jvm` 命令。验证：

```console
$ jvm version
0.1.0
```

## 快速开始

```sh
jvm install lts                 # 安装最新 LTS（当前为 Temurin 25）
jvm use 25                      # 切换到该版本
java -version                   # 验证生效（可能需要重开终端）

jvm install 21 --vendor zulu    # 安装 Azul Zulu 21
jvm use zulu-21                 # 按发行版切换

jvm ls                          # 查看已安装版本
jvm uninstall zulu-21           # 卸载指定版本
```

## 命令参考

### `jvm install <version>`

安装 JDK。

```console
$ jvm install 21
jvm resolving Adoptium Temurin 21 for mac/aarch64 ...
jvm downloading https://github.com/adoptium/temurin21-binaries/releases/...
↓ Temurin 21.0.12.1  ██████████████████████░░░░ 76.3%
jvm installed Temurin 21.0.12.1 → ~/.jvm/jdks/temurin-21.0.12.1
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 指定发行版：`temurin`（默认）/ `zulu` / `corretto` |
| `--force` | 已安装时重新安装 |

已安装的版本会直接跳过；重复安装需加 `--force`。

### `jvm use <version>`

切换当前 JDK，更新 `~/.jvm/current` 链接与 `JAVA_HOME` / `PATH`。版本语法与 `install` 相同，可精确到已安装的具体版本：

```sh
jvm use 21                      # 切换到已安装的 21 最新补丁版
jvm use temurin-21.0.5+11       # 切换到精确版本
```

> macOS / Linux 下首次执行会在 shell 配置文件中追加初始化代码块，**重开终端（或 `source ~/.zshrc`）后生效**；之后每次切换即时生效。详见[切换机制](#切换机制)。

### `jvm ls` / `jvm list`

列出已安装的 JDK，`→` 标记当前版本：

```console
$ jvm ls
  temurin-21.0.12.1
→ zulu-25.0.4.1
```

### `jvm ls -r` / `jvm ls --remote`

并行拉取全部厂商的可安装版本列表。每行名称带厂商前缀，**可直接复制给 `jvm install`**：

```console
$ jvm ls -r

# Adoptium Temurin
  temurin-25  (lts)
  temurin-21  (lts)
  ...

# Azul Zulu
  zulu-25  (lts) latest: zulu-25.0.4.1
  zulu-21  (lts) latest: zulu-21.0.12.1
  ...

# Amazon Corretto
  corretto-21  (lts)
  ...

# install with: jvm install <name>
```

| 选项 | 说明 |
|---|---|
| `--vendor <id>` | 只列出指定厂商 |

### `jvm current`

显示当前使用的 JDK 及其 `JAVA_HOME` 路径。

### `jvm uninstall <version>`

卸载已安装的 JDK，版本语法与 `use` 相同。卸载当前版本时会自动清空 `current` 链接。

### `jvm mirror <action> [vendor] [url]`

管理下载镜像，详见[镜像加速](#镜像加速国内用户)。

| Action | 说明 |
|---|---|
| `show` | 查看当前镜像配置 |
| `set <vendor> <url>` | 设置镜像 |
| `unset <vendor>` | 恢复官方源 |

### `jvm version`

打印 CLI 版本号（等同于 `jvm --version`）。

## 版本语法

`install` / `use` / `uninstall` 共用同一套版本语法：

| 语法 | 含义 | 示例 |
|---|---|---|
| `<major>` | 该大版本最新的补丁版 | `21` |
| `lts` | 最新的 LTS 大版本 | `lts` |
| `<major.minor.patch>` | 前缀匹配（含 `+build`） | `21.0.5` |
| `<full-version>` | 精确版本 | `21.0.5+11` |
| `<vendor>-…` | 以上任一语法加厂商前缀，限定发行版 | `zulu-21`、`temurin-21.0.5+11` |

匹配规则：

- `21` 匹配该大版本下**已安装/可安装的最新补丁版**
- `21.0.5` 做前缀匹配，可命中 `21.0.5+11`
- 不带厂商前缀时使用默认发行版（可通过配置修改，见[配置文件](#配置文件)）

## 工作原理

### 目录布局

所有数据位于 `~/.jvm/`（可用 `JVM_HOME` 环境变量覆盖）：

```
~/.jvm/
├── jdks/                    # 各 JDK 独立目录：<vendor>-<version>，如 temurin-21.0.12.1
├── current                  # 指向当前版本 JAVA_HOME 的链接（Windows 上为 junction）
├── config.json              # CLI 配置
├── cache/                   # 下载缓存（安装完成后自动清理）
└── tmp/                     # 解压临时目录
```

### 切换机制

**macOS / Linux**

`~/.jvm/current` 是指向当前版本 `JAVA_HOME` 的符号链接。首次 `jvm use` 会在 shell 配置文件（zsh → `~/.zshrc`；bash → `~/.bash_profile` / `~/.bashrc`）追加一段带标记的初始化代码块：

```sh
# >>> jvm init >>>
export JAVA_HOME="$HOME/.jvm/current"
case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac
# <<< jvm init <<<
```

之后每次 `jvm use` 只更新符号链接，新开终端（或 `source ~/.zshrc`）即生效。

**Windows**

`%USERPROFILE%\.jvm\current` 为 junction；`jvm use` 写入用户级 `JAVA_HOME`，并把 `%JAVA_HOME%\bin` 追加到用户 PATH。通过注册表操作并原样保留 `REG_EXPAND_SZ` 类型与 `%VAR%` 引用，避免 `setx` 的 1024 字符截断问题。需要**重开终端**生效。

## 配置

### 配置文件

`~/.jvm/config.json`：

```json
{
  "version": 1,
  "defaultVendor": "temurin",
  "mirror": { "temurin": "https://mirrors.nju.edu.cn/adoptium" }
}
```

| 字段 | 说明 | 默认值 |
|---|---|---|
| `defaultVendor` | 不带厂商前缀时的默认发行版 | `"temurin"` |
| `mirror` | 各厂商的镜像 URL | `{}`（官方源） |

### 环境变量

| 变量 | 说明 |
|---|---|
| `JVM_HOME` | 覆盖数据根目录（默认 `~/.jvm`） |
| `JVM_MIRROR` | 临时指定下载镜像（优先级高于配置文件） |
| `JVM_QUIET` | 设为非空时抑制 info/warn 日志输出 |

## 镜像加速（国内用户）

Temurin 默认从 GitHub 下载，国内网络建议切换到镜像：

```sh
jvm mirror set temurin https://mirrors.nju.edu.cn/adoptium
jvm mirror show                 # 查看当前配置
jvm mirror unset temurin        # 恢复官方源
```

也可以用环境变量临时指定（不写入配置）：

```sh
JVM_MIRROR=https://mirrors.nju.edu.cn/adoptium jvm install 21
```

> 当前仅 Temurin 支持镜像配置；Zulu 与 Corretto 均由官方 CDN 直接分发。

## 安全性

- 下载地址通过各厂商**官方 API** 解析（Adoptium API / Azul Metadata API / Corretto 官方分发）
- tarball 尽力做 **SHA-256 校验**（校验源不可达时警告放行）
- 解压前校验归档结构，且只解压到全新空目录，防止路径穿越

## 卸载

```sh
npm uninstall -g easy-jvm
rm -rf ~/.jvm        # 删除 JDK 数据目录
```

并删除 shell 配置文件中 `>>> jvm init >>>` 到 `<<< jvm init <<<` 之间的标记块。

Windows 用户额外需要：在系统设置中删除 `JAVA_HOME`，并从用户 PATH 移除 `%JAVA_HOME%\bin`。

## 开发

```sh
git clone https://github.com/QInJ1995/easy-jvm.git && cd easy-jvm
npm install

npm test            # vitest 单元 + 集成测试
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/index.js
```

## 许可证

[MIT](./LICENSE) © QINJIN
