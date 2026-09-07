/* Keep these explanations aligned with lib/owner-reports.js and site-analytics.js. */
(() => {
  const trafficScope = 'Uses recorded page views in the selected date range and traffic filters. Excluded or unrecorded visits are not counted.';
  const accountScope = 'Current account total across all dates. The date range and traffic filters do not change this card.';
  const activeTime = 'Active time is recorded while the page is visible, focused, and has had an interaction within the last 60 seconds. It is not the total time a tab stays open.';
  const definitions = {
    visitors: ['Counts distinct browser visitor IDs with at least one matching page view.', 'Use this to assess audience reach. A browser ID is not a verified person: different devices or cleared browser storage can count separately.', trafficScope],
    sessions: ['Counts distinct sessions represented by the matching page views. A session groups a browser’s visits, with a new session after about 30 minutes of inactivity.', 'Use this to assess how often readers visit. One visitor can have several sessions.', trafficScope],
    pageViews: ['Counts recorded page openings, including repeat visits and reloads.', 'Use this to assess how much content is being opened. Compare it with unique visitors to distinguish repeat viewing from audience growth.', trafficScope],
    pagesPerSession: ['Divides matching page views by matching sessions.', 'Use this to assess browsing depth. A value of 1 means one matching page view per session on average; page filters can hide other pages from those sessions.', trafficScope],
    averageSession: ['Adds recorded active seconds across matching page views and divides by the number of matching sessions.', 'Use this to assess average attention per visit. A few long visits can raise the average. ' + activeTime, trafficScope],
    engagedSessions: ['Counts sessions with at least 10 recorded active seconds OR at least 2 matching page views.', 'Use this to assess visits that go beyond a brief, single-page opening. This threshold is a signal of engagement, not proof that someone read or understood the content.', trafficScope],
    lowEngagement: ['Divides sessions below 10 active seconds AND below 2 matching page views by all matching sessions, then multiplies by 100.', 'Use this to spot brief visits worth investigating. For example, 100% with one session means that one session missed both engagement thresholds; it does not prove the page is poor.', trafficScope],
    returningVisitors: ['Counts distinct visitor IDs with at least one matching session marked as returning when it began.', 'Use this to assess repeat readership. Recognition depends on the same browser retaining its visitor ID; it does not require a member login.', trafficScope],
    medianSession: ['Sorts matching session active times and takes the middle value, or the midpoint of the two middle values.', 'Use this to assess a typical visit without letting a few very long visits dominate. Compare it with the average. ' + activeTime, trafficScope],
    recentlyActive: ['Counts distinct visitor IDs in sessions that have activity within the last 5 minutes and are not marked ended.', 'Use this as an estimate of recent presence, not an exact count of people online at this instant.', 'Always uses the latest 5 minutes across the site, independent of the selected date range and traffic filters.'],
    members: ['Counts all account records, including owner, administrator, moderator, suspended, and banned accounts.', 'Use this to assess the size of the registered community. It is not a count of paying members or current visitors.', accountScope],
    active: ['Counts accounts whose current status is active.', 'Use this to assess how many accounts are currently enabled. Active status does not mean the member has recently logged in or is online.', accountScope],
    new_members: ['Counts accounts created within the selected date range.', 'Use this to assess registration growth during the period. Existing accounts are included regardless of their current status.', 'Uses the selected date range and reporting timezone. Search and traffic filters do not change this card.'],
    new_week: ['Counts accounts created in the rolling last 7 days.', 'Use this to assess recent registration momentum. Despite the label, this is not a Monday-to-Sunday calendar week.', 'Uses the service’s current time and a rolling 7-day window, independent of the selected date range.'],
    new_month: ['Counts accounts created since the start of the current calendar month.', 'Use this to assess month-to-date registrations. Compare cautiously with a completed month because the current month is still in progress.', 'Uses the database timezone to define the month boundary, independent of the selected date range.'],
    suspended: ['Counts accounts whose current status is suspended.', 'Use this to assess the current suspension workload. It counts accounts, not suspension events or past suspensions.', accountScope],
    banned: ['Counts accounts whose current status is banned.', 'Use this to assess how many accounts are currently banned. It does not count historical bans on accounts whose status later changed.', accountScope],
    comments: ['Counts all stored comments, including pending, published, and rejected comments.', 'Use this to assess the volume of community contributions. Permanently deleted comments are not included.', 'Site-wide total across all dates. Date, search, and comment-status filters affect the table, not this card.'],
    pendingComments: ['Counts stored comments whose current status is pending, including comments returned to pending by Hide.', 'Use this to assess the moderation queue. Approving a pending comment publishes it and removes it from this count after the record refreshes.', 'Site-wide total across all dates. Date, search, and comment-status filters affect the table, not this card.']
  };
  window.CCCMetricHelp = {
    describe(metric, view) {
      let definition = definitions[metric.key];
      if (!definition && view === 'security') definition = [
        `Counts recorded occurrences of the “${metric.label}” security event. Repeated events from one account can count more than once.`,
        'Use this to monitor authentication and access patterns and investigate unexpected changes. Missing records do not prove that no attempts occurred.',
        'Uses the selected date range and security retention policy. The search filter narrows the event table, not these totals.'
      ];
      if (!definition) definition = [metric.definition || 'The service has not supplied a detailed definition for this metric.', 'Check the corresponding report before drawing conclusions from this value.', 'The reporting scope has not been specified for this metric.'];
      return { measures: definition[0], assessment: definition[1], scope: definition[2] };
    }
  };
})();
