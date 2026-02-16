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
let analysisResults = null; // Store structured analysis results for export

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
        feeaudit: {
            title: 'Download your settlement report from Seller Central:',
            steps: [
                'Log in to <strong>sellercentral.amazon.in</strong>',
                'Go to <strong>Reports → Payments → All Statements</strong>',
                'Click <strong>Download</strong> on the latest settlement period (CSV/TXT)',
                'This report contains every fee Amazon charged per order'
            ],
            reports: ['Settlement Report (V2 flat file)']
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

    // ---- WRONG FILE DETECTION ----
    const fileTypes = Object.values(parsedData).map(d => d.type);
    const expectedTypes = {
        reimbursement: ['ledger', 'returns', 'removals', 'settlement'],
        feeaudit: ['settlement'],
        ppc: ['searchterm', 'targeting'],
        reports: ['business'],
        listing: ['listings']
    };
    const expected = expectedTypes[selectedService] || [];
    const hasMatchingFile = fileTypes.some(t => expected.includes(t));

    if (!hasMatchingFile && uploadedFiles.length > 0) {
        const resultsDiv = document.getElementById('resultsState');
        const resultsBtns = document.getElementById('resultsBtns');
        const loadingDiv = document.getElementById('loadingState');
        if (loadingDiv) loadingDiv.style.display = 'none';

        const friendlyService = { reimbursement: 'Reimbursement Detection', feeaudit: 'FBA Fee Audit', ppc: 'PPC Growth Report', reports: 'Business Reports', listing: 'Listing Health Check' }[selectedService];
        const friendlyExpected = { reimbursement: 'FBA Inventory Ledger, Returns, or Settlement report', feeaudit: 'Settlement Report (Reports → Payments → All Statements → Download)', ppc: 'Search Term Report (Advertising → Campaign Manager → download Search Term Report)', reports: 'Business Report (Reports → Business Reports → Detail Page Sales and Traffic)', listing: 'Active Listings Report (Inventory → Inventory Reports → Active Listings)' }[selectedService];
        const detectedType = fileTypes.filter(t => t !== 'unknown' && t !== 'excel-pending');
        const detectedLabel = detectedType.length > 0 ? detectedType.join(', ') : 'unrecognized format';

        const alertHtml = `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:24px;margin-bottom:24px;">
            <div style="display:flex;align-items:start;gap:12px;">
                <span style="font-size:28px;line-height:1;">⚠️</span>
                <div>
                    <h3 style="color:#dc2626;margin:0 0 8px 0;font-size:17px;">Wrong report uploaded</h3>
                    <p style="margin:0 0 8px 0;color:#991b1b;font-size:15px;">You selected <strong>${friendlyService}</strong>, but the file you uploaded doesn't match.</p>
                    <p style="margin:0 0 8px 0;color:#991b1b;font-size:15px;">We detected: <strong>${detectedLabel}</strong></p>
                    <p style="margin:0 0 16px 0;color:#991b1b;font-size:15px;">You need: <strong>${friendlyExpected}</strong></p>
                    <div style="background:#fff;border-radius:8px;padding:14px 16px;border:1px solid #fecaca;">
                        <p style="margin:0;font-size:13px;color:#7f1d1d;">📋 Showing sample results below so you can preview the analysis. Upload the correct report to see your real data.</p>
                    </div>
                </div>
            </div>
        </div>`;

        setTimeout(() => {
            let results;
            if (selectedService === 'reimbursement') results = analyzeReimbursements();
            else if (selectedService === 'feeaudit') results = analyzeFeeAudit();
            else if (selectedService === 'ppc') results = analyzePPC();
            else if (selectedService === 'reports') results = analyzeBusinessReports();
            else results = analyzeListings();

            resultsDiv.innerHTML = alertHtml + results;
            resultsDiv.style.display = 'block';
            resultsBtns.style.display = 'flex';
            const fw = document.getElementById('feedbackWidget');
            if (fw) fw.style.display = 'block';
            addChevrons();
        }, 800);
        return;
    }

    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsState').style.display = 'none';
    document.getElementById('resultsBtns').style.display = 'none';
    const fw = document.getElementById('feedbackWidget');
    if (fw) fw.style.display = 'none';

    setTimeout(() => {
        let results;
        if (selectedService === 'reimbursement') results = analyzeReimbursements();
        else if (selectedService === 'feeaudit') results = analyzeFeeAudit();
        else if (selectedService === 'ppc') results = analyzePPC();
        else if (selectedService === 'reports') results = analyzeBusinessReports();
        else results = analyzeListings();

        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsState').innerHTML = results;
        document.getElementById('resultsState').style.display = 'block';
        document.getElementById('resultsBtns').style.display = 'flex';
        if (fw) fw.style.display = 'block';
        addChevrons();
    }, 1200);
}

function addChevrons() {
    document.querySelectorAll('.case-header').forEach(header => {
        if (!header.querySelector('.case-chevron')) {
            const chevron = document.createElement('span');
            chevron.className = 'case-chevron';
            chevron.textContent = '▾';
            header.appendChild(chevron);
        }
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            const chev = header.querySelector('.case-chevron');
            if (body && chev) {
                setTimeout(() => { chev.textContent = body.classList.contains('open') ? '▾' : '▸'; }, 10);
            }
        });
    });
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
// FBA FEE AUDIT ENGINE
// Cross-references settlement data to find
// overcharges on weight handling, referral,
// closing fees. India-specific fee schedules.
// ============================================

function analyzeFeeAudit() {
    // Try to parse real settlement data
    const settlementData = Object.values(parsedData).find(d => d.type === 'settlement');
    const hasRealData = !!settlementData;
    const rows = hasRealData ? feeAuditParseReal(settlementData) : feeAuditSampleData();

    // Aggregate by SKU
    const skuMap = {};
    rows.forEach(r => {
        if (!skuMap[r.sku]) skuMap[r.sku] = { sku: r.sku, asin: r.asin || '', orders: 0, totalFees: 0, totalRefFee: 0, totalWHFee: 0, totalCloseFee: 0, totalShipFee: 0, totalOther: 0, sales: 0, issues: [] };
        const s = skuMap[r.sku];
        s.orders++;
        s.sales += r.principal || 0;
        s.totalRefFee += Math.abs(r.referralFee || 0);
        s.totalWHFee += Math.abs(r.weightHandling || 0);
        s.totalCloseFee += Math.abs(r.closingFee || 0);
        s.totalShipFee += Math.abs(r.shippingFee || 0);
        s.totalOther += Math.abs(r.otherFee || 0);
        s.totalFees += Math.abs(r.referralFee || 0) + Math.abs(r.weightHandling || 0) + Math.abs(r.closingFee || 0) + Math.abs(r.shippingFee || 0) + Math.abs(r.otherFee || 0);
    });

    const skus = Object.values(skuMap).sort((a, b) => b.totalFees - a.totalFees);

    // --- ANALYSIS: Flag issues per SKU ---
    let totalOvercharge = 0;
    let overchargeCount = 0;
    let highRefFeeCount = 0;
    let unknownFeeCount = 0;
    let totalUnknownFees = 0;

    skus.forEach(s => {
        if (s.orders === 0) return;
        const avgPrice = s.sales / s.orders;
        const avgRefFee = s.totalRefFee / s.orders;
        const avgWHFee = s.totalWHFee / s.orders;
        const avgCloseFee = s.totalCloseFee / s.orders;
        const feePercent = s.sales > 0 ? (s.totalFees / s.sales * 100) : 0;

        // Referral fee check (Amazon.in standard: 2-27% depending on category, most are 6-15%)
        const refPercent = s.sales > 0 ? (s.totalRefFee / s.sales * 100) : 0;
        if (refPercent > 20) {
            s.issues.push({ type: 'HIGH_REFERRAL', severity: 'critical', msg: `Referral fee is ${refPercent.toFixed(1)}% of sales (₹${avgRefFee.toFixed(0)}/order). Most categories are 6-15%. Check if your product is miscategorized.`, savings: Math.round(s.totalRefFee * 0.3) });
            highRefFeeCount++;
            totalOvercharge += Math.round(s.totalRefFee * 0.3);
        }

        // Weight handling fee check — Amazon.in FBA standard:
        // Local: ₹29 (first 500g), ₹13/500g after. National: ₹55 (first 500g), ₹23/500g after.
        // If avg weight handling > ₹120/order, likely overweight measurement
        if (avgWHFee > 120) {
            const expectedFee = 55 + (23 * 2); // assume ~1.5kg standard product national
            const overchargePerOrder = avgWHFee - expectedFee;
            if (overchargePerOrder > 20) {
                const totalOver = Math.round(overchargePerOrder * s.orders);
                s.issues.push({ type: 'WEIGHT_OVERCHARGE', severity: 'critical', msg: `Avg weight handling fee: ₹${avgWHFee.toFixed(0)}/order. Expected for standard 1.5kg item: ~₹${expectedFee}. Possible overcharge: ₹${overchargePerOrder.toFixed(0)}/order.`, savings: totalOver });
                overchargeCount++;
                totalOvercharge += totalOver;
            }
        }

        // Closing fee anomaly — Amazon.in: ₹4-93 depending on price & fulfillment
        if (avgCloseFee > 75) {
            s.issues.push({ type: 'HIGH_CLOSING', severity: 'warning', msg: `Avg closing fee: ₹${avgCloseFee.toFixed(0)}/order. Standard closing fees are ₹4-75. Check if self-ship fees are being applied to FBA orders.`, savings: Math.round((avgCloseFee - 50) * s.orders) });
            totalOvercharge += Math.round((avgCloseFee - 50) * s.orders);
        }

        // Unexplained "Other" fees
        if (s.totalOther > 50) {
            s.issues.push({ type: 'UNKNOWN_FEE', severity: 'warning', msg: `₹${s.totalOther.toFixed(0)} in unexplained "Other" charges across ${s.orders} orders. Request fee breakdown from Seller Support.`, savings: Math.round(s.totalOther * 0.5) });
            unknownFeeCount++;
            totalUnknownFees += s.totalOther;
            totalOvercharge += Math.round(s.totalOther * 0.5);
        }

        // Overall fee ratio check
        if (feePercent > 40 && s.issues.length === 0) {
            s.issues.push({ type: 'HIGH_FEE_RATIO', severity: 'info', msg: `Total fees are ${feePercent.toFixed(1)}% of sales. Anything above 35-40% suggests margin risk. Review if product is viable at this fee level.`, savings: 0 });
        }
    });

    const issueSkus = skus.filter(s => s.issues.length > 0);
    const cleanSkus = skus.filter(s => s.issues.length === 0);
    const totalFees = skus.reduce((sum, s) => sum + s.totalFees, 0);
    const totalSales = skus.reduce((sum, s) => sum + s.sales, 0);
    const avgFeePercent = totalSales > 0 ? (totalFees / totalSales * 100) : 0;

    // --- BUILD HTML ---
    let html = `<div class="results-header">
        <h2>FBA fee audit report</h2>
        ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample data — upload your Settlement Report for real numbers</p>' : ''}
    </div>`;

    // CARD 1: OVERVIEW
    html += `<div class="result-card" style="border-left:4px solid ${totalOvercharge > 0 ? '#dc2626' : '#22c55e'};">
        <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="card-header-left">
                <span class="card-icon">💰</span>
                <div>
                    <h3 style="margin:0;">Fee audit summary</h3>
                    <span class="priority-badge ${totalOvercharge > 0 ? 'badge-critical' : 'badge-healthy'}">${totalOvercharge > 0 ? 'Issues found' : 'Looks clean'}</span>
                </div>
            </div>
            <span class="chevron">▾</span>
        </div>
        <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:20px;">
                <div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;">
                    <div style="font-size:26px;font-weight:700;color:var(--gold);">₹${totalOvercharge.toLocaleString('en-IN')}</div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">Potential overcharges</div>
                </div>
                <div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;">
                    <div style="font-size:26px;font-weight:700;color:var(--text);">${skus.length}</div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">SKUs analyzed</div>
                </div>
                <div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;">
                    <div style="font-size:26px;font-weight:700;color:${avgFeePercent > 35 ? '#ef4444' : '#22c55e'};">${avgFeePercent.toFixed(1)}%</div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">Avg fee-to-sales ratio</div>
                </div>
                <div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;">
                    <div style="font-size:26px;font-weight:700;color:var(--text);">${issueSkus.length}</div>
                    <div style="font-size:12px;color:#999;margin-top:4px;">SKUs with issues</div>
                </div>
            </div>
            <p style="font-size:14px;color:#bbb;">Total fees charged: ₹${totalFees.toLocaleString('en-IN')} on ₹${totalSales.toLocaleString('en-IN')} in sales across ${rows.length} transactions.</p>
        </div>
    </div>`;

    // CARD 2: WEIGHT HANDLING OVERCHARGES
    const weightIssues = issueSkus.filter(s => s.issues.some(i => i.type === 'WEIGHT_OVERCHARGE'));
    if (weightIssues.length > 0) {
        const weightSavings = weightIssues.reduce((sum, s) => sum + s.issues.filter(i => i.type === 'WEIGHT_OVERCHARGE').reduce((a, i) => a + i.savings, 0), 0);
        html += `<div class="result-card" style="border-left:4px solid #dc2626;">
            <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="card-header-left">
                    <span class="card-icon">⚖️</span>
                    <div>
                        <h3 style="margin:0;">Weight handling overcharges</h3>
                        <span class="priority-badge badge-critical">${weightIssues.length} SKU${weightIssues.length > 1 ? 's' : ''} · ~₹${weightSavings.toLocaleString('en-IN')} recoverable</span>
                    </div>
                </div>
                <span class="chevron">▾</span>
            </div>
            <div class="card-body">
                <p style="font-size:14px;color:#bbb;margin-bottom:16px;">Amazon measures your product dimensions/weight and charges accordingly. If their measurement is wrong, you're overcharged on <strong>every single order</strong>. File a <strong>remeasurement request</strong> via Seller Support.</p>
                ${weightIssues.sort((a,b) => (b.issues.find(i=>i.type==='WEIGHT_OVERCHARGE')?.savings||0) - (a.issues.find(i=>i.type==='WEIGHT_OVERCHARGE')?.savings||0)).slice(0, 20).map(s => `
                    <div style="background:var(--bg-card);padding:16px;border-radius:10px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <strong style="color:var(--text);">${s.sku}</strong>
                            <span style="color:#ef4444;font-weight:600;">~₹${s.issues.find(i => i.type === 'WEIGHT_OVERCHARGE').savings.toLocaleString('en-IN')} overcharged</span>
                        </div>
                        <p style="font-size:13px;color:#ccc;margin:0;">${s.issues.find(i => i.type === 'WEIGHT_OVERCHARGE').msg}</p>
                        <div style="margin-top:12px;background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;color:#999;">
                            <strong style="color:var(--gold);">How to fix:</strong><br>
                            1. Go to Seller Central → Help → Contact Us<br>
                            2. Select "Fulfillment by Amazon" → "FBA Issue"<br>
                            3. Request product remeasurement for SKU: ${s.sku}<br>
                            4. Provide your actual product weight and dimensions<br>
                            5. Ask for retroactive fee correction for past ${s.orders} orders
                        </div>
                    </div>
                `).join('')}
                ${weightIssues.length > 20 ? `<div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;color:var(--gold);font-size:14px;">+ ${weightIssues.length - 20} more SKUs with weight overcharges (showing top 20 by recoverable amount)</div>` : ''}
            </div>
        </div>`;
    }

    // CARD 3: REFERRAL FEE ANOMALIES
    const refIssues = issueSkus.filter(s => s.issues.some(i => i.type === 'HIGH_REFERRAL'));
    if (refIssues.length > 0) {
        html += `<div class="result-card" style="border-left:4px solid #f59e0b;">
            <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="card-header-left">
                    <span class="card-icon">🏷️</span>
                    <div>
                        <h3 style="margin:0;">High referral fees</h3>
                        <span class="priority-badge badge-fix">${refIssues.length} SKU${refIssues.length > 1 ? 's' : ''} above normal range</span>
                    </div>
                </div>
                <span class="chevron">▾</span>
            </div>
            <div class="card-body">
                <p style="font-size:14px;color:#bbb;margin-bottom:16px;">Referral fees depend on product category. If your product is listed in the wrong category, you may be paying 20-27% instead of 6-15%. Request a category correction.</p>
                ${refIssues.sort((a,b) => (b.issues.find(i=>i.type==='HIGH_REFERRAL')?.savings||0) - (a.issues.find(i=>i.type==='HIGH_REFERRAL')?.savings||0)).slice(0, 20).map(s => {
                    const issue = s.issues.find(i => i.type === 'HIGH_REFERRAL');
                    return `<div style="background:var(--bg-card);padding:16px;border-radius:10px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <strong style="color:var(--text);">${s.sku}</strong>
                            <span style="color:#f59e0b;font-weight:600;">~₹${issue.savings.toLocaleString('en-IN')} potential savings</span>
                        </div>
                        <p style="font-size:13px;color:#ccc;margin:0;">${issue.msg}</p>
                    </div>`;
                }).join('')}
                ${refIssues.length > 20 ? `<div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;color:var(--gold);font-size:14px;">+ ${refIssues.length - 20} more SKUs with high referral fees (showing top 20 by savings)</div>` : ''}
            </div>
        </div>`;
    }

    // CARD 4: UNEXPLAINED CHARGES
    if (unknownFeeCount > 0) {
        html += `<div class="result-card" style="border-left:4px solid #8b5cf6;">
            <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="card-header-left">
                    <span class="card-icon">❓</span>
                    <div>
                        <h3 style="margin:0;">Unexplained "Other" charges</h3>
                        <span class="priority-badge badge-improve">${unknownFeeCount} SKU${unknownFeeCount > 1 ? 's' : ''} · ₹${Math.round(totalUnknownFees).toLocaleString('en-IN')} total</span>
                    </div>
                </div>
                <span class="chevron">▾</span>
            </div>
            <div class="card-body">
                <p style="font-size:14px;color:#bbb;margin-bottom:16px;">These charges don't fall into standard fee categories. Common causes: return processing fees, high-value insurance, ad charges mixed into settlement. Request an itemized breakdown from Seller Support.</p>
                ${issueSkus.filter(s => s.issues.some(i => i.type === 'UNKNOWN_FEE')).sort((a,b) => Math.abs(b.issues.find(i=>i.type==='UNKNOWN_FEE')?.amount||0) - Math.abs(a.issues.find(i=>i.type==='UNKNOWN_FEE')?.amount||0)).slice(0, 20).map(s => {
                    const issue = s.issues.find(i => i.type === 'UNKNOWN_FEE');
                    return `<div style="background:var(--bg-card);padding:14px;border-radius:10px;margin-bottom:10px;">
                        <strong style="color:var(--text);">${s.sku}</strong> — <span style="color:#a78bfa;">${issue.msg}</span>
                    </div>`;
                }).join('')}
                ${unknownFeeCount > 20 ? `<div style="background:var(--bg-card);padding:16px;border-radius:10px;text-align:center;color:var(--gold);font-size:14px;">+ ${unknownFeeCount - 20} more SKUs with unexplained charges (showing top 20 by amount)</div>` : ''}
            </div>
        </div>`;
    }

    // CARD 5: FEE BREAKDOWN TABLE
    html += `<div class="result-card">
        <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="card-header-left">
                <span class="card-icon">📊</span>
                <div>
                    <h3 style="margin:0;">Fee breakdown by SKU</h3>
                    <span class="priority-badge" style="background:#333;color:#ccc;">${skus.length} SKUs</span>
                </div>
            </div>
            <span class="chevron">▾</span>
        </div>
        <div class="card-body">
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="border-bottom:1px solid #333;">
                            <th style="text-align:left;padding:10px 8px;color:#999;">SKU</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Orders</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Sales</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Referral</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Weight</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Closing</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Other</th>
                            <th style="text-align:right;padding:10px 8px;color:#999;">Fee %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${skus.slice(0, 20).map(s => {
                            const feeP = s.sales > 0 ? (s.totalFees / s.sales * 100) : 0;
                            const feeColor = feeP > 40 ? '#ef4444' : feeP > 30 ? '#f59e0b' : '#22c55e';
                            const hasIssue = s.issues.length > 0;
                            return `<tr style="border-bottom:1px solid #222;${hasIssue ? 'background:#1c1917;' : ''}">
                                <td style="padding:10px 8px;color:var(--text);font-weight:${hasIssue ? '600' : '400'};">${s.sku}${hasIssue ? ' ⚠️' : ''}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">${s.orders}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">₹${s.sales.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">₹${s.totalRefFee.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">₹${s.totalWHFee.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">₹${s.totalCloseFee.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                                <td style="text-align:right;padding:10px 8px;color:#ccc;">₹${s.totalOther.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                                <td style="text-align:right;padding:10px 8px;color:${feeColor};font-weight:600;">${feeP.toFixed(1)}%</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ${skus.length > 20 ? `<p style="font-size:12px;color:#666;margin-top:12px;">Showing top 20 of ${skus.length} SKUs by total fees.</p>` : ''}
        </div>
    </div>`;

    // CARD 6: ACTION PLAN
    html += `<div class="result-card" style="border-left:4px solid var(--sage);">
        <div class="card-header" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="card-header-left">
                <span class="card-icon">📋</span>
                <div>
                    <h3 style="margin:0;">Action plan</h3>
                    <span class="priority-badge" style="background:var(--sage-dark);color:var(--sage);">Step-by-step</span>
                </div>
            </div>
            <span class="chevron">▾</span>
        </div>
        <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${weightIssues.length > 0 ? `<div style="background:#1c1917;padding:16px;border-radius:10px;border-left:3px solid #dc2626;">
                    <strong style="color:#ef4444;">1. File remeasurement requests (highest priority)</strong>
                    <p style="font-size:13px;color:#ccc;margin:8px 0 0 0;">SKUs: ${weightIssues.slice(0,10).map(s => s.sku).join(', ')}${weightIssues.length > 10 ? ` + ${weightIssues.length - 10} more` : ''}. Go to Seller Central → Help → Contact Us → FBA → request remeasurement. Estimated recovery: ₹${weightIssues.reduce((sum, s) => sum + s.issues.filter(i => i.type === 'WEIGHT_OVERCHARGE').reduce((a, i) => a + i.savings, 0), 0).toLocaleString('en-IN')}</p>
                </div>` : ''}
                ${refIssues.length > 0 ? `<div style="background:#1c1917;padding:16px;border-radius:10px;border-left:3px solid #f59e0b;">
                    <strong style="color:#f59e0b;">${weightIssues.length > 0 ? '2' : '1'}. Check product categories</strong>
                    <p style="font-size:13px;color:#ccc;margin:8px 0 0 0;">SKUs: ${refIssues.slice(0,10).map(s => s.sku).join(', ')}${refIssues.length > 10 ? ` + ${refIssues.length - 10} more` : ''}. Verify your products are listed in the correct browse node. Wrong category = higher referral fees.</p>
                </div>` : ''}
                ${unknownFeeCount > 0 ? `<div style="background:#1c1917;padding:16px;border-radius:10px;border-left:3px solid #8b5cf6;">
                    <strong style="color:#a78bfa;">${(weightIssues.length > 0 ? 1 : 0) + (refIssues.length > 0 ? 1 : 0) + 1}. Request "Other" fee breakdown</strong>
                    <p style="font-size:13px;color:#ccc;margin:8px 0 0 0;">₹${Math.round(totalUnknownFees).toLocaleString('en-IN')} in unexplained charges. Contact Seller Support and request itemized breakdown for each affected settlement period.</p>
                </div>` : ''}
                <div style="background:#1c1917;padding:16px;border-radius:10px;border-left:3px solid var(--sage);">
                    <strong style="color:var(--sage);">🔄 Run this audit every settlement period</strong>
                    <p style="font-size:13px;color:#ccc;margin:8px 0 0 0;">Download your settlement report after each payout cycle and re-upload here. Fee overcharges can start any time Amazon remeasures your products.</p>
                </div>
            </div>
        </div>
    </div>`;

    trackEvent('analysis_complete', { service: 'feeaudit', skus: skus.length, issues: issueSkus.length, overcharge: totalOvercharge });

    return html;
}

// Parse real settlement data for fee audit
function feeAuditParseReal(data) {
    const rows = [];
    if (!data || !data.rows) return rows;

    const entryMap = new Map();

    data.rows.forEach(r => {
        // Settlement V2 columns: sku, type, amount-type, amount-description, amount
        const sku = r['sku'] || r['SKU'] || r['merchant-sku'] || '';
        const asin = r['asin'] || r['ASIN'] || '';
        const type = (r['type'] || r['transaction-type'] || '').toLowerCase();
        const amtType = (r['amount-description'] || r['amount-type'] || '').toLowerCase();
        const amount = parseFloat(r['amount'] || r['total'] || r['your-proceeds'] || 0);

        if (!sku || type === 'transfer') return;

        // Find or create order entry
        const orderId = r['order-id'] || r['settlement-id'] || sku + '-' + Math.random().toString(36).substr(2,5);
        const key = sku + '|' + orderId;
        
        let entry = entryMap.get(key);
        if (!entry) {
            entry = { sku, asin, _orderId: orderId, principal: 0, referralFee: 0, weightHandling: 0, closingFee: 0, shippingFee: 0, otherFee: 0 };
            entryMap.set(key, entry);
            rows.push(entry);
        }

        if (amtType.includes('principal') || amtType.includes('productcharges')) {
            entry.principal += amount;
        } else if (amtType.includes('referral') || amtType.includes('commission')) {
            entry.referralFee += amount;
        } else if (amtType.includes('fba') && (amtType.includes('weight') || amtType.includes('fulfilment') || amtType.includes('fulfillment') || amtType.includes('pick'))) {
            entry.weightHandling += amount;
        } else if (amtType.includes('closing') || amtType.includes('fixed closing')) {
            entry.closingFee += amount;
        } else if (amtType.includes('shipping') || amtType.includes('delivery')) {
            entry.shippingFee += amount;
        } else if (amount < 0) {
            entry.otherFee += amount;
        }
    });

    return rows;
}

// Sample data for fee audit preview
function feeAuditSampleData() {
    return [
        { sku: 'YOGA-MAT-BLU-6MM', asin: 'B0CYOGAMAT1', principal: 1299, referralFee: -143, weightHandling: -156, closingFee: -30, shippingFee: 0, otherFee: -12 },
        { sku: 'YOGA-MAT-BLU-6MM', asin: 'B0CYOGAMAT1', principal: 1299, referralFee: -143, weightHandling: -189, closingFee: -30, shippingFee: 0, otherFee: 0 },
        { sku: 'YOGA-MAT-BLU-6MM', asin: 'B0CYOGAMAT1', principal: 1299, referralFee: -143, weightHandling: -189, closingFee: -30, shippingFee: 0, otherFee: -8 },
        { sku: 'YOGA-MAT-BLU-6MM', asin: 'B0CYOGAMAT1', principal: 1299, referralFee: -143, weightHandling: -156, closingFee: -30, shippingFee: 0, otherFee: 0 },
        { sku: 'YOGA-MAT-BLU-6MM', asin: 'B0CYOGAMAT1', principal: 1299, referralFee: -143, weightHandling: -189, closingFee: -30, shippingFee: 0, otherFee: -15 },
        { sku: 'COPPER-BOTTLE-1L', asin: 'B0DCOPPERBT', principal: 699, referralFee: -105, weightHandling: -142, closingFee: -21, shippingFee: 0, otherFee: 0 },
        { sku: 'COPPER-BOTTLE-1L', asin: 'B0DCOPPERBT', principal: 699, referralFee: -105, weightHandling: -142, closingFee: -21, shippingFee: 0, otherFee: -45 },
        { sku: 'COPPER-BOTTLE-1L', asin: 'B0DCOPPERBT', principal: 699, referralFee: -105, weightHandling: -98, closingFee: -21, shippingFee: 0, otherFee: 0 },
        { sku: 'LED-STRIP-5M-RGB', asin: 'B0BLEDSTRIP5', principal: 449, referralFee: -54, weightHandling: -55, closingFee: -14, shippingFee: 0, otherFee: 0 },
        { sku: 'LED-STRIP-5M-RGB', asin: 'B0BLEDSTRIP5', principal: 449, referralFee: -54, weightHandling: -55, closingFee: -14, shippingFee: 0, otherFee: 0 },
        { sku: 'LED-STRIP-5M-RGB', asin: 'B0BLEDSTRIP5', principal: 449, referralFee: -54, weightHandling: -55, closingFee: -14, shippingFee: 0, otherFee: 0 },
        { sku: 'BAMBOO-CUTTER-SET', asin: 'B0EBAMBCUTS', principal: 899, referralFee: -225, weightHandling: -78, closingFee: -25, shippingFee: 0, otherFee: -22 },
        { sku: 'BAMBOO-CUTTER-SET', asin: 'B0EBAMBCUTS', principal: 899, referralFee: -225, weightHandling: -78, closingFee: -25, shippingFee: 0, otherFee: 0 },
        { sku: 'SS-TIFFIN-3TIER', asin: 'B0FTIFFIN3T', principal: 1599, referralFee: -176, weightHandling: -178, closingFee: -44, shippingFee: 0, otherFee: -65 },
        { sku: 'SS-TIFFIN-3TIER', asin: 'B0FTIFFIN3T', principal: 1599, referralFee: -176, weightHandling: -210, closingFee: -44, shippingFee: 0, otherFee: 0 },
        { sku: 'SS-TIFFIN-3TIER', asin: 'B0FTIFFIN3T', principal: 1599, referralFee: -176, weightHandling: -210, closingFee: -44, shippingFee: 0, otherFee: -30 },
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
    const bizFile = Object.values(parsedData).find(d => d.type === 'business');
    const hasRealData = bizFile && bizFile.rows && bizFile.rows.length > 0;

    let products;
    if (hasRealData) {
        products = bizFile.rows.map(row => {
            const asin = row['(Child) ASIN'] || row['ASIN'] || row['asin'] || '';
            const name = row['Title'] || row['(Child) ASIN'] || asin;
            const sessions = parseInt((row['Sessions'] || row['sessions'] || '0').toString().replace(/,/g, ''));
            const units = parseInt((row['Units Ordered'] || row['units-ordered'] || row['Units'] || '0').toString().replace(/,/g, ''));
            const sales = parseFloat((row['Ordered Product Sales'] || row['ordered-product-sales'] || '0').toString().replace(/[₹,]/g, ''));
            const convStr = (row['Unit Session Percentage'] || row['Buy Box Percentage'] || '0').toString().replace('%', '');
            const conversion = parseFloat(convStr) || (sessions > 0 ? Math.round(units / sessions * 10000) / 100 : 0);
            const pageViews = parseInt((row['Page Views'] || row['pageviews'] || '0').toString().replace(/,/g, '')) || sessions;
            return { asin, name, sales, units, sessions, conversion, pageViews };
        }).filter(p => p.asin && (p.units > 0 || p.sessions > 0));
    }

    if (!products || products.length === 0) {
        products = [
            { asin: 'B08XYZ123', name: 'Wireless Earbuds Pro', sales: 85000, units: 121, sessions: 4200, conversion: 2.9, pageViews: 5100 },
            { asin: 'B09ABC456', name: 'Smart Watch Band', sales: 120000, units: 200, sessions: 6100, conversion: 3.3, pageViews: 7500 },
            { asin: 'B07DEF789', name: 'USB-C Hub Adapter', sales: 42000, units: 280, sessions: 8900, conversion: 3.1, pageViews: 10200 },
            { asin: 'B10GHI012', name: 'Phone Stand Adjustable', sales: 28000, units: 400, sessions: 12000, conversion: 3.3, pageViews: 14000 },
        ];
    }

    // Add derived fields
    products.forEach(p => {
        p.aov = p.units > 0 ? Math.round(p.sales / p.units) : 0;
        p.dailySales = Math.round(p.units / 30 * 10) / 10;
    });

    const totalSales = products.reduce((s, p) => s + p.sales, 0);
    const totalUnits = products.reduce((s, p) => s + p.units, 0);
    const avgConversion = products.length > 0 ? Math.round(products.reduce((s, p) => s + p.conversion, 0) / products.length * 10) / 10 : 0;

    // ---- SEASONAL EVENT CALENDAR ----
    const today = new Date();
    const events = [
        { name: 'Republic Day Sale', start: new Date(today.getFullYear(), 0, 20), end: new Date(today.getFullYear(), 0, 26), multiplier: 1.8 },
        { name: 'Great Indian Summer Sale', start: new Date(today.getFullYear(), 3, 1), end: new Date(today.getFullYear(), 3, 7), multiplier: 2.5 },
        { name: 'Prime Day India', start: new Date(today.getFullYear(), 6, 15), end: new Date(today.getFullYear(), 6, 17), multiplier: 3.0 },
        { name: 'Freedom Sale', start: new Date(today.getFullYear(), 7, 5), end: new Date(today.getFullYear(), 7, 9), multiplier: 2.0 },
        { name: 'Great Indian Festival (Diwali)', start: new Date(today.getFullYear(), 9, 5), end: new Date(today.getFullYear(), 9, 15), multiplier: 3.5 },
        { name: 'Black Friday / Cyber Monday', start: new Date(today.getFullYear(), 10, 24), end: new Date(today.getFullYear(), 10, 30), multiplier: 1.5 },
        { name: 'Year-End Sale', start: new Date(today.getFullYear(), 11, 20), end: new Date(today.getFullYear(), 11, 31), multiplier: 1.6 },
        // Next year events if within 90 days
        { name: 'Republic Day Sale', start: new Date(today.getFullYear() + 1, 0, 20), end: new Date(today.getFullYear() + 1, 0, 26), multiplier: 1.8 },
    ];

    const upcomingEvents = events.filter(e => {
        const daysUntil = Math.round((e.start - today) / (1000 * 60 * 60 * 24));
        return daysUntil > -5 && daysUntil <= 90;
    }).map(e => {
        const daysUntil = Math.round((e.start - today) / (1000 * 60 * 60 * 24));
        const shipByDate = new Date(e.start.getTime() - 21 * 24 * 60 * 60 * 1000); // 3 weeks before
        return { ...e, daysUntil, shipBy: shipByDate };
    });

    let html = `
        <div class="results-header">
            <h2>Business reports analysis</h2>
            <div class="big-number">₹${totalSales.toLocaleString('en-IN')}</div>
            <p class="results-meta">Total sales across ${products.length} active products</p>
            <div class="results-meta"><span>${totalUnits.toLocaleString('en-IN')} units sold</span> · <span>Avg. conversion: ${avgConversion}%</span> · <span>Avg. order: ₹${Math.round(totalSales / Math.max(totalUnits, 1)).toLocaleString('en-IN')}</span></div>
            ${!hasRealData ? '<p style="font-size:13px; color:var(--gold); margin-top:12px;">Showing sample data — upload your Business Report for real numbers</p>' : ''}
        </div>
    `;

    // ---- CARD 1: SEASONAL INVENTORY ALERT ----
    if (upcomingEvents.length > 0) {
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('seasonAlert').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:#fef2f2;color:#dc2626;">UPCOMING SALE</span><span class="case-title">Stock up — Amazon sale event ahead</span></div>
            <span class="case-amount">${upcomingEvents.length} event${upcomingEvents.length > 1 ? 's' : ''}</span>
        </div><div class="case-body open" id="seasonAlert">`;

        upcomingEvents.forEach(evt => {
            const shipByStr = evt.shipBy.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const startStr = evt.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const urgent = evt.daysUntil <= 21;

            html += `<div class="case-section">
                <h4>${urgent ? '🔴' : '🟡'} ${evt.name} — ${evt.daysUntil <= 0 ? 'HAPPENING NOW' : 'in ' + evt.daysUntil + ' days'} (starts ${startStr})</h4>
                <p>Expected demand: <strong>${evt.multiplier}× normal sales velocity</strong>. ${urgent ? 'Ship inventory NOW to arrive in time.' : 'Ship by <strong>' + shipByStr + '</strong> to have stock in FBA warehouses.'}</p>
                <p style="margin-top:8px;font-size:13px;"><strong>Recommended stock for this event:</strong></p>`;

            products.forEach(p => {
                const eventDays = Math.round((evt.end - evt.start) / (1000 * 60 * 60 * 24)) + 1;
                const normalUnits = Math.round(p.dailySales * eventDays);
                const saleUnits = Math.round(normalUnits * evt.multiplier);
                html += `<p style="font-size:13px;color:var(--text-mid);margin-left:16px;">${p.asin}: <strong>${saleUnits} units</strong> (vs. ${normalUnits} on normal days) — ${p.name.length > 35 ? p.name.substring(0, 32) + '...' : p.name}</p>`;
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    }

    // ---- CARD 2: INVENTORY PLANNING ----
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('invPlan').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority" style="background:#eff6ff;color:#1d4ed8;">RESTOCK</span><span class="case-title">Inventory restock recommendations</span></div>
        <span class="case-amount">${products.length} products</span>
    </div><div class="case-body open" id="invPlan">
        <div class="case-section"><h4>Restock quantities by coverage period</h4>
            <p>Based on your current sales velocity (units/day from last 30 days).</p></div>
        <div class="case-section">`;

    products.sort((a, b) => b.dailySales - a.dailySales).forEach(p => {
        const weeks4 = Math.round(p.dailySales * 28);
        const weeks8 = Math.round(p.dailySales * 56);
        const weeks12 = Math.round(p.dailySales * 84);

        // Adjust for upcoming event if within 8 weeks
        const nextEvent = upcomingEvents.find(e => e.daysUntil > 0 && e.daysUntil <= 56);
        let eventNote = '';
        if (nextEvent) {
            const eventDays = Math.round((nextEvent.end - nextEvent.start) / (1000 * 60 * 60 * 24)) + 1;
            const extraUnits = Math.round(p.dailySales * eventDays * (nextEvent.multiplier - 1));
            eventNote = `+${extraUnits} extra for ${nextEvent.name}`;
        }

        html += `<div style="padding:12px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;">
                <div><strong>${p.name.length > 40 ? p.name.substring(0, 37) + '...' : p.name}</strong><br>
                <span style="font-size:12px;color:var(--text-mid);">${p.asin} · ${p.dailySales} units/day · ₹${p.aov}/unit</span></div>
            </div>
            <div style="display:flex;gap:16px;margin-top:8px;">
                <div style="flex:1;background:var(--card);padding:8px;border-radius:6px;text-align:center;border:1px solid var(--border);">
                    <div style="font-size:12px;color:var(--text-mid);">4 weeks</div>
                    <div style="font-weight:700;">${weeks4} units</div>
                </div>
                <div style="flex:1;background:var(--card);padding:8px;border-radius:6px;text-align:center;border:1px solid var(--border);">
                    <div style="font-size:12px;color:var(--text-mid);">8 weeks</div>
                    <div style="font-weight:700;">${weeks8} units</div>
                </div>
                <div style="flex:1;background:var(--card);padding:8px;border-radius:6px;text-align:center;border:1px solid var(--border);">
                    <div style="font-size:12px;color:var(--text-mid);">12 weeks</div>
                    <div style="font-weight:700;">${weeks12} units</div>
                </div>
            </div>
            ${eventNote ? `<p style="font-size:12px;color:#b45309;margin-top:6px;">📅 ${eventNote}</p>` : ''}
        </div>`;
    });
    html += `</div></div></div>`;

    // ---- CARD 3: PRODUCT PERFORMANCE RANKINGS ----
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('topProds').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority" style="background:#f0fdf4;color:#15803d;">RANKINGS</span><span class="case-title">Product performance</span></div>
        <span class="case-amount">${products.length} products</span>
    </div><div class="case-body open" id="topProds">
        <div class="case-section">`;

    [...products].sort((a, b) => b.sales - a.sales).forEach((p, i) => {
        const convColor = p.conversion >= 3 ? 'var(--green)' : p.conversion >= 1.5 ? '#b45309' : '#dc2626';
        html += `<div style="padding:12px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                    <strong>#${i + 1}: ${p.name.length > 45 ? p.name.substring(0, 42) + '...' : p.name}</strong>
                    <span style="font-size:11px;color:var(--text-mid);margin-left:8px;">${p.asin}</span>
                </div>
                <span style="font-weight:700;">₹${p.sales.toLocaleString('en-IN')}</span>
            </div>
            <p style="font-size:13px;color:var(--text-mid);margin-top:4px;">
                ${p.units} units · ${p.sessions.toLocaleString('en-IN')} sessions ·
                Conversion: <span style="color:${convColor};font-weight:600;">${p.conversion}%</span>
                ${p.conversion < 1.5 ? ' — <em>low conversion, check listing quality and pricing</em>' : ''}
            </p>
        </div>`;
    });
    html += `</div></div></div>`;

    // ---- CARD 4: LOW CONVERSION ALERT ----
    const lowConv = products.filter(p => p.conversion < 2 && p.sessions > 50);
    if (lowConv.length > 0) {
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lowConv').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:#fffbeb;color:#b45309;">ATTENTION</span><span class="case-title">Low conversion products — check listing quality</span></div>
            <span class="case-amount">${lowConv.length} products</span>
        </div><div class="case-body" id="lowConv">
            <div class="case-section"><h4>These products get traffic but don't convert</h4>
                <p>Average Amazon.in conversion is 2-5%. These are below 2%, which means shoppers are visiting but not buying. Common causes: poor images, pricing too high, weak bullet points, negative reviews.</p></div>
            <div class="case-section">`;
        lowConv.forEach(p => {
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <strong>${p.asin}</strong> — ${p.conversion}% conversion (${p.sessions} sessions, only ${p.units} units sold)
                <p style="font-size:13px;color:var(--text-mid);">→ Run this ASIN through the Listing Health Check tool to identify specific issues</p>
            </div>`;
        });
        html += `</div></div></div>`;
    }

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

    // ---- GROUP ISSUES BY TYPE (not per-ASIN) ----
    // Collect issues across all ASINs
    const shortTitles = scored.filter(l => l.title.length < 80);
    const longTitles = scored.filter(l => l.title.length > 200);
    const okTitles = scored.filter(l => l.title.length >= 80 && l.title.length < 150);
    const missingBullets = scored.filter(l => l.bullets.length < 5);
    const noBullets = scored.filter(l => l.bullets.length === 0);
    const lowImages = scored.filter(l => l.imageCount < 5);
    const noBackend = scored.filter(l => !l.backendKw || l.backendKw.length === 0);
    const lowBackend = scored.filter(l => l.backendKw && l.backendKw.length > 0 && l.backendKw.length < 200);

    // Count total fixes
    const totalFixes = shortTitles.length + longTitles.length + missingBullets.length + lowImages.length + noBackend.length;

    // ---- CARD 1: OVERVIEW SCORECARD ----
    html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lOverview').classList.toggle('open')">
        <div class="case-header-left"><span class="case-priority" style="background:#eff6ff;color:#1d4ed8;">OVERVIEW</span><span class="case-title">Score breakdown by ASIN</span></div>
        <span class="case-amount">${scored.length} products</span>
    </div><div class="case-body open" id="lOverview">
        <div class="case-section">`;

    scored.sort((a, b) => a.score - b.score).forEach(l => {
        const shortTitle = l.title.length > 50 ? l.title.substring(0, 47) + '...' : l.title;
        const color = l.score < 40 ? '#dc2626' : l.score < 70 ? '#b45309' : 'var(--green)';
        const pct = Math.min(l.score, 100);
        const issues = l.feedback.filter(f => f.type === 'critical' || f.type === 'fix').length;
        html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
            <div style="min-width:48px;text-align:center;font-weight:700;color:${color};font-size:18px;">${l.score}</div>
            <div style="flex:1;">
                <div style="font-weight:500;font-size:14px;">${shortTitle}</div>
                <div style="font-size:12px;color:var(--text-mid);">${l.asin} · ${issues} issues · ${l.bullets.length}/5 bullets · ${l.imageCount} images</div>
            </div>
            <div style="width:80px;background:var(--border);height:6px;border-radius:3px;">
                <div style="background:${color};height:6px;border-radius:3px;width:${pct}%;"></div>
            </div>
        </div>`;
    });
    html += `</div></div></div>`;

    // ---- CARD 2: TITLES ----
    if (shortTitles.length > 0 || longTitles.length > 0 || okTitles.length > 0) {
        const titleIssueCount = shortTitles.length + longTitles.length + okTitles.length;
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lTitles').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:${shortTitles.length > 0 ? '#fef2f2;color:#dc2626' : '#fffbeb;color:#b45309'};">${shortTitles.length > 0 ? 'FIX TITLES' : 'OPTIMIZE'}</span><span class="case-title">Title optimization</span></div>
            <span class="case-amount">${titleIssueCount} ASINs</span>
        </div><div class="case-body${shortTitles.length > 0 ? ' open' : ''}" id="lTitles">`;

        if (shortTitles.length > 0) {
            html += `<div class="case-section"><h4>🔴 Critically short titles (under 80 chars) — ${shortTitles.length} ASINs</h4>
                <p>These titles are severely hurting search visibility. Amazon gives you 200 characters — use them.</p>`;
            shortTitles.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'title' && f.suggestion);
                html += `<div style="padding:12px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;"><strong>${l.asin}</strong><span style="color:#dc2626;font-size:13px;">${l.title.length} chars</span></div>
                    <p style="font-size:13px;color:var(--text-mid);margin-top:4px;">"${l.title}"</p>
                    <p style="font-size:12px;color:var(--text-mid);margin-top:4px;">📱 Mobile shows: "${l.title.substring(0, 115)}${l.title.length > 115 ? '...' : ''}"</p>
                    ${sugg ? `<div class="claim-template" style="margin-top:8px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy suggestion</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        if (longTitles.length > 0) {
            html += `<div class="case-section"><h4>🟠 Titles too long (over 200 chars) — ${longTitles.length} ASINs</h4>
                <p>These may get truncated. Mobile search only shows ~115 characters.</p>`;
            longTitles.forEach(l => {
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;"><strong>${l.asin}</strong><span style="color:#b45309;font-size:13px;">${l.title.length} chars</span></div>
                    <p style="font-size:12px;color:var(--text-mid);margin-top:4px;">📱 Mobile shows: "${l.title.substring(0, 115)}..."</p>
                </div>`;
            });
            html += `</div>`;
        }

        if (okTitles.length > 0) {
            html += `<div class="case-section"><h4>🟡 Titles could be longer (80-150 chars) — ${okTitles.length} ASINs</h4>
                <p>Good titles but room to add more keywords. Target 150-200 characters.</p>`;
            okTitles.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'title' && f.suggestion);
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;"><strong>${l.asin}</strong><span style="font-size:13px;">${l.title.length} chars → target 150-200</span></div>
                    ${sugg ? `<div class="claim-template" style="margin-top:6px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy suggestion</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        html += `</div></div>`;
    }

    // ---- CARD 3: BULLET POINTS ----
    if (missingBullets.length > 0) {
        const totalMissing = missingBullets.reduce((s, l) => s + (5 - l.bullets.length), 0);
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lBullets').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:${noBullets.length > 0 ? '#fef2f2;color:#dc2626' : '#fffbeb;color:#b45309'};">${noBullets.length > 0 ? 'CRITICAL' : 'ADD BULLETS'}</span><span class="case-title">Missing bullet points</span></div>
            <span class="case-amount">${totalMissing} empty slots</span>
        </div><div class="case-body${noBullets.length > 0 ? ' open' : ''}" id="lBullets">`;

        if (noBullets.length > 0) {
            html += `<div class="case-section"><h4>🔴 Zero bullet points — ${noBullets.length} ASINs</h4>
                <p>Bullets are the #1 conversion driver after images. These listings are missing all 5.</p>`;
            noBullets.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'bullets' && f.suggestion);
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <strong>${l.asin}</strong> — ${l.title.length > 45 ? l.title.substring(0, 42) + '...' : l.title}
                    ${sugg ? `<div class="claim-template" style="margin-top:8px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy suggestions</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        const partialBullets = missingBullets.filter(l => l.bullets.length > 0);
        if (partialBullets.length > 0) {
            html += `<div class="case-section"><h4>🟡 Incomplete bullet points — ${partialBullets.length} ASINs</h4>`;
            partialBullets.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'bullets' && f.suggestion);
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <strong>${l.asin}</strong> — ${l.bullets.length}/5 filled (${5 - l.bullets.length} empty)
                    ${sugg ? `<div class="claim-template" style="margin-top:6px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy suggestions</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        html += `</div></div>`;
    }

    // ---- CARD 4: IMAGES ----
    if (lowImages.length > 0) {
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lImages').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:#fffbeb;color:#b45309;">ADD IMAGES</span><span class="case-title">Listings need more product photos</span></div>
            <span class="case-amount">${lowImages.length} ASINs</span>
        </div><div class="case-body" id="lImages">
            <div class="case-section"><h4>Why 7+ images matter</h4>
                <p>Listings with 7+ images see up to 30% higher conversion on Amazon.in. Most shoppers swipe through all images before deciding — especially on mobile.</p></div>
            <div class="case-section"><h4>ASINs with fewer than 5 images</h4>`;

        lowImages.sort((a, b) => a.imageCount - b.imageCount).forEach(l => {
            const sugg = l.feedback.find(f => f.area === 'images' && f.suggestion);
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;"><strong>${l.asin}</strong><span style="color:#b45309;">${l.imageCount} images</span></div>
                <p style="font-size:13px;color:var(--text-mid);">${l.title.length > 50 ? l.title.substring(0, 47) + '...' : l.title}</p>
                ${sugg ? `<div class="claim-template" style="margin-top:6px;font-size:13px;">${sugg.suggestion}</div>` : ''}
            </div>`;
        });
        html += `</div></div></div>`;
    }

    // ---- CARD 5: BACKEND KEYWORDS ----
    if (noBackend.length > 0 || lowBackend.length > 0) {
        const totalKwIssues = noBackend.length + lowBackend.length;
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lKeywords').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:${noBackend.length > 0 ? '#fef2f2;color:#dc2626' : '#faf5ff;color:#7c3aed'};">${noBackend.length > 0 ? 'MISSING SEO' : 'IMPROVE'}</span><span class="case-title">Backend search terms</span></div>
            <span class="case-amount">${totalKwIssues} ASINs</span>
        </div><div class="case-body${noBackend.length > 0 ? ' open' : ''}" id="lKeywords">`;

        if (noBackend.length > 0) {
            html += `<div class="case-section"><h4>🔴 Zero backend keywords — ${noBackend.length} ASINs</h4>
                <p>Amazon gives you 249 bytes of hidden search terms. These listings aren't using any of it — they're invisible for every keyword not in the title.</p>`;
            noBackend.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'keywords' && f.suggestion);
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <strong>${l.asin}</strong> — ${l.title.length > 45 ? l.title.substring(0, 42) + '...' : l.title}
                    ${sugg ? `<div class="claim-template" style="margin-top:6px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy keywords</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        if (lowBackend.length > 0) {
            html += `<div class="case-section"><h4>🟡 Under-utilized backend keywords — ${lowBackend.length} ASINs</h4>
                <p>These have some keywords but aren't using the full 249 bytes available.</p>`;
            lowBackend.forEach(l => {
                const sugg = l.feedback.find(f => f.area === 'keywords' && f.suggestion);
                html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <strong>${l.asin}</strong> — ${l.backendKw.length}/249 bytes used
                    ${sugg ? `<div class="claim-template" style="margin-top:6px;font-size:13px;">${sugg.suggestion}</div>
                        <div class="claim-actions"><button class="btn-copy" onclick="event.stopPropagation(); copyTemplate(this)">Copy keywords</button></div>` : ''}
                </div>`;
            });
            html += `</div>`;
        }

        html += `</div></div>`;
    }

    // ---- CARD 6: KEYWORD COVERAGE (SEO) ----
    const kwIssues = scored.filter(l => l.feedback.some(f => f.area === 'seo' && f.type !== 'win'));
    if (kwIssues.length > 0) {
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lSeo').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:#faf5ff;color:#7c3aed;">SEO</span><span class="case-title">Keyword coverage gaps</span></div>
            <span class="case-amount">${kwIssues.length} ASINs</span>
        </div><div class="case-body" id="lSeo">
            <div class="case-section"><h4>How keyword coverage works</h4>
                <p>Each keyword should ideally appear in your title, at least one bullet point, and your backend search terms. If a keyword only appears in one place, you're leaving ranking power on the table.</p></div>
            <div class="case-section">`;
        kwIssues.forEach(l => {
            const seoFb = l.feedback.find(f => f.area === 'seo');
            if (!seoFb) return;
            html += `<div style="padding:10px 0;border-bottom:1px solid var(--border);">
                <strong>${l.asin}</strong> — ${seoFb.text}
                ${seoFb.suggestion ? `<div class="claim-template" style="margin-top:6px;font-size:12px;white-space:pre-line;">${seoFb.suggestion}</div>` : ''}
            </div>`;
        });
        html += `</div></div></div>`;
    }

    // ---- CARD 7: EVERYTHING GOOD ----
    const goodListings = scored.filter(l => l.score >= 75);
    if (goodListings.length > 0) {
        html += `<div class="case-card"><div class="case-header" onclick="document.getElementById('lGood').classList.toggle('open')">
            <div class="case-header-left"><span class="case-priority" style="background:#f0fdf4;color:#15803d;">HEALTHY</span><span class="case-title">These listings are in good shape</span></div>
            <span class="case-amount">${goodListings.length} ASINs</span>
        </div><div class="case-body" id="lGood">
            <div class="case-section">`;
        goodListings.forEach(l => {
            html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;">
                    <div><strong>${l.asin}</strong> — ${l.title.length > 45 ? l.title.substring(0, 42) + '...' : l.title}</div>
                    <span style="color:var(--green);font-weight:700;">${l.score}/100</span>
                </div>
                <p style="font-size:12px;color:var(--text-mid);">✅ ${l.bullets.length}/5 bullets · ${l.imageCount} images · ${l.title.length} char title</p>
            </div>`;
        });
        html += `</div></div></div>`;
    }

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

// ============================================
// DOWNLOAD DROPDOWN MENU
// ============================================

function toggleDownloadMenu() {
    const menu = document.getElementById('downloadMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.download-dropdown');
    const menu = document.getElementById('downloadMenu');
    if (menu && dropdown && !dropdown.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// ============================================
// DOWNLOAD REPORT - MULTI-FORMAT EXPORT
// ============================================

function downloadReport(format = 'excel') {
    // Close the dropdown menu
    const menu = document.getElementById('downloadMenu');
    if (menu) menu.style.display = 'none';
    
    const serviceNames = { 
        reimbursement: 'Reimbursement Detection', 
        feeaudit: 'FBA Fee Audit',
        ppc: 'PPC & Keyword Cleanup', 
        reports: 'Business Reports Analysis', 
        listing: 'Listing Health Check' 
    };
    
    const reportData = extractReportData();
    
    if (format === 'excel') {
        downloadExcel(reportData, serviceNames[selectedService]);
    } else if (format === 'pdf') {
        downloadPDF(reportData, serviceNames[selectedService]);
    } else {
        downloadText(reportData, serviceNames[selectedService]);
    }
}

function extractReportData() {
    const data = {
        service: selectedService,
        generatedAt: new Date().toLocaleString(),
        files: uploadedFiles.map(f => f.name),
        summary: {},
        cases: []
    };
    
    // Extract summary from results header
    const header = document.querySelector('.results-header');
    if (header) {
        const bigNum = header.querySelector('.big-number');
        const title = header.querySelector('h2');
        if (title) data.summary.title = title.textContent.trim();
        if (bigNum) data.summary.bigNumber = bigNum.textContent.trim();
        
        data.summary.meta = [];
        header.querySelectorAll('.results-meta').forEach(m => {
            data.summary.meta.push(m.textContent.trim());
        });
    }
    
    // Extract each case card
    document.querySelectorAll('.case-card').forEach((card, idx) => {
        const caseData = {
            index: idx + 1,
            title: '',
            amount: '',
            priority: '',
            sections: []
        };
        
        const titleEl = card.querySelector('.case-title');
        const amountEl = card.querySelector('.case-amount');
        const priorityEl = card.querySelector('.case-priority');
        
        if (titleEl) caseData.title = titleEl.textContent.trim();
        if (amountEl) caseData.amount = amountEl.textContent.trim();
        if (priorityEl) caseData.priority = priorityEl.textContent.trim();
        
        const body = card.querySelector('.case-body');
        if (body) {
            body.querySelectorAll('.case-section').forEach(section => {
                const sectionData = {
                    heading: '',
                    paragraphs: [],
                    lists: [],
                    templates: []
                };
                
                const h4 = section.querySelector('h4');
                if (h4) sectionData.heading = h4.textContent.trim();
                
                section.querySelectorAll('p').forEach(p => {
                    const text = p.textContent.trim();
                    if (text) sectionData.paragraphs.push(text);
                });
                
                section.querySelectorAll('ol li, ul li').forEach(li => {
                    sectionData.lists.push(li.textContent.trim());
                });
                
                section.querySelectorAll('.claim-template, .suggestion-box').forEach(tmpl => {
                    sectionData.templates.push(tmpl.textContent.trim());
                });
                
                caseData.sections.push(sectionData);
            });
        }
        
        data.cases.push(caseData);
    });
    
    return data;
}

function downloadExcel(data, serviceName) {
    try {
        const wb = XLSX.utils.book_new();
        
        // Use the actual parsed CSV data instead of scraping DOM
        if (selectedService === 'ppc') {
            createPPCExcelFromData(wb);
        } else if (selectedService === 'feeaudit') {
            createFeeAuditExcelFromData(wb);
        } else if (selectedService === 'reimbursement') {
            createReimbursementExcelFromData(wb);
        } else if (selectedService === 'reports') {
            createBusinessReportsExcelFromData(wb);
        } else if (selectedService === 'listing') {
            createListingExcelFromData(wb);
        } else {
            createGenericExcel(wb, data, serviceName);
        }
        
        const filename = `vikreya-${selectedService}-report-${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast('Excel report downloaded!');
        trackEvent('report_downloaded', { format: 'excel', service: selectedService });
    } catch (error) {
        console.error('Excel export error:', error);
        showToast('Error generating Excel. Try PDF or Text format.');
    }
}

// PPC Excel - Use parsed data directly
function createPPCExcelFromData(wb) {
    const hasPPCData = Object.values(parsedData).some(d => d.type === 'searchterm');
    
    if (!hasPPCData) {
        // Use sample data structure
        const summary = [
            ['VIKREYA PPC & KEYWORD CLEANUP REPORT'],
            ['Status:', 'Sample Data (Upload Search Term Report for real analysis)'],
            ['Generated:', new Date().toLocaleString()],
            []
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        return;
    }
    
    // Parse the actual uploaded data
    const ppcResults = ppcParseReal();
    
    // Sheet 1: Summary
    const summary = [
        ['VIKREYA PPC & KEYWORD CLEANUP REPORT'],
        ['Generated:', new Date().toLocaleString()],
        ['Files Analyzed:', uploadedFiles.map(f => f.name).join(', ')],
        [],
        ['KEY METRICS'],
        ['Total Spend:', `₹${ppcResults.totalSpend.toLocaleString('en-IN')}`],
        ['Search Terms:', ppcResults.total],
        ['Avg ACoS:', `${ppcResults.avgAcos}%`],
        ['Estimated Monthly Opportunity:', `₹${ppcResults.scaleOpp.toLocaleString('en-IN')}`],
        ['Monthly Ad Waste (to negate):', `₹${ppcResults.totalWaste.toLocaleString('en-IN')}`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Sheet 2: SCALE - Increase Bids
    if (ppcResults.scale && ppcResults.scale.length > 0) {
        const scaleData = ppcResults.scale.map(t => ({
            'Keyword': t.keyword,
            'Clicks': t.clicks,
            'Spend': t.spend.toFixed(2),
            'CPC': t.cpc.toFixed(2),
            'CVR': t.cvr.toFixed(2) + '%',
            'Orders': t.orders,
            'ACoS': t.acos + '%',
            'Current Bid': t.cpc.toFixed(2),
            'Suggested Bid (25% increase)': (t.cpc * 1.25).toFixed(2),
            'Est. Additional Orders/Month': Math.round(t.orders * 0.4),
            'Match Type': t.matchType,
            'Campaign': t.campaign,
            'Action': 'Increase bid by ₹' + (t.cpc * 0.25).toFixed(2)
        }));
        const wsScale = XLSX.utils.json_to_sheet(scaleData);
        wsScale['!cols'] = [
            { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 25 },
            { wch: 15 }, { wch: 30 }, { wch: 25 }
        ];
        XLSX.utils.book_append_sheet(wb, wsScale, 'SCALE - Increase Bids');
    }
    
    // Sheet 3: NEGATE - Dead Keywords
    if (ppcResults.dead && ppcResults.dead.length > 0) {
        const negateData = ppcResults.dead.map(t => ({
            'Keyword': t.keyword,
            'Clicks': t.clicks,
            'Spend': t.spend.toFixed(2),
            'Orders': t.orders,
            'ACoS': t.acos + '%',
            'Monthly Waste': t.spend.toFixed(2),
            'Reason': t.orders === 0 ? 'Zero conversions' : `Poor ACoS (${t.acos}%)`,
            'Campaign': t.campaign,
            'Action': 'Add as negative exact match'
        }));
        const wsNegate = XLSX.utils.json_to_sheet(negateData);
        wsNegate['!cols'] = [
            { wch: 45 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
            { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsNegate, 'NEGATE - Dead Keywords');
        
        // Also create a simple copy-paste list
        const negateList = [
            ['NEGATIVE KEYWORDS - COPY & PASTE LIST'],
            [],
            ['Copy these keywords and paste into Campaign Manager → Negative Keywords → Add as Exact Match'],
            [],
            ...ppcResults.dead.map(t => [t.keyword])
        ];
        const wsNegateList = XLSX.utils.aoa_to_sheet(negateList);
        wsNegateList['!cols'] = [{ wch: 50 }];
        XLSX.utils.book_append_sheet(wb, wsNegateList, 'Negative Keyword List');
    }
    
    // Sheet 4: AUTO TO MANUAL
    if (ppcResults.migrate && ppcResults.migrate.length > 0) {
        const migrateData = ppcResults.migrate.map(t => ({
            'Keyword': t.keyword,
            'Current Match Type': t.matchType,
            'Current Campaign': t.campaign,
            'Clicks': t.clicks,
            'Orders': t.orders,
            'ACoS': t.acos + '%',
            'Suggested Starting Bid (Exact)': t.sugBid.toFixed(2),
            'Action 1': 'Create new manual exact campaign',
            'Action 2': 'Add as negative in current campaign'
        }));
        const wsMigrate = XLSX.utils.json_to_sheet(migrateData);
        wsMigrate['!cols'] = [
            { wch: 40 }, { wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 28 }, { wch: 35 }, { wch: 35 }
        ];
        XLSX.utils.book_append_sheet(wb, wsMigrate, 'AUTO TO MANUAL Migration');
    }
    
    // Sheet 5: Long-Tail Opportunities
    if (ppcResults.longTail && ppcResults.longTail.length > 0) {
        const longTailData = ppcResults.longTail.map(t => ({
            'Keyword': t.keyword,
            'Word Count': t.words,
            'Clicks': t.clicks,
            'Spend': t.spend.toFixed(2),
            'CPC': t.cpc.toFixed(2),
            'CVR': t.cvr.toFixed(2) + '%',
            'Orders': t.orders,
            'ACoS': t.acos + '%',
            'Status': t.orders > 0 ? 'Converting - Scale' : 'Test',
            'Competition': 'Low (long-tail)',
            'Campaign': t.campaign
        }));
        const wsLongTail = XLSX.utils.json_to_sheet(longTailData);
        wsLongTail['!cols'] = [
            { wch: 50 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsLongTail, 'Long-Tail Keywords');
    }
}

// Fee Audit Excel - Use parsed data directly  
function createFeeAuditExcelFromData(wb) {
    const hasSettlement = Object.values(parsedData).some(d => d.type === 'settlement');
    
    if (!hasSettlement) {
        const summary = [
            ['VIKREYA FBA FEE AUDIT REPORT'],
            ['Status:', 'Sample Data (Upload Settlement Report for real analysis)'],
            ['Generated:', new Date().toLocaleString()]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        return;
    }
    
    // Parse settlement data
    const feeData = feeAuditParseReal(Object.values(parsedData).find(d => d.type === 'settlement'));
    
    // Analyze fees
    const skuMap = {};
    feeData.forEach(row => {
        const key = row.sku;
        if (!skuMap[key]) {
            skuMap[key] = { 
                sku: row.sku, 
                asin: row.asin,
                orders: 0, 
                totalPrincipal: 0, 
                totalRefFee: 0, 
                totalWeight: 0, 
                totalClosing: 0, 
                totalOther: 0,
                weightFees: [],
                refFees: [],
                otherFees: []
            };
        }
        skuMap[key].orders++;
        skuMap[key].totalPrincipal += row.principal;
        skuMap[key].totalRefFee += Math.abs(row.referralFee);
        skuMap[key].totalWeight += Math.abs(row.weightHandling);
        skuMap[key].totalClosing += Math.abs(row.closingFee);
        skuMap[key].totalOther += Math.abs(row.otherFee);
        skuMap[key].weightFees.push(Math.abs(row.weightHandling));
        skuMap[key].refFees.push(Math.abs(row.referralFee));
        if (row.otherFee < 0) skuMap[key].otherFees.push(Math.abs(row.otherFee));
    });
    
    // Detect issues
    const issues = [];
    Object.values(skuMap).forEach(sku => {
        // Weight handling variance
        if (sku.weightFees.length >= 3) {
            const avgWeight = sku.totalWeight / sku.orders;
            const maxWeight = Math.max(...sku.weightFees);
            const minWeight = Math.min(...sku.weightFees.filter(f => f > 0));
            if (maxWeight > minWeight * 1.2 && maxWeight > 120) {
                const overcharge = (maxWeight - minWeight) * sku.weightFees.filter(f => f > avgWeight).length;
                issues.push({
                    SKU: sku.sku,
                    ASIN: sku.asin,
                    'Issue Type': 'Weight Handling Fee Variance',
                    'Min Fee': `₹${minWeight.toFixed(2)}`,
                    'Max Fee': `₹${maxWeight.toFixed(2)}`,
                    'Avg Fee': `₹${avgWeight.toFixed(2)}`,
                    'Orders Analyzed': sku.orders,
                    'Estimated Overcharge': `₹${overcharge.toFixed(2)}`,
                    'Priority': overcharge > 500 ? 'HIGH' : 'MEDIUM',
                    'Action': 'Request remeasurement via Seller Support'
                });
            }
        }
        
        // High referral fees
        const avgPrincipal = sku.totalPrincipal / sku.orders;
        const refPercent = avgPrincipal > 0 ? (sku.totalRefFee / sku.totalPrincipal) * 100 : 0;
        if (refPercent > 20) {
            issues.push({
                SKU: sku.sku,
                ASIN: sku.asin,
                'Issue Type': 'High Referral Fee',
                'Referral %': `${refPercent.toFixed(1)}%`,
                'Avg Order Value': `₹${avgPrincipal.toFixed(2)}`,
                'Avg Referral Fee': `₹${(sku.totalRefFee / sku.orders).toFixed(2)}`,
                'Orders Analyzed': sku.orders,
                'Total Referral Paid': `₹${sku.totalRefFee.toFixed(2)}`,
                'Priority': refPercent > 25 ? 'HIGH' : 'MEDIUM',
                'Action': 'Verify product category - may be miscategorized'
            });
        }
        
        // Unknown/Other fees
        if (sku.totalOther > 50) {
            issues.push({
                SKU: sku.sku,
                ASIN: sku.asin,
                'Issue Type': 'Unexplained "Other" Charges',
                'Total Other Fees': `₹${sku.totalOther.toFixed(2)}`,
                'Occurrences': sku.otherFees.length,
                'Avg Per Order': `₹${(sku.totalOther / sku.otherFees.length).toFixed(2)}`,
                'Orders Analyzed': sku.orders,
                'Priority': sku.totalOther > 200 ? 'HIGH' : 'MEDIUM',
                'Action': 'Contact Seller Support for itemized breakdown'
            });
        }
    });
    
    // Sheet 1: Summary
    const totalOvercharge = issues.reduce((sum, i) => {
        const amt = i['Estimated Overcharge'] || i['Total Referral Paid'] || i['Total Other Fees'] || '₹0';
        return sum + parseFloat(amt.replace(/[₹,]/g, ''));
    }, 0);
    
    const summary = [
        ['VIKREYA FBA FEE AUDIT REPORT'],
        ['Generated:', new Date().toLocaleString()],
        ['Files Analyzed:', uploadedFiles.map(f => f.name).join(', ')],
        [],
        ['AUDIT RESULTS'],
        ['Total SKUs Analyzed:', Object.keys(skuMap).length],
        ['Total Orders Reviewed:', feeData.length],
        ['Issues Found:', issues.length],
        ['Estimated Total Recovery:', `₹${totalOvercharge.toLocaleString('en-IN')}`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Sheet 2: Issues by SKU
    if (issues.length > 0) {
        const wsIssues = XLSX.utils.json_to_sheet(issues);
        wsIssues['!cols'] = Object.keys(issues[0]).map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, wsIssues, 'Issues by SKU');
    }
    
    // Sheet 3: All Transactions
    const transactionData = feeData.map(row => ({
        SKU: row.sku,
        ASIN: row.asin,
        'Order Value': `₹${row.principal.toFixed(2)}`,
        'Referral Fee': `₹${Math.abs(row.referralFee).toFixed(2)}`,
        'Weight Handling': `₹${Math.abs(row.weightHandling).toFixed(2)}`,
        'Closing Fee': `₹${Math.abs(row.closingFee).toFixed(2)}`,
        'Other Fees': `₹${Math.abs(row.otherFee).toFixed(2)}`,
        'Total Fees': `₹${(Math.abs(row.referralFee) + Math.abs(row.weightHandling) + Math.abs(row.closingFee) + Math.abs(row.otherFee)).toFixed(2)}`
    }));
    const wsTrans = XLSX.utils.json_to_sheet(transactionData);
    wsTrans['!cols'] = [
        { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTrans, 'All Transactions');
}

// Simplified versions for other services
function createReimbursementExcelFromData(wb) {
    // Use extractReportData for now (fallback to DOM scraping)
    createGenericExcel(wb, extractReportData(), 'Reimbursement Detection');
}

function createBusinessReportsExcelFromData(wb) {
    const bizFile = Object.values(parsedData).find(d => d.type === 'business');
    const hasRealData = bizFile && bizFile.rows && bizFile.rows.length > 0;
    
    if (!hasRealData) {
        const summary = [
            ['VIKREYA BUSINESS REPORTS ANALYSIS'],
            ['Status:', 'Sample Data (Upload Business Report for real analysis)'],
            ['Generated:', new Date().toLocaleString()]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summary);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        return;
    }
    
    // Parse business report data
    const products = bizFile.rows.map(row => {
        const asin = row['(Child) ASIN'] || row['ASIN'] || row['asin'] || '';
        const parentAsin = row['(Parent) ASIN'] || row['Parent ASIN'] || '';
        const sku = row['(Child) SKU'] || row['SKU'] || row['sku'] || '';
        const name = row['Title'] || row['(Child) ASIN'] || asin;
        const sessions = parseInt((row['Sessions'] || row['sessions'] || '0').toString().replace(/,/g, ''));
        const units = parseInt((row['Units Ordered'] || row['units-ordered'] || row['Units'] || '0').toString().replace(/,/g, ''));
        const sales = parseFloat((row['Ordered Product Sales'] || row['ordered-product-sales'] || row['Sales'] || '0').toString().replace(/[₹,]/g, ''));
        const convStr = (row['Unit Session Percentage'] || row['Buy Box Percentage'] || '0').toString().replace('%', '');
        const conversion = parseFloat(convStr) || (sessions > 0 ? Math.round(units / sessions * 10000) / 100 : 0);
        const pageViews = parseInt((row['Page Views'] || row['pageviews'] || '0').toString().replace(/,/g, '')) || sessions;
        const pageViewsPercent = parseFloat((row['Page Views Percentage'] || '0').toString().replace('%', '')) || 0;
        const buyBoxPercent = parseFloat((row['Buy Box Percentage'] || '0').toString().replace('%', '')) || 0;
        
        return { 
            asin, 
            parentAsin,
            sku,
            name, 
            sales, 
            units, 
            sessions, 
            conversion, 
            pageViews,
            pageViewsPercent,
            buyBoxPercent,
            aov: units > 0 ? Math.round(sales / units) : 0,
            dailyUnits: units / 30,
            revenuePerSession: sessions > 0 ? Math.round(sales / sessions) : 0
        };
    }).filter(p => p.asin && (p.units > 0 || p.sessions > 0));
    
    const totalSales = products.reduce((s, p) => s + p.sales, 0);
    const totalUnits = products.reduce((s, p) => s + p.units, 0);
    const totalSessions = products.reduce((s, p) => s + p.sessions, 0);
    const avgConversion = products.length > 0 ? products.reduce((s, p) => s + p.conversion, 0) / products.length : 0;
    
    // Sheet 1: Executive Summary
    const summary = [
        ['VIKREYA BUSINESS REPORTS ANALYSIS'],
        ['Generated:', new Date().toLocaleString()],
        ['Report Period:', '30 days'],
        ['Files Analyzed:', uploadedFiles.map(f => f.name).join(', ')],
        [],
        ['PORTFOLIO OVERVIEW'],
        ['Total Products:', products.length],
        ['Total Sales:', `₹${totalSales.toLocaleString('en-IN')}`],
        ['Total Units Sold:', totalUnits.toLocaleString('en-IN')],
        ['Total Sessions:', totalSessions.toLocaleString('en-IN')],
        ['Portfolio Conversion Rate:', `${avgConversion.toFixed(2)}%`],
        ['Average Order Value:', `₹${Math.round(totalSales / totalUnits).toLocaleString('en-IN')}`],
        [],
        ['PERFORMANCE BREAKDOWN'],
        ['High Performers (Conv > 3%):', products.filter(p => p.conversion > 3).length],
        ['Needs Improvement (Conv < 2%):', products.filter(p => p.conversion < 2 && p.sessions > 50).length],
        ['Dead Stock (0 sales):', products.filter(p => p.units === 0).length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Sheet 2: Product Performance (Full Data)
    const productData = products.map(p => ({
        'ASIN': p.asin,
        'Parent ASIN': p.parentAsin,
        'SKU': p.sku,
        'Product Name': p.name,
        'Sales (₹)': p.sales.toFixed(2),
        'Units Sold': p.units,
        'Sessions': p.sessions,
        'Page Views': p.pageViews,
        'Conversion %': p.conversion.toFixed(2),
        'Buy Box %': p.buyBoxPercent.toFixed(2),
        'AOV (₹)': p.aov,
        'Revenue/Session (₹)': p.revenuePerSession,
        'Units/Day': p.dailyUnits.toFixed(1),
        'Performance': p.conversion > 3 ? 'Excellent' : p.conversion > 2 ? 'Good' : p.conversion > 1 ? 'Fair' : 'Poor'
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productData);
    wsProducts['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 45 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
        { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsProducts, 'All Products');
    
    // Sheet 3: Top Performers (by Sales)
    const topBySales = [...products].sort((a, b) => b.sales - a.sales).slice(0, 20).map((p, i) => ({
        'Rank': i + 1,
        'ASIN': p.asin,
        'SKU': p.sku,
        'Product Name': p.name,
        'Sales (₹)': p.sales.toFixed(2),
        'Units': p.units,
        'Conversion %': p.conversion.toFixed(2),
        '% of Total Sales': ((p.sales / totalSales) * 100).toFixed(1) + '%',
        'Strategy': p.conversion > 2.5 ? 'Scale - Increase PPC budget' : 'Optimize listing to boost conversion'
    }));
    const wsTop = XLSX.utils.json_to_sheet(topBySales);
    wsTop['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 20 }, { wch: 45 },
        { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top 20 by Sales');
    
    // Sheet 4: Inventory Restock Recommendations
    const restockData = products.map(p => {
        const weeks4 = Math.round(p.dailyUnits * 28);
        const weeks8 = Math.round(p.dailyUnits * 56);
        const weeks12 = Math.round(p.dailyUnits * 84);
        const stockValue4 = weeks4 * p.aov;
        const stockValue8 = weeks8 * p.aov;
        
        return {
            'ASIN': p.asin,
            'SKU': p.sku,
            'Product Name': p.name,
            'Daily Sales Rate': p.dailyUnits.toFixed(1) + ' units/day',
            'AOV (₹)': p.aov,
            '4 Weeks Stock': weeks4 + ' units',
            '4 Weeks Value': `₹${stockValue4.toLocaleString('en-IN')}`,
            '8 Weeks Stock': weeks8 + ' units',
            '8 Weeks Value': `₹${stockValue8.toLocaleString('en-IN')}`,
            '12 Weeks Stock': weeks12 + ' units',
            'Recommended': weeks8 + ' units (8 weeks coverage)',
            'Urgency': p.dailyUnits > 5 ? 'High - Fast mover' : p.dailyUnits > 2 ? 'Medium' : 'Low'
        };
    }).sort((a, b) => parseFloat(b['Daily Sales Rate']) - parseFloat(a['Daily Sales Rate']));
    
    const wsRestock = XLSX.utils.json_to_sheet(restockData);
    wsRestock['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 18 },
        { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 15 },
        { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRestock, 'Restock Recommendations');
    
    // Sheet 5: Low Conversion - Fix These
    const lowConversion = products.filter(p => p.conversion < 2 && p.sessions > 50)
        .sort((a, b) => b.sessions - a.sessions)
        .map(p => ({
            'ASIN': p.asin,
            'SKU': p.sku,
            'Product Name': p.name,
            'Sessions': p.sessions,
            'Units Sold': p.units,
            'Conversion %': p.conversion.toFixed(2),
            'Lost Potential Units': Math.round(p.sessions * 0.03 - p.units),
            'Lost Revenue (₹)': Math.round((p.sessions * 0.03 - p.units) * p.aov).toLocaleString('en-IN'),
            'Issue': 'Low conversion despite traffic',
            'Action': 'Improve images, pricing, bullets, A+ content'
        }));
    
    if (lowConversion.length > 0) {
        const wsLowConv = XLSX.utils.json_to_sheet(lowConversion);
        wsLowConv['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
            { wch: 35 }, { wch: 45 }
        ];
        XLSX.utils.book_append_sheet(wb, wsLowConv, 'Low Conversion - Fix');
    }
    
    // Sheet 6: High Traffic, Low Sales (Opportunity)
    const highTrafficLowSales = products
        .filter(p => p.sessions > 100 && p.conversion < 2.5)
        .sort((a, b) => b.sessions - a.sessions)
        .map(p => {
            const potentialUnits = Math.round(p.sessions * 0.035); // 3.5% conv target
            const lostRevenue = (potentialUnits - p.units) * p.aov;
            
            return {
                'ASIN': p.asin,
                'SKU': p.sku,
                'Product Name': p.name,
                'Sessions': p.sessions,
                'Current Units': p.units,
                'Current Conv %': p.conversion.toFixed(2),
                'Potential Units (3.5% conv)': potentialUnits,
                'Missed Units': potentialUnits - p.units,
                'Missed Revenue (₹)': lostRevenue.toFixed(2),
                'Opportunity Rank': lostRevenue > 10000 ? 'HIGH' : lostRevenue > 5000 ? 'MEDIUM' : 'LOW',
                'Recommended Action': 'Split test: New main image, price adjustment, or A+ content'
            };
        });
    
    if (highTrafficLowSales.length > 0) {
        const wsOpportunity = XLSX.utils.json_to_sheet(highTrafficLowSales);
        wsOpportunity['!cols'] = [
            { wch: 15 }, { wch: 20 }, { wch: 45 }, { wch: 12 },
            { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
            { wch: 20 }, { wch: 18 }, { wch: 55 }
        ];
        XLSX.utils.book_append_sheet(wb, wsOpportunity, 'Quick Win Opportunities');
    }
    
    // Sheet 7: Portfolio Mix Analysis
    const portfolioMix = [
        ['PORTFOLIO COMPOSITION ANALYSIS'],
        [],
        ['Category', 'Count', '% of Products', 'Total Sales', '% of Sales', 'Avg Conversion'],
        []
    ];
    
    const highPerformers = products.filter(p => p.conversion > 3);
    const mediumPerformers = products.filter(p => p.conversion >= 2 && p.conversion <= 3);
    const lowPerformers = products.filter(p => p.conversion < 2 && p.sessions > 20);
    const deadStock = products.filter(p => p.units === 0);
    
    const categories = [
        { name: 'High Performers (>3% conv)', products: highPerformers },
        { name: 'Medium Performers (2-3% conv)', products: mediumPerformers },
        { name: 'Low Performers (<2% conv)', products: lowPerformers },
        { name: 'Dead Stock (0 sales)', products: deadStock }
    ];
    
    categories.forEach(cat => {
        const catSales = cat.products.reduce((s, p) => s + p.sales, 0);
        const avgConv = cat.products.length > 0 ? cat.products.reduce((s, p) => s + p.conversion, 0) / cat.products.length : 0;
        
        portfolioMix.push([
            cat.name,
            cat.products.length,
            `${((cat.products.length / products.length) * 100).toFixed(1)}%`,
            `₹${catSales.toLocaleString('en-IN')}`,
            `${((catSales / totalSales) * 100).toFixed(1)}%`,
            `${avgConv.toFixed(2)}%`
        ]);
    });
    
    portfolioMix.push([]);
    portfolioMix.push(['RECOMMENDATIONS']);
    portfolioMix.push([`→ Focus 80% of PPC budget on ${highPerformers.length} high performers`]);
    portfolioMix.push([`→ Improve listings for ${lowPerformers.length} low performers`]);
    portfolioMix.push([`→ Consider liquidating ${deadStock.length} dead stock items`]);
    
    const wsMix = XLSX.utils.aoa_to_sheet(portfolioMix);
    wsMix['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsMix, 'Portfolio Mix');
}

function createListingExcelFromData(wb) {
    createGenericExcel(wb, extractReportData(), 'Listing Optimization');
}

// FBA Fee Audit Excel - Structured by SKU with clear columns
// Generic fallback export
function createGenericExcel(wb, data, serviceName) {
    const summary = [
        [`VIKREYA ${serviceName.toUpperCase()} REPORT`],
        ['Generated:', data.generatedAt],
        ['Files Analyzed:', data.files.join(', ')],
        [],
        [data.summary.title || ''],
        [data.summary.bigNumber || ''],
        [],
        ...data.summary.meta.map(m => [m])
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Cases overview
    const casesOverview = [
        ['Case #', 'Priority', 'Title', 'Amount']
    ];
    data.cases.forEach(c => {
        casesOverview.push([c.index, c.priority, c.title, c.amount]);
    });
    const wsCases = XLSX.utils.aoa_to_sheet(casesOverview);
    wsCases['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 50 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCases, 'Cases Overview');
}

function downloadPDF(data, serviceName) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = 20;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        const lineHeight = 7;
        const maxWidth = 180;
        
        function checkPage() {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
            }
        }
        
        // Title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Vikreya Analysis Report', margin, yPos);
        yPos += 10;
        
        // Metadata
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Service: ${serviceName}`, margin, yPos);
        yPos += lineHeight;
        doc.text(`Generated: ${data.generatedAt}`, margin, yPos);
        yPos += lineHeight;
        
        const filesText = `Files: ${data.files.join(', ')}`;
        const fileLines = doc.splitTextToSize(filesText, maxWidth);
        fileLines.forEach(line => {
            checkPage();
            doc.text(line, margin, yPos);
            yPos += lineHeight;
        });
        yPos += 5;
        
        checkPage();
        
        // Summary
        if (data.summary.title) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            const titleLines = doc.splitTextToSize(data.summary.title, maxWidth);
            titleLines.forEach(line => {
                checkPage();
                doc.text(line, margin, yPos);
                yPos += lineHeight + 1;
            });
        }
        
        if (data.summary.bigNumber) {
            doc.setFontSize(16);
            doc.setTextColor(16, 185, 129);
            doc.text(data.summary.bigNumber, margin, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += lineHeight + 3;
        }
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        data.summary.meta.forEach(m => {
            checkPage();
            const metaLines = doc.splitTextToSize(m, maxWidth);
            metaLines.forEach(line => {
                checkPage();
                doc.text(line, margin, yPos);
                yPos += lineHeight;
            });
        });
        
        yPos += 5;
        
        // Cases
        data.cases.forEach((caseData, idx) => {
            checkPage();
            
            // Case header
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            const caseTitle = `Case #${caseData.index}: ${caseData.title}`;
            const titleLines = doc.splitTextToSize(caseTitle, maxWidth);
            titleLines.forEach(line => {
                checkPage();
                doc.text(line, margin, yPos);
                yPos += lineHeight;
            });
            
            doc.setFontSize(10);
            if (caseData.priority) {
                doc.text(`Priority: ${caseData.priority}`, margin, yPos);
                yPos += lineHeight;
            }
            if (caseData.amount) {
                doc.text(`Amount: ${caseData.amount}`, margin, yPos);
                yPos += lineHeight;
            }
            yPos += 3;
            
            // Case sections
            doc.setFont(undefined, 'normal');
            caseData.sections.forEach(section => {
                checkPage();
                
                if (section.heading) {
                    doc.setFont(undefined, 'bold');
                    doc.text(section.heading, margin + 5, yPos);
                    yPos += lineHeight;
                    doc.setFont(undefined, 'normal');
                }
                
                section.paragraphs.forEach(p => {
                    const lines = doc.splitTextToSize(p, maxWidth - 5);
                    lines.forEach(line => {
                        checkPage();
                        doc.text(line, margin + 5, yPos);
                        yPos += lineHeight;
                    });
                });
                
                section.lists.forEach((item, i) => {
                    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, maxWidth - 10);
                    lines.forEach(line => {
                        checkPage();
                        doc.text(line, margin + 10, yPos);
                        yPos += lineHeight;
                    });
                });
                
                section.templates.forEach(tmpl => {
                    checkPage();
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'italic');
                    const templateLines = tmpl.split('\n').slice(0, 30);
                    templateLines.forEach(line => {
                        const wrappedLines = doc.splitTextToSize(line, maxWidth - 10);
                        wrappedLines.forEach(wLine => {
                            checkPage();
                            doc.text(wLine, margin + 10, yPos);
                            yPos += 5;
                        });
                    });
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                });
                
                yPos += 3;
            });
            
            yPos += 5;
        });
        
        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128);
            doc.text(`Page ${i} of ${totalPages}`, margin, pageHeight - 10);
            doc.text('vikreya.vercel.app', 105, pageHeight - 10, { align: 'center' });
            doc.setTextColor(0);
        }
        
        const filename = `vikreya-${selectedService}-report-${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(filename);
        showToast('PDF report downloaded!');
        trackEvent('report_downloaded', { format: 'pdf', service: selectedService });
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error generating PDF. Try Excel or Text format.');
    }
}

function downloadText(data, serviceName) {
    let report = `VIKREYA — ${serviceName} Report\n`;
    report += `Generated: ${data.generatedAt}\n`;
    report += `Files analyzed: ${data.files.join(', ')}\n`;
    report += `${'='.repeat(60)}\n\n`;
    
    if (data.summary.title) report += `${data.summary.title}\n`;
    if (data.summary.bigNumber) report += `${data.summary.bigNumber}\n`;
    data.summary.meta.forEach(m => report += `${m}\n`);
    report += '\n';
    
    data.cases.forEach((caseData, idx) => {
        report += `${'─'.repeat(50)}\n`;
        report += `${caseData.priority ? '[' + caseData.priority + '] ' : ''}${caseData.title}`;
        if (caseData.amount) report += `  —  ${caseData.amount}`;
        report += '\n\n';
        
        caseData.sections.forEach(section => {
            if (section.heading) report += `  ${section.heading}\n`;
            section.paragraphs.forEach(p => report += `  ${p}\n`);
            section.lists.forEach((item, i) => report += `  ${i + 1}. ${item}\n`);
            section.templates.forEach(tmpl => {
                report += `\n  --- TEMPLATE ---\n`;
                report += tmpl.split('\n').map(line => `  ${line}`).join('\n');
                report += `\n  --- END ---\n`;
            });
            report += '\n';
        });
        report += '\n';
    });
    
    report += `${'='.repeat(60)}\n`;
    report += `Report generated by Vikreya (vikreya.vercel.app)\n`;
    
    const blob = new Blob([report], { type: 'text/plain; charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vikreya-${selectedService}-report-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Text report downloaded!');
    trackEvent('report_downloaded', { format: 'text', service: selectedService });
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

function submitEmail(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('emailInput');
    if (!input) return false;
    const email = input.value.trim();
    if (!email || !email.includes('@')) { input.style.borderColor = '#dc2626'; return false; }

    // Save to localStorage as backup
    const emails = JSON.parse(localStorage.getItem('vikreya_emails') || '[]');
    if (!emails.includes(email)) { emails.push(email); localStorage.setItem('vikreya_emails', JSON.stringify(emails)); }

    // Send to Formspree (replace YOUR_FORM_ID with real one after setup)
    const formEl = document.getElementById('emailForm');
    const formAction = formEl ? formEl.getAttribute('action') : '';
    if (formAction && !formAction.includes('YOUR_FORM_ID')) {
        fetch(formAction, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: email, source: 'vikreya-waitlist', timestamp: new Date().toISOString() })
        }).catch(() => {}); // Silent fail — we have localStorage backup
    }

    // UI update
    if (formEl) formEl.style.display = 'none';
    const success = document.getElementById('emailSuccess');
    if (success) success.style.display = 'block';
    trackEvent('email_collected', email);
    showToast("You're on the list!");
    return false;
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
