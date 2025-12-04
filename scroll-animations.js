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
        case 'tutorial-hover':
            animateHoverSection(element);
            break;
        case 'tutorial-coverage':
            animateCoverageSection(element);
            break;
        case 'takeaway':
            animateTakeawaySection(element);
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
    const sections = document.querySelectorAll('.story-section');
    let isNavigating = false;
    
    // Handle arrow key presses
    window.addEventListener('keydown', (e) => {
        // Only handle arrow keys
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        
        // Prevent default scrolling behavior
        e.preventDefault();
        
        if (isNavigating) return;
        
        const currentScroll = window.scrollY;
        const windowHeight = window.innerHeight;
        const currentSectionIndex = Math.round(currentScroll / windowHeight);
        
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

// Initialize everything on load
window.addEventListener('load', () => {
    initScrollProgress();
    initScrollAnimations();
    initScrollSnapping();
    
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
});

