# StudyHub AI

A modern, responsive, and intelligent study notes platform built with React, Supabase, and AI. StudyHub allows students to browse notes and ask questions to an AI assistant that "reads" the uploaded content (including PDFs).

## 🚀 Features

- **AI Study Assistant**: Chat with your notes! The AI analyzes uploaded documents (PDFs, text) and answers questions based on their content.
- **Responsive Design (RWA)**: Fully responsive interface that works perfectly on desktops, tablets, and mobile phones.
- **Progressive Web App (PWA)**: Installable as a native-like app on all devices with offline support.
- **Role-Based Access**:
  - **Students**: Browse notes, search/filter by subject, and chat with the AI.
  - **Staff**: Upload PDF/text notes, manage content, and delete outdated materials.
- **Smart PDF Processing**: Automatically extracts text from uploaded PDFs using `pdfjs-dist` for AI analysis.
- **Secure Authentication**: Powered by Supabase Auth (Email/Password).

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Backend & Auth**: Supabase
- **AI/LLM**: OpenAI (via Supabase Edge Functions)
- **PDF Processing**: PDF.js (`pdfjs-dist`)
- **Deployment**: GitHub Actions (GitHub Pages)

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- A Supabase project

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/study-notes-chatbot.git
cd study-notes-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> [!IMPORTANT]
> **Edit the API Key and ANON Key**: You must create your own account in Supabase and replace the values above with your project's credentials. Using the default or incorrect keys will cause database connection issues and "Failed to fetch" errors.
>
> **Location**: You can find these keys in your Supabase Dashboard under **Project Settings > API**.

### 4. Database Setup
Run the SQL queries in `migrations/20251029094236_create_study_notes_schema.sql` in your Supabase SQL Editor to sets up:
- Tables (`profiles`, `study_notes`, `chat_sessions`, `chat_messages`)
- RLS Policies (Security)
- Storage Buckets (`study-notes`)

### 5. Deploy Edge Function
Deploy the chat function to Supabase:
```bash
npx supabase functions deploy chat --no-verify-jwt
```
*Note: Set your `OPENAI_API_KEY` in Supabase project secrets.*

### 6. Run Locally
```bash
npm run dev
```

## 📱 PWA / Mobile Installation

**On Android/iOS**:
1. Open the app in Chrome/Safari.
2. Tap "Share" (iOS) or the Menu (Android).
3. Select **"Add to Home Screen"**.

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
