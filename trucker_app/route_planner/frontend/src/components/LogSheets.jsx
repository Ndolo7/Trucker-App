import React, { useState, useRef, useEffect } from 'react';

export function LogSheets({ data }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Check if data is empty or undefined
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        No log sheets available. Please calculate a route first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        <button 
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
          onClick={() => window.print()}
        >
          Print All
        </button>
        <button 
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
          onClick={() => alert('Downloading PDF...')}
        >
          Download PDF
        </button>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {data.map((_, index) => (
            <button
              key={index}
              className={`py-2 px-4 text-center border-b-2 ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(index)}
            >
              Day {index + 1}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="mt-4">
        <LogSheet data={data[activeTab]} />
      </div>
    </div>
  );
}

function LogSheet({ data }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 400;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw log grid
    drawLogGrid(ctx, canvas.width, canvas.height);
    
    // Draw log data
    if (data.activities && data.activities.length > 0) {
      drawLogData(ctx, data.activities, canvas.width, canvas.height);
    }
    
  }, [data]);
  
  const drawLogGrid = (ctx, width, height) => {
    // Draw horizontal lines for status categories
    const statusHeight = height / 5;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    // Draw status labels
    const statuses = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty'];
    statuses.forEach((status, i) => {
      const y = i * statusHeight + statusHeight / 2;
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.fillText(status, 5, y);
      
      // Draw horizontal line
      ctx.beginPath();
      ctx.moveTo(80, (i + 1) * statusHeight);
      ctx.lineTo(width - 20, (i + 1) * statusHeight);
      ctx.stroke();
    });
    
    // Draw vertical lines for hours
    const hourWidth = (width - 100) / 24;
    for (let i = 0; i <= 24; i++) {
      const x = 80 + i * hourWidth;
      
      // Draw hour label
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.fillText(i === 24 ? '0' : i.toString(), x - 3, height - 5);
      
      // Draw vertical line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
    }
  };
  
  const drawLogData = (ctx, activities, width, height) => {
    const statusMap = {
      'offDuty': 0,
      'sleeperBerth': 1,
      'driving': 2,
      'onDuty': 3
    };
    
    const statusHeight = height / 5;
    const hourWidth = (width - 100) / 24;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    activities.forEach(activity => {
      const startHour = parseFloat(activity.startTime);
      const endHour = parseFloat(activity.endTime);
      const statusIndex = statusMap[activity.status];
      
      const startX = 80 + startHour * hourWidth;
      const endX = 80 + endHour * hourWidth;
      const y = statusIndex * statusHeight + statusHeight / 2;
      
      // Draw horizontal line for activity duration
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      
      // Draw vertical lines at start and end
      ctx.beginPath();
      ctx.moveTo(startX, y - 15);
      ctx.lineTo(startX, y + 15);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(endX, y - 15);
      ctx.lineTo(endX, y + 15);
      ctx.stroke();
    });
  };
  
  // If no data is available
  if (!data) {
    return <div>No log data available</div>;
  }
  
  return (
    <div className="space-y-4 bg-white p-4 border rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-bold">Driver's Daily Log</h3>
          <p className="text-sm">{data.date}</p>
        </div>
        <div className="text-right">
          <p><span className="font-medium">From:</span> {data.from}</p>
          <p><span className="font-medium">To:</span> {data.to}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p><span className="font-medium">Total Miles:</span> {data.totalMiles}</p>
        </div>
        <div>
          <p><span className="font-medium">Carrier:</span> {data.carrier}</p>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto"
          style={{ maxHeight: '400px' }}
        />
      </div>
      
      <div className="border rounded-lg p-3">
        <h4 className="font-medium mb-2">Remarks:</h4>
        <p className="text-sm">{data.remarks || 'No remarks'}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium">Shipping Documents:</h4>
          <p>{data.shippingDocuments || 'None'}</p>
        </div>
        <div>
          <h4 className="font-medium">Certification:</h4>
          <p>I hereby certify that the information contained is true and correct.</p>
        </div>
      </div>
    </div>
  );
}