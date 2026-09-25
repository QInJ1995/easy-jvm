#!/bin/sh
# Install sdkvm without a pre-existing Node.js.
# Usage: curl -fsSL https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.sh | sh
set -eu

RUNTIME_NODE_VERSION="${SDKVM_RUNTIME_NODE:-22.20.0}"
NODE_DIST="${SDKVM_NODE_DIST:-https://nodejs.org/dist}"
RELEASE_BASE="${SDKVM_RELEASE_BASE:-https://github.com/QInJ1995/sdkvm/releases}"
ROOT="${SDKVM_HOME:-$HOME/.sdkvm}"
BIN_DIR="${HOME}/.local/bin"
NODE_DIST="${NODE_DIST%/}"
RELEASE_BASE="${RELEASE_BASE%/}"

os=$(uname -s)
arch=$(uname -m)
case "$os:$arch" in
  Darwin:arm64) node_os=darwin; node_arch=arm64 ;;
  Darwin:x86_64) node_os=darwin; node_arch=x64 ;;
  Linux:x86_64) node_os=linux; node_arch=x64 ;;
  Linux:aarch64|Linux:arm64) node_os=linux; node_arch=arm64 ;;
  *) echo "sdkvm: unsupported platform $os/$arch" >&2; exit 1 ;;
esac

node_name="node-v${RUNTIME_NODE_VERSION}-${node_os}-${node_arch}"
node_archive="${node_name}.tar.gz"
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

fetch() {
  url=$1
  dest=$2
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    echo "sdkvm: curl or wget is required" >&2
    exit 1
  fi
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

expect_hash() {
  file=$1
  sums=$2
  awk -v name="$file" '{
    hash = tolower($1)
    file = $2
    sub(/^\*/, "", file)
    if (hash ~ /^[0-9a-f]{64}$/ && file == name) { print hash; exit }
  }' "$sums"
}

echo "sdkvm: downloading Node.js ${RUNTIME_NODE_VERSION} (${node_os}/${node_arch})"
fetch "${NODE_DIST}/v${RUNTIME_NODE_VERSION}/${node_archive}" "$tmpdir/$node_archive"
fetch "${NODE_DIST}/v${RUNTIME_NODE_VERSION}/SHASUMS256.txt" "$tmpdir/SHASUMS256.txt"
expected=$(expect_hash "$node_archive" "$tmpdir/SHASUMS256.txt")
actual=$(sha256_of "$tmpdir/$node_archive")
if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
  echo "sdkvm: Node.js checksum mismatch" >&2
  exit 1
fi

echo "sdkvm: downloading CLI"
fetch "${RELEASE_BASE}/latest/download/sdkvm.tgz" "$tmpdir/sdkvm.tgz"
fetch "${RELEASE_BASE}/latest/download/SHA256SUMS" "$tmpdir/SHA256SUMS"
expected=$(expect_hash "sdkvm.tgz" "$tmpdir/SHA256SUMS")
actual=$(sha256_of "$tmpdir/sdkvm.tgz")
if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
  echo "sdkvm: CLI checksum mismatch" >&2
  exit 1
fi

mkdir -p "$ROOT/runtime" "$BIN_DIR"
rm -rf "$ROOT/runtime/$node_name"
tar -xzf "$tmpdir/$node_archive" -C "$ROOT/runtime"
ln -sfn "$node_name" "$ROOT/runtime/current"

rm -rf "$ROOT/cli.next"
mkdir -p "$ROOT/cli.next"
tar -xzf "$tmpdir/sdkvm.tgz" -C "$ROOT/cli.next"
rm -rf "$ROOT/cli"
mv "$ROOT/cli.next/package" "$ROOT/cli"
rm -rf "$ROOT/cli.next"

cat > "$BIN_DIR/sdkvm" <<EOF
#!/bin/sh
ROOT="\${SDKVM_HOME:-$ROOT}"
exec "\$ROOT/runtime/current/bin/node" "\$ROOT/cli/dist/index.js" "\$@"
EOF
chmod +x "$BIN_DIR/sdkvm"

echo "sdkvm: installed to $BIN_DIR/sdkvm"
echo "sdkvm: runtime $ROOT/runtime/current (isolated from sdkvm node use)"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "sdkvm: add to your shell profile: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac
