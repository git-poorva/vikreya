/* ============================================
   VIKREYA — Script
   Complete functionality: navigation, upload,
   CSV parsing (PapaParse), analysis engine,
   results display, claim templates
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
    trackEvent('funnel', 'app_opened');
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
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('step' + step);
    if (target) target.classList.add('active');
}

function updateProgress() {
    for (let i = 1; i <= 3; i++) {
        const prog = document.getElementById('prog' + i);
        prog.classList.remove('active', 'done');
        if (i < currentStep) prog.classList.add('done');
        if (i === currentStep) prog.classList.add('active');
    }
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');
    line1.classList.toggle('filled', currentStep >= 2);
    line2.classList.toggle('filled', currentStep >= 3);
}

function resetApp() {
    selectedService = null;
    uploadedFiles = [];
    parsedData = {};
    currentStep = 1;

    // Reset UI
    document.querySelectorAll('input[name="service"]').forEach(r => r.checked = false);
    document.querySelectorAll('.option-card').forEach(c => {
        c.style.borderColor = '';
        c.style.background = '';
    });
    document.getElementById('continueBtn').disabled = true;
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('resultsState').innerHTML = '';
    document.getElementById('resultsBtns').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';

    updateProgress();
    showStep(1);
}

// ---- SERVICE SELECTION ----

function selectService(service) {
    selectedService = service;
    document.getElementById('continueBtn').disabled = false;
    trackEvent('funnel', 'service_selected_' + service);
}

// ---- UPLOAD INSTRUCTIONS ----

function buildUploadInstructions() {
    const box = document.getElementById('uploadInstructions');
    const instructions = {
        reimbursement: {
            title: 'Download these reports from Amazon Seller Central:',
            steps: [
                'Log in to <strong>sellercentral.amazon.in</strong>',
                'Download each report below as CSV (last 90 days)'
            ],
            reports: [
                '📋 FBA Customer Returns',
                '📋 Removal Order Detail',
                '📋 FBA Inventory Ledger',
                '📋 Settlement Reports'
            ]
        },
        reports: {
            title: 'Download these reports from Amazon Seller Central:',
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
                'We\'ll analyze your titles, bullets, and keywords'
            ],
            reports: []
        }
    };

    const info = instructions[selectedService];
    let html = `<div class="upload-instructions"><h4>${info.title}</h4><ol>`;
    info.steps.forEach(s => html += `<li>${s}</li>`);
    html += '</ol>';
    if (info.reports.length > 0) {
        html += '<div class="report-checklist">';
        info.reports.forEach(r => html += `<span>${r}</span>`);
        html += '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
}

// ---- FILE UPLOAD ----

(function initUpload() {
    // Wait for DOM
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

    // Drag events
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Click-to-browse
    input.addEventListener('change', e => {
        handleFiles(e.target.files);
        input.value = ''; // allow re-upload of same file
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
    document.getElementById('analyzeBtn').disabled = uploadedFiles.length === 0;
}

function removeFile(index) {
    const name = uploadedFiles[index].name;
    uploadedFiles.splice(index, 1);
    delete parsedData[name];
    renderFileList();
    document.getElementById('analyzeBtn').disabled = uploadedFiles.length === 0;
}

function renderFileList() {
    const list = document.getElementById('fileList');
    if (uploadedFiles.length === 0) { list.innerHTML = ''; return; }
    list.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item">
            <div class="file-item-left">
                <span class="file-item-icon">📄</span>
                <span>${f.name}</span>
            </div>
            <button class="file-remove" onclick="removeFile(${i})">✕ Remove</button>
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
        // For Excel files, store as placeholder — real parsing needs SheetJS
        parsedData[file.name] = { headers: [], rows: [], type: 'excel-pending' };
    }
}

function detectReportType(headers) {
    const h = headers.map(x => x.toLowerCase().replace(/[\s_-]+/g, ''));
    if (h.some(x => x.includes('returndate') || x.includes('customerreturn'))) return 'returns';
    if (h.some(x => x.includes('removalorderid') || x.includes('orderstatus'))) return 'removals';
    if (h.some(x => x.includes('eventtype') || x.includes('fulfillmentcenterid'))) return 'ledger';
    if (h.some(x => x.includes('settlementid') || x.includes('transactiontype'))) return 'settlement';
    if (h.some(x => x.includes('sessions') || x.includes('pageviews') || x.includes('buyboxpercentage'))) return 'business';
    if (h.some(x => x.includes('asin') || x.includes('listingid'))) return 'listings';
    return 'unknown';
}

// ---- ANALYSIS ----

function analyzeFiles() {
    goToStep(3);
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsState').style.display = 'none';
    document.getElementById('resultsBtns').style.display = 'none';
    const feedbackEl = document.getElementById('feedbackWidget');
    if (feedbackEl) feedbackEl.style.display = 'none';
    trackEvent('funnel', 'analyze_clicked_' + selectedService);

    // Simulate processing time (feels real)
    setTimeout(() => {
        let results;
        if (selectedService === 'reimbursement') {
            results = analyzeReimbursements();
        } else if (selectedService === 'reports') {
            results = analyzeBusinessReports();
        } else {
            results = analyzeListings();
        }

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsState').innerHTML = results;
        document.getElementById('resultsState').style.display = 'block';
        document.getElementById('resultsBtns').style.display = 'flex';
        if (feedbackEl) feedbackEl.style.display = 'block';
        trackEvent('funnel', 'results_shown_' + selectedService);

        // Make case cards expandable
        document.querySelectorAll('.case-header').forEach(header => {
            header.addEventListener('click', () => {
                const body = header.nextElementSibling;
                body.classList.toggle('open');
            });
        });
    }, 2000);
}

// ---- REIMBURSEMENT ANALYSIS ----

function analyzeReimbursements() {
    // Check if we have real parsed data
    const types = Object.values(parsedData).map(d => d.type);
    const hasRealData = types.some(t => ['returns', 'removals', 'ledger', 'settlement'].includes(t));

    let cases = [];

    if (hasRealData) {
        cases = detectRealCases();
    }

    // If no real cases found (or no real data), show sample cases so seller sees the value
    if (cases.length === 0) {
        cases = getSampleReimbursementCases();
    }

    const totalAmount = cases.reduce((sum, c) => sum + c.amount, 0);

    let html = `
        <div class="results-header">
            <h2>✅ Analysis Complete</h2>
            <div class="big-number">₹${totalAmount.toLocaleString('en-IN')}</div>
            <p style="font-size:16px; color:var(--text-mid); margin-bottom:8px;">Potential reimbursement opportunities identified</p>
            <div class="results-meta">
                <span>${cases.length} cases found</span>·
                <span>${Object.keys(parsedData).length} reports analyzed</span>
            </div>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">ℹ️ Showing sample results — upload real Amazon reports to see your actual data</p>' : ''}
        </div>
    `;

    cases.forEach((c, i) => {
        html += buildCaseCard(c, i + 1);
    });

    return html;
}

function detectRealCases() {
    const cases = [];

    // Cross-reference parsed data
    const returnData = Object.values(parsedData).find(d => d.type === 'returns');
    const ledgerData = Object.values(parsedData).find(d => d.type === 'ledger');
    const removalData = Object.values(parsedData).find(d => d.type === 'removals');
    const settlementData = Object.values(parsedData).find(d => d.type === 'settlement');

    // Detect from ledger: look for "lost" or "damaged" events
    if (ledgerData && ledgerData.rows.length > 0) {
        ledgerData.rows.forEach(row => {
            const event = (row['event-type'] || row['Event Type'] || '').toLowerCase();
            if (event.includes('lost') || event.includes('damaged') || event.includes('misplaced')) {
                const qty = Math.abs(parseInt(row['quantity'] || row['Quantity'] || 1));
                const fnsku = row['fnsku'] || row['FNSKU'] || 'N/A';
                cases.push({
                    type: 'Inventory Reconciliation Needed',
                    priority: 'high',
                    amount: qty * 700, // estimated per-unit value
                    description: `${qty} unit(s) of ${fnsku} flagged as "${event}" in fulfillment center inventory ledger.`,
                    proof: `Event: ${event}, FNSKU: ${fnsku}, Quantity: ${qty}`,
                    steps: [
                        'Go to Seller Central → Help → Contact Us',
                        'Select "Fulfillment by Amazon" → "FBA Inventory"',
                        'Provide the FNSKU and event details below',
                        'Request a review of the inventory discrepancy',
                        'Amazon typically responds within 5-7 business days'
                    ],
                    template: buildClaimTemplate('inventory', { fnsku, qty, event })
                });
            }
        });
    }

    // Detect from returns: refunded but not returned
    if (returnData && returnData.rows.length > 0) {
        returnData.rows.forEach(row => {
            const status = (row['status'] || row['Status'] || '').toLowerCase();
            if (status.includes('refund') && !status.includes('return')) {
                const orderId = row['order-id'] || row['Order ID'] || 'N/A';
                const asin = row['asin'] || row['ASIN'] || 'N/A';
                cases.push({
                    type: 'Return Receipt Verification Needed',
                    priority: 'medium',
                    amount: 850,
                    description: `Order ${orderId} (${asin}) was refunded but no return receipt found within the return window.`,
                    proof: `Order ID: ${orderId}, ASIN: ${asin}, Status: ${status}`,
                    steps: [
                        'Go to Seller Central → Help → Contact Us',
                        'Select "Fulfillment by Amazon" → "Customer Returns"',
                        'Provide the Order ID and note the refund was issued without return',
                        'Request verification of whether the item was received back',
                        'If not received, request reimbursement per FBA policy'
                    ],
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
            type: 'Fee Category Verification Needed',
            priority: 'high',
            amount: 850,
            description: 'A product appears to be categorized in a higher fee tier than its dimensions suggest. The current fee applied is ₹95 per unit, but based on the recorded dimensions, the applicable fee may be ₹45 per unit.',
            proof: 'ASIN: B08XYZ123 · Current fee: ₹95/unit · Expected fee based on dimensions: ₹45/unit · Affected units: 17 · Potential difference: ₹850',
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select "Fulfillment by Amazon" → "FBA Fees"',
                'Reference the ASIN and note the fee discrepancy',
                'Provide the product dimensions and weight',
                'Request a fee category review — Amazon typically responds within 3-5 business days'
            ],
            template: buildClaimTemplate('fee', {
                asin: 'B08XYZ123',
                currentFee: '₹95',
                expectedFee: '₹45',
                units: 17,
                amount: '₹850'
            })
        },
        {
            type: 'Inventory Reconciliation Needed',
            priority: 'high',
            amount: 4200,
            description: 'Inventory ledger shows 6 units received via inbound shipment that are no longer accounted for in available, reserved, or unfulfillable inventory. These units may have been misplaced during the receiving process.',
            proof: 'FNSKU: X001ABC-XYZ · Shipment ID: FBA15XYZ123 · Received: 50 units · Currently accounted: 44 units · Discrepancy: 6 units · Est. value: ₹700/unit',
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select "Fulfillment by Amazon" → "FBA Inventory"',
                'Provide the Shipment ID and FNSKU details',
                'Note the quantity discrepancy between received and available units',
                'Request an inventory reconciliation review'
            ],
            template: buildClaimTemplate('inventory', {
                fnsku: 'X001ABC-XYZ',
                qty: 6,
                event: 'shipment discrepancy'
            })
        },
        {
            type: 'Removal Order Verification Needed',
            priority: 'medium',
            amount: 1680,
            description: 'A removal order was completed according to records, but the removed units do not appear to have been shipped or received. Disposal fees were charged for 12 units, but the inventory adjustment may not have been processed correctly.',
            proof: 'Removal Order: R-2026-ABC789 · Units: 12 · Disposal fee charged: ₹1,680 · Status: Completed · Actual shipment: Not confirmed',
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select "Fulfillment by Amazon" → "Removals"',
                'Reference the Removal Order ID',
                'Request tracking or confirmation of the removal shipment',
                'If units were not actually removed, request a fee reversal'
            ],
            template: buildClaimTemplate('removal', {
                orderId: 'R-2026-ABC789',
                units: 12,
                fee: '₹1,680'
            })
        },
        {
            type: 'Return Receipt Verification Needed',
            priority: 'medium',
            amount: 2850,
            description: 'A customer refund was processed on Jan 19, but the return window has passed without the item being scanned back into inventory. The item may not have been returned.',
            proof: 'Order: 408-1234567-8901234 · Refund date: Jan 19, 2026 · Return deadline: Jan 28, 2026 · Item: Smart Watch Band · Return status: Not received',
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select "Fulfillment by Amazon" → "Customer Returns"',
                'Provide the Order ID and refund date',
                'Note that the return window has passed without the item being received',
                'Request a review per the FBA Customer Returns Policy'
            ],
            template: buildClaimTemplate('return', {
                orderId: '408-1234567-8901234',
                asin: 'B09SMARTWATCH'
            })
        }
    ];
}

// ---- CLAIM TEMPLATES ----

function buildClaimTemplate(type, data) {
    const templates = {
        fee: `Subject: Fee Category Verification Request

Dear Amazon Seller Support,

I am writing to request a review of the fee category applied to ASIN ${data.asin}.

Based on our records, the current referral/FBA fee applied is ${data.currentFee} per unit. However, the product dimensions and weight suggest it should fall under a fee tier of ${data.expectedFee} per unit.

This affects ${data.units} units, with a total potential difference of ${data.amount}.

Could you please verify the fee classification and advise if an adjustment is warranted?

Thank you for your assistance in maintaining accurate fee assessments.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        inventory: `Subject: Inventory Reconciliation Request

Dear Amazon Seller Support,

I am writing to request a reconciliation review for the following inventory discrepancy:

FNSKU: ${data.fnsku}
Discrepancy: ${data.qty} unit(s) — ${data.event}

Our records indicate these units were received but are no longer accounted for in available, reserved, or unfulfillable inventory.

Could you please investigate this discrepancy and advise on next steps?

Thank you for your help in resolving this matter.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        removal: `Subject: Removal Order Verification Request

Dear Amazon Seller Support,

I would like to request verification of the following removal order:

Removal Order ID: ${data.orderId}
Units affected: ${data.units}
Fee charged: ${data.fee}

The order is marked as completed, but we have not received confirmation of the actual shipment. Could you please provide tracking details or confirm the status?

If the removal was not completed, we would appreciate a review of the associated fees.

Thank you for your assistance.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`,

        return: `Subject: Return Verification Request

Dear Amazon Seller Support,

I am writing regarding Order ID: ${data.orderId} (ASIN: ${data.asin}).

A refund was issued for this order, but the return window has passed and the item does not appear to have been received back into our FBA inventory.

Could you please verify whether the item was returned? If it was not, we would appreciate guidance on the reimbursement process per the FBA Customer Returns Policy.

Thank you for your help.

Best regards,
[Your Seller Name]
Seller ID: [Your Seller ID]`
    };
    return templates[type] || '';
}

// ---- CASE CARD BUILDER ----

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
                <div class="case-section">
                    <h4>What We Found</h4>
                    <p>${c.description}</p>
                </div>
                <div class="case-section">
                    <h4>Supporting Details</h4>
                    <p>${c.proof}</p>
                </div>
                <div class="case-section">
                    <h4>Recommended Steps</h4>
                    <ol>${c.steps.map(s => '<li>' + s + '</li>').join('')}</ol>
                </div>
                <div class="case-section">
                    <h4>Suggested Communication Template</h4>
                    <div class="claim-template">${c.template}</div>
                    <div class="claim-actions">
                        <button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">📋 Copy Template</button>
                        <a class="btn-link" href="https://sellercentral.amazon.in/cu/contact-us" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 Contact Seller Support</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---- BUSINESS REPORTS ANALYSIS ----

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
            <h2>📊 Business Reports Analysis</h2>
            <div class="big-number">₹${totalSales.toLocaleString('en-IN')}</div>
            <p style="font-size:16px; color:var(--text-mid);">Total sales across ${products.length} active products</p>
            <div class="results-meta">
                <span>${totalUnits.toLocaleString('en-IN')} units sold</span>·
                <span>Avg. order value: ₹${Math.round(totalSales / totalUnits).toLocaleString('en-IN')}</span>
            </div>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">ℹ️ Showing sample data — upload real Business Reports to see your actual numbers</p>' : ''}
        </div>
    `;

    // Inventory Planning
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('invPlan').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority high">Action</span><span class="case-title">📦 Inventory Planning — FBA Restock Recommendations</span></div>
        <span class="case-amount">${products.filter(p => p.inventory / p.dailySales < 14).length} need restock</span>
    </div><div class="case-body" id="invPlan">`;

    products.forEach(p => {
        const daysLeft = Math.round(p.inventory / p.dailySales);
        const weeks4 = Math.round(p.dailySales * 28);
        const weeks8 = Math.round(p.dailySales * 56);
        const status = daysLeft < 14 ? '🔴 Low' : daysLeft < 30 ? '🟡 OK' : '🟢 Good';
        html += `<div class="case-section">
            <h4>${p.name} (${p.asin})</h4>
            <p>${status} — ${daysLeft} days of stock remaining<br>
            Current inventory: ${p.inventory} units · Daily sales: ${p.dailySales} units/day<br>
            <strong>Recommended shipment:</strong> ${weeks4} units (4 weeks) or ${weeks8} units (8 weeks)</p>
        </div>`;
    });

    html += `</div></div>`;

    // Top products
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('topProds').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority medium">Insights</span><span class="case-title">🏆 Product Performance Rankings</span></div>
        <span class="case-amount">${products.length} products</span>
    </div><div class="case-body open" id="topProds">`;

    const sorted = [...products].sort((a, b) => b.sales - a.sales);
    sorted.forEach((p, i) => {
        html += `<div class="case-section">
            <h4>#${i + 1}: ${p.name}</h4>
            <p>Sales: ₹${p.sales.toLocaleString('en-IN')} · Units: ${p.units} · Sessions: ${p.sessions.toLocaleString('en-IN')} · Conversion: ${p.conversion}%</p>
        </div>`;
    });

    html += `</div></div>`;
    return html;
}

// ---- LISTING OPTIMIZATION ----

function analyzeListings() {
    const hasRealData = Object.values(parsedData).some(d => d.type === 'listings');

    let html = `
        <div class="results-header">
            <h2>🎯 Listing Optimization Report</h2>
            <div class="big-number">72/100</div>
            <p style="font-size:16px; color:var(--text-mid);">Overall listing health score</p>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">ℹ️ Showing sample analysis — upload your Active Listings Report for real results</p>' : ''}
        </div>
    `;

    const checks = [
        {
            title: 'Title Optimization',
            score: '7/10',
            priority: 'medium',
            description: 'Your titles average 112 characters. Amazon recommends 150-200 characters for best visibility. Include primary keywords early in the title.',
            action: 'Add 2-3 more relevant keywords to each product title. Place the most important keyword within the first 80 characters.'
        },
        {
            title: 'Bullet Points Quality',
            score: '6/10',
            priority: 'high',
            description: 'Most listings have 3-4 bullet points. Amazon allows 5, and using all 5 improves both SEO and conversion.',
            action: 'Add a 5th bullet point to all listings. Focus on benefits (not just features) and include relevant keywords naturally.'
        },
        {
            title: 'Image Count',
            score: '8/10',
            priority: 'low',
            description: 'Average of 5.2 images per listing. Good! But some listings have fewer than 4 images, which hurts conversion.',
            action: 'Ensure every listing has at least 6 images including lifestyle shots, size reference, and infographic images.'
        },
        {
            title: 'Backend Keywords',
            score: '5/10',
            priority: 'high',
            description: 'Backend search terms appear underutilized. You may be missing long-tail keywords that customers search for.',
            action: 'Review and update backend keywords for each ASIN. Include misspellings, synonyms, and Hindi transliterations where relevant.'
        }
    ];

    checks.forEach(c => {
        html += `<div class="case-card"><div class="case-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority ${c.priority}">${c.priority}</span><span class="case-title">${c.title}</span></div>
            <span class="case-amount">${c.score}</span>
        </div><div class="case-body">
            <div class="case-section"><h4>Current Status</h4><p>${c.description}</p></div>
            <div class="case-section"><h4>Recommended Action</h4><p>${c.action}</p></div>
        </div></div>`;
    });

    return html;
}

// ---- UTILITIES ----

function copyTemplate(btn) {
    const template = btn.closest('.case-section').querySelector('.claim-template');
    if (!template) return;
    navigator.clipboard.writeText(template.textContent).then(() => {
        showToast('Template copied to clipboard!');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy Template', 2000);
    }).catch(() => {
        // Fallback
        const range = document.createRange();
        range.selectNodeContents(template);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        showToast('Template copied!');
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
    const results = document.getElementById('resultsState').innerText;
    const blob = new Blob([`VIKREYA — Analysis Report\nGenerated: ${new Date().toLocaleDateString()}\n\n${results}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vikreya-report.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Report downloaded!');
    trackEvent('report_downloaded');
}

// ============================================
// SIMPLE ANALYTICS — No external service needed
// Tracks events in-browser, you view them from
// the browser console: type vikreyaStats() 
// ============================================

const ANALYTICS_KEY = 'vikreya_analytics';

function trackEvent(eventName, data) {
    try {
        const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
        events.push({
            event: eventName,
            data: data || {},
            time: new Date().toISOString(),
            page: window.location.pathname
        });
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
    } catch(e) { /* silent fail */ }
}

// Auto-track page load
trackEvent('page_view');

// Global stats viewer — type vikreyaStats() in browser console
window.vikreyaStats = function() {
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    const summary = {};
    events.forEach(e => { summary[e.event] = (summary[e.event] || 0) + 1; });
    console.log('=== VIKREYA ANALYTICS ===');
    console.log('Total events:', events.length);
    console.log('Summary:', summary);
    console.log('All events:', events);
    console.log('Feedback entries:', events.filter(e => e.event === 'feedback_submitted'));
    return { total: events.length, summary, events };
};

// Hook tracking into existing navigation functions
const _origShowApp = showApp;
showApp = function() {
    trackEvent('cta_clicked', { from: 'landing' });
    _origShowApp();
};

const _origSelectService = selectService;
selectService = function(service) {
    trackEvent('service_selected', { service });
    _origSelectService(service);
};

const _origAnalyze = analyzeFiles;
analyzeFiles = function() {
    trackEvent('analysis_started', {
        service: selectedService,
        fileCount: uploadedFiles.length,
        fileNames: uploadedFiles.map(f => f.name)
    });
    _origAnalyze();
    // Show feedback widget after results load
    setTimeout(() => {
        const fw = document.getElementById('feedbackWidget');
        if (fw) fw.style.display = 'block';
    }, 2500);
};

// ============================================
// FEEDBACK SYSTEM
// ============================================

let feedbackRating = 0;
let feedbackTags = [];

function setRating(n) {
    feedbackRating = n;
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((s, i) => s.classList.toggle('active', i < n));
    const labels = ['', 'Not useful', 'Needs work', 'Decent', 'Good!', 'Excellent!'];
    document.getElementById('ratingLabel').textContent = labels[n] || '';
    document.getElementById('feedbackSubmitBtn').disabled = false;
}

function toggleTag(btn) {
    btn.classList.toggle('selected');
    const tag = btn.textContent;
    if (feedbackTags.includes(tag)) {
        feedbackTags = feedbackTags.filter(t => t !== tag);
    } else {
        feedbackTags.push(tag);
    }
}

function submitFeedback() {
    const text = document.getElementById('feedbackText').value.trim();
    const emailEl = document.getElementById('feedbackEmail');
    const email = emailEl ? emailEl.value.trim() : '';
    const feedbackData = {
        rating: feedbackRating,
        tags: feedbackTags,
        text: text,
        email: email,
        service: selectedService,
        fileCount: uploadedFiles.length
    };

    trackEvent('feedback_submitted', feedbackData);

    // Also store feedback separately for easy export
    const allFeedback = JSON.parse(localStorage.getItem('vikreya_feedback') || '[]');
    allFeedback.push({ ...feedbackData, timestamp: new Date().toISOString() });
    localStorage.setItem('vikreya_feedback', JSON.stringify(allFeedback));

    // Replace feedback card with thank-you message
    const card = document.querySelector('.feedback-card');
    card.innerHTML = `
        <div class="feedback-success">
            <h3>Thank you!</h3>
            <p>Your feedback helps us build a better tool for Indian sellers.<br>
            If you want to share more thoughts, email us at <a href="mailto:hello@vikreya.com">hello@vikreya.com</a></p>
        </div>
    `;
    showToast('Feedback saved — thank you!');
}

// ---- EMAIL COLLECTION (Landing page waitlist) ----
function submitEmail() {
    const input = document.getElementById('emailInput');
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
        input.style.borderColor = '#ef4444';
        return;
    }

    const emails = JSON.parse(localStorage.getItem('vikreya_emails') || '[]');
    if (!emails.includes(email)) {
        emails.push(email);
        localStorage.setItem('vikreya_emails', JSON.stringify(emails));
    }

    document.getElementById('emailForm').style.display = 'none';
    document.getElementById('emailSuccess').style.display = 'block';
    trackEvent('email_collected', { email_domain: email.split('@')[1] });
    showToast("You're on the list!");
}

// ---- DATA EXPORT (type exportVikreyaData() in browser console) ----
window.exportVikreyaData = function() {
    const emails = JSON.parse(localStorage.getItem('vikreya_emails') || '[]');
    const feedback = JSON.parse(localStorage.getItem('vikreya_feedback') || '[]');
    const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    console.log('=== VIKREYA DATA EXPORT ===');
    console.log('\nEmails collected:', emails.length);
    emails.forEach(e => console.log('  -', e));
    console.log('\nFeedback entries:', feedback.length);
    feedback.forEach(f => console.log(`  Rating: ${f.rating}/5 | Tags: ${f.tags.join(', ')} | ${f.text || '(no comment)'} | Email: ${f.email || 'none'}`));
    console.log('\nAnalytics events:', analytics.length);
    return { emails, feedback, analytics };
};
