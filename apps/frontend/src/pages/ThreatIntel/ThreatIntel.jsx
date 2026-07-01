import React from 'react';

const ThreatIntel = () => {
  return (
    <div className="h-full w-full">
      <iframe
        src="https://cybersec-intel-pi07.onrender.com/"
        className="w-full h-[calc(100vh-120px)] border-0 rounded-lg"
        title="Threat Intelligence Portal"
        sandbox="allow-scripts allow-same-origin allow-forms"
        loading="lazy"
      />
    </div>
  );
};

export default ThreatIntel;