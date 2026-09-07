(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const axisNumber = value => Number(value).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 });
  const rowsFor = chart => (chart.rows || []).filter(row => row.value != null && String(row.value).trim() !== '' && Number.isFinite(Number(row.value)));
  function draw(chart, availableWidth = 600) {
    const rows = rowsFor(chart);
    if (!rows.length) return '<p class="chart-note">No data yet.</p>';
    const width = Math.max(220, Math.round(availableWidth)), height = 260;
    const left = 54, right = width - 18, top = 24, bottom = 205;
    const values = rows.map(row => Number(row.value));
    const low = Math.min(0, ...values), high = Math.max(1, ...values);
    const y = value => bottom - (value - low) / (high - low) * (bottom - top);
    const x = index => rows.length === 1 ? (left + right) / 2 : left + index * (right - left) / (rows.length - 1);
    const ticks = Array.from({ length: 5 }, (_, i) => low + (high - low) * i / 4);
    const labels = [...new Set(rows.length === 1 ? [0] : width < 450 ? [0, rows.length - 1] : [0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
    const shorten = label => {
      const value = String(label || 'Unknown');
      const limit = width < 450 ? 16 : 24;
      return value.length > limit ? value.slice(0, limit - 1) + '…' : value;
    };
    const plot = `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="group" aria-label="${escape(chart.title)}. Select a point for its exact value.">
      ${ticks.map(value => `<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" class="chart-gridline"/><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end">${escape(axisNumber(value))}</text>`).join('')}
      <line x1="${left}" y1="${y(0)}" x2="${right}" y2="${y(0)}" class="chart-baseline"/>
      ${rows.length > 1 ? `<polyline points="${rows.map((row, i) => `${x(i)},${y(Number(row.value))}`).join(' ')}" fill="none" stroke="#102c4c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>` : ''}
      ${rows.map((row, i) => `<circle cx="${x(i)}" cy="${y(Number(row.value))}" r="${rows.length === 1 ? 5 : 3.5}" class="chart-point" tabindex="0" role="button" data-chart-point="${i}" aria-label="${escape(row.label || 'Unknown')}: ${escape(number(row.value))}"><title>${escape(row.label || 'Unknown')}: ${escape(number(row.value))}</title></circle>`).join('')}
      ${labels.map(i => `<text x="${x(i)}" y="232" text-anchor="${rows.length === 1 ? 'middle' : i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'}"><title>${escape(rows[i].label || 'Unknown')}</title>${escape(shorten(rows[i].label))}</text>`).join('')}
    </svg>`;
    return `${plot}<p class="chart-readout" aria-live="polite">${escape(rows[0].label || 'Unknown')}: <b>${escape(number(rows[0].value))}</b></p>${rows.length === 1 ? '<p class="chart-note">One data point is available. A trend needs at least two points.</p>' : ''}${chart.kind !== 'line' ? '<p class="chart-note">Categories are connected in report order; this is not a timeline.</p>' : ''}`;
  }
  let observer;
  function bind(root, charts) {
    observer?.disconnect();
    const redraw = (host, width) => {
      if (host.dataset.chartWidth === String(Math.round(width))) return;
      host.dataset.chartWidth = String(Math.round(width));
      host.innerHTML = draw(charts[Number(host.dataset.chartIndex)], width);
    };
    if (typeof ResizeObserver !== 'undefined') observer = new ResizeObserver(entries => entries.forEach(entry => redraw(entry.target, entry.contentRect.width)));
    root.querySelectorAll('[data-chart-index]').forEach(host => {
      const chart = charts[Number(host.dataset.chartIndex)];
      if (!chart) return;
      redraw(host, host.getBoundingClientRect().width);
      observer?.observe(host);
      const select = event => {
        const point = event.target.closest('[data-chart-point]');
        if (!point || !host.contains(point)) return;
        const row = rowsFor(chart)[Number(point.dataset.chartPoint)];
        host.querySelector('.chart-readout').textContent = `${row.label || 'Unknown'}: ${number(row.value)}`;
      };
      ['pointerover', 'focusin', 'click'].forEach(event => host.addEventListener(event, select));
      host.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
      });
    });
  }
  window.CCCLineCharts = { draw, bind, rowsFor };
})();
