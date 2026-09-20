import { run } from '../util/spawn.js';
import { JvmError } from '../util/errors.js';

/** PowerShell 脚本用 EncodedCommand 传递，避免引号转义问题 */
function encoded(ps: string): string[] {
  return ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')];
}

/** 写用户级 JAVA_HOME（值短，setx 无截断风险） */
export async function setJavaHomeWin(): Promise<void> {
  await run('setx', ['JAVA_HOME', '%USERPROFILE%\\.jvm\\current']);
}

/**
 * 把 %JAVA_HOME%\\bin 追加到用户 PATH。
 * 关键点：用 DoNotExpandEnvironmentNames 读原始值，保留 %VAR% 引用与 REG_EXPAND_SZ 类型
 * （.NET SetEnvironmentVariable 会把类型降级为 REG_SZ，破坏 %USERPROFILE% 类引用），
 * 最后广播 WM_SETTINGCHANGE 让 Explorer 刷新环境。
 */
export async function ensureUserPathWin(): Promise<void> {
  const ps = [
    "$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment',$true)",
    "if(-not $k){ throw 'no Environment key' }",
    "$fmt=[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames",
    "$raw=[string]$k.GetValue('Path','',$fmt)",
    "$parts=@($raw -split ';' | Where-Object { $_ -ne '' })",
    "if($parts -notcontains '%JAVA_HOME%\\bin'){",
    "  $parts += '%JAVA_HOME%\\bin'",
    "  $kind=[Microsoft.Win32.RegistryValueKind]::ExpandString",
    "  if($k.GetValueKind('Path') -eq [Microsoft.Win32.RegistryValueKind]::String){ $kind=[Microsoft.Win32.RegistryValueKind]::String }",
    "  $k.SetValue('Path', ($parts -join ';'), $kind)",
    "}",
    "$sig='[DllImport(\"user32.dll\", SetLastError=true, CharSet=CharSet.Auto)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);'",
    'Add-Type -MemberDefinition $sig -Name NativeMethods -Namespace Win32',
    '$r=[UIntPtr]::Zero',
    '[Win32.NativeMethods]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, \'Environment\', 2, 5000, [ref]$r) | Out-Null',
  ].join('\n');
  await run('powershell.exe', encoded(ps));
}

/** 卸载辅助：从用户 PATH 移除 %JAVA_HOME%\bin（不存在则忽略） */
export async function removeFromUserPathWin(): Promise<void> {
  const ps = [
    "$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment',$true)",
    "if(-not $k){ exit 0 }",
    "$fmt=[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames",
    "$raw=[string]$k.GetValue('Path','',$fmt)",
    "$parts=@($raw -split ';' | Where-Object { $_ -ne '' -and $_ -ne '%JAVA_HOME%\\bin' })",
    "$k.SetValue('Path', ($parts -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString)",
  ].join('\n');
  await run('powershell.exe', encoded(ps));
}

export function assertWindows(): void {
  if (process.platform !== 'win32') {
    throw new JvmError('This operation is Windows-only');
  }
}
