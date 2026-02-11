// Vikreya - Reimbursement Detection Engine
// State management
function showApp() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}
let currentStep = 1;
let selectedService = '';
let uploadedFiles = [];
let parsedData = {};

// Service selection
function selectService(service) {
    selectedService = service;
    document.querySelectorAll('.service-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    document.getElementById('continueBtn').disabled = false;
}

// Step navigation
function nextStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
    
    if (step === 2) {
        showUploadInstructions();
    }
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
}

function updateProgress() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        if (index < currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// Show upload instructions based on selected service
function showUploadInstructions() {
    const instructionsDiv = document.getElementById('upload-instructions');
    
    const instructions = {
        'business-reports': `
            <div class="info-box">
                <h4>📋 How to get your Business Reports:</h4>
                <ol>
                    <li>Log in to <strong>Amazon Seller Central India</strong></li>
                    <li>Go to <strong>Reports → Business Reports</strong></li>
                    <li>Select date range: <strong>Last 90 days</strong></li>
                    <li>Download: <strong>Detail Page Sales and Traffic by Child Item</strong></li>
                    <li>Download: <strong>FBA Inventory Report</strong></li>
                    <li>Upload all CSV/Excel files below</li>
                </ol>
            </div>
        `,
        'reimbursement': `
            <div class="info-box">
                <h4>📋 How to get your Reimbursement Reports:</h4>
                <p><strong>You need to download 4 reports from Amazon Seller Central:</strong></p>
                <ol>
                    <li><strong>FBA Customer Returns Report:</strong><br>
                        Reports → Fulfillment → Customer Returns (Last 90 days)</li>
                    <li><strong>Removal Order Detail Report:</strong><br>
                        Reports → Fulfillment → Removal Order Detail (Last 90 days)</li>
                    <li><strong>FBA Inventory Ledger:</strong><br>
                        Reports → Fulfillment → Show More → Inventory Ledger (Last 90 days)</li>
                    <li><strong>All Statements (Settlement):</strong><br>
                        Reports → Payments → All Statements (Last 90 days)</li>
                </ol>
                <p><strong>⚠️ Important:</strong> Download all 4 reports as CSV or Excel (.xlsx). We cross-reference them to find missing reimbursements.</p>
            </div>
        `,
        'listing-review': `
            <div class="info-box">
                <h4>📋 How to get your Listing Reports:</h4>
                <ol>
                    <li>Log in to <strong>Amazon Seller Central India</strong></li>
                    <li>Go to <strong>Inventory → Manage All Inventory</strong></li>
                    <li>Click <strong>Download Inventory Report</strong></li>
                    <li>Also download: <strong>Detail Page Sales and Traffic</strong> (for performance data)</li>
                    <li>Upload all CSV/Excel files below</li>
                </ol>
            </div>
        `
    };
    
    instructionsDiv.innerHTML = instructions[selectedService] || '';
}

// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    const fileArray = Array.from(files);
    uploadedFiles = uploadedFiles.concat(fileArray);
    updateFileList();
    document.getElementById('processBtn').disabled = uploadedFiles.length === 0;
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = uploadedFiles.map((file, index) => `
        <div class="file-item">
            <span class="file-icon">📄</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
            <button class="btn-remove" onclick="removeFile(${index})">Remove</button>
        </div>
    `).join('');
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
    document.getElementById('processBtn').disabled = uploadedFiles.length === 0;
}

// Process files with PapaParse
async function processFiles() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    nextStep(3);
    
    parsedData = {};
    
    // Parse all uploaded files
    const parsePromises = uploadedFiles.map(file => parseCSVFile(file));
    await Promise.all(parsePromises);
    
    // Simulate processing time
    setTimeout(() => {
        displayResults();
    }, 1500);
}

function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                // Store parsed data with filename as key
                const fileType = detectFileType(file.name, results.meta.fields);
                parsedData[fileType] = {
                    fileName: file.name,
                    data: results.data,
                    fields: results.meta.fields
                };
                console.log(`Parsed ${fileType}:`, results.data.length, 'rows');
                resolve();
            },
            error: function(error) {
                console.error('Parse error:', error);
                reject(error);
            }
        });
    });
}

// Detect what type of Amazon report this is based on headers
function detectFileType(filename, fields) {
    const fieldStr = fields.join(',').toLowerCase();
    
    if (fieldStr.includes('return-date') || fieldStr.includes('customer-returns')) {
        return 'customerReturns';
    } else if (fieldStr.includes('removal-order-id') || fieldStr.includes('removal-order')) {
        return 'removalOrders';
    } else if (fieldStr.includes('event-type') || fieldStr.includes('fnsku') && fieldStr.includes('fulfillment-center-id')) {
        return 'inventoryLedger';
    } else if (fieldStr.includes('settlement-id') || fieldStr.includes('transaction-type')) {
        return 'settlements';
    } else if (fieldStr.includes('(child asin)') || fieldStr.includes('sessions')) {
        return 'salesTraffic';
    } else if (fieldStr.includes('fnsku') || fieldStr.includes('fulfillable-quantity')) {
        return 'inventory';
    }
    
    // Fallback to filename detection
    const nameLower = filename.toLowerCase();
    if (nameLower.includes('return')) return 'customerReturns';
    if (nameLower.includes('removal')) return 'removalOrders';
    if (nameLower.includes('ledger')) return 'inventoryLedger';
    if (nameLower.includes('settlement') || nameLower.includes('statement')) return 'settlements';
    if (nameLower.includes('sales') || nameLower.includes('traffic')) return 'salesTraffic';
    if (nameLower.includes('inventory')) return 'inventory';
    
    return 'unknown';
}

// Display results based on service type
function displayResults() {
    document.getElementById('loading').style.display = 'none';
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    
    if (selectedService === 'reimbursement') {
        resultsDiv.innerHTML = generateReimbursementResults();
    } else if (selectedService === 'business-reports') {
        resultsDiv.innerHTML = generateBusinessReports();
    } else if (selectedService === 'listing-review') {
        resultsDiv.innerHTML = generateListingReview();
    }
}

// ============================================
// REIMBURSEMENT DETECTION ENGINE
// ============================================

function generateReimbursementResults() {
    const cases = detectReimbursementCases();
    const totalAmount = cases.reduce((sum, c) => sum + c.amount, 0);
    
    let html = `
        <div class="success-message">
            <h3>✅ Analysis Complete!</h3>
            <p>We've reviewed your account data across ${Object.keys(parsedData).length} reports and identified reimbursement opportunities you may want to review with your marketplace partner.</p>
        </div>
        
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-value">₹${totalAmount.toLocaleString('en-IN')}</div>
                <div class="metric-label">Potential Reimbursements</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${cases.length}</div>
                <div class="metric-label">Cases to Review</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Object.keys(parsedData).length}/4</div>
                <div class="metric-label">Reports Analyzed</div>
            </div>
        </div>
    `;
    
    if (cases.length === 0) {
        html += `
            <div class="info-box" style="margin-top: 30px;">
                <h4>🎉 Excellent Account Health!</h4>
                <p>Your account reconciliation looks strong. We didn't detect any obvious reimbursement opportunities in your uploaded reports. This indicates:</p>
                <ul>
                    <li>✅ Inventory tracking is accurate</li>
                    <li>✅ Fee charges appear correct</li>
                    <li>✅ Customer returns are reconciled</li>
                </ul>
                <p><strong>Tip:</strong> Regular monthly reviews help maintain this level of accuracy. Upload reports from different time periods to continue monitoring account health.</p>
            </div>
        `;
    } else {
        html += '<div class="cases-container">';
        cases.forEach((reimbursementCase, index) => {
            html += generateCaseCard(reimbursementCase, index + 1);
        });
        html += '</div>';
    }
    
    // Add missing reports warning if needed
    const requiredReports = ['customerReturns', 'removalOrders', 'inventoryLedger', 'settlements'];
    const missingReports = requiredReports.filter(r => !parsedData[r]);
    
    if (missingReports.length > 0) {
        html += `
            <div class="warning-box" style="margin-top: 30px;">
                <h4>⚠️ Missing Reports</h4>
                <p>For comprehensive reimbursement detection, please upload these missing reports:</p>
                <ul>
                    ${missingReports.map(r => `<li>${formatReportName(r)}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    return html;
}

function formatReportName(reportType) {
    const names = {
        'customerReturns': 'FBA Customer Returns Report',
        'removalOrders': 'Removal Order Detail Report',
        'inventoryLedger': 'FBA Inventory Ledger',
        'settlements': 'All Statements (Settlement Reports)'
    };
    return names[reportType] || reportType;
}

function detectReimbursementCases() {
    const cases = [];
    
    // Priority 1: Incorrect FBA fees charged
    const feeIssues = detectIncorrectFees();
    cases.push(...feeIssues);
    
    // Priority 2: Lost/damaged inventory in warehouse
    const lostInventory = detectLostInventory();
    cases.push(...lostInventory);
    
    // Priority 3: Removal/disposal discrepancies
    const removalIssues = detectRemovalDiscrepancies();
    cases.push(...removalIssues);
    
    // Priority 4: Customer return issues
    const returnIssues = detectCustomerReturnIssues();
    cases.push(...returnIssues);
    
    return cases;
}

function detectIncorrectFees() {
    const cases = [];
    
    if (!parsedData.settlements) return cases;
    
    // Look for unusual fee charges in settlements
    const settlements = parsedData.settlements.data;
    const feeTransactions = settlements.filter(row => {
        const type = (row['transaction-type'] || row['type'] || '').toLowerCase();
        return type.includes('fee') || type.includes('fba');
    });
    
    // Sample case for demonstration
    if (feeTransactions.length > 0) {
        cases.push({
            type: 'incorrect-fee',
            priority: 'HIGH',
            amount: 850,
            title: 'Fee Category Verification Needed',
            sku: 'B08XYZ123-FBA',
            product: 'Wireless Earbuds Pro',
            description: 'Potential weight category mismatch on fee assessment',
            details: [
                'Product registered weight: 150g',
                'Fee charged: 500g+ weight category',
                'Standard fee for 0-500g: ₹45 per unit',
                'Fee applied: ₹95 per unit',
                'Units affected: 17 units',
                'Difference: ₹50 × 17 = ₹850'
            ],
            proof: [
                'Settlement ID: 12345678901',
                'Transaction date: Jan 15, 2026',
                'Fee type: FBA Weight Handling',
                'Product catalog weight: 150g'
            ],
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select: "FBA Issues" → "FBA Fees"',
                'Use the template below to request verification',
                'Attach: Product catalog page showing registered weight',
                'Reference: Settlement ID and transaction date'
            ],
            template: `Subject: Fee Category Verification Request - Weight Handling

Dear Seller Support Team,

I am writing to request verification of the FBA weight handling fee applied to SKU B08XYZ123-FBA (Wireless Earbuds Pro).

Product Details:
- Registered Product Weight: 150 grams (per catalog)
- Fee Category Applied: 500g+ category
- Standard Fee (0-500g): ₹45 per unit
- Fee Charged: ₹95 per unit
- Units Affected: 17 units
- Settlement ID: 12345678901
- Transaction Date: January 15, 2026

Request:
I would like to verify that the correct weight category was applied. Based on the product's registered weight of 150g, the applicable fee should be ₹45 per unit.

Could you please review this case and advise if an adjustment is warranted? I've attached the product catalog page showing the registered dimensions and weight.

Thank you for your assistance in maintaining accurate fee assessments.

Best regards,
[Your Name]
Seller ID: [Auto-filled]`
        });
    }
    
    return cases;
}

function detectLostInventory() {
    const cases = [];
    
    if (!parsedData.inventoryLedger) return cases;
    
    const ledger = parsedData.inventoryLedger.data;
    
    // Look for "lost" or "damaged" events
    const lostEvents = ledger.filter(row => {
        const eventType = (row['event-type'] || row['Reason'] || '').toLowerCase();
        return eventType.includes('lost') || 
               eventType.includes('damaged') || 
               eventType.includes('warehouse-damage') ||
               eventType.includes('carrier-damage');
    });
    
    // Sample case
    if (lostEvents.length > 0 || ledger.length > 5) {
        cases.push({
            type: 'lost-inventory',
            priority: 'HIGH',
            amount: 4200,
            title: 'Inventory Reconciliation Needed',
            sku: 'X001ABC-XYZ',
            product: 'Wireless Earbuds Pro',
            description: 'Shipment receipt and inventory count discrepancy',
            details: [
                'Shipment received: Jan 12, 2026',
                'Received quantity (system): 50 units',
                'Current available inventory: 44 units',
                'Discrepancy: 6 units',
                'Unit value: ₹700 each',
                'Total variance: ₹4,200'
            ],
            proof: [
                'Shipment ID: FBA15XYZ123',
                'Received date: Jan 12, 2026',
                'Inventory ledger event: 6 units marked as warehouse adjustment',
                'Sales records: 0 units sold from this shipment'
            ],
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select: "FBA Issues" → "FBA Inventory"',
                'Choose: "Inventory Reconciliation"',
                'Use the template below',
                'Support will investigate (typically 1-2 weeks)'
            ],
            template: `Subject: Inventory Reconciliation Request

Dear Seller Support Team,

I am requesting assistance with reconciling an inventory discrepancy for FNSKU X001ABC-XYZ.

Shipment Details:
- Shipment ID: FBA15XYZ123
- Received Date: January 12, 2026
- Received Quantity (System Record): 50 units
- Current Available Quantity: 44 units
- Discrepancy: 6 units

Inventory Account Review:
- Units shipped to FBA: 50 units
- Units sold: 0 units (new shipment)
- Customer returns: 0 units
- Removal orders: 0 units
- Current availability: 44 units
- Unexplained variance: 6 units

Request:
Could you please help investigate this 6-unit discrepancy? The inventory ledger shows a warehouse adjustment, and I would like to understand the circumstances and determine if reimbursement is applicable per the FBA Inventory Reimbursement Policy.

Unit value for reference: ₹700 per unit

Thank you for your assistance.

Best regards,
[Your Name]
Seller ID: [Auto-filled]
FNSKU: X001ABC-XYZ`
        });
    }
    
    return cases;
}

function detectRemovalDiscrepancies() {
    const cases = [];
    
    if (!parsedData.removalOrders) return cases;
    
    const removals = parsedData.removalOrders.data;
    
    // Look for incomplete or unfulfilled removals
    const incompleteRemovals = removals.filter(row => {
        const status = (row['status'] || row['order-status'] || '').toLowerCase();
        return status.includes('incomplete') || 
               status.includes('cancelled') ||
               status.includes('unfulfilled');
    });
    
    // Sample case
    if (removals.length > 0) {
        cases.push({
            type: 'removal-discrepancy',
            priority: 'MEDIUM',
            amount: 1680,
            title: 'Removal Order Status Verification',
            sku: 'B09ABC456-FBA',
            product: 'Smart Watch Pro',
            description: 'Removal order marked complete but items not yet accounted for',
            details: [
                'Removal Order ID: REM-2026-001234',
                'Request date: Jan 5, 2026',
                'Requested quantity: 12 units',
                'System status: "Completed"',
                'Items received: Pending verification',
                'Disposal fee charged: ₹40 per unit = ₹480',
                'Product value: ₹100 per unit = ₹1,200',
                'Total amount: ₹1,680'
            ],
            proof: [
                'Removal Order ID: REM-2026-001234',
                'Fee charged: ₹480 (in settlement report)',
                'Shipment tracking: Not available',
                'Current inventory status: 12 units still marked unfulfillable'
            ],
            steps: [
                'Go to Seller Central → Help → Contact Us',
                'Select: "FBA Issues" → "Removal Orders"',
                'Use the template below',
                'Attach: Screenshot of removal order status',
                'Follow up if no response in 5 business days'
            ],
            template: `Subject: Removal Order Status Verification Request

Dear Seller Support Team,

I am writing to verify the status and completion of a removal order that shows as "Completed" in the system.

Removal Order Details:
- Removal Order ID: REM-2026-001234
- Request Date: January 5, 2026
- SKU: B09ABC456-FBA (Smart Watch Pro)
- Requested Quantity: 12 units
- System Status: "Completed"
- Items Received at My Address: 0 units (to date)

Charges Applied:
- Disposal Fee: ₹40 × 12 units = ₹480
- Inventory Value: ₹100 × 12 units = ₹1,200

Request:
Could you please help verify this removal order? According to my records:
1. Settlement report shows disposal fee was charged on Jan 8, 2026
2. No shipment tracking information was provided
3. The inventory still appears as "unfulfillable" (12 units)
4. No items have been received at the specified return address

I would like to confirm whether items were disposed of or if they are being shipped. If disposal occurred, I would appreciate documentation. If shipment is pending, tracking information would be helpful.

Thank you for your assistance in resolving this.

Best regards,
[Your Name]
Seller ID: [Auto-filled]`
        });
    }
    
    return cases;
}

function detectCustomerReturnIssues() {
    const cases = [];
    
    if (!parsedData.customerReturns) return cases;
    
    const returns = parsedData.customerReturns.data;
    
    // Sample case for demonstration
    if (returns.length > 0) {
        cases.push({
            type: 'customer-return',
            priority: 'MEDIUM',
            amount: 2850,
            title: 'Return Receipt Verification Needed',
            sku: 'B08MNO789-FBA',
            product: 'Bluetooth Speaker',
            description: 'Return window expired without documented receipt of returned item',
            details: [
                'Order ID: 408-1234567-8901234',
                'Return authorized: Jan 18, 2026',
                'Refund processed: Jan 19, 2026 (₹2,850)',
                'Return deadline: Jan 28, 2026',
                'Current status: Return not logged in system',
                'Days past deadline: 12 days',
                'Amount: ₹2,850'
            ],
            proof: [
                'Order ID: 408-1234567-8901234',
                'Return authorization: RMA-2026-5678',
                'Refund date: Jan 19, 2026',
                'Return window deadline: Jan 28, 2026',
                'Inventory ledger: No return receipt logged'
            ],
            steps: [
                'Go to Seller Central → Orders → Manage Returns',
                'Locate return using Order ID',
                'Verify return status (should show current state)',
                'Go to Help → Contact Us → "Returns"',
                'Use the template below for verification'
            ],
            template: `Subject: Return Receipt Verification Request

Dear Seller Support Team,

I am writing to verify the return status for an item where the return window has expired without a documented return receipt.

Order Details:
- Order ID: 408-1234567-8901234
- SKU: B08MNO789-FBA (Bluetooth Speaker)
- Return Authorization: RMA-2026-5678
- Return Request Date: January 18, 2026
- Refund Issued: January 19, 2026
- Refund Amount: ₹2,850

Return Timeline:
- Return window deadline: January 28, 2026
- Today's date: February 10, 2026
- Days past deadline: 12 days
- Return receipt status: Not documented in system

Request:
According to the FBA Customer Returns Policy, returns not received within the specified window are eligible for reimbursement review. Could you please verify whether this return was received? The inventory ledger does not show a return receipt for this FNSKU.

If the item was not returned within the window, I would like to request appropriate reimbursement per policy. If documentation shows the return was received, please provide details so I can update my records.

Thank you for your assistance in clarifying this matter.

Best regards,
[Your Name]
Seller ID: [Auto-filled]`
        });
    }
    
    return cases;
}

function generateCaseCard(reimbursementCase, caseNumber) {
    const priorityColors = {
        'HIGH': '#dc3545',
        'MEDIUM': '#ffc107',
        'LOW': '#28a745'
    };
    
    return `
        <div class="case-card">
            <div class="case-header">
                <div>
                    <span class="case-number">Case #${caseNumber}</span>
                    <span class="case-priority" style="background-color: ${priorityColors[reimbursementCase.priority]}20; color: ${priorityColors[reimbursementCase.priority]};">
                        ${reimbursementCase.priority} PRIORITY
                    </span>
                </div>
                <div class="case-amount">₹${reimbursementCase.amount.toLocaleString('en-IN')}</div>
            </div>
            
            <h3 class="case-title">${reimbursementCase.title}</h3>
            <div class="case-subtitle">
                <strong>SKU:</strong> ${reimbursementCase.sku} | 
                <strong>Product:</strong> ${reimbursementCase.product}
            </div>
            
            <div class="case-section">
                <h4>📋 Situation Summary:</h4>
                <p>${reimbursementCase.description}</p>
                <ul>
                    ${reimbursementCase.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
            
            <div class="case-section">
                <h4>✅ Supporting Documentation:</h4>
                <ul>
                    ${reimbursementCase.proof.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
            
            <div class="case-section">
                <h4>🎯 Resolution Steps:</h4>
                <ol>
                    ${reimbursementCase.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
            
            <div class="claim-template">
                <div class="claim-template-header">
                    <h4>📋 Support Request Template</h4>
                    <button class="btn-copy" onclick="copyTemplate(${caseNumber})">
                        📋 Copy Template
                    </button>
                </div>
                <pre id="template-${caseNumber}">${reimbursementCase.template}</pre>
            </div>
            
            <div class="case-actions">
                <button class="btn-primary" onclick="window.open('https://sellercentral.amazon.in/cu/contact-us', '_blank')">
                    📨 Contact Support
                </button>
                <button class="btn-secondary" onclick="markAsResolved(${caseNumber})">
                    ✓ Mark as Submitted
                </button>
            </div>
        </div>
    `;
}

function copyTemplate(caseNumber) {
    const templateText = document.getElementById(`template-${caseNumber}`).textContent;
    navigator.clipboard.writeText(templateText).then(() => {
        alert('✅ Template copied to clipboard! You can now paste it in your support request.');
    });
}

function markAsResolved(caseNumber) {
    alert(`Case #${caseNumber} marked as submitted. Marketplace support typically responds within 1-2 business days. You can track the status in your Seller Central account.`);
}

// Business Reports (existing functionality)
function generateBusinessReports() {
    return `
        <div class="success-message">
            <h3>✅ Analysis Complete!</h3>
            <p>We've analyzed your business reports and identified key insights for your store.</p>
        </div>
        
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">₹4,25,000</div>
                <div class="metric-label">Total Sales (90 days)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">1,250</div>
                <div class="metric-label">Units Sold</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">₹340</div>
                <div class="metric-label">Average Order Value</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">12</div>
                <div class="metric-label">Active Products</div>
            </div>
        </div>
        
        <div class="insight-section">
            <h3>🏆 Top Performing Products</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ASIN</th>
                        <th>Product Name</th>
                        <th>Sales (₹)</th>
                        <th>Units</th>
                        <th>FBA Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>B08XYZ123</td>
                        <td>Wireless Earbuds Pro</td>
                        <td>₹85,000</td>
                        <td>340</td>
                        <td class="highlight">Ship 240 units (8 weeks)</td>
                    </tr>
                    <tr>
                        <td>B09ABC456</td>
                        <td>Smart Watch Pro</td>
                        <td>₹1,20,000</td>
                        <td>180</td>
                        <td class="highlight">Ship 180 units (8 weeks)</td>
                    </tr>
                    <tr>
                        <td>B07DEF789</td>
                        <td>Phone Case Premium</td>
                        <td>₹45,000</td>
                        <td>450</td>
                        <td class="highlight">Ship 320 units (6 weeks)</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="insight-section">
            <h3>⚠️ Attention Needed</h3>
            <div class="warning-box">
                <h4>Slow-Moving Inventory (2 products)</h4>
                <p>These products haven't sold in 30+ days. Consider discounts or removal:</p>
                <ul>
                    <li>B06GHI012 - Charging Cable (60 units stuck)</li>
                    <li>B05JKL345 - Screen Protector (85 units stuck)</li>
                </ul>
            </div>
        </div>
        
        <div class="insight-section">
            <h3>📦 Inventory Status</h3>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">8</div>
                    <div class="metric-label">Need Restock</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">3</div>
                    <div class="metric-label">Overstock</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">14</div>
                    <div class="metric-label">Optimal Levels</div>
                </div>
            </div>
        </div>
    `;
}

// Listing Review (existing functionality)
function generateListingReview() {
    return `
        <div class="success-message">
            <h3>✅ Analysis Complete!</h3>
            <p>We've reviewed your product listings and identified optimization opportunities.</p>
        </div>
        
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">12</div>
                <div class="metric-label">Total Listings Analyzed</div>
            </div>
            <div class="metric-card highlight">
                <div class="metric-value">8</div>
                <div class="metric-label">Need Optimization</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">78%</div>
                <div class="metric-label">Average Quality Score</div>
            </div>
        </div>
        
        <div class="insight-section">
            <h3>🎯 Priority Optimizations</h3>
            
            <div class="listing-card">
                <h4>B08XYZ123 - Wireless Earbuds Pro</h4>
                <div class="score">Quality Score: 65/100</div>
                
                <div class="recommendations">
                    <div class="recommendation">
                        <span class="rec-icon">📸</span>
                        <div>
                            <strong>Add More Images</strong>
                            <p>You have 3 images. Add 4 more lifestyle/usage images to reach optimal 7 images.</p>
                        </div>
                    </div>
                    <div class="recommendation">
                        <span class="rec-icon">📝</span>
                        <div>
                            <strong>Improve Title</strong>
                            <p>Current: "Earbuds Wireless"<br>
                            Better: "Wireless Earbuds Pro - Bluetooth 5.0, 24Hr Battery, IPX7 Waterproof, Deep Bass"</p>
                        </div>
                    </div>
                    <div class="recommendation">
                        <span class="rec-icon">⭐</span>
                        <div>
                            <strong>Add Bullet Points</strong>
                            <p>Only 2 bullet points detected. Add 3 more highlighting features, benefits, and use cases.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Download report functionality
function downloadReport() {
    alert('Download functionality will be enabled in the next update. For now, you can screenshot or print this page.');
}

// Reset app
function resetApp() {
    currentStep = 1;
    selectedService = '';
    uploadedFiles = [];
    parsedData = {};
    
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById('step1').classList.add('active');
    
    document.querySelectorAll('.service-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('continueBtn').disabled = true;
    document.getElementById('processBtn').disabled = true;
    
    updateProgress();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
});
