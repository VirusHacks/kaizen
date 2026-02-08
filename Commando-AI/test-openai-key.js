const https = require('https');
const fs = require('fs');

// Read API key from .env file
const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY\s*=\s*(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

async function testOpenAIKey() {
  if (!apiKey) {
    console.error('❌ No OPENAI_API_KEY found in .env file');
    return;
  }

  console.log('🔑 Testing OpenAI API key...\n');
  console.log(`Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}\n`);

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(data);
          console.log('✅ OpenAI API key is VALID!');
          console.log(`✅ Found ${parsed.data.length} models available`);
          
          // Check if whisper-1 is available
          const hasWhisper = parsed.data.some(model => model.id === 'whisper-1');
          if (hasWhisper) {
            console.log('✅ Whisper model is available!');
          } else {
            console.log('⚠️  Whisper model not found in available models');
          }
          resolve();
        } else {
          console.error('❌ OpenAI API key is INVALID');
          console.error(`Status: ${res.statusCode}`);
          console.error(`Error: ${data}`);
          reject();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error testing API key:', error.message);
      reject(error);
    });

    req.end();
  });
}

testOpenAIKey();
