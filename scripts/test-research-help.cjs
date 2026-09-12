'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { createResearchHelpService, VALID_STATUSES, RESEARCH_CATEGORIES } = require('../lib/research-help-service');
const { buildWorkbookXlsx, buildCsv, sanitizeCellText } = require('../lib/excel-export');

function createMockHarness(options = {}) {
  let seq = 1;
  const inquiries = [];
  const activityLog = [];
  const files = [];
  const statusHistory = [];
  const sentEmails = [];

  const query = async (sql, params = []) => {
    const s = String(sql).trim();

    if (s.includes('research_inquiry_seq')) {
      return { rows: [{ seq: seq++ }] };
    }

    if (s.startsWith('INSERT INTO research_inquiries')) {
      const row = {
        id: 'test-inquiry-' + (inquiries.length + 1),
        request_id: params[0],
        user_id: params[1],
        member_name: params[2],
        member_email: params[3],
        subscription_tier_at_submission: params[4],
        requester_name: params[5],
        requester_email: params[6],
        requester_phone: params[7],
        relationship: params[8],
        preferred_contact_method: params[9],
        permission_to_contact: params[10],
        inmate_name: params[11],
        inmate_number: params[12],
        facility: params[13],
        state: params[14],
        jurisdiction: params[15],
        county: params[16],
        court: params[17],
        case_number: params[18],
        categories: params[19] ? (typeof params[19] === 'string' ? JSON.parse(params[19]) : params[19]) : [],
        inquiry: params[20],
        documents_already_available: params[21],
        documents_requested: params[22],
        disclaimer_acknowledged: params[23],
        status: 'new',
        assigned_staff: null,
        staff_notes: null,
        member_response_notes: null,
        outcome: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inquiries.push(row);
      return { rows: [row] };
    }

    if (s.includes('FROM research_inquiries') && s.includes('WHERE user_id = $1')) {
      const uid = params[0];
      const matching = inquiries
        .filter(i => i.user_id === uid)
        .map(i => ({
          id: i.id,
          request_id: i.request_id,
          inmate_name: i.inmate_name,
          inmate_number: i.inmate_number,
          facility: i.facility,
          state: i.state,
          categories: i.categories,
          status: i.status,
          member_response_notes: i.member_response_notes || null,
          outcome: i.outcome || null,
          created_at: i.created_at,
          updated_at: i.updated_at
        }));
      return { rows: matching };
    }

    if (s.includes('FROM research_inquiries') && (s.includes('WHERE id = $1') || s.includes('WHERE request_id = $1'))) {
      const target = params[0];
      const match = inquiries.find(i => i.id === target || i.request_id === target);
      return { rows: match ? [match] : [] };
    }

    if (s.startsWith('UPDATE research_inquiries SET updated_at = now() WHERE id = $1')) {
      const target = inquiries.find(i => i.id === params[0]);
      if (target) target.updated_at = new Date().toISOString();
      return { rows: target ? [target] : [] };
    }

    if (s.startsWith('UPDATE research_inquiries')) {
      const target = inquiries.find(i => i.id === params[0]);
      if (target) {
        for (let idx = 1; idx < params.length; idx++) {
          const val = params[idx];
          if (VALID_STATUSES.includes(val)) target.status = val;
          else if (s.includes('assigned_staff = $' + (idx + 1))) target.assigned_staff = val;
          else if (s.includes('staff_notes = $' + (idx + 1))) target.staff_notes = val;
          else if (s.includes('member_response_notes = $' + (idx + 1))) target.member_response_notes = val;
          else if (s.includes('outcome = $' + (idx + 1))) target.outcome = val;
        }
        target.updated_at = new Date().toISOString();
      }
      return { rows: target ? [target] : [] };
    }

    if (s.includes('INSERT INTO research_inquiry_activity_log')) {
      const act = {
        id: 'act-' + (activityLog.length + 1),
        inquiry_id: params[0],
        staff_name: params[1],
        action: params[2],
        source_searched: params[3],
        agency_contacted: params[4],
        correspondence_sent: params[5],
        document_located: params[6],
        result: params[7],
        follow_up_needed: params[8],
        created_at: new Date().toISOString()
      };
      activityLog.push(act);
      return { rows: [act] };
    }

    if (s.includes('INSERT INTO research_inquiry_files')) {
      const f = {
        id: 'file-' + (files.length + 1),
        inquiry_id: params[0],
        file_name: params[1],
        document_type: params[2],
        file_size: params[3],
        mime_type: params[4],
        description: params[5],
        uploaded_by: params[6],
        created_at: new Date().toISOString()
      };
      files.push(f);
      return { rows: [f] };
    }

    if (s.includes('INSERT INTO research_inquiry_status_history')) {
      const h = {
        id: 'hist-' + (statusHistory.length + 1),
        inquiry_id: params[0],
        previous_status: params[1],
        new_status: params[2],
        changed_by: params[3],
        reason: params[4],
        created_at: new Date().toISOString()
      };
      statusHistory.push(h);
      return { rows: [h] };
    }

    if (s.includes('SELECT * FROM research_inquiry_activity_log WHERE inquiry_id = $1')) {
      return { rows: activityLog.filter(a => a.inquiry_id === params[0]) };
    }

    if (s.includes('SELECT * FROM research_inquiry_files WHERE inquiry_id = $1')) {
      return { rows: files.filter(f => f.inquiry_id === params[0]) };
    }

    if (s.includes('SELECT * FROM research_inquiry_status_history WHERE inquiry_id = $1')) {
      return { rows: statusHistory.filter(h => h.inquiry_id === params[0]) };
    }

    if (s.includes('FILTER (WHERE status = \'new\')')) {
      return {
        rows: [{
          total: inquiries.length,
          new_count: inquiries.filter(i => i.status === 'new').length,
          open_count: inquiries.filter(i => !['completed', 'unable_to_assist', 'archived'].includes(i.status)).length,
          completed_count: inquiries.filter(i => i.status === 'completed').length
        }]
      };
    }

    if (s.includes('GROUP BY 1 ORDER BY count DESC LIMIT 8')) {
      return { rows: [{ state: 'FL', count: inquiries.length }] };
    }

    if (s.includes('count(*)::int as total FROM research_inquiries')) {
      return { rows: [{ total: inquiries.length }] };
    }

    if (s.includes('SELECT') && s.includes('FROM research_inquiries')) {
      let filtered = [...inquiries];
      if (params.length && s.includes('status = $')) {
        const st = params[params.length - 1];
        if (VALID_STATUSES.includes(st)) filtered = filtered.filter(i => i.status === st);
      }
      return { rows: filtered };
    }

    return { rows: [] };
  };

  const db = () => ({ query });

  let currentUser = options.user !== undefined ? options.user : { id: 'user-full', email: 'member@example.com', role: 'member', status: 'active' };
  let currentTier = options.tier || 'full_member';

  const service = createResearchHelpService({
    db,
    ensureSchema: async () => {},
    user: async () => currentUser,
    membershipState: async (account) => ({
      tier: currentTier,
      status: 'active',
      accessUntil: '2026-12-31'
    }),
    json: (res, status, body) => {
      res.status = status;
      res.body = body;
      res.headers = res.headers || {};
      return res;
    },
    parseBody: async (req) => req.body || {},
    rate: async () => true,
    isOwner: (user) => Boolean(user && user.role === 'owner'),
    mail: {
      configured: () => true,
      send: async (msg) => {
        sentEmails.push(msg);
        return 'msg-receipt-123';
      }
    }
  });

  return {
    service,
    inquiries,
    activityLog,
    files,
    statusHistory,
    sentEmails,
    setUser: (u) => { currentUser = u; },
    setTier: (t) => { currentTier = t; }
  };
}

// 1. Entitlement and Tier Access Control Tests
test('checkEntitlement accurately distinguishes eligible tiers and upgrade screens', async () => {
  const h = createMockHarness();

  // Unauthenticated
  const guestCheck = await h.service.checkEntitlement(null);
  assert.equal(guestCheck.access, false);
  assert.equal(guestCheck.reason, 'login_required');

  // Suspended user
  const suspendedCheck = await h.service.checkEntitlement({ id: 'bad', status: 'suspended', role: 'member' });
  assert.equal(suspendedCheck.access, false);
  assert.equal(suspendedCheck.reason, 'account_inactive');

  // Free Tier ($0) - needs upgrade
  h.setTier('free');
  const freeCheck = await h.service.checkEntitlement({ id: 'free-user', role: 'member', status: 'active' });
  assert.equal(freeCheck.access, false);
  assert.equal(freeCheck.reason, 'upgrade_required');

  // Plugged In Tier ($3/mo) - needs upgrade (Research Help requires Full Member $6 or Legacy Circle $9)
  h.setTier('plugged_in');
  const pluggedCheck = await h.service.checkEntitlement({ id: 'plugged-user', role: 'member', status: 'active' });
  assert.equal(pluggedCheck.access, false);
  assert.equal(pluggedCheck.reason, 'upgrade_required');
  assert.match(pluggedCheck.planName, /Plugged In/);

  // Full Member ($6/mo) - Granted
  h.setTier('full_member');
  const fullCheck = await h.service.checkEntitlement({ id: 'full-user', role: 'member', status: 'active' });
  assert.equal(fullCheck.access, true);
  assert.equal(fullCheck.tier, 'full_member');

  // Legacy Circle ($9/mo) - Granted
  h.setTier('legacy_circle');
  const legacyCheck = await h.service.checkEntitlement({ id: 'legacy-user', role: 'member', status: 'active' });
  assert.equal(legacyCheck.access, true);
  assert.equal(legacyCheck.tier, 'legacy_circle');

  // Owner - Granted automatically regardless of subscription tier
  h.setTier('free');
  const ownerCheck = await h.service.checkEntitlement({ id: 'owner-id', role: 'owner', status: 'active' });
  assert.equal(ownerCheck.access, true);
  assert.equal(ownerCheck.tier, 'owner');
});

// 2. Submission Validation Tests
test('submission rejects missing required fields with clear 400 response', async () => {
  const h = createMockHarness();
  h.setTier('full_member');

  // Empty payload
  const res1 = {};
  await h.service.handleSubmit({ body: {} }, res1);
  assert.equal(res1.status, 400);
  assert.match(res1.body.error, /full name/i);

  // Missing email
  const res2 = {};
  await h.service.handleSubmit({ body: { requesterName: 'Jane Doe' } }, res2);
  assert.equal(res2.status, 400);
  assert.match(res2.body.error, /email address/i);

  // Invalid email
  const res3 = {};
  await h.service.handleSubmit({ body: { requesterName: 'Jane Doe', requesterEmail: 'invalid-email' } }, res3);
  assert.equal(res3.status, 400);
  assert.match(res3.body.error, /valid email address/i);

  // Missing relationship
  const res4 = {};
  await h.service.handleSubmit({ body: { requesterName: 'Jane Doe', requesterEmail: 'jane@example.com' } }, res4);
  assert.equal(res4.status, 400);
  assert.match(res4.body.error, /relationship/i);

  // Missing inmate name
  const res5 = {};
  await h.service.handleSubmit({ body: { requesterName: 'Jane Doe', requesterEmail: 'jane@example.com', relationship: 'Family member' } }, res5);
  assert.equal(res5.status, 400);
  assert.match(res5.body.error, /incarcerated person/i);

  // Missing inquiry details
  const res6 = {};
  await h.service.handleSubmit({
    body: {
      requesterName: 'Jane Doe',
      requesterEmail: 'jane@example.com',
      relationship: 'Family member',
      inmateName: 'John Doe',
      inquiry: ''
    }
  }, res6);
  assert.equal(res6.status, 400);
  assert.match(res6.body.error, /detailed description of your research inquiry/i);

  // Missing legal disclaimer acknowledgement
  const res7 = {};
  await h.service.handleSubmit({
    body: {
      requesterName: 'Jane Doe',
      requesterEmail: 'jane@example.com',
      relationship: 'Family member',
      inmateName: 'John Doe',
      inquiry: 'Looking for trial records from 1998 in Westchester County.',
      disclaimerAcknowledged: false
    }
  }, res7);
  assert.equal(res7.status, 400);
  assert.match(res7.body.error, /disclaimer/i);
});

// 3. Successful Submission & Email Dispatch
test('successful submission stores inquiry, assigns unique CC-RI Request ID, and emails Contact inbox', async () => {
  const h = createMockHarness();
  h.setTier('full_member');

  const validPayload = {
    requesterName: 'Eleanor Roosevelt',
    requesterEmail: 'eleanor@example.org',
    requesterPhone: '212-555-0199',
    relationship: 'Family Member',
    preferredContactMethod: 'Email',
    permissionToContact: true,
    inmateName: 'Arthur Miller',
    inmateNumber: 'A1234567',
    facility: 'Sing Sing Correctional Facility',
    state: 'NY',
    jurisdiction: 'State Prison System',
    county: 'Westchester',
    court: 'County Court',
    caseNumber: 'IND-98-1024',
    categories: ['Court Records', 'Appeals', 'Wrongful Conviction or Innocence Research'],
    inquiry: 'Looking for trial minutes and appellate brief regarding the 1998 conviction.',
    documentsAlreadyAvailable: 'Incarcerated for 28 years; maintains innocence; key witness recanted in 2012.',
    documentsRequested: 'Prior FOIL requests to Westchester DA were partially denied.',
    disclaimerAcknowledged: true
  };

  const response = {};
  await h.service.handleSubmit({ body: validPayload }, response);

  assert.equal(response.status, 201);
  assert.equal(response.body.ok, true);
  assert.match(response.body.requestId, /^CC-RI-\d{4}-\d{6}$/);

  // Check DB state
  assert.equal(h.inquiries.length, 1);
  const stored = h.inquiries[0];
  assert.equal(stored.inmate_name, 'Arthur Miller');
  assert.equal(stored.inmate_number, 'A1234567');
  assert.equal(stored.facility, 'Sing Sing Correctional Facility');
  assert.equal(stored.state, 'NY');
  assert.deepEqual(stored.categories, ['Court Records', 'Appeals', 'Wrongful Conviction or Innocence Research']);
  assert.equal(stored.status, 'new');

  // Check Email Dispatch
  assert.equal(h.sentEmails.length, 1);
  const email = h.sentEmails[0];
  assert.deepEqual(email.to, ['Contact@carceralcollections.org']);
  assert.equal(email.replyTo, 'eleanor@example.org');
  assert.match(email.subject, /Research Inquiry/);
  assert.match(email.subject, new RegExp(stored.request_id));
  assert.match(email.text, /Arthur Miller/);
  assert.match(email.text, /Sing Sing Correctional Facility/);
  assert.match(email.text, /trial minutes and appellate brief/);
});

// 4. Member Profile Privacy Boundary Tests
test('handleMyInquiries strictly excludes private staff notes and returns requester inquiries', async () => {
  const h = createMockHarness();
  h.setUser({ id: 'user-a', role: 'member', status: 'active' });
  h.setTier('full_member');

  // Add inquiries for user-a and user-b
  h.inquiries.push({
    id: 'inq-1',
    request_id: 'CC-RI-2026-000001',
    user_id: 'user-a',
    inmate_name: 'Inmate One',
    status: 'researching',
    staff_notes: 'INTERNAL ONLY: Called clerk, microfiche reel #4928 is missing.',
    member_response_notes: 'We located the indictment and are preparing copies.',
    outcome: 'Indictment located'
  });

  h.inquiries.push({
    id: 'inq-2',
    request_id: 'CC-RI-2026-000002',
    user_id: 'user-b',
    inmate_name: 'Inmate Two',
    status: 'completed',
    staff_notes: 'Private note for user b',
    member_response_notes: 'Response for user b'
  });

  const response = {};
  await h.service.handleMyInquiries({}, response);

  assert.equal(response.status, 200);
  const items = response.body.inquiries;
  assert.equal(items.length, 1);
  assert.equal(items[0].inmateName, 'Inmate One');
  assert.equal(items[0].responseNotes, 'We located the indictment and are preparing copies.');
  assert.equal(items[0].outcome, 'Indictment located');

  // Crucial verification: staff_notes is completely absent
  assert.equal(items[0].staff_notes, undefined);
  assert.equal(items[0].staffNotes, undefined);
  assert.ok(!JSON.stringify(response.body).includes('microfiche reel #4928'));
});

// 5. Admin Case File & Activity Log Management Tests
test('admin can view case file, update status, add activity log, and attach files', async () => {
  const h = createMockHarness();
  const ownerUser = { id: 'owner-1', role: 'owner', displayName: 'Head Archivist', status: 'active' };
  h.setUser(ownerUser);

  // Add an initial inquiry
  h.inquiries.push({
    id: 'inq-admin-test',
    request_id: 'CC-RI-2026-000099',
    user_id: 'requester-1',
    requester_name: 'Alice Walker',
    requester_email: 'alice@example.com',
    inmate_name: 'James Baldwin',
    status: 'new',
    created_at: new Date().toISOString()
  });

  // Test admin get
  const getRes = {};
  await h.service.handleAdminGet({}, getRes, 'inq-admin-test');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.inquiry.inmate_name, 'James Baldwin');

  // Test admin update
  const updateRes = {};
  await h.service.handleAdminUpdate({
    body: {
      status: 'researching',
      assignedStaff: 'Researcher Dave',
      staffNotes: 'Ordered docket sheet from National Archives.',
      memberResponseNotes: 'Your inquiry has been assigned to research staff.',
      statusReason: 'Initial intake completed'
    }
  }, updateRes, 'inq-admin-test');

  assert.equal(updateRes.status, 200);
  assert.equal(h.inquiries[0].status, 'researching');
  assert.equal(h.inquiries[0].assigned_staff, 'Researcher Dave');
  assert.equal(h.inquiries[0].staff_notes, 'Ordered docket sheet from National Archives.');
  assert.equal(h.statusHistory.length, 1);
  assert.equal(h.statusHistory[0].previous_status, 'new');
  assert.equal(h.statusHistory[0].new_status, 'researching');

  // Test add activity log
  const actRes = {};
  await h.service.handleAdminAddActivity({
    body: {
      action: 'Contacted Clerk of Court',
      sourceSearched: 'NARA Southeast Records',
      agencyContacted: 'US District Court Clerk',
      result: 'Located archive box 14-B',
      followUpNeeded: 'Call back Friday for reproduction invoice'
    }
  }, actRes, 'inq-admin-test');

  assert.equal(actRes.status, 201);
  assert.equal(h.activityLog.length, 1);
  assert.equal(h.activityLog[0].action, 'Contacted Clerk of Court');
  assert.equal(h.activityLog[0].staff_name, 'Head Archivist');

  // Test add file reference
  const fileRes = {};
  await h.service.handleAdminAddFile({
    body: {
      fileName: 'Indictment_Certified_Copy.pdf',
      documentType: 'Indictment',
      fileSize: 1048576,
      description: 'Certified true copy of 1998 indictment'
    }
  }, fileRes, 'inq-admin-test');

  assert.equal(fileRes.status, 201);
  assert.equal(h.files.length, 1);
  assert.equal(h.files[0].file_name, 'Indictment_Certified_Copy.pdf');
});

// 6. Non-owner is denied access to admin endpoints
test('non-owner is denied access to admin endpoints', async () => {
  const h = createMockHarness();
  h.setUser({ id: 'regular-member', role: 'member', status: 'active' });

  const res1 = {};
  await h.service.handleAdminList({}, res1, new URL('http://test/api/owner/research-inquiries'));
  assert.equal(res1.status, 403);

  const res2 = {};
  await h.service.handleAdminGet({}, res2, 'some-id');
  assert.equal(res2.status, 403);

  const res3 = {};
  await h.service.handleAdminUpdate({ body: {} }, res3, 'some-id');
  assert.equal(res3.status, 403);
});

// 7. Excel (.xlsx) and CSV Export Tests
test('Excel export generates valid multi-sheet OpenXML ZIP buffer', async () => {
  const columns = [
    { key: 'request_id', label: 'Request ID' },
    { key: 'inmate_name', label: 'Inmate Name' },
    { key: 'status', label: 'Status' }
  ];
  const rows = [
    { request_id: 'CC-RI-2026-000001', inmate_name: 'Test Inmate 1', status: 'new' },
    { request_id: 'CC-RI-2026-000002', inmate_name: 'Test Inmate 2', status: 'completed' }
  ];

  const sheets = [
    { name: 'All Inquiries', columns, rows },
    { name: 'Completed', columns, rows: rows.filter(r => r.status === 'completed') }
  ];

  const buffer = buildWorkbookXlsx(sheets);
  assert.ok(Buffer.isBuffer(buffer));
  // Valid ZIP archive starts with magic bytes PK\x03\x04
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4B);
  assert.equal(buffer[2], 0x03);
  assert.equal(buffer[3], 0x04);

  // Inspect that standard OpenXML zip entries are present
  const zipStr = buffer.toString('binary');
  assert.ok(zipStr.includes('[Content_Types].xml'));
  assert.ok(zipStr.includes('xl/workbook.xml'));
  assert.ok(zipStr.includes('xl/worksheets/sheet1.xml'));
  assert.ok(zipStr.includes('xl/worksheets/sheet2.xml'));
});

test('CSV export protects against formula injection and formats RFC 4180 properly', () => {
  // Test formula sanitization
  assert.equal(sanitizeCellText('=cmd|/C calc'), "'=cmd|/C calc");
  assert.equal(sanitizeCellText('+1234'), "'+1234");
  assert.equal(sanitizeCellText('-SUM(A1:A10)'), "'-SUM(A1:A10)");
  assert.equal(sanitizeCellText('@malicious'), "'@malicious");
  assert.equal(sanitizeCellText('Standard Text'), 'Standard Text');

  const columns = [
    { key: 'name', label: 'Full Name' },
    { key: 'notes', label: 'Notes' }
  ];
  const rows = [
    { name: 'John Doe', notes: 'Normal line' },
    { name: '=DangerousFormula', notes: 'Quotes "inside" text' }
  ];

  const csv = buildCsv(columns, rows);
  // Starts with UTF-8 BOM
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv, /"Full Name","Notes"/);
  assert.match(csv, /"John Doe","Normal line"/);
  // Formula escaped with prepended single quote and wrapped in double quotes
  assert.match(csv, /"'=DangerousFormula"/);
  // Quotes doubled inside cell
  assert.match(csv, /"Quotes ""inside"" text"/);
});

