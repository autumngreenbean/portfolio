import { makeDraggable } from './makeDraggable.js';
import { handleMinimize } from './makeDraggable.js';
import { fetchFileContent } from './fetchContent.js';
console.log("createForm.js: 'YOOOOO! I am called!'");
const isMobile = window.innerWidth <= 768; 

//NOT FUNCTIONING
let lastPositionIndex = 0; 
let formCounter = 0; 
let zIndexCounter = { current: 1000 }; 

function bringFormToFront(form) {
if (!form) return;

const topZ = zIndexCounter.current++;
form.style.zIndex = topZ;

let offset = 1;
document.querySelectorAll('.form-container').forEach(otherForm => {
if (otherForm !== form) {
otherForm.style.zIndex = topZ - offset;
offset += 1;
}
});
}

function attachFormFocusHandlers(formContainer, formHeader) {
const focusForm = () => bringFormToFront(formContainer);

formContainer.addEventListener('pointerdown', focusForm, true);
formContainer.addEventListener('mousedown', focusForm, true);
formHeader.addEventListener('pointerdown', focusForm, true);
formHeader.addEventListener('mousedown', focusForm, true);
}

function createForm(fileName) {
let existingForm = document.getElementById(`form-container-${fileName}`);
if (existingForm) {
bringFormToFront(existingForm);
return;  
}

//CREATE FORM
const formContainer = document.createElement('div');
formContainer.id = `form-container-${fileName}`;
formContainer.classList.add('form-container');

let nextLeft = 20 + formCounter * 40; 
let nextTop = 20 + formCounter * 40;  

formContainer.style.top = `${nextTop}px`; 
formContainer.style.left = `${nextLeft}px`; 
formCounter++;

formContainer.style.position = 'absolute';
formContainer.style.fontWeight = '';
formContainer.style.transform = 'translate(0, 0)';
formContainer.style.width = isMobile ? 'calc(100vw - 20px)' : '550px';
formContainer.style.maxWidth = '550px';
formContainer.style.borderRadius = '2px';
formContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
formContainer.style.zIndex = zIndexCounter.current; 
formContainer.style.background = 'rgba(255, 255, 255, 0.08)';
formContainer.style.backdropFilter = 'blur(8px)';
formContainer.style.webkitBackdropFilter = 'blur(8px)';
formContainer.style.outline = '1px solid rgba(255, 255, 255, 0.2)';
formContainer.style.overflow = 'hidden';

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
        <button id="minimize-btn" style="color: white; cursor: pointer;">-</button>
    </div>
    <form id="form-content" style="padding: 20px; display: block;">
    </form>
`;
document.body.appendChild(formContainer);

const formHeader = formContainer.querySelector('#form-header');
attachFormFocusHandlers(formContainer, formHeader);

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
if (fileName=="images.png") {
    window.open('images.html', '_blank');
}
// updateShapes();
makeDraggable(formContainer, formHeader, zIndexCounter);
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
        bringFormToFront(form);
    });
});
