// src/playerContext.js
// プレイヤーのコンテキスト定義（player.jsx とコンポーネント間の循環を避けるため分離）

import { createContext, useContext } from 'react';

export const PlayerCtx = createContext(null);

// PlayerProvider の外では null を返す（ClipRow 等は外部リンクにフォールバック）
export const usePlayer = () => useContext(PlayerCtx);
