document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const apiKeyInput = document.getElementById('api-key');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const currentModeTitle = document.getElementById('current-mode-title');
    const speakerToggle = document.getElementById('speaker-toggle');
    const aiModelSelect = document.getElementById('ai-model');
    const apiKeyLabel = document.getElementById('api-key-label');

    // State Variables
    let currentMode = 'general'; // 'general' or 'resume'
    let isRecording = false;
    let voiceEnabled = true;

    // ----- SPEECH ABILITY ----- //
    const windowSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = window.speechSynthesis;
    let recognition;

    if (windowSpeechRecognition) {
        recognition = new windowSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            handleUserSubmit();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            stopRecording();
        };

        recognition.onend = () => {
            stopRecording();
        };
    } else {
        if(micBtn) micBtn.style.display = 'none';
        console.warn("Speech Recognition not supported in this browser.");
    }

    function toggleRecording() {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    function stopRecording() {
        isRecording = false;
        if(micBtn) micBtn.classList.remove('recording');
    }

    function speak(text) {
        if (!voiceEnabled || !synth) return;
        
        // Strip simple markdown formatting before speaking
        let strippedText = text.replace(/[*#_`~|-]/g, '');
        // Remove codeblocks completely if they exist (simplification)
        strippedText = strippedText.replace(/```[\s\S]*?```/g, "Code block provided.");
        
        const utterance = new SpeechSynthesisUtterance(strippedText);
        
        let voices = synth.getVoices();
        // Prefers Google US English voice if available, else first US English voice
        let enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices.find(v => v.lang === 'en-US');
        if(enVoice) utterance.voice = enVoice;
        
        synth.speak(utterance);
    }

    // Attempt to load voices ASAP
    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = synth.getVoices;
    }

    if(speakerToggle) {
        speakerToggle.addEventListener('click', () => {
            voiceEnabled = !voiceEnabled;
            speakerToggle.classList.toggle('active', voiceEnabled);
            if(!voiceEnabled) synth.cancel();
        });
    }

    // ----- UI INTERACTION ----- //
    if(micBtn) micBtn.addEventListener('click', toggleRecording);
    
    if(sendBtn) sendBtn.addEventListener('click', handleUserSubmit);
    if(chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleUserSubmit();
        });
    }

    if (aiModelSelect && apiKeyLabel) {
        aiModelSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'openai') {
                apiKeyLabel.textContent = 'OpenAI API Key';
            } else {
                apiKeyLabel.textContent = 'Gemini API Key';
            }
            localStorage.setItem('nexus_ai_model', val);
        });
    }

    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', (e) => {
            localStorage.setItem('nexus_api_key', e.target.value.trim());
        });
    }

    // Load saved settings
    if (apiKeyInput) {
        const savedKey = localStorage.getItem('nexus_api_key');
        if (savedKey) apiKeyInput.value = savedKey;
    }

    if (aiModelSelect) {
        const savedModel = localStorage.getItem('nexus_ai_model');
        if (savedModel) {
            aiModelSelect.value = savedModel;
            aiModelSelect.dispatchEvent(new Event('change'));
        }
    }

    function appendMessage(text, sender, isMarkdown = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        if(isMarkdown && typeof marked !== 'undefined') {
             bubble.innerHTML = marked.parse(text);
        } else {
             bubble.textContent = text;
        }

        msgDiv.appendChild(bubble);
        if(chatWindow) {
            chatWindow.appendChild(msgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    function showTyping() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator active';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        if(chatWindow) {
            chatWindow.appendChild(indicator);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    function hideTyping() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function appendSystemMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message system`;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text;
        msgDiv.appendChild(bubble);
        if(chatWindow) {
            chatWindow.appendChild(msgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    // ----- MODE SWITCHING ----- //
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            
            if(currentMode === 'general') {
                if(currentModeTitle) currentModeTitle.textContent = "General Conversation";
                appendSystemMessage("Mode switched to General AI. Ask me anything.");
                speak("Switched to General AI mode.");
            } else {
                if(currentModeTitle) currentModeTitle.textContent = "Resume Builder";
                resumeState = 0; // Reset builder state
                appendSystemMessage("Mode switched to Resume Builder. I will ask you a series of questions to generate your resume. Let's begin!");
                speak("Switched to Resume Builder mode. Let's begin building your resume.");
                setTimeout(() => processResumeBuilder("start"), 1500);
            }
        });
    });

    // ----- LOGIC ----- //
    async function handleUserSubmit() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';

        showTyping();

        if (currentMode === 'general') {
            await processGeneralChat(text);
        } else {
            await processResumeBuilder(text);
        }
    }

    // --- General Chat Logic --- //
    async function processGeneralChat(prompt) {
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        const selectedModel = aiModelSelect ? aiModelSelect.value : 'openai';

        if (apiKey) {
            try {
                if (selectedModel === 'openai') {
                   const response = await fetch("https://api.openai.com/v1/chat/completions", {
                       method: 'POST',
                       headers: { 
                           'Content-Type': 'application/json',
                           'Authorization': `Bearer ${apiKey}`
                       },
                       body: JSON.stringify({
                           model: "gpt-3.5-turbo",
                           messages: [{ role: "user", content: prompt }]
                       })
                   });
                   hideTyping();
                   if(response.ok) {
                       const data = await response.json();
                       const aiText = data.choices[0].message.content;
                       appendMessage(aiText, 'bot', true);
                       speak(aiText);
                   } else {
                       const err = await response.json();
                       appendSystemMessage(`OpenAI API Error: ${err.error.message}`);
                       speak("API error encountered.");
                   }
                } 
                else if (selectedModel === 'gemini') {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });
                    
                    hideTyping();
                    
                    if (response.ok) {
                        const data = await response.json();
                        const aiText = data.candidates[0].content.parts[0].text;
                        appendMessage(aiText, 'bot', true);
                        speak(aiText);
                    } else {
                        const err = await response.json();
                        appendSystemMessage(`Gemini API Error: ${err.error.message || "Unknown error"}`);
                        speak("API error encountered.");
                    }
                }
            } catch (error) {
                hideTyping();
                appendSystemMessage(`Network Error: ${error.message}`);
                speak("I encountered a network error.");
            }
            
        } else {
            // Mock Response
            setTimeout(() => {
                hideTyping();
                const mockReply = `I am a simulated AI response to: "${prompt}". Please enter an OpenAI or Gemini API key in the settings panel for live answers.`;
                appendMessage(mockReply, 'bot');
                speak(mockReply);
            }, 1000);
        }
    }

    // --- Resume Builder Logic --- //
    let resumeState = 0;
    let resumeData = {};
    const resumeQuestions = [
        { key: 'name', q: "What is your full name?" },
        { key: 'email', q: "What is your email address?" },
        { key: 'phone', q: "What is your phone number?" },
        { key: 'experience', q: "Please describe your most recent work experience (Role, Company, Years, Responsibilities)." },
        { key: 'education', q: "What is your highest level of education and where did you complete it?" },
        { key: 'skills', q: "List a few of your top skills (comma separated)." }
    ];

    async function processResumeBuilder(input) {
        if (input !== "start") {
             // Save previous answer
             if (resumeState > 0 && resumeState <= resumeQuestions.length) {
                 const prevQ = resumeQuestions[resumeState - 1];
                 resumeData[prevQ.key] = input;
             }
        }

        if (resumeState < resumeQuestions.length) {
            // Ask next question
            setTimeout(() => {
                hideTyping();
                const nextQ = resumeQuestions[resumeState].q;
                appendMessage(nextQ, 'bot');
                speak(nextQ);
                resumeState++;
            }, 800);
        } else {
            // Generate Resume
            setTimeout(() => {
                hideTyping();
                const completionMsg = "Excellent! I have all the details. Generating your professional resume now...";
                appendMessage(completionMsg, 'bot');
                speak("Excellent! I have all the details. Generating your professional resume now...");
                
                setTimeout(() => {
                    const resumeMarkdown = generateResumeMarkdown(resumeData);
                    appendMessage(resumeMarkdown, 'bot', true);
                    speak("Your resume is ready!");
                    
                    // Reset
                    resumeState = 0;
                    resumeData = {};
                    appendSystemMessage("Resume generated! You can switch back to General Chat, or we can start over.");
                }, 2000);
            }, 800);
        }
    }

    function generateResumeMarkdown(data) {
        return `
# ${data.name || "N/A"}
**Email:** ${data.email || "N/A"} | **Phone:** ${data.phone || "N/A"}

---

## 💼 Professional Experience
* ${data.experience || "N/A"}

## 🎓 Education
* ${data.education || "N/A"}

## 🛠️ Skills
* ${data.skills || "N/A"}

---
*Resume generated by Nexus AI Builder*
        `;
    }
});
