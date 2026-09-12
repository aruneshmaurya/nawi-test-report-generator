import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let docaLogoBase64 = '';
try {
  const logoPath = path.resolve(__dirname, '../assets/doca_logo.png');
  if (fs.existsSync(logoPath)) {
    docaLogoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }
} catch (e) {
  console.warn('Could not load doca_logo.png:', e.message);
}

/**
 * OIML R-76 NAWI Verification Test Certificate HTML Template
 * Conforms to Section 7 of MVP Reference & OIML R-76-2 Model Certificate
 */

export const generateReportHtml = ({
  report,
  session,
  instrument,
  environment,
  referenceWeights,
  tests,
  qrDataUrl,
  verificationUrl,
  signature
}) => {
  const isPass = report.overall_result === 'PASS';
  const issueDate = new Date(report.generated_at || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const lab = session.lab || {
    name: session.lab_name || 'National Metrology Laboratory',
    registration_no: session.lab_registration_no || 'NABL-OIML-2026-001',
    address: session.lab_address || 'Government Metrology Complex, New Delhi, India'
  };

  const mfr = instrument.manufacturer_name || 'Generic / Standard Manufacturer';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OIML R-76 Verification Certificate - ${report.report_number}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    body {
      color: #1a202c;
      font-size: 11pt;
      line-height: 1.4;
      background: #ffffff;
    }
    .certificate-container {
      border: 2px solid #0b2545;
      padding: 16px;
      min-height: 98%;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0b2545;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .emblem-title {
      font-size: 14pt;
      font-weight: 700;
      color: #0b2545;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 10pt;
      color: #4a5568;
      font-weight: 600;
      margin-top: 2px;
    }
    .standard-ref {
      font-size: 8.5pt;
      color: #718096;
      margin-top: 4px;
      font-style: italic;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      background: #f7fafc;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 9.5pt;
    }
    .doc-meta strong {
      color: #0b2545;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0b2545;
      border-bottom: 1.5px solid #cbd5e0;
      padding-bottom: 3px;
      margin-top: 12px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
      font-size: 9.5pt;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #e2e8f0;
      padding-bottom: 2px;
    }
    .info-label {
      color: #4a5568;
      font-weight: 500;
    }
    .info-value {
      color: #1a202c;
      font-weight: 600;
      text-align: right;
    }
    table.test-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 12px;
    }
    table.test-table th {
      background-color: #0b2545;
      color: #ffffff;
      font-weight: 600;
      text-align: center;
      padding: 5px 6px;
      border: 1px solid #0b2545;
    }
    table.test-table td {
      border: 1px solid #cbd5e0;
      padding: 4px 6px;
      text-align: center;
    }
    table.test-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .badge-pass {
      color: #22543d;
      background-color: #c6f6d5;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }
    .badge-fail {
      color: #742a2a;
      background-color: #fed7d7;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
    }
    .verdict-box {
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 6px;
      text-align: center;
      border: 2px solid ${isPass ? '#28a745' : '#dc3545'};
      background-color: ${isPass ? '#f0fff4' : '#fff5f5'};
    }
    .verdict-text {
      font-size: 13pt;
      font-weight: 800;
      color: ${isPass ? '#22543d' : '#9b2c2c'};
      letter-spacing: 0.5px;
    }
    .verdict-reason {
      font-size: 9.5pt;
      margin-top: 4px;
      color: #4a5568;
    }
    .signoff-section {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1.5px solid #cbd5e0;
      padding-top: 12px;
    }
    .sign-box {
      width: 38%;
      font-size: 9pt;
      text-align: center;
    }
    .sign-line {
      border-bottom: 1px solid #4a5568;
      height: 38px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .signature-img {
      max-height: 34px;
      max-width: 140px;
    }
    .qr-box {
      width: 20%;
      text-align: center;
    }
    .qr-img {
      width: 76px;
      height: 76px;
    }
    .qr-caption {
      font-size: 7.5pt;
      color: #718096;
      margin-top: 2px;
    }
    .footer-note {
      font-size: 7.5pt;
      color: #a0aec0;
      text-align: center;
      margin-top: 10px;
      border-top: 1px dotted #e2e8f0;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- Header -->
    <div class="header">
      ${docaLogoBase64 ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${docaLogoBase64}" style="height: 48px; object-fit: contain;" alt="Department of Consumer Affairs" /></div>` : ''}
      <div class="emblem-title">${lab.name}</div>
      <div class="sub-title">OIML Type-Evaluation & Verification Testing Laboratory</div>
      <div class="standard-ref">Compliant with OIML R-76-1:2006 & Legal Metrology Act, 2009 | Registration No: ${lab.registration_no}</div>
    </div>

    <!-- Document Metadata -->
    <div class="doc-meta">
      <div><strong>Report No:</strong> ${report.report_number}</div>
      <div><strong>Session No:</strong> ${session.session_number}</div>
      <div><strong>Verification Type:</strong> ${session.verification_type}</div>
      <div><strong>Date of Issue:</strong> ${issueDate}</div>
    </div>

    <!-- Instrument Identification -->
    <div class="section-title">1. Instrument Identification</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Manufacturer:</span><span class="info-value">${mfr}</span></div>
      <div class="info-row"><span class="info-label">Model / Type:</span><span class="info-value">${instrument.model}</span></div>
      <div class="info-row"><span class="info-label">Serial Number:</span><span class="info-value">${instrument.serial_number}</span></div>
      <div class="info-row"><span class="info-label">Accuracy Class:</span><span class="info-value">Class ${instrument.accuracy_class}</span></div>
      <div class="info-row"><span class="info-label">Max Capacity (Max):</span><span class="info-value">${instrument.capacity_max}</span></div>
      <div class="info-row"><span class="info-label">Min Capacity (Min):</span><span class="info-value">${instrument.capacity_min || 0}</span></div>
      <div class="info-row"><span class="info-label">Verification Scale Interval (e):</span><span class="info-value">${instrument.verification_interval_e}</span></div>
      <div class="info-row"><span class="info-label">No. of Scale Intervals (n):</span><span class="info-value">${instrument.verification_intervals_n}</span></div>
    </div>

    <!-- Test Conditions -->
    <div class="section-title">2. Environmental Conditions & Standards</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Ambient Temperature:</span><span class="info-value">${environment?.temperature ? environment.temperature + ' °C' : '20.0 °C'}</span></div>
      <div class="info-row"><span class="info-label">Relative Humidity:</span><span class="info-value">${environment?.humidity ? environment.humidity + ' %' : '50.0 %'}</span></div>
      <div class="info-row"><span class="info-label">Atmospheric Pressure:</span><span class="info-value">${environment?.atmospheric_pressure ? environment.atmospheric_pressure + ' hPa' : '1013.2 hPa'}</span></div>
      <div class="info-row"><span class="info-label">Power Supply:</span><span class="info-value">${environment?.supply_voltage ? environment.supply_voltage + ' V / ' + (environment.frequency || 50) + ' Hz' : '230 V / 50 Hz'}</span></div>
    </div>

    <!-- Reference Weights -->
    ${
      referenceWeights && referenceWeights.length > 0
        ? `<div style="font-size: 8.5pt; color: #4a5568; margin-bottom: 8px;">
            <strong>Reference Standard Weights:</strong> ${referenceWeights.map((w) => `${w.nominal_value}g (${w.weight_class || 'Class F1'}, Cert: ${w.certificate_no || 'N/A'})`).join('; ')}
           </div>`
        : ''
    }

    <!-- 3. Test Results -->
    <div class="section-title">3. OIML R-76 Test Results</div>

    <!-- ACCURACY TEST -->
    ${
      tests.ACCURACY && tests.ACCURACY.readings && tests.ACCURACY.readings.length > 0
        ? `
      <div style="font-weight: 700; font-size: 9.5pt; margin: 4px 0;">3.1 Accuracy Test of Indication</div>
      <table class="test-table">
        <thead>
          <tr>
            <th>Load Point</th>
            <th>Standard Load</th>
            <th>Indicated Value</th>
            <th>Error (E)</th>
            <th>MPE (±)</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${tests.ACCURACY.readings
            .map(
              (r) => `
            <tr>
              <td>${r.extra_data?.load_point || r.reading_no || '-'}</td>
              <td>${r.standard_value}</td>
              <td>${r.indicated_value}</td>
              <td>${r.error > 0 ? '+' : ''}${r.error}</td>
              <td>±${r.mpe}</td>
              <td><span class="${r.result === 'PASS' ? 'badge-pass' : 'badge-fail'}">${r.result}</span></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : ''
    }

    <!-- ECCENTRICITY TEST -->
    ${
      tests.ECCENTRICITY && tests.ECCENTRICITY.readings && tests.ECCENTRICITY.readings.length > 0
        ? `
      <div style="font-weight: 700; font-size: 9.5pt; margin: 4px 0;">3.2 Eccentricity (Corner Load) Test</div>
      <table class="test-table">
        <thead>
          <tr>
            <th>Platform Position</th>
            <th>Standard Load</th>
            <th>Indicated Value</th>
            <th>Error (E)</th>
            <th>MPE (±)</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${tests.ECCENTRICITY.readings
            .map(
              (r) => `
            <tr>
              <td>${r.position || 'Centre'}</td>
              <td>${r.standard_value}</td>
              <td>${r.indicated_value}</td>
              <td>${r.error > 0 ? '+' : ''}${r.error}</td>
              <td>±${r.mpe}</td>
              <td><span class="${r.result === 'PASS' ? 'badge-pass' : 'badge-fail'}">${r.result}</span></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : ''
    }

    <!-- REPEATABILITY TEST -->
    ${
      tests.REPEATABILITY && tests.REPEATABILITY.readings && tests.REPEATABILITY.readings.length > 0
        ? `
      <div style="font-weight: 700; font-size: 9.5pt; margin: 4px 0;">3.3 Repeatability Test</div>
      <table class="test-table">
        <thead>
          <tr>
            <th>Applied Load</th>
            <th>Trial Readings (Observed)</th>
            <th>Calculated Spread (Max - Min)</th>
            <th>MPE Limit</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${tests.REPEATABILITY.readings
            .map(
              (r) => `
            <tr>
              <td>${r.standard_value || r.extra_data?.load_value}</td>
              <td>[${(r.extra_data?.indicated_values || []).join(', ')}]</td>
              <td>${r.error || r.extra_data?.spread}</td>
              <td>${r.mpe}</td>
              <td><span class="${r.result === 'PASS' ? 'badge-pass' : 'badge-fail'}">${r.result}</span></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : ''
    }

    <!-- DISCRIMINATION TEST -->
    ${
      tests.DISCRIMINATION && tests.DISCRIMINATION.readings && tests.DISCRIMINATION.readings.length > 0
        ? `
      <div style="font-weight: 700; font-size: 9.5pt; margin: 4px 0;">3.4 Discrimination Test (1.4d Extra Load)</div>
      <table class="test-table">
        <thead>
          <tr>
            <th>Base Load</th>
            <th>Added Load (+1.4d)</th>
            <th>Initial Reading</th>
            <th>Observed After Addition</th>
            <th>Display Changed?</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${tests.DISCRIMINATION.readings
            .map(
              (r) => `
            <tr>
              <td>${r.extra_data?.base_load || r.standard_value}</td>
              <td>${r.extra_data?.added_weight || '-'}</td>
              <td>${r.extra_data?.indicated_before || '-'}</td>
              <td>${r.extra_data?.indicated_after || r.indicated_value || '-'}</td>
              <td>${r.extra_data?.display_changed ? 'YES' : 'NO'}</td>
              <td><span class="${r.result === 'PASS' ? 'badge-pass' : 'badge-fail'}">${r.result}</span></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : ''
    }

    <!-- Overall Verdict -->
    <div class="verdict-box">
      <div class="verdict-text">${isPass ? 'COMPLIES WITH OIML R-76 SPECIFICATIONS' : 'DOES NOT COMPLY WITH OIML R-76 SPECIFICATIONS'}</div>
      <div class="verdict-reason">
        ${
          isPass
            ? 'The instrument satisfies all maximum permissible error (MPE) tolerances for Accuracy Class ' + instrument.accuracy_class + '.'
            : report.remarks || 'One or more test parameters exceeded the allowable MPE threshold.'
        }
      </div>
    </div>

    <!-- Sign-off & QR Code -->
    <div class="signoff-section">
      <div class="sign-box">
        <div class="sign-line">${session.tester_name || 'Metrology Testing Officer'}</div>
        <div><strong>Tested By (Sign & Date)</strong></div>
        <div style="font-size: 8pt; color: #718096;">${session.tester_name} (${issueDate})</div>
      </div>

      <div class="qr-box">
        <img class="qr-img" src="${qrDataUrl}" alt="Verification QR Code">
        <div class="qr-caption">Scan to Verify Online</div>
      </div>

      <div class="sign-box">
        <div class="sign-line">
          ${
            signature && signature.signature_image
              ? `<img class="signature-img" src="${signature.signature_image}" alt="Signature">`
              : (session.remarks_reviewer || 'Head of Laboratory / Reviewer')
          }
        </div>
        <div><strong>Approved By (Authorized Signatory)</strong></div>
        <div style="font-size: 8pt; color: #718096;">Director / Lab Head (${issueDate})</div>
      </div>
    </div>

    <div class="footer-note">
      This test certificate is digitally verifiable via the embedded QR code or at ${verificationUrl}. Generated by NAWI Test Report Generator (SIH26035).
    </div>
  </div>
</body>
</html>`;
};

export default {
  generateReportHtml
};
