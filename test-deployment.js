const http = require("http");
const https = require("https");

function testUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    const req = client.request(url, { method: "HEAD" }, (res) => {
      console.log(`✓ ${url} - Status: ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on("error", (err) => {
      console.log(`✗ ${url} - Error: ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`✗ ${url} - Timeout`);
      reject(new Error("Timeout"));
    });

    req.end();
  });
}

async function runTests() {
  console.log("Testing deployment...\n");

  try {
    await testUrl("http://localhost:3001");
    await testUrl("https://app.imajinasset.biz.id");
    console.log("\n✅ All tests passed! Deployment is successful.");
  } catch (error) {
    console.log("\n❌ Some tests failed. Please check the configuration.");
  }
}

runTests();
