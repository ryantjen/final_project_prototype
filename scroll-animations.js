// Scroll-triggered animations using Intersection Observer and D3

// Initialize scroll progress bar
function initScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress');
    
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

// Initialize Intersection Observer for scroll animations
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Add animate-in class
                element.classList.add('animate-in');
                
                // Handle specific animations based on data attributes
                const animateType = element.getAttribute('data-animate');
                if (animateType) {
                    handleSpecificAnimation(element, animateType);
                }
                
                // Handle section-specific animations
                handleSectionAnimations(element);
            }
        });
    }, observerOptions);
    
    // Observe all elements with data-animate attribute
    document.querySelectorAll('[data-animate]').forEach(el => {
        observer.observe(el);
    });
    
    // Observe sections for section-specific animations
    document.querySelectorAll('.story-section').forEach(section => {
        observer.observe(section);
    });
}

// Handle specific animation types
function handleSpecificAnimation(element, type) {
    switch(type) {
        case 'fadeInLeft':
            d3.select(element)
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateX(0)');
            break;
        case 'fadeInRight':
            d3.select(element)
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateX(0)');
            break;
        case 'fadeInUp':
            d3.select(element)
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateY(0)');
            break;
    }
}

// Handle section-specific animations
function handleSectionAnimations(element) {
    const sectionId = element.id || element.closest('.story-section')?.id;
    
    switch(sectionId) {
        case 'hook':
            animateHookSection(element);
            break;
        case 'broadcast':
            animateBroadcastSection(element);
            break;
        case 'solution':
            animateSolutionSection(element);
            break;
        case 'tutorial-randomize':
            animateRandomizeSection(element);
            break;
        case 'tutorial-tracking':
            animateTrackingSection(element);
            break;
        case 'tutorial-decision':
            animateDecisionSection(element);
            break;
        case 'tutorial-model-demo':
            animateModelDemoSection(element);
            break;
        case 'tutorial-hover':
            animateHoverSection(element);
            break;
        case 'tutorial-coverage':
            animateCoverageSection(element);
            break;
        case 'takeaway':
            animateTakeawaySection(element);
            break;
        case 'qb-optimal-analysis':
            animateQBOptimalSection(element);
            break;
        case 'time-to-throw-analysis':
            animateTimeToThrowSection(element);
            break;
        case 'nfl-comparison':
            // Update comparison when section comes into view
            const comparisonObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Update comparison stats if user has played
                        if (typeof window.updateNFLComparison === 'function') {
                            window.updateNFLComparison();
                        }
                    }
                });
            }, { threshold: 0.3 });
            comparisonObserver.observe(element);
            break;
    }
}

// Hook section animation
function animateHookSection(section) {
    // Draw football throwing animation
    drawFootballAnimation();
    
    d3.selectAll('.couch-view, .reality-view')
        .transition()
        .delay(300)
        .duration(1000)
        .ease(d3.easeCubicOut)
        .style('opacity', 1)
        .style('transform', 'translateY(0)');
}

// Draw football throwing animation
function drawFootballAnimation() {
    const svg = d3.select('#football-animation-svg');
    if (svg.empty()) return;
    
    const container = svg.node().parentElement;
    const width = container ? container.offsetWidth : 1200;
    const height = 150;
    
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();
    
    // Draw field background
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90')
        .attr('opacity', 0.3);
    
    // Draw yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.5);
    }
    
    // Create football (ellipse shape)
    const football = svg.append('ellipse')
        .attr('rx', 30)
        .attr('ry', 20)
        .attr('fill', '#8B4513')
        .attr('stroke', '#654321')
        .attr('stroke-width', 1)
        .attr('opacity', 0);
    
    // Add football laces (lines)
    const laces = svg.append('g')
        .attr('opacity', 0);
    
    for (let i = 0; i < 3; i++) {
        laces.append('line')
            .attr('x1', -7)
            .attr('x2', 7)
            .attr('y1', -3 + i * 3)
            .attr('y2', -3 + i * 3)
            .attr('stroke', '#654321')
            .attr('stroke-width', 0.8);
    }
    
    // Animate football throw
    function throwFootball() {
        const startX = width * 0.1;
        const endX = width * 0.9;
        const startY = height * 0.6;
        const midY = height * 0.3;
        const endY = height * 0.6;
        
        // Reset position
        football
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('opacity', 0)
            .attr('transform', 'rotate(0)');
        
        laces
            .attr('transform', `translate(${startX}, ${startY})`)
            .attr('opacity', 0);
        
        // Fade in
        football.transition()
            .duration(200)
            .attr('opacity', 1);
        
        laces.transition()
            .duration(200)
            .attr('opacity', 1);
        
        // Throw animation with arc trajectory
        const duration = 2000;
        const t = d3.transition()
            .duration(duration)
            .ease(d3.easeQuadOut);
        
        // Animate position along arc
        const steps = 60;
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep > steps) {
                // Fade out and reset
                football.transition()
                    .duration(300)
                    .attr('opacity', 0);
                
                laces.transition()
                    .duration(300)
                    .attr('opacity', 0)
                    .on('end', () => {
                        setTimeout(throwFootball, 500);
                    });
                return;
            }
            
            const progress = currentStep / steps;
            const x = startX + (endX - startX) * progress;
            // Parabolic arc
            const y = startY - Math.sin(progress * Math.PI) * (startY - midY);
            // Rotation based on trajectory
            const rotation = progress * 360;
            
            football
                .attr('cx', x)
                .attr('cy', y)
                .attr('transform', `rotate(${rotation} ${x} ${y})`);
            
            laces.attr('transform', `translate(${x}, ${y}) rotate(${rotation})`);
            
            currentStep++;
            requestAnimationFrame(animate);
        };
        
        setTimeout(animate, 200);
    }
    
    // Start animation
    throwFootball();
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            drawFootballAnimation();
        }, 250);
    });
}

// Broadcast section animation
function animateBroadcastSection(section) {
    // Animate comparison points
    d3.selectAll('.comparison-point')
        .each(function(d, i) {
            d3.select(this)
                .transition()
                .delay(i * 200)
                .duration(600)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateX(0)');
        });
    
}

// Solution section animation
function animateSolutionSection(section) {
    // Animate feature items
    d3.selectAll('.feature-item')
        .each(function(d, i) {
            d3.select(this)
                .transition()
                .delay(i * 200)
                .duration(600)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateY(0)');
        });
    
    // Animate preview
    d3.select('.solution-preview')
        .transition()
        .delay(600)
        .duration(800)
        .ease(d3.easeCubicOut)
        .style('opacity', 1)
        .style('transform', 'translateX(0)');
    
    // Draw preview field
    drawSolutionPreview();
}

// Draw solution preview field
function drawSolutionPreview() {
    const svg = d3.select('#solution-preview-svg');
    if (svg.empty()) return;
    
    const width = 500;
    const height = 300;
    
    // Clear existing
    svg.selectAll('*').remove();
    
    // Field background
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    // Animate players appearing
    const players = [
        {x: 100, y: 150, team: 'offense', delay: 500},
        {x: 200, y: 100, team: 'offense', delay: 700},
        {x: 200, y: 200, team: 'offense', delay: 900},
        {x: 350, y: 80, team: 'defense', delay: 600},
        {x: 350, y: 220, team: 'defense', delay: 800}
    ];
    
    players.forEach(player => {
        const circle = svg.append('circle')
            .attr('cx', player.x)
            .attr('cy', player.y)
            .attr('r', 10)
            .attr('fill', player.team === 'offense' ? '#4ECDC4' : '#FF6B6B')
            .attr('opacity', 0)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        
        circle.transition()
            .delay(player.delay)
            .duration(500)
            .attr('opacity', 1);
    });
}

// Randomize section animation
function animateRandomizeSection(section) {
    // Animate button
    d3.select('#randomize-demo')
        .transition()
        .delay(500)
        .duration(800)
        .style('transform', 'scale(1.05)')
        .transition()
        .duration(800)
        .style('transform', 'scale(1)')
        .on('end', function repeat() {
            d3.select(this)
                .transition()
                .duration(800)
                .style('box-shadow', '0 0 20px rgba(156, 39, 176, 0.6)')
                .transition()
                .duration(800)
                .style('box-shadow', '0 0 10px rgba(156, 39, 176, 0.3)')
                .on('end', repeat);
        });
    
    // Animate annotation
    d3.select('#randomize-annotation')
        .transition()
        .delay(1000)
        .duration(600)
        .ease(d3.easeCubicOut)
        .style('opacity', 1);
}

// Tracking section animation
function animateTrackingSection(section) {
    drawTrackingDemo();
}

// Draw tracking demo
function drawTrackingDemo() {
    const svg = d3.select('#tracking-svg');
    if (svg.empty()) return;
    
    const width = 800;
    const height = 450;
    
    svg.selectAll('*').remove();
    
    // Draw field
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    // QB
    const qbX = 150;
    const qbY = height/2;
    const qbName = 'QB';
    
    svg.append('circle')
        .attr('cx', qbX)
        .attr('cy', qbY)
        .attr('r', 12)
        .attr('fill', '#4ECDC4')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    
    // QB name
    svg.append('text')
        .attr('x', qbX)
        .attr('y', qbY - 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text(qbName);
    
    // Receivers and defenders with names (store initial positions)
    const receivers = [
        {x: 300, y: 100, team: 'offense', name: 'WR1'},
        {x: 350, y: 222, team: 'offense', name: 'WR2'}, // Moved up to be more distinct from CB2
        {x: 400, y: 300, team: 'offense', name: 'WR3'}
    ];
    const defenders = [
        {x: 320, y: 120, team: 'defense', name: 'CB1'},
        {x: 370, y: 240, team: 'defense', name: 'CB2'}, // Moved down to be more distinct from WR2
        {x: 420, y: 320, team: 'defense', name: 'CB3'}
    ];
    
    // Target receiver for football (middle receiver)
    const targetReceiver = receivers[1];
    
    // Store fixed offsets for consistent movement
    const receiverOffsets = [
        {x: 100, y: -10},  // WR1 moves right and slightly up
        {x: 100, y: 0},    // WR2 moves right (straight)
        {x: 100, y: 10}    // WR3 moves right and slightly down
    ];
    const defenderOffsets = [
        {x: 80, y: -5},    // CB1 moves right and slightly up
        {x: 80, y: 5},     // CB2 moves right and slightly down
        {x: 80, y: 0}      // CB3 moves right (straight)
    ];
    
    receivers.forEach((rec, i) => {
        const circle = svg.append('circle')
            .attr('cx', rec.x)
            .attr('cy', rec.y)
            .attr('r', 10)
            .attr('fill', '#4ECDC4')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('opacity', 0);
        
        // Receiver name
        const nameText = svg.append('text')
            .attr('x', rec.x)
            .attr('y', rec.y - 18)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(rec.name)
            .attr('opacity', 0);
        
        circle.transition()
            .delay(500 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        nameText.transition()
            .delay(500 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        circle.transition()
            .delay(1500 + i * 200)
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('cx', rec.x + receiverOffsets[i].x)
            .attr('cy', rec.y + receiverOffsets[i].y);
        
        nameText.transition()
            .delay(1500 + i * 200)
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('x', rec.x + receiverOffsets[i].x)
            .attr('y', rec.y + receiverOffsets[i].y - 18);
    });
    
    defenders.forEach((def, i) => {
        const circle = svg.append('circle')
            .attr('cx', def.x)
            .attr('cy', def.y)
            .attr('r', 10)
            .attr('fill', '#FF6B6B')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('opacity', 0);
        
        // Defender name
        const nameText = svg.append('text')
            .attr('x', def.x)
            .attr('y', def.y - 18)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(def.name)
            .attr('opacity', 0);
        
        circle.transition()
            .delay(600 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        nameText.transition()
            .delay(600 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        circle.transition()
            .delay(1500 + i * 200)
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('cx', def.x + defenderOffsets[i].x)
            .attr('cy', def.y + defenderOffsets[i].y);
        
        nameText.transition()
            .delay(1500 + i * 200)
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('x', def.x + defenderOffsets[i].x)
            .attr('y', def.y + defenderOffsets[i].y - 18);
    });
    
    // Add football being thrown from QB to target receiver
    const football = svg.append('ellipse')
        .attr('rx', 8)
        .attr('ry', 5)
        .attr('fill', '#8B4513')
        .attr('stroke', '#654321')
        .attr('stroke-width', 1)
        .attr('opacity', 0);
    
    // Football laces
    const laces = svg.append('g')
        .attr('opacity', 0);
    
    for (let i = 0; i < 3; i++) {
        laces.append('line')
            .attr('x1', -3)
            .attr('x2', 3)
            .attr('y1', -1.5 + i * 1.5)
            .attr('y2', -1.5 + i * 1.5)
            .attr('stroke', '#654321')
            .attr('stroke-width', 0.5);
    }
    
    // Animate football throw
    setTimeout(() => {
        const startX = qbX;
        const startY = qbY;
        // Calculate target receiver's final position after movement
        // Target is WR2 (middle receiver, index 1)
        const targetReceiverIndex = 1;
        const targetReceiverStartX = receivers[targetReceiverIndex].x;
        const targetReceiverStartY = receivers[targetReceiverIndex].y;
        const endX = targetReceiverStartX + receiverOffsets[targetReceiverIndex].x;
        const endY = targetReceiverStartY + receiverOffsets[targetReceiverIndex].y;
        const midY = (startY + endY) / 2 - 30; // Arc peak
        
        football
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('opacity', 1);
        
        laces
            .attr('transform', `translate(${startX}, ${startY})`)
            .attr('opacity', 1);
        
        // Throw animation with arc trajectory
        const duration = 1500;
        const steps = 87;
        let currentStep = 0;
        let animationId = null;
        
        const animate = () => {
            if (currentStep > steps) {
                // Show check mark for complete pass
                const checkMark = svg.append('text')
                    .attr('x', endX)
                    .attr('y', endY - 25)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '32px')
                    .attr('font-weight', 'bold')
                    .attr('fill', '#00FF00')
                    .text('✓')
                    .attr('opacity', 0);
                
                checkMark.transition()
                    .duration(300)
                    .attr('opacity', 1)
                    .transition()
                    .delay(1000)
                    .duration(300)
                    .attr('opacity', 0);
                
                // Fade out football
                football.transition()
                    .duration(300)
                    .attr('opacity', 0);
                
                laces.transition()
                    .duration(300)
                    .attr('opacity', 0);
                return;
            }
            
            const progress = currentStep / steps;
            const x = startX + (endX - startX) * progress;
            // Parabolic arc
            const y = startY - Math.sin(progress * Math.PI) * (startY - midY);
            // Rotation based on trajectory
            const rotation = progress * 360;
            
            football
                .attr('cx', x)
                .attr('cy', y)
                .attr('transform', `rotate(${rotation} ${x} ${y})`);
            
            laces.attr('transform', `translate(${x}, ${y}) rotate(${rotation})`);
            
            currentStep++;
            if (currentStep <= steps) {
                requestAnimationFrame(animate);
            }
        };
        
        setTimeout(() => {
            animate();
        }, 2000);
    }, 100);
    
    // Add annotations
    setTimeout(() => {
        const annotations = [
            {text: 'analyze how defensive scheme evolves', x: 250, y: 150},
            {text: 'see which recievers are open at every moment', x: 250, y: 250}
        ];
        
        annotations.forEach((ann, i) => {
            d3.select('#tracking-annotations')
                .append('div')
                .attr('class', 'tracking-annotation')
                .style('left', ann.x + 'px')
                .style('top', ann.y + 'px')
                .html(ann.text)
                .transition()
                .delay(2000 + i * 200)
                .duration(600)
                .style('opacity', 1);
        });
    }, 100);
}

// Decision section animation
function animateDecisionSection(section) {
    drawDecisionDemo();
}

// Draw decision demo
function drawDecisionDemo() {
    const svg = d3.select('#decision-svg');
    if (svg.empty()) return;
    
    const width = 800;
    const height = 450;
    
    svg.selectAll('*').remove();
    
    // Draw field
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    const qbX = 150;
    const qbY = height/2;
    
    // Draw QB
    svg.append('circle')
        .attr('cx', qbX)
        .attr('cy', qbY)
        .attr('r', 12)
        .attr('fill', '#4ECDC4')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    
    // Receiver data with catch probability, yards if caught, and expected yards
    // Expected yards = yards if caught * catch probability
    // Optimal receiver has highest expected yards
    const receivers = [
        {
            x: 400, 
            y: 150, 
            open: true, 
            optimal: false,
            actual: true,  // This is the actual decision
            catchProb: 0.65,  // 65% catch probability
            yardsIfCaught: 12,  // 12 yards if caught
            expectedYards: 7.8  // 12 * 0.65 = 7.8 expected yards
        },
        {
            x: 450, 
            y: 250, 
            open: true, 
            optimal: true,  // This is the optimal decision (highest expected yards)
            actual: false,
            catchProb: 0.85,  // 85% catch probability
            yardsIfCaught: 15,  // 15 yards if caught
            expectedYards: 12.75  // 15 * 0.85 = 12.75 expected yards (HIGHEST)
        },

    ];
    
    // Helper function to create info box for a receiver
    function createInfoBox(rec, delay) {
        const boxWidth = 200;
        const boxHeight = 90;
        const offsetX = rec.x > width/2 ? -boxWidth - 15 : 15;
        const offsetY = -boxHeight/2;
        
        // Determine box styling based on optimal/actual
        let boxColor, borderColor, textColor;
        if (rec.optimal) {
            boxColor = '#E8F5E9';  // Light green
            borderColor = '#4CAF50';  // Green
            textColor = '#2E7D32';
        } else if (rec.actual) {
            boxColor = '#FFF3E0';  // Light orange
            borderColor = '#FF9800';  // Orange
            textColor = '#E65100';
        } else {
            boxColor = '#F5F5F5';  // Light gray
            borderColor = '#999';
            textColor = '#666';
        }
        
        // Create group for the info box
        const boxGroup = svg.append('g')
            .attr('class', 'receiver-info-box')
            .attr('opacity', 0);
        
        // Background rectangle
        boxGroup.append('rect')
            .attr('x', rec.x + offsetX)
            .attr('y', rec.y + offsetY)
            .attr('width', boxWidth)
            .attr('height', boxHeight)
            .attr('fill', boxColor)
            .attr('stroke', borderColor)
            .attr('stroke-width', 2.5)
            .attr('rx', 6)
            .attr('ry', 6);
        
        // Title (Optimal or Actual)
        const titleText = rec.optimal ? '✓ OPTIMAL' : (rec.actual ? '✗ ACTUAL' : '');
        if (titleText) {
            boxGroup.append('text')
                .attr('x', rec.x + offsetX + boxWidth/2)
                .attr('y', rec.y + offsetY + 18)
                .attr('text-anchor', 'middle')
                .attr('font-size', 12)
                .attr('font-weight', 'bold')
                .attr('fill', borderColor)
                .text(titleText);
        }
        
        // Catch probability
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + 8)
            .attr('y', rec.y + offsetY + 35)
            .attr('font-size', 10)
            .attr('fill', textColor)
            .text('Catch Prob:');
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + boxWidth - 8)
            .attr('y', rec.y + offsetY + 35)
            .attr('text-anchor', 'end')
            .attr('font-size', 11)
            .attr('font-weight', 'bold')
            .attr('fill', borderColor)
            .text((rec.catchProb * 100).toFixed(0) + '%');
        
        // Yards if caught
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + 8)
            .attr('y', rec.y + offsetY + 50)
            .attr('font-size', 10)
            .attr('fill', textColor)
            .text('Yards if Caught:');
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + boxWidth - 8)
            .attr('y', rec.y + offsetY + 50)
            .attr('text-anchor', 'end')
            .attr('font-size', 11)
            .attr('font-weight', 'bold')
            .attr('fill', borderColor)
            .text(rec.yardsIfCaught + ' yds');
        
        // Expected yards (emphasized)
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + 8)
            .attr('y', rec.y + offsetY + 70)
            .attr('font-size', 10)
            .attr('font-weight', 'bold')
            .attr('fill', textColor)
            .text('Expected Yards:');
        boxGroup.append('text')
            .attr('x', rec.x + offsetX + boxWidth - 8)
            .attr('y', rec.y + offsetY + 70)
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .attr('font-weight', 'bold')
            .attr('fill', borderColor)
            .text(rec.expectedYards.toFixed(1) + ' yds');
        
        // Animate in
        boxGroup.transition()
            .delay(delay)
            .duration(500)
            .attr('opacity', 1);
        
        return boxGroup;
    }
    
    // Draw receivers and their info boxes
    receivers.forEach((rec, i) => {
        // Draw receiver circle
        const circle = svg.append('circle')
            .attr('cx', rec.x)
            .attr('cy', rec.y)
            .attr('r', rec.optimal ? 14 : (rec.actual ? 12 : 10))
            .attr('fill', rec.open ? '#4ECDC4' : '#999')
            .attr('stroke', rec.optimal ? '#4CAF50' : (rec.actual ? '#FF9800' : '#333'))
            .attr('stroke-width', rec.optimal ? 3 : (rec.actual ? 2.5 : 2))
            .attr('opacity', 0);
        
        circle.transition()
            .delay(500 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        // Draw throw lines for open receivers
        if (rec.open) {
            const lineColor = rec.optimal ? '#4CAF50' : (rec.actual ? '#FF9800' : '#FFD700');
            const lineWidth = rec.optimal ? 4 : (rec.actual ? 3 : 2.5);
            const dashArray = rec.optimal ? '0' : (rec.actual ? '0' : '5,5');
            
            const line = svg.append('line')
                .attr('x1', qbX)
                .attr('y1', qbY)
                .attr('x2', rec.x)
                .attr('y2', rec.y)
                .attr('stroke', lineColor)
                .attr('stroke-width', lineWidth)
                .attr('stroke-dasharray', dashArray)
                .attr('opacity', 0);
            
            line.transition()
                .delay(1500 + i * 200)
                .duration(500)
                .attr('opacity', 0.8);
        }
        
        // Create info box for open receivers
        if (rec.open) {
            createInfoBox(rec, 2000 + i * 200);
        }
    });
    
    // Add comparison annotation showing the difference
    setTimeout(() => {
        const optimalRec = receivers.find(r => r.optimal);
        const actualRec = receivers.find(r => r.actual);
        const difference = optimalRec.expectedYards - actualRec.expectedYards;
        
        const comparisonText = `
            <strong>Decision Quality Gap</strong><br>
            Optimal: ${optimalRec.expectedYards.toFixed(1)} expected yds<br>
            Actual: ${actualRec.expectedYards.toFixed(1)} expected yds<br>
            <span style="color: #d32f2f; font-weight: bold;">Difference: -${difference.toFixed(1)} yds</span>
        `;
        
        d3.select('#decision-annotations')
            .append('div')
            .attr('class', 'decision-annotation')
            .style('left', '500px')
            .style('top', '280px')
            .html(comparisonText)
            .transition()
            .delay(3000)
            .duration(600)
            .style('opacity', 1);
    }, 100);
}

// Model demo section animation
let modelDemoData = null;
let modelDemoCurrentFrame = 1;
let modelDemoIsPlaying = false;
let modelDemoAnimationInterval = null;
let modelDemoSvg = null;
let modelDemoXScale = null;
let modelDemoYScale = null;
let modelDemoSelectedStat = 'catch_probability';

function animateModelDemoSection(section) {
    if (!modelDemoData) {
        loadModelDemoPlay();
    } else {
        drawModelDemo();
    }
}

function loadModelDemoPlay() {
    d3.json('plays/play_2023090700_1711.json')
        .then(data => {
            modelDemoData = data;
            
            // Only use pre-throw frames (don't include post-throw)
            modelDemoData.total_frames = modelDemoData.throw_frame || modelDemoData.max_frame;
            
            // Update slider max
            const slider = document.getElementById('model-demo-frame-slider');
            if (slider) {
                slider.max = modelDemoData.total_frames;
            }
            
            drawModelDemo();
            attachModelDemoEventListeners();
        })
        .catch(error => {
            console.error('Error loading model demo play:', error);
        });
}

function drawModelDemo() {
    const container = d3.select('#model-demo-visualization');
    if (container.empty()) return;
    
    container.selectAll('*').remove();
    
    const width = 800;
    const height = 450;
    
    // Create SVG
    modelDemoSvg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create groups (same structure as sandbox)
    modelDemoSvg.append('g').attr('class', 'field');
    modelDemoSvg.append('g').attr('class', 'players');
    modelDemoSvg.append('g').attr('class', 'overlays');
    modelDemoSvg.append('g').attr('class', 'labels');
    
    // Set up scales (same as sandbox: field x → screen x, field y → screen y)
    // Field dimensions: 0-120 yards (x-axis), 0-53.3 yards (y-axis)
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const availableWidth = width - margin.left - margin.right;
    const availableHeight = height - margin.top - margin.bottom;
    const fieldAspectRatio = 53.3 / 120;
    const fieldWidth = availableWidth;
    const fieldHeight = fieldWidth * fieldAspectRatio;
    const fieldTop = margin.top + (availableHeight - fieldHeight) / 2;
    const fieldBottom = fieldTop + fieldHeight;
    
    modelDemoXScale = d3.scaleLinear()
        .domain([0, 120])
        .range([margin.left, width - margin.right]);
    
    modelDemoYScale = d3.scaleLinear()
        .domain([0, 53.3])
        .range([fieldBottom, fieldTop]);
    
    // Draw field (using same logic as sandbox)
    drawModelDemoField();
    
    // Draw players and overlays
    updateModelDemoVisualization();
}

function drawModelDemoField() {
    const fieldGroup = modelDemoSvg.select('.field');
    fieldGroup.selectAll('*').remove();
    
    const xMin = 0;
    const xMax = 120;
    const yMin = 0;
    const yMax = 53.3;
    
    // Green grass background
    fieldGroup.append('rect')
        .attr('x', modelDemoXScale(xMin))
        .attr('y', modelDemoYScale(yMax))
        .attr('width', modelDemoXScale(xMax) - modelDemoXScale(xMin))
        .attr('height', modelDemoYScale(yMin) - modelDemoYScale(yMax))
        .attr('fill', '#90EE90')
        .attr('class', 'field-background');
    
    // Draw end zones with team colors (same as sandbox)
    let leftTeamColor = '#0066CC';
    let rightTeamColor = '#DC143C';
    let leftTeam = null;
    let rightTeam = null;
    
    if (modelDemoData.supplementary) {
        const supp = modelDemoData.supplementary;
        if (supp.visitor_team_abbr) {
            leftTeam = supp.visitor_team_abbr;
        }
        if (supp.home_team_abbr) {
            rightTeam = supp.home_team_abbr;
        }
    }
    
    // End zone 1 (0-10 yards) - Left team
    fieldGroup.append('rect')
        .attr('x', modelDemoXScale(0))
        .attr('y', modelDemoYScale(yMax))
        .attr('width', modelDemoXScale(10) - modelDemoXScale(0))
        .attr('height', modelDemoYScale(yMin) - modelDemoYScale(yMax))
        .attr('fill', leftTeamColor)
        .attr('opacity', 0.3);
    
    // End zone 2 (110-120 yards) - Right team
    fieldGroup.append('rect')
        .attr('x', modelDemoXScale(110))
        .attr('y', modelDemoYScale(yMax))
        .attr('width', modelDemoXScale(120) - modelDemoXScale(110))
        .attr('height', modelDemoYScale(yMin) - modelDemoYScale(yMax))
        .attr('fill', rightTeamColor)
        .attr('opacity', 0.3);
    
    // Draw vertical yard lines (every 10 yards from 0 to 120)
    for (let i = 0; i <= 120; i += 10) {
        const isEndZone = (i <= 10 || i >= 110);
        const isGoalLine = (i === 10 || i === 110);
        
        fieldGroup.append('line')
            .attr('x1', modelDemoXScale(i))
            .attr('y1', modelDemoYScale(yMin))
            .attr('x2', modelDemoXScale(i))
            .attr('y2', modelDemoYScale(yMax))
            .attr('stroke', 'white')
            .attr('stroke-width', isGoalLine ? 3 : (isEndZone ? 2 : 1))
            .attr('opacity', isEndZone ? 0.6 : 0.8);
    }
    
    // Draw out-of-bounds lines (sidelines)
    fieldGroup.append('line')
        .attr('x1', modelDemoXScale(xMin))
        .attr('y1', modelDemoYScale(yMin))
        .attr('x2', modelDemoXScale(xMax))
        .attr('y2', modelDemoYScale(yMin))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
    
    fieldGroup.append('line')
        .attr('x1', modelDemoXScale(xMin))
        .attr('y1', modelDemoYScale(yMax))
        .attr('x2', modelDemoXScale(xMax))
        .attr('y2', modelDemoYScale(yMax))
        .attr('stroke', '#FF0000')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '10,5')
        .attr('opacity', 0.8);
}

function updateModelDemoVisualization() {
    if (!modelDemoData || !modelDemoSvg) return;
    
    const playersGroup = modelDemoSvg.select('.players');
    const overlaysGroup = modelDemoSvg.select('.overlays');
    
    playersGroup.selectAll('*').remove();
    overlaysGroup.selectAll('*').remove();
    
    const receiverPositions = ['WR', 'TE', 'RB'];
    
    const labelsGroup = modelDemoSvg.select('.labels');
    labelsGroup.selectAll('*').remove();
    
    // Draw players (only pre-throw frames)
    Object.entries(modelDemoData.players).forEach(([nflId, player]) => {
        // Only show frames up to throw_frame
        if (modelDemoCurrentFrame > modelDemoData.throw_frame) {
            return;
        }
        
        let frame = player.frames.find(f => f.frame_id === modelDemoCurrentFrame);
        if (!frame) return;
        
        const color = player.side === 'Defense' ? '#FF6B6B' : '#4ECDC4';
        const x = modelDemoXScale(frame.x);
        const y = modelDemoYScale(frame.y);
        
        // Draw player circle (same as sandbox)
        playersGroup.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 8)
            .attr('fill', color)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('opacity', 0.9);
        
        // Draw direction indicator (same as sandbox)
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
        
        // Draw player names (receivers and defenders)
        const isReceiver = receiverPositions.includes(player.position) && player.side === 'Offense';
        const isDefender = player.side === 'Defense';
        
        if (isReceiver || isDefender) {
            const nameText = player.name.split(' ')[1] || player.name; // Last name only
            labelsGroup.append('text')
                .attr('x', x)
                .attr('y', y - 12)
                .attr('class', 'player-label')
                .attr('text-anchor', 'middle')
                .attr('font-size', '10')
                .attr('font-weight', '500')
                .attr('fill', '#333')
                .attr('stroke', 'white')
                .attr('stroke-width', '0.5')
                .attr('stroke-opacity', '0.8')
                .text(nameText);
        }
        
        // Draw overlays for receivers with selected stat (smaller and more transparent)
        if (isReceiver && frame[modelDemoSelectedStat] !== undefined) {
            // Position overlay above the receiver name
            const overlayX = x;
            const overlayY = y - 35;
            
            // Create overlay box (smaller and more transparent)
            const overlayGroup = overlaysGroup.append('g')
                .attr('class', 'receiver-overlay')
                .attr('transform', `translate(${overlayX}, ${overlayY})`);
            
            // Display selected stat
            let statLabel = '';
            let statValue = '';
            let statColor = '#333';
            let boxWidth = 85; // Default width
            
            if (modelDemoSelectedStat === 'catch_probability') {
                statLabel = 'Catch:';
                statValue = (frame.catch_probability * 100).toFixed(1) + '%';
                statColor = '#333';
                boxWidth = 80; // "Catch: XX.X%" is shorter
            } else if (modelDemoSelectedStat === 'target_probability') {
                statLabel = 'Target:';
                statValue = (frame.target_probability * 100).toFixed(1) + '%';
                statColor = '#333';
                boxWidth = 85; // "Target: XX.X%" is medium
            } else if (modelDemoSelectedStat === 'expected_yards') {
                statLabel = 'Expected Yds:';
                statValue = frame.expected_yards.toFixed(1);
                statColor = frame.expected_yards > 5 ? '#4CAF50' : (frame.expected_yards > 0 ? '#FF9800' : '#d32f2f');
                boxWidth = 110; // "Expected Yds: X.X" is longer, needs more space
            }
            
            const boxHeight = 25;
            
            // Background box (size adjusted based on stat)
            overlayGroup.append('rect')
                .attr('x', -boxWidth / 2)
                .attr('y', -boxHeight / 2)
                .attr('width', boxWidth)
                .attr('height', boxHeight)
                .attr('fill', 'rgba(255, 255, 255, 0.65)')
                .attr('stroke', '#4CAF50')
                .attr('stroke-width', 1)
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))');
            
            overlayGroup.append('text')
                .attr('x', 0)
                .attr('y', 4)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10')
                .attr('font-weight', 'bold')
                .attr('fill', statColor)
                .text(`${statLabel} ${statValue}`);
        }
    });
    
    // Update frame display
    const frameDisplay = document.getElementById('model-demo-frame-display');
    if (frameDisplay) {
        frameDisplay.textContent = `Frame: ${modelDemoCurrentFrame} / ${modelDemoData.total_frames}`;
    }
}

function attachModelDemoEventListeners() {
    const playPauseBtn = document.getElementById('model-demo-play-pause-btn');
    const resetBtn = document.getElementById('model-demo-reset-btn');
    const slider = document.getElementById('model-demo-frame-slider');
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', modelDemoPlayAnimation);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            modelDemoCurrentFrame = 1;
            if (slider) slider.value = 1;
            modelDemoIsPlaying = false;
            clearInterval(modelDemoAnimationInterval);
            if (playPauseBtn) playPauseBtn.textContent = 'Play';
            updateModelDemoVisualization();
        });
    }
    
    if (slider) {
        slider.addEventListener('input', (e) => {
            modelDemoCurrentFrame = parseInt(e.target.value);
            updateModelDemoVisualization();
        });
    }
    
    // Stat selector radio buttons
    const statRadios = document.querySelectorAll('input[name="model-demo-stat"]');
    statRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            modelDemoSelectedStat = e.target.value;
            updateModelDemoVisualization();
        });
    });
}

function modelDemoPlayAnimation() {
    const playPauseBtn = document.getElementById('model-demo-play-pause-btn');
    if (!playPauseBtn) return;
    
    if (modelDemoIsPlaying) {
        clearInterval(modelDemoAnimationInterval);
        modelDemoIsPlaying = false;
        playPauseBtn.textContent = 'Play';
    } else {
        modelDemoIsPlaying = true;
        playPauseBtn.textContent = 'Pause';
        
        modelDemoAnimationInterval = setInterval(() => {
            const maxFrame = modelDemoData.total_frames || modelDemoData.max_frame;
            if (modelDemoCurrentFrame >= maxFrame) {
                clearInterval(modelDemoAnimationInterval);
                modelDemoIsPlaying = false;
                playPauseBtn.textContent = 'Play';
            } else {
                modelDemoCurrentFrame++;
                const slider = document.getElementById('model-demo-frame-slider');
                if (slider) slider.value = modelDemoCurrentFrame;
                updateModelDemoVisualization();
            }
        }, 200); // 200ms per frame
    }
}

// Hover section animation
function animateHoverSection(section) {
    drawHoverDemo();
}

// Draw hover demo
function drawHoverDemo() {
    const svg = d3.select('#hover-svg');
    if (svg.empty()) return;
    
    const width = 800;
    const height = 450;
    
    svg.selectAll('*').remove();
    
    // Draw field
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    const players = [
        {x: 400, y: 150, name: 'WR #11', position: 'Wide Receiver', role: 'Primary Target', team: 'offense'},
        {x: 450, y: 250, name: 'TE #87', position: 'Tight End', role: 'Checkdown', team: 'offense'},
        {x: 500, y: 350, name: 'CB #24', position: 'Cornerback', role: 'Coverage', team: 'defense'}
    ];
    
    players.forEach((player, i) => {
        const circle = svg.append('circle')
            .attr('cx', player.x)
            .attr('cy', player.y)
            .attr('r', 12)
            .attr('fill', player.team === 'offense' ? '#4ECDC4' : '#FF6B6B')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .datum(player);
        
        circle.transition()
            .delay(500 + i * 200)
            .duration(500)
            .attr('opacity', 1);
        
        if (i === 0) {
            setTimeout(() => {
                circle.transition()
                    .duration(300)
                    .attr('r', 16)
                    .attr('stroke-width', 3);
                
                const tooltip = d3.select('#player-tooltip');
                tooltip
                    .style('left', (player.x + 30) + 'px')
                    .style('top', (player.y - 50) + 'px')
                    .transition()
                    .duration(300)
                    .style('opacity', 1);
                
                tooltip.select('.tooltip-name').text(player.name);
                tooltip.select('.tooltip-position').text(player.position);
                tooltip.select('.tooltip-role').text(player.role);
            }, 2000);
        }
    });
}

// Coverage section animation
function animateCoverageSection(section) {
    drawCoverageDemo();
}

// Draw coverage demo
function drawCoverageDemo() {
    const svg = d3.select('#coverage-svg');
    if (svg.empty()) return;
    
    const width = 800;
    const height = 450;
    
    svg.selectAll('*').remove();
    
    // Draw field
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    const zones = [
        {x: 200, y: 50, label: 'Deep Third 1', color: '#FF6B6B'},
        {x: 400, y: 50, label: 'Deep Third 2', color: '#FF6B6B'},
        {x: 600, y: 50, label: 'Deep Third 3', color: '#FF6B6B'},
        {x: 200, y: 400, label: 'Flat', color: '#FF9999'},
        {x: 600, y: 400, label: 'Flat', color: '#FF9999'}
    ];
    
    zones.forEach((zone, i) => {
        const rect = svg.append('rect')
            .attr('x', zone.x - 80)
            .attr('y', zone.y - 30)
            .attr('width', 160)
            .attr('height', 60)
            .attr('fill', zone.color)
            .attr('opacity', 0.3)
            .attr('stroke', zone.color)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0);
        
        rect.transition()
            .delay(500 + i * 200)
            .duration(500)
            .attr('opacity', 0.3);
        
        svg.append('text')
            .attr('x', zone.x)
            .attr('y', zone.y)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', zone.color)
            .text(zone.label)
            .attr('opacity', 0)
            .transition()
            .delay(700 + i * 200)
            .duration(500)
            .attr('opacity', 1);
    });
    
    d3.select('#coverage-label')
        .transition()
        .delay(2000)
        .duration(600)
        .ease(d3.easeCubicOut)
        .style('opacity', 1)
        .style('transform', 'scale(1)');
}

// Takeaway section animation
function animateTakeawaySection(section) {
    // Animate insights
    d3.selectAll('.insight-item')
        .each(function(d, i) {
            d3.select(this)
                .transition()
                .delay(i * 400)
                .duration(600)
                .ease(d3.easeCubicOut)
                .style('opacity', 1)
                .style('transform', 'translateX(0)');
        });
    
    // Animate core message
    d3.select('.core-message')
        .transition()
        .delay(2000)
        .duration(800)
        .style('opacity', 1)
        .style('transform', 'translateY(0)');
    
    // Draw closing windows animation
    drawClosingWindows();
}

// Draw closing windows animation (loops)
function drawClosingWindows() {
    const svg = d3.select('#closing-windows-svg');
    if (svg.empty()) return;
    
    const width = 800;
    const height = 450;
    
    svg.selectAll('*').remove();
    
    // Draw field
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#90EE90');
    
    // Yard lines
    for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        svg.append('line')
            .attr('x1', x)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', height)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8);
    }
    
    const qbX = 150;
    const qbY = height/2;
    
    svg.append('circle')
        .attr('cx', qbX)
        .attr('cy', qbY)
        .attr('r', 12)
        .attr('fill', '#4ECDC4')
        .attr('stroke', '#333')
        .attr('stroke-width', 2);
    
    const receivers = [
        {x: 400, y: 150},
        {x: 450, y: 250},
        {x: 500, y: 350}
    ];
    
    const defenders = [
        {x: 380, y: 160},
        {x: 430, y: 260},
        {x: 480, y: 360}
    ];
    
    const receiverCircles = receivers.map(rec => {
        return svg.append('circle')
            .attr('cx', rec.x)
            .attr('cy', rec.y)
            .attr('r', 10)
            .attr('fill', '#4ECDC4')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .datum(rec);
    });
    
    const defenderCircles = defenders.map(def => {
        return svg.append('circle')
            .attr('cx', def.x)
            .attr('cy', def.y)
            .attr('r', 10)
            .attr('fill', '#FF6B6B')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .datum(def);
    });
    
    const windows = receivers.map(rec => {
        return svg.append('circle')
            .attr('cx', rec.x)
            .attr('cy', rec.y)
            .attr('r', 30)
            .attr('fill', 'none')
            .attr('stroke', '#00FF00')
            .attr('stroke-width', 3)
            .attr('opacity', 0.7)
            .attr('stroke-dasharray', '5,5');
    });
    
    // Animate closing windows (loop)
    function animateClosing() {
        // Reset
        receivers.forEach((rec, i) => {
            receiverCircles[i]
                .attr('cx', rec.x)
                .attr('cy', rec.y);
            
            defenderCircles[i]
                .attr('cx', defenders[i].x)
                .attr('cy', defenders[i].y);
            
            windows[i]
                .attr('r', 30)
                .attr('stroke', '#00FF00')
                .attr('opacity', 0.7);
        });
        
        // Animate defenders closing
        defenderCircles.forEach((defCircle, i) => {
            defCircle.transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attr('cx', receivers[i].x)
                .attr('cy', receivers[i].y)
                .on('end', function() {
                    windows[i].transition()
                        .duration(500)
                        .attr('r', 5)
                        .attr('stroke', '#FF0000')
                        .attr('opacity', 0.3);
                });
        });
    }
    
    setTimeout(() => {
        animateClosing();
        setInterval(animateClosing, 3000);
    }, 500);
}

// Initialize arrow key navigation for slideshow effect
function initScrollSnapping() {
    const sections = Array.from(document.querySelectorAll('.story-section'));
    let isNavigating = false;
    
    // Helper function to find the current section based on scroll position
    function getCurrentSectionIndex() {
        const currentScroll = window.scrollY + window.innerHeight / 2; // Use middle of viewport as reference
        let currentIndex = 0;
        let minDistance = Infinity;
        
        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const sectionTop = rect.top + window.scrollY;
            const sectionBottom = sectionTop + rect.height;
            const sectionCenter = sectionTop + rect.height / 2;
            
            // Check if we're within this section
            if (currentScroll >= sectionTop && currentScroll <= sectionBottom) {
                const distance = Math.abs(currentScroll - sectionCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentIndex = index;
                }
            }
        });
        
        // Fallback: find closest section if we're between sections
        if (minDistance === Infinity) {
            sections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                const sectionTop = rect.top + window.scrollY;
                const distance = Math.abs(currentScroll - sectionTop);
                if (distance < minDistance) {
                    minDistance = distance;
                    currentIndex = index;
                }
            });
        }
        
        return currentIndex;
    }
    
    // Handle arrow key presses
    window.addEventListener('keydown', (e) => {
        // Only handle arrow keys
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        
        // Prevent default scrolling behavior
        e.preventDefault();
        
        if (isNavigating) return;
        
        const currentSectionIndex = getCurrentSectionIndex();
        
        let targetSectionIndex;
        if (e.key === 'ArrowDown') {
            // Go to next section
            targetSectionIndex = Math.min(currentSectionIndex + 1, sections.length - 1);
        } else if (e.key === 'ArrowUp') {
            // Go to previous section
            targetSectionIndex = Math.max(currentSectionIndex - 1, 0);
        }
        
        const targetSection = sections[targetSectionIndex];
        if (targetSection && targetSectionIndex !== currentSectionIndex) {
            isNavigating = true;
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            setTimeout(() => {
                isNavigating = false;
            }, 800);
        }
    });
    
    // Prevent regular scrolling (optional - comment out if you want to allow both)
    // window.addEventListener('wheel', (e) => {
    //     e.preventDefault();
    // }, { passive: false });
}

// QB Optimal Decision Analysis Visualization
async function visualizeQBOptimalDecisions() {
    const section = document.getElementById('qb-optimal-analysis');
    if (!section) return;
    
    const vizContainer = document.getElementById('qb-optimal-viz');
    if (!vizContainer) return;
    
    try {
        // Load data
        const response = await fetch('qb_optimal_decisions_2023_w01.json');
        const data = await response.json();
        
        // Update overall stats
        document.getElementById('overall-optimal-pct').textContent = `${data.overall_optimal_percentage}%`;
        document.getElementById('optimal-plays').textContent = data.optimal_plays.toLocaleString();
        document.getElementById('total-plays').textContent = data.total_plays.toLocaleString();
        
        // Sort QBs by optimal percentage (descending) and get top 3
        const sortedQBs = [...data.quarterbacks].sort((a, b) => b.optimal_percentage - a.optimal_percentage);
        const top3QBs = sortedQBs.slice(0, 3);
        
        // Clear container
        vizContainer.innerHTML = '';
        
        // Set up SVG
        const margin = { top: 20, right: 40, bottom: 40, left: 200 };
        const width = 900 - margin.left - margin.right;
        const height = Math.max(600, sortedQBs.length * 35) - margin.top - margin.bottom;
        
        const svg = d3.select('#qb-optimal-viz')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);
        
        const yScale = d3.scaleBand()
            .domain(sortedQBs.map(d => d.name))
            .range([0, height])
            .padding(0.2);
        
        // Color scale - highlight top 3
        const getColor = (qb, index) => {
            if (index < 3) return '#FFD700'; // Gold for top 3
            return '#4ECDC4'; // Teal for others
        };
        
        // Bars
        const bars = g.selectAll('.qb-bar')
            .data(sortedQBs)
            .enter()
            .append('rect')
            .attr('class', 'qb-bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.name))
            .attr('width', 0)
            .attr('height', yScale.bandwidth())
            .attr('fill', (d, i) => getColor(d, i))
            .attr('stroke', (d, i) => i < 3 ? '#FFA500' : '#2c3e50')
            .attr('stroke-width', (d, i) => i < 3 ? 3 : 1)
            .attr('rx', 4)
            .attr('opacity', 0.8);
        
        // Animate bars
        bars.transition()
            .duration(1000)
            .delay((d, i) => i * 30)
            .attr('width', d => xScale(d.optimal_percentage));
        
        // Percentage labels on bars
        const barLabels = g.selectAll('.qb-bar-label')
            .data(sortedQBs)
            .enter()
            .append('text')
            .attr('class', 'qb-bar-label')
            .attr('x', d => xScale(d.optimal_percentage) + 5)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('fill', '#333')
            .attr('font-size', '14px')
            .attr('font-weight', (d, i) => i < 3 ? 'bold' : 'normal')
            .text(d => `${d.optimal_percentage}%`)
            .attr('opacity', 0);
        
        barLabels.transition()
            .duration(1000)
            .delay((d, i) => i * 30 + 500)
            .attr('opacity', 1);
        
        // QB names
        const nameLabels = g.selectAll('.qb-name-label')
            .data(sortedQBs)
            .enter()
            .append('text')
            .attr('class', 'qb-name-label')
            .attr('x', -10)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', (d, i) => i < 3 ? '#FFD700' : '#333')
            .attr('font-size', (d, i) => i < 3 ? '16px' : '14px')
            .attr('font-weight', (d, i) => i < 3 ? 'bold' : 'normal')
            .text(d => {
                const rank = sortedQBs.indexOf(d) + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                return `${medal} ${d.name}`;
            });
        
        // X-axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => `${d}%`);
        
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .attr('font-size', '12px')
            .attr('fill', '#666');
        
        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${width / 2},${height + 35})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('fill', '#666')
            .text('Optimal Decision Percentage');
    
        
    } catch (error) {
        console.error('Error loading QB optimal decisions data:', error);
        vizContainer.innerHTML = '<p style="color: red;">Error loading data. Please try refreshing the page.</p>';
    }
}

function animateQBOptimalSection(section) {
    if (!section) return;
    
    // Load and visualize data when section comes into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                visualizeQBOptimalDecisions();
                observer.unobserve(entry.target); // Only load once
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(section);
}

// Time to Throw Analysis Visualization
async function visualizeTimeToThrow() {
    const section = document.getElementById('time-to-throw-analysis');
    if (!section) return;
    
    try {
        // Load data
        const response = await fetch('time_to_throw_analysis_2023_w01.json');
        const data = await response.json();
        
        // Update stat cards
        document.getElementById('overall-time-value').textContent = `${data.overall_avg_time_to_throw}s`;
        document.getElementById('overall-time-count').textContent = `${data.total_plays.toLocaleString()} plays`;
        
        if (data.overall_non_optimal_avg !== null) {
            document.getElementById('non-optimal-time-value').textContent = `${data.overall_non_optimal_avg}s`;
            document.getElementById('non-optimal-time-count').textContent = `${data.non_optimal_plays.toLocaleString()} plays`;
        } else {
            document.getElementById('non-optimal-time-value').textContent = 'N/A';
            document.getElementById('non-optimal-time-count').textContent = 'Data unavailable';
        }
        
        if (data.overall_optimal_avg !== null) {
            document.getElementById('optimal-time-value').textContent = `${data.overall_optimal_avg}s`;
            document.getElementById('optimal-time-count').textContent = `${data.optimal_plays.toLocaleString()} plays`;
        } else {
            document.getElementById('optimal-time-value').textContent = 'N/A';
            document.getElementById('optimal-time-count').textContent = 'Data unavailable';
        }
        
        // Create visualization with individual QB bars
        const vizContainer = document.getElementById('time-to-throw-viz');
        if (!vizContainer) return;
        
        vizContainer.innerHTML = '';
        
        if (!data.quarterbacks || data.quarterbacks.length === 0) {
            vizContainer.innerHTML = '<p>No quarterback data available.</p>';
            return;
        }
        
        // Sort QBs by average time to throw
        const sortedQBs = [...data.quarterbacks].sort((a, b) => a.avg_time_to_throw - b.avg_time_to_throw);
        
        const margin = { top: 60, right: 40, bottom: 120, left: 120 };
        const width = 1200 - margin.left - margin.right;
        const height = Math.max(600, sortedQBs.length * 25) - margin.top - margin.bottom;
        
        const svg = d3.select('#time-to-throw-viz')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Scales
        const maxValue = Math.max(...sortedQBs.map(d => d.avg_time_to_throw), 
                                   data.overall_optimal_avg || 0, 
                                   data.overall_non_optimal_avg || 0) * 1.15;
        
        const xScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, width]);
        
        const yScale = d3.scaleBand()
            .domain(sortedQBs.map(d => d.name))
            .range([0, height])
            .padding(0.15);
        
        // Draw reference lines for overall averages
        if (data.overall_non_optimal_avg !== null) {
            const nonOptimalLine = g.append('line')
                .attr('class', 'reference-line non-optimal-line')
                .attr('x1', xScale(data.overall_non_optimal_avg))
                .attr('x2', xScale(data.overall_non_optimal_avg))
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', '#FF6B6B')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '8,4')
                .attr('opacity', 0.7);
            
            g.append('text')
                .attr('class', 'reference-label non-optimal-label')
                .attr('x', xScale(data.overall_non_optimal_avg) + 5)
                .attr('y', -10)
                .attr('fill', '#FF6B6B')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .text(`Non-Optimal Avg: ${data.overall_non_optimal_avg}s`);
        }
        
        if (data.overall_optimal_avg !== null) {
            const optimalLine = g.append('line')
                .attr('class', 'reference-line optimal-line')
                .attr('x1', xScale(data.overall_optimal_avg))
                .attr('x2', xScale(data.overall_optimal_avg))
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', '#FFD700')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '8,4')
                .attr('opacity', 0.7);
            
            g.append('text')
                .attr('class', 'reference-label optimal-label')
                .attr('x', xScale(data.overall_optimal_avg) + 5)
                .attr('y', -30)
                .attr('fill', '#FFD700')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .text(`Optimal Avg: ${data.overall_optimal_avg}s`);
        }
        
        // Color bars based on whether QB is faster/slower than optimal average
        const getBarColor = (qb) => {
            if (data.overall_optimal_avg === null) return '#4ECDC4';
            if (qb.avg_time_to_throw <= data.overall_optimal_avg) return '#4CAF50'; // Green if faster/equal
            return '#FF6B6B'; // Red if slower
        };
        
        // Bars for each QB
        const bars = g.selectAll('.qb-time-bar')
            .data(sortedQBs)
            .enter()
            .append('rect')
            .attr('class', 'qb-time-bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.name))
            .attr('width', 0)
            .attr('height', yScale.bandwidth())
            .attr('fill', d => getBarColor(d))
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 1)
            .attr('rx', 3)
            .attr('opacity', 0.8);
        
        // Animate bars
        bars.transition()
            .duration(800)
            .delay((d, i) => i * 20)
            .attr('width', d => xScale(d.avg_time_to_throw));
        
        // Value labels on bars
        const barLabels = g.selectAll('.qb-time-label')
            .data(sortedQBs)
            .enter()
            .append('text')
            .attr('class', 'qb-time-label')
            .attr('x', d => xScale(d.avg_time_to_throw) + 5)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('fill', '#333')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .text(d => `${d.avg_time_to_throw}s`)
            .attr('opacity', 0);
        
        barLabels.transition()
            .duration(800)
            .delay((d, i) => i * 20 + 400)
            .attr('opacity', 1);
        
        // QB names
        const nameLabels = g.selectAll('.qb-name-label')
            .data(sortedQBs)
            .enter()
            .append('text')
            .attr('class', 'qb-name-label')
            .attr('x', -10)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', '#333')
            .attr('font-size', '13px')
            .attr('font-weight', 'normal')
            .text(d => d.name);
        
        // X-axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d => `${d}s`);
        
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .attr('font-size', '12px')
            .attr('fill', '#666');
        
        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${width / 2},${height + 50})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('fill', '#666')
            .text('Average Time to Throw (seconds)');
        
    } catch (error) {
        console.error('Error loading time to throw data:', error);
        const vizContainer = document.getElementById('time-to-throw-viz');
        if (vizContainer) {
            vizContainer.innerHTML = '<p style="color: red;">Error loading data. Please try refreshing the page.</p>';
        }
    }
}

function animateTimeToThrowSection(section) {
    if (!section) return;
    
    // Load and visualize data when section comes into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                visualizeTimeToThrow();
                observer.unobserve(entry.target); // Only load once
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(section);
}

// Initialize everything on load
window.addEventListener('load', () => {
    initScrollProgress();
    initScrollAnimations();
    initScrollSnapping();
    
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize QB optimal analysis section
    const qbOptimalSection = document.getElementById('qb-optimal-analysis');
    if (qbOptimalSection) {
        animateQBOptimalSection(qbOptimalSection);
    }
    
    // Initialize time to throw analysis section
    const timeToThrowSection = document.getElementById('time-to-throw-analysis');
    if (timeToThrowSection) {
        animateTimeToThrowSection(timeToThrowSection);
    }
});

