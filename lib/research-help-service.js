'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildWorkbookXlsx, buildCsv } = require('./excel-export');

const RECIPIENT_EMAIL = 'Contact@carceralcollections.org';

const VALID_STATUSES = [
  'new',
  'under_review',
  'researching',
  'waiting_for_info',
  'documents_located',
  'response_prepared',
  'completed',
  'unable_to_assist',
  'archived'
];

const RESEARCH_CATEGORIES = [
  'Court Records',
  'Sentencing Information',
  'Appeals',
  'Post-Conviction Research',
  'Prison Records',
  'Institutional Records',
  'Historical Records',
  'Clemency or Pardons',
  'Wrongful Conviction or Innocence Research',
  'Public Records',
  'Reentry Resources',
  'Release Information',
  'Family Research',
  'Genealogical Research',
  'News or Archival Research',
  'Other'
];

function createResearchHelpService(deps) {
  const {
    db: database,
    ensureSchema,
    user: getUser,
    membershipState,
    json,
    parseBody,
    rate,
    isOwner,
    mail,
    env = process.env
  } = deps;

  let migrationPromise = null;

  async function ensure() {
    if (!database()) throw new Error('Database connection unavailable');
    await ensureSchema();
    if (!migrationPromise) {
      const sqlPath = path.join(__dirname, '../db/migrations/20260912-research-help.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      migrationPromise = database().query(sql).catch(err => {
        migrationPromise = null;
        throw err;
      });
    }
    await migrationPromise;
  }

  async function checkEntitlement(account) {
    if (!account) {
      return {
        access: false,
        tier: 'unauthenticated',
        planName: 'Guest',
        reason: 'login_required'
      };
    }

    if (isOwner(account)) {
      return {
        access: true,
        tier: 'owner',
        planName: 'Owner Account',
        user: account
      };
    }

    if (account.status === 'suspended' || account.status === 'banned') {
      return {
        access: false,
        tier: 'suspended',
        planName: 'Account Suspended',
        reason: 'account_inactive'
      };
    }

    const state = await membershipState(account);
    const tier = state?.tier || 'free';

    // Eligible tiers: full_member ($6) and legacy_circle ($9)
    if (tier === 'full_member' || tier === 'legacy_circle') {
      return {
        access: true,
        tier,
        planName: tier === 'legacy_circle' ? 'Legacy Circle' : 'Full Member',
        user: account,
        accessUntil: state.accessUntil
      };
    }

    return {
      access: false,
      tier,
      planName: tier === 'plugged_in' ? 'Plugged In ($3/mo)' : 'Public Reader',
      reason: 'upgrade_required',
      user: account
    };
  }

  function formatEmailBody(inquiry) {
    const categoriesText = Array.isArray(inquiry.categories) && inquiry.categories.length
      ? inquiry.categories.join(', ')
      : 'None specified';

    return `NEW CARCERAL COLLECTIONS RESEARCH INQUIRY
Request ID: ${inquiry.request_id}
Received: ${new Date(inquiry.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} EST

REQUESTER
Name: ${inquiry.requester_name}
Email: ${inquiry.requester_email}
Phone: ${inquiry.requester_phone || 'None provided'}
Relationship: ${inquiry.relationship}
Preferred Contact: ${inquiry.preferred_contact_method}
Permission to Contact: ${inquiry.permission_to_contact ? 'Yes' : 'No'}

INCARCERATED INDIVIDUAL
Name: ${inquiry.inmate_name}
Inmate Number / DOC: ${inquiry.inmate_number || 'Not provided'}
Facility / Institution: ${inquiry.facility || 'Not provided'}
State: ${inquiry.state || 'Not provided'}
Jurisdiction: ${inquiry.jurisdiction || 'Not provided'}
County: ${inquiry.county || 'Not provided'}
Court: ${inquiry.court || 'Not provided'}
Case Number: ${inquiry.case_number || 'Not provided'}

RESEARCH CATEGORIES
${categoriesText}

RESEARCH REQUEST
${inquiry.inquiry}

DOCUMENTS REQUESTED
${inquiry.documents_requested || 'None specified'}

DOCUMENTS ALREADY AVAILABLE
${inquiry.documents_already_available || 'None specified'}

MEMBER ACCOUNT
Account ID: ${inquiry.user_id || 'N/A'}
Account Name: ${inquiry.member_name || 'N/A'}
Subscription Tier: ${inquiry.subscription_tier_at_submission || 'N/A'}

A complete copy of this inquiry has also been saved to the Carceral Collections Research Inquiry database.`;
  }

  async function handleAccess(request, response) {
    try {
      const account = await getUser(request);
      const entitlement = await checkEntitlement(account);
      return json(response, 200, entitlement);
    } catch (err) {
      return json(response, 500, { error: err.message || 'Failed to check entitlement.' });
    }
  }

  async function handleSubmit(request, response) {
    const account = await getUser(request, true);
    if (!account) {
      return json(response, 401, { error: 'Sign in to access the Research Help Finder.' });
    }

    const entitlement = await checkEntitlement(account);
    if (!entitlement.access) {
      return json(response, 403, {
        error: 'Research Help Finder is a Full Member benefit.',
        entitlement
      });
    }

    if (!await rate(request, `research-help:${account.id}`, 6, 900)) {
      return json(response, 429, { error: 'Please wait before submitting another research inquiry.' });
    }

    const body = await parseBody(request, 48000);
    if (!body || typeof body !== 'object') {
      return json(response, 400, { error: 'Invalid request payload.' });
    }

    // Validation
    const requesterName = String(body.requesterName || '').trim();
    const requesterEmail = String(body.requesterEmail || '').trim().toLowerCase();
    const requesterPhone = String(body.requesterPhone || '').trim().slice(0, 32);
    const relationship = String(body.relationship || '').trim().slice(0, 64);
    const preferredContactMethod = String(body.preferredContactMethod || 'email').trim().slice(0, 48);
    const permissionToContact = body.permissionToContact !== false;

    const inmateName = String(body.inmateName || '').trim();
    const inmateNumber = String(body.inmateNumber || '').trim().slice(0, 64);
    const facility = String(body.facility || '').trim().slice(0, 180);
    const state = String(body.state || '').trim().slice(0, 64);
    const jurisdiction = String(body.jurisdiction || '').trim().slice(0, 64);
    const county = String(body.county || '').trim().slice(0, 100);
    const court = String(body.court || '').trim().slice(0, 180);
    const caseNumber = String(body.caseNumber || '').trim().slice(0, 100);

    const categories = Array.isArray(body.categories)
      ? body.categories.map(c => String(c).trim()).filter(c => RESEARCH_CATEGORIES.includes(c) || c.length <= 80)
      : [];

    const inquiryText = String(body.inquiry || '').trim();
    const documentsAlreadyAvailable = String(body.documentsAlreadyAvailable || '').trim().slice(0, 5000);
    const documentsRequested = String(body.documentsRequested || '').trim().slice(0, 5000);
    const disclaimerAcknowledged = Boolean(body.disclaimerAcknowledged);

    if (!requesterName || requesterName.length > 120) {
      return json(response, 400, { error: 'Please enter your full name as the requester.' });
    }
    if (!requesterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
      return json(response, 400, { error: 'Please enter a valid email address.' });
    }
    if (!relationship) {
      return json(response, 400, { error: 'Please specify your relationship to the incarcerated individual.' });
    }
    if (!inmateName || inmateName.length > 120) {
      return json(response, 400, { error: 'Please enter the full name of the incarcerated person.' });
    }
    if (!inquiryText || inquiryText.length < 10) {
      return json(response, 400, { error: 'Please provide a detailed description of your research inquiry (at least 10 characters).' });
    }
    if (!disclaimerAcknowledged) {
      return json(response, 400, { error: 'You must acknowledge the research-only legal disclaimer before submitting.' });
    }

    await ensure();
    const db = database();
    const year = new Date().getFullYear();

    // Sequence for unique ID
    const seqResult = await db.query("SELECT nextval('research_inquiry_seq') as seq");
    const seq = seqResult.rows[0]?.seq || 1;
    const requestId = `CC-RI-${year}-${String(seq).padStart(6, '0')}`;

    const insertSql = `
      INSERT INTO research_inquiries (
        request_id, user_id, member_name, member_email, subscription_tier_at_submission,
        requester_name, requester_email, requester_phone, relationship, preferred_contact_method, permission_to_contact,
        inmate_name, inmate_number, facility, state, jurisdiction, county, court, case_number,
        categories, inquiry, documents_already_available, documents_requested, disclaimer_acknowledged,
        status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        'new'
      ) RETURNING *
    `;

    const values = [
      requestId,
      account.id,
      account.displayName || account.name || 'Member',
      account.email,
      entitlement.tier,
      requesterName,
      requesterEmail,
      requesterPhone || null,
      relationship,
      preferredContactMethod,
      permissionToContact,
      inmateName,
      inmateNumber || null,
      facility || null,
      state || null,
      jurisdiction || null,
      county || null,
      court || null,
      caseNumber || null,
      JSON.stringify(categories),
      inquiryText,
      documentsAlreadyAvailable || null,
      documentsRequested || null,
      disclaimerAcknowledged
    ];

    const result = await db.query(insertSql, values);
    const row = result.rows[0];

    // Initial audit/activity entries
    await db.query(`
      INSERT INTO research_inquiry_activity_log (inquiry_id, staff_name, action, result)
      VALUES ($1, 'System', 'Inquiry Submitted', 'Research inquiry received and entered into database.')
    `, [row.id]);

    await db.query(`
      INSERT INTO research_inquiry_status_history (inquiry_id, previous_status, new_status, changed_by, reason)
      VALUES ($1, NULL, 'new', 'System', 'Initial submission')
    `, [row.id]);

    // Send formatted staff notification email
    const subject = `Research Inquiry ${requestId} | ${inmateName} | DOC #${inmateNumber || 'N/A'}`;
    const emailText = formatEmailBody(row);

    if (mail && typeof mail.send === 'function' && mail.configured && mail.configured()) {
      mail.send({
        to: [RECIPIENT_EMAIL],
        replyTo: requesterEmail,
        subject,
        text: emailText,
        idempotencyKey: `inquiry-${requestId}`
      }).catch(err => {
        console.error('Failed to send research inquiry email notification:', err);
      });
    }

    return json(response, 201, {
      ok: true,
      requestId,
      createdAt: row.created_at,
      message: 'Your research inquiry has been received. Our research staff will review your submission.',
      inquiry: {
        requestId: row.request_id,
        inmateName: row.inmate_name,
        facility: row.facility,
        state: row.state,
        categories: row.categories,
        status: row.status,
        createdAt: row.created_at
      }
    });
  }

  async function handleMyInquiries(request, response) {
    const account = await getUser(request, true);
    if (!account) {
      return json(response, 401, { error: 'Sign in to view your research inquiries.' });
    }

    await ensure();
    const db = database();
    const result = await db.query(`
      SELECT
        id,
        request_id,
        inmate_name,
        inmate_number,
        facility,
        state,
        categories,
        status,
        member_response_notes,
        outcome,
        created_at,
        updated_at
      FROM research_inquiries
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [account.id]);

    return json(response, 200, {
      inquiries: result.rows.map(r => ({
        id: r.id,
        requestId: r.request_id,
        inmateName: r.inmate_name,
        inmateNumber: r.inmate_number,
        facility: r.facility,
        state: r.state,
        categories: r.categories,
        status: r.status,
        responseNotes: r.member_response_notes,
        outcome: r.outcome,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  }

  // --- Administrative Case Management Endpoints ---

  async function handleAdminList(request, response, url) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner/Administrator access is required.' });
    }

    await ensure();
    const db = database();

    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();

    const conditions = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      conditions.push(`(
        lower(request_id) LIKE $${idx} OR
        lower(inmate_name) LIKE $${idx} OR
        lower(inmate_number) LIKE $${idx} OR
        lower(requester_name) LIKE $${idx} OR
        lower(requester_email) LIKE $${idx} OR
        lower(case_number) LIKE $${idx} OR
        lower(facility) LIKE $${idx} OR
        lower(state) LIKE $${idx}
      )`);
    }

    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}::timestamptz`);
    }

    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}::timestamptz + interval '1 day'`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const listSql = `
      SELECT
        id, request_id, created_at, inmate_name, inmate_number, facility, state,
        requester_name, requester_email, categories, status, assigned_staff, updated_at
      FROM research_inquiries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 250
    `;

    const countSql = `SELECT count(*)::int as total FROM research_inquiries ${whereClause}`;

    const metricsSql = `
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'new')::int as new_count,
        count(*) FILTER (WHERE status NOT IN ('completed', 'unable_to_assist', 'archived'))::int as open_count,
        count(*) FILTER (WHERE status = 'completed')::int as completed_count
      FROM research_inquiries
    `;

    const stateSql = `
      SELECT COALESCE(NULLIF(state, ''), 'Unknown') as state, count(*)::int as count
      FROM research_inquiries
      GROUP BY 1 ORDER BY count DESC LIMIT 8
    `;

    const [listRes, countRes, metricsRes, stateRes] = await Promise.all([
      db.query(listSql, params),
      db.query(countSql, params),
      db.query(metricsSql),
      db.query(stateSql)
    ]);

    return json(response, 200, {
      inquiries: listRes.rows,
      total: countRes.rows[0]?.total || 0,
      metrics: {
        ...metricsRes.rows[0],
        byState: stateRes.rows
      }
    });
  }

  async function handleAdminGet(request, response, id) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner access is required.' });
    }

    await ensure();
    const db = database();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const inquiryRes = await db.query(
      isUuid
        ? 'SELECT * FROM research_inquiries WHERE id = $1'
        : 'SELECT * FROM research_inquiries WHERE request_id = $1',
      [id]
    );

    const inquiry = inquiryRes.rows[0];
    if (!inquiry) {
      return json(response, 404, { error: 'Research inquiry not found.' });
    }

    const [activityRes, filesRes, historyRes] = await Promise.all([
      db.query('SELECT * FROM research_inquiry_activity_log WHERE inquiry_id = $1 ORDER BY created_at ASC', [inquiry.id]),
      db.query('SELECT * FROM research_inquiry_files WHERE inquiry_id = $1 ORDER BY created_at DESC', [inquiry.id]),
      db.query('SELECT * FROM research_inquiry_status_history WHERE inquiry_id = $1 ORDER BY created_at DESC', [inquiry.id])
    ]);

    return json(response, 200, {
      inquiry,
      activityLog: activityRes.rows,
      files: filesRes.rows,
      statusHistory: historyRes.rows
    });
  }

  async function handleAdminUpdate(request, response, id) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner access is required.' });
    }

    const body = await parseBody(request, 32000);
    if (!body || typeof body !== 'object') {
      return json(response, 400, { error: 'Invalid update payload.' });
    }

    await ensure();
    const db = database();

    const existingRes = await db.query('SELECT * FROM research_inquiries WHERE id = $1', [id]);
    const existing = existingRes.rows[0];
    if (!existing) {
      return json(response, 404, { error: 'Research inquiry not found.' });
    }

    const updates = [];
    const params = [id];

    if (body.status && VALID_STATUSES.includes(body.status)) {
      params.push(body.status);
      updates.push(`status = $${params.length}`);

      if (body.status !== existing.status) {
        await db.query(`
          INSERT INTO research_inquiry_status_history (inquiry_id, previous_status, new_status, changed_by, reason)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, existing.status, body.status, owner.displayName || 'Owner', body.statusReason || 'Status update']);
      }
    }

    if (body.assignedStaff !== undefined) {
      params.push(String(body.assignedStaff).trim().slice(0, 120));
      updates.push(`assigned_staff = $${params.length}`);
    }

    if (body.staffNotes !== undefined) {
      params.push(String(body.staffNotes));
      updates.push(`staff_notes = $${params.length}`);
    }

    if (body.memberResponseNotes !== undefined) {
      params.push(String(body.memberResponseNotes));
      updates.push(`member_response_notes = $${params.length}`);
    }

    if (body.outcome !== undefined) {
      params.push(String(body.outcome).trim());
      updates.push(`outcome = $${params.length}`);
    }

    if (body.dateReviewed !== undefined) {
      params.push(body.dateReviewed ? new Date(body.dateReviewed) : null);
      updates.push(`date_reviewed = $${params.length}`);
    }

    if (body.dateResponseSent !== undefined) {
      params.push(body.dateResponseSent ? new Date(body.dateResponseSent) : null);
      updates.push(`date_response_sent = $${params.length}`);
    }

    updates.push('updated_at = now()');

    const updateSql = `
      UPDATE research_inquiries
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const updatedRes = await db.query(updateSql, params);
    return json(response, 200, {
      ok: true,
      message: 'Inquiry updated successfully.',
      inquiry: updatedRes.rows[0]
    });
  }

  async function handleAdminAddActivity(request, response, id) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner access is required.' });
    }

    const body = await parseBody(request, 16000);
    const action = String(body.action || '').trim();
    if (!action) {
      return json(response, 400, { error: 'Please enter a research action.' });
    }

    await ensure();
    const db = database();

    const result = await db.query(`
      INSERT INTO research_inquiry_activity_log (
        inquiry_id, staff_name, action, source_searched, agency_contacted,
        correspondence_sent, document_located, result, follow_up_needed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      owner.displayName || 'Administrator',
      action,
      String(body.sourceSearched || '').trim().slice(0, 255) || null,
      String(body.agencyContacted || '').trim().slice(0, 255) || null,
      String(body.correspondenceSent || '').trim() || null,
      String(body.documentLocated || '').trim() || null,
      String(body.result || '').trim() || null,
      String(body.followUpNeeded || '').trim() || null
    ]);

    await db.query('UPDATE research_inquiries SET updated_at = now() WHERE id = $1', [id]);

    return json(response, 201, {
      ok: true,
      activity: result.rows[0]
    });
  }

  async function handleAdminAddFile(request, response, id) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner access is required.' });
    }

    const body = await parseBody(request, 16000);
    const fileName = String(body.fileName || '').trim();
    const documentType = String(body.documentType || 'Research Document').trim();

    if (!fileName) {
      return json(response, 400, { error: 'Please provide a file name.' });
    }

    await ensure();
    const db = database();

    const result = await db.query(`
      INSERT INTO research_inquiry_files (
        inquiry_id, file_name, document_type, file_size, mime_type, description, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id,
      fileName,
      documentType,
      Number(body.fileSize || 0),
      String(body.mimeType || 'application/octet-stream'),
      String(body.description || '').trim() || null,
      owner.displayName || 'Staff'
    ]);

    await db.query('UPDATE research_inquiries SET updated_at = now() WHERE id = $1', [id]);

    return json(response, 201, {
      ok: true,
      file: result.rows[0]
    });
  }

  async function handleExport(request, response, url) {
    const owner = await getUser(request);
    if (!isOwner(owner)) {
      return json(response, 403, { error: 'Owner access is required.' });
    }

    await ensure();
    const db = database();

    const format = String(url.searchParams.get('format') || 'xlsx').toLowerCase();
    const status = String(url.searchParams.get('status') || '').trim();
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();

    const conditions = [];
    const params = [];

    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}::timestamptz + interval '1 day'`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const querySql = `
      SELECT
        request_id, created_at,
        requester_name, requester_email, requester_phone, relationship, preferred_contact_method,
        inmate_name, inmate_number, facility, state, jurisdiction, county, court, case_number,
        categories, inquiry, documents_requested, documents_already_available,
        status, assigned_staff, date_reviewed, date_response_sent, outcome, staff_notes, updated_at
      FROM research_inquiries
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await db.query(querySql, params);
    const rows = result.rows.map(r => {
      const dt = new Date(r.created_at);
      const rev = r.date_reviewed ? new Date(r.date_reviewed).toISOString().slice(0, 10) : '';
      const resp = r.date_response_sent ? new Date(r.date_response_sent).toISOString().slice(0, 10) : '';
      const upd = r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : '';

      return {
        requestId: r.request_id,
        submittedDate: dt.toISOString().slice(0, 10),
        submittedTime: dt.toTimeString().slice(0, 8),
        requesterName: r.requester_name,
        requesterEmail: r.requester_email,
        requesterPhone: r.requester_phone || '',
        relationship: r.relationship,
        inmateName: r.inmate_name,
        inmateNumber: r.inmate_number || '',
        facility: r.facility || '',
        state: r.state || '',
        county: r.county || '',
        jurisdiction: r.jurisdiction || '',
        court: r.court || '',
        caseNumber: r.case_number || '',
        researchCategory: Array.isArray(r.categories) ? r.categories.join('; ') : '',
        researchInquiry: r.inquiry,
        documentsRequested: r.documents_requested || '',
        documentsAlreadyAvailable: r.documents_already_available || '',
        preferredContactMethod: r.preferred_contact_method || 'Email',
        status: r.status,
        assignedStaffMember: r.assigned_staff || 'Unassigned',
        dateReviewed: rev,
        responseDate: resp,
        outcome: r.outcome || '',
        staffNotes: r.staff_notes || '',
        lastUpdated: upd
      };
    });

    const columns = [
      { key: 'requestId', label: 'Request ID' },
      { key: 'submittedDate', label: 'Submitted Date' },
      { key: 'submittedTime', label: 'Submitted Time' },
      { key: 'requesterName', label: 'Requester Name' },
      { key: 'requesterEmail', label: 'Requester Email' },
      { key: 'requesterPhone', label: 'Requester Phone' },
      { key: 'relationship', label: 'Relationship' },
      { key: 'inmateName', label: 'Inmate Name' },
      { key: 'inmateNumber', label: 'Inmate Number' },
      { key: 'facility', label: 'Facility' },
      { key: 'state', label: 'State' },
      { key: 'county', label: 'County' },
      { key: 'jurisdiction', label: 'Jurisdiction' },
      { key: 'court', label: 'Court' },
      { key: 'caseNumber', label: 'Case Number' },
      { key: 'researchCategory', label: 'Research Category' },
      { key: 'researchInquiry', label: 'Research Inquiry' },
      { key: 'documentsRequested', label: 'Documents Requested' },
      { key: 'documentsAlreadyAvailable', label: 'Documents Already Available' },
      { key: 'preferredContactMethod', label: 'Preferred Contact Method' },
      { key: 'status', label: 'Status' },
      { key: 'assignedStaffMember', label: 'Assigned Staff Member' },
      { key: 'dateReviewed', label: 'Date Reviewed' },
      { key: 'responseDate', label: 'Response Date' },
      { key: 'outcome', label: 'Outcome' },
      { key: 'staffNotes', label: 'Staff Notes' },
      { key: 'lastUpdated', label: 'Last Updated' }
    ];

    const filenameBase = `carceral-collections-research-inquiries-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csv = buildCsv(columns, rows);
      response.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
        'Cache-Control': 'no-store'
      });
      response.end(csv);
      return;
    }

    // Multi-sheet Excel workbook
    const openRows = rows.filter(r => !['completed', 'unable_to_assist', 'archived'].includes(r.status));
    const completedRows = rows.filter(r => r.status === 'completed');

    // Summary sheet statistics
    const totalCount = rows.length;
    const newCount = rows.filter(r => r.status === 'new').length;
    const inResearchCount = rows.filter(r => ['under_review', 'researching', 'documents_located'].includes(r.status)).length;
    const finishedCount = completedRows.length;

    const summaryColumns = [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value' }
    ];

    const summaryRows = [
      { metric: 'Total Research Inquiries', value: totalCount },
      { metric: 'New Inquiries', value: newCount },
      { metric: 'Active Inquiries in Research', value: inResearchCount },
      { metric: 'Completed Inquiries', value: finishedCount },
      { metric: 'Export Generated', value: new Date().toISOString() }
    ];

    const sheets = [
      { name: 'Research Inquiries', columns, rows },
      { name: 'Open Requests', columns, rows: openRows },
      { name: 'Completed Requests', columns, rows: completedRows },
      { name: 'Summary', columns: summaryColumns, rows: summaryRows }
    ];

    const xlsxBuffer = buildWorkbookXlsx(sheets);
    response.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
      'Cache-Control': 'no-store'
    });
    response.end(xlsxBuffer);
  }

  async function handle(request, response, url) {
    const route = url.pathname;
    const method = request.method;

    // Public member access check
    if (route === '/api/research-help/access' && method === 'GET') {
      return handleAccess(request, response);
    }

    // Submit inquiry
    if (route === '/api/research-help/submit' && method === 'POST') {
      return handleSubmit(request, response);
    }

    // Member's own inquiries
    if (route === '/api/research-help/my-inquiries' && method === 'GET') {
      return handleMyInquiries(request, response);
    }

    // Admin / Owner routes
    if (route === '/api/owner/research-inquiries' && method === 'GET') {
      return handleAdminList(request, response, url);
    }

    if (route === '/api/owner/research-inquiries/export' && method === 'GET') {
      return handleExport(request, response, url);
    }

    if (route.startsWith('/api/owner/research-inquiries/')) {
      const parts = route.slice('/api/owner/research-inquiries/'.length).split('/');
      const id = decodeURIComponent(parts[0]);
      const subAction = parts[1];

      if (id && !subAction && method === 'GET') {
        return handleAdminGet(request, response, id);
      }
      if (id && !subAction && (method === 'POST' || method === 'PATCH')) {
        return handleAdminUpdate(request, response, id);
      }
      if (id && subAction === 'activity' && method === 'POST') {
        return handleAdminAddActivity(request, response, id);
      }
      if (id && subAction === 'files' && method === 'POST') {
        return handleAdminAddFile(request, response, id);
      }
    }

    return json(response, 404, { error: 'Not found' });
  }

  return {
    ensure,
    checkEntitlement,
    handle,
    handleAccess,
    handleSubmit,
    handleMyInquiries,
    handleAdminList,
    handleAdminGet,
    handleAdminUpdate,
    handleAdminAddActivity,
    handleAdminAddFile,
    handleExport
  };
}

module.exports = {
  createResearchHelpService,
  VALID_STATUSES,
  RESEARCH_CATEGORIES
};

