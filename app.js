
fetch('https://script.google.com/macros/s/AKfycbyMxCpOCiiGXx8DmQXmLithyEqCKYv2p35prOWQCmH6F_Kz6BdF3KeEgyHxqrqK15V66Q/exec')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.text();  // Use .text() because the response is plain text (CSV)
  })
  .then(data => {
    console.log('Fetched data (CSV format):', data);

    // Process the CSV data
    const rows = data.split('\n').map(row => row.split(','));
    console.log('Processed CSV data:', rows);

    // Example: You can render the data on the page or manipulate it further
  })
  .catch(error => {
    console.error('Error fetching data:', error);  // Handle any fetch or parsing error
  });
