// Asked when "Generate Invoice" is pressed: add an "Other Amount" (reason + USD amount) to the invoice, or skip it.
import React, { useEffect, useRef, useState } from 'react';
import './InvoiceDialog.css';
import askFace from './assets/ui/kutitap-cool.png';
import yesIcon from './assets/ui/icon-yes.png';
import noIcon from './assets/ui/icon-no.png';

// Accepts "12", "12.5", "$1,200.50"; returns a number rounded to cents, or null when it is not a usable amount.
export const parseUsd = (v) => {
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n > 0 && n <= 1000000 ? Math.round(n * 100) / 100 : null;
};

export default function InvoiceOtherAmountModal({ onDone, onCancel }) {
  const [step, setStep] = useState('ask');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const firstRef = useRef(null);
  const noRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  useEffect(() => { const el = step === 'form' ? firstRef.current : noRef.current; if (el) el.focus(); }, [step]);

  const submit = (e) => {
    e.preventDefault();
    const amt = parseUsd(amount);
    if (!reason.trim()) { setError('Please type the reason.'); return; }
    if (amt === null) { setError('Please enter an amount above $0.00.'); return; }
    onDone({ reason: reason.trim(), amount: amt });
  };

  return (
    <div className="sp-root sp-modal-back" onClick={onCancel}>
      <div className="sp-modal inv-modal" role="dialog" aria-modal="true" aria-label="Other amount" onClick={(e) => e.stopPropagation()}>
        <img className="sp-modal-teemo" src={askFace} alt="" aria-hidden="true" draggable="false" />
        {step === 'ask' ? (
          <>
            <p>Add an other amount to this invoice?</p>
            <div className="sp-modal-btns">
              <button type="button" className="sp-btn ico" onClick={() => setStep('form')} aria-label="Yes" title="Yes"><img src={yesIcon} alt="" draggable="false" /></button>
              <button type="button" className="sp-btn ico" ref={noRef} onClick={() => onDone(null)} aria-label="No" title="No"><img src={noIcon} alt="" draggable="false" /></button>
            </div>
          </>
        ) : (
          <form className="inv-form" onSubmit={submit}>
            <p>Other amount</p>
            <label className="inv-label" htmlFor="inv-reason">Reason for Other Amount:</label>
            <input id="inv-reason" ref={firstRef} className="inv-input" value={reason} maxLength={36} onChange={(e) => { setReason(e.target.value); setError(''); }} placeholder="Type the reason" autoComplete="off" />
            <label className="inv-label" htmlFor="inv-amount">Amount ($USD):</label>
            <input id="inv-amount" className="inv-input" value={amount} inputMode="decimal" maxLength={12} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="$0.00" autoComplete="off" />
            {error && <span className="inv-error" role="alert">{error}</span>}
            <div className="sp-modal-btns">
              <button type="submit" className="sp-btn">Generate</button>
              <button type="button" className="sp-btn close" onClick={() => { setStep('ask'); setError(''); }}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
