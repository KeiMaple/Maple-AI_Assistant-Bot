# Maple-AI_Assistant-Bot (Still in Early-Testing Development)

6 Files Included:
File            |   Role

index.html      |   App shell, security headers, UI structure

style.css       |   Full pink aesthetic — dark rose, ambient orbs, mobile-first

brain.js        |   Maple's entire AI — knowledge base, memory engine, NLP, learning

app.js          |   UI controller — events, security, rendering, PWA boot

sw.js           |   Service worker — offline support, asset caching

manifest.json   |   PWA manifest — makes it installable on phone + laptop


* How to install it as an actual app *
  
Phone Installation (Android/iOS):
1. Unzip and upload the folder to any free static host — GitHub Pages or Netlify (drag and drop, free, 2 minutes)
2. Open the URL in Chrome/Safari
3. Tap the browser menu → "Add to Home Screen"
4. Maple appears as a real app icon on your home screen — opens fullscreen, no browser chrome
5. [Maple-App.zip](https://github.com/user-attachments/files/26484191/Maple-App.zip)

Laptop Installation:
1. Open the hosted URL in Chrome or Edge
2. Click the install icon in the address bar (or menu → Install Maple)
3. It installs as a standalone desktop app
4. To run locally for testing: open a terminal in the folder → python -m http.server 8000 → go to localhost:8000


What Maple's brain does:

10 knowledge domains    —   greetings, math, coding, game dev, writing, cloud/tech, study help, motivation, planning, recommendations

Auto-learner            —   17 regex patterns extract facts from conversation ("I love game dev") and save them automatically

Manual memory           —   add facts directly in the Memory panel; Maple injects them into every response

Generative fallback     —   when nothing matches, Maple detects question type, checks your memory context, and generates a thoughtful reply

Math engine             —   safely evaluates arithmetic from natural language

Response styles         —   balanced, concise, detailed, casual (Settings panel)

Session history         —   last 20 conversations saved and shown in the sidebar

