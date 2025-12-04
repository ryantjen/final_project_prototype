// QB Mode - Global variables
let playData = null;
let currentFrame = 1;
let isPlaying = false;
let animationInterval = null;
let svg = null;
let xScale = null;
let yScale = null;
let showTrails = true;
let showNames = true;

// QB Mode specific variables
let selectedReceiver = null;
let correctReceiver = null;
let hasSubmittedAnswer = false;
let isPausedForSelection = false;
let correctCount = 0;
let totalCount = 0;
let selectionStartTime = null;
let decisionTimes = [];
let stopwatchInterval = null;

// NFL Week 1 averages (from analysis)
const NFL_AVERAGES = {
    optimalDecisionPercentage: 46.98, // Overall optimal decision percentage
    avgTimeToThrow: 2.66 // Average time to throw for optimal decisions (since plays are filtered to optimal)
};

// NFL Team Colors
const teamColors = {
    'ARI': '#97233F', 'ATL': '#A71930', 'BAL': '#241773', 'BUF': '#00338D',
    'CAR': '#0085CA', 'CHI': '#0B162A', 'CIN': '#FB4F14', 'CLE': '#311D00',
    'DAL': '#003594', 'DEN': '#FB4F14', 'DET': '#0076B6', 'GB': '#203731',
    'HOU': '#03202F', 'IND': '#002C5F', 'JAX': '#006778', 'KC': '#E31837',
    'LV': '#000000', 'LAC': '#0080C6', 'LAR': '#003594', 'MIA': '#008E97',
    'MIN': '#4F2683', 'NE': '#002244', 'NO': '#D3BC8D', 'NYG': '#0B2265',
    'NYJ': '#125740', 'PHI': '#004C54', 'PIT': '#FFB612', 'SF': '#AA0000',
    'SEA': '#002244', 'TB': '#D50A0A', 'TEN': '#0C2340', 'WAS': '#5A1414',
    'LA': '#003594' // Add LA (Rams)
};

// Function to find the targeted receiver from play data
function findTargetedReceiver(data) {
    // The ball lands at ball_land_x, ball_land_y
    // We need to find the receiver closest to that position in the output frames
    const landX = data.ball_land_x;
    const landY = data.ball_land_y;
    
    let closestPlayer = null;
    let closestDistance = Infinity;
    
    // Check output_players for the target
    if (data.output_players) {
        Object.entries(data.output_players).forEach(([nflId, outputPlayer]) => {
            // Get the last output frame position
            if (outputPlayer.frames && outputPlayer.frames.length > 0) {
                const lastFrame = outputPlayer.frames[outputPlayer.frames.length - 1];
                const distance = Math.sqrt(
                    Math.pow(lastFrame.x - landX, 2) + 
                    Math.pow(lastFrame.y - landY, 2)
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPlayer = {
                        nflId: nflId,
                        name: data.players[nflId]?.name || `Player ${nflId}`,
                        position: data.players[nflId]?.position || 'Unknown'
                    };
                }
            }
        });
    }
    
    // If no output player found, try to parse from play description
    if (!closestPlayer && data.supplementary && data.supplementary.play_description) {
        const desc = data.supplementary.play_description;
        // Look for "pass ... to [Name]" pattern
        const passMatch = desc.match(/pass.*?to\s+([A-Z]\.[A-Za-z]+)/);
        if (passMatch) {
            const targetName = passMatch[1];
            // Find player with matching name
            Object.entries(data.players).forEach(([nflId, player]) => {
                if (player.side === 'Offense') {
                    const initials = player.name.split(' ').map(n => n[0]).join('.');
                    const lastName = player.name.split(' ').pop();
                    if (targetName.includes(lastName) || targetName === `${initials[0]}.${lastName}`) {
                        closestPlayer = {
                            nflId: nflId,
                            name: player.name,
                            position: player.position
                        };
                    }
                }
            });
        }
    }
    
    return closestPlayer;
}

// Function to get eligible receivers (offensive players except QB)
function getEligibleReceivers(data) {
    const receivers = [];
    Object.entries(data.players).forEach(([nflId, player]) => {
        if (player.side === 'Offense' && player.position !== 'QB') {
            receivers.push({
                nflId: nflId,
                name: player.name,
                position: player.position
            });
        }
    });
    return receivers;
}

// Initialize visualization with data
function initializePlayVisualization(data) {
    // Safety check - ensure QB visualization element exists
    const vizElement = document.getElementById('qb-visualization');
    if (!vizElement) {
        console.error('QB visualization element not found');
        return;
    }
    
    playData = data;
    
    // Reset QB mode state
    selectedReceiver = null;
    hasSubmittedAnswer = false;
    isPausedForSelection = false;
    selectionStartTime = null;
    
    // Stop and reset stopwatch
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    const stopwatchEl = document.getElementById('qb-stopwatch');
    if (stopwatchEl) {
        stopwatchEl.style.display = 'none';
        stopwatchEl.textContent = '0.0s';
    }
    
    // Reset decision times for this play (but keep overall stats)
    // Note: decisionTimes array persists across plays for overall average
    
    // Find the correct receiver
    correctReceiver = findTargetedReceiver(data);
    
    // Calculate total frames
    let maxOutputFrame = 0;
    if (playData.output_players) {
        Object.values(playData.output_players).forEach(player => {
            if (player.frames && player.frames.length > 0) {
                const playerMaxFrame = Math.max(...player.frames.map(f => f.frame_id));
                maxOutputFrame = Math.max(maxOutputFrame, playerMaxFrame);
            }
        });
    }
    playData.total_frames = playData.max_frame + maxOutputFrame;
    
    // Update slider max
    const slider = document.getElementById('qb-frame-slider');
    if (slider) {
        slider.max = playData.total_frames;
    }
    
    // Reset to frame 1
    currentFrame = 1;
    isPlaying = false;
    clearInterval(animationInterval);
    const playPauseBtn = document.getElementById('qb-play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.textContent = 'Play';
    }
    
    // Clear and reinitialize visualization
    d3.select('#qb-visualization').selectAll('*').remove();
    
    initializeVisualization();
    updateFrameDisplay();
    drawField();
    drawFieldAnnotations();
    populateScoreboard();
    populateSupplementaryPanel();
    updateTimeToThrow();
    drawCoverageAnnotation();
    updateVisualization();
    
    // Hide receiver selection and result panel
    const receiverSelection = document.getElementById('qb-receiver-selection');
    if (receiverSelection) receiverSelection.classList.remove('active');
    const resultPanel = document.getElementById('qb-result-panel');
    if (resultPanel) resultPanel.classList.remove('show', 'correct', 'incorrect');
    const instructionText = document.getElementById('qb-instruction-text');
    if (instructionText) instructionText.classList.remove('hidden');
    
    // Update game/play info
    const gameIdEl = document.getElementById('qb-game-id');
    if (gameIdEl) gameIdEl.textContent = data.game_id;
    const playIdEl = document.getElementById('qb-play-id');
    if (playIdEl) playIdEl.textContent = data.play_id;
    const playDirectionEl = document.getElementById('qb-play-direction');
    if (playDirectionEl) playDirectionEl.textContent = data.play_direction;
}

// Load initial play from QB mode manifest
async function loadInitialPlay() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadInitialPlay);
        return;
    }
    
    // Check if QB visualization element exists
    const vizElement = document.getElementById('qb-visualization');
    if (!vizElement) {
        console.error('QB visualization element not found');
        return;
    }
    
    try {
        const manifestResponse = await fetch('qb_mode_plays_manifest.json');
        if (!manifestResponse.ok) {
            throw new Error(`HTTP error! status: ${manifestResponse.status}`);
        }
        
        const playsManifest = await manifestResponse.json();
        console.log('Loaded QB manifest with', playsManifest.length, 'plays');
        
        if (!playsManifest || playsManifest.length === 0) {
            throw new Error('Manifest is empty or invalid');
        }
        
        const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
        console.log('Loading play:', randomPlay.filename);
        
        const data = await d3.json(randomPlay.filename);
        if (!data) {
            throw new Error('Failed to load play data');
        }
        
        console.log('Play data loaded successfully');
        initializePlayVisualization(data);
        return;
    } catch (error) {
        console.error('Error loading QB mode plays:', error);
        // Update the loading text to show error
        const coverageEl = document.getElementById('qb-coverage-annotation');
        if (coverageEl) {
            coverageEl.textContent = `Error: ${error.message || 'Failed to load plays'}`;
        }
        return;
    }
    
    // No fallback - QB mode should only use qb_mode_plays_manifest.json
    console.log('QB mode plays manifest not available');
    const coverageEl = document.getElementById('qb-coverage-annotation');
    if (coverageEl) {
        coverageEl.textContent = 'No plays available';
    }
}

// Only load if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInitialPlay);
} else {
    loadInitialPlay();
}

function initializeVisualization() {
    // Rotated view: QB at top, end zone at bottom
    // Field width (53.3 yards) becomes horizontal, field length becomes vertical
    const width = 700;
    const margin = { top: 15, right: 15, bottom: 15, left: 15 };
    
    // Zoom range for red zone
    const zoomRange = 40; // Show 40 yards
    
    // Determine which end zone we're going toward
    let fieldLengthMin, fieldLengthMax;
    if (playData && playData.play_direction === 'right') {
        // End zone is at x = 110-120, QB starts further back
        fieldLengthMax = 120;
        fieldLengthMin = 120 - zoomRange;
    } else if (playData && playData.play_direction === 'left') {
        // End zone is at x = 0-10
        fieldLengthMin = 0;
        fieldLengthMax = zoomRange;
    } else {
        fieldLengthMin = 80;
        fieldLengthMax = 120;
    }
    
    const fieldWidthMin = 0;
    const fieldWidthMax = 53.3;
    
    // Calculate dimensions - field width (53.3) maps to screen width
    const screenFieldWidth = width - margin.left - margin.right;
    const yardsShown = fieldLengthMax - fieldLengthMin;
    const aspectRatio = yardsShown / 53.3;
    const screenFieldHeight = screenFieldWidth * aspectRatio;
    const height = screenFieldHeight + margin.top + margin.bottom;
    
    // xScale: field width (0-53.3) maps to screen width
    xScale = d3.scaleLinear()
        .domain([fieldWidthMin, fieldWidthMax])
        .range([margin.left, width - margin.right]);
    
    // yScale: field length maps to screen height
    // If going right: higher x values (end zone) should be at bottom
    // If going left: lower x values (end zone) should be at bottom
    if (playData && playData.play_direction === 'right') {
        yScale = d3.scaleLinear()
            .domain([fieldLengthMin, fieldLengthMax])
            .range([margin.top, height - margin.bottom]);
    } else {
        yScale = d3.scaleLinear()
            .domain([fieldLengthMax, fieldLengthMin])
            .range([margin.top, height - margin.bottom]);
    }
    
    // Store zoom info for other functions
    playData.zoomFieldMin = fieldLengthMin;
    playData.zoomFieldMax = fieldLengthMax;
    
    svg = d3.select('#qb-visualization')
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
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
    
    // Rotated view: field width (0-53.3) is horizontal, field length is vertical
    const fieldWidthMin = 0;
    const fieldWidthMax = 53.3;
    // Use !== undefined check because 0 is a valid value (but falsy)
    const fieldLengthMin = playData.zoomFieldMin !== undefined ? playData.zoomFieldMin : 80;
    const fieldLengthMax = playData.zoomFieldMax !== undefined ? playData.zoomFieldMax : 120;
    
    // Green grass background
    const x1 = xScale(fieldWidthMin);
    const x2 = xScale(fieldWidthMax);
    const y1 = yScale(fieldLengthMin);
    const y2 = yScale(fieldLengthMax);
    
    fieldGroup.append('rect')
        .attr('x', Math.min(x1, x2))
        .attr('y', Math.min(y1, y2))
        .attr('width', Math.abs(x2 - x1))
        .attr('height', Math.abs(y2 - y1))
        .attr('fill', '#90EE90');
    
    // Get team colors for end zone
    let endZoneTeam = null;
    let endZoneColor = '#0066CC';
    
    if (playData.supplementary) {
        const supp = playData.supplementary;
        // The defensive team's end zone is where we're trying to score
        if (supp.defensive_team) {
            endZoneTeam = supp.defensive_team;
            endZoneColor = teamColors[supp.defensive_team] || '#0066CC';
        }
    }
    
    // Draw end zone at bottom (where we're scoring)
    // End zone is 10 yards: either 0-10 or 110-120
    const endZoneStart = playData.play_direction === 'right' ? 110 : 0;
    const endZoneEnd = playData.play_direction === 'right' ? 120 : 10;
    
    if (endZoneStart >= fieldLengthMin && endZoneStart <= fieldLengthMax) {
        const ezY1 = yScale(endZoneStart);
        const ezY2 = yScale(endZoneEnd);
        
        fieldGroup.append('rect')
            .attr('x', xScale(fieldWidthMin))
            .attr('y', Math.min(ezY1, ezY2))
            .attr('width', xScale(fieldWidthMax) - xScale(fieldWidthMin))
            .attr('height', Math.abs(ezY2 - ezY1))
            .attr('fill', endZoneColor)
            .attr('opacity', 0.4);
        
        // End zone team name
        if (endZoneTeam) {
            fieldGroup.append('text')
                .attr('x', xScale(fieldWidthMax / 2))
                .attr('y', (ezY1 + ezY2) / 2)
                .style('font-size', '28px')
                .style('font-weight', 'bold')
                .style('fill', 'white')
                .style('text-anchor', 'middle')
                .style('dominant-baseline', 'middle')
                .style('opacity', 0.9)
                .text(endZoneTeam);
        }
    }
    
    // Yard lines (now horizontal) - every 10 yards
    for (let yardLine = 0; yardLine <= 120; yardLine += 10) {
        if (yardLine < fieldLengthMin || yardLine > fieldLengthMax) continue;
        
        const isGoalLine = (yardLine === 10 || yardLine === 110);
        const isEndZoneLine = (yardLine === 0 || yardLine === 120);
        
        fieldGroup.append('line')
            .attr('x1', xScale(fieldWidthMin))
            .attr('y1', yScale(yardLine))
            .attr('x2', xScale(fieldWidthMax))
            .attr('y2', yScale(yardLine))
            .attr('stroke', 'white')
            .attr('stroke-width', isGoalLine ? 3 : (isEndZoneLine ? 2 : 1))
            .attr('opacity', 0.8);
    }
    
    // 5-yard lines
    for (let yardLine = 5; yardLine <= 115; yardLine += 10) {
        if (yardLine < fieldLengthMin || yardLine > fieldLengthMax) continue;
        if (yardLine <= 10 || yardLine >= 110) continue;
        
        fieldGroup.append('line')
            .attr('x1', xScale(fieldWidthMin))
            .attr('y1', yScale(yardLine))
            .attr('x2', xScale(fieldWidthMax))
            .attr('y2', yScale(yardLine))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.5);
    }
    
    // Sidelines (now vertical - left and right edges)
    fieldGroup.append('line')
        .attr('x1', xScale(fieldWidthMin))
        .attr('y1', yScale(fieldLengthMin))
        .attr('x2', xScale(fieldWidthMin))
        .attr('y2', yScale(fieldLengthMax))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    fieldGroup.append('line')
        .attr('x1', xScale(fieldWidthMax))
        .attr('y1', yScale(fieldLengthMin))
        .attr('x2', xScale(fieldWidthMax))
        .attr('y2', yScale(fieldLengthMax))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    // First down marker (now horizontal line)
    if (playData.supplementary && playData.supplementary.yardline_number !== null && playData.supplementary.yards_to_go !== null) {
        const yardsToGo = playData.supplementary.yards_to_go;
        
        let absoluteYardline;
        if (playData.absolute_yardline !== null && playData.absolute_yardline !== undefined) {
            absoluteYardline = playData.absolute_yardline;
        } else {
            const yardlineNumber = playData.supplementary.yardline_number;
            if (yardlineNumber < 50) {
                absoluteYardline = 10 + yardlineNumber;
            } else {
                absoluteYardline = 110 - yardlineNumber;
            }
        }
        
        let firstDownYardline;
        if (playData.play_direction === 'right') {
            firstDownYardline = absoluteYardline + yardsToGo;
        } else {
            firstDownYardline = absoluteYardline - yardsToGo;
        }
        
        if (firstDownYardline >= fieldLengthMin && firstDownYardline <= fieldLengthMax) {
            fieldGroup.append('line')
                .attr('x1', xScale(fieldWidthMin))
                .attr('y1', yScale(firstDownYardline))
                .attr('x2', xScale(fieldWidthMax))
                .attr('y2', yScale(firstDownYardline))
                .attr('stroke', '#FFD700')
                .attr('stroke-width', 4)
                .attr('opacity', 0.9)
                .attr('stroke-dasharray', '15,5');
        }
    }
    
    drawFieldAnnotations();
}

function drawFieldAnnotations() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
    const fieldGroup = svg.select('.field');
    
    const fieldWidthMin = 0;
    const fieldWidthMax = 53.3;
    
    // Line of scrimmage (green dashed line - now horizontal in rotated view)
    if (supp.yardline_side && supp.yardline_number !== null) {
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
        
        // In rotated view, yardline maps to y-coordinate
        const yardlineY = yScale(absoluteYardline);
        
        fieldGroup.append('line')
            .attr('x1', xScale(fieldWidthMin))
            .attr('y1', yardlineY)
            .attr('x2', xScale(fieldWidthMax))
            .attr('y2', yardlineY)
            .attr('stroke', '#00FF00')
            .attr('stroke-width', 3)
            .attr('opacity', 0.8)
            .attr('stroke-dasharray', '10,5');
    }
}

function populateScoreboard() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
    
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    // Visitor team
    if (supp.visitor_team_abbr) {
        const visitorScore = supp.pre_snap_visitor_score !== null ? supp.pre_snap_visitor_score : 0;
        const visitorColor = teamColors[supp.visitor_team_abbr] || '#2a2a2a';
        document.getElementById('qb-visitor-name').textContent = supp.visitor_team_abbr;
        document.getElementById('qb-visitor-score').textContent = visitorScore;
        document.getElementById('qb-visitor-section').style.background = visitorColor;
    }
    
    // Home team
    if (supp.home_team_abbr) {
        const homeScore = supp.pre_snap_home_score !== null ? supp.pre_snap_home_score : 0;
        const homeColor = teamColors[supp.home_team_abbr] || '#2a2a2a';
        document.getElementById('qb-home-name').textContent = supp.home_team_abbr;
        document.getElementById('qb-home-score').textContent = homeScore;
        document.getElementById('qb-home-section').style.background = homeColor;
    }
    
    // Down & Distance
    if (supp.down !== null && supp.yards_to_go !== null) {
        document.getElementById('qb-down-distance').textContent = `${getOrdinal(supp.down)} & ${supp.yards_to_go}`;
    }
    
    // Quarter and Clock
    let quarterClock = '';
    if (supp.quarter !== null) {
        quarterClock += `Q${supp.quarter}`;
    }
    if (supp.game_clock) {
        quarterClock += ` ${supp.game_clock}`;
    }
    document.getElementById('qb-quarter-clock').textContent = quarterClock;
    
    // Yardline info
    if (supp.yardline_side && supp.yardline_number !== null) {
        document.getElementById('qb-yardline-info').textContent = `Ball on ${supp.yardline_side} ${supp.yardline_number}`;
    }
}

function populateSupplementaryPanel() {
    if (!playData.supplementary) return;
    
    const supp = playData.supplementary;
    const panel = d3.select('#supplementary-panel');
    
    // Skip if panel doesn't exist (QB mode doesn't have this panel)
    if (panel.empty()) return;
    
    panel.html('');
    
    panel.append('h2').text('Play Information');
    
    // Play Situation
    const playSituation = panel.append('div').attr('class', 'info-section');
    playSituation.append('h3').text('Play Situation');
    if (supp.down !== null) {
        playSituation.append('p').html(`<strong>Down:</strong> <span class="value">${supp.down}</span>`);
    }
    if (supp.yards_to_go !== null) {
        playSituation.append('p').html(`<strong>Yards to Go:</strong> <span class="value">${supp.yards_to_go}</span>`);
    }
    if (supp.yardline_side && supp.yardline_number !== null) {
        playSituation.append('p').html(`<strong>Yardline:</strong> <span class="value">${supp.yardline_side} ${supp.yardline_number}</span>`);
    }
    
    // Red Zone indicator
    const isRedZone = supp.yardline_side === supp.defensive_team && supp.yardline_number <= 20;
    if (isRedZone) {
        playSituation.append('p').html(`<strong style="color: #FF6B6B;">🔴 RED ZONE</strong>`);
    }
    
    // Play Details (hide pass result until answer is submitted)
    const playDetails = panel.append('div').attr('class', 'info-section');
    playDetails.append('h3').text('Play Details');
    if (supp.offense_formation) {
        playDetails.append('p').html(`<strong>Formation:</strong> <span class="value">${supp.offense_formation}</span>`);
    }
    if (supp.team_coverage_type) {
        const coverageType = supp.team_coverage_type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        playDetails.append('p').html(`<strong>Coverage:</strong> <span class="value">${coverageType}</span>`);
    }
    if (supp.defenders_in_the_box !== null) {
        playDetails.append('p').html(`<strong>Defenders in Box:</strong> <span class="value">${supp.defenders_in_the_box}</span>`);
    }
}

function updateTimeToThrow() {
    if (!playData) return;
    
    const framesPerSecond = 10;
    const timePerFrame = 1 / framesPerSecond;
    const effectiveFrame = Math.min(currentFrame, playData.throw_frame);
    const timeToThrow = (effectiveFrame - 1) * timePerFrame;
    
    const timeDisplay = d3.select('#qb-time-to-throw');
    timeDisplay.text(`Time to Throw: ${timeToThrow.toFixed(1)}s`);
}

function drawCoverageAnnotation() {
    if (!playData || !playData.supplementary) {
        d3.select('#qb-coverage-annotation').text('Unknown');
        const explEl = document.getElementById('qb-coverage-explanation');
        if (explEl) explEl.textContent = 'Watch the defense to identify their coverage scheme.';
        return;
    }
    
    const supp = playData.supplementary;
    let coverageType = supp.team_coverage_type || supp.team_coverage_man_zone || 'Unknown';
    
    // Format coverage text: COVER_X_ZONE -> Cover X Zone
    const formattedCoverage = coverageType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    d3.select('#qb-coverage-annotation').text(formattedCoverage);
    
    // Coverage explanations
    const coverageExplanations = {
        'COVER_0': 'No deep safety help. All defenders in man coverage. High risk, high reward for the offense - look for quick throws.',
        'COVER_1': 'Single high safety with man coverage underneath. Look for receivers who can beat their man, especially on crossers.',
        'COVER_2': 'Two deep safeties splitting the field. Vulnerable in the middle of the field and down the seams.',
        'COVER_2_MAN': 'Two deep safeties with man coverage underneath. Look for receivers winning their routes.',
        'COVER_2_ZONE': 'Two deep safeties with zone coverage underneath. Target the holes between zones, especially the middle.',
        'COVER_3': 'Three deep defenders (usually 2 corners + safety). Vulnerable to flat routes and intermediate crossers.',
        'COVER_3_ZONE': 'Three deep zone with four underneath. Look for soft spots in the short-to-intermediate zones.',
        'COVER_4': 'Four deep defenders in quarters coverage. Good against deep passes, vulnerable underneath.',
        'COVER_6': 'Hybrid - Cover 4 on one side, Cover 2 on the other. Attack the Cover 2 side with deep routes.',
        'MAN_COVERAGE': 'Defenders assigned to specific receivers. Find the receiver with the best matchup.',
        'ZONE_COVERAGE': 'Defenders cover areas of the field. Find the soft spots between zone defenders.',
        'PREVENT': 'Deep coverage to prevent big plays. Short passes will be open.',
        'RED_ZONE': 'Compressed field coverage. Space is limited - look for quick throws to open receivers.'
    };
    
    // Get explanation
    let explanation = coverageExplanations[coverageType] || 
                     coverageExplanations[supp.team_coverage_man_zone] ||
                     `${formattedCoverage}: Watch how the defenders move to identify openings in the coverage.`;
    
    const explEl = document.getElementById('coverage-explanation');
    if (explEl) {
        explEl.textContent = explanation;
    }
}

// Update stopwatch display
function updateStopwatch() {
    if (selectionStartTime === null) {
        document.getElementById('qb-stopwatch').textContent = '0.0s';
        return;
    }
    
    const elapsed = (Date.now() - selectionStartTime) / 1000; // Convert to seconds
    document.getElementById('qb-stopwatch').textContent = `${elapsed.toFixed(1)}s`;
}

// Show receiver selection panel
function showReceiverSelection() {
    const receivers = getEligibleReceivers(playData);
    const buttonsContainer = document.getElementById('qb-receiver-buttons');
    buttonsContainer.innerHTML = '';
    
    receivers.forEach(receiver => {
        const btn = document.createElement('button');
        btn.className = 'receiver-btn';
        btn.innerHTML = `${receiver.name}<span class="position">${receiver.position}</span>`;
        btn.dataset.nflId = receiver.nflId;
        btn.addEventListener('click', () => selectReceiver(receiver.nflId, btn));
        buttonsContainer.appendChild(btn);
    });
    
    document.getElementById('qb-receiver-selection').classList.add('active');
    document.getElementById('qb-instruction-text').classList.add('hidden');
    
    // Note: Timer was already started when Play button was clicked
    // Just ensure stopwatch is updating
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
    }
    stopwatchInterval = setInterval(updateStopwatch, 100);
}

// Handle receiver selection - immediately confirm throw
function selectReceiver(nflId, buttonElement) {
    if (hasSubmittedAnswer) return;
    
    // Set selected receiver
    selectedReceiver = nflId;
    
    // Immediately confirm the throw (no need for separate button)
    confirmThrow();
}

// Highlight selected receiver on the field
function highlightSelectedReceiver(nflId) {
    // Remove previous highlights
    svg.select('.players').selectAll('.player-highlight-ring').remove();
    
    if (!nflId) return;
    
    const player = playData.players[nflId];
    if (!player) return;
    
    const frame = player.frames.find(f => f.frame_id === currentFrame);
    if (!frame) return;
    
    // Rotated view: data x (field length) → screen y, data y (field width) → screen x
    const x = xScale(frame.y);
    const y = yScale(frame.x);
    
    svg.select('.players').append('circle')
        .attr('class', 'player-highlight-ring')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 24)
        .attr('fill', 'none')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4)
        .attr('stroke-dasharray', '5,3')
        .style('animation', 'pulse 1s infinite');
}

// Update NFL comparison section (make it globally accessible)
window.updateNFLComparison = function updateNFLComparison() {
    const comparisonSection = document.getElementById('nfl-comparison-stats');
    const messageEl = document.getElementById('nfl-comparison-message');
    
    if (!comparisonSection) return;
    
    if (totalCount === 0) {
        // Show message if no attempts yet
        if (messageEl) messageEl.style.display = 'block';
        return;
    }
    
    // Hide message if we have data
    if (messageEl) messageEl.style.display = 'none';
    
    // Calculate user stats
    const userAccuracy = (correctCount / totalCount) * 100;
    const userAvgTime = decisionTimes.length > 0 
        ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length 
        : null;
    
    // Update accuracy comparison
    const userAccuracyEl = document.getElementById('user-accuracy');
    const nflAccuracyEl = document.getElementById('nfl-accuracy');
    if (userAccuracyEl) userAccuracyEl.textContent = `${userAccuracy.toFixed(1)}%`;
    if (nflAccuracyEl) nflAccuracyEl.textContent = `${NFL_AVERAGES.optimalDecisionPercentage}%`;
    
    const accuracyDiff = userAccuracy - NFL_AVERAGES.optimalDecisionPercentage;
    const accuracyDiffEl = document.getElementById('accuracy-diff');
    if (accuracyDiffEl) {
        if (accuracyDiff > 0) {
            accuracyDiffEl.textContent = `+${accuracyDiff.toFixed(1)}% better than NFL average`;
            accuracyDiffEl.className = 'comparison-diff-large better';
        } else if (accuracyDiff < 0) {
            accuracyDiffEl.textContent = `${Math.abs(accuracyDiff).toFixed(1)}% below NFL average`;
            accuracyDiffEl.className = 'comparison-diff-large worse';
        } else {
            accuracyDiffEl.textContent = 'Matching NFL average!';
            accuracyDiffEl.className = 'comparison-diff-large equal';
        }
    }
    
    // Update time comparison
    const userTimeEl = document.getElementById('user-time');
    const nflTimeEl = document.getElementById('nfl-time');
    const timeDiffEl = document.getElementById('time-diff');
    
    if (userAvgTime !== null) {
        if (userTimeEl) userTimeEl.textContent = `${userAvgTime.toFixed(1)}s`;
        if (nflTimeEl) nflTimeEl.textContent = `${NFL_AVERAGES.avgTimeToThrow}s`;
        
        if (timeDiffEl) {
            const timeDiff = userAvgTime - NFL_AVERAGES.avgTimeToThrow;
            if (timeDiff < 0) {
                timeDiffEl.textContent = `${Math.abs(timeDiff).toFixed(1)}s faster than NFL average`;
                timeDiffEl.className = 'comparison-diff-large better';
            } else if (timeDiff > 0) {
                timeDiffEl.textContent = `${timeDiff.toFixed(1)}s slower than NFL average`;
                timeDiffEl.className = 'comparison-diff-large worse';
            } else {
                timeDiffEl.textContent = 'Matching NFL average!';
                timeDiffEl.className = 'comparison-diff-large equal';
            }
        }
    } else {
        if (userTimeEl) userTimeEl.textContent = '--s';
        if (nflTimeEl) nflTimeEl.textContent = `${NFL_AVERAGES.avgTimeToThrow}s`;
        if (timeDiffEl) {
            timeDiffEl.textContent = 'Make at least one decision to compare';
            timeDiffEl.className = 'comparison-diff-large';
        }
    }
}

// Confirm throw and show result
function confirmThrow() {
    if (!selectedReceiver || hasSubmittedAnswer) return;
    
    hasSubmittedAnswer = true;
    isPausedForSelection = false;
    totalCount++;
    
    // Stop stopwatch interval
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    
    // Calculate and store decision time
    if (selectionStartTime !== null) {
        const decisionTime = (Date.now() - selectionStartTime) / 1000; // Convert to seconds
        decisionTimes.push(decisionTime);
        selectionStartTime = null;
    }
    
    // Reset stopwatch display
    document.getElementById('qb-stopwatch').textContent = '0.0s';
    
    const isCorrect = selectedReceiver === correctReceiver?.nflId;
    if (isCorrect) {
        correctCount++;
    }
    
    // Update stats
    document.getElementById('qb-correct-count').textContent = correctCount;
    document.getElementById('qb-total-count').textContent = totalCount;
    document.getElementById('qb-accuracy-pct').textContent = 
        `${Math.round((correctCount / totalCount) * 100)}%`;
    
    // Update average time
    if (decisionTimes.length > 0) {
        const avgTime = decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length;
        document.getElementById('qb-avg-time').textContent = `${avgTime.toFixed(1)}s`;
    }
    
    // Update NFL comparison (show after at least 1 attempt)
    if (totalCount >= 1) {
        updateNFLComparison();
    }
    
    // Show result panel
    const resultPanel = document.getElementById('qb-result-panel');
    resultPanel.classList.remove('correct', 'incorrect');
    resultPanel.classList.add('show', isCorrect ? 'correct' : 'incorrect');
    
    const selectedPlayer = playData.players[selectedReceiver];
    const selectedName = selectedPlayer?.name || 'Unknown';
    const correctName = correctReceiver?.name || 'Unknown';
    
    document.getElementById('qb-result-title').textContent = isCorrect ? '✅ Great Read!' : '❌ Not Quite';
    
    if (isCorrect) {
        document.getElementById('qb-result-message').textContent = 
            `You correctly identified ${correctName} as the open receiver!`;
    } else {
        document.getElementById('qb-result-message').textContent = 
            `You selected ${selectedName}. The actual target was different.`;
    }
    
    document.getElementById('qb-actual-target').textContent = correctName;
    
    // Show play outcome
    if (playData.supplementary && playData.supplementary.play_description) {
        document.getElementById('qb-play-outcome').textContent = 
            `Play: ${playData.supplementary.play_description}`;
    }
    
    // Hide instruction text
    const instructionText = document.getElementById('qb-instruction-text');
    if (instructionText) instructionText.classList.add('hidden');
    
    // Disable receiver buttons
    document.querySelectorAll('.receiver-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    // Continue playing the animation to show the actual throw
    setTimeout(() => {
        isPlaying = true;
        document.getElementById('qb-play-pause-btn').textContent = 'Pause';
        
        animationInterval = setInterval(() => {
            const maxFrame = playData.total_frames || playData.max_frame;
            if (currentFrame >= maxFrame) {
                clearInterval(animationInterval);
                isPlaying = false;
                document.getElementById('qb-play-pause-btn').textContent = 'Play';
            } else {
                currentFrame++;
                updateFrameDisplay();
                updateVisualization();
            }
        }, 200);
    }, 500);
}

function calculateBallPosition(frame) {
    if (frame < playData.throw_frame) {
        return {
            x: playData.ball_throw_x,
            y: playData.ball_throw_y,
            visible: false
        };
    }
    
    const throwFrame = playData.throw_frame;
    const landingFrame = playData.total_frames || playData.max_frame;
    
    if (frame >= landingFrame) {
        return {
            x: playData.ball_land_x,
            y: playData.ball_land_y,
            visible: true
        };
    }
    
    const currentFlightFrame = frame - throwFrame;
    const flightFrames = landingFrame - throwFrame;
    const progress = Math.min(Math.max(currentFlightFrame / flightFrames, 0), 1);
    
    const startX = playData.ball_throw_x;
    const startY = playData.ball_throw_y;
    const endX = playData.ball_land_x;
    const endY = playData.ball_land_y;
    
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    
    return { x, y, visible: true };
}

function updateVisualization() {
    if (!playData || !svg) return;
    
    const playersGroup = svg.select('.players');
    const outputPlayersGroup = svg.select('.output-players');
    const trailsGroup = svg.select('.trails');
    const ballTrajectoryGroup = svg.select('.ball-trajectory');
    const ballGroup = svg.select('.ball');
    const labelsGroup = svg.select('.labels');
    
    playersGroup.selectAll('*').remove();
    outputPlayersGroup.selectAll('*').remove();
    labelsGroup.selectAll('*').remove();
    ballGroup.selectAll('*').remove();
    
    drawCoverageAnnotation();
    
    if (!showTrails) {
        trailsGroup.selectAll('*').remove();
        ballTrajectoryGroup.selectAll('*').remove();
    }
    
    // Draw trails
    if (showTrails) {
        trailsGroup.selectAll('*').remove();
        
        Object.entries(playData.players).forEach(([nflId, player]) => {
            const frames = player.frames.filter(f => f.frame_id <= currentFrame);
            
            if (frames.length < 2) return;
            
            const line = d3.line()
                .x(d => xScale(d.y))  // Rotated: data y → screen x
                .y(d => yScale(d.x))  // Rotated: data x → screen y
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
        
        // Ball trajectory (only after answer submitted)
        if (hasSubmittedAnswer && currentFrame >= playData.throw_frame) {
            ballTrajectoryGroup.selectAll('*').remove();
            
            const trajectoryPoints = [];
            const maxTrajectoryFrame = Math.min(currentFrame, playData.throw_frame + 10);
            for (let f = playData.throw_frame; f <= maxTrajectoryFrame; f++) {
                const ballPos = calculateBallPosition(f);
                if (ballPos.visible) {
                    trajectoryPoints.push({ x: ballPos.x, y: ballPos.y });
                }
            }
            
            if (trajectoryPoints.length >= 2) {
                const line = d3.line()
                    .x(d => xScale(d.y))  // Rotated: data y → screen x
                    .y(d => yScale(d.x))  // Rotated: data x → screen y
                    .curve(d3.curveLinear);
                
                ballTrajectoryGroup.append('path')
                    .datum(trajectoryPoints)
                    .attr('d', line)
                    .attr('fill', 'none')
                    .attr('stroke', '#8B4513')
                    .attr('stroke-width', 3)
                    .attr('opacity', 0.7)
                    .attr('stroke-dasharray', '5,3');
            }
        }
    }
    
    // Draw ball (only after answer submitted)
    if (hasSubmittedAnswer) {
        const ballPos = calculateBallPosition(currentFrame);
        if (ballPos.visible || currentFrame >= playData.throw_frame) {
            // Rotated: data x → screen y, data y → screen x
            const ballX = xScale(ballPos.y);
            const ballY = yScale(ballPos.x);
            
            ballGroup.append('circle')
                .attr('cx', ballX)
                .attr('cy', ballY)
                .attr('r', 12)
                .attr('fill', '#8B4513')
                .attr('stroke', '#654321')
                .attr('stroke-width', 2)
                .attr('opacity', 0.9);
        }
    }
    
    // Draw players
    Object.entries(playData.players).forEach(([nflId, player]) => {
        let frame = player.frames.find(f => f.frame_id === currentFrame);
        let isOutputPlayer = false;
        
        if (!frame && currentFrame > playData.throw_frame && playData.output_players && playData.output_players[nflId]) {
            const outputPlayer = playData.output_players[nflId];
            const outputFrame = currentFrame - playData.throw_frame;
            const outputFrameData = outputPlayer.frames.find(f => f.frame_id === outputFrame);
            
            if (outputFrameData) {
                frame = { x: outputFrameData.x, y: outputFrameData.y, dir: 0, s: 0 };
                isOutputPlayer = true;
            } else if (outputPlayer.frames.length > 0) {
                const lastOutputFrame = outputPlayer.frames[outputPlayer.frames.length - 1];
                if (lastOutputFrame && lastOutputFrame.frame_id < outputFrame) {
                    frame = { x: lastOutputFrame.x, y: lastOutputFrame.y, dir: 0, s: 0 };
                    isOutputPlayer = true;
                }
            }
        }
        
        if (!frame && currentFrame > playData.throw_frame) {
            const lastFrame = player.frames[player.frames.length - 1];
            if (lastFrame) {
                frame = lastFrame;
            } else {
                return;
            }
        } else if (!frame) {
            return;
        }
        
        const color = player.side === 'Defense' ? '#FF6B6B' : '#4ECDC4';
        // Rotated view: data x (field length) → screen y, data y (field width) → screen x
        const x = xScale(frame.y);
        const y = yScale(frame.x);
        
        // Check if this is the quarterback
        const isQB = player.position === 'QB';
        
        // Highlight if selected
        const isSelected = selectedReceiver === nflId;
        
        // Draw QB with special styling
        if (isQB) {
            // Outer glow ring for QB
            playersGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 22)
                .attr('fill', 'none')
                .attr('stroke', '#f39c12')
                .attr('stroke-width', 3)
                .attr('opacity', 0.6);
            
            // QB circle (larger)
            playersGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 16)
                .attr('fill', '#f39c12')
                .attr('stroke', '#d68910')
                .attr('stroke-width', 2)
                .attr('opacity', isOutputPlayer ? 0.8 : 1);
            
            // Football icon for QB
            playersGroup.append('text')
                .attr('x', x)
                .attr('y', y + 5)
                .attr('text-anchor', 'middle')
                .attr('font-size', '16px')
                .text('🏈');
        } else {
            // Regular player circle - LARGER
            const playerCircle = playersGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 14)
                .attr('fill', color)
                .attr('stroke', isSelected ? '#FFD700' : '#333')
                .attr('stroke-width', isSelected ? 4 : 2)
                .attr('opacity', isOutputPlayer ? 0.8 : 0.9);
            
            playerCircle.append('title')
                .text(`${player.name} (${player.position})\nSide: ${player.side}`);
        }
        
        if (isSelected && isPausedForSelection) {
            playersGroup.append('circle')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 24)
                .attr('fill', 'none')
                .attr('stroke', '#FFD700')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '5,3')
                .attr('opacity', 0.8);
        }
        
        // Player name - LARGER font
        if (showNames) {
            labelsGroup.append('text')
                .attr('x', x)
                .attr('y', y - 20)
                .attr('class', 'player-label')
                .attr('fill', isSelected ? '#FFD700' : '#333')
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style('text-anchor', 'middle')
                .text(player.name.split(' ')[1] || player.name);
        }
    });
}

function updateFrameDisplay() {
    const maxFrame = playData.total_frames || playData.max_frame;
    document.getElementById('qb-frame-display').textContent = 
        `Frame: ${currentFrame} / ${maxFrame}`;
    document.getElementById('qb-frame-slider').value = currentFrame;
    updateTimeToThrow();
}

function playAnimation() {
    if (isPlaying) {
        clearInterval(animationInterval);
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = 'Play';
    } else {
        isPlaying = true;
        document.getElementById('qb-play-pause-btn').textContent = 'Pause';
        
        // Start timing when user clicks Play
        if (!hasSubmittedAnswer && selectionStartTime === null) {
            selectionStartTime = Date.now();
            
            // Show and reset stopwatch display
            const stopwatchEl = document.getElementById('qb-stopwatch');
            if (stopwatchEl) {
                stopwatchEl.style.display = 'block';
                stopwatchEl.textContent = '0.0s';
            }
            
            // Start live stopwatch updates (every 100ms for smooth display)
            if (stopwatchInterval) {
                clearInterval(stopwatchInterval);
            }
            stopwatchInterval = setInterval(updateStopwatch, 100);
        }
        
        animationInterval = setInterval(() => {
            const maxFrame = playData.total_frames || playData.max_frame;
            
            // Pause at throw_frame for selection (before answer submitted)
            if (!hasSubmittedAnswer && currentFrame >= playData.throw_frame - 1) {
                clearInterval(animationInterval);
                isPlaying = false;
                isPausedForSelection = true;
                document.getElementById('qb-play-pause-btn').textContent = 'Play';
                showReceiverSelection();
                return;
            }
            
            if (currentFrame >= maxFrame) {
                clearInterval(animationInterval);
                isPlaying = false;
                document.getElementById('qb-play-pause-btn').textContent = 'Play';
            } else {
                currentFrame++;
                updateFrameDisplay();
                updateVisualization();
            }
        }, 200);
    }
}

function resetAnimation() {
    currentFrame = 1;
    isPlaying = false;
    isPausedForSelection = false;
    clearInterval(animationInterval);
    document.getElementById('play-pause-btn').textContent = 'Play';
    
    // Stop and reset stopwatch
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
    }
    
    // Reset selection timer if user resets before confirming
    if (!hasSubmittedAnswer && selectionStartTime !== null) {
        selectionStartTime = null;
    }
    
    // Reset stopwatch display
    const stopwatchEl = document.getElementById('qb-stopwatch');
    if (stopwatchEl) {
        stopwatchEl.style.display = 'none';
        stopwatchEl.textContent = '0.0s';
    }
    
    // Don't reset answer state - keep it if already submitted
    if (!hasSubmittedAnswer) {
        document.getElementById('qb-receiver-selection').classList.remove('active');
    }
    
    updateFrameDisplay();
    updateVisualization();
}

// Randomize play function
async function randomizePlay() {
    try {
        // First try QB mode manifest
        let response = await fetch('qb_mode_plays_manifest.json');
        let playsManifest = [];
        
        if (response.ok) {
            playsManifest = await response.json();
        }
        
        // QB mode should only use qb_mode_plays_manifest.json
        if (playsManifest.length === 0) {
            alert('No QB mode plays available. Please ensure qb_mode_plays_manifest.json exists.');
            return;
        }
        
        const randomPlay = playsManifest[Math.floor(Math.random() * playsManifest.length)];
        
        const btn = document.getElementById('qb-randomize-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;
        
        const data = await d3.json(randomPlay.filename);
        initializePlayVisualization(data);
        
        btn.textContent = originalText;
        btn.disabled = false;
    } catch (error) {
        console.error('Error randomizing play:', error);
        alert('Error loading random play. Please try again.');
        document.getElementById('qb-randomize-btn').textContent = 'Next Play';
        document.getElementById('qb-randomize-btn').disabled = false;
    }
}

// Event listeners
document.getElementById('qb-randomize-btn').addEventListener('click', randomizePlay);
document.getElementById('qb-play-pause-btn').addEventListener('click', playAnimation);
document.getElementById('qb-reset-btn').addEventListener('click', resetAnimation);

document.getElementById('qb-frame-slider').addEventListener('input', (e) => {
    currentFrame = parseInt(e.target.value);
    updateFrameDisplay();
    updateVisualization();
});

document.getElementById('qb-show-trails').addEventListener('change', (e) => {
    showTrails = e.target.checked;
    updateVisualization();
});

document.getElementById('qb-show-names').addEventListener('change', (e) => {
    showNames = e.target.checked;
    updateVisualization();
});

