

Adjusted assets:
1. /assets/notebook.png: a single notebook asset that will scale adaptively based on screen size 
2. /assets/tile.png: a tile to replicate adaptively in the background based on screen size 
3. /assets/tab-double-unit.png: a tab that represents a double-unit tab with text display (ie. '29')
4. /assets/tab-double-unit_invert.png: an ACTIVE tab that represents a double-unit tab with text display
5. /assets/tab-singe-unit.png: a tab that represents a single-unit tab with text display (ie. '9')
6. /assets/tab-singe-unit.png_invert: an ACTIVE tab that represents a single-unit tab with text display 


Necessary changes:
1. spawn in notebook on buttonpress (button still disappears after being clicked)
2. spawn in background with tile.png on buttonpress. if screen size changes, tiles will spawn/despawn 
3. spawn in tabs with notebook on buttonpress (single-digit and double-digit, random numbers for now)
4. keep active tab functionality 
5. keep header/subheader/body tab navigation functionality 
6. have tab section position locked to notebook's bottom position since notebook is now a separate asset. have offset parameters available for subtle tweaking
