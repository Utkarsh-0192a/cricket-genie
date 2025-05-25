// Basic health check test for the Cricket Chatbot
const http = require('http');
const assert = require('assert');

// Test configuration
const TEST_HOST = 'localhost';
const TEST_PORT = process.env.PORT || 3000;
const TEST_TIMEOUT = 5000;

console.log('🏏 Starting Cricket Chatbot Health Check Tests...\n');

// Test 1: Server Health Check
function testServerHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TEST_HOST,
            port: TEST_PORT,
            path: '/',
            method: 'GET',
            timeout: TEST_TIMEOUT
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Server Health Check: PASSED');
                resolve(true);
            } else {
                console.log(`❌ Server Health Check: FAILED (Status: ${res.statusCode})`);
                reject(new Error(`Server returned status ${res.statusCode}`));
            }
        });

        req.on('error', (err) => {
            console.log(`❌ Server Health Check: FAILED (${err.message})`);
            reject(err);
        });

        req.on('timeout', () => {
            console.log('❌ Server Health Check: FAILED (Timeout)');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Test 2: API Endpoint Check
function testApiEndpoint() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            message: 'Hello, cricket bot!'
        });

        const options = {
            hostname: TEST_HOST,
            port: TEST_PORT,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: TEST_TIMEOUT
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && response.response) {
                        console.log('✅ API Endpoint Check: PASSED');
                        resolve(true);
                    } else {
                        console.log(`❌ API Endpoint Check: FAILED (Status: ${res.statusCode})`);
                        reject(new Error(`API returned status ${res.statusCode}`));
                    }
                } catch (err) {
                    console.log('❌ API Endpoint Check: FAILED (Invalid JSON response)');
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ API Endpoint Check: FAILED (${err.message})`);
            reject(err);
        });

        req.on('timeout', () => {
            console.log('❌ API Endpoint Check: FAILED (Timeout)');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

// Run all tests
async function runTests() {
    console.log(`Testing server at http://${TEST_HOST}:${TEST_PORT}`);
    console.log('Make sure the server is running before executing tests.\n');

    try {
        await testServerHealth();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
        await testApiEndpoint();
        
        console.log('\n🎉 All tests passed! Cricket Chatbot is working correctly.');
        process.exit(0);
    } catch (error) {
        console.log('\n💥 Some tests failed. Please check the server and try again.');
        console.log('Error details:', error.message);
        process.exit(1);
    }
}

// Check if server is likely running
http.get(`http://${TEST_HOST}:${TEST_PORT}/`, (res) => {
    runTests();
}).on('error', (err) => {
    console.log('❌ Server is not running or not accessible.');
    console.log(`Please start the server first with: npm start`);
    console.log(`Then run this test with: node tests/health-check.js`);
    process.exit(1);
});
