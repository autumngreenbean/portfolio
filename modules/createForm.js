import { makeDraggable } from './makeDraggable.js';
import { handleMinimize } from './makeDraggable.js';
import { fetchFileContent } from './fetchContent.js';
console.log("createForm.js: 'I am called!'");
const isMobile = window.innerWidth <= 768; 

//NOT FUNCTIONING
let lastPositionIndex = 0; 
let formCounter = 0; 
let zIndexCounter = { current: 1000 }; 

function createForm(fileName) {
let existingForm = document.getElementById(`form-container-${fileName}`);
if (existingForm) {

existingForm.style.zIndex = zIndexCounter.current; 

// NOT FUNCTIONING: Update zIndex for the next form spawn, cycle
zIndexCounter.current = zIndexCounter.current === zIndexCounter.max ? 1000 : zIndexCounter.current + 1;

// updateShapes();
return;  
}

//CREATE FORM
const formContainer = document.createElement('div');
formContainer.id = `form-container-${fileName}`;

let nextLeft = 20 + formCounter * 40; 
let nextTop = 20 + formCounter * 40;  

formContainer.style.top = `${nextTop}px`; 
formContainer.style.left = `${nextLeft}px`; 
formCounter++;

formContainer.style.position = 'absolute';
formContainer.style.fontWeight = '';
formContainer.style.transform = 'translate(0, 0)';
formContainer.style.width = '550px';
formContainer.style.borderRadius = '8px';
formContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
formContainer.style.zIndex = zIndexCounter.current; 
formContainer.style.backdropFilter = isMobile ? 'none' : 'blur(5px)';

//CURSOR GRAB
formContainer.addEventListener('mousedown', (e) => {
formContainer.style.cursor = 'grabbing';
});


document.addEventListener('mouseup', () => {
formContainer.style.cursor = 'grab';
});


formContainer.innerHTML = `
    <div id="form-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px;">
        <span id="form-title">${fileName}</span>
        <button id="minimize-btn" style="color: rgb(0, 0, 0); cursor: pointer;">-</button>
    </div>
    <form id="form-content" style="padding: 20px; display: block;">
    </form>
`;
document.body.appendChild(formContainer);

fetchFileContent(fileName)
.then(content => {
    if (content) {
        const formContent = formContainer.querySelector('#form-content');
        formContent.innerHTML = content;
    } else {
        console.error('No content to inject into form');
    }
})
.catch(err => {
    console.error('Error fetching content for form:', err);
});
if (fileName==="imagery.png") {
    window.open('images.html', '_blank');
}
// updateShapes();
makeDraggable(formContainer, formContainer.querySelector('#form-header'), zIndexCounter);
handleMinimize(formContainer);

nextLeft += 50; 
nextTop += 50;
}

//TAB STYLE INTERACTION
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (event) => {
        tab.style.transition = 'color 0.2s ease-out'; 
    tab.style.color = 'lightblue';  

    setTimeout(() => {
        tab.style.color = '';  
    }, 300);  
        const fileName = event.target.getAttribute('data-file');
        
        createForm(fileName);

        const form = document.getElementById(`form-container-${fileName}`);
        if (form) {
            form.style.zIndex = zIndexCounter.current++;  
        }

        document.querySelectorAll('.form-container').forEach(otherForm => {
            if (otherForm !== form) {
                otherForm.style.zIndex = zIndexCounter.current - 1;  // Lower z-index of other forms to push them to the background
            }
        });
    });
});