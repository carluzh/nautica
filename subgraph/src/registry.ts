import { Bytes } from "@graphprotocol/graph-ts";

// The on-chain questId is bytes32 = utf8(app quest id) right-padded with 0x00
// (see server/src/services/chain.ts questIdToBytes32). decodeQuestId reverses it:
// read ASCII bytes until the first null. Species/title are NOT resolved here anymore
// - they come from the Quest entity built by handleQuestCreated.

export function decodeQuestId(raw: Bytes): string {
  let s = "";
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (b == 0) break;
    s += String.fromCharCode(b as i32);
  }
  return s;
}
