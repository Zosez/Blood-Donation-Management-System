// lifelink-chat.js – LifeLink AI Chat (no emojis)
(function() {
    // ========== CUSTOMIZATION ==========
    const CUSTOM_LOGO_URL = null;   // optional: set your logo URL
    const PRIMARY_COLOR = "#E11D2E"; // LifeLink red
    // =================================

    const API_KEY = "AIzaSyA8im7cMDvIJ5xAPRAJ5h9ovRtXyzDn7RM";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    if (document.getElementById('lifeLinkAIChat')) return;

    // ---------- FIXED CSS (red & white theme) ----------
    const style = document.createElement('style');
    style.textContent = `
        #lifeLinkAIChat {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        #lifeLinkAIChat * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        #lifeLinkAIChat .ai-chat-toggle {
            width: 60px;
            height: 60px;
            background: ${PRIMARY_COLOR};
            border-radius: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
            border: none;
            color: white;
            font-size: 26px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        #lifeLinkAIChat .ai-chat-toggle:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        #lifeLinkAIChat .ai-chat-window {
            position: absolute;
            bottom: 75px;
            right: 0;
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
            transform-origin: bottom right;
            opacity: 0;
            visibility: hidden;
            transform: scale(0.95);
            pointer-events: none;
            border: 1px solid rgba(0,0,0,0.05);
        }
        #lifeLinkAIChat .ai-chat-window.open {
            opacity: 1;
            visibility: visible;
            transform: scale(1);
            pointer-events: auto;
        }
        #lifeLinkAIChat .ai-chat-header {
            background: white;
            padding: 14px 18px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #lifeLinkAIChat .ai-header-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        #lifeLinkAIChat .ai-header-logo {
            width: 36px;
            height: 36px;
            background: ${PRIMARY_COLOR};
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
        }
        #lifeLinkAIChat .ai-header-text h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #1e1e2f;
            margin: 0;
        }
        #lifeLinkAIChat .ai-header-text p {
            font-size: 0.7rem;
            color: #666;
            margin: 2px 0 0;
        }
        #lifeLinkAIChat .ai-close-btn {
            background: transparent;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 18px;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        #lifeLinkAIChat .ai-close-btn:hover {
            background: #f0f0f0;
            color: #333;
        }
        #lifeLinkAIChat .ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 18px 16px;
            background: #fafafc;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        #lifeLinkAIChat .ai-messages::-webkit-scrollbar { width: 4px; }
        #lifeLinkAIChat .ai-messages::-webkit-scrollbar-track { background: #eaeaea; border-radius: 4px; }
        #lifeLinkAIChat .ai-messages::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        #lifeLinkAIChat .ai-message {
            display: flex;
            max-width: 85%;
            animation: fadeIn 0.2s ease;
        }
        #lifeLinkAIChat .ai-message.user {
            align-self: flex-end;
            justify-content: flex-end;
        }
        #lifeLinkAIChat .ai-message.bot {
            align-self: flex-start;
            justify-content: flex-start;
        }
        #lifeLinkAIChat .ai-bubble {
            padding: 10px 14px;
            border-radius: 18px;
            font-size: 0.85rem;
            line-height: 1.45;
            word-break: break-word;
            max-width: 100%;
        }
        #lifeLinkAIChat .user .ai-bubble {
            background: ${PRIMARY_COLOR};
            color: white;
            border-bottom-right-radius: 4px;
            text-align: left;
        }
        #lifeLinkAIChat .bot .ai-bubble {
            background: white;
            border: 1px solid #eaeef2;
            color: #2c3e50;
            border-bottom-left-radius: 4px;
            text-align: left;
        }
        #lifeLinkAIChat .ai-typing {
            background: white;
            border-radius: 18px;
            padding: 10px 16px;
            display: inline-flex;
            gap: 5px;
            border: 1px solid #eaeef2;
        }
        #lifeLinkAIChat .ai-typing span {
            width: 6px;
            height: 6px;
            background: ${PRIMARY_COLOR};
            border-radius: 3px;
            display: inline-block;
            animation: typingBounce 1.2s infinite;
        }
        #lifeLinkAIChat .ai-typing span:nth-child(2) { animation-delay: 0.15s; }
        #lifeLinkAIChat .ai-typing span:nth-child(3) { animation-delay: 0.3s; }
        #lifeLinkAIChat .ai-quick-replies {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 12px 14px;
            background: white;
            border-top: 1px solid #f0f0f0;
        }
        #lifeLinkAIChat .ai-quick-chip {
            background: #f2f3f7;
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 0.75rem;
            font-weight: 500;
            color: #1e1e2f;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        #lifeLinkAIChat .ai-quick-chip:hover {
            background: ${PRIMARY_COLOR};
            color: white;
        }
        #lifeLinkAIChat .ai-input-area {
            background: white;
            border-top: 1px solid #f0f0f0;
            padding: 12px 14px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        #lifeLinkAIChat .ai-input-area input {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 40px;
            padding: 10px 16px;
            font-size: 0.85rem;
            outline: none;
            font-family: inherit;
            background: #fafafc;
        }
        #lifeLinkAIChat .ai-input-area input:focus {
            border-color: ${PRIMARY_COLOR};
            background: white;
        }
        #lifeLinkAIChat .ai-input-area button {
            background: ${PRIMARY_COLOR};
            border: none;
            width: 38px;
            height: 38px;
            border-radius: 19px;
            color: white;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #lifeLinkAIChat .ai-input-area button:hover {
            filter: brightness(0.9);
        }
        #lifeLinkAIChat .ai-disclaimer {
            font-size: 0.6rem;
            text-align: center;
            background: #fef9f5;
            padding: 8px;
            color: #888;
            border-top: 1px solid #f0f0f0;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-5px); opacity: 1; }
        }
        @media (max-width: 520px) {
            #lifeLinkAIChat .ai-chat-window {
                width: 340px;
                height: 550px;
                right: -10px;
                bottom: 72px;
            }
            #lifeLinkAIChat {
                bottom: 16px;
                right: 16px;
            }
            #lifeLinkAIChat .ai-chat-toggle {
                width: 52px;
                height: 52px;
                font-size: 22px;
            }
        }
    `;
    document.head.appendChild(style);

    // Load Font Awesome if not present
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
        document.head.appendChild(fa);
    }

    // Build widget
    const chatRoot = document.createElement('div');
    chatRoot.id = 'lifeLinkAIChat';

    const logoHTML = CUSTOM_LOGO_URL
        ? `<img src="${CUSTOM_LOGO_URL}" class="ai-header-logo" alt="logo" style="object-fit: cover;">`
        : `<div class="ai-header-logo"><i class="fas fa-heartbeat"></i></div>`;

    chatRoot.innerHTML = `
        <div class="ai-chat-toggle"><i class="fas fa-comment-medical"></i></div>
        <div class="ai-chat-window">
            <div class="ai-chat-header">
                <div class="ai-header-info">
                    ${logoHTML}
                    <div class="ai-header-text">
                        <h3>LifeLink AI Chat</h3>
                        <p>Powered by Gemini 2.5 Flash</p>
                    </div>
                </div>
                <button class="ai-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="ai-messages"></div>
            <div class="ai-quick-replies"></div>
            <div class="ai-input-area">
                <input type="text" placeholder="Ask me about blood donation...">
                <button class="ai-send-btn"><i class="fas fa-arrow-up"></i></button>
            </div>
            <div class="ai-disclaimer">
                <i class="fas fa-info-circle"></i> AI for informational purposes only
            </div>
        </div>
    `;
    document.body.appendChild(chatRoot);

    // DOM elements
    const toggleBtn = chatRoot.querySelector('.ai-chat-toggle');
    const chatWindow = chatRoot.querySelector('.ai-chat-window');
    const closeBtn = chatRoot.querySelector('.ai-close-btn');
    const messagesContainer = chatRoot.querySelector('.ai-messages');
    const userInput = chatRoot.querySelector('.ai-input-area input');
    const sendBtn = chatRoot.querySelector('.ai-send-btn');
    const quickRepliesContainer = chatRoot.querySelector('.ai-quick-replies');

    let isLoading = false;

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addMessage(sender, content, isHTML = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${sender}`;
        const bubble = document.createElement('div');
        bubble.className = 'ai-bubble';
        if (isHTML) bubble.innerHTML = content;
        else bubble.textContent = content;
        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTyping() {
        if (document.getElementById('aiTypingIndicator')) return;
        const typingDiv = document.createElement('div');
        typingDiv.id = 'aiTypingIndicator';
        typingDiv.className = 'ai-message bot';
        typingDiv.innerHTML = `<div class="ai-typing"><span></span><span></span><span></span></div>`;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
        isLoading = true;
    }

    function removeTyping() {
        const el = document.getElementById('aiTypingIndicator');
        if (el) el.remove();
        isLoading = false;
    }

    // Gemini API call (no emojis in prompt)
    async function getGeminiResponse(userMessage) {
        const systemPrompt = `You are LifeLink AI Chat, the official assistant for LifeLink, a blood donation platform. Answer only questions about blood donation and LifeLink. Our platform connects donors and recipients in under 5 minutes, supports all blood types, and has a simple 3-step process: Register, Get matched, Save a life. If a user asks about something unrelated, politely say you can only assist with blood donation and LifeLink. Keep answers concise (2-4 sentences), friendly, and medically accurate. Do not use any emojis in your responses.`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error ${response.status}`);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text || isLoading) return;
        userInput.value = '';
        addMessage('user', text);
        showTyping();

        try {
            const reply = await getGeminiResponse(text);
            removeTyping();
            addMessage('bot', reply, true);
        } catch (error) {
            removeTyping();
            addMessage('bot', `Could not reach AI: ${error.message}. Please try again.`, true);
        }
        regenerateQuickReplies();
    }

    function regenerateQuickReplies() {
        quickRepliesContainer.innerHTML = '';
        const suggestions = [
            { text: "Eligibility", query: "Who can donate blood?" },
            { text: "Universal donor", query: "Which blood type is the universal donor?" },
            { text: "Donation steps", query: "Walk me through the blood donation process." },
            { text: "Aftercare", query: "How should I take care after donating?" },
            { text: "Frequency", query: "How often can I donate blood safely?" }
        ];
        suggestions.forEach(s => {
            const chip = document.createElement('button');
            chip.className = 'ai-quick-chip';
            chip.textContent = s.text;
            chip.onclick = () => {
                userInput.value = s.query;
                sendMessage();
            };
            quickRepliesContainer.appendChild(chip);
        });
    }

    function initChat() {
        if (messagesContainer.children.length === 0) {
            addMessage('bot', "Welcome to LifeLink AI Chat. I'm here to answer your blood donation questions – eligibility, blood types, donation process, aftercare, and how LifeLink works. Ask away.", true);
            regenerateQuickReplies();
        }
    }

    toggleBtn.onclick = () => {
        chatWindow.classList.toggle('open');
        if (chatWindow.classList.contains('open')) {
            initChat();
            userInput.focus();
        }
    };
    closeBtn.onclick = () => chatWindow.classList.remove('open');
    sendBtn.onclick = sendMessage;
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
})();