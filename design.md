** OVERVIEW **
An pop-up interface for a website. Tab-based. Uses Google Sheets to pull content from.


** BACKEND FUNCTIONS **

** CACHING SYSTEM **
Compares local cache .JSON 


** IMMEDIATE NEXT STEPS TO EXECUTE **
Create a prototype for the pop-up interface. Put empty content for the body. Do not create any backend functionality, this will serve as a simple front-end proof-of-concept for UI navigation 

** PRIMARY FUNCTIONS TO EXECUTE **
1. Tab generation 
    - Generate five prototype dummy tabs of varying length
2. Tab navigation 
    2a. When the popup interface appears, the active tab defaults to the first tab
    2b. Users can click on each tab to navigate to them, or use the arrow keys to flip through them iteratively
3. Content for each tab
    - Generate prototype text for each tab: Header, Subheader, and Body (ie. "Header tab1, <br> Subheader tab1, <br> Body tab1", and so on for remaining tabs)
4. Pop-up spawn
    - A simple button in index.html to spawn the popup

** AVAILABLE ASSETS TO IMPLEMENT **
1. Header text: /assets/fonts/Header1-Pixel.ttf
2. Subheader text: /assets/fonts/Header2-Pixel.ttf
3. Body text: /assets/fonts/Body-Pixel.ttf
4. Blank base: /assets/blank-base.png
    - Background asset that displays at full-screen at full resolution. Optimized for interlaced pixel art display. Does not change adaptively in any logic case. 
5. Default tab: 
    5a. Left side: /assets/tab-left.png
        - Displays beginning of default tabs starting from the left of each tag
    5b. Middle: /assets/tab-body.png
        - Displays the middle of the each default tab, widens adaptively based on each tab's displayed text
    5c. Right side: /assets/tab-right.png
        - Displays the end of each default tab 
6. Active tab:
    6a: Left side: /assets/tab-left_invert.png
        - Displays on the correct position of the leftmost side of the active tab
    6b: Middle: /assets/tab-body_invert.png
        - Displays over the middle position of the active tab, adapts to the width of the active tab (inherited), widens adaptively based on the active tab's displayed text
    6c. Right side: /assets/tab-right_invert.png
        - Displays the end of the active tab