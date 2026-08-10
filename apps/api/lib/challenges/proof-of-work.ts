import { createHash } from "node:crypto";

import type { ChallengeRecord } from "@trustcaptcha/captcha-core";

export function verifyProofOfWork(
  record: ChallengeRecord,
  nonce: string | undefined,
): boolean {
  if (!record.proofOfWork) return true;
  if (!nonce || !/^[0-9a-z]{1,16}$/.test(nonce)) return false;

  const digest = createHash("sha256")
    .update(`${record.id}.${record.proofOfWork.salt}.${nonce}`)
    .digest();
  return hasLeadingZeroBits(digest, record.proofOfWork.difficulty);
}

export function hasLeadingZeroBits(
  digest: Uint8Array,
  difficulty: number,
): boolean {
  if (!Number.isInteger(difficulty) || difficulty < 0) return false;
  let remaining = difficulty;
  for (const byte of digest) {
    if (remaining === 0) return true;
    const bits = Math.min(8, remaining);
    if (byte >> (8 - bits) !== 0) return false;
    remaining -= bits;
  }
  return remaining === 0;
}
