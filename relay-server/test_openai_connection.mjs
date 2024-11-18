// relay-server/test_openai_connection.mjs
import 'dotenv/config';
import axios from 'axios';

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set.');
  process.exit(1);
}

async function testOpenAIConnection() {
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    console.log('Successfully connected to OpenAI. Available models:');
    response.data.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
  } catch (error) {
    console.error('Failed to connect to OpenAI:', error.response ? error.response.data : error.message);
  }
}

testOpenAIConnection();