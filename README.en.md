<div align="center">

# sdkvm

**A simple, cross-platform version manager for language SDKs**

[![npm version](https://img.shields.io/npm/v/sdkvm)](https://www.npmjs.com/package/sdkvm)
[![CI](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml/badge.svg)](https://github.com/QInJ1995/sdkvm/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/sdkvm)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.15-green)](./package.json)
[![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](#requirements)

[中文](./README.md) | English

Manage **Java JDKs**, the **Go toolchain**, the **Flutter SDK**, and the **Node.js runtime**.

</div>

## Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Install](#install)
- [Upgrade](#upgrade)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Version syntax](#version-syntax)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Mirrors and npm registry](#mirrors-and-npm-registry)
- [Security](#security)
- [FAQ](#faq)
- [Uninstall](#uninstall)
- [Development](#development)
- [License](#license)

## Overview

`sdkvm` is a Node.js CLI that installs, switches, and removes SDKs.

| SDK | Source | Notes |
|---|---|---|
| Java | [Temurin](https://adoptium.net/), [Zulu](https://www.azul.com/downloads/), [Corretto](https://aws.amazon.com/corretto/) | `lts` is currently 8 / 11 / 17 / 21 / 25 |
| Go | [go.dev](https://go.dev/dl/) | All historical stable releases |
| Flutter | Official release manifest | stable / beta; both macOS architectures; Linux / Windows are x64 only |
| Node.js | [nodejs.org/dist](https://nodejs.org/dist) | `lts` (currently 24 Krypton) / `latest` / major line; npm switches with the runtime |

Behavior:

- Each SDK lives in its own directory. `JAVA_HOME`, `GO_HOME`, `FLUTTER_HOME`, and `NODE_HOME` do not overwrite each other.
- `use` updates one symlink (a junction on Windows). Installed trees are not moved.
- Download URLs come from official APIs. Go, Flutter, and Node.js require a SHA-256 match. Java vendors are verified when a checksum is available.
- Temurin, Go, Flutter, and Node.js accept a mirror. Checksums still come from the official manifest.
- Adding a language means implementing one vendor module. See [Development](#development).

## Requirements

| Dependency | Version | Notes |
|---|---|---|
| Node.js | >= 18.15 | Required for an npm install. The install script ships an isolated runtime |
| OS | — | macOS (Apple Silicon / Intel), mainstream Linux, Windows 10+ |
| Extractor | built in | `tar` on macOS / Linux. Windows uses bsdtar, then PowerShell `Expand-Archive` |

Platform limits:

- Extracting Flutter (`.tar.xz`) on Linux needs `xz` (`xz-utils`). Mainstream distributions include it.
- Official Flutter archives for Linux and Windows are x64 only. ARM Linux and ARM Windows cannot install Flutter. Both macOS architectures are supported.
- The first `flutter` run builds an internal cache. That wait is expected.

## Install

### npm, pnpm, yarn, bun

The machine needs Node.js >= 18.15. All four commands install from the npm registry:

```sh
npm install -g sdkvm
pnpm add -g sdkvm
yarn global add sdkvm
bun add -g sdkvm
```

The CLI then runs on whatever `node` is first on `PATH`. Switching to a Node older than 18.15 stops the CLI until you switch back.

### Install script

No preinstalled Node.js is required. A GitHub Release that already contains `sdkvm.tgz` and `SHA256SUMS` is required (uploaded by CI after a `v*` tag).

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.ps1 | iex
```

The script:

1. Downloads Node.js 22.20.0 into `~/.sdkvm/runtime`. That copy only launches the CLI. `sdkvm node use` does not change it.
2. Downloads `sdkvm.tgz` from the GitHub Release, checks SHA-256, and extracts it to `~/.sdkvm/cli`.
3. Writes `~/.sdkvm/bin/sdkvm` (on Windows, `%USERPROFILE%\.sdkvm\bin\sdkvm.cmd`). If that directory is not on `PATH`, the script prints the line to add.

The data root matches the CLI: `SDKVM_HOME` overrides it, otherwise `~/.sdkvm`. Both the runtime and the CLI live under that root. Override download prefixes when needed:

```sh
SDKVM_NODE_DIST=https://npmmirror.com/mirrors/node \
SDKVM_RELEASE_BASE=https://github.com/QInJ1995/sdkvm/releases \
  sh install.sh
```

Check:

```console
$ sdkvm version
1.0.1
```

## Upgrade

| Install method | Command | What changes |
|---|---|---|
| npm | `npm update -g sdkvm` | CLI only. pnpm / yarn / bun use their own global update command |
| script | `sdkvm upgrade` | Replaces `~/.sdkvm/cli` only. The runtime and installed SDKs stay |

`~/.sdkvm` data is independent of a CLI upgrade. A script install can also be refreshed by running the install script again.

## Quick start

Java accepts bare commands (same as `sdkvm java`). Go, Flutter, and Node use subcommands.

```sh
# Optional: faster downloads in China (scoped per SDK type)
sdkvm mirror use nju          # Java Temurin
sdkvm go mirror use nju
sdkvm flutter mirror use nju
sdkvm node mirror use nju
sdkvm nrm use taobao          # npm install only; independent of mirror above

# Java
sdkvm install lts
sdkvm use 25
java -version

# Go
sdkvm go install 1.24
sdkvm go use 1.24
go version

# Flutter (stable)
sdkvm flutter install 3.47
sdkvm flutter use 3.47
flutter --version

# Node.js (npm switches with this runtime)
sdkvm node install lts
sdkvm node use 24
node --version

# Inspect and remove
sdkvm current
sdkvm java install 21 --vendor zulu
sdkvm java use zulu-21
sdkvm ls
sdkvm go ls
sdkvm uninstall zulu-21
```

After the first `use`, **open a new terminal**, or on macOS / Linux run `source ~/.zshrc` (or the matching bash rc). Restart the IDE so it picks up the new environment variables.

Day-to-day: `install` → `use` → `current` / `ls`. Mirrors and npm registries: [Mirrors and npm registry](#mirrors-and-npm-registry).

## Commands

Java accepts bare commands (`sdkvm install`) or `sdkvm java`. Go, Flutter, and Node.js use `sdkvm go`, `sdkvm flutter`, and `sdkvm node`.

### Cheat sheet

| Command | Effect |
|---|---|
| `sdkvm install <version>` | Install Java (same as `sdkvm java install`) |
| `sdkvm use <version>` | Switch the current Java |
| `sdkvm ls` / `sdkvm ls -r` | List installed versions / installable lines |
| `sdkvm current` | Show the current version of every SDK |
| `sdkvm uninstall <version>` | Remove one version |
| `sdkvm mirror ls\|use\|current\|show\|set\|unset` | Manage SDK download mirror sites / URLs (install archives, not the npm package registry) |
| `sdkvm nrm ls\|use\|current\|add\|del\|test` | Manage the user-level npm registry (like nrm) |
| `sdkvm java\|go\|flutter\|node …` | Full command group for that SDK |
| `sdkvm version` | Print the CLI version (same as `sdkvm --version`) |
| `sdkvm upgrade` | Upgrade the CLI. See [Upgrade](#upgrade) |

Version forms:

```sh
sdkvm java    install lts | 21 | 21.0.5 | 21.0.5+11 | zulu-21
sdkvm go      install latest | 1.24 | 1.24.5 | golang-1.24
sdkvm flutter install latest | 3.47 | 3.47.5 | 3.49.0-0.1.pre | flutter-3.47
sdkvm node    install lts | latest | 22 | 22.20.0 | nodejs-22.20.0
```

### `sdkvm install <version>`

Resolve, download (SHA-256 is hashed while bytes arrive), verify, extract into a temp directory, then move into place.

```console
$ sdkvm install 21
sdkvm resolving Adoptium Temurin 21 for mac/aarch64 ...
sdkvm downloading https://github.com/adoptium/temurin21-binaries/releases/...
↓ Temurin 21.0.12.1  160.2MB / 200.4MB
sdkvm installed Temurin 21.0.12.1 → ~/.sdkvm/jdks/temurin-21.0.12.1
sdkvm switch to it: sdkvm use 21
```

| Option | Meaning |
|---|---|
| `--vendor <id>` | Java: `temurin` (default) / `zulu` / `corretto`. Go is `golang`, Flutter is `flutter`, Node.js is `nodejs` |
| `--force` | Delete and reinstall. The default is to skip a version that is already present |

A failed checksum or extract removes the partial directory and the cache. The download timer is 60 seconds without data, not a cap on total time.

### `sdkvm use <version>`

Match an installed version, then update the `current-*` link and `JAVA_HOME` / `GO_HOME` / `FLUTTER_HOME` / `NODE_HOME` / `PATH`.

```sh
sdkvm use 21
sdkvm use temurin-21.0.5+11
sdkvm go use 1.24.5
sdkvm flutter use 3.47.5
sdkvm node use 22.20.0
```

On macOS / Linux the first `use` appends an init block to the shell rc. Open a new terminal or `source ~/.zshrc`. Later switches only move the link. IDEs need a restart before they see the new variables. See [Switching](#switching).

### `sdkvm ls`

Installed versions. `→` marks the current one.

```console
$ sdkvm go ls
→ golang-1.24.5
  golang-1.23.9
```

`sdkvm ls -r` (`--remote`) fetches installable lines from every vendor of that SDK in parallel. The name at the start of a row can be passed to `install`. The default list is the latest 12 lines. Older versions are installed by exact name.

```console
$ sdkvm flutter ls -r

# Flutter (official)
  flutter-3.47  latest: flutter-3.47.5
  flutter-3.44  latest: flutter-3.44.9

# install with: sdkvm flutter install <name>
```

`--vendor <id>` limits the list to one vendor.

### `sdkvm current`

SDKs that are not installed are omitted.

```console
$ sdkvm current
java: temurin-21.0.12.1
  JAVA_HOME → ~/.sdkvm/jdks/temurin-21.0.12.1
go: golang-1.24.5
  GO_HOME → ~/.sdkvm/gos/golang-1.24.5
flutter: flutter-3.47.5
  FLUTTER_HOME → ~/.sdkvm/flutters/flutter-3.47.5
node: nodejs-22.20.0
  NODE_HOME → ~/.sdkvm/nodes/nodejs-22.20.0
```

### `sdkvm uninstall <version>`

Same syntax as `use`. Uninstalling the current version clears that `current-*` link and asks you to pick another. Other installed versions stay.

### `sdkvm mirror`

Manages **install-archive mirrors** per SDK type (not the npm package registry). Java: `sdkvm mirror`. Others: `sdkvm go|flutter|node mirror`. Scopes do not overlap.

```sh
sdkvm mirror ls
sdkvm mirror use nju
sdkvm go mirror use aliyun
sdkvm node mirror use official   # restore official source for that type
```

| Action | Meaning |
|---|---|
| `ls` / `current` / `show` | List sites and show the current config for this type |
| `use <site>` | Switch to a built-in site (`nju` / `tuna` / `aliyun` / `huawei` / `official`) |
| `set [vendor] <url>` / `unset` | Set or clear a raw URL |

Coverage and hand-entered URLs: [Mirrors and npm registry](#mirrors-and-npm-registry).

### `sdkvm nrm`

Manages the user-level **npm registry** (where `npm install` fetches packages). The UX follows [nrm](https://github.com/Pana/nrm). Independent of `mirror`.

```sh
sdkvm nrm ls
sdkvm nrm use taobao
sdkvm nrm use npm
sdkvm nrm add myprivate http://xxx/registry
sdkvm nrm del myprivate
sdkvm nrm test
```

Built-in names: `npm`, `yarn`, `taobao` (alias `npmmirror`), `tencent`, `cnpm`, `huawei`, `npmMirror`. `npm` must be on `PATH`.

## Version syntax

`install`, `use`, and `uninstall` share this table. Combinations that are not listed are rejected with a rewrite hint.

| Form | Java | Go | Flutter | Node.js | Example |
|---|---|---|---|---|---|
| `<major>` | Latest patch of that major | — | — | Latest of that major | `21`, `22` |
| `<major.minor>` | — | Latest patch of that minor line | Latest stable patch of that minor line | — | `1.24`, `3.47` |
| `lts` | Latest LTS major | — | — | Latest LTS line (currently 24 Krypton) | `lts` |
| `latest` | — | Newest stable | Newest stable, not beta | Newest Current | `latest` |
| `<full-version>` | Exact or prefix | Exact | Exact, including a prerelease | Exact | `21.0.5+11`, `1.24.5`, `3.49.0-0.1.pre`, `22.20.0` |
| `<vendor>-…` | Pin a distribution | Same | Same | Same | `zulu-21`, `golang-1.24`, `nodejs-22.20.0` |

Rules:

- `21`, `1.24`, `3.47`, and `22` select the newest installed or installable patch on that line.
- Java `21.0.5` is a prefix and can match `21.0.5+11`. Go, Flutter, and Node.js exact versions match the full string.
- Flutter `latest` and `3.47` resolve on stable only. A beta needs the full prerelease, for example `3.49.0-0.1.pre`.
- Java `lts` follows the Adoptium list: 8 / 11 / 17 / 21 / 25. Node.js `lts` is the newest `index.json` entry that carries an LTS codename.
- Node.js rejects a two-part version such as `22.20`. Use `22` or `22.20.0`.
- Omitting the vendor uses the default distribution. Only Java's default is configurable. See [Config file](#config-file).

## How it works

### Layout

The data root is `~/.sdkvm` (`%USERPROFILE%\.sdkvm` on Windows). `SDKVM_HOME` overrides it.

```
~/.sdkvm/
├── jdks/            # Java: temurin-21.0.12.1
├── gos/             # Go: golang-1.24.5
├── flutters/        # Flutter: flutter-3.47.5
├── nodes/           # Node.js: nodejs-22.20.0
├── current-java     # JAVA_HOME link (junction on Windows)
├── current-go
├── current-flutter
├── current-node
├── runtime/         # Script-install Node, isolated from current-node
├── cli/             # Script-install CLI package
├── bin/             # Script-install entrypoint sdkvm (add to PATH)
├── config.json
├── cache/           # Download staging, removed after a successful install
└── tmp/             # Extract staging, also removed
```

Unpacked size, roughly: Java 300 MB, Go 250 MB, Node.js 100 MB (bundled npm included), Flutter several GB (the archive itself is about 1–2.2 GB).

### Switching

On macOS / Linux, each `current-*` entry is a symlink to the selected version. The first `use` appends a marked block: zsh writes `~/.zshrc`, bash writes `~/.bash_profile` or `~/.bashrc`. Each SDK has its own block.

```sh
# >>> sdkvm java init >>>
export JAVA_HOME="$HOME/.sdkvm/current-java"
case ":$PATH:" in *":$JAVA_HOME/bin:"*) ;; *) export PATH="$JAVA_HOME/bin:$PATH";; esac
# <<< sdkvm java init <<<

# >>> sdkvm go init >>>
export GO_HOME="$HOME/.sdkvm/current-go"
case ":$PATH:" in *":$GO_HOME/bin:"*) ;; *) export PATH="$GO_HOME/bin:$PATH";; esac
# <<< sdkvm go init <<<

# >>> sdkvm flutter init >>>
export FLUTTER_HOME="$HOME/.sdkvm/current-flutter"
case ":$PATH:" in *":$FLUTTER_HOME/bin:"*) ;; *) export PATH="$FLUTTER_HOME/bin:$PATH";; esac
# <<< sdkvm flutter init <<<

# >>> sdkvm node init >>>
export NODE_HOME="$HOME/.sdkvm/current-node"
case ":$PATH:" in *":$NODE_HOME/bin:"*) ;; *) export PATH="$NODE_HOME/bin:$PATH";; esac
# <<< sdkvm node init <<<
```

The variables point at the link. Later `use` calls only retarget that link, and a new terminal reads the new value.

On Windows the four `current-*` entries are junctions. `use` writes user environment variables as `REG_EXPAND_SZ` and keeps `%VAR%` references, which avoids the 1024-character `setx` truncation. PATH gains `%JAVA_HOME%\bin`, `%GO_HOME%\bin`, and `%FLUTTER_HOME%\bin`. The Windows Node.js archive has no `bin/` directory, so its PATH entry is `%NODE_HOME%` itself. Open a new terminal or restart the IDE.

## Configuration

### Config file

Path: `~/.sdkvm/config.json`. A corrupt file is renamed to `config.json.bak` and replaced with defaults.

```json
{
  "version": 1,
  "defaultVendor": "temurin",
  "mirror": {
    "temurin": "https://mirrors.nju.edu.cn/adoptium",
    "golang": "https://golang.google.cn/dl",
    "flutter": "https://mirror.nju.edu.cn/flutter/flutter_infra_release",
    "nodejs": "https://mirror.nju.edu.cn/nodejs-release"
  },
  "npmRegistries": {
    "myprivate": "http://xxx/registry/"
  }
}
```

| Field | Meaning | Default |
|---|---|---|
| `version` | Schema version | `1` |
| `defaultVendor` | Java distribution used when the vendor prefix is omitted | `"temurin"` |
| `mirror` | Vendor id to mirror root URL. Ids are unique across SDKs | `{}` |
| `npmRegistries` | Custom npm registries from `sdkvm nrm add` | `{}` |

### Environment variables

| Variable | Meaning |
|---|---|
| `SDKVM_HOME` | Data root. Default `~/.sdkvm` |
| `SDKVM_MIRROR` | One-shot mirror. Wins over the config file and is not saved |
| `SDKVM_QUIET` | Non-empty suppresses info and warn logs |
| `SDKVM_NODE_DIST` | Node distribution root used by the install script |
| `SDKVM_RELEASE_BASE` | GitHub Release root used by the install script and `sdkvm upgrade` |
| `SDKVM_RUNTIME_NODE` | Node version bundled by the install script. Default `22.20.0` |

Mirror precedence: `SDKVM_MIRROR` > `config.mirror[<vendor>]` > official source. See [Mirrors and npm registry](#mirrors-and-npm-registry).

## Mirrors and npm registry

Two independent features:

| | `sdkvm mirror` | `sdkvm nrm` |
|---|---|---|
| Changes | JDK / Go / Flutter / Node **install archive** URLs | **npm package** registry |
| Affects | `sdkvm … install` | `npm install` |
| Scope | Per SDK type | User-level global |

### SDK install mirrors

Prefer a built-in site per type (`use` only writes vendors for the current type; aliases: `tsinghua`→`tuna`, `ali`→`aliyun`):

```sh
sdkvm mirror use nju
sdkvm go mirror use nju
sdkvm flutter mirror use nju
sdkvm node mirror use nju
```

| Site | Java (temurin) | Go | Flutter | Node.js |
|---|---|---|---|---|
| `nju` | ✓ | ✓ | ✓ | ✓ |
| `tuna` | ✓ | — | ✓ | — (incomplete archives; not listed) |
| `aliyun` | — | ✓ | — | ✓ |
| `huawei` | — | — | — | ✓ |
| `official` | Clear this type | Clear this type | Clear this type | Clear this type |

Raw URL or one-shot override:

```sh
sdkvm go mirror set golang https://golang.google.cn/dl
SDKVM_MIRROR=https://golang.google.cn/dl sdkvm go install 1.24
```

Precedence: `SDKVM_MIRROR` > `config.mirror[<vendor>]` > official. A mirror replaces the archive URL only; metadata and checksums still come from the official API. If a mirrored download cannot fetch the official checksum source, install **fails hard**.

| Vendor | Notes |
|---|---|
| Temurin | Adoptium layout; verified against [NJU](https://mirrors.nju.edu.cn/adoptium) and [TUNA](https://mirrors.tuna.tsinghua.edu.cn/Adoptium) |
| Go | File name appended to the root; e.g. `nju` / `aliyun` |
| Flutter | Bucket-prefix replacement; verified against [NJU](https://mirror.nju.edu.cn/flutter/flutter_infra_release). Do not use `storage.flutter-io.cn` |
| Node.js | Prefix replacement; verified against [NJU](https://mirror.nju.edu.cn/nodejs-release). Do not use TUNA nodejs-release |
| Zulu, Corretto | Official CDN only; no mirror support yet |

### npm registry

```sh
sdkvm nrm use taobao   # common in China
sdkvm nrm use npm      # official
sdkvm nrm test         # latency
```

## Security

- URLs are resolved from official APIs: Adoptium, Azul Metadata, Corretto, go.dev/dl, Flutter releases, and nodejs.org/dist `index.json`. Search pages are not scraped.
- Archives are hashed with SHA-256 as they download. Go, Flutter, and Node.js (official `SHASUMS256.txt`) abort on mismatch. If a Java checksum source is unreachable: official downloads warn and continue; **mirrored downloads fail hard** so an unverifiable mirror package is never accepted.
- After extract, the tree must have a single root and the expected executable. Extraction always targets a fresh empty directory.
- Install and `sdkvm upgrade` hold `~/.sdkvm/.lock` so concurrent writers do not overwrite each other.

## FAQ

### The command is still the old version after `use`

The rc block applies in a new terminal, or after `source ~/.zshrc`. Restart the IDE. `sdkvm current` shows whether the link already moved. On Windows the registry is updated, but an open terminal keeps the old values.

### `GOROOT` / `FLUTTER_ROOT` were renamed

They are now `GO_HOME` and `FLUTTER_HOME` (aligned with `JAVA_HOME` / `NODE_HOME`). After upgrading the CLI, run `use` again for each enabled SDK, and remove leftover old variable names from the user environment (Windows registry / hand-edited rc lines).

### fish or nushell

Automatic rc writes support zsh and bash. Translate the blocks in [Switching](#switching). fish example:

```fish
set -gx JAVA_HOME $HOME/.sdkvm/current-java
set -gx GO_HOME $HOME/.sdkvm/current-go
set -gx FLUTTER_HOME $HOME/.sdkvm/current-flutter
set -gx NODE_HOME $HOME/.sdkvm/current-node
fish_add_path $JAVA_HOME/bin $GO_HOME/bin $FLUTTER_HOME/bin $NODE_HOME/bin
```

### Flutter downloads are slow or they stop

Run `sdkvm flutter mirror use nju` (or `tuna`) first. The timeout is 60 seconds with no data, so a steady slow transfer continues. Re-run `install` after a real interruption. Nothing partial is left behind.

### Install a Flutter beta

Pass the full prerelease, for example `sdkvm flutter install 3.49.0-0.1.pre`. `latest` and `3.47` resolve on stable only.

### Does a managed Node break sdkvm itself?

A script install launches the CLI with `~/.sdkvm/runtime`, so `sdkvm node use` does not affect it. An npm global install follows the `node` on `PATH`. A Node older than 18.15 can stop the CLI; `sdkvm node use 22` brings it back.

### What is the difference between `nrm` and `mirror`?

See [Mirrors and npm registry](#mirrors-and-npm-registry): `nrm` is for npm packages; `mirror` is for SDK install archives.

### Proxies

`HTTPS_PROXY` is not read. A transparent system proxy works.

### Isolate data for CI or multiple users

Set `SDKVM_HOME=/path/to/dir`. Installs, links, and config all follow that directory.

## Uninstall

npm install:

```sh
npm uninstall -g sdkvm
```

pnpm, yarn, and bun use their own global uninstall command.

A script install removes the shim and the CLI runtime. Installed SDKs stay:

```sh
rm -rf ~/.sdkvm/bin ~/.sdkvm/cli ~/.sdkvm/runtime
```

On Windows, delete `%USERPROFILE%\.sdkvm\bin\sdkvm.cmd`, plus `%USERPROFILE%\.sdkvm\cli` and `%USERPROFILE%\.sdkvm\runtime`.

After you no longer need the installed JDKs, Go, Flutter, and Node.js, remove the data directory:

```sh
rm -rf ~/.sdkvm
```

Also delete the shell blocks between `>>> sdkvm java init >>>`, `>>> sdkvm go init >>>`, `>>> sdkvm flutter init >>>`, `>>> sdkvm node init >>>` and their matching `<<< … <<<` markers.

On Windows, remove `JAVA_HOME`, `GO_HOME`, `FLUTTER_HOME`, and `NODE_HOME` from the user environment, and remove `%JAVA_HOME%\bin`, `%GO_HOME%\bin`, `%FLUTTER_HOME%\bin`, and `%NODE_HOME%` from the user PATH.

## Development

```sh
git clone https://github.com/QInJ1995/sdkvm.git && cd sdkvm
npm install
npm test
npm run typecheck
npm run build
```

`npm run build` runs tsup and writes `dist/index.js`. Try it with `node dist/index.js`.

```
src/
├── cli/       # install / use / ls / uninstall / mirror / nrm / upgrade
├── core/      # version parsing, registry, config, file lock
├── sdk/       # java / go / flutter / node: directories, env vars, version syntax
├── vendor/    # temurin / zulu / corretto / golang / flutter / nodejs, plus mirror rewrite
├── fs/        # extract, layout normalize, links
├── shell/     # rc writes, Windows registry
├── net/       # fetch, streaming download, checksums
└── ui/        # logs and progress
```

To add a language, implement `listMajors` and `resolve` under `src/vendor/`, add a type descriptor under `src/sdk/` (install directory, current link, environment variable, version syntax, binary path), and register it in `sdk/index.ts`. The install / use / ls / uninstall / mirror commands, plus rc and registry writes, follow from that registration.

## License

[MIT](./LICENSE) © QINJIN
