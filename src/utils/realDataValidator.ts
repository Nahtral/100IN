/**
 * Utility to validate that analytics components are using real data only
 * NO MOCK DATA ALLOWED
 */

export const validateRealData = (componentName: string, data: any) => {
  if (!data) {
    console.warn(`${componentName}: No data available - showing empty state`);
    return false;
  }

  // Check for common mock data patterns
  const mockDataIndicators = [
    // Common mock values
    'mock',
    'placeholder',
    'demo',
    'sample',
    'test data',
    
    // Common mock patterns
    /Math\.random/,
    /lorem ipsum/i,
    /fake/i,
    /dummy/i
  ];

  const dataString = JSON.stringify(data).toLowerCase();
  
  for (const indicator of mockDataIndicators) {
    if (typeof indicator === 'string' && dataString.includes(indicator)) {
      console.error(`${componentName}: MOCK DATA DETECTED - "${indicator}"`);
      return false;
    }
    if (indicator instanceof RegExp && indicator.test(dataString)) {
      console.error(`${componentName}: MOCK DATA PATTERN DETECTED - ${indicator}`);
      return false;
    }
  }

  return true;
};

export const logDataSource = (componentName: string, tableName: string, recordCount: number) => {
  console.info(`${componentName}: Using REAL DATA from ${tableName} (${recordCount} records)`);
};

export const handleEmptyData = (componentName: string, expectedData: string) => {
  console.warn(`${componentName}: No ${expectedData} found in database - showing empty state`);
  return null;
};