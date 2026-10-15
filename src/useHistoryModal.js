// src/useHistoryModal.js
// モーダル表示中は履歴を1つ積み、Android の「戻る」でアプリではなくモーダルが閉じるようにする。
// 戻り値の関数でモーダルを閉じる（積んだ履歴を戻し、popstate 経由で onClose が呼ばれる）

import { useEffect, useRef, useCallback } from 'react';

export function useHistoryModal(onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), torcaModal: true }, '');
    const onPop = () => onCloseRef.current?.();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return useCallback(() => {
    if (window.history.state?.torcaModal) window.history.back();
    else onCloseRef.current?.();
  }, []);
}
