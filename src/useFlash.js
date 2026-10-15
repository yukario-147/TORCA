// src/useFlash.js
// 一定時間で消えるメッセージ（連続表示でも前のタイマーが新しいメッセージを消さない）

import { useState, useRef, useEffect, useCallback } from 'react';

export function useFlash() {
  const [msg, setMsg] = useState(null); // { text, kind: 'ok' | 'warn' | 'err' | 'info' }
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback((text, kind = 'ok', ms = 4000) => {
    clearTimeout(timer.current);
    setMsg(text ? { text, kind } : null);
    if (text && ms) timer.current = setTimeout(() => setMsg(null), ms);
  }, []);
  return [msg, flash];
}
