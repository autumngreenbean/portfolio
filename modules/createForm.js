import { makeDraggable } from './makeDraggable.js';
import { handleMinimize } from './makeDraggable.js';
import { fetchFileContent } from './fetchContent.js';
import { getRandomImageSource } from './generatedImageList.js';
console.log("createForm.js: 'YOOOOO! I am called!'");
const isMobile = window.innerWidth <= 768; 

//NOT FUNCTIONING
let lastPositionIndex = 0; 
let formCounter = 0; 

// Shared z-index counter for all windows
if (!window.windowZIndexCounter) {
    window.windowZIndexCounter = { current: 1000 };
}
const zIndexCounter = window.windowZIndexCounter; 

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

async function createForm(fileName) {
const isRandomImageWindow = fileName === 'random-images';
const isThemeToggle = fileName === 'theme-toggle';
const formId = isRandomImageWindow
    ? `form-container-random-${Date.now()}-${Math.random().toString(16).slice(2)}`
    : `form-container-${fileName}`;

if (!isRandomImageWindow) {
    let existingForm = document.getElementById(formId);
    if (existingForm) {
        bringFormToFront(existingForm);
        return;
    }
}

//CREATE FORM
const formContainer = document.createElement('div');
formContainer.id = formId;
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

const formTitle = isRandomImageWindow ? `random image ${formCounter}` : fileName;

formContainer.innerHTML = `
    <div id="form-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px;">
        <span id="form-title">${formTitle}</span>
        <button id="minimize-btn" style="color: white; cursor: pointer;">-</button>
    </div>
    <form id="form-content" style="padding: 20px; display: block;">
    </form>
`;
document.body.appendChild(formContainer);

const formHeader = formContainer.querySelector('#form-header');
attachFormFocusHandlers(formContainer, formHeader);

if (isRandomImageWindow) {
    const formContent = formContainer.querySelector('#form-content');
    const randomImageSrc = await getRandomImageSource();
    if (!randomImageSrc) {
        formContent.innerHTML = '<div style="color: rgba(255,255,255,0.7); padding: 20px;">No images found in /modules/assets/random</div>';
        return;
    }

    const randomImageName = randomImageSrc.split('/').pop();
    const titleEl = formContainer.querySelector('#form-title');
    if (titleEl) titleEl.textContent = randomImageName;

    formContent.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; min-height:120px; color: rgba(255,255,255,0.7);">loading image…</div>';

    const img = new Image();
    img.onload = () => {
        const maxWidth = Math.min(window.innerWidth * 0.75, 900);
        const maxHeight = Math.min(window.innerHeight * 0.7, 700);
        const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
        const width = Math.max(180, Math.round(img.naturalWidth * ratio));
        const height = Math.max(180, Math.round(img.naturalHeight * ratio));

        formContainer.style.width = `${width + 24}px`;
        formContainer.style.maxWidth = `${maxWidth}px`;
        formContainer.style.height = 'auto';
        formContent.innerHTML = `<img src="${randomImageSrc}" alt="Random image" style="display:block; width:${width}px; max-width:100%; height:${height}px; max-height:100%; object-fit:contain; border-radius: 2px; background: rgba(0,0,0,0.2);">`;
    };
    img.onerror = () => {
        formContent.innerHTML = '<div style="color: rgba(255,255,255,0.7); padding: 20px;">random image failed to load</div>';
    };
    img.src = randomImageSrc;
} else if (isThemeToggle) {
    const formContent = formContainer.querySelector('#form-content');
    const { getThemeMessage } = await import('./themeToggle.js');
    formContent.innerHTML = `<div style="color: rgba(255,255,255,0.9); padding: 20px; font-size: 14px; line-height: 1.6;">${getThemeMessage()}</div>`;
} else {
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
}
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
    tab.addEventListener('click', async (event) => {
        tab.style.transition = 'color 0.2s ease-out'; 
    tab.style.color = 'lightblue';  

    setTimeout(() => {
        tab.style.color = '';  
    }, 300);  
        const fileName = event.target.getAttribute('data-file');
        
        await createForm(fileName);

        const form = fileName === 'random-images'
            ? document.querySelector('.form-container:last-of-type')
            : document.getElementById(`form-container-${fileName}`);
        if (form) bringFormToFront(form);
    });
});
