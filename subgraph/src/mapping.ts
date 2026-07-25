import { BigInt, BigDecimal, Bytes, Address, log } from "@graphprotocol/graph-ts";
import {
  SightingRecorded,
  PayoutSettled,
  PlayerRegistered,
} from "../generated/NauticaQuests/NauticaQuests";
import { Global, Player, Sighting, Attestation, Activity } from "../generated/schema";
import { decodeQuestId, questMeta } from "./registry";
import { levelForXp } from "./levels";

const ZERO_BI = BigInt.zero();
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.zero();
const E6 = BigDecimal.fromString("1000000");
const SECONDS_PER_DAY = BigInt.fromI32(86400);

function loadGlobal(): Global {
  let g = Global.load("global");
  if (g == null) {
    g = new Global("global");
    g.totalPlayers = 0;
    g.totalSightings = ZERO_BI;
    g.totalXp = ZERO_BI;
    g.totalUsdc = ZERO_BD;
    g.updatedAt = ZERO_BI;
  }
  return g;
}

function loadOrCreatePlayer(wallet: Address, at: BigInt): Player {
  const id = wallet.toHexString(); // lowercased wallet
  let p = Player.load(id);
  if (p == null) {
    p = new Player(id);
    p.handle = "";
    p.wallet = wallet;
    p.xp = ZERO_BI;
    p.streak = 0;
    p.lastSightingDayUTC = ZERO_BI;
    p.balanceUsd = ZERO_BD;
    p.faceVerified = false;
    p.passportVerified = false;
    p.orbVerified = false;
    p.sightingCount = 0;
    p.createdAt = at;

    const g = loadGlobal();
    g.totalPlayers = g.totalPlayers + 1;
    g.updatedAt = at;
    g.save();
  }
  return p;
}

export function handleSightingRecorded(event: SightingRecorded): void {
  const at = event.block.timestamp;
  const player = loadOrCreatePlayer(event.params.player, at);

  const sightingId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const questIdStr = decodeQuestId(event.params.questId);
  const meta = questMeta(questIdStr);

  // Attestation (0G reference carried on-chain; confidence stays off-chain).
  const att = new Attestation(sightingId);
  att.hash = event.params.attestationHash;
  att.verdict = "pass"; // only passes reach the chain
  att.label = meta.species;
  att.at = at;
  att.save();

  // int64/uint32/uint256 all arrive as BigInt; lat/lng/usdc are 1e6 fixed-point.
  const xp = event.params.xp;
  const usdc = event.params.usdc6.toBigDecimal().div(E6);
  const lat = event.params.latE6.toBigDecimal().div(E6);
  const lng = event.params.lngE6.toBigDecimal().div(E6);

  const s = new Sighting(sightingId);
  s.player = player.id;
  s.questId = questIdStr;
  s.species = meta.species;
  s.title = meta.title;
  s.xp = xp;
  s.usdc = usdc;
  s.lat = lat;
  s.lng = lng;
  s.at = at;
  s.attestation = att.id;
  s.save();

  const before = levelForXp(player.xp.toI32());
  player.xp = player.xp.plus(xp);
  const after = levelForXp(player.xp.toI32());

  // Streak by UTC day-bucket: consecutive day -> +1, same day -> unchanged, else reset.
  const day = at.div(SECONDS_PER_DAY);
  if (player.sightingCount == 0 || day.gt(player.lastSightingDayUTC.plus(ONE_BI))) {
    player.streak = 1;
  } else if (day.equals(player.lastSightingDayUTC.plus(ONE_BI))) {
    player.streak = player.streak + 1;
  }
  player.lastSightingDayUTC = day;
  player.sightingCount = player.sightingCount + 1;
  player.save();

  // Activity: the quest completion, plus a level-up entry if a boundary was crossed.
  const quest = new Activity(sightingId + "-quest");
  quest.player = player.id;
  quest.kind = "quest";
  quest.title = meta.title;
  quest.xp = xp;
  quest.species = meta.species;
  if (usdc.gt(ZERO_BD)) quest.usdc = usdc;
  quest.at = at;
  quest.save();

  if (after > before) {
    const lvl = new Activity(sightingId + "-levelup");
    lvl.player = player.id;
    lvl.kind = "levelup";
    lvl.title = "Reached Level " + after.toString();
    lvl.at = at;
    lvl.save();
  }

  const g = loadGlobal();
  g.totalSightings = g.totalSightings.plus(ONE_BI);
  g.totalXp = g.totalXp.plus(xp);
  g.updatedAt = at;
  g.save();
  // totalUsdc is accrued only at settlement (handlePayoutSettled), not here, so the
  // sighting reward and the payout aren't double-counted.
}

export function handlePayoutSettled(event: PayoutSettled): void {
  const at = event.block.timestamp;
  const player = loadOrCreatePlayer(event.params.player, at);
  const usdc = event.params.usdc6.toBigDecimal().div(E6);

  player.balanceUsd = player.balanceUsd.plus(usdc);
  player.save();

  const questIdStr = decodeQuestId(event.params.questId);
  const meta = questMeta(questIdStr);

  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-payout";
  const a = new Activity(id);
  a.player = player.id;
  a.kind = "payout";
  a.title = "Paid for " + meta.title;
  a.usdc = usdc;
  a.at = at;
  a.save();

  const g = loadGlobal();
  g.totalUsdc = g.totalUsdc.plus(usdc);
  g.updatedAt = at;
  g.save();
}

export function handlePlayerRegistered(event: PlayerRegistered): void {
  const player = loadOrCreatePlayer(event.params.player, event.block.timestamp);
  player.handle = event.params.handle;
  player.save();
  log.info("PlayerRegistered {} -> {}", [player.id, event.params.handle]);
}
