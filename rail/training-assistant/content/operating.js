// ==========================================================================
// CONTENT · OPERATING — general operating, signal-handling, and radio/comms
// rules (CROR), cited (trust:rulebook). Faithful condensations / quotes of the
// operative clauses; the citation points to the full rule. Source: CROR Jan 28 2025.
// ==========================================================================

const SRC = 'Canadian Rail Operating Rules — Jan 28, 2025';
const O = (id, rule, title, body, tags = [], related = [], extra = {}) =>
  ({ id, domain: 'operating', ref: 'CROR ' + rule, source: SRC, trust: 'rulebook', title, body, tags, related, ...extra });

export const operating = [
  // ----- general rules (time, watches, time tables, signals-general) -----
  O('op-1', '1', 'Time',
    'The 24-hour clock is used, expressed in four digits. Midnight is expressed as 2359 or 0001.',
    ['time'], ['op-2']),

  O('op-2', '2', 'Watches',
    'Every conductor, assistant conductor, locomotive engineer, pilot, foreman and snow-plow foreman (and others the company directs) must, when on duty, use a reliable watch showing hours, minutes and seconds. They must: keep it within 30 seconds\' variation over 24 h; reset it if it varies more; and, before commencing work, compare it with a railway-approved time source — or, where none is accessible, get the correct time from the RTC or from another employee who has it. Crew members in train/transfer/yard service compare time with one another as soon as possible after commencing work.',
    ['time', 'crew'], ['op-1', 'op-5', 'def-rtc']),

  O('op-3', '3', 'Time in Effect',
    'Special instructions indicate whether Standard Time, Daylight Saving Time, or other designated time is in effect.',
    ['time'], ['op-5']),

  O('op-4', '4', 'Notice of Time Change',
    'Notice of a time change is given by operating bulletin posted at least 72 hours before it takes effect, and by GBO at least 24 hours before the change and for not less than 6 days after.',
    ['time', 'bulletins'], ['op-7', 'def-gbo']),

  O('op-5', '5', 'Employees on Duty When Time Changes',
    'An employee on duty who must use a watch changes time as follows — Standard → Daylight Saving: at 0200 ST set ahead one hour to 0300 DST; Daylight Saving → Standard: at 0200 DST set back one hour to 0100 ST. Then immediately verify the correct time per Rule 2(iii).',
    ['time'], ['op-2', 'op-3']),

  O('op-6', '6', 'Time Tables',
    'Each time table, from the moment it takes effect, supersedes the preceding one.',
    ['time', 'timetable'], ['op-7']),

  O('op-7', '7', 'Notice of New Time Table or Supplement',
    'Notice is given by operating bulletin posted at least 72 hours before a new time table or supplement takes effect, and by GBO at least 24 hours before and for not less than 6 days after; it must also be communicated to all other affected employees.',
    ['time', 'timetable', 'bulletins'], ['op-4', 'op-6', 'def-gbo']),

  O('op-8', '8', 'Symbols and Diagrams',
    'Time-table symbols: B operating bulletins · C cautionary limits · D report departure to RTC · S special derail · X crossover between main tracks · Y wye · * footnote · + interlocking (see footnotes). The method of control and the limits of single/multi-track are shown in the time table; each interlocking, non-interlocked drawbridge and non-interlocked railway crossing at grade is shown in subdivision footnotes or special instructions; siding capacity and the extent of Cautionary Limits / TGBO / DOB limits are shown in time-table columns or footnotes.',
    ['timetable'], ['op-6']),

  O('op-11', '11', 'Fusees',
    'A movement approaching a red fusee burning on or near its track — or beyond the nearest rail of an adjacent track — must proceed at REDUCED speed to a point two miles beyond the fusee\'s location, reducing to that speed immediately if moving faster. A fusee must not be placed on a public crossing at grade or where it may cause fire. (Optional) Where the fusee is on the track of an approaching movement already at REDUCED or RESTRICTED speed for a reason other than Rule 11, it must stop before passing the fusee.',
    ['signals', 'flagging'], ['op-35']),

  O('op-18', '18', 'Headlight Failure',
    'If the headlight fails and can\'t be repaired, ditch lights are used in lieu and the movement may proceed. If all headlights and ditch lights have failed, use whatever lights are available and proceed to the first point repairs can be made; at grade crossings not protected by automatic warning devices, do not exceed 10 MPH entering unless the crossing is known clear and will remain clear until occupied.',
    ['lights', 'crossings'], ['op-17', 'op-19']),

  O('op-19', '19', 'Ditch Lights',
    'A train must display ditch lights continuously in the direction of travel whenever the headlight is required at full power. If a ditch light fails en route, the movement may proceed to the next point repairs can be made.',
    ['lights'], ['op-17', 'op-18']),

  // ----- visual / audible signals -----
  O('op-12', '12', 'Hand Signals',
    'Indications (hand, lantern or flag): STOP — swung from side to side at right angle to the track; MOVE BACKWARD — swung in a circle at right angle to the track (speed proportional); MOVE FORWARD — raised and lowered (speed proportional); APPLY AIR BRAKES — raised and swung horizontally above the head; RELEASE AIR BRAKES — raised and held at arm\'s length above the head; REDUCE SPEED — held horizontally at arm\'s length. Any object waved violently by anyone on or near the track is a signal to STOP. A signal must be given in time and from where it can be plainly seen; if there is doubt as to its meaning or for whom it is intended, it must be regarded as a STOP signal. Forward/backward are relative to the front of the controlling locomotive. The disappearance from view of the crew member (or the lights) giving the signals must be regarded as a STOP signal.',
    ['signals', 'hand-signals', 'switching'], ['op-123-1', 'op-123-2']),

  O('op-13', '13', 'Engine Bell',
    'Ring the engine bell when: an engine is about to move (except when switching requires frequent stop/start after the initial move); passing any movement standing on an adjacent track; approaching/passing/moving about station facilities or shop track areas; and from one-quarter mile from every public crossing at grade until the crossing is fully occupied (except where 14(l) whistle applies or as special instructions prescribe).',
    ['audible', 'crossings'], ['op-14']),

  O('op-14', '14', 'Engine Whistle Signals',
    'Sounded as prescribed; unnecessary use is prohibited ("engine whistle" includes "engine horn"). Key signals — one short ("o"): when standing, braking system is equalized (angle cock may be closed). Two short ("oo"): answer to a stop signal (except a fixed signal) or to any signal not otherwise provided for (not used when switching). Succession of short sounds: alarm for persons or animals on or near the track. Public crossing at grade — 14(l): sound the whistle at the whistle post (1/4 mile) so as to give at least 20 seconds warning, prolonged or repeated until the crossing is fully occupied (standard pattern: two long, one short, one long). On engine whistle failure, ring the bell continuously and limit speed entering unprotected crossings.',
    ['audible', 'crossings'], ['op-13']),

  O('op-17', '17', 'Headlight',
    'A movement headed by equipment with a headlight must display it at full power in the direction of travel approaching all public crossings at grade until occupied, and while moving on the main track; on both ends of the engine while on non-main track (may be extinguished on the end coupled to cars). May be dimmed/extinguished (when not approaching a crossing) for an opposing movement, oncoming road vehicles at night, etc.',
    ['lights']),

  O('op-26', '26', 'Blue Signal Protection',
    'A blue flag by day (plus a blue light by night or when day signals can\'t be plainly seen), at one or both ends of equipment — or, on a track entered from one end only, between the equipment and the entry switch — indicates workmen are in the vicinity. When displayed, the equipment must NOT be coupled to or moved. Only the same class of workmen that displayed the blue signal may remove it; its removal indicates no workmen are in the vicinity. Don\'t block the view of a blue signal without notifying the workmen. Where kicking is permitted (113.5(a)), protection is by a special-locked switch preventing entry, or a blue signal plus a derail locked in the derailing position.',
    ['blue-flag', 'protection', 'securing'], ['sw-113-5']),

  O('op-27', '27', 'Signal Imperfectly Displayed',
    'A fixed signal imperfectly displayed — or the absence of a fixed signal where one is usually displayed — must be regarded as the MOST RESTRICTIVE indication that signal is capable of displaying, and reported to the proper authority as soon as possible. If a block/interlocking signal shows one or more lights out but at least one green or yellow remains, movements may proceed reducing to SLOW through turnouts, prepared to stop at the next signal (special exception for a solid yellow on the bottom = treat as RESTRICTING). A signal known/suspected damaged is regarded as its most restrictive indication.',
    ['signals'], ['op-34', 'def-spd-restricted']),

  O('op-33', '33', 'Speed Compliance',
    'If speed requirements are exceeded, crew members must remind one another. If no action is taken, or the locomotive engineer is observed non-responsive or incapacitated, other crew members must take immediate action to ensure the safety of the movement — including stopping it in emergency if required.',
    ['speed', 'crew'], ['op-34']),

  O('op-34', '34', 'Fixed Signal Recognition and Compliance',
    'The crew on the controlling engine must know the indication of each fixed signal (including switches where practicable) before passing it. Crew members within physical hearing range must communicate to each other, clearly and audibly, the indication BY NAME of each fixed signal they must identify — called out as soon as positively identified, and any change of indication promptly communicated and acted on. Must be communicated: block & interlocking signals; Rule 42/43 signals; mile signs to interlocking / hot box detector / Cautionary Limit; Stop signs; OCS-begins; a red signal between the rails; a flagman\'s stop signal; a switch not properly lined for the movement; Cautionary Limit signs; advance PSO signs; and zone-speed reductions. If prompt compliance isn\'t taken, remind one another; if still nothing, take immediate action (stop in emergency if required).',
    ['signals', 'crew'], ['op-33', 'op-27']),

  O('op-35', '35', 'Emergency Protection',
    'Any employee discovering a hazardous condition that may affect the safe passage of a movement must, by flags, lights, fusees, radio, telephone or other means, make every possible effort to stop and/or instruct any affected movement. Flag protection is required on main track unless/until relieved. A flagman goes the required distance from the condition (unless otherwise provided, at least two miles to a point with an unobstructed view), displays a red flag by day / lighted red fusee by night until the movement acknowledges (two short — 14(b)), stops, or reaches the flagman. A movement stopped by a flagman must not proceed until instructed by the flagman. A flagman must carry a red flag and eight red fusees. (This rule does not authorize main track occupancy or track work.)',
    ['emergency', 'protection', 'flagging'], ['op-36', 'op-14']),

  O('op-36', '36', 'Decreased Flagging Distance',
    'On a subdivision specified in special instructions where maximum speed is not greater than 30 MPH, the "at least two miles" distance in Rules 35, 42/842 and 43/843 is decreased to at least one mile.',
    ['emergency', 'flagging'], ['op-35']),

  O('op-40', '40', 'Track Work Protection — General',
    'Special instructions specify when Rules 42/842, 43/843 and 849 apply on non-main track. Where time-table footnotes or special instructions designate that TGBO and/or DOB apply on a non-main track, protection of track work and track conditions may be provided as prescribed by Rules 42/842 and 43/843.',
    ['protection', 'track', 'bulletins'], ['op-41', 'op-42', 'op-43']),

  O('op-41', '41', 'Protection of Track Work — Non-Main Track & Cautionary Limits',
    'A movement required to operate on a track protected by a red signal between the rails, or a switch locked with a special lock, must STOP before passing it and be governed by any instructions from the foreman. Only the foreman (or an employee authorized by the foreman) may remove the red signal and/or special lock. (Not applicable on main tracks outside cautionary limits, signalled sidings/other signalled tracks, or tracks specified in special instructions.)',
    ['protection', 'track'], ['def-cautionary-limits', 'def-foreman']),

  O('op-42', '42', 'Planned Protection',
    'Rule 42 signals must not be in place more than 30 minutes before or after the times stated in the GBO unless the GBO provides otherwise. A movement holding the Form Y must not pass the red signal at the identifiable location stated in the GBO, enter the GBO track limits, or make a reverse movement within those limits until it receives instructions from the foreman named in the GBO (when a specific track is involved, the foreman\'s instructions must specify which track). Those instructions must be repeated to and acknowledged by that foreman before being acted upon. Where a signalled turnout is within two miles of Rule 42 protection that doesn\'t apply on all tracks, every movement must approach prepared to comply with Rule 42 until the route is known.',
    ['protection', 'flagging', 'bulletins'], ['op-40', 'op-44', 'def-gbo', 'def-foreman']),

  O('op-43', '43', 'Slow Track Protection',
    'Form V GBO slow-track protection is marked in the field by: (i) a YELLOW signal to the right of the track at least two miles out in each direction from the outermost GBO limits, and (ii) a GREEN signal to the right of the track in each direction immediately beyond the defect. A single mile-point restriction uses one green (either side); abutting limits within one GBO use a single green to each side per restriction. If signal placement is delayed, the Form V carries "Signals may not be in place." A movement must not exceed the GBO speed while at or between opposing green signals. Where a signalled turnout is within two miles of a restriction that doesn\'t apply on all tracks, approach prepared to comply until the route is known.',
    ['protection', 'speed', 'flagging', 'bulletins'], ['op-40', 'op-44', 'def-gbo']),

  O('op-44', '44', 'Unusual Track Signal Conditions',
    'Handling missing or unexpected Rule 42/43 signals. (a) If a Rule 42 signal is absent between the Form Y times, proceed as though it is properly placed and tell the RTC as quickly as possible. (b) Within the 30-minute window of Rule 42(a): a yellow-over-red may be passed on the named foreman\'s instructions (if the foreman can\'t be reached, be prepared to stop at a red, and advise the RTC if no red is found at the GBO location); a red signal means STOP unless the foreman authorizes proceeding (if unreachable, contact the RTC and be governed by instructions). A yellow-over-red or red encountered OUTSIDE the 30-minute window — or without holding a Form Y requiring it — means STOP, then contact the RTC. (c) A movement inside Form Y limits when protection takes effect must stop unless the foreman instructs otherwise. (d) If a Rule 43 signal is missing, be governed by the Form V and tell the RTC ASAP. (e) A yellow or green signal with no GBO requiring it → reduce to 10 MPH and contact the RTC. The RTC may authorize normal speed where the TGBO/DOB system and the engineering supervisor confirm Rule 42/43 is not in effect; engineering arranges signal removal (which may include the crew picking them up).',
    ['protection', 'signals', 'bulletins'], ['op-42', 'op-43', 'def-rtc']),

  O('op-45', '45', 'Signal Placement — Multi-Track',
    'Except on a subdivision designated in special instructions, the signals required by Rules 42/842 and 43/843 must be placed to the outside of the outermost track(s), not between the main tracks.',
    ['protection', 'signals'], ['op-42', 'op-43']),

  // ----- operation of movements (62–102) -----
  O('op-62', '62', 'Unattended Engines',
    'When an engine is left unattended outside an attended yard or terminal, the cab must be secured against unauthorized entry and the reverser must be removed — except that, during subzero temperatures, an engine without a high-idle feature is exempt from removing the reverser.',
    ['securing', 'crew'], ['op-109', 'sw-112']),

  O('op-63', '63', 'Freight Train Requirements',
    'Freight trains with cars must operate with TIBS or a manned caboose. Exception: a freight train that must be separated to double, set off or lift cars, cut a crossing, or for similar situations may operate without TIBS or a manned caboose to the extent necessary, not exceeding 25 MPH while handling cars.',
    ['movement', 'equipment'], ['op-64', 'op-65']),

  O('op-64', '64', 'Transfer Requirements',
    'Transfers must have air applied throughout the entire consist; the last three cars (if applicable) must be verified to have operative brakes. The locomotive engineer must verify there are sufficient operative brakes to control the transfer, confirmed by a running test as soon as possible. Remote-control locomotives in transfer service operate with two operative operator-controlled units (OCU).',
    ['movement', 'equipment', 'securing'], ['op-63', 'op-70']),

  O('op-65', '65', 'Engine in Yard Service Requirements',
    'An engine in yard service required to enter main track to double over, take head room, or cross over a main track is not considered a train or transfer — except in the application of Rules 301–315 (OCS) and 560–578 (CTC).',
    ['movement', 'switching'], ['op-63', 'def-ocs', 'def-ctc']),

  O('op-66', '66', 'Securing After an Emergency Brake Application on Grade',
    'After an emergency brake application on a heavy or mountain grade, the crew must immediately give the proper authority full details and follow any further instructions. If any part of the train is on mountain grade, the whole train is treated as on mountain grade. In a derailment or train separation on heavy/mountain grade, secure the portion at greatest risk of unintended movement first. On mountain grade, apply hand brakes immediately (per the hand-brake table) before attempting to recover the air. On heavy grade, secure immediately if any listed condition exists — e.g. ambient ≤ −20 °C; −15 to −19 °C with ≥3 in. snow above the rail; unusual braking or difficulty controlling speed; doubt about safe recovery; more than one emergency on the grade; or conditions don\'t permit a recovery attempt — otherwise attempt recovery, and if air won\'t recover, inspect for cause and secure if it can\'t be corrected. When securing per the hand-brake table: if there is less equipment than the table requires, apply hand brakes on all equipment; locomotive retarding force is not counted and must not reduce the requirement.',
    ['securing', 'emergency'], ['op-35', 'op-62']),

  O('op-70', '70', 'Remote Control Operation',
    'A remote-control operation with two or more employees uses two operative OCU. If one fails: repair it as soon as possible, the tour may continue on one, and the movement may run on main track to the first repair point provided an employee other than the OCU holder is positioned to operate the emergency brake valve. No crew member other than the controlling-OCU holder may foul the equipment without verbal confirmation of positive protection. An OCU must not be operated while moving on anything but the movement being controlled. When an engine begins to move, a crew member must visually verify the direction; movements must not exceed 15 MPH; when coupling, the employee protecting the leading end holds the controlling OCU; and before stopping or coupling, the OCU is set to its lowest speed.',
    ['movement', 'switching', 'securing'], ['op-64', 'op-108']),

  O('op-80', '80', 'Main Track Authorization',
    'A movement must not foul or enter a main track without authority. Authority is conveyed by — CTC: signal indication, RTC permission, or written authority; OCS: clearance; Cautionary Limits: Rule 94; SCS: special instructions. If a movement occupies or fouls a main track or controlled siding without authority, or passes a stop-indicating block/interlocking signal without authority, it must stop and initiate protection per Rules 35 and 125, advising the RTC or signalman as soon as practicable. The RTC/signalman issues instructions; if authorized to proceed or reverse (unless relieved), any dual-control or power-operated switch the movement occupies must be examined to confirm the points are properly lined for the route and undamaged, complying with Rule 104.2(b) at dual-control switches (the movement may first move only enough to clear the wheels from the switch points).',
    ['movement', 'authority', 'signals'], ['op-94', 'sw-104-2', 'op-35', 'op-125', 'def-ctc', 'def-ocs']),

  O('op-81', '81', 'Designation of Multi-Track',
    'Where two main tracks are in service they are designated as directed (unless special instructions say otherwise). Where more than two are in service they are numbered: unless the time table specifies otherwise, with eastward/westward time-table directions number from the north ("No 1 track", "No 2 track", and so on); with northward/southward directions number from the east.',
    ['movement', 'track'], ['op-80']),

  O('op-82', '82', 'Limits of Authority',
    'Specific limits in written authorities must be defined by identifiable locations (station names, name signs, switches, signals, mile posts, or other mileage-identified infrastructure). When a switch or signal defines the limit, the authority extends only to the switch\'s fouling point or to the signal location. When mile posts or mileages define it, only to the specific mileage. When station names define it, the authority does not include the main track between the siding switches at either named station (where there is no siding, it extends to the station name sign).',
    ['authority', 'movement'], ['op-80', 'op-94']),

  O('op-83', '83', 'Operating Bulletins',
    'Operating bulletins are issued by the proper authority in the prescribed format and contain only information or instructions about the operation of movements; whoever posts or displays one records the time and date, and duplicate bulletin numbers must not be in effect at the same time. Before commencing work at a home location where they are posted, every employee responsible for operating or supervising movements must read and understand the bulletins applicable to their territory. A Summary bulletin (the number, date and contents of, or reference to, each bulletin still in effect) is issued at intervals set in special instructions; earlier bulletins not included or referenced become void; the current Summary must be accessible to such employees while on duty.',
    ['bulletins'], ['op-142', 'def-gbo']),

  O('op-84', '84', 'Reporting Delays',
    'The conductor must ensure the RTC is promptly advised of any known condition which may delay their train or transfer.',
    ['movement', 'crew'], ['op-85', 'def-rtc']),

  O('op-85', '85', 'Track Release Reports',
    'The conductor ensures the RTC is promptly advised when the movement has arrived at, left, or cleared a location (or at a time specified by the RTC, or after clearing the limits of the last proceed clearance for the subdivision). Before reporting, the conductor confirms the accuracy with other crew members. As it is transmitted, the RTC verifies the movement identification and records the location; if correct, the locomotive engineer confirms the report\'s correctness to the RTC.',
    ['movement', 'crew'], ['op-84', 'op-85-1', 'def-rtc']),

  O('op-85-1', '85.1', 'Location Reports (Optional)',
    'Optional variant of Rule 85 where in effect: an employee ensures the RTC is promptly advised when the movement has arrived at, left, or cleared a location (or as specified by the RTC). The employee confirms accuracy with other crew members first; the RTC enters the report as received and repeats it from the computer screen, and the employee then confirms its correctness to the RTC.',
    ['movement', 'crew'], ['op-85', 'def-rtc']),

  O('op-94', '94', 'Cautionary Limits',
    'Not applicable in CTC; does not authorize track work. A movement or track unit is authorized to use the main track within cautionary limits. Movements must comply with Rule 105(c) and, in addition, be prepared to stop short of a red signal prescribed by Rule 41 or a switch not properly lined. Each cautionary-limit sign and advance sign is reflectorized; an advance sign is placed at least one mile ahead of each cautionary-limit sign (where that distance isn\'t practicable, special instructions so indicate).',
    ['authority', 'movement', 'protection'], ['op-80', 'op-41', 'sw-105', 'def-cautionary-limits']),

  O('op-101', '101', 'Protection Against Extraordinary Conditions',
    'A movement must be fully protected against any known or suspected condition that may interfere with its safe passage. It must stop at once and be fully inspected when it is known or suspected to have struck any object that may interfere with safe operation, and the RTC must be notified as quickly as possible. When a portion of a movement is left on the main track, the crew must take precautions to protect the remaining portion against the return move.',
    ['protection', 'movement', 'emergency'], ['op-35', 'op-102', 'def-rtc']),

  O('op-101-1', '101.1', 'Dimensional Traffic',
    'When the dimensions of traffic require special arrangements to move past other movements, the wide traffic is protected by the RTC against other main-track movements, with advice of the protection given to the crew in writing or verbally. The RTC does not protect against equipment on non-main tracks — the crew handling the wide traffic must protect it from such equipment.',
    ['protection', 'movement'], ['op-101', 'def-rtc']),

  O('op-101-2', '101.2', 'Equipment Left on Main Track',
    'Equipment may be left on the main track when protected by a clearance, a Form T GBO, or cautionary limits. Communication to the RTC must include the equipment\'s location, and the outer limits of Form T protection must be expressed in whole miles or by other identifiable locations. In CTC and controlled interlockings, once the RTC has been advised, Form T protection need not be provided. The RTC must inform each movement required to enter the occupied track of the unattended equipment\'s location.',
    ['protection', 'securing'], ['op-101', 'op-94', 'def-gbo', 'def-cautionary-limits']),

  O('op-102', '102', 'Emergency Stop Protection',
    'A crew stopping from an emergency brake application or other abnormal condition that may obstruct an adjacent main track must: immediately broadcast on the standby channel — "EMERGENCY, EMERGENCY, EMERGENCY, (movement) on (designated track), stopped (stopping) in emergency between mile __ and mile __ (subdivision)"; as soon as possible advise the RTC of the emergency-stop location, indicating whether adjacent tracks (including other railways) are liable to be obstructed; and repeat the broadcast at intervals not exceeding 90 seconds until the RTC advises that all affected movements have been secured, stopped, or advised, or it is known the adjacent tracks are safe and clear.',
    ['protection', 'emergency', 'radio'], ['op-35', 'op-101', 'op-125']),

  O('op-103', '103', 'Grade Crossings',
    'Grade crossings with missing/damaged crossing signs, automatic warning devices not operating as intended, or external-power-off lights extinguished or flashing must be reported by the quickest means to the RTC (or the employee responsible for the track). The crossing is then protected (RTC blocking, or instructing affected movements to apply Rule 103(g)) and the repair authority notified. Where the leading equipment has no whistle and headlight, manual protection is required before occupying a public crossing (at one with automatic warning devices, unless a crew member on the leading equipment can warn people). On shared road/rail roadbed with no barrier, cars not headed by an engine (or headed by an RCO engine) need a crew member on the leading car or ground to warn people. Don\'t leave equipment standing within 100 ft of the travelled portion of a crossing (except for loading/unloading). Manual protection (103(g)): before occupying, a crew member is on the ground ahead displaying a hand stop signal (light or fusee at night) to hold traffic, and the movement doesn\'t enter until that employee instructs — unless the crossing is known clear and will stay clear until occupied. Crew members must NOT signal road or pedestrian traffic to proceed over a crossing.',
    ['crossings', 'protection', 'movement'], ['op-103-1', 'op-13', 'op-14']),

  O('op-103-1', '103.1', 'Grade Crossings With Warning Devices',
    '"Minimum Required Time" — before occupying, the automatic warning devices must be observed operating: at least 20 seconds at crossings without gates (or longer per special instructions); at gated crossings, gates horizontal for at least 5 seconds when max speed is over 15 MPH, or simply observed horizontal at 15 MPH or less. A movement that has stopped or was switching near the crossing, is entering the main track near it, or was authorized past a stop signal within 300 ft of it must not exceed 10 MPH from 300 ft out until the crossing is fully occupied, and must not occupy it until the devices are known to have run the Minimum Required Time (for the stop-signal case, other crossings in the block: not over 15 MPH unless the time is known met). On non-main track over such a crossing, not over 10 MPH from 300 ft until fully occupied (not on subdivision track). Where special instructions require radio/pushbutton activation or stopping at signs, don\'t occupy until the time is met (pushbutton boxes closed and locked when not in use). With rusty-rail or other advisories, manually protect unless the time is known met. Don\'t increase speed by more than 5 MPH over the crossing unless the time is known met. Before reversing over an automatic-warning crossing, a crew member must manually protect it. A movement following another within 1500 ft may not properly activate the devices, so it must not obstruct the crossing until the time is known met or it is manually protected.',
    ['crossings', 'protection', 'speed', 'movement'], ['op-103']),

  // ----- crew / movement -----
  O('op-106', '106', 'Crew Responsibilities',
    'All crew members are responsible for the safe operation of movements and equipment in their charge and for the observance of the rules. Under conditions not provided for by the rules, they must take every precaution for protection. A utility employee becomes a crew member when working with any movement.',
    ['crew'], ['def-conductor', 'def-employee']),

  O('op-107', '107', 'Restrictions at Passenger Train Stops',
    'Unless special instructions direct otherwise, a movement must operate with extreme care when passing alongside a train carrying passengers that is discharging or receiving traffic, and must not pass between such a train and the station or platform unless properly protected. Passengers may entrain or detrain only after positive protection has been provided against movements approaching on any main track they must cross between the station and the train.',
    ['movement', 'protection', 'crew'], ['op-106', 'op-110']),

  O('op-108', '108', 'Precautions While Switching',
    'When switching is performed, crew members must take precautions to prevent unintended rollbacks and/or fouling of other tracks and equipment.',
    ['switching', 'crew'], ['sw-114']),

  O('op-109', '109', 'Locomotive Engineer Precautions',
    'When duties require the locomotive engineer to temporarily exit the controlling cab on a standing movement: fully apply the independent brake; apply the automatic brake if required; remove the reverser (unless not equipped with high idle); after stepping away, visually verify the gauges don\'t indicate a possible air-brake release and that the brake valve handles remain in the selected positions; and verbally confirm the measures with another employee.',
    ['crew', 'securing'], ['sw-112']),

  O('op-110', '110', 'Inspecting Passing Trains and Transfers',
    'When duties and terrain permit, at least two crew members of a standing train/transfer position themselves on the ground on both sides to inspect passing trains/transfers (the locomotive engineer inspects the near side). Broadcast the inspection results when possible. Every effort must be made to stop a passing train/transfer if a dangerous condition is detected; a report states only the location and what was observed — never speculation as to cause.',
    ['inspection', 'crew']),

  O('op-111', '111', 'Train and Transfer Inspection',
    'The crew must know their train/transfer equipment is in good order before starting and inspect it whenever possible (equipment added en route is inspected with extra care). Crew on the rear of a moving train/transfer inspect the track behind for dragging or derailed equipment at every opportunity; all crew make frequent both-sides inspections. On completion of crew-planned inspections, and where special instructions require inspection, crew members voice-communicate the results to each other when possible. (Optional) The conductor first arriving at a meeting point arranges a walking inspection of their freight train/transfer as time and conditions permit.',
    ['inspection', 'crew'], ['op-110', 'op-106']),

  // ----- radio / communication -----
  O('op-117', '117', 'Reliability Tests',
    'A crew with radios must carry out an intra-crew test of those radios before leaving the initial terminal, change-off or starting point. When a movement is equipped with a single radio, it must be voice-tested as soon as practicable after the crew comes on duty.',
    ['radio', 'comms'], ['op-119', 'op-120']),

  O('op-118', '118', 'Devices Used in Lieu of Radio',
    'When a communication device is used in lieu of a radio, all radio rules apply.',
    ['radio', 'comms'], ['op-117']),

  O('op-119', '119', 'Continuous Monitoring',
    'When not transmitting or receiving, receivers must be set to the appropriate standby channel at a volume ensuring continuous monitoring; when another channel is needed for other duties, at least one radio should — where practicable — stay on the designated standby channel for emergency communications. Keep volume at a level that avoids annoyance to the public in passenger cars and station facilities. Foremen named in a Form Y GBO, TOP or clearance must set their radio to "scan mode" when not communicating, otherwise monitoring the applicable designated standby channel.',
    ['radio', 'comms'], ['op-117', 'op-125']),

  O('op-120', '120', 'Radio Terms',
    'In radio communication: "STAND BY" — monitor this channel for my next transmission; "OVER" — transmission ended and a response is expected; "OUT" — transmission ended and no response expected. (Optional) Except for switching, when a transmission is complete and a response is expected or required, the transmitting employee ends it with the spoken word "OVER".',
    ['radio', 'comms'], ['op-121', 'op-122']),

  O('op-121', '121', 'Positive Identification',
    'The person initiating a radio communication and the responding party must establish positive identification; the initial call commences with the railway-company initials of the person being called (a non-railway person on company channels uses their company name in the initial transmission). The initiator ends the initial call with "OVER"; each party ends their final transmission with "OUT". When requesting an authority from the RTC or signalman, the communication must include the information needed to issue it — e.g. name, location, movement designation, required limits, signal number and/or track(s) to be used or entered.',
    ['radio', 'comms'], ['op-120', 'op-123', 'def-rtc']),

  O('op-122', '122', 'Content of Radio Communications',
    'Radio communications must be brief and to the point and contain only essential instructions or information.',
    ['radio', 'comms']),

  O('op-123', '123', 'Verification Procedures',
    'Except when transmitted by an automated device (or as otherwise provided), when verbal instructions or information affecting the safety of a movement are received by radio, such information must be REPEATED to the sender. Required repetitions/acknowledgements may be checked and confirmed to the RTC by another crew member. Written authorities received by radio are verified by their specific rules.',
    ['radio', 'comms'], ['op-123-1', 'def-rtc']),

  O('op-123-1', '123.1', 'Radio or Hand Signals',
    'Before changing between radio and hand signals, a definite understanding as to the method of communication must be established between the crew members giving or receiving instructions. In an emergency, either method may be used in addition to the one previously arranged.',
    ['radio', 'hand-signals', 'comms'], ['op-12', 'op-123-2']),

  O('op-123-2', '123.2', 'Switching by Radio',
    'When radio controls switching, after positive identification: (i) give direction relative to the front of the controlling locomotive in the initial instruction and whenever direction changes; (ii) give distance to travel with each communication (increments under two car lengths need not be repeated); (iii) if the movement has travelled half the last distance given with no further communication, it must STOP; (iv) communicate block/interlocking signal indications while switching; (v) doubt as to meaning or for whom intended = a STOP signal; (vi) a car length = 50 feet unless otherwise arranged.',
    ['radio', 'switching', 'comms'], ['op-12', 'op-123-1']),

  O('op-125', '125', 'Emergency Communication Procedures',
    'Transmit the word "EMERGENCY" three times at the start of the transmission to report: an accident with injury; a condition that may be a hazard to persons; a condition that may endanger the passage of movements; or a derailment on or fouling a main track. An emergency communication has absolute priority; if one directed to a specific person/movement isn\'t acknowledged, any employee hearing it relays it if practicable, and others must not interfere.',
    ['radio', 'emergency', 'comms']),

  O('op-126', '126', 'Restricted Use of Radio',
    'In addition to the restrictions in Rules 14 and 602, radio must NOT be used to: give advance information about the indication of a block or interlocking signal; or give information that may influence a crew to consider speed restrictions are diminished.',
    ['radio', 'signals', 'comms'], ['op-122']),

  O('op-127', '127', 'Conducting Emergency Radio Test',
    'To keep emergency channels working and crews familiar with the procedure, the RTC may direct a crew member (or an engineering field employee) to initiate an emergency test call on the RTC channel. Tests are made randomly; the employee initiates it on the applicable RTC channel, e.g. "Emergency test, Emergency test, Emergency test. ABC 1234 East at mile 12 Canada Sub, testing the Emergency call." The RTC then reports whether the test succeeded, and employees return to their designated standby channel.',
    ['radio', 'emergency', 'comms'], ['op-125', 'def-rtc']),

  O('op-137', '137', 'Foreman\'s Instructions',
    'Instructions from a foreman must be in writing, except when the instructions permit unrestricted operation through the entire limits.',
    ['crew', 'bulletins', 'protection'], ['op-138', 'op-153', 'def-foreman']),

  O('op-138', '138', 'Foreman\'s Instructions (Optional)',
    'Optional variant of Rule 137 where so designated: instructions from a foreman must be in writing (no exception).',
    ['crew', 'bulletins', 'protection'], ['op-137', 'def-foreman']),

  O('op-153', '153', 'Confirmation to a Foreman',
    'Confirmation of protection must not be given to a foreman until all affected movements have received a copy of the GBO or are otherwise secured.',
    ['crew', 'bulletins', 'protection'], ['op-137', 'def-gbo', 'def-foreman']),

  O('op-142', '142', 'Understanding Between Crew Members',
    'Every conductor, locomotive engineer, pilot and snow plow foreman must read and properly understand all GBO and clearances as soon as possible after receiving them, and make them available to other crew members so each has read and understands them (and any protection arrangements). Crew members within physical hearing range must remind one another of GBO/clearance restrictions in sufficient time to ensure compliance.',
    ['crew', 'bulletins'], ['def-gbo', 'op-147']),

  O('op-147', '147', 'Transfer Between Crews',
    'When a conductor and/or locomotive engineer is changed off or relieved, all GBO, DOB, clearances, authorities, TGBO and other written instructions and necessary information still in effect must be transferred personally to the relieving crew, and known to be understood. If a personal transfer isn\'t practicable, contact the RTC about disposition (a signed list of items left for the relieving crew, who compare with the RTC before proceeding). Taking control of a movement on CTC track where the last signal indication can\'t be ascertained → RESTRICTED speed applies to the next signal. Verbal instructions from a foreman must not be passed between crews — the relieving crew contacts the foreman directly.',
    ['crew', 'bulletins'], ['op-142', 'def-rtc']),

  // ----- general procedures · GBO / DOB / TGBO / forms -----
  O('op-131', '131', 'Recording',
    'The RTC keeps a complete, indelible record (book or computer-assisted system) of each GBO, clearance, TOP, authority, instruction and other information required to be in writing — made before or during transmission, never from memory, and re-sent only from the original record. On a detected error before completion to any employee, the RTC voids the record and directs all copies destroyed (re-issued numbered items get a new number). Station names are spelled exactly as in the time table; without a computer system, all clearance-authorized movements and TOP limits are recorded on a train sheet.',
    ['bulletins', 'comms'], ['op-136', 'def-rtc']),

  O('op-131-1', '131.1', 'Electronic Transmission and Cancellation',
    'When a GBO, clearance, TOP, other authority, instruction or information is transmitted or cancelled by ECM (not voice), it is not repeated to the RTC; "complete" and the RTC initials are generated by the ECM, and on cancellation the RTC initials are not required.',
    ['bulletins', 'comms'], ['op-131']),

  O('op-132', '132', 'Brevity, Clarity, Pronunciation and Retention',
    'Authorities and their records contain only essential information — brief, clear, in the prescribed form, without erasures. By voice, all words and numbers are clearly pronounced; for written communications numbers are pronounced in full then digit-by-digit, and single-digit numbers are pronounced then spelled; the transmitter regulates speed to allow compliance. After an accident or incident, retain all authorities/GBO/written instructions until relieved by a supervisor. When a written authority is fulfilled, cancelled or superseded, advise other employees where applicable and (except electronic) draw an "X" across it (or diagonal lines through a book page) to prevent further use.',
    ['bulletins', 'comms'], ['op-136']),

  O('op-133', '133', 'Numbering',
    'Except where computer-controlled, each RTC desk uses a separate consecutive whole-number series (optionally with letters) for numbering a GBO, clearance, TOP, authority or instruction; duplicate numbers must not be in effect at the same time.',
    ['bulletins'], ['op-131']),

  O('op-134', '134', 'Designation of Movements',
    'GBO, clearance or other authority are addressed clearly to those who execute and observe them. Where positive identification is required, the engine number is included in the designation; when the locomotive number is used it should (when practicable) be the leading locomotive, and only the designated locomotive\'s number lights are illuminated at all times.',
    ['bulletins', 'authority'], ['op-135']),

  O('op-135', '135', 'Employees Addressed',
    'A GBO, clearance or other authority addressed to a movement is regarded as addressed to the conductor and locomotive engineer (and the pilot or snow-plow foreman, if any); the crew member copying ensures all addressed receive a copy. (Optional) A single copy may be made when all crew are in the same operating cab and it is visible and accessible to all.',
    ['bulletins', 'crew'], ['op-134', 'op-142']),

  O('op-136', '136', 'Copying, Repeating, Completing and Cancelling',
    'The employee copying from the RTC copies as transmitted and repeats all written and pre-printed portions from the copy (station names spelled exactly as in the time table). It must not be copied by the employee operating moving equipment or track units if it would interfere with safe operation. The RTC verifies each word and digit on each repetition; if correct, responds "complete" plus RTC initials, which the copying employee records and acknowledges by repeating "complete" and the RTC initials. By voice direct to a crew, it is not completed until each copying crew member has correctly repeated it.',
    ['bulletins', 'comms'], ['op-131', 'op-139']),

  O('op-139', '139', 'Becoming Effective',
    'A GBO, clearance, TOP or other authority becomes effective the moment the RTC gives the word "complete" and the RTC initials; however, the RTC must not take further action on a restriction it contains until acknowledged by the employee copying.',
    ['bulletins', 'authority'], ['op-136', 'op-140']),

  O('op-140', '140', 'Changes After Becoming Effective',
    'No changes after becoming effective, except: adding an address to a GBO (number and applicable address portion repeated to and verified by the RTC); changing a time or location to call the RTC on a clearance/TOP/authority (line through the previous); under a computer system, removing the effective time/date from a GBO after the effective time and removing "signals may not be in place" once the foreman confirms placement; changing speed (line through current, repeat the GBO number and revised speed to and acknowledged by the RTC); and, under a computer system, changing TOP limits (line through current, repeat the TOP number and revised limits to and acknowledged by the RTC).',
    ['bulletins', 'authority'], ['op-139']),

  O('op-141', '141', 'Making Additional Copies',
    'Additional copies of a GBO, clearance, TOP or other authority may be received from the RTC or made from a completed one; such copies are repeated to the RTC from the new copy except when received from an ECM or reproduced by a duplicating device. Whoever produces a copy for another employee checks it for legibility.',
    ['bulletins'], ['op-136']),

  O('op-143', '143', 'GBO Numbers on Clearance',
    'When specified in special instructions, the number of each GBO in effect when the clearance is issued that affects the movement (per subdivision or the whole trip) is shown on the first clearance sent to that crew; where there are no GBO for the movement, "nil" is shown.',
    ['bulletins', 'clearance'], ['op-152']),

  O('op-148', '148', 'Personal Transfer Between RTC',
    'Where an ECM or computer-assisted list is used, the relieving RTC signs into the system in the presence of the on-duty RTC and receives verbal/written transfer of other necessary instructions. Otherwise, before being relieved the RTC makes an indelible list of GBO/TOP/clearances and other authorities in effect, each read, understood and initialled by the relieving RTC; other instructions are transferred; both RTC sign, and the relieving RTC records the completion time.',
    ['bulletins', 'crew'], ['op-147', 'def-rtc']),

  O('op-151', '151', 'GBO — Identical Meaning to All',
    'The body of each GBO must be given in the same words and figures to every employee and movement addressed.',
    ['bulletins'], ['op-152', 'def-gbo']),

  O('op-152', '152', 'GBO — Delivery',
    'The RTC must ensure that movements affected by a GBO are issued a copy or are otherwise secured.',
    ['bulletins'], ['op-151', 'op-153']),

  O('op-154', '154', 'GBO — Remain in Effect',
    'GBO remain in effect for the entire tour of duty unless cancelled, and must be retained at away-from-home locations to be available, if required, for the return trip.',
    ['bulletins'], ['op-155', 'def-gbo']),

  O('op-155', '155', 'GBO — Cancelling',
    'To cancel an item: "Item __ of GBO __ is cancelled (RTC)." To cancel a GBO: "GBO __ is cancelled (RTC)." The cancellation must be repeated to and acknowledged by the RTC.',
    ['bulletins'], ['op-154']),

  O('op-156', '156', 'Daily Operating Bulletin (DOB)',
    'A movement must not move on a track where DOB applies unless it holds the current DOB, or a TGBO applicable within the portion of the DOB limits it will operate over. A DOB takes effect at the specified time and remains until the same time the next day; a crew unable to clear DOB limits before expiry, or unable to get the next current DOB, contacts the RTC (who may extend it with any necessary changes) — if unable to reach the RTC, stop. All crew verify the DOB is properly dated with the correct number of pages.',
    ['bulletins'], ['op-157', 'def-gbo']),

  O('op-157', '157', 'Tabular General Bulletin Order (TGBO)',
    'A movement must not move on a track where TGBO applies unless it holds a TGBO addressed to it. All crew verify their movement is properly designated, the page count is correct, and the limits cover the routing; an incorrectly designated or missing TGBO means contacting the RTC immediately. A TGBO containing an item that cancels it at a specific time requires communicating with and being governed by the RTC before expiry — if unable to reach the RTC and unable to clear the limits, stop.',
    ['bulletins'], ['op-156', 'def-gbo']),

  O('op-form-s', 'Form S', 'GBO Form S — Main Track Out of Service',
    'GBO form taking the main track out of service between specified switches (which are lined and secured for the siding or other track); movements operate through that track in accordance with Rule 105. Once the foreman has written confirmation the GBO is in effect, impassable main track between those switches may be protected accordingly.',
    ['bulletins'], ['op-152', 'sw-105']),

  O('op-form-t', 'Form T', 'GBO Form T — Equipment Left on Main Track',
    'GBO form giving permission to leave, and protection for, equipment occupying the main track between designated points (or protecting derailed/obstructing equipment). A crew receiving it must proceed prepared to stop short of such equipment.',
    ['bulletins', 'protection'], ['op-101-2']),

  O('op-form-v', 'Form V', 'GBO Form V — Specifying Speed',
    'GBO form specifying a speed restriction — used with Rule 43 slow-track protection or other conditions (specifying the track(s) where it applies), to restrict specific equipment ("do not exceed __ while handling __"), or to restrict speed entering a public crossing at grade until it is fully occupied.',
    ['bulletins', 'speed'], ['op-43']),

  O('op-form-y', 'Form Y', 'GBO Form Y — Planned Protection',
    'GBO form providing planned protection as prescribed by Rule 42 ("Be governed by Rule 42 on __ from __ until __ between mile __ and mile __ … Foreman __"); may be modified for daily or exceptional use, and specifies the track(s) where the restriction applies.',
    ['bulletins', 'protection'], ['op-42']),

  // ----- OCS · Occupancy Control System (301–315) -----
  O('op-301', '301', 'OCS — Application and Supervision',
    'On subdivisions, portions of subdivisions, or other tracks specified in special instructions, movements are governed by Occupancy Control System (OCS) rules. The RTC supervises OCS territory by means of clearances, TOPs, GBO and other instructions as required.',
    ['ocs', 'authority'], ['op-302', 'def-ocs', 'def-rtc']),

  O('op-302', '302', 'OCS — Clearance Required',
    'Except within cautionary limits, a train or transfer must be authorized by a clearance to foul or enter a track where OCS rules apply. A clearance is sent direct to the crew addressed; before acting on it, the conductor and locomotive engineer must, as soon as possible, ensure each holds the clearance and their train/transfer is correctly designated, and the engine number must be verified visually.',
    ['ocs', 'clearance', 'authority'], ['op-301', 'op-302-1', 'op-94']),

  O('op-302-1', '302.1', 'OCS — Clearance in Effect',
    'A clearance remains in effect until fulfilled, superseded or cancelled. Clearances authorizing a train or transfer to proceed must, unless cancelled, be fulfilled in the order they were issued on that subdivision.',
    ['ocs', 'clearance'], ['op-302', 'op-302-2', 'op-302-3']),

  O('op-302-2', '302.2', 'OCS — Superseding a Clearance',
    'A clearance may be issued superseding one the crew already holds. When superseding a clearance that includes limits the train/transfer is occupying, the superseding clearance must include that section of track and must not require waiting for an opposing train/transfer. If it restricts the authority already held, the RTC must not take further action until the conductor and locomotive engineer acknowledge it.',
    ['ocs', 'clearance'], ['op-302-1', 'op-302-3']),

  O('op-302-3', '302.3', 'OCS — Cancelling Clearance',
    'Before a clearance is cancelled, the train/transfer addressed must be clear of the limits, protected by Form T GBO, or within cautionary limits. A cancellation does not take effect until acknowledged by the conductor and locomotive engineer, who acknowledge by repeating the clearance number, "cancelled" and the RTC\'s initials to the RTC.',
    ['ocs', 'clearance'], ['op-302-1', 'op-302-2', 'def-cautionary-limits']),

  O('op-303', '303', 'OCS — Protection Against Following Trains or Transfers',
    'Up to two trains/transfers may each be authorized to proceed in the same direction within the same limits, provided each is instructed on its clearance to protect against the other; before either moves within the limits, both crews must have a thorough written understanding of each one\'s operation and the protection to be provided (if communication between them fails, only the moves last arranged may be made). Within ABS territory, with the protection of at least two block signals to the rear, two or more may proceed in the same direction within the same limits, governed by block-signal indications.',
    ['ocs', 'authority', 'movement'], ['op-303-1', 'op-305']),

  O('op-303-1', '303.1', 'OCS — Radio Protection Against Following Trains/Transfers',
    'Where specified in special instructions (not for work clearances): the RTC must not authorize a following train/transfer until its clearance restricts it — "Protect against (preceding) from (location)." The follower must not leave that location (or any identifiable location) until the preceding train/transfer reports leaving an identifiable location ahead (recorded in writing by the follower; the report may come from the RTC; use Rule 82 identifiable locations). If no report is received, the follower may operate at REDUCED speed to a maximum 25 MPH, and must not pass the preceding train/transfer. If the preceding one has stopped, the crews may arrange in writing to "close up"; when it resumes, the follower is again governed as above. Once the preceding train/transfer leaves the location the follower is authorized to, Rule 303.1 no longer applies.',
    ['ocs', 'radio', 'movement'], ['op-303', 'op-82']),

  O('op-304', '304', 'OCS — Restriction Before Leaving',
    'A train/transfer restricted by clearance must not leave the named point until it is positively known that the opposing train(s)/transfer(s) named on the clearance have arrived. A train/transfer has not arrived until its designated engine and marker have arrived; one operating without a marker has not arrived until confirmed by direct communication with a crew member. If unable to observe arrival or to communicate with a crew member, the RTC must be contacted.',
    ['ocs', 'authority', 'movement'], ['op-304-1', 'op-305']),

  O('op-304-1', '304.1', 'OCS — Stopping Clear of Fouling Point',
    'A train/transfer required to stop at a meeting, clearing or waiting point, or at the end of authority, must stop clear of the route to be used by another train or transfer.',
    ['ocs', 'movement'], ['op-304']),

  O('op-305', '305', 'OCS — Before Issuing Clearance Authority',
    'Before issuing clearance authority, the RTC must provide protection against all conflicting trains, transfers and TOPs within the limits stated.',
    ['ocs', 'authority'], ['op-302', 'def-rtc']),

  O('op-306', '306', 'OCS — Track Use',
    'In multi-track OCS, a clearance must specify the track(s) to be used.',
    ['ocs', 'authority', 'track'], ['op-302', 'op-81']),

  O('op-308', '308', 'OCS — Work Clearance Authority',
    'When authorized to work by clearance, a train/transfer may move in either direction within the limits named. A work clearance remains in effect until superseded or cancelled.',
    ['ocs', 'clearance', 'authority'], ['op-308-1', 'op-309']),

  O('op-308-1', '308.1', 'OCS — Changing Direction (Proceed Clearance)',
    'Unless otherwise provided, a train/transfer authorized to proceed by clearance must move only in the specified direction. Provided the track has not been released (or, in ABS, a block is not re-entered), it may reverse 300 feet or less; in ABS a crew member must be positioned to see the section to be used is clear and will remain clear of equipment or a track unit.',
    ['ocs', 'movement'], ['op-308']),

  O('op-309', '309', 'OCS — Moving Through Working Limits',
    'To enter or move within the working limits of one or more trains/transfers, a train/transfer must be restricted by its clearance — e.g. "Protect against Work 5748 (and Work 9460) between Exeter and Jasper." It must not enter or move within those limits until a thorough written understanding is established with the conductor and locomotive engineer of each work train/transfer, covering the specific operation and the protection to be provided, which must continue until the train/transfer has left the working limits.',
    ['ocs', 'authority', 'protection'], ['op-310', 'op-314']),

  O('op-310', '310', 'OCS — Multiple Work Authorities',
    'Two or more work authorities may be issued within the same or overlapping limits; each train/transfer must be restricted by its clearance to protect against the others, and the conductors and locomotive engineers must have a thorough written understanding of each one\'s operation and the protection to be provided.',
    ['ocs', 'authority', 'protection'], ['op-309', 'op-314']),

  O('op-311', '311', 'OCS — Protecting Against a Foreman',
    'A train/transfer must not be authorized to enter or move within the limits of a TOP until restricted — "Protect against foreman (name) between (location) and (location)." It must not enter or move within the TOP limits until instructions are obtained from the named foreman, repeated to and acknowledged by that foreman before being acted upon.',
    ['ocs', 'protection', 'authority'], ['op-309', 'def-foreman']),

  O('op-314', '314', 'OCS — Proceeding Through / Working Within Work Limits (Optional)',
    'Optional alternative to Rules 309/310 where in effect: a train/transfer may be authorized to proceed through or work within the limits of one or more work trains/transfers, provided its clearance restricts it — "Protect against work (number) between (location) and (location)." It must not enter or move within the working limits until a thorough written understanding is established with each work train/transfer\'s conductor and locomotive engineer (intended operation + protection), maintained until the work train(s)/transfer(s) have left the limits.',
    ['ocs', 'authority', 'protection'], ['op-309', 'op-310']),

  O('op-315', '315', 'OCS — Radio Broadcast Requirements',
    'A crew member on every train/transfer must broadcast on the designated standby channel 1 to 3 miles from the next station or interlocking, including the next requirement to protect against another train, transfer or foreman if the restriction lies between the upcoming station and the next station/interlocking. A crew member off the engine must confirm the broadcast was made; if unable to contact the engine crew to confirm, immediate action must be taken to stop the movement before it reaches the next point of restriction.',
    ['ocs', 'radio', 'movement'], ['op-122', 'op-309']),

  // ----- CTC · Centralized Traffic Control (560–576) -----
  O('op-560', '560', 'CTC — Supervision and Application',
    'CTC applies within the limits specified in the time table or special instructions and is supervised by the RTC; block signals govern the operation of trains and transfers, and the RTC issues instructions as required.',
    ['ctc', 'authority', 'signals'], ['op-561', 'def-ctc', 'def-rtc']),

  O('op-561', '561', 'CTC Suspended',
    'When all or part of the CTC is withdrawn from service, trains and transfers are governed by special instructions.',
    ['ctc'], ['op-560']),

  O('op-563', '563', 'CTC — Clearing Opposing Signals into Non-Signalled Sidings',
    'When two opposing trains/transfers are to be lined into the same non-signalled siding, each locomotive engineer must be advised before the signal to operate either into the siding is requested. At meeting points the RTC must not line a train/transfer into a siding until the switch at the opposite end is set for the main track. (Not applicable where automated office control prevents opposing entry, or where SCT is in effect.)',
    ['ctc', 'authority'], ['op-560']),

  O('op-564', '564', 'CTC — Authority to Pass Stop Signal',
    'A train/transfer must have authority to pass a block signal indicating Stop. The RTC may authorize it, but first must ensure no conflicting trains/transfers are within or authorized to enter the affected controlled block (other than ones under Rule 567/567.3/577) and provide protection against all opposing movements. The authorized movement need not stop at the signal but must positively identify it by number, operate at RESTRICTED speed to the next signal or Block End sign, and comply with the switch rules (104.1 spring, 104.2 dual-control, 104.3 power-operated, 611 automatic interlockings). Where a known condition prevents clearing signals into the block, the RTC may authorize REDUCED speed to the next signal/Block End sign (advising whether equipment is present; REDUCED speed begins once the lead equipment has passed entirely through the controlled location and remains until the block is known clear), approaching the next signal prepared to stop. The authority and instructions must be in writing and, where applicable, specify the route — the locomotive engineer must know the route before moving.',
    ['ctc', 'signals', 'authority'], ['op-565', 'op-573', 'sw-104-2']),

  O('op-565', '565', 'CTC — Stop Signal CTC to ABS',
    'A train/transfer leaving CTC and entering ABS that must pass a signal indicating Stop is governed by Rule 564 within CTC and Rule 509 within ABS.',
    ['ctc', 'signals'], ['op-564']),

  O('op-566', '566', 'CTC — Work Authority',
    'A train/transfer may be given work authority to move in either direction within specified limits. Before issuing it, the RTC must ensure no other trains/transfers are within or authorized to enter the limits and block at Stop all devices controlling signals into them, maintaining that blocking and not authorizing others to enter (except per 567.3) until the work authority is cancelled. If cancelled while the movement is inside, the crew informs the RTC of its intended direction and the RTC keeps opposing signals blocked until it clears the controlled block. Where the authority says "Call RTC ___," the crew communicates as instructed. The authority is in writing; the engineer must know the track limits before moving. Controlled signals within the limits (other than the entry/exit signals) showing STOP may be treated as "proceed at RESTRICTED speed".',
    ['ctc', 'authority', 'signals'], ['op-566-1', 'op-567', 'op-576']),

  O('op-566-1', '566.1', 'CTC — Signal Indication Suspended While Switching',
    'A crew may be authorized to manually operate specific dual-control switches at a controlled location (per Rule 104.2(d)); this must be included with Rule 566/567 work authority. Signal indications governing operation over such switches may be considered suspended while the switches are in the "hand" position, but only while switching at the designated controlled location; signal indication or Rule 564 must first authorize the movement into the controlled location. Verbal permission may be given to hand-operate specific dual-control switches within 566/567 limits that didn\'t include 566.1 for them. Over a spring switch within work-authority limits the governing signal may be considered suspended if the switch is properly lined; at a controlled location with only a hand-operated switch, the governing signal may be considered suspended only while switching through that switch.',
    ['ctc', 'switching', 'signals'], ['op-566', 'sw-104-2']),

  O('op-567', '567', 'CTC — Joint Work Authority',
    'More than one train/transfer may be given joint work authority to operate in either direction within specified limits, each instructed "Protecting against each other," with a thorough written understanding between all crews of each one\'s operation and the protection to be provided. Before issuing it, the RTC ensures no other movements are in the limits and blocks at Stop all signals governing entry, maintaining that blocking until cancelled; each must be clear before cancellation (exception: the last one may be cancelled while inside, informing the RTC of its direction, with opposing signals kept blocked until it clears). "Call RTC ___" is complied with as instructed; the authority is in writing and the engineer must know the limits before moving.',
    ['ctc', 'authority', 'protection'], ['op-566', 'op-567-1']),

  O('op-567-1', '567.1', 'CTC — Protect Against a Foreman',
    'A train/transfer may be authorized to enter or move within TOP limits when instructed to protect against the foreman — "Protect against foreman (name) between (location) and (location)." Both conductor and engineer must know the authority and have the foreman\'s instructions (repeated to and acknowledged by the foreman) before moving. The RTC must not authorize another movement or TOP within those protected limits until fulfilled or cancelled. In addition, the movement must also be authorized to enter the TOP limits under Rule 105(a)/564/568 (or to reverse within them under Rule 566).',
    ['ctc', 'protection', 'authority'], ['op-567', 'op-567-2', 'def-foreman']),

  O('op-567-2', '567.2', 'CTC — Entering Foreman\'s Limits (Optional)',
    'Optional alternative for entering a foreman\'s (TOP) limits: each time authorized, the movement is restricted "Protect against foreman (name) between (location) and (location)," provided when it is within two controlled blocks of the limits (or 25 miles where there is no controlled block prior), and the RTC ensures it is the only movement that will encounter the entry signal. No entry until both conductor and engineer know the authority/limits and have the foreman\'s instructions (repeated to and acknowledged by the foreman).',
    ['ctc', 'protection', 'authority'], ['op-567-1']),

  O('op-567-3', '567.3', 'CTC — Proceeding Through Work Limits',
    'A train/transfer may be authorized to enter or move within the work limits of others, restricted "Protect against work (number) between (location) and (location)." It must not enter until a written understanding of each one\'s intended operation is established with both crews, kept until the affected movement has left the limits. It must also be authorized to enter by signal indication or under Rule 564/568; where entry is by signal indication, the restriction may be issued only within two controlled blocks (or 25 miles where none precedes), and the RTC ensures it is the only movement that will encounter the entry signal.',
    ['ctc', 'protection', 'authority'], ['op-566', 'op-567']),

  O('op-568', '568', 'CTC — Signal or Permission to Enter Main Track',
    'A train/transfer must not foul, enter, or re-enter a main track except by signal indication or with RTC permission. Where entry is at a non-electrically-locked hand switch (or one with a broken seal on the electric switch lock), the RTC\'s permission must state the direction and route, be in writing, and the engineer must know the circumstances before moving; first the RTC ensures no conflicting movements are within or authorized into the controlled block and blocks at Stop all signals governing entry. The RTC maintains blocking and admits no opposing movement until the protected one clears; blocking against following movements isn\'t removed until the crew reports it has entered the main track and is moving in the authorized direction. Exception: permission isn\'t required to enter/re-enter at a hand switch within limits authorized by Rule 566/567/577.',
    ['ctc', 'authority', 'switching'], ['op-564', 'op-569', 'sw-104-2']),

  O('op-569', '569', 'CTC — Cancelling Authorities',
    'Authority/permission under Rules 564, 567.3 or 568 may be cancelled provided the movement hasn\'t entered the affected controlled block. When authority under 564/566/567/567.1/567.2/567.3/577, or the written permission under 568, is cancelled, the cancellation takes effect only after it is correctly repeated and acknowledged by the conductor and locomotive engineer (who repeat the authority number, "cancelled" and the RTC\'s initials to the RTC).',
    ['ctc', 'authority'], ['op-564', 'op-566', 'op-568']),

  O('op-570', '570', 'CTC — Entering Between Signals',
    'A train/transfer that has entered a block between signals at a hand switch with an electric switch lock must approach the next signal prepared to stop, unless/until the track is seen clear to that signal and it displays better than Stop or Stop-and-Proceed. Entry at a switch without an electric switch lock (or with a broken seal) → RESTRICTED speed to the next signal unless/until the track is seen clear and the signal permits otherwise. If the emergency release of an electric switch lock had to be used, move at RESTRICTED speed to the next signal.',
    ['ctc', 'signals', 'switching'], ['op-568', 'op-573']),

  O('op-571', '571', 'CTC — Restoring Signals to Stop',
    'Signals must not be restored to Stop when the train/transfer for which they were first cleared is less than three blocks from the first of those signals, unless the engineer has acknowledged being stopped or able to stop without passing the controlled signal to be restored. In an emergency a signal may be restored to Stop at any time.',
    ['ctc', 'signals'], ['op-560']),

  O('op-573', '573', 'CTC — Reversing Direction',
    'Having passed beyond a block\'s limits, a train/transfer must not back into that block until the RTC is informed and it is authorized by: a block-signal indication (other than a Restricting Signal with an "R" plate or a Stop-and-Proceed Signal); Rule 564/567.3; or Rule 566/567/577 (which doesn\'t dispense with Rule 564 at a Stop Signal except under 566(g)/577(f)). A movement that entered a controlled location on signal indication and stopped with its trailing end inside may move the opposite way within the controlled location only with RTC permission, complying with Rule 104.2(b) unless relieved (permission doesn\'t authorize occupancy outside the controlled location). Provided it won\'t re-enter a block it has cleared, a movement may reverse within a block without 566/567/577: ≤300 ft with a crew member positioned to see the section is and will remain clear; >300 ft with a flagman positioned beyond the farthest point, giving stop signals visible from at least 300 yards.',
    ['ctc', 'movement', 'signals'], ['op-564', 'op-570', 'sw-104-2']),

  O('op-576', '576', 'CTC — Switching at a Controlled Location',
    'Switching at a controlled location. (a) Preferred — by signal indication: the RTC signals the movement over the controlled location with directional signals; if it can\'t clear when done, the RTC authorizes departure by Rule 566/577 (if the first move in was under Rule 564, operate to the next signal at RESTRICTED speed; Rule 566/577 isn\'t needed where the RTC verbally authorizes pulling ahead to the next signal with no dual-control switches). (b) Switching signals — a crew member requests the switching signal for multiple moves on a route; when done, advise the RTC to cancel it (first confirm all crew are and will remain clear of its limits); if unable to clear, the RTC verbally authorizes departure then cancels the signal, and the movement proceeds to the next signal at RESTRICTED speed. (c) With 566.1/577.1 signals suspended, the movement must be authorized into the block before the authority is issued, and must advise the RTC before leaving if it can\'t clear. (d) Taking head-room — provided the trailing end stays within non-main-track territory, a movement may accept a signal to enter a controlled location for that purpose.',
    ['ctc', 'switching', 'signals'], ['op-566', 'op-566-1', 'sw-104-2']),

  O('op-577', '577', 'CTC — Work Authority (Optional to 566/567, with system)',
    'Optional system-based work authority (alternative to Rules 566/567): a movement may be given written work authority to move in either direction within specified limits. The RTC first ensures no others are within or authorized into the limits and blocks at Stop all signals governing entry; others may be authorized to work within the limits only when restricted "Protect against work (number) between (location) and (location)." Where entry is by signal indication, the signal may be requested only within two controlled blocks of the limits (or 25 miles where none precedes), with the RTC ensuring it is the only movement to encounter the entry signal. Movements so authorized don\'t enter until a written understanding is established with each affected crew, kept until they have left the limits. The RTC maintains blocking until cancelled (each clear before cancellation; the last may be cancelled while inside, informing the RTC of direction). Controlled signals within the limits other than entry/exit showing STOP may be treated as "proceed at RESTRICTED speed" (not at automatic or foreign-railway interlockings); Rule 104.2(b) does not apply when the RTC advises the dual-control switches are lined for the route.',
    ['ctc', 'authority', 'protection'], ['op-566', 'op-567', 'op-577-1']),

  O('op-577-1', '577.1', 'CTC — Signal Indication Suspended While Switching (Optional to 566.1)',
    'Optional system-based version of Rule 566.1: a movement may be authorized to manually operate specific dual-control switches at a controlled location (per Rule 104.2(d)), included with Rule 577 work authority; the governing signal indications may be considered suspended while those switches are in the "hand" position, but only while switching at the designated controlled locations (verbal permission may be given for switches not included). Over a spring switch within Rule 577 limits, the governing signal may be considered suspended if the switch is properly lined.',
    ['ctc', 'switching', 'signals'], ['op-577', 'op-566-1']),

  O('op-578', '578', 'CTC — Radio Broadcast Requirements',
    'Within single track, a crew member on every train/transfer must broadcast on the designated standby channel the name of the signal displayed on the advance signal to the next controlled location, controlled point or interlocking. A crew member off the engine confirms the broadcast was made; if unable to confirm, immediate action must be taken to stop the movement before it reaches the next controlled location, controlled point or interlocking.',
    ['ctc', 'radio', 'movement'], ['op-315', 'op-560']),

  // ----- ABS · Automatic Block Signal System (505–515) -----
  O('op-505', '505', 'ABS — Application',
    'Block signals govern the use of the blocks. They do not dispense with the use or observance of other signals whenever and wherever required, and do not authorize main-track occupancy.',
    ['abs', 'signals'], ['op-507', 'op-509']),

  O('op-507', '507', 'ABS — Withdrawal of Signals',
    'When ABS signals are withdrawn from service, movements are governed by instructions from the RTC or by special instructions.',
    ['abs'], ['op-505', 'def-rtc']),

  O('op-509', '509', 'ABS — Instructions to Pass Signal Indicating Stop',
    'A movement must have RTC instructions to pass a block signal indicating Stop; if stopped at it with no conflicting movement evident, a crew member must immediately contact the RTC. (Exception: not required to re-enter a block occupied by a portion of the same movement, but proceed at REDUCED speed.) When able, the RTC informs the crew in writing "There is no conflicting movement" — then, after complying with Rule 513 where applicable, the movement need not stop but must positively identify the signal by number and may proceed at RESTRICTED speed to the next signal or Block End sign. If the RTC can\'t confirm there is no conflict and none is evident, the movement may (after Rule 513 where applicable) move forward and stop with its leading wheels 100 feet past the Stop signal; after waiting 10 minutes with still no evidence of a conflicting movement, it may proceed at RESTRICTED speed to the next signal or Block End sign.',
    ['abs', 'signals', 'authority'], ['op-513', 'op-565', 'def-rtc']),

  O('op-513', '513', 'ABS — Entering Main Track',
    'Before entering or fouling a main track with no movement observed approaching, a crew member reverses the switch and waits five minutes (or longer if special instructions require) before letting the movement move foul, remaining at the switch until the movement has entered the track and quickly restoring it to normal if an approaching movement becomes evident. Through a crossover, only the switch in the track the movement is standing on is reversed for the waiting period. The waiting period need not be observed within cautionary limits, or when an opposing movement has passed the switch and still occupies the block, the entering crew holds a clearance to work, or the crew is relieved in writing by the RTC (who first ensures no movements in the block will approach the switch; the switch must be opened within 5 minutes of permission). A movement entering a block between signals moves at RESTRICTED speed to the next signal unless/until the track is seen clear and the signal permits otherwise.',
    ['abs', 'switching', 'signals'], ['op-509', 'op-94']),

  O('op-515', '515', 'ABS — Delayed in the Block',
    'When a movement that entered a block on a signal indication permitting other than RESTRICTED speed is stopped or otherwise delayed in the block, it must move at REDUCED speed to the next signal — unless there are no switches between it and the next signal, or until the track is seen clear to the next signal — approaching the next signal prepared to stop and governed by the indication displayed.',
    ['abs', 'signals', 'movement'], ['op-505', 'op-509']),

  // ----- Interlocking (601–619) -----
  O('op-601', '601', 'Interlocking — Application',
    'A movement is governed by interlocking rules within interlocking limits; interlocking signal indications govern the use of the routes within those limits. A signalman may issue instructions when necessary.',
    ['interlocking', 'signals', 'authority'], ['op-602', 'op-607']),

  O('op-602', '602', 'Interlocking — Proper Signal Indications Required',
    'Except in emergency, radio or hand signals must not be used when the proper indication can be displayed by the interlocking signals. A movement stopped by the signalman other than by signal indication, while approaching or within an interlocking, must not move in either direction until the proper signal or instructions are received from the signalman. A movement that stops with its trailing end within interlocking limits must not reverse without the proper interlocking signal indication or the signalman\'s permission.',
    ['interlocking', 'signals'], ['op-601', 'op-612']),

  O('op-604', '604', 'Interlocking — Establishing and Changing Routes',
    'Signals for an approaching movement must not be restored to Stop unless the locomotive engineer has acknowledged being stopped or able to stop without passing the interlocking signal to be restored (in emergency a signal may be restored to Stop at any time). No part of a route may be changed, nor signals cleared for a conflicting route, unless the engineer of the movement for which the route was cleared has acknowledged being able to comply with the new routing.',
    ['interlocking', 'signals'], ['op-601']),

  O('op-605', '605', 'Interlocking — Delayed in Timing Circuit',
    'A movement approaching an automatic interlocking equipped with a timing circuit must approach the interlocking signal prepared to stop if it occupies the timing circuit longer than the time specified in special instructions. At automatic interlockings without a timing circuit, a movement occupying the track between the advance signal and the interlocking signal more than 5 minutes must approach the interlocking signal prepared to stop.',
    ['interlocking', 'signals'], ['op-606', 'op-611']),

  O('op-606', '606', 'Interlocking — Approaching Interlocking Limits',
    'At a location not protected by an advance signal, a movement must approach interlocking limits prepared to comply with a signal indicating Stop.',
    ['interlocking', 'signals'], ['op-605']),

  O('op-607', '607', 'Interlocking — Rule Applicable at a Stop Signal',
    'When an interlocking signal indicates Stop and no conflicting movement is evident, the applicable rule depends on the type of interlocking (as indicated in special instructions): Manual → Rule 608; Locally-Controlled → 609; Remotely-Controlled → 610; Automatic → 611.',
    ['interlocking', 'signals'], ['op-608', 'op-609', 'op-610', 'op-611']),

  O('op-608', '608', 'Interlocking — Manual Interlocking',
    'Movements operating through the limits of a manual interlocking are governed by special instructions.',
    ['interlocking'], ['op-607']),

  O('op-609', '609', 'Interlocking — Locally-Controlled Signal Indicating Stop',
    'A movement must have authority to pass a locally-controlled interlocking signal indicating Stop. With no conflicting movement evident, the signalman may authorize it after providing protection against all conflicting movements; the authorized movement need not stop but must positively identify the signal by number, operate at RESTRICTED speed to the next signal or Block End sign, and comply with the switch rules (104.1 spring, 104.2 dual-control, 104.3 power-operated). The engineer must be informed of the situation before moving. When the signalman is off duty, a movement stopped by such a signal is governed by special instructions.',
    ['interlocking', 'signals', 'authority'], ['op-607', 'sw-104-2']),

  O('op-610', '610', 'Interlocking — Remotely-Controlled Signal Indicating Stop',
    'A movement must have authority to pass a remotely-controlled interlocking signal indicating Stop. The signalman may authorize it after ensuring no conflicting movement is in the route to be used and all devices controlling signals for conflicting movements are blocked at Stop; the authorization specifies the route and is in writing. The movement need not stop but must positively identify the signal by number, operate at RESTRICTED speed to the next signal or Block End sign, and comply with the switch rules (104.1/104.2/104.3). If there is a railway crossing at grade with a box marked "switches" within the interlocking, Rule 611 applies. The engineer must know the route before moving.',
    ['interlocking', 'signals', 'authority'], ['op-607', 'op-611', 'sw-104-2']),

  O('op-611', '611', 'Interlocking — Automatic Signal Indicating Stop',
    'When stopped by an automatic interlocking signal indicating Stop, paragraphs (a)–(c) apply when no other movement or track work is evident; (d) applies when track work is evident. (a) Open the box marked "switches" and observe panel lights where provided: if the conflicting route\'s lights are lit and no conflicting movement is evident, open the knife switch and proceed; (multi-track) likewise also considering the adjacent same-railway track; where lights aren\'t provided or the conflicting route isn\'t lit, after opening the knife switch wait five minutes (or longer if posted) before proceeding — multi-track: if the adjacent same-railway track\'s lights aren\'t lit and no movement is approaching, contact the RTC before opening the knife switch. Then operate at RESTRICTED speed to the next signal or Block End sign; after occupying the crossing, close the switch and lock the box. (b) Where a pushbutton allows a reverse move over the crossing, open the box, press it and be governed by signal indication (if it won\'t clear, follow (a)). (c) When switching within or into automatic interlocking limits, after complying with (a)(iii) leave the knife switch open until done — signals governing the switching may be considered suspended only while switching. (d) When track work is evident (an "840.3 Protection" indicator or a special lock on the box), stop and do not proceed until the foreman instructs; when authorized, move at RESTRICTED speed to the next signal or Block End sign.',
    ['interlocking', 'switching', 'signals'], ['op-607', 'op-618']),

  O('op-612', '612', 'Interlocking — Stopped Foul of Signal',
    'A movement that accepted an interlocking signal permitting it to proceed but stops before the leading locomotive or car has completely passed the signal may proceed only after receiving the signalman\'s permission or under Rule 611.',
    ['interlocking', 'signals'], ['op-602', 'op-611']),

  O('op-614', '614', 'Interlocking — Leaving Interlocking in ABS or CTC',
    'Where an interlocking is located in ABS or CTC, the indication of the last interlocking signal in the direction of travel also governs the movement to the next signal or Block End sign. If it is necessary to pass that signal under Rule 609/610/611, then (unless special instructions provide otherwise) Rule 509 or 564 also applies beyond the interlocking limits.',
    ['interlocking', 'signals'], ['op-509', 'op-564']),

  O('op-615', '615', 'Interlocking — Single Unit of Equipment Restricted',
    'A single unit of equipment must not be left standing on the movable portion of an interlocked drawbridge or within the interlocking limits of a railway crossing at grade.',
    ['interlocking', 'securing'], ['op-601']),

  O('op-616', '616', 'Interlocking — Damage to Interlocking',
    'When it is known or suspected that a derailment has occurred, or that track, appliances or signals are damaged or malfunctioning, the signalman must block at Stop all controls for signals governing movements over the affected routes; no move is permitted until the signalman has established that it may pass safely.',
    ['interlocking', 'protection'], ['op-617']),

  O('op-617', '617', 'Interlocking — Disconnecting Track Parts or Locking Devices',
    'Before any movement passes over a movable track part or locking device that has been disconnected, all affected movable parts must be spiked or secured in the required position and their controls blocked to prevent operation.',
    ['interlocking', 'protection'], ['op-616']),

  O('op-618', '618', 'Interlocking — Protecting Against a Foreman',
    'A movement may be authorized to enter or move within TOP limits when instructed to protect against the foreman — "Protect against foreman (name) between (location) and (location)." Both conductor and engineer must know the authority and have the foreman\'s instructions (repeated to and acknowledged by the foreman) before moving. The signalman maintains signal blocking against all other movements and must not authorize another movement, or issue another TOP to apply, within the protected limits until cancelled; on cancellation, other crew members are advised immediately and all copies of the cancelled authority destroyed.',
    ['interlocking', 'protection', 'authority'], ['op-618-1', 'def-foreman']),

  O('op-618-1', '618.1', 'Interlocking — Protecting Against a Foreman (Optional, with system)',
    'Optional alternative to Rule 618: each time authorized, the movement is restricted "Protect against foreman (name) between (location) and (location)," provided when within two controlled blocks of the limits (or 25 miles where none precedes), with the RTC ensuring it is the only movement that will encounter the entry signal. No entry until both conductor and engineer know the authority/limits and have the foreman\'s instructions (repeated to and acknowledged). In addition, the movement must also be authorized to enter the TOP limits by signal indication or Rule 609/610, or to reverse within them with the signalman\'s permission.',
    ['interlocking', 'protection', 'authority'], ['op-618', 'def-foreman']),

  O('op-619', '619', 'Interlocking — Transfer by Signalmen',
    'Where an ECM or a computer-assisted system generates the required list, the relieving signalman signs into the system in the presence of the on-duty signalman and receives verbal and/or written transfer of other necessary instructions and information. Otherwise, before being relieved the signalman makes a written transfer (in a book or on a form) of TOPs and other authorities in effect, including the time and other necessary information, signed by both the relieved and the relieving signalman.',
    ['interlocking', 'crew'], ['op-147']),

  O('op-620', '620', 'Interlocking — Non-Interlocked Drawbridges and Railway Crossings at Grade',
    'A movement must stop before any part of it passes the governing stop sign at a non-interlocked drawbridge or a non-interlocked railway crossing at grade. If no conflicting movement is evident and the route is properly lined, the movement may resume. Special instructions govern when there is an attendant in charge.',
    ['interlocking', 'signals'], ['op-615', 'op-601']),

  // ----- SCS · Special Control System (351–353) -----
  O('op-351', '351', 'SCS — Application',
    'On portions of the railway specified by special instructions, the use of the main track is governed by the Special Control System.',
    ['scs', 'authority'], ['op-352', 'op-353']),

  O('op-352', '352', 'SCS — Supervision',
    'Movements and track-work protection under SCS are, unless otherwise provided, supervised by the RTC, who issues instructions as required.',
    ['scs', 'authority'], ['op-351', 'def-rtc']),

  O('op-353', '353', 'SCS — Special Instructions',
    'Special instructions necessary to govern this method of operation will be issued; except as affected by those instructions and Rules 351 and 352, all Operating Rules remain in force.',
    ['scs'], ['op-351', 'op-352']),

  // ----- SCT · Siding Control Territory (360–364) -----
  O('op-360', '360', 'SCT — Application',
    'Where specified by special instructions, the use of non-signalled sidings within CTC is governed by the Siding Control Territory (SCT) rules.',
    ['sct', 'authority'], ['op-361', 'def-ctc']),

  O('op-361', '361', 'SCT — Supervision',
    'Movements, protection of track work and operation of track units under SCT are, unless otherwise provided, supervised by the RTC, who issues instructions as required.',
    ['sct', 'authority'], ['op-360', 'def-rtc']),

  O('op-362', '362', 'SCT — Clear of Equipment',
    'Sidings are considered clear of equipment unless the RTC informs otherwise. Before permitting a movement to enter a siding occupied by other equipment, the RTC must advise a crew member that other equipment occupies it.',
    ['sct'], ['op-360']),

  O('op-363', '363', 'SCT — Hand Operated Switches',
    'Hand-operated switches in sidings may be considered lined for the normal position unless advised otherwise by the RTC, GBO or special instruction.',
    ['sct', 'switching'], ['op-360']),

  O('op-364', '364', 'SCT — Protection of Track Work and Operation of Track Units',
    'A foreman must hold a TOP for the protection of track work and operation of track units; Rule 41/841 is not applicable.',
    ['sct', 'protection'], ['op-360', 'op-41']),

  // ----- TOP / track-work (800s) — conductor-relevant subset (foreman section otherwise) -----
  O('op-801', '801', 'OCS Clearance in Lieu of TOP',
    'A clearance may be issued in lieu of a TOP; the provisions of Rules 80(b), 82, 85, 302, 308.1, 311, 803(c) and 849 then apply.',
    ['top', 'authority'], ['op-311', 'op-849']),

  O('op-802', '802', 'Track Unit Speed',
    'Unless otherwise authorized, track units must always be operated at track-unit speed.',
    ['top'], ['op-803']),

  O('op-803', '803', 'Track Unit and Track Work Authorization',
    'How a track unit or track work is authorized to occupy track, by territory — OCS: Rule 842, TOP or clearance; CTC: Rule 842 or TOP; signalled track: Rule 842 or TOP; cautionary limits: Rule 94 (track units) / Rules 841, 842 or TOP (track work); non-main track: Rule 841 (or Rule 105(c)/known-clear, TOP where SCT applies, or other specified protection); where kicking is permitted (113.5(a)), the track must be protected by Rule 841(c)(i) or (iii). When no longer required, the foreman promptly cancels or removes the protection and advises the person responsible for the track. Before removal, cancellation or expiry — or before instructing a movement — the foreman must ensure (unless otherwise protected) the track is safe for normal-speed movement and that the employees/track units under their charge are clear.',
    ['top', 'track-work', 'authority'], ['op-94', 'op-802', 'sw-113-5']),

  O('op-849', '849', 'Before Issuing TOP Authority',
    'Before issuing TOP authority, the RTC must ensure there is no conflicting movement within, or authorized to enter, the TOP limits unless it has been restricted under Rule 311/567.1/567.2/618/618.1, and — in CTC and controlled interlockings — block at Stop all devices controlling signals governing entry into the limits, maintaining that blocking until the TOP is cancelled to the foreman.',
    ['top', 'authority', 'protection'], ['op-311', 'op-567-1', 'op-618']),

  O('op-850', '850', 'Same or Overlapping TOP Limits',
    'The RTC must not authorize a movement to enter overlapping TOP limits.',
    ['top', 'authority'], ['op-849']),

  O('op-851', '851', 'TOP Authority Within Cautionary Limits',
    'A TOP must not be issued to apply within cautionary limits where movements operate that the RTC cannot control. The RTC must not authorize a movement to the cautionary-limit sign while a TOP is in effect within those limits.',
    ['top', 'authority', 'protection'], ['op-94', 'op-849']),

  O('op-852', '852', 'TOP Encompassing Controlled Locations',
    'When a TOP authorizes occupying a track within a controlled location, the authority includes any track within the controlled location that connects to it — but only to a point on the connecting track where occupancy would require separate TOP authority.',
    ['top', 'authority'], ['op-849']),

  O('op-853', '853', 'TOP Remains in Effect',
    'A TOP, once in effect, continues until superseded or cancelled.',
    ['top', 'authority'], ['op-864']),

  O('op-864', '864', 'TOP Cancellation',
    'The foreman advises the RTC of the TOP number to cancel; the RTC states the TOP number and limits, which the foreman acknowledges as correct; the RTC states the TOP number, "cancelled" and the RTC initials, which the foreman repeats; the cancellation takes effect only once correctly repeated and acknowledged by the foreman.',
    ['top', 'authority'], ['op-853', 'op-849']),
];
