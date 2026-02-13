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
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('deadKw').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority high">Action needed</span><span class="case-title">Dead keywords burning your budget</span></div>
        <span class="case-amount">₹${totalWaste.toLocaleString('en-IN')}/mo</span>
    </div><div class="case-body open" id="deadKw">
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
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('topKw').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority low">Insight</span><span class="case-title">Top performing keywords — consider increasing bids</span></div>
        <span class="case-amount">${highPerformers.length} keywords</span>
    </div><div class="case-body" id="topKw">
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
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('projKw').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority medium">Projection</span><span class="case-title">If you act on these findings today</span></div>
        <span class="case-amount">₹${(totalWaste * 12).toLocaleString('en-IN')}/yr</span>
    </div><div class="case-body open" id="projKw">
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
        const areas = ['title', 'bullets', 'images', 'keywords'];
        const areaLabels = { title: 'Title optimization', bullets: 'Bullet points', images: 'Product images', keywords: 'Backend search terms' };

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
