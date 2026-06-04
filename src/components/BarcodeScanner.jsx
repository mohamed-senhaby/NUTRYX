import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input, Btn, T } from '../lib/ui.jsx';

const loadZXing = () => new Promise(resolve => {
  if (window.ZXing) { resolve(true); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js';
  s.onload  = () => resolve(true);
  s.onerror = () => resolve(false);
  document.head.appendChild(s);
});

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef   = useRef(document.createElement('canvas'));
  const fileRef     = useRef(null);

  const [status,  setStatus]  = useState('starting'); // starting | scanning | no-camera
  const [hint,    setHint]    = useState('Point camera at barcode');
  const [errMsg,  setErrMsg]  = useState('');
  const [manual,  setManual]  = useState('');
  const [libReady,setLibReady]= useState(false);
  const [found,   setFound]   = useState(false);

  const stop = useCallback(() => {
    try { clearInterval(intervalRef.current); } catch {}
    try {
      streamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      streamRef.current = null;
    } catch {}
  }, []);

  const close = () => { stop(); onClose(); };

  const emit = useCallback((value) => {
    if (found) return;
    setFound(true);
    stop();
    // Vibrate on success
    try { navigator.vibrate?.(100); } catch {}
    onResult(value);
  }, [found, stop, onResult]);

  // Start camera
  useEffect(() => {
    let ok = true;
    (async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrMsg('Camera not available in this browser.');
        setStatus('no-camera'); return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!ok) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
          setStatus('scanning');
        }
      } catch (e) {
        if (!ok) return;
        setErrMsg(
          e?.name === 'NotAllowedError' ? 'Camera permission denied — allow it in browser/phone settings.' :
          e?.name === 'NotFoundError'   ? 'No camera found on this device.' :
          `Camera error: ${e?.message || e?.name || 'unknown'}`
        );
        setStatus('no-camera');
      }
    })();
    return () => { ok = false; stop(); };
  }, [stop]);

  // Load ZXing library while camera starts
  useEffect(() => {
    loadZXing().then(ok => setLibReady(ok));
  }, []);

  // Scanning loop
  useEffect(() => {
    if (status !== 'scanning') return;
    let frameCount = 0;

    const scan = async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || found) return;
      frameCount++;

      if (frameCount === 20) setHint('Hold steady — make sure barcode is well lit 💡');
      if (frameCount === 50) setHint('Move closer to the barcode 🔍');
      if (frameCount === 90) setHint('Try tilting the phone slightly 📐');

      const c = canvasRef.current;
      c.width  = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);

      // 1️⃣ Native BarcodeDetector — Chrome / Android (fastest)
      if (window.BarcodeDetector) {
        try {
          const bd = new window.BarcodeDetector({
            formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code','itf','codabar']
          });
          const codes = await bd.detect(c);
          if (codes.length > 0) { emit(codes[0].rawValue); return; }
        } catch {}
      }

      // 2️⃣ ZXing — iOS Safari & all other browsers
      if (libReady && window.ZXing) {
        try {
          const hints = new Map();
          hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
          const reader = new window.ZXing.BrowserMultiFormatReader(hints);
          const imgUrl = c.toDataURL('image/jpeg', 0.85);
          const result = await reader.decodeFromImageUrl(imgUrl);
          if (result) { emit(result.getText()); return; }
        } catch {} // Throws NotFoundException when no barcode — that's normal
      }
    };

    intervalRef.current = setInterval(scan, 300);
    return () => { try { clearInterval(intervalRef.current); } catch {} };
  }, [status, libReady, emit, found]);

  // Decode a photo from gallery / file input
  const decodePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setHint('Analyzing photo…');

    // Try BarcodeDetector on the image
    if (window.BarcodeDetector) {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(r => { img.onload = r; });
        const bd = new window.BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'] });
        const codes = await bd.detect(img);
        if (codes.length > 0) { emit(codes[0].rawValue); return; }
      } catch {}
    }

    // ZXing fallback
    if (libReady && window.ZXing) {
      try {
        const reader  = new window.ZXing.BrowserMultiFormatReader();
        const imgUrl  = URL.createObjectURL(file);
        const result  = await reader.decodeFromImageUrl(imgUrl);
        if (result) { emit(result.getText()); return; }
      } catch {}
    }

    setHint('No barcode found in photo — try again or enter manually');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:200, display:'flex', flexDirection:'column' }}>

      {/* Safe area */}
      <div style={{ height:'env(safe-area-inset-top)', background:'#000', flexShrink:0 }} />

      {/* Title */}
      <div style={{ padding:'10px 20px', background:'rgba(0,0,0,0.85)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:800, fontSize:16, color:T.accent }}>📷 Scan Barcode</span>
        <span style={{ fontSize:12, color:libReady?T.green:T.textMuted }}>
          {libReady ? '✓ Scanner ready' : 'Loading scanner…'}
        </span>
      </div>

      {/* Camera view */}
      {status !== 'no-camera' && (
        <div style={{ position:'relative', flex:1, background:'#000', overflow:'hidden' }}>
          <video ref={videoRef} muted playsInline autoPlay
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />

          {/* Scan frame overlay */}
          {status === 'scanning' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              {/* Dark corners */}
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} />
              {/* Transparent scan window */}
              <div style={{ position:'relative', width:'78%', height:'22%', zIndex:1 }}>
                {/* Corner brackets */}
                {[
                  { top:0, left:0, borderTop:`3px solid ${T.accent}`, borderLeft:`3px solid ${T.accent}` },
                  { top:0, right:0, borderTop:`3px solid ${T.accent}`, borderRight:`3px solid ${T.accent}` },
                  { bottom:0, left:0, borderBottom:`3px solid ${T.accent}`, borderLeft:`3px solid ${T.accent}` },
                  { bottom:0, right:0, borderBottom:`3px solid ${T.accent}`, borderRight:`3px solid ${T.accent}` },
                ].map((s, i) => (
                  <div key={i} style={{ position:'absolute', width:24, height:24, ...s }} />
                ))}
                {/* Animated scan line */}
                <div style={{
                  position:'absolute', left:4, right:4, height:2,
                  background:`linear-gradient(90deg,transparent,${T.accent},transparent)`,
                  boxShadow:`0 0 8px ${T.accent}`,
                  animation:'scanLine 1.6s ease-in-out infinite',
                }} />
              </div>
              {/* Hint */}
              <div style={{ position:'absolute', bottom:20, left:0, right:0, textAlign:'center' }}>
                <span style={{ background:'rgba(0,0,0,0.75)', color:'#fff', fontSize:13, padding:'7px 16px', borderRadius:20 }}>
                  {hint}
                </span>
              </div>
            </div>
          )}

          {status === 'starting' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14 }}>
              Starting camera…
            </div>
          )}
        </div>
      )}

      {/* No camera fallback */}
      {status === 'no-camera' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24, textAlign:'center' }}>
          <div style={{ fontSize:52 }}>📵</div>
          <div style={{ color:'#fff', fontSize:16, fontWeight:700 }}>Camera unavailable</div>
          <div style={{ color:T.red, fontSize:13, maxWidth:280 }}>{errMsg}</div>
          <div style={{ color:'#888', fontSize:13 }}>Use the options below instead</div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{ padding:'12px 16px', background:'rgba(0,0,0,0.92)', flexShrink:0 }}>

        {/* Scan from photo button */}
        <button onClick={() => fileRef.current?.click()}
          style={{ width:'100%', background:T.surfaceHigh, border:`1px solid ${T.border}`, color:T.text,
            borderRadius:12, padding:'11px', fontWeight:700, cursor:'pointer', fontSize:14, marginBottom:10 }}>
          🖼️ Scan from Photo / Gallery
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={decodePhoto} style={{ display:'none' }} />

        {/* Manual entry */}
        <div style={{ fontSize:11, color:'#666', fontWeight:700, letterSpacing:1, marginBottom:6 }}>OR ENTER BARCODE MANUALLY</div>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <Input value={manual} onChange={e => setManual(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && manual.trim() && (stop(), onResult(manual.trim()))}
            placeholder="e.g. 8410076901033" type="number" />
          <Btn onClick={() => manual.trim() && (stop(), onResult(manual.trim()))} style={{ flexShrink:0 }}>
            Go
          </Btn>
        </div>

        <button onClick={close}
          style={{ width:'100%', background:T.red, border:'none', color:'#fff', borderRadius:12,
            padding:'13px', fontWeight:800, cursor:'pointer', fontSize:15,
            marginBottom:'env(safe-area-inset-bottom)' }}>
          ✕ Close
        </button>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 2px; opacity: 1; }
          50%  { top: calc(100% - 4px); opacity: 0.6; }
          100% { top: 2px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
