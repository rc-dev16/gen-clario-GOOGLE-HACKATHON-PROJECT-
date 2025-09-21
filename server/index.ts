import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import cors from 'cors';
import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize Google Auth
const auth = new GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-cloud/service-account.json'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// Token endpoint
app.get('/api/auth/google-token', async (req, res) => {
  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('No access token received');
    }

    res.json({ accessToken: accessToken.token });
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
