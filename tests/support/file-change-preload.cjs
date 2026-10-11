const fs = require('node:fs');
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');
const config = JSON.parse(process.env.FILE_CHANGE_FAULTS);
const original = { ...fs };
const descriptors = new Map();
const hits = new Map();
const counts = new Map();
let inside = false;
if (config.processProbe === 'denied') {
  const kill = process.kill;
  process.kill = (pid, signal) => {
    if (signal === 0) throw Object.assign(new Error('fixture permission denied'), { code: 'EPERM' });
    return kill(pid, signal);
  };
}

function directoryUnchanged(directory, identity) {
  const entry = original.lstatSync(directory);
  if (!entry.isDirectory() || entry.dev !== identity.dev || entry.ino !== identity.ino) throw new Error('File-change control directory changed.');
}

function checkControls() {
  directoryUnchanged(config.home, config.homeIdentity);
  directoryUnchanged(config.control, config.controlIdentity);
}

function exclusiveWrite(file, bytes) {
  checkControls();
  const fd = original.openSync(file, 'wx', 0o600);
  try { original.writeFileSync(fd, bytes); } finally { original.closeSync(fd); }
}

function match(rule, event) {
  if (rule.operation !== event.operation || rule.edge !== event.edge) return false;
  if (rule.after && !hits.has(rule.after)) return false;
  if ('path' in rule.target && rule.target.path !== event.path) return false;
  if ('parent' in rule.target && rule.target.parent !== path.dirname(event.path)) return false;
  if ('sourceOf' in rule.target && hits.get(rule.target.sourceOf)?.from !== event.path) return false;
  if (rule.flags && rule.flags !== event.flags) return false;
  if (rule.sourceKind && rule.sourceKind !== event.sourceKind) return false;
  if (rule.exists && !original.existsSync(rule.exists)) return false;
  return true;
}

function cut(event) {
  if (!event.path || !event.path.startsWith(config.home + path.sep)) return;
  for (const [index, rule] of config.faults.entries()) {
    if (hits.has(rule.name) || !match(rule, event)) continue;
    const seen = (counts.get(rule.name) || 0) + 1;
    counts.set(rule.name, seen);
    if (seen !== (rule.occurrence || 1)) continue;
    const hit = { name: rule.name, ...event };
    hits.set(rule.name, hit);
    const temporary = path.join(config.control, `.hit-${index}.tmp`);
    exclusiveWrite(temporary, JSON.stringify(hit));
    checkControls();
    original.renameSync(temporary, path.join(config.control, `hit-${index}.json`));
    switch (rule.action.kind) {
      case 'kill': process.kill(process.pid, 'SIGKILL'); break;
      case 'throw': throw new Error(rule.action.message);
      case 'pause': {
        const until = Date.now() + config.timeout;
        const cell = new Int32Array(new SharedArrayBuffer(4));
        const release = path.join(config.control, `release-${index}`);
        while (!original.existsSync(release)) {
          checkControls();
          if (Date.now() > until) throw new Error(`File-change barrier timed out at ${rule.name}.`);
          Atomics.wait(cell, 0, 0, 10);
        }
        checkControls();
        if (!original.lstatSync(release).isFile()) throw new Error('File-change release is not a regular file.');
        break;
      }
      default: throw new Error('Unknown file-change action.');
    }
  }
}

function filename(value) {
  return typeof value === 'number' ? descriptors.get(value) : typeof value === 'string' ? path.resolve(value) : undefined;
}

function invoke(operation, args, event) {
  if (inside) return original[operation](...args);
  inside = true;
  try {
    cut({ ...event, edge: 'before' });
    const result = original[operation](...args);
    if (operation === 'openSync' && event.path) descriptors.set(result, event.path);
    cut({ ...event, edge: 'after' });
    return result;
  } finally { inside = false; }
}

fs.openSync = (...args) => invoke('openSync', args, { operation: 'open', path: filename(args[0]), flags: args[1] });
fs.writeFileSync = (...args) => invoke('writeFileSync', args, { operation: 'write', path: filename(args[0]) });
fs.writeSync = (...args) => invoke('writeSync', args, { operation: 'write', path: filename(args[0]) });
fs.renameSync = (...args) => {
  const from = filename(args[0]);
  const sourceKind = from && original.lstatSync(from).isSymbolicLink() ? 'link' : 'file';
  return invoke('renameSync', args, { operation: 'rename', path: filename(args[1]), from, sourceKind });
};
for (const operation of ['unlinkSync', 'rmSync', 'rmdirSync']) {
  fs[operation] = (...args) => invoke(operation, args, { operation: 'delete', path: filename(args[0]) });
}
fs.closeSync = (...args) => {
  const result = original.closeSync(...args);
  descriptors.delete(args[0]);
  return result;
};
syncBuiltinESMExports();
