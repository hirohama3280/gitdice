// ==========================================
// ① ゲームの設定（お宝・ヒント・プレイヤー）
// ==========================================

// 参加プレイヤーの定義（アイコンはお好みで変更してください）
const TEAM_MEMBERS = [
    { id: "playerA", name: "社長A", icon: "😎" },
    { id: "playerB", name: "社長B", icon: "🤠" },
    { id: "playerC", name: "社長C", icon: "👽" },
    { id: "playerD", name: "社長D", icon: "🤖" },
    { id: "playerE", name: "社長E", icon: "👻" }
];

// 👑 お宝が隠されているマス（参加者には内緒！）
const TREASURE_CELL = 23; // 例: 江の島

// 💡 ヒントが隠されているマス
const HINT_CELLS = {
    5: "古文書の切れ端：「お宝は15番以降のマスにある…」",
    12: "村人の噂：「お宝がある駅からは、潮の香りがするらしいべ」",
    28: "謎の石版：「お宝は通り過ぎたようだ。もっと西を探せ…」"
};

// 本来は history.js から import しますが、今回はテスト用にここで定義します。
// 実際のゲーム進行時は、みんなのコミット履歴がここにどんどん追加されていきます。
const gameHistory = [
    // テスト用データ（最初から少し進んだ状態にしたい場合はコメントを外してください）
    // { turn: 1, player: "playerA", move: 4, event: "テスト" },
];


// ==========================================
// ② 盤面の制御とアニメーション処理
// ==========================================

// 指定したミリ秒だけ待機する関数（アニメーション用）
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 履歴から全員の現在位置（1〜30）を計算する関数
function getPlayerPositions() {
    const positions = {};
    // 全員1マス目（横浜）からスタート
    TEAM_MEMBERS.forEach(p => positions[p.id] = 1);

    gameHistory.forEach(record => {
        if (positions[record.player] !== undefined) {
            positions[record.player] += record.move;
            // 1未満にはならない、30を超えないように制御
            if (positions[record.player] < 1) positions[record.player] = 1;
            if (positions[record.player] > 30) positions[record.player] = 30;
        }
    });
    return positions;
}

// コマを1マスずつ動かすアニメーション（前後対応）
async function movePiece(playerId, startPos, endPos) {
    const pieceEl = document.getElementById(`piece-${playerId}`);
    if (!pieceEl) return;

    // 進む場合は 1、戻る場合は -1 ずつマスを移動する
    const step = startPos < endPos ? 1 : -1;
    let currentPos = startPos;

    // 目的地のマスに着くまでループ
    while (currentPos !== endPos) {
        currentPos += step;

        // 範囲外エラー防止
        if (currentPos < 1) currentPos = 1;
        if (currentPos > 30) currentPos = 30;

        const targetCell = document.getElementById(`cell-${currentPos}`);
        if (!targetCell) break;

        // 画面上の絶対座標を計算して移動
        const cellRect = targetCell.getBoundingClientRect();
        const boardRect = document.getElementById('board-wrapper').getBoundingClientRect();

        // マスの中心座標に合わせてコマを移動（CSSの margin-top/left で微調整済み）
        pieceEl.style.left = `${cellRect.left - boardRect.left + (targetCell.offsetWidth / 2)}px`;
        pieceEl.style.top = `${cellRect.top - boardRect.top + (targetCell.offsetHeight / 2)}px`;

        // 1マス進むごとに0.4秒待つ
        await sleep(400);
    }
}

// 起動時に盤面をセットアップしてコマを配置する
function initBoard() {
    const positions = getPlayerPositions();
    const piecesContainer = document.getElementById('pieces-container');
    const boardRect = document.getElementById('board-wrapper').getBoundingClientRect();

    TEAM_MEMBERS.forEach(player => {
        // コマのHTML要素を作成
        let pieceEl = document.getElementById(`piece-${player.id}`);
        if (!pieceEl) {
            pieceEl = document.createElement('div');
            pieceEl.id = `piece-${player.id}`;
            pieceEl.className = 'piece';
            pieceEl.innerText = player.icon;
            piecesContainer.appendChild(pieceEl);
        }

        // 現在のマスに配置
        const pos = positions[player.id];
        const targetCell = document.getElementById(`cell-${pos}`);
        if (targetCell) {
            const cellRect = targetCell.getBoundingClientRect();
            pieceEl.style.left = `${cellRect.left - boardRect.left + (targetCell.offsetWidth / 2)}px`;
            pieceEl.style.top = `${cellRect.top - boardRect.top + (targetCell.offsetHeight / 2)}px`;
        }
    });
}


// ==========================================
// ③ サイコロと探査（お宝探し）のロジック
// ==========================================

let currentDiceValue = 0; // 振ったサイコロの目を一時保存

// サイコロを振るボタンの処理
document.getElementById('dice-button').addEventListener('click', async () => {
    const diceBtn = document.getElementById('dice-button');
    const diceDisplay = document.getElementById('dice');

    // 連打防止
    diceBtn.disabled = true;

    // ガチャガチャ回るアニメーション
    diceDisplay.style.transform = "scale(1.3) rotate(360deg)";
    diceDisplay.style.transition = "transform 0.4s ease-in-out";
    await sleep(400);

    // サイコロの出目（1〜6）を確定
    currentDiceValue = Math.floor(Math.random() * 6) + 1;
    diceDisplay.innerText = `🎲 ${currentDiceValue}`;
    diceDisplay.style.transform = "scale(1) rotate(0deg)";

    // 方向選択ボタンを表示する
    document.getElementById('direction-buttons').style.display = 'block';
});

// 方向ボタン（進む/戻る）を押したときの処理
function handleMove(direction) {
    // ボタンを隠す
    document.getElementById('direction-buttons').style.display = 'none';

    // 💡 テスト用: 今回は「playerA」を操作するものとして固定しています。
    // 実際のワークショップでは、各チームのPCごとにこのIDを変更して配布するか、
    // 画面上に「自分のプレイヤーを選ぶ」プルダウンを作ると親切です。
    const myPlayerId = "playerA";

    const positions = getPlayerPositions();
    const currentPos = positions[myPlayerId];

    // directionが 1 ならプラス（進む）、-1 ならマイナス（戻る）
    const moveValue = currentDiceValue * direction;
    let tempTargetPos = currentPos + moveValue;

    // マップの範囲外（1未満、30超過）に出ないように補正
    if (tempTargetPos < 1) tempTargetPos = 1;
    if (tempTargetPos > 30) tempTargetPos = 30;

    let eventText = `${currentDiceValue}マス探査した！`;
    let isTreasureFound = false;

    // --- お宝＆ヒントの判定 ---
    if (tempTargetPos === TREASURE_CELL) {
        eventText = `🎉 キタコレ！！伝説のお宝をついに発見！！ 🎉`;
        isTreasureFound = true;
    } else if (HINT_CELLS[tempTargetPos]) {
        eventText = `💡 ヒント発見！ ${HINT_CELLS[tempTargetPos]}`;
    } else {
        eventText += " しかし何も見つからなかった…。";
    }

    // --- 画面への結果表示と Git用コードの生成 ---
    const resultTextEl = document.getElementById('event-result-text');
    resultTextEl.innerText = eventText;

    // お宝発見時は文字を派手にする
    if (isTreasureFound) {
        resultTextEl.style.color = "#e74c3c";
        resultTextEl.style.fontSize = "22px";
        resultTextEl.style.animation = "pulse 1s infinite";
    } else {
        resultTextEl.style.color = "#16a085";
        resultTextEl.style.fontSize = "18px";
    }

    // history.js 追記用のコードを組み立てる
    // 実際の運用では turn の数値を動的に計算する処理を入れるとさらに良くなります
    const copyCode = `{ turn: 1, player: "${myPlayerId}", move: ${moveValue}, event: "${eventText}" },`;

    document.getElementById('copy-code-area').value = copyCode;
    document.getElementById('result-area').style.display = 'block';

    // 自分の画面上だけで先にコマを動かすアニメーションを実行
    movePiece(myPlayerId, currentPos, tempTargetPos);
}

// 進行方向ボタンにイベントを紐付け
document.getElementById('btn-forward').addEventListener('click', () => handleMove(1));
document.getElementById('btn-backward').addEventListener('click', () => handleMove(-1));

// ==========================================
// ④ アプリケーション起動
// ==========================================
initBoard();