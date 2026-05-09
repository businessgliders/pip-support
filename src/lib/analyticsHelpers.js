// Helpers to compute analytics from a list of SupportTicket records.

const parseDate = (s) => {
  if (!s) return null;
  const iso = typeof s === "string" && !s.endsWith("Z") && !s.includes("+") ? s + "Z" : s;
  return new Date(iso);
};

export function computeKpis(tickets) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = tickets.filter((t) => {
    const d = parseDate(t.created_date);
    return d && d >= startOfThisMonth;
  });
  const lastMonth = tickets.filter((t) => {
    const d = parseDate(t.created_date);
    return d && d >= startOfLastMonth && d < startOfThisMonth;
  });

  const totalThisMonth = thisMonth.length;
  const totalLastMonth = lastMonth.length;
  const monthChange = totalLastMonth === 0
    ? (totalThisMonth > 0 ? 100 : 0)
    : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

  const cancellations = tickets.filter((t) => t.inquiry_type === "Cancellation");
  const cancellationRatio = tickets.length === 0 ? 0 : (cancellations.length / tickets.length) * 100;

  const acceptedDiscounts = cancellations.filter((t) => t.discount_accepted === true);
  const retentionRate = cancellations.length === 0 ? 0 : (acceptedDiscounts.length / cancellations.length) * 100;

  const closed = tickets.filter((t) => t.status === "Closed" || t.status === "Resolved");
  const resolutionTimes = closed
    .map((t) => {
      const created = parseDate(t.created_date);
      const updated = parseDate(t.updated_date);
      if (!created || !updated) return null;
      return (updated - created) / (1000 * 60 * 60); // hours
    })
    .filter((v) => v !== null && v >= 0);
  const avgResolutionHours = resolutionTimes.length === 0
    ? 0
    : resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;

  const openTickets = tickets.filter((t) => !t.archived && (t.status === "New" || t.status === "In Progress"));
  const oldestOpen = openTickets.reduce((oldest, t) => {
    const d = parseDate(t.created_date);
    if (!d) return oldest;
    if (!oldest || d < oldest.date) return { date: d, ticket: t };
    return oldest;
  }, null);
  const oldestOpenDays = oldestOpen ? Math.floor((now - oldestOpen.date) / (1000 * 60 * 60 * 24)) : 0;

  return {
    totalThisMonth,
    monthChange,
    cancellationRatio,
    cancellationCount: cancellations.length,
    retentionRate,
    acceptedDiscounts: acceptedDiscounts.length,
    avgResolutionHours,
    openCount: openTickets.length,
    oldestOpenDays,
  };
}

export function computeMonthlyTrend(tickets, monthsBack = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      total: 0,
      cancellations: 0,
    });
  }
  const bucketMap = Object.fromEntries(buckets.map((b) => [b.key, b]));

  tickets.forEach((t) => {
    const d = parseDate(t.created_date);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (bucketMap[key]) {
      bucketMap[key].total += 1;
      if (t.inquiry_type === "Cancellation") bucketMap[key].cancellations += 1;
    }
  });

  return buckets;
}

export function computeCancellationReasons(tickets) {
  const counts = {};
  tickets
    .filter((t) => t.inquiry_type === "Cancellation" && t.cancellation_reason)
    .forEach((t) => {
      counts[t.cancellation_reason] = (counts[t.cancellation_reason] || 0) + 1;
    });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function computeRepeatClients(tickets) {
  const byEmail = {};
  tickets.forEach((t) => {
    if (!t.client_email) return;
    const key = t.client_email.toLowerCase();
    if (!byEmail[key]) {
      byEmail[key] = {
        email: t.client_email,
        name: t.client_name,
        count: 0,
        cancellations: 0,
        lastDate: null,
      };
    }
    byEmail[key].count += 1;
    if (t.inquiry_type === "Cancellation") byEmail[key].cancellations += 1;
    const d = parseDate(t.created_date);
    if (d && (!byEmail[key].lastDate || d > byEmail[key].lastDate)) {
      byEmail[key].lastDate = d;
      byEmail[key].name = t.client_name || byEmail[key].name;
    }
  });

  return Object.values(byEmail)
    .filter((c) => c.count >= 2)
    .map((c) => ({
      ...c,
      lastActivity: c.lastDate
        ? c.lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}