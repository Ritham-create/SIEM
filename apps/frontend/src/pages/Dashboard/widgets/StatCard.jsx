import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, borderClass }) => {
  return (
    <div className={`card ${borderClass || ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider font-mono">{title}</p>
          <p className="text-2xl font-bold mt-1 text-white">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;