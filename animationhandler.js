const isIndex = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
const rightColumn = document.querySelector('.column.right-column');

if (rightColumn) {
  if (isIndex) {
    rightColumn.style.animationName = 'slidefromRight';
  } else {
    rightColumn.style.animationName = 'slidefromLeft';
  }
}
