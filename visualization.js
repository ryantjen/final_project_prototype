// Global variables
let playData = null;
let currentFrame = 1;
let isPlaying = false;
let animationInterval = null;
let svg = null;
let xScale = null;
let yScale = null;
let showTrails = true;
let showNames = true;
let showBallTrajectory = true;
let showOutputPlayers = true;

// NFL Team Colors
const teamColors = {
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
function initializePlayVisualization(data) {
    playData = data;
    
    // Calculate total frames: input frames + output frames
    let maxOutputFrame = 0;
    if (playData.output_players) {
        Object.values(playData.output_players).forEach(player => {
            if (player.frames && player.frames.length > 0) {
                const playerMaxFrame = Math.max(...player.frames.map(f => f.frame_id));
                maxOutputFrame = Math.max(maxOutputFrame, playerMaxFrame);
            }
        });
    }
    // Total frames = input frames (max_frame) + output frames
    playData.total_frames = playData.max_frame + maxOutputFrame;
    
    // Update slider max
    const slider = document.getElementById('frame-slider');
    slider.max = playData.total_frames;
    
    // Reset to frame 1
    currentFrame = 1;
    isPlaying = false;
    clearInterval(animationInterval);
    document.getElementById('play-pause-btn').textContent = 'Play';
    
    // Clear and reinitialize visualization
    d3.select('#visualization').selectAll('*').remove();
    
    initializeVisualization();
    updateFrameDisplay();
    drawField();
    drawFieldAnnotations();
    populateScoreboard();
    populateSupplementaryPanel();
    updatePlayDescription();
    updateTimeToThrow();
    drawCoverageAnnotation();
    updateVisualization();
    
    // Set play direction
    document.getElementById('play-direction').textContent = data.play_direction;
    
    // Update game/play info
    document.querySelector('.info p').innerHTML = 
        `<strong>Game ID:</strong> ${data.game_id} | <strong>Play ID:</strong> ${data.play_id} | <strong>Direction:</strong> <span id="play-direction">${data.play_direction}</span>`;
}

// Load the data - try to load from manifest first, otherwise use default play_data.json
async function loadInitialPlay() {
    try {
        // Try to load from manifest and pick a random play
        const manifestResponse = await fetch('plays_manifest.json');
        if (manifestResponse.ok) {
            const playsManifest = await manifestResponse.json();
            if (playsManifest.length > 0) {
                // Randomly select a play from manifest
                const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
                const data = await d3.json(randomPlay.filename);
                initializePlayVisualization(data);
                return;
            }
        }
    } catch (error) {
        console.log('Manifest not available, using default play_data.json');
    }
    
    // Fallback to default play_data.json
    d3.json('play_data.json').then(data => {
        initializePlayVisualization(data);
    });
}

// Load initial play
loadInitialPlay();

function initializeVisualization() {
    const width = 900;
    const height = 550;
    const margin = { top: 100, right: 20, bottom: 120, left: 20 };
    
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
    xScale = d3.scaleLinear()
        .domain([fieldXMin, fieldXMax])
        .range([margin.left, width - margin.right]);
    
    yScale = d3.scaleLinear()
        .domain([fieldYMin, fieldYMax])
        .range([fieldBottom, fieldTop]);
    
    // Create SVG
    svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create groups for different elements
    svg.append('g').attr('class', 'field');
    svg.append('g').attr('class', 'field-annotations');
    svg.append('g').attr('class', 'trails');
    svg.append('g').attr('class', 'ball-trajectory');
    svg.append('g').attr('class', 'ball');
    svg.append('g').attr('class', 'players');
    svg.append('g').attr('class', 'output-players');
    svg.append('g').attr('class', 'labels');
    svg.append('g').attr('class', 'coverage-arrows');
}

function drawField() {
    const fieldGroup = svg.select('.field');
    
    // Field dimensions
    const xMin = 0;
    const xMax = 120;
    const yMin = 0;
    const yMax = 53.3;
    
    // Draw end zones (0-10 and 110-120 yards) with team colors
    // Determine which team is on which side based on play direction and yardline
    let leftTeam = null;
    let rightTeam = null;
    let leftTeamColor = '#0066CC'; // Default blue
    let rightTeamColor = '#DC143C'; // Default red
    
    if (playData.supplementary) {
        const supp = playData.supplementary;
        // Determine which team is on left (0-10) and right (110-120)
        // Typically, visitor team is on left, home team is on right
        if (supp.visitor_team_abbr) {
            leftTeam = supp.visitor_team_abbr;
            leftTeamColor = teamColors[supp.visitor_team_abbr] || '#0066CC';
        }
        if (supp.home_team_abbr) {
            rightTeam = supp.home_team_abbr;
            rightTeamColor = teamColors[supp.home_team_abbr] || '#DC143C';
        }
    }
    
    // End zone 1 (0-10 yards) - Left team
    const leftEndzone = fieldGroup.append('rect')
        .attr('x', xScale(0))
        .attr('y', yScale(yMax))
        .attr('width', xScale(10) - xScale(0))
        .attr('height', yScale(yMin) - yScale(yMax))
        .attr('fill', leftTeamColor)
        .attr('opacity', 0.3)
        .attr('class', 'endzone-left');
    
    // Add team name label in left endzone
    if (leftTeam) {
        const leftEndzoneCenterX = xScale(5);
        const leftEndzoneCenterY = (yScale(yMin) + yScale(yMax)) / 2;
        fieldGroup.append('text')
            .attr('x', leftEndzoneCenterX)
            .attr('y', leftEndzoneCenterY)
            .attr('class', 'endzone-label')
            .style('font-size', '24px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle')
            .style('opacity', 0.8)
            .text(leftTeam);
    }
    
    // End zone 2 (110-120 yards) - Right team
    const rightEndzone = fieldGroup.append('rect')
        .attr('x', xScale(110))
        .attr('y', yScale(yMax))
        .attr('width', xScale(120) - xScale(110))
        .attr('height', yScale(yMin) - yScale(yMax))
        .attr('fill', rightTeamColor)
        .attr('opacity', 0.3)
        .attr('class', 'endzone-right');
    
    // Add team name label in right endzone
    if (rightTeam) {
        const rightEndzoneCenterX = xScale(115);
        const rightEndzoneCenterY = (yScale(yMin) + yScale(yMax)) / 2;
        fieldGroup.append('text')
            .attr('x', rightEndzoneCenterX)
            .attr('y', rightEndzoneCenterY)
            .attr('class', 'endzone-label')
            .style('font-size', '24px')
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
            .attr('x1', xScale(i))
            .attr('y1', yScale(yMin))
            .attr('x2', xScale(i))
            .attr('y2', yScale(yMax))
            .attr('stroke-width', isGoalLine ? 3 : (isEndZone ? 2 : 1))
            .attr('opacity', isEndZone ? 0.6 : 0.8);
    }
    
    // Draw out-of-bounds lines (sidelines at y=0 and y=53.3)
    fieldGroup.append('line')
        .attr('class', 'out-of-bounds-line')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(yMin))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(yMin))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    fieldGroup.append('line')
        .attr('class', 'out-of-bounds-line')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(yMax))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(yMax))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    // Draw field boundaries (left and right)
    fieldGroup.append('line')
        .attr('class', 'field-boundary')
        .attr('x1', xScale(xMin))
        .attr('y1', yScale(yMin))
        .attr('x2', xScale(xMin))
        .attr('y2', yScale(yMax))
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 4)
        .attr('opacity', 1);
    
    fieldGroup.append('line')
        .attr('class', 'field-boundary')
        .attr('x1', xScale(xMax))
        .attr('y1', yScale(yMin))
        .attr('x2', xScale(xMax))
        .attr('y2', yScale(yMax))
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 4)
        .attr('opacity', 1);
    
    // Draw first down marker
    if (playData.supplementary && playData.supplementary.yardline_number !== null && playData.supplementary.yards_to_go !== null) {
        const yardlineNumber = playData.supplementary.yardline_number;
        const yardsToGo = playData.supplementary.yards_to_go;
        const yardlineSide = playData.supplementary.yardline_side;
        
        // Convert relative yardline to absolute coordinates (0-120)
        // Left endzone is 0-10, right endzone is 110-120
        // If yardline_side matches visitor team or is on left side, use: absolute = 10 + yardline_number
        // If yardline_side matches home team or is on right side, use: absolute = 110 - yardline_number
        let absoluteYardline;
        if (playData.absolute_yardline !== null && playData.absolute_yardline !== undefined) {
            // Use absolute_yardline if available (most reliable)
            absoluteYardline = playData.absolute_yardline;
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
        if (playData.play_direction === 'right') {
            firstDownYardline = absoluteYardline + yardsToGo;
        } else {
            firstDownYardline = absoluteYardline - yardsToGo;
        }
        
        // Ensure first down is within field bounds
        if (firstDownYardline >= 0 && firstDownYardline <= 120) {
            const firstDownX = xScale(firstDownYardline);
            
            // Draw first down marker line
            fieldGroup.append('line')
                .attr('class', 'first-down-marker')
                .attr('x1', firstDownX)
                .attr('y1', yScale(yMin))
                .attr('x2', firstDownX)
                .attr('y2', yScale(yMax))
                .attr('stroke', '#FFD700')
                .attr('stroke-width', 4)
                .attr('opacity', 0.9)
                .attr('stroke-dasharray', '15,5');
            
            // Add first down label
            fieldGroup.append('text')
                .attr('x', firstDownX)
                .attr('y', yScale(yMax) + 15)
                .attr('class', 'field-number')
                .style('font-size', '12px')
                .style('fill', '#FFD700')
                .style('font-weight', 'bold')
                .text('1st');
        }
    }
    
    // Draw field annotations
    drawFieldAnnotations();
}

function drawFieldAnnotations() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
    const annotationsGroup = svg.select('.field-annotations');
    
    // Get field dimensions (must match initializeVisualization)
    const width = 900;
    const height = 650;
    const margin = { top: 60, right: 20, bottom: 120, left: 20 };
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
        if (playData.absolute_yardline !== null && playData.absolute_yardline !== undefined) {
            absoluteYardline = playData.absolute_yardline;
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
        
        const yardlineX = xScale(absoluteYardline);
        
        // Draw line of scrimmage line
        const fieldGroup = svg.select('.field');
        fieldGroup.append('line')
            .attr('class', 'line-of-scrimmage')
            .attr('x1', yardlineX)
            .attr('y1', yScale(yMin))
            .attr('x2', yardlineX)
            .attr('y2', yScale(yMax))
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
            .style('font-size', '16px')
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
            .style('font-size', '16px')
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
        const visitorColor = teamColors[supp.visitor_team_abbr] || '#2a2a2a';
        
        // Create temporary text element to measure width and height
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '18px')
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
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .text(visitorText);
    }
    
    if (supp.home_team_abbr) {
        const homeText = supp.home_team_abbr;
        const homeColor = teamColors[supp.home_team_abbr] || '#2a2a2a';
        
        // Create temporary text element to measure width and height
        const tempText = annotationsGroup.append('text')
            .attr('class', 'temp-measure')
            .style('font-size', '18px')
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
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', 'white')
            .style('text-anchor', 'end')
            .text(homeText);
    }
    
    // Add down & distance aligned with line of scrimmage
    if (supp.down !== null && supp.yards_to_go !== null && supp.yardline_side && supp.yardline_number !== null) {
        // Calculate yardline position to align with
        let absoluteYardline;
        if (playData.absolute_yardline !== null && playData.absolute_yardline !== undefined) {
            absoluteYardline = playData.absolute_yardline;
        } else {
            const yardlineNumber = supp.yardline_number;
            if (yardlineNumber < 50) {
                absoluteYardline = 10 + yardlineNumber;
            } else {
                absoluteYardline = 110 - yardlineNumber;
            }
        }
        const alignX = xScale(absoluteYardline);
        
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
            .style('font-size', '18px')
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
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', '#0d0a1f')
            .style('text-anchor', 'middle')
            .text(downDistanceText);
    }

}

function populateScoreboard() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
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
        const visitorColor = teamColors[supp.visitor_team_abbr] || '#2a2a2a';
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
        const homeColor = teamColors[supp.home_team_abbr] || '#2a2a2a';
        // Apply team color as background
        rightSection.style('background', homeColor);
        rightSection.append('div').attr('class', 'scoreboard-score').text(homeScore);
        rightSection.append('div').attr('class', 'scoreboard-team-name').text(supp.home_team_abbr);
    }
}

function populateSupplementaryPanel() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
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

function updatePlayDescription() {
    if (!playData.supplementary || !playData.supplementary.play_description) return;
    
    const descDiv = d3.select('#play-description');
    descDiv.html(`<strong>Play Description:</strong> ${playData.supplementary.play_description}`);
}

// Calculate ball position along parabolic trajectory
function calculateBallPosition(frame) {
    if (frame < playData.throw_frame) {
        // Ball hasn't been thrown yet
        return {
            x: playData.ball_throw_x,
            y: playData.ball_throw_y,
            visible: false
        };
    }
    
    // Calculate flight time - ball travels from throw to landing
    // Since input data is "before throw" and output is "after throw",
    // the throw happens at the last input frame (throw_frame = max_frame)
    // The ball trajectory should complete at the very last frame to match when player catches
    const throwFrame = playData.throw_frame;
    const landingFrame = playData.total_frames || playData.max_frame; // Finish at last frame
    
    if (frame >= landingFrame) {
        // Ball has landed
        return {
            x: playData.ball_land_x,
            y: playData.ball_land_y,
            visible: true
        };
    }
    
    // Calculate progress along trajectory (0 to 1)
    const currentFlightFrame = frame - throwFrame;
    const flightFrames = landingFrame - throwFrame; // Total frames for ball to travel
    const progress = Math.min(Math.max(currentFlightFrame / flightFrames, 0), 1);
    
    // Straight line trajectory from throw point to landing point
    const startX = playData.ball_throw_x;
    const startY = playData.ball_throw_y;
    const endX = playData.ball_land_x;
    const endY = playData.ball_land_y;
    
    // Simple linear interpolation (straight line)
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    
    return {
        x: x,
        y: y,
        visible: true
    };
}

function updateTimeToThrow() {
    if (!playData) return;
    
    // Calculate time to throw (assuming 10 frames per second, so each frame is 0.1 seconds)
    const framesPerSecond = 10;
    const timePerFrame = 1 / framesPerSecond;
    
    // Time stops at throw_frame (when switching from input to output)
    const effectiveFrame = Math.min(currentFrame, playData.throw_frame);
    const timeToThrow = (effectiveFrame - 1) * timePerFrame; // -1 because frame starts at 1
    
    const timeDisplay = d3.select('#time-to-throw');
    timeDisplay.text(`Time to Throw: ${timeToThrow.toFixed(1)}s`);
}

function drawCoverageAnnotation() {
    if (!playData || !playData.supplementary) {
        const coverageDisplay = d3.select('#coverage-annotation');
        coverageDisplay.text('');
        return;
    }
    
    const supp = playData.supplementary;
    let coverageType = supp.team_coverage_type || supp.team_coverage_man_zone || 'Unknown';
    
    // Format coverage text: COVER_X_ZONE -> Cover X Zone
    coverageType = coverageType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Always update coverage text display (stays visible throughout)
    const coverageDisplay = d3.select('#coverage-annotation');
    coverageDisplay.text(`Coverage: ${coverageType}`);
    
    // Only draw arrows on frame 1
    const coverageGroup = svg.select('.coverage-arrows');
    if (currentFrame === 1) {
        coverageGroup.selectAll('*').remove();
        
        // Get the actual position of the coverage annotation element
        const coverageElement = document.getElementById('coverage-annotation');
        const svgElement = document.getElementById('visualization');
        
        if (coverageElement && svgElement) {
            const coverageRect = coverageElement.getBoundingClientRect();
            const svgRect = svgElement.getBoundingClientRect();
            
            // Calculate the center X and bottom Y of the coverage annotation
            // relative to the SVG
            const annotationX = (coverageRect.left + coverageRect.width / 2) - svgRect.left;
            const annotationY = (coverageRect.bottom) - svgRect.top;
            
            // Draw arrows to each defensive player only
            Object.entries(playData.players).forEach(([nflId, player]) => {
                // Only show arrows for defensive players
                if (player.side !== 'Defense') return;
                
                const frame1 = player.frames.find(f => f.frame_id === 1);
                if (!frame1) return;
                
                const playerX = xScale(frame1.x);
                const playerY = yScale(frame1.y);
                
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
        const defs = svg.select('defs');
        if (defs.empty()) {
            svg.append('defs');
        }
        
        if (svg.select('defs').select('#arrowhead-red').empty()) {
            svg.select('defs').append('marker')
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

function updateVisualization() {
    if (!playData || !svg) return;
    
    const playersGroup = svg.select('.players');
    const outputPlayersGroup = svg.select('.output-players');
    const trailsGroup = svg.select('.trails');
    const ballTrajectoryGroup = svg.select('.ball-trajectory');
    const ballGroup = svg.select('.ball');
    const labelsGroup = svg.select('.labels');
    
    // Clear previous frame
    playersGroup.selectAll('*').remove();
    outputPlayersGroup.selectAll('*').remove();
    labelsGroup.selectAll('*').remove();
    ballGroup.selectAll('*').remove();
    
    // Draw coverage annotation (only on frame 1)
    drawCoverageAnnotation();
    
    if (!showTrails) {
        trailsGroup.selectAll('*').remove();
        ballTrajectoryGroup.selectAll('*').remove();
    }
    
    // Draw trails if enabled
    if (showTrails) {
        trailsGroup.selectAll('*').remove();
        
        Object.entries(playData.players).forEach(([nflId, player]) => {
            const frames = player.frames.filter(f => f.frame_id <= currentFrame);
            
            if (frames.length < 2) return;
            
            const line = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
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
        if (playData.output_players && currentFrame > playData.throw_frame) {
            Object.entries(playData.output_players).forEach(([nflId, outputPlayer]) => {
                // Map visualization frames to output frames
                const startOutputFrame = 1;
                const endOutputFrame = Math.min(currentFrame - playData.throw_frame, Math.max(...outputPlayer.frames.map(f => f.frame_id)));
                
                const outputFrames = outputPlayer.frames.filter(f => f.frame_id >= startOutputFrame && f.frame_id <= endOutputFrame);
                
                if (outputFrames.length < 2) return;
                
                const line = d3.line()
                    .x(d => xScale(d.x))
                    .y(d => yScale(d.y))
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
        if (showBallTrajectory && currentFrame >= playData.throw_frame) {
            ballTrajectoryGroup.selectAll('*').remove();
            
            const trajectoryPoints = [];
            // Calculate trajectory up to current frame, including beyond max_frame if needed
            const maxTrajectoryFrame = Math.min(currentFrame, playData.throw_frame + 10); // Allow up to 10 frames for trajectory
            for (let f = playData.throw_frame; f <= maxTrajectoryFrame; f++) {
                const ballPos = calculateBallPosition(f);
                if (ballPos.visible) {
                    trajectoryPoints.push({ x: ballPos.x, y: ballPos.y });
                }
            }
            
            if (trajectoryPoints.length >= 2) {
                const line = d3.line()
                    .x(d => xScale(d.x))
                    .y(d => yScale(d.y))
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
    const ballPos = calculateBallPosition(currentFrame);
    if (ballPos.visible || currentFrame >= playData.throw_frame) {
        const ballX = xScale(ballPos.x);
        const ballY = yScale(ballPos.y);
        
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
        const lastFrame = playData.total_frames || playData.max_frame;
        if (currentFrame === lastFrame && playData.supplementary && playData.supplementary.pass_result) {
            const passResult = playData.supplementary.pass_result.toUpperCase();
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
    Object.entries(playData.players).forEach(([nflId, player]) => {
        let frame = player.frames.find(f => f.frame_id === currentFrame);
        let isOutputPlayer = false;
        
        // If player not in current input frame and we're past throw_frame,
        // check if they're in output data
        if (!frame && currentFrame > playData.throw_frame && playData.output_players && playData.output_players[nflId]) {
            const outputPlayer = playData.output_players[nflId];
            const outputFrame = currentFrame - playData.throw_frame;
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
        if (!frame && currentFrame > playData.throw_frame) {
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
        const x = xScale(frame.x);
        const y = yScale(frame.y);
        
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
        if (showNames) {
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
    if (showOutputPlayers && playData.output_players && currentFrame > playData.throw_frame) {
        // Map visualization frame to output frame
        const outputFrame = currentFrame - playData.throw_frame;
        
        // Calculate max output frame
        let maxOutputFrame = 0;
        if (playData.output_players) {
            Object.values(playData.output_players).forEach(player => {
                if (player.frames && player.frames.length > 0) {
                    const playerMaxFrame = Math.max(...player.frames.map(f => f.frame_id));
                    maxOutputFrame = Math.max(maxOutputFrame, playerMaxFrame);
                }
            });
        }
        
        // Only show if outputFrame is within valid range (1 to max output frame)
        if (outputFrame >= 1 && outputFrame <= maxOutputFrame) {
            Object.entries(playData.output_players).forEach(([nflId, outputPlayer]) => {
                // Skip players that are in input data (they're already drawn above)
                if (playData.players[nflId]) {
                    return;
                }
                
                const frame = outputPlayer.frames.find(f => f.frame_id === outputFrame);
                if (!frame) return;
                
                const x = xScale(frame.x);
                const y = yScale(frame.y);
                
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
                if (showNames) {
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

function updateFrameDisplay() {
    const maxFrame = playData.total_frames || playData.max_frame;
    document.getElementById('frame-display').textContent = 
        `Frame: ${currentFrame} / ${maxFrame}`;
    document.getElementById('frame-slider').value = currentFrame;
    updateTimeToThrow();
}

function playAnimation() {
    if (isPlaying) {
        clearInterval(animationInterval);
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = 'Play';
    } else {
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = 'Pause';
        
        animationInterval = setInterval(() => {
            const maxFrame = playData.total_frames || playData.max_frame;
            if (currentFrame >= maxFrame) {
                // Stop at last frame instead of looping
                clearInterval(animationInterval);
                isPlaying = false;
                document.getElementById('play-pause-btn').textContent = 'Play';
                // Ensure last frame is displayed
                updateFrameDisplay();
                drawCoverageAnnotation();
                updateVisualization();
            } else {
                currentFrame++;
                updateFrameDisplay();
                drawCoverageAnnotation();
                updateVisualization();
            }
        }, 200); // 200ms per frame
    }
}

function resetAnimation() {
    currentFrame = 1;
    isPlaying = false;
    clearInterval(animationInterval);
    document.getElementById('play-pause-btn').textContent = 'Play';
    updateFrameDisplay();
    updateVisualization();
}

// Event listeners
// Function to randomize play
async function randomizePlay() {
    try {
        // Load available plays from manifest
        const response = await fetch('plays_manifest.json');
        const playsManifest = await response.json();
        
        if (playsManifest.length === 0) {
            alert('No available plays found');
            return;
        }
        
        // Randomly select a play
        const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
        
        // Update button to show loading
        const btn = document.getElementById('randomize-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;
        
        // Load the selected play's JSON file
        const data = await d3.json(randomPlay.filename);
        initializePlayVisualization(data);
        
        btn.textContent = originalText;
        btn.disabled = false;
    } catch (error) {
        console.error('Error randomizing play:', error);
        alert('Error loading random play. Please try again.');
        document.getElementById('randomize-btn').textContent = 'Randomize Play';
        document.getElementById('randomize-btn').disabled = false;
    }
}

document.getElementById('randomize-btn').addEventListener('click', randomizePlay);
document.getElementById('play-pause-btn').addEventListener('click', playAnimation);
document.getElementById('reset-btn').addEventListener('click', resetAnimation);

document.getElementById('frame-slider').addEventListener('input', (e) => {
    currentFrame = parseInt(e.target.value);
    updateFrameDisplay();
    updateVisualization();
});

document.getElementById('show-trails').addEventListener('change', (e) => {
    showTrails = e.target.checked;
    updateVisualization();
});

document.getElementById('show-names').addEventListener('change', (e) => {
    showNames = e.target.checked;
    updateVisualization();
});

document.getElementById('show-ball-trajectory').addEventListener('change', (e) => {
    showBallTrajectory = e.target.checked;
    updateVisualization();
});

document.getElementById('show-output-players').addEventListener('change', (e) => {
    showOutputPlayers = e.target.checked;
    updateVisualization();
});

