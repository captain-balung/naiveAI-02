// 動態從專案屬性中抓取金鑰
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action; 

    // 任務路由判斷
    if (action === "generateWord") {
      // 任務一：AI 自動出題
      const word = generateTargetWord();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", word: word }))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "guess") {
      // 任務二：執行反向猜謎
      const targetWord = data.targetWord;
      const clues = data.clues;
      const reply = getGeminiGuess(targetWord, clues);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", reply: reply }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("未知的行動指令");
    }
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 新增功能：讓 AI 隨機生成一個國小程度的題目
function generateTargetWord() {
  const prompt = `
  請隨機想一個適合台灣國小學生玩猜謎遊戲的常見名詞。
  範圍可以是：動物、水果、日常用品、交通工具或自然現象。
  
  【嚴格格式要求】
  - 只能輸出「詞彙本身」（字數在 2 到 4 個字之間）。
  - 絕對不要加上任何標點符號、換行或額外的解釋文字。
  - 例如：蘋果、腳踏車、長頸鹿、橡皮擦。
  `;

  return callGemini(prompt);
}

// 核心功能：組裝 Prompt 並呼叫 Gemini 進行反向猜測
function getGeminiGuess(targetWord, clues) {
  const cluesText = clues.join("、");
  const prompt = `
  你現在是一個正在跟國小學生玩「反向猜謎」的機器人。
  
  【遊戲狀態】
  1. 這一局的終極答案是：「${targetWord}」。(你絕對不能輕易說出這個答案！)
  2. 玩家目前給的線索有：【${cluesText}】。
  
  【你的思考邏輯與行動規則】
  - 情況 A (發散)：如果玩家給的線索，還能符合「除了 ${targetWord} 以外」的其他物品，你 **必須** 猜那個其他的物品。並用調皮的語氣問玩家：「我猜一定是 [其他物品] 對不對！還有別的特徵嗎？」
  - 情況 B (收斂認輸)：如果玩家給的線索交集起來，已經極度強烈指向「${targetWord}」，再猜別的會極度不合理時，你必須承認被打敗。並驚訝地說：「太厲害了！這些特徵加起來... 答案只能是『${targetWord}』對不對！」
  
  【回應要求】
  - 語氣活潑、友善。
  - 使用繁體中文 (台灣用語)。
  - 總字數嚴格控制在 50 字以內。
  `;

  return callGemini(prompt);
}

// 建立一個共用的呼叫函式，讓程式碼更乾淨
function callGemini(promptText) {
  const payload = {
    "contents": [{
      "parts": [{ "text": promptText }]
    }]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true 
  };

  const response = UrlFetchApp.fetch(GEMINI_API_URL, options);
  const result = JSON.parse(response.getContentText());
  
  if (result.candidates && result.candidates.length > 0) {
    return result.candidates[0].content.parts[0].text.trim();
  } else {
    return "系統思考中...";
  }
}