export const environment = {
  production: false,
  backendUrl: 'https://localhost:3443',
  imageProvider: 'google', // 'dalle' | 'flux' | 'stability' | 'flux'
  firebaseConfig: {
    apiKey: "AIzaSyD-_e5B8zlm9LAzIZRxZguYpPNSPG9O_Hk",
    authDomain: "story-maker-373a2.firebaseapp.com",
    projectId: "story-maker-373a2",
    storageBucket: "story-maker-373a2.firebasestorage.app",
    messagingSenderId: "738276494503",
    appId: "1:738276494503:web:bee0d36cbcb67e85475f82",
    measurementId: "G-0DZN79H9GK"
  },
  openAIConfig: {
    apiKey: "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",
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    aiImageApiUrl: 'https://api.openai.com/v1/images/generations'
  },
  googleConfig: {
    apiKey: "AIzaSyD_OeCpcoiK2H1tYDrV6QGIN5G49EaBXC4",
    cseId: "a2bc577efd519409d",
  },
  stabilityConfig: {
    apiKey: 'sk-CXexpXZM61bb0IX23YV8wommTi1uUd2EYWYIXRrDNrAuPqop',
    apiUrl: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image'
  },
  fluxConfig: {
    apiKey: '7de5017d-55d8-4ef3-acea-56eb0644d8bf',
    apiUrl: 'https://api.us1.bfl.ai/v1/generate',
    model: 'flux-1.0'
  }
};