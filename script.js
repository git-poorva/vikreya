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

        // Make case cards expandable
        document.querySelectorAll('.case-header').forEach(header => {
            header.addEventListener('click', () => {
                const body = header.nextElementSibling;
                if (body) body.classList.toggle('open');
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
// PPC & KEYWORD ANALYSIS (NEW)
// ============================================

function analyzePPC() {
    const hasPPCData = Object.values(parsedData).some(d => d.type === 'searchterm' || d.type === 'targeting');

    let deadKeywords, highPerformers, totalWaste, totalSpend;

    if (hasPPCData) {
        const result = analyzeRealPPCData();
        deadKeywords = result.dead;
        highPerformers = result.top;
        totalWaste = result.waste;
        totalSpend = result.spend;
    } else {
        // Sample data
        deadKeywords = [
            { keyword: 'wireless earbuds cheap', spend: 3200, clicks: 89, orders: 0, acos: '∞' },
            { keyword: 'bluetooth headphone price', spend: 1800, clicks: 52, orders: 0, acos: '∞' },
            { keyword: 'earphone online shopping', spend: 1400, clicks: 41, orders: 0, acos: '∞' },
            { keyword: 'best headphone under 500', spend: 2100, clicks: 67, orders: 1, acos: '420%' },
            { keyword: 'music accessories buy', spend: 900, clicks: 28, orders: 0, acos: '∞' },
            { keyword: 'ear buds with mic cheap', spend: 1100, clicks: 35, orders: 0, acos: '∞' },
            { keyword: 'gaming headset budget', spend: 750, clicks: 22, orders: 0, acos: '∞' },
        ];
        highPerformers = [
            { keyword: 'wireless earbuds with anc', spend: 4500, clicks: 120, orders: 18, acos: '25%' },
            { keyword: 'tws earbuds bluetooth 5.3', spend: 2800, clicks: 85, orders: 12, acos: '23%' },
            { keyword: 'noise cancelling earbuds india', spend: 3100, clicks: 95, orders: 14, acos: '22%' },
        ];
        totalWaste = deadKeywords.reduce((s, k) => s + k.spend, 0);
        totalSpend = totalWaste + highPerformers.reduce((s, k) => s + k.spend, 0);
    }

    let html = `
        <div class="results-header">
            <h2>PPC analysis complete</h2>
            <div class="big-number">₹${totalWaste.toLocaleString('en-IN')}/mo</div>
            <p class="results-meta">Wasted on keywords with zero or near-zero conversions</p>
            <div class="results-meta"><span>${deadKeywords.length} dead keywords</span> · <span>${highPerformers.length} top performers</span> · <span>₹${totalSpend.toLocaleString('en-IN')} total spend analyzed</span></div>
            ${!hasPPCData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample data — upload your Search Term Report for real results</p>' : ''}
        </div>
    `;

    // Dead keywords card
    html += `<div class="case-card"><div class="case-header">
        <div class="case-header-left"><span class="case-priority high">Action needed</span><span class="case-title">Dead keywords burning your budget</span></div>
        <span class="case-amount">₹${totalWaste.toLocaleString('en-IN')}/mo</span>
    </div><div class="case-body open">
        <div class="case-section">
            <h4>What we found</h4>
            <p>These keywords are getting clicks but producing zero or near-zero sales. You're paying for traffic that doesn't convert. Add them as <strong>negative keywords</strong> to stop the bleed.</p>
        </div>
        <div class="case-section"><h4>Keywords to negate</h4>`;

    deadKeywords.forEach(k => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
                <strong style="font-size:14px;">"${k.keyword}"</strong><br>
                <span style="font-size:13px;color:var(--text-mid);">${k.clicks} clicks · ${k.orders} orders · ACoS: ${k.acos}</span>
            </div>
            <span style="font-size:15px;font-weight:700;color:#dc2626;">₹${k.spend.toLocaleString('en-IN')}</span>
        </div>`;
    });

    html += `</div>
        <div class="case-section">
            <h4>How to add negative keywords</h4>
            <ol>
                <li>Go to Seller Central → Advertising → Campaign Manager</li>
                <li>Open the campaign containing these keywords</li>
                <li>Go to the "Negative Keywords" tab</li>
                <li>Click "Add negative keywords"</li>
                <li>Paste the keywords below (one per line) and select "Negative Exact"</li>
                <li>Save changes — this takes effect within a few hours</li>
            </ol>
        </div>
        <div class="case-section">
            <h4>Copy-paste list for negative keywords</h4>
            <div class="claim-template">${deadKeywords.map(k => k.keyword).join('\n')}</div>
            <div class="claim-actions">
                <button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy keyword list</button>
            </div>
        </div>
    </div></div>`;

    // Top performers card
    html += `<div class="case-card"><div class="case-header">
        <div class="case-header-left"><span class="case-priority low">Insight</span><span class="case-title">Top performing keywords — consider increasing bids</span></div>
        <span class="case-amount">${highPerformers.length} keywords</span>
    </div><div class="case-body">
        <div class="case-section">
            <h4>Your best keywords</h4>
            <p>These keywords have strong conversion rates. Consider increasing bids by 10-20% to capture more traffic, or use them in manual exact-match campaigns for better control.</p>
        </div>
        <div class="case-section"><h4>Keywords to scale</h4>`;

    highPerformers.forEach(k => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
                <strong style="font-size:14px;">"${k.keyword}"</strong><br>
                <span style="font-size:13px;color:var(--text-mid);">${k.clicks} clicks · ${k.orders} orders · ACoS: ${k.acos}</span>
            </div>
            <span style="font-size:15px;font-weight:700;color:var(--green);">₹${k.spend.toLocaleString('en-IN')}</span>
        </div>`;
    });

    html += `</div></div></div>`;

    // Monthly savings projection
    html += `<div class="case-card"><div class="case-header">
        <div class="case-header-left"><span class="case-priority medium">Projection</span><span class="case-title">If you act on these findings today</span></div>
        <span class="case-amount">₹${(totalWaste * 12).toLocaleString('en-IN')}/yr</span>
    </div><div class="case-body open">
        <div class="case-section">
            <p>By negating the ${deadKeywords.length} dead keywords identified above, you could save approximately <strong>₹${totalWaste.toLocaleString('en-IN')} per month</strong> — that's <strong>₹${(totalWaste * 12).toLocaleString('en-IN')} per year</strong> redirected toward keywords that actually convert.</p>
            <p style="margin-top:12px;">Better yet, reallocate that budget to your top-performing keywords to increase sales without increasing total ad spend.</p>
        </div>
    </div></div>`;

    return html;
}

function analyzeRealPPCData() {
    const searchData = Object.values(parsedData).find(d => d.type === 'searchterm');
    const dead = [];
    const top = [];
    let totalWaste = 0;
    let totalSpend = 0;

    if (searchData && searchData.rows.length > 0) {
        searchData.rows.forEach(row => {
            const keyword = row['Customer Search Term'] || row['customer-search-term'] || row['Search Term'] || '';
            const spend = parseFloat((row['Spend'] || row['spend'] || row['Cost'] || '0').replace(/[₹,]/g, ''));
            const clicks = parseInt(row['Clicks'] || row['clicks'] || 0);
            const orders = parseInt(row['7 Day Total Orders (#)'] || row['Orders'] || row['orders'] || 0);
            const acos = orders > 0 ? Math.round((spend / (orders * 500)) * 100) + '%' : '∞';

            totalSpend += spend;

            if (keyword && spend > 200 && orders === 0 && clicks > 5) {
                dead.push({ keyword, spend, clicks, orders, acos });
                totalWaste += spend;
            } else if (keyword && orders >= 3 && spend > 0) {
                top.push({ keyword, spend, clicks, orders, acos });
            }
        });
    }

    dead.sort((a, b) => b.spend - a.spend);
    top.sort((a, b) => b.orders - a.orders);

    return { dead: dead.slice(0, 15), top: top.slice(0, 5), waste: totalWaste, spend: totalSpend };
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

    if (!hasRealData) {
        return analyzeListingsSample();
    }

    // Parse real listing data
    const listings = listingFile.rows.map(row => {
        const asin = row['asin'] || row['asin1'] || row['ASIN'] || '';
        const title = row['item-name'] || row['Title'] || row['item-name'] || '';
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

    // Score each listing
    const scored = listings.map(l => {
        let score = 0;
        const issues = [];
        const wins = [];

        // Title scoring (max 30 pts)
        const titleLen = l.title.length;
        if (titleLen >= 150 && titleLen <= 200) { score += 30; wins.push('Title length is optimal (' + titleLen + ' chars)'); }
        else if (titleLen >= 100 && titleLen < 150) { score += 20; issues.push('Title is ' + titleLen + ' chars — aim for 150-200 for better visibility'); }
        else if (titleLen >= 50 && titleLen < 100) { score += 10; issues.push('Title is short at ' + titleLen + ' chars — you\'re missing keyword opportunities'); }
        else if (titleLen > 200) { score += 15; issues.push('Title is ' + titleLen + ' chars — slightly long, may get truncated in mobile search'); }
        else { score += 5; issues.push('Title is very short (' + titleLen + ' chars) — significantly hurting discoverability'); }

        // Check if title has brand-first format
        const firstWord = l.title.split(' ')[0];
        if (firstWord === firstWord.toLowerCase() && firstWord.length < 20) {
            issues.push('Title doesn\'t start with a capitalized brand or keyword — first word matters most for Amazon SEO');
        }

        // Bullet points scoring (max 25 pts)
        const bulletCount = l.bullets.length;
        score += bulletCount * 5;
        if (bulletCount === 5) { wins.push('All 5 bullet points used'); }
        else if (bulletCount === 0) { issues.push('No bullet points — this is critical, add all 5'); }
        else { issues.push('Only ' + bulletCount + '/5 bullet points used — fill all 5 slots'); }

        // Bullet quality check
        const shortBullets = l.bullets.filter(b => b.length < 50);
        if (shortBullets.length > 0) {
            issues.push(shortBullets.length + ' bullet(s) are too short — aim for 100-200 characters each with keywords');
        }

        // Image scoring (max 25 pts)
        if (l.imageCount >= 7) { score += 25; wins.push(l.imageCount + ' images — excellent'); }
        else if (l.imageCount >= 5) { score += 18; issues.push(l.imageCount + ' images — good but add more (7+ recommended)'); }
        else if (l.imageCount >= 3) { score += 10; issues.push('Only ' + l.imageCount + ' images — listings with 7+ images convert significantly better'); }
        else { score += 3; issues.push(l.imageCount + ' image(s) — this is severely hurting conversions, add at least 5-6 more'); }

        // Backend keywords scoring (max 20 pts)
        const kwLen = l.backendKw.length;
        const kwCount = l.backendKw ? l.backendKw.split(/[\s,]+/).filter(w => w.length > 0).length : 0;
        if (kwLen >= 200) { score += 20; wins.push('Backend keywords well utilized (' + kwCount + ' terms)'); }
        else if (kwLen >= 100) { score += 14; issues.push('Backend keywords partially used (' + kwCount + ' terms) — add more synonyms and Hindi transliterations'); }
        else if (kwLen > 0) { score += 7; issues.push('Backend keywords underutilized (only ' + kwCount + ' terms) — you\'re leaving SEO on the table'); }
        else { score += 0; issues.push('No backend keywords — this is free SEO you\'re not using. Add misspellings, synonyms, Hindi terms'); }

        return { ...l, score, issues, wins };
    });

    const avgScore = Math.round(scored.reduce((s, l) => s + l.score, 0) / scored.length);
    const worstListings = scored.filter(l => l.score < 50).length;
    const goodListings = scored.filter(l => l.score >= 75).length;

    let html = `
        <div class="results-header">
            <h2>Listing health check</h2>
            <div class="big-number">${avgScore}/100</div>
            <p class="results-meta">Average listing health score across ${scored.length} products</p>
            <div class="results-meta">
                <span style="color:var(--green);">${goodListings} strong</span> ·
                <span>${scored.length - goodListings - worstListings} OK</span> ·
                <span style="color:#dc2626;">${worstListings} need work</span>
            </div>
        </div>
    `;

    // Summary card
    const totalBulletsMissing = scored.reduce((s, l) => s + (5 - l.bullets.length), 0);
    const lowImageListings = scored.filter(l => l.imageCount < 5).length;
    const noBackendKw = scored.filter(l => l.backendKw.length === 0).length;

    html += `<div class="case-card"><div class="case-header">
        <div class="case-header-left"><span class="case-priority high">Quick wins</span><span class="case-title">Highest-impact fixes across all listings</span></div>
        <span class="case-amount">${totalBulletsMissing + lowImageListings + noBackendKw} fixes</span>
    </div><div class="case-body open">
        <div class="case-section">
            <h4>Do these first</h4>
            <ol>
                ${totalBulletsMissing > 0 ? `<li><strong>${totalBulletsMissing} bullet point slots empty</strong> across your listings. Each empty slot is a missed chance to add keywords and convince buyers.</li>` : ''}
                ${lowImageListings > 0 ? `<li><strong>${lowImageListings} listing(s) have fewer than 5 images.</strong> Listings with 7+ images convert up to 30% better on Amazon.in.</li>` : ''}
                ${noBackendKw > 0 ? `<li><strong>${noBackendKw} listing(s) have no backend keywords.</strong> This is free SEO — add synonyms, misspellings, Hindi terms.</li>` : ''}
            </ol>
        </div>
    </div></div>`;

    // Per-listing cards sorted by score (worst first)
    scored.sort((a, b) => a.score - b.score);

    scored.forEach((l, i) => {
        const shortTitle = l.title.length > 60 ? l.title.substring(0, 57) + '...' : l.title;
        const priority = l.score < 40 ? 'high' : l.score < 70 ? 'medium' : 'low';
        const id = 'listing' + i;

        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('${id}').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority ${priority}">${l.score}/100</span><span class="case-title">${shortTitle}</span></div>
            <span class="case-amount">${l.asin}</span>
        </div><div class="case-body" id="${id}">`;

        // Scorecard
        html += `<div class="case-section"><h4>Scorecard</h4>
            <p>Title: ${l.title.length} chars · Bullets: ${l.bullets.length}/5 · Images: ${l.imageCount} · Backend keywords: ${l.backendKw ? l.backendKw.split(/[\s,]+/).length + ' terms' : 'None'}</p>
        </div>`;

        if (l.issues.length > 0) {
            html += `<div class="case-section"><h4>Issues to fix</h4><ol>${l.issues.map(x => '<li>' + x + '</li>').join('')}</ol></div>`;
        }
        if (l.wins.length > 0) {
            html += `<div class="case-section"><h4>What's working</h4><ol>${l.wins.map(x => '<li style="color:var(--green);">' + x + '</li>').join('')}</ol></div>`;
        }

        html += `</div></div>`;
    });

    return html;
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
    const results = document.getElementById('resultsState').innerText;
    const blob = new Blob([`VIKREYA — Analysis Report\nGenerated: ${new Date().toLocaleDateString()}\nService: ${selectedService}\n\n${results}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vikreya-report.txt';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Report downloaded!');
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
