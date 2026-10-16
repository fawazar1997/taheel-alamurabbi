export function attendanceTotals(
  records: { participants: number; attendees: number }[],
) {
  const participants = records.reduce(
    (sum, record) => sum + Number(record.participants),
    0,
  );
  const attendees = records.reduce(
    (sum, record) => sum + Number(record.attendees),
    0,
  );
  return {
    participants,
    attendees,
    rate: participants ? Math.round((attendees / participants) * 100) : 0,
  };
}
