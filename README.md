# ✨ Clario – AI-Powered Legal Document Assistant

<p align="center">
  <img src="public/clario-favicon.png" alt="Clario Logo" width="120"/>
</p>

<p align="center">
  🔍 Understand contracts like never before. Clario reads your documents, flags risks, and answers your questions — instantly.
</p>

<p align="center"><a href="https://gen-calrio.web.app/" target="_blank" rel="noopener noreferrer">
  <strong>🚀 Live Demo</strong>
</a>

</p>

---

## 🎯 Project Overview

Clario is an intelligent legal document analyzer built for the Google Cloud & AI Hackathon. It leverages Google's latest AI technologies to make legal document analysis accessible, efficient, and insightful.

### 🌟 Key Problems Solved
- Time-consuming manual contract review
- Missing critical contract terms and risks
- Difficulty in understanding legal jargon
- Inefficient document management
- Limited access to legal expertise

## 🧠 Core Features

- 📄 **Smart Document Processing**
  - Supports PDF and TXT files (DOC/DOCX support coming soon)
  - Automatic text extraction and formatting
  - Secure document storage and management

- 🔍 **AI-Powered Analysis**
  - Risk level assessment (High/Medium/Low)
  - Key terms identification
  - Critical clause detection
  - Completion score calculation

- 💬 **Interactive Document Chat**
  - Ask questions about the document
  - Get explanations of complex terms
  - Extract specific information
  - Natural language interaction

- 📊 **Comprehensive Dashboard**
  - Document overview and statistics
  - Risk distribution visualization
  - Quick access to recent analyses
  - Search and filter capabilities

## 🛠 Technology Stack

### Frontend
- ⚛️ React + TypeScript
- 🏃‍♂️ Vite for fast builds
- 🎨 Tailwind CSS for styling
- 📱 Responsive design

### Google Cloud Services
- 🤖 Gemini AI for analysis
- 📝 Document AI for text extraction
- 🔥 Firebase Suite:
  - Authentication
  - Firestore Database
  - Cloud Storage
  - Hosting

### Development Tools
- 📦 Node.js & npm
- 🧪 Jest for testing
- 📝 ESLint for code quality
- 🔄 Git for version control

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- Google Cloud account
- Firebase project

### Installation

1. Clone the repository
\`\`\`bash
git clone https://github.com/yourusername/gen-clario.git
cd gen-clario
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
Create a .env file in the root directory:
\`\`\`env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
CLARIO_UPLOAD_BUCKET=your_gcs_upload_bucket
DOCUMENT_AI_PROCESSOR_ID=your_processor_id
GEMINI_LOCATION=us-central1
\`\`\`

   **📖 Need help setting up Document AI?** See [DOCUMENT_AI_SETUP.md](./DOCUMENT_AI_SETUP.md) for detailed instructions.

4. Run the development server
\`\`\`bash
npm run dev
\`\`\`

## 📱 Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Upload Document**: Click "New Analysis" and upload your legal document
3. **Review Analysis**: View the AI-generated analysis, risks, and key terms
4. **Chat**: Use the chat interface to ask questions about your document
5. **Dashboard**: Track and manage all your analyzed documents

## 🚀 Deployment

### Quick Setup

1. **Set up Document AI Processor** (Required)
   - 📖 **Complete guide**: [DOCUMENT_AI_SETUP.md](./DOCUMENT_AI_SETUP.md)
   - Create processor in [Google Cloud Console](https://console.cloud.google.com/ai/document-ai/processors)
   - Set `DOCUMENT_AI_PROCESSOR_ID` in Firebase Functions (Console → Functions → Configuration)
   - Add `VITE_DOCUMENT_AI_PROCESSOR_ID` to your `.env` file

2. **Deploy to Firebase (hosting + backend functions)**
   \`\`\`bash
   npm run deploy
   \`\`\`

### Important Notes

- **Document AI**: Must be configured before deployment (see setup guide above)
- **Environment Variables**: Set in Firebase Functions for production
- **Service Account**: Ensure it has "Document AI API User" role

## 🔒 Security Features

- Secure file handling
- Firebase Authentication
- Environment variable protection
- No raw file storage
- Secure API endpoints

## 🌟 Future Enhancements

- [ ] Support for DOC/DOCX files
- [ ] Advanced document comparison
- [ ] Batch processing
- [ ] Custom analysis templates
- [ ] Export functionality
- [ ] Team collaboration features

## 📄 License

This project is licensed under the MIT License, which means you can:
- ✅ Use it commercially
- ✅ Modify it
- ✅ Distribute it
- ✅ Use it privately



---

<p align="center">
  Built with ☕️ lots of coffee for Google Gen AI Exchange Hackathon
</p>
