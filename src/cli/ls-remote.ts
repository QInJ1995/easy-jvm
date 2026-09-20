import { loadConfig } from '../core/config.js';
import { getVendor, resolveVendorId } from '../vendor/index.js';
import { log } from '../ui/log.js';

export async function lsRemoteCommand(opts: { vendor?: string }): Promise<void> {
  const config = loadConfig();
  const vendorId = resolveVendorId(opts.vendor, config);
  const vendor = getVendor(vendorId);
  const majors = await vendor.listMajors();
  log.raw(`# ${vendor.label}`);
    const sorted = majors.slice().sort((a, b) => b.major - a.major);
  for (const m of sorted) {
    const lts = m.lts ? ' (lts)' : '';
    const latest = m.latestFullVersion ? `  latest: ${m.latestFullVersion}` : '';
    log.raw(`  ${String(m.major).padEnd(4)}${lts}${latest}`);
  }
  if (!vendor.supportsFullVersionList) {
    log.raw('# note: this vendor has no version-list API; install resolves to the latest patch, e.g. jvm install 21');
  }
}
