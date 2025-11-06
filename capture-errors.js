// Simple script to capture and log errors from the browser console
// Run this in the browser console to capture errors

(function() {
  const errors = [];
  
  // Capture console errors
  const originalError = console.error;
  console.error = function(...args) {
    errors.push({
      type: 'console.error',
      message: args.join(' '),
      timestamp: new Date().toISOString()
    });
    originalError.apply(console, args);
  };
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    errors.push({
      type: 'unhandledrejection',
      message: event.reason?.message || event.reason,
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture global errors
  window.addEventListener('error', function(event) {
    errors.push({
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
  });
  
  // Function to get all captured errors
  window.getCapturedErrors = function() {
    return errors;
  };
  
  // Function to clear errors
  window.clearCapturedErrors = function() {
    errors.length = 0;
  };
  
  // Function to export errors as JSON
  window.exportErrors = function() {
    const dataStr = JSON.stringify(errors, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'browser-errors.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  
  console.log('Error capture script loaded. Use getCapturedErrors() to see errors, exportErrors() to download them.');
})();
