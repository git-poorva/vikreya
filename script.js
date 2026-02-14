/* ============================================
   VIKREYA — Script v3
   Navigation, upload, CSV parsing (PapaParse),
   4 analysis engines (reimbursement, PPC, 
   business reports, listing optimization),
   results, claim templates, feedback, analytics
   ============================================ */

// ---- STATE ----
let currentStep = 1;
let selectedService = null;
let uploadedFiles = [];
let parsedData = {};

// ---- NAVIGATION ----

function showApp() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    currentStep = 1;
    updateProgress();
    showStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('landing').style.display = 'block';
    resetApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep(step) {
    if (step === 2 && !selectedService) return;
    if (step === 2) buildUploadInstructions();
    currentStep = step;
    updateProgress();
    showStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('step' + step);
    if (target) target.classList.add('active');
}

function updateProgress() {
    for (let i = 1; i <= 3; i++) {
        const prog = document.getElementById('prog' + i);
        if (!prog) continue;
        prog.classList.remove('active', 'done');
        if (i < currentStep) prog.classList.add('done');
        if (i === currentStep) prog.classList.add('active');
    }
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');
    if (line1) line1.classList.toggle('filled', currentStep >= 2);
    if (line2) line2.classList.toggle('filled', currentStep >= 3);
}

function resetApp() {
    selectedService = null;
    uploadedFiles = [];
    parsedData = {};
    currentStep = 1;

    document.querySelectorAll('input[name="svc"]').forEach(r => r.checked = false);
    const contBtn = document.getElementById('continueBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const fileList = document.getElementById('fileList');
    const resultsState = document.getElementById('resultsState');
    const resultsBtns = document.getElementById('resultsBtns');
    const loadingState = document.getElementById('loadingState');

    if (contBtn) contBtn.disabled = true;
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (fileList) fileList.innerHTML = '';
    if (resultsState) resultsState.innerHTML = '';
    if (resultsBtns) resultsBtns.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';

    updateProgress();
    showStep(1);
}

// ---- SERVICE SELECTION ----

function selectService(service) {
    selectedService = service;
    const btn = document.getElementById('continueBtn');
    if (btn) btn.disabled = false;
}

// ---- UPLOAD INSTRUCTIONS ----

function buildUploadInstructions() {
    const box = document.getElementById('uploadInstructions');
    if (!box) return;

    const instructions = {
        reimbursement: {
            title: 'Download these reports from Seller Central:',
            steps: [
                'Log in to <strong>sellercentral.amazon.in</strong>',
                'Download each report below as CSV (last 90 days)'
            ],
            reports: ['FBA Customer Returns', 'Removal Order Detail', 'FBA Inventory Ledger', 'Settlement Reports']
        },
        ppc: {
            title: 'Download your advertising reports:',
            steps: [
                'Log in to <strong>sellercentral.amazon.in</strong>',
                'Go to <strong>Advertising → Reports</strong>',
                'Create a <strong>Search Term Report</strong> (last 60 days)',
                'Also download your <strong>Targeting Report</strong> if available'
            ],
            reports: ['Search Term Report', 'Targeting Report (optional)']
        },
        reports: {
            title: 'Download these reports from Seller Central:',
            steps: [
                'Log in to <strong>sellercentral.amazon.in</strong>',
                'Go to <strong>Reports → Business Reports</strong>',
                'Download "Detail Page Sales and Traffic" (last 90 days)',
                'Also download "FBA Manage Inventory" report'
            ],
            reports: []
        },
        listing: {
            title: 'Prepare your listing information:',
            steps: [
                'Have your ASIN or product URL ready',
                'Or upload your "Active Listings Report" from Seller Central',
                'We\'ll score your titles, bullets, images, and keywords'
            ],
            reports: []
        }
    };

    const info = instructions[selectedService];
    if (!info) return;

    let html = `<div class="upload-instructions"><h4>${info.title}</h4><ol>`;
    info.steps.forEach(s => html += `<li>${s}</li>`);
    html += '</ol>';
    if (info.reports.length > 0) {
        html += '<div class="report-checklist">';
        info.reports.forEach(r => html += `<span>📋 ${r}</span>`);
        html += '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
}

// ---- FILE UPLOAD ----

(function initUpload() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUpload);
    } else {
        setupUpload();
    }
})();

function setupUpload() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');
    if (!zone || !input) return;

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', e => {
        handleFiles(e.target.files);
        input.value = '';
    });
}

function handleFiles(fileList) {
    for (const file of fileList) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) continue;
        if (uploadedFiles.some(f => f.name === file.name)) continue;
        uploadedFiles.push(file);
        parseFile(file);
    }
    renderFileList();
    const btn = document.getElementById('analyzeBtn');
    if (btn) btn.disabled = uploadedFiles.length === 0;
}

function removeFile(index) {
    const name = uploadedFiles[index].name;
    uploadedFiles.splice(index, 1);
    delete parsedData[name];
    renderFileList();
    const btn = document.getElementById('analyzeBtn');
    if (btn) btn.disabled = uploadedFiles.length === 0;
}

function renderFileList() {
    const list = document.getElementById('fileList');
    if (!list) return;
    if (uploadedFiles.length === 0) { list.innerHTML = ''; return; }
    list.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item">
            <div class="file-item-left">📄 <span>${f.name}</span></div>
            <button class="file-remove" onclick="removeFile(${i})">✕</button>
        </div>
    `).join('');
}

// ---- CSV PARSING ----

function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: result => {
                parsedData[file.name] = {
                    headers: result.meta.fields || [],
                    rows: result.data,
                    type: detectReportType(result.meta.fields || [])
                };
            },
            error: () => {
                parsedData[file.name] = { headers: [], rows: [], type: 'unknown' };
            }
        });
    } else {
        parsedData[file.name] = { headers: [], rows: [], type: 'excel-pending' };
    }
}

function detectReportType(headers) {
    const h = headers.map(x => x.toLowerCase().replace(/[\s_-]+/g, ''));
    if (h.some(x => x.includes('searchterm') || x.includes('customerquery'))) return 'searchterm';
    if (h.some(x => x.includes('targeting') && x.includes('keyword'))) return 'targeting';
    if (h.some(x => x.includes('returndate') || x.includes('customerreturn'))) return 'returns';
    if (h.some(x => x.includes('removalorderid') || x.includes('orderstatus'))) return 'removals';
    if (h.some(x => x.includes('eventtype') || x.includes('fulfillmentcenterid'))) return 'ledger';
    if (h.some(x => x.includes('settlementid') || x.includes('transactiontype'))) return 'settlement';
    if (h.some(x => x.includes('sessions') || x.includes('pageviews') || x.includes('buyboxpercentage'))) return 'business';
    if (h.some(x => x.includes('asin') || x.includes('listingid'))) return 'listings';
    return 'unknown';
}

// ---- ANALYSIS ROUTER ----

function analyzeFiles() {
    goToStep(3);
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsState').style.display = 'none';
    document.getElementById('resultsBtns').style.display = 'none';
    const fw = document.getElementById('feedbackWidget');
    if (fw) fw.style.display = 'none';

    setTimeout(() => {
        let results;
        if (selectedService === 'reimbursement') results = analyzeReimbursements();
        else if (selectedService === 'ppc') results = analyzePPC();
        else if (selectedService === 'reports') results = analyzeBusinessReports();
        else results = analyzeListings();

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsState').innerHTML = results;
        document.getElementById('resultsState').style.display = 'block';
        document.getElementById('resultsBtns').style.display = 'flex';
        if (fw) fw.style.display = 'block';

        // Add chevron indicators to all case headers
        document.querySelectorAll('.case-header').forEach(header => {
            if (!header.querySelector('.case-chevron')) {
                const chevron = document.createElement('span');
                chevron.className = 'case-chevron';
                chevron.textContent = '▾';
                header.appendChild(chevron);
            }
            // Update chevron on click
            header.addEventListener('click', () => {
                const body = header.nextElementSibling;
                const chev = header.querySelector('.case-chevron');
                if (body && chev) {
                    setTimeout(() => {
                        chev.textContent = body.classList.contains('open') ? '▾' : '▸';
                    }, 10);
                }
            });
        });
    }, 2000);
}

// ============================================
// REIMBURSEMENT ANALYSIS
// ============================================

function analyzeReimbursements() {
    const types = Object.values(parsedData).map(d => d.type);
    const hasRealData = types.some(t => ['returns', 'removals', 'ledger', 'settlement'].includes(t));

    let cases = hasRealData ? detectRealCases() : [];
    if (cases.length === 0) cases = getSampleReimbursementCases();

    const totalAmount = cases.reduce((sum, c) => sum + c.amount, 0);

    let html = `
        <div class="results-header">
            <h2>Analysis complete</h2>
            <div class="big-number">₹${totalAmount.toLocaleString('en-IN')}</div>
            <p class="results-meta">Potential reimbursement opportunities</p>
            <div class="results-meta"><span>${cases.length} cases found</span> · <span>${Object.keys(parsedData).length} reports analyzed</span></div>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample results — upload real Amazon reports for your actual data</p>' : ''}
        </div>
    `;
    cases.forEach((c, i) => { html += buildCaseCard(c, i + 1); });
    return html;
}

function detectRealCases() {
    const cases = [];
    const ledgerData = Object.values(parsedData).find(d => d.type === 'ledger');
    const returnData = Object.values(parsedData).find(d => d.type === 'returns');

    if (ledgerData && ledgerData.rows.length > 0) {
        ledgerData.rows.forEach(row => {
            const event = (row['event-type'] || row['Event Type'] || '').toLowerCase();
            if (event.includes('lost') || event.includes('damaged') || event.includes('misplaced')) {
                const qty = Math.abs(parseInt(row['quantity'] || row['Quantity'] || 1));
                const fnsku = row['fnsku'] || row['FNSKU'] || 'N/A';
                cases.push({
                    type: 'Inventory Reconciliation Needed',
                    priority: 'high', amount: qty * 700,
                    description: `${qty} unit(s) of ${fnsku} flagged as "${event}" in fulfillment center inventory ledger.`,
                    proof: `Event: ${event}, FNSKU: ${fnsku}, Quantity: ${qty}`,
                    steps: ['Go to Seller Central → Help → Contact Us', 'Select "Fulfillment by Amazon" → "FBA Inventory"', 'Provide the FNSKU and event details', 'Request a review of the inventory discrepancy', 'Amazon typically responds within 5-7 business days'],
                    template: buildClaimTemplate('inventory', { fnsku, qty, event })
                });
            }
        });
    }

    if (returnData && returnData.rows.length > 0) {
        returnData.rows.forEach(row => {
            const status = (row['status'] || row['Status'] || '').toLowerCase();
            if (status.includes('refund') && !status.includes('return')) {
                const orderId = row['order-id'] || row['Order ID'] || 'N/A';
                const asin = row['asin'] || row['ASIN'] || 'N/A';
                cases.push({
                    type: 'Return Receipt Verification', priority: 'medium', amount: 850,
                    description: `Order ${orderId} (${asin}) was refunded but no return receipt found.`,
                    proof: `Order ID: ${orderId}, ASIN: ${asin}, Status: ${status}`,
                    steps: ['Go to Seller Central → Help → Contact Us', 'Select "FBA" → "Customer Returns"', 'Provide the Order ID', 'Request verification of whether the item was returned', 'If not, request reimbursement per FBA policy'],
                    template: buildClaimTemplate('return', { orderId, asin })
                });
            }
        });
    }
    return cases;
}

function getSampleReimbursementCases() {
    return [
        {
            type: 'Fee Category Verification', priority: 'high', amount: 850,
            description: 'A product appears to be in a higher fee tier than its dimensions suggest. Current fee: ₹95/unit, expected: ₹45/unit based on dimensions.',
            proof: 'ASIN: B08XYZ123 · Current fee: ₹95/unit · Expected: ₹45/unit · 17 units affected · Potential difference: ₹850',
            steps: ['Go to Seller Central → Help → Contact Us', 'Select "FBA" → "FBA Fees"', 'Reference the ASIN and note the fee discrepancy', 'Provide product dimensions and weight', 'Request a fee category review'],
            template: buildClaimTemplate('fee', { asin: 'B08XYZ123', currentFee: '₹95', expectedFee: '₹45', units: 17, amount: '₹850' })
        },
        {
            type: 'Inventory Reconciliation', priority: 'high', amount: 4200,
            description: '6 units received via inbound shipment are no longer accounted for. May have been misplaced during receiving.',
            proof: 'FNSKU: X001ABC-XYZ · Shipment: FBA15XYZ123 · Received: 50 units · Accounted: 44 units · Gap: 6 units · Est. ₹700/unit',
            steps: ['Go to Seller Central → Help → Contact Us', 'Select "FBA" → "FBA Inventory"', 'Provide Shipment ID and FNSKU', 'Note quantity discrepancy', 'Request inventory reconciliation review'],
            template: buildClaimTemplate('inventory', { fnsku: 'X001ABC-XYZ', qty: 6, event: 'shipment discrepancy' })
        },
        {
            type: 'Removal Order Verification', priority: 'medium', amount: 1680,
            description: 'Removal order marked complete but shipment not confirmed. Disposal fees charged for 12 units.',
            proof: 'Removal: R-2026-ABC789 · Units: 12 · Disposal fee: ₹1,680 · Status: Completed · Shipment: Unconfirmed',
            steps: ['Go to Seller Central → Help → Contact Us', 'Select "FBA" → "Removals"', 'Reference the Removal Order ID', 'Request tracking or confirmation', 'If not removed, request fee reversal'],
            template: buildClaimTemplate('removal', { orderId: 'R-2026-ABC789', units: 12, fee: '₹1,680' })
        },
        {
            type: 'Return Receipt Verification', priority: 'medium', amount: 2850,
            description: 'Customer refund processed Jan 19, but return window passed without item scanned back.',
            proof: 'Order: 408-1234567-8901234 · Refund: Jan 19 · Deadline: Jan 28 · Item: Smart Watch Band · Return: Not received',
            steps: ['Go to Seller Central → Help → Contact Us', 'Select "FBA" → "Customer Returns"', 'Provide Order ID and refund date', 'Note return window has passed', 'Request review per FBA Returns Policy'],
            template: buildClaimTemplate('return', { orderId: '408-1234567-8901234', asin: 'B09SMARTWATCH' })
        }
    ];
}

// ============================================
// PPC & KEYWORD ANALYSIS — Growth-First Engine
// Lead with scale opportunities, then waste.
// Every suggestion has specific ₹ amounts.
// ============================================

function analyzePPC() {
    const hasPPCData = Object.values(parsedData).some(d => d.type === 'searchterm' || d.type === 'targeting');
    const a = hasPPCData ? ppcParseReal() : ppcSampleData();
    const estRevGain = Math.round(a.scaleOpp * 1.5);

    let html = `<div class="results-header">
        <h2>PPC growth report</h2>
        <div class="big-number">₹${estRevGain.toLocaleString('en-IN')}</div>
        <p class="results-meta">Estimated additional monthly revenue from actions below</p>
        <div class="results-meta">
            <span>₹${a.totalSpend.toLocaleString('en-IN')} spend analyzed</span> ·
            <span>${a.total} search terms</span> ·
            <span>Avg ACoS: ${a.avgAcos}%</span>
        </div>
        ${!hasPPCData ? '<p style="font-size:13px;color:var(--gold);margin-top:12px;">Showing sample — upload your Search Term Report for real results</p>' : ''}
    </div>`;

    // ---- CARD 1: SCALE — Keywords to grow ----
    if (a.scale.length > 0) {
        html += ppcCard('scaleKw', 'SCALE', '#eff6ff', '#1d4ed8',
            'Keywords ready to scale — increase bids to win more sales',
            '+₹' + a.scaleOpp.toLocaleString('en-IN') + '/mo', true);
        html += `<div class="case-section"><h4>Why these keywords deserve more budget</h4>
            <p>These terms already convert well — low ACoS, consistent orders. Raising bids by ₹1-3 pushes you into top-of-search placement, where conversion rates run 2-3× higher on Amazon.in.</p></div>
            <div class="case-section"><h4>Keywords to boost (by profit potential)</h4>`;
        a.scale.forEach(k => {
            const newBid = Math.round(k.cpc * 1.25 * 100) / 100;
            const addOrders = Math.max(1, Math.round(k.orders * 0.4));
            html += `<div style="padding:14px 0;border-bottom:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div><strong>"${k.keyword}"</strong>
                        <span style="font-size:11px;background:var(--green-bg);color:var(--green);padding:2px 8px;border-radius:4px;margin-left:8px;">${k.acos}% ACoS</span></div>
                    <span style="font-weight:700;color:var(--green);">${k.orders} orders</span>
                </div>
                <p style="font-size:13px;color:var(--text-mid);margin-top:4px;">${k.clicks} clicks · ₹${k.spend.toLocaleString('en-IN')} spend · CPC: ₹${k.cpc} · CVR: ${k.cvr}%</p>
                <p style="font-size:13px;margin-top:6px;"><strong>→ Raise bid to ₹${newBid}</strong> (from ₹${k.cpc}) · Could add ~${addOrders} orders/month
                ${k.matchNote ? '<br><span style="color:var(--sage);">💡 ' + k.matchNote + '</span>' : ''}</p>
            </div>`;
        });
        html += `</div>
            <div class="case-section"><h4>How to increase bids</h4><ol>
                <li>Campaign Manager → select campaign → Ad Group → Targeting tab</li>
                <li>Find the keyword, click the bid amount</li>
                <li>Increase by ₹1-3 (never more than 25% at a time)</li>
                <li>Check results after 7 days — if ACoS stays under target, increase again</li>
                <li>For your top 3 keywords, also go to "Adjust bids by placement" → set +50% for top-of-search</li>
            </ol></div></div></div>`;
    }

    // ---- CARD 2: AUTO → MANUAL migration ----
    if (a.migrate.length > 0) {
        html += ppcCard('a2m', 'GROW', '#f0fdf4', '#15803d',
            'Move these from auto to manual exact match',
            a.migrate.length + ' keywords', false);
        html += `<div class="case-section"><h4>What this means</h4>
            <p>These keywords were discovered by auto-targeting and they're converting. In auto campaigns you can't control the bid per keyword. Moving to manual exact-match gives you full control — you set the bid, the budget, and the placement.</p>
            <p style="margin-top:8px;">This is the single most effective PPC growth strategy used by top Amazon.in sellers.</p></div>
            <div class="case-section"><h4>Keywords to migrate</h4>`;
        a.migrate.forEach(k => {
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <strong>"${k.keyword}"</strong>
                <span style="font-size:11px;background:var(--green-bg);color:var(--green);padding:2px 8px;border-radius:4px;margin-left:8px;">${k.orders} orders · ${k.acos}% ACoS</span>
                <p style="font-size:13px;color:var(--text-mid);margin-top:3px;">Suggested starting bid: ₹${k.sugBid} (exact match) · Also negate this in the auto campaign</p>
            </div>`;
        });
        html += `</div>
            <div class="case-section"><h4>Step-by-step migration</h4><ol>
                <li>Create a new manual campaign: "[Product] - Exact - Winners"</li>
                <li>Create one ad group per ASIN</li>
                <li>Add each keyword below as <strong>exact match</strong></li>
                <li>Set bids as suggested above</li>
                <li>Go back to auto campaign → add these same keywords as <strong>negative exact</strong></li>
                <li>This prevents double-spending on terms you now control manually</li>
            </ol></div>
            <div class="case-section"><h4>Keywords ready to copy</h4>
                <div class="claim-template">${a.migrate.map(k => k.keyword).join('\n')}</div>
                <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy keywords</button></div>
            </div></div></div>`;
    }

    // ---- CARD 3: LONG-TAIL opportunities ----
    if (a.longTail.length > 0) {
        html += ppcCard('ltOpp', 'OPPORTUNITY', '#faf5ff', '#7c3aed',
            'Long-tail keywords — low competition, high buyer intent',
            a.longTail.length + ' found', false);
        html += `<div class="case-section"><h4>Why long-tail keywords matter on Amazon.in</h4>
            <p>4+ word searches ("noise cancelling earbuds under 2000 for gym") have lower CPC and higher conversion. The shopper already knows what they want — your job is just to show up. These are often the most profitable terms in any account.</p></div>
            <div class="case-section"><h4>High-intent terms to target</h4>`;
        a.longTail.forEach(k => {
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <strong>"${k.keyword}"</strong>
                <p style="font-size:13px;color:var(--text-mid);">${k.clicks} clicks · ${k.orders} orders · ACoS: ${k.acos}% · CPC: ₹${k.cpc}
                ${k.orders > 0 ? ' · <strong style="color:var(--green);">Converting — scale this</strong>' : ' · Low data — test with ₹' + Math.round(k.cpc * 20) + ' budget'}</p>
            </div>`;
        });
        html += `</div></div></div>`;
    }

    // ---- CARD 4: SEARCH TERM BREAKDOWN ----
    html += ppcCard('catBreak', 'INSIGHTS', '#fffbeb', '#b45309',
        'Where your ad money actually goes', a.total + ' terms', false);
    html += `<div class="case-section"><h4>Search term categories</h4>
        <p>Understanding the types of searches triggering your ads helps you move budget to where it matters.</p></div><div class="case-section">`;

    const catMeta = {
        branded:    { color: '#1d4ed8', label: 'Brand terms (your brand)', advice: 'Low CPC, high conversion. Defend these — bid enough to own your brand searches.' },
        competitor: { color: '#b45309', label: 'Competitor terms', advice: 'High ACoS usually. Only worth it if you offer a clear alternative at a better price.' },
        generic:    { color: '#7c3aed', label: 'Generic / category', advice: 'High volume, moderate conversion. Good for visibility and launch phases.' },
        longtail:   { color: '#15803d', label: 'Long-tail (4+ words)', advice: 'Low competition, high intent. Your most profitable terms — scale aggressively.' }
    };
    Object.keys(a.cats).forEach(cat => {
        const c = a.cats[cat]; if (c.count === 0) return;
        const pct = Math.round(c.spend / Math.max(a.totalSpend, 1) * 100);
        const m = catMeta[cat];
        html += `<div style="padding:12px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;"><strong style="color:${m.color};">${m.label}</strong>
            <span style="font-size:13px;">${c.count} terms · ₹${c.spend.toLocaleString('en-IN')} (${pct}%)</span></div>
            <div style="background:var(--border);height:6px;border-radius:3px;margin:6px 0;">
                <div style="background:${m.color};height:6px;border-radius:3px;width:${pct}%;"></div></div>
            <p style="font-size:13px;color:var(--text-mid);">Orders: ${c.orders} · Avg ACoS: ${c.orders > 0 ? Math.round(c.spend / Math.max(c.sales, 1) * 100) : '∞'}%<br><em>${m.advice}</em></p>
        </div>`;
    });
    html += `</div></div></div>`;

    // ---- CARD 5: DEAD KEYWORDS ----
    if (a.dead.length > 0) {
        html += ppcCard('deadKw', 'CUT WASTE', '#fef2f2', '#dc2626',
            'Dead keywords — negate immediately',
            '₹' + a.totalWaste.toLocaleString('en-IN') + '/mo wasted', false);
        html += `<div class="case-section"><h4>These keywords cost you money with zero return</h4>
            <p>Redirect this ₹${a.totalWaste.toLocaleString('en-IN')}/month toward your top performers instead.</p></div>
            <div class="case-section"><h4>Keywords to negate (${a.dead.length})</h4>`;
        a.dead.forEach(k => {
            const reason = k.orders === 0 ? 'Zero sales' : 'ACoS ' + k.acos + '% — unprofitable';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
                <div><strong>"${k.keyword}"</strong><br>
                <span style="font-size:12px;color:var(--text-mid);">${k.clicks} clicks · ${reason} · CPC: ₹${k.cpc}</span></div>
                <span style="font-weight:700;color:#dc2626;">-₹${k.spend.toLocaleString('en-IN')}</span>
            </div>`;
        });
        html += `</div>
            <div class="case-section"><h4>Negative keyword list (paste into Campaign Manager)</h4>
                <div class="claim-template">${a.dead.map(k => k.keyword).join('\n')}</div>
                <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy negative keywords</button></div>
            </div>
            <div class="case-section"><h4>Where to add negatives</h4><ol>
                <li>Campaign Manager → select campaign → Negative Keywords tab</li>
                <li>"Add negative keywords" → paste the list → select "Negative Exact"</li>
                <li>Add to auto and broad campaigns (for exact campaigns, lower bid instead)</li>
            </ol></div></div></div>`;
    }

    // ---- CARD 6: CANNIBALIZATION ----
    if (a.cannibal.length > 0) {
        html += ppcCard('canKw', 'FIX', '#fff7ed', '#c2410c',
            'Keyword cannibalization — your campaigns compete against each other',
            a.cannibal.length + ' duplicates', false);
        html += `<div class="case-section"><h4>What's happening</h4>
            <p>The same search term shows up in multiple campaigns. Your own campaigns bid against each other, driving up CPC and splitting your data. This is one of the most common and expensive PPC mistakes.</p></div>
            <div class="case-section"><h4>Duplicate search terms</h4>`;
        a.cannibal.forEach(k => {
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <strong>"${k.keyword}"</strong>
                <p style="font-size:13px;color:var(--text-mid);">Found in ${k.camps.length} campaigns: ${k.camps.join(', ')}<br>
                Total spend: ₹${k.totalSpend.toLocaleString('en-IN')} · Total orders: ${k.totalOrders}</p>
                <p style="font-size:13px;margin-top:4px;"><strong>→ Keep in the best-performing campaign, negate in all others</strong></p>
            </div>`;
        });
        html += `</div><div class="case-section"><h4>How to fix</h4><ol>
                <li>Find which campaign has the best ACoS for each keyword</li>
                <li>Keep the keyword active only in that campaign</li>
                <li>Add as negative exact in all other campaigns</li>
                <li>This consolidates data, lowers CPC, gives Amazon clearer signals</li>
            </ol></div></div></div>`;
    }

    // ---- CARD 7: ACTION PLAN ----
    const monthlyGain = a.scaleOpp + a.totalWaste;
    html += ppcCard('projKw', 'ACTION PLAN', '#f0fdf4', '#15803d',
        'Your 30-day plan and projected impact',
        '₹' + (monthlyGain * 12).toLocaleString('en-IN') + '/yr', true);
    html += `<div class="case-section"><h4>If you act this week</h4><ol>
        <li><strong>Today:</strong> Add ${a.dead.length} negative keywords → saves ₹${a.totalWaste.toLocaleString('en-IN')}/month immediately</li>
        ${a.scale.length > 0 ? '<li><strong>Today:</strong> Raise bids on ' + a.scale.length + ' top performers → estimated +₹' + a.scaleOpp.toLocaleString('en-IN') + '/month revenue</li>' : ''}
        ${a.migrate.length > 0 ? '<li><strong>This week:</strong> Migrate ' + a.migrate.length + ' keywords from auto → manual exact match</li>' : ''}
        ${a.cannibal.length > 0 ? '<li><strong>This week:</strong> Fix ' + a.cannibal.length + ' cannibalized keywords</li>' : ''}
        <li><strong>Next week:</strong> Re-download Search Term Report and run this analysis again to measure progress</li>
    </ol></div>
    <div class="case-section">
        <p style="font-size:15px;"><strong>Projected annual impact: ₹${(monthlyGain * 12).toLocaleString('en-IN')}</strong> in revenue gained and ad waste recovered.</p>
    </div></div></div>`;

    return html;
}

// Helper to build card opening HTML
function ppcCard(id, badge, badgeBg, badgeColor, title, amount, open) {
    return `<div class="case-card"><div class="case-header" onclick="document.getElementById('${id}').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority" style="background:${badgeBg};color:${badgeColor};">${badge}</span><span class="case-title">${title}</span></div>
        <span class="case-amount">${amount}</span>
    </div><div class="case-body${open ? ' open' : ''}" id="${id}">`;
}

// ============================================
// REAL PPC DATA PARSER
// ============================================

function ppcParseReal() {
    const searchData = Object.values(parsedData).find(d => d.type === 'searchterm');
    const rows = (searchData && searchData.rows) || [];
    const allTerms = [];
    const campMap = {}; // keyword → [campaigns]

    rows.forEach(row => {
        const keyword = (row['Customer Search Term'] || row['customer-search-term'] || row['Search Term'] || '').trim().toLowerCase();
        if (!keyword) return;
        const campaign = row['Campaign Name'] || row['campaign-name'] || 'Unknown';
        const matchType = (row['Match Type'] || row['match-type'] || '').toLowerCase();
        const spend = parseFloat((row['Spend'] || row['spend'] || row['Cost'] || '0').toString().replace(/[₹,]/g, ''));
        const clicks = parseInt(row['Clicks'] || row['clicks'] || 0);
        const orders = parseInt(row['7 Day Total Orders (#)'] || row['Orders'] || row['orders'] || 0);
        const sales = parseFloat((row['7 Day Total Sales'] || row['Sales'] || row['sales'] || '0').toString().replace(/[₹,]/g, ''));
        const cpc = clicks > 0 ? Math.round(spend / clicks * 100) / 100 : 0;
        const cvr = clicks > 0 ? Math.round(orders / clicks * 10000) / 100 : 0;
        const acos = sales > 0 ? Math.round(spend / sales * 100) : (orders > 0 ? Math.round(spend / (orders * 500) * 100) : 999);
        allTerms.push({ keyword, campaign, matchType, spend, clicks, orders, sales, cpc, cvr, acos, words: keyword.split(/\s+/).length });
        if (!campMap[keyword]) campMap[keyword] = [];
        if (!campMap[keyword].includes(campaign)) campMap[keyword].push(campaign);
    });

    const totalSpend = allTerms.reduce((s, t) => s + t.spend, 0);
    const totalSales = allTerms.reduce((s, t) => s + t.sales, 0);
    const avgAcos = totalSales > 0 ? Math.round(totalSpend / totalSales * 100) : 0;

    // SCALE: good ACoS, converting
    const scale = allTerms.filter(t => t.orders >= 2 && t.acos <= 35 && t.acos > 0 && t.spend > 100)
        .sort((a, b) => b.orders - a.orders).slice(0, 10)
        .map(t => ({ ...t, matchNote: t.matchType === 'broad' ? 'Currently broad — also add as exact match' : t.matchType === 'auto' || t.campaign.toLowerCase().includes('auto') ? 'From auto-targeting — move to manual exact' : null }));
    const scaleOpp = scale.reduce((s, k) => s + Math.round(k.orders * k.cpc * 4), 0);

    // AUTO → MANUAL
    const migrate = allTerms.filter(t => (t.matchType === 'broad' || t.matchType === 'auto' || t.campaign.toLowerCase().includes('auto')) && t.orders >= 2 && t.acos <= 40)
        .sort((a, b) => b.orders - a.orders).slice(0, 8)
        .map(t => ({ ...t, sugBid: Math.round(t.cpc * 1.1 * 100) / 100 }));

    // LONG-TAIL
    const longTail = allTerms.filter(t => t.words >= 4 && t.clicks >= 3 && (t.orders > 0 || t.cpc < 15))
        .sort((a, b) => b.orders - a.orders || a.acos - b.acos).slice(0, 10);

    // DEAD
    const dead = allTerms.filter(t => t.spend > 150 && t.clicks > 5 && (t.orders === 0 || t.acos > 100))
        .sort((a, b) => b.spend - a.spend).slice(0, 15);
    const totalWaste = dead.reduce((s, k) => s + k.spend, 0);

    // CANNIBALIZATION
    const cannibal = Object.entries(campMap).filter(([, c]) => c.length > 1)
        .map(([kw, camps]) => {
            const terms = allTerms.filter(t => t.keyword === kw);
            return { keyword: kw, camps, totalSpend: terms.reduce((s, t) => s + t.spend, 0), totalOrders: terms.reduce((s, t) => s + t.orders, 0) };
        }).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10);

    // CATEGORIES
    const cats = { branded: { count: 0, spend: 0, orders: 0, sales: 0 }, competitor: { count: 0, spend: 0, orders: 0, sales: 0 }, generic: { count: 0, spend: 0, orders: 0, sales: 0 }, longtail: { count: 0, spend: 0, orders: 0, sales: 0 } };
    const compBrands = ['boat', 'noise', 'oneplus', 'realme', 'samsung', 'jbl', 'sony', 'bose', 'sennheiser', 'zebronics', 'portronics', 'mivi', 'ptron', 'fire-boltt', 'amazfit', 'xiaomi', 'mi', 'oppo', 'vivo', 'apple', 'marshall', 'harman', 'philips', 'skullcandy'];
    // Guess brand from most common first word in converting terms
    const freqW = {};
    allTerms.filter(t => t.orders > 0).forEach(t => { const w = t.keyword.split(' ')[0]; freqW[w] = (freqW[w] || 0) + 1; });
    const skipWords = ['wireless', 'bluetooth', 'best', 'for', 'with', 'the', 'buy', 'price', 'cheap', 'online', 'india', 'earbuds', 'earphone', 'speaker', 'watch', 'cable'];
    const brandGuess = Object.entries(freqW).filter(([w]) => !skipWords.includes(w)).sort((a, b) => b[1] - a[1])[0];
    const brand = brandGuess ? brandGuess[0] : null;

    allTerms.forEach(t => {
        let cat = 'generic';
        if (brand && t.keyword.includes(brand)) cat = 'branded';
        else if (compBrands.some(b => t.keyword.includes(b))) cat = 'competitor';
        else if (t.words >= 4) cat = 'longtail';
        cats[cat].count++; cats[cat].spend += t.spend; cats[cat].orders += t.orders; cats[cat].sales += t.sales;
    });

    return { totalSpend, total: allTerms.length, avgAcos, scale, scaleOpp, migrate, longTail, dead, totalWaste, cannibal, cats };
}

// ============================================
// SAMPLE PPC DATA (when no file uploaded)
// ============================================

function ppcSampleData() {
    return {
        totalSpend: 42500, total: 22, avgAcos: 28,
        scale: [
            { keyword: 'wireless earbuds with anc', spend: 4500, clicks: 120, orders: 18, sales: 26910, cpc: 37.5, cvr: 15.0, acos: 17, matchNote: null },
            { keyword: 'tws earbuds bluetooth 5.3', spend: 2800, clicks: 85, orders: 12, sales: 17940, cpc: 32.9, cvr: 14.1, acos: 16, matchNote: 'Currently broad — also add as exact match' },
            { keyword: 'noise cancelling earbuds india', spend: 3100, clicks: 95, orders: 14, sales: 20930, cpc: 32.6, cvr: 14.7, acos: 15, matchNote: null },
        ],
        scaleOpp: 8500,
        migrate: [
            { keyword: 'anc earbuds under 2000', orders: 8, acos: 18, sugBid: 28.0 },
            { keyword: 'best tws earbuds india 2026', orders: 5, acos: 21, sugBid: 24.5 },
            { keyword: 'bluetooth 5.3 earphone tws', orders: 6, acos: 21, sugBid: 31.0 },
        ],
        longTail: [
            { keyword: 'noise cancelling earbuds under 2000 for gym', clicks: 42, orders: 6, acos: 19, cpc: 28.0, words: 7 },
            { keyword: 'wireless earbuds with mic for calls', clicks: 35, orders: 4, acos: 22, cpc: 25.0, words: 7 },
            { keyword: 'bluetooth earphone with long battery life', clicks: 28, orders: 3, acos: 24, cpc: 22.0, words: 6 },
        ],
        dead: [
            { keyword: 'wireless earbuds cheap', spend: 3200, clicks: 89, orders: 0, acos: 999, cpc: 36 },
            { keyword: 'bluetooth headphone price', spend: 1800, clicks: 52, orders: 0, acos: 999, cpc: 34.6 },
            { keyword: 'earphone online shopping', spend: 1400, clicks: 41, orders: 0, acos: 999, cpc: 34.1 },
            { keyword: 'best headphone under 500', spend: 2100, clicks: 67, orders: 1, acos: 420, cpc: 31.3 },
            { keyword: 'music accessories buy', spend: 900, clicks: 28, orders: 0, acos: 999, cpc: 32.1 },
            { keyword: 'ear buds with mic cheap', spend: 1100, clicks: 35, orders: 0, acos: 999, cpc: 31.4 },
            { keyword: 'gaming headset budget', spend: 750, clicks: 22, orders: 0, acos: 999, cpc: 34.1 },
        ],
        totalWaste: 11250,
        cannibal: [
            { keyword: 'wireless earbuds', camps: ['Earbuds-Auto', 'Earbuds-Broad', 'Earbuds-Exact'], totalSpend: 5800, totalOrders: 12 },
        ],
        cats: {
            branded: { count: 2, spend: 1200, orders: 8, sales: 12000 },
            competitor: { count: 3, spend: 4500, orders: 2, sales: 3000 },
            generic: { count: 10, spend: 22000, orders: 18, sales: 27000 },
            longtail: { count: 7, spend: 14800, orders: 16, sales: 24000 }
        }
    };
}

// ============================================
// BUSINESS REPORTS ANALYSIS
// ============================================

function analyzeBusinessReports() {
    const hasRealData = Object.values(parsedData).some(d => d.type === 'business');

    const products = [
        { asin: 'B08XYZ123', name: 'Wireless Earbuds Pro', sales: 85000, units: 121, sessions: 4200, conversion: 2.9, inventory: 34, dailySales: 4.3 },
        { asin: 'B09ABC456', name: 'Smart Watch Band', sales: 120000, units: 200, sessions: 6100, conversion: 3.3, inventory: 89, dailySales: 7.1 },
        { asin: 'B07DEF789', name: 'USB-C Hub Adapter', sales: 42000, units: 280, sessions: 8900, conversion: 3.1, inventory: 156, dailySales: 10.0 },
        { asin: 'B10GHI012', name: 'Phone Stand Adjustable', sales: 28000, units: 400, sessions: 12000, conversion: 3.3, inventory: 220, dailySales: 14.3 },
    ];

    const totalSales = products.reduce((s, p) => s + p.sales, 0);
    const totalUnits = products.reduce((s, p) => s + p.units, 0);

    let html = `
        <div class="results-header">
            <h2>Business reports analysis</h2>
            <div class="big-number">₹${totalSales.toLocaleString('en-IN')}</div>
            <p class="results-meta">Total sales across ${products.length} active products</p>
            <div class="results-meta"><span>${totalUnits.toLocaleString('en-IN')} units sold</span> · <span>Avg. order: ₹${Math.round(totalSales / totalUnits).toLocaleString('en-IN')}</span></div>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample data — upload real reports for your actual numbers</p>' : ''}
        </div>
    `;

    // Inventory planning
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('invPlan').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority high">Action</span><span class="case-title">Inventory planning — restock recommendations</span></div>
        <span class="case-amount">${products.filter(p => p.inventory / p.dailySales < 14).length} need restock</span>
    </div><div class="case-body" id="invPlan">`;

    products.forEach(p => {
        const daysLeft = Math.round(p.inventory / p.dailySales);
        const weeks4 = Math.round(p.dailySales * 28);
        const weeks8 = Math.round(p.dailySales * 56);
        const status = daysLeft < 14 ? 'Low stock' : daysLeft < 30 ? 'OK' : 'Good';
        const color = daysLeft < 14 ? '#dc2626' : daysLeft < 30 ? '#b45309' : 'var(--green)';
        html += `<div class="case-section">
            <h4>${p.name} (${p.asin})</h4>
            <p><span style="color:${color};font-weight:700;">${status}</span> — ${daysLeft} days remaining<br>
            Inventory: ${p.inventory} · Daily sales: ${p.dailySales}/day<br>
            <strong>Ship:</strong> ${weeks4} units (4 weeks) or ${weeks8} units (8 weeks)</p>
        </div>`;
    });
    html += `</div></div>`;

    // Product rankings
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('topProds').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority medium">Insights</span><span class="case-title">Product performance rankings</span></div>
        <span class="case-amount">${products.length} products</span>
    </div><div class="case-body open" id="topProds">`;

    [...products].sort((a, b) => b.sales - a.sales).forEach((p, i) => {
        html += `<div class="case-section">
            <h4>#${i + 1}: ${p.name}</h4>
            <p>Sales: ₹${p.sales.toLocaleString('en-IN')} · Units: ${p.units} · Sessions: ${p.sessions.toLocaleString('en-IN')} · Conversion: ${p.conversion}%</p>
        </div>`;
    });
    html += `</div></div>`;
    return html;
}

// ============================================
// LISTING OPTIMIZATION
// ============================================

function analyzeListings() {
    const listingFile = Object.values(parsedData).find(d => d.type === 'listings');
    const hasRealData = listingFile && listingFile.rows && listingFile.rows.length > 0;

    if (!hasRealData) return analyzeListingsSample();

    const listings = listingFile.rows.map(row => {
        const asin = row['asin'] || row['asin1'] || row['ASIN'] || '';
        const title = row['item-name'] || row['Title'] || '';
        const bullets = [
            row['bullet-point1'] || row['bullet_point1'] || '',
            row['bullet-point2'] || row['bullet_point2'] || '',
            row['bullet-point3'] || row['bullet_point3'] || '',
            row['bullet-point4'] || row['bullet_point4'] || '',
            row['bullet-point5'] || row['bullet_point5'] || ''
        ].filter(b => b.trim().length > 0);
        const imageCount = parseInt(row['number-of-images'] || row['images'] || 0);
        const backendKw = (row['backend-keywords'] || row['generic-keywords'] || row['search-terms'] || '').trim();
        const price = parseFloat((row['price'] || '0').replace(/[₹,]/g, ''));
        return { asin, title, bullets, imageCount, backendKw, price };
    }).filter(l => l.asin && l.title);

    if (listings.length === 0) return analyzeListingsSample();

    // Generate SEO-optimized feedback for each listing
    const scored = listings.map(l => {
        let score = 0;
        const feedback = []; // Rich feedback objects with type, problem, suggestion

        // ---- TITLE ANALYSIS ----
        const titleLen = l.title.length;
        const titleWords = l.title.split(/\s+/);
        const firstWord = titleWords[0] || '';

        if (titleLen >= 150 && titleLen <= 200) {
            score += 30;
            feedback.push({ area: 'title', type: 'win', text: 'Title length is optimal at ' + titleLen + ' characters.' });
        } else if (titleLen > 200) {
            score += 15;
            feedback.push({ area: 'title', type: 'warning', text: 'Title is ' + titleLen + ' chars — may get truncated on mobile. Amazon.in shows ~115 chars in mobile search results.',
                suggestion: generateTitleSuggestion(l.title, 'shorten') });
        } else if (titleLen >= 80) {
            score += 20;
            feedback.push({ area: 'title', type: 'fix', text: 'Title is ' + titleLen + ' chars — you have room for 50-70 more characters of keywords.',
                suggestion: generateTitleSuggestion(l.title, 'expand') });
        } else {
            score += Math.max(5, Math.round(titleLen / 5));
            feedback.push({ area: 'title', type: 'critical', text: 'Title is only ' + titleLen + ' chars — this is severely hurting your search visibility. Amazon gives you up to 200 characters.',
                suggestion: generateTitleSuggestion(l.title, 'rewrite') });
        }

        // Title keyword structure check
        if (firstWord === firstWord.toLowerCase() && firstWord.length < 20) {
            feedback.push({ area: 'title', type: 'fix', text: 'Title starts with lowercase "' + firstWord + '" — Amazon SEO prioritizes the first 5 words heavily. Start with your Brand Name or primary keyword, capitalized.' });
        }

        // Check for keyword stuffing vs natural read
        if (titleLen > 100 && !l.title.includes(' - ') && !l.title.includes(' | ') && !l.title.includes(',')) {
            feedback.push({ area: 'title', type: 'tip', text: 'Tip: Use separators (| or - or ,) to make your title scannable. Example: "Brand Name | Product Type | Key Feature | Compatible with X"' });
        }

        // Mobile title preview
        const mobileTitle = l.title.substring(0, 115);
        const mobileTrail = titleLen > 115 ? '...' : '';
        feedback.push({ area: 'mobile', type: titleLen <= 115 ? 'win' : 'warning',
            text: 'Mobile search preview (Amazon.in app shows ~115 chars):',
            suggestion: '📱 "' + mobileTitle + mobileTrail + '"\n\n' + (titleLen > 115 ? 'The first 115 characters must contain your most important keywords and brand name — everything after gets cut off on mobile, where 70%+ of Amazon.in traffic comes from.' : 'Your full title is visible on mobile — good.')
        });

        // ---- KEYWORD DENSITY — check if key terms appear across title + bullets + backend ----
        const allText = (l.title + ' ' + l.bullets.join(' ')).toLowerCase();
        const backendText = l.backendKw.toLowerCase();
        const productKeywords = extractCategoryKeywords(l.title);

        const kwPresence = productKeywords.map(kw => {
            const inTitle = l.title.toLowerCase().includes(kw);
            const inBullets = l.bullets.some(b => b.toLowerCase().includes(kw));
            const inBackend = backendText.includes(kw);
            return { kw, inTitle, inBullets, inBackend, score: (inTitle ? 1 : 0) + (inBullets ? 1 : 0) + (inBackend ? 1 : 0) };
        });

        const missingEverywhere = kwPresence.filter(k => k.score === 0);
        const partialCoverage = kwPresence.filter(k => k.score === 1 || k.score === 2);
        const fullCoverage = kwPresence.filter(k => k.score === 3);

        if (productKeywords.length > 0) {
            let kwHtml = 'KEYWORD COVERAGE ACROSS YOUR LISTING:\n\n';
            kwPresence.forEach(k => {
                const t = k.inTitle ? '✅ Title' : '❌ Title';
                const b = k.inBullets ? '✅ Bullets' : '❌ Bullets';
                const bk = k.inBackend ? '✅ Backend' : '❌ Backend';
                kwHtml += '"' + k.kw + '"  →  ' + t + ' · ' + b + ' · ' + bk + '\n';
            });
            if (missingEverywhere.length > 0) {
                kwHtml += '\n⚠️ Keywords missing entirely: ' + missingEverywhere.map(k => k.kw).join(', ');
                kwHtml += '\nAdd these to your backend search terms at minimum.';
            }
            if (fullCoverage.length > 0) {
                kwHtml += '\n\n✅ Full coverage: ' + fullCoverage.map(k => k.kw).join(', ');
            }

            const kwScore = fullCoverage.length > partialCoverage.length ? 'win' : missingEverywhere.length > 2 ? 'fix' : 'tip';
            feedback.push({ area: 'seo', type: kwScore,
                text: 'Keyword density check — ' + fullCoverage.length + '/' + productKeywords.length + ' keywords appear in title + bullets + backend.',
                suggestion: kwHtml
            });
        }

        // ---- BULLET POINTS ANALYSIS ----
        const bulletCount = l.bullets.length;
        score += bulletCount * 5;

        if (bulletCount === 5) {
            feedback.push({ area: 'bullets', type: 'win', text: 'All 5 bullet points filled.' });
        } else if (bulletCount === 0) {
            feedback.push({ area: 'bullets', type: 'critical', text: 'No bullet points at all. This is the biggest missed opportunity — bullets are the #1 conversion driver after images.',
                suggestion: generateBulletSuggestions(l.title, 5) });
        } else {
            feedback.push({ area: 'bullets', type: 'fix', text: 'Only ' + bulletCount + '/5 bullet points used. You have ' + (5 - bulletCount) + ' empty slots — each one is free real estate for keywords and persuasion.',
                suggestion: generateBulletSuggestions(l.title, 5 - bulletCount) });
        }

        // Check bullet quality
        l.bullets.forEach((b, i) => {
            if (b.length < 50) {
                feedback.push({ area: 'bullets', type: 'fix', text: 'Bullet #' + (i + 1) + ' is too short (' + b.length + ' chars): "' + b + '"',
                    suggestion: 'Rewrite to 100-200 chars. Include a benefit + feature + keyword. Example: "' + expandBullet(b, l.title) + '"' });
            }
        });

        // ---- IMAGE ANALYSIS ----
        if (l.imageCount >= 7) { score += 25; feedback.push({ area: 'images', type: 'win', text: l.imageCount + ' images — excellent coverage.' }); }
        else if (l.imageCount >= 5) { score += 18; feedback.push({ area: 'images', type: 'warning', text: l.imageCount + ' images. Good start, but 7-9 images is the sweet spot on Amazon.in.',
            suggestion: generateImageChecklist(l.imageCount) }); }
        else if (l.imageCount >= 2) { score += 8; feedback.push({ area: 'images', type: 'fix', text: 'Only ' + l.imageCount + ' images. Listings with 7+ images see up to 30% higher conversion on Amazon.in.',
            suggestion: generateImageChecklist(l.imageCount) }); }
        else { score += 2; feedback.push({ area: 'images', type: 'critical', text: l.imageCount + ' image — this is critically low. Most shoppers won\'t buy without seeing the product from multiple angles.',
            suggestion: generateImageChecklist(l.imageCount) }); }

        // ---- BACKEND KEYWORDS ----
        const kwWords = l.backendKw ? l.backendKw.split(/[\s,]+/).filter(w => w.length > 0) : [];
        const kwLen = l.backendKw.length;

        if (kwLen >= 200) { score += 20; feedback.push({ area: 'keywords', type: 'win', text: 'Backend keywords well utilized (' + kwWords.length + ' terms, ' + kwLen + ' chars).' }); }
        else if (kwLen > 0) {
            score += Math.round(kwLen / 15);
            feedback.push({ area: 'keywords', type: 'fix', text: 'Backend keywords only ' + kwLen + '/249 bytes used (' + kwWords.length + ' terms). You have ' + (249 - kwLen) + ' bytes of free SEO left.',
                suggestion: generateKeywordSuggestions(l.title, l.backendKw) });
        } else {
            feedback.push({ area: 'keywords', type: 'critical', text: 'No backend keywords. Amazon gives you 249 bytes of hidden search terms — this is free ranking power you\'re not using.',
                suggestion: generateKeywordSuggestions(l.title, '') });
        }

        return { ...l, score, feedback };
    });

    const avgScore = Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length);
    const criticalCount = scored.filter(l => l.score < 40).length;
    const goodCount = scored.filter(l => l.score >= 75).length;

    let html = `
        <div class="results-header">
            <h2>Listing health check</h2>
            <div class="big-number">${avgScore}/100</div>
            <p class="results-meta">Average score across ${scored.length} products</p>
            <div class="results-meta">
                <span style="color:var(--green);">${goodCount} strong</span> ·
                <span>${scored.length - goodCount - criticalCount} needs tuning</span> ·
                <span style="color:#dc2626;">${criticalCount} need urgent fixes</span>
            </div>
        </div>
    `;

    // Quick wins summary
    const totalBulletsMissing = scored.reduce((s, l) => s + (5 - l.bullets.length), 0);
    const lowImageListings = scored.filter(l => l.imageCount < 5).length;
    const noBackendKw = scored.filter(l => l.backendKw.length === 0).length;
    const shortTitles = scored.filter(l => l.title.length < 80).length;

    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('qwins').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority high">Quick wins</span><span class="case-title">Highest-impact fixes — start here</span></div>
        <span class="case-amount">${totalBulletsMissing + lowImageListings + noBackendKw + shortTitles} fixes</span>
    </div><div class="case-body open" id="qwins">
        <div class="case-section"><h4>Do these today</h4><ol>
            ${shortTitles > 0 ? `<li><strong>${shortTitles} title(s) under 80 characters.</strong> Each missing character is a missed keyword opportunity. SEO-optimized rewrites provided below for each listing.</li>` : ''}
            ${totalBulletsMissing > 0 ? `<li><strong>${totalBulletsMissing} bullet point slots empty.</strong> Suggested bullet points provided below — copy, customize, and paste into Seller Central.</li>` : ''}
            ${lowImageListings > 0 ? `<li><strong>${lowImageListings} listing(s) under 5 images.</strong> Image checklists provided below — shoot these specific shots for each product.</li>` : ''}
            ${noBackendKw > 0 ? `<li><strong>${noBackendKw} listing(s) have zero backend keywords.</strong> Keyword suggestions provided below — paste directly into Seller Central search terms field.</li>` : ''}
        </ol></div>
    </div></div>`;

    // Per-listing detailed cards with AI suggestions
    scored.sort((a, b) => a.score - b.score);

    scored.forEach((l, i) => {
        const shortTitle = l.title.length > 55 ? l.title.substring(0, 52) + '...' : l.title;
        const priority = l.score < 40 ? 'high' : l.score < 70 ? 'medium' : 'low';
        const id = 'listing' + i;

        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('${id}').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority ${priority}">${l.score}/100</span><span class="case-title">${shortTitle}</span></div>
            <span class="case-amount">${l.asin}</span>
        </div><div class="case-body" id="${id}">`;

        // Scorecard bar
        html += `<div class="case-section"><h4>Score breakdown</h4>
            <p style="font-size:13px;color:var(--text-mid);">Title: ${l.title.length} chars · Bullets: ${l.bullets.length}/5 · Images: ${l.imageCount} · Backend keywords: ${l.backendKw ? l.backendKw.split(/[\s,]+/).length + ' terms' : 'None'} · Price: ₹${l.price || 'N/A'}</p>
        </div>`;

        // Group feedback by area
        const areas = ['title', 'mobile', 'seo', 'bullets', 'images', 'keywords'];
        const areaLabels = { title: 'Title optimization', mobile: 'Mobile preview', seo: 'Keyword coverage (SEO)', bullets: 'Bullet points', images: 'Product images', keywords: 'Backend search terms' };

        areas.forEach(area => {
            const items = l.feedback.filter(f => f.area === area);
            if (items.length === 0) return;

            html += `<div class="case-section"><h4>${areaLabels[area]}</h4>`;

            items.forEach(f => {
                const icon = f.type === 'win' ? '✅' : f.type === 'critical' ? '🔴' : f.type === 'fix' ? '🟡' : f.type === 'warning' ? '🟠' : '💡';
                html += `<div style="margin-bottom:12px;">
                    <p>${icon} ${f.text}</p>`;

                if (f.suggestion) {
                    html += `<div class="claim-template" style="margin-top:8px;font-size:13px;">${f.suggestion}</div>
                        <div class="claim-actions" style="margin-top:6px;">
                            <button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy suggestion</button>
                        </div>`;
                }
                html += `</div>`;
            });

            html += `</div>`;
        });

        html += `</div></div>`;
    });

    return html;
}

// ---- SEO SUGGESTION GENERATORS ----

function generateTitleSuggestion(currentTitle, mode) {
    const words = currentTitle.split(/\s+/);
    const productType = extractProductType(currentTitle);

    if (mode === 'rewrite' || mode === 'expand') {
        // Build an SEO-optimized title template
        const brand = words[0] && words[0][0] === words[0][0].toUpperCase() ? words[0] : '[Your Brand]';
        const features = extractFeatures(currentTitle);

        if (currentTitle.length < 30) {
            return `SUGGESTED TITLE (copy and customize):\n\n${brand} ${productType} ${features.join(' ')} | [Key Feature 1] | [Key Feature 2] | Compatible with [Devices] | [Color/Size]\n\nTips:\n• Lead with brand name + primary keyword\n• Add 2-3 features buyers search for (e.g., "wireless", "waterproof", "fast charging")\n• Include compatibility info (e.g., "for iPhone 15, Samsung Galaxy")\n• Add color/size/material at the end\n• Target: 150-200 characters total`;
        } else {
            const missing = suggestMissingKeywords(currentTitle);
            return `CURRENT (${currentTitle.length} chars):\n${currentTitle}\n\nSUGGESTED ADDITIONS:\nAdd these high-search keywords if relevant: ${missing.join(', ')}\n\nTip: Insert keywords naturally after your main product name. Use separators like | or - for readability.`;
        }
    }
    if (mode === 'shorten') {
        return `Your title is long (${currentTitle.length} chars). Amazon.in mobile shows ~115 chars.\n\nPut your most important keywords in the FIRST 115 characters:\n"${currentTitle.substring(0, 115)}..."\n\nMove less critical words (compatibility lists, materials) to bullet points or backend keywords instead.`;
    }
    return '';
}

function generateBulletSuggestions(title, count) {
    const productType = extractProductType(title);
    const templates = [
        `【Premium Quality】 [Describe material/build quality] — designed for everyday use with [durability feature]. ${productType} that lasts.`,
        `【Key Feature】 [Main selling point] with [specification] — perfect for [use case like work, travel, gym, home].`,
        `【Easy to Use】 [Setup/usage simplicity] — works with [compatible devices/platforms]. No complicated setup, just [plug in/pair/connect] and go.`,
        `【What's Included】 1x ${productType}, 1x [Accessory like USB cable/manual/pouch], 1x User Guide. [Warranty info like "12-month manufacturer warranty"].`,
        `【Perfect Gift】 Ideal for [occasions like birthdays, festivals, Diwali, office use]. Comes in [packaging detail]. Great for [audience like students, professionals, gamers].`
    ];

    let text = `SUGGESTED BULLET POINTS (copy and customize):\n\n`;
    for (let i = 0; i < Math.min(count, 5); i++) {
        text += `Bullet ${i + 1}:\n${templates[i]}\n\n`;
    }
    text += `TIPS:\n• Start each bullet with a benefit in【brackets】\n• Include 1-2 keywords per bullet naturally\n• 100-200 characters per bullet is ideal\n• Write for the buyer, not the search engine — but use keywords`;
    return text;
}

function expandBullet(shortBullet, title) {
    const productType = extractProductType(title);
    // Take the short bullet and suggest an expanded version
    return `${shortBullet} — designed for ${productType} with premium build quality. Perfect for daily use at home, office, or on the go. [Add specific measurements or specs here]`;
}

function generateImageChecklist(currentCount) {
    const needed = Math.max(7 - currentCount, 0);
    let text = `IMAGE CHECKLIST — you need ${needed} more images:\n\n`;
    const shots = [
        '1. MAIN IMAGE: Product on pure white background, fills 85% of frame, no text overlays',
        '2. LIFESTYLE: Product being used by a person in a real setting (home, office, outdoors)',
        '3. SCALE REFERENCE: Product next to a hand, phone, or ruler to show actual size',
        '4. FEATURE CALLOUT: Infographic highlighting 3-4 key features with text annotations',
        '5. WHAT\'S IN THE BOX: All included items laid out neatly on white background',
        '6. DETAIL CLOSE-UP: Zoom into the quality detail (stitching, buttons, ports, material)',
        '7. COMPARISON/USE CASES: Show 2-3 different ways to use the product',
        '8. BACK/SIDE VIEW: Different angle showing the full product from another perspective',
        '9. PACKAGING: Show the retail packaging (builds trust and gift-appeal)'
    ];
    shots.forEach((shot, i) => {
        const marker = i < currentCount ? '✅' : '📷';
        text += `${marker} ${shot}\n`;
    });
    text += `\nTips:\n• Minimum 1000x1000px, recommended 2000x2000px\n• Use natural lighting or professional lighting\n• A+ Content / Enhanced Brand Content images are separate — upload those too`;
    return text;
}

function generateKeywordSuggestions(title, existingKw) {
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const existing = existingKw.toLowerCase().split(/[\s,]+/);
    const productType = extractProductType(title).toLowerCase();

    // Generate synonyms and related terms
    const suggestions = [];
    const commonSynonyms = {
        'earbuds': ['earphone', 'headphone', 'headset', 'ear buds', 'ear phone', 'tws', 'in-ear', 'wireless earphone'],
        'earphone': ['earbuds', 'headphone', 'earbud', 'ear phone', 'headset'],
        'speaker': ['bluetooth speaker', 'portable speaker', 'wireless speaker', 'music player', 'sound box', 'boombox'],
        'watch': ['smartwatch', 'smart watch', 'fitness tracker', 'fitness band', 'health tracker', 'wrist watch'],
        'cable': ['charging cable', 'data cable', 'usb cable', 'charger cable', 'cord', 'wire', 'fast charger'],
        'stand': ['holder', 'mount', 'dock', 'cradle', 'desktop stand', 'mobile stand', 'phone holder'],
        'hub': ['adapter', 'dongle', 'dock', 'multiport', 'usb hub', 'type c adapter', 'docking station'],
        'mouse': ['wireless mouse', 'computer mouse', 'bluetooth mouse', 'optical mouse', 'ergonomic mouse']
    };

    // Find matching synonym group
    Object.keys(commonSynonyms).forEach(key => {
        if (productType.includes(key) || title.toLowerCase().includes(key)) {
            commonSynonyms[key].forEach(syn => {
                if (!existing.includes(syn) && !title.toLowerCase().includes(syn)) {
                    suggestions.push(syn);
                }
            });
        }
    });

    // Add Hindi transliterations
    const hindiTerms = {
        'earbuds': 'ईयरबड्स wireless earphone price',
        'speaker': 'स्पीकर bluetooth speaker price',
        'watch': 'स्मार्ट वॉच fitness band',
        'cable': 'चार्जिंग केबल fast charger',
        'stand': 'फोन स्टैंड mobile holder',
        'hub': 'यूएसबी हब laptop accessories',
        'mouse': 'माउस computer accessories'
    };

    Object.keys(hindiTerms).forEach(key => {
        if (productType.includes(key) || title.toLowerCase().includes(key)) {
            suggestions.push(hindiTerms[key]);
        }
    });

    // Add common buyer intent modifiers
    const modifiers = ['best', 'top', 'premium', 'budget', 'cheap', 'price', 'buy online', 'india', 'for men', 'for women', 'for students', 'gift', 'under 500', 'under 1000', 'under 2000'];
    modifiers.forEach(mod => {
        if (!existing.includes(mod) && !title.toLowerCase().includes(mod)) {
            suggestions.push(mod);
        }
    });

    let text = `SUGGESTED BACKEND KEYWORDS (copy and paste into Seller Central):\n\n`;
    text += suggestions.slice(0, 30).join(' ') + '\n\n';
    text += `RULES FOR BACKEND KEYWORDS:\n`;
    text += `• Maximum 249 bytes (roughly 249 characters in English)\n`;
    text += `• Don't repeat words already in your title\n`;
    text += `• Don't use commas or quotes — just space-separated words\n`;
    text += `• Include: misspellings, synonyms, Hindi terms, size/color variants\n`;
    text += `• Don't include: brand names, ASINs, "best", subjective claims`;
    return text;
}

function extractCategoryKeywords(title) {
    const lower = title.toLowerCase();
    const found = [];
    // Category-specific high-volume keywords for Amazon.in
    const categoryKw = {
        'earbuds': ['wireless', 'bluetooth', 'earbuds', 'noise cancelling', 'anc', 'tws', 'mic', 'bass', 'waterproof', 'ipx'],
        'earphone': ['wireless', 'bluetooth', 'earphone', 'noise cancelling', 'mic', 'bass', 'in-ear', 'neckband'],
        'headphone': ['wireless', 'bluetooth', 'headphone', 'noise cancelling', 'over-ear', 'mic', 'foldable'],
        'speaker': ['bluetooth', 'speaker', 'portable', 'wireless', 'waterproof', 'bass', 'led', 'outdoor'],
        'watch': ['smart watch', 'smartwatch', 'fitness', 'tracker', 'heart rate', 'bluetooth', 'waterproof', 'amoled'],
        'cable': ['fast charging', 'usb', 'type c', 'cable', 'data', 'braided', 'quick charge'],
        'stand': ['phone stand', 'holder', 'adjustable', 'desk', 'mount', 'foldable', 'compatible'],
        'hub': ['usb c', 'hub', 'adapter', 'hdmi', '4k', 'multiport', 'usb 3.0', 'card reader', 'pd', 'charging'],
        'mouse': ['wireless', 'mouse', 'bluetooth', 'ergonomic', 'silent', 'dpi', 'rechargeable', 'gaming']
    };
    for (const [cat, kws] of Object.entries(categoryKw)) {
        if (lower.includes(cat)) {
            kws.forEach(kw => { if (!found.includes(kw)) found.push(kw); });
            break;
        }
    }
    // Fallback: extract 2+ char words from title as potential keywords
    if (found.length === 0) {
        title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 6).forEach(w => found.push(w));
    }
    return found.slice(0, 10);
}

function extractProductType(title) {
    const common = ['earbuds', 'earphone', 'headphone', 'speaker', 'watch', 'band', 'cable', 'charger', 'stand', 'holder', 'hub', 'adapter', 'mouse', 'keyboard', 'case', 'cover', 'screen protector', 'tripod', 'light', 'lamp'];
    const lower = title.toLowerCase();
    for (const type of common) {
        if (lower.includes(type)) return type.charAt(0).toUpperCase() + type.slice(1);
    }
    // Fallback: use first 2-3 meaningful words
    return title.split(/\s+/).slice(0, 3).join(' ');
}

function extractFeatures(title) {
    const features = [];
    const patterns = [/\b(bluetooth\s*\d\.?\d?)\b/i, /\b(wireless)\b/i, /\b(usb[\s-]?c)\b/i, /\b(fast\s*charg\w*)\b/i, /\b(waterproof|ipx\d)\b/i, /\b(noise\s*cancel\w*|anc)\b/i, /\b(\d+\s*w)\b/i, /\b(\d+\s*mah)\b/i, /\b(\d+\s*mm)\b/i];
    patterns.forEach(p => {
        const m = title.match(p);
        if (m) features.push(m[1]);
    });
    return features;
}

function suggestMissingKeywords(title) {
    const lower = title.toLowerCase();
    const suggestions = [];
    const maybeRelevant = ['india', 'compatible', 'warranty', 'latest', 'new', 'portable', 'lightweight', 'premium', 'professional'];
    maybeRelevant.forEach(kw => {
        if (!lower.includes(kw)) suggestions.push(kw);
    });
    return suggestions.slice(0, 5);
}

function analyzeListingsSample() {
    let html = `
        <div class="results-header">
            <h2>Listing health check</h2>
            <div class="big-number">72/100</div>
            <p class="results-meta">Overall listing health score</p>
            <p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample analysis — upload your Active Listings Report for real results</p>
        </div>
    `;

    const checks = [
        { title: 'Title optimization', score: '7/10', priority: 'medium',
            description: 'Titles average 112 characters. Amazon recommends 150-200 for best visibility. Place primary keywords early.',
            action: 'Add 2-3 relevant keywords to each title. Put the most important keyword in the first 80 characters.' },
        { title: 'Bullet points', score: '6/10', priority: 'high',
            description: 'Most listings have 3-4 bullets. Amazon allows 5, and using all 5 improves SEO and conversion.',
            action: 'Add a 5th bullet to all listings. Focus on benefits, not just features. Include keywords naturally.' },
        { title: 'Image count', score: '8/10', priority: 'low',
            description: 'Average 5.2 images per listing. Good — but some have fewer than 4, which hurts conversion.',
            action: 'Ensure 6+ images per listing: lifestyle shots, size reference, infographics, and feature callouts.' },
        { title: 'Backend keywords', score: '5/10', priority: 'high',
            description: 'Backend search terms appear underutilized. Missing long-tail keywords customers search for.',
            action: 'Update backend keywords for each ASIN. Include misspellings, synonyms, and Hindi transliterations.' }
    ];

    checks.forEach(c => {
        html += `<div class="case-card"><div class="case-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority ${c.priority}">${c.priority}</span><span class="case-title">${c.title}</span></div>
            <span class="case-amount">${c.score}</span>
        </div><div class="case-body">
            <div class="case-section"><h4>Status</h4><p>${c.description}</p></div>
            <div class="case-section"><h4>Action</h4><p>${c.action}</p></div>
        </div></div>`;
    });
    return html;
}

// ============================================
// CLAIM TEMPLATES
// ============================================

function buildClaimTemplate(type, data) {
    const templates = {
        fee: `Subject: Fee Category Verification Request

Dear Amazon Seller Support,

I am writing to request a review of the fee category applied to ASIN ${data.asin}.

Based on our records, the current fee applied is ${data.currentFee} per unit. However, the product dimensions and weight suggest it should fall under a fee tier of ${data.expectedFee} per unit.

This affects ${data.units} units, with a total potential difference of ${data.amount}.

Could you please verify the fee classification and advise if an adjustment is warranted?

Thank you for your assistance.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        inventory: `Subject: Inventory Reconciliation Request

Dear Amazon Seller Support,

I am writing to request a reconciliation review for the following discrepancy:

FNSKU: ${data.fnsku}
Discrepancy: ${data.qty} unit(s) — ${data.event}

Our records indicate these units were received but are no longer accounted for in available, reserved, or unfulfillable inventory.

Could you please investigate and advise on next steps?

Thank you.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        removal: `Subject: Removal Order Verification Request

Dear Amazon Seller Support,

I would like to request verification of the following removal order:

Removal Order ID: ${data.orderId}
Units affected: ${data.units}
Fee charged: ${data.fee}

The order is marked as completed but we have not received confirmation of the actual shipment. Could you please provide tracking details or confirm the status?

If the removal was not completed, we would appreciate a review of the associated fees.

Thank you.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        return: `Subject: Return Verification Request

Dear Amazon Seller Support,

I am writing regarding Order ID: ${data.orderId} (ASIN: ${data.asin}).

A refund was issued for this order, but the return window has passed and the item does not appear to have been received back into our FBA inventory.

Could you please verify whether the item was returned? If not, we would appreciate guidance on the reimbursement process per the FBA Customer Returns Policy.

Thank you.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`
    };
    return templates[type] || '';
}

// ============================================
// CASE CARD BUILDER
// ============================================

function buildCaseCard(c, num) {
    const id = 'case' + num;
    return `
        <div class="case-card">
            <div class="case-header" onclick="document.getElementById('${id}').classList.toggle('open')">
                <div class="case-header-left">
                    <span class="case-priority ${c.priority}">${c.priority}</span>
                    <span class="case-title">Case #${num}: ${c.type}</span>
                </div>
                <span class="case-amount">₹${c.amount.toLocaleString('en-IN')}</span>
            </div>
            <div class="case-body" id="${id}">
                <div class="case-section"><h4>What we found</h4><p>${c.description}</p></div>
                <div class="case-section"><h4>Supporting details</h4><p>${c.proof}</p></div>
                <div class="case-section"><h4>Steps to take</h4><ol>${c.steps.map(s => '<li>' + s + '</li>').join('')}</ol></div>
                <div class="case-section">
                    <h4>Communication template</h4>
                    <div class="claim-template">${c.template}</div>
                    <div class="claim-actions">
                        <button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy template</button>
                        <a class="btn-link" href="https://sellercentral.amazon.in/cu/contact-us" target="_blank" rel="noopener" onclick="event.stopPropagation()">Open Seller Support</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// UTILITIES
// ============================================

function copyTemplate(btn) {
    const template = btn.closest('.case-section').querySelector('.claim-template');
    if (!template) return;
    navigator.clipboard.writeText(template.textContent).then(() => {
        showToast('Copied to clipboard!');
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = 'Copy template', 2000);
    }).catch(() => {
        const range = document.createRange();
        range.selectNodeContents(template);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        showToast('Copied!');
    });
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function downloadReport() {
    // Build a rich text report by extracting content from all sections
    const serviceNames = { reimbursement: 'Reimbursement Detection', ppc: 'PPC & Keyword Cleanup', reports: 'Business Reports Analysis', listing: 'Listing Health Check' };
    let report = `VIKREYA — ${serviceNames[selectedService] || 'Analysis'} Report\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Files analyzed: ${uploadedFiles.map(f => f.name).join(', ')}\n`;
    report += `${'='.repeat(60)}\n\n`;

    // Extract summary from results header
    const header = document.querySelector('.results-header');
    if (header) {
        const bigNum = header.querySelector('.big-number');
        const title = header.querySelector('h2');
        if (title) report += `${title.textContent}\n`;
        if (bigNum) report += `${bigNum.textContent}\n`;
        header.querySelectorAll('.results-meta').forEach(m => { report += `${m.textContent.trim()}\n`; });
        report += '\n';
    }

    // Extract each case card's full content (expand all)
    document.querySelectorAll('.case-card').forEach((card, idx) => {
        report += `${'─'.repeat(50)}\n`;

        const cardHeader = card.querySelector('.case-header');
        const titleEl = card.querySelector('.case-title');
        const amountEl = card.querySelector('.case-amount');
        const priorityEl = card.querySelector('.case-priority');

        if (titleEl) report += `${priorityEl ? '[' + priorityEl.textContent.toUpperCase() + '] ' : ''}${titleEl.textContent}`;
        if (amountEl) report += `  —  ${amountEl.textContent}`;
        report += '\n\n';

        // Get ALL body content regardless of open/closed state
        const body = card.querySelector('.case-body');
        if (body) {
            body.querySelectorAll('.case-section').forEach(section => {
                const h4 = section.querySelector('h4');
                if (h4) report += `  ${h4.textContent.toUpperCase()}\n`;

                section.querySelectorAll('p').forEach(p => {
                    const text = p.textContent.trim();
                    if (text) report += `  ${text}\n`;
                });

                section.querySelectorAll('ol li, ul li').forEach((li, i) => {
                    report += `  ${i + 1}. ${li.textContent.trim()}\n`;
                });

                // Include claim templates / suggestion boxes
                section.querySelectorAll('.claim-template').forEach(tmpl => {
                    report += `\n  --- COPY FROM HERE ---\n`;
                    report += tmpl.textContent.trim().split('\n').map(line => `  ${line}`).join('\n');
                    report += `\n  --- END ---\n`;
                });

                report += '\n';
            });

            // Catch any inline content not in .case-section
            body.querySelectorAll('div[style]').forEach(div => {
                const strong = div.querySelector('strong');
                const spans = div.querySelectorAll('span');
                if (strong && spans.length > 0) {
                    let line = strong.textContent;
                    spans.forEach(s => { if (s.textContent.trim()) line += '  ' + s.textContent.trim(); });
                    report += `  • ${line}\n`;
                }
            });
        }
        report += '\n';
    });

    report += `${'='.repeat(60)}\n`;
    report += `Report generated by Vikreya (vikreya.vercel.app)\n`;
    report += `Questions? Email vikreya.tool@gmail.com\n`;

    const blob = new Blob([report], { type: 'text/plain; charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vikreya-${selectedService}-report-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Full report downloaded!');
}

// ============================================
// ANALYTICS
// ============================================

const ANALYTICS_KEY = 'vikreya_analytics';

function trackEvent(eventName, data) {
    try {
        const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
        events.push({ event: eventName, data: data || {}, time: new Date().toISOString() });
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
    } catch(e) {}
    // Also push to GA if available
    if (typeof gtag === 'function') {
        gtag('event', eventName, { event_category: 'engagement', event_label: typeof data === 'string' ? data : JSON.stringify(data || {}) });
    }
}

trackEvent('page_view');

// Track key actions
const _showApp = showApp;
showApp = function() { trackEvent('cta_clicked'); _showApp(); };

const _selectService = selectService;
selectService = function(s) { trackEvent('service_selected', s); _selectService(s); };

const _analyzeFiles = analyzeFiles;
analyzeFiles = function() {
    trackEvent('analysis_started', { service: selectedService, files: uploadedFiles.length });
    _analyzeFiles();
    setTimeout(() => { const fw = document.getElementById('feedbackWidget'); if (fw) fw.style.display = 'block'; }, 2500);
};

window.vikreyaStats = function() {
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    const summary = {};
    events.forEach(e => { summary[e.event] = (summary[e.event] || 0) + 1; });
    console.log('=== VIKREYA ANALYTICS ===');
    console.table(summary);
    return { total: events.length, summary, events };
};

// ============================================
// FEEDBACK
// ============================================

let feedbackRating = 0;
let feedbackTags = [];

function setRating(n) {
    feedbackRating = n;
    document.querySelectorAll('.star-btn').forEach((s, i) => s.classList.toggle('active', i < n));
    const labels = ['', 'Not useful', 'Needs work', 'Decent', 'Good!', 'Excellent!'];
    const rl = document.getElementById('ratingLabel');
    if (rl) rl.textContent = labels[n] || '';
    const btn = document.getElementById('feedbackSubmitBtn');
    if (btn) btn.disabled = false;
}

function toggleTag(btn) {
    btn.classList.toggle('selected');
    const tag = btn.textContent;
    if (feedbackTags.includes(tag)) feedbackTags = feedbackTags.filter(t => t !== tag);
    else feedbackTags.push(tag);
}

function submitFeedback() {
    const text = (document.getElementById('feedbackText') || {}).value || '';
    const email = (document.getElementById('feedbackEmail') || {}).value || '';
    const data = { rating: feedbackRating, tags: feedbackTags, text: text.trim(), email: email.trim(), service: selectedService, files: uploadedFiles.length };

    trackEvent('feedback_submitted', data);
    const all = JSON.parse(localStorage.getItem('vikreya_feedback') || '[]');
    all.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem('vikreya_feedback', JSON.stringify(all));

    const card = document.querySelector('.feedback-card');
    if (card) card.innerHTML = `<div class="feedback-done"><h3>Thank you!</h3><p>Your feedback shapes what we build next.</p></div>`;
    showToast('Feedback saved!');
}

// ============================================
// EMAIL COLLECTION
// ============================================

function submitEmail() {
    const input = document.getElementById('emailInput');
    if (!input) return;
    const email = input.value.trim();
    if (!email || !email.includes('@')) { input.style.borderColor = '#dc2626'; return; }

    const emails = JSON.parse(localStorage.getItem('vikreya_emails') || '[]');
    if (!emails.includes(email)) { emails.push(email); localStorage.setItem('vikreya_emails', JSON.stringify(emails)); }

    const form = document.getElementById('emailForm');
    const success = document.getElementById('emailSuccess');
    if (form) form.style.display = 'none';
    if (success) success.style.display = 'block';
    trackEvent('email_collected');
    showToast("You're on the list!");
}

// ============================================
// DATA EXPORT
// ============================================

window.exportVikreyaData = function() {
    const emails = JSON.parse(localStorage.getItem('vikreya_emails') || '[]');
    const feedback = JSON.parse(localStorage.getItem('vikreya_feedback') || '[]');
    const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    console.log('=== VIKREYA DATA EXPORT ===');
    console.log('Emails:', emails.length); emails.forEach(e => console.log('  ', e));
    console.log('Feedback:', feedback.length);
    feedback.forEach(f => console.log(`  ${f.rating}/5 | ${f.tags.join(', ')} | ${f.text || '-'} | ${f.email || '-'}`));
    return { emails, feedback, analytics };
};
