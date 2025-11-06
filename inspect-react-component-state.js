/**
 * Inspect the React component state directly
 */

const inspectReactComponentState = () => {
  console.log('🔍 Inspecting React component state...');
  
  try {
    // Method 1: Look for React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ React DevTools available');
      console.log('💡 Open React DevTools and look for the MyFeed component');
      console.log('💡 Check its props and state to see if data is being passed correctly');
    } else {
      console.log('❌ React DevTools not available');
    }
    
    // Method 2: Look for the My Feed component in the DOM
    const myFeedElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('My Feed') || text.includes('No activity yet');
    });
    
    console.log('🔍 Found My Feed related elements:', myFeedElements.length);
    
    // Method 3: Check if there are any console logs from the useMyFeed hook
    console.log('🔍 Look for these console logs in the browser console:');
    console.log('- 🔍 [USE-MY-FEED] Starting fetch...');
    console.log('- 🔍 [USE-MY-FEED] Response data: {...}');
    console.log('- 🔍 [USE-MY-FEED] Fetch completed');
    
    // Method 4: Check if the component is actually mounted
    const cardElements = document.querySelectorAll('[class*="card"]');
    console.log('🔍 Found card elements:', cardElements.length);
    
    // Method 5: Look for loading states
    const loadingElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('Loading your feed') || text.includes('Loading...');
    });
    
    console.log('🔍 Found loading elements:', loadingElements.length);
    
    // Method 6: Look for error states
    const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('Failed to load feed') || text.includes('Error');
    });
    
    console.log('🔍 Found error elements:', errorElements.length);
    
    // Method 7: Check if the component is showing "No activity yet"
    const noActivityElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('No activity yet');
    });
    
    console.log('🔍 Found "No activity yet" elements:', noActivityElements.length);
    
    if (noActivityElements.length > 0) {
      console.log('❌ Component is showing "No activity yet" - this means events.length === 0');
      console.log('💡 The useMyFeed hook is not setting the data correctly');
    }
    
    // Method 8: Try to force a re-render by dispatching events
    console.log('🔄 Attempting to force re-render...');
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('focus'));
    
    // Method 9: Check if there are any React errors in the console
    console.log('🔍 Check the browser console for any React errors');
    console.log('🔍 Look for red error messages or warnings');
    
  } catch (error) {
    console.error('💥 Inspection failed:', error);
  }
};

inspectReactComponentState();
