console.log("blog.js: 'I am called!'");

// Show loading message
const postsContainer = document.getElementById('posts-container');
const loadingMessage = document.createElement('div');
loadingMessage.classList.add('loading-message');
loadingMessage.textContent = 'Loading data...';
postsContainer.appendChild(loadingMessage);

// Fetch posts from the Google Apps Script endpoint
fetch('https://script.google.com/macros/s/AKfycbzq3ZkbiRrSrmk8_AG6QRObHxkJ3R8Qd_NbM5UoJkujdRswDw_DSNEBvsqzn6yHQYzt/exec')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();  // Parse JSON data
  })
  .then(posts => {
    console.log('Fetched posts:', posts);
    
    // Remove the loading message
    postsContainer.removeChild(loadingMessage);

    // Render posts (if needed)
    posts.forEach(post => {
      const title = post.title;
      const body = post.body;

      const bodyWithLineBreaks = body.replace(/\n/g, '<br>');  // Handle line breaks in body

      // Create post container
      const postElement = document.createElement('div');
      postElement.classList.add('post');

      postElement.innerHTML = `
        <h2 class="title">${title}</h2>
        <p class="body">${bodyWithLineBreaks}</p>
      `;
      
      postsContainer.appendChild(postElement);
    });
  })
  .catch(error => {
    console.error('Error fetching data:', error);

    // Handle error and show message (optional)
    loadingMessage.textContent = 'Failed to load data. Please try again later.';
  });
