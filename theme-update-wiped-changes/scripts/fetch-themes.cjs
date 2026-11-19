const fs = require('fs');
const crypto = require('crypto');
(async () => {
  for (const line of fs.readFileSync('vendor/SHA256SUMS', 'utf8').trim().split('\n')) {
    const [expected, path] = line.split(/\s+/);
    const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    if (fs.existsSync(path) && hash(fs.readFileSync(path)) === expected) {
      console.log(`Verified cached ${path}`);
      continue;
    }
    const response = await fetch(`https://downloads.wordpress.org/theme/${path.split('/').pop()}`, {signal: AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error(`Theme download returned ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== expected) throw new Error(`Checksum mismatch: ${path}`);
    fs.writeFileSync(path, bytes);
    console.log(`Downloaded and verified ${path}`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
