
  console.log("blog.js: 'I am called!'");
fetch('https://script.google.com/macros/s/AKfycbzq3ZkbiRrSrmk8_AG6QRObHxkJ3R8Qd_NbM5UoJkujdRswDw_DSNEBvsqzn6yHQYzt/exec')
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();  // Parse JSON data
})
.then(posts => {
  console.log('Fetched posts:', posts);
  
  // Render posts (if needed)
  const postsContainer = document.getElementById('posts-container');
  
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
});
