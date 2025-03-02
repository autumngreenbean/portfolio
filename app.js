
fetch('https://script.google.com/macros/s/AKfycbyMHD3DxKWX5ysLizUAcviBN0CRVnHw9vACGj_H9DmDI_zqcEtli2WOtu3t_ziM1s1mog/exec')
  .then(response => response.json())
  .then(data => {
    console.log(data); // Handle the fetched data here
  })
  .catch(error => console.error('Error:', error));

  function handleClientLoad() {
    // Initialization or authorization logic
    console.log('Client loaded');
  }
  