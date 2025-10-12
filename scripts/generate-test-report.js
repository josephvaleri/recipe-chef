const fs = require('fs');
const path = require('path');

// Read the test results
const resultsPath = path.join(__dirname, '../test-results/results.json');

if (!fs.existsSync(resultsPath)) {
  console.error('Test results not found. Please run tests first with: npm run test:e2e');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Categorize issues by severity
const issues = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: []
};

// Security keywords that indicate critical issues
const securityKeywords = ['xss', 'sql', 'injection', 'csrf', 'authentication', 'authorization', 'security'];
const performanceKeywords = ['performance', 'memory', 'leak', 'timeout', 'slow'];

// Process test results
results.suites.forEach(suite => {
  processSuite(suite, suite.title);
});

function processSuite(suite, path) {
  suite.specs?.forEach(spec => {
    const testName = `${path} > ${spec.title}`;
    const test = spec.tests[0];
    
    if (test.status === 'passed') {
      issues.passed.push({
        name: testName,
        duration: test.results[0]?.duration || 0
      });
    } else if (test.status === 'failed') {
      const error = test.results[0]?.error?.message || 'Unknown error';
      const testLower = testName.toLowerCase();
      const errorLower = error.toLowerCase();
      
      // Determine severity
      let severity = 'medium';
      
      if (securityKeywords.some(keyword => testLower.includes(keyword) || errorLower.includes(keyword))) {
        severity = 'critical';
      } else if (testLower.includes('auth') || testLower.includes('delete') || testLower.includes('data')) {
        severity = 'high';
      } else if (performanceKeywords.some(keyword => testLower.includes(keyword))) {
        severity = 'medium';
      } else {
        severity = 'low';
      }
      
      issues[severity].push({
        name: testName,
        error: error,
        duration: test.results[0]?.duration || 0,
        retry: test.results.length > 1
      });
    }
  });
  
  suite.suites?.forEach(subSuite => {
    processSuite(subSuite, `${path} > ${subSuite.title}`);
  });
}

// Generate report
const report = [];

report.push('# QA Test Report - Recipe Chef Application\n');
report.push(`Generated: ${new Date().toLocaleString()}\n`);
report.push('---\n\n');

// Summary
const totalTests = issues.passed.length + issues.critical.length + issues.high.length + issues.medium.length + issues.low.length;
const passedTests = issues.passed.length;
const failedTests = totalTests - passedTests;
const passRate = ((passedTests / totalTests) * 100).toFixed(1);

report.push('## Executive Summary\n\n');
report.push(`- **Total Tests**: ${totalTests}\n`);
report.push(`- **Passed**: ${passedTests} (${passRate}%)\n`);
report.push(`- **Failed**: ${failedTests}\n\n`);

report.push('### Issues by Severity\n\n');
report.push(`- 🔴 **Critical**: ${issues.critical.length}\n`);
report.push(`- 🟠 **High**: ${issues.high.length}\n`);
report.push(`- 🟡 **Medium**: ${issues.medium.length}\n`);
report.push(`- 🟢 **Low**: ${issues.low.length}\n\n`);

report.push('---\n\n');

// Critical Issues
if (issues.critical.length > 0) {
  report.push('## 🔴 CRITICAL ISSUES (Immediate Action Required)\n\n');
  issues.critical.forEach((issue, index) => {
    report.push(`### ${index + 1}. ${issue.name}\n\n`);
    report.push(`**Error**: ${issue.error}\n\n`);
    report.push(`**Impact**: Security vulnerability or data integrity issue\n\n`);
    report.push(`**Recommendation**: Fix immediately before deployment\n\n`);
    report.push('---\n\n');
  });
}

// High Priority Issues
if (issues.high.length > 0) {
  report.push('## 🟠 HIGH PRIORITY ISSUES\n\n');
  issues.high.forEach((issue, index) => {
    report.push(`### ${index + 1}. ${issue.name}\n\n`);
    report.push(`**Error**: ${issue.error}\n\n`);
    report.push(`**Impact**: Core functionality broken or major user experience issue\n\n`);
    report.push(`**Recommendation**: Fix before next release\n\n`);
    report.push('---\n\n');
  });
}

// Medium Priority Issues
if (issues.medium.length > 0) {
  report.push('## 🟡 MEDIUM PRIORITY ISSUES\n\n');
  issues.medium.forEach((issue, index) => {
    report.push(`### ${index + 1}. ${issue.name}\n\n`);
    report.push(`**Error**: ${issue.error}\n\n`);
    report.push(`**Impact**: Performance or UX degradation\n\n`);
    report.push(`**Recommendation**: Address in upcoming sprint\n\n`);
    report.push('---\n\n');
  });
}

// Low Priority Issues
if (issues.low.length > 0) {
  report.push('## 🟢 LOW PRIORITY ISSUES\n\n');
  issues.low.forEach((issue, index) => {
    report.push(`### ${index + 1}. ${issue.name}\n\n`);
    report.push(`**Error**: ${issue.error}\n\n`);
    report.push(`**Impact**: Minor UI issue or edge case\n\n`);
    report.push(`**Recommendation**: Fix when convenient\n\n`);
    report.push('---\n\n');
  });
}

// Passed Tests Summary
report.push('## ✅ PASSED TESTS\n\n');
report.push(`${passedTests} tests passed successfully.\n\n`);

// Performance metrics
const slowTests = issues.passed.filter(test => test.duration > 5000);
if (slowTests.length > 0) {
  report.push('### ⚠️ Slow Tests (>5 seconds)\n\n');
  slowTests.forEach(test => {
    report.push(`- ${test.name}: ${(test.duration / 1000).toFixed(2)}s\n`);
  });
  report.push('\n');
}

// Recommendations
report.push('---\n\n');
report.push('## Recommendations\n\n');

if (issues.critical.length > 0) {
  report.push('1. **URGENT**: Address all critical security issues immediately\n');
}
if (issues.high.length > 0) {
  report.push('2. Fix high-priority issues before deploying to production\n');
}
if (issues.medium.length > 0) {
  report.push('3. Schedule medium-priority fixes for next sprint\n');
}
if (slowTests.length > 0) {
  report.push('4. Investigate and optimize slow-loading pages\n');
}
report.push('5. Re-run tests after fixes to verify resolution\n');
report.push('6. Consider adding automated testing to CI/CD pipeline\n\n');

// Write report
const reportPath = path.join(__dirname, '../test-results/QA-REPORT.md');
fs.writeFileSync(reportPath, report.join(''));

console.log('\n✅ Test report generated successfully!');
console.log(`📄 Report location: ${reportPath}`);
console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} passed (${passRate}%)`);
console.log(`🔴 Critical: ${issues.critical.length}`);
console.log(`🟠 High: ${issues.high.length}`);
console.log(`🟡 Medium: ${issues.medium.length}`);
console.log(`🟢 Low: ${issues.low.length}\n`);

// Exit with error code if there are critical or high issues
if (issues.critical.length > 0 || issues.high.length > 0) {
  console.error('⚠️  Critical or high-priority issues found!');
  process.exit(1);
}

