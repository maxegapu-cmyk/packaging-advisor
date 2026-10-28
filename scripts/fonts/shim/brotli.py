"""
A stand-in for the `brotli` Python module, for machines without it: compresses and decompresses
through Node's built-in zlib (Node 18+). Only what fontTools' WOFF2 writer and reader call.
"""
import subprocess

MODE_GENERIC, MODE_TEXT, MODE_FONT = 0, 1, 2

_JS = r"""
const zlib = require('zlib');
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  const buf = Buffer.concat(chunks);
  const [op, mode] = process.argv.slice(1);
  const out = op === 'c'
    ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_MODE]: +mode, [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_LGWIN]: 22, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
    : zlib.brotliDecompressSync(buf);
  process.stdout.write(out);
});
"""


def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0):
    return subprocess.run(["node", "-e", _JS, "c", str(mode)], input=bytes(data), capture_output=True, check=True).stdout


def decompress(data):
    return subprocess.run(["node", "-e", _JS, "d", "0"], input=bytes(data), capture_output=True, check=True).stdout


class error(Exception):
    pass
