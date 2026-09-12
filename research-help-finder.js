(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>', '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const request = (path, options) => window.CCCCommunity.request(path, options);

  let currentEntitlement = window.__RESEARCH_HELP_INITIAL__ || null;
  let currentUser = null;

  async function init() {
    const root = $('help-finder-app');
    if (!root) return;

    try {
      currentUser = await window.CCCCommunity.restoreSession();
    } catch {
      currentUser = null;
    }

    if (!currentUser) {
      // Unauthenticated visitor -> Redirect to login preserving destination
      const returnTo = encodeURIComponent(location.pathname + location.search);
      location.assign(`/LOGIN.html?returnTo=${returnTo}`);
      return;
    }

    if (!currentEntitlement) {
      try {
        currentEntitlement = await request('/api/research-help/access');
      } catch (err) {
        currentEntitlement = { access: false, tier: 'free', planName: 'Public Reader', reason: 'upgrade_required' };
      }
    }

    if (!currentEntitlement.access) {
      renderUpgradeScreen(root, currentEntitlement);
    } else {
      renderQualifiedForm(root, currentEntitlement, currentUser);
    }
  }

  function renderUpgradeScreen(container, entitlement) {
    const currentPlanName = entitlement.planName || 'Public Reader';

    container.innerHTML = `
      <div class="upgrade-gate-card">
        <p class="gate-eyebrow">Member Benefit / Research Assistance</p>
        <h2>Research Help Finder is a Full Member benefit.</h2>
        <p class="gate-description">
          Carceral Collections Research Help Finder provides personalized research assistance for incarcerated individuals, families, friends, advocates, and researchers. Our staff reviews submitted inquiries and helps identify records, documents, correspondence, public sources, agencies, and other materials that may assist with the request.
        </p>

        <div>
          <span class="current-tier-badge">Current membership: ${esc(currentPlanName)}</span>
        </div>

        <div class="plan-cards-grid">
          <div class="plan-card">
            <h3>Full Member</h3>
            <div class="plan-price">$6 <span>/ month</span></div>
            <p>Includes full access to the Research Help Finder, archive PDF downloads, and up to 50 private cloud research notes.</p>
          </div>

          <div class="plan-card">
            <h3>Legacy Circle</h3>
            <div class="plan-price">$9 <span>/ month</span></div>
            <p>Includes full access to the Research Help Finder and all benefits available to Full Members, with up to 200 private research notes.</p>
          </div>
        </div>

        <div>
          <a href="/MEMBERS.html#plans" class="btn-primary-upgrade">Upgrade Membership</a>
        </div>
      </div>
    `;
  }

  function renderQualifiedForm(container, entitlement, user) {
    const categories = [
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

    const categoryHtml = categories.map((cat, idx) => `
      <label class="category-checkbox-label">
        <input type="checkbox" name="categories" value="${esc(cat)}" id="cat_${idx}">
        <span>${esc(cat)}</span>
      </label>
    `).join('');

    const defaultName = esc(user.displayName || user.name || '');
    const defaultEmail = esc(user.email || '');

    container.innerHTML = `
      <div class="member-service-banner">
        <h2>Research Help Finder — Member Service</h2>
        <p>Your membership includes access to personalized Carceral Collections research assistance. Submit the information below and our staff will review your inquiry, determine an appropriate research approach, and identify records, correspondence, documents, agencies, or other resources that may help address your request.</p>
        <p class="legal-callout">Carceral Collections provides research and informational assistance. We are not attorneys or a law firm and do not provide legal representation or legal advice.</p>
      </div>

      <form id="research-inquiry-form" class="help-finder-form" novalidate>
        
        <!-- SECTION 1: REQUESTER -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">01</span>
            <h2>Requester Information</h2>
          </div>
          <p class="section-description">Tell us who is submitting this inquiry so we know how to contact you.</p>

          <div class="form-grid">
            <div class="form-group">
              <label for="requesterName">Your Full Name <span class="req">*</span></label>
              <input type="text" id="requesterName" name="requesterName" value="${defaultName}" required maxlength="120" placeholder="First and last name">
            </div>

            <div class="form-group">
              <label for="requesterEmail">Your Email Address <span class="req">*</span></label>
              <input type="email" id="requesterEmail" name="requesterEmail" value="${defaultEmail}" required maxlength="254" placeholder="you@example.com">
            </div>

            <div class="form-group">
              <label for="requesterPhone">Phone Number <span class="opt">(optional)</span></label>
              <input type="tel" id="requesterPhone" name="requesterPhone" maxlength="32" placeholder="(555) 000-0000">
            </div>

            <div class="form-group">
              <label for="relationship">Relationship to Individual <span class="req">*</span></label>
              <select id="relationship" name="relationship" required>
                <option value="">Select relationship...</option>
                <option value="Incarcerated individual">Incarcerated individual</option>
                <option value="Family member">Family member</option>
                <option value="Friend">Friend</option>
                <option value="Advocate">Advocate</option>
                <option value="Researcher">Researcher</option>
                <option value="Other interested person">Other interested person</option>
              </select>
            </div>

            <div class="form-group">
              <label for="preferredContactMethod">Preferred Response Method</label>
              <select id="preferredContactMethod" name="preferredContactMethod">
                <option value="Email" selected>Email</option>
                <option value="Phone">Phone</option>
                <option value="Postal Mail">Postal Mail</option>
                <option value="Account Dashboard">Account Dashboard</option>
              </select>
            </div>

            <div class="form-group full-width">
              <label class="consent-checkbox-label" style="margin-bottom: 0;">
                <input type="checkbox" id="permissionToContact" name="permissionToContact" checked>
                <span>I give Carceral Collections permission to contact me by email or phone regarding this research inquiry.</span>
              </label>
            </div>
          </div>
        </section>

        <!-- SECTION 2: INMATE -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">02</span>
            <h2>Incarcerated Individual Information</h2>
          </div>
          <p class="section-description">Provide as much identifying information as you know to help locate records.</p>

          <div class="form-grid">
            <div class="form-group">
              <label for="inmateName">Inmate Full Name <span class="req">*</span></label>
              <input type="text" id="inmateName" name="inmateName" required maxlength="120" placeholder="Full legal name and any known aliases">
            </div>

            <div class="form-group">
              <label for="inmateNumber">Inmate Number / DOC / BOP # <span class="opt">(if known)</span></label>
              <input type="text" id="inmateNumber" name="inmateNumber" maxlength="64" placeholder="DOC #, BOP register #, or state ID">
            </div>

            <div class="form-group">
              <label for="facility">Current Facility or Institution <span class="opt">(if known)</span></label>
              <input type="text" id="facility" name="facility" maxlength="180" placeholder="Facility name or last known institution">
            </div>

            <div class="form-group">
              <label for="state">State or Federal System <span class="opt">(if known)</span></label>
              <input type="text" id="state" name="state" maxlength="64" placeholder="State (e.g. Florida, Texas) or Federal BOP">
            </div>

            <div class="form-group">
              <label for="jurisdiction">System / Jurisdiction <span class="opt">(optional)</span></label>
              <select id="jurisdiction" name="jurisdiction">
                <option value="">Select jurisdiction...</option>
                <option value="State Prison System">State Prison System</option>
                <option value="Federal Bureau of Prisons (BOP)">Federal Bureau of Prisons (BOP)</option>
                <option value="County / Local Jail">County / Local Jail</option>
                <option value="Juvenile / Youth Facility">Juvenile / Youth Facility</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </section>

        <!-- SECTION 3: CASE & COURT RECORDS -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">03</span>
            <h2>Court & Case Records <span class="opt" style="font-size: 0.9rem; font-weight: normal;">(if known)</span></h2>
          </div>
          <p class="section-description">If your request involves criminal charges, sentencing, or an appeal, details here can speed up research.</p>

          <div class="form-grid">
            <div class="form-group">
              <label for="caseNumber">Case / Docket Number <span class="opt">(optional)</span></label>
              <input type="text" id="caseNumber" name="caseNumber" maxlength="100" placeholder="e.g. 2018-CF-001234">
            </div>

            <div class="form-group">
              <label for="court">Court <span class="opt">(optional)</span></label>
              <input type="text" id="court" name="court" maxlength="180" placeholder="e.g. 9th Judicial Circuit Court, U.S. District Court">
            </div>

            <div class="form-group">
              <label for="county">County <span class="opt">(optional)</span></label>
              <input type="text" id="county" name="county" maxlength="100" placeholder="e.g. Orange County, Duval County">
            </div>
          </div>
        </section>

        <!-- SECTION 4: CATEGORIES -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">04</span>
            <h2>Research Categories</h2>
          </div>
          <p class="section-description">Select all categories that apply to your research request.</p>

          <div class="categories-grid">
            ${categoryHtml}
          </div>
        </section>

        <!-- SECTION 5: INQUIRY -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">05</span>
            <h2>Research Inquiry Details</h2>
          </div>
          <p class="section-description">Describe in detail what you need help finding. Include names, dates, cases, locations, or agencies.</p>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="inquiry">Describe What You Need Help Finding <span class="req">*</span></label>
            <textarea id="inquiry" name="inquiry" required rows="6" maxlength="10000" placeholder="Explain what records or information you are searching for, what questions you have, and any relevant background..."></textarea>
            <span class="field-help">Be as specific as possible. Minimum 10 characters.</span>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="documentsAlreadyAvailable">What Documents or Information Have Already Been Located? <span class="opt">(optional)</span></label>
            <textarea id="documentsAlreadyAvailable" name="documentsAlreadyAvailable" rows="3" maxlength="5000" placeholder="e.g. docket sheets, sentencing order, arrest affidavit, police report, or mention if none have been found yet"></textarea>
          </div>

          <div class="form-group">
            <label for="documentsRequested">What Specific Documents or Information Are Being Requested? <span class="opt">(optional)</span></label>
            <textarea id="documentsRequested" name="documentsRequested" rows="3" maxlength="5000" placeholder="e.g. trial transcripts, sentencing guidelines scoresheet, disciplinary records, historical newspaper clippings"></textarea>
          </div>
        </section>

        <!-- SECTION 6: LEGAL NOTICE & CONSENT -->
        <section class="form-section">
          <div class="form-section-header">
            <span class="section-number">06</span>
            <h2>Notice & Disclaimers</h2>
          </div>

          <div class="notice-box">
            <h3>Important Notice</h3>
            <p>Carceral Collections is an independent research and information project. We are not a law firm, and we are not attorneys. We do not provide legal advice, legal representation, attorney-client services, or guarantees about the outcome of any criminal, civil, appellate, post-conviction, administrative, or institutional matter. Information provided through the Research Help Finder is intended for research, educational, historical, informational, and assistance purposes.</p>
            <p>Submitting an inquiry does not create an attorney-client relationship or any other professional legal relationship with Carceral Collections. When a situation requires legal advice, interpretation of legal rights, representation in court, preparation of legal pleadings, or decisions involving deadlines or legal strategy, you should consult a licensed attorney or an appropriate legal services organization.</p>
          </div>

          <div class="notice-box" style="background: #fffdf5; border-color: #f1d597;">
            <h3 style="color: #854d0e;">Privacy & Sensitive Information</h3>
            <p>Please provide only the information reasonably necessary for us to understand your research request. Do not submit passwords, Social Security numbers, banking information, medical records, confidential attorney communications, or other highly sensitive personal information through this form.</p>
          </div>

          <label class="consent-checkbox-label">
            <input type="checkbox" id="disclaimerAcknowledged" name="disclaimerAcknowledged" required>
            <span><strong>I acknowledge and agree:</strong> Carceral Collections is an independent research project and not a law firm. I understand that submitting this inquiry does not create an attorney-client relationship, does not constitute legal advice or representation, and is solely for research and informational assistance. <span class="req">*</span></span>
          </label>

          <div class="pre-submit-notice">
            By submitting this form, you are requesting research and informational assistance from Carceral Collections. Carceral Collections is not a law firm and does not provide legal advice or legal representation.
          </div>

          <div class="form-submit-row">
            <button type="submit" id="submit-button" class="btn-submit-request">
              <span>Start My Research Request</span>
            </button>
            <div id="form-status" class="form-status-message" role="status" aria-live="polite"></div>
          </div>
        </section>

      </form>
    `;

    const form = $('research-inquiry-form');
    form.addEventListener('submit', handleFormSubmit);
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const statusEl = $('form-status');
    const submitBtn = $('submit-button');

    statusEl.className = 'form-status-message';
    statusEl.textContent = '';

    const requesterName = $('requesterName').value.trim();
    const requesterEmail = $('requesterEmail').value.trim();
    const relationship = $('relationship').value;
    const inmateName = $('inmateName').value.trim();
    const inquiry = $('inquiry').value.trim();
    const disclaimer = $('disclaimerAcknowledged').checked;

    if (!requesterName) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'Please enter your full name.';
      $('requesterName').focus();
      return;
    }
    if (!requesterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'Please enter a valid email address.';
      $('requesterEmail').focus();
      return;
    }
    if (!relationship) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'Please select your relationship to the incarcerated individual.';
      $('relationship').focus();
      return;
    }
    if (!inmateName) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'Please enter the full name of the incarcerated individual.';
      $('inmateName').focus();
      return;
    }
    if (!inquiry || inquiry.length < 10) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'Please describe your research inquiry (at least 10 characters).';
      $('inquiry').focus();
      return;
    }
    if (!disclaimer) {
      statusEl.className = 'form-status-message error';
      statusEl.textContent = 'You must check the box acknowledging the research-only disclaimer.';
      $('disclaimerAcknowledged').focus();
      return;
    }

    // Collect multi-select categories
    const selectedCategories = Array.from(form.querySelectorAll('input[name="categories"]:checked')).map(cb => cb.value);

    const payload = {
      requesterName,
      requesterEmail,
      requesterPhone: $('requesterPhone').value.trim(),
      relationship,
      preferredContactMethod: $('preferredContactMethod').value,
      permissionToContact: $('permissionToContact').checked,

      inmateName,
      inmateNumber: $('inmateNumber').value.trim(),
      facility: $('facility').value.trim(),
      state: $('state').value.trim(),
      jurisdiction: $('jurisdiction').value,

      caseNumber: $('caseNumber').value.trim(),
      court: $('court').value.trim(),
      county: $('county').value.trim(),

      categories: selectedCategories,
      inquiry,
      documentsAlreadyAvailable: $('documentsAlreadyAvailable').value.trim(),
      documentsRequested: $('documentsRequested').value.trim(),
      disclaimerAcknowledged: disclaimer
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting Research Request...</span>';
    statusEl.textContent = 'Recording your inquiry in the research database...';

    try {
      const result = await request('/api/research-help/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      renderConfirmation($('help-finder-app'), result.requestId, payload);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Start My Research Request</span>';
      statusEl.className = 'form-status-message error';
      statusEl.textContent = err.message || 'We could not record your submission. Please check your connection and try again.';
    }
  }

  function renderConfirmation(container, requestId, payload) {
    container.innerHTML = `
      <div class="confirmation-card">
        <div class="confirmation-badge" aria-hidden="true">✓</div>
        <h2>Research Inquiry Submitted</h2>
        <p style="font-size: 1.15rem; color: #444; max-width: 680px; margin: 0 auto 1.5rem;">
          Your research inquiry has been securely recorded in our database and emailed to the Carceral Collections research staff for review.
        </p>

        <div class="request-id-display">
          <span class="label">Your Unique Research Request ID</span>
          <strong class="id-value">${esc(requestId)}</strong>
        </div>

        <div class="confirmation-details">
          <h3 style="font-family: 'Libre Baskerville', Georgia, serif; color: var(--navy); margin-top: 0; margin-bottom: 1rem;">Submission Summary</h3>
          <dl>
            <dt>Request ID:</dt>
            <dd><strong>${esc(requestId)}</strong></dd>

            <dt>Date Submitted:</dt>
            <dd>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>

            <dt>Inmate Name:</dt>
            <dd>${esc(payload.inmateName)}</dd>

            <dt>Inmate Number:</dt>
            <dd>${esc(payload.inmateNumber || 'Not provided')}</dd>

            <dt>Facility / State:</dt>
            <dd>${esc(payload.facility || 'N/A')}${payload.state ? ' (' + esc(payload.state) + ')' : ''}</dd>

            <dt>Categories:</dt>
            <dd>${esc(payload.categories?.length ? payload.categories.join(', ') : 'General research')}</dd>

            <dt>Requester:</dt>
            <dd>${esc(payload.requesterName)} (${esc(payload.relationship)})</dd>
          </dl>
        </div>

        <div style="max-width: 680px; margin: 0 auto 2rem; font-size: 0.95rem; color: #555; text-align: left; line-height: 1.6; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 1.25rem 1.5rem;">
          <h4 style="color: var(--navy); margin: 0 0 0.5rem;">What Happens Next?</h4>
          <p style="margin: 0 0 0.5rem;">Our staff will review the information you provided and determine what research methods, sources, records, correspondence, or publicly available materials may assist your inquiry.</p>
          <p style="margin: 0;">You can view updates and findings on this case at any time in your account under <strong>My Research Requests</strong>.</p>
        </div>

        <div class="confirmation-actions">
          <a href="/PROFILE.html#research-requests" class="btn-primary">View My Research Requests</a>
          <a href="/COLLECTIONS.html" class="btn-secondary">Explore The Collections</a>
        </div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', init);
})();

