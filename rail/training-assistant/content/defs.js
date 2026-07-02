// ==========================================================================
// CONTENT · DEFINITIONS — verbatim CROR definitions, each cited (trust:rulebook).
// Source: Canadian Rail Operating Rules, Jan 28 2025, "DEFINITIONS" section
// (incl. its OCCUPATIONAL TERMS, SWITCHES, and SPEEDS sub-lists). The source PDF
// is gitignored; the cited text lives here because being the cited reference IS
// the product. Run `node tools/validate.mjs` after edits.
// ==========================================================================

const SRC = 'Canadian Rail Operating Rules — Jan 28, 2025';
const D = (id, title, body, tags = [], related = []) =>
  ({ id, domain: 'defs', ref: 'CROR — Definitions', source: SRC, trust: 'rulebook', title, body, tags, related });

export const defs = [
  // ----- equipment & movements -----
  D('def-engine', 'Engine', 'A locomotive(s) operated from a single control or a cab control car, used in train, transfer or yard service.', ['equipment', 'yard'], ['def-engine-yard-service', 'def-equipment']),
  D('def-engine-yard-service', 'Engine in Yard Service', 'An engine with or without cars utilized exclusively in switching, marshalling, humping, trimming and industrial switching.', ['yard', 'switching'], ['def-engine']),
  D('def-equipment', 'Equipment', 'One or more engines and/or cars which can be handled on their own wheels in a movement.', ['equipment'], ['def-engine']),
  D('def-movement', 'Movement(s)', 'The term used in these rules to indicate that the rule is applicable to trains, transfers or engines in yard service.', ['equipment']),
  D('def-marker', 'Marker', 'When used, will indicate the last piece of equipment in a movement. It will be one of the following: a red light, a red reflectorized plaque, a sense and braking unit (SBU); or an occupied caboose, distributed power remote locomotive consist or distributed braking car, when the last piece of equipment in the direction of travel.', ['equipment']),

  // ----- switching moves -----
  D('def-kicking', 'Kicking', 'Pushing equipment then releasing it under its own momentum. Does not include humping.', ['switching', 'kicking'], ['def-humping', 'def-gravity-drop', 'def-running-switch']),
  D('def-gravity-drop', 'Gravity Drop', 'Releasing stationary equipment and permitting it to roll under its own momentum.', ['switching', 'kicking'], ['def-kicking', 'def-humping']),
  D('def-running-switch', 'Running Switch', 'Pulling equipment then releasing it under its own momentum.', ['switching'], ['def-kicking']),
  D('def-humping', 'Humping', 'Pushing equipment at a regulated speed then releasing it under its own momentum, in an engineered environment where the route and speed are controlled through automated or assisted devices.', ['switching', 'yard'], ['def-kicking', 'def-gravity-drop']),

  // ----- track & territory -----
  D('def-main-track', 'Main Track', 'A track of a subdivision extending through and between stations governed by one or more methods of control upon which movements, track units and track work must be authorized.', ['track'], ['def-non-main-track', 'def-method-of-control']),
  D('def-non-main-track', 'Non-Main Track (NMT)', 'Any track(s) other than those listed in time table columns as having CTC, OCS, ABS or Cautionary Limits applicable and unless otherwise provided include a requirement to operate at REDUCED speed.', ['track'], ['def-main-track', 'def-spd-reduced']),
  D('def-single-track', 'Single Track', 'One main track on a subdivision at a location.', ['track'], ['def-multi-track']),
  D('def-multi-track', 'Multi-Track', 'Two or more main tracks of a subdivision at the same location.', ['track'], ['def-single-track']),
  D('def-crossover', 'Crossover', 'A track joining adjacent main tracks, or a main track and another track.', ['track']),
  D('def-siding', 'Siding', 'A track adjacent and connected to the main track which is so designated in the time table, GBO or operating bulletin.', ['track'], ['def-signalled-siding', 'def-non-signalled-siding']),
  D('def-signalled-siding', 'Signalled Siding', 'A siding where CTC rules apply.', ['track'], ['def-siding']),
  D('def-non-signalled-siding', 'Non-Signalled Siding', 'A siding where non-main track rules apply, the use of which may be governed by special instructions.', ['track'], ['def-siding']),
  D('def-method-of-control', 'Method of Control', 'Rules and/or special instructions governing the use of a track(s).', ['track', 'control']),
  D('def-heavy-grade', 'Heavy Grade', 'A portion of a track 2 miles in length or greater, with an average grade greater than 1.0%, and less than or equal to 1.8%.', ['track', 'grade'], ['def-mountain-grade']),
  D('def-mountain-grade', 'Mountain Grade', 'A portion of a track 2 miles in length or greater, with an average grade greater than 1.8%.', ['track', 'grade'], ['def-heavy-grade']),
  D('def-grade-crossing', 'Grade Crossing', 'Any location where a railway track intersects with an authorized road, sidewalk, path, or trail, excluding Railway Company Grade Crossings.', ['track', 'crossing']),
  D('def-high-risk-location', 'High Risk Location', 'A track, or portion of a track, other than a main track, subdivision track, or siding; identified in special instructions, on which unattended equipment requires the application of Rule 112(a).', ['track', 'securing']),

  // ----- control systems -----
  D('def-ctc', 'Centralized Traffic Control System (CTC)', 'A system in which CTC rules apply.', ['control'], ['def-controlled-signal', 'def-controlled-location']),
  D('def-ocs', 'Occupancy Control System (OCS)', 'A system in which OCS rules apply.', ['control']),
  D('def-abs', 'Automatic Block Signal System (ABS)', 'A series of consecutive blocks in which ABS rules apply.', ['control', 'signals'], ['def-block']),
  D('def-cautionary-limits', 'Cautionary Limits', 'That portion of the main track or main tracks within limits defined by cautionary limit sign(s).', ['control', 'track']),
  D('def-interlocking', 'Interlocking', 'An arrangement of interconnected signals and signal appliances for which interlocking rules and special instructions are in effect.', ['control', 'signals'], ['def-interlocking-limits', 'def-interlocking-signal']),
  D('def-interlocking-limits', 'Interlocking Limits', 'The tracks between the extreme or outer opposing interlocking signals of an interlocking.', ['control', 'signals'], ['def-interlocking']),

  // ----- signals & blocks -----
  D('def-block', 'Block', 'A length of track of defined limits, the use of which by a movement is governed by block signals.', ['signals'], ['def-block-signal']),
  D('def-block-signal', 'Block Signal', 'A fixed signal at the entrance to a block to govern a movement entering or using that block.', ['signals'], ['def-block', 'def-fixed-signal']),
  D('def-fixed-signal', 'Fixed Signal', 'A signal or sign at a fixed location indicating a condition affecting the operation of a movement.', ['signals'], ['def-advance-signal', 'def-block-signal']),
  D('def-advance-signal', 'Advance Signal', 'A fixed signal used in connection with one or more signals to govern the approach of a movement to such signal.', ['signals'], ['def-fixed-signal']),
  D('def-interlocking-signal', 'Interlocking Signal', 'A fixed signal at the entrance to or within interlocking limits to govern the use of the routes.', ['signals'], ['def-interlocking']),
  D('def-controlled-signal', 'Controlled Signal', 'A CTC block signal which is capable of displaying a Stop indication until requested to display a less restrictive indication by the RTC.', ['signals', 'control'], ['def-block-signal', 'def-controlled-location']),
  D('def-controlled-block', 'Controlled Block', 'A block in CTC between consecutive controlled locations or points.', ['signals', 'control'], ['def-ctc']),
  D('def-controlled-location', 'Controlled Location', 'A location in CTC the limits of which are defined by opposing controlled signals.', ['control'], ['def-controlled-point']),
  D('def-controlled-point', 'Controlled Point', 'A signal location in CTC consisting of controlled signal(s) in one direction only.', ['control'], ['def-controlled-location']),
  D('def-signal-indication', 'Signal Indication', 'The information conveyed by a fixed signal.', ['signals'], ['def-fixed-signal']),

  // ----- bulletins & comms -----
  D('def-gbo', 'General Bulletin Order(s) (GBO)', 'Instructions regarding track condition restrictions and other information that affect the safety and operation of a movement.', ['bulletins']),
  D('def-dob', 'Daily Operating Bulletin (DOB)', 'A document containing applicable information from each GBO, instructions and other information requiring compliance within limits indicated in special instructions.', ['bulletins'], ['def-gbo']),
  D('def-ecm', 'Electronic Communications Method (ECM)', 'An electronic method for transmission and cancellation of authorities, instructions or information.', ['comms']),
  D('def-schedule', 'Schedule', 'Information pertaining to the operating times of a passenger train.', ['operations']),

  // ----- occupational terms -----
  D('def-conductor', 'Conductor', 'An employee in charge of the operation of a movement.', ['roles'], ['def-assistant-conductor', 'def-locomotive-engineer']),
  D('def-assistant-conductor', 'Assistant Conductor', 'An employee working under the supervision of a conductor. May also be referred to as trainman or yardman.', ['roles'], ['def-conductor']),
  D('def-locomotive-engineer', 'Locomotive Engineer', 'An employee in control of the engine.', ['roles'], ['def-conductor']),
  D('def-employee', 'Employee', 'A person qualified to regulatory and company standards employed by the company. Applies to contract employees and employees of other companies and railways operating and/or performing other rules related duties on the host railway trackage.', ['roles']),
  D('def-rtc', 'Rail Traffic Controller (RTC)', 'An employee in charge of the supervision and direction of movements and for the provision of protection for track work and track units on a specified territory.', ['roles', 'control'], ['def-proper-authority']),
  D('def-proper-authority', 'Proper Authority', 'The rail traffic controller or the appropriate railway supervisor.', ['roles'], ['def-rtc']),
  D('def-foreman', 'Foreman', 'An employee in charge of the protection of track work and track units.', ['roles']),
  D('def-pilot', 'Pilot', 'An employee assigned to a movement when the locomotive engineer or conductor, or both, are not fully acquainted with the physical characteristics or rules of the railway over which the movement is to be operated.', ['roles']),
  D('def-switchtender', 'Switchtender', 'An employee that handles switches for other employees.', ['roles', 'switch']),

  // ----- switches -----
  D('def-switch', 'Switch', 'A device used to route equipment or a track unit from one track to another.', ['switch'], ['def-switch-spring', 'def-switch-dual-control']),
  D('def-switch-hand-operated-main', 'Main Track Hand Operated Switch', 'A switch connected to the main track used to route equipment or a track unit to or from the main track. (Switch targets may be different shapes but must not be diamond shape.)', ['switch'], ['def-switch']),
  D('def-switch-hand-operated-nmt', 'Non-Main Track Hand Operated Switch', 'A switch used to route equipment or a track unit within non-main track territory. (Switch targets may be different shapes but must not be diamond shape.)', ['switch'], ['def-switch']),
  D('def-switch-spring', 'Spring Switch', 'A switch equipped with a spring mechanism arranged to restore the switch points to normal position after having been trailed through.', ['switch'], ['def-switch-semi-automatic']),
  D('def-switch-semi-automatic', 'Semi-Automatic Switch', 'A non-main track switch equipped with an internal securing mechanism that permits equipment to trail through the switch points thus setting the switch for the route being used. (Switch targets must be diamond shaped.)', ['switch'], ['def-switch-spring']),
  D('def-switch-auto-normal', 'Auto-Normal Switch', 'A locally-controlled switch, which will automatically restore to normal position after a movement has cleared the switch track circuit.', ['switch']),
  D('def-switch-dual-control', 'Dual Control Switch', 'A switch equipped for powered and hand operation.', ['switch'], ['def-switch-power-operated']),
  D('def-switch-power-operated', 'Power-Operated Switch', 'A switch equipped for powered operation, but not equipped for hand operation.', ['switch'], ['def-switch-dual-control']),
  D('def-switch-electric-lock', 'Electric Switch Lock', 'An electric lock connected with a hand operated switch to prevent its operation until the lock is released.', ['switch']),

  // ----- speeds -----
  D('def-spd-slow', 'SLOW Speed', 'A speed not exceeding 15 miles per hour.', ['speed'], ['def-spd-medium', 'def-spd-restricted']),
  D('def-spd-medium', 'MEDIUM Speed', 'A speed not exceeding 30 miles per hour.', ['speed'], ['def-spd-slow', 'def-spd-limited']),
  D('def-spd-limited', 'LIMITED Speed', 'A speed not exceeding 45 miles per hour.', ['speed'], ['def-spd-medium']),
  D('def-spd-diverging', 'DIVERGING Speed', 'A speed not exceeding 25 miles per hour.', ['speed'], ['def-spd-turnout']),
  D('def-spd-turnout', 'TURNOUT Speed', 'Unless otherwise provided by signal indication or special instructions, a speed not exceeding 15 MPH.', ['speed'], ['def-spd-diverging']),
  D('def-spd-reduced', 'REDUCED Speed', 'A speed that will permit stopping within one-half the range of vision of equipment.', ['speed'], ['def-spd-restricted']),
  D('def-spd-restricted', 'RESTRICTED Speed', 'A speed that will permit stopping within one-half the range of vision of equipment, also prepared to stop short of a switch not properly lined and in no case exceeding SLOW speed. When moving at RESTRICTED speed, be on the lookout for broken rails. When a broken rail is detected, the movement must be stopped immediately and must not resume until permission is received from the RTC or signalman.', ['speed'], ['def-spd-reduced', 'def-spd-slow']),
];
