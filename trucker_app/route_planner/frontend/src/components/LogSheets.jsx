import React, { useState, useRef, useEffect } from 'react';

// Simple Button component
const Button = ({ children, onClick, variant = 'primary' }) => {
  const baseStyle = "px-4 py-2 rounded font-medium";
  const variants = {
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    outline: "border border-gray-300 hover:bg-gray-100"
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]}`} 
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Simple Tabs components
const Tabs = ({ children }) => {
  return <div className="w-full">{children}</div>;
};

const TabsList = ({ children }) => {
  return <div className="flex border-b">{children}</div>;
};

const TabsTrigger = ({ children, isActive, onClick }) => {
  return (
    <button
      className={`px-4 py-2 ${isActive ? 'border-b-2 border-blue-500 font-medium' : 'text-gray-500'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ children, isActive }) => {
  if (!isActive) return null;
  return <div className="py-4">{children}</div>;
};

export function LogSheets({ data }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => console.log('Print all')}>
          Print All
        </Button>
        <Button variant="outline" onClick={() => console.log('Download PDF')}>
          Download PDF
        </Button>
      </div>
      
      <Tabs>
        <TabsList>
          {data.map((_, index) => (
            <TabsTrigger
              key={index}
              isActive={activeTab === index}
              onClick={() => setActiveTab(index)}
            >
              Day {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {data.map((logSheet, index) => (
          <TabsContent key={index} isActive={activeTab === index}>
            <LogSheet data={logSheet} />
          </TabsContent>
        ))}
      </Tabs>
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
  
  // ... rest of the LogSheet component remains the same
  
  return (
    <div className="space-y-4 bg-white p-4 border rounded-lg">
      {/* ... rest of the JSX remains the same */}
    </div>
  );
}

// ... drawLogGrid and drawLogData functions remain the same