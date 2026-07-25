import { BigInt, BigDecimal, Address, log } from "@graphprotocol/graph-ts";
import {
  QuestCreated,
  QuestFunded,
  SightingRecorded,
  PayoutSettled,
  PlayerRegistered,
} from "../generated/NauticaQuests/NauticaQuests";
import { Global, Player, Quest, Sighting, Attestation, Activity, SpeciesStat } from "../generated/schema";
import { decodeQuestId } from "./registry";
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

function bumpSpecies(species: string, xp: BigInt, at: BigInt): void {
  let s = SpeciesStat.load(species);
  if (s == null) {
    s = new SpeciesStat(species);
    s.species = species;
    s.count = 0;
    s.totalXp = ZERO_BI;
    s.firstSeen = at;
  }
  s.count = s.count + 1;
  s.totalXp = s.totalXp.plus(xp);
  s.lastSeen = at;
  s.save();
}

export function handleQuestCreated(event: QuestCreated): void {
  const id = decodeQuestId(event.params.questId);
  const q = new Quest(id);
  q.creator = event.params.creator;
  q.species = event.params.species;
  q.title = event.params.title;
  q.xp = event.params.xp; // uint32 -> BigInt in graph-ts
  q.usdcReward = event.params.usdcReward.toBigDecimal().div(E6);
  q.funded = event.params.funded.toBigDecimal().div(E6);
  q.createdAt = event.block.timestamp;
  q.save();
}

export function handleQuestFunded(event: QuestFunded): void {
  const id = decodeQuestId(event.params.questId);
  const q = Quest.load(id);
  if (q == null) return;
  q.funded = event.params.totalFunded.toBigDecimal().div(E6);
  q.save();
}

export function handleSightingRecorded(event: SightingRecorded): void {
  const at = event.block.timestamp;
  const player = loadOrCreatePlayer(event.params.player, at);
  const questIdStr = decodeQuestId(event.params.questId);
  const quest = Quest.load(questIdStr); // created on-chain before completion
  const species = quest ? quest.species : "Other";
  const title = quest ? quest.title : "Sighting";

  const sightingId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  const att = new Attestation(sightingId);
  att.hash = event.params.attestationHash;
  att.verdict = "pass"; // only passes reach the chain
  att.label = species;
  att.at = at;
  att.save();

  const xp = event.params.xp; // BigInt
  const usdc = event.params.usdc6.toBigDecimal().div(E6);
  const lat = event.params.latE6.toBigDecimal().div(E6);
  const lng = event.params.lngE6.toBigDecimal().div(E6);

  const s = new Sighting(sightingId);
  s.player = player.id;
  s.quest = questIdStr;
  s.questId = questIdStr;
  s.species = species;
  s.title = title;
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

  const questActivity = new Activity(sightingId + "-quest");
  questActivity.player = player.id;
  questActivity.kind = "quest";
  questActivity.title = title;
  questActivity.xp = xp;
  questActivity.species = species;
  if (usdc.gt(ZERO_BD)) questActivity.usdc = usdc;
  questActivity.at = at;
  questActivity.save();

  if (after > before) {
    const lvl = new Activity(sightingId + "-levelup");
    lvl.player = player.id;
    lvl.kind = "levelup";
    lvl.title = "Reached Level " + after.toString();
    lvl.at = at;
    lvl.save();
  }

  bumpSpecies(species, xp, at);

  const g = loadGlobal();
  g.totalSightings = g.totalSightings.plus(ONE_BI);
  g.totalXp = g.totalXp.plus(xp);
  g.updatedAt = at;
  g.save();
  // totalUsdc accrues only at settlement (handlePayoutSettled), not here.
}

export function handlePayoutSettled(event: PayoutSettled): void {
  const at = event.block.timestamp;
  const player = loadOrCreatePlayer(event.params.player, at);
  const usdc = event.params.usdc6.toBigDecimal().div(E6);

  player.balanceUsd = player.balanceUsd.plus(usdc);
  player.save();

  const questIdStr = decodeQuestId(event.params.questId);
  const quest = Quest.load(questIdStr);
  if (quest != null) {
    quest.funded = quest.funded.minus(usdc); // escrow drawn down
    quest.save();
  }

  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString() + "-payout";
  const a = new Activity(id);
  a.player = player.id;
  a.kind = "payout";
  a.title = quest ? "Paid for " + quest.title : "Payout";
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
