// XSS Security Test for Chat Message Sanitization
// このテストは修正されたXSS対策機能を検証します

const { sanitizeMessageContent, detectXssAttempt } = require('../src/lib/utils/sanitization');

console.log('🔐 XSS Security Test Starting...\n');

// Test Cases: XSS攻撃パターン
const xssTestCases = [
  {
    name: 'Script Tag Injection',
    input: '<script>alert("XSS")</script>Hello World',
    expectDetection: true
  },
  {
    name: 'Image onerror Injection',
    input: '<img src="x" onerror="alert(\'XSS\')">',
    expectDetection: true
  },
  {
    name: 'JavaScript Protocol',
    input: 'Click here: javascript:alert("XSS")',
    expectDetection: true
  },
  {
    name: 'Iframe Injection',
    input: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    expectDetection: true
  },
  {
    name: 'Event Handler Injection',
    input: '<div onclick="alert(\'XSS\')">Click me</div>',
    expectDetection: true
  },
  {
    name: 'Normal Text',
    input: 'This is a normal message with @mention',
    expectDetection: false
  },
  {
    name: 'URL with HTTP',
    input: 'Check this out: https://example.com',
    expectDetection: false
  }
];

let passedTests = 0;
let totalTests = xssTestCases.length;

console.log('Testing XSS Detection...\n');

xssTestCases.forEach((testCase, index) => {
  const detected = detectXssAttempt(testCase.input);
  const sanitized = sanitizeMessageContent(testCase.input);

  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: ${testCase.input}`);
  console.log(`Detected: ${detected} (Expected: ${testCase.expectDetection})`);
  console.log(`Sanitized: ${sanitized}`);

  if (detected === testCase.expectDetection) {
    console.log('✅ PASS');
    passedTests++;
  } else {
    console.log('❌ FAIL');
  }
  console.log('---');
});

// Test sanitization effectiveness
console.log('\n🧪 Sanitization Effectiveness Tests...\n');

const sanitizationTests = [
  {
    name: 'Script removal',
    input: '<script>alert("hack")</script>Hello',
    expectedOutput: 'Hello'
  },
  {
    name: 'HTML tag removal',
    input: '<div><b>Bold text</b></div>',
    expectedOutput: 'Bold text'
  },
  {
    name: 'Preserve normal text',
    input: 'Normal message with 日本語',
    expectedOutput: 'Normal message with 日本語'
  }
];

let sanitizationPassed = 0;

sanitizationTests.forEach((test, index) => {
  const result = sanitizeMessageContent(test.input);
  console.log(`Sanitization Test ${index + 1}: ${test.name}`);
  console.log(`Input: ${test.input}`);
  console.log(`Output: ${result}`);
  console.log(`Expected: ${test.expectedOutput}`);

  if (result === test.expectedOutput) {
    console.log('✅ PASS');
    sanitizationPassed++;
  } else {
    console.log('⚠️ DIFFERENT (check if acceptable)');
  }
  console.log('---');
});

// Final Results
console.log('\n📊 Test Results Summary');
console.log('======================');
console.log(`XSS Detection Tests: ${passedTests}/${totalTests} passed`);
console.log(`Sanitization Tests: ${sanitizationPassed}/${sanitizationTests.length} passed`);

if (passedTests === totalTests && sanitizationPassed === sanitizationTests.length) {
  console.log('\n🎉 All XSS security tests PASSED! Chat is protected against XSS attacks.');
} else {
  console.log('\n⚠️ Some tests failed. Review the implementation.');
}

console.log('\n✅ Security Test Complete');