// RFC-TM-5 §3 (rfc-tm-5-diamond.md) — the vsix-unzip check (goal-scope IE-8)
// needs to read a .vsix's entry names and uncompressed sizes without adding a
// zip-reading dependency (per zero_runtime_deps_for_libraries /
// dep_trust_is_full_transitive_graph). A .vsix is a standard ZIP archive; the
// entries this check cares about (lsp-bundled/cli.js and both wasms) are
// vsce-written with compression method 8 (DEFLATE) and a trailing data
// descriptor (the local file header carries zeroed sizes), so sizes must come
// from the End-Of-Central-Directory-anchored central directory, not the local
// headers. `node:zlib.inflateRawSync` decodes the raw DEFLATE stream — no
// third-party zip library needed.

import { inflateRawSync } from 'node:zlib';

export interface VsixEntry {
  readonly path: string;
  readonly uncompressedSize: number;
  readonly data: Buffer;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const COMPRESSION_STORE = 0;
const COMPRESSION_DEFLATE = 8;

class VsixParseError extends Error {}

const findEndOfCentralDirectory = (buf: Buffer): number => {
  // The EOCD record is a fixed 22 bytes plus a variable-length comment (max
  // 65535 bytes) at the very end of the archive. Scan backward for its
  // signature rather than assuming a comment-free file.
  const minOffset = Math.max(0, buf.length - 22 - 65535);
  for (let offset = buf.length - 22; offset >= minOffset; offset -= 1) {
    if (buf.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }
  throw new VsixParseError('End of central directory record not found');
};

export const readVsixEntries = (vsixPath: string, fileContents: Buffer): VsixEntry[] => {
  const eocdOffset = findEndOfCentralDirectory(fileContents);
  const centralDirectoryOffset = fileContents.readUInt32LE(eocdOffset + 16);
  const centralDirectoryEntryCount = fileContents.readUInt16LE(eocdOffset + 10);

  const entries: VsixEntry[] = [];
  let cursor = centralDirectoryOffset;
  for (let i = 0; i < centralDirectoryEntryCount; i += 1) {
    if (fileContents.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new VsixParseError(`${vsixPath}: central directory entry ${i} has a bad signature at offset ${cursor}`);
    }
    const compressionMethod = fileContents.readUInt16LE(cursor + 10);
    const compressedSize = fileContents.readUInt32LE(cursor + 20);
    const uncompressedSize = fileContents.readUInt32LE(cursor + 24);
    const nameLength = fileContents.readUInt16LE(cursor + 28);
    const extraLength = fileContents.readUInt16LE(cursor + 30);
    const commentLength = fileContents.readUInt16LE(cursor + 32);
    const localHeaderOffset = fileContents.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const path = fileContents.toString('utf8', nameStart, nameStart + nameLength);

    const data = readEntryData(vsixPath, fileContents, localHeaderOffset, compressionMethod, compressedSize);
    entries.push({ path, uncompressedSize, data });

    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  return entries;
};

const readEntryData = (
  vsixPath: string,
  buf: Buffer,
  localHeaderOffset: number,
  compressionMethod: number,
  compressedSize: number,
): Buffer => {
  if (buf.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new VsixParseError(`${vsixPath}: local file header has a bad signature at offset ${localHeaderOffset}`);
  }
  const nameLength = buf.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buf.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = buf.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === COMPRESSION_STORE) {
    return Buffer.from(compressed);
  }
  if (compressionMethod === COMPRESSION_DEFLATE) {
    return inflateRawSync(compressed);
  }
  throw new VsixParseError(`${vsixPath}: unsupported zip compression method ${compressionMethod}`);
};
