// fetchFileContent.js
export function fetchFileContent(fileName) {
    return fetch('modules/templates.html')
        .then(response => response.text())
        .then(html => {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;

            const escapedFileName = `#${fileName.replace('.', '\\.')}`;

            const contentDiv = tempContainer.querySelector(escapedFileName);

            if (contentDiv) {
                return contentDiv.innerHTML;
            } else {
                console.error(`No content found for fileName "${fileName}" in templates.html.`);
                return null;
            }
        })
        .catch(err => {
            console.error('Error fetching templates.html:', err);
            return null;
        });
}
