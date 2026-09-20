# jvm — JDK 版本管理器

像 [nvm](https://nvm.uihtm.com/) 管理 Node.js 一样管理 Java JDK：一个命令安装、切换、卸载多个 JDK 版本。支持 **Temurin / Zulu / Corretto** 三大发行版，覆盖 macOS（Apple Silicon & Intel）、Linux、Windows。

```sh
npm install -g @qinjin/jvm      # 安装（scope 名以实际发布为准）

jvm install 21                  # 安装 Temurin 21（默认发行版，装最新补丁版）
jvm install lts                 # 安装最新 LTS
jvm install 21 --vendor zulu    # 安装 Azul Zulu 21
jvm install temurin-21.0.5+11   # 精确版本

jvm use 21                      # 切换（更新 JAVA_HOME / PATH）
jvm ls                          # 列出已安装（→ 标记当前）
jvm ls-remote --vendor zulu     # 列出可安装版本
jvm current                     # 查看当前版本
jvm uninstall 21                # 卸载
```

## 安装要求

- Node.js >= 18.15
- macOS / Linux / Windows 10+

## 切换原理

**macOS / Linux**：所有 JDK 安装在 `~/.jvm/jdks/<vendor>-<version>/`，`~/.jvm/current` 是指向当前版本 `JAVA_HOME` 的符号链接。首次 `jvm use` 会在 shell 配置文件（zsh → `~/.zshrc`，bash → `~/.bash_profile` / `~/.bashrc`）追加一段带标记的配置：

```sh
# >>> jvm init >>>
export JAVA_HOME="$HOME/.jvm/current"
case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac
# <<< jvm init <<<
```

之后每次 `jvm use` 只更新符号链接，**新开终端（或 `source ~/.zshrc`）即生效**。

**Windows**：`%USERPROFILE%\.jvm\current` 是 junction；`jvm use` 写入用户级 `JAVA_HOME` 并把 `%JAVA_HOME%\bin` 追加到用户 PATH（通过注册表原样保留 `REG_EXPAND_SZ` 类型与 `%VAR%` 引用，避免 `setx` 的 1024 字符截断问题）。需要**重开终端**生效。

## 国内镜像加速

Temurin 默认从 GitHub 下载，国内建议切换到镜像：

```sh
jvm mirror set temurin https://mirrors.nju.edu.cn/adoptium
jvm mirror show
jvm mirror unset temurin     # 恢复官方源
```

也可用环境变量临时指定：`JVM_MIRROR=https://mirrors.nju.edu.cn/adoptium jvm install 21`

## 完整命令

| 命令 | 说明 |
|---|---|
| `jvm install <version> [--vendor id] [--force]` | 安装 JDK。`<version>`: `21` / `lts` / `21.0.5` / `21.0.5+11` / `temurin-21` |
| `jvm use <version>` | 切换当前 JDK（同上版本语法） |
| `jvm ls` / `jvm list` | 列出已安装版本 |
| `jvm ls-remote [--vendor id]` | 列出可安装的大版本（LTS 标注） |
| `jvm current` | 当前 JDK 与 JAVA_HOME 路径 |
| `jvm uninstall <version>` | 卸载（若卸载当前版本会自动清空链接） |
| `jvm mirror show/set/unset` | 下载镜像管理（当前仅 temurin） |
| `jvm version` / `jvm --version` | 版本 |

版本匹配规则：`21` 匹配该大版本下已安装的最新补丁；`21.0.5` 前缀匹配（含 `+build`）；`zulu-21` 限定发行版。

## 卸载 jvm 本身

```sh
npm uninstall -g @qinjin/jvm
rm -rf ~/.jvm                                    # JDK 数据目录
# 并删除 shell 配置文件中的 ">>> jvm init >>>" 到 "<<< jvm init <<<" 标记块
```

Windows 用户额外：在系统设置中删除 `JAVA_HOME`，并从用户 PATH 移除 `%JAVA_HOME%\bin`。

## 校验与安全

下载使用官方 API 解析（Adoptium API / Azul Metadata API / Corretto 官方分发），tarball 尽力做 SHA-256 校验（校验源不可达时警告放行），解压前校验归档结构，仅解压到全新空目录。

## 开发

```sh
npm install
npm test          # vitest 单元 + 集成测试
npm run typecheck
npm run build     # tsup → dist/index.js
```

MIT License.
