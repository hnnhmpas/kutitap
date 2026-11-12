// AuthGate: the tracker only opens after the owner signs in (Firebase Authentication, email + password).
// There is no sign-up here; create your single account in the Firebase console and turn sign-up off.
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { clearChatSession } from './chatSession';
import './AuthGate.css';
import kutitapFace from './assets/ui/kutitap-chat-face.png';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (!u) { clearChatSession(); setShowPw(false); } // signed out: nothing of the chat stays behind
    setUser(u || null);
  }), []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = err && err.code ? err.code : '';
      setError(code === 'auth/too-many-requests' ? 'Too many tries. Please wait a bit and try again.' : code === 'auth/network-request-failed' ? 'No connection. Check your internet and try again.' : 'Wrong email or password.');
      setPassword('');
    }
    setBusy(false);
  };

  if (user) return children;
  return (
    <div className="kauth">
      <form className="kauth-card" onSubmit={submit}>
        <img className="kauth-face" src={kutitapFace} alt="" draggable="false" />
        <h1 className="kauth-title">Kutitap</h1>
        <p className="kauth-sub">{user === undefined ? 'Checking...' : 'Sign in to open your tracker'}</p>
        {user === null && (
          <>
            <input className="kauth-input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="kauth-pass">
              <input className="kauth-input" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="kauth-eye" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw} title={showPw ? 'Hide password' : 'Show password'}>
                <svg viewBox="0 0 14 9" aria-hidden="true">
                  <path fill="#4a1d36" d="M4 0h6v1H4zM2 1h2v1H2zM10 1h2v1h-2zM1 2h1v1H1zM12 2h1v1h-1zM0 3h1v2H0zM13 3h1v2h-1zM1 5h1v1H1zM12 5h1v1h-1zM2 6h2v1H2zM10 6h2v1h-2zM4 7h6v1H4zM5 3h4v2H5z" />
                  {showPw && <path fill="#c2306b" d="M12 0h1v1h-1zM11 1h1v1h-1zM10 2h1v1h-1zM9 3h1v1H9zM8 4h1v1H8zM7 5h1v1H7zM6 6h1v1H6zM5 7h1v1H5zM4 8h1v1H4z" />}
                </svg>
              </button>
            </div>
            {error && <p className="kauth-error" role="alert">{error}</p>}
            <button className="kauth-btn" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          </>
        )}
      </form>
    </div>
  );
}
