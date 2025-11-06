/**
 * Force the My Feed component to refresh and re-render
 */

const forceComponentRefresh = () => {
  console.log('🔍 Forcing My Feed component refresh...');
  
  try {
    // Method 1: Look for the My Feed component and trigger a re-render
    const myFeedElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.includes('My Feed') || text.includes('No activity yet');
    });
    
    console.log('Found My Feed elements:', myFeedElements.length);
    
    // Method 2: Try to find React components and force update
    if (window.React) {
      console.log('React found, trying to force update...');
    }
    
    // Method 3: Look for any loading states and clear them
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"]');
    console.log('Loading elements found:', loadingElements.length);
    
    // Method 4: Check if there are any error states
    const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
    console.log('Error elements found:', errorElements.length);
    
    // Method 5: Look for the specific "No activity yet" message
    const noActivityElements = Array.from(document.querySelectorAll('*')).filter(el => {
      return el.textContent && el.textContent.includes('No activity yet');
    });
    
    console.log('No activity elements found:', noActivityElements.length);
    if (noActivityElements.length > 0) {
      console.log('No activity element:', noActivityElements[0]);
      console.log('Parent element:', noActivityElements[0].parentElement);
    }
    
    // Method 6: Try to trigger a window resize event (sometimes forces React to re-render)
    window.dispatchEvent(new Event('resize'));
    console.log('Dispatched resize event');
    
    // Method 7: Check if there are any React DevTools available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools available - you can inspect the MyFeed component');
      console.log('Look for the MyFeed component in React DevTools and check its props/state');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

forceComponentRefresh();
