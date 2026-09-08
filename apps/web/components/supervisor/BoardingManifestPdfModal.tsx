'use client';
import { useState, useMemo, useRef } from 'react';
import type { Trip, ManifestItem } from '@/lib/types';
import { checkManifestUnlock } from '@/lib/manifest-unlock';

interface Props {
  trip: Trip | null;
  manifest: ManifestItem[];
  onClose: () => void;
  supervisorName?: string;
  supervisorEmail?: string;
}

function cleanDateStr(val?: string | null): string {
  if (!val) {
    return new Date().toISOString().split('T')[0];
  }
  if (val.includes('T')) {
    return val.split('T')[0];
  }
  return val;
}

function cleanTimeStr(val?: string | null): string {
  if (!val) return '09:00 AM';
  return val;
}

function getManifestStyleSheet(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body, html {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Cairo", "Tahoma", Roboto, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      direction: rtl;
    }
    .manifest-page {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px;
      background: #ffffff;
    }
    /* Header Section */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-table td {
      border: none !important;
      padding: 4px 6px;
      vertical-align: middle;
    }
    .header-right {
      width: 38%;
      text-align: right;
    }
    .header-center {
      width: 24%;
      text-align: center;
    }
    .header-left {
      width: 38%;
      text-align: left;
      direction: ltr;
    }
    .header-logo {
      max-height: 58px;
      width: auto;
      object-fit: contain;
      display: inline-block;
    }
    .ministry-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .ministry-sub {
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 1px 0;
    }
    .university-title-ar {
      font-size: 12px;
      font-weight: 900;
      color: #1e3a8a;
      margin: 2px 0 0 0;
    }
    .system-title-en {
      font-size: 8.5px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 0.5px;
    }
    .badge-trip {
      display: inline-block;
      padding: 3px 10px;
      background-color: #0f172a;
      color: #ffffff !important;
      font-family: monospace;
      font-weight: 900;
      font-size: 11px;
      border-radius: 4px;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .badge-stamp {
      display: inline-block;
      padding: 2px 8px;
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #10b981;
      font-weight: 800;
      font-size: 9px;
      border-radius: 4px;
    }
    .meta-ref {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
      font-family: monospace;
    }

    /* Document Title Banner */
    .title-banner {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-right: 4px solid #1e3a8a;
      padding: 8px 12px;
      margin-bottom: 12px;
      text-align: center;
      border-radius: 4px;
    }
    .title-banner-ar {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
    }
    .title-banner-en {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Metadata Bento Table */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }
    .info-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      vertical-align: top;
      font-size: 10.5px;
      width: 25%;
    }
    .info-label {
      display: block;
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .info-value {
      font-weight: 800;
      color: #0f172a;
      font-size: 11px;
    }
    .info-value-mono {
      font-family: monospace;
      direction: ltr;
      display: inline-block;
      font-weight: 800;
    }
    .info-highlight {
      color: #1d4ed8;
      font-weight: 900;
    }

    /* Roster Table */
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      page-break-inside: auto;
    }
    .roster-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .roster-table thead {
      display: table-header-group;
    }
    .roster-table th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-weight: 800;
      font-size: 9.5px;
      padding: 6px 6px;
      border: 1px solid #0f172a;
      text-align: center;
      vertical-align: middle;
    }
    .roster-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      font-size: 10px;
      vertical-align: middle;
      text-align: right;
    }
    .roster-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .col-idx {
      width: 4%;
      text-align: center !important;
      font-family: monospace;
      color: #64748b;
    }
    .col-seat {
      width: 7%;
      text-align: center !important;
      font-weight: 900;
      font-family: monospace;
      font-size: 11px;
      color: #1d4ed8;
      background-color: #eff6ff !important;
    }
    .col-name {
      width: 25%;
      font-weight: 800;
      color: #0f172a;
    }
    .col-id {
      width: 12%;
      text-align: center !important;
      font-family: monospace;
      direction: ltr;
      font-weight: 700;
      color: #1e293b;
    }
    .col-email {
      width: 20%;
      text-align: left !important;
      direction: ltr;
      font-size: 9px;
      color: #475569;
      font-family: monospace;
      word-break: break-all;
    }
    .col-code {
      width: 10%;
      text-align: center !important;
      font-family: monospace;
      font-weight: 800;
      direction: ltr;
      color: #0f172a;
      background-color: #f1f5f9;
    }
    .col-time {
      width: 10%;
      text-align: center !important;
      font-size: 9px;
      font-family: monospace;
      direction: ltr;
      color: #475569;
    }
    .col-status {
      width: 12%;
      text-align: center !important;
    }
    .status-badge-boarded {
      display: inline-block;
      padding: 1px 6px;
      background-color: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      border-radius: 3px;
      font-weight: 800;
      font-size: 8.5px;
    }
    .status-badge-pending {
      display: inline-block;
      padding: 1px 6px;
      background-color: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
      border-radius: 3px;
      font-weight: 800;
      font-size: 8.5px;
    }

    /* Signatures Section */
    .signatures-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 12px 0;
      margin-top: 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      border: none !important;
      padding: 0;
      vertical-align: top;
      width: 50%;
    }
    .sig-card {
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 10px 12px;
      background-color: #fdfdfd;
    }
    .sig-card-title {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .sig-card-desc {
      font-size: 9px;
      color: #64748b;
      margin-bottom: 18px;
      line-height: 1.3;
    }
    .sig-field-row {
      display: table;
      width: 100%;
      margin-top: 8px;
      font-size: 10px;
    }
    .sig-field-cell {
      display: table-cell;
      vertical-align: bottom;
    }
    .sig-field-name {
      color: #475569;
      font-weight: 700;
      white-space: nowrap;
    }
    .sig-field-line {
      border-bottom: 1px dashed #64748b;
      width: 100%;
      padding-left: 8px;
      font-family: monospace;
      font-size: 9.5px;
      color: #0f172a;
    }
    .stamp-box {
      width: 100px;
      height: 70px;
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 8px;
      font-weight: 700;
      color: #94a3b8;
      padding: 4px;
      line-height: 1.2;
    }

    /* Footer */
    .manifest-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      font-size: 8.5px;
      color: #94a3b8;
      text-align: center;
      font-family: monospace;
      page-break-inside: avoid;
    }
  `;
}

function buildManifestDocumentMarkup(params: {
  trip: Trip | null;
  displayedList: ManifestItem[];
  boardedCount: number;
  totalSeats: number;
  formattedDate: string;
  departureTime: string;
  routeName: string;
  busName: string;
  busPlate: string;
  supervisorDisplay: string;
  driverDisplay: string;
  directionDisplay: string;
  generatedTimestamp: string;
}): string {
  const {
    trip,
    displayedList,
    boardedCount,
    totalSeats,
    formattedDate,
    departureTime,
    routeName,
    busName,
    busPlate,
    supervisorDisplay,
    driverDisplay,
    directionDisplay,
    generatedTimestamp,
  } = params;

  const tripIdStr = trip?.id ? String(trip.id) : 'GU-TRANSIT';

  const rowsMarkup = displayedList.length === 0
    ? `<tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
          لا توجد بيانات ركاب مسجلة لهذا الشفت حتى الآن • No passengers recorded
        </td>
      </tr>`
    : displayedList.map((passenger, idx) => {
        const boardTimeStr = passenger.boardedAt
          ? new Date(passenger.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '—';
        const isBoarded = Boolean(passenger.isBoarded);
        const statusHtml = isBoarded
          ? '<span class="status-badge-boarded">✓ تم الصعود</span>'
          : '<span class="status-badge-pending">معلق / Pending</span>';

        return `<tr>
          <td class="col-idx">${idx + 1}</td>
          <td class="col-seat">${passenger.seatNumber}</td>
          <td class="col-name">${passenger.riderName || 'طالب جامعي'}</td>
          <td class="col-id">${passenger.academicId || '—'}</td>
          <td class="col-email">${passenger.riderEmail || '—'}</td>
          <td class="col-code">${passenger.boardingCode || 'GU-SCAN'}</td>
          <td class="col-time">${boardTimeStr}</td>
          <td class="col-status">${statusHtml}</td>
        </tr>`;
      }).join('');

  return `
    <div class="manifest-page">
      <!-- 1. Header Table -->
      <table class="header-table">
        <tr>
          <td class="header-right">
            <div class="ministry-title">جمهورية مصر العربية</div>
            <div class="ministry-sub">وزارة التعليم العالي والبحث العلمي</div>
            <div class="university-title-ar">جامعة الجلالة • منظومة الحافلات الذكية</div>
          </td>
          <td class="header-center">
            <img src="/gu-logo-colored.png" alt="Galala University" class="header-logo" onerror="this.style.display='none'" />
          </td>
          <td class="header-left">
            <div><span class="badge-trip">SHIFT #${tripIdStr}</span></div>
            <div><span class="badge-stamp">معتمد رسمياً • OFFICIAL DISPATCH</span></div>
            <div class="meta-ref">DATE: ${formattedDate} | TIME: ${departureTime}</div>
          </td>
        </tr>
      </table>

      <!-- 2. Document Title Banner -->
      <div class="title-banner">
        <h2 class="title-banner-ar">كشف صعود ركاب الرحلة الرسمي والتوزيع الداخلي للحافلة</h2>
        <div class="title-banner-en">Official Passenger Boarding Manifest & Dispatch Report</div>
      </div>

      <!-- 3. Bento Information Table -->
      <table class="info-table">
        <tr>
          <td>
            <span class="info-label">تاريخ ووقت الرحلة (Date & Shift)</span>
            <span class="info-value info-value-mono">${formattedDate} • ${departureTime}</span>
          </td>
          <td>
            <span class="info-label">خط السير (Transit Route)</span>
            <span class="info-value info-highlight">${routeName}</span>
          </td>
          <td>
            <span class="info-label">الحافلة ورقم اللوحة (Bus & Plate)</span>
            <span class="info-value">${busName} <span class="info-value-mono">(${busPlate})</span></span>
          </td>
          <td>
            <span class="info-label">إجمالي الصعود (Boarded / Capacity)</span>
            <span class="info-value info-highlight">${boardedCount} / ${totalSeats} راكب</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="info-label">مشرف الرحلة (Supervisor)</span>
            <span class="info-value">${supervisorDisplay}</span>
          </td>
          <td>
            <span class="info-label">سائق الحافلة (Assigned Driver)</span>
            <span class="info-value">${driverDisplay}</span>
          </td>
          <td>
            <span class="info-label">اتجاه الرحلة (Direction)</span>
            <span class="info-value">${directionDisplay}</span>
          </td>
          <td>
            <span class="info-label">وقت استخراج التقرير (Issued At)</span>
            <span class="info-value info-value-mono" style="font-size: 10px;">${generatedTimestamp}</span>
          </td>
        </tr>
      </table>

      <!-- 4. Roster Table -->
      <table class="roster-table">
        <thead>
          <tr>
            <th class="col-idx">#</th>
            <th class="col-seat">المقعد</th>
            <th class="col-name">اسم الطالب بالكامل (Student Name)</th>
            <th class="col-id">الرقم الأكاديمي</th>
            <th class="col-email">البريد الإلكتروني الجامعي</th>
            <th class="col-code">كود الصعود</th>
            <th class="col-time">وقت الصعود</th>
            <th class="col-status">حالة الركوب</th>
          </tr>
        </thead>
        <tbody>
          ${rowsMarkup}
        </tbody>
      </table>

      <!-- 5. Signatures Table -->
      <table class="signatures-table">
        <tr>
          <td>
            <div class="sig-card">
              <div class="sig-card-title">إقرار وتوقيع مشرف الرحلة (Line Supervisor Approval)</div>
              <div class="sig-card-desc">
                أقر أنا المشرف المذكور بصعود الطلاب الموضحة أسماؤهم أعلاه ومطابقة كود الصعود وأرقام المقاعد المخصصة بالحافلة.
              </div>
              <table style="width: 100%; border: none; border-collapse: collapse;">
                <tr>
                  <td style="border: none; padding: 3px 0; font-size: 10px; width: 65%;">
                    <span style="color: #64748b;">اسم المشرف:</span> <strong>${supervisorDisplay}</strong>
                  </td>
                  <td style="border: none; padding: 3px 0; font-size: 10px; text-align: left; direction: ltr; font-family: monospace;">
                    Date: ${formattedDate}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="border: none; padding: 12px 0 2px 0;">
                    <div style="border-bottom: 1px dashed #64748b; width: 100%;"></div>
                    <span style="font-size: 8.5px; color: #94a3b8;">توقيع المشرف المعتمد</span>
                  </td>
                </tr>
              </table>
            </div>
          </td>
          <td>
            <div class="sig-card">
              <div class="sig-card-title">اعتماد إدارة النقل وخاتم الجامعة (Transport Operations Seal)</div>
              <div class="sig-card-desc">
                معتمد من إدارة الحركة ومنظومة النقل الذكي لجامعة الجلالة (Bus Aesh Platform).
              </div>
              <table style="width: 100%; border: none; border-collapse: collapse;">
                <tr>
                  <td style="border: none; padding: 3px 0; font-size: 10px; vertical-align: middle;">
                    <div style="margin-bottom: 6px;">
                      <span style="color: #64748b;">المسؤول:</span> <strong>إدارة تشغيل الأسطول</strong>
                    </div>
                    <div style="border-bottom: 1px dashed #64748b; width: 90%; margin-top: 10px;"></div>
                    <span style="font-size: 8.5px; color: #94a3b8;">توقيع مراقب الحركة</span>
                  </td>
                  <td style="border: none; padding: 3px 0; text-align: center; vertical-align: middle; width: 110px;">
                    <div class="stamp-box">
                      موضع الختم الرسمي<br />لإدارة النقل<br />جامعة الجلالة
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- 6. Footer -->
      <div class="manifest-footer">
        Galala University Transit System • Bus Aesh Operations Control • Printed for Official Dispatch Records
      </div>
    </div>
  `;
}

export default function BoardingManifestPdfModal({
  trip,
  manifest,
  onClose,
  supervisorName,
  supervisorEmail,
}: Props) {
  const [devOverride, setDevOverride] = useState(false);
  const [filterMode, setFilterMode] = useState<'boarded_only' | 'all'>('boarded_only');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter only passengers who actually boarded (or all passengers if selected)
  const boardedPassengers = useMemo(() => {
    return manifest.filter(m => m.isBoarded);
  }, [manifest]);

  const displayedList = filterMode === 'boarded_only' ? boardedPassengers : manifest;

  const unlockStatus = useMemo(() => {
    return checkManifestUnlock(trip, boardedPassengers.length, devOverride);
  }, [trip, boardedPassengers.length, devOverride]);

  const formattedDate = cleanDateStr(trip?.tripDate);
  const departureTime = cleanTimeStr(trip?.departureTime);
  const busName = trip?.bus?.name || 'Bus Aesh';
  const busPlate = trip?.bus?.licensePlate || 'ق هـ ر ٤٩٢١';
  const routeName = trip?.route ? `${trip.route.nameAr} (${trip.route.nameEn})` : 'Galala Route';
  const supervisorDisplay = supervisorName || trip?.supervisors?.[0]?.nameEn || trip?.supervisors?.[0]?.nameAr || 'Galala Transport Supervisor';
  const driverDisplay = trip?.driver?.nameAr || trip?.driver?.nameEn || 'Mohamed Sobhi (محمد صبحي)';
  const directionDisplay = trip?.direction === 'to_campus' ? 'ذهاب للجامعة (To Campus)' : 'عودة من الجامعة (From Campus)';
  const totalSeats = trip?.bus?.totalSeats || 50;

  const generatedTimestamp = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const documentMarkup = useMemo(() => {
    return buildManifestDocumentMarkup({
      trip,
      displayedList,
      boardedCount: boardedPassengers.length,
      totalSeats,
      formattedDate,
      departureTime,
      routeName,
      busName,
      busPlate,
      supervisorDisplay,
      driverDisplay,
      directionDisplay,
      generatedTimestamp,
    });
  }, [
    trip,
    displayedList,
    boardedPassengers.length,
    totalSeats,
    formattedDate,
    departureTime,
    routeName,
    busName,
    busPlate,
    supervisorDisplay,
    driverDisplay,
    directionDisplay,
    generatedTimestamp,
  ]);

  const handlePrint = () => {
    // Remove any existing print iframe
    const existingIframe = document.getElementById('manifest-print-isolated-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'manifest-print-isolated-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const docTitle = `Official_Boarding_Manifest_Trip_${trip?.id || 'Shift'}_${formattedDate}`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle}</title>
        <style>
          ${getManifestStyleSheet()}
        </style>
      </head>
      <body>
        ${documentMarkup}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 400);
  };

  const handleDownloadReport = () => {
    const docTitle = `Official_Boarding_Manifest_Trip_${trip?.id || 'Shift'}_${formattedDate}`;
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    ${getManifestStyleSheet()}
    .export-actions {
      max-width: 210mm;
      margin: 10px auto;
      padding: 10px 14px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      background: #1e3a8a;
      color: #fff;
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 11px;
    }
    @media print {
      .export-actions { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="export-actions">
    <span style="font-weight: bold; font-size: 11px; color: #1e293b;">كشف صعود ركاب الرحلة الرسمي - جاهز للطباعة والحفظ</span>
    <button class="btn" onclick="window.print()">طباعة / حفظ كملف PDF (Save as PDF)</button>
  </div>
  ${documentMarkup}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="manifest-modal-backdrop"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:h-auto"
    >
      {/* Container Card */}
      <div
        id="manifest-modal-container"
        className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Screen Header Controls (Hidden when printing) */}
        <div id="screen-manifest-header" className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Official Boarding Manifest PDF</h3>
              <p className="text-xs text-slate-500">كشف صعود ركاب الرحلة الرسمي المعتمد</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Filter Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('boarded_only')}
                className={`px-3 py-1 rounded-md transition ${filterMode === 'boarded_only' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Boarded Only ({boardedPassengers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-md transition ${filterMode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All Confirmed ({manifest.length})
              </button>
            </div>

            {/* Dev Force Unlock Toggle */}
            <button
              type="button"
              onClick={() => setDevOverride(p => !p)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition ${
                devOverride ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
              title="Toggle Dev Unlock Override"
            >
              {devOverride ? '⚡ Dev Unlock: ON' : '⚡ Dev Unlock'}
            </button>

            {/* Direct File Download Report Button */}
            <button
              type="button"
              disabled={!unlockStatus.isUnlocked}
              onClick={handleDownloadReport}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                unlockStatus.isUnlocked
                  ? 'bg-slate-800 hover:bg-slate-900 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
              title="تنزيل كشف مستقل بصيغة HTML جاهز للحفظ كـ PDF"
            >
              <span className="material-symbols-outlined text-base">download</span>
              تنزيل التقرير
            </button>

            {/* Export & Save PDF Button */}
            <button
              type="button"
              disabled={!unlockStatus.isUnlocked}
              onClick={handlePrint}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm ${
                unlockStatus.isUnlocked
                  ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 ring-2 ring-blue-400/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
              title="تصدير طباعة مباشرة وحفظ PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              طباعة وحفظ PDF
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Close Modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Lock Warning Notice if locked */}
        {!unlockStatus.isUnlocked && (
          <div id="lock-warning-notice" className="bg-amber-50 border-b border-amber-200 p-3 px-6 text-xs text-amber-900 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-amber-600 text-base">lock</span>
              <span>
                <strong>الكشف مغلق حالياً:</strong> {unlockStatus.reasonAr}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDevOverride(true)}
              className="text-amber-800 underline hover:text-amber-950 font-bold text-[11px]"
            >
              تجاوز القفل للتجربة (Unlock for Testing)
            </button>
          </div>
        )}

        {/* Live Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          <div
            className="bg-white rounded-lg shadow-sm border border-slate-200 mx-auto overflow-hidden"
            style={{ maxWidth: '210mm' }}
            ref={printRef}
            dangerouslySetInnerHTML={{ __html: `<style>${getManifestStyleSheet()}</style>${documentMarkup}` }}
          />
        </div>
      </div>
    </div>
  );
}
