// Global variables (prefixed with viz to avoid conflicts with qb_simulate.js)
let vizPlayData = null;
let vizCurrentFrame = 1;
let vizIsPlaying = false;
let vizAnimationInterval = null;
let vizSvg = null;
let vizXScale = null;
let vizYScale = null;
let vizShowTrails = true;
let vizShowNames = true;
let vizShowBallTrajectory = true;
let vizShowOutputPlayers = true;

// NFL Team Colors (prefixed to avoid conflict with qb_simulate.js)
const vizTeamColors = {
    'ARI': '#97233F', // Cardinals - Red
    'ATL': '#A71930', // Falcons - Red
    'BAL': '#241773', // Ravens - Purple
    'BUF': '#00338D', // Bills - Blue
    'CAR': '#0085CA', // Panthers - Blue
    'CHI': '#0B162A', // Bears - Navy
    'CIN': '#FB4F14', // Bengals - Orange
    'CLE': '#311D00', // Browns - Brown
    'DAL': '#003594', // Cowboys - Blue
    'DEN': '#FB4F14', // Broncos - Orange
    'DET': '#0076B6', // Lions - Honolulu Blue
    'GB': '#203731', // Packers - Green
    'HOU': '#03202F', // Texans - Navy
    'IND': '#002C5F', // Colts - Blue
    'JAX': '#006778', // Jaguars - Teal
    'KC': '#E31837', // Chiefs - Red
    'LV': '#000000', // Raiders - Black
    'LAC': '#0080C6', // Chargers - Blue
    'LAR': '#003594', // Rams - Blue
    'MIA': '#008E97', // Dolphins - Teal
    'MIN': '#4F2683', // Vikings - Purple
    'NE': '#002244', // Patriots - Navy
    'NO': '#D3BC8D', // Saints - Gold
    'NYG': '#0B2265', // Giants - Blue
    'NYJ': '#125740', // Jets - Green
    'PHI': '#004C54', // Eagles - Green
    'PIT': '#FFB612', // Steelers - Gold
    'SF': '#AA0000', // 49ers - Red
    'SEA': '#002244', // Seahawks - Navy
    'TB': '#D50A0A', // Buccaneers - Red
    'TEN': '#0C2340', // Titans - Navy
    'WAS': '#5A1414' // Commanders - Burgundy
};

// Function to initialize visualization with data
function vizInitializePlayVisualization(data) {
    console.log('[Sandbox] Initializing play visualization');
    
    // Check if Section 11 elements exist
    const section11 = document.getElementById('interactive');
    if (!section11) {
        console.error('[Sandbox] Section 11 (interactive) not found');
        return;
    }
    
    const vizElement = section11.querySelector('#visualization');
    if (!vizElement) {
        console.error('[Sandbox] #visualization element not found in Section 11');
        return;
    }
    
    console.log('[Sandbox] Play data received:', data.game_id, data.play_id);
    vizPlayData = data;
    
    // Calculate total frames: input frames + output frames
    let maxOutputFrame = 0;
    if (vizPlayData.output_players) {
        Object.values(vizPlayData.output_players).forEach(player => {
            if (player.frames && player.frames.length > 0) {
                const playerMaxFrame = Math.max(...player.frames.map(f => f.frame_id));
                maxOutputFrame = Math.max(maxOutputFrame, playerMaxFrame);
            }
        });
    }
    // Total frames = input frames (max_frame) + output frames
    vizPlayData.total_frames = vizPlayData.max_frame + maxOutputFrame;
    console.log('[Sandbox] Total frames:', vizPlayData.total_frames);
    
    // Update slider max - scope to Section 11
    const slider = section11.querySelector('#frame-slider');
    if (slider) {
        slider.max = vizPlayData.total_frames;
        console.log('[Sandbox] Slider max updated to', vizPlayData.total_frames);
    } else {
        console.warn('[Sandbox] #frame-slider not found in Section 11');
    }
    
    // Reset to frame 1
    vizCurrentFrame = 1;
    vizIsPlaying = false;
    clearInterval(vizAnimationInterval);
    const playPauseBtn = section11.querySelector('#play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.textContent = 'Play';
    }
    
    // Clear and reinitialize visualization
    d3.select(vizElement).selectAll('*').remove();
    console.log('[Sandbox] Visualization cleared');
    
    console.log('[Sandbox] Starting visualization initialization');
    vizInitializeVisualization();
    vizUpdateFrameDisplay();
    vizDrawField();
    vizDrawFieldAnnotations();
    vizPopulateScoreboard();
    vizPopulateSupplementaryPanel();
    vizUpdatePlayDescription();
    vizUpdateTimeToThrow();
    vizDrawCoverageAnnotation();
    vizUpdateVisualization();
    console.log('[Sandbox] Visualization complete');
    
    // Set play direction - scope to Section 11
    const playDirectionEl = section11.querySelector('#play-direction');
    if (playDirectionEl) {
        playDirectionEl.textContent = data.play_direction;
    }
    
    // Update game/play info - scope to Section 11
    const infoEl = section11.querySelector('.info p');
    if (infoEl) {
        infoEl.innerHTML = 
            `<strong>Game ID:</strong> ${data.game_id} | <strong>Play ID:</strong> ${data.play_id} | <strong>Direction:</strong> <span id="play-direction">${data.play_direction}</span>`;
    }
}

// Load the data - try to load from manifest first, otherwise use default play_data.json
async function loadSandboxPlay() {
    console.log('[Sandbox] ===== loadSandboxPlay() CALLED =====');
    console.log('[Sandbox] Starting to load initial play');
    
    // Check if Section 11 exists
    if (!shouldInitializeViz()) {
        console.log('[Sandbox] Section 11 not found, skipping initialization');
        return;
    }
    
    try {
        // Try to load from manifest and pick a random play
        console.log('[Sandbox] Fetching plays_manifest.json');
        const manifestResponse = await fetch('plays_manifest.json');
        if (!manifestResponse.ok) {
            throw new Error(`HTTP error! status: ${manifestResponse.status}`);
        }
        
        const playsManifest = await manifestResponse.json();
        console.log('[Sandbox] Loaded manifest with', playsManifest.length, 'plays');
        
        if (!playsManifest || playsManifest.length === 0) {
            throw new Error('Manifest is empty or invalid');
        }
        
        // Randomly select a play from manifest
        const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
        console.log('[Sandbox] Selected play:', randomPlay.filename);
        
        const data = await d3.json(randomPlay.filename);
        if (!data) {
            throw new Error('Failed to load play data');
        }
        
        console.log('[Sandbox] Play data loaded successfully');
        vizInitializePlayVisualization(data);
        return;
    } catch (error) {
        console.error('[Sandbox] Error loading from manifest:', error);
        console.log('[Sandbox] Attempting fallback to play_data.json');
        
        // Fallback to default play_data.json
        try {
            const data = await d3.json('play_data.json');
            if (data) {
                console.log('[Sandbox] Fallback play_data.json loaded');
                vizInitializePlayVisualization(data);
            } else {
                console.error('[Sandbox] Failed to load fallback play_data.json');
            }
        } catch (fallbackError) {
            console.error('[Sandbox] Error loading fallback:', fallbackError);
        }
    }
}

// Only initialize if Section 11 (interactive sandbox) exists
// Section 5 uses qb_simulate.js with qb- prefixed IDs
function shouldInitializeViz() {
    const section11 = document.getElementById('interactive');
    if (!section11) {
        console.log('[Sandbox] Section 11 (interactive) not found');
        return false;
    }
    const vizElement = section11.querySelector('#visualization');
    if (!vizElement) {
        console.log('[Sandbox] #visualization not found in Section 11');
        return false;
    }
    console.log('[Sandbox] Section 11 found, initialization allowed');
    return true;
}

// Load initial play only if Section 11 exists and DOM is ready
function initSandbox() {
    if (document.readyState === 'loading') {
        console.log('[Sandbox] DOM not ready, waiting for DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', initSandbox);
        return;
    }
    
    if (shouldInitializeViz()) {
        console.log('[Sandbox] Starting initialization');
        console.log('[Sandbox] loadSandboxPlay type:', typeof loadSandboxPlay);
        console.log('[Sandbox] loadSandboxPlay function:', loadSandboxPlay);
        
        if (typeof loadSandboxPlay !== 'function') {
            console.error('[Sandbox] ERROR: loadSandboxPlay is not a function!', loadSandboxPlay);
            return;
        }
        
        console.log('[Sandbox] About to call loadSandboxPlay()');
        try {
            const result = loadSandboxPlay();
            console.log('[Sandbox] loadSandboxPlay() returned:', result);
            if (result && typeof result.then === 'function') {
                console.log('[Sandbox] loadSandboxPlay() returned a Promise, attaching catch handler');
                result.catch(error => {
                    console.error('[Sandbox] Async error in loadSandboxPlay():', error);
                    console.error('[Sandbox] Error stack:', error.stack);
                });
            } else {
                console.log('[Sandbox] loadSandboxPlay() did not return a Promise');
            }
        } catch (error) {
            console.error('[Sandbox] Synchronous error calling loadSandboxPlay():', error);
            console.error('[Sandbox] Error stack:', error.stack);
        }
    } else {
        console.log('[Sandbox] Initialization skipped - Section 11 not available');
    }
}

initSandbox();

function vizInitializeVisualization() {
    const width = 1080; // 900 * 1.2
    const height = 660; // 550 * 1.2
    const margin = { top: 120, right: 24, bottom: 144, left: 24 }; // all * 1.2
    
    // NFL field dimensions: 0-120 yards (x-axis), 0-53.3 yards (y-axis)
    const fieldXMin = 0;
    const fieldXMax = 120;
    const fieldYMin = 0;
    const fieldYMax = 53.3;
    
    // Calculate available space and center the field vertically
    const availableHeight = height - margin.top - margin.bottom;
    const fieldAspectRatio = 53.3 / 120; // height/width ratio
    const fieldWidth = width - margin.left - margin.right;
    const fieldHeight = fieldWidth * fieldAspectRatio;
    
    // Center the field vertically
    const fieldTop = margin.top + (availableHeight - fieldHeight) / 2;
    const fieldBottom = fieldTop + fieldHeight;
    
    // Create scales using proper field dimensions
    vizXScale = d3.scaleLinear()
        .domain([fieldXMin, fieldXMax])
        .range([margin.left, width - margin.right]);
    
    vizYScale = d3.scaleLinear()
        .domain([fieldYMin, fieldYMax])
        .range([fieldBottom, fieldTop]);
    
    // Create SVG - scope to Section 11
    const section11 = document.getElementById('interactive');
    if (!section11) {
        console.error('[Sandbox] Section 11 not found in initializeVisualization');
        return;
    }
    const vizElement = section11.querySelector('#visualization');
    if (!vizElement) {
        console.error('[Sandbox] #visualization not found in Section 11');
        return;
    }
    
    vizSvg = d3.select(vizElement)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    console.log('[Sandbox] SVG created');
    
    // Create groups for different elements
    vizSvg.append('g').attr('class', 'field');
    vizSvg.append('g').attr('class', 'field-annotations');
    vizSvg.append('g').attr('class', 'trails');
    vizSvg.append('g').attr('class', 'ball-trajectory');
    vizSvg.append('g').attr('class', 'ball');
    vizSvg.append('g').attr('class', 'players');
    vizSvg.append('g').attr('class', 'output-players');
    vizSvg.append('g').attr('class', 'labels');
    vizSvg.append('g').attr('class', 'coverage-arrows');
}

function vizDrawField() {
    const fieldGroup = vizSvg.select('.field');
    
    // Field dimensions
    const xMin = 0;
    const xMax = 120;
    const yMin = 0;
    const yMax = 53.3;
    
    // Green grass background
    fieldGroup.append('rect')
        .attr('x', vizXScale(xMin))
        .attr('y', vizYScale(yMax))
        .attr('width', vizXScale(xMax) - vizXScale(xMin))
        .attr('height', vizYScale(yMin) - vizYScale(yMax))
        .attr('fill', '#90EE90')
        .attr('class', 'field-background');
    
    // Draw end zones (0-10 and 110-120 yards) with team colors
    // Determine which team is on which side based on play direction and yardline
    let leftTeam = null;
    let rightTeam = null;
    let leftTeamColor = '#0066CC'; // Default blue
    let rightTeamColor = '#DC143C'; // Default red
    
    if (vizPlayData.supplementary) {
        const supp = vizPlayData.supplementary;
        // Determine which team is on left (0-10) and right (110-120)
        // Typically, visitor team is on left, home team is on right
        if (supp.visitor_team_abbr) {
            leftTeam = supp.visitor_team_abbr;
            leftTeamColor = vizTeamColors[supp.visitor_team_abbr] || '#0066CC';
        }
        if (supp.home_team_abbr) {
            rightTeam = supp.home_team_abbr;
            rightTeamColor = vizTeamColors[supp.home_team_abbr] || '#DC143C';
        }
    }
    
    // End zone 1 (0-10 yards) - Left team
    const leftEndzone = fieldGroup.append('rect')
        .attr('x', vizXScale(0))
        .attr('y', vizYScale(yMax))
        .attr('width', vizXScale(10) - vizXScale(0))
        .attr('height', vizYScale(yMin) - vizYScale(yMax))
        .attr('fill', leftTeamColor)
        .attr('opacity', 0.3)
        .attr('class', 'endzone-left');
    
    // Add team name label in left endzone
    if (leftTeam) {
        const leftEndzoneCenterX = vizXScale(5);
        const leftEndzoneCenterY = (vizYScale(yMin) + vizYScale(yMax)) / 2;
        fieldGroup.append('text')
            .attr('x', leftEndzoneCenterX)
            .attr('y', leftEndzoneCenterY)
            .attr('class', 'endzone-label')
            .style('font-size', '28.8px') // 24 * 1.2
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle')
            .style('opacity', 0.8)
            .text(leftTeam);
    }
    
    // End zone 2 (110-120 yards) - Right team
    const rightEndzone = fieldGroup.append('rect')
        .attr('x', vizXScale(110))
        .attr('y', vizYScale(yMax))
        .attr('width', vizXScale(120) - vizXScale(110))
        .attr('height', vizYScale(yMin) - vizYScale(yMax))
        .attr('fill', rightTeamColor)
        .attr('opacity', 0.3)
        .attr('class', 'endzone-right');
    
    // Add team name label in right endzone
    if (rightTeam) {
        const rightEndzoneCenterX = vizXScale(115);
        const rightEndzoneCenterY = (vizYScale(yMin) + vizYScale(yMax)) / 2;
        fieldGroup.append('text')
            .attr('x', rightEndzoneCenterX)
            .attr('y', rightEndzoneCenterY)
            .attr('class', 'endzone-label')
            .style('font-size', '28.8px') // 24 * 1.2
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle')
            .style('opacity', 0.8)
            .text(rightTeam);
    }
    
    // Draw vertical yard lines (every 10 yards from 0 to 120)
    for (let i = 0; i <= 120; i += 10) {
        const isEndZone = (i <= 10 || i >= 110);
        const isGoalLine = (i === 10 || i === 110);
        
        fieldGroup.append('line')
            .attr('class', 'field-line')
            .attr('x1', vizXScale(i))
            .attr('y1', vizYScale(yMin))
            .attr('x2', vizXScale(i))
            .attr('y2', vizYScale(yMax))
            .attr('stroke-width', isGoalLine ? 3 : (isEndZone ? 2 : 1))
            .attr('opacity', isEndZone ? 0.6 : 0.8);
    }
    
    // Draw out-of-bounds lines (sidelines at y=0 and y=53.3)
    fieldGroup.append('line')
        .attr('class', 'out-of-bounds-line')
        .attr('x1', vizXScale(xMin))
        .attr('y1', vizYScale(yMin))
        .attr('x2', vizXScale(xMax))
        .attr('y2', vizYScale(yMin))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    fieldGroup.append('line')
        .attr('class', 'out-of-bounds-line')
        .attr('x1', vizXScale(xMin))
        .attr('y1', vizYScale(yMax))
        .attr('x2', vizXScale(xMax))
        .attr('y2', vizYScale(yMax))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    // Draw field boundaries (left and right)
    fieldGroup.append('line')
        .attr('class', 'field-boundary')
        .attr('x1', vizXScale(xMin))
        .attr('y1', vizYScale(yMin))
        .attr('x2', vizXScale(xMin))
        .attr('y2', vizYScale(yMax))
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 4)
        .attr('opacity', 1);
    
    fieldGroup.append('line')
        .attr('class', 'field-boundary')
        .attr('x1', vizXScale(xMax))
        .attr('y1', vizYScale(yMin))
        .attr('x2', vizXScale(xMax))
        .attr('y2', vizYScale(yMax))
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 4)
        .attr('opacity', 1);
    
    // Draw first down marker
    if (vizPlayData.supplementary && vizPlayData.supplementary.yardline_number !== null && vizPlayData.supplementary.yards_to_go !== null) {
        const yardlineNumber = vizPlayData.supplementary.yardline_number;
        const yardsToGo = vizPlayData.supplementary.yards_to_go;
        const yardlineSide = vizPlayData.supplementary.yardline_side;
        
        // Convert relative yardline to absolute coordinates (0-120)
        // Left endzone is 0-10, right endzone is 110-120
        // If yardline_side matches visitor team or is on left side, use: absolute = 10 + yardline_number
        // If yardline_side matches home team or is on right side, use: absolute = 110 - yardline_number
        let absoluteYardline;
        if (vizPlayData.absolute_yardline !== null && vizPlayData.absolute_yardline !== undefined) {
            // Use absolute_yardline if available (most reliable)
            absoluteYardline = vizPlayData.absolute_yardline;
        } else {
            // Fallback: determine based on yardline_side
            // Typically, if yardline_number < 50, it's from left side (0-10 endzone)
            // If yardline_number >= 50, it's from right side (110-120 endzone)
            if (yardlineNumber < 50) {
                // Left side: absolute = 10 + yardline_number
                absoluteYardline = 10 + yardlineNumber;
            } else {
                // Right side: absolute = 110 - yardline_number
                absoluteYardline = 110 - yardlineNumber;
            }
        }
        
        // Calculate first down position based on play direction
        let firstDownYardline;
        if (vizPlayData.play_direction === 'right') {
            firstDownYardline = absoluteYardline + yardsToGo;
        } else {
            firstDownYardline = absoluteYardline - yardsToGo;
        }
        
        // Ensure first down is within field bounds
        if (firstDownYardline >= 0 && firstDownYardline <= 120) {
            const firstDownX = vizXScale(firstDownYardline);
            
            // Draw first down marker line
            fieldGroup.append('line')
                .attr('class', 'first-down-marker')
                .attr('x1', firstDownX)
                .attr('y1', vizYScale(yMin))
                .attr('x2', firstDownX)
                .attr('y2', vizYScale(yMax))
                .attr('stroke', '#FFD700')
                .attr('stroke-width', 4)
                .attr('opacity', 0.9)
                .attr('stroke-dasharray', '15,5');
            
            // Add first down label
            fieldGroup.append('text')
                .attr('x', firstDownX)
                .attr('y', vizYScale(yMax) + 15)
                .attr('class', 'field-number')
                .style('font-size', '14.4px') // 12 * 1.2
                .style('fill', '#FFD700')
                .style('font-weight', 'bold')
                .text('1st');
        }
    }
    
    // Draw field annotations
    vizDrawFieldAnnotations();
}

function vizDrawFieldAnnotations() {
    if (!vizPlayData.supplementary) return;
    
    const supp = vizPlayData.supplementary;
    const annotationsGroup = vizSvg.select('.field-annotations');
    
    // Get field dimensions (must match initializeVisualization)
    const width = 1080; // 900 * 1.2
    const height = 780; // 650 * 1.2
    const margin = { top: 72, right: 24, bottom: 144, left: 24 }; // all * 1.2
    const yMin = 0;
    const yMax = 53.3;
    
    // Calculate field position (must match initializeVisualization)
    const availableHeight = height - margin.top - margin.bottom;
    const fieldAspectRatio = 53.3 / 120;
    const fieldWidth = width - margin.left - margin.right;
    const fieldHeight = fieldWidth * fieldAspectRatio;
    const fieldTop = margin.top + (availableHeight - fieldHeight) / 2;
    const fieldBottom = fieldTop + fieldHeight;
    
    // Draw line of scrimmage (yardline marker)
    if (supp.yardline_side && supp.yardline_number !== null) {
        // Convert relative yardline to absolute coordinates (0-120)
        let absoluteYardline;
        if (vizPlayData.absolute_yardline !== null && vizPlayData.absolute_yardline !== undefined) {
            absoluteYardline = vizPlayData.absolute_yardline;
        } else {
            // Fallback: convert based on yardline_side
            const yardlineNumber = supp.yardline_number;
            if (yardlineNumber < 50) {
                // Left side: absolute = 10 + yardline_number
                absoluteYardline = 10 + yardlineNumber;
            } else {
                // Right side: absolute = 110 - yardline_number
                absoluteYardline = 110 - yardlineNumber;
            }
        }
        
        const yardlineX = vizXScale(absoluteYardline);
        
        // Draw line of scrimmage line
        const fieldGroup = vizSvg.select('.field');
        fieldGroup.append('line')
            .attr('class', 'line-of-scrimmage')
            .attr('x1', yardlineX)
            .attr('y1', vizYScale(yMin))
            .attr('x2', yardlineX)
            .attr('y2', vizYScale(yMax))
            .attr('stroke', '#00FF00')
            .attr('stroke-width', 3)
            .attr('opacity', 0.8)
            .attr('stroke-dasharray', '10,5');
        
        // Add yardline label at bottom with background box
        // Position it below the field with some padding
        const bottomY = fieldBottom + 10;
        const yardlineText = `${supp.yardline_side} ${supp.yardline_number}`;
        
        // Create temporary text element to measure width and height
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '19.2px') // 16 * 1.2
            .style('font-weight', 'bold')
            .style('visibility', 'hidden')
            .text(yardlineText);
        const textWidth = tempText.node().getBBox().width;
        const textHeight = tempText.node().getBBox().height;
        tempText.remove();
        
        // Add background box (centered vertically on the text)
        const padding = 6;
        const boxHeight = textHeight + padding * 2;
        const boxY = bottomY - textHeight - padding;
        annotationsGroup.append('rect')
            .attr('x', yardlineX - textWidth / 2 - padding)
            .attr('y', boxY)
            .attr('width', textWidth + padding * 2)
            .attr('height', boxHeight)
            .attr('fill', 'white')
            .attr('opacity', 0.3)
            .attr('stroke', '#00FF00')
            .attr('stroke-width', 2)
            .attr('rx', 4);
        
        // Add text on top (centered vertically in box)
        // SVG text baseline is at bottom, so adjust y to center text in box
        const textY = boxY + boxHeight / 2 + textHeight / 3; // Adjust for baseline
        annotationsGroup.append('text')
            .attr('x', yardlineX)
            .attr('y', textY)
            .attr('class', 'field-number')
            .style('font-size', '19.2px') // 16 * 1.2
            .style('font-weight', 'bold')
            .style('fill', '#0d0a1f')
            .style('text-anchor', 'middle')
            .text(yardlineText);
    }
    
    // Add team names at top of field with background boxes (no scores - scores are in scoreboard)
    // Position them above the field with some padding
    const topY = fieldTop - 50;
    if (supp.visitor_team_abbr) {
        const visitorText = supp.visitor_team_abbr;
        const visitorColor = vizTeamColors[supp.visitor_team_abbr] || '#2a2a2a';
        
        // Create temporary text element to measure width and height
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('visibility', 'hidden')
            .text(visitorText);
        const textWidth = tempText.node().getBBox().width;
        const textHeight = tempText.node().getBBox().height;
        tempText.remove();
        
        // Add background box with team color
        const padding = 8;
        const boxHeight = textHeight + padding * 2;
        const boxY = topY - textHeight - padding;
        annotationsGroup.append('rect')
            .attr('x', margin.left + 10 - padding)
            .attr('y', boxY)
            .attr('width', textWidth + padding * 2)
            .attr('height', boxHeight)
            .attr('fill', visitorColor)
            .attr('opacity', 0.9)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('rx', 4);
        
        // Add text on top
        const textY = boxY + boxHeight / 2 + textHeight / 3;
        annotationsGroup.append('text')
            .attr('x', margin.left + 10)
            .attr('y', textY)
            .attr('class', 'field-annotation')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .text(visitorText);
    }
    
    if (supp.home_team_abbr) {
        const homeText = supp.home_team_abbr;
        const homeColor = vizTeamColors[supp.home_team_abbr] || '#2a2a2a';
        
        // Create temporary text element to measure width and height
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('visibility', 'hidden')
            .text(homeText);
        const textWidth = tempText.node().getBBox().width;
        const textHeight = tempText.node().getBBox().height;
        tempText.remove();
        
        // Add background box with team color
        const padding = 8;
        const boxHeight = textHeight + padding * 2;
        const boxY = topY - textHeight - padding;
        const boxX = width - margin.right - 10 - textWidth - padding;
        annotationsGroup.append('rect')
            .attr('x', boxX)
            .attr('y', boxY)
            .attr('width', textWidth + padding * 2)
            .attr('height', boxHeight)
            .attr('fill', homeColor)
            .attr('opacity', 0.9)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('rx', 4);
        
        // Add text on top
        const textY = boxY + boxHeight / 2 + textHeight / 3;
        annotationsGroup.append('text')
            .attr('x', width - margin.right - 10)
            .attr('y', textY)
            .attr('class', 'field-annotation')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-anchor', 'end')
            .text(homeText);
    }
    
    // Add down & distance aligned with line of scrimmage
    if (supp.down !== null && supp.yards_to_go !== null && supp.yardline_side && supp.yardline_number !== null) {
        // Calculate yardline position to align with
        let absoluteYardline;
        if (vizPlayData.absolute_yardline !== null && vizPlayData.absolute_yardline !== undefined) {
            absoluteYardline = vizPlayData.absolute_yardline;
        } else {
            const yardlineNumber = supp.yardline_number;
            if (yardlineNumber < 50) {
                absoluteYardline = 10 + yardlineNumber;
            } else {
                absoluteYardline = 110 - yardlineNumber;
            }
        }
        const alignX = vizXScale(absoluteYardline);
        
        // Convert down number to ordinal (1st, 2nd, 3rd, 4th)
        const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const downOrdinal = getOrdinal(supp.down);
        const downDistanceText = `${downOrdinal} & ${supp.yards_to_go}`;
        
        // Create temporary text element to measure width
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('visibility', 'hidden')
            .text(downDistanceText);
        const textWidth = tempText.node().getBBox().width;
        const textHeight = tempText.node().getBBox().height;
        tempText.remove();
        
        // Add background box
        // Add background box
        const padding = 8;
        const boxHeight = textHeight + padding * 2;
        const boxY = topY - textHeight - padding;
        annotationsGroup.append('rect')
            .attr('x', alignX - textWidth / 2 - padding)
            .attr('y', boxY)
            .attr('width', textWidth + padding * 2)
            .attr('height', boxHeight)
            .attr('fill', 'white')
            .attr('opacity', 0.3)
            .attr('stroke', '#FFD700')
            .attr('stroke-width', 2)
            .attr('rx', 4);
        
        // Add text on top (centered vertically in box)
        // SVG text baseline is at bottom, so adjust y to center text in box
        const textY = boxY + boxHeight / 2 + textHeight / 3;
        annotationsGroup.append('text')
            .attr('x', alignX)
            .attr('y', textY)
            .attr('class', 'field-annotation')
            .style('font-size', '21.6px') // 18 * 1.2
            .style('font-weight', 'bold')
            .style('fill', '#0d0a1f')
            .style('text-anchor', 'middle')
            .text(downDistanceText);
    }

}

function vizPopulateScoreboard() {
    if (!vizPlayData.supplementary) return;
    
    const supp = vizPlayData.supplementary;
    const scoreboard = d3.select('#scoreboard');
    
    scoreboard.html(''); // Clear existing content
    
    // Convert down number to ordinal (1st, 2nd, 3rd, 4th)
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    // Left section - Visitor team
    const leftSection = scoreboard.append('div').attr('class', 'scoreboard-left');
    if (supp.visitor_team_abbr) {
        const visitorScore = supp.pre_snap_visitor_score !== null ? supp.pre_snap_visitor_score : 0;
        const visitorColor = vizTeamColors[supp.visitor_team_abbr] || '#2a2a2a';
        // Apply team color as background
        leftSection.style('background', visitorColor);
        leftSection.append('div').attr('class', 'scoreboard-team-name').text(supp.visitor_team_abbr);
        leftSection.append('div').attr('class', 'scoreboard-score').text(visitorScore);
    }
    
    // Center section - Game situation
    const centerSection = scoreboard.append('div').attr('class', 'scoreboard-center');
    
    // Down & Distance
    if (supp.down !== null && supp.yards_to_go !== null) {
        const downOrdinal = getOrdinal(supp.down);
        centerSection.append('div').attr('class', 'scoreboard-down-distance')
            .text(`${downOrdinal} & ${supp.yards_to_go}`);
    }
    
    // Quarter and Clock
    const gameInfo = centerSection.append('div').attr('class', 'scoreboard-game-info');
    if (supp.quarter !== null && supp.quarter !== undefined) {
        gameInfo.append('span').attr('class', 'scoreboard-quarter').text(`Q${supp.quarter}`);
    }
    if (supp.game_clock) {
        gameInfo.append('span').attr('class', 'scoreboard-clock').text(supp.game_clock);
    }
    
    // Right section - Home team
    const rightSection = scoreboard.append('div').attr('class', 'scoreboard-right');
    if (supp.home_team_abbr) {
        const homeScore = supp.pre_snap_home_score !== null ? supp.pre_snap_home_score : 0;
        const homeColor = vizTeamColors[supp.home_team_abbr] || '#2a2a2a';
        // Apply team color as background
        rightSection.style('background', homeColor);
        rightSection.append('div').attr('class', 'scoreboard-score').text(homeScore);
        rightSection.append('div').attr('class', 'scoreboard-team-name').text(supp.home_team_abbr);
    }
}

function vizPopulateSupplementaryPanel() {
    if (!vizPlayData.supplementary) return;
    
    const supp = vizPlayData.supplementary;
    const panel = d3.select('#supplementary-panel');
    
    panel.html(''); // Clear existing content
    
    panel.append('h2').text('Play Information');
    
    // Play Situation
    const playSituation = panel.append('div').attr('class', 'info-section');
    playSituation.append('h3').text('Play Situation');
    if (supp.down !== null && supp.down !== undefined) {
        playSituation.append('p').html(`<strong>Down:</strong> <span class="value">${supp.down}</span>`);
    }
    if (supp.yards_to_go !== null && supp.yards_to_go !== undefined) {
        playSituation.append('p').html(`<strong>Yards to Go:</strong> <span class="value">${supp.yards_to_go}</span>`);
    }
    if (supp.yardline_side && supp.yardline_number !== null) {
        playSituation.append('p').html(`<strong>Yardline:</strong> <span class="value">${supp.yardline_side} ${supp.yardline_number}</span>`);
    }
    if (supp.game_clock) {
        playSituation.append('p').html(`<strong>Game Clock:</strong> <span class="value">${supp.game_clock}</span>`);
    }
    if (supp.quarter !== null && supp.quarter !== undefined) {
        playSituation.append('p').html(`<strong>Quarter:</strong> <span class="value">${supp.quarter}</span>`);
    }
    
    // Play Details
    const playDetails = panel.append('div').attr('class', 'info-section');
    playDetails.append('h3').text('Play Details');
    if (supp.pass_result) {
        playDetails.append('p').html(`<strong>Result:</strong> <span class="value">${supp.pass_result}</span>`);
    }
    if (supp.pass_length !== null && supp.pass_length !== undefined) {
        playDetails.append('p').html(`<strong>Pass Length:</strong> <span class="value">${supp.pass_length} yards</span>`);
    }
    if (supp.yards_gained !== null && supp.yards_gained !== undefined) {
        playDetails.append('p').html(`<strong>Yards Gained:</strong> <span class="value">${supp.yards_gained}</span>`);
    }
    if (supp.offense_formation) {
        playDetails.append('p').html(`<strong>Formation:</strong> <span class="value">${supp.offense_formation}</span>`);
    }
    if (supp.receiver_alignment) {
        playDetails.append('p').html(`<strong>Alignment:</strong> <span class="value">${supp.receiver_alignment}</span>`);
    }
    if (supp.route_of_targeted_receiver) {
        playDetails.append('p').html(`<strong>Route:</strong> <span class="value">${supp.route_of_targeted_receiver}</span>`);
    }
    if (supp.dropback_type) {
        playDetails.append('p').html(`<strong>Dropback:</strong> <span class="value">${supp.dropback_type}</span>`);
    }
    if (supp.dropback_distance !== null && supp.dropback_distance !== undefined) {
        playDetails.append('p').html(`<strong>Dropback Distance:</strong> <span class="value">${supp.dropback_distance.toFixed(2)} yards</span>`);
    }
    if (supp.pass_location_type) {
        playDetails.append('p').html(`<strong>Pass Location:</strong> <span class="value">${supp.pass_location_type}</span>`);
    }
    if (supp.team_coverage_man_zone) {
        const coverageManZone = supp.team_coverage_man_zone
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        playDetails.append('p').html(`<strong>Coverage Type:</strong> <span class="value">${coverageManZone}</span>`);
    }
    if (supp.team_coverage_type) {
        const coverageType = supp.team_coverage_type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        playDetails.append('p').html(`<strong>Coverage:</strong> <span class="value">${coverageType}</span>`);
    }
    if (supp.defenders_in_the_box !== null && supp.defenders_in_the_box !== undefined) {
        playDetails.append('p').html(`<strong>Defenders in Box:</strong> <span class="value">${supp.defenders_in_the_box}</span>`);
    }
    if (supp.play_action !== null && supp.play_action !== undefined) {
        playDetails.append('p').html(`<strong>Play Action:</strong> <span class="value">${supp.play_action ? 'Yes' : 'No'}</span>`);
    }
    
    // Advanced Stats
    if (supp.expected_points !== null || supp.expected_points_added !== null) {
        const statsInfo = panel.append('div').attr('class', 'info-section');
        statsInfo.append('h3').text('Advanced Stats');
        if (supp.expected_points !== null) {
            statsInfo.append('p').html(`<strong>Expected Points:</strong> <span class="value">${supp.expected_points.toFixed(2)}</span>`);
        }
        if (supp.expected_points_added !== null) {
            statsInfo.append('p').html(`<strong>EPA:</strong> <span class="value">${supp.expected_points_added.toFixed(2)}</span>`);
        }
    }
}

function vizUpdatePlayDescription() {
    if (!vizPlayData.supplementary || !vizPlayData.supplementary.play_description) return;
    
    const descDiv = d3.select('#play-description');
    descDiv.html(`<strong>Play Description:</strong> ${vizPlayData.supplementary.play_description}`);
}

// Calculate ball position along parabolic trajectory
function vizCalculateBallPosition(frame) {
    if (frame < vizPlayData.throw_frame) {
        // Ball hasn't been thrown yet
        return {
            x: vizPlayData.ball_throw_x,
            y: vizPlayData.ball_throw_y,
            visible: false
        };
    }
    
    // Calculate flight time - ball travels from throw to landing
    // Since input data is "before throw" and output is "after throw",
    // the throw happens at the last input frame (throw_frame = max_frame)
    // The ball trajectory should complete at the very last frame to match when player catches
    const throwFrame = vizPlayData.throw_frame;
    const landingFrame = vizPlayData.total_frames || vizPlayData.max_frame; // Finish at last frame
    
    if (frame >= landingFrame) {
        // Ball has landed
        return {
            x: vizPlayData.ball_land_x,
            y: vizPlayData.ball_land_y,
            visible: true
        };
    }
    
    // Calculate progress along trajectory (0 to 1)
    const currentFlightFrame = frame - throwFrame;
    const flightFrames = landingFrame - throwFrame; // Total frames for ball to travel
    const progress = Math.min(Math.max(currentFlightFrame / flightFrames, 0), 1);
    
    // Straight line trajectory from throw point to landing point
    const startX = vizPlayData.ball_throw_x;
    const startY = vizPlayData.ball_throw_y;
    const endX = vizPlayData.ball_land_x;
    const endY = vizPlayData.ball_land_y;
    
    // Simple linear interpolation (straight line)
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    
    return {
        x: x,
        y: y,
        visible: true
    };
}

function vizUpdateTimeToThrow() {
    if (!vizPlayData) return;
    
    // Calculate time to throw (assuming 10 frames per second, so each frame is 0.1 seconds)
    const framesPerSecond = 10;
    const timePerFrame = 1 / framesPerSecond;
    
    // Time stops at throw_frame (when switching from input to output)
    const effectiveFrame = Math.min(vizCurrentFrame, vizPlayData.throw_frame);
    const timeToThrow = (effectiveFrame - 1) * timePerFrame; // -1 because frame starts at 1
    
    const timeDisplay = d3.select('#time-to-throw');
    timeDisplay.text(`Time to Throw: ${timeToThrow.toFixed(1)}s`);
}

function vizDrawCoverageAnnotation() {
    if (!vizPlayData || !vizPlayData.supplementary) {
        const coverageDisplay = d3.select('#coverage-annotation');
        coverageDisplay.text('');
        return;
    }
    
    const supp = vizPlayData.supplementary;
    let coverageType = supp.team_coverage_type || supp.team_coverage_man_zone || 'Unknown';
    
    // Format coverage text: COVER_X_ZONE -> Cover X Zone
    coverageType = coverageType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Always update coverage text display (stays visible throughout) - scope to Section 11
    const section11 = document.getElementById('interactive');
    if (section11) {
        const coverageEl = section11.querySelector('#coverage-annotation');
        if (coverageEl) {
            const coverageDisplay = d3.select(coverageEl);
            coverageDisplay.text(`Coverage: ${coverageType}`);
        }
    }
    
    // Only draw arrows on frame 1
    const coverageGroup = vizSvg.select('.coverage-arrows');
    if (vizCurrentFrame === 1) {
        coverageGroup.selectAll('*').remove();
        
        // Get the actual position of the coverage annotation element
        const section11 = document.getElementById('interactive');
        if (!section11) return;
        const coverageElement = section11.querySelector('#coverage-annotation');
        const svgElement = section11.querySelector('#visualization');
        
        if (coverageElement && svgElement) {
            const coverageRect = coverageElement.getBoundingClientRect();
            const svgRect = svgElement.getBoundingClientRect();
            
            // Calculate the center X and bottom Y of the coverage annotation
            // relative to the SVG
            const annotationX = (coverageRect.left + coverageRect.width / 2) - svgRect.left;
            const annotationY = (coverageRect.bottom) - svgRect.top;
            
            // Draw arrows to each defensive player only
            Object.entries(vizPlayData.players).forEach(([nflId, player]) => {
                // Only show arrows for defensive players
                if (player.side !== 'Defense') return;
                
                const frame1 = player.frames.find(f => f.frame_id === 1);
                if (!frame1) return;
                
                const playerX = vizXScale(frame1.x);
                const playerY = vizYScale(frame1.y);
                
                // Calculate arrow path
                const dx = playerX - annotationX;
                const dy = playerY - annotationY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Shorten arrow to stop before player circle (assuming player radius ~8px)
                const arrowLength = distance - 10;
                const endX = annotationX + (dx / distance) * arrowLength;
                const endY = annotationY + (dy / distance) * arrowLength;
                
                // Draw arrow line in red
                coverageGroup.append('line')
                    .attr('x1', annotationX)
                    .attr('y1', annotationY)
                    .attr('x2', endX)
                    .attr('y2', endY)
                    .attr('stroke', '#FF0000')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.7)
                    .attr('marker-end', 'url(#arrowhead-red)');
            });
        }
        
        // Create red arrow marker if it doesn't exist
        const defs = vizSvg.select('defs');
        if (defs.empty()) {
            vizSvg.append('defs');
        }
        
        if (vizSvg.select('defs').select('#arrowhead-red').empty()) {
            vizSvg.select('defs').append('marker')
                .attr('id', 'arrowhead-red')
                .attr('markerWidth', 10)
                .attr('markerHeight', 10)
                .attr('refX', 9)
                .attr('refY', 3)
                .attr('orient', 'auto')
                .append('polygon')
                .attr('points', '0 0, 10 3, 0 6')
                .attr('fill', '#FF0000');
        }
    } else {
        // Clear arrows after frame 1
        coverageGroup.selectAll('*').remove();
    }
}

function vizUpdateVisualization() {
    if (!vizPlayData || !vizSvg) return;
    
    const playersGroup = vizSvg.select('.players');
    const outputPlayersGroup = vizSvg.select('.output-players');
    const trailsGroup = vizSvg.select('.trails');
    const ballTrajectoryGroup = vizSvg.select('.ball-trajectory');
    const ballGroup = vizSvg.select('.ball');
    const labelsGroup = vizSvg.select('.labels');
    
    // Clear previous frame
    playersGroup.selectAll('*').remove();
    outputPlayersGroup.selectAll('*').remove();
    labelsGroup.selectAll('*').remove();
    ballGroup.selectAll('*').remove();
    
    // Draw coverage annotation (only on frame 1)
    vizDrawCoverageAnnotation();
    
    if (!vizShowTrails) {
        trailsGroup.selectAll('*').remove();
        ballTrajectoryGroup.selectAll('*').remove();
    }
    
    // Draw trails if enabled
    if (vizShowTrails) {
        trailsGroup.selectAll('*').remove();
        
        Object.entries(vizPlayData.players).forEach(([nflId, player]) => {
            const frames = player.frames.filter(f => f.frame_id <= vizCurrentFrame);
            
            if (frames.length < 2) return;
            
            const line = d3.line()
                .x(d => vizXScale(d.x))
                .y(d => vizYScale(d.y))
                .curve(d3.curveLinear);
            
            const color = player.side === 'Defense' ? '#FF6B6B' : '#4ECDC4';
            
            trailsGroup.append('path')
                .datum(frames)
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('opacity', 0.5);
        });
        
        // Draw trails for output players (after throw)
        if (vizPlayData.output_players && vizCurrentFrame > vizPlayData.throw_frame) {
            Object.entries(vizPlayData.output_players).forEach(([nflId, outputPlayer]) => {
                // Map visualization frames to output frames
                const startOutputFrame = 1;
                const endOutputFrame = Math.min(vizCurrentFrame - vizPlayData.throw_frame, Math.max(...outputPlayer.frames.map(f => f.frame_id)));
                
                const outputFrames = outputPlayer.frames.filter(f => f.frame_id >= startOutputFrame && f.frame_id <= endOutputFrame);
                
                if (outputFrames.length < 2) return;
                
                const line = d3.line()
                    .x(d => vizXScale(d.x))
                    .y(d => vizYScale(d.y))
                    .curve(d3.curveLinear);
                
                // Use orange color for output player trails
                trailsGroup.append('path')
                    .datum(outputFrames)
                    .attr('d', line)
                    .attr('fill', 'none')
                    .attr('stroke', '#FFA500')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.4)
                    .attr('stroke-dasharray', '3,3');
            });
        }
        
        // Draw ball trajectory
        if (vizShowBallTrajectory && vizCurrentFrame >= vizPlayData.throw_frame) {
            ballTrajectoryGroup.selectAll('*').remove();
            
            const trajectoryPoints = [];
            // Calculate trajectory up to current frame, including beyond max_frame if needed
            const maxTrajectoryFrame = Math.min(vizCurrentFrame, vizPlayData.throw_frame + 10); // Allow up to 10 frames for trajectory
            for (let f = vizPlayData.throw_frame; f <= maxTrajectoryFrame; f++) {
                const ballPos = vizCalculateBallPosition(f);
                if (ballPos.visible) {
                    trajectoryPoints.push({ x: ballPos.x, y: ballPos.y });
                }
            }
            
            if (trajectoryPoints.length >= 2) {
                const line = d3.line()
                    .x(d => vizXScale(d.x))
                    .y(d => vizYScale(d.y))
                    .curve(d3.curveLinear); // Straight line trajectory
                
                ballTrajectoryGroup.append('path')
                    .datum(trajectoryPoints)
                    .attr('d', line)
                    .attr('fill', 'none')
                    .attr('stroke', '#8B4513') // Brown color
                    .attr('stroke-width', 3)
                    .attr('opacity', 0.7)
                    .attr('stroke-dasharray', '5,3');
            }
        } else {
            ballTrajectoryGroup.selectAll('*').remove();
        }
    }
    
    // Draw ball at current position
    const ballPos = vizCalculateBallPosition(vizCurrentFrame);
    if (ballPos.visible || vizCurrentFrame >= vizPlayData.throw_frame) {
        const ballX = vizXScale(ballPos.x);
        const ballY = vizYScale(ballPos.y);
        
        // Draw ball (brown color)
        ballGroup.append('circle')
            .attr('cx', ballX)
            .attr('cy', ballY)
            .attr('r', 10)
            .attr('fill', '#8B4513') // Brown color
            .attr('stroke', '#654321')
            .attr('stroke-width', 2)
            .attr('opacity', 0.9);
        
        // Add subtle glow effect
        ballGroup.append('circle')
            .attr('cx', ballX)
            .attr('cy', ballY)
            .attr('r', 12)
            .attr('fill', 'none')
            .attr('stroke', '#8B4513')
            .attr('stroke-width', 1)
            .attr('opacity', 0.3);
        
        // Draw completion/incompletion indicator only at the last frame
        const lastFrame = vizPlayData.total_frames || vizPlayData.max_frame;
        if (vizCurrentFrame === lastFrame && vizPlayData.supplementary && vizPlayData.supplementary.pass_result) {
            const passResult = vizPlayData.supplementary.pass_result.toUpperCase();
            const isCompletion = passResult === 'C' || passResult === 'COMP' || passResult === 'COMPLETE' || 
                                 passResult.includes('COMPLETE') || passResult === 'COMPLETION';
            const isIncompletion = passResult === 'I' || passResult === 'INC' || passResult === 'INCOMPLETE' || 
                                   passResult.includes('INCOMPLETE') || passResult === 'INCOMPLETION';
            
            if (isCompletion) {
                // Draw checkmark
                const checkmarkGroup = ballGroup.append('g')
                    .attr('transform', `translate(${ballX}, ${ballY - 25})`);
                
                // Background circle for checkmark
                checkmarkGroup.append('circle')
                    .attr('r', 15)
                    .attr('fill', '#4CAF50')
                    .attr('stroke', '#2E7D32')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.95);
                
                // Checkmark path
                checkmarkGroup.append('path')
                    .attr('d', 'M -6,0 L -2,4 L 6,-4')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 3)
                    .attr('stroke-linecap', 'round')
                    .attr('stroke-linejoin', 'round')
                    .attr('fill', 'none');
            } else if (isIncompletion) {
                // Draw X
                const xGroup = ballGroup.append('g')
                    .attr('transform', `translate(${ballX}, ${ballY - 25})`);
                
                // Background circle for X
                xGroup.append('circle')
                    .attr('r', 15)
                    .attr('fill', '#F44336')
                    .attr('stroke', '#C62828')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.95);
                
                // X path (two diagonal lines)
                xGroup.append('line')
                    .attr('x1', -6)
                    .attr('y1', -6)
                    .attr('x2', 6)
                    .attr('y2', 6)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 3)
                    .attr('stroke-linecap', 'round');
                
                xGroup.append('line')
                    .attr('x1', -6)
                    .attr('y1', 6)
                    .attr('x2', 6)
                    .attr('y2', -6)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 3)
                    .attr('stroke-linecap', 'round');
            }
        }
    }
    
    // Draw players at current frame
    Object.entries(vizPlayData.players).forEach(([nflId, player]) => {
        let frame = player.frames.find(f => f.frame_id === vizCurrentFrame);
        let isOutputPlayer = false;
        
        // If player not in current input frame and we're past throw_frame,
        // check if they're in output data
        if (!frame && vizCurrentFrame > vizPlayData.throw_frame && vizPlayData.output_players && vizPlayData.output_players[nflId]) {
            const outputPlayer = vizPlayData.output_players[nflId];
            const outputFrame = vizCurrentFrame - vizPlayData.throw_frame;
            const outputFrameData = outputPlayer.frames.find(f => f.frame_id === outputFrame);
            
            if (outputFrameData) {
                // Use output position - player continues moving
                frame = {
                    x: outputFrameData.x,
                    y: outputFrameData.y,
                    dir: 0, // Output data doesn't have direction, use 0 or calculate from movement
                    s: 0 // Output data doesn't have speed
                };
                isOutputPlayer = true;
            } else {
                // Player in output but not in this specific output frame - use last output frame
                if (outputPlayer.frames.length > 0) {
                    const lastOutputFrame = outputPlayer.frames[outputPlayer.frames.length - 1];
                    if (lastOutputFrame && lastOutputFrame.frame_id < outputFrame) {
                        frame = {
                            x: lastOutputFrame.x,
                            y: lastOutputFrame.y,
                            dir: 0,
                            s: 0
                        };
                        isOutputPlayer = true;
                    }
                }
            }
        }
        
        // If still no frame and after throw_frame, freeze at last input position
        if (!frame && vizCurrentFrame > vizPlayData.throw_frame) {
            const lastFrame = player.frames[player.frames.length - 1];
            if (lastFrame) {
                frame = lastFrame; // Use last input frame position (freeze)
            } else {
                return; // No data at all for this player
            }
        } else if (!frame) {
            return; // No frame data for current frame
        }
        
        const color = player.side === 'Defense' ? '#FF6B6B' : '#4ECDC4';
        const x = vizXScale(frame.x);
        const y = vizYScale(frame.y);
        
        // Draw player circle
        const playerCircle = playersGroup.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 8)
            .attr('fill', color)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('opacity', isOutputPlayer ? 0.8 : 0.9);
        
        // Add tooltip
        const speedText = frame.s !== undefined ? `\nSpeed: ${frame.s.toFixed(2)} m/s` : '';
        playerCircle.append('title')
            .text(`${player.name} (${player.position})\nSide: ${player.side}${speedText}`);
        
        // Draw direction indicator (only if we have direction data)
        if (frame.dir !== undefined && frame.dir !== 0) {
            const angle = (frame.dir * Math.PI) / 180;
            const length = 15;
            const endX = x + Math.cos(angle) * length;
            const endY = y - Math.sin(angle) * length;
            
            playersGroup.append('line')
                .attr('x1', x)
                .attr('y1', y)
                .attr('x2', endX)
                .attr('y2', endY)
                .attr('stroke', '#333')
                .attr('stroke-width', 2)
                .attr('opacity', 0.7);
        }
        
        // Draw player name if enabled
        if (vizShowNames) {
            labelsGroup.append('text')
                .attr('x', x)
                .attr('y', y - 15)
                .attr('class', 'player-label')
                .attr('fill', '#333')
                .text(player.name.split(' ')[1] || player.name); // Last name only
        }
    });
    
    // Draw output players that are NOT in input data (only in output)
    // Players in both input and output are already handled above and continue moving
    if (vizShowOutputPlayers && vizPlayData.output_players && vizCurrentFrame > vizPlayData.throw_frame) {
        // Map visualization frame to output frame
        const outputFrame = vizCurrentFrame - vizPlayData.throw_frame;
        
        // Calculate max output frame
        let maxOutputFrame = 0;
        if (vizPlayData.output_players) {
            Object.values(vizPlayData.output_players).forEach(player => {
                if (player.frames && player.frames.length > 0) {
                    const playerMaxFrame = Math.max(...player.frames.map(f => f.frame_id));
                    maxOutputFrame = Math.max(maxOutputFrame, playerMaxFrame);
                }
            });
        }
        
        // Only show if outputFrame is within valid range (1 to max output frame)
        if (outputFrame >= 1 && outputFrame <= maxOutputFrame) {
            Object.entries(vizPlayData.output_players).forEach(([nflId, outputPlayer]) => {
                // Skip players that are in input data (they're already drawn above)
                if (vizPlayData.players[nflId]) {
                    return;
                }
                
                const frame = outputPlayer.frames.find(f => f.frame_id === outputFrame);
                if (!frame) return;
                
                const x = vizXScale(frame.x);
                const y = vizYScale(frame.y);
                
                // Draw output player circle (orange) - only for players not in input
                const outputPlayerCircle = outputPlayersGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 8)
                    .attr('fill', '#FFA500')
                    .attr('stroke', '#333')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0.8);
                
                // Add tooltip
                outputPlayerCircle.append('title')
                    .text(`Post-Throw Position\nFrame: ${outputFrame}`);
                
                // Draw player name if enabled
                if (vizShowNames) {
                    labelsGroup.append('text')
                        .attr('x', x)
                        .attr('y', y - 15)
                        .attr('class', 'player-label')
                        .attr('fill', '#333')
                        .style('font-style', 'italic')
                        .text(`P${nflId}`);
                }
            });
        }
    }
}

function vizUpdateFrameDisplay() {
    const section11 = document.getElementById('interactive');
    if (!section11) return;
    
    const maxFrame = vizPlayData.total_frames || vizPlayData.max_frame;
    const frameDisplay = section11.querySelector('#frame-display');
    if (frameDisplay) {
        frameDisplay.textContent = `Frame: ${vizCurrentFrame} / ${maxFrame}`;
    }
    const frameSlider = section11.querySelector('#frame-slider');
    if (frameSlider) {
        frameSlider.value = vizCurrentFrame;
    }
    vizUpdateTimeToThrow();
}

function vizPlayAnimation() {
    const section11 = document.getElementById('interactive');
    if (!section11) return;
    
    const playPauseBtn = section11.querySelector('#play-pause-btn');
    if (!playPauseBtn) return;
    
    if (vizIsPlaying) {
        clearInterval(vizAnimationInterval);
        vizIsPlaying = false;
        playPauseBtn.textContent = 'Play';
    } else {
        vizIsPlaying = true;
        playPauseBtn.textContent = 'Pause';
        
        vizAnimationInterval = setInterval(() => {
            const maxFrame = vizPlayData.total_frames || vizPlayData.max_frame;
            if (vizCurrentFrame >= maxFrame) {
                // Stop at last frame instead of looping
                clearInterval(vizAnimationInterval);
                vizIsPlaying = false;
                playPauseBtn.textContent = 'Play';
                // Ensure last frame is displayed
                vizUpdateFrameDisplay();
                vizDrawCoverageAnnotation();
                vizUpdateVisualization();
            } else {
                vizCurrentFrame++;
                vizUpdateFrameDisplay();
                vizDrawCoverageAnnotation();
                vizUpdateVisualization();
            }
        }, 200); // 200ms per frame
    }
}

function vizResetAnimation() {
    const section11 = document.getElementById('interactive');
    if (!section11) return;
    
    vizCurrentFrame = 1;
    vizIsPlaying = false;
    clearInterval(vizAnimationInterval);
    const playPauseBtn = section11.querySelector('#play-pause-btn');
    if (playPauseBtn) playPauseBtn.textContent = 'Play';
    vizUpdateFrameDisplay();
    vizUpdateVisualization();
}

// Event listeners - scoped to Section 11 only
// Function to randomize play
async function vizRandomizePlay() {
    const section11 = document.getElementById('interactive');
    if (!section11) {
        console.warn('[Sandbox] Cannot randomize - Section 11 not found');
        return;
    }
    
    try {
        console.log('[Sandbox] Randomizing play');
        // Load available plays from manifest
        const response = await fetch('plays_manifest.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const playsManifest = await response.json();
        console.log('[Sandbox] Loaded manifest with', playsManifest.length, 'plays');
        
        if (!playsManifest || playsManifest.length === 0) {
            alert('No available plays found');
            return;
        }
        
        // Randomly select a play
        const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
        console.log('[Sandbox] Selected play:', randomPlay.filename);
        
        // Update button to show loading - scope to Section 11
        const btn = section11.querySelector('#randomize-btn');
        if (!btn) {
            console.error('[Sandbox] #randomize-btn not found');
            return;
        }
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;
        
        // Load the selected play's JSON file
        const data = await d3.json(randomPlay.filename);
        if (!data) {
            throw new Error('Failed to load play data');
        }
        console.log('[Sandbox] Play data loaded, initializing visualization');
        vizInitializePlayVisualization(data);
        
        btn.textContent = originalText;
        btn.disabled = false;
    } catch (error) {
        console.error('[Sandbox] Error randomizing play:', error);
        alert('Error loading random play. Please try again.');
        const section11 = document.getElementById('interactive');
        if (section11) {
            const btn = section11.querySelector('#randomize-btn');
            if (btn) {
                btn.textContent = 'Randomize Play';
                btn.disabled = false;
            }
        }
    }
}

// Attach event listeners only if Section 11 exists
function attachSandboxEventListeners() {
    const section11 = document.getElementById('interactive');
    if (!section11) {
        console.log('[Sandbox] Section 11 not found, skipping event listeners');
        return;
    }
    
    const randomizeBtn = section11.querySelector('#randomize-btn');
    const playPauseBtn = section11.querySelector('#play-pause-btn');
    const resetBtn = section11.querySelector('#reset-btn');
    const frameSlider = section11.querySelector('#frame-slider');
    const showTrailsCheck = section11.querySelector('#show-trails');
    const showNamesCheck = section11.querySelector('#show-names');
    const showBallTrajectoryCheck = section11.querySelector('#show-ball-trajectory');
    const showOutputPlayersCheck = section11.querySelector('#show-output-players');
    
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', vizRandomizePlay);
        console.log('[Sandbox] Randomize button listener attached');
    }
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', vizPlayAnimation);
        console.log('[Sandbox] Play/Pause button listener attached');
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', vizResetAnimation);
        console.log('[Sandbox] Reset button listener attached');
    }
    if (frameSlider) {
        frameSlider.addEventListener('input', (e) => {
            vizCurrentFrame = parseInt(e.target.value);
            vizUpdateFrameDisplay();
            vizUpdateVisualization();
        });
        console.log('[Sandbox] Frame slider listener attached');
    }
    if (showTrailsCheck) {
        showTrailsCheck.addEventListener('change', (e) => {
            vizShowTrails = e.target.checked;
            vizUpdateVisualization();
        });
    }
    if (showNamesCheck) {
        showNamesCheck.addEventListener('change', (e) => {
            vizShowNames = e.target.checked;
            vizUpdateVisualization();
        });
    }
    if (showBallTrajectoryCheck) {
        showBallTrajectoryCheck.addEventListener('change', (e) => {
            vizShowBallTrajectory = e.target.checked;
            vizUpdateVisualization();
        });
    }
    if (showOutputPlayersCheck) {
        showOutputPlayersCheck.addEventListener('change', (e) => {
            vizShowOutputPlayers = e.target.checked;
            vizUpdateVisualization();
        });
    }
    console.log('[Sandbox] All event listeners attached');
}

// Attach event listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachSandboxEventListeners);
} else {
    attachSandboxEventListeners();
}

