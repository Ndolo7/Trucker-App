import React, { useState, useRef, useEffect } from 'react';

export function LogSheets({ data }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!data || data.length === 0) {
    return (
      <div className="map-placeholder" style={{ height: 200 }}>
        No log sheets available. Calculate a route first.
      </div>
    );
  }

  const handlePrint = () => {
    const printArea = document.getElementById('eld-print-area');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <html>
      <head>
        <title>ELD Log Sheet - ${data[activeTab]?.date || ''}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; padding: 24px; background: #fff; color: #1a1a1a; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 16px; }
          .header h1 { font-size: 18px; }
          .header p { font-size: 12px; color: #555; margin-top: 2px; }
          .info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
          .info-item { border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; }
          .info-item .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #888; }
          .info-item .value { font-size: 13px; font-weight: 600; margin-top: 2px; }
          .canvas-wrap { border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
          .canvas-wrap canvas { width: 100%; display: block; }
          .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 12px; }
          .footer .label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #888; }
          .footer .value { margin-top: 4px; }
          .cert { margin-top: 20px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #555; }
          .cert .sig-line { margin-top: 30px; border-top: 1px solid #333; width: 250px; padding-top: 4px; font-size: 10px; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <div class="cert">
          <p>I hereby certify that the entries and information contained herein are true and correct.</p>
          <div class="sig-line">Driver's Signature</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Re-draw the canvas in the print window
    const originalCanvas = printArea.querySelector('canvas');
    const printCanvas = printWindow.document.querySelector('canvas');
    if (originalCanvas && printCanvas) {
      const ctx = printCanvas.getContext('2d');
      const dpr = 2;
      printCanvas.width = 800 * dpr;
      printCanvas.height = 360 * dpr;
      printCanvas.style.width = '100%';
      printCanvas.style.height = 'auto';
      ctx.scale(dpr, dpr);

      // White background for print
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 360);
      drawLogGridPrint(ctx, 800, 360);
      if (data[activeTab]?.activities?.length > 0) {
        drawLogDataPrint(ctx, data[activeTab].activities, 800, 360);
      }
    }

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleDownload = () => {
    const printArea = document.getElementById('eld-print-area');
    if (!printArea) return;

    const originalCanvas = printArea.querySelector('canvas');
    if (!originalCanvas) return;

    // Create a high-res export canvas
    const exportCanvas = document.createElement('canvas');
    const dpr = 2;
    exportCanvas.width = 800 * dpr;
    exportCanvas.height = 360 * dpr;
    const ctx = exportCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 360);
    drawLogGridPrint(ctx, 800, 360);
    if (data[activeTab]?.activities?.length > 0) {
      drawLogDataPrint(ctx, data[activeTab].activities, 800, 360);
    }

    const link = document.createElement('a');
    link.download = `eld-log-${data[activeTab]?.date || 'sheet'}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          {data.map((_, index) => (
            <button
              key={index}
              className={`tab-btn ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              Day {index + 1}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handlePrint}>🖨️ Print</button>
          <button className="btn-secondary" onClick={handleDownload}>⬇️ Download</button>
        </div>
      </div>
      <div id="eld-print-area">
        <LogSheet data={data[activeTab]} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Print-friendly canvas drawing (white background)
// ═══════════════════════════════════════════════════
function drawLogGridPrint(ctx, width, height) {
  const statusHeight = height / 5;
  const leftMargin = 90;
  const rightMargin = 20;
  const bottomMargin = 30;

  const statuses = ['Off Duty', 'Sleeper', 'Driving', 'On Duty'];
  statuses.forEach((status, i) => {
    const y = i * statusHeight + statusHeight / 2 + 10;
    ctx.fillStyle = '#333';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText(status, 10, y + 4);

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, (i + 1) * statusHeight);
    ctx.lineTo(width - rightMargin, (i + 1) * statusHeight);
    ctx.stroke();
  });

  const hourWidth = (width - leftMargin - rightMargin) / 24;
  for (let i = 0; i <= 24; i++) {
    const x = leftMargin + i * hourWidth;
    ctx.strokeStyle = i % 6 === 0 ? '#bbb' : '#e5e5e5';
    ctx.lineWidth = i % 6 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height - bottomMargin);
    ctx.stroke();

    ctx.fillStyle = i % 6 === 0 ? '#333' : '#888';
    ctx.font = `${i % 6 === 0 ? '600' : '400'} 9px Inter, sans-serif`;
    const label = i === 24 ? 'MN' : i === 0 ? 'MN' : i === 12 ? 'N' : i.toString();
    ctx.fillText(label, x - (label.length > 1 ? 6 : 3), height - bottomMargin + 14);
  }
}

function drawLogDataPrint(ctx, activities, width, height) {
  const statusMap = { 'offDuty': 0, 'sleeperBerth': 1, 'driving': 2, 'onDuty': 3 };
  const statusColors = ['#64748b', '#6366f1', '#2563eb', '#16a34a'];
  const statusHeight = height / 5;
  const leftMargin = 90;
  const rightMargin = 20;
  const hourWidth = (width - leftMargin - rightMargin) / 24;

  let prevY = null;
  let prevEndX = null;

  activities.forEach(activity => {
    const startHour = parseFloat(activity.startTime);
    const endHour = parseFloat(activity.endTime);
    const statusIndex = statusMap[activity.status];
    if (statusIndex === undefined) return;

    const startX = leftMargin + startHour * hourWidth;
    const endX = leftMargin + endHour * hourWidth;
    const y = statusIndex * statusHeight + statusHeight / 2 + 10;
    const color = statusColors[statusIndex];

    if (prevY !== null && prevEndX !== null) {
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, prevY);
      ctx.lineTo(startX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    prevY = y;
    prevEndX = endX;
  });
}

// ═══════════════════════════════════════════════════
// Dark-mode canvas LogSheet component (on-screen)
// ═══════════════════════════════════════════════════
function LogSheet({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 800 * dpr;
    canvas.height = 360 * dpr;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 360);

    drawLogGrid(ctx, 800, 360);
    if (data.activities?.length > 0) {
      drawLogData(ctx, data.activities, 800, 360);
    }
  }, [data]);

  const drawLogGrid = (ctx, width, height) => {
    const statusHeight = height / 5;
    const leftMargin = 90;
    const rightMargin = 20;
    const bottomMargin = 30;

    const statuses = ['Off Duty', 'Sleeper', 'Driving', 'On Duty'];
    const statusColors = ['#64748b', '#6366f1', '#38bdf8', '#22c55e'];

    statuses.forEach((status, i) => {
      const y = i * statusHeight + statusHeight / 2 + 10;
      ctx.fillStyle = statusColors[i] + '20';
      ctx.fillRect(0, i * statusHeight + 5, leftMargin - 5, statusHeight - 2);
      ctx.fillStyle = statusColors[i];
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(status, 10, y + 4);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftMargin, (i + 1) * statusHeight);
      ctx.lineTo(width - rightMargin, (i + 1) * statusHeight);
      ctx.stroke();
    });

    const hourWidth = (width - leftMargin - rightMargin) / 24;
    for (let i = 0; i <= 24; i++) {
      const x = leftMargin + i * hourWidth;
      ctx.strokeStyle = i % 6 === 0 ? '#334155' : '#1e293b';
      ctx.lineWidth = i % 6 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - bottomMargin);
      ctx.stroke();

      ctx.fillStyle = i % 6 === 0 ? '#94a3b8' : '#475569';
      ctx.font = `${i % 6 === 0 ? '600' : '400'} 9px Inter, sans-serif`;
      const label = i === 24 ? 'MN' : i === 0 ? 'MN' : i === 12 ? 'N' : i.toString();
      ctx.fillText(label, x - (label.length > 1 ? 6 : 3), height - bottomMargin + 14);
    }
  };

  const drawLogData = (ctx, activities, width, height) => {
    const statusMap = { 'offDuty': 0, 'sleeperBerth': 1, 'driving': 2, 'onDuty': 3 };
    const statusColors = ['#64748b', '#6366f1', '#38bdf8', '#22c55e'];
    const statusHeight = height / 5;
    const leftMargin = 90;
    const rightMargin = 20;
    const hourWidth = (width - leftMargin - rightMargin) / 24;

    let prevY = null;
    let prevEndX = null;

    activities.forEach(activity => {
      const startHour = parseFloat(activity.startTime);
      const endHour = parseFloat(activity.endTime);
      const statusIndex = statusMap[activity.status];
      if (statusIndex === undefined) return;

      const startX = leftMargin + startHour * hourWidth;
      const endX = leftMargin + endHour * hourWidth;
      const y = statusIndex * statusHeight + statusHeight / 2 + 10;
      const color = statusColors[statusIndex];

      if (prevY !== null && prevEndX !== null) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, prevY);
        ctx.lineTo(startX, y);
        ctx.stroke();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      prevY = y;
      prevEndX = endX;
    });
  };

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header info */}
      <div className="header" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12
      }}>
        {[
          { label: 'Date', value: data.date },
          { label: 'From', value: data.from },
          { label: 'To', value: data.to },
          { label: 'Miles', value: data.totalMiles },
          { label: 'Carrier', value: data.carrier },
        ].map((item, i) => (
          <div className="stat-item info-item" key={i}>
            <div className="stat-label label">{item.label}</div>
            <div className="value" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Canvas grid */}
      <div className="canvas-wrap" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Footer */}
      <div className="footer" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        padding: 16, background: 'var(--bg-secondary)', borderRadius: 12,
        border: '1px solid var(--border-subtle)', fontSize: '0.8rem'
      }}>
        <div>
          <span className="label" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
            Remarks
          </span>
          <p className="value" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{data.remarks || 'None'}</p>
        </div>
        <div>
          <span className="label" style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase' }}>
            Shipping Docs
          </span>
          <p className="value" style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{data.shippingDocuments || 'None'}</p>
        </div>
      </div>
    </div>
  );
}