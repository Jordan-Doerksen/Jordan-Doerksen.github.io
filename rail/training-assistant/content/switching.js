// ==========================================================================
// CONTENT · SWITCHING — the yard/switching rules (CROR 104–115), cited
// (trust:rulebook). Bodies are faithful condensations / quotes of the operative
// clauses; the citation points to the full rule. Site-specific numbers (kick
// tonnage, kickable tracks, yard speed) live in SPECIAL INSTRUCTIONS — verify
// those with the S.I. + an SME / firsthand, don't assume. Source: CROR Jan 28 2025.
// ==========================================================================

const SRC = 'Canadian Rail Operating Rules — Jan 28, 2025';
const S = (id, rule, title, body, tags = [], related = [], extra = {}) =>
  ({ id, domain: 'switching', ref: 'CROR ' + rule, source: SRC, trust: 'rulebook', title, body, tags, related, ...extra });

export const switching = [
  S('sw-104', '104', 'Hand Operated Switches',
    'Except while being turned, each switch must be secured with an approved device. When a switch has been turned, the points must be examined and the target, reflector or light (if any) observed to ensure it is properly lined for the route to be used. A switch must not be turned while any part of a car or engine is between the switch points and the fouling point of the track to be used — except when making a running switch or in the application of the Rule 114 exception. Unless special instructions specify otherwise, the normal position for a main track switch is the main route; main track switches must be left lined and locked in normal position (except as allowed in 104(i)). When a movement diverges from a main track, the switch must not be restored to normal until the fouling point has been cleared.',
    ['switch', 'switching'], ['def-switch', 'sw-114'],
    { detail: 'Crossover (n): both ends are normal when set for a through move on the other tracks; reverse the switch on the standing track first, reverse both before crossing over, and don\'t restore either until clear of the crossover. (j) Except when switching, keep at least 20 feet from the switch stand when a movement is closely approaching/passing a main track switch.' }),

  S('sw-104-1', '104.1', 'Spring Switches',
    'Identified by a spring switch sign bearing "SS". When trailing through a spring switch, a movement that stops must not be reversed, nor slack taken, until the switch has been properly set by hand. In ice/snow, stop before trailing through and examine/clean the points. Operating over a spring switch in the facing-point direction at RESTRICTED speed: stop before the leading wheels are on the points and examine the points from the ground.',
    ['switch', 'switching'], ['def-switch-spring']),

  S('sw-104-2', '104.2', 'Dual Control Switches',
    'A dual control switch must not be placed in hand position without permission from the RTC or signalman. To operate over one under a Stop indication (unless relieved): place the selector lever in "hand", operate the hand-throw lever until the points move in both directions, and line by hand for the route — restoring the selector to "power" and locking it only after the movement has occupied the switch points.',
    ['switch', 'switching'], ['def-switch-dual-control']),

  S('sw-104-3', '104.3', 'Power-Operated Switches at a Stop Signal',
    'When the crew of a movement is authorized to pass a stop signal to move over a power-operated switch, a crew member must observe that the switch points are lined for the authorized route.',
    ['switch', 'signals'], ['sw-104-2', 'sw-104-4']),

  S('sw-104-4', '104.4', 'Semi-Automatic Switches',
    'Equipped with reflectorized targets (diamond-shaped). Movements operating in a facing-point direction must observe the position of the points in addition to the target before proceeding. After coupling to equipment at such a switch, or when reversing direction through it, a facing-point move must not be made unless one unit of equipment has trailed entirely through the switch, or it is known the points are properly lined.',
    ['switch', 'switching'], ['def-switch-semi-automatic']),

  S('sw-104-5', '104.5', 'Derails',
    'A movement or track unit must stop short of a derail set in the derailing position. Each derail — other than a Special Derail or a Blue Flag Derail — must be left in the derailing position. All derails must be left secured with a locking device. Where hand operated switch point derails are used, examine the points and observe the target to ensure the derail is in the proper position.',
    ['switch', 'switching', 'securing']),

  S('sw-105', '105', 'Operation on Non-Main Track',
    'Unless otherwise provided by signal indication, a movement using non-main track must operate at REDUCED speed and be prepared to stop short of the end of track or the red signal prescribed by Rule 41. Unless otherwise provided by signal indication or special instructions, movements on non-main tracks must not exceed fifteen (15) MPH. On a non-signalled siding (or other non-main tracks so designated), in addition to REDUCED speed, operate at a speed that will allow stopping within one-half the range of vision of a track unit. In CTC, movements may only enter a siding by signal indication or with RTC permission.',
    ['switching', 'speed', 'track'], ['def-spd-reduced', 'def-non-main-track']),

  S('sw-105-1', '105.1', 'Equipment Left on Siding',
    'Unless otherwise provided, the RTC must be advised before leaving equipment on a siding, and will notify other affected movements as soon as practicable. When occupied service equipment is placed on a siding, a GBO will be issued specifying its location; if the siding switches are locked with special locks, the GBO will state so.',
    ['securing', 'track'], ['sw-105', 'def-gbo']),

  S('sw-112', '112', 'Securing Unattended Equipment',
    'When equipment is left unattended it must be secured to prevent it from moving unintentionally. Parking brakes count as hand brakes. Hand brakes must not be applied while equipment is being pulled or shoved. Before leaving, the employee securing it must confirm with another employee the manner in which it was secured. A single piece of equipment must always be left with the hand brake applied and tested for effectiveness; for two or more pieces, apply at least the minimum number of hand brakes from the (g) table (by total trailing tons and grade), tested for effectiveness. Equipment not connected to an air source also requires at least one additional securement method (e.g. a derail, end of rail, bowled terrain, or air brakes up to 2 hours).',
    ['securing', 'hand-brakes', 'yard'], ['def-spd-restricted', 'sw-113-1'],
    { detail: 'Yard tracks (112(c)): secure by at least one of — hand brakes (min per (g), tested) · bowled terrain · retarders · wheel chocks or skates · air brakes (not connected to air) up to 2 h when there are 10+ cars · air maintained by continuous/auto-start with a Mechanical Emergency Device. The (g) minimum-hand-brake table is grade + tonnage based — read it, don\'t estimate.', smeNote: 'GP-specific securing numbers / kickable-track requirements come from special instructions — confirm with an SME / firsthand.' }),

  S('sw-113-0', '113.0', 'Coupling to Equipment',
    'Before coupling, take precautions to prevent the equipment from moving unintentionally, and ensure at least one knuckle is open. Couple at the lowest speed necessary to make the coupling, not exceeding 6 MPH. A coupling made with equipment not released under its own momentum must, prior to leaving, be stretched using sufficient tractive effort to ensure a proper coupling.',
    ['coupling', 'switching'], ['sw-113-2']),

  S('sw-113-1', '113.1', 'Uncoupling from Equipment',
    'Equipment is considered uncoupled once the uncoupling lever has been lifted. In a yard, before uncoupling from standing equipment, a sufficient number of hand brakes must be applied unless one of the methods prescribed by Rule 112(c) is used. Once uncoupled — unless released under its own momentum — the equipment must be observed to ensure it remains where intended.',
    ['coupling', 'switching', 'yard'], ['sw-112']),

  S('sw-113-2', '113.2', 'Moving Equipment After Coupling',
    'Equipment must be stretched. After stretching and prior to moving, check that it is coupled and for applied hand brakes as may normally be expected. Unless unintentional movement can be prevented with the locomotive brakes, hand brakes must not be released until the air brake system is sufficiently charged and an effective automatic brake application is made to prevent movement while the hand brakes are being released.',
    ['coupling', 'switching'], ['sw-113-0']),

  S('sw-113-3', '113.3', 'Switching With Air Brakes',
    'Operative air brakes, in addition to the locomotive(s), must be used when switching on a grade greater than 0.4% and with more than 2000 tons. Special instructions indicate the locations where this applies and the minimum number of pieces (besides the locomotive[s]) with operative air brakes.',
    ['switching', 'air-brakes', 'grade']),

  S('sw-113-4', '113.4', 'Restrictions — Kicking / Running Switch / Gravity Drop',
    'Kicking, running switch, and gravity drop are PROHIBITED: (a) on a main track; (b) on a subdivision track; (c) on a siding; (d) at a high risk location; (e) on any main shop, diesel shop, or car shop track; and (f) onto, or with, passenger equipment.',
    ['kicking', 'switching'], ['sw-113-5', 'def-kicking', 'def-high-risk-location']),

  S('sw-113-5', '113.5', 'Kicking Equipment',
    'On tracks not listed in Rule 113.4, kicking is prohibited UNLESS permitted by special instructions. Where permitted: the walking surface where equipment is uncoupled must be clear; the track beyond must be flat and/or descend so cars don\'t roll back and foul a cleared track; equipment must be prevented from exiting either end; routing must prevent a kicked car from fouling a main track, siding, subdivision track or high risk location (switches, derails, leads, etc.); and special instructions indicate the maximum tonnage that may be kicked at one time. Once equipment is kicked, no additional equipment may be kicked until the route is properly lined AND the previously-kicked equipment is clear of the fouling point. Equipment kicked must not be left foul of the intended route; when kicking is completed, secure per Rule 112(b) or (c).',
    ['kicking', 'switching'], ['sw-113-4', 'def-kicking', 'sw-112'],
    { smeNote: 'Grande Prairie kicking specifics — kickable tracks, max tonnage, "min 2 hand brakes on to kick" — are special instructions; confirm with an SME / the GP S.I.' }),

  S('sw-113-6', '113.6', 'Running Switch',
    'Verify the switch and hand brakes are in working order before commencing. A running switch must NOT be made: with or onto occupied equipment; with or onto equipment placarded for dangerous goods; where the switch is a dual control, power-operated or spring switch; or within the interlocking limits of a drawbridge or railway crossing at grade. At least 3 employees must be used to perform a running switch.',
    ['switching'], ['def-running-switch', 'sw-113-4']),

  S('sw-113-7', '113.7', 'Gravity Drop',
    'Verify the hand brakes (when used) are in working order before commencing. A gravity drop must not be made with or onto occupied equipment.',
    ['switching'], ['def-gravity-drop', 'sw-113-4']),

  S('sw-114', '114', 'Fouling Other Tracks',
    'Equipment must not be allowed to move foul of another track unless properly protected. A movement must not foul a track until the switches connected with the move are properly lined — or, for semi-automatic or spring switches, the conflicting route is known to be clear. EXCEPTION: a movement may foul a track connected by a hand operated switch provided that (i) neither the track occupied nor the track to be fouled is a main track, (ii) the conflicting route is known to be clear, and (iii) the switch is properly lined before the movement passes over it. Equipment must not be left foul of a connecting track unless the switch is left lined for the track on which the equipment is standing.',
    ['fouling', 'switching'], ['sw-104', 'def-non-main-track']),

  S('sw-115', '115', 'Shoving Equipment',
    'When equipment is shoved by an engine, or is headed by an unmanned remotely controlled engine, a crew member must be on the leading piece of equipment or on the ground, in a position to observe the track to be used and to give the signals or instructions necessary to control the move. EXCEPTION: a crew member need not be so positioned when the portion of the track to be used is known to be clear (subject to the further conditions of the rule).',
    ['shoving', 'switching']),
];
