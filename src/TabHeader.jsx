// Uniform tab header: pixel icon + tab name, optional lead line, short description, and an actions slot (selectors/buttons).
// Matches the Savings tab header. Everything wraps instead of overflowing at any width.
import React from 'react';

export function TabTitle({ icon, title, lead, description }) {
  return (
    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
      <h2 className="kutitap-title" style={{ fontSize: 'clamp(20px, 3.4vw, 24px)', color: 'var(--px-accent)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <img src={icon} alt="" draggable={false} className="px-sprite px-logo-sprite" style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{title}</span>
      </h2>
      {lead && <div style={{ fontSize: 'clamp(14px, 2.4vw, 17px)', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px 0', overflowWrap: 'anywhere' }}>{lead}</div>}
      {description && <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--px-muted)', margin: 0, overflowWrap: 'anywhere' }}>{description}</p>}
    </div>
  );
}

export default function TabHeader({ icon, title, lead, description, actions, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--px-card)', padding: '24px 28px', borderRadius: 0, '--px': 'panel', boxShadow: '0 10px 30px rgba(223,177,91,0.18)', flexShrink: 0, width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 20, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <TabTitle icon={icon} title={title} lead={lead} description={description} />
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
