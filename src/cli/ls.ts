import { currentJdk, listInstalled } from '../core/registry.js';
import { formatVersion } from '../core/version.js';
import { allVendorIds, getVendor, resolveVendorId } from '../vendor/index.js';
import { loadConfig } from '../core/config.js';
import { toSdkvmError } from '../util/errors.js';
import { log } from '../ui/log.js';

export async function lsCommand(opts: {
  remote?: boolean;
  vendor?: string;
}): Promise<void> {
  if (opts.remote) return listRemote(opts);
  listLocal();
}

function listLocal(): void {
  const installed = listInstalled();
  if (installed.length === 0) {
    log.info('no JDK installed');
    log.info('try: jvm install lts');
    return;
  }
  const current = currentJdk();
  for (const j of installed) {
    const name = `${j.version.vendor}-${formatVersion(j.version)}`;
    const marker = current?.dirPath === j.dirPath ? '→' : ' ';
    log.raw(`${marker} ${name}`);
  }
}

/** 远程列表：并行拉取各厂商，展示行即 install 可用的名称（vendor-major） */
async function listRemote(opts: { vendor?: string }): Promise<void> {
  const config = loadConfig();
  const ids = opts.vendor ? [resolveVendorId(opts.vendor, config)] : allVendorIds();

  const sections = await Promise.all(
    ids.map(async (id) => {
      const vendor = getVendor(id);
      try {
        const majors = (await vendor.listMajors()).slice().sort((a, b) => b.major - a.major);
        return { vendor, majors };
      } catch (err) {
        // 单个厂商失败不拖垮整个列表
        log.warn(`${vendor.label}: list unavailable (${toSdkvmError(err).message})`);
        return null;
      }
    }),
  );

  for (const sec of sections) {
    if (!sec || sec.majors.length === 0) continue;
    const { vendor, majors } = sec;
    log.raw('');
    log.raw(`# ${vendor.label}`);
    const width = Math.max(...majors.map((m) => `${vendor.id}-${m.major}`.length)) + 2;
    for (const m of majors) {
      const name = `${vendor.id}-${m.major}`.padEnd(width);
      const lts = m.lts ? '(lts) ' : '';
      const latest = m.latestFullVersion ? `latest: ${vendor.id}-${m.latestFullVersion}` : '';
      log.raw(`  ${name}${lts}${latest}`.trimEnd());
    }
    if (!vendor.supportsFullVersionList) {
      const first = majors[0]!.major;
      log.raw(`  # note: no version-list API; install resolves to the latest patch, e.g. jvm install ${vendor.id}-${first}`);
    }
  }
  log.raw('');
  log.raw('# install with: jvm install <name>');
}
