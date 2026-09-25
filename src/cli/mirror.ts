import { loadConfig, saveConfig } from '../core/config.js';
import { log } from '../ui/log.js';
import { SdkvmError } from '../util/errors.js';
import { allVendorIds } from '../vendor/index.js';
import type { SdkTypeId } from '../sdk/types.js';
import { cmdPath } from './cmdname.js';
import {
  availableSiteNamesForType,
  findMirrorSite,
  formatMirrorListLine,
  listMirrorSitesForType,
  matchMirrorSiteName,
  mirrorableVendors,
  siteVendorsForType,
  type MirrorVendorId,
} from './mirror-presets.js';

function mirrorableIds(type: SdkTypeId): MirrorVendorId[] {
  return [...mirrorableVendors(type)];
}

function firstMirrorable(type: SdkTypeId): MirrorVendorId | '' {
  return mirrorableVendors(type)[0] ?? '';
}

export function mirrorCommand(
  type: SdkTypeId,
  action: string | undefined,
  arg1: string | undefined,
  arg2: string | undefined,
): void {
  const config = loadConfig();
  const mirrorable = mirrorableIds(type);
  const first = firstMirrorable(type);
  const prefix = cmdPath(type);

  if (action === 'ls' || action === 'list') {
    const matched = matchMirrorSiteName(type, config.mirror);
    for (const site of listMirrorSitesForType(type)) {
      let detail: string;
      if (site.name === 'official') {
        detail = '(official source)';
      } else {
        const scoped = siteVendorsForType(site, type);
        detail = Object.entries(scoped)
          .map(([id, url]) => (mirrorable.length === 1 ? url! : `${id}=${url}`))
          .join(' ');
      }
      log.raw(formatMirrorListLine(site.name, detail, matched === site.name));
    }
    if (matched == null) {
      const parts = mirrorable.map((id) => {
        const url = config.mirror[id];
        return url ? `${id}=${url}` : `${id}=(official)`;
      });
      log.raw(formatMirrorListLine('custom', parts.join(' '), true));
    }
    return;
  }

  if (action === 'use') {
    const name = arg1;
    if (!name) {
      throw new SdkvmError(`usage: ${prefix} mirror use <site>`, {
        hint: `Available: ${availableSiteNamesForType(type).join(', ')}`,
      });
    }
    const site = findMirrorSite(name);
    if (!site || (site.name !== 'official' && Object.keys(siteVendorsForType(site, type)).length === 0)) {
      throw new SdkvmError(`Unknown or unsupported mirror site "${name}" for ${type}`, {
        hint: `Available: ${availableSiteNamesForType(type).join(', ')}`,
      });
    }

    if (site.name === 'official') {
      for (const id of mirrorable) {
        delete config.mirror[id];
      }
      saveConfig(config);
      log.ok(`mirror for ${type} → official`);
      return;
    }

    const scoped = siteVendorsForType(site, type);
    const changed: string[] = [];
    for (const [id, url] of Object.entries(scoped) as [MirrorVendorId, string][]) {
      config.mirror[id] = url;
      changed.push(`${id} → ${url}`);
    }
    saveConfig(config);
    log.ok(`mirror site ${site.name}: ${changed.join('; ')}`);
    return;
  }

  if (action === 'current') {
    const matched = matchMirrorSiteName(type, config.mirror);
    if (matched === 'official') {
      log.raw(`official → (no mirror)`);
      for (const id of allVendorIds(type)) {
        log.raw(`  ${id.padEnd(8)} (official)`);
      }
      return;
    }
    if (matched) {
      const site = findMirrorSite(matched)!;
      const scoped = siteVendorsForType(site, type);
      const firstUrl = Object.values(scoped)[0] ?? '';
      log.raw(`${matched} → ${firstUrl}`);
    } else {
      log.raw('custom →');
    }
    for (const id of allVendorIds(type)) {
      const url = config.mirror[id];
      log.raw(`  ${id.padEnd(8)} ${url ?? '(official)'}`);
    }
    return;
  }

  // <cmd> mirror set [vendor] <url> / unset [vendor] / show
  if (action === 'set') {
    let vendor: string;
    let url: string | undefined;
    if (arg2 !== undefined) {
      vendor = arg1 ?? '';
      url = arg2;
    } else {
      vendor = first;
      url = arg1;
    }
    if (!url) throw new SdkvmError(`usage: ${prefix} mirror set [vendor] <url>`);
    if (!mirrorable.includes(vendor as MirrorVendorId)) {
      throw new SdkvmError(`mirroring is only supported for ${mirrorable.join(', ') || 'none'} (got "${vendor}")`, {
        hint: first
          ? `recommended: ${prefix} mirror use nju  (or set URL: ${prefix} mirror set ${first} <url>)`
          : undefined,
      });
    }
    try {
      new URL(url);
    } catch {
      throw new SdkvmError(`invalid URL: ${url}`);
    }
    config.mirror[vendor] = url.replace(/\/+$/, '');
    saveConfig(config);
    log.ok(`mirror for ${vendor} → ${config.mirror[vendor]}`);
    return;
  }

  if (action === 'unset') {
    const vendor = arg1 ?? first;
    if (!mirrorable.includes(vendor as MirrorVendorId)) {
      throw new SdkvmError(`mirroring is only supported for ${mirrorable.join(', ') || 'none'}`);
    }
    delete config.mirror[vendor];
    saveConfig(config);
    log.ok(`mirror for ${vendor} cleared (official source)`);
    return;
  }

  // show / 无参数
  if (action !== undefined && action !== 'show') {
    throw new SdkvmError(`unknown mirror action "${action}"`, {
      hint: `usage: ${prefix} mirror ls|use|current|show|set|unset`,
    });
  }

  const matched = matchMirrorSiteName(type, config.mirror);
  log.raw(`mirrors${matched ? ` (${matched})` : ''}:`);
  for (const id of allVendorIds(type)) {
    const url = config.mirror[id];
    log.raw(`  ${id.padEnd(8)} ${url ?? '(official)'}`);
  }
  if (first) {
    log.raw(`list sites: ${prefix} mirror ls`);
    log.raw(`use a site: ${prefix} mirror use nju`);
  }
}
