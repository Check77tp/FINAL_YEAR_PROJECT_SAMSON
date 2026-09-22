// Requests created automatically from a preventive-maintenance schedule start
// their description with this prefix. It lets the rest of the system treat
// them differently (they are not student reports, so they must not appear in
// the student "Already reported" feed or count as a recurring fault).
export const PREVENTIVE_PREFIX = 'Preventive maintenance: ';

export const isPreventiveDescription = (description) =>
  typeof description === 'string' && description.startsWith(PREVENTIVE_PREFIX);
