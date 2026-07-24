# Nautica — Master Brief (ETHGlobal Lisbon 2026)

Kondensiert aus der Recherche-KB (Files 01–11) am 24.07.2026, abends. Team: **A (carluzh)** = Story/Pitch/UI/Brand + World-Testing-Dokus; **C** = Senior-Solidity/DeFi-Dev. Deadline **So 26.07. 09:00 WEST (hart)**, Hacking-Start Fr ~21:00.

> Offen zum Zeitpunkt der Extraktion: Ein laufender Recherche-Workflow liefert noch **Markttyp-Entscheid (LMSR vs. Alternativen), Verteidigungs-System (Stake/Dispute/Slashing mit Zahlen), dritter Sponsor-Slot, End-to-End-Architektur + 36h-Stundenplan + Demo-Drehbuch**. Wird nach Fertigstellung hier ergänzt.

---

## 1. Die Idee (final, verbindlich)

**Nautica** = Plattform, die Menschen incentiviert, Informationen aus realen meeresgebundenen Räumen zu sammeln und zu teilen. Zweischneidige Value Proposition:

1. **Risiko-Seite:** Prediction Markets auf marine Ereignisse (z. B. „Physalia/Portugiesische-Galeere-Meldung an Strand X vor Datum Y?"), die sich **durch die eigenen verifizierten Funde der Plattform** auflösen — das ist gewollt und der Incentive-Motor: Ein Spotter kann sich positionieren und dann per verifiziertem Fund den Markt auflösen (Informationsvorsprung → Geld). Hedger = Küstenbetriebe (Strandrestaurants, Liegenvermieter, Tauchschulen, Fischer), die sich gegen Wohlfahrtsverluste absichern; Underwriter tragen das Risiko gegen Prämie.
2. **Citizen-Science-Seite:** Alle Funde + Markt-Wahrscheinlichkeiten werden **öffentlich** dargestellt (Forschungs-Feed, GBIF-kompatible Haltung). Extern interessant für Staat/NGOs als Geldgeber.

**Roadmap (Pitch-Folie, nicht bauen):** Erweiterung auf weitere Spezies · Korallen/Seegras/Verschmutzung tracken · Strandsäuberungen incentivieren (Vorher/Nachher-Verifikation hat eigene Betrugsvektoren).

**Ehrlicher Neuheits-Claim:** „Wir kombinieren zwei bewiesene Modelle — bezahlte marine Frühwarnung (Shark Spotters) und bezahlte Taucher-Leistung (Lionfish-Bounties) — mit einem Risikomarkt, in einem Feld, wo das niemand tut." NICHT behaupten, bezahlte Quallen-Sichtung existiere bereits (tut sie nirgends).

---

## 2. Design-Regeln (aus Recherche, verbindlich)

1. **Oracle-Trennung:** Märkte lösen sich primär über offizielle Quellen auf (IPMA/GelAvista, NDBC-Bojen); Plattform-Funde nur sekundär, mit Dispute-Fenster + Stake. Wer in einem Markt handelt, ist nicht zugleich der auflösende Melder (Verzögerung + unabhängige Bestätigung). Pitch: „Wir sind bewusst nicht das alleinige Oracle."
2. **Anti-Hoarding:** Erstmelde-Bounty muss attraktiver sein als der Handels-Edge aus Zurückhalten — sonst incentiviert der Markt verspätete Warnungen.
3. **Underwriter-Kaltstart offen deklarieren:** Am Demo-Tag stellt das Team die Gegenseite (wie jeder junge Versicherungsmarkt). Vorbereitete Q&A-Antwort.
4. **Regulatorik:** Für den Hackathon egal (Testnet + Disclaimer). Ereigniswahl neutral/positiv (Schwellen, Ankünfte); Quallen = Belästigung, nicht Katastrophe (umgeht die Wildfire-Kontroverse Juli 2026).
5. **Framing:** Hedger-first („sichere deine Saison ab"), keine Wett-Sprache. Verifizierte Zahlen als Anker: Katalonien ~422 M€/Jahr Wohlfahrtsverlust durch Quallenblüten (Modellschätzung! so kennzeichnen), 3,20 €/Strandbesuch Zahlungsbereitschaft, Physalia-Strandschließungen Portugal März 2025, GelAvista >12.300 Meldungen, Lionfish >195.000 Fische, Shark Spotters 43 Angestellte/70 % Stadt-finanziert.
6. **Daten offen:** Funde + Wahrscheinlichkeiten öffentlich, GBIF-kompatibel — stärkt Forschungs-Glaubwürdigkeit + Staat/NGO-Winkel.
7. **Auflösung durch eigene Funde = gewollt.** Fälschungsrisiko gemanagt durch: AI-Einzelbild-Fälschungsprüfung auf 0G, World-ID-Access-Gating, Dispute-Logic + Staking (evtl. Slashing — NIE Auto-Slash allein auf AI-Score, Detektoren real-world <50 % genau).

---

## 3. Demo-Kern (36h-Schnitt, 1:1 fix)

Klein halten: **Ein kompletter Markt-Lebenszyklus + eine verifizierte Meldung mit Payout.**
1. Markt live: „Physalia-Meldung an Strand X vor Datum Y?" (Auflösungsregel + Quelle im Contract-Event fixiert).
2. Hedger (Tauchschule) kauft Absicherung; Underwriter-Seite deklariert vom Team gestellt.
3. World-ID-verifizierter Spotter reicht Foto ein (Bühnen-Requisit/kuratierte Fotos; KI-Klassifizierung/Fälschungsprüfung auf 0G).
4. Fund + offizielle Quelle → Markt löst auf (Zeit gerafft, ehrlich gelabelt), Payouts fließen sichtbar, Erstmelde-Bounty an Spotter.
5. Citizen-Science-Screen: dieselbe Meldung als offener Datenpunkt.
Alles andere (Pokédex, Dashboards, weitere Arten, Strandsäuberung) = erzählt/Roadmap.

---

## 4. Sponsor-Slot-Wahl (max. 3 Slots pro Submission)

- **World** (FIX, 1 Slot, 2 Track-Eligibilities = $7k adressiert): Trading gated hinter **FaceID/Selfie Check** ($3.5k), Funde-Abgabe gated hinter **PassportID/Identity Check** ($3.5k). Begründungslogik: stärkere Prüfung für die mächtigere Aktion. Load-bearing (ohne Sybil-Schutz sind Bounty + Markt gratis angreifbar). Pflicht: Testing-Doku beider Credentials (A, ≥10 Floor-Tests), Datenminimierung, Attribut-Begründung. Vorbehalt: Beta; ob Selfie Check eine einmalige Orb-Registrierung voraussetzt → am Booth klären.
- **0G** (FIX, $6k Best AI Product): Fund-Foto-Fälschungsprüfung als Inferenz auf 0G Compute mit Proof (Qwen3-VL 30B live; Bild-Input-Testcall = Kill-Test #1; Fallback lokal BioCLIP). „Verifiable research agent" ist Wunsch-Beispiel im Track-Text.
- **Dritter Slot: OFFEN** (Workflow-Ergebnis ausstehend). Kandidaten: The Graph (Subgraph über Märkte/Funde + Risk-Agent; „Risk-Monitoring" wörtlich im Track-Text; Studio-Dev-Endpoint reicht), Uniswap ($7k Any-Token-Prämienzahlung als Kern-Execution; Pflicht FEEDBACK.md + Form), Hedera/ENS/1inch (nachrangig).
- Chain: 0G-Track verlangt nur 0G-**Compute**, nicht die 0G-Chain → Contracts können auf **Base** liegen (dort laufen Graph Studio, Uniswap API, World-On-Chain-Verify).

---

## 5. Alle Sponsor-Tracks — Referenz ($88k, verifiziert 23.07.)

| Sponsor | Track | Pot | Typ |
|---|---|---|---|
| 1inch | Build an Aqua App | $5.000 | Classic |
| 1inch | Aqua App (Continuity) | $2.000 | Continuity |
| The Graph | Best AI Tooling | $7.000 | Classic |
| The Graph | Best AI Use Case | $4.000 | Classic |
| The Graph | Composable/Standardized Products | $4.000 | Classic |
| World | AgentKit New Use Cases | $8.000 | Classic |
| World | Selfie Check Beta | $3.500 | Classic |
| World | Identity Check Beta | $3.500 | Classic |
| Hedera | AI & Agentic Payments | $6.000 | Classic |
| Hedera | Tokenization (HTS) | $3.000 | Classic |
| Hedera | No Solidity (SDK-only) | $3.000 | Classic |
| Hedera | Cross-Chain Automation | $2.000 | Classic |
| Hedera | Autonomous Automation (Continuity) | $1.000 | Continuity |
| 0G | Best AI Product | $6.000 | Classic |
| 0G | Best Infra & Tooling | $4.500 | Classic |
| 0G | Keep Building (Continuity) | $4.500 | Continuity |
| Uniswap Fdn | Best Uniswap API Integration | $7.000 | Classic |
| Uniswap Fdn | Stack Contribution (Continuity) | $3.000 | Continuity |
| Sui | Best New App on Sui | $4.000 | Classic |
| Sui | Integration/Port (Continuity) | $2.000 | Continuity |
| ENS | Most Creative Use | $1.500 | Classic |
| ENS | Best AI Agent Integration | $1.500 | Classic |
| ENS | Continuity Integration | $2.000 | Continuity |

**Regeln:** Max. **3 Partner-Prizes pro Submission**; ein Multi-Track-Sponsor = 1 Slot mit Eligibility für alle seine Tracks. Continuity-Tracks = separate Schiene, für frischen Classic-Build tabu. Classic muss während des Hackathons gestartet werden; kein projektspezifischer Alt-Code/Assets.

---

## 6. Judging & Logistik

- **Format:** 7 Min/Team = **4 Min Demo + 3 Min Q&A**. Partner-Judging läuft NUR über Submission-Material (Texte + 2–4-Min-Video), nicht über Booth-Demos.
- **Offizielle Kriterien:** Technicality, Originality, Practicality, Usability (UI/UX/DX), WOW Factor.
- **Finals:** Top 10, Live-Präsentation auf der Bühne. Finalist-Pack (Cannes-Referenz ~$3.3k/Kopf, Lisbon nicht publiziert).
- **Ort/Zeit:** Pavilhão Carlos Lopes, Lissabon. Submission **So 09:00 WEST hart** (keine Late Submissions). Hacking ~Fr 21:00 → So 09:00 (~36h).
- **Workshops Fr:** 0G 14:30 · Uniswap 15:00 · Graph 15:30 · Sui 16:00 · World 16:30 · Hedera 17:00 · 1inch 17:30.
- **Submission-Pflichten:** public Repo, inkrementelle Commits (kein Single-Commit), AI-Attribution im README, Video 2–4 Min echte Narration (keine KI-Stimme/Speed-up); World: 2 Testing-Dokus; Uniswap (falls Slot): FEEDBACK.md + Feedback-Form; genau 3 Partner-Prizes ankreuzen.

---

## 7. Verifizierte Tech-Fakten & bekannte Fallen

- **0G Compute:** Qwen3-VL 30B live (Bild-Input unbestätigt → Testcall Kill-Test #1). Faucet nur 0,1 OG/Tag vs. 3 OG Min-Deposit + 1 OG/Provider → heute am Booth/Discord Tokens anfragen. Auth-Header single-use, 30 req/min, 5 concurrent, Node ≥22, nur serverseitig, Browser-SDK ohne Auto-Funding. Galileo-Testnet schon mal mit neuer Chain-ID resettet. Fallback: lokal BioCLIP 2 (MIT, open_clip, CPU-tauglich) + 0G-Chat-LLM verifiziert BioCLIP-Text.
- **Duplikat/Fake:** pHash (`imagehash`/`sharp-phash`) gegen Bestand; AI-Fake-Detektor nur Ensemble-Signal, NIE Auto-Slash (13–40 % False Positives auf echten Fotos).
- **World ID:** Simulator nur mit Staging-App-ID; Test-Action ohne max_verifications-Limit (sonst Team-Nullifier verbrannt); signal/action byte-identisch FE↔BE; Cloud-Verify oder On-Chain-Verify auf Base (Nullifier für Position-Caps).
- **Foto/GPS:** iOS-Browser-Kamera strippt ALLE EXIF; GPS via `navigator.geolocation` + Server-Zeit, nie aus EXIF, nie Client-Angabe trauen (Mock-Location trivial). Handy geht NICHT ins Wasser → Kamera separat, App = Post-Dive-Import.
- **Datenquellen (Auflösung):** NDBC-Bojen (ndbc.noaa.gov/data/realtime2/<id>.txt, stündlich, public domain), Open-Meteo Marine (SST/Wellen, kein Key), IPMA (Portugal-Lokalbezug), GelAvista (Quallen-Meldungen). GBIF/OBIS = Tage-Latenz, nicht zeitkritisch nutzbar.
- **Markttyp:** OFFEN (Workflow). Anforderungen: (R1) immer lesbare Quote/Wahrscheinlichkeit, (R2) keine externen MMs/LPs. Arbeitshypothese LMSR (Quote = Preis, Operator-Subvention begrenzt+bekannt = zugleich das Fund-Incentive). Parimutuel erfüllt R1 nur schwach (Quote erst am Ende). Details folgen aus Workflow.
- **The Graph (falls Slot):** Studio-Dev-Endpoint (100k Queries/Monat frei), startBlock = Deploy-Block, Schema früh einfrieren; dezentrales Publish NICHT nötig.

---

## 8. Q&A-Vorbereitung (härteste Fragen)

1. „Eure Nutzer lösen eure Märkte auf — Manipulation?" → Oracle-Trennung (offizielle Quelle primär), Dispute-Fenster + Stake, Handel ≠ auflösender Melder.
2. „Wer ist die Gegenseite?" → deklarierter Kaltstart + Risikoprämie + Präzedenz Versicherungsmärkte.
3. „Ist das legal?" → Testnet heute, Kalshi (CFTC, inkl. Wettermärkte) als Legalisierungspfad, Lizenz-Roadmap.
4. „Warum meldet jemand, statt erst zu handeln?" → Erstmelde-Bounty > Handels-Edge.
5. „Warum Blockchain?" → Treuhand ohne Versicherer, automatische Auslösung, sofortige grenzenlose Payouts, 1-Mensch-1-Konto, offener auditierbarer Datensatz.

---

## 9. Kill-Tests heute Abend (vor Produktivcode)

1. **0G Bild-Input-Testcall** an Qwen3-VL (entscheidet 0G-Slot vs. lokaler Fallback) + Testnet-Token beschaffen.
2. **Datenquellen** IPMA/GelAvista/NDBC einmal end-to-end fetchen; exakte Auflösungsregel (Quelle, Parameter, Rundung, URL) fixieren.
3. **World-Booth:** Selfie/Identity-Beta-Zugang + Orb-Voraussetzung klären; Test-Action ohne Verifications-Limit anlegen.
4. **Markttyp-Entscheid** (aus Workflow) + Contract-Startpunkt (Gnosis LMSR-Port / PRBMath).
5. **Chain fixieren** (voraussichtlich Base/Base-Sepolia).
